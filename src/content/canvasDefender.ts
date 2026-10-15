/**
 * Sentry AI CanvasDefender (Hardened Mathematical Anti-Fingerprinting Core)
 * Execution World: MAIN (injected at document_start)
 *
 * Implements mathematical noise injection and hardware cloaking to defeat:
 * 1. HTML5 Canvas Fingerprinting (toDataURL, toBlob, getImageData)
 * 2. WebGL Hardware & Shader Fingerprinting (UNMASKED_RENDERER, UNMASKED_VENDOR, readPixels, shaderPrecision)
 * 3. AudioContext Acoustic Frequency Fingerprinting (getFloatFrequencyData, getByteFrequencyData, getChannelData, copyFromChannel, OfflineAudioContext)
 * 4. DOMRect & TextMetrics Font/Layout Probing (getBoundingClientRect, measureText)
 * 5. Battery Status API Tracking (navigator.getBattery)
 * 6. Date, Time & Timezone Offset Probing (Intl.DateTimeFormat, Date.prototype)
 * 7. Screen, Window, Hardware Concurrency, and Client Hints Probes
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if ((window as unknown as { __sentryDefenderActive?: boolean }).__sentryDefenderActive) {
    return;
  }
  (window as unknown as { __sentryDefenderActive?: boolean }).__sentryDefenderActive = true;

  // Domain-based persistent seed generator (Mulberry32 PRNG)
  function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  const domainSeed = Math.abs(hashString(window.location.host || 'sentry.local')) + 1337;

  function createPRNG(seed: number) {
    let s = seed >>> 0;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const domainRng = createPRNG(domainSeed);

  // Telemetry dispatcher to notify the extension content script bridge
  function reportThreat(
    type: 'canvas' | 'audio' | 'webgl' | 'domrect' | 'battery' | 'timezone' | 'hardware',
    detail: string
  ) {
    try {
      window.dispatchEvent(
        new CustomEvent('sentry:telemetry', {
          detail: {
            type,
            detail,
            domain: window.location.host,
            timestamp: Date.now(),
          },
        })
      );
    } catch {
      // Ignore in restricted sandboxes
    }
  }

  // ==========================================
  // CONFIGURATION STATE & DYNAMIC SYNC
  // ==========================================
  const GPU_PROFILES: Record<string, { vendor: string; renderer: string }> = {
    intel_uhd: {
      vendor: 'Google Inc. (Intel)',
      renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
    },
    nvidia_geforce: {
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)',
    },
    apple_silicon: {
      vendor: 'Apple Inc.',
      renderer: 'Apple GPU (Metal)',
    },
    swiftshader: {
      vendor: 'Google Inc. (Google)',
      renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    },
  };

  const TIMEZONE_CONFIGS: Record<string, { timeZone: string; offsetMinutes: number; tzName: string }> = {
    utc: { timeZone: 'UTC', offsetMinutes: 0, tzName: 'Coordinated Universal Time' },
    america_new_york: { timeZone: 'America/New_York', offsetMinutes: 240, tzName: 'Eastern Daylight Time' },
    europe_london: { timeZone: 'Europe/London', offsetMinutes: 0, tzName: 'Greenwich Mean Time' },
  };

  let activeGpuProfile = GPU_PROFILES.intel_uhd;
  let activeTimezone: 'system' | 'utc' | 'america_new_york' | 'europe_london' = 'system';
  let activeConcurrency = 4;
  let batteryShieldEnabled = true;

  // Listen for dynamic configuration updates from ISOLATED world bridge
  window.addEventListener('sentry:config', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail) return;
    if (detail.gpuProfile && GPU_PROFILES[detail.gpuProfile]) {
      activeGpuProfile = GPU_PROFILES[detail.gpuProfile];
    }
    if (detail.timezoneSpoof) {
      activeTimezone = detail.timezoneSpoof;
    }
    if (typeof detail.hardwareConcurrencyValue === 'number') {
      activeConcurrency = detail.hardwareConcurrencyValue;
    }
    if (typeof detail.batteryShield === 'boolean') {
      batteryShieldEnabled = detail.batteryShield;
    }
    if (typeof detail.allowRightClick === 'boolean') {
      allowRightClickEnabled = detail.allowRightClick;
      updateAllowRightClickStyles();
      clearInlineBlockers();
    }
  });

  // ==========================================
  // 1. CANVAS DEFENSE: Pixel Noise Injection
  // ==========================================
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origToBlob = HTMLCanvasElement.prototype.toBlob;
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

  function scrambleImageData(imageData: ImageData): ImageData {
    const data = imageData.data;
    const len = data.length;
    // Apply subtle deterministic 1-bit perturbation to ~15% of pixels
    for (let i = 0; i < len; i += 4) {
      if (domainRng() < 0.15) {
        const deltaR = domainRng() > 0.5 ? 1 : -1;
        const deltaG = domainRng() > 0.5 ? 1 : -1;
        const deltaB = domainRng() > 0.5 ? 1 : -1;

        data[i] = Math.max(0, Math.min(255, data[i] + deltaR));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + deltaG));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + deltaB));
      }
    }
    return imageData;
  }

  HTMLCanvasElement.prototype.toDataURL = function () {
    if (this && this.width > 0 && this.height > 0) {
      try {
        const ctx = this.getContext('2d');
        if (ctx) {
          const imgData = origGetImageData.call(ctx, 0, 0, this.width, this.height);
          scrambleImageData(imgData);
          ctx.putImageData(imgData, 0, 0);
          reportThreat('canvas', 'HTMLCanvasElement.toDataURL readback perturbed');
        }
      } catch {
        // Tainted canvas or WebGL fallback
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origToDataURL as any).apply(this, arguments);
  };

  HTMLCanvasElement.prototype.toBlob = function () {
    if (this && this.width > 0 && this.height > 0) {
      try {
        const ctx = this.getContext('2d');
        if (ctx) {
          const imgData = origGetImageData.call(ctx, 0, 0, this.width, this.height);
          scrambleImageData(imgData);
          ctx.putImageData(imgData, 0, 0);
          reportThreat('canvas', 'HTMLCanvasElement.toBlob export perturbed');
        }
      } catch {
        // Tainted canvas fallback
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origToBlob as any).apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.getImageData = function (
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgData = (origGetImageData as any).apply(this, arguments);
    reportThreat('canvas', `CanvasRenderingContext2D.getImageData intercepted (${sw}x${sh})`);
    return scrambleImageData(imgData);
  };

  // Text metrics font probe defense
  const origMeasureText = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metrics = (origMeasureText as any).apply(this, arguments);
    try {
      const delta = (domainRng() - 0.5) * 0.0001;
      const proxy = new Proxy(metrics, {
        get(target, prop) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const val = (target as any)[prop];
          if (typeof val === 'number') {
            return val + delta;
          }
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        },
      });
      return proxy;
    } catch {
      return metrics;
    }
  };

  // ==========================================
  // 2. WEBGL DEFENSE: GPU Normalization & readPixels
  // ==========================================
  const UNMASKED_VENDOR_WEBGL = 0x9245;
  const UNMASKED_RENDERER_WEBGL = 0x9246;
  const VENDOR_WEBGL = 0x1f00;
  const RENDERER_WEBGL = 0x1f01;

  function patchWebGL(proto: WebGLRenderingContext | WebGL2RenderingContext) {
    if (!proto) return;
    const origGetParameter = proto.getParameter;
    const origReadPixels = proto.readPixels;

    proto.getParameter = function (param: number) {
      try {
        if (param === UNMASKED_VENDOR_WEBGL) {
          reportThreat('webgl', `UNMASKED_VENDOR_WEBGL probe masked to ${activeGpuProfile.vendor}`);
          return activeGpuProfile.vendor;
        }
        if (param === UNMASKED_RENDERER_WEBGL) {
          reportThreat('webgl', `UNMASKED_RENDERER_WEBGL probe masked to ${activeGpuProfile.renderer}`);
          return activeGpuProfile.renderer;
        }
        if (param === VENDOR_WEBGL) {
          return 'WebKit';
        }
        if (param === RENDERER_WEBGL) {
          return 'WebKit WebGL';
        }
      } catch {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (origGetParameter as any).apply(this, arguments);
    };

    proto.readPixels = function () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (origReadPixels as any).apply(this, arguments);
      try {
        const pixels = arguments[6];
        if (pixels && pixels instanceof Uint8Array) {
          reportThreat('webgl', 'WebGL readPixels buffer perturbed');
          for (let i = 0; i < pixels.length; i += 4) {
            if (domainRng() < 0.1) {
              pixels[i] = (pixels[i] ^ 1) & 0xff;
            }
          }
        }
      } catch {}
      return res;
    };

    // Standardize shader precision format
    proto.getShaderPrecisionFormat = function () {
      reportThreat('webgl', 'WebGL shader precision format normalized');
      return {
        rangeMin: 127,
        rangeMax: 127,
        precision: 23,
      };
    };
  }

  if (typeof WebGLRenderingContext !== 'undefined') {
    patchWebGL(WebGLRenderingContext.prototype);
  }
  if (typeof WebGL2RenderingContext !== 'undefined') {
    patchWebGL(WebGL2RenderingContext.prototype);
  }

  // ==========================================
  // 3. AUDIOCONTEXT DEFENSE: Acoustic Scrambling
  // ==========================================
  if (typeof AnalyserNode !== 'undefined') {
    const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
    const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;

    AnalyserNode.prototype.getFloatFrequencyData = function (array: Float32Array) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (origGetFloatFreq as any).apply(this, arguments);
      try {
        reportThreat('audio', 'AnalyserNode.getFloatFrequencyData perturbed');
        for (let i = 0; i < array.length; i += 2) {
          if (array[i] !== 0) {
            array[i] += (domainRng() - 0.5) * 0.0001;
          }
        }
      } catch {}
    };

    AnalyserNode.prototype.getByteFrequencyData = function (array: Uint8Array) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (origGetByteFreq as any).apply(this, arguments);
      try {
        reportThreat('audio', 'AnalyserNode.getByteFrequencyData perturbed');
        for (let i = 0; i < array.length; i += 4) {
          if (array[i] > 0) {
            array[i] = (array[i] ^ (domainRng() > 0.5 ? 1 : 0)) & 0xff;
          }
        }
      } catch {}
    };
  }

  if (typeof AudioBuffer !== 'undefined') {
    const origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function (channel: number) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (origGetChannelData as any).apply(this, arguments);
      try {
        reportThreat('audio', `AudioBuffer.getChannelData perturbed (channel ${channel})`);
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] !== 0) {
            data[i] += (domainRng() - 0.5) * 0.0001;
          }
        }
      } catch {}
      return data;
    };

    const origCopyFromChannel = AudioBuffer.prototype.copyFromChannel;
    if (origCopyFromChannel) {
      AudioBuffer.prototype.copyFromChannel = function (
        destination: Float32Array,
        channelNumber: number
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (origCopyFromChannel as any).apply(this, arguments);
        try {
          reportThreat('audio', `AudioBuffer.copyFromChannel perturbed (channel ${channelNumber})`);
          for (let i = 0; i < destination.length; i += 4) {
            if (destination[i] !== 0) {
              destination[i] += (domainRng() - 0.5) * 0.0001;
            }
          }
        } catch {}
      };
    }
  }

  // Hook OfflineAudioContext rendering to ensure completed buffer has mathematical noise
  if (typeof OfflineAudioContext !== 'undefined') {
    const origStartRendering = OfflineAudioContext.prototype.startRendering;
    if (origStartRendering) {
      OfflineAudioContext.prototype.startRendering = function () {
        reportThreat('audio', 'OfflineAudioContext.startRendering intercepted and acoustic buffer cloaked');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (origStartRendering as any).apply(this, arguments).then((buffer: AudioBuffer) => {
          try {
            for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
              const data = buffer.getChannelData(ch);
              for (let i = 0; i < data.length; i += 4) {
                if (data[i] !== 0) {
                  data[i] += (domainRng() - 0.5) * 0.0001;
                }
              }
            }
          } catch {}
          return buffer;
        });
      };
    }
  }

  // ==========================================
  // 4. BATTERY STATUS API DEFENSE
  // ==========================================
  if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
    const fakeBattery = {
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1.0,
      onchargingchange: null,
      onchargingtimechange: null,
      ondischargingtimechange: null,
      onlevelchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };

    try {
      Object.defineProperty(navigator, 'getBattery', {
        value: () => {
          if (batteryShieldEnabled) {
            reportThreat('battery', 'navigator.getBattery() probe cloaked to static 100% plugged-in state');
            return Promise.resolve(fakeBattery);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (navigator as any)._origGetBattery ? (navigator as any)._origGetBattery() : Promise.resolve(fakeBattery);
        },
        configurable: true,
        enumerable: true,
        writable: true,
      });
    } catch {}
  }

  // ==========================================
  // 5. TIMEZONE & DATE SPOOFING ENGINE
  // ==========================================
  if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
    const origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opts = (origResolvedOptions as any).apply(this, arguments);
      if (activeTimezone !== 'system' && TIMEZONE_CONFIGS[activeTimezone]) {
        reportThreat('timezone', `Intl.DateTimeFormat timezone masked to ${TIMEZONE_CONFIGS[activeTimezone].timeZone}`);
        opts.timeZone = TIMEZONE_CONFIGS[activeTimezone].timeZone;
      }
      return opts;
    };
  }

  const origGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function () {
    if (activeTimezone !== 'system' && TIMEZONE_CONFIGS[activeTimezone]) {
      return TIMEZONE_CONFIGS[activeTimezone].offsetMinutes;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origGetTimezoneOffset as any).apply(this, arguments);
  };

  // ==========================================
  // 6. HARDWARE CONCURRENCY, MEMORY & SCREEN DEFENSE
  // ==========================================
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => activeConcurrency,
      configurable: true,
      enumerable: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).deviceMemory) {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
        configurable: true,
        enumerable: true,
      });
    }

    // Client Hints Architecture normalizer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navUaData = (navigator as any).userAgentData;
    if (navUaData && navUaData.getHighEntropyValues) {
      const origGetHighEntropy = navUaData.getHighEntropyValues;
      navUaData.getHighEntropyValues = async function (hints: string[]) {
        const values = await origGetHighEntropy.apply(this, [hints]);
        if (values && typeof values === 'object') {
          reportThreat('hardware', 'Client Hints high-entropy query sanitized');
          if (values.architecture) values.architecture = 'x86';
          if (values.bitness) values.bitness = '64';
          if ('model' in values) values.model = '';
        }
        return values;
      };
    }

    // Prevent window.name cross-site tracking
    let internalWindowName = window.name;
    Object.defineProperty(window, 'name', {
      get: () => internalWindowName,
      set: (val: string) => {
        internalWindowName = val.slice(0, 64);
      },
      configurable: true,
    });
  } catch {
    // Readonly on certain strict engines
  }

  // ==========================================
  // 7. DOMRECT & CLIENTRECTS FONT PROBE DEFENSE
  // ==========================================
  const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rect = (origGetBoundingClientRect as any).apply(this, arguments);
    const delta = (domainRng() - 0.5) * 0.00005;
    try {
      return new DOMRect(
        rect.x + delta,
        rect.y + delta,
        rect.width + delta,
        rect.height + delta
      );
    } catch {
      return rect;
    }
  };

  // ==========================================
  // 8. ABSOLUTE ALLOW RIGHT-CLICK & UNLOCK COPY ENGINE
  // ==========================================
  let allowRightClickEnabled = true;

  function updateAllowRightClickStyles() {
    if (typeof document === 'undefined') return;
    const styleId = 'sentry-allow-right-click-styles';
    let styleEl = document.getElementById(styleId);
    if (allowRightClickEnabled) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
          * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
          }
        `;
        const target = document.head || document.documentElement;
        if (target) target.appendChild(styleEl);
      }
    } else if (styleEl) {
      styleEl.remove();
    }
  }

  function unblockEvents(e: Event) {
    if (!allowRightClickEnabled) return;
    // Stop website scripts from intercepting and cancelling contextmenu / selection / copy
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  const guardedEvents = ['contextmenu', 'selectstart', 'copy', 'cut', 'dragstart'];
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    guardedEvents.forEach((type) => {
      window.addEventListener(type, unblockEvents, true);
      document.addEventListener(type, unblockEvents, true);
    });
  }

  const clearInlineBlockers = () => {
    if (!allowRightClickEnabled || typeof window === 'undefined' || typeof document === 'undefined') return;
    try {
      if (window.oncontextmenu) window.oncontextmenu = null;
      if (document.oncontextmenu) document.oncontextmenu = null;
      if (document.body && document.body.oncontextmenu) document.body.oncontextmenu = null;
      if (document.onselectstart) document.onselectstart = null;
      if (document.oncopy) document.oncopy = null;
      if (document.oncut) document.oncut = null;
      if (document.ondragstart) document.ondragstart = null;
    } catch {}
  };

  clearInlineBlockers();
  updateAllowRightClickStyles();
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      clearInlineBlockers();
      updateAllowRightClickStyles();
    });
  }

  console.info(
    '%c[Sentry AI]%c Complete Defense Matrix Active (Canvas, WebGL, Audio, Battery, Concurrency, Timezone, Allow Right-Click).',
    'color: #38bdf8; font-weight: bold; background: #0b0f19; padding: 2px 6px; border-radius: 4px;',
    'color: #00f0ff;'
  );
})();
export {};

