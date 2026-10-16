import { normalizeDomain } from '../src/lib/zapManager.ts';
import {
  COOKIE_BANNER_SELECTORS,
  REJECT_BUTTON_SELECTORS,
  REJECT_TEXT_REGEX,
  DISMISS_TEXT_REGEX,
} from '../src/lib/cookieGuard.ts';

console.log('--- Sentry AI Persistent Zap & Cookie Guard Test Suite ---\n');

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    if (details) console.error(`       Details: ${details}`);
    failed++;
  }
}

// 1. Domain Normalization Tests
assert(normalizeDomain('Example.COM') === 'example.com', 'Normalizes uppercase domain');
assert(normalizeDomain('SUB.Domain.org:8080') === 'sub.domain.org', 'Strips port from domain');
assert(normalizeDomain('  shop.site.co.uk  ') === 'shop.site.co.uk', 'Trims whitespace');

// 2. Cookie Consent Banner Selectors Tests
assert(COOKIE_BANNER_SELECTORS.includes('#onetrust-consent-sdk'), 'Covers OneTrust consent banner');
assert(COOKIE_BANNER_SELECTORS.includes('#CybotCookiebotDialog'), 'Covers Cookiebot dialog');
assert(COOKIE_BANNER_SELECTORS.includes('#didomi-host'), 'Covers Didomi CMP container');
assert(COOKIE_BANNER_SELECTORS.includes('.cmplz-cookiebanner'), 'Covers Complianz banner');
assert(COOKIE_BANNER_SELECTORS.includes('.qc-cmp2-container'), 'Covers Quantcast Choice CMP2');
assert(COOKIE_BANNER_SELECTORS.includes('#trustarc-banner'), 'Covers TrustArc banner');
assert(COOKIE_BANNER_SELECTORS.length >= 15, `Contains comprehensive selector list (${COOKIE_BANNER_SELECTORS.length} selectors)`);

// 3. Reject Button Selectors Tests
assert(REJECT_BUTTON_SELECTORS.includes('#onetrust-reject-all-handler'), 'Contains OneTrust direct reject handler');
assert(REJECT_BUTTON_SELECTORS.includes('#CybotCookiebotDialogBodyButtonDecline'), 'Contains Cookiebot decline handler');
assert(REJECT_BUTTON_SELECTORS.includes('.cmplz-deny'), 'Contains Complianz deny handler');

// 4. Reject Text Pattern Matching Tests
const validRejectTexts = [
  'Reject All',
  'reject all',
  'Reject Non-Essential',
  'Decline All',
  'decline',
  'Only Necessary',
  'Essential Only',
  'Strictly Necessary',
  'Refuse all',
  'Disagree',
  'Deny All',
];

for (const text of validRejectTexts) {
  assert(REJECT_TEXT_REGEX.test(text), `Correctly identifies reject text: "${text}"`);
}

// Ensure it does NOT match acceptance text
const acceptanceTexts = [
  'Accept All',
  'Accept all cookies',
  'Allow all',
  'I agree',
  'Agree and continue',
  'OK',
];

for (const text of acceptanceTexts) {
  assert(!REJECT_TEXT_REGEX.test(text), `Rejects false positive acceptance text: "${text}"`);
}

// 5. Dismiss Text Pattern Matching Tests
assert(DISMISS_TEXT_REGEX.test('Dismiss'), 'Matches "Dismiss"');
assert(DISMISS_TEXT_REGEX.test('Continue without accepting'), 'Matches "Continue without accepting"');
assert(DISMISS_TEXT_REGEX.test('Close without accepting'), 'Matches "Close without accepting"');
assert(!DISMISS_TEXT_REGEX.test('Opt out'), 'Safely rejects loose "Opt out" link text to prevent stray clicks');

// 6. Manage Settings & Modal Preferences Tests
import {
  MANAGE_SETTINGS_TEXT_REGEX,
  SAVE_PREFERENCES_TEXT_REGEX,
  MANAGE_SETTINGS_BUTTON_SELECTORS,
  isLegitimateConsentElement,
  SEARCH_ENGINE_HOSTNAMES,
  AD_CHOICE_OPTOUT_REGEX,
  SEARCH_ENGINE_REGEX,
} from '../src/lib/cookieGuard.ts';

