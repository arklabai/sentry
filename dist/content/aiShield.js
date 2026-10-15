(function(){"use strict";(function(){function i(){try{chrome.storage.local.get(["sentry_settings"],e=>{if(e&&e.sentry_settings&&e.sentry_settings.canvasBlocker){const t=e.sentry_settings.canvasBlocker;window.dispatchEvent(new CustomEvent("sentry:config",{detail:{gpuProfile:t.gpuProfile||"intel_uhd",timezoneSpoof:t.timezoneSpoof||"system",hardwareConcurrencyValue:t.hardwareConcurrencyValue||4,batteryShield:t.batteryShield!==!1,visibilityShield:!!t.visibilityShield}}))}})}catch{}}i();try{chrome.storage.onChanged.addListener((e,t)=>{t==="local"&&e.sentry_settings&&i()})}catch{}window.addEventListener("sentry:telemetry",e=>{const t=e;if(t.detail)try{chrome.runtime.sendMessage({action:"RECORD_THREAT",payload:{type:t.detail.type,detail:t.detail.detail,domain:t.detail.domain,timestamp:t.detail.timestamp}})}catch{}});const o=['img[src*="facebook.com/tr"]','img[src*="google-analytics.com/collect"]','img[src*="c.bing.com/c.gif"]','iframe[src*="doubleclick.net"]','div[id*="cookie-banner"]','div[class*="cookie-notice"]','div[class*="ai-consent-modal"]'];function a(){const e=document.createElement("style");e.id="sentry-cosmetic-shield",e.textContent=`
      ${o.join(`,
`)} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
      }
    `,document.head?document.head.appendChild(e):document.addEventListener("DOMContentLoaded",()=>{document.head.appendChild(e)})}function n(){const e=document.querySelectorAll('img[width="1"][height="1"], img[style*="display:none"], img[src*="pixel"]');if(e.length>0)try{chrome.runtime.sendMessage({action:"RECORD_THREAT",payload:{type:"tracker",detail:`Purged ${e.length} hidden tracking pixel(s) from DOM`,domain:window.location.host,timestamp:Date.now()}})}catch{}}try{a(),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",n):n()}catch(e){console.error("[Sentry AI] Shield initialization error:",e)}})()})();
