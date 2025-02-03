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
    const MIN_INTERVAL = 20 * 60 * 1000;
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
    const farmTroopCount = 2;
    const farmList = [[75, 38], [76, 38], [80, 37], [76, 41], [83, 37], [72, 35], [72, 40], [71, 41]];
    const selectedFarm = farmList[Math.floor(Math.random() * farmList.length)];
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
    console.log(villageId);

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
balanceHeroProduction();
farmOasis();
recruit();

console.log("Reloading in 60s.");
setTimeout(() => {
    window.location.reload(true);
}, 1000 * 60);