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

const useGold = false;
const hoursToUseGold = 4;
const forceOrder = false;
const buildStorageWhenNeeded = true;
const buildFarmWhenNeeded = true;
const maxStoragePercentage = 90;
const maxFarmPercentage = 95;
const maxStorageLevel = 30;
const maxFarmLevel = 30;
const maxBuildQueueLength = 5;
const buildQueueOffset = 2;
const offsetTimeInMillis = 3000;

let levels;
let userBuildList;

let clickedTask = {};

(function () {
	'use strict';
	window.sessionStorage.prevWin = window.location.href;
	setTimeout(function () {
		document.getElementById("checkbox")?.click();
	}, 2 * 1000);
	const delay = Math.floor(Math.random() * 4000 + 43000);

	setTimeout(function () {
		console.log("A acabar tarefas gratuitas...");
		completeFreeTasks();
	}, offsetTimeInMillis);

	setTimeout(function () {
		console.log("A utilizar ouro...");
		if(useGold) {
			spendGold();
		}
	}, offsetTimeInMillis * 2);

	setTimeout(function () {
		nextIteration();
		console.log("Reload dentro de " + Math.round(delay / 1000) + " segundos...");
	}, offsetTimeInMillis * 3);

	setTimeout(function () {
		const nextVillageButton = document.getElementById("village_switch_right");
		nextVillageButton ? nextVillageButton.click() : window.location.reload(true);
	}, delay + offsetTimeInMillis * 3);
})();

function getDate() {
	const date = new Date;
	const minutes = date.getMinutes();
	const hours = date.getHours();
	return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
}

function nextIteration() {
	levels = loadBuildingsAndLevels();
	userBuildList = loadUserBuildList();
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
	return userBuildList.some(b => b.building === build && b.village === getCurrentVillage()) ||
	!!document.getElementById("buildqueue")?.querySelector(".buildorder_" + build);
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

function getCurrentVillage() {
	const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
	return villageName.slice(1, villageName.indexOf(")"));
}

function removeCompletedTasks(list) {
	const newBuildList = [];
	for (let i = 0; i < list.length; i++) {
		const currentBuilding = list[i];
		if (getCurrentVillage() === currentBuilding.village && currentBuilding.level >= levels[currentBuilding.building]) {
			newBuildList.push(currentBuilding);
		}
	}
	return newBuildList;
}

function completeFreeTasks() {
    const target = Array.from(document.getElementsByClassName("btn-instant-free"))
	.filter(e => e.style.display !== 'none')[0];
	if(target) {
		target.click();
		window.location.reload(true);
	}
}

function spendGold() {
	const gold = Number(document.getElementById("premium_points").innerText.replaceAll(",", "").replaceAll(".", ""));
	if(gold >= 10) {
		const candidates = Array.from(document.getElementById("buildqueue").children).filter(e => e.classList.contains("sortable_row") && e.querySelector(".order_feature"));
		for(let i = 0; i < candidates.length; i++) {
			const hours = Number(candidates[i].children[1].children[0].innerText.split(":")[0]);
			if(hours >= hoursToUseGold) {
				candidates[i].querySelector(".order_feature").click();
				return;
			}
		}
	}
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
	//buildList.push({ village: "405|439", building: "barracks", level: 25 });
	//buildList.push({ village: "405|439", building: "stable", level: 20 });
	//buildList.push({ village: "405|439", building: "market", level: 25 });
	buildList.push({ village: "405|439", building: "wood", level: 30 });
	buildList.push({ village: "405|439", building: "stone", level: 30 });
	buildList.push({ village: "405|439", building: "iron", level: 30 });

	buildList.push({ village: "403|439", building: "smith", level: 5 });
	buildList.push({ village: "403|439", building: "stable", level: 3 });
	buildList.push({ village: "403|439", building: "wood", level: 30 });
	buildList.push({ village: "403|439", building: "stone", level: 30 });
	buildList.push({ village: "403|439", building: "iron", level: 30 });
	return removeCompletedTasks(buildList);
}