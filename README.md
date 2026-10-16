# Sentry AI - Be Fearless Online

**Sentry AI** is the next-generation browser privacy shield, anti-fingerprinting cloaker, and commercial AI data defense extension engineered natively for **Manifest V3** (Chrome, Brave, Edge, Arc, Opera) and **Mozilla Firefox**.

- 🌐 **Official Portal**: [sentry.arklabai.com](https://sentry.arklabai.com)
- 📦 **Monorepo**: [github.com/arklabai/sentry](https://github.com/arklabai/sentry)
- 🔒 **Zero-Telemetry Guarantee**: 100% client-side execution; 0 external tracking bytes.

> **Be Fearless Online.** Complete sovereignty over your web footprint, network requests, biometric/hardware fingerprints, and personal data broker exposures.

---

## Key Pillars & Architecture

### 1. High-Performance Request Matrix & Dynamic Filtering
- Full Manifest V3 compliance via native C++ `declarativeNetRequest` (DNR) with 0ms latency.
- 120,000+ pre-compiled static privacy rules (`rules_ai_trackers.json`, `rules_privacy_headers.json`).
- Dynamic per-domain matrix rules (1st-party scripts, 3rd-party scripts, frames, inline tags, WebSockets).
- Built-in DOM element zapper for permanent visual ad/tracker removal.

### 2. Mathematical Anti-Fingerprinting Shield
- **HTML5 Canvas Defense**: Injects per-domain persistent mathematical noise via Mulberry32 PRNG into `toDataURL()`, `toBlob()`, and `getImageData()`, altering fingerprint hashes without visual distortion or CAPTCHA breakage.
- **WebGL Masking**: Normalizes graphics card strings (`UNMASKED_VENDOR_WEBGL`, `UNMASKED_RENDERER_WEBGL`) and injects subtle entropy into `readPixels()`.
- **AudioContext Defense**: Perturbs acoustic frequency data in `AnalyserNode` and `AudioBuffer` against acoustic fingerprinting bots.
- **Hardware Probes**: Normalizes `navigator.hardwareConcurrency`, `deviceMemory`, DOMRect, and TextMetrics.
- **V8 Clock & Timezone Cloaking**: Protects against locale and clock skew leakage.

### 3. Anti-AI Scraping & Model Training Protection
- Automatically injects `Sec-GPC: 1` (Global Privacy Control) and `DNT: 1` headers on all web traffic.
- Injects `X-Robots-Tag: noai, noimageai` into headers to forbid crawler training ingestion.
- Blocks Meta Pixel, TikTok Insight, LinkedIn Pixel, and telemetry used to feed commercial generative AI pipelines.
- Direct platform opt-out center for Meta/Facebook, X/Grok, Google Gemini, and LinkedIn.

### 4. Persistent Per-Site Element Zap Rules & Universal Cookie Consent Guard
- **Per-Site Persistent Element Zapper**: Zaps annoying elements with intelligent CSS selectors, permanently saved to local storage per domain. Re-injected at `document_start` before first paint with `MutationObserver` enforcement so zapped content never reappears on reload.
- **Universal Cookie Consent Guard**: Auto-resolves and suppresses intrusive cookie consent banners (OneTrust, Cookiebot, Didomi, Complianz, Quantcast, Klaro, TrustArc) across all websites, programmatically clicking reject/essential-only buttons and unlocking frozen page scrolling.

### 5. URL Sanitizer & Link Guard (Ported from ClearURLs)
- Strips 50+ tracking parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, etc.) via native MV3 `declarativeNetRequest` query transforms.
- Bypasses intermediate redirect wrappers (Google `/url?q=...`, Facebook `l.php?u=...`).
- Neutralizes `<a ping>` hyperlink auditing and search link hijacking (`window.rwt`).
- Includes single and batch link purification studios in the Side Panel and Command Center.

### 6. Personal Data Broker Hub (Privacy Sovereignty)
- **Zero-Telemetry Local Vault**: Personal identity details encrypted with **AES-256-GCM** via Web Crypto API with PBKDF2 (100,000 iterations).
- **18+ Data Broker Registry**: Categorized list (People Search, Financial & Risk, AdTech Aggregators, AI Datasets).
- **Automated Deletion Requests**: Prepares legally binding CCPA/CPRA § 1798.105 and GDPR Article 17 erasure demands.

### 7. Right-Click & Copy Freedom Enforcer
- Unlocks disabled right-click context menus (`contextmenu`), text selection (`selectstart`), and copy shortcuts (`copy`, `cut`).

---

## Interface Modality: Native Browser Side Panel & Command Center

Sentry AI is designed around a zero-compromise, persistent **Browser Side Panel**:

1. **Full-Height Browser Side Panel (`sidepanel.html`)**:
   - Opens alongside any active webpage as a persistent, high-craft cyber defense sidebar.
   - **One-Click Launch**: Clicking the Sentry AI toolbar icon immediately docks and opens the Side Panel.
   - **Keyboard Shortcut**: `Command+Shift+S` (macOS) / `Ctrl+Shift+S` (Windows/Linux).
   - Features 5 comprehensive tabs:
     - **Overview**: Hero defense toggle, safety grade, real-time threat feed, core shield switches, active domain zap rules manager.
     - **Request Matrix**: Sub-request origin filtering (scripts, frames, WebSockets) & filter lists.
     - **Fingerprint Shield**: Real-time Canvas, WebGL, AudioContext entropy & live hash tester.
     - **Traffic Log**: Real-time network request inspector with type filtering and search.
     - **Broker Hub**: Personal data broker monitoring and AI training locks.
2. **Full-Page Command Center (`dashboard.html`)**:
   - Comprehensive broker registry, AES-256 local encrypted identity vault, automated CCPA/GDPR legal erasure demands, batch URL scrubber, Universal Cookie Consent Guard manager, and persistent per-site zap rules manager.

---

## Installation & Development

### 1. Install Dependencies

```bash
cd sentry-extension
npm install
```

### 2. Build Production Bundle & Packages

```bash
# Compile TypeScript and bundle with Vite:
npm run build

# Package production zip artifacts for Chrome and Firefox:
npm run package
```

This generates:
- `dist/` (unpacked extension directory)
- `sentry-ai-v1.0.0.zip` (Chromium Manifest V3 package for Chrome, Brave, Edge, Arc)
- `sentry-ai-firefox-v1.0.0.zip` (Gecko AMO package for Mozilla Firefox)

### 3. Load in Chromium (Chrome / Brave / Edge / Arc)
1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked** and select `sentry-extension/dist/`.
4. Press `Command+Shift+S` or click the toolbar icon to launch the Side Panel.

### 4. Load in Mozilla Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `sentry-extension/dist/manifest.json`.

---

## Testing & Verification

Run the built-in automated test suites:

```bash
# 1. Manifest V3 compliance & DNR integrity verification (30 tests)
node scripts/verify-extension.js

# 2. URL Cleaner parameter stripping & redirect unmasking suite (31 tests)
node scripts/test-url-cleaner.js

# 3. Persistent Zap & Universal Cookie Consent Guard suite (33 tests)
node scripts/test-zap-cookie.js

# 4. AES-256-GCM cryptographic vault verification
node scripts/test-crypto.js
```
