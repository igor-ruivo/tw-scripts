// ==UserScript==
// @name                Tribal Wars Walls Destroyer Bot
// @description 	      Automatically sends attacks with rams and viks to barbarian villages previously marked as containing walls. Requires previous usage of autoFarmer.js. This script should be used only once whenever a considerable number of reports are obtained with yellow or red marker. 
// @author		         Igor Ruivo
// @include             http*://*screen=place*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

const template = {
    spear: 0, sword: 0, axe: 30, archer: 0,
    spy: 0, light: 0, marcher: 0, heavy: 0,
    ram: 8, catapult: 0,
    knight: 0, snob: 0
};

const troopsSpeed = {
   spear: 18 * 60,
   sword: 22 * 60,
   axe: 18 * 60,
   archer: 18 * 60,
   spy: 9 * 60,
   light: 10 * 60,
   marcher: 10 * 60,
   heavy: 11 * 60,
   ram: 30 * 60,
   catapult: 30 * 60,
   knight: 10 * 60,
   snob: 35 * 60
};

const waitTimeForDistanceTooltipToAppear = 5000;

(function () {
   'use strict';
   document.getElementById("checkbox")?.click();
    if(location.href.includes("try=confirm")) {
        document.getElementById("troop_confirm_go").click();
        return;
    }

    const durationPerSquare = getSlowestTroopTime(Object.values(template));

    Object.keys(template).forEach(k => {
        const val = template[k];
        document.getElementById("unit_input_" + k).value = val;
    });
    const barbCoords = Object.keys(localStorage).filter(k => k.length === 13 && k.startsWith("$w$") && k.endsWith("$w$") && k.includes("|"));
    for(let i = 0; i < barbCoords.length; i++) {
        const value = JSON.parse(localStorage[barbCoords[i]]);
        if(value.status === 0) {
            document.getElementById("place_target").children[0].value = barbCoords[i].slice(3, -3);
            const newVal = {
                status: 1,
                sendTime: Date.parse(new Date()),
                slowestTroop: durationPerSquare
            };
            localStorage[barbCoords[i]] = JSON.stringify(newVal);
            document.getElementById("target_attack").click();
            return;
        }
    }
})();

function getSlowestTroopTime(userSetting) {
   let slowestTime = 0;
   for (let i = 0; i < userSetting.length; i++) {
      if (userSetting[i] > 0) {
         if (Object.values(troopsSpeed)[i] > slowestTime) {
            slowestTime = Object.values(troopsSpeed)[i];
         }
      }
   }
   return slowestTime;
}