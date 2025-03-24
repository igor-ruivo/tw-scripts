// ==UserScript==
// @name                Travian Builder Bot
// @description 	    Automatically updates the desired buildings as soon as possible.
// @author		        Igor Ruivo
// @include             http*travian*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

let pending = false;
window.addEventListener("beforeunload", (event) => {
    if (pending) {
        event.preventDefault();
    }
});

const script = async () => {
    pending = true;
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const SEND_TIME_TRIP = 1000 * 60 * 10;
    const TIME_IN_EACH_VILLAGE = 20 * 1000;
    const blockCerealWhenNotNeeded = true;
    const maxPopToFarm = 50;
    const minHeroHealth = 30;
    const maxAnimalCount = 15;
    const playAd = false;

    const recruit = async (troopConfig) => {
        if (!troopConfig.villages.find(v => v[0] === currentVillageCoords[0] && v[1] === currentVillageCoords[1])) {
            return;
        }

        const entry = buildings.find(b => b.gid === troopConfig.id);
        if (!entry) {
            console.log(`Couldn't find building entry for ${troopConfig.id}`);
            return;
        }

        const key = `last_${String(entry.id)}_${currentVillageCoords[0]}|${currentVillageCoords[1]}`
        const lastExecution = localStorage.getItem(key);
        const now = Date.now();

        if (!lastExecution || now - lastExecution >= troopConfig.timeout) {
            const url = `${window.location.origin}/build.php?id=${entry.id}`;

            const response = await fetch(url);
            const text = await response.text();
            const parser = new DOMParser();
            const document = parser.parseFromString(text, 'text/html');

            const secretsParent = Array.from(document.getElementsByClassName('buildActionOverview trainUnits')[0].querySelectorAll('[name]'));
            const checksum = secretsParent.filter(l => l.name === 'checksum')[0].value;
            const did = secretsParent.filter(l => l.name === 'did')[0].value
            const s = secretsParent.filter(l => l.name === 's')[0].value

            const sendFormData = new FormData();
            sendFormData.append('action', 'trainTroops');
            sendFormData.append('checksum', checksum);
            sendFormData.append('s', s);
            sendFormData.append('did', did);
            sendFormData.append(troopConfig.troopId, String(troopConfig.troopCount));
            sendFormData.append('s1', 'ok');

            localStorage.setItem(key, now);

            await fetch(url, {
                method: 'POST',
                body: sendFormData,
                headers: {
                    'Accept': 'application/json'
                }
            });
        }
    }

    const adventure = async () => {
        const heroSearch = await fetch(`${window.location.origin}/hero/attributes`);
        const heroTxt = await heroSearch.text();
        const heroHP = Number(heroTxt.split('{\"health\":')[1].split(',')[0]);

        if (heroHP < 30) {
            console.log(`Hero HP too low to adventure: ${heroHP}%`);
            return;
        }

        const query = `
            query {
                ownPlayer {
                    hero {
                        adventures {
                            mapId
                            x
                            y
                            place
                            difficulty
                            travelingDuration
                        }
                        status {
                            status
                            inOasis {
                                belongsTo {
                                    mapId
                                    name
                                }
                            }
                            inVillage {
                                id
                                mapId
                                name
                                type
                            }
                            arrivalAt
                            arrivalIn
                            onWayTo {
                                id
                                x
                                y
                                type
                                village {
                                    mapId
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const adventuresReq = await fetch(`${window.location.origin}/api/v1/graphql`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: query
            })
        });

        const adventures = await adventuresReq.json();

        if (!(adventures.data.ownPlayer.hero.adventures.length > 0 && adventures.data.ownPlayer.hero.status.status === 100)) {
            console.log('Cant send to adventure.');
            return;
        }

        const adventure = adventures.data.ownPlayer.hero.adventures[0];

        const nonceCall = await fetch(`${window.location.origin}/api/v1/troop/send`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "action": "troopsSend",
                "targetMapId": adventure.mapId,
                "eventType": 50,
                "troops": [
                    {
                        "t11": 1
                    }
                ]
            })
        });

        const nonce = nonceCall.headers.get("x-nonce");

        await fetch(`${window.location.origin}/api/v1/troop/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-nonce": nonce
            },
            body: JSON.stringify({
                "action": "troopsSend",
                "targetMapId": adventure.mapId,
                "eventType": 50,
                "troops": [
                    {
                        "t11": 1
                    }
                ]
            })
        });
    }

    const collectResources = async () => {
        const query = `
            query {
                ownPlayer {
                hero {
                    inventory {
                    id
                    amount
                    typeId
                    }
                }
                }
            }
        `;

        const response = await fetch(`${window.location.origin}/api/v1/graphql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: query,
            }),
        });

        const data = await response.json();
        const inventory = data.data.ownPlayer.hero.inventory;

        const wood = inventory.find(i => i.typeId === 145);
        const stone = inventory.find(i => i.typeId === 146);
        const iron = inventory.find(i => i.typeId === 147);
        const cereal = inventory.find(i => i.typeId === 148);

        const currentWood = Number(document.getElementById('l1').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentClay = Number(document.getElementById('l2').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentIron = Number(document.getElementById('l3').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

        const currentWarehouse = Number(document.getElementsByClassName('capacity')[0].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

        const missingWood = !wood ? 0 : Math.min(wood.amount, Math.max(0, currentWarehouse * 0.5 - currentWood));
        const missingClay = !stone ? 0 : Math.min(stone.amount, Math.max(0, currentWarehouse * 0.5 - currentClay));
        const missingIron = !iron ? 0 : Math.min(iron.amount, Math.max(0, currentWarehouse * 0.5 - currentIron));
        const missingCereal = !cereal ? 0 : Math.min(cereal.amount, Math.max(0, currentGranary * 0.5 - currentCereal));

        const resources = [];

        if (wood) {
            resources.push({
                id: wood.id,
                amount: missingWood
            })
        }

        if (stone) {
            resources.push({
                id: stone.id,
                amount: missingClay
            })
        }

        if (iron) {
            resources.push({
                id: iron.id,
                amount: missingIron
            })
        }

        if (cereal) {
            resources.push({
                id: cereal.id,
                amount: missingCereal
            })
        }

        const resourcesToUse = resources.filter(resource => resource.amount > 0);

        const promises = resourcesToUse.map(async (resource) => {
            const nonceCall = await fetch(`${window.location.origin}/api/v1/hero/v2/inventory/use-item`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "action": "inventory",
                    "itemId": resource.id,
                    "amount": resource.amount,
                    "villageId": +currentVillageId
                }),
            });

            const nonce = nonceCall.headers.get("x-nonce");

            await fetch(`${window.location.origin}/api/v1/hero/v2/inventory/use-item`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nonce": nonce
                },
                body: JSON.stringify({
                    "action": "inventory",
                    "itemId": resource.id,
                    "amount": resource.amount,
                    "villageId": +currentVillageId
                }),
            });
        });

        await Promise.all(promises);
    }

    const fetchPlayerPop = async (uid) => {
        const playerPop = await fetch(`${window.location.origin}/api/v1/graphql`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: `query($uid: Int!) { player(id: $uid) { ranks { population } } }`,
                variables: { uid: uid }
            })
        });

        const playerPopJson = await playerPop.json();
        const pop = Number(playerPopJson?.data?.player?.ranks?.population ?? Infinity);

        return pop;
    }

    const farmPlayers = async () => {
        const keyBuilder = (coords) => `f${coords}f`;
        const horseTroopCount = 1;

        const villageSearch = await fetch(`${window.location.origin}/dorf1.php`);
        const villageText = await villageSearch.text();

        const villageParser = new DOMParser();
        const villageDoc = villageParser.parseFromString(villageText, 'text/html');
        const horseCount = Number(Array.from(villageDoc.getElementById('troops').querySelectorAll("tbody tr")).find(row => row.querySelector(".un")?.textContent.trim().startsWith("Equites Impera"))?.querySelector(".num")?.textContent.trim() ?? '0');

        if (horseTroopCount > horseCount) {
            console.log('Wont try to send attack. Not enough troops');
            return;
        }

        let remainingTroops = horseCount;

        const dateNow = Date.now();

        const fetchMapSquare = async (x, y) => {
            const response = await fetch(`${window.location.origin}/api/v1/map/position`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: { x, y, zoomLevel: 3 } })
            });
            return response.json();
        };

        const centerX = currentVillageCoords[0];
        const centerY = currentVillageCoords[1];

        const promises = [];

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const newX = centerX + dx * 30;
                const newY = centerY + dy * 30;
                promises.push(fetchMapSquare(newX, newY));
            }
        }

        const results = await Promise.all(promises);

        const uniqueTiles = new Map();
        results.flatMap(result => result.tiles).forEach(tile => {
            const key = `${tile.position.x},${tile.position.y}`;
            uniqueTiles.set(key, tile);
        });

        const allTiles = Array.from(uniqueTiles.values());

        const farms = allTiles
            .filter(k => {
                if (!k.uid || k.uid === 1 || k.uid === 1205) {
                    return false;
                }

                const popText = k.text.match(/{k\.einwohner}\s(\d+)/);
                if (!popText) {
                    return false;
                }

                const population = popText[1];

                if (!population) {
                    return false;
                }

                if (population > maxPopToFarm) {
                    return false
                }

                return true;
            })
            .map(k => ({
                ...k,
                distance: Math.hypot(k.position.x - centerX, k.position.y - centerY)
            }))
            .sort((a, b) => a.distance - b.distance);

        let selectedFarm = null;

        for (let i = 0; i < farms.length; i++) {
            if (remainingTroops < 1) {
                console.log('No more troops available.');
                return;
            }

            const farm = farms[i];

            try {
                const lastFarm = localStorage.getItem(keyBuilder([farm.position.x, farm.position.y]));

                const expectedArrivalTime = dateNow + Math.round(3600 / 56 * farm.distance) * 1000;

                if (lastFarm && (expectedArrivalTime - lastFarm) < SEND_TIME_TRIP) {
                    continue;
                }

                const blackList = JSON.parse(localStorage.getItem('blacklist') || '[]');

                const farmCoords = [farm.position.x, farm.position.y];
                const isBlacklisted = blackList.some(item => item[0] === farmCoords[0] && item[1] === farmCoords[1]);

                if (isBlacklisted) {
                    continue;
                }

                const lastTimeCheckedPlayerPop = localStorage.getItem(`pop${farm.uid}pop`);

                if (!(lastTimeCheckedPlayerPop && Date.now() < lastTimeCheckedPlayerPop + 24 * 1000 * 60 * 60)) {
                    const pop = await fetchPlayerPop(farm.uid);
                    localStorage.setItem(`pop${farm.uid}pop`, Date.now());

                    if (pop > maxPopToFarm) {
                        blackList.push(farmCoords);
                        localStorage.setItem('blacklist', JSON.stringify(blackList));
                        continue;
                    }
                }

                const reports = await fetch(`${window.location.origin}/api/v1/map/tile-details`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ "x": farm.position.x, "y": farm.position.y })
                });

                const reportsJson = await reports.json();
                const htmlComponent = reportsJson.html;

                const parser = new DOMParser();
                const html = parser.parseFromString(htmlComponent, 'text/html');
                const troopInfo = html.getElementById('troop_info');
                const noLosses = (!!troopInfo.querySelector('[alt="Won as attacker without losses."]')) || troopInfo.innerText.includes('No information');

                const canSend = Array.from(html.querySelectorAll(".options .option .a.arrow"))
                    .some(el => el.innerText.includes("Send troops") && !el.classList.contains("disabled"));

                if (noLosses && canSend) {
                    selectedFarm = [farm.position.x, farm.position.y];

                    const url = `${window.location.origin}/build.php?gid=16&tt=2`;

                    const formData = new URLSearchParams();
                    formData.append('troop[t5]', horseTroopCount);
                    formData.append('troop[t11]', '');
                    formData.append('villagename', '');
                    formData.append('x', selectedFarm[0]);
                    formData.append('y', selectedFarm[1]);
                    formData.append('eventType', '4');
                    formData.append('ok', 'ok');

                    const result = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: formData.toString(),
                    });

                    const resultText = await result.text();
                    const parser = new DOMParser();
                    const document = parser.parseFromString(resultText, 'text/html');

                    const script = document.getElementById('confirmSendTroops_script');
                    if (!script) {
                        console.log(`No script! ${farm.position.x}|${farm.position.y} - Troops available: ${remainingTroops}`);
                        if (remainingTroops < 3) {
                            return;
                        }
                        continue;
                    }

                    const actualTroopsBeingSent = document.getElementById('troopSendForm');
                    if (Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t5]"')[0].value) !== horseTroopCount) {
                        console.log('Not enough troops to attack player.');
                        return;
                    }

                    const checksum = script.textContent.replaceAll(/\\u0027/g, "'").match(/document\.querySelector\(['"]#troopSendForm input\[name=checksum\]['"]\)\.value\s*=\s*['"]([a-f0-9]{6})['"]/i)[1];

                    const action = document.getElementById('troopSendForm').children[0].value;
                    const villageId = action.split("/")[1];

                    const actionUrl = `${window.location.origin}/build.php?gid=16&tt=2`;

                    const sendFormData = new FormData();
                    sendFormData.append('action', action);
                    sendFormData.append('eventType', '4');
                    sendFormData.append('villagename', '');
                    sendFormData.append('x', selectedFarm[0]);
                    sendFormData.append('y', selectedFarm[1]);
                    sendFormData.append('redeployHero', '');
                    sendFormData.append('checksum', checksum);
                    sendFormData.append('troops[0][t1]', '0');
                    sendFormData.append('troops[0][t2]', '0');
                    sendFormData.append('troops[0][t3]', '0');
                    sendFormData.append('troops[0][t4]', '0');
                    sendFormData.append('troops[0][t5]', horseTroopCount);
                    sendFormData.append('troops[0][t6]', '0');
                    sendFormData.append('troops[0][t7]', '0');
                    sendFormData.append('troops[0][t8]', '0');
                    sendFormData.append('troops[0][t9]', '0');
                    sendFormData.append('troops[0][t10]', '0');
                    sendFormData.append('troops[0][t11]', '0');
                    sendFormData.append('troops[0][scoutTarget]', '');
                    sendFormData.append('troops[0][catapultTarget1]', '');
                    sendFormData.append('troops[0][catapultTarget2]', '');
                    sendFormData.append('troops[0][villageId]', villageId);

                    localStorage.setItem(keyBuilder(selectedFarm), expectedArrivalTime);

                    remainingTroops--;
                    await fetch(actionUrl, {
                        method: 'POST',
                        body: sendFormData,
                        headers: {
                            'Accept': 'application/json'
                        }
                    });

                    console.log(`Sent attack to ${selectedFarm}`);
                } else {
                    console.log(`Losses or can't send! ${farm.position.x}|${farm.position.y}`);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        console.log('No players left to farm.');
    }

    const farmOasis = async (animals) => {
        const keyBuilder = (coords) => `f${coords}f`;
        const farmTroopCount = 3;
        const horseTroopCount = 1;

        const villageSearch = await fetch(`${window.location.origin}/dorf1.php`);
        const villageText = await villageSearch.text();

        const villageParser = new DOMParser();
        const villageDoc = villageParser.parseFromString(villageText, 'text/html');

        const heroIsInVillage = villageDoc.getElementById('troops').getElementsByClassName('uhero').length > 0;
        const troopCount = Number(Array.from(villageDoc.getElementById('troops').querySelectorAll("tbody tr")).find(row => row.querySelector(".un")?.textContent.trim().startsWith("Legio"))?.querySelector(".num")?.textContent.trim() ?? '0');
        const horseCount = Number(Array.from(villageDoc.getElementById('troops').querySelectorAll("tbody tr")).find(row => row.querySelector(".un")?.textContent.trim().startsWith("Equites Impera"))?.querySelector(".num")?.textContent.trim() ?? '0');

        const useHorses = horseTroopCount <= horseCount;

        if (animals) {
            if (!heroIsInVillage) {
                console.log('Hero isnt in the village');
                return;
            }
        }

        if (!animals) {
            if (farmTroopCount > troopCount && horseTroopCount > horseCount) {
                console.log('Wont try to send attack. Not enough troops');
                return;
            }
        }

        if (animals) {
            const heroSearch = await fetch(`${window.location.origin}/hero/attributes`);
            const heroTxt = await heroSearch.text();
            const heroHP = Number(heroTxt.split('{\"health\":')[1].split(',')[0]);
            if (heroHP < minHeroHealth) {
                console.log('Hero HP too low');
                return;
            }
        }

        const mapSearch = await fetch(`${window.location.origin}/api/v1/map/position`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: {
                    x: currentVillageCoords[0],
                    y: currentVillageCoords[1],
                    zoomLevel: 3
                }
            })
        });

        const jsonResult = await mapSearch.json();

        const farmList = jsonResult.tiles.filter(k => {
            let animalCount = 0;

            if (animals) {
                const animalParser = new DOMParser();
                const animalDocument = animalParser.parseFromString(k.text, 'text/html');
                animalCount = Array.from(animalDocument.getElementsByClassName('value')).map(k => k.innerText).reduce((a, b) => Number(a) + Number(b), 0);
            }

            return k.did === -1 && animals === k.text.includes('animals') && !k.uid && animalCount < maxAnimalCount;
        }).sort((a, b) => {
            const distA = Math.hypot(a.position.x - currentVillageCoords[0], a.position.y - currentVillageCoords[1]);
            const distB = Math.hypot(b.position.x - currentVillageCoords[0], b.position.y - currentVillageCoords[1]);
            return distA - distB;
        }).map(k => [k.position.x, k.position.y]);

        let selectedFarm = farmList[0];

        if (!selectedFarm) {
            console.log('No animals to farm with hero.');
            return;
        }

        const dateNow = Date.now();

        for (let i = 0; i < farmList.length; i++) {
            const currCord = farmList[i];
            const lastFarm = localStorage.getItem(keyBuilder(currCord));
            if (!lastFarm || animals || (dateNow - lastFarm) >= SEND_TIME_TRIP) {
                selectedFarm = currCord;

                const url = `${window.location.origin}/build.php?gid=16&tt=2`;

                const formData = new URLSearchParams();
                if (!useHorses) {
                    formData.append('troop[t1]', !animals ? farmTroopCount : '');
                }
                if (useHorses) {
                    formData.append('troop[t5]', !animals ? horseTroopCount : '');
                }
                formData.append('troop[t11]', animals ? 1 : '');
                formData.append('villagename', '');
                formData.append('x', selectedFarm[0]);
                formData.append('y', selectedFarm[1]);
                formData.append('eventType', '4');
                formData.append('ok', 'ok');

                const result = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const resultText = await result.text();
                const parser = new DOMParser();
                const document = parser.parseFromString(resultText, 'text/html');

                const script = document.getElementById('confirmSendTroops_script');
                if (!script) {
                    continue;
                }

                const actualTroopsBeingSent = document.getElementById('troopSendForm');
                if ((!animals && (useHorses && Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t5]"')[0].value) !== horseTroopCount || !useHorses && Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t1]"')[0].value) !== farmTroopCount)) || (animals && Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t11]"')[0].value) !== 1)) {
                    console.log('Not enough troops.');
                    return;
                }

                const checksum = script.textContent.replaceAll(/\\u0027/g, "'").match(/document\.querySelector\(['"]#troopSendForm input\[name=checksum\]['"]\)\.value\s*=\s*['"]([a-f0-9]{6})['"]/i)[1];

                const action = document.getElementById('troopSendForm').children[0].value;
                const villageId = action.split("/")[1];

                const actionUrl = `${window.location.origin}/build.php?gid=16&tt=2`;

                const sendFormData = new FormData();
                sendFormData.append('action', action);
                sendFormData.append('eventType', '4');
                sendFormData.append('villagename', '');
                sendFormData.append('x', selectedFarm[0]);
                sendFormData.append('y', selectedFarm[1]);
                sendFormData.append('redeployHero', '');
                sendFormData.append('checksum', checksum);
                sendFormData.append('troops[0][t1]', (!useHorses && !animals) ? farmTroopCount : '0');
                sendFormData.append('troops[0][t2]', '0');
                sendFormData.append('troops[0][t3]', '0');
                sendFormData.append('troops[0][t4]', '0');
                sendFormData.append('troops[0][t5]', (useHorses && !animals) ? horseTroopCount : '0');
                sendFormData.append('troops[0][t6]', '0');
                sendFormData.append('troops[0][t7]', '0');
                sendFormData.append('troops[0][t8]', '0');
                sendFormData.append('troops[0][t9]', '0');
                sendFormData.append('troops[0][t10]', '0');
                sendFormData.append('troops[0][t11]', animals ? '1' : '0');
                sendFormData.append('troops[0][scoutTarget]', '');
                sendFormData.append('troops[0][catapultTarget1]', '');
                sendFormData.append('troops[0][catapultTarget2]', '');
                sendFormData.append('troops[0][villageId]', villageId);

                localStorage.setItem(keyBuilder(selectedFarm), dateNow);

                await fetch(actionUrl, {
                    method: 'POST',
                    body: sendFormData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                console.log(`Sent oasis farm to ${selectedFarm}`);
            }

            if (i === farmList.length - 1) {
                console.log('Nothing else to farm.');
                return;
            }
        }
    }

    const balanceHeroProduction = async () => {
        const currentWood = Number(document.getElementById('l1').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentClay = Number(document.getElementById('l2').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentIron = Number(document.getElementById('l3').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentWarehouse = Number(document.getElementsByClassName('capacity')[0].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const cooldownTime = 1000 * 60 * 20;

        const lastChangeTime = localStorage.getItem('lastChangeTime');
        const currentTime = Date.now();

        const resources = [Math.round(currentWood / currentWarehouse * 100), Math.round(currentClay / currentWarehouse * 100), Math.round(currentIron / currentWarehouse * 100), Math.round(currentCereal / currentGranary * 100)];
        const minResourceValue = Math.min(...resources);
        const maxResourceValue = Math.max(...resources);

        const threshold = 0.5;

        const isSignificantlyLower = minResourceValue < threshold * maxResourceValue;
        const resourceIndex = isSignificantlyLower ? resources.indexOf(minResourceValue) + 1 : 0;

        if (lastChangeTime && currentTime - lastChangeTime < cooldownTime) {
            return;
        }

        localStorage.setItem('lastChangeTime', currentTime);

        await fetch(`${window.location.origin}/api/v1/hero/v2/attributes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resource: resourceIndex,
                attackBehaviour: "hide"
            })
        });
    }

    const getBuildActionButton = async (gid, aid) => {
        const response = await fetch(`${window.location.origin}/build.php?id=${aid}&gid=${gid}&t=0`);
        const text = await response.text();
        const parser = new DOMParser();
        const document = parser.parseFromString(text, 'text/html');

        const primaryButton = playAd ? document
            .getElementsByClassName('upgradeBuilding')[0]
            ?.querySelector('button.textButtonV1.green.build.videoFeatureButton') : undefined;

        const upgradeButton = document
            .getElementsByClassName('upgradeBuilding')[0]
            ?.querySelector('button.textButtonV1.green.build:not(.videoFeatureButton)');

        return {
            button: primaryButton ?? upgradeButton,
            currentTitleLevel: document.getElementsByClassName('level')[0].innerText.split(' ')[1]
        };
    }

    const triggerBuildActionButton = async (button) => {
        const onclickAttr = button.getAttribute("onclick");
        const urlMatch = onclickAttr?.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
        const redirectUrl = urlMatch ? urlMatch[1].replace(/&amp;/g, "&") : null;

        if (redirectUrl) {
            const response = await fetch(`${window.location.origin}${redirectUrl}`);
            return response.ok;
        } else {
            if (!playAd) {
                return false;
            }

            const villageIdMatch = onclickAttr?.match(/villageId\s*:\s*(\d+)/);
            const slotIdMatch = onclickAttr?.match(/slotId\s*:\s*(\d+)/);

            const villageId = villageIdMatch ? parseInt(villageIdMatch[1], 10) : null;
            const slotId = slotIdMatch ? parseInt(slotIdMatch[1], 10) : null;

            const response = await fetch(`${window.location.origin}/api/v1/adsales/open`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "villageId": villageId,
                    "slotId": slotId
                }),
            });

            const res = await response.json();
            let videoContainer = document.getElementById('videoContainer');
            if (!videoContainer) {
                videoContainer = document.createElement('div');
                videoContainer.id = 'videoContainer';
                document.body.appendChild(videoContainer);
            }

            videoContainer.innerHTML = res.html;

            const parser = new DOMParser();
            const doc = parser.parseFromString(res.html, 'text/html');
            const iframe = doc.querySelector('iframe');
            const iframeSrc = iframe.getAttribute('data-cmp-src');
            const autoplaySrc = `${iframeSrc}&autoplay=1`;

            iframe.setAttribute('src', autoplaySrc);

            await sleep(2000);
        }
        return false;
    }

    const fetchVillageDocument = async (path) => {
        const response = await fetch(`${window.location.origin}/${path}${villages[currentVillageIndex]}`);
        const text = await response.text();
        return new DOMParser().parseFromString(text, 'text/html');
    }

    const isWall = (id) => id === 31 || id === 32 || id === 33;
    const isWallOrRally = (id) => isWall(id) || id === 16;

    const upgradeBuilds = async () => {
        const strictGroupOrder = false;

        const queue = [
            [
                [16, 1],
                [31, 1],
                [23, 1]
            ],
            [
                [1, 5],
                [2, 5],
                [3, 5],
                [4, 5]
            ],
            [
                [10, 1],
                [11, 1]
            ],
            [
                [15, 3],
                [12, 3],
                [22, 5],
                [19, 3],
                [20, 5]
            ],
            [
                [10, 5],
                [11, 5]
            ],
            [
                [25, 10]
            ],
            [
                [18, 1],
                [17, 10],
                [24, 10]
            ],
            [
                [8, 5]
            ],
            [
                [1, 10],
                [2, 10],
                [3, 10]
            ],
            [
                [4, 10]
            ]
        ];

        if (queue.length === 0) {
            console.log('Nothing queued');
            return;
        }

        const options = buildings.filter(o => o.good);

        options.sort((a, b) => Number(a.level) - Number(b.level));

        const cerealForProduction = Number(document.getElementById('stockBarFreeCrop').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const cerealRate = currentCereal / currentGranary;

        const newBuilds = queue.some(a => a.some(k => !isWallOrRally(k[0]) && !buildings.some(b => b.gid === k[0])));
        const wall = queue.some(a => a.some(k => isWall(k[0]) && !buildings.some(b => b.gid === k[0])));
        const rally = queue.some(a => a.some(k => k[0] === 16 && !buildings.some(b => b.gid === 16)));
        const sampleSlot = buildings.find(b => b.free && b.id !== 39 && b.id !== 40)?.id;

        const newButtons = [];

        const fetchBuildingButtons = async (id, category = null) => {
            const pageUrl = category 
                ? `${window.location.origin}/build.php?id=${id}&category=${category}`
                : `${window.location.origin}/build.php?id=${id}`;

            try {
                const res = await fetch(pageUrl);
                const resText = await res.text();
                const doc = new DOMParser().parseFromString(resText, 'text/html');
                const buttons = Array.from(doc.getElementsByClassName('green new'));

                newButtons.push(...buttons);
            } catch (error) {
                console.error(`Error fetching buttons for id ${id}:`, error);
            }
        };

        const fetchPromises = [];

        if (newBuilds) {
            if (!sampleSlot) {
                console.error('No space for new buildings!');
            } else {
                [null, 2, 3].forEach(category => 
                    fetchPromises.push(fetchBuildingButtons(sampleSlot, category))
                );
            }
        }

        if (wall) {
            fetchPromises.push(fetchBuildingButtons(40));
        }
        if (rally) {
            fetchPromises.push(fetchBuildingButtons(39));
        }

        await Promise.all(fetchPromises);
        
        for (const group of queue) {
            const buildable = group
                .filter(a => !buildings.some(b => b.gid === a[0]))
                .map(a => a[0]);

            for (const build of buildable) {
                const slot = build === 16 ? 39 : isWall(build) ? 40 : buildings.find(b => b.free && b.id !== 39 && b.id !== 40)?.id;

                if (!slot) {
                    console.log('No More slots available.');
                    break;
                }

                const btn = Array.from(newButtons)
                    .find(b => {
                        const onClickAttr = b.getAttribute("onclick");
                        const match = onClickAttr.match(/gid=(\d+)/);
                        return match && Number(match[1]) === build;
                    });

                if (!btn) {
                    continue;
                }

                const success = await triggerBuildActionButton(btn);

                if (success) {
                    pending = false;
                    window.location.reload(true);
                }

                return;
            }

            const upgradeable = options
                .filter(o => group.some(([id]) => id === Number(o.gid)))
                .sort((a, b) => Number(a.level) - Number(b.level));

            for (const option of upgradeable) {
                const [id, targetLevel] = group.find(([gid]) => gid === Number(option.gid)) || [];
                if (!id) {
                    continue;
                }

                const isCereal = id === 4;

                if (blockCerealWhenNotNeeded && isCereal && cerealForProduction > 10/* && cerealRate > 0.25*/) {
                    console.log('Skipping cereal field. No need yet.');
                    continue;
                }

                const upgradeButton = await getBuildActionButton(option.gid, option.id);
                const button = upgradeButton.button;

                if (!button) {
                    continue;
                }

                const match = button.value.match(/\d+$/);
                const nextLevel = match ? parseInt(match[0], 10) : ((1 + Number(upgradeButton.currentTitleLevel)) ?? Infinity);

                if (nextLevel > targetLevel) {
                    console.log(`${id} level already too high. Continuing.`);
                    continue;
                }

                const success = await triggerBuildActionButton(button);

                if (success) {
                    pending = false;
                    window.location.reload(true);
                    return;
                }
            }

            if (strictGroupOrder) {
                console.log("Couldn't upgrade buildings from priority level. Returning.");
                return;
            }
        }

        console.log("Couldn't upgrade any field.");
    }

    const tradeBetweenVillages = async () => {
        const helpingSystem = [
            {
                sender: "-24|-50",
                saveStoragePercentage: 10,
                receivers: [
                    {
                        village: "-21|-46",
                        did: "25597",
                        fillStoragePercentage: 33,
                        fillGranaryPercentage: 33,
                        minimumToSend: 1000
                    },
                    {
                        village: "-21|-47",
                        did: "27261",
                        fillStoragePercentage: 80,
                        fillGranaryPercentage: 50,
                        minimumToSend: 300
                    }
                ]
            }
        ];

        const entry = helpingSystem.find(h => h.sender === `${currentVillageCoords[0]}|${currentVillageCoords[1]}`);

        if (!entry) {
            return;
        }

        const response = await fetch(`${window.location.origin}/api/v1/graphql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `query {
                ownPlayer {
                  village {
                    marketplace {
                      merchantsInfo {
                        available
                        capacity
                      }
                    }
                  }
                }
              }`
            }),
        });

        const data = await response.json();

        const merchants = Number(data.data.ownPlayer.village.marketplace.merchantsInfo.available);
        if (merchants < 1) {
            return;
        }

        const merchantBaseCapacity = Number(data.data.ownPlayer.village.marketplace.merchantsInfo.capacity);

        const maxResourcesToSend = merchantBaseCapacity * merchants;
        for (const receiver of entry.receivers) {
            const receiverX = Number(receiver.village.split('|')[0]);
            const receiverY = Number(receiver.village.split('|')[1]);

            const receiverResources = indexedResources[receiver.did];

            const ongoingRes = await fetch(`${window.location.origin}/api/v1/graphql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: `query {
                    ownPlayer {
                        village {
                        marketplace {
                            merchantsMovements {
                            edges {
                                node {
                                type
                                to {
                                    x
                                    y
                                }
                                resources {
                                    resourceType {
                                    code
                                    }
                                    amount
                                }
                                arrivalAt
                                }
                            }
                            }
                        }
                        }
                    }
                    }`
                }),
            });

            const resJson = await ongoingRes.json();

            const pendingResources = resJson.data.ownPlayer.village.marketplace.merchantsMovements.edges
                .filter(e => e.node.to.x === receiverX && e.node.to.y === receiverY && e.node.type === "OUTGOING" && e.node.arrivalAt > Math.floor(Date.now() / 1000))
                .reduce((acc, e) => {
                    e.node.resources.forEach(resource => {
                        const code = resource.resourceType.code;
                        acc[code] = (acc[code] || 0) + resource.amount;
                    });
                    return acc;
                }, {});

            const maxResourcesToReceiveA = Math.floor(receiver.fillStoragePercentage / 100 * receiverResources.storage);
            const maxResourcesToReceiveB = Math.floor(receiver.fillGranaryPercentage / 100 * receiverResources.granary);

            const helpedMissingResources = {
                wood: Math.max(maxResourcesToReceiveA - (receiverResources.wood + (pendingResources.lumber ?? 0)), 0),
                clay: Math.max(maxResourcesToReceiveA - (receiverResources.stone + (pendingResources.clay ?? 0)), 0),
                iron: Math.max(maxResourcesToReceiveA - (receiverResources.iron + (pendingResources.iron ?? 0)), 0),
                cereal: Math.max(maxResourcesToReceiveB - (receiverResources.crop + (pendingResources.crop ?? 0)), 0),
            }

            console.log(`Missing resources in ${receiver.village}:`);
            console.log(helpedMissingResources);

            const missingSum = helpedMissingResources.wood + helpedMissingResources.clay + helpedMissingResources.iron + helpedMissingResources.cereal;
            if (missingSum === 0) {
                console.log(`No resources missing in ${receiver.village}.`);
                continue;
            }

            const currentWood = Number(document.getElementById('l1').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
            const currentClay = Number(document.getElementById('l2').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
            const currentIron = Number(document.getElementById('l3').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
            const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

            const intendedResourcesToSend = {
                wood: Math.min(helpedMissingResources.wood, Math.min(currentWood, Math.floor(helpedMissingResources.wood / missingSum * maxResourcesToSend))),
                clay: Math.min(helpedMissingResources.clay, Math.min(currentClay, Math.floor(helpedMissingResources.clay / missingSum * maxResourcesToSend))),
                iron: Math.min(helpedMissingResources.iron, Math.min(currentIron, Math.floor(helpedMissingResources.iron / missingSum * maxResourcesToSend))),
                cereal: Math.min(helpedMissingResources.cereal, Math.min(currentCereal, Math.floor(helpedMissingResources.cereal / missingSum * maxResourcesToSend)))
            };

            const currentWarehouse = Number(document.getElementsByClassName('capacity')[0].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
            const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

            const resourcesToSend = {
                wood: Math.min(intendedResourcesToSend.wood, Math.max(Math.round(currentWood - currentWarehouse * entry.saveStoragePercentage / 100), 0)),
                clay: Math.min(intendedResourcesToSend.clay, Math.max(Math.round(currentClay - currentWarehouse * entry.saveStoragePercentage / 100), 0)),
                iron: Math.min(intendedResourcesToSend.iron, Math.max(Math.round(currentIron - currentWarehouse * entry.saveStoragePercentage / 100), 0)),
                cereal: Math.min(intendedResourcesToSend.cereal, Math.max(Math.round(currentCereal - currentGranary * entry.saveStoragePercentage / 100), 0))
            };

            const resourcesToSendSum = resourcesToSend.wood + resourcesToSend.clay + resourcesToSend.iron + resourcesToSend.cereal;

            console.log(`Trying to send to ${receiver.village}:`);
            console.log(resourcesToSend);

            if (resourcesToSendSum < receiver.minimumToSend) {
                console.log("Not worth to send. Minimum to send is: " + receiver.minimumToSend);
                continue;
            }

            const nonceCall = await fetch(`${window.location.origin}/api/v1/marketplace/resources/send`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: 'marketPlace',
                    destination: {
                        x: receiverX,
                        y: receiverY
                    },
                    resources: {
                        lumber: resourcesToSend.wood,
                        clay: resourcesToSend.clay,
                        iron: resourcesToSend.iron,
                        crop: resourcesToSend.cereal
                    },
                    runs: 1,
                    useTradeShips: false
                }),
            });

            const nonce = nonceCall.headers.get("x-nonce");

            await fetch(`${window.location.origin}/api/v1/marketplace/resources/send`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-nonce": nonce
                },
                body: JSON.stringify({
                    action: 'marketPlace',
                    destination: {
                        x: receiverX,
                        y: receiverY
                    },
                    resources: {
                        lumber: resourcesToSend.wood,
                        clay: resourcesToSend.clay,
                        iron: resourcesToSend.iron,
                        crop: resourcesToSend.cereal
                    },
                    runs: 1,
                    useTradeShips: false
                }),
            });
        }
    }

    const upgradeStorageIfNeeded = async () => {
        const storageEntry = buildings.find(b => b.gid === 10);
        if (!storageEntry) {
            console.log(`Couldn't find building entry for 10`);
            return;
        }

        const granaryEntry = buildings.find(b => b.gid === 11);
        if (!granaryEntry) {
            console.log(`Couldn't find building entry for 11`);
            return;
        }

        const currentWood = Number(document.getElementById('l1').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentClay = Number(document.getElementById('l2').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentIron = Number(document.getElementById('l3').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

        const currentWarehouse = Number(document.getElementsByClassName('capacity')[0].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

        const maxResourceValue = Math.max(currentWood, currentClay, currentIron);
        const currentWarehouseRatio = maxResourceValue / currentWarehouse;

        if (currentWarehouseRatio > 0.9) {
            const buildButton = await getBuildActionButton(storageEntry.gid, storageEntry.id);
            const button = buildButton.button;
            if (button) {
                await triggerBuildActionButton(button);
                pending = false;
                window.location.reload(true);
            } else {
                console.log("Warehouse could not be upgraded.");
            }
        }

        const currentGranaryRatio = currentCereal / currentGranary;

        if (currentGranaryRatio > 0.9) {
            const buildButton = await getBuildActionButton(granaryEntry.gid, granaryEntry.id);
            const button = buildButton.button;
            if (button) {
                await triggerBuildActionButton(button);
                pending = false;
                window.location.reload(true);
            } else {
                console.log("Granary could not be upgraded.");
            }
        }
    }

    const villages = Array.from(document.getElementsByClassName('listEntry village')).map(e => e.querySelector('a').getAttribute('href'));
    const activeVillage = document.querySelector('.listEntry.village.active');
    const activeVillageHref = activeVillage.querySelector('a').getAttribute('href');
    const currentVillageIndex = villages.indexOf(activeVillageHref);

    const urlParams = new URLSearchParams(activeVillageHref);
    const currentVillageId = urlParams.get('newdid');

    const currentVillageCoords = [parseInt(activeVillage.getElementsByClassName('coordinateX')[0].innerText.normalize("NFKC").replace(/[\u2212\u2010-\u2015]/g, '-').replaceAll(/[^\d.,-]/g, '').replaceAll('(', ''), 10), parseInt(activeVillage.getElementsByClassName('coordinateY')[0].innerText.normalize("NFKC").replace(/[\u2212\u2010-\u2015]/g, '-').replaceAll(/[^\d.,-]/g, '').replaceAll(')', ''), 10)];

    const nextTick = localStorage.getItem('nextTick');
    if (!nextTick) {
        localStorage.setItem('nextTick', Date.now() + TIME_IN_EACH_VILLAGE);
    } else {
        if (nextTick < Date.now()) {
            localStorage.setItem('nextTick', Date.now() + TIME_IN_EACH_VILLAGE);
            window.location.href = `${window.location.origin}/dorf2.php${villages[(currentVillageIndex + 1) % villages.length]}`;
        }
    }

    const [documentVil1, documentVil2] = await Promise.all([
        fetchVillageDocument('dorf1.php'),
        fetchVillageDocument('dorf2.php')
    ]);

    const queued = documentVil1.getElementsByClassName('buildDuration').length;

    const buildings = [documentVil1, documentVil2]
        .map(v => Array.from(v.getElementsByClassName('buildingSlot'))
            .concat(Array.from(v.getElementsByClassName('resourceField')))
            .map(e => ({
                good: e.classList.contains('good') || e.children[0].classList.contains('good'),
                free: e.classList.contains('g0'),
                gid: Number(e.parentElement.getAttribute('data-gid') ?? e.getAttribute('data-gid')),
                id: Number(e.parentElement.getAttribute('data-aid') ?? e.getAttribute('data-aid')),
                level: Number(e.getElementsByClassName('labelLayer')[0]?.innerText || '0') + Number(e.classList.contains('underConstruction') ? 1 : 0)
            }))).flat();

    await collectResources();

    if (queued < 3) {
        await upgradeBuilds();
        await upgradeStorageIfNeeded();
    } else {
        console.log('Fully booked.')
    }

    await Promise.all([
        //farmPlayers(),
        adventure(),
        //balanceHeroProduction(),
        farmOasis(true),
        //farmOasis(false),
        /*recruit({
            id: 19,
            troopId: 't3',
            troopCount: 1,
            timeout: 2 * 60 * 1000 + 30 * 1000,
            villages: [
                [-13, 87]
            ]
        }),
        recruit({
            id: 20,
            troopId: 't5',
            troopCount: 1,
            timeout: 2 * 60 * 1000 + 30 * 1000,
            villages: [
                [-13, 87]
            ]
        }),*/
    ]);


    const resourcePromises = villages.map(v => new Promise(async (resolve) => {
        const res = await fetch(`${window.location.origin}/api/v1/village/resources${v}`, {
            method: 'POST'
        });

        const jRes = await res.json();

        const storage = jRes.maxStorage.l1;
        const granary = jRes.maxStorage.l4;
        const wood = jRes.storage.l1;
        const stone = jRes.storage.l2;
        const iron = jRes.storage.l3;
        const crop = jRes.storage.l4;

        const params = new URLSearchParams(v);
        const villageId = params.get("newdid");
        resolve({
            villageId: villageId,
            resources: {
                storage: storage,
                granary: granary,
                wood: wood,
                stone: stone,
                iron: iron,
                crop: crop
            }
        });
    }));

    const final = await Promise.all(resourcePromises);

    // make sure we are in activeVillageHref
    await fetch(`${window.location.origin}/api/v1/village/resources${activeVillageHref}`, {
        method: 'POST'
    });

    const indexedResources = final.reduce((acc, { villageId, resources }) => {
        acc[villageId] = resources;
        return acc;
    }, {});

    await tradeBetweenVillages();

    pending = false;
    console.log(`Reloading in ${TIME_IN_EACH_VILLAGE / 1000}s.`);
    setTimeout(() => {
        window.location.reload(true);
    }, TIME_IN_EACH_VILLAGE);
}

setTimeout(script, 3000);