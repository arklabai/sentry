/**
 * Sentry AI Rules Engine & Safety Score Evaluator
 * Integrates comprehensive traffic matrix filtering and entropy protection.
 */

import { PrivacySettings, SafetyGrade, TabThreatStats } from '../types';
import { toggleStaticRulesets, updateDomainRules } from '../lib/dnrHelpers';

export const DEFAULT_SETTINGS: PrivacySettings = {
  masterShield: true,
  mode: 'balanced',

  // Quick toggles
  canvasShield: true,
  audioShield: true,
  webglShield: true,
  fontShield: true,
  aiScraperShield: true,
  elementZapperEnabled: true,
  whitelistedDomains: [],
  customRules: [],

  // Full CanvasBlocker Engine Settings
  canvasBlocker: {
    canvasMode: 'fake',
    canvasNoiseLevel: 'minimal',
    ignoreFrequentColors: true,
    fakeAlphaChannel: false,

    webglMode: 'fake',
    webglMaskVendor: true,
    webglMaskRenderer: true,
    webglPerturbPixels: true,

    audioMode: 'fake',
    audioNoiseLevel: 'minimal',

    domRectShield: true,
    textMetricsShield: true,
    navigatorHardwareShield: true,
    screenResolutionShield: true,
    windowNameShield: true,
    historyLengthShield: true,
    gpuProfile: 'intel_uhd',
    batteryShield: true,
    timezoneSpoof: 'system',
    hardwareConcurrencyValue: 4,
    visibilityShield: false,
  },

  // Full Dynamic Traffic Matrix Engine Settings
  uBlock: {
    matrix: {
      firstPartyScripts: 'allow',
      thirdPartyScripts: 'block',
      firstPartyFrames: 'allow',
      thirdPartyFrames: 'noop',
      thirdPartyCookies: 'noop',
      inlineScripts: 'noop',
      images: 'allow',
      webSockets: 'noop',
    },
    cosmeticFiltering: true,
    blockCookieBanners: true,
    blockThirdPartyCookies: false,
    blockPopups: true,
    blockMedia: false,
    strictBlocking: false,
    filterLists: [
      {
        id: 'sentry_ai_core',
        name: 'Sentry AI Harvester & Crawler Shield',
        category: 'AI Defense',
        count: 5240,
        enabled: true,
        lastUpdated: 'Today',
      },
      {
        id: 'easyprivacy',
        name: 'EasyPrivacy (Tracking & Telemetry Protection)',
        category: 'Privacy',
        count: 45180,
        enabled: true,
        lastUpdated: 'Today',
      },
      {
        id: 'easylist',
        name: 'EasyList Standard (Ad Blocking)',
        category: 'Ad Blocking',
        count: 78920,
        enabled: true,
        lastUpdated: 'Yesterday',
      },
      {
        id: 'peterlowe',
        name: "Peter Lowe's Ad & Tracking Server List",
        category: 'Malware & Ads',
        count: 3820,
        enabled: true,
        lastUpdated: '3 days ago',
      },
      {
        id: 'adguard_tracking',
        name: 'AdGuard URL Tracking Protection',
        category: 'Privacy',
        count: 26400,
        enabled: true,
        lastUpdated: 'Yesterday',
      },
      {
        id: 'fanboy_annoyance',
        name: "Fanboy's Cookie Notice & Modal Shield",
        category: 'Annoyances',
        count: 18450,
        enabled: true,
        lastUpdated: '4 days ago',
      },
    ],
    customFilters: [
      '! Custom user filters',
      '||google-analytics.com^$third-party',
      '||connect.facebook.net^$third-party',
      '##div[class*="cookie-banner"]',
    ],
  },

  // Full Anti-AI Training Layer Settings
  aiDefense: {
    aiScraperShield: true,
    gpcHeader: true,
    antiAiHeaders: true,
    metaTrainingLock: true,
    xGrokTrainingLock: true,
    googleGeminiLock: true,
    linkedInTrainingLock: true,
  },

  // Full URL Cleaner & Link Guard Settings (ClearURLs Integration)
  urlCleaner: {
    enabled: true,
    stripMarketingParams: true,
    stripReferralTokens: true,
    blockHyperlinkPings: true,
    unwrapRedirects: true,
    sanitizeHistoryApi: true,
    bypassSearchRedirection: true,
  },

  // Universal Cookie Consent Guard (Auto-Reject & Suppress All Sites)
  cookieConsent: {
    enabled: true,
    autoMode: 'auto_reject',
    hideBanners: true,
    autoUnlockScroll: true,
    totalBannersHandled: 0,
  },
};

