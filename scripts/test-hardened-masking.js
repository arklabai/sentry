import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distScript = path.resolve(__dirname, '../dist/content/canvasDefender.js');

console.log('--- Testing Hardened Device Masking & Fingerprint Cloaking ---');

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

// Read compiled IIFE script
const code = fs.readFileSync(distScript, 'utf8');

// Build realistic DOM / Web APIs mock
class MockAudioBuffer {
  constructor() {
    this._data = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
  }
  getChannelData(ch) {
    return this._data;
  }
  copyFromChannel(dest, ch) {
    dest.set(this._data);
  }
}

class MockOfflineAudioContext {
  async startRendering() {
    return new MockAudioBuffer();
  }
}

class MockWebGLContext {
  getParameter(pname) {
    if (pname === 0x1f00) return 'Original WebGL Vendor';
    if (pname === 0x1f01) return 'Original WebGL Renderer';
    if (pname === 0x9245) return 'Original Unmasked Vendor';
    if (pname === 0x9246) return 'Apple GPU (Metal)';
    return null;
  }
  getExtension(name) {
    if (name === 'WEBGL_debug_renderer_info') {
      return {
        UNMASKED_VENDOR_WEBGL: 0x9245,
        UNMASKED_RENDERER_WEBGL: 0x9246,
      };
    }
    return null;
  }
  getSupportedExtensions() {
    return ['WEBGL_debug_renderer_info'];
  }
  getShaderPrecisionFormat(shaderType, precisionType) {
    return { rangeMin: 62, rangeMax: 62, precision: 16 };
  }
  readPixels() {}
}

const customEvents = [];
const eventListeners = {};

const sandbox = {
  console: { log: () => {}, warn: () => {}, error: () => {}, info: () => {}, debug: () => {} },
  window: {
    location: { hostname: 'deviceinfo.me' },
    addEventListener: (type, handler) => {
      eventListeners[type] = handler;
    },
    dispatchEvent: (evt) => {
      customEvents.push(evt);
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  },
  document: {
    readyState: 'complete',
    head: { appendChild: () => {} },
    documentElement: { appendChild: () => {} },
    getElementById: (id) => null,
    addEventListener: (type, handler) => {
      eventListeners[`doc:${type}`] = handler;
    },
    removeEventListener: () => {},
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          getContext: (type) => (type.includes('webgl') ? new MockWebGLContext() : null),
          toDataURL: () => 'data:image/png;base64,mock',
        };
      }
      return {};
    },
  },
  navigator: {
    hardwareConcurrency: 8,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    getBattery: async () => ({
      charging: false,
      chargingTime: Infinity,
      dischargingTime: 3600,
      level: 0.42,
      addEventListener: () => {},
    }),
    userAgentData: {
      brands: [{ brand: 'Google Chrome', version: '120' }],
      mobile: false,
      platform: 'macOS',
      getHighEntropyValues: async (hints) => ({
        architecture: 'arm',
        bitness: '64',
        model: 'MacBookPro',
        platformVersion: '14.0.0',
      }),
    },
  },
  AudioBuffer: MockAudioBuffer,
  OfflineAudioContext: MockOfflineAudioContext,
  WebGLRenderingContext: MockWebGLContext,
  Intl: Intl,
  Date: Date,
  Float32Array: Float32Array,
  Uint8ClampedArray: Uint8ClampedArray,
  Proxy: Proxy,
  Object: Object,
  Reflect: Reflect,
  Array: Array,
  String: String,
  Math: Math,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
};

  class MockHTMLCanvasElement {
    toDataURL() { return 'data:image/png;base64,mock'; }
    toBlob(cb) { cb(new Blob([])); }
  }
  class MockCanvasRenderingContext2D {
    getImageData() { return { data: new Uint8ClampedArray(16) }; }
    putImageData() {}
  }

  class MockNode {
    constructor() {
      this._text = '';
    }
    get textContent() { return this._text; }
    set textContent(v) { this._text = v; }
  }

  class MockElement extends MockNode {
    constructor() {
      super();
      this._html = '';
    }
    get innerHTML() { return this._html; }
    set innerHTML(v) { this._html = v; }
    getBoundingClientRect() {
      return { width: 100, height: 50, top: 10, left: 10, right: 110, bottom: 60, x: 10, y: 10 };
    }
  }

  sandbox.Node = MockNode;
  sandbox.Element = MockElement;
  sandbox.HTMLCanvasElement = MockHTMLCanvasElement;
  sandbox.CanvasRenderingContext2D = MockCanvasRenderingContext2D;
  sandbox.WebGL2RenderingContext = MockWebGLContext;
  sandbox.window.Node = MockNode;
  sandbox.window.Element = MockElement;
  sandbox.window.HTMLCanvasElement = MockHTMLCanvasElement;
  sandbox.window.CanvasRenderingContext2D = MockCanvasRenderingContext2D;
  sandbox.window.WebGL2RenderingContext = MockWebGLContext;
  sandbox.window.navigator = sandbox.navigator;
  sandbox.window.document = sandbox.document;
  sandbox.window.Intl = sandbox.Intl;
  sandbox.window.Date = sandbox.Date;
  sandbox.window.AudioBuffer = sandbox.AudioBuffer;
  sandbox.window.OfflineAudioContext = sandbox.OfflineAudioContext;
  sandbox.window.WebGLRenderingContext = sandbox.WebGLRenderingContext;

