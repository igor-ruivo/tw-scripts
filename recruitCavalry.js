// ==UserScript==
// @name                Tribal Wars Cavalry Recruiter Bot
// @description 	    Automatically recruits the desired cavalry as soon as possible.
// @author		        Igor Ruivo
// @include             http*://*.*game.php*screen=stable*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const pairWithInfantry = false;
const avoidUnevenResources = true;
const maxLightCavalryTrainPerTry = 5;
const averageMinutesReloadTime = 5;
const maxLightCavalry = 3000;
const offsetTimeInMillis = 3000;

(function () {
	'use strict';

	setTimeout(function () {
		if(nextIteration()) {
			console.log("Reload dentro de 10 minutos...");
		}
	}, offsetTimeInMillis);

	setTimeout(function () {
		window.location.reload(true);
	}, 1000 * 60 * 10 + offsetTimeInMillis);
})();

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

function getDate() {
	const date = new Date;
	const minutes = date.getMinutes();
	const hours = date.getHours();
	return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

function recruit(units) {
	document.getElementById("light_0").value = units;
	const recruitButton = document.getElementsByClassName("btn btn-recruit")[0];
	recruitButton?.click();
	if(units && recruitButton) {
		console.log(getDate() + " - A recrutar " + units + " Cavalaria Leve.");
	} else {
		console.log("Recursos insuficientes.");
	}
}

function getNumberOfTroops() {
	return Number(document.getElementById("light_0_cost_wood").closest("tr").children[2].innerText.split("/")[1]);
}

function nextIteration() {
	const availableUnits = document.getElementById("light_0_a")?.innerText?.slice(1, -1);
	if(!availableUnits) {
		console.log("Cavalaria Leve ainda não foi pesquisada.");
		return true;
	}

	const currentTroops = getNumberOfTroops();
	if(currentTroops >= maxLightCavalry) {
		console.log("Já foram recrutadas as unidades planeadas (" + maxLightCavalry + ").");
		return true;
	}

	const missingTroops = Math.max(0, maxLightCavalry - currentTroops);

	const units = Math.min(Math.min(maxLightCavalryTrainPerTry, Number(availableUnits)), missingTroops);

	if(avoidUnevenResources) {
		const lightPrices = {
			wood: Number(document.getElementById("light_0_cost_wood").innerText),
			stone: Number(document.getElementById("light_0_cost_stone").innerText),
			iron: Number(document.getElementById("light_0_cost_iron").innerText)
		}

		const pricesInfo = compareResources(lightPrices);
		const mostRelevantResource = pricesInfo.mostResource.resource;

		const userResources = {
			wood: Number(document.getElementById("wood").innerText),
			stone: Number(document.getElementById("stone").innerText),
			iron: Number(document.getElementById("iron").innerText)
		}

		const userResourcesInfo = compareResources(userResources);
		const leastAbundantResource = userResourcesInfo.leastResource.resource;
		if(leastAbundantResource === mostRelevantResource) {
			console.log(leastAbundantResource + " é o teu recurso mais escasso. Não vão ser recrutadas tropas.");
			return true;
		}
	}

	recruit(units);

	const delay = Math.floor(Math.random() * 1000 * 60 + averageMinutesReloadTime * 60 * 1000);

	if(pairWithInfantry) {
		console.log("A redirecionar para o quartel dentro de " + Math.round(delay / 1000 / 60) + " minutos...");
		setTimeout(function () {
			window.location.href = window.location.href.replace("screen=stable", "screen=barracks");
		}, delay);
		return false;
	}
	return true;
}