assert(MANAGE_SETTINGS_TEXT_REGEX.test('Manage settings'), 'Matches "Manage settings"');
assert(MANAGE_SETTINGS_TEXT_REGEX.test('manage cookies'), 'Matches "manage cookies"');
assert(MANAGE_SETTINGS_TEXT_REGEX.test('Cookie Preferences'), 'Matches "Cookie Preferences"');
assert(MANAGE_SETTINGS_TEXT_REGEX.test('Customize'), 'Matches "Customize"');
assert(!MANAGE_SETTINGS_TEXT_REGEX.test('Accept all'), 'Rejects false positive for "Accept all"');

assert(SAVE_PREFERENCES_TEXT_REGEX.test('Save settings'), 'Matches "Save settings"');
assert(SAVE_PREFERENCES_TEXT_REGEX.test('Confirm my choices'), 'Matches "Confirm my choices"');
assert(SAVE_PREFERENCES_TEXT_REGEX.test('Save & exit'), 'Matches "Save & exit"');

assert(MANAGE_SETTINGS_BUTTON_SELECTORS.includes('#onetrust-pc-btn-handler'), 'Covers OneTrust preference button');
assert(MANAGE_SETTINGS_BUTTON_SELECTORS.includes('#CybotCookiebotDialogBodyButtonDetails'), 'Covers Cookiebot details button');

// 7. Legitimate Consent Element Verification (Prevents DuckDuckGo / ad choice opt-out false positives)
const mockRealLink = {
  tagName: 'A',
  offsetParent: {},
  style: {},
  getAttribute: (attr) => (attr === 'href' ? 'https://choice.microsoft.com/opt-out' : null),
  closest: () => null,
  matches: () => false,
};
assert(!isLegitimateConsentElement(mockRealLink), 'Rejects <a> navigation link with destination href');

const mockTargetBlankLink = {
  tagName: 'A',
  offsetParent: {},
  style: {},
  getAttribute: (attr) => (attr === 'target' ? '_blank' : '#'),
  closest: () => null,
  matches: () => false,
};
assert(!isLegitimateConsentElement(mockTargetBlankLink), 'Rejects element with target="_blank"');

const mockAdChoiceElement = {
  tagName: 'BUTTON',
  offsetParent: {},
  style: {},
  getAttribute: () => null,
  closest: (sel) => (sel.includes('ad-choice') ? {} : null),
  matches: () => false,
};
assert(!isLegitimateConsentElement(mockAdChoiceElement), 'Rejects button inside ad-choice feedback container');

const mockValidBannerBtn = {
  tagName: 'BUTTON',
  offsetParent: {},
  style: {},
  getAttribute: () => null,
  closest: (sel) => (sel.includes('#onetrust') ? { textContent: 'This website uses cookies' } : null),
  matches: (sel) => sel.includes('onetrust-reject'),
};
assert(isLegitimateConsentElement(mockValidBannerBtn), 'Accepts legitimate button inside cookie banner dialog');

// 8. Regex tests for search engine detection & opt-out landing pages
assert(AD_CHOICE_OPTOUT_REGEX.test('https://choice.microsoft.com/en-us/opt-out'), 'Matches Microsoft ad choice opt-out');
assert(AD_CHOICE_OPTOUT_REGEX.test('https://optout.aboutads.info/?c=2'), 'Matches aboutads.info opt-out');
assert(AD_CHOICE_OPTOUT_REGEX.test('https://optout.networkadvertising.org/'), 'Matches NAI optout URL');
assert(!AD_CHOICE_OPTOUT_REGEX.test('https://duckduckgo.com/?q=privacy'), 'Does not match normal DuckDuckGo search');

assert(SEARCH_ENGINE_REGEX.test('https://duckduckgo.com/?q=sentry+ai'), 'Identifies DuckDuckGo search');
assert(SEARCH_ENGINE_REGEX.test('https://www.google.com/search?q=test'), 'Identifies Google search');
assert(SEARCH_ENGINE_REGEX.test('https://www.bing.com/search?q=test'), 'Identifies Bing search');
assert(SEARCH_ENGINE_HOSTNAMES.includes('duckduckgo.com'), 'DuckDuckGo is protected search engine hostname');

console.log(`\nPersistent Zap & Cookie Guard Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
}
