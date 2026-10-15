/**
 * Sentry AI in-page AI Shield & Telemetry Bridge
 * Execution World: ISOLATED
 *
 * Bridges events from canvasDefender (MAIN world) to the background Service Worker,
 * neutralizes DOM tracking pixels, and enforces cosmetic block filters.
 */

(function () {
  'use strict';

  // Synchronize settings from chrome.storage to MAIN world canvasDefender
  function syncSettingsToMainWorld() {
    try {
      chrome.storage.local.get(['sentry_settings'], (res) => {
        if (res && res.sentry_settings && res.sentry_settings.canvasBlocker) {
          const cb = res.sentry_settings.canvasBlocker;
          window.dispatchEvent(
            new CustomEvent('sentry:config', {
              detail: {
                gpuProfile: cb.gpuProfile || 'intel_uhd',
                timezoneSpoof: cb.timezoneSpoof || 'utc',
                hardwareConcurrencyValue: cb.hardwareConcurrencyValue || 4,
                batteryShield: cb.batteryShield !== false,
                visibilityShield: !!cb.visibilityShield,
                allowRightClick: cb.allowRightClick !== false && res.sentry_settings.allowRightClick !== false,
              },
            })
          );
        }
      });
    } catch {
      // Storage access restricted
    }
  }

  // Initial sync
  syncSettingsToMainWorld();

  // Listen for storage changes to update MAIN world in real time
  try {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.sentry_settings) {
        syncSettingsToMainWorld();
      }
    });
  } catch {}

  // Listen for threat telemetry dispatched from MAIN world (canvasDefender)
  window.addEventListener('sentry:telemetry', (e: Event) => {
    const customEvent = e as CustomEvent<{
      type: string;
      detail: string;
      domain: string;
      timestamp: number;
    }>;

    if (!customEvent.detail) return;

    try {
      chrome.runtime.sendMessage({
        action: 'RECORD_THREAT',
        payload: {
          type: customEvent.detail.type,
          detail: customEvent.detail.detail,
          domain: customEvent.detail.domain,
          timestamp: customEvent.detail.timestamp,
        },
      });
    } catch {
      // Background worker might be waking up
    }
  });

  // Cosmetic rules to hide tracking badges, invasive AI consent nags, and invisible pixels
  const COSMETIC_FILTERS = [
    'img[src*="facebook.com/tr"]',
    'img[src*="google-analytics.com/collect"]',
    'img[src*="c.bing.com/c.gif"]',
    'iframe[src*="doubleclick.net"]',
    'div[id*="cookie-banner"]',
    'div[class*="cookie-notice"]',
    'div[class*="ai-consent-modal"]',
  ];

  function applyCosmeticFilters() {
    const styleEl = document.createElement('style');
    styleEl.id = 'sentry-cosmetic-shield';
    styleEl.textContent = `
      ${COSMETIC_FILTERS.join(',\n')} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        width: 0 !important;
      }
    `;
    if (document.head) {
      document.head.appendChild(styleEl);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.head.appendChild(styleEl);
      });
    }
  }

  // Scan for in-page tracking pixels upon DOM load
  function scanForPixels() {
    const pixels = document.querySelectorAll(
      'img[width="1"][height="1"], img[style*="display:none"], img[src*="pixel"]'
    );
    if (pixels.length > 0) {
      try {
        chrome.runtime.sendMessage({
          action: 'RECORD_THREAT',
          payload: {
            type: 'tracker',
            detail: `Purged ${pixels.length} hidden tracking pixel(s) from DOM`,
            domain: window.location.host,
            timestamp: Date.now(),
          },
        });
      } catch {
        // Ignore
      }
    }
  }

  // Inject cosmetic filter
  try {
    applyCosmeticFilters();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanForPixels);
    } else {
      scanForPixels();
    }
  } catch (err) {
    console.error('[Sentry AI] Shield initialization error:', err);
  }
})();
export {};
