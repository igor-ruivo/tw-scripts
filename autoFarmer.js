// ==UserScript==
// @name                Tribal Wars Auto Farmer Bot
// @description 	      Automatically farms barbarian villages whenever possible. Requires Farm Assistant. Model A should have more troops than Model B.
// @author		         Igor Ruivo
// @include             http*tribalwars*screen=am_farm*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

const baseTimeInMillisBetweenFarms = 1500;
const setupIntervalTimerInMillis = 500;
const waitTimePerPageOrVillageChange = 5000;

const maxMinutesBetweenAttacks = 10;
const alwaysTrySendAttackWhenNotAlreadyAttacking = false;

const farmVillages = [
   {
      coordinates: "600|473",
      A: { spear: 0, sword: 0, axe: 0, archer: 0, spy: 0, light: 1, marcher: 0, heavy: 0, knight: 0 },
      B: { spear: 0, sword: 0, axe: 0, archer: 0, spy: 0, light: 1, marcher: 0, heavy: 0, knight: 0 }
   }
];

let stopIteration = false;
const nPages = Number(document.getElementsByClassName("paged-nav-item").length / 2);
const currentPageIndex = nPages !== 0 ? Number(document.querySelector("strong").innerText.trim().slice(1, -1)) - 1 : 0;

(function () {
   'use strict';
   window.sessionStorage.prevWin = window.location.href;
   setTimeout(function () {
      if(!document.getElementById("wood")) {
         window.location.href = window.location.href.replace("&action=edit", "");
      }
      document.getElementById("checkbox")?.click();
   }, 2 * 1000);

   Object.keys(farmVillages[0].A).forEach(e => {
      const serverHasTroop = document.querySelectorAll('[data-unit="' + e + '"]').length > 0;
      if(!serverHasTroop) {
         farmVillages.forEach(f => {
            delete f.A[e];
            delete f.B[e];
         });
      }
   });

   const status = checkForCorruptedFarmVillages();
   switch (status) {
      case 1:
         console.log("farmVillages inválido. Aldeia duplicada.");
         break;
      case 2:
         console.log("farmVillages inválido. Há modelos sem tropas.");
         break;
      default:
         break;
   }

   if (status !== 0) {
      console.log("Reload em 10 minutos.");
      setTimeout(function () {
         window.location.reload(true);
      }, 10 * 60 * 1000);
      return;
   }

   if (localStorage["$$autoFarmer$$"] && getCurrentVillage() !== JSON.parse(localStorage["$$autoFarmer$$"])) {
      localStorage["$$autoFarmer$$"] = JSON.stringify(getCurrentVillage());
      if(!window.location.href.includes("Farm_page=0")) {
         window.location.href = window.location.href.split("am_farm")[0] + "am_farm" + "&order=distance&dir=asc&Farm_page=0";
         return;
      }
   }

   if (!farmVillages.some(v => v.coordinates === getCurrentVillage())) {
      setTimeout(function () {
         document.getElementById("village_switch_right")?.click();
      }, waitTimePerPageOrVillageChange);
      return;
   }

   if (document.getElementById("farm_pagesize") && document.getElementById("farm_pagesize").value !== "100") {
      document.getElementById("farm_pagesize").value = "100";
      document.getElementsByClassName("btn")[1].click();
      return;
   }

   setup();

   setTimeout(function () {
      const iterationResult = nextIteration();
      const farmsScheduled = iterationResult.attacks;
      const changePage = !iterationResult.noMoreTroops;
      const timer = farmsScheduled * baseTimeInMillisBetweenFarms + Math.round(Math.random() * 500) + waitTimePerPageOrVillageChange;
      console.log("Reload dentro de " + Math.round(timer / 1000) + " segundos...");

      setTimeout(function () {
         if (currentPageIndex + 1 < nPages && changePage) {
            document.getElementsByClassName("paged-nav-item")[currentPageIndex + 1].click();
            return;
         }
         localStorage["$$autoFarmer$$"] = JSON.stringify(getCurrentVillage());
         const nextVillageButton = document.getElementById("village_switch_right");
         nextVillageButton ? nextVillageButton.click() : window.location.href = window.location.href.split("am_farm")[0] + "am_farm" + "&order=distance&dir=asc&Farm_page=0";
      }, timer);
   }, setupIntervalTimerInMillis * 8);
})();

function checkForCorruptedFarmVillages() {
   const coordinates = new Map();
   farmVillages.forEach(v => coordinates.set(v.coordinates, v.coordinates));
   if (coordinates.size !== farmVillages.length) {
      return 1;
   }
   for (let i = 0; i < farmVillages.length; i++) {
      const v = farmVillages[i];
      const modelASum = Object.values(v.A).reduce((a, b) => a + b, 0);
      const modelBSum = Object.values(v.B).reduce((a, b) => a + b, 0);
      if (modelASum === 0 || modelBSum === 0) {
         return 2;
      }
   }
   return 0;
}

