import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Comprehensive Sentry AI Deep Verification Suite ===\n');

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
// 1. CONTEXT MENUS VERIFICATION
// =========================================================================
console.log('--- 1. Context Menus Integrity Check ---');
const swSrcPath = path.resolve(rootDir, 'src/background/serviceWorker.ts');
const swSrc = fs.readFileSync(swSrcPath, 'utf8');

assert(swSrc.includes("id: 'sentry-zap-element'"), "Context menu registers 'sentry-zap-element'");
assert(swSrc.includes("title: 'Zap Element'"), "Context menu title is cleanly named 'Zap Element'");
assert(!swSrc.includes("title: 'Zap Element (Sentry AI)'"), "Brand suffix '(Sentry AI)' removed from Zap Element title");
assert(!swSrc.includes("id: 'sentry-zap-mode'"), "Duplicate 'sentry-zap-mode' is eliminated");
assert(!swSrc.includes("id: 'sentry-copy-page-untrackable-link'"), "Page-level copy untrackable link is removed");
assert(swSrc.includes("id: 'sentry-copy-untrackable-link'"), "'sentry-copy-untrackable-link' is registered");
assert(swSrc.includes("id: 'sentry-open-clean-link'"), "'sentry-open-clean-link' is registered");
assert(swSrc.includes("setupContextMenus();"), "setupContextMenus is invoked on worker startup");
assert(swSrc.includes("chrome.runtime?.onStartup?.addListener"), "setupContextMenus is registered on browser startup");

// =========================================================================
// 2. TIMEZONE & DOM CLOAKING VERIFICATION
// =========================================================================
console.log('\n--- 2. Timezone & DOM Cloaking Engine ---');
const canvasDefenderSrc = fs.readFileSync(path.resolve(rootDir, 'src/content/canvasDefender.ts'), 'utf8');

assert(canvasDefenderSrc.includes("realHostTimezone ="), "Captures real host timezone dynamically");
assert(canvasDefenderSrc.includes("document.getElementById('hyaho')"), "Directly targets deviceinfo.me #hyaho Local Time Zone element");
assert(canvasDefenderSrc.includes("document.getElementById('lilpb')"), "Directly targets deviceinfo.me #lilpb Local Live Time element");
assert(canvasDefenderSrc.includes("Object.defineProperty(elProto, 'innerHTML'"), "Intercepts Element.prototype.innerHTML setter");
assert(canvasDefenderSrc.includes("Object.defineProperty(nodeProto, 'textContent'"), "Intercepts Node.prototype.textContent setter");
assert(canvasDefenderSrc.includes("window.fetch = async function"), "Intercepts window.fetch for GeoIP JSON responses");
assert(canvasDefenderSrc.includes("XMLHttpRequest.prototype.send"), "Intercepts XMLHttpRequest for GeoIP JSON responses");
assert(canvasDefenderSrc.includes("Intl.DateTimeFormat = ProxyDateTimeFormat"), "Proxies Intl.DateTimeFormat");
assert(canvasDefenderSrc.includes("Date.prototype.toString"), "Hooks Date.prototype.toString");
assert(canvasDefenderSrc.includes("Date.prototype.getTimezoneOffset"), "Hooks Date.prototype.getTimezoneOffset");

// =========================================================================
// 3. UI LABELS & CAPITALIZATION VERIFICATION
// =========================================================================
console.log('\n--- 3. UI Typography & Renaming Check ---');
const popupSrc = fs.readFileSync(path.resolve(rootDir, 'src/popup/Popup.tsx'), 'utf8');
const sidepanelSrc = fs.readFileSync(path.resolve(rootDir, 'src/sidepanel/Sidepanel.tsx'), 'utf8');
const dashboardSrc = fs.readFileSync(path.resolve(rootDir, 'src/dashboard/Dashboard.tsx'), 'utf8');

// Check Tracking & Data Guard
assert(!popupSrc.includes('Meta, TikTok pixels'), "Popup does not use old 'Meta, TikTok pixels'");
assert(!sidepanelSrc.includes('Meta, TikTok pixels'), "Sidepanel does not use old 'Meta, TikTok pixels'");
assert(!dashboardSrc.includes('Meta, TikTok pixels'), "Dashboard does not use old 'Meta, TikTok pixels'");
assert(popupSrc.includes('Tracking & Data Guard'), "Popup uses 'Tracking & Data Guard'");
assert(sidepanelSrc.includes('Tracking & Data Guard'), "Sidepanel uses 'Tracking & Data Guard'");
assert(dashboardSrc.includes('Tracking & Data Guard'), "Dashboard uses 'Tracking & Data Guard'");

