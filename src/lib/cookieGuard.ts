/**
 * Sentry AI Universal Cookie Consent & Banner Auto-Handler
 * Automatically suppresses cookie banners, auto-clicks "Reject All" / "Necessary Only",
 * restores locked page scrolling, and writes simulated consent tokens globally.
 */

import type { CookieConsentSettings } from '../types/index.ts';

export const DEFAULT_COOKIE_CONSENT_SETTINGS: CookieConsentSettings = {
  enabled: true,
  autoMode: 'auto_reject',
  hideBanners: true,
  autoUnlockScroll: true,
  totalBannersHandled: 0,
};

/**
 * Common CMP (Consent Management Platform) banner containers and backdrops
 */
export const COOKIE_BANNER_SELECTORS: string[] = [
  // OneTrust
  '#onetrust-consent-sdk',
  '#onetrust-banner-sdk',
  '#onetrust-pc-sdk',
  '.onetrust-pc-dark-filter',
  // Cookiebot
  '#CybotCookiebotDialog',
  '#CybotCookiebotDialogBodyUnderlay',
  // Didomi
  '#didomi-host',
  '.didomi-popup-container',
  '.didomi-popup-backdrop',
  '.didomi-popup-notice',
  // Complianz
  '.cmplz-cookiebanner',
  '.cmplz-cookie-warning',
  // Quantcast Choice
  '.qc-cmp2-container',
  '#qc-cmp2-container',
  // Klaro
  '.klaro',
  '#klaro',
  // TrustArc / Evidon
  '#trustarc-banner',
  '.truste_box_overlay',
  '#cookie-law-info-bar',
  // Usercentrics
  '#usercentrics-root',
  // Generic and common patterns
  '[id*="cookie-notice" i]',
  '[id*="cookie-banner" i]',
  '[id*="cookie-consent" i]',
  '[id*="cookiebanner" i]',
  '[class*="cookie-notice" i]',
  '[class*="cookie-banner" i]',
  '[class*="cookie-consent" i]',
  '[class*="cookiebanner" i]',
// Osano / CookieConsent / Cookie-Script / Vanilla-CookieConsent
  '#cc-main',
  '.cc-window',
  '#c-b-bn',
  '#cookiescript_injected',
  '#cookiescript_wrapper',
  '[aria-label*="cookie consent" i]',
  '[aria-label*="cookie banner" i]',
  '[aria-label*="cookie" i]',
  '[data-nosnippet*="cookie" i]',
];

/**
 * Standard rejection / necessary-only button selectors
 */
export const REJECT_BUTTON_SELECTORS: string[] = [
  '#onetrust-reject-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '.cmplz-deny',
  'button[data-cookiefirst-action="reject"]',
  '#didomi-notice-learn-more-button',
  '#c-s-bn', // CookieConsent.js reject/settings
  '#cookiescript_reject',
  'button[id*="reject" i]',
  'button[class*="reject" i]',
  'button[aria-label*="reject" i]',
  'button[id*="decline" i]',
  'button[class*="decline" i]',
  'button[aria-label*="decline" i]',
  'button[id*="deny" i]',
  'button[class*="deny" i]',
  'button[aria-label*="deny" i]',
  'button[data-testid*="reject" i]',
];

/**
 * Manage settings / Preferences button selectors for banners without direct reject
 */
export const MANAGE_SETTINGS_BUTTON_SELECTORS: string[] = [
  '#onetrust-pc-btn-handler',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection',
  '#CybotCookiebotDialogBodyButtonDetails',
  '#c-s-bn',
  '#cookiescript_manage',
  'button[id*="manage" i]',
  'button[class*="manage" i]',
  'button[aria-label*="manage" i]',
  'button[id*="preference" i]',
  'button[class*="preference" i]',
  'button[aria-label*="preference" i]',
  'button[id*="setting" i]',
  'button[class*="setting" i]',
  'a[id*="cookie-setting" i]',
  'a[class*="cookie-setting" i]',
  'a[id*="manage" i]',
  'a[class*="manage" i]',
];

/**
 * Save settings / Confirm choices button selectors inside preferences modals
 */
