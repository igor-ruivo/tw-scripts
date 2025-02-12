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

const currentVillageCoords = [-24, -50];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const SEND_TIME_TRIP = 1000 * 60 * 10;
const blockHeroLootIfHasAdventures = false;

const recruit = async (troopConfig) => {
    const key = `last_${String(troopConfig.id)}`
    const lastExecution = localStorage.getItem(key);
    const now = Date.now();

    if (!lastExecution || now - lastExecution >= troopConfig.timeout) {
        const url = `${window.location.origin}/build.php?id=${troopConfig.id}`;

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

        await fetch(url, {
            method: 'POST',
            body: sendFormData,
            headers: {
                'Accept': 'application/json'
            }
        });
        localStorage.setItem(key, now);
        //window.location.reload(true);
    }
}

const adventure = async () => {
    const mapSearch = await fetch(`${window.location.origin}/karte.php?zoom=3&x=${currentVillageCoords[0]}&y=${currentVillageCoords[1]}`);

    const text = await mapSearch.text();
    const adventureParser = new DOMParser();
    const adventureDoc = adventureParser.parseFromString(text, 'text/html');

    const scripts = adventureDoc.getElementsByTagName('script');

    for (const script of scripts) {
        const match = script.innerText.match(/data:\s*(\{.*?\})\s*,?\n\s*mapMarks:/s);
        //console.log(script.innerText);
        if (match) {
            console.log(script.innerText)
            console.log(script.innerText.includes('dventure'))
            console.log(match[1]);
            //console.log(JSON.parse(match[1]).elements.map(k => k.symbols[0]));
            break;
        }
    }

    //console.log(JSON.parse(text.match(/data:\s*(\{.*?\})\s*,?\n\s*mapMarks:/s)[1]).elements.map(k => k.symbols[0]));
}

