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
const roundQuantitiesTo = 100;
const blockResourceTrade = {
	wood: false,
	stone: false,
	iron: true
};

(function () {
	'use strict';

	setTimeout(function () {
		if(nextIteration()) {
			console.log("Reload dentro de 10 minutos...");
		}
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
		const quantity = Number(e.getAttribute("data-count"));
		resources.wood += Number(e.getAttribute("data-wanted_wood")) * quantity;
		resources.stone += Number(e.getAttribute("data-wanted_stone")) * quantity;
		resources.iron += Number(e.getAttribute("data-wanted_iron")) * quantity;
	});
	return resources;
}

function checkIfShouldDeleteOffers(rate, amountToTrade, storageSpace) {
	const bestOption = {
		bestRate: rate,
		checkbox: undefined
	};

	const pendingElements = document.querySelectorAll("[data-wanted_wood]");
	pendingElements.forEach(e => {
		const quantity = Number(e.getAttribute("data-count"));
		const columns = e.querySelectorAll("td");
		const checkboxElement = columns[0].children[0];
		const outgoing = columns[1];

		const outResources = {
			wood: Number(outgoing.querySelector(".icon.header.wood")?.nextSibling?.textContent ?? 0) * quantity,
			stone: Number(outgoing.querySelector(".icon.header.stone")?.nextSibling?.textContent ?? 0) * quantity,
			iron: Number(outgoing.querySelector(".icon.header.iron")?.nextSibling?.textContent ?? 0) * quantity
		};

		const simulatedResources = sumResources(getCertainResources(), outResources);
		const newResourcesInfo = compareResources(simulatedResources);

		const newDifference = newResourcesInfo.mostResource.quantity - newResourcesInfo.leastResource.quantity;
		const newAmountToTrade = Math.ceil(Math.min(newDifference / 2, merchantCapacity) / roundQuantitiesTo) * roundQuantitiesTo;

		const newRate = Math.round(newResourcesInfo.leastResource.quantity / newResourcesInfo.mostResource.quantity * 100);

		console.log("Cancelar a trade originava uma rate de " + newRate + "%. Recursos nesse cenário:");
		console.log(simulatedResources);
		console.log("Seriam trocados " + newAmountToTrade + " de " + newResourcesInfo.mostResource.resource + " por " + newResourcesInfo.leastResource.resource);

		if(newRate > bestOption.bestRate && newAmountToTrade < amountToTrade && newResourcesInfo.mostResource.quantity < storageSpace) {
			bestOption.bestRate = newRate;
			bestOption.checkbox = checkboxElement;
		}
	});
	
	if(bestOption.checkbox) {
		console.log("A apagar uma oferta dentro de 30 segundos...");

		setTimeout(function () {
			bestOption.checkbox.click();
			document.getElementsByClassName("btn-cancel")[0].click();
		}, 30000);
		return true;
	}
	return false;
}

function sumResources(a, b) {
	return {
		wood: Number(a.wood) + Number(b.wood),
		stone: Number(a.stone) + Number(b.stone),
		iron: Number(a.iron) + Number(b.iron)
	}
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

function getCertainResources() {
	return sumResources(getAvailableResources(), getPendingOngoingResources());
}

function getAvailableResources() {
	return {
		wood: Number(document.getElementById("wood").innerText),
		stone: Number(document.getElementById("stone").innerText),
		iron: Number(document.getElementById("iron").innerText)
	};
}

function getTheoreticalResources() {
	return sumResources(getCertainResources(), getPendingIncommingResources());
}

function trade(offer, want, amount) {
	document.getElementById("res_sell_" + offer).click();
	document.getElementById("res_buy_" + want).click();
	
	document.querySelector("[name='multi']").value = 1;

	document.getElementById("res_sell_amount").value = amount;
	document.getElementById("res_buy_amount").value = amount;

	document.getElementById("submit_offer").click();
}

function compareResources(resources) {
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

	return {
		mostResource: mostResource,
		leastResource: leastResource
	}
}

function nextIteration() {
	const resources = getTheoreticalResources();
	console.log("Recursos (no fim de efetuar todas as trocas pendentes):");
	console.log(resources);

	const resourcesInfo = compareResources(resources);
	const mostResource = resourcesInfo.mostResource;
	const leastResource = resourcesInfo.leastResource;
	
	console.log("Recurso mais ambundante: " + mostResource.resource + ", (" + mostResource.quantity + ").");
	console.log("Recurso menos ambundante: " + leastResource.resource + ", (" + leastResource.quantity + ").");

	const rate = Math.round(leastResource.quantity / mostResource.quantity * 100);

	const difference = mostResource.quantity - leastResource.quantity;
	console.log("Rácio: " + rate + "%. Diferença: " + difference + " unidades.");

	const storageSpace = Number(document.getElementById("storage").innerText);
	const amountToTrade = Math.ceil(Math.min(difference / 2, merchantCapacity) / roundQuantitiesTo) * roundQuantitiesTo;

	console.log("Quantia a trocar: " + amountToTrade);

	if(checkIfShouldDeleteOffers(rate, amountToTrade, storageSpace)) {
		return false;
	}

	if(rate > maxDifferencePercentage && difference <= 2 * merchantCapacity) {
		console.log("O rácio ou a diferença entre os recursos não compensa uma trade.");
		console.log("Só são feitas trades com rácios abaixo de " + maxDifferencePercentage + "%, ou quando há diferença de recursos superior a 2000 unidades.");
		return true;
	}

	console.log("Quantia de recursos a trocar: " + amountToTrade);

	if(amountToTrade < minTrade) {
		console.log("Não compensa fazer uma trade com uma quantia tão pequena (" + amountToTrade + ").");
		return true;
	}

	if(amountToTrade + leastResource.quantity > storageSpace) {
		console.log("A trade faria com que o armazém ficasse demasiado cheio.");
		return true;
	}

	const availableMerchants = Number(document.getElementById("market_merchant_available_count").innerText);
	if(availableMerchants === 0) {
		console.log("Sem mercadores disponíveis.");
		return true;
	}

	const availableResources = getAvailableResources();
	if(availableResources[mostResource.resource] < amountToTrade) {
		console.log("Não há recursos suficientes no armazém.");
		return true;
	}

	if(blockResourceTrade[mostResource.resource]) {
		console.log("A trade de " + mostResource.resource + " está bloqueada.");
		return true;
	}

	console.log("A efetuar uma trade de " + amountToTrade + " recursos dentro de 30 segundos...");

	setTimeout(function () {
		trade(mostResource.resource, leastResource.resource, amountToTrade);
	}, 30000);

	return false;
}