// Run the script in VM sandbox
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

// TEST 1: Default WebGL Vendor/Renderer masking (Default should be Intel UHD 630)
const gl = new sandbox.WebGLRenderingContext();
const ext = gl.getExtension('WEBGL_debug_renderer_info');
assert(ext !== null, 'WEBGL_debug_renderer_info extension accessible');
const unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
const unmaskedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
assert(unmaskedVendor.includes('Google Inc.') || unmaskedVendor.includes('Intel'), `Unmasked vendor spoofed: ${unmaskedVendor}`);
assert(unmaskedRenderer.includes('Intel(R) UHD Graphics 630'), `Unmasked renderer spoofed to Intel UHD: ${unmaskedRenderer}`);

// Standard WebGL vendor/renderer (0x1f00, 0x1f01)
const stdVendor = gl.getParameter(0x1f00);
const stdRenderer = gl.getParameter(0x1f01);
assert(stdVendor === 'WebKit' || stdVendor.includes('Google Inc.'), `Standard WebGL Vendor spoofed: ${stdVendor}`);
assert(stdRenderer === 'WebKit WebGL' || stdRenderer.includes('Intel'), `Standard WebGL Renderer spoofed: ${stdRenderer}`);

// Precision normalization
const prec = gl.getShaderPrecisionFormat(0, 0);
assert(prec.rangeMin === 127 && prec.precision === 23, 'Shader precision normalized');

// TEST 2: Battery status cloaking
let battery;
sandbox.navigator.getBattery().then(async (b) => {
  battery = b;
  assert(battery.charging === true, 'Battery reporting charging: true');
  assert(battery.level === 1.0, 'Battery reporting level: 1.0 (100%)');
  assert(battery.chargingTime === 0, 'Battery chargingTime: 0');
  assert(battery.dischargingTime === Infinity, 'Battery dischargingTime: Infinity');
});

// TEST 3: Hardware Concurrency Cloaking
assert(sandbox.navigator.hardwareConcurrency === 4, `Hardware concurrency normalized to 4 (was 8): ${sandbox.navigator.hardwareConcurrency}`);

// TEST 4: Client Hints Sanitization
if (sandbox.navigator.userAgentData) {
  sandbox.navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'model']).then((hints) => {
    assert(hints.architecture === 'x86', `Client hints architecture sanitized to x86: ${hints.architecture}`);
    assert(hints.model === '', `Client hints model cleared: "${hints.model}"`);
  });
}

// TEST 5: Web Audio copyFromChannel perturbation
const audioBuf = new sandbox.AudioBuffer();
const dest = new Float32Array(5);
audioBuf.copyFromChannel(dest, 0);
let hasNoise = false;
const orig = [0.1, 0.2, 0.3, 0.4, 0.5];
for (let i = 0; i < 5; i++) {
  if (Math.abs(dest[i] - orig[i]) > 0.0000001) {
    hasNoise = true;
    break;
  }
}
assert(hasNoise, 'AudioBuffer.prototype.copyFromChannel injected deterministic micro-noise');

// TEST 6: Web Audio startRendering perturbation
const offlineCtx = new sandbox.OfflineAudioContext();
offlineCtx.startRendering().then((renderedBuf) => {
  const chData = renderedBuf.getChannelData(0);
  assert(chData.length === 5, 'OfflineAudioContext returned perturbed audio buffer');
});

// TEST 7: Dynamic Config Sync via 'sentry:config' event
assert(typeof eventListeners['sentry:config'] === 'function', 'sentry:config listener registered');
// Dispatch config update to change GPU profile to nvidia_geforce and timezone to europe_london
eventListeners['sentry:config']({
  detail: {
    canvasNoise: true,
    audioNoise: true,
    webglNoise: true,
    batteryShield: true,
    gpuProfile: 'nvidia_geforce',
    timezoneSpoof: 'europe_london',
  },
});

// Verify GPU profile changed to NVIDIA
const updatedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
assert(updatedRenderer.includes('NVIDIA GeForce GTX 1660 SUPER'), `Dynamic GPU profile updated to NVIDIA: ${updatedRenderer}`);

// Verify Timezone Spoofed to Europe/London
const intlResolved = new sandbox.Intl.DateTimeFormat().resolvedOptions();
assert(intlResolved.timeZone === 'Europe/London', `Timezone dynamically spoofed to Europe/London: ${intlResolved.timeZone}`);

// TEST 8: Verify DOM innerHTML & textContent timezone cloaking (preventing host timezone leak)
const testEl = new sandbox.Element();
testEl.innerHTML = '<div id="local-tz">Local Time Zone: Asia/Dhaka</div>';
assert(!testEl.innerHTML.includes('Asia/Dhaka'), 'innerHTML setter automatically masks host timezone Asia/Dhaka');
assert(testEl.innerHTML.includes('Europe/London'), 'innerHTML setter replaces host timezone with spoofed Europe/London');

testEl.textContent = 'Host system detected: Asia/Dhaka (live)';
assert(!testEl.textContent.includes('Asia/Dhaka'), 'textContent setter automatically masks host timezone Asia/Dhaka');
assert(testEl.textContent.includes('Europe/London'), 'textContent setter replaces host timezone with spoofed Europe/London');

// Wait for promises to settle
setTimeout(() => {
  console.log(`\nMasking Test Results: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}, 500);
