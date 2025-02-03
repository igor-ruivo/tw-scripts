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

const recruit = async () => {
    const MIN_INTERVAL = 15 * 60 * 1000;
    const key = 'last_t1'
    const lastExecution = localStorage.getItem(key);
    const now = Date.now();

    if (!lastExecution || now - lastExecution >= MIN_INTERVAL) {
        const url = `${window.location.origin}/build.php?id=21&gid=19`;

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
        sendFormData.append('t1', '1');
        sendFormData.append('s1', 'ok');

        await fetch(url, {
            method: 'POST',
            body: sendFormData,
            headers: {
                'Accept': 'application/json'
            }
        });
        localStorage.setItem(key, now);
    }
}

const farmOasis = async () => {
    const keyBuilder = (coords) => `f${coords}f`;
    const farmTroopCount = 2;
    const farmList = [[76,38],[75,38],[76,41],[80,37],[80,40],[76,42],[76,34],[75,42],[81,40],[77,43],[77,33],[76,43],[76,33],[72,40],[80,43],[72,35],[83,37],[76,32],[78,32],[75,32],[72,42],[82,42],[71,41],[76,31],[81,32],[80,45],[72,44],[72,32],[78,46],[81,31],[78,30],[69,36],[75,30],[73,46],[85,34],[77,47],[76,47],[68,39],[68,37],[75,29],[86,42],[87,38],[71,30],[76,48],[67,39],[87,37],[72,47],[87,41],[67,35],[69,31],[87,34],[71,47],[66,39],[88,37],[75,27],[88,35],[77,50],[78,50],[89,39],[72,49],[66,33],[75,50],[67,45],[65,41],[89,35],[83,49],[66,44],[71,27],[65,42],[89,34],[69,48],[85,48],[82,50],[64,38],[84,49],[66,45],[70,27],[75,51],[90,40],[64,36],[90,36],[65,44],[71,26],[81,51],[69,27],[73,25],[70,26],[64,33],[91,38],[67,48],[91,40],[87,28],[80,52],[91,35],[72,52],[82,24],[77,53],[68,26],[77,23],[75,23],[63,44],[63,32],[90,30],[69,25],[85,25],[92,41],[81,53],[92,42],[91,31],[70,24],[84,24],[68,51],[86,51],[68,25],[92,43],[91,46],[92,32],[89,27],[67,51],[87,51],[64,48],[90,48],[91,47],[68,24],[69,23],[90,27],[66,25],[91,28],[62,47],[68,23],[64,50],[91,27],[67,23],[90,25],[92,49],[92,27],[90,52],[63,51],[92,26],[65,23],[64,53],[64,23],[63,23]];
    let selectedFarm = farmList[0];
    const intervalFarmTime = 1000 * 60 * 60;

    const dateNow = Date.now();

    for (let i = 0; i < farmList.length; i++) {
        const currCord = farmList[i];
        const lastFarm = localStorage.getItem(keyBuilder(currCord));
        if (!lastFarm || (dateNow - lastFarm) >= intervalFarmTime ) {
            selectedFarm = currCord;
            break;
        }

        if (i === farmList.length - 1) {
            console.log('Nothing else to farm.');
        }
    }

    const url = `${window.location.origin}/build.php?gid=16&tt=2`;

    const formData = new URLSearchParams();
    formData.append('troop[t1]', farmTroopCount);
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
    if (Number(actualTroopsBeingSent.querySelectorAll('[name="troops[0][t1]"')[0].value) !== farmTroopCount) {
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
    sendFormData.append('troops[0][t1]', farmTroopCount);
    sendFormData.append('troops[0][t2]', '0');
    sendFormData.append('troops[0][t3]', '0');
    sendFormData.append('troops[0][t4]', '0');
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

const upgradeResources = async () => {
    const cerealSlots = new Set([2, 8, 9, 12, 13, 15]);
    const specialBuildingIds = [27];
    const allBuildingIds = [...Array.from({ length: 18 }, (_, i) => i + 1), ...specialBuildingIds];

    const requests = allBuildingIds.map(async (buildingId) => {
        const upgradeButton = await getBuildActionButton(buildingId);

        if (!upgradeButton) {
            return null;
        }

        // Extract next level from button text (last integer)
        const match = upgradeButton.value.match(/\d+$/);
        const nextLevel = match ? parseInt(match[0], 10) : Infinity;
        const isCereal = cerealSlots.has(buildingId);
        const isBonusBuilding = specialBuildingIds.includes(buildingId);

        return { isCereal, nextLevel, upgradeButton, isBonusBuilding };
    });

    // Wait for all requests
    const buildings = (await Promise.all(requests)).filter(Boolean);

    if (buildings.length === 0) {
        console.log("No resources can be upgraded.");
        return;
    }

    const cerealForProduction = Number(document.getElementById('stockBarFreeCrop').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());

    buildings.sort((a, b) => {
        if (a.isBonusBuilding !== b.isBonusBuilding) {
            return a.isBonusBuilding ? -1 : 1; // Prioritize bonus buildings
        }
        return a.nextLevel - b.nextLevel; // Then sort by nextLevel
    });

    for (const building of buildings) {
        const { upgradeButton, isCereal } = building;

        const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').replaceAll(',', '').trim());
        const cerealRate = currentCereal / currentGranary;

        if (isCereal && cerealForProduction > 25 && cerealRate > 0.25) {
            console.log('Skipping cereal field. No need yet.');
            continue;
        }

        // If the button exists, try to trigger the upgrade
        if (upgradeButton) {
            const success = await triggerBuildActionButton(upgradeButton);

            if (success) {
                return;
            }
        }
    }

    console.log("Couldn't upgrade any resource field.");
}

const upgradeStorageIfNeeded = async () => {
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
        const buildButton = await getBuildActionButton(30);
        if (buildButton) {
            await triggerBuildActionButton(buildButton);
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
        } else {
            console.log("Granary could not be upgraded.");
        }
    }
}

upgradeResources();
upgradeStorageIfNeeded();
//balanceHeroProduction();
farmOasis();
recruit();

console.log("Reloading in 60s.");
setTimeout(() => {
    window.location.reload(true);
}, 1000 * 60);