const farmPlayers = async () => {
    const keyBuilder = (coords) => `f${coords}f`;
    const horseTroopCount = 1;

    const villageSearch = await fetch(`${window.location.origin}/dorf1.php`);
    const villageText = await villageSearch.text();

    const villageParser = new DOMParser();
    const villageDoc = villageParser.parseFromString(villageText, 'text/html');
    const horseCount = Number(Array.from(villageDoc.getElementById('troops').querySelectorAll("tbody tr")).find(row => row.querySelector(".un")?.textContent.trim().startsWith("Theutates Thunder"))?.querySelector(".num")?.textContent.trim() ?? '0');

    if (horseTroopCount > horseCount) {
        console.log('Wont try to send attack. Not enough troops');
        return;
    }

    const dateNow = Date.now();

    const farmList = [
        [-25, -46],
        [-31, -48],
        [-22, -46],
        [-21, -48],
        [-28, -46],
        [-27, -45],
        [-20, -45],
        [-13, -57],
        [-9, -56],
        [-14, -53],
        [-13, -50],
        [-15, -44],
        [-20, -43],
        [-23, -41],
        [-29, -43],
        [-33, -42],
        [-34, -43],
        [-38, -44],
        [-27, -53],
    ].sort((a, b) => {
        const distA = Math.hypot(a[0] - currentVillageCoords[0], a[1] - currentVillageCoords[1]);
        const distB = Math.hypot(b[0] - currentVillageCoords[0], b[1] - currentVillageCoords[1]);
        return distA - distB;
    });

    let selectedFarm = farmList[0];

    for (let i = 0; i < farmList.length; i++) {
        const currCord = farmList[i];
        const lastFarm = localStorage.getItem(keyBuilder(currCord));
        if (!lastFarm || (dateNow - lastFarm) >= SEND_TIME_TRIP ) {

            const reports = await fetch(`${window.location.origin}/api/v1/map/tile-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({"x":currCord[0],"y":currCord[1]})
            });

            const reportsJson = await reports.json();
            const htmlComponent = reportsJson.html;

            const parser = new DOMParser();
            const html = parser.parseFromString(htmlComponent, 'text/html');
            const troopInfo = html.getElementById('troop_info');
            const noLosses = (!!troopInfo.querySelector('[alt="Won as attacker without losses."]')) || troopInfo.innerText.includes('No information');

            if (noLosses) {
                selectedFarm = currCord;
                break;
            }
        }

        if (i === farmList.length - 1) {
            console.log('No players left to farm.');
            return;
        }
    }

    const url = `${window.location.origin}/build.php?gid=16&tt=2`;

    const formData = new URLSearchParams();
    formData.append('troop[t4]', horseTroopCount);
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
        return;
    }

    const actualTroopsBeingSent = document.getElementById('troopSendForm');
    if (Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t4]"')[0].value) !== horseTroopCount) {
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
    sendFormData.append('troops[0][t4]', horseTroopCount);
    sendFormData.append('troops[0][t5]', '0');
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

    await fetch(actionUrl, {
        method: 'POST',
        body: sendFormData,
        headers: {
            'Accept': 'application/json'
        }
    });

    localStorage.setItem(keyBuilder(selectedFarm), dateNow);
    window.location.reload(true);
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
    const troopCount = Number(Array.from(villageDoc.getElementById('troops').querySelectorAll("tbody tr")).find(row => row.querySelector(".un")?.textContent.trim().startsWith("Phalanx"))?.querySelector(".num")?.textContent.trim() ?? '0');
    const horseCount = Number(Array.from(villageDoc.getElementById('troops').querySelectorAll("tbody tr")).find(row => row.querySelector(".un")?.textContent.trim().startsWith("Theutates Thunder"))?.querySelector(".num")?.textContent.trim() ?? '0');

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
        if (heroHP < 40) {
            console.log('Hero HP too low');
            return;
        }
    }

    if (animals && blockHeroLootIfHasAdventures) {
        const adventureCount = Number(villageDoc.getElementsByClassName('adventure')[0].children[0].innerText);

        if (adventureCount > 0) {
            console.log(`There are ${adventureCount} adventures pending.`);
            return;
        }
    }

    const mapSearch = await fetch(`${window.location.origin}/api/v1/map/position`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({data:{
            x: currentVillageCoords[0],
            y: currentVillageCoords[1],
            zoomLevel: 3
        }})
    });

    const jsonResult = await mapSearch.json();

    const farmList = jsonResult.tiles.filter(k => {
        let animalCount = 0;

        if (animals) {
            const animalParser = new DOMParser();
            const animalDocument = animalParser.parseFromString(k.text, 'text/html');
            animalCount = Array.from(animalDocument.getElementsByClassName('value')).map(k => k.innerText).reduce((a, b) => Number(a) + Number(b), 0);
        }

        return k.did === -1 && animals === k.text.includes('animals') && !k.uid && animalCount < 15;
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
        if (!lastFarm || animals || (dateNow - lastFarm) >= SEND_TIME_TRIP ) {
            selectedFarm = currCord;
            break;
        }

        if (i === farmList.length - 1) {
            console.log('Nothing else to farm.');
            return;
        }
    }

    const url = `${window.location.origin}/build.php?gid=16&tt=2`;

    const formData = new URLSearchParams();
    if (!useHorses) {
        formData.append('troop[t1]', !animals ? farmTroopCount : '');
    }
    if (useHorses) {
        formData.append('troop[t4]', !animals ? horseTroopCount : '');
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
        return;
    }

    const actualTroopsBeingSent = document.getElementById('troopSendForm');
    if ((!animals && (useHorses && Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t4]"')[0].value) !== horseTroopCount || !useHorses && Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t1]"')[0].value) !== farmTroopCount)) || (animals && Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t11]"')[0].value) !== 1)) {
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
    sendFormData.append('troops[0][t4]', (useHorses && !animals) ? horseTroopCount : '0');
    sendFormData.append('troops[0][t5]', '0');
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

    await fetch(actionUrl, {
        method: 'POST',
        body: sendFormData,
        headers: {
            'Accept': 'application/json'
        }
    });

    localStorage.setItem(keyBuilder(selectedFarm), dateNow);
    window.location.reload(true);
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

    localStorage.setItem('lastChangeTime', currentTime);
}

const getBuildActionButton = async (id) => {
    const response = await fetch(`${window.location.origin}/build.php?id=${id}`);
    const text = await response.text();
    const parser = new DOMParser();
    const document = parser.parseFromString(text, 'text/html');

    const upgradeButton = document
        .getElementsByClassName('upgradeBuilding')[0]
        ?.querySelector('button.textButtonV1.green.build:not(.videoFeatureButton)');

    return upgradeButton;
}

const triggerBuildActionButton = async (button) => {
    const onclickAttr = button.getAttribute("onclick");
    const urlMatch = onclickAttr?.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
    const redirectUrl = urlMatch ? urlMatch[1].replace(/&amp;/g, "&") : null;

    if (redirectUrl) {
        const response = await fetch(`${window.location.origin}${redirectUrl}`);
        return response.ok;
    }
    return false;
}

const fetchVillageDocument = async (path) => {
    const response = await fetch(`${window.location.origin}/${path}`);
    const text = await response.text();
    return new DOMParser().parseFromString(text, 'text/html');
}

const extractOptions = (document) => Array.from(document.getElementsByClassName('good'))
    .map(e => ({
        id: e.getAttribute('href')?.split('id=')[1]?.split('&')[0] || '40',
        level: Number(e.getElementsByClassName('labelLayer')[0]?.innerText || '0') + Number(e.classList.contains('underConstruction') ? 1 : 0)
    }));

const upgradeBuilds = async () => {
    const strictGroupOrder = false;

    const queue = [
        [
            [26, 10]
        ],
        [
            [31, 10]
        ],
        [
            [1, 10],
            [3, 10],
            [4, 10],
            [5, 10],
            [6, 10],
            [7, 10],
            [10, 10],
            [11, 10],
            [14, 10],
            [16, 10],
            [17, 10],
            [18, 10]
        ],
        [
            [19, 10]
        ],
        [
            [2, 10],
            [8, 10],
            [9, 10],
            [12, 10],
            [13, 10],
            [15, 10]
        ]
    ];

    if (queue.length === 0) {
        console.log('Nothing queued');
        return;
    }

    const [documentVil1, documentVil2] = await Promise.all([
        fetchVillageDocument('dorf1.php'),
        fetchVillageDocument('dorf2.php')
    ]);

    const queued = documentVil1.getElementsByClassName('buildDuration').length;
    if (queued >= 1) {
        console.log('Fully booked');
        return;
    }

    const options = [...extractOptions(documentVil1), ...extractOptions(documentVil2)];

    if (options === 0) {
        console.log('Nothing available to build.');
        return;
    }

    const cerealSlots = new Set([2, 8, 9, 12, 13, 15]);

    options.sort((a, b) => Number(a.level) - Number(b.level));

    const cerealForProduction = Number(document.getElementById('stockBarFreeCrop').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const cerealRate = currentCereal / currentGranary;

    for (const group of queue) {
        const upgradeable = options
            .filter(o => group.some(([id]) => id === Number(o.id)))
            .sort((a, b) => Number(a.level) - Number(b.level));

        for (const option of upgradeable) {
            const [id, targetLevel] = group.find(([gid]) => gid === Number(option.id)) || [];
            if (!id) {
                continue;
            }

            const isCereal = cerealSlots.has(id);

            if (isCereal && cerealForProduction > 10/* && cerealRate > 0.25*/) {
                console.log('Skipping cereal field. No need yet.');
                continue;
            }

            await sleep(Math.random() * 2000);

            const upgradeButton = await getBuildActionButton(id);

            if (!upgradeButton) {
                continue;
            }

            const match = upgradeButton.value.match(/\d+$/);
            const nextLevel = match ? parseInt(match[0], 10) : Infinity;

            if (nextLevel > targetLevel) {
                console.log(`${id} level already too high. Continuing.`);
                continue;
            }

            const success = await triggerBuildActionButton(upgradeButton);

            if (success) {
                window.location.reload(true);
                return;
            }
        }

        if (strictGroupOrder) {
            console.log("Couldn't upgrade buildings from priority level 1. Returning.");
            return;
        }
    }

    console.log("Couldn't upgrade any resource field.");
}

const upgradeStorageIfNeeded = async () => {
    const queued = document.getElementsByClassName('buildDuration').length;
    if (queued >= 1) {
        console.log('Fully booked');
        return;
    }

    const currentWood = Number(document.getElementById('l1').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const currentClay = Number(document.getElementById('l2').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const currentIron = Number(document.getElementById('l3').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

    console.log(`${currentWood} Wood`);
    console.log(`${currentClay} Clay`);
    console.log(`${currentIron} Iron`);
    console.log(`${currentCereal} Cereal`);

    const currentWarehouse = Number(document.getElementsByClassName('capacity')[0].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
    const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

    console.log(`${currentWarehouse} Warehouse space`);
    console.log(`${currentGranary} Granary space`);

    const maxResourceValue = Math.max(currentWood, currentClay, currentIron);
    const currentWarehouseRatio = maxResourceValue / currentWarehouse;

    console.log(`Warehouse at ${currentWarehouseRatio * 100}%`);

    if (currentWarehouseRatio > 0.9) {
        // upgrade storage
        const buildButton = await getBuildActionButton(27);
        if (buildButton) {
            await triggerBuildActionButton(buildButton);
            window.location.reload(true);
        } else {
            console.log("Warehouse could not be upgraded.");
        }
    }

    const currentGranaryRatio = currentCereal / currentGranary;

    console.log(`Granary at ${currentGranaryRatio * 100}%`);

    if (currentGranaryRatio > 0.9) {
        const buildButton = await getBuildActionButton(28);
        if (buildButton) {
            await triggerBuildActionButton(buildButton);
            window.location.reload(true);
        } else {
            console.log("Granary could not be upgraded.");
        }
    }
}

upgradeBuilds();
upgradeStorageIfNeeded();
//balanceHeroProduction();
farmOasis(true);
farmPlayers();
//farmOasis(false);
//adventure();

recruit({
    id: 24,
    troopId: 't1',
    troopCount: 1,
    timeout: 14 * 60 * 1000
});

recruit({
    id: 30,
    troopId: 't4',
    troopCount: 1,
    timeout: 33 * 60 * 1000
});

console.log("Reloading in 500s.");
setTimeout(() => {
    window.location.reload(true);
}, 1000 * 60);