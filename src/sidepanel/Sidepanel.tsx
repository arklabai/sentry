import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Power,
  Zap,
  Sliders,
  Layers,
  Database,
  Bot,
  Activity,
  Globe,
  RefreshCw,
  ExternalLink,
  Lock,
  Unlock,
  Cpu,
  Volume2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronRight,
  Maximize2,
  FileCode,
} from 'lucide-react';
import {
  PrivacySettings,
  TabThreatStats,
  GlobalPrivacyStats,
  MatrixAction,
  NoiseIntensity,
  NetworkLogEntry,
  FilterListInfo,
} from '../types';

type SidebarTab = 'overview' | 'matrix' | 'fingerprint' | 'network' | 'broker';

export default function Sidepanel() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('overview');
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [stats, setStats] = useState<TabThreatStats | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalPrivacyStats | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Network log filtering
  const [networkSearch, setNetworkSearch] = useState('');
  const [networkTypeFilter, setNetworkTypeFilter] = useState('all');

  // Custom filter rule input
  const [newCustomRule, setNewCustomRule] = useState('');

  // Live Canvas fingerprint test simulator state
  const [testCanvasHash, setTestCanvasHash] = useState<string>('');

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

  // Matrix Action Handler (Traffic Filter Matrix)
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
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText('Sentry Hash Test \uD83D\uDEE1\uFE0F', 2, 2);
        const dataUrl = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
          hash = (Math.imul(31, hash) + dataUrl.charCodeAt(i)) | 0;
        }
        setTestCanvasHash('0x' + (hash >>> 0).toString(16).toUpperCase());
      }
    } catch {
      setTestCanvasHash('Scrambled (Isolated)');
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-3 bg-[#0b0f19] text-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="font-mono text-xs text-blue-400 uppercase tracking-widest">
          Initializing Sentry Privacy Shield...
        </span>
      </div>
    );
  }

  const isShieldOn = settings.masterShield && !isWhitelisted;
  const currentDomain = stats?.domain || 'Active Browser Tab';
  const totalBlockedThisPage =
    (stats?.trackersBlocked || 0) +
    (stats?.canvasFaked || 0) +
    (stats?.audioFaked || 0) +
    (stats?.webglFaked || 0) +
    (stats?.aiBeaconsBlocked || 0);

  const score = isShieldOn ? stats?.safetyScore || 'A+' : 'F';
  const scoreBadgeColors: Record<string, string> = {
    'A+': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    B: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    C: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    D: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    F: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  // Filtered network logs
  const filteredLogs = (stats?.networkLogs || []).filter((log) => {
    const matchesSearch =
      log.url.toLowerCase().includes(networkSearch.toLowerCase()) ||
      log.domain.toLowerCase().includes(networkSearch.toLowerCase());
    const matchesType =
      networkTypeFilter === 'all' || log.type.toLowerCase() === networkTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0f19] text-slate-200 select-none overflow-hidden font-sans">
      {/* 1. TOP PROFESSIONAL TRUST HEADER */}
      <header className="border-b border-slate-800 bg-[#0e1626] px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white tracking-wide">
                  SENTRY <span className="text-blue-400 font-extrabold">AI</span>
                </span>
                <span className="rounded bg-blue-950/80 border border-blue-500/30 px-1.5 py-0.2 font-mono text-[9px] text-blue-300 uppercase">
                  SIDEBAR
                </span>
              </div>
              <p className="text-[10px] text-blue-400 font-mono tracking-wider truncate max-w-[210px]">
                Be Fearless Online <span className="text-slate-600">•</span> <span className="text-slate-400">{currentDomain}</span>
              </p>
            </div>
          </div>

          {/* Quick Actions (Zapper & Dashboard) */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleActivateZapper}
              title="Launch Element Zapper (Click to purge in-page element)"
              className="flex items-center space-x-1 rounded-md border border-rose-500/30 bg-rose-950/20 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-900/30 transition"
            >
              <Zap className="h-3 w-3 text-rose-400" />
              <span>Zap</span>
            </button>

            <button
              onClick={handleReloadTab}
              title="Reload current tab to refresh filters"
              className="rounded-md border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              title="Open Full Sentry AI Dashboard"
              className="rounded-md border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Master Shield & Safety Rating Bar */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-[#111c33] border border-slate-800/80 p-2.5">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleToggleMasterShield}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                isShieldOn
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'border-slate-700 bg-slate-800 text-slate-500'
              }`}
            >
              <Power className="h-4 w-4" />
            </button>
            <div>
              <div className="text-xs font-semibold text-white">
                {isShieldOn ? 'Active Protection' : 'Protection Paused'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {totalBlockedThisPage} threats intercepted
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-bold font-mono tracking-wider ${
                scoreBadgeColors[score] || scoreBadgeColors['F']
              }`}
            >
              GRADE {score}
            </span>
            <button
              onClick={handleToggleWhitelist}
              className={`rounded border px-2 py-0.5 text-[10px] font-mono transition ${
                isWhitelisted
                  ? 'bg-amber-950/50 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {isWhitelisted ? 'Whitelisted' : 'Whitelist'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. TAB NAVIGATION */}
      <nav className="flex border-b border-slate-800 bg-[#0d1424] px-2 overflow-x-auto shrink-0">
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
          <span>Network Log</span>
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

      {/* 3. SCROLLABLE TAB CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================================= */}
        {/* TAB 1: SHIELD OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Trackers Blocked
                </span>
                <div className="text-xl font-bold font-mono text-blue-400 mt-0.5">
                  {stats?.trackersBlocked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">DNR Rule Matching</span>
              </div>

              <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Canvas Scrambled
                </span>
                <div className="text-xl font-bold font-mono text-violet-400 mt-0.5">
                  {stats?.canvasFaked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Math Noise Applied</span>
              </div>

              <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Audio Frequency Masked
                </span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {stats?.audioFaked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Acoustic Perturbation</span>
              </div>

              <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  AI Harvesters Blocked
                </span>
                <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  {stats?.aiBeaconsBlocked || 0}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Meta/TikTok Pixels</span>
              </div>
            </div>

            {/* Protection Mode Selector */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[10px] uppercase text-slate-400">
                  PROTECTION PROFILE
                </span>
                <span className="font-mono text-[10px] font-bold text-blue-400 uppercase">
                  {settings.mode}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1 rounded bg-[#090e1a] p-1 border border-slate-800">
                {(['permissive', 'balanced', 'strict'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`py-1 text-[11px] font-medium rounded capitalize transition ${
                      settings.mode === m
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Connected Third-Party Domains on Current Page */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-slate-400">
                  CONNECTED 3RD-PARTY DOMAINS ({stats?.connectedDomains?.length || 0})
                </span>
              </div>

              {stats?.connectedDomains && stats.connectedDomains.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                  {stats.connectedDomains.map((dom) => (
                    <div
                      key={dom.domain}
                      className="flex items-center justify-between p-2 rounded bg-[#0b1220] border border-slate-800/80"
                    >
                      <span className="truncate max-w-[180px] text-slate-300">
                        {dom.domain}
                      </span>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {dom.blockedCount > 0 && (
                          <span className="rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 text-[10px]">
                            {dom.blockedCount} blocked
                          </span>
                        )}
                        {dom.allowedCount > 0 && (
                          <span className="rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 text-[10px]">
                            {dom.allowedCount} allowed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  No third-party trackers detected on this host.
                </p>
              )}
            </div>

            {/* Quick Feature Toggles */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2 text-xs">
              <span className="font-mono text-[10px] uppercase text-slate-400">
                ACTIVE DEFENSE LAYERS
              </span>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">Global Privacy Control (Sec-GPC)</span>
                    <p className="text-[10px] text-slate-500">Inject Sec-GPC: 1 & DNT: 1 headers</p>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">Anti-AI Scraping Crawler Nullifier</span>
                    <p className="text-[10px] text-slate-500">X-Robots-Tag: noai, noimageai</p>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200">Cosmetic Element Blocker</span>
                    <p className="text-[10px] text-slate-500">Hide cookie nags & tracking pixels</p>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REQUEST MATRIX & FILTER LISTS */}
        {/* ========================================================= */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            {/* Dynamic URL Filtering Matrix */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-3">
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
                      className="flex items-center justify-between p-2 rounded bg-[#090e1a] border border-slate-800/80"
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
                                  ? 'bg-emerald-600 text-white'
                                  : act === 'block'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-700 text-slate-200'
                                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Lists Catalog */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Subscribed Filter Lists ({settings.uBlock.filterLists.filter((l) => l.enabled).length} active)
              </h3>

              <div className="space-y-2 text-xs">
                {settings.uBlock.filterLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between p-2.5 rounded bg-[#090e1a] border border-slate-800"
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
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                My Custom Filters (Dynamic Rule Syntax)
              </h3>

              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. ||badtracker.com^ or ##.ad-banner"
                  value={newCustomRule}
                  onChange={(e) => setNewCustomRule(e.target.value)}
                  className="flex-1 rounded bg-[#090e1a] border border-slate-700 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-mono"
                />
                <button
                  onClick={handleAddCustomRule}
                  className="flex items-center space-x-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs pt-1">
                {settings.uBlock.customFilters.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1.5 rounded bg-[#090e1a] border border-slate-800 text-slate-300"
                  >
                    <span className="truncate max-w-[240px]">{rule}</span>
                    <button
                      onClick={() => handleRemoveCustomRule(rule)}
                      className="text-slate-500 hover:text-rose-400"
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
          <div className="space-y-4">
            {/* Canvas API Deep Controls */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    HTML5 Canvas API
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defense against toDataURL(), toBlob(), and getImageData()
                  </p>
                </div>
                <span className="rounded bg-violet-950/80 text-violet-300 border border-violet-500/30 px-2 py-0.5 text-[10px] font-mono">
                  Entropy Shield
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Action Mode */}
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
                    className="rounded bg-[#090e1a] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="fake">Fake Readout (Recommended)</option>
                    <option value="block">Block Readout Entirely</option>
                    <option value="allow">Allow Readout (No Protection)</option>
                  </select>
                </div>

                {/* Noise Level */}
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
                    className="rounded bg-[#090e1a] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="minimal">Minimal (Imperceptible 1-bit)</option>
                    <option value="low">Low (+/- 1 on RGB channels)</option>
                    <option value="medium">Medium (+/- 2 on RGB channels)</option>
                    <option value="high">High (Maximum Entropy)</option>
                  </select>
                </div>

                {/* Ignore Frequent Colors */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300">Ignore Frequent Colors (Preserve UI)</span>
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

            {/* WebGL API Controls */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-3">
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
                    <span className="text-slate-200">Perturb readPixels()</span>
                    <p className="text-[10px] text-slate-500">Alters WebGL frame buffer readback</p>
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
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-3">
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
                    className="rounded bg-[#090e1a] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="fake">Perturb Audio Frequency Data</option>
                    <option value="block">Mute AnalyserNode</option>
                    <option value="allow">Allow Unaltered Audio</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DOMRect & Text Metrics Font Probing */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-3">
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
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Live Fingerprint Randomizer Test
              </h3>
              <p className="text-[11px] text-slate-400">
                Generate an in-browser canvas hash to verify active mathematical perturbation:
              </p>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={handleRunCanvasTest}
                  className="rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
                >
                  Generate Test Hash
                </button>
                {testCanvasHash && (
                  <span className="font-mono text-xs text-violet-300 font-bold bg-[#090e1a] px-2 py-1 rounded border border-violet-500/30">
                    {testCanvasHash}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: REAL-TIME NETWORK INSPECTOR */}
        {/* ========================================================= */}
        {activeTab === 'network' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Live Network Logger
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time DNR rule matches on this tab
                </p>
              </div>

              <button
                onClick={handleClearLogs}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400"
              >
                Clear Log
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
                  className="w-full rounded bg-[#090e1a] border border-slate-700 pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-mono"
                />
              </div>

              <select
                value={networkTypeFilter}
                onChange={(e) => setNetworkTypeFilter(e.target.value)}
                className="rounded bg-[#090e1a] border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none font-mono"
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
                    className="p-2 rounded bg-[#090e1a] border border-slate-800/80 hover:border-slate-700 transition space-y-1"
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
        {/* TAB 5: DATA BROKER HUB & AI TRAINING LOCKS */}
        {/* ========================================================= */}
        {activeTab === 'broker' && (
          <div className="space-y-4">
            {/* Quick Removal Progress Card */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Incogni Data Broker Removal
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    54 Tier-1 consumer dossier databases cataloged
                  </p>
                </div>
                <span className="rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono">
                  AES-256 Vault
                </span>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-slate-300">Automated Legal Opt-Out Dispatcher</span>
                <button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="flex items-center space-x-1 text-blue-400 hover:underline"
                >
                  <span>Open Full Vault</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* AI Platform Training Opt-Out Status */}
            <div className="rounded-lg bg-[#111c33] border border-slate-800 p-3 space-y-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Commercial AI Training Defenses
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-[#090e1a] border border-slate-800">
                  <div>
                    <div className="text-slate-200 font-medium">Meta / Facebook Llama Shield</div>
                    <div className="text-[10px] text-slate-500">In-page pixel telemetry intercepted</div>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    BLOCKED
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-[#090e1a] border border-slate-800">
                  <div>
                    <div className="text-slate-200 font-medium">X / Grok Model Ingestion Lock</div>
                    <div className="text-[10px] text-slate-500">Interaction data harvesting blocked</div>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    BLOCKED
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-[#090e1a] border border-slate-800">
                  <div>
                    <div className="text-slate-200 font-medium">Google Gemini Web Lock</div>
                    <div className="text-[10px] text-slate-500">Google Analytics v4 streams severed</div>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    BLOCKED
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-[#090e1a] border border-slate-800">
                  <div>
                    <div className="text-slate-200 font-medium">LinkedIn Model Shield</div>
                    <div className="text-[10px] text-slate-500">Professional dossier pixel nullified</div>
                  </div>
                  <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono">
                    BLOCKED
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM STATUS BAR */}
      <footer className="border-t border-slate-800 bg-[#0e1626] px-4 py-2 shrink-0 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Sentry Core 1.0.0</span>
        </div>
        <div>
          <span>{globalStats?.totalTrackersBlocked || 0} Total Interceptions</span>
        </div>
      </footer>
    </div>
  );
}
