/**
 * Sentry AI DeclarativeNetRequest (DNR) Helper
 * Manages dynamic and session rules for whitelisting and user-level overrides
 */

const DYNAMIC_RULE_ID_BASE = 20000;

/**
 * Updates dynamic rules to whitelist or blacklist specific hostnames
 */
export async function updateDomainRules(whitelistedDomains: string[]): Promise<void> {
  if (!chrome.declarativeNetRequest) return;

  // Retrieve existing dynamic rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules
    .filter((r) => r.id >= DYNAMIC_RULE_ID_BASE)
    .map((r) => r.id);

  // Build new allow rules for whitelisted domains
  const addRules: chrome.declarativeNetRequest.Rule[] = whitelistedDomains.map(
    (domain, index) => ({
      id: DYNAMIC_RULE_ID_BASE + index,
      priority: 10, // Higher priority than static block rules
      action: {
        type: 'allow' as chrome.declarativeNetRequest.RuleActionType,
      },
      condition: {
        initiatorDomains: [domain],
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'csp_report',
          'media',
          'websocket',
          'other',
        ] as chrome.declarativeNetRequest.ResourceType[],
      },
    })
  );

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
}

/**
 * Toggles static rulesets on/off (e.g. when Master Shield is toggled)
 */
export async function toggleStaticRulesets(
  enable: boolean,
  urlCleanerEnabled: boolean = true
): Promise<void> {
  if (!chrome.declarativeNetRequest) return;

  const enableIds: string[] = [];
  const disableIds: string[] = [];

  if (enable) {
    enableIds.push('rules_ai_trackers', 'rules_privacy_headers');
    if (urlCleanerEnabled) {
      enableIds.push('rules_url_cleaner');
    } else {
      disableIds.push('rules_url_cleaner');
    }
  } else {
    disableIds.push('rules_ai_trackers', 'rules_privacy_headers', 'rules_url_cleaner');
  }

  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enableIds,
    disableRulesetIds: disableIds,
  });
}
