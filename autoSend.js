// ==UserScript==
// @name                Tribal Wars Auto Village Trading Bot
// @description 	    Automatically sends resources to your own villages in need.
// @author		        Igor Ruivo
// @include             http*://*.*game.php*mode=send*
// @version     	    0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

//configs
const helpingSystem = [
	{
		sender: "746|588",
		saveStoragePercentage: 0,
		receivers: [
			{
				village: "743|587",
				fillStoragePercentage: 30,
				minimumToSend: 3000
			},
			{
				village: "740|584",
				fillStoragePercentage: 80,
				minimumToSend: 500
			}
		]
	}
];

const merchantCapacity = 1000;
const offsetTimeInMillis = 3000;

(function () {
	'use strict';

	garbageCollector();

	if(!document.getElementById("village_switch_right")) {
		console.log("A tua conta não é premium ou só possuis uma aldeia.");
		console.log("Reload em 10 minutos.");
		setTimeout(function () {
			window.location.reload(true);
		}, 10 * 60 * 1000);
		return;
	}

	if(!villageIsSupplier()) {
		console.log("Aldeia sem destinatários... A visitar a próxima aldeia dentro de 10 segundos.");
		setTimeout(function () {
			document.getElementById("village_switch_right").click();
		}, 10 * 1000);
		return;
	}

	if(inConfirmationMenu()) {
		const formElement = document.getElementById("market-confirm-form");
		const villageName = formElement.querySelector("a").innerText;
		const KSplit = villageName.split("K");
		const name = KSplit[KSplit.length - 2];
		const coords = name.slice(name.lastIndexOf("(") + 1, name.lastIndexOf(")"));
		const timeComponents = formElement.querySelector("tbody").children[5].children[1].innerText.split(":");
		if(!villageIsSupplierOfSpecificVillage(coords)) {
			return;
		}
		setTimeout(function () {
			const newSupply = {
				sender: getCurrentVillage(),
				date: Date.parse(new Date()),
				tripTime: (Number(timeComponents[0]) * 3600 + Number(timeComponents[1]) * 60 + Number(timeComponents[2])) * 1000,
				resources: {
					wood: Number(formElement.querySelector(".wood")?.parentElement?.innerText?.replace(".", "") ?? 0),
					stone: Number(formElement.querySelector(".stone")?.parentElement?.innerText?.replace(".", "") ?? 0),
					iron: Number(formElement.querySelector(".iron")?.parentElement?.innerText?.replace(".", "") ?? 0)
				}
			}
			const key = "$$" + coords + "$$";
			const targetVillageStatus = localStorage[key];
			if(targetVillageStatus) {
				console.log("memory loaded from " + coords);
				const incommings = JSON.parse(targetVillageStatus);
				incommings.push(newSupply);
				console.log(incommings);
				localStorage[key] = JSON.stringify(incommings);
			} else {
				console.log("memory written for " + coords);
				localStorage[key] = JSON.stringify([newSupply]);
			}
			formElement.querySelector(".btn").click();
		}, 500);
		return;
	}

	setTimeout(function () {
		document.getElementsByClassName("target-select-links")[0]?.children[1]?.click();
	}, offsetTimeInMillis);

	setTimeout(function () {
		if(nextIteration()) {
			console.log("A visitar a próxima aldeia dentro de 60 segundos.");
			setTimeout(function () {
				document.getElementById("village_switch_right").click();
			}, 60 * 1000);
		} else {
			console.log("Reload em 10 minutos.");
			setTimeout(function () {
				window.location.reload(true);
			}, 10 * 60 * 1000);
		}
	}, offsetTimeInMillis * 2);
})();

function garbageCollector() {
	const scriptStorage = Array.from(Object.keys(localStorage)).filter(k => k.startsWith("$$") && k.endsWith("$$") && k.includes("|"));
	let gcCount = 0;
	scriptStorage.forEach(s => {
		const value = JSON.parse(localStorage[s]);
		const newValue = [];
		value.forEach(v => {
			if(v.date + v.tripTime * 2 < Date.parse(new Date())) {
				gcCount++;
			} else {
				newValue.push(v);
			}
		});
		if(newValue.length === 0) {
			localStorage.removeItem(s);
		} else {
			localStorage[s] = JSON.stringify(newValue);
		}
	});
	if(gcCount !== 0) {
		console.log("Recicladas " + gcCount + " entradas de memória.");
	}
}

function getCurrentVillage() {
	const villageName = document.getElementById("menu_row2").querySelector("b").innerText.split(" ")[0];
	return villageName.slice(1, villageName.indexOf(")"));
}

function villageIsSupplier() {
	const coords = getCurrentVillage();
	return helpingSystem.some(e => e.sender === coords);
}

function villageIsSupplierOfSpecificVillage(coords) {
	const currentVillage = getCurrentVillage();
	const destination = helpingSystem.filter(e => e.sender === currentVillage);
	if(destination.length === 0) {
		return false;
	}
	const entry = destination[0];
	return entry.receivers.some(r => r.village === coords)
}

function inConfirmationMenu() {
	return !!document.getElementById("market-confirm-form");
}

function getAvailableResources() {
	return {
		wood: Number(document.getElementById("wood").innerText),
		stone: Number(document.getElementById("stone").innerText),
		iron: Number(document.getElementById("iron").innerText)
	};
}

