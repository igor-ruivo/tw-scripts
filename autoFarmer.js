// ==UserScript==
// @name                Tribal Wars Auto Farmer Bot
// @description 	      Automatically farms barbarian villages whenever possible. Requires Farm Assistant. Recommendations: A with 2 light cavalry and B with 1 light cavalry, 100 entries per page and include reports with losses.
// @author		         Igor Ruivo
// @include             http*://*screen=am_farm*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

const baseTimeInMillisBetweenFarms = 1500;
const reloadTimeInMillis = 45000;
const offsetTimeInMillis = 3000;

let stopIteration = false;

(function () {
	'use strict';

	setTimeout(function () {
		nextIteration();
      console.log("Reload dentro de " + Math.round(reloadTimeInMillis / 1000) + " segundos...");
	}, offsetTimeInMillis);

   setTimeout(function () {
		window.location.reload(true);
	}, reloadTimeInMillis + offsetTimeInMillis);
})();

function isErrorBeingShown() {
   return !!document.querySelector(".autoHideBox.error");
}

function buttonIsDisabled(button) {
   return button.classList.contains("farm_icon_disabled");
}

function farm(index, button) {
   const delay = baseTimeInMillisBetweenFarms * index + Math.round(Math.random() * 500);
   setTimeout(function () {
      if(stopIteration || buttonIsDisabled(button)) {
         return;
      }
      if(isErrorBeingShown()) {
         stopIteration = true;
         return;
      }
      button.click();
	}, delay);
}

function nextIteration() {
   const list = document.getElementById("plunder_list");
   const lines = list.querySelectorAll("tr[id]:not([style])");

   //only schedule numberOfClicks clicks
   const numberOfClicks = Math.min(Math.round(reloadTimeInMillis / baseTimeInMillisBetweenFarms), lines.length);
   for(let i = 0; i < numberOfClicks; i++) {
      const line = lines[i];
      const columns = line.querySelectorAll("td");
      const iconColumn = columns[2];
      const icon = iconColumn.children[0];
      const partialLoot = icon?.getAttribute("src")?.endsWith("max_loot/0.png");
      const buttonA = line.querySelector(".farm_icon.farm_icon_a");
      const buttonB = line.querySelector(".farm_icon.farm_icon_b");
      farm(i, partialLoot ? buttonB : buttonA);
   }
}