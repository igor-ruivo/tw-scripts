// ==UserScript==
// @name                Tribal Wars Auto Trader Bot
// @description 	    Automatically creates offers in the market in order to balance your resources.
// @author		        Igor Ruivo
// @include             http*://*.*game.php*mode=own_offer*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// @require             http://code.jquery.com/jquery-1.12.4.min.js
// ==/UserScript==

//configs
const merchantCapacity = 1000;
const minTrade = 400;
const maxDifferencePercentage = 60;

(function () {
	'use strict';

	setTimeout(function () {
		nextIteration();
		console.log("Reload dentro de 10 minutos...");
	}, Math.floor(Math.random() * 5000));

	setTimeout(function () {
		location.reload();
	}, 1000 * 60 * 10);
})();

function getDate() {
	const date = new Date;
	const minutes = date.getMinutes();
	const hours = date.getHours();
	return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

function getPendingIncommingResources() {
	const pendingElements = document.querySelectorAll("[data-wanted_wood]");
	const resources = {
		wood: 0,
		stone: 0,
		iron: 0
	};
	pendingElements.forEach(e => {
		const quantity = e.getAttribute("data-count");
		resources.wood += e.getAttribute("data-wanted_wood") * quantity;
		resources.stone += e.getAttribute("data-wanted_stone") * quantity;
		resources.iron += e.getAttribute("data-wanted_iron") * quantity;
	});
	return resources;
}

function getPendingOngoingResources() {
	const incommingElement = document.getElementById("market_status_bar")?.children[1]?.querySelector("th");
	const incommingWood = incommingElement?.querySelector(".icon.header.wood")?.nextSibling?.textContent ?? 0;
	const incommingStone = incommingElement?.querySelector(".icon.header.stone")?.nextSibling?.textContent ?? 0;
	const incommingIron = incommingElement?.querySelector(".icon.header.iron")?.nextSibling?.textContent ?? 0;
	return {
		wood: Number(incommingWood),
		stone: Number(incommingStone),
		iron: Number(incommingIron)
	}
}

function getAvailableResources() {
	return {
		wood: Number(document.getElementById("wood").innerText),
		stone: Number(document.getElementById("stone").innerText),
		iron: Number(document.getElementById("iron").innerText)
	};
}

function getTheoreticalResources() {
	const availableResources = getAvailableResources();
	const ongoingResources = getPendingOngoingResources();
	const incommingResources = getPendingIncommingResources();

	return {
		wood: availableResources.wood + ongoingResources.wood + incommingResources.wood,
		stone: availableResources.stone + ongoingResources.stone + incommingResources.stone,
		iron: availableResources.iron + ongoingResources.iron + incommingResources.iron
	};
}

function trade(offer, want, amount) {
	document.getElementById("res_sell_" + offer).click();
	document.getElementById("res_buy_" + want).click();

	document.getElementById("res_sell_amount").value = amount;
	document.getElementById("res_buy_amount").value = amount;

	document.getElementById("submit_offer").click();
}

function nextIteration() {
	const resources = getTheoreticalResources();
	console.log("Recursos (no fim de efetuar todas as trocas pendentes):");
	console.log(resources);

	const mostResource = {
		resource: undefined,
		quantity: Number.MIN_SAFE_INTEGER
	};

	const leastResource = {
		resource: undefined,
		quantity: Number.MAX_SAFE_INTEGER
	};

	Object.keys(resources).forEach(r => {
		const resourceCount = resources[r];
		if(resourceCount > mostResource.quantity) {
			mostResource.quantity = resourceCount;
			mostResource.resource = r;
		}
		if(resourceCount < leastResource.quantity) {
			leastResource.quantity = resourceCount;
			leastResource.resource = r;
		}
	});
	
	console.log("Recurso mais ambundante: " + mostResource.resource + ", (" + mostResource.quantity + ").");
	console.log("Recurso menos ambundante: " + leastResource.resource + ", (" + leastResource.quantity + ").");

	const rate = Math.round(leastResource.quantity / mostResource.quantity * 100);
	console.log("Rácio: " + rate + "%.");

	if(rate > maxDifferencePercentage) {
		console.log("O rácio não compensa uma trade.");
		console.log("Só são feitas trades com rácios abaixo de " + maxDifferencePercentage + "%");
		return;
	}
	
	const storageSpace = Number(document.getElementById("storage").innerText);
	const amountToTrade = Math.ceil(Math.min((mostResource.quantity - leastResource.quantity) / 2, merchantCapacity) / 100) * 100;

	console.log("Quantia de recursos a trocar: " + amountToTrade);

	if(amountToTrade < minTrade) {
		console.log("Não compensa fazer uma trade com uma quantia tão pequena (" + amountToTrade + ").");
		return;
	}

	if(amountToTrade + leastResource.quantity > storageSpace) {
		console.log("A trade faria com que o armazém ficasse demasiado cheio.");
		return;
	}

	const availableMerchants = Number(document.getElementById("market_merchant_available_count").innerText);
	if(availableMerchants === 0) {
		console.log("Sem mercadores disponíveis.");
		return;
	}

	const availableResources = getAvailableResources();
	if(availableResources[mostResource.resource] < amountToTrade) {
		console.log("Não há recursos suficientes no armazém.");
		return;
	}

	console.log("A efetuar uma trade de " + amountToTrade + " recursos dentro de 30 segundos...");

	setTimeout(function () {
		trade(mostResource.resource, leastResource.resource, amountToTrade);
	}, 30000);
}