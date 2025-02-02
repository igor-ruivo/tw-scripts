// ==UserScript==
// @name                Travian Builder Bot
// @description 	    Automatically updates the desired buildings as soon as possible.
// @author		        Igor Ruivo
// @include             http*travian*dorf*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

const getBuildActionButton = async (id) => {
    const response = await fetch(`${window.location.origin}/build.php?id=${id}`);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');

    const upgradeButton = doc
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

    const cerealForProduction = Number(document.getElementById('stockBarFreeCrop').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());

    buildings.sort((a, b) => {
        if (a.isBonusBuilding !== b.isBonusBuilding) {
            return a.isBonusBuilding ? -1 : 1; // Prioritize bonus buildings
        }
        return a.nextLevel - b.nextLevel; // Then sort by nextLevel
    });

    for (const building of buildings) {
        const { upgradeButton, isCereal } = building;

        const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());
        const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());
        const cerealRate = currentCereal / currentGranary;

        if (isCereal && cerealForProduction > 25 && cerealRate > 0.25) {
            console.log('Skipping cereal field. No need yet.');
            continue;
        }

        // If the button exists, try to trigger the upgrade
        if (upgradeButton) {
            const success = await triggerBuildActionButton(upgradeButton);

            if (success) {
                window.location.reload(true);
                return;
            }
        }
    }

    console.log("Couldn't upgrade any resource field.");
}

const upgradeStorageIfNeeded = async () => {
    const currentWood = Number(document.getElementById('l1').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());
    const currentClay = Number(document.getElementById('l2').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());
    const currentIron = Number(document.getElementById('l3').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());
    const currentCereal = Number(document.getElementById('l4').innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());

    console.log(`${currentWood} Wood`);
    console.log(`${currentClay} Clay`);
    console.log(`${currentIron} Iron`);
    console.log(`${currentCereal} Cereal`);

    const currentWarehouse = Number(document.getElementsByClassName('capacity')[0].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());
    const currentGranary = Number(document.getElementsByClassName('capacity')[1].innerText.replaceAll(/[^\d.,-]/g, '').replaceAll(' ', '').trim());

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

upgradeResources();
upgradeStorageIfNeeded();

console.log("Reloading in 60s.");
setTimeout(() => {
    window.location.reload(true);
}, 1000 * 60);