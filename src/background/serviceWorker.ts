/**
 * Sentry AI Background Service Worker (Manifest V3)
 * Central coordinator for DNR rules, side panel management, threat telemetry, and broker workflows.
 */

import {
  TabThreatStats,
  GlobalPrivacyStats,
  NetworkLogEntry,
  DomainTrackerStat,
} from '../types';
import {
  getSettings,
  applySettings,
  calculateSafetyScore,
  DEFAULT_SETTINGS,
} from './rulesEngine';
import {
  initializeBrokers,
  getAllBrokers,
  updateBrokerStatus,
  scheduleBrokerAlarm,
} from './brokerSync';
import { cleanUrl, cleanUrls } from '../lib/urlCleaner';
import {
  getAllZapRules,
  getDomainZapRules,
  savePersistentZapRule,
  deletePersistentZapRule,
  clearDomainZapRules,
} from '../lib/zapManager';

// In-memory per-tab threat statistics
const tabStatsMap = new Map<number, TabThreatStats>();

// Global privacy ledger stats
let globalStats: GlobalPrivacyStats = {
  totalTrackersBlocked: 0,
  totalFingerprintsScrambled: 0,
  totalAiScrapersBlocked: 0,
  totalElementsZapped: 0,
  totalUrlsCleaned: 0,
  totalParamsStripped: 0,
  totalCookieBannersHandled: 0,
  activeSince: Date.now(),
};

// Load global stats from storage
chrome.storage.local.get(['sentry_global_stats']).then((res) => {
  if (res.sentry_global_stats) {
    globalStats = {
      ...globalStats,
      ...res.sentry_global_stats,
    };
  }
});

function saveGlobalStats() {
  chrome.storage.local.set({ sentry_global_stats: globalStats });
}

function getOrCreateTabStats(tabId: number, url: string = ''): TabThreatStats {
  let stats = tabStatsMap.get(tabId);
  if (!stats) {
    let domain = '';
    try {
      if (url && url.startsWith('http')) {
        domain = new URL(url).hostname;
      }
    } catch {
      domain = '';
    }
    stats = {
      tabId,
      domain,
      url,
      trackersBlocked: 0,
      canvasFaked: 0,
      audioFaked: 0,
      webglFaked: 0,
      aiBeaconsBlocked: 0,
      urlsCleaned: 0,
      paramsStripped: 0,
      safetyScore: 'A+',
      threatEvents: [],
      networkLogs: [],
      connectedDomains: [],
    };
    tabStatsMap.set(tabId, stats);
  }
  return stats;
}

function updateBadge(tabId: number, count: number) {
  if (!chrome.action) return;
  const text = count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: count > 0 ? '#2563eb' : '#64748b',
  });
}

function recordDomainStat(stats: TabThreatStats, targetUrl: string, blocked: boolean) {
  try {
    const targetDomain = new URL(targetUrl).hostname;
    let found = stats.connectedDomains.find((d) => d.domain === targetDomain);
    if (!found) {
      found = {
        domain: targetDomain,
        blockedCount: 0,
        allowedCount: 0,
      };
      stats.connectedDomains.push(found);
    }
    if (blocked) {
      found.blockedCount += 1;
    } else {
      found.allowedCount += 1;
    }
  } catch {
    // Ignore invalid URLs
  }
}

// Reset tab stats on new navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    let domain = '';
    try {
      domain = new URL(tab.url).hostname;
    } catch {
      domain = '';
    }
    tabStatsMap.set(tabId, {
      tabId,
      domain,
      url: tab.url,
      trackersBlocked: 0,
      canvasFaked: 0,
      audioFaked: 0,
      webglFaked: 0,
      aiBeaconsBlocked: 0,
      urlsCleaned: 0,
      paramsStripped: 0,
      safetyScore: 'A+',
      threatEvents: [],
      networkLogs: [],
      connectedDomains: [],
    });
    updateBadge(tabId, 0);
  }
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStatsMap.delete(tabId);
});

