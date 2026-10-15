import { cleanUrl } from '../src/lib/urlCleaner.ts';
import { generateOptimalSelector, normalizeDomain } from '../src/lib/zapManager.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Right-Click "Copy Untrackable Link" & "Zap Element" Suite ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

// =========================================================================
// 1. TEST URL CLEANING (Copy Untrackable Link Engine)
// =========================================================================

// Test 1A: Marketing & Campaign tracking tokens stripped
const marketingUrl = 'https://example.com/product?utm_source=newsletter&utm_medium=email&utm_campaign=summer_sale&utm_content=cta_button';
const clean1 = cleanUrl(marketingUrl);
assert(clean1.hasChanged === true, 'Marketing URL recognized as tracked');
assert(!clean1.cleanedUrl.includes('utm_source'), 'utm_source stripped');
assert(!clean1.cleanedUrl.includes('utm_campaign'), 'utm_campaign stripped');
assert(clean1.cleanedUrl === 'https://example.com/product', `Cleaned URL is pure: ${clean1.cleanedUrl}`);

// Test 1B: Social Surveillance Click IDs (Facebook, Google, Twitter, MailChimp)
const surveillanceUrl = 'https://shop.example.org/item/42?fbclid=IwAR123456789&gclid=EAIaIQobChMI&twclid=987654321&mc_eid=a1b2c3d4&legit_param=keep_me';
const clean2 = cleanUrl(surveillanceUrl);
assert(clean2.hasChanged === true, 'Surveillance tokens detected');
assert(!clean2.cleanedUrl.includes('fbclid'), 'fbclid stripped');
assert(!clean2.cleanedUrl.includes('gclid'), 'gclid stripped');
assert(!clean2.cleanedUrl.includes('twclid'), 'twclid stripped');
assert(!clean2.cleanedUrl.includes('mc_eid'), 'mc_eid stripped');
assert(clean2.cleanedUrl.includes('legit_param=keep_me'), 'Legitimate application parameters preserved');

// Test 1C: Affiliate & Referral Tracking
const affiliateUrl = 'https://news.example.com/article?ref=social_share&aff_id=affiliate99&affiliate_id=aff123&page=3';
const clean3 = cleanUrl(affiliateUrl);
assert(!clean3.cleanedUrl.includes('aff_id'), 'aff_id stripped');
assert(!clean3.cleanedUrl.includes('affiliate_id'), 'affiliate_id stripped');
assert(!clean3.cleanedUrl.includes('ref='), 'ref token stripped');
assert(clean3.cleanedUrl.includes('page=3'), 'Page query parameter preserved');

// Test 1D: Already untrackable link (Zero mutations)
const pureUrl = 'https://example.org/docs/privacy-guide?section=intro';
const clean4 = cleanUrl(pureUrl);
assert(clean4.hasChanged === false, 'Already clean URL requires no modification');
assert(clean4.cleanedUrl === pureUrl, 'Pure URL preserved byte-for-byte');

// =========================================================================
// 2. TEST CONTEXT MENU CONFIGURATION
// =========================================================================

const swPath = path.resolve(__dirname, '../src/background/serviceWorker.ts');
const swCode = fs.readFileSync(swPath, 'utf8');

assert(swCode.includes("id: 'sentry-zap-element'"), "Context menu contains 'sentry-zap-element'");
assert(swCode.includes("title: 'Zap Element'"), "Context menu title 'Zap Element' configured (clean without brand suffix)");
assert(swCode.includes("contexts: ['all']"), "Zap Element context menu configured for all contexts (['all'])");
assert(!swCode.includes("id: 'sentry-zap-mode'"), "Duplicate zap context menu item is completely eliminated");
assert(swCode.includes("id: 'sentry-copy-untrackable-link'"), "Context menu contains 'sentry-copy-untrackable-link'");
assert(swCode.includes("title: 'Copy Untrackable Link'"), "Context menu title 'Copy Untrackable Link' configured");
assert(!swCode.includes("id: 'sentry-copy-page-untrackable-link'"), "Page-level copy untrackable link is removed to prevent menu clutter");
assert(swCode.includes("id: 'sentry-open-clean-link'"), "Context menu contains 'sentry-open-clean-link'");

// =========================================================================
// 3. TEST OPTIMAL SELECTOR GENERATION (uBlock Style Cosmetic Filtering)
// =========================================================================

// Mock DOM Element
class MockElement {
  constructor({ id = '', className = '', tagName = 'DIV', attributes = {}, parent = null } = {}) {
    this.id = id;
    this.className = className;
    this.classList = className ? className.split(' ') : [];
    this.tagName = tagName;
    this.attributes = attributes;
    this.parentElement = parent;
    this.style = {
      setProperty: (prop, val, prio) => {
        this[prop] = `${val} ${prio || ''}`.trim();
      },
    };
    this.isConnected = true;
  }
  getAttribute(name) {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    return this.attributes[name] || null;
  }
  hasAttribute(name) {
    return Boolean(this.getAttribute(name));
  }
}

// Test 3A: Element with stable ID
const adWithId = new MockElement({ id: 'sponsored-ad-banner', tagName: 'DIV' });
const sel1 = generateOptimalSelector(adWithId);
assert(sel1 === '#sponsored-ad-banner', `Optimal ID selector generated: ${sel1}`);

// Test 3B: Element with ad class
const adWithClass = new MockElement({ className: 'ad-banner-container google-dfp', tagName: 'SECTION' });
const sel2 = generateOptimalSelector(adWithClass);
assert(sel2.includes('.google-dfp') || sel2.includes('.ad-banner-container') || sel2.includes('section'), `Optimal class selector generated: ${sel2}`);

// Test 3C: Element with data-testid or aria-label
const promoBanner = new MockElement({
  tagName: 'ASIDE',
  attributes: { 'data-testid': 'floating-promo-widget' },
});
const sel3 = generateOptimalSelector(promoBanner);
assert(sel3.includes('data-testid') || sel3.includes('aside'), `Optimal attribute selector generated: ${sel3}`);

// =========================================================================
// 4. TEST DOM ZAPPER EVENT TARGET & PERSISTENT RULE LOGIC
// =========================================================================

const zapperPath = path.resolve(__dirname, '../src/content/domZapper.ts');
const zapperCode = fs.readFileSync(zapperPath, 'utf8');

assert(zapperCode.includes("addEventListener(\n    'contextmenu'"), 'domZapper listens to contextmenu to capture target element');
assert(zapperCode.includes("lastContextTarget = target;"), 'domZapper updates lastContextTarget on right-click');
assert(zapperCode.includes("message.action === 'ZAP_TARGET_ELEMENT'"), "domZapper handles 'ZAP_TARGET_ELEMENT' action");
assert(zapperCode.includes("zapElement(lastContextTarget)"), 'domZapper executes zapElement on right-clicked element');
assert(zapperCode.includes("startZapper()"), 'domZapper falls back to interactive crosshairs when no element target');
assert(zapperCode.includes("setProperty('display', 'none', 'important')"), 'domZapper immediately hides target element');
assert(zapperCode.includes("savePersistentZapRule(currentHost, selector)"), 'domZapper persists zap rule to storage');

console.log(`\nRight-Click & Zapper Test Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
}