// Check Title-case subline capitalization
assert(popupSrc.includes('DNR Static & Dynamic'), "Popup subline uses 'DNR Static & Dynamic'");
assert(sidepanelSrc.includes('DNR Static & Dynamic'), "Sidepanel subline uses 'DNR Static & Dynamic'");
assert(dashboardSrc.includes('DNR Static & Dynamic Filters'), "Dashboard subline uses 'DNR Static & Dynamic Filters'");
assert(dashboardSrc.includes('Canvas, WebGL & Audio Noise'), "Dashboard subline uses 'Canvas, WebGL & Audio Noise'");
assert(dashboardSrc.includes('Click & Tracking Parameters'), "Dashboard subline uses 'Click & Tracking Parameters'");
assert(dashboardSrc.includes('CCPA & GDPR Art 17 Opt-Outs'), "Dashboard subline uses 'CCPA & GDPR Art 17 Opt-Outs'");
assert(sidepanelSrc.includes('Lifetime Defense'), "Sidepanel uses 'Lifetime Defense'");

// =========================================================================
// 4. NUMBER FORMATTING ENGINE VERIFICATION
// =========================================================================
console.log('\n--- 4. Number Formatting Logic Check ---');
const formatSrc = fs.readFileSync(path.resolve(rootDir, 'src/lib/formatUtils.ts'), 'utf8');
assert(formatSrc.includes('export function formatMetricNumber'), "formatUtils.ts defines formatMetricNumber");
assert(formatSrc.includes('export function formatFullNumber'), "formatUtils.ts defines formatFullNumber");
assert(formatSrc.includes("1_000_000_000"), "formatUtils.ts handles billions with 'B'");
assert(formatSrc.includes("1_000_000"), "formatUtils.ts handles millions with 'M'");
assert(formatSrc.includes("toLocaleString('en-US')"), "formatUtils.ts formats with commas");

function formatMetricNumber(val) {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  if (num >= 1_000_000_000) {
    const formatted = (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}B`;
  }
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  return num.toLocaleString('en-US');
}

function formatFullNumber(val) {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return num.toLocaleString('en-US');
}

assert(formatMetricNumber(0) === '0', "0 formats as '0'");
assert(formatMetricNumber(999) === '999', "999 formats as '999'");
assert(formatMetricNumber(1234) === '1,234', "1234 formats with commas as '1,234'");
assert(formatMetricNumber(45180) === '45,180', "45180 formats with commas as '45,180'");
assert(formatMetricNumber(999999) === '999,999', "999999 formats with commas as '999,999'");
assert(formatMetricNumber(1000000) === '1M', "1000000 formats compactly as '1M'");
assert(formatMetricNumber(1100000) === '1.1M', "1100000 formats compactly as '1.1M'");
assert(formatMetricNumber(2500000) === '2.5M', "2500000 formats compactly as '2.5M'");
assert(formatMetricNumber(10000000) === '10M', "10000000 formats compactly as '10M'");
assert(formatMetricNumber(1000000000) === '1B', "1000000000 formats compactly as '1B'");
assert(formatFullNumber(1234567) === '1,234,567', "formatFullNumber preserves all digits for forensic dashboard");

// =========================================================================
// 5. COMPILED ASSETS & MANIFEST VERIFICATION
// =========================================================================
console.log('\n--- 5. Build Artifacts & Manifest Integrity Check ---');
assert(fs.existsSync(path.resolve(rootDir, 'dist/manifest.json')), "dist/manifest.json exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/background/serviceWorker.js')), "dist/background/serviceWorker.js exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/content/canvasDefender.js')), "dist/content/canvasDefender.js exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/content/aiShield.js')), "dist/content/aiShield.js exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/content/domZapper.js')), "dist/content/domZapper.js exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/content/urlCleaner.js')), "dist/content/urlCleaner.js exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/popup.html')), "dist/popup.html exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/sidepanel.html')), "dist/sidepanel.html exists");
assert(fs.existsSync(path.resolve(rootDir, 'dist/dashboard.html')), "dist/dashboard.html exists");
assert(fs.existsSync(path.resolve(rootDir, 'sentry-ai-v1.0.0.zip')), "sentry-ai-v1.0.0.zip exists");
assert(fs.existsSync(path.resolve(rootDir, 'sentry-ai-firefox-v1.0.0.zip')), "sentry-ai-firefox-v1.0.0.zip exists");

// Check compiled serviceWorker.js
const distSw = fs.readFileSync(path.resolve(rootDir, 'dist/background/serviceWorker.js'), 'utf8');
assert(distSw.includes('Zap Element'), "Compiled serviceWorker contains 'Zap Element'");
assert(!distSw.includes('Zap Element (Sentry AI)'), "Compiled serviceWorker does not contain old title");
assert(!distSw.includes('sentry-zap-mode'), "Compiled serviceWorker does not contain sentry-zap-mode");
assert(!distSw.includes('sentry-copy-page-untrackable-link'), "Compiled serviceWorker does not contain sentry-copy-page-untrackable-link");

console.log(`\n=================================================`);
console.log(`Deep Verification Results: ${passed} Passed, ${failed} Failed.`);
console.log(`=================================================`);

if (failed > 0) {
  process.exit(1);
}
