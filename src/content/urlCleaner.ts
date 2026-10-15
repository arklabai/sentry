/**
 * Sentry AI In-Page URL & Link Guard (Runs in MAIN world)
 * 1. Hyperlink Auditing (Ping) Eliminator — purges <a ping> attributes across DOM.
 * 2. Search Redirection Bypass — disables Google & Yandex rwt click-hijacking.
 * 3. History API Protection — intercepts pushState/replaceState to prevent tracker re-injection.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if ((window as unknown as { __sentry_url_cleaner_active?: boolean }).__sentry_url_cleaner_active) {
    return;
  }
  (window as unknown as { __sentry_url_cleaner_active?: boolean }).__sentry_url_cleaner_active = true;

  // 1. Google & Yandex Search Link Defenses
  function neutralizeSearchTracking() {
    try {
      // Prevent Google from defining the 'rwt' link-rewriting hook
      Object.defineProperty(window, 'rwt', {
        configurable: false,
        writable: false,
        value: function () {
          return true;
        },
      });
    } catch {
      // Ignored if already non-configurable
    }

    // Inspect hovered and clicked links to unmask redirects and remove tracking attributes
    const cleanAnchor = (target: EventTarget | null) => {
      let el = target as HTMLElement | null;
      let depth = 3;
      while (el && el.tagName !== 'A' && depth-- > 0) {
        el = el.parentElement;
      }
      if (el && el.tagName === 'A') {
        const a = el as HTMLAnchorElement;

        // Strip Google tracking dataset
        if (a.hasAttribute('data-cthref')) {
          a.removeAttribute('data-cthref');
        }

        // Strip Hyperlink Auditing ping attribute
        if (a.hasAttribute('ping')) {
          a.removeAttribute('ping');
        }

        // Unmask search redirect hrefs
        if (a.href) {
          const href = a.href;
          if (href.includes('/url?q=') || href.includes('/url?url=')) {
            try {
              const parsed = new URL(href);
              const targetUrl = parsed.searchParams.get('q') || parsed.searchParams.get('url');
              if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
                a.href = decodeURIComponent(targetUrl);
              }
            } catch {
              // Ignore malformed URL
            }
          }
        }
      }
    };

    document.addEventListener('mouseover', (e) => cleanAnchor(e.target), true);
    document.addEventListener('mousedown', (e) => cleanAnchor(e.target), true);
    document.addEventListener('click', (e) => cleanAnchor(e.target), true);
  }

  // 2. Hyperlink Auditing (Ping) Eliminator via DOM & MutationObserver
  function purgePingAttributes() {
    const sweep = (root: ParentNode = document) => {
      try {
        const pingLinks = root.querySelectorAll('a[ping]');
        pingLinks.forEach((link) => {
          link.removeAttribute('ping');
        });
      } catch {
        // Document may not be ready
      }
    };

    // Immediate initial sweep
    sweep();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => sweep(), { once: true });
    }

    // Continuous observation of dynamic DOM additions
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          if (mut.type === 'childList') {
            for (let i = 0; i < mut.addedNodes.length; i++) {
              const node = mut.addedNodes[i];
              if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as Element;
                if (el.tagName === 'A' && el.hasAttribute('ping')) {
                  el.removeAttribute('ping');
                }
                const subPings = el.querySelectorAll?.('a[ping]');
                subPings?.forEach((l) => l.removeAttribute('ping'));
              }
            }
          } else if (mut.type === 'attributes' && mut.attributeName === 'ping') {
            const target = mut.target as Element;
            if (target.hasAttribute('ping')) {
              target.removeAttribute('ping');
            }
          }
        }
      });

      const root = document.documentElement || document;
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['ping', 'data-cthref'],
      });
    }
  }

  // 3. History API Tracker Injection Shield
  // Prevents SPAs and analytics scripts from re-injecting utm_*, fbclid, etc. into window.location
  function shieldHistoryApi() {
    const TRACKER_REGEX = /([?&])(utm_[^&=]+|fbclid|gclid|msclkid|yclid|mc_eid|igshid|_ga|_gl)=[^&#]*/gi;

    const sanitizeUrl = (raw: string | URL | null | undefined): string | URL | null | undefined => {
      if (!raw || typeof raw !== 'string') return raw;
      if (!TRACKER_REGEX.test(raw)) return raw;

      let cleaned = raw.replace(TRACKER_REGEX, '$1');
      // Clean up consecutive or trailing ? and &
      cleaned = cleaned.replace(/\?&+/g, '?').replace(/&&+/g, '&').replace(/[?&]$/, '');
      return cleaned;
    };

    try {
      const origPushState = history.pushState;
      history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
        return origPushState.call(this, data, unused, sanitizeUrl(url));
      };

      const origReplaceState = history.replaceState;
      history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
        return origReplaceState.call(this, data, unused, sanitizeUrl(url));
      };
    } catch {
      // Ignored if history object is sealed
    }
  }

  // Initialize all defenses
  neutralizeSearchTracking();
  purgePingAttributes();
  shieldHistoryApi();
})();
