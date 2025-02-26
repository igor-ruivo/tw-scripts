// ==UserScript==
// @name                Tribal Wars Light Cavalry Research
// @description 	      Automatically researches light cavalry
// @author		         Igor Ruivo
// @include             http*tribalwars*screen=smith*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

(function () {
   'use strict';
   setTimeout(function () {
      Array
         .from(document.getElementsByClassName('btn-research'))
         .filter(e => e.parentElement.children[0].getAttribute('data-unit') === 'light')[0]
         ?.click();
	}, 2 * 1000);
   
   console.log("Reloading in 60s.");
   setTimeout(() => {
      window.location.reload(true);
   }, 1000 * 60);
})();