// Capture DNR rule matches (dynamic network telemetry logger)
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const tabId = info.request.tabId;
    if (tabId && tabId > 0) {
      const stats = getOrCreateTabStats(tabId, info.request.url);
      stats.trackersBlocked += 1;
      globalStats.totalTrackersBlocked += 1;

      let reqDomain = '';
      try {
        reqDomain = new URL(info.request.url).hostname;
      } catch {
        reqDomain = info.request.url;
      }

      recordDomainStat(stats, info.request.url, true);

      // Add to threat timeline
      stats.threatEvents.unshift({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        type: 'tracker',
        source: reqDomain,
        description: `Blocked telemetry endpoint (DNR Rule #${info.rule.ruleId})`,
      });

      // Add to detailed Network Inspector Log
      const logEntry: NetworkLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        url: info.request.url,
        domain: reqDomain,
        type: info.request.type || 'other',
        action: 'BLOCKED',
        ruleSource: `DNR Rule #${info.rule.ruleId} (${info.rule.rulesetId || 'dynamic'})`,
      };
      stats.networkLogs.unshift(logEntry);

      if (stats.threatEvents.length > 60) stats.threatEvents.pop();
      if (stats.networkLogs.length > 100) stats.networkLogs.pop();

      getSettings().then((settings) => {
        stats.safetyScore = calculateSafetyScore(stats, settings.masterShield);
        const total =
          stats.trackersBlocked +
          stats.canvasFaked +
          stats.audioFaked +
          stats.webglFaked +
          stats.aiBeaconsBlocked;
        updateBadge(tabId, total);
        saveGlobalStats();
      });
    }
  });
}

// Configure Side Panel behavior so clicking the extension action icon opens the side panel directly
if (chrome.sidePanel && (chrome.sidePanel as any).setPanelBehavior) {
  (chrome.sidePanel as any)
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
}

// Fallback action click handler: opens the side panel on toolbar icon click
chrome.action?.onClicked?.addListener(async (tab) => {
  if (tab?.windowId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chrome as any).sidePanel?.open?.({ windowId: tab.windowId });
  }
});

// Track last active web tab to ensure side panels and popups always target the correct page
let lastActiveWebTabId: number | null = null;

function isWebTab(tab?: chrome.tabs.Tab | null): boolean {
  if (!tab || !tab.id || !tab.url) return false;
  return (
    (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
    !tab.url.startsWith('chrome-extension://') &&
    !tab.url.startsWith('chrome://') &&
    !tab.url.startsWith('about:')
  );
}

chrome.tabs?.onActivated?.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (isWebTab(tab)) {
      lastActiveWebTabId = tab.id ?? null;
    }
  } catch {}
});

chrome.tabs?.onUpdated?.addListener((tabId, _changeInfo, tab) => {
  if (tab.active && isWebTab(tab)) {
    lastActiveWebTabId = tabId;
  }
});

/**
 * Resolves the user's active web page tab, ensuring internal extension pages
 * (like sidepanel.html or popup.html) or about:blank are never mistakenly targeted.
 */
