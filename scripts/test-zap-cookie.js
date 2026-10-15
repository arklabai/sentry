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
assert(DISMISS_TEXT_REGEX.test('Opt out'), 'Matches "Opt out"');

console.log(`\nPersistent Zap & Cookie Guard Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
}
