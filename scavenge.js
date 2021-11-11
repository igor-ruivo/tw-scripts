// ==UserScript==
// @name                Tribal Wars Auto Scavenge Bot
// @description 	      Automatically uses scavenge.
// @author		         Igor Ruivo
// @include             http*://*screen=place*mode=scavenge*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scriptsjs
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

const setupIntervalTimerInMillis = 1000;

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

const memory = new Map();
var nOptions;
var scavengingOptions;
var totalHaul;

(function () {
   'use strict';
   setTimeout(function () {
      nextIteration();
   }, setupIntervalTimerInMillis);
})();

function secondDegreeIteration() {
   var maxScore = {
      score: 0,
      allocations: [0, 0, 0, 0]
   };

   for(let i = 0; i <= 1; i += 0.0001) {
      for(let j = 0; j <= 1; j += 0.0001) {
         if(i + j > 1) {
            break;
         }
         /*optimization:*/
         if(i + j < 0.99) {
            continue;
         }
         var score = calcScore({first: i, second: j, third: 0, fourth: 0});
         if(score > maxScore.score) {
            maxScore.score = score;
            maxScore.allocations = [i, j, 0, 0];
         }
      }
   }

   return maxScore;
}

function thirdDegreeIteration() {
   var maxScore = {
      score: 0,
      allocations: [0, 0, 0, 0]
   };

   for(let i = 0; i <= 1; i += 0.001) {
      for(let j = 0; j <= 1; j += 0.001) {
         if(i + j > 1) {
            break;
         }
         for(let k = 0; k <= 1; k += 0.001) {
            if(i + j + k > 1) {
               break;
            }
            /*optimization:*/
            if(i + j + k < 0.99) {
               continue;
            }
            var score = calcScore({first: i, second: j, third: k, fourth: 0});
            if(score > maxScore.score) {
               maxScore.score = score;
               maxScore.allocations = [i, j, k, 0];
            }
         }
      }
   }

   return maxScore;
}

function fourthDegreeIteration() {
   var maxScore = {
      score: 0,
      allocations: [0, 0, 0, 0]
   };

   for(let i = 0; i <= 1; i += 0.01) {
      for(let j = 0; j <= 1; j += 0.01) {
         if(i + j > 1) {
            break;
         }
         for(let k = 0; k <= 1; k += 0.01) {
            if(i + j + k > 1) {
               break;
            }
            for(let l = 0; l <= 1; l += 0.01) {
               if(i + j + k + l > 1) {
                  break;
               }
               /*optimization:*/
               if(i + j + k + l < 0.99) {
                  continue;
               }
               var score = calcScore({first: i, second: j, third: k, fourth: l});
               if(score > maxScore.score) {
                  maxScore.score = score;
                  maxScore.allocations = [i, j, k, l];
               }
            }
         }
      }
   }

   return maxScore;
}

function isLastAllocation(i, troops) {
   for(let j = i + 1; j < troopsAllocationOrder.length; j++) {
      if(troops[troopsAllocationOrder[j]] == 0) {
         continue;
      }
      return false;
   }
   return true;
}

function allocate(maxScore) {
   var troops = Array.from(document.getElementsByClassName("input-nicer")).map(i => Number(i.value));
   var todo = {
      first: [],
      second: [],
      third: [],
      fourth: []
   };
   for(let nOption = 0; nOption < nOptions; nOption++) {
      console.log("opção " + nOption + ":");
      var allocation = [0, 0, 0, 0, 0, 0, 0, 0];
      var allocationsEstimate = maxScore.allocations[nOption] * totalHaul;
      //console.log("quero alocar " + allocationsEstimate + " recursos");
      for(let i = 0; i < troopsAllocationOrder.length; i++) {
         if(troops[troopsAllocationOrder[i]] == 0) {
            continue;
         }
         //console.log("tropa detetada:" + troopsAllocationOrder[i]);
         //console.log("min entre " + troops[troopsAllocationOrder[i]] + " e " + Math.floor(allocationsEstimate / troopsLoot[troopsAllocationOrder[i]]));
         var quantity = !(nOption === nOptions - 1 && isLastAllocation(i, troops)) ? Math.min(troops[troopsAllocationOrder[i]], Math.floor(allocationsEstimate / troopsLoot[troopsAllocationOrder[i]])) : troops[troopsAllocationOrder[i]];
         //console.log("quantity: " + quantity);
         allocation[troopsAllocationOrder[i]] = quantity;
         troops[troopsAllocationOrder[i]] -= quantity;
         allocationsEstimate -= quantity * troopsLoot[troopsAllocationOrder[i]];
      }
      console.log(allocation);
      todo[Object.keys(todo)[nOption]] = allocation;
      //Array.from(document.getElementsByClassName("input-nicer")).forEach((e, index) => e.value = allocation[index]);
      //document.getElementsByClassName("free_send_button")[nOption].click();
      localStorage["$sc$" + getCurrentVillage() + "$sc$"] = JSON.stringify(todo);
      window.location.reload(true);
   }
}

