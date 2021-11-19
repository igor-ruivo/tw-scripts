// ==UserScript==
// @name                Tribal Wars Troops Recruiter Bot
// @description 	    Automatically recruits the desired troops as soon as possible.
// @author		        Igor Ruivo
// @include             http*://*.*game.php*screen=stable*
// @include             http*://*.*game.php*screen=barracks*
// @include             http*://*.*game.php*screen=garage*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const avoidUnevenResources = false;
const troopsToTrain = [
	{troop: "sword", train: 5, max: 10000},
	{troop: "heavy", train: 2, max: 1000}
];
const recruitmentCicleTimeInMinutes = 30;
const timeoutBetweenDifferentTroopsTrainInSameBuilding = 2000;
const offsetTimeInMillis = 3000;

const troopsPerBuildings = {
	barracks: ["spear", "sword", "axe", "archer"],
	stable: ["spy", "light", "marcher", "heavy"],
	garage: ["ram", "catapult"]
};

(function () {
	'use strict';
	window.sessionStorage.prevWin = window.location.href;
	setTimeout(function () {
		document.getElementById("checkbox")?.click();
	}, 2 * 1000);
	const currentBuilding = getCurrentBuilding();
	const troopsAsArray = troopsToTrain.map(t => t.troop);

	let relevantBuildings = [];

	Object.keys(troopsPerBuildings).forEach(b => {
		const value = troopsPerBuildings[b];
		if(value.some(t => troopsAsArray.includes(t))) {
			relevantBuildings.push(b);
		}
	});

	if(relevantBuildings.length === 0) {
		console.log("Não foram selecionadas unidades para treinar.");
		return;
	}

	console.log("Edifícios em ciclo: " + relevantBuildings);

	if(!relevantBuildings.includes(currentBuilding)) {
		window.location.href = window.location.href.replace("screen=" + currentBuilding, "screen=" + relevantBuildings[0]);
	}

	const nextBuilding = relevantBuildings[(relevantBuildings.indexOf(currentBuilding) + 1) % relevantBuildings.length];

	setTimeout(function () {
		nextIteration();
		console.log("A alterar edifício para " + nextBuilding + " dentro de apróx. " + (recruitmentCicleTimeInMinutes / relevantBuildings.length)  + " minutos...");
	}, offsetTimeInMillis);

	setTimeout(function () {
		window.location.href = window.location.href.replace("screen=" + currentBuilding, "screen=" + nextBuilding);
	}, 1000 * 60 * (recruitmentCicleTimeInMinutes / relevantBuildings.length) + offsetTimeInMillis);
})();

function getCurrentBuilding() {
	const urlArgs = window.location.href.split("&");
	const screen = urlArgs.filter(u => u.startsWith("screen="))[0];
	return screen.split("=")[1];
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

function getDate() {
	const date = new Date;
	const minutes = date.getMinutes();
	const hours = date.getHours();
	return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

function recruit(troop, units) {
	document.getElementById(troop + "_0").value = units;
	const recruitButton = document.getElementsByClassName("btn btn-recruit")[0];
	recruitButton?.click();
	if(units && recruitButton) {
		console.log(getDate() + " - A recrutar " + units + " " + troop + ".");
	} else {
		console.log("Recursos insuficientes.");
	}
}

function getNumberOfTroops(troop) {
	return Number(document.getElementById(troop + "_0_cost_wood").closest("tr").children[2].innerText.split("/")[1]);
}

function nextIteration() {
	for(let i = 0; i < troopsToTrain.length; i++) {
		setTimeout(function () {
			const troopInfo = troopsToTrain[i];
			console.log("A analisar " + troopInfo.troop + "...");
			const availableUnits = document.getElementById(troopInfo.troop + "_0_a")?.innerText?.slice(1, -1);
			if(!availableUnits) {
				console.log(troopInfo.troop + " não está disponível.");
				return;
			}

			const currentTroops = getNumberOfTroops(troopInfo.troop);
			if(currentTroops >= troopInfo.max) {
				console.log("Já foram recrutadas as unidades planeadas (" + troopInfo.max + " " + troopInfo.troop + ").");
				return;
			}

			const missingTroops = Math.max(0, troopInfo.max - currentTroops);

			const units = Math.min(Math.min(troopInfo.train, Number(availableUnits)), missingTroops);

			if(avoidUnevenResources) {
				const troopPrice = {
					wood: Number(document.getElementById(troopInfo.troop + "_0_cost_wood").innerText),
					stone: Number(document.getElementById(troopInfo.troop + "_0_cost_stone").innerText),
					iron: Number(document.getElementById(troopInfo.troop + "_0_cost_iron").innerText)
				}

				const pricesInfo = compareResources(troopPrice);
				const mostRelevantResource = pricesInfo.mostResource.resource;

				const userResources = {
					wood: Number(document.getElementById("wood").innerText),
					stone: Number(document.getElementById("stone").innerText),
					iron: Number(document.getElementById("iron").innerText)
				}

				const userResourcesInfo = compareResources(userResources);
				const leastAbundantResource = userResourcesInfo.leastResource.resource;
				if(leastAbundantResource === mostRelevantResource) {
					console.log(leastAbundantResource + " é o teu recurso mais escasso. Não vão ser recrutados " + troopInfo.troop);
					return;
				}
			}

			recruit(troopInfo.troop, units);
		}, i * timeoutBetweenDifferentTroopsTrainInSameBuilding);
	}
}