async function getTargetWebTab(explicitTabId?: number): Promise<chrome.tabs.Tab | undefined> {
  // 1. If explicit tab provided and is a valid web tab
  if (explicitTabId && explicitTabId > 0) {
    try {
      const tab = await chrome.tabs.get(explicitTabId);
      if (isWebTab(tab)) return tab;
    } catch {}
  }

  // 2. Try the tracked lastActiveWebTabId
  if (lastActiveWebTabId && lastActiveWebTabId > 0) {
    try {
      const tab = await chrome.tabs.get(lastActiveWebTabId);
      if (isWebTab(tab)) return tab;
    } catch {}
  }

  // 3. Try active tab in lastFocusedWindow (standard when clicked from Side Panel or toolbar)
  try {
    const tabsLast = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const validLast = tabsLast.find(isWebTab);
    if (validLast) return validLast;
  } catch {}

  // 4. Try active tab in currentWindow
  try {
    const tabsCurr = await chrome.tabs.query({ active: true, currentWindow: true });
    const validCurr = tabsCurr.find(isWebTab);
    if (validCurr) return validCurr;
  } catch {}

  // 5. Try any active tab in any window
  try {
    const allActive = await chrome.tabs.query({ active: true });
    const webActive = allActive.find(isWebTab);
    if (webActive) return webActive;
  } catch {}

  // 6. Find any open HTTP/HTTPS tab
  try {
    const allTabs = await chrome.tabs.query({});
    const httpTab = allTabs.find(isWebTab);
    if (httpTab) return httpTab;

    // 7. Fallback to any non-extension tab
    return allTabs.find(
      (t) => t.id && t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://') && !t.url.startsWith('about:')
    );
  } catch {}
  return undefined;
}

// Side panel & element zapper keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open_side_panel') {
    const tab = await getTargetWebTab();
    if (tab?.windowId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chrome as any).sidePanel?.open?.({ windowId: tab.windowId });
    }
  } else if (command === 'activate_element_zapper') {
    const tab = await getTargetWebTab();
    if (tab && tab.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/domZapper.js'],
        });
      } catch {}
      chrome.tabs.sendMessage(tab.id, { action: 'ACTIVATE_ZAPPER' }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
  }
});

