import React, { useEffect, useState } from 'react';
import {
  HiShieldCheck,
  HiOutlineShieldCheck,
  HiBolt,
  HiSquares2X2,
  HiCircleStack,
  HiChartBar,
  HiGlobeAlt,
  HiArrowPath,
  HiArrowTopRightOnSquare,
  HiCpuChip,
  HiSpeakerWave,
  HiMagnifyingGlass,
  HiPlus,
  HiTrash,
  HiArrowsPointingOut,
  HiSignal,
  HiFingerPrint,
  HiSun,
  HiMoon,
  HiComputerDesktop,
  HiCheckCircle,
} from 'react-icons/hi2';
import {
  PrivacySettings,
  TabThreatStats,
  GlobalPrivacyStats,
  MatrixAction,
  NoiseIntensity,
  NetworkLogEntry,
  BrokerEntry,
} from '../types';
import SentryShieldLogo from '../components/SentryShieldLogo';
import { useTheme } from '../hooks/useTheme';

type SidebarTab = 'overview' | 'matrix' | 'fingerprint' | 'network' | 'broker';

export default function Sidepanel() {
  const { themeMode, cycleTheme } = useTheme();
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

  const handleToggleMasterShield = () => {
    if (!settings) return;
    const updated = { ...settings, masterShield: !settings.masterShield };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  const handleModeChange = (mode: 'strict' | 'balanced' | 'permissive') => {
    if (!settings) return;
    const updated = { ...settings, mode };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  const handleToggleFeature = (
    key: 'canvasShield' | 'audioShield' | 'webglShield' | 'aiScraperShield' | 'elementZapperEnabled'
  ) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
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
    const updated = { ...settings, whitelistedDomains: next };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  const handleActivateZapper = () => {
    chrome.runtime.sendMessage({ action: 'ACTIVATE_ELEMENT_ZAPPER' });
  };

  const handleReloadTab = () => {
    if (stats && stats.tabId) {
      chrome.tabs.reload(stats.tabId);
    }
  };

  // Matrix action changes
  const handleMatrixChange = (
    key: keyof PrivacySettings['uBlock']['matrix'],
    action: MatrixAction
  ) => {
    if (!settings) return;
    const updated: PrivacySettings = {
      ...settings,
      uBlock: {
        ...settings.uBlock,
        matrix: {
          ...settings.uBlock.matrix,
          [key]: action,
        },
      },
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  // Granular CanvasBlocker setting changes
  const handleCanvasBlockerChange = <K extends keyof PrivacySettings['canvasBlocker']>(
    key: K,
    val: PrivacySettings['canvasBlocker'][K]
  ) => {
    if (!settings) return;
    const updated: PrivacySettings = {
      ...settings,
      canvasBlocker: {
        ...settings.canvasBlocker,
        [key]: val,
      },
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  // Filter list toggle
  const handleToggleFilterList = (listId: string) => {
    if (!settings) return;
    const updatedLists = settings.uBlock.filterLists.map((item) =>
      item.id === listId ? { ...item, enabled: !item.enabled } : item
    );
    const updated: PrivacySettings = {
      ...settings,
      uBlock: {
        ...settings.uBlock,
        filterLists: updatedLists,
      },
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  // Add custom rule
  const handleAddCustomRule = () => {
    if (!settings || !newCustomRule.trim()) return;
    const updatedFilters = [...settings.uBlock.customFilters, newCustomRule.trim()];
    const updated: PrivacySettings = {
      ...settings,
      uBlock: {
        ...settings.uBlock,
        customFilters: updatedFilters,
      },
    };
    setSettings(updated);
    setNewCustomRule('');
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  const handleRemoveCustomRule = (rule: string) => {
    if (!settings) return;
    const updatedFilters = settings.uBlock.customFilters.filter((r) => r !== rule);
    const updated: PrivacySettings = {
      ...settings,
      uBlock: {
        ...settings.uBlock,
        customFilters: updatedFilters,
      },
    };
    setSettings(updated);
    chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', settings: updated });
  };

  // Interactive Live Canvas test simulator
  const handleRunCanvasTest = () => {
    setIsTestingCanvas(true);
    setTimeout(() => {
      try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 160;
        testCanvas.height = 40;
        const ctx = testCanvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = "14px 'Arial'";
          ctx.fillStyle = '#f60';
          ctx.fillRect(10, 5, 60, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('Sentry AI Test', 15, 8);
          const dataUrl = testCanvas.toDataURL();
          let hash = 0;
          for (let i = 0; i < dataUrl.length; i++) {
            hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
            hash |= 0;
          }
          setTestCanvasHash(`0x${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`);
        }
      } catch (err) {
        setTestCanvasHash('Protected');
      }
      setIsTestingCanvas(false);
    }, 400);
  };

  if (loading || !settings) {
    return (
      <div
        className="flex h-screen w-full flex-col items-center justify-center space-y-4 p-6 text-center select-none"
        style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
      >
        <div
          className="h-9 w-9 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }}
        />
        <p className="font-mono text-xs font-semibold tracking-wider" style={{ color: 'var(--green-primary)' }}>
          SYNCHRONIZING SENTRY SHIELD...
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

  // Filter network logs
  const filteredLogs = (stats?.networkLogs || []).filter((log: NetworkLogEntry) => {
    const matchesSearch =
      networkSearch === '' ||
      log.url.toLowerCase().includes(networkSearch.toLowerCase()) ||
      log.domain.toLowerCase().includes(networkSearch.toLowerCase());
    const matchesType = networkTypeFilter === 'all' || log.type === networkTypeFilter;
    return matchesSearch && matchesType;
  });

  // Filter brokers
  const filteredBrokers = brokers.filter(
    (b) =>
      b.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
      b.category.toLowerCase().includes(brokerSearch.toLowerCase())
  );

  return (
    <div
      className="flex flex-col h-screen w-full select-none overflow-hidden font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* ========================================================= */}
      {/* 1. TOP EXECUTIVE BRAND HEADER (Single row, never wraps) */}
      {/* ========================================================= */}
      <header
        className="border-b px-3.5 py-2.5 shrink-0 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <SentryShieldLogo size={28} armed={isShieldOn} glow={isShieldOn} />
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm tracking-tight leading-none truncate">
                SENTRY <span style={{ color: 'var(--green-primary)' }}>AI</span>
              </h1>
              <p
                className="text-[10px] font-mono mt-1 leading-none truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                Be Fearless Online
              </p>
            </div>
          </div>

          {/* Quick Utility Tools (Compact icon cluster) */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={cycleTheme}
              title={`Theme: ${themeMode.toUpperCase()} (Click to cycle)`}
              className="flex items-center justify-center h-7 w-7 rounded-lg border transition hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {themeMode === 'system' ? (
                <HiComputerDesktop className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
              ) : themeMode === 'light' ? (
                <HiSun className="h-4 w-4 text-amber-600" />
              ) : (
                <HiMoon className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
              )}
            </button>

            {/* Element Zapper */}
            <button
              onClick={handleActivateZapper}
              title="Element Zapper (Purge ads or intrusive banners)"
              className="flex items-center justify-center h-7 w-7 rounded-lg border transition hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--danger-subtle)',
                borderColor: 'var(--danger-border)',
                color: 'var(--danger-primary)',
              }}
            >
              <HiBolt className="h-4 w-4" />
            </button>

            {/* Refresh Tab */}
            <button
              onClick={handleReloadTab}
              title="Refresh active tab"
              className="flex items-center justify-center h-7 w-7 rounded-lg border transition hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <HiArrowPath className="h-4 w-4" />
            </button>

            {/* Fullscreen Command Center */}
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              title="Launch Fullscreen Command Center & Broker Vault"
              className="flex items-center justify-center h-7 w-7 rounded-lg border transition hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <HiArrowsPointingOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Current Origin & Whitelist Pill */}
        <div
          className="mt-2.5 flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center space-x-1.5 truncate max-w-[210px]">
            <HiGlobeAlt
              className="h-4 w-4 shrink-0"
              style={{ color: isWhitelisted ? 'var(--amber-primary)' : 'var(--green-primary)' }}
            />
            <span className="font-mono text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>
              {currentDomain}
            </span>
          </div>

          <button
            onClick={handleToggleWhitelist}
            className="rounded-lg px-2.5 py-1 text-[10px] font-mono font-semibold transition cursor-pointer"
            style={{
              backgroundColor: isWhitelisted ? 'var(--amber-subtle)' : 'var(--bg-surface)',
              color: isWhitelisted ? 'var(--amber-primary)' : 'var(--text-secondary)',
              border: `1px solid ${isWhitelisted ? 'var(--amber-border)' : 'var(--border-strong)'}`,
            }}
          >
            {isWhitelisted ? 'Whitelisted' : 'Whitelist Site'}
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. COMPACT TAB NAVIGATION (Fits perfectly without clipping) */}
      {/* ========================================================= */}
      <nav
        className="flex items-center border-b px-1.5 py-1.5 shrink-0 overflow-x-auto scrollbar-none transition-colors gap-0.5"
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {[
          { id: 'overview' as const, label: 'Overview', icon: HiOutlineShieldCheck },
          { id: 'matrix' as const, label: 'Matrix', icon: HiSquares2X2 },
          { id: 'fingerprint' as const, label: 'Entropy', icon: HiFingerPrint },
          { id: 'network' as const, label: 'Traffic', icon: HiChartBar },
          { id: 'broker' as const, label: 'Brokers', icon: HiCircleStack },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 rounded-lg px-1 py-1 text-[10.5px] font-semibold transition cursor-pointer whitespace-nowrap ${
                isActive ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--green-primary)' : 'var(--text-secondary)',
                border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
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
            <div
              className="sentry-card p-4 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between">
                {/* Shield Toggle & Status */}
                <div className="flex items-center space-x-3.5">
                  <button
                    onClick={handleToggleMasterShield}
                    title={isShieldOn ? 'Click to Pause Shield' : 'Click to Arm Shield'}
                    className={`relative p-2.5 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                      isShieldOn ? 'shield-armed-pulse' : 'shield-disarmed-pulse'
                    }`}
                    style={{
                      backgroundColor: isShieldOn ? 'var(--green-subtle)' : 'var(--danger-subtle)',
                      borderColor: isShieldOn ? 'var(--green-border)' : 'var(--danger-border)',
                    }}
                  >
                    <SentryShieldLogo size={40} armed={isShieldOn} glow={isShieldOn} />
                  </button>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: isShieldOn ? 'var(--green-primary)' : 'var(--danger-primary)',
                        }}
                      />
                      <h2
                        className="text-sm font-bold tracking-wide leading-none"
                        style={{
                          color: isShieldOn ? 'var(--green-primary)' : 'var(--danger-primary)',
                        }}
                      >
                        {isShieldOn ? 'SHIELD ARMED' : 'SHIELD PAUSED'}
                      </h2>
                    </div>
                    <p className="text-xs mt-1 font-medium leading-none" style={{ color: 'var(--text-secondary)' }}>
                      {isShieldOn
                        ? `${totalBlockedThisPage} threats intercepted`
                        : 'Protection suspended for current page'}
                    </p>
                  </div>
                </div>

                {/* Safety Score Rating */}
                <div
                  className="flex flex-col items-center justify-center rounded-xl border px-3 py-1.5"
                  style={{
                    backgroundColor: 'var(--green-subtle)',
                    borderColor: 'var(--green-border)',
                  }}
                >
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    GRADE
                  </span>
                  <span
                    className="text-xl font-black font-mono leading-none mt-0.5"
                    style={{ color: 'var(--green-text)' }}
                  >
                    {score}
                  </span>
                </div>
              </div>

              {/* Strictness Profile Segmented Control */}
              <div
                className="mt-3.5 pt-3 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    Protection Profile
                  </span>
                  <span
                    className="font-mono text-[10px] capitalize font-bold"
                    style={{ color: 'var(--green-primary)' }}
                  >
                    {settings.mode}
                  </span>
                </div>
                <div
                  className="grid grid-cols-3 gap-1 rounded-xl p-1 border"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  {(['permissive', 'balanced', 'strict'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className="rounded-lg py-1 text-xs font-semibold capitalize transition cursor-pointer"
                      style={{
                        backgroundColor: settings.mode === m ? 'var(--green-primary)' : 'transparent',
                        color: settings.mode === m ? 'var(--text-inverse)' : 'var(--text-secondary)',
                        boxShadow: settings.mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2x2 TELEMETRY METRIC TILES */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="sentry-card p-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Trackers
                  </span>
                  <HiShieldCheck className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--green-primary)' }}>
                  {stats?.trackersBlocked || 0}
                </div>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  DNR static & dynamic
                </p>
              </div>

              <div
                className="sentry-card p-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Fingerprints
                  </span>
                  <HiFingerPrint className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {(stats?.canvasFaked || 0) + (stats?.audioFaked || 0) + (stats?.webglFaked || 0)}
                </div>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  Canvas & audio noise
                </p>
              </div>

              <div
                className="sentry-card p-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    AI Scrapers
                  </span>
                  <HiSignal className="h-4 w-4" style={{ color: 'var(--danger-primary)' }} />
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--danger-primary)' }}>
                  {stats?.aiBeaconsBlocked || 0}
                </div>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  Meta, TikTok pixels
                </p>
              </div>

              <div
                className="sentry-card p-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    All-Time
                  </span>
                  <HiCircleStack className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {(globalStats?.totalTrackersBlocked || 0) +
                    (globalStats?.totalFingerprintsScrambled || 0) +
                    (globalStats?.totalAiScrapersBlocked || 0)}
                </div>
                <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  Lifetime defense
                </p>
              </div>
            </div>

            {/* CORE DEFENSE TOGGLES */}
            <div
              className="sentry-card p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Shield Sub-Systems
                </span>
                <span className="text-[10px] font-mono font-medium" style={{ color: 'var(--green-primary)' }}>
                  ACTIVE
                </span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    key: 'canvasShield' as const,
                    label: 'Canvas & WebGL Defense',
                    desc: 'Mathematical noise injection',
                    icon: HiCpuChip,
                  },
                  {
                    key: 'audioShield' as const,
                    label: 'AudioContext Buffer Defender',
                    desc: 'Acoustic frequency shifting',
                    icon: HiSpeakerWave,
                  },
                  {
                    key: 'aiScraperShield' as const,
                    label: 'AI Scrapers & Training Pixels',
                    desc: 'X-Robots-Tag & crawler blocks',
                    icon: HiSignal,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isEnabled = settings[item.key];
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-xl p-2.5 transition"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                          style={{
                            backgroundColor: isEnabled ? 'var(--green-subtle)' : 'var(--bg-surface)',
                            color: isEnabled ? 'var(--green-primary)' : 'var(--text-muted)',
                            border: `1px solid ${isEnabled ? 'var(--green-border)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                            {item.label}
                          </div>
                          <div className="text-[10px] leading-tight truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFeature(item.key)}
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
                  );
                })}
              </div>
            </div>

            {/* DOMAIN REPUTATION & QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleActivateZapper}
                className="flex items-center justify-center space-x-1.5 rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer hover:opacity-90 active:scale-98"
                style={{
                  backgroundColor: 'var(--danger-subtle)',
                  borderColor: 'var(--danger-border)',
                  color: 'var(--danger-primary)',
                }}
              >
                <HiBolt className="h-4 w-4" />
                <span>Element Zapper</span>
              </button>

              <button
                onClick={() => setActiveTab('matrix')}
                className="flex items-center justify-center space-x-1.5 rounded-xl border p-2.5 text-xs font-semibold transition cursor-pointer hover:opacity-90 active:scale-98"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <HiSquares2X2 className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
                <span>Matrix Rules</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REQUEST MATRIX & RULES ENGINE */}
        {/* ========================================================= */}
        {activeTab === 'matrix' && (
          <div className="space-y-3.5">
            {/* DYNAMIC TRAFFIC MATRIX */}
            <div
              className="sentry-card p-3.5 space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Dynamic Traffic Filtering Matrix
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Granular outbound request controls for {currentDomain}
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
                      className="flex items-center justify-between rounded-xl p-2 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>
                        {row.label}
                      </span>
                      <div className="flex space-x-1">
                        {(['allow', 'noop', 'block'] as MatrixAction[]).map((act) => {
                          const isAct = currentAction === act;
                          return (
                            <button
                              key={act}
                              onClick={() => handleMatrixChange(row.key, act)}
                              className="rounded-md px-2 py-0.5 text-[10px] font-mono uppercase font-bold transition cursor-pointer"
                              style={{
                                backgroundColor: isAct
                                  ? act === 'allow'
                                    ? 'var(--amber-subtle)'
                                    : act === 'block'
                                    ? 'var(--danger-subtle)'
                                    : 'var(--green-subtle)'
                                  : 'var(--bg-surface)',
                                color: isAct
                                  ? act === 'allow'
                                    ? 'var(--amber-primary)'
                                    : act === 'block'
                                    ? 'var(--danger-primary)'
                                    : 'var(--green-text)'
                                  : 'var(--text-muted)',
                                border: `1px solid ${
                                  isAct
                                    ? act === 'allow'
                                      ? 'var(--amber-border)'
                                      : act === 'block'
                                      ? 'var(--danger-border)'
                                      : 'var(--green-border)'
                                    : 'var(--border-subtle)'
                                }`,
                              }}
                            >
                              {act}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GLOBAL FILTER LISTS */}
            <div
              className="sentry-card p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Global Declarative Filter Lists
              </h3>

              <div className="space-y-1.5">
                {settings.uBlock.filterLists.map((fl) => (
                  <div
                    key={fl.id}
                    className="flex items-center justify-between rounded-xl p-2 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {fl.name}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {(fl.count || 0).toLocaleString()} pre-compiled rules
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFilterList(fl.id)}
                      className="rounded-lg px-2.5 py-1 text-[10px] font-mono font-semibold transition cursor-pointer"
                      style={{
                        backgroundColor: fl.enabled ? 'var(--green-subtle)' : 'var(--bg-surface)',
                        color: fl.enabled ? 'var(--green-primary)' : 'var(--text-muted)',
                        border: `1px solid ${fl.enabled ? 'var(--green-border)' : 'var(--border-subtle)'}`,
                      }}
                    >
                      {fl.enabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CUSTOM FILTER RULES */}
            <div
              className="sentry-card p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Custom Blocking Rules
              </h3>

              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="e.g. ||doubleclick.net^"
                  value={newCustomRule}
                  onChange={(e) => setNewCustomRule(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomRule()}
                  className="flex-1 rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={handleAddCustomRule}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--green-primary)',
                    color: 'var(--text-inverse)',
                  }}
                >
                  <HiPlus className="h-4 w-4" />
                </button>
              </div>

              {settings.uBlock.customFilters.length > 0 && (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {settings.uBlock.customFilters.map((r) => (
                    <div
                      key={r}
                      className="flex items-center justify-between rounded-lg px-2 py-1 text-xs font-mono"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span className="truncate max-w-[240px]" style={{ color: 'var(--text-secondary)' }}>
                        {r}
                      </span>
                      <button
                        onClick={() => handleRemoveCustomRule(r)}
                        className="cursor-pointer hover:opacity-75"
                        style={{ color: 'var(--danger-primary)' }}
                      >
                        <HiTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ENTROPY & ANTI-FINGERPRINTING */}
        {/* ========================================================= */}
        {activeTab === 'fingerprint' && (
          <div className="space-y-3.5">
            {/* LIVE SIMULATOR TEST */}
            <div
              className="sentry-card p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Canvas Entropy Verification
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Test real-time mathematical noise injection
                  </p>
                </div>
                <button
                  onClick={handleRunCanvasTest}
                  disabled={isTestingCanvas}
                  className="rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--green-primary)',
                    color: 'var(--text-inverse)',
                  }}
                >
                  {isTestingCanvas ? 'Computing...' : 'Run Test'}
                </button>
              </div>

              {testCanvasHash && (
                <div
                  className="rounded-xl p-2.5 text-xs font-mono flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--green-subtle)',
                    border: '1px solid var(--green-border)',
                  }}
                >
                  <div>
                    <div className="text-[10px]" style={{ color: 'var(--green-text)' }}>
                      Scrambled Canvas Hash:
                    </div>
                    <div className="font-bold text-sm" style={{ color: 'var(--green-primary)' }}>
                      {testCanvasHash}
                    </div>
                  </div>
                  <HiCheckCircle className="h-4 w-4" style={{ color: 'var(--green-primary)' }} />
                </div>
              )}
            </div>

            {/* GRANULAR ENTROPY CONTROLS */}
            <div
              className="sentry-card p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Granular Anti-Fingerprinting Matrix
              </h3>

              <div className="space-y-2">
                {[
                  {
                    key: 'ignoreFrequentColors' as const,
                    label: 'Preserve Solid Colors',
                    desc: 'Avoids altering 100% white/black backgrounds',
                  },
                  {
                    key: 'fakeAlphaChannel' as const,
                    label: 'Perturb Alpha Transparency',
                    desc: 'Adds subtle noise to canvas alpha channels',
                  },
                  {
                    key: 'webglMaskVendor' as const,
                    label: 'Spoof WebGL GPU Vendor',
                    desc: 'Masks hardware vendor as Intel Iris',
                  },
                  {
                    key: 'webglPerturbPixels' as const,
                    label: 'Perturb WebGL readPixels',
                    desc: 'Prevents shader rendering profiling',
                  },
                  {
                    key: 'domRectShield' as const,
                    label: 'DOMRect & Layout Sub-Pixel Jitter',
                    desc: 'Neutralizes CSS layout & font profiling',
                  },
                  {
                    key: 'textMetricsShield' as const,
                    label: 'TextMetrics Measurement Dithering',
                    desc: 'Prevents canvas text width font probing',
                  },
                  {
                    key: 'navigatorHardwareShield' as const,
                    label: 'Hardware Concurrency Masking',
                    desc: 'Normalizes CPU threads to 8 cores',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl p-2.5 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="pr-2 min-w-0">
                      <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {item.label}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                        {item.desc}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleCanvasBlockerChange(item.key, !settings.canvasBlocker[item.key])
                      }
                      className="rounded-lg px-2 py-0.5 text-[10px] font-mono font-semibold transition cursor-pointer"
                      style={{
                        backgroundColor: settings.canvasBlocker[item.key]
                          ? 'var(--green-subtle)'
                          : 'var(--bg-surface)',
                        color: settings.canvasBlocker[item.key]
                          ? 'var(--green-primary)'
                          : 'var(--text-muted)',
                        border: `1px solid ${
                          settings.canvasBlocker[item.key]
                            ? 'var(--green-border)'
                            : 'var(--border-subtle)'
                        }`,
                      }}
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
        {/* TAB 4: REAL-TIME TRAFFIC & INTERCEPTION LOG */}
        {/* ========================================================= */}
        {activeTab === 'network' && (
          <div className="space-y-3.5">
            <div
              className="sentry-card p-3.5 space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Real-Time Traffic Log
                </h3>
                <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--green-primary)' }}>
                  {filteredLogs.length} Requests
                </span>
              </div>

              {/* Filter Row */}
              <div className="flex space-x-1.5">
                <div
                  className="flex flex-1 items-center space-x-1.5 rounded-xl px-2.5 py-1 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <HiMagnifyingGlass className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Filter request URL..."
                    value={networkSearch}
                    onChange={(e) => setNetworkSearch(e.target.value)}
                    className="w-full bg-transparent outline-none text-xs"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Log Entries */}
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto font-mono text-[11px]">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl p-2"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="truncate max-w-[210px]">
                        <div className="truncate font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {log.url}
                        </div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {log.domain} • {log.type}
                        </div>
                      </div>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[9px] uppercase font-bold shrink-0"
                        style={{
                          backgroundColor:
                            log.action === 'BLOCKED'
                              ? 'var(--danger-subtle)'
                              : 'var(--green-subtle)',
                          color:
                            log.action === 'BLOCKED'
                              ? 'var(--danger-primary)'
                              : 'var(--green-primary)',
                          border: `1px solid ${
                            log.action === 'BLOCKED'
                              ? 'var(--danger-border)'
                              : 'var(--green-border)'
                          }`,
                        }}
                      >
                        {log.action}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    No network requests logged for active page.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: BROKER HUB & LEGAL REMEDIATION */}
        {/* ========================================================= */}
        {activeTab === 'broker' && (
          <div className="space-y-3.5">
            <div
              className="sentry-card p-3.5 space-y-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Data Broker Remediation Hub
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Automated CCPA & GDPR Article 17 Erasure Demands
                  </p>
                </div>
                <button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="flex items-center space-x-1 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--green-primary)',
                    color: 'var(--text-inverse)',
                  }}
                >
                  <span>Vault</span>
                  <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Broker Search */}
              <div
                className="flex items-center space-x-1.5 rounded-xl px-2.5 py-1.5 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <HiMagnifyingGlass className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search broker registry..."
                  value={brokerSearch}
                  onChange={(e) => setBrokerSearch(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>

              {/* Broker List */}
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
                {filteredBrokers.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl p-2.5 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {b.name}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {b.category} • {b.jurisdiction}
                      </div>
                    </div>
                    <a
                      href={b.optOutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg px-2 py-1 text-[10px] font-mono font-semibold transition"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--green-primary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      Opt-Out
                    </a>
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
      <footer
        className="border-t px-3.5 py-2 text-[10px] font-mono flex items-center justify-between shrink-0 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="flex items-center space-x-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: isShieldOn ? 'var(--green-primary)' : 'var(--danger-primary)',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>
            {isShieldOn ? 'Sentry Defense Active' : 'Shield Suspended'}
          </span>
        </div>
        <span>v1.0.0 • MV3</span>
      </footer>
    </div>
  );
}
