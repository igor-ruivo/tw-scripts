// ==UserScript==
// @name                New Farmer
// @description 	      New Farmer
// @author		         Igor Ruivo
// @include             http*tribalwars*
// @version     	      0.0.1
// @supportURL          https://github.com/igor-ruivo/tw-scripts
// @grant               GM_getResourceText
// @grant               GM_addStyle
// @grant               GM_getValue
// @grant               unsafeWindow
// ==/UserScript==

setTimeout(() => {
    if (document.getElementsByClassName('bot-protection-row').length > 0) {
        hookDiscord();
    }
}, 5000);

console.log('Reload dentro de 60s.');
setTimeout(() => {
    window.location.reload(true);
}, 60000);

const hookDiscord = async (logout = true, title = `${TribalWars.getGameData().player.name} - Alerta Captcha!`, description = "Captcha por resolver!") => {
    const url = 'https://discord.com/api/webhooks/1353688174119096321/gP6pbveyiwgc3K6mTSdAL7CPT7dciBa-G3T44s7KAfFO6qcnP4ZMRoSr_51sPjs4dTuE';
    await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: `<@&1353690868019757097>`,
            embeds: [{
                title: title,
                description: description,
                color: 16711680
            }]
        })
    });

    if (logout) {
        Array.from(document.getElementsByTagName('a')).filter(k => k.href.includes('logout'))[0].click();
    }
}