function getHelpedVillageResources(helpedVillage, coords) {
	const baseResources = {
		wood: Number(helpedVillage.querySelector(".wood").nextElementSibling.innerText.replace(".", "")),
		stone: Number(helpedVillage.querySelector(".stone").nextElementSibling.innerText.replace(".", "")),
		iron: Number(helpedVillage.querySelector(".iron").nextElementSibling.innerText.replace(".", "")),
	}
	const incommings = localStorage["$$" + coords + "$$"];
	if(!!incommings) {
		JSON.parse(incommings).filter(i => i.date + i.tripTime > Date.parse(new Date())).forEach(i => {
			baseResources.wood += i.resources.wood;
			baseResources.stone += i.resources.stone;
			baseResources.iron += i.resources.iron;
		});
	}
	return baseResources;
}

function nextIteration() {
	const storageSpace = Number(document.getElementById("storage").innerText);
	const availableMerchants = Number(document.getElementById("market_merchant_available_count").innerText);
	if(availableMerchants === 0) {
		console.log("Sem mercadores disponíveis.");
		return true;
	}

	const resources = getAvailableResources();

	const ownVillages = document.getElementById("own")?.nextElementSibling;
	if(!ownVillages) {
		console.log("Impossível enviar recursos.");
		return false;
	}

	const villages = ownVillages.querySelectorAll("tr");

	const villagesToBeHelped = [];

	villages.forEach(v => {
		const coords = v.querySelectorAll("td")[3].innerText;
		if(villageIsSupplier() && villageIsSupplierOfSpecificVillage(coords)) {
			villagesToBeHelped.push(v);
		}
	});

	const currentVillageEntry = helpingSystem.filter(e => e.sender === getCurrentVillage())[0];
	const ownStorageSavingPercentage = currentVillageEntry.saveStoragePercentage;
	const receiverVillages = currentVillageEntry.receivers;

	for(let i = 0; i < villagesToBeHelped.length; i++) {
		const currentVillage = villagesToBeHelped[i];
		const coordinates = currentVillage.children[3].innerText;

		console.log("A analisar possível fornecimento para " + coordinates);

		const helpedVillageResources = getHelpedVillageResources(currentVillage, coordinates);
		console.log("Recursos na aldeia (somando os que já vão a caminho):");
		console.log(helpedVillageResources);
		const helpedVillageStorage = Number(currentVillage.querySelector(".ressources").parentElement.innerText.replace(".", ""));
		const resourcesInput = document.getElementsByClassName("resources_max");
		const maxResourcesToSend = merchantCapacity * availableMerchants;
		const receiverVillageData = receiverVillages.filter(v => v.village === coordinates)[0];
		const maxResourcesToReceive = Math.floor(receiverVillageData.fillStoragePercentage / 100 * helpedVillageStorage);
		const minimumResourcesToSend = receiverVillageData.minimumToSend;
		console.log("Màximo de armazém a encher: " + maxResourcesToReceive);
		const helpedMissingResources = {
			wood: Math.max(maxResourcesToReceive - helpedVillageResources.wood, 0),
			stone: Math.max(maxResourcesToReceive - helpedVillageResources.stone, 0),
			iron: Math.max(maxResourcesToReceive - helpedVillageResources.iron, 0)
		}
		console.log("Recursos em falta:");
		console.log(helpedMissingResources);
		const missingSum = helpedMissingResources.wood + helpedMissingResources.stone + helpedMissingResources.iron;
		if(missingSum === 0) {
			console.log("Não há recursos em falta na aldeia.");
			continue;
		}
		const intendedResourcesToSend = {
			wood: Math.min(helpedMissingResources.wood, Math.min(resources.wood, Math.floor(helpedMissingResources.wood / missingSum * maxResourcesToSend))),
			stone: Math.min(helpedMissingResources.stone, Math.min(resources.stone, Math.floor(helpedMissingResources.stone / missingSum * maxResourcesToSend))),
			iron: Math.min(helpedMissingResources.iron, Math.min(resources.iron, Math.floor(helpedMissingResources.iron / missingSum * maxResourcesToSend)))
		};
		const resourcesToSend = {
			wood: Math.min(intendedResourcesToSend.wood, Math.max(Math.round(resources.wood - storageSpace * ownStorageSavingPercentage / 100), 0)),
			stone: Math.min(intendedResourcesToSend.stone, Math.max(Math.round(resources.stone - storageSpace * ownStorageSavingPercentage / 100), 0)),
			iron: Math.min(intendedResourcesToSend.iron, Math.max(Math.round(resources.iron - storageSpace * ownStorageSavingPercentage / 100), 0))
		};
		const resourcesToSendSum = resourcesToSend.wood + resourcesToSend.stone + resourcesToSend.iron;
		console.log("Recursos a mandar efetivamente:");
		console.log(resourcesToSend);
		if(resourcesToSendSum < minimumResourcesToSend) {
			console.log("Quantia de recursos não justifica um envio. Mínimo para esta aldeia alvo: " + minimumResourcesToSend);
			continue;
		}
		resourcesInput[0].value = resourcesToSend.wood;
		resourcesInput[1].value = resourcesToSend.stone;
		resourcesInput[2].value = resourcesToSend.iron;
		setTimeout(function () {
			currentVillage.querySelector("a").click();
		}, 1000);
		setTimeout(function () {
			document.getElementById("delivery_target").querySelector(".btn").click();
		}, 2000);
		break;
	}
	
	console.log("Esta aldeia não tem mais aldeias a fornecer");
	return true;
}