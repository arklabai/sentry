import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Database,
  Bot,
  ListFilter,
  Activity,
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  ExternalLink,
  Search,
  Filter,
  FileText,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
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

type ActiveTab = 'brokers' | 'ai-shield' | 'matrix' | 'ledger';

export default function Dashboard() {
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
    chrome.storage.local.get(['sentry_profile_vault'], (res) => {
      if (!res.sentry_profile_vault) {
        setIsVaultLocked(false); // First time setup: allow entering profile
      }
    });
  }, []);

  // Vault unlock handler
  const handleUnlockVault = async () => {
    setVaultError('');
    try {
      const res = await chrome.storage.local.get(['sentry_profile_vault']);
      const vault: EncryptedVault = res.sentry_profile_vault;
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
      await chrome.storage.local.set({ sentry_profile_vault: vault });
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

  // Add domain to whitelist
  const handleAddWhitelist = () => {
    if (!newWhitelistDomain || !settings) return;
    const cleanDomain = newWhitelistDomain.trim().toLowerCase().replace(/^https?:\/\//, '');
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

  // Remove domain from whitelist
  const handleRemoveWhitelist = (domain: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      whitelistedDomains: settings.whitelistedDomains.filter((d) => d !== domain),
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  // Filtered brokers
  const filteredBrokers = brokers.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.contactEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate broker metrics
  const totalBrokersCount = brokers.length;
  const dispatchedCount = brokers.filter(
    (b) => b.status === 'Dispatched' || b.status === 'In Review'
  ).length;
  const removedCount = brokers.filter((b) => b.status === 'Removed').length;
  const pendingCount = brokers.filter((b) => b.status === 'Pending').length;

  // Format legal email template
  const getPreparedEmail = () => {
    if (!selectedBroker) return { subject: '', body: '' };
    const tpl = brokerListJson.templates[dispatchType];
    const subject = tpl.subject.replace('{{brokerName}}', selectedBroker.name);
    const body = tpl.body
      .replace(/{{brokerName}}/g, selectedBroker.name)
      .replace(/{{fullName}}/g, profile.fullName || '[Your Full Name]')
      .replace(/{{primaryEmail}}/g, profile.primaryEmail || '[Your Email]')
      .replace(/{{phone}}/g, profile.phone || '[Your Phone]')
      .replace(/{{cityState}}/g, profile.cityState || '[Your City, State]')
      .replace(/{{country}}/g, profile.country || '[Your Country]');
    return { subject, body };
  };

  const handleCopyTemplate = () => {
    const { subject, body } = getPreparedEmail();
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#060913] text-slate-100">
      {/* Top Cyber Navigation Bar */}
      <header className="border-b border-cyan-500/20 bg-[#080d1b]/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center justify-center">
              <Shield className="h-8 w-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,240,255,0.8)]" />
              <span className="absolute h-3 w-3 rounded-full bg-cyan-300 animate-ping" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-wider text-white">
                  SENTRY <span className="text-cyan-400">AI</span>
                </h1>
                <span className="rounded bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                  COMMAND CENTER
                </span>
              </div>
              <p className="text-xs text-cyan-400/90 font-mono font-medium tracking-wide">
                Be Fearless Online
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1.5 rounded-xl bg-slate-900/90 border border-slate-800 p-1">
            <button
              onClick={() => setActiveTab('brokers')}
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'brokers'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Data Broker Hub</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-shield')}
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'ai-shield'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>AI Opt-Out Center</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'matrix'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Domain Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'ledger'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Live Threat Ledger</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full flex-1 p-6 space-y-6">
        {/* Global Protection Metrics Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="cyber-card p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-mono uppercase">Total Trackers Blocked</span>
              <ShieldAlert className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300 glow-cyan">
              {globalStats?.totalTrackersBlocked || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">DNR static & dynamic filters</p>
          </div>

          <div className="cyber-card p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-mono uppercase">Fingerprints Scrambled</span>
              <ShieldCheck className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-violet-300 glow-violet">
              {globalStats?.totalFingerprintsScrambled || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Canvas, WebGL & Audio noise</p>
          </div>

          <div className="cyber-card p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-mono uppercase">AI Scrapers Blocked</span>
              <Bot className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-300">
              {globalStats?.totalAiScrapersBlocked || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Meta, ByteDance, TikTok pixels</p>
          </div>

          <div className="cyber-card p-4">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-mono uppercase">Brokers Cleared / Audited</span>
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-300 glow-emerald">
              {removedCount} / {totalBrokersCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">CCPA / GDPR Art 17 opt-outs</p>
          </div>
        </div>

        {/* TAB 1: DATA BROKER HUB (INCOGNI ALTERNATIVE) */}
        {activeTab === 'brokers' && (
          <div className="space-y-6">
            {/* Identity Profile & Local AES-256 Vault */}
            <div className="cyber-card p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Lock className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-base font-bold text-white">
                      Encrypted Personal Identity Vault (AES-256-GCM)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
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
                        className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={handleUnlockVault}
                        className="flex items-center space-x-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Unlock</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsVaultLocked(true)}
                      className="flex items-center space-x-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Lock Vault</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vault Error / Saved Message */}
              {vaultError && (
                <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-2.5 text-xs text-rose-300">
                  {vaultError}
                </div>
              )}
              {vaultSavedNotice && (
                <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
                  Identity Vault encrypted with AES-256 and securely saved locally!
                </div>
              )}

              {/* Unlocked Form Fields */}
              {!isVaultLocked && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Primary Contact Email
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. jane@example.com"
                      value={profile.primaryEmail}
                      onChange={(e) => setProfile({ ...profile, primaryEmail: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      City, State / Region
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. San Francisco, CA"
                      value={profile.cityState}
                      onChange={(e) => setProfile({ ...profile, cityState: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. United States"
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Passphrase (for AES-256)
                    </label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={vaultPassphrase}
                      onChange={(e) => setVaultPassphrase(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="md:col-span-3 flex justify-end">
                    <button
                      onClick={handleSaveVault}
                      className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
                    >
                      Save & Re-Encrypt Identity Vault
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Broker Registry & Workflow Table */}
            <div className="cyber-card p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Data Broker Remediation Registry ({filteredBrokers.length} of {totalBrokersCount})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct automated CCPA/CPRA & GDPR Article 17 erasure requests.
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search broker name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rounded-lg bg-slate-900 border border-slate-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
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
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3">Data Broker</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Legal Endpoint</th>
                      <th className="p-3">Opt-Out Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {filteredBrokers.map((broker) => {
                      const statusStyles: Record<OptOutStatus, string> = {
                        Pending: 'bg-slate-800 text-slate-400 border-slate-700',
                        Dispatched: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40',
                        'In Review': 'bg-amber-950/60 text-amber-300 border-amber-500/40',
                        Removed: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
                      };

                      return (
                        <tr key={broker.id} className="hover:bg-slate-900/40 transition">
                          <td className="p-3">
                            <div className="font-sans font-semibold text-white">
                              {broker.name}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Jurisdiction: {broker.jurisdiction}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">
                              {broker.category}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">
                            <a
                              href={broker.optOutUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center space-x-1"
                            >
                              <span>Opt-Out Portal</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <div className="text-[10px] text-slate-500">{broker.contactEmail}</div>
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
                              className="rounded border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-[11px] font-sans text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400"
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
            <div className="cyber-card p-5">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <Bot className="h-6 w-6 text-cyan-400" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Commercial AI Model Training Defenses
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sentry AI injects automated signals and blocks surveillance telemetry feeding LLM datasets.
                  </p>
                </div>
              </div>

              {/* Protocol Defense Status */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="cyber-card p-4 bg-slate-900/40">
                  <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Global Privacy Control (Sec-GPC: 1)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Sentry automatically injects the <code className="text-cyan-300">Sec-GPC: 1</code> and{' '}
                    <code className="text-cyan-300">DNT: 1</code> headers onto 100% of outgoing requests via DeclarativeNetRequest.
                  </p>
                  <span className="inline-block mt-2 rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">
                    STATUS: ACTIVE ON ALL BROWSING
                  </span>
                </div>

                <div className="cyber-card p-4 bg-slate-900/40">
                  <div className="flex items-center space-x-2 text-violet-400 mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider">
                      Anti-AI Scraping Crawler Nullifier
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    Declares <code className="text-violet-300">X-Robots-Tag: noai, noimageai</code> and blocks commercial web harvesters from indexing your private page sessions.
                  </p>
                  <span className="inline-block mt-2 rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300 font-mono">
                    STATUS: ARMED
                  </span>
                </div>
              </div>

              {/* Platform-Specific Training Locks */}
              <h3 className="text-sm font-bold text-white mt-6 mb-3">
                Platform-Specific AI Model Training Locks
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Meta AI */}
                <div className="cyber-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">Meta / Facebook AI Training</h4>
                      <span className="rounded bg-rose-950/60 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5">
                        High Exploitation Risk
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Meta uses all user posts, comments, photos, and captions to train Llama generative models by default.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-cyan-400">
                      Telemetry & Pixels: Blocked
                    </span>
                    <a
                      href="https://www.facebook.com/privacy/genai"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition"
                    >
                      <span>Opt-Out Form</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* X / Grok */}
                <div className="cyber-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">X (Twitter) Grok Model Training</h4>
                      <span className="rounded bg-rose-950/60 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5">
                        Opt-in by Default
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      X automatically opts all users into sharing interactions, posts, and search inputs with xAI Grok.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-cyan-400">
                      Beacon Telemetry: Blocked
                    </span>
                    <a
                      href="https://x.com/settings/grok_settings"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition"
                    >
                      <span>Grok Settings</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Google Gemini */}
                <div className="cyber-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">Google Gemini Activity Lock</h4>
                      <span className="rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5">
                        Continuous Ingestion
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Google associates web activity, Chrome sync, and search history with Gemini assistant model fine-tuning.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-cyan-400">
                      Google Analytics: Intercepted
                    </span>
                    <a
                      href="https://myactivity.google.com/product/gemini"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition"
                    >
                      <span>Gemini Privacy</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* LinkedIn AI */}
                <div className="cyber-card p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">LinkedIn Model Training Shield</h4>
                      <span className="rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5">
                        Professional Dossiers
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      LinkedIn trains generative writing and matching models on user resumes, articles, and recommendations.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-[11px] font-mono text-cyan-400">
                      Insight Pixel: Blocked
                    </span>
                    <a
                      href="https://www.linkedin.com/mypreferences/d/data-for-ai-improvement"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 rounded bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition"
                    >
                      <span>LinkedIn AI Toggle</span>
                      <ExternalLink className="h-3 w-3" />
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
            <div className="cyber-card p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">Domain Whitelist & Exception Matrix</h2>
                <p className="text-xs text-slate-400">
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
                  className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 w-80 focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleAddWhitelist}
                  className="flex items-center space-x-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Whitelist</span>
                </button>
              </div>

              {/* Whitelist Tag Cloud */}
              <div className="pt-2">
                <h4 className="text-xs font-mono text-slate-400 uppercase mb-2">
                  Currently Whitelisted Domains ({settings?.whitelistedDomains.length || 0})
                </h4>
                {settings?.whitelistedDomains && settings.whitelistedDomains.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.whitelistedDomains.map((domain) => (
                      <span
                        key={domain}
                        className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200"
                      >
                        <span className="font-mono">{domain}</span>
                        <button
                          onClick={() => handleRemoveWhitelist(domain)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No domains whitelisted. Full active shield enforced.</p>
                )}
              </div>
            </div>

            {/* Static Rulesets Info */}
            <div className="cyber-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">DeclarativeNetRequest Static Engine Rulesets</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-cyan-400 font-semibold">rules_ai_trackers.json</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Meta Pixel, TikTok Insight, LinkedIn Analytics, Google Analytics v4, ByteDance, FPJS fingerprinting bots.
                    </p>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px]">
                    ENABLED (25 Rules)
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-cyan-400 font-semibold">rules_privacy_headers.json</span>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                      Sec-GPC: 1 (Global Privacy Control) & DNT: 1 header injection across all web requests.
                    </p>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px]">
                    ENABLED (GLOBAL)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REAL-TIME THREAT INSPECTION LEDGER */}
        {activeTab === 'ledger' && (
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Live Interception Telemetry Ledger</h2>
                <p className="text-xs text-slate-400">
                  Real-time chronological audit trail of all blocked trackers, scrambled canvas probes, and modified headers.
                </p>
              </div>
              <span className="rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 px-2 py-1 text-xs font-mono">
                {threatEvents.length} Events Logged
              </span>
            </div>

            {threatEvents.length > 0 ? (
              <div className="space-y-2 overflow-y-auto max-h-[500px] font-mono text-xs">
                {threatEvents.map((evt) => {
                  const typeColors: Record<string, string> = {
                    canvas: 'text-violet-400 border-violet-500/30 bg-violet-950/20',
                    audio: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
                    webgl: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20',
                    tracker: 'text-rose-400 border-rose-500/30 bg-rose-950/20',
                    zapper: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
                  };

                  return (
                    <div
                      key={evt.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start space-x-3">
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] uppercase font-bold shrink-0 ${
                            typeColors[evt.type] || 'text-slate-400'
                          }`}
                        >
                          {evt.type}
                        </span>
                        <div>
                          <div className="text-slate-200 font-sans font-medium">
                            {evt.description}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-lg">
                            Source: {evt.source}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 shrink-0">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                Active monitoring in progress. Threat events will stream here live as pages load.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Legal Notice Generation Modal */}
      {selectedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="cyber-card max-w-2xl w-full p-6 space-y-4 bg-[#090e1c] border border-cyan-500/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Formal Deletion Demand: {selectedBroker.name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Recipient: {selectedBroker.contactEmail}
                </span>
              </div>
              <button
                onClick={() => setSelectedBroker(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Jurisdiction Select */}
            <div className="flex space-x-2">
              <button
                onClick={() => setDispatchType('ccpa')}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  dispatchType === 'ccpa'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                CCPA / CPRA Notice (US)
              </button>
              <button
                onClick={() => setDispatchType('gdpr')}
                className={`px-3 py-1 rounded text-xs font-semibold border ${
                  dispatchType === 'gdpr'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                GDPR Article 17 Erasure (EU/Global)
              </button>
            </div>

            {/* Subject and Body Preview */}
            <div className="space-y-2">
              <div className="rounded bg-slate-900 border border-slate-800 p-2 text-xs font-mono text-cyan-300">
                Subject: {getPreparedEmail().subject}
              </div>
              <textarea
                readOnly
                rows={10}
                value={getPreparedEmail().body}
                className="w-full rounded bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-slate-300 leading-relaxed focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleCopyTemplate}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-400"
              >
                {copiedTemplate ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedTemplate ? 'Copied to Clipboard!' : 'Copy Demand Text'}</span>
              </button>

              <div className="flex space-x-2">
                <a
                  href={`mailto:${selectedBroker.contactEmail}?subject=${encodeURIComponent(
                    getPreparedEmail().subject
                  )}&body=${encodeURIComponent(getPreparedEmail().body)}`}
                  onClick={() => handleStatusChange(selectedBroker.id, 'Dispatched')}
                  className="flex items-center space-x-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send via Email Client</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