export const SAVE_PREFERENCES_BUTTON_SELECTORS: string[] = [
  '.save-preference-btn-handler',
  '#onetrust-pc-btn-handler',
  '#c-s-sv',
  '#cookiescript_save',
  'button[id*="save" i]',
  'button[class*="save" i]',
  'button[aria-label*="save" i]',
  'button[id*="confirm" i]',
  'button[class*="confirm" i]',
  'button[aria-label*="confirm" i]',
];

/**
 * Text regex for buttons that reject or limit tracking
 */
export const REJECT_TEXT_REGEX =
  /(^|\s)(reject all|decline all|reject non-essential|reject optional|only necessary|essential only|strictly necessary|refuse all|decline|disagree|deny all|reject|disable all)(\s|$)/i;

/**
 * Text regex for buttons that open settings / preferences
 */
export const MANAGE_SETTINGS_TEXT_REGEX =
  /(^|\s)(manage settings|manage cookies|cookie settings|manage preferences|privacy settings|preferences|customize|customise|more options|configure|view settings|settings)(\s|$)/i;

/**
 * Text regex for saving minimal preferences once modal opens
 */
export const SAVE_PREFERENCES_TEXT_REGEX =
  /(^|\s)(save settings|save preferences|confirm my choices|confirm choices|save & close|save and close|save & exit|save and exit|save selection|allow selection|accept selected|save choices)(\s|$)/i;

/**
 * Fallback dismiss button text regex
 */
export const DISMISS_TEXT_REGEX =
  /(^|\s)(dismiss|continue without accepting|close without accepting)(\s|$)/i;

/**
 * Ad-choice / third-party opt-out landing pages that should never be spawned from search engines
 */
export const AD_CHOICE_OPTOUT_REGEX =
  /^(https?:\/\/)?([a-z0-9.-]+\.)?(choice\.microsoft\.com|aboutads\.info|optout\.networkadvertising\.org|youronlinechoices\.com)/i;

/**
 * Known search engine patterns
 */
export const SEARCH_ENGINE_REGEX =
  /^(https?:\/\/)?([a-z0-9.-]+\.)?(duckduckgo\.com|google\.[a-z.]+|bing\.com|search\.brave\.com|ecosia\.org|startpage\.com|yahoo\.com)/i;

/**
 * Known search engine domains where general page links/buttons must NOT be treated as cookie banners
 */
export const SEARCH_ENGINE_HOSTNAMES: string[] = [
  'duckduckgo.com',
  'google.',
  'bing.com',
  'search.brave.com',
  'ecosia.org',
  'startpage.com',
  'yahoo.com',
  'baidu.com',
  'yandex.com',
];

/**
 * Validates whether a candidate clickable element is a legitimate consent button/trigger
 * rather than a general page link, ad choice notice, or external navigation element.
 */
export function isLegitimateConsentElement(el: HTMLElement): boolean {
  if (!el || typeof el.getAttribute !== 'function') return false;

  // 1. Must be currently visible
  if (el.offsetParent === null && el.style.display !== 'contents') {
    return false;
  }

  // 2. Reject navigation links: NEVER click <a> tags with real URLs
  const tagName = el.tagName.toLowerCase();
  if (tagName === 'a') {
    const href = (el.getAttribute('href') || '').trim();
    // Allow empty href, #, or javascript: (often used by modal triggers)
    if (href && !href.startsWith('#') && !href.toLowerCase().startsWith('javascript:')) {
      return false;
    }
  }

  // 3. Reject elements opening in new tabs
  if (el.getAttribute('target') === '_blank' || el.closest('[target="_blank"]')) {
    return false;
  }

  // 4. Exclude third-party ad choice / opt-out containers and search result ads
  const adChoiceParent = el.closest(
    '[id*="ad-choice" i], [class*="ad-choice" i], [id*="adchoice" i], [class*="adchoice" i], ' +
    '[class*="feedback" i], [class*="ad-feedback" i], .badge--ad, [data-testid*="ad" i], ' +
    '.results--ads, .js-ad-link, [aria-label*="advertisement" i]'
  );
  if (adChoiceParent) {
    return false;
  }

  // 5. If on a search engine, strictly enforce that the element must be inside an explicit CMP banner
  const currentHost = typeof window !== 'undefined' ? (window.location?.hostname || '') : '';
  const isSearchEngine = SEARCH_ENGINE_HOSTNAMES.some((se) => currentHost.includes(se));

  if (isSearchEngine) {
    const inCmp = el.closest(
      COOKIE_BANNER_SELECTORS.join(', ') +
      ', [id*="cookie-notice" i], [id*="consent-banner" i], [id*="cookie-banner" i], [class*="cookie-banner" i], #CXQnmb'
    );
    if (!inCmp) {
      return false;
    }
  }

  // 6. Check if element is within an active cookie banner container or dialog
  const inCookieContainer = el.closest(
    COOKIE_BANNER_SELECTORS.join(', ') +
    ', [role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog, ' +
    '[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], ' +
    '[id*="privacy-prompt" i], [class*="privacy-prompt" i], [id*="gdpr" i], [class*="gdpr" i]'
  );

  if (inCookieContainer) {
    const containerText = (inCookieContainer.textContent || '').toLowerCase();
    const hasConsentContext =
      containerText.includes('cookie') ||
      containerText.includes('consent') ||
      containerText.includes('gdpr') ||
      containerText.includes('tracking') ||
      containerText.includes('personal data') ||
      containerText.includes('privac');
    if (!hasConsentContext) {
      return false;
    }
    return true;
  }

  // 7. If not inside an explicit container, only allow if the element matches an explicit reject selector
  return REJECT_BUTTON_SELECTORS.some((sel) => {
    try {
      return el.matches(sel);
    } catch {
      return false;
    }
  });
}

