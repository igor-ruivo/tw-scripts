// ==UserScript==
// @name                Tribal Wars Auto Scavenge Bot
// @description 	      Automatically uses scavenge.
// @author		         Igor Ruivo
// @include             http*://*screen=place*mode=scavenge*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

const setupIntervalTimerInMillis = 1000;
const minimumCapacityNeeded = 250;

const scavengeWith = [
   true, //spear
   true, //sword
   true, //axe
   true, //archer
   false, //light
   true, //marcher
   true, //heavy
   false //knight
]

const troopsLoot = [
   25,
   15,
   10,
   10,
   80,
   50,
   50,
   100
];

const troopsAllocationOrder = [
   7,
   4,
   5,
   6,
   0,
   1,
   2,
   3
];

const troopsPopulation = [
   1,
   1,
   1,
   1,
   4,
   5,
   6,
   10
];

const memory = new Map();
let nOptions;
let scavengingOptions;
let totalHaul = 0;
let troops;

(function () {
   'use strict';
   setTimeout(function () {
      nextIteration();
   }, setupIntervalTimerInMillis);
})();

function firstDegreeIteration() {
   return {
      score: 0,
      allocations: [1, 0, 0, 0]
   };
}

function secondDegreeIteration() {
   const maxScore = {
      score: 0,
      allocations: [0, 0, 0, 0]
   };

   const iterations = 10000;
   const threshold = 9900;
   for(let i = 0; i <= iterations; i++) {
      for(let j = 0; j <= iterations; j++) {
         if(i + j > iterations) {
            break;
         }
         /*optimization:*/
         if(i + j < threshold) {
            continue;
         }
         if(i > 0 && Math.round(i * totalHaul / iterations) < minimumCapacityNeeded || j > 0 && Math.round(j * totalHaul / iterations) < minimumCapacityNeeded) {
            continue;
         }
         const score = calcScore({first: i / iterations, second: j / iterations, third: 0, fourth: 0});
         if(score > maxScore.score) {
            maxScore.score = score;
            maxScore.allocations = [i / iterations, j / iterations, 0, 0];
         }
      }
   }

   return maxScore;
}

function thirdDegreeIteration() {
   const maxScore = {
      score: 0,
      allocations: [0, 0, 0, 0]
   };

   const iterations = 1000;
   const threshold = 990;
   for(let i = 0; i <= iterations; i++) {
      for(let j = 0; j <= iterations; j++) {
         if(i + j > iterations) {
            break;
         }
         for(let k = 0; k <= iterations; k++) {
            if(i + j + k > iterations) {
               break;
            }
            /*optimization:*/
            if(i + j + k < threshold) {
               continue;
            }
            if(i > 0 && Math.round(i * totalHaul / iterations) < minimumCapacityNeeded || j > 0 && Math.round(j * totalHaul / iterations) < minimumCapacityNeeded || k > 0 && Math.round(k * totalHaul / iterations) < minimumCapacityNeeded) {
               continue;
            }
            const score = calcScore({first: i / iterations, second: j / iterations, third: k / iterations, fourth: 0});
            if(score > maxScore.score) {
               maxScore.score = score;
               maxScore.allocations = [i / iterations, j / iterations, k / iterations, 0];
            }
         }
      }
   }

   return maxScore;
}

function fourthDegreeIteration() {
   const maxScore = {
      score: 0,
      allocations: [0, 0, 0, 0]
   };

   const iterations = 100;
   const threshold = 99;
   for(let i = 0; i <= iterations; i++) {
      for(let j = 0; j <= iterations; j++) {
         if(i + j > iterations) {
            break;
         }
         for(let k = 0; k <= iterations; k++) {
            if(i + j + k > iterations) {
               break;
            }
            for(let l = 0; l <= iterations; l++) {
               if(i + j + k + l > iterations) {
                  break;
               }
               /*optimization:*/
               if(i + j + k + l < threshold) {
                  continue;
               }
               if(i > 0 && Math.round(i * totalHaul / iterations) < minimumCapacityNeeded || j > 0 && Math.round(j * totalHaul / iterations) < minimumCapacityNeeded || k > 0 && Math.round(k * totalHaul / iterations) < minimumCapacityNeeded || l > 0 && Math.round(l * totalHaul / iterations) < minimumCapacityNeeded) {
                  continue;
               }
               const score = calcScore({first: i / iterations, second: j / iterations, third: k / iterations, fourth: l / iterations});
               if(score > maxScore.score) {
                  maxScore.score = score;
                  maxScore.allocations = [i / iterations, j / iterations, k / iterations, l / iterations];
               }
            }
         }
      }
   }

   return maxScore;
}