function updateABForCurrentVillage(currentModel, userModel) {
   let mustClickSaveButton = false;
   for (let i = 0; i < Object.values(userModel).length; i++) {
      const userPref = Object.values(userModel)[i];
      if (userPref !== Number(currentModel[i].value)) {
         currentModel[i].value = userPref;
         mustClickSaveButton = true;
      }
   }
   if (mustClickSaveButton) {
      document.querySelectorAll("form>table")[0].querySelectorAll("td")[1].querySelector("input").click();
   }
}

function setup() {
   const currentVillageSettings = farmVillages.filter(v => v.coordinates === getCurrentVillage())[0];
   const arrangements = document.querySelectorAll("form>table")[0];
   const currentA = arrangements.querySelectorAll("tr")[1].querySelectorAll("input:not([type=hidden])");
   const currentB = arrangements.querySelectorAll("tr")[3].querySelectorAll("input:not([type=hidden])");

   setTimeout(function () {
      const attacked_checkbox = document.getElementById("attacked_checkbox");
      if (!attacked_checkbox.checked) {
         attacked_checkbox.click();
      }
   }, setupIntervalTimerInMillis);

   setTimeout(function () {
      const partial_losses_checkbox = document.getElementById("partial_losses_checkbox");
      if (!partial_losses_checkbox.checked) {
         partial_losses_checkbox.click();
      }
   }, setupIntervalTimerInMillis * 2);

   setTimeout(function () {
      updateABForCurrentVillage(currentA, currentVillageSettings.A);
   }, setupIntervalTimerInMillis * 3);

   setTimeout(function () {
      const full_losses_checkbox = document.getElementById("full_losses_checkbox");
      if (!full_losses_checkbox.checked) {
         full_losses_checkbox.click();
      }
   }, setupIntervalTimerInMillis * 4);

   setTimeout(function () {
      const all_village_checkbox = document.getElementById("all_village_checkbox");
      if (all_village_checkbox.checked) {
         all_village_checkbox.click();
      }
   }, setupIntervalTimerInMillis * 5);

   setTimeout(function () {
      updateABForCurrentVillage(currentB, currentVillageSettings.B);
   }, setupIntervalTimerInMillis * 6);

   setTimeout(function () {
      const full_hauls_checkbox = document.getElementById("full_hauls_checkbox");
      if (full_hauls_checkbox.checked) {
         full_hauls_checkbox.click();
      }
   }, setupIntervalTimerInMillis * 7);
}

function isErrorBeingShown() {
   return !!document.querySelector(".autoHideBox.error");
}

function buttonIsDisabled(button) {
   return button.classList.contains("farm_icon_disabled");
}

function farm(index, button, coords, distance, currentVillage, randomComponent, slowestTroopTime) {
   const delay = baseTimeInMillisBetweenFarms * index + randomComponent;
   setTimeout(function () {
      if (stopIteration || buttonIsDisabled(button)) {
         return;
      }
      if (isErrorBeingShown()) {
         stopIteration = true;
         return;
      }
      let sendAttack = true;
      let memory = localStorage[indexCoords(coords)];
      const dateNow = Date.parse(new Date());
      if (memory) {
         const onGoingAttacksArray = JSON.parse(memory);
         const newArray = [];
         for (let i = 0; i < onGoingAttacksArray.length; i++) {
            const e = onGoingAttacksArray[i];
            if ((e.sendTime ?? Infinity) + maxMinutesBetweenAttacks * 60 * 1000 > dateNow && (!alwaysTrySendAttackWhenNotAlreadyAttacking || e.arrivalTime > dateNow)) {
               if (e.sender === currentVillage) {
                  sendAttack = false;
               }
               newArray.push(e);
            }
         }
         if (newArray.length === 0) {
            localStorage.removeItem(indexCoords(coords));
         } else {
            localStorage[indexCoords(coords)] = JSON.stringify(newArray);
         }
      }
      if (sendAttack) {
         memory = localStorage[indexCoords(coords)];
         const newEntry = [{
            sender: currentVillage,
            sendTime: dateNow,
            arrivalTime: dateNow + Math.round(distance * slowestTroopTime * 1000)
         }];
         localStorage[indexCoords(coords)] = JSON.stringify(memory ? JSON.parse(memory).concat(newEntry) : newEntry);
         button.click();
      }
   }, delay);
}

function indexCoords(coords) {
   return "$f$" + coords + "$f$";
}

