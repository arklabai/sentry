/**
 * Sentry AI Persistent Zap Rule Manager
 * Generates robust, optimal CSS selectors for zapped elements and
 * manages domain-scoped cosmetic filters stored permanently in chrome.storage.local.
 */

import type { ZapRule } from '../types/index.ts';

export const ZAP_STORAGE_KEY = 'sentry_zap_rules';

/**
 * Generates a clean, robust CSS selector for an HTMLElement.
 * Prioritizes stable IDs, unique attributes, and semantic class names.
 */
export function generateOptimalSelector(el: HTMLElement): string {
  if (!el || el === document.body || el === document.documentElement) {
    return 'body';
  }

  const tagName = el.tagName.toLowerCase();

  // 1. Try clean ID (ignore obviously dynamic or framework IDs)
  if (el.id && typeof el.id === 'string') {
    const trimmedId = el.id.trim();
    const isDynamic =
      /^[0-9a-f-]{10,}$/i.test(trimmedId) ||
      /^ember\d+$/i.test(trimmedId) ||
      /^react-aria\d+$/i.test(trimmedId) ||
      /^[\d_]+$/.test(trimmedId) ||
      trimmedId.includes(':');

    if (!isDynamic) {
      try {
        const escaped = CSS.escape(trimmedId);
        if (document.querySelectorAll(`#${escaped}`).length === 1) {
          return `#${escaped}`;
        }
      } catch {
        // Fall back if escape fails
      }
    }
  }

  // 2. Try unique identifying attributes (common in ad tech, widgets, banners)
  const candidateAttrs = [
    'data-ad-id',
    'data-ad-unit',
    'data-ad-slot',
    'data-slot',
    'data-testid',
    'data-test-id',
    'data-cy',
    'aria-label',
    'name',
    'role',
  ];

  for (const attr of candidateAttrs) {
    const val = el.getAttribute(attr);
    if (val && val.length < 50 && !val.includes('"')) {
      const selector = `${tagName}[${attr}="${val}"]`;
      try {
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      } catch {
        // Continue
      }
    }
  }

  // 3. Try semantic class combinations (filtering out generic utility classes)
  if (el.classList && el.classList.length > 0) {
    const rawClasses = Array.from(el.classList);
    const utilityRegex = /^(p|m|px|py|pt|pb|pl|pr|w|h|min-w|max-w|flex|grid|block|inline|relative|absolute|fixed|text|bg|border|items|justify|gap|col|row)-/i;
    const hashRegex = /^[a-z0-9_-]{12,}$/i;

    const semanticClasses = rawClasses.filter(
      (c) =>
        !utilityRegex.test(c) &&
        !hashRegex.test(c) &&
        c.length > 2 &&
        c.length < 40 &&
        !c.includes(':')
    );

    if (semanticClasses.length > 0) {
      // Try single most specific class
      for (const cls of semanticClasses) {
        try {
          const escaped = CSS.escape(cls);
          const sel = `${tagName}.${escaped}`;
          if (document.querySelectorAll(sel).length === 1) {
            return sel;
          }
        } catch {
          // Continue
        }
      }

      // Try combination of first two semantic classes
      try {
        const classSelector = `${tagName}.${semanticClasses.slice(0, 2).map((c) => CSS.escape(c)).join('.')}`;
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      } catch {
        // Continue
      }
    }
  }

  // 4. Build hierarchical path with parent (up to 3 levels)
  let current: HTMLElement | null = el;
  const path: string[] = [];

  while (current && current !== document.body && current !== document.documentElement && path.length < 3) {
    let segment = current.tagName.toLowerCase();

    if (current.id && !/^[0-9a-f-]{10,}$/i.test(current.id)) {
      try {
        segment += `#${CSS.escape(current.id)}`;
        path.unshift(segment);
        break; // ID anchors the path
      } catch {
        // Fall back
      }
    }

    // Add nth-of-type if siblings exist
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current?.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        segment += `:nth-of-type(${index})`;
      }
    }

    path.unshift(segment);
    current = current.parentElement;
  }

  const generatedPath = path.join(' > ');
  return generatedPath || tagName;
}

/**
 * Normalizes host to domain key (stripping port if present)
 */
export function normalizeDomain(rawDomain: string): string {
  return rawDomain.toLowerCase().replace(/:\d+$/, '').trim();
}

/**
 * Retrieves all stored zap rules map from chrome.storage.local.
 */
export async function getAllZapRules(): Promise<Record<string, ZapRule[]>> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return {};
  }
  return new Promise((resolve) => {
    chrome.storage.local.get([ZAP_STORAGE_KEY], (res) => {
      resolve(res[ZAP_STORAGE_KEY] || {});
    });
  });
}

/**
 * Retrieves zap rules matching a specific domain (and apex domain).
 */
export async function getDomainZapRules(domain: string): Promise<ZapRule[]> {
  const norm = normalizeDomain(domain);
  const allRules = await getAllZapRules();

  const matched: ZapRule[] = [];
  const seenIds = new Set<string>();

  // Check exact domain
  if (allRules[norm]) {
    for (const r of allRules[norm]) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        matched.push(r);
      }
    }
  }

  // Check apex domain (e.g., example.com for sub.example.com)
  const parts = norm.split('.');
  if (parts.length > 2) {
    const apex = parts.slice(-2).join('.');
    if (allRules[apex]) {
      for (const r of allRules[apex]) {
        if (!seenIds.has(r.id)) {
          seenIds.add(r.id);
          matched.push(r);
        }
      }
    }
  }

  return matched;
}

/**
 * Saves a new zap rule for a domain to persistent storage.
 */
export async function savePersistentZapRule(
  domain: string,
  selector: string,
  description?: string
): Promise<ZapRule> {
  const norm = normalizeDomain(domain);
  const allRules = await getAllZapRules();

  if (!allRules[norm]) {
    allRules[norm] = [];
  }

  // Avoid duplicate selector for same domain
  const existing = allRules[norm].find((r) => r.selector === selector);
  if (existing) {
    return existing;
  }

  const newRule: ZapRule = {
    id: `zap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    domain: norm,
    selector,
    description: description || `Zapped <${selector}>`,
    createdAt: Date.now(),
  };

  allRules[norm].push(newRule);

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [ZAP_STORAGE_KEY]: allRules });
  }

  return newRule;
}

/**
 * Deletes a zap rule by id for a domain.
 */
export async function deletePersistentZapRule(domain: string, ruleId: string): Promise<ZapRule[]> {
  const norm = normalizeDomain(domain);
  const allRules = await getAllZapRules();

  if (allRules[norm]) {
    allRules[norm] = allRules[norm].filter((r) => r.id !== ruleId);
    if (allRules[norm].length === 0) {
      delete allRules[norm];
    }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [ZAP_STORAGE_KEY]: allRules });
    }
  }

  return allRules[norm] || [];
}

/**
 * Clears all zap rules for a domain.
 */
export async function clearDomainZapRules(domain: string): Promise<void> {
  const norm = normalizeDomain(domain);
  const allRules = await getAllZapRules();

  if (allRules[norm]) {
    delete allRules[norm];
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [ZAP_STORAGE_KEY]: allRules });
    }
  }
}