function allocate(maxScore) {
   const todo = {
      first: [],
      second: [],
      third: [],
      fourth: []
   };
   for(let nOption = 0; nOption < nOptions; nOption++) {
      console.log("opção " + nOption + ":");
      const allocation = [0, 0, 0, 0, 0, 0, 0, 0];
      let allocationsEstimate = maxScore.allocations[nOption] * totalHaul;
      let populationSum = 0;
      for(let i = 0; i < troopsAllocationOrder.length; i++) {
         if(troops[troopsAllocationOrder[i]] == 0) {
            continue;
         }
         const quantity = nOption !== nOptions - 1 ? Math.min(troops[troopsAllocationOrder[i]], Math.floor(allocationsEstimate / troopsLoot[troopsAllocationOrder[i]])) : troops[troopsAllocationOrder[i]];
         populationSum += troopsPopulation[troopsAllocationOrder[i]] * quantity;
         allocation[troopsAllocationOrder[i]] = quantity;
         troops[troopsAllocationOrder[i]] -= quantity;
         allocationsEstimate -= quantity * troopsLoot[troopsAllocationOrder[i]];
      }
      console.log(allocation);
      if(populationSum >= 10) {
         todo[Object.keys(todo)[nOption]] = allocation;
      } else {
         allocation.forEach((t, index) => {
            allocationsEstimate += t * troopsLoot[index];
            troops[index] += t;
         });
      }
   }
   localStorage["$sc$" + getCurrentVillage() + "$sc$"] = JSON.stringify(todo);
   console.log("Reload dentro de 5 segundos.");
   setTimeout(function () {
      window.location.reload(true);
   }, 5 * 1000);
}

function getCurrentVillage() {
   const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
   return villageName.slice(1, villageName.indexOf(")"));
}

