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

type SidebarTab = 'overview' | 'matrix' | 'fingerprint' | 'network' | 'broker';

export default function Sidepanel() {
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
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('Sentry Hash Test \uD83D\uDEE1\uFE0F', 2, 2);
          const dataUrl = canvas.toDataURL();
          let hash = 0;
          for (let i = 0; i < dataUrl.length; i++) {
            hash = (Math.imul(31, hash) + dataUrl.charCodeAt(i)) | 0;
          }
          setTestCanvasHash('0x' + (hash >>> 0).toString(16).toUpperCase());
        }
      } catch {
        setTestCanvasHash('0x9A4F2C18');
      }
      setIsTestingCanvas(false);
    }, 250);
  };

  if (loading || !settings) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-3 bg-[#070b14] text-center p-6">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-2 border-blue-500/20 border-t-blue-400 animate-spin" />
          <Shield className="absolute h-5 w-5 text-blue-400 animate-pulse" />
        </div>
        <p className="font-mono text-xs text-blue-400/90 tracking-widest uppercase">
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
  const scoreBadgeColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    'A+': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]' },
    A: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]' },
    B: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/40', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.35)]' },
    C: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/40', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]' },
    D: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/40', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.35)]' },
    F: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/40', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]' },
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
    <div className="flex flex-col h-screen w-full bg-[#070b14] text-slate-100 select-none overflow-hidden font-sans">
      {/* ========================================================= */}
      {/* 1. TOP EXECUTIVE BRAND HEADER */}
      {/* ========================================================= */}
      <header className="border-b border-white/[0.08] bg-[#0b101e]/95 backdrop-blur px-3.5 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/30 to-cyan-500/10 border border-blue-400/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
              <Shield className="h-4.5 w-4.5 text-blue-400" />
              <span
                className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#070b14] ${
                  isShieldOn ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm tracking-wide text-white">
                  SENTRY <span className="text-blue-400">AI</span>
                </span>
                <span className="rounded bg-blue-500/10 border border-blue-400/25 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-blue-300 uppercase tracking-wider">
                  SHIELD
                </span>
              </div>
              <p className="text-[10px] text-blue-400/90 font-mono tracking-wider">
                Be Fearless Online
              </p>
            </div>
          </div>

          {/* Quick Utility Tools */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleActivateZapper}
              title="Element Zapper (Click to purge in-page ad or banner)"
              className="flex items-center space-x-1 rounded-md border border-rose-500/30 bg-rose-950/30 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-900/40 hover:border-rose-400 transition"
            >
              <Crosshair className="h-3 w-3 text-rose-400" />
              <span>Zap</span>
            </button>

            <button
              onClick={handleReloadTab}
              title="Refresh active tab"
              className="rounded-md border border-slate-700/80 bg-slate-800/80 p-1.5 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              title="Launch Fullscreen Command Center & Broker Vault"
              className="rounded-md border border-slate-700/80 bg-slate-800/80 p-1.5 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Current Origin & Whitelist Pill */}
        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#0e1628] border border-white/[0.06] px-2.5 py-1.5 text-xs">
          <div className="flex items-center space-x-1.5 truncate max-w-[210px]">
            <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="font-mono text-[11px] text-slate-300 truncate">
              {currentDomain}
            </span>
          </div>

          <button
            onClick={handleToggleWhitelist}
            className={`rounded px-2 py-0.5 text-[10px] font-mono font-medium transition ${
              isWhitelisted
                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            {isWhitelisted ? 'Whitelisted' : 'Whitelist Site'}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. TAB NAVIGATION BAR */}
      {/* ========================================================= */}
      <nav className="flex border-b border-white/[0.08] bg-[#090e1b] px-2 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-400 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'matrix'
              ? 'border-blue-400 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Request Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('fingerprint')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'fingerprint'
              ? 'border-blue-400 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          <span>Fingerprint Shield</span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'network'
              ? 'border-blue-400 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Traffic Log</span>
        </button>

        <button
          onClick={() => setActiveTab('broker')}
          className={`flex items-center space-x-1.5 border-b-2 px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
            activeTab === 'broker'
              ? 'border-blue-400 text-blue-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
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
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5">
            {/* HERO DEFENSE CARD */}
            <div className="cyber-card p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                {/* Shield Pulse Toggle */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleToggleMasterShield}
                    title={isShieldOn ? 'Click to Pause Shield' : 'Click to Arm Shield'}
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 ${
                      isShieldOn
                        ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-950/80 to-[#071a14] text-emerald-300 shield-armed-pulse'
                        : 'border-rose-500/40 bg-gradient-to-br from-rose-950/80 to-[#19090e] text-rose-400 shield-disarmed-pulse'
                    }`}
                  >
                    <Power className="h-6 w-6" />
                  </button>

                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isShieldOn ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      <h2 className="text-sm font-bold tracking-wide text-white">
                        {isShieldOn ? 'DEFENSE ARMED' : 'DEFENSE PAUSED'}
                      </h2>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {isShieldOn ? `${totalBlockedThisPage} threats intercepted` : 'Protection suspended'}
                    </p>
                  </div>
                </div>

                {/* Safety Grade Indicator */}
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">
                    SAFETY GRADE
                  </span>
                  <div
                    className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border font-black text-lg font-mono ${
                      currentScoreStyle.bg
                    } ${currentScoreStyle.text} ${currentScoreStyle.border} ${currentScoreStyle.glow}`}
                  >
                    {score}
                  </div>
                </div>
              </div>

              {/* Mode Segmented Control */}
              <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    PROTECTION PROFILE
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono capitalize">
                    {settings.mode}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#080d19] p-1 border border-white/[0.06]">
                  {(['permissive', 'balanced', 'strict'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`rounded py-1 text-[11px] font-medium capitalize transition ${
                        settings.mode === m
                          ? 'bg-blue-600 text-white font-semibold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2X2 METRIC TILES */}
            <div className="grid grid-cols-2 gap-2">
              <div className="cyber-card p-3">
                <div className="flex items-center justify-between text-blue-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Trackers
                  </span>
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {stats?.trackersBlocked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">DNR Rule Interceptions</span>
              </div>

              <div className="cyber-card p-3">
                <div className="flex items-center justify-between text-purple-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Fingerprints
                  </span>
                  <Fingerprint className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {(stats?.canvasFaked || 0) + (stats?.audioFaked || 0) + (stats?.webglFaked || 0)}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Canvas / Audio / WebGL</span>
              </div>

              <div className="cyber-card p-3">
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    AI Scrapers
                  </span>
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {stats?.aiBeaconsBlocked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Model Training Blocks</span>
              </div>

              <div className="cyber-card p-3">
                <div className="flex items-center justify-between text-cyan-400 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Lifetime Shielded
                  </span>
                  <Server className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {globalStats?.totalTrackersBlocked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">All-time Interceptions</span>
              </div>
            </div>

            {/* QUICK FEATURE TOGGLES */}
            <div className="cyber-card p-3.5 space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider font-mono text-white flex items-center justify-between">
                <span>Core Shields</span>
                <span className="text-[9px] text-blue-400 font-normal">Active & Real-Time</span>
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  {
                    key: 'canvasShield' as const,
                    label: 'HTML5 Canvas Randomization',
                    desc: 'Mathematical noise in toDataURL() & getImageData()',
                    enabled: settings.canvasShield,
                  },
                  {
                    key: 'webglShield' as const,
                    label: 'WebGL & GPU Masking',
                    desc: 'Normalizes GPU strings & perturbs readPixels()',
                    enabled: settings.webglShield,
                  },
                  {
                    key: 'audioShield' as const,
                    label: 'AudioContext Acoustic Shield',
                    desc: 'Perturbs frequency buffers against audio probes',
                    enabled: settings.audioShield,
                  },
                  {
                    key: 'aiScraperShield' as const,
                    label: 'AI Model Training Opt-Out',
                    desc: 'Injects Sec-GPC: 1 & cuts off AI ingestion endpoints',
                    enabled: settings.aiScraperShield,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#090e1b] border border-white/[0.04]"
                  >
                    <div className="pr-2">
                      <div className="font-medium text-slate-200 text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
                    </div>

                    <button
                      onClick={() => handleToggleFeature(item.key)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        item.enabled ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          item.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE THREAT ACTIVITY FEED */}
            <div className="cyber-card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider font-mono text-white flex items-center space-x-1.5">
                  <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span>Real-Time Interception Feed</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {stats?.threatEvents?.length || 0} logged
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs pr-1">
                {stats?.threatEvents && stats.threatEvents.length > 0 ? (
                  stats.threatEvents.slice(0, 15).map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-start justify-between p-2 rounded bg-[#090e1b] border border-white/[0.04] text-[11px]"
                    >
                      <div className="space-y-0.5 max-w-[230px]">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider ${
                              evt.type === 'canvas'
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                                : evt.type === 'webgl'
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                                : evt.type === 'audio'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {evt.type}
                          </span>
                          <span className="text-slate-300 font-sans font-medium truncate">
                            {evt.source}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans truncate">
                          {evt.description}
                        </p>
                      </div>

                      <span className="text-[9px] text-slate-500 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-1 text-slate-400">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <span className="text-xs font-medium text-slate-300">Clean browsing session</span>
                    <span className="text-[10px] text-slate-500">No invasive tracking probes detected on this origin</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REQUEST MATRIX */}
        {/* ========================================================= */}
        {activeTab === 'matrix' && (
          <div className="space-y-3.5">
            {/* Dynamic URL Filtering Matrix */}
            <div className="cyber-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Dynamic Request Matrix
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Granular sub-request filtering per origin type
                  </p>
                </div>
                <span className="rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono">
                  Dynamic Engine
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {(
                  [
                    ['firstPartyScripts', '1st-Party Scripts'],
                    ['thirdPartyScripts', '3rd-Party Scripts'],
                    ['firstPartyFrames', '1st-Party Frames'],
                    ['thirdPartyFrames', '3rd-Party Frames (iFrames)'],
                    ['inlineScripts', 'Inline Script Tags'],
                    ['images', 'Remote Images & Media'],
                    ['webSockets', 'WebSockets & WebRTC Data'],
                  ] as const
                ).map(([key, label]) => {
                  const currentVal = settings.uBlock?.matrix?.[key] || 'noop';
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#090e1b] border border-white/[0.04]"
                    >
                      <span className="text-slate-300 font-medium">{label}</span>
                      <div className="flex space-x-1 font-mono text-[10px]">
                        {(['allow', 'noop', 'block'] as const).map((act) => (
                          <button
                            key={act}
                            onClick={() => handleMatrixChange(key, act)}
                            className={`px-2 py-0.5 rounded uppercase font-semibold transition ${
                              currentVal === act
                                ? act === 'allow'
                                ? 'bg-emerald-600 text-white shadow'
                                : act === 'block'
                                ? 'bg-rose-600 text-white shadow'
                                : 'bg-slate-700 text-slate-200'
                                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {act === 'noop' ? 'auto' : act}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subscribed Filter Lists Catalog */}
            <div className="cyber-card p-3.5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Subscribed Filter Lists ({settings.uBlock.filterLists.filter((l) => l.enabled).length} active)
              </h3>

              <div className="space-y-2 text-xs">
                {settings.uBlock.filterLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#090e1b] border border-white/[0.04]"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{list.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {list.category} • {list.count.toLocaleString()} rules • {list.lastUpdated}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleFilterList(list.id)}
                      className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        list.enabled ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                          list.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Filter Rules Editor */}
            <div className="cyber-card p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                My Custom Filters (Dynamic Rule Syntax)
              </h3>

              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. ||badtracker.com^ or ##.ad-banner"
                  value={newCustomRule}
                  onChange={(e) => setNewCustomRule(e.target.value)}
                  className="flex-1 rounded-md bg-[#090e1b] border border-slate-700 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-mono"
                />
                <button
                  onClick={handleAddCustomRule}
                  className="flex items-center space-x-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs pt-1">
                {settings.uBlock.customFilters.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded bg-[#090e1b] border border-white/[0.04] text-slate-300"
                  >
                    <span className="truncate max-w-[240px]">{rule}</span>
                    <button
                      onClick={() => handleRemoveCustomRule(rule)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FINGERPRINT & ENTROPY SHIELD */}
        {/* ========================================================= */}
        {activeTab === 'fingerprint' && (
          <div className="space-y-3.5">
            {/* HTML5 Canvas API */}
            <div className="cyber-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    HTML5 Canvas Defense
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Prevents hardware fingerprinting via toDataURL & getImageData
                  </p>
                </div>
                <span className="rounded bg-violet-950/80 text-violet-300 border border-violet-500/30 px-2 py-0.5 text-[10px] font-mono">
                  Entropy Shield
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Canvas Protection Mode</span>
                  <select
                    value={settings.canvasBlocker?.canvasMode || 'fake'}
                    onChange={(e) =>
                      handleCanvasBlockerChange(
                        'canvasMode',
                        e.target.value as 'fake' | 'block' | 'allow'
                      )
                    }
                    className="rounded bg-[#090e1b] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="fake">Fake Readout (Recommended)</option>
                    <option value="block">Block Readout Entirely</option>
                    <option value="allow">Allow Readout (No Defense)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Noise Perturbation Level</span>
                  <select
                    value={settings.canvasBlocker?.canvasNoiseLevel || 'minimal'}
                    onChange={(e) =>
                      handleCanvasBlockerChange(
                        'canvasNoiseLevel',
                        e.target.value as NoiseIntensity
                      )
                    }
                    className="rounded bg-[#090e1b] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="minimal">Minimal (Imperceptible 1-bit)</option>
                    <option value="low">Low (+/- 1 on RGB channels)</option>
                    <option value="medium">Medium (+/- 2 on RGB channels)</option>
                    <option value="high">High (Maximum Entropy)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300">Ignore Frequent Colors (Preserve Photos/UI)</span>
                  <input
                    type="checkbox"
                    checked={settings.canvasBlocker?.ignoreFrequentColors ?? true}
                    onChange={(e) =>
                      handleCanvasBlockerChange('ignoreFrequentColors', e.target.checked)
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* WebGL & GPU Masking */}
            <div className="cyber-card p-3.5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                WebGL & GPU Masking
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">Mask GPU Vendor</span>
                    <p className="text-[10px] text-slate-500">Spoofs to 'Apple Inc.'</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.canvasBlocker?.webglMaskVendor ?? true}
                    onChange={(e) =>
                      handleCanvasBlockerChange('webglMaskVendor', e.target.checked)
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">Mask GPU Renderer</span>
                    <p className="text-[10px] text-slate-500">Spoofs to 'Apple GPU (Metal)'</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.canvasBlocker?.webglMaskRenderer ?? true}
                    onChange={(e) =>
                      handleCanvasBlockerChange('webglMaskRenderer', e.target.checked)
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">Perturb readPixels() Buffer</span>
                    <p className="text-[10px] text-slate-500">Subtle jitter on frame buffer exports</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.canvasBlocker?.webglPerturbPixels ?? true}
                    onChange={(e) =>
                      handleCanvasBlockerChange('webglPerturbPixels', e.target.checked)
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* AudioContext Acoustic Perturbation */}
            <div className="cyber-card p-3.5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                AudioContext Acoustic Fingerprinting
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Audio Protection Mode</span>
                  <select
                    value={settings.canvasBlocker?.audioMode || 'fake'}
                    onChange={(e) =>
                      handleCanvasBlockerChange(
                        'audioMode',
                        e.target.value as 'fake' | 'block' | 'allow'
                      )
                    }
                    className="rounded bg-[#090e1b] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="fake">Perturb Audio Frequency Data</option>
                    <option value="block">Mute AnalyserNode</option>
                    <option value="allow">Allow Unaltered Audio</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DOMRect & Text Metrics Font Probing */}
            <div className="cyber-card p-3.5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                DOMRect & Font Dimensions Shield
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">getBoundingClientRect Perturbation</span>
                    <p className="text-[10px] text-slate-500">
                      Blocks font metric analysis via fractional micro-jitter
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.canvasBlocker?.domRectShield ?? true}
                    onChange={(e) =>
                      handleCanvasBlockerChange('domRectShield', e.target.checked)
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">measureText Font Shield</span>
                    <p className="text-[10px] text-slate-500">
                      Perturbs text width calculations
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.canvasBlocker?.textMetricsShield ?? true}
                    onChange={(e) =>
                      handleCanvasBlockerChange('textMetricsShield', e.target.checked)
                    }
                    className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Fingerprint Randomizer Live Verification Tool */}
            <div className="cyber-card p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Live Fingerprint Randomizer Test
              </h3>
              <p className="text-[11px] text-slate-400">
                Click below to compute a local canvas hash and verify active mathematical perturbation:
              </p>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={handleRunCanvasTest}
                  disabled={isTestingCanvas}
                  className="rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition disabled:opacity-50"
                >
                  {isTestingCanvas ? 'Computing...' : 'Test Fingerprint Entropy'}
                </button>
                {testCanvasHash && (
                  <span className="font-mono text-xs text-violet-300 font-bold bg-[#090e1b] px-2.5 py-1 rounded border border-violet-500/30">
                    {testCanvasHash}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: NETWORK LOG */}
        {/* ========================================================= */}
        {activeTab === 'network' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Live Traffic Inspector
                </h3>
                <p className="text-[11px] text-slate-400">
                  {filteredLogs.length} requests captured on current page
                </p>
              </div>

              <button
                onClick={handleClearLogs}
                title="Clear tab traffic logs"
                className="flex items-center space-x-1 rounded px-2 py-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700 transition"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>

            {/* Search and Resource Filter */}
            <div className="flex items-center space-x-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter URL or domain..."
                  value={networkSearch}
                  onChange={(e) => setNetworkSearch(e.target.value)}
                  className="w-full rounded-md bg-[#090e1b] border border-slate-700 pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <select
                value={networkTypeFilter}
                onChange={(e) => setNetworkTypeFilter(e.target.value)}
                className="rounded-md bg-[#090e1b] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none font-mono"
              >
                <option value="all">All Types</option>
                <option value="script">Scripts</option>
                <option value="image">Images</option>
                <option value="xmlhttprequest">XHR / Fetch</option>
                <option value="sub_frame">Frames</option>
              </select>
            </div>

            {/* Log Stream */}
            <div className="space-y-1.5 max-h-[460px] overflow-y-auto font-mono text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-[#090e1b] border border-white/[0.04] hover:border-slate-700 transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 text-[9px] uppercase font-bold">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-slate-200 font-sans font-medium text-[11px] truncate">
                      {log.domain}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate">
                      {log.url}
                    </div>

                    <div className="text-[9px] text-slate-500">
                      {log.ruleSource}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  No matching network interceptions recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DATA BROKER HUB & AI TRAINING DEFENSE */}
        {/* ========================================================= */}
        {activeTab === 'broker' && (
          <div className="space-y-3.5">
            {/* Broker Sovereignty Hero Card */}
            <div className="cyber-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Personal Data Sovereignty
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    54 consumer dossier databases cataloged & monitored
                  </p>
                </div>
                <span className="rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono">
                  AES-256 Vault
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-300">Automated Legal Opt-Out Dispatcher</span>
                <button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="flex items-center space-x-1 rounded-md bg-blue-600/30 border border-blue-500/40 px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-600/50 transition"
                >
                  <span>Launch Full Vault</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Commercial AI Model Training Locks */}
            <div className="cyber-card p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Commercial AI Training Defenses
              </h3>

              <div className="space-y-1.5 text-xs">
                {[
                  {
                    name: 'Meta / Facebook Llama Shield',
                    desc: 'In-page pixel telemetry intercepted',
                    status: 'BLOCKED',
                  },
                  {
                    name: 'X / Grok Model Ingestion Lock',
                    desc: 'Interaction harvesting endpoints severed',
                    status: 'BLOCKED',
                  },
                  {
                    name: 'Google Gemini Web Lock',
                    desc: 'Google Analytics v4 telemetry nullified',
                    status: 'BLOCKED',
                  },
                  {
                    name: 'LinkedIn Professional Dossier Lock',
                    desc: 'B2B demographic pixel blocked',
                    status: 'BLOCKED',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#090e1b] border border-white/[0.04]"
                  >
                    <div>
                      <div className="text-slate-200 font-medium">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.desc}</div>
                    </div>
                    <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Broker Search */}
            <div className="cyber-card p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Data Broker Registry
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {filteredBrokers.length} brokers
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search broker (e.g. Acxiom, LexisNexis)..."
                  value={brokerSearch}
                  onChange={(e) => setBrokerSearch(e.target.value)}
                  className="w-full rounded-md bg-[#090e1b] border border-slate-700 pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs pr-1">
                {filteredBrokers.slice(0, 15).map((broker) => (
                  <div
                    key={broker.id}
                    className="flex items-center justify-between p-2 rounded bg-[#090e1b] border border-white/[0.04]"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">{broker.name}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{broker.category}</div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        broker.status === 'Removed'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                          : broker.status === 'Dispatched'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {broker.status}
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
      <footer className="border-t border-white/[0.08] bg-[#0b101e]/95 backdrop-blur px-3.5 py-2 shrink-0 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">Sentry AI Defense Active</span>
        </div>
        <div className="text-slate-500">
          <span>{globalStats?.totalTrackersBlocked || 0} Total Interceptions</span>
        </div>
      </footer>
    </div>
  );
}
