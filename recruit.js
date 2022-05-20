// ==UserScript==
// @name                Tribal Wars Troops Recruiter Bot
// @description 	    Automatically recruits the desired troops as soon as possible.
// @author		        Igor Ruivo
// @include             http*tribalwars*screen=stable*
// @include             http*tribalwars*screen=barracks*
// @include             http*tribalwars*screen=garage*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const troopsToTrain = [
	{village: "444|581", troop: "axe", train: 6, max: 7000},
	{village: "444|581", troop: "light", train: 3, max: 3000},
	{village: "444|581", troop: "ram", train: 1, max: 300},
	{village: "441|576", troop: "axe", train: 6, max: 7000},
	{village: "441|576", troop: "light", train: 3, max: 3000},
	{village: "447|581", troop: "spear", train: 2, max: 7000},
	{village: "447|581", troop: "sword", train: 2, max: 3000},
	{village: "447|581", troop: "archer", train: 1, max: 2000},
	{village: "441|577", troop: "spear", train: 2, max: 7000},
	{village: "441|577", troop: "sword", train: 2, max: 3000},
	{village: "441|577", troop: "archer", train: 1, max: 2000},
	{village: "447|580", troop: "axe", train: 5, max: 7000},
	{village: "447|580", troop: "light", train: 3, max: 3000}
];
const avoidUnevenResources = false;
const recruitmentCicleTimeInMinutes = 11;
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
	const troopsAsArray = troopsToTrain.filter(t => t.village === getCurrentVillage()).map(t => t.troop);

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

function getCurrentVillage() {
	const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
	return villageName.slice(1, villageName.indexOf(")"));
}

function nextIteration() {
	for(let i = 0; i < troopsToTrain.filter(t => t.village === getCurrentVillage()).length; i++) {
		setTimeout(function () {
			const troopInfo = troopsToTrain.filter(t => t.village === getCurrentVillage())[i];
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