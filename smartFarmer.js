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
const script = async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const SEND_TIME_TRIP = 1000 * 60 * 10;

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

            localStorage.setItem(key, now);
            const json = await response.json();

            if (json.msg) {
                console.log(json.msg);
            }
        }
    }

    const calculateDistance = (x, y) => {
        return Math.sqrt((currentVillageCoords.x - x) ** 2 + (currentVillageCoords.y - y) ** 2);
    };

    const loadBarbarianVillages = async () => {
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

        const uniqueVillages = new Map();

        res.forEach(({ data }) => {
            if (!data || !data.villages) {
                return;
            }

            Object.entries(data.villages).forEach(([villageKey, villageSet]) => {
                Object.entries(villageSet).forEach(([idx, village]) => {
                    const villageId = village[0];
                    const owner = village[4];
                    const x = Number(villageKey) + data.x;
                    const y = Number(idx) + data.y;

                    const id = `${x}|${y}`;

                    if (owner === "0" && !uniqueVillages.has(id)) {
                        uniqueVillages.set(id, { x, y, villageId: villageId });
                    }
                });
            });
        });

        const villages = Array.from(uniqueVillages.values());
        return villages;
    }

    const getBarbarianVillages = async () => {
        const barbarianKey = 'barbarianVillages';
        const timestampKey = 'barbarianVillagesTimestamp';
        const oneHour = 60 * 60 * 1000;

        let cachedBarbarianVillages = localStorage.getItem(barbarianKey);
        let lastUpdate = localStorage.getItem(timestampKey);
        let now = Date.now();

        if (!cachedBarbarianVillages || !lastUpdate || (now - lastUpdate > oneHour)) {
            const newData = await loadBarbarianVillages();
            localStorage.setItem(barbarianKey, JSON.stringify(newData));
            localStorage.setItem(timestampKey, now.toString());
            return newData;
        } else {
            return JSON.parse(cachedBarbarianVillages);
        }
    }

    const farmPlayers = async () => {
        const villages = await getBarbarianVillages();

        const sortedVillages = villages.sort((a, b) => {
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

                const expectedArrivalTime = dateNow + Math.round(lightSpeed * calculateDistance(farm.x, farm.y));

                if (lastFarm && (expectedArrivalTime - lastFarm) < SEND_TIME_TRIP) {
                    continue;
                }

                const details = await fetch(`${window.location.origin}/game.php?village=${currentVillage}&screen=map&ajax=map_info&source=${currentVillage}&target=${farm.villageId}&`);
                const detailsJson = await details.json();

                if (detailsJson.attack) {
                    const dot = detailsJson.attack.dot;
                    if (dot !== 1) {
                        console.log(`Last attack on ${farm.villageId} (${farm.x}, ${farm.y}) had losses.`);
                        continue;
                    }
                }

                selectedFarm = [farm.x, farm.y];

                const url = `${window.location.origin}/game.php?village=${currentVillage}&screen=am_farm&mode=farm&ajaxaction=farm&template_id=583&target=${farm.villageId}&source=${currentVillage}&json=1&h=${TribalWars.getGameData().csrf}`;

                if (needsRateLimit) {
                    const ellapsedTime = performance.now() - lastIterationStartTime;
                    const sleepMs = Math.max(0, 200 - ellapsedTime);

                    if (sleepMs > 0) {
                        console.log(`sleeping for ${sleepMs} ms`)
                        await sleep(sleepMs);
                    }
                }

                lastIterationStartTime = performance.now();

                const result = await fetch(url);
                needsRateLimit = true;

                const json = await result.json();

                if (json.error) {
                    console.log(json.error);
                    return;
                }

                if (json.success) {
                    console.log(json.success);
                }

                if (json.current_units) {
                    if (+json.current_units.light < 1) {
                        console.log('No more troops.');
                        return;
                    }
                }

                localStorage.setItem(keyBuilder(selectedFarm), expectedArrivalTime);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        console.log('No players left to farm.');
    }

    const nextTick = localStorage.getItem('nextTick');
    if (!nextTick) {
        localStorage.setItem('nextTick', Date.now() + 60 * 1000);
    } else {
        if (nextTick < Date.now()) {
            localStorage.setItem('nextTick', Date.now() + 60 * 1000);
            const nextVillageButton = document.getElementById("village_switch_right");
            nextVillageButton && nextVillageButton.click();
        }
    }

    farmPlayers();
    recruit({
        troopId: 'light',
        buildingId: 'stable',
        troopCount: 1,
        timeout: 3 * 60 * 1000,
        villages: [
            [414, 498],
            [413, 501]
        ]
    });

    console.log("Reloading in 60s.");
    setTimeout(() => {
        window.location.reload(true);
    }, 1000 * 60);
}

const currentVillage = TribalWars.getGameData().village.id;

if (window.VillageOverview) {
    const lightSpeed = 1/(window.VillageOverview.units[1].light.speed);
    localStorage.setItem('lightSpeed', lightSpeed);
}

const getCurrentVillage = () => {
    const villageName = document.getElementById("menu_row2").querySelector("b").innerText;
    const coordinates = villageName.split(" ")[0];
    const [x, y] = coordinates.replaceAll('(', '').replaceAll(')', '').split("|").map(Number);
    return { x: +x, y: +y };
}

const currentVillageCoords = getCurrentVillage();
script();