function getCurrentVillage() {
   const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
   return villageName.slice(1, villageName.indexOf(")"));
}

function nextIteration() {
   nOptions = Number(document.getElementsByClassName("scavenge-option").length) - Number(document.getElementsByClassName("unlock-button").length) - Number(document.getElementsByClassName("unlock-countdown-icon").length);

   if(nOptions < 2) {
      console.log("Precisas de pelo menos 2 diferentes buscas desbloqueadas para utilizar esta ferramenta.");
      console.log("Reload em 1 minuto.");
      setTimeout(function () {
         window.location.reload(true);
      }, 60 * 1000);
      return;
   }

   var storage = localStorage["$sc$" + getCurrentVillage() + "$sc$"];
   if(storage) {
      storage = JSON.parse(storage);
      if(storage.first.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[0].querySelector(".free_send_button")) {
         for(var index = 0; index < $(".input-nicer").length; index++) {
            $(".input-nicer").eq(index).val(storage.first[index]).change();
         }
         document.getElementsByClassName("scavenge-option")[0].querySelector(".free_send_button")?.click();
         window.location.reload(true);
         return;
      }
      if(storage.second.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[1].querySelector(".free_send_button")) {
         for(var index = 0; index < $(".input-nicer").length; index++) {
            $(".input-nicer").eq(index).val(storage.second[index]).change();
         }
         document.getElementsByClassName("scavenge-option")[1].querySelector(".free_send_button")?.click();
         window.location.reload(true);
         return;
      }
      if(storage.third.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[2].querySelector(".free_send_button")) {
         for(var index = 0; index < $(".input-nicer").length; index++) {
            $(".input-nicer").eq(index).val(storage.third[index]).change();
         }
         document.getElementsByClassName("scavenge-option")[2].querySelector(".free_send_button")?.click();
         window.location.reload(true);
         return;
      }
      if(storage.fourth.reduce((a, b) => a + b, 0) > 0 && document.getElementsByClassName("scavenge-option")[3].querySelector(".free_send_button")) {
         for(var index = 0; index < $(".input-nicer").length; index++) {
            $(".input-nicer").eq(index).val(storage.fourth[index]).change();
         }
         document.getElementsByClassName("scavenge-option")[3].querySelector(".free_send_button")?.click();
         window.location.reload(true);
         return;
      }
      localStorage.removeItem("$sc$" + getCurrentVillage() + "$sc$");
   }
   
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
   document.getElementsByClassName("fill-all")[0].click();

   setTimeout(function () {
      console.log("A procurar aproximadamente a melhor escolha...");
      totalHaul = Number(document.getElementsByClassName("carry-max")[0].innerText.replaceAll(".", "").replaceAll(",", ""));
      console.log("t = " + totalHaul);
      var maxScore;

      switch(nOptions) {
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

      console.log(maxScore);
      console.log("Recursos por dia: " + maxScore.score * 24 * 60 * 60);
      allocate(maxScore);
   }, setupIntervalTimerInMillis * 2);
}

function getDuration(option, t) {
   var memoryOptions = memory.get(t);
   if(memoryOptions) {
      var result = memoryOptions.get(option);
      if(result) {
         return result;
      }
   }

   var calc = Math.round((Math.pow(Math.pow(Math.round(t * totalHaul), 2) * Math.pow(scavengingOptions[option].base.loot_factor, 2) * 100, scavengingOptions[option].base.duration_exponent) + scavengingOptions[option].base.duration_initial_seconds) * scavengingOptions[option].base.duration_factor);
   
   if(!memoryOptions) {
      memory.set(t, new Map());
   }
   memory.get(t).set(option, calc);
   return calc;
}

function calcScore(allocations) {
   var maxDuration = Math.max(Math.max(getDuration(1, allocations.first), getDuration(3, allocations.third)), Math.max(getDuration(2, allocations.second), getDuration(4, allocations.fourth)));
   return (allocations.first * scavengingOptions[1].base.loot_factor * totalHaul / maxDuration)
   + (allocations.second * scavengingOptions[2].base.loot_factor * totalHaul / maxDuration)
   + (allocations.third * scavengingOptions[3].base.loot_factor * totalHaul / maxDuration)
   + (allocations.fourth * scavengingOptions[4].base.loot_factor * totalHaul / maxDuration);
}