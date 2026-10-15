import React, { useEffect, useState } from 'react';
import {
  HiOutlineShieldCheck,
  HiShieldCheck,
  HiShieldExclamation,
  HiAdjustmentsHorizontal,
  HiCircleStack,
  HiCpuChip,
  HiFunnel,
  HiChartBar,
  HiLockClosed,
  HiLockOpen,
  HiKey,
  HiCheckCircle,
  HiClock,
  HiExclamationTriangle,
  HiPaperAirplane,
  HiArrowTopRightOnSquare,
  HiMagnifyingGlass,
  HiDocumentText,
  HiTrash,
  HiPlus,
  HiArrowPath,
  HiClipboardDocument,
  HiCheck,
  HiSun,
  HiMoon,
  HiComputerDesktop,
  HiXMark,
  HiLink,
  HiSparkles,
  HiArrowDownTray,
  HiArrowRight,
  HiBolt,
} from 'react-icons/hi2';
import {
  BrokerEntry,
  BrokerCategory,
  OptOutStatus,
  PrivacySettings,
  GlobalPrivacyStats,
  UserProfile,
  EncryptedVault,
  ThreatEvent,
  CleanUrlResult,
  ZapRule,
} from '../types';
import { cleanUrl, cleanUrls } from '../lib/urlCleaner';
import { encryptProfile, decryptProfile } from '../lib/crypto';
import brokerListJson from '../lib/brokerList.json';
import SentryShieldLogo from '../components/SentryShieldLogo';
import { useTheme } from '../hooks/useTheme';

type ActiveTab = 'brokers' | 'ai-shield' | 'matrix' | 'ledger' | 'cleaner';

interface ParameterEntry {
  name: string;
  category: 'analytics' | 'clicks' | 'platforms' | 'redirects';
  badge: string;
  company: string;
  desc: string;
}

const TRACKING_DICTIONARY: ParameterEntry[] = [
  {
    name: 'utm_source / utm_medium / utm_campaign',
    category: 'analytics',
    badge: 'Marketing',
    company: 'Google / Adobe Analytics',
    desc: 'Surveillance tags tracking campaigns, traffic origins, referral mediums, and A/B test variations across third-party websites.',
  },
  {
    name: 'utm_term / utm_content / utm_id',
    category: 'analytics',
    badge: 'Marketing',
    company: 'Google Analytics',
    desc: 'Paid search keyword identifiers and creative variation tags linking clicks to specific advertising placements.',
  },
  {
    name: '_ga / _gl / _hsenc / _hsmi',
    category: 'analytics',
    badge: 'Cross-Domain',
    company: 'Google / HubSpot',
    desc: 'Session linking tokens that track individual identities across separate root domains and third-party checkout flows.',
  },
  {
    name: 'fbclid',
    category: 'clicks',
    badge: 'AdTech',
    company: 'Meta (Facebook & Instagram)',
    desc: 'Unique 128-bit click identifier appended to all outbound links from Meta apps to tie external conversions to your Facebook profile.',
  },
  {
    name: 'gclid / gbraid / wbraid',
    category: 'clicks',
    badge: 'AdTech',
    company: 'Google Ads & DoubleClick',
    desc: 'Encrypted tracking tokens linking ad clicks to conversions, actively designed to bypass browser anti-tracking protections.',
  },
  {
    name: 'msclkid',
    category: 'clicks',
    badge: 'AdTech',
    company: 'Microsoft / Bing Ads',
    desc: 'Microsoft Advertising Click ID tracking conversion events and linking user activity across Microsoft properties.',
  },
  {
    name: 'twclid / ttclid',
    category: 'clicks',
    badge: 'AdTech',
    company: 'Twitter/X & TikTok',
    desc: 'First-party conversion tracking identifiers injected into link clicks to circumvent third-party cookie restrictions.',
  },
  {
    name: 'yclid',
    category: 'clicks',
    badge: 'AdTech',
    company: 'Yandex Direct',
    desc: 'Yandex advertising click identifier used for attribution and browser fingerprint linkage.',
  },
  {
    name: 'li_fat_id',
    category: 'clicks',
    badge: 'AdTech',
    company: 'LinkedIn Insight Tag',
    desc: 'LinkedIn advertising tag matching external web visits back to professional member profiles.',
  },
  {
    name: 'igshid',
    category: 'clicks',
    badge: 'Social',
    company: 'Instagram Share',
    desc: 'Instagram Share ID tracking viral transmission paths and interpersonal communication graphs.',
  },
  {
    name: 'ref_ / pd_rd_* / pf_rd_*',
    category: 'platforms',
    badge: 'Retail',
    company: 'Amazon',
    desc: 'Internal product browsing session history, affiliate referral tags, and personalized product recommendation identifiers.',
  },
  {
    name: 'si',
    category: 'platforms',
    badge: 'Social',
    company: 'YouTube / Alphabet',
    desc: 'Source identifier embedded in video share links to track user sharing graphs across messaging apps.',
  },
  {
    name: 'mc_eid / mc_cid / mkt_tok',
    category: 'analytics',
    badge: 'CRM',
    company: 'Mailchimp / Marketo / Klaviyo',
    desc: 'Direct email subscriber tracking keys unmasking anonymous browsing sessions to an exact email address upon arrival.',
  },
  {
    name: 'google.com/url?q=...',
    category: 'redirects',
    badge: 'Search',
    company: 'Google Search Redirector',
    desc: 'Intermediary tracking gateway logging user click timestamps and search query intents before redirecting.',
  },
  {
    name: 'facebook.com/l.php?u=...',
    category: 'redirects',
    badge: 'Social',
    company: 'Facebook Link Shim',
    desc: 'Intermediate redirect wrapper monitoring external link clicks and manipulating HTTP Referer headers.',
  },
  {
    name: '<a ping="...">',
    category: 'redirects',
    badge: 'Beacon',
    company: 'W3C Hyperlink Auditing',
    desc: 'Asynchronous POST request beacons transmitted behind the scenes whenever a link is clicked, reporting IP and timestamps.',
  },
];

