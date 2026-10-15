# Sentry AI Be Fearless Online

**Sentry AI** is the next-generation browser privacy shield and AI data defense extension for Manifest V3 (Chrome, Brave, Edge, Arc, Opera).

> **Be Fearless Online.** Complete sovereignty over your web footprint, network requests, biometric/hardware fingerprints, and personal data broker exposures.

---

## Key Pillars & Architecture

### 1. High-Performance Request Matrix & Dynamic Filtering
- Full Manifest V3 compliance via `declarativeNetRequest` (DNR).
- Pre-compiled static privacy rules (`rules_ai_trackers.json`, `rules_privacy_headers.json`).
- Dynamic per-domain matrix rules (1st-party scripts, 3rd-party scripts, frames, inline tags, WebSockets).
- Built-in DOM element zapper for permanent visual ad/tracker removal.

### 2. Mathematical Anti-Fingerprinting Shield
- **HTML5 Canvas Defense**: Injects per-domain persistent mathematical noise into `toDataURL()`, `toBlob()`, and `getImageData()`, altering fingerprint hashes without visual distortion.
- **WebGL Masking**: Normalizes graphics card strings (`UNMASKED_VENDOR_WEBGL`, `UNMASKED_RENDERER_WEBGL`) and injects subtle entropy into `readPixels()`.
- **AudioContext Defense**: Perturbs acoustic frequency data in `AnalyserNode` and `AudioBuffer` against acoustic fingerprinting bots.
- **Hardware Probes**: Normalizes `navigator.hardwareConcurrency`, `deviceMemory`, DOMRect, and TextMetrics.

### 3. Anti-AI Scraping & Model Training Protection
- Automatically injects `Sec-GPC: 1` (Global Privacy Control) and `DNT: 1` headers on all web traffic.
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
- **Automated Deletion Requests**: Prepares legally binding CCPA/CPRA and GDPR Article 17 erasure demands.

---

## Interface Modality: Native Browser Side Panel & Command Center

Sentry AI is designed around a zero-compromise, persistent **Browser Side Panel**:
1. **Full-Height Browser Side Panel (`sidepanel.html`)**:
   - Opens alongside any active webpage as a persistent, high-craft cyber defense sidebar.
   - **One-Click Launch**: Clicking the Sentry AI toolbar icon immediately docks and opens the Side Panel (no popup interruptions).
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

### 2. Build Production Bundle
```bash
npm run build
# Or package complete zip artifact for Chrome Web Store:
npm run package
```
This generates:
- `sentry-extension/dist/` (unpacked extension directory)
- `sentry-extension/sentry-ai-v1.0.0.zip` (production zip archive)

### 3. Load in Chromium (Chrome / Brave / Edge / Arc)
1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked**.
4. Select the `sentry-extension/dist/` folder.
5. Sentry AI is armed! Open the sidebar with `Command+Shift+S` or click the toolbar icon.

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