/**
 * Injects CSS to suppress cookie banners and unlock scrolling immediately
 */
export function injectCookieBannerCSS(): void {
  const existing = document.getElementById('sentry-cookie-guard-css');
  if (existing) return;

  const style = document.createElement('style');
  style.id = 'sentry-cookie-guard-css';
  style.textContent = `
    ${COOKIE_BANNER_SELECTORS.join(',\n    ')} {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      z-index: -99999 !important;
      max-height: 0 !important;
      overflow: hidden !important;
    }
  `;

  const target = document.head || document.documentElement;
  if (target) {
    target.appendChild(style);
  }
}

/**
 * Restores document and body scrolling if modal added overflow hidden
 */
export function unlockPageScroll(): void {
  const restore = () => {
    if (document.body) {
      const computed = window.getComputedStyle(document.body);
      if (computed.overflow === 'hidden' || computed.overflowY === 'hidden') {
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.body.style.setProperty('overflow-y', 'auto', 'important');
      }
      document.body.classList.remove(
        'overflow-hidden',
        'modal-open',
        'cookie-lock',
        'onetrust-overflow',
        'didomi-popup-open'
      );
    }
    if (document.documentElement) {
      const computedHtml = window.getComputedStyle(document.documentElement);
      if (computedHtml.overflow === 'hidden' || computedHtml.overflowY === 'hidden') {
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
        document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      }
      document.documentElement.classList.remove(
        'overflow-hidden',
        'modal-open',
        'cookie-lock',
        'onetrust-overflow'
      );
    }
  };

  restore();
  setTimeout(restore, 500);
  setTimeout(restore, 1500);
}

/**
 * Searches and triggers rejection buttons on any visible banner
 */
export function autoClickRejectButtons(): boolean {
  // 1. Selector match
  for (const sel of REJECT_BUTTON_SELECTORS) {
    try {
      const btn = document.querySelector<HTMLElement>(sel);
      if (btn && btn.offsetParent !== null && isLegitimateConsentElement(btn)) {
        btn.click();
        return true;
      }
    } catch {
      // Ignore
    }
  }

  // 2. Scan buttons/links for rejection text within banner containers
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, a[role="button"], a, input[type="button"]'));
  for (const btn of buttons) {
    if (!isLegitimateConsentElement(btn)) continue;
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
    if (text && REJECT_TEXT_REGEX.test(text)) {
      btn.click();
      return true;
    }
  }

  // 3. Scan for dismiss text
  for (const btn of buttons) {
    if (!isLegitimateConsentElement(btn)) continue;
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
    if (text && DISMISS_TEXT_REGEX.test(text)) {
      btn.click();
      return true;
    }
  }

  return false;
}

/**
 * Searches for a "Manage settings" / "Preferences" button on the active banner
 */