export default function Dashboard() {
  const { themeMode, isDark, cycleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('brokers');
  const [brokers, setBrokers] = useState<BrokerEntry[]>([]);
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalPrivacyStats | null>(null);
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Broker search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Vault state
  const [isVaultLocked, setIsVaultLocked] = useState(true);
  const [vaultPassphrase, setVaultPassphrase] = useState('');
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    primaryEmail: '',
    secondaryEmails: [],
    phone: '',
    cityState: '',
    country: 'United States',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const [vaultError, setVaultError] = useState('');
  const [vaultSavedNotice, setVaultSavedNotice] = useState(false);

  // Selected broker for legal dispatch modal
  const [selectedBroker, setSelectedBroker] = useState<BrokerEntry | null>(null);
  const [dispatchType, setDispatchType] = useState<'ccpa' | 'gdpr'>('ccpa');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // New whitelist domain input
  const [newWhitelistDomain, setNewWhitelistDomain] = useState('');

  // Persistent Zap Rules Manager state
  const [allZapRules, setAllZapRules] = useState<Record<string, ZapRule[]>>({});
  const [newZapDomain, setNewZapDomain] = useState('');
  const [newZapSelector, setNewZapSelector] = useState('');

  const loadZapRules = () => {
    chrome.runtime.sendMessage({ action: 'GET_ZAP_RULES' }, (res) => {
      if (res?.allRules) {
        setAllZapRules(res.allRules);
      }
    });
  };

  useEffect(() => {
    loadZapRules();
  }, []);

  const handleDeleteZapRule = (domain: string, ruleId: string) => {
    chrome.runtime.sendMessage({ action: 'DELETE_ZAP_RULE', domain, ruleId }, () => {
      loadZapRules();
    });
  };

  const handleAddManualZapRule = () => {
    if (!newZapDomain.trim() || !newZapSelector.trim()) return;
    chrome.runtime.sendMessage(
      {
        action: 'SAVE_ZAP_RULE',
        payload: {
          domain: newZapDomain.trim().toLowerCase(),
          selector: newZapSelector.trim(),
          description: `Manual zap rule: <${newZapSelector.trim()}>`,
        },
      },
      () => {
        setNewZapDomain('');
        setNewZapSelector('');
        loadZapRules();
      }
    );
  };

  // URL Cleaner interactive single purifier state
  const [cleanerInput, setCleanerInput] = useState(
    'https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1?keywords=keyboard&qid=1610000000&sr=8-1&utm_source=twitter&fbclid=IwAR29182xyz'
  );
  const [cleanerResult, setCleanerResult] = useState<CleanUrlResult | null>(() => {
    return cleanUrl(
      'https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1?keywords=keyboard&qid=1610000000&sr=8-1&utm_source=twitter&fbclid=IwAR29182xyz'
    );
  });
  const [copiedCleanLink, setCopiedCleanLink] = useState(false);

  // Batch Multi-URL Scrubber state
  const [batchInput, setBatchInput] = useState(
    `https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1?keywords=keyboard&qid=1610000000&sr=8-1
https://www.youtube.com/watch?v=dQw4w9WgXcQ?si=trackingToken987
https://www.google.com/url?q=https://example.com/target-page&sa=D&sntz=1
https://shop.example.com/sale?utm_source=facebook&utm_medium=cpc&utm_campaign=summer&fbclid=IwAR0987xyz
https://news.ycombinator.com/item?id=123456`
  );
  const [batchResults, setBatchResults] = useState<CleanUrlResult[] | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);

  // Parameter dictionary explorer search & category
  const [paramSearch, setParamSearch] = useState('');
  const [selectedParamCategory, setSelectedParamCategory] = useState<
    'all' | 'analytics' | 'clicks' | 'platforms' | 'redirects'
  >('all');

  // Fetch initial data
  useEffect(() => {
    // 1. Fetch brokers
    chrome.runtime.sendMessage({ action: 'GET_BROKERS' }, (res) => {
      if (res) setBrokers(res);
    });

    // 2. Fetch settings & stats
    chrome.runtime.sendMessage({ action: 'GET_ACTIVE_TAB_STATS' }, (res) => {
      if (res) {
        setSettings(res.settings);
        setGlobalStats(res.globalStats);
        if (res.stats && res.stats.threatEvents) {
          setThreatEvents(res.stats.threatEvents);
        }
      }
      setLoading(false);
    });

    // 3. Check for existing encrypted vault
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['sentry_profile_vault'], (res) => {
        if (!res?.sentry_profile_vault) {
          setIsVaultLocked(false); // First time setup: allow entering profile
        }
      });
    } else {
      const stored = localStorage.getItem('sentry_profile_vault');
      if (!stored) {
        setIsVaultLocked(false);
      }
    }
  }, []);

  // Vault unlock handler
  const handleUnlockVault = async () => {
    setVaultError('');
    try {
      let vault: EncryptedVault | null = null;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const res = await chrome.storage.local.get(['sentry_profile_vault']);
        vault = res?.sentry_profile_vault;
      } else {
        const raw = localStorage.getItem('sentry_profile_vault');
        vault = raw ? JSON.parse(raw) : null;
      }
      if (!vault) {
        setIsVaultLocked(false);
        return;
      }
      const decrypted = await decryptProfile(vault, vaultPassphrase);
      setProfile(decrypted);
      setIsVaultLocked(false);
    } catch (err: unknown) {
      setVaultError(
        err instanceof Error ? err.message : 'Failed to decrypt vault with provided passphrase.'
      );
    }
  };

  // Vault save handler
  const handleSaveVault = async () => {
    setVaultError('');
    if (!vaultPassphrase || vaultPassphrase.length < 6) {
      setVaultError('Passphrase must be at least 6 characters for AES-256 derivation.');
      return;
    }
    try {
      const updatedProfile = { ...profile, updatedAt: Date.now() };
      const vault = await encryptProfile(updatedProfile, vaultPassphrase);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ sentry_profile_vault: vault });
      } else {
        localStorage.setItem('sentry_profile_vault', JSON.stringify(vault));
      }
      setProfile(updatedProfile);
      setVaultSavedNotice(true);
      setTimeout(() => setVaultSavedNotice(false), 3000);
    } catch (err: unknown) {
      setVaultError('Error encrypting and storing profile.');
    }
  };

  // Update broker status
  const handleStatusChange = (brokerId: string, status: OptOutStatus) => {
    chrome.runtime.sendMessage(
      { action: 'UPDATE_BROKER_STATUS', brokerId, status },
      (updatedBrokers) => {
        if (updatedBrokers) setBrokers(updatedBrokers);
      }
    );
  };

  // Whitelist domain handler
  const handleAddWhitelist = () => {
    if (!newWhitelistDomain.trim() || !settings) return;
    const cleanDomain = newWhitelistDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!settings.whitelistedDomains.includes(cleanDomain)) {
      const updated = {
        ...settings,
        whitelistedDomains: [...settings.whitelistedDomains, cleanDomain],
      };
      setSettings(updated);
      chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
    }
    setNewWhitelistDomain('');
  };

  const handleRemoveWhitelist = (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      whitelistedDomains: settings.whitelistedDomains.filter((d) => d !== domain),
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  // URL Cleaner Settings & Actions
  const handleToggleUrlCleanerSetting = <K extends keyof PrivacySettings['urlCleaner']>(
    key: K,
    val?: boolean
  ) => {
    if (!settings) return;
    const currentVal = settings.urlCleaner?.[key] ?? true;
    const nextVal = typeof val === 'boolean' ? val : !currentVal;
    const updated: PrivacySettings = {
      ...settings,
      urlCleaner: {
        ...(settings.urlCleaner || {
          enabled: true,
          stripMarketingParams: true,
          stripReferralTokens: true,
          blockHyperlinkPings: true,
          unwrapRedirects: true,
          sanitizeHistoryApi: true,
          bypassSearchRedirection: true,
        }),
        [key]: nextVal,
      },
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  const handleCleanSingleUrl = (url: string) => {
    setCleanerInput(url);
    if (!url.trim()) {
      setCleanerResult(null);
      return;
    }
    const res = cleanUrl(url, settings?.urlCleaner);
    setCleanerResult(res);
  };

  const handleCopySingleCleanUrl = () => {
    if (!cleanerResult?.cleanedUrl) return;
    navigator.clipboard.writeText(cleanerResult.cleanedUrl);
    setCopiedCleanLink(true);
    setTimeout(() => setCopiedCleanLink(false), 2000);
  };

  const handleProcessBatch = () => {
    if (!batchInput.trim()) return;
    chrome.runtime.sendMessage(
      { action: 'CLEAN_URLS', urls: batchInput, options: settings?.urlCleaner },
      (results) => {
        if (results && Array.isArray(results)) {
          setBatchResults(results);
        } else {
          setBatchResults(cleanUrls(batchInput, settings?.urlCleaner));
        }
      }
    );
  };

  const handleCopyAllBatch = () => {
    if (!batchResults || batchResults.length === 0) return;
    const text = batchResults.map((r) => r.cleanedUrl).join('\n');
    navigator.clipboard.writeText(text);
    setBatchCopied(true);
    setTimeout(() => setBatchCopied(false), 2000);
  };

  const handleDownloadBatch = () => {
    if (!batchResults || batchResults.length === 0) return;
    const text = batchResults.map((r) => r.cleanedUrl).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentry-clean-urls-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter brokers
  const filteredBrokers = brokers.filter((b) => {
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalBrokersCount = brokers.length || 18;
  const removedCount = brokers.filter((b) => b.status === 'Removed').length;

  // Prepare email template text
  const getPreparedEmail = () => {
    if (!selectedBroker) return { subject: '', body: '' };
    const template =
      dispatchType === 'ccpa'
        ? brokerListJson.templates.ccpa
        : brokerListJson.templates.gdpr;

    let body = template.body
      .replace(/{{brokerName}}/g, selectedBroker.name)
      .replace(/{{fullName}}/g, profile.fullName || '[Your Full Name]')
      .replace(/{{primaryEmail}}/g, profile.primaryEmail || '[Your Email]')
      .replace(/{{phone}}/g, profile.phone || '[Your Phone]')
      .replace(/{{cityState}}/g, profile.cityState || '[Your City, State]')
      .replace(/{{country}}/g, profile.country || '[Your Country]');

    return {
      subject: template.subject.replace(/{{fullName}}/g, profile.fullName || 'Consumer'),
      body,
    };
  };

  const handleCopyNotice = () => {
    const { subject, body } = getPreparedEmail();
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF9F6] dark:bg-[#1E1E2E] text-stone-900 dark:text-[#F5E0DC] transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-stone-200/90 dark:border-[#383852] bg-white/95 dark:bg-[#252538]/95 backdrop-blur sticky top-0 z-50 px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SentryShieldLogo size={36} armed={true} glow={true} />
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight text-stone-900 dark:text-white">
                  SENTRY <span className="text-emerald-700 dark:text-emerald-400">AI</span>
                </h1>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                  COMMAND CENTER
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-[#A6ADC8] font-mono tracking-wide">
                Be Fearless Online
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Navigation Tabs */}
            <nav className="flex space-x-1 rounded-xl bg-stone-100/90 dark:bg-[#181825] border border-stone-200 dark:border-[#383852] p-1">
              <button
                onClick={() => setActiveTab('brokers')}
                className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'brokers'
                    ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                    : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
                }`}
              >
                <HiCircleStack className="h-4 w-4" />
                <span>Data Broker Hub</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-shield')}
                className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'ai-shield'
                    ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                    : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
                }`}
              >
                <HiCpuChip className="h-4 w-4" />
                <span>AI Opt-Out Center</span>
              </button>

              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'matrix'
                    ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                    : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
                }`}
              >
                <HiAdjustmentsHorizontal className="h-4 w-4" />
                <span>Domain Matrix</span>
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'ledger'
                    ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                    : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
                }`}
              >
                <HiChartBar className="h-4 w-4" />
                <span>Live Threat Ledger</span>
              </button>

              <button
                onClick={() => setActiveTab('cleaner')}
                className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === 'cleaner'
                    ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                    : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
                }`}
              >
                <HiLink className="h-4 w-4" />
                <span>URL Cleaner & Link Guard</span>
              </button>
            </nav>

            {/* Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              title={`Theme: ${themeMode.toUpperCase()} (Click to toggle)`}
              className="flex items-center space-x-1.5 rounded-xl border border-stone-200 dark:border-[#4E4E70] bg-stone-100/90 dark:bg-[#181825] px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-[#CDD6F4] hover:bg-stone-200 dark:hover:bg-[#2E2E44] transition"
            >
              {themeMode === 'system' ? (
                <HiComputerDesktop className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              ) : themeMode === 'light' ? (
                <HiSun className="h-4 w-4 text-amber-600" />
              ) : (
                <HiMoon className="h-4 w-4 text-indigo-400" />
              )}
              <span className="capitalize">{themeMode}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 space-y-6">
        {/* Global Protection Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div
            className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
              <span className="text-xs font-mono uppercase tracking-wider">Total Trackers Blocked</span>
              <HiShieldExclamation className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
              {globalStats?.totalTrackersBlocked || 0}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-[#9399B2] mt-1">DNR static & dynamic filters</p>
          </div>

          <div
            className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
              <span className="text-xs font-mono uppercase tracking-wider">Fingerprints Scrambled</span>
              <HiShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
              {globalStats?.totalFingerprintsScrambled || 0}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-[#9399B2] mt-1">Canvas, WebGL & Audio noise</p>
          </div>

          <div
            className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
              <span className="text-xs font-mono uppercase tracking-wider">AI Scrapers Blocked</span>
              <HiCpuChip className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-400">
              {globalStats?.totalAiScrapersBlocked || 0}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-[#9399B2] mt-1">Meta, ByteDance, TikTok pixels</p>
          </div>

          <div
            className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
              <span className="text-xs font-mono uppercase tracking-wider">Cleaned URLs / Params</span>
              <HiLink className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
              {globalStats?.totalUrlsCleaned || 0} / {globalStats?.totalParamsStripped || 0}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-[#9399B2] mt-1">Marketing & click trackers sanitized</p>
          </div>

          <div
            className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
              <span className="text-xs font-mono uppercase tracking-wider">Brokers Cleared / Audited</span>
              <HiCircleStack className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
              {removedCount} / {totalBrokersCount}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-[#9399B2] mt-1">CCPA / GDPR Art 17 opt-outs</p>
          </div>
        </div>

        {/* TAB 1: DATA BROKER HUB */}
        {activeTab === 'brokers' && (
          <div className="space-y-6">
            {/* Identity Profile & Local AES-256 Vault */}
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 dark:border-[#383852] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <HiLockClosed className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    <h2 className="text-base font-bold text-stone-900 dark:text-white">
                      Encrypted Personal Identity Vault (AES-256-GCM)
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-1">
                    Your details are encrypted with your local passphrase. Zero unencrypted personal data leaves your browser.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {isVaultLocked ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="password"
                        placeholder="Enter master passphrase"
                        value={vaultPassphrase}
                        onChange={(e) => setVaultPassphrase(e.target.value)}
                        className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                      />
                      <button
                        onClick={handleUnlockVault}
                        className="flex items-center space-x-1.5 rounded-lg bg-emerald-700 dark:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
                      >
                        <HiLockOpen className="h-3.5 w-3.5" />
                        <span>Unlock</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsVaultLocked(true)}
                      className="flex items-center space-x-1.5 rounded-lg bg-stone-100 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-[#CDD6F4] hover:border-stone-400"
                    >
                      <HiLockClosed className="h-3.5 w-3.5" />
                      <span>Lock Vault</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vault Error / Saved Message */}
              {vaultError && (
                <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300">
                  {vaultError}
                </div>
              )}
              {vaultSavedNotice && (
                <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  Identity Vault encrypted with AES-256 and securely saved locally!
                </div>
              )}

              {/* Unlocked Form Fields */}
              {!isVaultLocked && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8] mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8] mb-1">
                      Primary Contact Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. jane@example.com"
                      value={profile.primaryEmail}
                      onChange={(e) => setProfile({ ...profile, primaryEmail: e.target.value })}
                      className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8] mb-1">
                      City, State / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. San Francisco, CA"
                      value={profile.cityState}
                      onChange={(e) => setProfile({ ...profile, cityState: e.target.value })}
                      className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8] mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. United States"
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8] mb-1">
                      Passphrase (for AES-256)
                    </label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={vaultPassphrase}
                      onChange={(e) => setVaultPassphrase(e.target.value)}
                      className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      onClick={handleSaveVault}
                      className="rounded-lg bg-emerald-700 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                    >
                      Save & Re-Encrypt Identity Vault
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Broker Registry & Workflow Table */}
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    Data Broker Remediation Registry ({filteredBrokers.length} of {totalBrokersCount})
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                    Direct automated CCPA/CPRA & GDPR Article 17 erasure requests.
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <HiMagnifyingGlass className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search broker name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-3 py-1.5 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="All">All Categories</option>
                    <option value="People Search">People Search</option>
                    <option value="AdTech / Aggregator">AdTech / Aggregators</option>
                    <option value="Financial & Risk">Financial & Risk</option>
                    <option value="AI Training Dataset">AI Training Datasets</option>
                  </select>
                </div>
              </div>

              {/* Broker Table */}
              <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-[#383852]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-[#181825] text-stone-500 dark:text-[#A6ADC8] uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3">Data Broker</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Legal Endpoint</th>
                      <th className="p-3">Opt-Out Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/80 dark:divide-[#383852] font-mono">
                    {filteredBrokers.map((broker) => {
                      const statusStyles: Record<OptOutStatus, string> = {
                        Pending: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-[#181825] dark:text-[#9399B2] dark:border-[#383852]',
                        Dispatched: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40',
                        'In Review': 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40',
                        Removed: 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-500',
                      };

                      return (
                        <tr key={broker.id} className="hover:bg-stone-50/80 dark:hover:bg-[#2E2E44] transition">
                          <td className="p-3">
                            <div className="font-sans font-semibold text-stone-900 dark:text-white">
                              {broker.name}
                            </div>
                            <span className="text-[10px] text-stone-400 dark:text-[#9399B2]">
                              Jurisdiction: {broker.jurisdiction}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="rounded bg-stone-100 dark:bg-[#181825] border border-stone-200 dark:border-[#383852] px-2 py-0.5 text-[10px] text-stone-600 dark:text-[#CDD6F4]">
                              {broker.category}
                            </span>
                          </td>
                          <td className="p-3 text-stone-500 dark:text-[#A6ADC8]">
                            <a
                              href={broker.optOutUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
                            >
                              <span>Opt-Out Portal</span>
                              <HiArrowTopRightOnSquare className="h-3 w-3" />
                            </a>
                            <div className="text-[10px] text-stone-400 dark:text-[#9399B2]">{broker.contactEmail}</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={broker.status}
                              onChange={(e) =>
                                handleStatusChange(broker.id, e.target.value as OptOutStatus)
                              }
                              className={`rounded border px-2 py-1 text-[11px] font-sans font-semibold focus:outline-none ${
                                statusStyles[broker.status]
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Dispatched">Dispatched</option>
                              <option value="In Review">In Review</option>
                              <option value="Removed">Removed</option>
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedBroker(broker)}
                              className="rounded border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-sans text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition"
                            >
                              Generate Notice
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AI TRAINING OPT-OUT HUB */}
        {activeTab === 'ai-shield' && (
          <div className="space-y-6">
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex items-center space-x-2 border-b border-stone-100 dark:border-[#383852] pb-3">
                <HiCpuChip className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    Commercial AI Model Training Defenses
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                    Sentry AI injects automated signals and blocks surveillance telemetry feeding LLM datasets.
                  </p>
                </div>
              </div>

              {/* Protocol Defense Status */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="p-4 border rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 mb-2">
                    <HiCheckCircle className="h-4 w-4" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Global Privacy Control (Sec-GPC: 1)
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-[#CDD6F4]">
                    Sentry automatically injects the <code className="text-emerald-800 dark:text-emerald-300 font-bold">Sec-GPC: 1</code> and{' '}
                    <code className="text-emerald-800 dark:text-emerald-300 font-bold">DNT: 1</code> headers onto 100% of outgoing requests via DeclarativeNetRequest.
                  </p>
                  <span className="inline-block mt-2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono">
                    STATUS: ACTIVE ON ALL BROWSING
                  </span>
                </div>

                <div
                  className="p-4 border rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 mb-2">
                    <HiCheckCircle className="h-4 w-4" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Anti AI Scraping Crawler Nullifier
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-[#CDD6F4]">
                    Declares <code className="text-emerald-800 dark:text-emerald-300 font-bold">X-Robots-Tag: noai, noimageai</code> and blocks commercial web harvesters from indexing your private page sessions.
                  </p>
                  <span className="inline-block mt-2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono">
                    STATUS: ARMED
                  </span>
                </div>
              </div>

              {/* Major Platform Direct Opt-Out Portals */}
              <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-6 mb-3">
                Platform-Specific AI Model Training Locks
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Meta AI */}
                <div
                  className="p-4 flex flex-col justify-between border rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">Meta / Facebook AI Training</h4>
                      <span className="rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-[10px] px-2 py-0.5">
                        High Exploitation Risk
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                      Meta uses all user posts, comments, photos, and captions to train Llama generative models by default.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-200 dark:border-[#383852]">
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      Telemetry & Pixels: Blocked
                    </span>
                    <a
                      href="https://www.facebook.com/privacy/genai"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-stone-200/80 dark:bg-[#2E2E44] px-3 py-1 text-xs text-stone-800 dark:text-stone-200 hover:bg-emerald-700 hover:text-white transition"
                    >
                      <span>Opt-Out Form</span>
                      <HiArrowTopRightOnSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* X Grok AI */}
                <div
                  className="p-4 flex flex-col justify-between border rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">X (Twitter) Grok Model Training</h4>
                      <span className="rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 text-[10px] px-2 py-0.5">
                        Opt-in by Default
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                      X automatically opts all users into sharing interactions, posts, and search inputs with xAI Grok.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-200 dark:border-[#383852]">
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      Beacon Telemetry: Blocked
                    </span>
                    <a
                      href="https://x.com/settings/grok_settings"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-stone-200/80 dark:bg-[#2E2E44] px-3 py-1 text-xs text-stone-800 dark:text-stone-200 hover:bg-emerald-700 hover:text-white transition"
                    >
                      <span>Grok Settings</span>
                      <HiArrowTopRightOnSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Google Gemini */}
                <div
                  className="p-4 flex flex-col justify-between border rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">Google Gemini Activity Lock</h4>
                      <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] px-2 py-0.5">
                        Continuous Ingestion
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                      Google associates web activity, Chrome sync, and search history with Gemini assistant model fine-tuning.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-200 dark:border-[#383852]">
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      Google Analytics: Intercepted
                    </span>
                    <a
                      href="https://myactivity.google.com/product/gemini"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-stone-200/80 dark:bg-[#2E2E44] px-3 py-1 text-xs text-stone-800 dark:text-stone-200 hover:bg-emerald-700 hover:text-white transition"
                    >
                      <span>Gemini Privacy</span>
                      <HiArrowTopRightOnSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* LinkedIn AI */}
                <div
                  className="p-4 flex flex-col justify-between border rounded-xl"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">LinkedIn Model Training Shield</h4>
                      <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] px-2 py-0.5">
                        Professional Dossiers
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                      LinkedIn trains generative writing and matching models on user resumes, articles, and recommendations.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-200 dark:border-[#383852]">
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-medium">
                      Insight Pixel: Blocked
                    </span>
                    <a
                      href="https://www.linkedin.com/mypreferences/d/data-for-ai-improvement"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-stone-200/80 dark:bg-[#2E2E44] px-3 py-1 text-xs text-stone-800 dark:text-stone-200 hover:bg-emerald-700 hover:text-white transition"
                    >
                      <span>LinkedIn AI Toggle</span>
                      <HiArrowTopRightOnSquare className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOMAIN MATRIX & CUSTOM RULES */}
        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                  Domain Whitelist & Exception Matrix
                </h2>
                <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                  Whitelisted domains bypass network filtering and noise scrambling to ensure maximum compatibility when needed.
                </p>
              </div>

              {/* Add Domain Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. internal.company.com"
                  value={newWhitelistDomain}
                  onChange={(e) => setNewWhitelistDomain(e.target.value)}
                  className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 w-80 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                />
                <button
                  onClick={handleAddWhitelist}
                  className="flex items-center space-x-1 rounded-lg bg-emerald-700 dark:bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                >
                  <HiPlus className="h-3.5 w-3.5" />
                  <span>Add Whitelist</span>
                </button>
              </div>

              {/* Whitelisted Domains Tags */}
              <div className="pt-2">
                <h4 className="text-xs font-mono text-stone-500 dark:text-[#A6ADC8] uppercase mb-2">
                  Currently Whitelisted Domains ({settings?.whitelistedDomains.length || 0})
                </h4>
                {settings?.whitelistedDomains && settings.whitelistedDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.whitelistedDomains.map((d) => (
                      <span
                        key={d}
                        className="flex items-center space-x-1.5 rounded-lg border border-stone-300 dark:border-[#383852] bg-stone-100 dark:bg-[#181825] px-2.5 py-1 text-xs text-stone-800 dark:text-[#CDD6F4]"
                      >
                        <span className="font-mono">{d}</span>
                        <button
                          onClick={() => handleRemoveWhitelist(d)}
                          className="text-stone-400 hover:text-rose-600"
                        >
                          <HiTrash className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic">
                    No domains whitelisted. Full active shield enforced.
                  </p>
                )}
              </div>
            </div>

            {/* DeclarativeNetRequest Active Filters Status */}
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-3 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                DeclarativeNetRequest Static Engine Rulesets
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200 dark:border-[#383852]">
                  <div>
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                      rules_ai_trackers.json
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] font-sans mt-0.5">
                      Meta Pixel, TikTok Insight, LinkedIn Analytics, Google Analytics v4, ByteDance, FPJS fingerprinting bots.
                    </p>
                  </div>
                  <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px]">
                    ENABLED (25 Rules)
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200 dark:border-[#383852]">
                  <div>
                    <span className="text-emerald-800 dark:text-emerald-300 font-semibold">
                      rules_privacy_headers.json
                    </span>
                    <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] font-sans mt-0.5">
                      Sec-GPC: 1 (Global Privacy Control) & DNT: 1 header injection across all web requests.
                    </p>
                  </div>
                  <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px]">
                    ENABLED (GLOBAL)
                  </span>
                </div>
              </div>
            </div>

            {/* UNIVERSAL COOKIE CONSENT GUARD (ALL SITES) */}
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#383852] pb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shrink-0">
                    <HiShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-stone-900 dark:text-white">
                        Universal Cookie Consent Guard
                      </h2>
                      <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                        GLOBAL (ALL SITES)
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                      Automatically suppresses intrusive cookie consent banners, auto-clicks &quot;Reject All&quot;, and unlocks page scrolling.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-stone-500 dark:text-[#A6ADC8]">Enforce on all sites:</span>
                  <button
                    onClick={() => {
                      if (!settings) return;
                      const isEnabled = !(settings.cookieConsent?.enabled ?? true);
                      const updated = {
                        ...settings,
                        cookieConsent: {
                          ...(settings.cookieConsent || {
                            enabled: true,
                            autoMode: 'auto_reject' as const,
                            hideBanners: true,
                            autoUnlockScroll: true,
                            totalBannersHandled: 0,
                          }),
                          enabled: isEnabled,
                        },
                      };
                      setSettings(updated);
                      chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
                    }}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: (settings?.cookieConsent?.enabled ?? true) ? 'var(--green-primary)' : 'var(--border-strong)',
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings?.cookieConsent?.enabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="p-3.5 rounded-xl border"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="text-xs font-semibold text-stone-900 dark:text-white mb-1">Consent Strategy Mode</div>
                  <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] mb-2.5">
                    Behavior applied when a Consent Management Platform (OneTrust, Cookiebot, Didomi) is encountered.
                  </p>
                  <div className="space-y-1.5 text-xs font-medium">
                    <button
                      onClick={() => {
                        if (!settings) return;
                        const updated = {
                          ...settings,
                          cookieConsent: {
                            ...(settings.cookieConsent || {
                              enabled: true,
                              autoMode: 'auto_reject' as const,
                              hideBanners: true,
                              autoUnlockScroll: true,
                              totalBannersHandled: 0,
                            }),
                            autoMode: 'auto_reject' as const,
                          },
                        };
                        setSettings(updated);
                        chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                        (settings?.cookieConsent?.autoMode ?? 'auto_reject') === 'auto_reject'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/50 font-bold'
                          : 'border-stone-200 dark:border-[#383852] text-stone-600 dark:text-[#A6ADC8]'
                      }`}
                    >
                      Auto-Reject Non-Essential (Recommended)
                    </button>
                    <button
                      onClick={() => {
                        if (!settings) return;
                        const updated = {
                          ...settings,
                          cookieConsent: {
                            ...(settings.cookieConsent || {
                              enabled: true,
                              autoMode: 'auto_reject' as const,
                              hideBanners: true,
                              autoUnlockScroll: true,
                              totalBannersHandled: 0,
                            }),
                            autoMode: 'dismiss_hide' as const,
                          },
                        };
                        setSettings(updated);
                        chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                        settings?.cookieConsent?.autoMode === 'dismiss_hide'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/50 font-bold'
                          : 'border-stone-200 dark:border-[#383852] text-stone-600 dark:text-[#A6ADC8]'
                      }`}
                    >
                      Dismiss &amp; Cosmestically Hide Banners
                    </button>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="text-xs font-semibold text-stone-900 dark:text-white mb-1">Scroll Lock Neutralizer</div>
                    <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8]">
                      Automatically removes <code className="text-emerald-700 dark:text-emerald-400 font-mono">overflow: hidden</code> on the document body when cookie modals lock the page.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center justify-between border-t border-stone-200 dark:border-[#383852]">
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      STATUS: ACTIVE (GLOBAL)
                    </span>
                    <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono">
                      UNLOCKED
                    </span>
                  </div>
                </div>

                <div
                  className="p-3.5 rounded-xl border flex flex-col justify-between"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="text-xs font-semibold text-stone-900 dark:text-white mb-1">Simulated Consent Tokens</div>
                    <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8]">
                      Injects minimal consent cookie tokens (OneTrust, Cookiebot) so backends do not re-render the dialog on page transitions.
                    </p>
                  </div>
                  <div className="pt-3 flex items-center justify-between border-t border-stone-200 dark:border-[#383852]">
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      LIFESPAN: 1 YEAR (PERSISTENT)
                    </span>
                    <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono">
                      SYNCED
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PERSISTENT SITE ZAP RULES MANAGER (uBlock Style) */}
            <div
              className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#383852] pb-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 shrink-0">
                    <HiBolt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-bold text-stone-900 dark:text-white">
                        Persistent Site Zap Rules Manager
                      </h2>
                      <span className="rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 px-2 py-0.5 text-[10px] font-mono font-bold">
                        uBlock Origin Parity
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                      Cosmetic filtering rules saved locally in browser storage and enforced immediately at document load.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="rounded bg-stone-100 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-2.5 py-1 text-xs font-mono font-semibold text-stone-700 dark:text-[#CDD6F4]">
                    {Object.keys(allZapRules).length} Domains • {Object.values(allZapRules).flat().length} Active Rules
                  </span>
                </div>
              </div>

              {/* Add Custom Zap Rule Manually */}
              <div className="flex flex-col sm:flex-row items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-[#181825] border border-stone-200 dark:border-[#383852]">
                <input
                  type="text"
                  placeholder="Target domain (e.g. news.ycombinator.com)"
                  value={newZapDomain}
                  onChange={(e) => setNewZapDomain(e.target.value)}
                  className="rounded-lg bg-white dark:bg-[#252538] border border-stone-300 dark:border-[#383852] px-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 w-full sm:w-64 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 font-mono"
                />
                <input
                  type="text"
                  placeholder="CSS Selector (e.g. div.ad-banner or #sponsored-feed)"
                  value={newZapSelector}
                  onChange={(e) => setNewZapSelector(e.target.value)}
                  className="rounded-lg bg-white dark:bg-[#252538] border border-stone-300 dark:border-[#383852] px-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 flex-1 w-full focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 font-mono"
                />
                <button
                  onClick={handleAddManualZapRule}
                  className="rounded-lg bg-rose-700 dark:bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-800 transition shrink-0 cursor-pointer"
                >
                  Save Zap Rule
                </button>
              </div>

              {/* Display Domain Zap Rules */}
              {Object.keys(allZapRules).length > 0 ? (
                <div className="space-y-3 pt-1">
                  {Object.entries(allZapRules).map(([domain, rules]) => (
                    <div
                      key={domain}
                      className="p-3 rounded-xl border"
                      style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-stone-900 dark:text-white">
                            {domain}
                          </span>
                          <span className="rounded bg-stone-200 dark:bg-[#383852] px-1.5 py-0.5 text-[10px] font-mono text-stone-600 dark:text-[#A6ADC8]">
                            {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {rules.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] text-xs font-mono"
                          >
                            <span className="text-stone-800 dark:text-stone-200 truncate pr-2 font-semibold">
                              {r.selector}
                            </span>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] text-stone-400">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDeleteZapRule(domain, r.id)}
                                title="Delete Rule (Unzap)"
                                className="p-1 rounded text-stone-400 hover:text-rose-600 transition cursor-pointer"
                              >
                                <HiTrash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-stone-400 text-xs italic">
                  No persistent zap rules stored yet. Use the Element Zapper in the browser sidebar on any page to permanently hide elements.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LIVE THREAT LEDGER */}
        {activeTab === 'ledger' && (
          <div
            className="sentry-card p-5 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#383852] pb-3">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                  Live Interception Telemetry Ledger
                </h2>
                <p className="text-xs text-stone-500 dark:text-[#A6ADC8]">
                  Real-time chronological audit trail of all blocked trackers, scrambled canvas probes, and modified headers.
                </p>
              </div>
              <span className="rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-1 text-xs font-mono">
                {threatEvents.length} Events Logged
              </span>
            </div>

            {threatEvents.length > 0 ? (
              <div className="space-y-2 overflow-y-auto max-h-[500px] font-mono text-xs">
                {threatEvents.map((ev) => {
                  const typeColors: Record<string, string> = {
                    canvas: 'text-emerald-800 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-950/20',
                    audio: 'text-emerald-800 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-950/20',
                    webgl: 'text-emerald-800 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-950/20',
                    tracker: 'text-rose-800 border-rose-300 bg-rose-50 dark:text-rose-400 dark:border-rose-500/30 dark:bg-rose-950/20',
                    zapper: 'text-amber-800 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-500/30 dark:bg-amber-950/20',
                    cookie_consent: 'text-emerald-800 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-950/20',
                    url_cleaner: 'text-teal-800 border-teal-300 bg-teal-50 dark:text-teal-300 dark:border-teal-500/30 dark:bg-teal-950/20',
                    ping: 'text-rose-800 border-rose-300 bg-rose-50 dark:text-rose-400 dark:border-rose-500/30 dark:bg-rose-950/20',
                  };

                  return (
                    <div
                      key={ev.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] hover:bg-stone-100 dark:hover:bg-[#2E2E44] transition"
                    >
                      <div className="flex items-start space-x-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] uppercase font-bold shrink-0 ${
                            typeColors[ev.type] || 'text-stone-600'
                          }`}
                        >
                          {ev.type}
                        </span>
                        <div>
                          <div className="text-stone-800 dark:text-[#CDD6F4] font-sans font-medium">
                            {ev.description}
                          </div>
                          <div className="text-[11px] text-stone-400 dark:text-[#9399B2] mt-0.5 truncate max-w-lg">
                            Source: {ev.source}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-[#9399B2] shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400 font-mono text-xs">
                Active monitoring in progress. Threat events will stream here live as pages load.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: URL CLEANER & LINK GUARD STUDIO */}
        {activeTab === 'cleaner' && (
          <div className="space-y-6">
            {/* HERO MODULE HEADER */}
            <div
              className="sentry-card p-6 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shrink-0">
                    <HiLink className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-white">
                        Sentry URL Sanitizer & Link Guard
                      </h2>
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                        MV3 ZERO-LATENCY
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-1">
                      Native parameter scrubbing, hyperlink auditing neutralizer, search redirect unmasker, and History API guard.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-stone-500 dark:text-[#A6ADC8]">
                    Master Link Guard:
                  </span>
                  <button
                    onClick={() => handleToggleUrlCleanerSetting('enabled')}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    style={{
                      backgroundColor: (settings?.urlCleaner?.enabled ?? true)
                        ? 'var(--green-primary)'
                        : 'var(--border-strong)',
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings?.urlCleaner?.enabled ?? true) ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 1: SINGLE URL PURIFIER & LIVE INSPECTOR */}
            <div
              className="sentry-card p-6 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-100 dark:border-[#383852] pb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
                    <HiSparkles className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    <span>Single URL Purifier & Inspector</span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                    Test how Sentry AI scrubs tracking parameters, referral tokens, and unwraps redirects in real time.
                  </p>
                </div>

                {/* Sample Test Link Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-stone-400 dark:text-[#9399B2] mr-1">
                    Try Sample:
                  </span>
                  {[
                    {
                      label: 'Amazon Referral',
                      url: 'https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1?keywords=keyboard&qid=1610000000&sr=8-1',
                    },
                    {
                      label: 'YouTube SI',
                      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ?si=trackingToken987',
                    },
                    {
                      label: 'Google Redirect',
                      url: 'https://www.google.com/url?q=https://example.com/target-page&sa=D&sntz=1',
                    },
                    {
                      label: 'Multi-Campaign (UTM + FB)',
                      url: 'https://shop.example.com/sale?utm_source=facebook&utm_medium=cpc&utm_campaign=summer&fbclid=IwAR0987xyz&gclid=CjwKCAiA',
                    },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleCleanSingleUrl(s.url)}
                      className="rounded-lg bg-stone-100 dark:bg-[#181825] border border-stone-200 dark:border-[#383852] px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-300 hover:border-emerald-500 transition cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={cleanerInput}
                    onChange={(e) => handleCleanSingleUrl(e.target.value)}
                    placeholder="Enter or paste any URL with tracking parameters..."
                    className="w-full rounded-xl bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-3 text-xs font-mono text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                  />
                  {cleanerInput && (
                    <button
                      onClick={() => handleCleanSingleUrl('')}
                      className="absolute right-3 top-3 text-xs font-mono text-stone-400 hover:text-stone-700 dark:hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Live Inspection Results */}
              {cleanerResult && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Original URL Box */}
                    <div className="rounded-xl border border-stone-200 dark:border-[#383852] bg-stone-50/70 dark:bg-[#181825]/70 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-[#A6ADC8]">
                        <span>Original Input URL:</span>
                        <span className="text-[10px] uppercase font-bold text-stone-400">RAW</span>
                      </div>
                      <div className="text-xs font-mono text-stone-700 dark:text-[#CDD6F4] break-all leading-relaxed">
                        {cleanerResult.originalUrl}
                      </div>
                    </div>

                    {/* Sanitized URL Box */}
                    <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
                        <span>Sanitized Privacy-Clean URL:</span>
                        <span className="rounded bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[9px] uppercase font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                          {cleanerResult.hasChanged ? 'PURIFIED' : 'ALREADY CLEAN'}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-semibold text-emerald-950 dark:text-emerald-200 break-all leading-relaxed">
                        {cleanerResult.cleanedUrl}
                      </div>
                    </div>
                  </div>

                  {/* Stripped Tokens Badges */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-[#383852] bg-stone-50 dark:bg-[#181825] p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-stone-600 dark:text-[#A6ADC8]">
                        Tracking Tokens Removed ({cleanerResult.strippedParams.length}):
                      </span>
                      {cleanerResult.strippedParams.length === 0 ? (
                        <span className="text-xs font-mono text-stone-400 dark:text-[#9399B2]">
                          Zero tracking parameters detected. URL is safe.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {cleanerResult.strippedParams.map((p) => (
                            <span
                              key={p}
                              className="rounded bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700 dark:text-rose-400 line-through"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleCopySingleCleanUrl}
                      className="flex items-center justify-center space-x-1.5 rounded-lg bg-emerald-700 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer shrink-0"
                    >
                      {copiedCleanLink ? (
                        <HiCheck className="h-4 w-4" />
                      ) : (
                        <HiClipboardDocument className="h-4 w-4" />
                      )}
                      <span>{copiedCleanLink ? 'Copied to Clipboard!' : 'Copy Sanitized Link'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: BATCH MULTI-URL SCRUBBER STUDIO */}
            <div
              className="sentry-card p-6 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-100 dark:border-[#383852] pb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center space-x-2">
                    <HiBolt className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    <span>Batch Multi-URL Scrubber Studio</span>
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                    Paste lists of links (one per line) from chats, spreadsheets, bookmarks, or social feeds for bulk decontamination.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleProcessBatch}
                    className="flex items-center space-x-1.5 rounded-lg bg-emerald-700 dark:bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition cursor-pointer"
                  >
                    <HiBolt className="h-4 w-4" />
                    <span>Scrub Batch</span>
                  </button>

                  {batchResults && batchResults.length > 0 && (
                    <>
                      <button
                        onClick={handleCopyAllBatch}
                        className="flex items-center space-x-1.5 rounded-lg bg-stone-100 dark:bg-[#181825] border border-stone-300 dark:border-[#4E4E70] px-3 py-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-emerald-600 transition cursor-pointer"
                      >
                        {batchCopied ? <HiCheck className="h-3.5 w-3.5 text-emerald-600" /> : <HiClipboardDocument className="h-3.5 w-3.5" />}
                        <span>{batchCopied ? 'All Copied!' : 'Copy All Clean'}</span>
                      </button>

                      <button
                        onClick={handleDownloadBatch}
                        className="flex items-center space-x-1.5 rounded-lg bg-stone-100 dark:bg-[#181825] border border-stone-300 dark:border-[#4E4E70] px-3 py-1.5 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-emerald-600 transition cursor-pointer"
                      >
                        <HiArrowDownTray className="h-3.5 w-3.5" />
                        <span>Export (.txt)</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setBatchInput('');
                      setBatchResults(null);
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition"
                    title="Clear input"
                  >
                    <HiTrash className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  rows={5}
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  placeholder="Paste multiple URLs here, one per line..."
                  className="w-full rounded-xl bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] p-3 text-xs font-mono text-stone-900 dark:text-white placeholder-stone-400 leading-relaxed focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                />
              </div>

              {/* Batch Results Output */}
              {batchResults && (
                <div className="space-y-3 pt-1">
                  {/* Summary Counters */}
                  {(() => {
                    const cleanedCount = batchResults.filter((r) => r.hasChanged).length;
                    const totalParams = batchResults.reduce((acc, r) => acc + r.strippedParams.length, 0);
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-stone-200 dark:border-[#383852] bg-stone-50 dark:bg-[#181825] p-3 text-center">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-[#9399B2]">
                            Total Links Analyzed
                          </div>
                          <div className="text-xl font-bold font-mono text-stone-800 dark:text-stone-200 mt-0.5">
                            {batchResults.length}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-3 text-center">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                            Sanitized Links
                          </div>
                          <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300 mt-0.5">
                            {cleanedCount}
                          </div>
                        </div>

                        <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-3 text-center">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-700 dark:text-rose-400">
                            Parameters Stripped
                          </div>
                          <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400 mt-0.5">
                            {totalParams}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Results List */}
                  <div className="rounded-xl border border-stone-200 dark:border-[#383852] overflow-hidden">
                    <div className="max-h-72 overflow-y-auto divide-y divide-stone-200 dark:divide-[#383852]">
                      {batchResults.map((res, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 text-xs font-mono hover:bg-stone-50 dark:hover:bg-[#181825] transition"
                        >
                          <div className="min-w-0 pr-3 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                  res.hasChanged
                                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300'
                                    : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                                }`}
                              >
                                {res.hasChanged ? 'CLEANED' : 'SAFE'}
                              </span>
                              <span className="font-semibold text-stone-900 dark:text-white truncate max-w-xl">
                                {res.cleanedUrl}
                              </span>
                            </div>

                            {res.strippedParams.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {res.strippedParams.map((p) => (
                                  <span
                                    key={p}
                                    className="rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 px-1 py-0.2 text-[9px] line-through"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(res.cleanedUrl);
                            }}
                            className="rounded p-1 text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                            title="Copy link"
                          >
                            <HiClipboardDocument className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: SUBSYSTEM DEFENSE MODULES */}
            <div
              className="sentry-card p-6 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  Link Guard Subsystem Protection Modules
                </h3>
                <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                  Fine-tune granular network filters, DOM mutation observers, and History API wrappers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    key: 'stripMarketingParams' as const,
                    title: 'Universal Tracking Parameters',
                    desc: 'Strips utm_source, utm_medium, utm_campaign, ga_*, _openstat, wt_mc, etc.',
                  },
                  {
                    key: 'stripReferralTokens' as const,
                    title: 'Platform & Referral Tokens',
                    desc: 'Strips Amazon ref_/pd_rd_*, YouTube si, TikTok ttclid, Twitter twclid, fbclid, gclid.',
                  },
                  {
                    key: 'blockHyperlinkPings' as const,
                    title: 'Hyperlink Auditing Defeater',
                    desc: 'Eliminates HTML5 <a ping> attributes and blocks resourceType: ping at network layer.',
                  },
                  {
                    key: 'unwrapRedirects' as const,
                    title: 'Redirection Wrapper Unmasker',
                    desc: 'Decodes google.com/url?q=..., facebook.com/l.php?u=..., and out.php tracking links.',
                  },
                  {
                    key: 'bypassSearchRedirection' as const,
                    title: 'Search Hijack Neutralizer',
                    desc: 'Defeats Google and Yandex rwt click rewriters and removes data-cthref attributes.',
                  },
                  {
                    key: 'sanitizeHistoryApi' as const,
                    title: 'History API Inoculation',
                    desc: 'Intercepts pushState & replaceState to prevent SPAs from silently re-injecting trackers.',
                  },
                ].map((item) => {
                  const isEnabled = settings?.urlCleaner?.[item.key] ?? true;
                  return (
                    <div
                      key={item.key}
                      className="rounded-xl border border-stone-200 dark:border-[#383852] bg-stone-50/70 dark:bg-[#181825]/70 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="font-semibold text-xs text-stone-900 dark:text-white">
                          {item.title}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-stone-400">
                          {isEnabled ? 'ENABLED' : 'PAUSED'}
                        </span>
                        <button
                          onClick={() => handleToggleUrlCleanerSetting(item.key)}
                          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                          style={{
                            backgroundColor: isEnabled ? 'var(--green-primary)' : 'var(--border-strong)',
                          }}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: SURVEILLANCE PARAMETER DIRECTORY */}
            <div
              className="sentry-card p-6 border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-4 transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#383852] pb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    Surveillance Parameter Dictionary & Intelligence
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                    Catalog of prominent surveillance tokens, click identifiers, and session linkers purged by Sentry AI.
                  </p>
                </div>

                {/* Search & Category Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <HiMagnifyingGlass className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search parameters..."
                      value={paramSearch}
                      onChange={(e) => setParamSearch(e.target.value)}
                      className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="flex space-x-1 rounded-lg bg-stone-100 dark:bg-[#181825] p-1 border border-stone-200 dark:border-[#383852]">
                    {(['all', 'analytics', 'clicks', 'platforms', 'redirects'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedParamCategory(cat)}
                        className={`rounded px-2.5 py-0.5 text-[10px] font-mono capitalize transition ${
                          selectedParamCategory === cat
                            ? 'bg-emerald-700 text-white dark:bg-emerald-600 font-bold'
                            : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid of Dictionary Items */}
              {(() => {
                const filteredParams = TRACKING_DICTIONARY.filter((p) => {
                  const matchesCat =
                    selectedParamCategory === 'all' || p.category === selectedParamCategory;
                  const matchesSearch =
                    paramSearch === '' ||
                    p.name.toLowerCase().includes(paramSearch.toLowerCase()) ||
                    p.company.toLowerCase().includes(paramSearch.toLowerCase()) ||
                    p.desc.toLowerCase().includes(paramSearch.toLowerCase());
                  return matchesCat && matchesSearch;
                });

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredParams.map((p) => (
                      <div
                        key={p.name}
                        className="rounded-xl border border-stone-200 dark:border-[#383852] bg-stone-50/50 dark:bg-[#181825]/50 p-3.5 space-y-2 hover:border-emerald-400 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-stone-900 dark:text-white truncate max-w-[200px]">
                            {p.name}
                          </span>
                          <span className="rounded bg-stone-200 dark:bg-[#2E2E44] px-1.5 py-0.5 text-[9px] font-mono font-bold text-stone-700 dark:text-[#CDD6F4]">
                            {p.badge}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono font-semibold text-emerald-800 dark:text-emerald-400">
                          {p.company}
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] leading-relaxed">
                          {p.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Modal: Formal Deletion Demand Notice */}
        {selectedBroker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div
              className="sentry-card max-w-2xl w-full p-6 space-y-4 border border-stone-300 dark:border-[#383852] rounded-2xl shadow-xl"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-[#383852] pb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">
                    Formal Deletion Demand: {selectedBroker.name}
                  </h3>
                  <span className="text-xs text-stone-500 dark:text-[#A6ADC8] font-mono">
                    Recipient: {selectedBroker.contactEmail}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBroker(null)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 rounded-md"
                >
                  <HiXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Statute Selector */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setDispatchType('ccpa')}
                  className={`px-3 py-1 rounded text-xs font-semibold border ${
                    dispatchType === 'ccpa'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-[#181825] dark:text-[#A6ADC8] dark:border-[#383852]'
                  }`}
                >
                  CCPA / CPRA Notice (US)
                </button>
                <button
                  onClick={() => setDispatchType('gdpr')}
                  className={`px-3 py-1 rounded text-xs font-semibold border ${
                    dispatchType === 'gdpr'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-[#181825] dark:text-[#A6ADC8] dark:border-[#383852]'
                  }`}
                >
                  GDPR Article 17 Erasure (EU/Global)
                </button>
              </div>

              {/* Rendered Email Preview */}
              <div className="space-y-2">
                <div className="rounded bg-stone-50 dark:bg-[#181825] border border-stone-200 dark:border-[#383852] p-2 text-xs font-mono text-emerald-800 dark:text-emerald-300">
                  Subject: {getPreparedEmail().subject}
                </div>
                <textarea
                  readOnly
                  rows={10}
                  value={getPreparedEmail().body}
                  className="w-full rounded bg-stone-50 dark:bg-[#181825] border border-stone-200 dark:border-[#383852] p-3 font-mono text-xs text-stone-700 dark:text-[#CDD6F4] leading-relaxed focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleCopyNotice}
                  className="flex items-center space-x-1.5 rounded-lg border border-stone-300 dark:border-[#4E4E70] bg-stone-100 dark:bg-[#181825] px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 hover:border-emerald-600 transition"
                >
                  {copiedTemplate ? (
                    <HiCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <HiClipboardDocument className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedTemplate ? 'Copied to Clipboard!' : 'Copy Demand Text'}</span>
                </button>

                <div className="flex space-x-2">
                  <a
                    href={`mailto:${selectedBroker.contactEmail}?subject=${encodeURIComponent(
                      getPreparedEmail().subject
                    )}&body=${encodeURIComponent(getPreparedEmail().body)}`}
                    onClick={() => handleStatusChange(selectedBroker.id, 'Dispatched')}
                    className="flex items-center space-x-1.5 rounded-lg bg-emerald-700 dark:bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
                  >
                    <HiPaperAirplane className="h-3.5 w-3.5" />
                    <span>Send via Email Client</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
