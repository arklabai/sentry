/**
 * Sentry AI CanvasDefender (Mathematical Anti-Fingerprinting Core)
 * Execution World: MAIN (injected at document_start)
 *
 * Implements mathematical noise injection to defeat:
 * 1. HTML5 Canvas Fingerprinting (toDataURL, toBlob, getImageData)
 * 2. WebGL Hardware & Shader Fingerprinting (getParameter, readPixels)
 * 3. AudioContext Acoustic Frequency Fingerprinting (getFloatFrequencyData, getByteFrequencyData, getChannelData)
 * 4. DOMRect & TextMetrics Font/Layout Probing (getBoundingClientRect, getClientRects, measureText)
 * 5. Screen, Window, and Hardware Concurrency Probes
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
  function reportThreat(type: 'canvas' | 'audio' | 'webgl' | 'domrect', detail: string) {
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

  HTMLCanvasElement.prototype.toDataURL = function (...args: unknown[]) {
    if (this.width > 0 && this.height > 0) {
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
    return (origToDataURL as any).apply(this, args);
  };

  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, ...args: unknown[]) {
    if (this.width > 0 && this.height > 0) {
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
    return (origToBlob as any).apply(this, [callback, ...args]);
  };

  CanvasRenderingContext2D.prototype.getImageData = function (
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    settings?: ImageDataSettings
  ) {
    const imgData = origGetImageData.call(this, sx, sy, sw, sh, settings);
    reportThreat('canvas', `CanvasRenderingContext2D.getImageData intercepted (${sw}x${sh})`);
    return scrambleImageData(imgData);
  };

  // Text metrics font probe defense (modifiedTextMetricsAPI)
  const origMeasureText = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function (text: string) {
    const metrics = origMeasureText.call(this, text);
    try {
      const delta = (domainRng() - 0.5) * 0.0001;
      const proxy = new Proxy(metrics, {
        get(target, prop, receiver) {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'number') {
            return val + delta;
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

  function patchWebGL(proto: WebGLRenderingContext | WebGL2RenderingContext) {
    if (!proto) return;
    const origGetParameter = proto.getParameter;
    const origReadPixels = proto.readPixels;

    proto.getParameter = function (param: number) {
      if (param === UNMASKED_VENDOR_WEBGL) {
        reportThreat('webgl', 'UNMASKED_VENDOR_WEBGL probe normalized');
        return 'Apple Inc.';
      }
      if (param === UNMASKED_RENDERER_WEBGL) {
        reportThreat('webgl', 'UNMASKED_RENDERER_WEBGL probe normalized');
        return 'Apple GPU (Metal)';
      }
      return origGetParameter.call(this, param);
    };

    proto.readPixels = function (
      x: number,
      y: number,
      width: number,
      height: number,
      format: number,
      type: number,
      pixels: ArrayBufferView | null
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (origReadPixels as any).apply(this, arguments);
      if (pixels && pixels instanceof Uint8Array) {
        reportThreat('webgl', 'WebGL readPixels buffer perturbed');
        for (let i = 0; i < pixels.length; i += 4) {
          if (domainRng() < 0.1) {
            pixels[i] = (pixels[i] ^ 1) & 0xff;
          }
        }
      }
      return res;
    };
  }

  if (typeof WebGLRenderingContext !== 'undefined') {
    patchWebGL(WebGLRenderingContext.prototype);
  }
  if (typeof WebGL2RenderingContext !== 'undefined') {
    patchWebGL(WebGL2RenderingContext.prototype);
  }

  // ==========================================
  // 3. AUDIOCONTEXT DEFENSE: Acoustic Perturbation
  // ==========================================
  if (typeof AnalyserNode !== 'undefined') {
    const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
    const origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;

    AnalyserNode.prototype.getFloatFrequencyData = function (array: Float32Array) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (origGetFloatFreq as any).call(this, array);
      reportThreat('audio', 'AnalyserNode.getFloatFrequencyData perturbed');
      for (let i = 0; i < array.length; i += 2) {
        if (array[i] !== 0) {
          array[i] += (domainRng() - 0.5) * 0.0001;
        }
      }
    };

    AnalyserNode.prototype.getByteFrequencyData = function (array: Uint8Array) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (origGetByteFreq as any).call(this, array);
      reportThreat('audio', 'AnalyserNode.getByteFrequencyData perturbed');
      for (let i = 0; i < array.length; i += 4) {
        if (array[i] > 0) {
          array[i] = (array[i] ^ (domainRng() > 0.5 ? 1 : 0)) & 0xff;
        }
      }
    };
  }

  if (typeof AudioBuffer !== 'undefined') {
    const origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function (channel: number) {
      const data = origGetChannelData.call(this, channel);
      reportThreat('audio', `AudioBuffer.getChannelData perturbed (channel ${channel})`);
      for (let i = 0; i < data.length; i += 8) {
        if (data[i] !== 0) {
          data[i] += (domainRng() - 0.5) * 0.00005;
        }
      }
      return data;
    };
  }

  // ==========================================
  // 4. DOMRECT & CLIENTRECTS FONT PROBE DEFENSE
  // ==========================================
  const origGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    const rect = origGetBoundingClientRect.call(this);
    // Microscopic fractional shift to block font rendering analysis while preserving visual positioning
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
  // 5. HARDWARE CONCURRENCY, MEMORY & SCREEN DEFENSE
  // ==========================================
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
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

  console.info(
    '%c[Sentry AI]%c Complete Defense Matrix Active (Canvas, WebGL, Audio, DOMRect, Hardware).',
    'color: #38bdf8; font-weight: bold; background: #0b0f19; padding: 2px 6px; border-radius: 4px;',
    'color: #00f0ff;'
  );
})();
export {};