export function findManageSettingsButton(): HTMLElement | null {
  for (const sel of MANAGE_SETTINGS_BUTTON_SELECTORS) {
    try {
      const btn = document.querySelector<HTMLElement>(sel);
      if (btn && btn.offsetParent !== null && isLegitimateConsentElement(btn)) {
        return btn;
      }
    } catch {}
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('button, a[role="button"], a, input[type="button"]')
  );
  for (const el of candidates) {
    if (!isLegitimateConsentElement(el)) continue;
    const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
    if (text && MANAGE_SETTINGS_TEXT_REGEX.test(text)) {
      // Avoid false positive matching 'Accept all'
      if (!/accept/i.test(text)) {
        return el;
      }
    }
  }
  return null;
}

/**
 * Searches for a "Save settings" / "Confirm choices" button inside a preferences modal
 */
export function findSavePreferencesButton(): HTMLElement | null {
  for (const sel of SAVE_PREFERENCES_BUTTON_SELECTORS) {
    try {
      const btn = document.querySelector<HTMLElement>(sel);
      if (btn && btn.offsetParent !== null && isLegitimateConsentElement(btn)) {
        return btn;
      }
    } catch {}
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>('button, a[role="button"], a, input[type="button"]')
  );
  for (const el of candidates) {
    if (!isLegitimateConsentElement(el)) continue;
    const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
    if (text && SAVE_PREFERENCES_TEXT_REGEX.test(text)) {
      return el;
    }
  }
  return null;
}

/**
 * Disables non-essential tracking checkboxes inside preferences modals
 */
export function uncheckNonEssentialCheckboxes(): void {
  try {
    const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    for (const cb of checkboxes) {
      const label = (cb.name || cb.id || cb.getAttribute('aria-label') || '').toLowerCase();
      if (!label.includes('essential') && !label.includes('necessary') && !cb.disabled) {
        if (cb.checked) {
          cb.click();
        }
      }
    }
  } catch {}
}

/**
 * Sets universal simulated consent cookies to prevent banners on subsequent visits
 */
export function setUniversalConsentCookies(): void {
  try {
    const expires = 'max-age=31536000; path=/; SameSite=Lax';
    const stubs = [
      'OptanonAlertBoxClosed=true',
      'cookieconsent_status=dismiss',
      'cookie_consent=essential',
      'gdpr_consent=0',
      'notice_gdpr_prefs=0',
    ];
    for (const stub of stubs) {
      document.cookie = `${stub}; ${expires}`;
    }
  } catch {
    // Some domains may restrict cookie writes
  }
}

/**
 * Executes full Cookie Consent Guard flow with fallback to "Manage settings -> Reject/Save"
 */
export function handleCookieConsentGuard(
  settings: CookieConsentSettings,
  domain: string,
  onHandled?: (detail: string) => void
): void {
  if (!settings.enabled) return;

  if (settings.hideBanners) {
    injectCookieBannerCSS();
  }

  if (settings.autoUnlockScroll) {
    unlockPageScroll();
  }

  let isHandled = false;

  // Run auto-clicker with fallback to Manage Settings modal expansion
  const attemptHandle = () => {
    if (isHandled) return;

    // Phase 1: Try direct rejection button
    const directClicked = autoClickRejectButtons();
    if (directClicked) {
      isHandled = true;
      unlockPageScroll();
      setUniversalConsentCookies();
      if (onHandled) {
        onHandled(`Auto-rejected cookie tracking dialog on ${domain}`);
      }
      return;
    }

    // Phase 2: If no direct reject button, click "Manage settings" / "Preferences"
    const manageBtn = findManageSettingsButton();
    if (manageBtn) {
      manageBtn.click();

      // After modal expands, find Reject or Save Minimal Preferences
      setTimeout(() => {
        const subReject = autoClickRejectButtons();
        if (subReject) {
          isHandled = true;
          unlockPageScroll();
          setUniversalConsentCookies();
          if (onHandled) {
            onHandled(`Auto-rejected cookie tracking via Manage Settings on ${domain}`);
          }
          return;
        }

        // Uncheck non-essential tracking categories
        uncheckNonEssentialCheckboxes();

        const saveBtn = findSavePreferencesButton();
        if (saveBtn) {
          saveBtn.click();
          isHandled = true;
          unlockPageScroll();
          setUniversalConsentCookies();
          if (onHandled) {
            onHandled(`Saved minimal non-tracking preferences on ${domain}`);
          }
        }
      }, 350);
    }
  };

  attemptHandle();
  setTimeout(attemptHandle, 600);
  setTimeout(attemptHandle, 1800);
  setTimeout(attemptHandle, 3200);
}
