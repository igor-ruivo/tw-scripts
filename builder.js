// ==UserScript==
// @name                Tribal Wars Builder Bot
// @description 	    Automatically updates the desired buildings as soon as possible. Comes with automatic storage and farm update when needed.
// @author		        Igor Ruivo
// @include             http*://*.*game.php*screen=main
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const forceOrder = false;
const buildStorageWhenNeeded = true;
const buildFarmWhenNeeded = true;
const maxStoragePercentage = 98;
const maxFarmPercentage = 95;
const maxStorageLevel = 30;
const maxFarmLevel = 30;
const maxBuildQueueLength = 2;
const buildQueueOffset = 2;
const offsetTimeInMillis = 3000;

const levels = loadBuildingsAndLevels();
const userBuildList = loadUserBuildList();
let clickedTask = {};

(function () {
	'use strict';

	const delay = Math.floor(Math.random() * 4000 + 43000);

	setTimeout(function () {
		nextIteration();
		console.log("Reload dentro de " + Math.round(delay / 1000) + " segundos...");
	}, offsetTimeInMillis);

	setTimeout(function () {
		window.location.reload(true);
	}, delay + offsetTimeInMillis);
})();

function getDate() {
	const date = new Date;
	const minutes = date.getMinutes();
	const hours = date.getHours();
	return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

function nextIteration() {
	const nextBuildTask = getNextBuildTask();
	if (nextBuildTask) {
		nextBuildTask.click();
		console.log(getDate() + " - A upar " + clickedTask.building + " para nível " + clickedTask.level + ".");
	}
	else {
		console.log(getDate() + " - De momento não é possível construir nada.");
	}
}

function buildingAlreadyInQueue(build) {
	return userBuildList.some(b => b.building === build) || !!document.getElementById("buildqueue")?.querySelector(".lit.nodrag.buildorder_" + build);
}

function checkStorageForUpgrade(currentLevel) {
	if (currentLevel < maxStorageLevel) {
		const storageSpace = document.getElementById("storage").innerText;
		const wood = document.getElementById("wood").innerText;
		const stone = document.getElementById("stone").innerText;
		const iron = document.getElementById("iron").innerText;
		const maxResource = Math.max(Math.max(wood, stone), iron);
		const currentStoragePercentage = Math.round(maxResource / storageSpace * 100);
		console.log("Armazém a " + currentStoragePercentage + "% (Nível " + currentLevel + ")");
		if (currentStoragePercentage >= maxStoragePercentage && !buildingAlreadyInQueue("storage")) {
			userBuildList.unshift({ building: "storage", level: 30 });
			console.log("Armazém adicionado à lista...");
		}
	}
}

function checkFarmForUpgrade(currentLevel) {
	if (currentLevel < maxFarmLevel) {
		const maxPopulation = document.getElementById("pop_max_label").innerText;
		const currentPopulation = document.getElementById("pop_current_label").innerText;
		const currentFarmPercentage = Math.round(currentPopulation / maxPopulation * 100);
		console.log("Fazenda a " + currentFarmPercentage + "% (Nível " + currentLevel + ")");
		if (currentFarmPercentage >= maxFarmPercentage && !buildingAlreadyInQueue("farm")) {
			userBuildList.unshift({ building: "farm", level: 30 });
			console.log("Fazenda adicionada à lista...");
		}
	}
}

function removeCompletedTasks(list) {
	const newBuildList = [];
	for (let i = 0; i < list.length; i++) {
		const currentBuilding = list[i];
		if (currentBuilding.level >= levels[currentBuilding.building]) {
			newBuildList.push(currentBuilding);
		}
	}
	return newBuildList;
}

function getNextBuildTask() {
	if (buildStorageWhenNeeded) {
		checkStorageForUpgrade(levels["storage"] - 1);
	}
	if (buildFarmWhenNeeded) {
		checkFarmForUpgrade(levels["farm"] - 1);
	}
	if ($('[id="buildqueue"]').find('tr').length >= buildQueueOffset + maxBuildQueueLength) {
		console.log("Já há " + maxBuildQueueLength + " ordens ou mais na fila de construção. Não vou fazer nada agora.");
		return undefined;
	}
	console.log(levels);
	for (let i = 0; i < userBuildList.length; i++) {
		const building = userBuildList[i].building;
		const level = levels[building];
		console.log("A tentar upar " + building + " para nível " + level + "...");
		const nextLink = buildLinkName(building, level);
		const linkElement = document.getElementById(nextLink);
		if (linkElement) {
			const isClickable = linkElement.offsetWidth > 0 || linkElement.offsetHeight > 0;
			if (isClickable) {
				clickedTask = { building: building, level: level };
				return linkElement;
			}
			if (forceOrder) {
				return undefined;
			}
		}
	}
	return undefined;
}

function buildLinkName(building, level) {
	return "main_buildlink_" + building + "_" + level;
}

function loadBuildingsAndLevels() {
	const levels = {};
	const buildElements = Array.from(document.getElementsByClassName("btn btn-build"));
	buildElements.forEach(b => {
		levels[b.getAttribute('data-building')] = b.getAttribute('data-level-next')
	});
	return levels;
}

function loadUserBuildList() {
	const buildList = [];

	//change
	buildList.push({ building: "wood", level: 30 });
	buildList.push({ building: "stone", level: 30 });
	buildList.push({ building: "iron", level: 30 });

	return removeCompletedTasks(buildList);
}