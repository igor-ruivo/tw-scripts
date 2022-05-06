// ==UserScript==
// @name                Tribal Wars Auto Login
// @description 	      Automatically logins in the first recent world displayed
// @author		         Igor Ruivo
// @include             http*tribalwars*
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
      document.getElementsByClassName("world_button_active")[0]?.parentElement.click();
}, 4 * 1000);
})();