function nextIteration() {
   nOptions = Number(document.getElementsByClassName("scavenge-option").length) - Number(document.getElementsByClassName("unlock-button").length) - Number(document.getElementsByClassName("unlock-countdown-icon").length);

   if(nOptions < 1) {
      console.log("Precisas de pelo menos 1 busca desbloqueada para utilizar esta ferramenta.");
      console.log("Reload em 1 minuto.");
      setTimeout(function () {
         window.location.reload(true);
      }, 60 * 1000);
      return;
   }

   let storage = localStorage["$sc$" + getCurrentVillage() + "$sc$"];
   if(storage) {
      setTimeout(function () {
         storage = JSON.parse(storage);
         if(storage.first.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[0].querySelector(".free_send_button")) {
            for(let index = 0; index < $(".input-nicer").length; index++) {
               $(".input-nicer").eq(index).val(storage.first[index]).change();
            }
            setTimeout(function () {
               document.getElementsByClassName("scavenge-option")[0].querySelector(".free_send_button")?.click();
            }, setupIntervalTimerInMillis * 4);

            setTimeout(function () {
               window.location.reload(true);
            }, setupIntervalTimerInMillis * 7);
            return;
         }
         if(storage.second.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[1].querySelector(".free_send_button")) {
            for(let index = 0; index < $(".input-nicer").length; index++) {
               $(".input-nicer").eq(index).val(storage.second[index]).change();
            }
            setTimeout(function () {
               document.getElementsByClassName("scavenge-option")[1].querySelector(".free_send_button")?.click();
            }, setupIntervalTimerInMillis * 4);

            setTimeout(function () {
               window.location.reload(true);
            }, setupIntervalTimerInMillis * 7);
            return;
         }
         if(storage.third.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[2].querySelector(".free_send_button")) {
            for(let index = 0; index < $(".input-nicer").length; index++) {
               $(".input-nicer").eq(index).val(storage.third[index]).change();
            }
            setTimeout(function () {
               document.getElementsByClassName("scavenge-option")[2].querySelector(".free_send_button")?.click();
            }, setupIntervalTimerInMillis * 4);

            setTimeout(function () {
               window.location.reload(true);
            }, setupIntervalTimerInMillis * 7);
            return;
         }
         if(storage.fourth.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[3].querySelector(".free_send_button")) {
            for(let index = 0; index < $(".input-nicer").length; index++) {
               $(".input-nicer").eq(index).val(storage.fourth[index]).change();
            }
            setTimeout(function () {
               document.getElementsByClassName("scavenge-option")[3].querySelector(".free_send_button")?.click();
            }, setupIntervalTimerInMillis * 4);

            setTimeout(function () {
               window.location.reload(true);
            }, setupIntervalTimerInMillis * 7);
            return;
         }
         localStorage.removeItem("$sc$" + getCurrentVillage() + "$sc$");
         window.location.reload(true);
      }, setupIntervalTimerInMillis * 2);
   } else {
      if(document.getElementById("scavenge_screen").querySelectorAll(".return-countdown").length > 0) {
         console.log("Há buscas em progresso. Aguarda.");
         console.log("Reload em 1 minuto.");
         setTimeout(function () {
            window.location.reload(true);
         }, 60 * 1000);
         return;
      }

      console.log("Nível de busca desbloqueado: " + nOptions);

      scavengingOptions = ScavengeScreen.village.options;

      setTimeout(function () {
         console.log("A procurar aproximadamente a melhor escolha...");
         troops = Array.from(document.getElementsByClassName("units-entry-all"))
         .map((e, index) => Number(e.innerText.replaceAll("(", "").replaceAll(")", "").replaceAll(".", "").replaceAll(".", "").replaceAll(" ", "")) * scavengeWith[index]);
         troops.forEach((n, index) => totalHaul += n * troopsLoot[index]);
         console.log("t = " + totalHaul);
         console.log("troops = " + troops);
         if(totalHaul < minimumCapacityNeeded) {
            console.log("Não tens tropa suficiente. Só podes utilizar a ferramenta com pelo menos " + minimumCapacityNeeded + " de capacidade de saque.");
            console.log("Reload em 1 minuto.");
            setTimeout(function () {
               window.location.reload(true);
            }, 60 * 1000);
            return;
         }

         let maxScore;

         switch(nOptions) {
            case 1:
               maxScore = firstDegreeIteration();
               break;
            case 2:
               maxScore = secondDegreeIteration();
               break;
            case 3:
               maxScore = thirdDegreeIteration();
               break;
            case 4:
               maxScore = fourthDegreeIteration();
               break;
            default:
               throw new Error("Invalid nOptions.");
         }
         allocate(maxScore);
      }, setupIntervalTimerInMillis * 2);
   }
}

function getDuration(option, t) {
   const memoryOptions = memory.get(t);
   if(memoryOptions) {
      const result = memoryOptions.get(option);
      if(result) {
         return result;
      }
   }

   const calc = Math.round((Math.pow(Math.pow(Math.round(t * totalHaul), 2) * Math.pow(scavengingOptions[option].base.loot_factor, 2) * 100, scavengingOptions[option].base.duration_exponent) + scavengingOptions[option].base.duration_initial_seconds) * scavengingOptions[option].base.duration_factor);
   
   if(!memoryOptions) {
      memory.set(t, new Map());
   }
   memory.get(t).set(option, calc);
   return calc;
}

function calcScore(allocations) {
   const maxDuration = Math.max(Math.max(getDuration(1, allocations.first), getDuration(3, allocations.third)), Math.max(getDuration(2, allocations.second), getDuration(4, allocations.fourth)));
   return (allocations.first * scavengingOptions[1].base.loot_factor * totalHaul / maxDuration)
   + (allocations.second * scavengingOptions[2].base.loot_factor * totalHaul / maxDuration)
   + (allocations.third * scavengingOptions[3].base.loot_factor * totalHaul / maxDuration)
   + (allocations.fourth * scavengingOptions[4].base.loot_factor * totalHaul / maxDuration);
}