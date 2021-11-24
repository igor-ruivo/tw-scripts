// ==UserScript==
// @name                Tribal Wars Auto Restart Botting
// @description 	      Automatically redirects to previous botting instance.
// @author		         Igor Ruivo
// @include             http*://*screen=overview_villages&intro
// @include             http*://*screen=welcome*
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
		document.getElementById("checkbox")?.click();
	}, 2 * 1000);
   
   setTimeout(function () {
      if(window.sessionStorage.prevWin) {
         window.location.href = window.sessionStorage.prevWin;
      }
}, 4 * 1000);
})();