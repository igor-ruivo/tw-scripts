// ==UserScript==
// @name                New Farmer
// @description 	      New Farmer
// @author		         Igor Ruivo
// @include             http*tribalwars*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

let pending = true;
window.addEventListener("beforeunload", (event) => {
    if (pending) {
        event.preventDefault();
    }
});

const script = async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const SEND_TIME_TRIP = 1000 * 60 * 10;
    const TIME_IN_EACH_VILLAGE = 20 * 1000;

    const recruit = async (troopConfig) => {
        if (!troopConfig.villages.find(v => v[0] === currentVillageCoords.x && v[1] === currentVillageCoords.y)) {
            return;
        }

        const key = `last_${troopConfig.buildingId}_${currentVillageCoords.x}|${currentVillageCoords.y}`
        const lastExecution = localStorage.getItem(key);
        const now = Date.now();

        if (!lastExecution || now - lastExecution >= troopConfig.timeout) {
            const url = `${window.location.origin}/game.php?village=${currentVillage}&screen=${troopConfig.buildingId}&ajaxaction=train&mode=train&`;
            const formData = new FormData();
            formData.append(`units[${troopConfig.troopId}]`, `${troopConfig.troopCount}`);
            formData.append('h', TribalWars.getGameData().csrf);

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const json = await response.json();

            if (!json) {
                console.log('Unauthorized to use APIs. Check for bot protection!');
                pending = false;
                await hookDiscord();
                return;
            }

            localStorage.setItem(key, now);

            if (json.msg) {
                console.log(json.msg);
            }
        }
    }

    const calculateDistance = (x, y) => {
        return Math.sqrt((currentVillageCoords.x - x) ** 2 + (currentVillageCoords.y - y) ** 2);
    };

    const loadVillages = async () => {
        const baseUrl = `${window.location.origin}/map.php?v=2&e=${new Date().getTime()}`;

        let params = [];
        for (let x = 300; x <= 700; x += 20) {
            for (let y = 300; y <= 700; y += 20) {
                params.push(`${x}_${y}=1`);
            }
        }

        const fullUrl = `${baseUrl}&${params.join('&')}`;

        const req = await fetch(fullUrl);
        const res = await req.json();

        if (!res) {
            console.log('Unauthorized to use APIs. Check for bot protection!');
            pending = false;
            await hookDiscord();
            return;
        }

        const uniqueVillages = new Map();

        res.forEach(({ data }) => {
            if (!data || !data.villages) {
                return;
            }

            Object.entries(data.villages).forEach(([villageKey, villageSet]) => {
                Object.entries(villageSet).forEach(([idx, village]) => {
                    const villageId = village[0];
                    const owner = village[4];
                    const isBarbarian = owner === '0';
                    const points = Number(isBarbarian ? village[3].replaceAll(",", "").replaceAll(".", "") : data.players[owner][1].replaceAll(",", "").replaceAll(".", ""));
                    const beginner = !isBarbarian && !!data.players[owner][3];
                    const x = Number(villageKey) + data.x;
                    const y = Number(idx) + data.y;

                    const id = `${x}|${y}`;

                    if (!uniqueVillages.has(id)) {
                        uniqueVillages.set(id, { x, y, villageId, isBarbarian, points, beginner });
                    }
                });
            });
        });

        const villages = Array.from(uniqueVillages.values());
        return villages;
    }

    const getVillages = async () => {
        const barbarianKey = 'villages';
        const timestampKey = 'villagesTimestamp';
        const oneHour = 60 * 60 * 1000;

        let cachedBarbarianVillages = localStorage.getItem(barbarianKey);
        let lastUpdate = localStorage.getItem(timestampKey);
        let now = Date.now();

        if (!cachedBarbarianVillages || !lastUpdate || (now - lastUpdate > oneHour)) {
            const newData = await loadVillages();
            localStorage.setItem(barbarianKey, JSON.stringify(newData));
            localStorage.setItem(timestampKey, now.toString());
            return newData;
        } else {
            return JSON.parse(cachedBarbarianVillages);
        }
    }

    const farmVillages = async (includeRealPlayers = true) => {
        const villages = await getVillages();

        const sortedVillages = villages
            .filter(v => !includeRealPlayers || v.isBarbarian || v.points <= 100 && !v.beginner)
            .sort((a, b) => {
                const aDistance = calculateDistance(a.x, a.y);
                const bDistance = calculateDistance(b.x, b.y);

                return aDistance - bDistance;
            });

        const keyBuilder = (coords) => `f${coords}f`;

        const dateNow = Date.now();

        let selectedFarm = null;

        let lastIterationStartTime = performance.now();
        let needsRateLimit = false;

        const lightSpeed = localStorage.getItem('lightSpeed') || 300;

        for (let i = 0; i < sortedVillages.length; i++) {
            const farm = sortedVillages[i];

            try {
                const lastFarm = localStorage.getItem(keyBuilder([farm.x, farm.y]));

                const expectedArrivalTime = dateNow + Math.round(lightSpeed * calculateDistance(farm.x, farm.y)) * 1000;

                if (lastFarm && (expectedArrivalTime - lastFarm) < SEND_TIME_TRIP) {
                    continue;
                }

                const details = await fetch(`${window.location.origin}/game.php?village=${currentVillage}&screen=map&ajax=map_info&source=${currentVillage}&target=${farm.villageId}&`);
                const detailsJson = await details.json();

                if (!detailsJson) {
                    console.log('Unauthorized to use APIs. Check for bot protection!');
                    pending = false;
                    await hookDiscord();
                    return;
                }

                if (detailsJson.attack) {
                    const dot = detailsJson.attack.dot;
                    if (dot !== 1) {
                        console.log(`Last attack on ${farm.villageId} (${farm.x}, ${farm.y}) had losses.`);
                        continue;
                    }
                }

                selectedFarm = [farm.x, farm.y];

                if (needsRateLimit) {
                    const ellapsedTime = performance.now() - lastIterationStartTime;
                    const sleepMs = Math.max(0, 200 - ellapsedTime);

                    if (sleepMs > 0) {
                        await sleep(sleepMs);
                    }
                }

                needsRateLimit = true;
                lastIterationStartTime = performance.now();

                if (farm.isBarbarian) {
                    const url = `${window.location.origin}/game.php?village=${currentVillage}&screen=am_farm&mode=farm&ajaxaction=farm&template_id=583&target=${farm.villageId}&source=${currentVillage}&json=1&h=${TribalWars.getGameData().csrf}`;
                    const result = await fetch(url);

                    const json = await result.json();

                    if (!json) {
                        console.log('Unauthorized to use APIs. Check for bot protection!');
                        pending = false;
                        await hookDiscord();
                        return;
                    }

                    if (json.error) {
                        console.log(json.error);
                        return;
                    }

                    if (json.success) {
                        console.log(json.success);
                        localStorage.setItem(keyBuilder(selectedFarm), expectedArrivalTime);
                    }

                    if (json.current_units) {
                        if (+json.current_units.light < 1) {
                            console.log('No more troops.');
                            return;
                        }
                    }
                } else {
                    const url = `${window.location.origin}/game.php?village=${currentVillage}&screen=place&ajax=command&target=${farm.villageId}`;
                    const result = await fetch(url);
                    const json = await result.json();

                    if (!json) {
                        console.log('Unauthorized to use APIs. Check for bot protection!');
                        pending = false;
                        await hookDiscord();
                        return;
                    }

                    if (!json.dialog || json.error) {
                        console.log(`Error attacking player ${farm.villageId} (${farm.x}, ${farm.y}):`);
                        console.error(json.error ?? json);
                        continue;
                    }

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(json.dialog, 'text/html');

                    const dataForm = doc.getElementById('command-data-form');
                    const hiddenInput = dataForm.querySelector('input[type="hidden"]');

                    const name = hiddenInput.name;
                    const value = hiddenInput.value;

                    const formData = new FormData();
                    formData.append(name, value);
                    formData.append('source_village', currentVillage);
                    formData.append('light', 2);
                    formData.append('x', farm.x);
                    formData.append('y', farm.y);
                    formData.append('attack', 1);
                    formData.append('h', TribalWars.getGameData().csrf);

                    const firstPostResult = await fetch(`${window.location.origin}/game.php?village=${currentVillage}&screen=place&ajax=confirm`, {
                        method: 'POST',
                        body: formData
                    });

                    const firstPostJson = await firstPostResult.json();

                    if (!firstPostJson) {
                        console.log('Unauthorized to use APIs. Check for bot protection!');
                        pending = false;
                        await hookDiscord();
                        return;
                    }

                    if (!firstPostJson.dialog || firstPostJson.error) {
                        console.log(`Error attacking player ${farm.villageId} (${farm.x}, ${farm.y}):`);
                        console.error(firstPostJson.error ?? firstPostJson);
                        continue;
                    }

                    const doc2 = parser.parseFromString(firstPostJson.dialog, 'text/html');
                    const chHiddenInput = doc2.querySelector('input[type="hidden"][name="ch"]');

                    const finalFormData = new FormData();
                    finalFormData.append('attack', true);
                    finalFormData.append('ch', chHiddenInput.value);
                    finalFormData.append('cb', 'troop_confirm_submit');
                    finalFormData.append('x', farm.x);
                    finalFormData.append('y', farm.y);
                    finalFormData.append('source_village', currentVillage);
                    finalFormData.append('village', currentVillage);
                    finalFormData.append('light', 2);
                    finalFormData.append('building', 'main');
                    finalFormData.append('h', TribalWars.getGameData().csrf);
                    finalFormData.append('h', TribalWars.getGameData().csrf);

                    const finalPostResult = await fetch(`${window.location.origin}/game.php?village=${currentVillage}&screen=place&ajaxaction=popup_command`, {
                        method: 'POST',
                        body: finalFormData
                    });

                    await finalPostResult.json();

                    if (!finalPostResult) {
                        console.log('Unauthorized to use APIs. Check for bot protection!');
                        pending = false;
                        await hookDiscord();
                        return;
                    }

                    localStorage.setItem(keyBuilder(selectedFarm), expectedArrivalTime);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        console.log('No players left to farm.');
    }

    const nextTick = localStorage.getItem('nextTick');
    if (!nextTick) {
        localStorage.setItem('nextTick', Date.now() + TIME_IN_EACH_VILLAGE);
    } else {
        if (nextTick < Date.now()) {
            localStorage.setItem('nextTick', Date.now() + TIME_IN_EACH_VILLAGE);
            const nextVillageButton = document.getElementById("village_switch_right");
            nextVillageButton && nextVillageButton.click();
        }
    }

    await Promise.all([
        farmVillages(),
        recruit({
            troopId: 'light',
            buildingId: 'stable',
            troopCount: 1,
            timeout: 3 * 60 * 1000,
            villages: [
                [414, 498],
                [413, 501]
            ]
        })
    ]);

    pending = false;
    console.log(`Reloading in ${TIME_IN_EACH_VILLAGE / 1000}s.`);
    setTimeout(() => {
        window.location.reload(true);
    }, TIME_IN_EACH_VILLAGE);
}

const currentVillage = TribalWars.getGameData().village.id;

if (window.VillageOverview) {
    const lightSpeed = 1 / (window.VillageOverview.units[1].light.speed);
    localStorage.setItem('lightSpeed', lightSpeed);
}

const getCurrentVillage = () => {
    const villageName = document.getElementById("menu_row2").querySelector("b").innerText;
    const coordinates = villageName.split(" ")[0];
    const [x, y] = coordinates.replaceAll('(', '').replaceAll(')', '').split("|").map(Number);
    return { x: +x, y: +y };
}

const currentVillageCoords = getCurrentVillage();

setTimeout(() => {
    if (document.getElementsByClassName('bot-protection-row').length > 0) {
        console.log('Captcha detected. Aborting.');
        pending = false;
        hookDiscord();
        return;
    }

    script();
}, 5000);

const hookDiscord = async () => {
    const url = 'https://discord.com/api/webhooks/1353688174119096321/gP6pbveyiwgc3K6mTSdAL7CPT7dciBa-G3T44s7KAfFO6qcnP4ZMRoSr_51sPjs4dTuE';
    await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: `<@&1353690868019757097>`,
            embeds: [{
                title: `${TribalWars.getGameData().player.name} - Alerta Captcha!`,
                description: "Captcha por resolver!",
                color: 16711680
            }]
        })
    });
}