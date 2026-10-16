/**
 * Sentry AI Persistent Element Zapper & Cosmetic Content Guard
 * 1. Permanently enforces domain-scoped zap rules saved locally in chrome.storage.local (uBlock style).
 * 2. Neutralizes cookie consent popups and unblocks page scroll across all sites.
 * 3. Provides an interactive point-and-click element picker with smart CSS selector generation.
 */

import {
  generateOptimalSelector,
  getDomainZapRules,
  savePersistentZapRule,
  normalizeDomain,
} from '../lib/zapManager';
import {
  handleCookieConsentGuard,
  DEFAULT_COOKIE_CONSENT_SETTINGS,
} from '../lib/cookieGuard';
import type { ZapRule, PrivacySettings } from '../types/index.ts';

(function () {
  'use strict';

  // Prevent multiple injections
  if ((window as unknown as { __sentryZapperInitialized?: boolean }).__sentryZapperInitialized) {
    return;
  }
  (window as unknown as { __sentryZapperInitialized?: boolean }).__sentryZapperInitialized = true;

  // Auto-close stray ad-choice / opt-out pages if navigated from search engines
  const AD_CHOICE_PAGE_REGEX =
    /^(https?:\/\/)?([a-z0-9.-]+\.)?(choice\.microsoft\.com|aboutads\.info|optout\.networkadvertising\.org|youronlinechoices\.com)/i;
  const SEARCH_REFERRER_REGEX =
    /^(https?:\/\/)?([a-z0-9.-]+\.)?(duckduckgo\.com|google\.[a-z.]+|bing\.com|search\.brave\.com|ecosia\.org|startpage\.com|yahoo\.com)/i;

  if (
    AD_CHOICE_PAGE_REGEX.test(window.location.href) &&
    SEARCH_REFERRER_REGEX.test(document.referrer || '')
  ) {
    try {
      chrome.runtime.sendMessage({ action: 'CLOSE_TAB_AND_FOCUS_SEARCH' });
    } catch {}
  }

  const currentHost = normalizeDomain(window.location.hostname);
  let persistentStyleEl: HTMLStyleElement | null = null;
  let activeZapRules: ZapRule[] = [];
  let mutationObserver: MutationObserver | null = null;

  // Interactive zapper state
  let zapperActive = false;
  let hoveredElement: HTMLElement | null = null;
  let overlay: HTMLDivElement | null = null;
  let badge: HTMLDivElement | null = null;

  // =========================================================================
  // 1. PERSISTENT ZAP RULE ENFORCEMENT (Zero Flicker on Reload / Revisit)
  // =========================================================================

  function updatePersistentStylesheet(rules: ZapRule[]) {
    if (!rules || rules.length === 0) {
      if (persistentStyleEl) {
        persistentStyleEl.remove();
        persistentStyleEl = null;
      }
      return;
    }

    const cssSelectors = rules.map((r) => r.selector).join(',\n');
    const cssContent = `
      ${cssSelectors} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
    `;

    if (!persistentStyleEl) {
      persistentStyleEl = document.createElement('style');
      persistentStyleEl.id = 'sentry-persistent-zap-rules';
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(persistentStyleEl);
      }
    }

    persistentStyleEl.textContent = cssContent;
  }

  function purgeMatchingElements() {
    if (activeZapRules.length === 0) return;
    for (const rule of activeZapRules) {
      try {
        const matches = document.querySelectorAll<HTMLElement>(rule.selector);
        matches.forEach((el) => {
          el.style.setProperty('display', 'none', 'important');
        });
      } catch {
        // Selector may be invalid or obsolete
      }
    }
  }

  function startMutationWatcher() {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver(() => {
      purgeMatchingElements();
    });

    const target = document.documentElement || document.body;
    if (target) {
      mutationObserver.observe(target, {
        childList: true,
        subtree: true,
      });
    }
  }

  async function initPersistentRules() {
    try {
      activeZapRules = await getDomainZapRules(currentHost);
      if (activeZapRules.length > 0) {
        updatePersistentStylesheet(activeZapRules);
        purgeMatchingElements();
        startMutationWatcher();
      }
    } catch {
      // Storage access may be restricted
    }
  }

  // Run immediately at document_start
  initPersistentRules();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      purgeMatchingElements();
      startMutationWatcher();
    });
  } else {
    purgeMatchingElements();
    startMutationWatcher();
  }

  // =========================================================================
  // 2. UNIVERSAL COOKIE CONSENT GUARD ("Save for all sites")
  // =========================================================================

  function initCookieConsent() {
    try {
      chrome.storage.local.get(['sentry_settings', 'sentry_privacy_settings'], (res) => {
        const raw = (res?.sentry_settings || res?.sentry_privacy_settings) as PrivacySettings;
        const settings = raw?.cookieConsent || DEFAULT_COOKIE_CONSENT_SETTINGS;
        if (settings.enabled) {
          handleCookieConsentGuard(settings, currentHost, (detail) => {
            try {
              chrome.runtime.sendMessage({
                action: 'RECORD_THREAT',
                payload: {
                  type: 'cookie_consent',
                  detail,
                  domain: currentHost,
                  timestamp: Date.now(),
                },
              });
            } catch {
              // Ignore
            }
          });
        }
      });
    } catch {
      // Ignore
    }
  }

  initCookieConsent();

  // =========================================================================
  // 3. INTERACTIVE POINT-AND-CLICK ZAPPER
  // =========================================================================

  let zapperCursorStyle: HTMLStyleElement | null = null;

  function setZapperCursor(enabled: boolean) {
    if (enabled) {
      if (!zapperCursorStyle) {
        zapperCursorStyle = document.createElement('style');
        zapperCursorStyle.id = 'sentry-zapper-cursor-override';
        zapperCursorStyle.textContent = `
          * {
            cursor: crosshair !important;
          }
        `;
        const target = document.head || document.documentElement;
        if (target) target.appendChild(zapperCursorStyle);
      }
    } else {
      if (zapperCursorStyle) {
        zapperCursorStyle.remove();
        zapperCursorStyle = null;
      }
    }
  }

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'sentry-zapper-overlay';
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.border = '2px solid #ef4444';
    overlay.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
    overlay.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.6)';
    overlay.style.zIndex = '2147483647';
    overlay.style.transition = 'all 0.04s ease-out';
    overlay.style.display = 'none';

    badge = document.createElement('div');
    badge.id = 'sentry-zapper-badge';
    badge.style.position = 'absolute';
    badge.style.bottom = '100%';
    badge.style.left = '0';
    badge.style.backgroundColor = '#181825';
    badge.style.color = '#f38ba8';
    badge.style.border = '1px solid #ef4444';
    badge.style.borderRadius = '6px';
    badge.style.padding = '4px 10px';
    badge.style.fontSize = '11px';
    badge.style.fontFamily = 'monospace';
    badge.style.fontWeight = 'bold';
    badge.style.whiteSpace = 'nowrap';
    badge.style.marginBottom = '6px';
    badge.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.5)';
    badge.style.pointerEvents = 'none'; // Never block mouse pointer events
    badge.textContent = 'ZAP TARGET (Click to Permanently Hide | ESC to Exit)';

    overlay.appendChild(badge);
    const target = document.body || document.documentElement;
    if (target) {
      target.appendChild(overlay);
    }
  }

  function showToast(message: string) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.backgroundColor = '#181825';
    toast.style.color = '#a6e3a1';
    toast.style.border = '1px solid #a6e3a1';
    toast.style.borderRadius = '8px';
    toast.style.padding = '10px 16px';
    toast.style.fontSize = '12px';
    toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '2147483647';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s ease';
    toast.textContent = message;

    const target = document.body || document.documentElement;
    if (target) {
      target.appendChild(toast);
    }
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function onMouseMove(e: MouseEvent) {
    if (!zapperActive) return;
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (
      target &&
      target !== overlay &&
      target !== badge &&
      target !== document.body &&
      target !== document.documentElement
    ) {
      hoveredElement = target;
      const rect = target.getBoundingClientRect();
      if (overlay && badge) {
        overlay.style.display = 'block';
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;

        const selectorPreview = generateOptimalSelector(target);
        badge.textContent = `ZAP: <${selectorPreview}> (Click to Save Rule | ESC to Exit)`;
      }
    }
  }

  // Track the most recent element that received a right-click
  let lastContextTarget: HTMLElement | null = null;
  document.addEventListener(
    'contextmenu',
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target !== overlay &&
        target !== badge &&
        target !== document.body &&
        target !== document.documentElement
      ) {
        lastContextTarget = target;
      }
    },
    true
  );

  async function zapElement(targetEl: HTMLElement): Promise<string> {
    const selector = generateOptimalSelector(targetEl);

    // 1. Hide element immediately
    targetEl.style.setProperty('display', 'none', 'important');

    // 2. Persist rule locally in chrome.storage.local
    try {
      const savedRule = await savePersistentZapRule(currentHost, selector);
      if (!activeZapRules.some((r) => r.id === savedRule.id)) {
        activeZapRules.push(savedRule);
      }
      updatePersistentStylesheet(activeZapRules);
      purgeMatchingElements();

      showToast(`Sentry AI: Element zapped! <${selector}> permanently hidden`);

      // 3. Notify background service worker to update stats and threats
      chrome.runtime.sendMessage({
        action: 'SAVE_ZAP_RULE',
        payload: {
          domain: currentHost,
          selector,
          description: `Permanent zap rule: <${selector}>`,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      console.warn('Failed to persist zap rule:', err);
    }
    return selector;
  }

  async function onClick(e: MouseEvent) {
    if (!zapperActive) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const targetEl = (hoveredElement || document.elementFromPoint(e.clientX, e.clientY)) as HTMLElement;
    if (!targetEl || targetEl === document.body || targetEl === document.documentElement) {
      stopZapper();
      return;
    }

    await zapElement(targetEl);
    stopZapper();
  }

  function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Esc' || e.code === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      stopZapper();
    }
  }

  function onZapperContextMenu(e: MouseEvent) {
    if (!zapperActive) return;
    // Right-clicking while zapper is active cancels the zapper mode cleanly
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    stopZapper();
  }

  function startZapper() {
    zapperActive = true;
    createOverlay();
    setZapperCursor(true);
    window.addEventListener('keydown', handleEscapeKey, true);
    document.addEventListener('keydown', handleEscapeKey, true);
    window.addEventListener('keyup', handleEscapeKey, true);
    document.addEventListener('keyup', handleEscapeKey, true);
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('contextmenu', onZapperContextMenu, true);
  }

  function stopZapper() {
    zapperActive = false;
    setZapperCursor(false);
    window.removeEventListener('keydown', handleEscapeKey, true);
    document.removeEventListener('keydown', handleEscapeKey, true);
    window.removeEventListener('keyup', handleEscapeKey, true);
    document.removeEventListener('keyup', handleEscapeKey, true);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('contextmenu', onZapperContextMenu, true);

    const existingOverlay = document.getElementById('sentry-zapper-overlay');
    if (existingOverlay) existingOverlay.remove();
    if (overlay) {
      overlay.remove();
      overlay = null;
      badge = null;
    }
    const existingStyle = document.getElementById('sentry-zapper-cursor-override');
    if (existingStyle) existingStyle.remove();
    zapperCursorStyle = null;
    hoveredElement = null;
  }

  // =========================================================================
  // 4. RUNTIME MESSAGE ROUTING
  // =========================================================================

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'ZAP_TARGET_ELEMENT') {
      if (
        lastContextTarget &&
        lastContextTarget.isConnected &&
        lastContextTarget !== document.body &&
        lastContextTarget !== document.documentElement
      ) {
        zapElement(lastContextTarget).then((selector) => {
          sendResponse({ status: 'ok', zapped: true, selector });
        });
      } else {
        startZapper();
        sendResponse({ status: 'ok', zapped: false, mode: 'interactive' });
      }
      return true;
    }

    if (message.action === 'ACTIVATE_ZAPPER') {
      startZapper();
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.action === 'SHOW_TOAST') {
      showToast(message.message || 'Action completed');
      sendResponse({ status: 'ok' });
      return true;
    }

    if (message.action === 'RELOAD_ZAP_RULES') {
      initPersistentRules().then(() => {
        sendResponse({ status: 'ok', count: activeZapRules.length });
      });
      return true;
    }

    if (message.action === 'GET_PAGE_ZAP_RULES') {
      sendResponse({ rules: activeZapRules, domain: currentHost });
      return true;
    }
  });
})();

export {};
