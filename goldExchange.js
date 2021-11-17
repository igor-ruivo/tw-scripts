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
const refreshTimeInMinutes = 2;

(function () {
	'use strict';
	setTimeout(function () {
		document.getElementById("checkbox")?.click();
	}, 2 * 1000);

	setTimeout(function () {
		nextIteration();
	}, offsetTimeInMillis);

	setTimeout(function () {
		window.location.reload(true);
	}, refreshTimeInMinutes * 60 * 1000 + offsetTimeInMillis);
})();

function nextIteration() {
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
	const finalIndex = capacities.filter(r => !inputs[r[0]].disabled)[0][0];
	
	const finalInput = inputs[finalIndex];
	finalInput.value = Math.min(resources[finalIndex][1], maximumTransport === 1000 ? 1 : maximumTransport < capacities[finalIndex][1] ? Math.round(maximumTransport / 2 / 1000) * 1000 : capacities[finalIndex][1]);
	
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