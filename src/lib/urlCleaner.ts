/**
 * Sentry AI URL Cleaner & Tracking Parameter Purifier
 * Inspired by ClearURLs - cleans surveillance parameters, referral tags,
 * unmasks wrapper redirects, and eliminates hyperlink auditing tracking.
 */

import type { CleanUrlResult, UrlCleanerSettings } from '../types/index.ts';

export const DEFAULT_URL_CLEANER_SETTINGS: UrlCleanerSettings = {
  enabled: true,
  stripMarketingParams: true,
  stripReferralTokens: true,
  blockHyperlinkPings: true,
  unwrapRedirects: true,
  sanitizeHistoryApi: true,
  bypassSearchRedirection: true,
};

/**
 * Universal marketing and analytics query parameters
 */
export const UNIVERSAL_TRACKING_PARAMS: readonly string[] = [
  // Google / Adobe / Core Analytics
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_cid',
  'utm_reader',
  'utm_viz_id',
  'utm_pubreferrer',
  'utm_swu',
  'ga_source',
  'ga_medium',
  'ga_term',
  'ga_content',
  'ga_campaign',
  'ga_place',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'hsCtaTracking',
  '_openstat',
  'wickedid',
  'wt_mc',
  'wt_zmc',
  'dclid',
  's_kwcid',
  'sc_campaign',
  'sc_channel',
  'sc_content',
  'sc_medium',
  'sc_outcome',
  'sc_geo',
  'sc_country',

  // Social & Ad Click Tracking Identifiers
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'yclid',
  'twclid',
  'ttclid',
  'li_fat_id',
  'mc_eid',
  'mc_cid',
  'igshid',
  'fref',
  'ref_src',
  'ref_url',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'share_id',
  'trk',
  'trkCampaign',

  // Email / CRM Tracking
  'vero_id',
  'vero_conv',
  'mkt_tok',
  'curator_token',
  'ck_subscriber_id',
  'klaviyo_id',
  '_kx',
  'oly_enc_id',
  'oly_anon_id',
];

/**
 * Domain-specific tracking tokens & referral parameters
 */
export const DOMAIN_TRACKING_PARAMS: Record<string, string[]> = {
  amazon: [
    'ref',
    'ref_',
    'tag',
    'linkCode',
    'camp',
    'creative',
    'pf_rd_r',
    'pf_rd_m',
    'pf_rd_t',
    'pf_rd_i',
    'pf_rd_p',
    'pf_rd_s',
    'pd_rd_r',
    'pd_rd_w',
    'pd_rd_wg',
    'pd_rd_i',
    'qid',
    'sr',
    'keywords',
    'crid',
    'sprefix',
    'dib',
    'dib_tag',
  ],
  youtube: ['si', 'feature', 'pp', 'kw'],
  twitter: ['s', 't', 'ref_src', 'ref_url'],
  x: ['s', 't', 'ref_src', 'ref_url'],
  tiktok: ['_r', '_t', 'checksum', 'sec_uid', 'is_copy_url', 'is_from_webapp'],
  aliexpress: ['spm', 'scm', 'pvid', 'aff_platform', 'aff_trace_key', 'algo_pvid', 'algo_expid'],
  ebay: ['_trksid', '_from', 'amdata', 'hash', 'var'],
  medium: ['source', 'publication_id', 'post_id'],
  substack: ['utm_source', 'utm_medium', 'r', 'publication_id'],
  yandex: ['lr', 'clid', 'text'],
};

/**
 * Common wrapper redirect query parameter keys
 */
export const REDIRECT_WRAPPER_PARAMS: readonly string[] = [
  'url',
  'u',
  'q',
  'dest',
  'destination',
  'target',
  'redirect_to',
  'link',
  'r',
  'redirect_url',
  'target_url',
  'out',
];

/**
 * Unwraps known redirection wrappers (e.g. google.com/url?q=..., facebook.com/l.php?u=...)
 */
export function unwrapRedirectUrl(urlStr: string): { url: string; unwrapped: boolean } {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    // 1. Google search click redirection
    if (host.includes('google.') && parsed.pathname === '/url') {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target && target.startsWith('http')) {
        return { url: decodeURIComponent(target), unwrapped: true };
      }
    }

    // 2. Facebook external link redirection
    if (host.includes('facebook.com') && (parsed.pathname === '/l.php' || parsed.pathname === '/flx/l.php')) {
      const target = parsed.searchParams.get('u');
      if (target && target.startsWith('http')) {
        return { url: decodeURIComponent(target), unwrapped: true };
      }
    }

    // 3. YouTube link redirection
    if (host.includes('youtube.com') && parsed.pathname === '/redirect') {
      const target = parsed.searchParams.get('q');
      if (target && target.startsWith('http')) {
        return { url: decodeURIComponent(target), unwrapped: true };
      }
    }

    // 4. Generic wrapper query parameters
    for (const param of REDIRECT_WRAPPER_PARAMS) {
      const val = parsed.searchParams.get(param);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        return { url: decodeURIComponent(val), unwrapped: true };
      }
    }
  } catch {
    // Malformed URL, return unchanged
  }

  return { url: urlStr, unwrapped: false };
}