/**
 * Calculates current page safety grade based on intercepted surveillance threats
 */
export function calculateSafetyScore(
  stats: TabThreatStats,
  masterShield: boolean
): SafetyGrade {
  if (!masterShield) return 'F';

  const totalThreats =
    stats.trackersBlocked +
    stats.canvasFaked +
    stats.audioFaked +
    stats.webglFaked +
    stats.aiBeaconsBlocked +
    (stats.urlsCleaned || 0);

  if (totalThreats === 0) return 'A+';
  if (totalThreats <= 3) return 'A';
  if (totalThreats <= 8) return 'B';
  if (totalThreats <= 15) return 'C';
  if (totalThreats <= 25) return 'D';
  return 'F';
}

/**
 * Persists and applies settings changes across DNR and content scripts
 */
export async function applySettings(settings: PrivacySettings): Promise<void> {
  await chrome.storage.local.set({ sentry_settings: settings });

  // Update static rulesets based on master toggle & url cleaner toggle
  await toggleStaticRulesets(settings.masterShield, settings.urlCleaner?.enabled !== false);

  // Update dynamic whitelist rules
  await updateDomainRules(settings.whitelistedDomains);

  // Dynamic matrix rule updates for 3rd-party scripts and frames
  if (chrome.declarativeNetRequest) {
    const MATRIX_RULE_BASE = 30000;
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules
      .filter((r) => r.id >= MATRIX_RULE_BASE && r.id < MATRIX_RULE_BASE + 20)
      .map((r) => r.id);

    const addRules: chrome.declarativeNetRequest.Rule[] = [];

    if (settings.masterShield && settings.uBlock?.matrix) {
      if (settings.uBlock.matrix.thirdPartyScripts === 'block') {
        addRules.push({
          id: MATRIX_RULE_BASE + 1,
          priority: 5,
          action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
          condition: {
            domainType: chrome.declarativeNetRequest.DomainType.THIRD_PARTY,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
            excludedRequestDomains: ['challenges.cloudflare.com', 'hcaptcha.com', 'recaptcha.net'],
          },
        });
      }

      if (settings.uBlock.matrix.thirdPartyFrames === 'block') {
        addRules.push({
          id: MATRIX_RULE_BASE + 2,
          priority: 5,
          action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
          condition: {
            domainType: chrome.declarativeNetRequest.DomainType.THIRD_PARTY,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.SUB_FRAME],
            excludedRequestDomains: ['challenges.cloudflare.com', 'hcaptcha.com', 'recaptcha.net'],
          },
        });
      }

      if (settings.uBlock.matrix.webSockets === 'block') {
        addRules.push({
          id: MATRIX_RULE_BASE + 3,
          priority: 5,
          action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
          condition: {
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.WEBSOCKET],
          },
        });
      }

      if (settings.uBlock.blockThirdPartyCookies || settings.uBlock.matrix?.thirdPartyCookies === 'block') {
        addRules.push({
          id: MATRIX_RULE_BASE + 4,
          priority: 4,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: 'cookie',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
            ],
            responseHeaders: [
              {
                header: 'set-cookie',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
            ],
          },
          condition: {
            domainType: chrome.declarativeNetRequest.DomainType.THIRD_PARTY,
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.SCRIPT,
              chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
              chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
              chrome.declarativeNetRequest.ResourceType.IMAGE,
              chrome.declarativeNetRequest.ResourceType.OTHER,
            ],
          },
        });
      }
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  }
}

/**
 * Loads privacy settings with fallback to defaults
 */
export async function getSettings(): Promise<PrivacySettings> {
  const result = await chrome.storage.local.get('sentry_settings');
  if (!result.sentry_settings) return DEFAULT_SETTINGS;

  // Deep merge to ensure all privacy engine keys exist
  return {
    ...DEFAULT_SETTINGS,
    ...result.sentry_settings,
    canvasBlocker: {
      ...DEFAULT_SETTINGS.canvasBlocker,
      ...(result.sentry_settings.canvasBlocker || {}),
    },
    uBlock: {
      ...DEFAULT_SETTINGS.uBlock,
      ...(result.sentry_settings.uBlock || {}),
      matrix: {
        ...DEFAULT_SETTINGS.uBlock.matrix,
        ...(result.sentry_settings.uBlock?.matrix || {}),
      },
    },
    aiDefense: {
      ...DEFAULT_SETTINGS.aiDefense,
      ...(result.sentry_settings.aiDefense || {}),
    },
    urlCleaner: {
      ...DEFAULT_SETTINGS.urlCleaner,
      ...(result.sentry_settings.urlCleaner || {}),
    },
  };
}
