# Sentry AI — Be Fearless Online

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

### 4. Personal Data Broker Hub (Privacy Sovereignty)
- **Zero-Telemetry Local Vault**: Personal identity details encrypted with **AES-256-GCM** via Web Crypto API with PBKDF2 (100,000 iterations).
- **150+ Data Broker Registry**: Categorized list (People Search, Financial & Risk, AdTech Aggregators, AI Datasets).
- **Automated Deletion Requests**: Prepares legally binding CCPA/CPRA and GDPR Article 17 erasure demands.

---

## Interface Modalities: Full Sidebar, Popup, and Dashboard

Sentry AI provides three complementary interfaces:
1. **Full-Height Browser Side Panel (`sidepanel.html`)**:
   - Opens alongside any active webpage as a persistent, professional sidebar.
   - Shortcut: `Command+Shift+S` (macOS) / `Ctrl+Shift+S` (Windows/Linux).
   - Also openable via the **SIDEBAR** dock button in the toolbar popup.
   - Features 5 full tabs: **Overview**, **Request Matrix**, **Fingerprint Shield**, **Network Log**, and **Broker Hub**.
2. **Toolbar Popup (`popup.html`)**:
   - Quick one-click master toggle, live safety grade, threat counters, and fast Element Zapper.
3. **Full-Page Command Center (`dashboard.html`)**:
   - Comprehensive broker registry (50+ databases), AES-256 identity vault management, and exportable audit trail.

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
```
This generates an unpacked Chrome extension inside the `sentry-extension/dist/` directory.

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
node scripts/verify-extension.js
node scripts/test-crypto.js
```