/**
 * Cleans Amazon product URLs path formatting (e.g. removes /ref=sr_1_1...)
 */
function cleanAmazonPath(parsed: URL): boolean {
  if (!parsed.hostname.includes('amazon.')) return false;

  const refMatch = parsed.pathname.match(/(\/dp\/[A-Z0-9]+|\/gp\/product\/[A-Z0-9]+)\/ref=[^/]+/i);
  if (refMatch && refMatch[1]) {
    parsed.pathname = refMatch[1];
    return true;
  }
  return false;
}

/**
 * Strips tracking parameters and unmasks wrappers from a single URL
 */
export function cleanUrl(
  rawUrl: string,
  options: Partial<UrlCleanerSettings> = DEFAULT_URL_CLEANER_SETTINGS
): CleanUrlResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      originalUrl: rawUrl,
      cleanedUrl: rawUrl,
      hasChanged: false,
      strippedParams: [],
    };
  }

  const opts = { ...DEFAULT_URL_CLEANER_SETTINGS, ...options };
  if (!opts.enabled) {
    return {
      originalUrl: rawUrl,
      cleanedUrl: rawUrl,
      hasChanged: false,
      strippedParams: [],
    };
  }

  let workUrl = trimmed;
  let redirectUnwrapped = false;

  // 1. Unwrap redirects if enabled
  if (opts.unwrapRedirects) {
    const unwrapRes = unwrapRedirectUrl(workUrl);
    if (unwrapRes.unwrapped) {
      workUrl = unwrapRes.url;
      redirectUnwrapped = true;
    }
  }

  // Normalize duplicate '?' in query strings to '&'
  const firstQ = workUrl.indexOf('?');
  if (firstQ !== -1 && workUrl.indexOf('?', firstQ + 1) !== -1) {
    const base = workUrl.slice(0, firstQ + 1);
    const query = workUrl.slice(firstQ + 1).replace(/\?/g, '&');
    workUrl = base + query;
  }

  try {
    const parsed = new URL(workUrl);
    const strippedParams: string[] = [];

    // 2. Clean Amazon path ref if present
    if (opts.stripReferralTokens) {
      if (cleanAmazonPath(parsed)) {
        strippedParams.push('amazon_ref_path');
      }
    }

    // 3. Identify domain-specific keys
    const host = parsed.hostname.toLowerCase();
    const domainSpecificKeys: string[] = [];
    for (const [key, params] of Object.entries(DOMAIN_TRACKING_PARAMS)) {
      if (host.includes(key)) {
        domainSpecificKeys.push(...params);
      }
    }

    // 4. Strip matching search params
    const allSearchKeys = Array.from(parsed.searchParams.keys());
    for (const key of allSearchKeys) {
      const lowerKey = key.toLowerCase();

      let shouldStrip = false;

      // Universal marketing / click IDs
      if (opts.stripMarketingParams && UNIVERSAL_TRACKING_PARAMS.includes(lowerKey)) {
        shouldStrip = true;
      }
      // Pattern match for prefix (e.g. utm_*, ga_*)
      else if (
        opts.stripMarketingParams &&
        (lowerKey.startsWith('utm_') || lowerKey.startsWith('ga_'))
      ) {
        shouldStrip = true;
      }
      // Referral & platform-specific tokens
      else if (opts.stripReferralTokens && domainSpecificKeys.includes(lowerKey)) {
        shouldStrip = true;
      }

      if (shouldStrip) {
        parsed.searchParams.delete(key);
        strippedParams.push(key);
      }
    }

    // 5. Clean tracking fragments (#xtor=..., #utm_...)
    if (parsed.hash) {
      const hash = parsed.hash;
      if (
        hash.includes('xtor=') ||
        hash.includes('utm_') ||
        hash.includes('fbclid=')
      ) {
        parsed.hash = '';
        strippedParams.push('hash_tracker');
      }
    }

    const cleanedUrl = parsed.toString();
    const hasChanged = redirectUnwrapped || cleanedUrl !== trimmed;

    return {
      originalUrl: rawUrl,
      cleanedUrl,
      hasChanged,
      strippedParams,
      redirectUnwrapped,
    };
  } catch {
    // If input isn't a full valid URL, return unchanged
    return {
      originalUrl: rawUrl,
      cleanedUrl: rawUrl,
      hasChanged: false,
      strippedParams: [],
    };
  }
}

/**
 * Cleans multiple URLs line-by-line
 */
export function cleanUrls(
  input: string | string[],
  options?: Partial<UrlCleanerSettings>
): CleanUrlResult[] {
  const lines = Array.isArray(input) ? input : input.split('\n');
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((url) => cleanUrl(url, options));
}
