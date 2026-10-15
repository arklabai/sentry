(function(){window.addEventListener("sentry:telemetry",e=>{const t=e;if(t.detail)try{chrome.runtime.sendMessage({action:"RECORD_THREAT",payload:{type:t.detail.type,detail:t.detail.detail,domain:t.detail.domain,timestamp:t.detail.timestamp}})}catch{}});const n=['img[src*="facebook.com/tr"]','img[src*="google-analytics.com/collect"]','img[src*="c.bing.com/c.gif"]','iframe[src*="doubleclick.net"]','div[id*="cookie-banner"]','div[class*="cookie-notice"]','div[class*="ai-consent-modal"]'];function o(){const e=document.createElement("style");e.id="sentry-cosmetic-shield",e.textContent=`
      ${n.join(`,
`)} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
      }
    `,document.head?document.head.appendChild(e):document.addEventListener("DOMContentLoaded",()=>{document.head.appendChild(e)})}function i(){const e=document.querySelectorAll('img[width="1"][height="1"], img[style*="display:none"], img[src*="pixel"]');if(e.length>0)try{chrome.runtime.sendMessage({action:"RECORD_THREAT",payload:{type:"tracker",detail:`Purged ${e.length} hidden tracking pixel(s) from DOM`,domain:window.location.host,timestamp:Date.now()}})}catch{}}try{o(),document.readyState==="loading"?document.addEventListener("DOMContentLoaded",i):i()}catch(e){console.error("[Sentry AI] Shield initialization error:",e)}})();