// Runtime message handler for popup, sidebar, dashboard, and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.action) {
    case 'RECORD_THREAT': {
      if (tabId && tabId > 0) {
        const stats = getOrCreateTabStats(tabId, sender.tab?.url);
        const payload = message.payload;

        if (payload.type === 'canvas') {
          stats.canvasFaked += 1;
          globalStats.totalFingerprintsScrambled += 1;
        } else if (payload.type === 'audio') {
          stats.audioFaked += 1;
          globalStats.totalFingerprintsScrambled += 1;
        } else if (payload.type === 'webgl') {
          stats.webglFaked += 1;
          globalStats.totalFingerprintsScrambled += 1;
        } else if (payload.type === 'domrect' || payload.type === 'battery' || payload.type === 'timezone' || payload.type === 'hardware') {
          stats.canvasFaked += 1;
          globalStats.totalFingerprintsScrambled += 1;
        } else if (payload.type === 'tracker') {
          stats.aiBeaconsBlocked += 1;
          globalStats.totalAiScrapersBlocked += 1;
        } else if (payload.type === 'zapper') {
          globalStats.totalElementsZapped += 1;
        } else if (payload.type === 'cookie_consent') {
          stats.cookieBannersHandled = (stats.cookieBannersHandled || 0) + 1;
          globalStats.totalCookieBannersHandled += 1;
        }

        stats.threatEvents.unshift({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: payload.timestamp || Date.now(),
          type: payload.type,
          source: payload.domain || stats.domain,
          description: payload.detail,
        });

        if (stats.threatEvents.length > 60) {
          stats.threatEvents.pop();
        }

        getSettings().then((settings) => {
          stats.safetyScore = calculateSafetyScore(stats, settings.masterShield);
          const total =
            stats.trackersBlocked +
            stats.canvasFaked +
            stats.audioFaked +
            stats.webglFaked +
            stats.aiBeaconsBlocked;
          updateBadge(tabId, total);
          saveGlobalStats();
        });
      }
      sendResponse({ status: 'recorded' });
      break;
    }

    case 'GET_ACTIVE_TAB_STATS': {
      getTargetWebTab(message.tabId).then((activeTab) => {
        if (activeTab && activeTab.id) {
          const stats = getOrCreateTabStats(activeTab.id, activeTab.url);
          getSettings().then((settings) => {
            sendResponse({
              stats,
              globalStats,
              settings,
            });
          });
        } else {
          sendResponse({
            stats: null,
            globalStats,
            settings: DEFAULT_SETTINGS,
          });
        }
      });
      return true;
    }

    case 'GET_SETTINGS': {
      getSettings().then((settings) => {
        sendResponse(settings);
      });
      return true;
    }

    case 'UPDATE_SETTINGS': {
      applySettings(message.settings).then(() => {
        sendResponse({ status: 'ok' });
      });
      return true;
    }

    case 'OPEN_SIDE_PANEL': {
      getTargetWebTab().then((activeTab) => {
        if (activeTab?.windowId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (chrome as any).sidePanel?.open?.({ windowId: activeTab.windowId });
        }
      });
      sendResponse({ status: 'ok' });
      return true;
    }

    case 'GET_BROKERS': {
      getAllBrokers().then((brokers) => {
        sendResponse(brokers);
      });
      return true;
    }

    case 'UPDATE_BROKER_STATUS': {
      updateBrokerStatus(message.brokerId, message.status).then((brokers) => {
        sendResponse(brokers);
      });
      return true;
    }

    case 'ACTIVATE_ELEMENT_ZAPPER': {
      getTargetWebTab(message.tabId).then(async (activeTab) => {
        if (activeTab && activeTab.id) {
          try {
            await chrome.tabs.update(activeTab.id, { active: true });
            if (activeTab.windowId) {
              await chrome.windows.update(activeTab.windowId, { focused: true });
            }
          } catch {}

          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content/domZapper.js'],
            });
          } catch {
            // Script may already be active or restricted
          }
          chrome.tabs.sendMessage(activeTab.id, { action: 'ACTIVATE_ZAPPER' }, () => {
            if (chrome.runtime.lastError) {
              // Suppress communication errors
            }
          });
          sendResponse({ status: 'ok', tabId: activeTab.id });
        } else {
          sendResponse({ error: 'No active web tab found' });
        }
      });
      return true;
    }

    case 'SAVE_ZAP_RULE': {
      const { domain, selector, description } = message.payload;
      savePersistentZapRule(domain, selector, description).then((rule) => {
        globalStats.totalElementsZapped += 1;
        saveGlobalStats();
        if (tabId && tabId > 0) {
          const stats = getOrCreateTabStats(tabId);
          stats.zappedElementsCount = (stats.zappedElementsCount || 0) + 1;
          stats.threatEvents.unshift({
            id: rule.id,
            timestamp: Date.now(),
            type: 'zapper',
            source: domain,
            description: `Permanent zap rule saved: <${selector}>`,
          });
          if (stats.threatEvents.length > 60) stats.threatEvents.pop();
        }
        sendResponse({ status: 'ok', rule });
      });
      return true;
    }

    case 'GET_ZAP_RULES': {
      if (message.domain) {
        getDomainZapRules(message.domain).then((rules) => {
          sendResponse({ rules });
        });
      } else {
        getAllZapRules().then((allRules) => {
          sendResponse({ allRules });
        });
      }
      return true;
    }

    case 'DELETE_ZAP_RULE': {
      deletePersistentZapRule(message.domain, message.ruleId).then((remaining) => {
        chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'RELOAD_ZAP_RULES' }, () => {
              if (chrome.runtime.lastError) {
                // Ignore
              }
            });
          }
        });
        sendResponse({ status: 'ok', rules: remaining });
      });
      return true;
    }

    case 'CLEAR_DOMAIN_ZAP_RULES': {
      clearDomainZapRules(message.domain).then(() => {
        chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, { action: 'RELOAD_ZAP_RULES' }, () => {
              if (chrome.runtime.lastError) {
                // Ignore
              }
            });
          }
        });
        sendResponse({ status: 'ok' });
      });
      return true;
    }

    case 'CLEAN_URL': {
      const result = cleanUrl(message.url, message.options);
      if (result.hasChanged) {
        globalStats.totalUrlsCleaned += 1;
        globalStats.totalParamsStripped += result.strippedParams.length;
        saveGlobalStats();
      }
      sendResponse(result);
      return true;
    }

    case 'CLEAN_URLS': {
      const results = cleanUrls(message.urls, message.options);
      let newCleaned = 0;
      let newStripped = 0;
      for (const r of results) {
        if (r.hasChanged) {
          newCleaned += 1;
          newStripped += r.strippedParams.length;
        }
      }
      if (newCleaned > 0) {
        globalStats.totalUrlsCleaned += newCleaned;
        globalStats.totalParamsStripped += newStripped;
        saveGlobalStats();
      }
      sendResponse(results);
      return true;
    }

    case 'CLEAR_TAB_LOGS': {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
        if (activeTab && activeTab.id) {
          const stats = tabStatsMap.get(activeTab.id);
          if (stats) {
            stats.networkLogs = [];
            stats.threatEvents = [];
          }
        }
        sendResponse({ status: 'cleared' });
      });
      return true;
    }

    default:
      sendResponse({ error: 'Unknown action' });
      break;
  }
});

