// ==UserScript==
// @name                Tribal Wars Auto Conquer Bot
// @description 	    Automatically sends nobles
// @author		        Igor Ruivo
// @include             http*tribalwars*screen=place*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const offsetTimeInMillis = 3000;
const refreshTimeInMinutes = 2;
const target = "409|441";

(function () {
   if(window.location.href.includes("mode=scavenge")) {
      return;
   }

	'use strict';
	window.sessionStorage.prevWin = window.location.href;
	setTimeout(function () {
		document.getElementById("checkbox")?.click();
	}, 2 * 1000);

   if(window.location.href.includes("try=confirm")) {
      if(!window.location.href.includes("&target=")) {
         setTimeout(function () {
            document.getElementById("troop_confirm_submit")?.click();
         }, offsetTimeInMillis);
         return;
      }

      console.log("Reload em 2 minutos.");
      
      setTimeout(function () {
         window.location.href = window.location.href.substring(0, window.location.href.indexOf("&try=confirm"));
      }, refreshTimeInMinutes * 60 * 1000 + offsetTimeInMillis);
      return;
   }

	setTimeout(function () {
		nextIteration();
	}, offsetTimeInMillis);

	setTimeout(function () {
		window.location.reload(true);
	}, refreshTimeInMinutes * 60 * 1000 + offsetTimeInMillis);
})();

function nextIteration() {
	document.getElementsByClassName("target-input-field")[0].value = target;
   document.getElementById("unit_input_snob").value = "1";
   document.getElementById("unit_input_spear").value = "200";
	
	setTimeout(function () {
		document.getElementById("target_attack").click();
	}, 2 * offsetTimeInMillis);
}