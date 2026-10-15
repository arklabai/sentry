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
  '[aria-label*="cookie consent" i]',
  '[aria-label*="cookie banner" i]',
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
  'button[id*="reject" i]',
  'button[class*="reject" i]',
  'button[aria-label*="reject" i]',
  'button[id*="decline" i]',
  'button[class*="decline" i]',
  'button[aria-label*="decline" i]',
  'button[data-testid*="reject" i]',
];

/**
 * Text regex for buttons that reject or limit tracking
 */
export const REJECT_TEXT_REGEX =
  /(^|\s)(reject all|decline all|reject non-essential|only necessary|essential only|strictly necessary|refuse all|decline|disagree|deny all)(\s|$)/i;

/**
 * Fallback dismiss button text regex
 */
export const DISMISS_TEXT_REGEX =
  /(^|\s)(dismiss|continue without accepting|close without accepting|opt out)(\s|$)/i;

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
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    } catch {
      // Ignore
    }
  }

  // 2. Scan buttons/links for rejection text within banner containers
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, a[role="button"], input[type="button"]'));
  for (const btn of buttons) {
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
    if (text && REJECT_TEXT_REGEX.test(text)) {
      btn.click();
      return true;
    }
  }

  // 3. Scan for dismiss text
  for (const btn of buttons) {
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim();
    if (text && DISMISS_TEXT_REGEX.test(text)) {
      btn.click();
      return true;
    }
  }

  return false;
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
 * Executes full Cookie Consent Guard flow
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

  // Run auto-clicker in stages (at start, and after delay for async loaded CMPs)
  const attemptReject = () => {
    const clicked = autoClickRejectButtons();
    if (clicked) {
      unlockPageScroll();
      setUniversalConsentCookies();
      if (onHandled) {
        onHandled(`Auto-rejected cookie tracking dialog on ${domain}`);
      }
    }
  };

  attemptReject();
  setTimeout(attemptReject, 600);
  setTimeout(attemptReject, 1800);
}
