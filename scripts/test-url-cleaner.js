import { cleanUrl, cleanUrls, UNIVERSAL_TRACKING_PARAMS, DOMAIN_TRACKING_PARAMS } from '../src/lib/urlCleaner.ts';

console.log('--- Sentry AI URL Cleaner Unit Test Suite ---\n');

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

// Test 1: UTM Parameters Stripping
const utmTest = cleanUrl('https://example.com/product?utm_source=twitter&utm_medium=cpc&utm_campaign=summer_sale&utm_term=shoes&utm_content=v1&keep_me=123');
assert(utmTest.hasChanged, 'UTM test detects changes');
assert(!utmTest.cleanedUrl.includes('utm_source'), 'Stripped utm_source');
assert(!utmTest.cleanedUrl.includes('utm_medium'), 'Stripped utm_medium');
assert(!utmTest.cleanedUrl.includes('utm_campaign'), 'Stripped utm_campaign');
assert(utmTest.cleanedUrl.includes('keep_me=123'), 'Preserved valid application query parameter keep_me');
assert(utmTest.strippedParams.length === 5, 'Stripped exactly 5 UTM parameters', `Got: ${utmTest.strippedParams.join(', ')}`);

// Test 2: Social & Ad Click IDs
const clickTest = cleanUrl('https://shop.example.com/checkout?fbclid=IwAR091823&gclid=CjwKCAiA&msclkid=abc123&twclid=tw999&ttclid=tt888&cart_id=99');
assert(clickTest.hasChanged, 'Click ID test detects changes');
assert(!clickTest.cleanedUrl.includes('fbclid'), 'Stripped fbclid');
assert(!clickTest.cleanedUrl.includes('gclid'), 'Stripped gclid');
assert(!clickTest.cleanedUrl.includes('msclkid'), 'Stripped msclkid');
assert(!clickTest.cleanedUrl.includes('twclid'), 'Stripped twclid');
assert(!clickTest.cleanedUrl.includes('ttclid'), 'Stripped ttclid');
assert(clickTest.cleanedUrl.includes('cart_id=99'), 'Preserved cart_id=99');

// Test 3: Amazon Path & Query Referral Cleaning
const amazonTest = cleanUrl('https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1?keywords=keyboard&qid=1610000000&sr=8-1&tag=affiliate-20');
assert(amazonTest.hasChanged, 'Amazon test detects changes');
assert(!amazonTest.cleanedUrl.includes('/ref='), 'Stripped Amazon path /ref= segment');
assert(amazonTest.cleanedUrl.includes('/dp/B08N5WRWNW'), 'Preserved clean Amazon product path');
assert(!amazonTest.cleanedUrl.includes('tag='), 'Stripped Amazon affiliate tag');
assert(!amazonTest.cleanedUrl.includes('qid='), 'Stripped Amazon session timestamp qid');

// Test 4: YouTube Share Tracking Token (si)
const ytTest = cleanUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ?si=trackingToken12345&feature=share');
assert(ytTest.hasChanged, 'YouTube test detects changes');
assert(!ytTest.cleanedUrl.includes('si='), 'Stripped YouTube si tracking token');
assert(ytTest.cleanedUrl.includes('v=dQw4w9WgXcQ'), 'Preserved YouTube video ID');

// Test 5: Google Search Redirect Unmasking
const googleRedirect = cleanUrl('https://www.google.com/url?q=https%3A%2F%2Fclean-site.org%2Farticle%3Fid%3D42&sa=D&sntz=1&usg=AFQjCN');
assert(googleRedirect.hasChanged, 'Google redirect detected');
assert(googleRedirect.redirectUnwrapped === true, 'Flagged redirectUnwrapped');
assert(googleRedirect.cleanedUrl.startsWith('https://clean-site.org/article'), 'Unwrapped Google search redirect to destination');

// Test 6: Facebook Link Shim Unmasking
const fbShim = cleanUrl('https://www.facebook.com/l.php?u=https%3A%2F%2Fdestination.com%2Fprivacy&h=AT19283');
assert(fbShim.hasChanged, 'Facebook link shim detected');
assert(fbShim.redirectUnwrapped === true, 'Flagged redirectUnwrapped on Facebook');
assert(fbShim.cleanedUrl.startsWith('https://destination.com/privacy'), 'Unwrapped Facebook shim redirect');

// Test 7: Batch URL Cleaning
const batchInputs = [
  'https://example.com/one?utm_source=email',
  'https://example.com/clean',
  'https://www.youtube.com/watch?v=123?si=token',
];
const batchRes = cleanUrls(batchInputs);
assert(batchRes.length === 3, 'Batch cleaned all 3 inputs');
assert(batchRes[0].hasChanged === true, 'First batch item cleaned');
assert(batchRes[1].hasChanged === false, 'Second batch item clean');
// Test 8: Claude Login & Referral Cleaning
const claudeTest = cleanUrl('https://claude.ai/login?from=logout&reauth=1&returnTo=%2Fnew%3F');
assert(claudeTest.hasChanged, 'Claude URL changed');
assert(claudeTest.cleanedUrl === 'https://claude.ai/login', 'Claude URL cleaned to pure login endpoint');
assert(claudeTest.strippedParams.includes('from'), 'Stripped from parameter');
assert(claudeTest.strippedParams.includes('reauth'), 'Stripped reauth parameter');
assert(claudeTest.strippedParams.includes('returnTo'), 'Stripped returnTo parameter');

// Test 9: Aggressive Pure Link Mode (stripAllQueryParams)
const pureTest = cleanUrl('https://example.com/search?q=shoes&category=mens&page=2&custom=1', { stripAllQueryParams: true });
assert(pureTest.hasChanged, 'Pure Link Mode detected changes');
assert(pureTest.cleanedUrl === 'https://example.com/search', 'Pure Link Mode stripped all query parameters');
assert(pureTest.strippedParams.length === 4, 'Pure Link Mode tracked all 4 stripped parameters');

console.log(`\nURL Cleaner Test Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
}

