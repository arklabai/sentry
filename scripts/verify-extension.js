import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

console.log('--- Sentry AI Extension Verification Suite ---');

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

// 1. Verify Manifest V3
const manifestPath = path.join(distDir, 'manifest.json');
assert(fs.existsSync(manifestPath), 'dist/manifest.json exists');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.manifest_version === 3, 'Manifest is version 3');
const isFirefox = !!manifest.browser_specific_settings?.gecko;
assert(
  isFirefox
    ? manifest.background?.scripts?.includes('background/serviceWorker.js')
    : manifest.background?.service_worker === 'background/serviceWorker.js',
  'Service worker correctly mapped'
);
assert(manifest.content_scripts.length === 2, 'Two content script configurations declared');

// 2. Verify Canvas Defender in MAIN world
const canvasScript = manifest.content_scripts.find((cs) => cs.world === 'MAIN');
assert(canvasScript !== undefined, 'Main world content script declared');
assert(canvasScript.run_at === 'document_start', 'Canvas Defender runs at document_start');

// 3. Verify Static DNR Rule Files
const aiTrackersPath = path.join(distDir, 'rules/rules_ai_trackers.json');
assert(fs.existsSync(aiTrackersPath), 'rules_ai_trackers.json exists');
const aiRules = JSON.parse(fs.readFileSync(aiTrackersPath, 'utf8'));
assert(Array.isArray(aiRules) && aiRules.length > 0, `rules_ai_trackers contains ${aiRules.length} rules`);

const ruleIds = new Set();
let duplicates = 0;
aiRules.forEach((r) => {
  if (ruleIds.has(r.id)) duplicates++;
  ruleIds.add(r.id);
});
assert(duplicates === 0, 'All DNR rule IDs are unique');

const headerRulesPath = path.join(distDir, 'rules/rules_privacy_headers.json');
assert(fs.existsSync(headerRulesPath), 'rules_privacy_headers.json exists');
const headerRules = JSON.parse(fs.readFileSync(headerRulesPath, 'utf8'));
assert(headerRules[0].action.requestHeaders.some((h) => h.header === 'Sec-GPC'), 'Sec-GPC header injection declared');

const urlCleanerRulesPath = path.join(distDir, 'rules/rules_url_cleaner.json');
assert(fs.existsSync(urlCleanerRulesPath), 'rules_url_cleaner.json exists');
const urlCleanerRules = JSON.parse(fs.readFileSync(urlCleanerRulesPath, 'utf8'));
assert(Array.isArray(urlCleanerRules) && urlCleanerRules.length > 0, `rules_url_cleaner contains ${urlCleanerRules.length} rules`);
urlCleanerRules.forEach((r) => {
  if (ruleIds.has(r.id)) duplicates++;
  ruleIds.add(r.id);
});
assert(duplicates === 0, 'All DNR rule IDs across all rulesets are completely unique');

// 4. Verify Built HTML & Assets
assert(fs.existsSync(path.join(distDir, 'popup.html')), 'dist/popup.html exists');
assert(fs.existsSync(path.join(distDir, 'sidepanel.html')), 'dist/sidepanel.html exists');
assert(fs.existsSync(path.join(distDir, 'dashboard.html')), 'dist/dashboard.html exists');
assert(
  isFirefox
    ? manifest.sidebar_action?.default_panel === 'sidepanel.html'
    : manifest.side_panel?.default_path === 'sidepanel.html',
  'Side panel configured in manifest'
);
assert(
  isFirefox || manifest.permissions.includes('sidePanel'),
  'sidePanel permission declared (or Firefox sidebar_action configured)'
);
assert(manifest.permissions.includes('contextMenus'), 'contextMenus permission declared');
assert(manifest.permissions.includes('clipboardWrite'), 'clipboardWrite permission declared');
assert(fs.existsSync(path.join(distDir, 'background/serviceWorker.js')), 'dist/background/serviceWorker.js exists');
assert(fs.existsSync(path.join(distDir, 'content/canvasDefender.js')), 'dist/content/canvasDefender.js exists');
assert(fs.existsSync(path.join(distDir, 'content/urlCleaner.js')), 'dist/content/urlCleaner.js exists');
assert(fs.existsSync(path.join(distDir, 'content/aiShield.js')), 'dist/content/aiShield.js exists');
assert(fs.existsSync(path.join(distDir, 'content/domZapper.js')), 'dist/content/domZapper.js exists');

// 5. Verify Icons
[16, 32, 48, 128].forEach((size) => {
  assert(fs.existsSync(path.join(distDir, `icons/icon-${size}.png`)), `icon-${size}.png exists`);
});

console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) {
  process.exit(1);
}
