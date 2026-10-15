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
} from '../types';
import { encryptProfile, decryptProfile } from '../lib/crypto';
import brokerListJson from '../lib/brokerList.json';
import SentryShieldLogo from '../components/SentryShieldLogo';
import { useTheme } from '../hooks/useTheme';

type ActiveTab = 'brokers' | 'ai-shield' | 'matrix' | 'ledger';

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
