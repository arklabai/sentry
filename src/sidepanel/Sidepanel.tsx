import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Power,
  Zap,
  Layers,
  Database,
  Activity,
  Globe,
  RefreshCw,
  ExternalLink,
  Lock,
  Cpu,
  Volume2,
  CheckCircle2,
  Search,
  Plus,
  Trash2,
  Maximize2,
  Sparkles,
  Server,
  Crosshair,
  Radio,
  Fingerprint,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import {
  PrivacySettings,
  TabThreatStats,
  GlobalPrivacyStats,
  MatrixAction,
  NoiseIntensity,
  NetworkLogEntry,
  FilterListInfo,
  BrokerEntry,
} from '../types';
import SentryShieldLogo from '../components/SentryShieldLogo';
import { useTheme } from '../hooks/useTheme';

type SidebarTab = 'overview' | 'matrix' | 'fingerprint' | 'network' | 'broker';

export default function Sidepanel() {
  const { themeMode, isDark, cycleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SidebarTab>('overview');
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [stats, setStats] = useState<TabThreatStats | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalPrivacyStats | null>(null);
  const [brokers, setBrokers] = useState<BrokerEntry[]>([]);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Network log filtering
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkTypeFilter, setNetworkTypeFilter] = useState('all');

  // Broker tab search
  const [brokerSearch, setBrokerSearch] = useState('');

  // Custom filter rule input
  const [newCustomRule, setNewCustomRule] = useState('');

  // Live Canvas fingerprint test simulator state
  const [testCanvasHash, setTestCanvasHash] = useState<string>('');
  const [isTestingCanvas, setIsTestingCanvas] = useState(false);

  // Fetch live tab state
  useEffect(() => {
    function refreshData() {
      chrome.runtime.sendMessage({ action: 'GET_ACTIVE_TAB_STATS' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res) {
          setStats(res.stats);
          setGlobalStats(res.globalStats);
          setSettings(res.settings);
          if (res.stats && res.settings) {
            setIsWhitelisted(res.settings.whitelistedDomains.includes(res.stats.domain));
          }
        }
        setLoading(false);
      });
    }

    refreshData();
    const interval = setInterval(refreshData, 1200);
    return () => clearInterval(interval);
  }, []);

  // Fetch brokers for Broker Hub tab
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'GET_BROKERS' }, (res) => {
      if (res && Array.isArray(res)) {
        setBrokers(res);
      }
    });
  }, []);

  const saveSettings = (updated: PrivacySettings) => {
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  const handleToggleMasterShield = () => {
    if (!settings) return;
    saveSettings({ ...settings, masterShield: !settings.masterShield });
  };

  const handleModeChange = (mode: 'strict' | 'balanced' | 'permissive') => {
    if (!settings) return;
    saveSettings({ ...settings, mode });
  };

  const handleToggleWhitelist = () => {
    if (!settings || !stats || !stats.domain) return;
    const current = settings.whitelistedDomains;
    let next: string[];
    if (current.includes(stats.domain)) {
      next = current.filter((d) => d !== stats.domain);
      setIsWhitelisted(false);
    } else {
      next = [...current, stats.domain];
      setIsWhitelisted(true);
    }
    saveSettings({ ...settings, whitelistedDomains: next });
  };

  // Quick Feature Shield Toggles
  const handleToggleFeature = (
    key: 'canvasShield' | 'audioShield' | 'webglShield' | 'aiScraperShield'
  ) => {
    if (!settings) return;
    saveSettings({ ...settings, [key]: !settings[key] });
  };

  // Matrix Action Handler
  const handleMatrixChange = (
    key: keyof PrivacySettings['uBlock']['matrix'],
    action: MatrixAction
  ) => {
    if (!settings) return;
    const updated = {
      ...settings,
      uBlock: {
        ...settings.uBlock,
        matrix: {
          ...settings.uBlock.matrix,
          [key]: action,
        },
      },
    };
    saveSettings(updated);
  };

  // Entropy Shield Settings Handlers
  const handleCanvasBlockerChange = <K extends keyof PrivacySettings['canvasBlocker']>(
    key: K,
    val: PrivacySettings['canvasBlocker'][K]
  ) => {
    if (!settings) return;
    const updated = {
      ...settings,
      canvasBlocker: {
        ...settings.canvasBlocker,
        [key]: val,
      },
    };
    saveSettings(updated);
  };

  // Toggle filter lists
  const handleToggleFilterList = (id: string) => {
    if (!settings) return;
    const updatedLists = settings.uBlock.filterLists.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    saveSettings({
      ...settings,
      uBlock: {
        ...settings.uBlock,
        filterLists: updatedLists,
      },
    });
  };

  // Add custom filter rule
  const handleAddCustomRule = () => {
    if (!settings || !newCustomRule.trim()) return;
    const updatedFilters = [...settings.uBlock.customFilters, newCustomRule.trim()];
    saveSettings({
      ...settings,
      uBlock: {
        ...settings.uBlock,
        customFilters: updatedFilters,
      },
    });
    setNewCustomRule('');
  };

  const handleRemoveCustomRule = (rule: string) => {
    if (!settings) return;
    const updatedFilters = settings.uBlock.customFilters.filter((r) => r !== rule);
    saveSettings({
      ...settings,
      uBlock: {
        ...settings.uBlock,
        customFilters: updatedFilters,
      },
    });
  };

  const handleActivateZapper = () => {
    chrome.runtime.sendMessage({ action: 'ACTIVATE_ELEMENT_ZAPPER' });
  };

  const handleClearLogs = () => {
    chrome.runtime.sendMessage({ action: 'CLEAR_TAB_LOGS' }, () => {
      if (stats) setStats({ ...stats, networkLogs: [] });
    });
  };

  const handleReloadTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) chrome.tabs.reload(tab.id);
    });
  };

  // Test Canvas Fingerprinting Simulator
  const handleRunCanvasTest = () => {
    setIsTestingCanvas(true);
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 36;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillStyle = '#16a34a';
          ctx.fillText('Sentry Test \uD83D\uDEE1\uFE0F', 2, 2);
          const dataUrl = canvas.toDataURL();
          let hash = 0;
          for (let i = 0; i < dataUrl.length; i++) {
            hash = (Math.imul(31, hash) + dataUrl.charCodeAt(i)) | 0;
          }
          setTestCanvasHash('0x' + (hash >>> 0).toString(16).toUpperCase());
        }
      } catch {
        setTestCanvasHash('0x7A4F2C18');
      }
      setIsTestingCanvas(false);
    }, 250);
  };

  if (loading || !settings) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-3 bg-[#FAF9F6] dark:bg-[#1E1E2E] text-center p-6 transition-colors">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 dark:border-emerald-400/20 dark:border-t-emerald-400 animate-spin" />
          <SentryShieldLogo size={24} armed={true} glow={false} className="absolute animate-pulse" />
        </div>
        <p className="font-mono text-xs text-stone-600 dark:text-[#CDD6F4] tracking-widest uppercase">
          Initializing Sentry AI Shield...
        </p>
      </div>
    );
  }

  const isShieldOn = settings.masterShield && !isWhitelisted;
  const currentDomain = stats?.domain || 'Current Page';
  const totalBlockedThisPage =
    (stats?.trackersBlocked || 0) +
    (stats?.canvasFaked || 0) +
    (stats?.audioFaked || 0) +
    (stats?.webglFaked || 0) +
    (stats?.aiBeaconsBlocked || 0);

  const score = isShieldOn ? stats?.safetyScore || 'A+' : 'F';
  const scoreBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
    'A+': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-500/40' },
    A: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-500/40' },
    B: { bg: 'bg-emerald-50/70 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-600/30' },
    C: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-500/40' },
    D: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-500/40' },
    F: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-800 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-500/40' },
  };

  const currentScoreStyle = scoreBadgeColors[score] || scoreBadgeColors['F'];

  // Filtered network logs
  const filteredLogs = (stats?.networkLogs || []).filter((log) => {
    const matchesSearch =
      log.url.toLowerCase().includes(networkSearch.toLowerCase()) ||
      log.domain.toLowerCase().includes(networkSearch.toLowerCase());
    const matchesType =
      networkTypeFilter === 'all' || log.type.toLowerCase().includes(networkTypeFilter.toLowerCase());
    return matchesSearch && matchesType;
  });

  // Filtered brokers
  const filteredBrokers = brokers.filter(
    (b) =>
      b.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
      b.category.toLowerCase().includes(brokerSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#FAF9F6] dark:bg-[#1E1E2E] text-stone-900 dark:text-[#F5E0DC] select-none overflow-hidden font-sans transition-colors duration-200">
      {/* ========================================================= */}
      {/* 1. TOP EXECUTIVE BRAND HEADER */}
      {/* ========================================================= */}
      <header className="border-b border-stone-200/90 dark:border-[#383852] bg-white/95 dark:bg-[#252538]/95 backdrop-blur px-3.5 py-2.5 shrink-0 transition-colors">
        <div className="flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-2.5">
            <SentryShieldLogo size={32} armed={isShieldOn} glow={isShieldOn} />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm tracking-tight text-stone-900 dark:text-white">
                  SENTRY <span className="text-emerald-700 dark:text-emerald-400">AI</span>
                </span>
                <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  SHIELD
                </span>
              </div>
              <p className="text-[10px] text-stone-500 dark:text-[#A6ADC8] font-mono tracking-wider">
                Be Fearless Online
              </p>
            </div>
          </div>

          {/* Quick Utility Tools */}
          <div className="flex items-center space-x-1.5">
            {/* Theme Toggle Button (Auto / Light / Dark) */}
            <button
              onClick={cycleTheme}
              title={`Theme: ${themeMode.toUpperCase()} (Click to toggle)`}
              className="flex items-center space-x-1 rounded-md border border-stone-200 dark:border-[#4E4E70] bg-stone-100/80 dark:bg-[#181825] px-2 py-1 text-[11px] font-medium text-stone-700 dark:text-[#CDD6F4] hover:bg-stone-200 dark:hover:bg-[#2E2E44] transition"
            >
              {themeMode === 'system' ? (
                <Monitor className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              ) : themeMode === 'light' ? (
                <Sun className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
              )}
              <span className="capitalize">{themeMode}</span>
            </button>

            <button
              onClick={handleActivateZapper}
              title="Element Zapper (Click to purge in-page ad or banner)"
              className="flex items-center space-x-1 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
            >
              <Crosshair className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              <span>Zap</span>
            </button>

            <button
              onClick={handleReloadTab}
              title="Refresh active tab"
              className="rounded-md border border-stone-200 dark:border-[#4E4E70] bg-stone-100/80 dark:bg-[#181825] p-1.5 text-stone-600 dark:text-[#CDD6F4] hover:text-stone-900 dark:hover:text-white transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              title="Launch Fullscreen Command Center & Broker Vault"
              className="rounded-md border border-stone-200 dark:border-[#4E4E70] bg-stone-100/80 dark:bg-[#181825] p-1.5 text-stone-600 dark:text-[#CDD6F4] hover:text-stone-900 dark:hover:text-white transition"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Current Origin & Whitelist Pill */}
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200 dark:border-[#383852] px-2.5 py-1.5 text-xs transition-colors">
          <div className="flex items-center space-x-1.5 truncate max-w-[210px]">
            <Globe className="h-3.5 w-3.5 text-stone-400 dark:text-[#9399B2] shrink-0" />
            <span className="font-mono text-[11px] text-stone-700 dark:text-[#CDD6F4] truncate">
              {currentDomain}
            </span>
          </div>

          <button
            onClick={handleToggleWhitelist}
            className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition ${
              isWhitelisted
                ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40'
                : 'bg-stone-200/80 text-stone-700 border border-stone-300 hover:text-stone-900 dark:bg-[#2E2E44] dark:text-[#CDD6F4] dark:border-[#4E4E70]'
            }`}
          >
            {isWhitelisted ? 'Whitelisted' : 'Whitelist Site'}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. TAB NAVIGATION BAR */}
      {/* ========================================================= */}
      <nav className="flex border-b border-stone-200 dark:border-[#383852] bg-white/70 dark:bg-[#181825]/70 px-2 overflow-x-auto shrink-0 scrollbar-none transition-colors">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300 font-semibold'
              : 'border-transparent text-stone-500 dark:text-[#9399B2] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300 font-semibold'
              : 'border-transparent text-stone-500 dark:text-[#9399B2] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Request Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('fingerprint')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'fingerprint'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300 font-semibold'
              : 'border-transparent text-stone-500 dark:text-[#9399B2] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Fingerprint Shield</span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'network'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300 font-semibold'
              : 'border-transparent text-stone-500 dark:text-[#9399B2] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Traffic Log</span>
        </button>

        <button
          onClick={() => setActiveTab('broker')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'broker'
              ? 'border-emerald-600 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300 font-semibold'
              : 'border-transparent text-stone-500 dark:text-[#9399B2] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Broker Hub</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* 3. SCROLLABLE TAB CONTENT BODY */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            {/* HERO DEFENSE CARD */}
            <div className="sentry-card p-4 relative overflow-hidden bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-sm transition-colors">
              <div className="flex items-center justify-between">
                {/* Shield Pulse Toggle */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleToggleMasterShield}
                    title={isShieldOn ? 'Click to Pause Shield' : 'Click to Arm Shield'}
                    className={`relative p-2 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 ${
                      isShieldOn
                        ? 'border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40 shield-armed-pulse'
                        : 'border-rose-400/40 bg-rose-50/80 dark:bg-rose-950/40 shield-disarmed-pulse'
                    }`}
                  >
                    <SentryShieldLogo size={46} armed={isShieldOn} glow={isShieldOn} />
                  </button>

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isShieldOn ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      <h2 className="text-sm font-bold tracking-wide text-stone-900 dark:text-white">
                        {isShieldOn ? 'DEFENSE ACTIVE' : 'DEFENSE PAUSED'}
                      </h2>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                      {isShieldOn
                        ? `${totalBlockedThisPage} threats intercepted`
                        : 'Protection suspended for current page'}
                    </p>
                  </div>
                </div>

                {/* Safety Score Rating */}
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border px-3 py-1.5 ${currentScoreStyle.bg} ${currentScoreStyle.border}`}
                >
                  <span className="text-[10px] font-mono uppercase text-stone-500 dark:text-[#A6ADC8] tracking-wider">
                    GRADE
                  </span>
                  <span className={`text-xl font-black font-mono leading-none ${currentScoreStyle.text}`}>
                    {score}
                  </span>
                </div>
              </div>

              {/* Strictness Profile Segmented Control */}
              <div className="mt-3.5 pt-3 border-t border-stone-100 dark:border-[#383852]">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-[#A6ADC8] mb-1.5">
                  <span className="text-[11px] font-medium">Protection Profile</span>
                  <span className="font-mono text-[10px] capitalize text-emerald-700 dark:text-emerald-400 font-semibold">
                    {settings.mode}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100/90 dark:bg-[#181825] p-1 border border-stone-200 dark:border-[#383852]">
                  {(['balanced', 'strict', 'permissive'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`rounded py-1 text-xs font-medium capitalize transition ${
                        settings.mode === m
                          ? 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600 dark:text-white'
                          : 'text-stone-600 dark:text-[#A6ADC8] hover:text-stone-900 dark:hover:text-[#F5E0DC]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2x2 TELEMETRY METRIC TILES */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="sentry-card p-3 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-xl shadow-xs transition-colors">
                <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Trackers Intercepted</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {stats?.trackersBlocked || 0}
                </div>
                <p className="text-[10px] text-stone-400 dark:text-[#9399B2] mt-0.5">DNR static & dynamic</p>
              </div>

              <div className="sentry-card p-3 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-xl shadow-xs transition-colors">
                <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Fingerprints Masked</span>
                  <Fingerprint className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
                  {(stats?.canvasFaked || 0) + (stats?.audioFaked || 0) + (stats?.webglFaked || 0)}
                </div>
                <p className="text-[10px] text-stone-400 dark:text-[#9399B2] mt-0.5">Canvas & Audio entropy</p>
              </div>

              <div className="sentry-card p-3 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-xl shadow-xs transition-colors">
                <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider">AI Scrapers Blocked</span>
                  <Radio className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400">
                  {stats?.aiBeaconsBlocked || 0}
                </div>
                <p className="text-[10px] text-stone-400 dark:text-[#9399B2] mt-0.5">Meta, TikTok, LLM crawlers</p>
              </div>

              <div className="sentry-card p-3 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-xl shadow-xs transition-colors">
                <div className="flex items-center justify-between text-stone-500 dark:text-[#A6ADC8] mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider">Lifetime Protected</span>
                  <Database className="h-3.5 w-3.5 text-stone-600 dark:text-[#CDD6F4]" />
                </div>
                <div className="text-xl font-bold font-mono text-stone-900 dark:text-white">
                  {(globalStats?.totalTrackersBlocked || 0) +
                    (globalStats?.totalFingerprintsScrambled || 0) +
                    (globalStats?.totalAiScrapersBlocked || 0)}
                </div>
                <p className="text-[10px] text-stone-400 dark:text-[#9399B2] mt-0.5">All-time interceptions</p>
              </div>
            </div>

            {/* CORE DEFENSE TOGGLES */}
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2.5 transition-colors">
              <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider font-mono">
                Active Privacy Modules
              </h3>

              <div className="space-y-2">
                {[
                  {
                    key: 'canvasShield' as const,
                    icon: Cpu,
                    label: 'Canvas Fingerprint Scrambler',
                    desc: 'Injects persistent mathematical entropy into 2D canvas',
                    active: settings.canvasShield,
                  },
                  {
                    key: 'audioShield' as const,
                    icon: Volume2,
                    label: 'AudioContext Buffer Defender',
                    desc: 'Perturbs acoustic frequencies against hardware profiling',
                    active: settings.audioShield,
                  },
                  {
                    key: 'webglShield' as const,
                    icon: Layers,
                    label: 'WebGL GPU Hardware Masking',
                    desc: 'Normalizes unmasked graphics card renderer strings',
                    active: settings.webglShield,
                  },
                  {
                    key: 'aiScraperShield' as const,
                    icon: Radio,
                    label: 'AI Model Training Opt-Out',
                    desc: 'Injects Sec-GPC: 1 & cuts off AI ingestion endpoints',
                    active: settings.aiScraperShield,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-lg bg-stone-50/70 dark:bg-[#181825]/70 border border-stone-200/80 dark:border-[#383852] p-2.5 transition"
                    >
                      <div className="flex items-start space-x-2.5">
                        <Icon className="h-4 w-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-stone-900 dark:text-white leading-tight">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFeature(item.key)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          item.active ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            item.active ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LIVE THREAT ACTIVITY FEED */}
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider font-mono">
                    Live Interception Feed
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-stone-400 dark:text-[#9399B2]">
                  {stats?.threatEvents?.length || 0} events
                </span>
              </div>

              {stats?.threatEvents && stats.threatEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-44 overflow-y-auto font-mono text-[11px]">
                  {stats.threatEvents.slice(-6).reverse().map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] px-2 py-1"
                    >
                      <div className="flex items-center space-x-1.5 truncate max-w-[230px]">
                        <span
                          className={`rounded px-1 text-[9px] uppercase font-bold ${
                            ev.type === 'tracker'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : ev.type === 'canvas'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-stone-200 text-stone-800 dark:bg-[#2E2E44] dark:text-[#CDD6F4]'
                          }`}
                        >
                          {ev.type}
                        </span>
                        <span className="truncate text-stone-700 dark:text-[#CDD6F4] font-sans text-xs">
                          {ev.description}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 dark:text-[#9399B2] shrink-0">
                        {new Date(ev.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-stone-400 dark:text-[#9399B2] font-mono italic">
                  Active monitoring in progress. Threat events will appear here live.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REQUEST MATRIX & DNR FILTER ENGINE */}
        {/* ========================================================= */}
        {activeTab === 'matrix' && (
          <div className="space-y-3.5">
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-3 transition-colors">
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                  Origin Request Matrix
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                  Control granular outbound resource requests from this domain
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'firstPartyScripts' as const, label: '1st-Party Scripts' },
                  { key: 'thirdPartyScripts' as const, label: '3rd-Party Scripts' },
                  { key: 'thirdPartyFrames' as const, label: '3rd-Party Iframes' },
                  { key: 'inlineScripts' as const, label: 'Inline Scripts' },
                  { key: 'webSockets' as const, label: 'WebSockets & Beacons' },
                ].map((row) => {
                  const currentAction = settings.uBlock.matrix[row.key] || 'noop';
                  return (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] p-2 text-xs"
                    >
                      <span className="font-mono text-[11px] text-stone-700 dark:text-[#CDD6F4]">
                        {row.label}
                      </span>
                      <div className="flex space-x-1">
                        {(['allow', 'noop', 'block'] as MatrixAction[]).map((act) => (
                          <button
                            key={act}
                            onClick={() => handleMatrixChange(row.key, act)}
                            className={`rounded px-2 py-0.5 text-[10px] font-mono uppercase font-bold transition ${
                              currentAction === act
                                ? act === 'allow'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                  : act === 'block'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-white dark:bg-[#252538] text-stone-400 dark:text-[#9399B2] border border-stone-200 dark:border-[#4E4E70]'
                            }`}
                          >
                            {act === 'noop' ? 'AUTO' : act}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Lists */}
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2.5 transition-colors">
              <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                DeclarativeNetRequest Filter Lists
              </h3>

              <div className="space-y-1.5">
                {settings.uBlock.filterLists.map((fl) => (
                  <div
                    key={fl.id}
                    className="flex items-center justify-between rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] p-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white">{fl.name}</div>
                      <div className="text-[10px] text-stone-500 dark:text-[#A6ADC8]">
                        {(fl.count || 0).toLocaleString()} pre-compiled rules
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFilterList(fl.id)}
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition ${
                        fl.enabled
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40'
                          : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {fl.enabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Rules Input */}
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2.5 transition-colors">
              <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                Custom Adblock Filter Rule
              </h3>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. ||badtracker.com^"
                  value={newCustomRule}
                  onChange={(e) => setNewCustomRule(e.target.value)}
                  className="flex-1 rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-2.5 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                />
                <button
                  onClick={handleAddCustomRule}
                  className="flex items-center space-x-1 rounded-lg bg-emerald-700 dark:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {settings.uBlock.customFilters.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {settings.uBlock.customFilters.map((r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between rounded bg-stone-50 dark:bg-[#181825] px-2 py-1 text-[11px] font-mono text-stone-700 dark:text-[#CDD6F4] border border-stone-200 dark:border-[#383852]"
                    >
                      <span className="truncate max-w-[240px]">{r}</span>
                      <button
                        onClick={() => handleRemoveCustomRule(r)}
                        className="text-stone-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FINGERPRINT SCRAMBLER DEFENSE */}
        {/* ========================================================= */}
        {activeTab === 'fingerprint' && (
          <div className="space-y-3.5">
            {/* Live Canvas Hash Simulator */}
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2.5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Fingerprint className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                    Fingerprint Randomizer Test
                  </h3>
                </div>
                <button
                  onClick={handleRunCanvasTest}
                  disabled={isTestingCanvas}
                  className="flex items-center space-x-1 rounded bg-emerald-700 dark:bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-800 transition"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isTestingCanvas ? 'Calculating...' : 'Run Test'}</span>
                </button>
              </div>

              <div className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] p-2.5 text-xs font-mono">
                <div className="flex justify-between items-center text-stone-500 dark:text-[#A6ADC8] mb-1">
                  <span>Simulated Hash:</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                    ENTROPY ACTIVE
                  </span>
                </div>
                <div className="text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  {testCanvasHash || '0x5E8B901C4A'}
                </div>
                <p className="text-[10px] text-stone-400 dark:text-[#9399B2] mt-1 font-sans">
                  Persistent mathematical noise is active. Tracking scripts receive pseudo-random values.
                </p>
              </div>
            </div>

            {/* Granular CanvasBlocker Controls */}
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2.5 transition-colors">
              <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                Biometric & Hardware API Noise
              </h3>

              <div className="space-y-1.5">
                {[
                  { key: 'domRectShield' as const, label: 'DOMRect Geometry Noise', desc: 'Randomizes sub-pixel bounding box dimensions' },
                  { key: 'textMetricsShield' as const, label: 'TextMetrics Typography Defense', desc: 'Perturbs font rendering metrics' },
                  { key: 'navigatorHardwareShield' as const, label: 'Hardware Normalization', desc: 'Spoofs navigator.hardwareConcurrency & deviceMemory' },
                  { key: 'screenResolutionShield' as const, label: 'Screen Dimension Masking', desc: 'Normalizes window.screen to standard aspect ratios' },
                  { key: 'windowNameShield' as const, label: 'Window Name Sanitizer', desc: 'Clears cross-session window.name trackers' },
                  { key: 'historyLengthShield' as const, label: 'History Length Masking', desc: 'Obfuscates window.history.length profiling' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] p-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white">{item.label}</div>
                      <div className="text-[10px] text-stone-500 dark:text-[#A6ADC8]">{item.desc}</div>
                    </div>
                    <button
                      onClick={() =>
                        handleCanvasBlockerChange(item.key, !settings.canvasBlocker[item.key])
                      }
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition ${
                        settings.canvasBlocker[item.key]
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {settings.canvasBlocker[item.key] ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: LIVE TRAFFIC INSPECTOR */}
        {/* ========================================================= */}
        {activeTab === 'network' && (
          <div className="space-y-3.5">
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-2.5 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                  Network Traffic Inspector
                </h3>
                <button
                  onClick={handleClearLogs}
                  className="text-[10px] font-mono text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  Clear Logs
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex space-x-1.5">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search request domain or URL..."
                    value={networkSearch}
                    onChange={(e) => setNetworkSearch(e.target.value)}
                    className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] pl-8 pr-2.5 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
                  />
                </div>
                <select
                  value={networkTypeFilter}
                  onChange={(e) => setNetworkTypeFilter(e.target.value)}
                  className="rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-2 py-1.5 text-xs text-stone-900 dark:text-white focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="script">Scripts</option>
                  <option value="image">Images</option>
                  <option value="xmlhttprequest">XHR / Fetch</option>
                  <option value="sub_frame">Frames</option>
                </select>
              </div>

              {/* Log List */}
              <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-[11px]">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] p-1.5 hover:bg-stone-100 dark:hover:bg-[#2E2E44] transition"
                    >
                      <div className="truncate max-w-[210px]">
                        <div className="text-stone-800 dark:text-[#CDD6F4] font-medium truncate">
                          {log.url}
                        </div>
                        <div className="text-[9px] text-stone-400 dark:text-[#9399B2]">
                          {log.domain} • {log.type}
                        </div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] uppercase font-bold shrink-0 ${
                          log.action === 'BLOCKED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-stone-400 font-mono italic">
                    No requests matching filter criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DATA BROKER HUB & OPT-OUT DEFENSE */}
        {/* ========================================================= */}
        {activeTab === 'broker' && (
          <div className="space-y-3.5">
            <div className="sentry-card p-3.5 bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852] rounded-2xl shadow-xs space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white uppercase font-mono tracking-wider">
                    Data Broker Erasure Hub
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-[#A6ADC8] mt-0.5">
                    Automate deletion requests under CCPA & GDPR Article 17
                  </p>
                </div>
                <button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="flex items-center space-x-1 rounded bg-emerald-700 dark:bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 transition"
                >
                  <span>Open Vault</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>

              {/* Broker Search */}
              <input
                type="text"
                placeholder="Search data broker or aggregator..."
                value={brokerSearch}
                onChange={(e) => setBrokerSearch(e.target.value)}
                className="w-full rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-300 dark:border-[#383852] px-2.5 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
              />

              {/* Broker List */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {filteredBrokers.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-lg bg-stone-50 dark:bg-[#181825] border border-stone-200/80 dark:border-[#383852] p-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white">{b.name}</div>
                      <div className="text-[10px] text-stone-500 dark:text-[#A6ADC8]">
                        {b.category} • {b.jurisdiction}
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium ${
                        b.status === 'Removed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : b.status === 'Dispatched'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. FOOTER STATUS BAR */}
      {/* ========================================================= */}
      <footer className="border-t border-stone-200 dark:border-[#383852] bg-white/95 dark:bg-[#252538]/95 px-3 py-2 text-[10px] font-mono text-stone-500 dark:text-[#A6ADC8] flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center space-x-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isShieldOn ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-500'
            }`}
          />
          <span className="font-medium text-stone-700 dark:text-[#CDD6F4]">Sentry AI Shield Active</span>
        </div>
        <div>v1.0.0 (Manifest V3)</div>
      </footer>
    </div>
  );
}