function getSlowestTroopTime(userSetting) {
   const troopsSpeed = {
      spear: 18 * 60 / 5,
      sword: 22 * 60 / 5,
      axe: 18 * 60 / 5,
      archer: 18 * 60 / 5,
      spy: 9 * 60 / 5,
      light: 10 * 60 / 5,
      marcher: 10 * 60 / 5,
      heavy: 11 * 60 / 5,
      knight: 10 * 60 / 5
   };

   Object.keys(troopsSpeed).forEach(e => {
      const serverHasTroop = document.querySelectorAll('[data-unit="' + e + '"]').length > 0;
      if(!serverHasTroop) {
         delete troopsSpeed[e];
      }
   });

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

function getCurrentVillage() {
   const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
   return villageName.slice(1, villageName.indexOf(")"));
}

function subtractTroops(arrA, arrB) {
   for (let i = 0; i < arrA.length; i++) {
      arrA[i] = arrA[i] - arrB[i];
   }
}

function hasEnoughTroops(arrA, arrB) {
   for (let i = 0; i < arrA.length; i++) {
      if (arrA[i] < arrB[i]) {
         return false;
      }
   }
   return true;
}

function nextIteration() {
   const currentVillage = getCurrentVillage();
   const currentVillageSettings = farmVillages.filter(v => v.coordinates === currentVillage)[0];
   const list = document.getElementById("plunder_list");
   const lines = list.querySelectorAll("tr[id]");
   let farmsScheduled = 0;
   let troops = Array.from(document.getElementsByClassName("unit-item")).map(e => Number(e.innerText));
   let outOfTroops = false;
   const slowestTroopTime = {
      A: getSlowestTroopTime(Object.values(currentVillageSettings.A)),
      B: getSlowestTroopTime(Object.values(currentVillageSettings.B))
   };
   for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.querySelectorAll("td");
      const iconColumn = columns[2];
      const icon = iconColumn.children[0];
      const coordsColumn = columns[3];
      const coords = coordsColumn.innerText.substring(1, coordsColumn.innerText.indexOf(")"));
      const statusColumn = columns[1];
      const srcAttr = statusColumn.children[0].getAttribute("src");
      const isGreenBall = srcAttr?.includes("green") || srcAttr?.includes("blue");
      const distance = Number(columns[7].innerText);
      if(!isGreenBall) {
         const wallMemory = localStorage["$w$" + coords + "$w$"];
         if(!wallMemory) {
            localStorage["$w$" + coords + "$w$"] = JSON.stringify({
               status: 0,
               sendTime: 0,
               slowestTroop: 0
            });
            continue;
         } else {
            const mem = JSON.parse(wallMemory);
            if(mem.status === 1 && (mem.sendTime || Infinity) + (mem.slowestTroop || Infinity) * distance * 1000 < Date.parse(new Date())) {
               localStorage.removeItem("$w$" + coords + "$w$");
            } else {
               continue;
            }
         }
      } else {
         const wallMemory = localStorage["$w$" + coords + "$w$"];
         if(wallMemory) {
            const mem = JSON.parse(wallMemory);
            if(mem.status === 1 && (mem.sendTime || Infinity) + (mem.slowestTroop || Infinity) * distance * 1000 < Date.parse(new Date())) {
               localStorage.removeItem("$w$" + coords + "$w$");
            }
         }
      }
      const memory = localStorage[indexCoords(coords)];
      const randomComponent = Math.round(Math.random() * 500);
      if (memory) {
         const computedDate = Date.parse(new Date()) + baseTimeInMillisBetweenFarms * farmsScheduled + randomComponent;
         if (JSON.parse(memory).some(e =>
            e.sender === currentVillage && (!alwaysTrySendAttackWhenNotAlreadyAttacking || e.arrivalTime > computedDate) && (e.sendTime ?? Infinity) + maxMinutesBetweenAttacks * 60 * 1000 > computedDate
         )) {
            continue;
         }
      }
      const partialLoot = icon?.getAttribute("src")?.includes("max_loot");
      const adequateSetting = partialLoot ? currentVillageSettings.B : currentVillageSettings.A;
      const troopsSetting = Object.values(adequateSetting);
      if (!hasEnoughTroops(troops, troopsSetting)) {
         outOfTroops = true;
         console.log("Não tens tropas suficientes.");
         if (!hasEnoughTroops(troops, Object.values(partialLoot ? currentVillageSettings.A : currentVillageSettings.B))) {
            break;
         }
         continue;
      }
      const buttonA = line.querySelector(".farm_icon.farm_icon_a");
      const buttonB = line.querySelector(".farm_icon.farm_icon_b");
      farm(farmsScheduled, partialLoot ? buttonB : buttonA, coords, distance, currentVillage, randomComponent, partialLoot ? slowestTroopTime.B : slowestTroopTime.A);
      subtractTroops(troops, troopsSetting);
      farmsScheduled++;
   }
   return {
      attacks: farmsScheduled,
      noMoreTroops: outOfTroops
   };
}