// Context Menu: Setup & Event Handlers (ClearURLs & Element Zapper feature)
function setupContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'sentry-copy-clean-link',
      title: 'Copy Clean Link (Sentry AI)',
      contexts: ['link'],
    });
    chrome.contextMenus.create({
      id: 'sentry-open-clean-link',
      title: 'Open Clean Link in New Tab',
      contexts: ['link'],
    });
    chrome.contextMenus.create({
      id: 'sentry-zap-page',
      title: 'Zap Elements on this Page (Sentry AI)',
      contexts: ['page', 'image', 'video'],
    });
  });
}

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'sentry-zap-page') {
    const targetTab = tab?.id ? tab : await getTargetWebTab();
    if (targetTab && targetTab.id) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          files: ['content/domZapper.js'],
        });
      } catch {}
      chrome.tabs.sendMessage(targetTab.id, { action: 'ACTIVATE_ZAPPER' }, () => {
        if (chrome.runtime.lastError) {}
      });
    }
    return;
  }

  if (!info.linkUrl) return;
  const cleanRes = cleanUrl(info.linkUrl);

  if (info.menuItemId === 'sentry-copy-clean-link') {
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (text: string) => {
          navigator.clipboard.writeText(text);
        },
        args: [cleanRes.cleanedUrl],
      }).catch(() => {});
    }
  } else if (info.menuItemId === 'sentry-open-clean-link') {
    chrome.tabs.create({ url: cleanRes.cleanedUrl, active: false });
  }

  if (cleanRes.hasChanged) {
    globalStats.totalUrlsCleaned += 1;
    globalStats.totalParamsStripped += cleanRes.strippedParams.length;
    saveGlobalStats();

    if (tab?.id) {
      const stats = getOrCreateTabStats(tab.id, tab.url);
      stats.urlsCleaned = (stats.urlsCleaned || 0) + 1;
      stats.paramsStripped = (stats.paramsStripped || 0) + cleanRes.strippedParams.length;
      let host = 'link';
      try {
        host = new URL(cleanRes.originalUrl).hostname;
      } catch {
        // fallback
      }
      stats.threatEvents.unshift({
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        type: 'url_cleaner',
        source: host,
        description: `Link Scrubbed: Removed ${cleanRes.strippedParams.length} tracker parameter(s) [${cleanRes.strippedParams.slice(0, 3).join(', ')}]`,
      });
      saveGlobalStats();
    }
  }
});

// Extension install / update lifecycle
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Sentry AI] Extension initialized.');
  if (chrome.sidePanel && (chrome.sidePanel as any).setPanelBehavior) {
    (chrome.sidePanel as any)
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(() => {});
  }
  setupContextMenus();
  const settings = await getSettings();
  await applySettings(settings);
  await initializeBrokers();
  scheduleBrokerAlarm();
});
