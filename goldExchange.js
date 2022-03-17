// ==UserScript==
// @name                Tribal Wars Auto Gold Exchange Bot
// @description 	    Automatically tries to exchange available resources for gold whenever there are merchants available.
// @author		        Igor Ruivo
// @include             http*://*.*game.php*mode=exchange*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const offsetTimeInMillis = 3000;
const refreshTimeInMinutes = 1;

const villages = [
    "405|439",
    "403|439"
];

(function () {
	'use strict';
	window.sessionStorage.prevWin = window.location.href;
	setTimeout(function () {
		document.getElementById("checkbox")?.click();
	}, 2 * 1000);

	setTimeout(function () {
		nextIteration();
	}, offsetTimeInMillis);

	setTimeout(function () {
         const switchVillageButton = document.getElementById("village_switch_right");
         if(switchVillageButton) {
            switchVillageButton.click();
         } else {
            window.location.reload(true);
         }
    }, refreshTimeInMinutes * 60 * 1000 + offsetTimeInMillis);
})();

function getCurrentVillage() {
   const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
   return villageName.slice(1, villageName.indexOf(")"));
}

function nextIteration() {
    if(!villages.includes(getCurrentVillage())) {
        document.getElementById("village_switch_right")?.click();
        return;
    }
	const maximumTransport = Number(document.getElementById("market_merchant_max_transport").innerText.replaceAll(".", "").replaceAll(",", ""));
	if(maximumTransport === 0) {
		console.log("Sem mercadores disponíveis.");
		return;
	}
	const inputs = Array.from(document.getElementsByClassName("premium-exchange-input")).filter((_e, index) => index >= 3);
	const availableInputs = inputs.filter(e => !e.disabled);
	if(availableInputs.length < 1) {
		console.log("Não há capacidade suficiente.");
		return;
	}
	const resources = [
		[0, Number(document.getElementById("wood").innerText.replaceAll(".", "").replaceAll(",", ""))],
		[1, Number(document.getElementById("stone").innerText.replaceAll(".", "").replaceAll(",", ""))],
		[2, Number(document.getElementById("iron").innerText.replaceAll(".", "").replaceAll(",", ""))]
	];
	const capacities = [
		[0, Number(document.getElementById("premium_exchange_capacity_wood").innerText.replaceAll(".", "").replaceAll(",", "")) - Number(document.getElementById("premium_exchange_stock_wood").innerText.replaceAll(".", "").replaceAll(",", ""))],
		[1, Number(document.getElementById("premium_exchange_capacity_stone").innerText.replaceAll(".", "").replaceAll(",", "")) - Number(document.getElementById("premium_exchange_stock_stone").innerText.replaceAll(".", "").replaceAll(",", ""))],
		[2, Number(document.getElementById("premium_exchange_capacity_iron").innerText.replaceAll(".", "").replaceAll(",", "")) - Number(document.getElementById("premium_exchange_stock_iron").innerText.replaceAll(".", "").replaceAll(",", ""))]
	];
	capacities.sort(function(a, b) {
		return b[1] - a[1];
	});

	const possibleSolutions = capacities.filter(r => !inputs[r[0]].disabled && resources[r[0]][1] >= 2000);

	if(possibleSolutions.length === 0) {
		console.log("Não tens recursos suficientes.");
		return;
	}

	const finalIndex = possibleSolutions[0][0];

	const finalInput = inputs[finalIndex];
	finalInput.value = Math.min(Math.round(resources[finalIndex][1] / 2 / 1000) * 1000, maximumTransport === 1000 ? 1 : maximumTransport < capacities[0][1] ? Math.round(maximumTransport / 2 / 1000) * 1000 : capacities[0][1]);

	setTimeout(function () {
		document.getElementsByClassName("btn-premium-exchange-buy")[0].click();
	}, 2 * offsetTimeInMillis);

	setTimeout(function () {
		document.getElementsByClassName("btn-confirm-yes")[0].click();
	}, 3 * offsetTimeInMillis);

	setTimeout(function () {
		window.location.reload(true);
	}, 4 * offsetTimeInMillis);
}