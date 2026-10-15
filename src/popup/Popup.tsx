import React, { useEffect, useState } from 'react';
import {
  HiShieldCheck,
  HiBolt,
  HiCpuChip,
  HiSpeakerWave,
  HiArrowTopRightOnSquare,
  HiPower,
  HiAdjustmentsHorizontal,
  HiSquares2X2,
  HiSignal,
  HiSun,
  HiMoon,
  HiComputerDesktop,
} from 'react-icons/hi2';
import { PrivacySettings, TabThreatStats, GlobalPrivacyStats } from '../types';
import SentryShieldLogo from '../components/SentryShieldLogo';
import { useTheme } from '../hooks/useTheme';

export default function Popup() {
  const { themeMode, isDark, setThemeMode } = useTheme();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [stats, setStats] = useState<TabThreatStats | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalPrivacyStats | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch initial active tab data
  useEffect(() => {
    function loadData() {
      chrome.runtime.sendMessage({ action: 'GET_ACTIVE_TAB_STATS' }, (res) => {
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
          return;
        }
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

    loadData();
    const interval = setInterval(loadData, 1500);
    return () => clearInterval(interval);
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
    key: 'canvasShield' | 'audioShield' | 'webglShield' | 'aiScraperShield'
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
    chrome.runtime.sendMessage({
      action: 'ACTIVATE_ELEMENT_ZAPPER',
      tabId: stats?.tabId,
    }, () => {
      window.close();
    });
  };

  const handleOpenDashboard = () => {
    chrome.runtime.openOptionsPage();
  };

  if (loading || !settings) {
    return (
      <div className="flex h-[580px] w-full flex-col items-center justify-center space-y-4 bg-[#FAF9F6] dark:bg-[#1E1E2E] p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-700 dark:border-emerald-400 border-t-transparent" />
        <p className="font-mono text-xs text-stone-600 dark:text-[#CDD6F4] uppercase tracking-widest">
          Synchronizing Sentry Shield...
        </p>
      </div>
    );
  }

  const isShieldOn = settings.masterShield && !isWhitelisted;
  const score = isShieldOn ? stats?.safetyScore || 'A+' : 'F';

  const scoreColors: Record<string, string> = {
    'A+': 'text-emerald-800 dark:text-[#A6E3A1] border-emerald-300 dark:border-[#A6E3A1]/30 bg-emerald-50 dark:bg-[#A6E3A1]/15',
    A: 'text-emerald-800 dark:text-[#A6E3A1] border-emerald-300 dark:border-[#A6E3A1]/30 bg-emerald-50 dark:bg-[#A6E3A1]/15',
    B: 'text-teal-800 dark:text-[#94E2D5] border-teal-300 dark:border-[#94E2D5]/30 bg-teal-50 dark:bg-[#94E2D5]/15',
    C: 'text-amber-800 dark:text-[#F9E2AF] border-amber-300 dark:border-[#F9E2AF]/30 bg-amber-50 dark:bg-[#F9E2AF]/15',
    D: 'text-orange-800 dark:text-[#FAB387] border-orange-300 dark:border-[#FAB387]/30 bg-orange-50 dark:bg-[#FAB387]/15',
    F: 'text-rose-800 dark:text-[#F38BA8] border-rose-300 dark:border-[#F38BA8]/30 bg-rose-50 dark:bg-[#F38BA8]/15',
  };

  return (
    <div className="flex flex-col h-[580px] w-[380px] select-none bg-[#FAF9F6] dark:bg-[#1E1E2E] text-stone-900 dark:text-[#F5E0DC] overflow-y-auto transition-colors duration-200">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-[#383852] bg-white/95 dark:bg-[#252538]/95 backdrop-blur px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <SentryShieldLogo size={28} armed={isShieldOn} glow={true} />
          <div>
            <h1 className="text-sm font-black tracking-tight text-stone-900 dark:text-white">
              SENTRY <span className="text-emerald-700 dark:text-[#A6E3A1]">AI</span>
            </h1>
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-500 dark:text-[#A6ADC8]">
              Be Fearless Online
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* 2-Option Light & Dark Mode Toggle (No system button, no text, defaults to system) */}
          <div className="flex items-center rounded-lg border border-stone-200 dark:border-[#383852] bg-stone-100/90 dark:bg-[#181825] p-0.5">
            <button
              onClick={() => setThemeMode('light')}
              title="Light Mode"
              className={`flex items-center justify-center h-6 w-6 rounded-md transition cursor-pointer ${
                !isDark
                  ? 'bg-white dark:bg-[#2E2E44] text-amber-600 shadow-xs'
                  : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300'
              }`}
            >
              <HiSun className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              title="Dark Mode"
              className={`flex items-center justify-center h-6 w-6 rounded-md transition cursor-pointer ${
                isDark
                  ? 'bg-white dark:bg-[#2E2E44] text-emerald-400 shadow-xs'
                  : 'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300'
              }`}
            >
              <HiMoon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Dock to Side Panel */}
          <button
            onClick={() => {
              chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' });
              window.close();
            }}
            title="Dock Sentry AI to Browser Side Panel"
            className="flex items-center space-x-1 rounded-lg border border-stone-200 dark:border-[#383852] bg-stone-100 dark:bg-[#181825] px-2 py-1 text-xs text-stone-700 dark:text-[#CDD6F4] transition hover:border-emerald-600 dark:hover:border-[#A6E3A1]"
          >
            <HiSquares2X2 className="h-4 w-4 text-emerald-700 dark:text-[#A6E3A1]" />
            <span className="font-mono text-[10px] font-medium">SIDEBAR</span>
          </button>

          {/* Command Center */}
          <button
            onClick={handleOpenDashboard}
            title="Open Privacy Command Center & Data Broker Hub"
            className="flex items-center space-x-1 rounded-lg border border-stone-200 dark:border-[#383852] bg-stone-100 dark:bg-[#181825] px-2 py-1 text-xs text-stone-700 dark:text-[#CDD6F4] transition hover:border-emerald-600 dark:hover:border-[#A6E3A1]"
          >
            <HiAdjustmentsHorizontal className="h-4 w-4" />
            <span className="font-mono text-[10px] font-medium">VAULT</span>
          </button>
        </div>
      </header>

      {/* Main Defense Panel */}
      <div className="p-4 space-y-3.5">
        {/* Master Shield & Safety Grade */}
        <div className="sentry-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            {/* Master Toggle Button */}
            <div className="flex items-center space-x-3.5">
              <button
                onClick={handleToggleMasterShield}
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-300 shadow-sm ${
                  isShieldOn
                    ? 'border-emerald-600 dark:border-[#A6E3A1] bg-emerald-50 dark:bg-[#A6E3A1]/15 text-emerald-800 dark:text-[#A6E3A1] shield-armed-pulse'
                    : 'border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500'
                }`}
              >
                <HiPower className="h-6 w-6" />
              </button>
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isShieldOn ? 'bg-emerald-600 dark:bg-[#A6E3A1]' : 'bg-rose-500'
                    }`}
                  />
                  <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                    {isShieldOn ? 'Shield Armed' : 'Shield Disabled'}
                  </h2>
                </div>
                <p className="font-mono text-[11px] text-stone-500 dark:text-[#A6ADC8] truncate max-w-[150px] mt-0.5">
                  {stats?.domain ? stats.domain : 'Chrome Browser'}
                </p>
              </div>
            </div>

            {/* Safety Grade Indicator */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase text-stone-500 dark:text-[#9399B2]">
                Safety Grade
              </span>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border font-black text-xl shadow-sm transition-all ${
                  scoreColors[score] || scoreColors['F']
                }`}
              >
                {score}
              </div>
            </div>
          </div>

          {/* Whitelist Domain Row */}
          {stats?.domain && (
            <div className="mt-3.5 pt-3 border-t border-stone-200 dark:border-[#383852] flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-[#A6ADC8] font-mono text-[11px]">
                {isWhitelisted ? 'Site is Whitelisted' : 'Protection Active for Site'}
              </span>
              <button
                onClick={handleToggleWhitelist}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wide border transition font-medium ${
                  isWhitelisted
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-[#F9E2AF] border-amber-300 dark:border-[#F9E2AF]/40 hover:bg-amber-100'
                    : 'bg-stone-100 dark:bg-[#181825] text-stone-700 dark:text-[#CDD6F4] border-stone-300 dark:border-[#383852] hover:border-emerald-600 dark:hover:border-[#A6E3A1]'
                }`}
              >
                {isWhitelisted ? 'Remove Whitelist' : 'Whitelist Domain'}
              </button>
            </div>
          )}
        </div>

        {/* Real-time Threat Ticker (Tactile Cards) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="sentry-card p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between text-stone-500 dark:text-[#9399B2] mb-1">
              <span className="text-[10px] font-mono uppercase font-medium">Trackers Intercepted</span>
              <HiShieldCheck className="h-4 w-4 text-emerald-700 dark:text-[#A6E3A1]" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-800 dark:text-[#A6E3A1]">
              {stats?.trackersBlocked || 0}
            </div>
            <span className="text-[9px] text-stone-400 dark:text-[#9399B2] font-mono">DNR Static & Dynamic</span>
          </div>

          <div className="sentry-card p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between text-stone-500 dark:text-[#9399B2] mb-1">
              <span className="text-[10px] font-mono uppercase font-medium">Canvas Scrambled</span>
              <HiCpuChip className="h-4 w-4 text-stone-700 dark:text-[#CBA6F7]" />
            </div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-[#CBA6F7]">
              {stats?.canvasFaked || 0}
            </div>
            <span className="text-[9px] text-stone-400 dark:text-[#9399B2] font-mono">Math Noise Perturbation</span>
          </div>

          <div className="sentry-card p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between text-stone-500 dark:text-[#9399B2] mb-1">
              <span className="text-[10px] font-mono uppercase font-medium">Audio Freq Masked</span>
              <HiSpeakerWave className="h-4 w-4 text-teal-700 dark:text-[#94E2D5]" />
            </div>
            <div className="text-xl font-bold font-mono text-teal-800 dark:text-[#94E2D5]">
              {stats?.audioFaked || 0}
            </div>
            <span className="text-[9px] text-stone-400 dark:text-[#9399B2] font-mono">Acoustic Shifting</span>
          </div>

          <div className="sentry-card p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between text-stone-500 dark:text-[#9399B2] mb-1">
              <span className="text-[10px] font-mono uppercase font-medium">AI Pixels Blocked</span>
              <HiSignal className="h-4 w-4 text-rose-700 dark:text-[#F38BA8]" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-800 dark:text-[#F38BA8]">
              {stats?.aiBeaconsBlocked || 0}
            </div>
            <span className="text-[9px] text-stone-400 dark:text-[#9399B2] font-mono">Meta / Google Telemetry</span>
          </div>
        </div>

        {/* Protection Mode Toggle */}
        <div className="sentry-card p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase text-stone-500 dark:text-[#9399B2] tracking-wider font-semibold">
              Defense Profile
            </span>
            <span className="font-mono text-[10px] text-emerald-800 dark:text-[#A6E3A1] uppercase font-bold">
              {settings.mode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-stone-100 dark:bg-[#181825] p-1 border border-stone-200 dark:border-[#383852]">
            {(['permissive', 'balanced', 'strict'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-1 text-[11px] font-semibold rounded-lg capitalize transition ${
                  settings.mode === m
                    ? 'bg-white dark:bg-[#252538] text-emerald-800 dark:text-[#A6E3A1] shadow-sm border border-stone-200 dark:border-[#A6E3A1]/30'
                    : 'text-stone-500 dark:text-[#9399B2] hover:text-stone-800 dark:hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Core Defense Toggles */}
        <div className="sentry-card p-3.5 space-y-2.5">
          <span className="font-mono text-[10px] uppercase text-stone-500 dark:text-[#9399B2] tracking-wider font-semibold">
            Shield Sub-Systems
          </span>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-[#383852]/60">
              <span className="text-stone-700 dark:text-[#CDD6F4] font-medium">Canvas & WebGL Defense</span>
              <button
                onClick={() => handleToggleFeature('canvasShield')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  settings.canvasShield
                    ? 'bg-emerald-700 dark:bg-[#A6E3A1]'
                    : 'bg-stone-300 dark:bg-[#383852]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                    settings.canvasShield ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-[#383852]/60">
              <span className="text-stone-700 dark:text-[#CDD6F4] font-medium">AudioContext Perturbation</span>
              <button
                onClick={() => handleToggleFeature('audioShield')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  settings.audioShield
                    ? 'bg-emerald-700 dark:bg-[#A6E3A1]'
                    : 'bg-stone-300 dark:bg-[#383852]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                    settings.audioShield ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-stone-700 dark:text-[#CDD6F4] font-medium">AI Scrapers & Training Pixels</span>
              <button
                onClick={() => handleToggleFeature('aiScraperShield')}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  settings.aiScraperShield
                    ? 'bg-emerald-700 dark:bg-[#A6E3A1]'
                    : 'bg-stone-300 dark:bg-[#383852]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                    settings.aiScraperShield ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Cookie Consent Guard */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#252538] border border-stone-200 dark:border-[#383852]">
              <div className="flex items-center space-x-2">
                <HiShieldCheck className="h-4 w-4 text-emerald-700 dark:text-[#A6E3A1]" />
                <div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-white">Cookie Consent Guard</div>
                  <div className="text-[10px] text-stone-400 dark:text-[#A6ADC8]">Auto-reject & hide popups (All Sites)</div>
                </div>
              </div>
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
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.cookieConsent?.enabled ?? true ? 'bg-emerald-700 dark:bg-[#A6E3A1]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
                    settings.cookieConsent?.enabled ?? true ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleActivateZapper}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-rose-200 dark:border-[#F38BA8]/30 bg-rose-50 dark:bg-[#F38BA8]/10 px-3 py-2 text-xs font-semibold text-rose-800 dark:text-[#F38BA8] transition hover:bg-rose-100 dark:hover:bg-[#F38BA8]/20"
          >
            <HiBolt className="h-4 w-4 text-rose-600 dark:text-[#F38BA8]" />
            <span>Element Zapper</span>
          </button>

          <button
            onClick={handleOpenDashboard}
            className="flex items-center justify-center space-x-1.5 rounded-xl border border-stone-200 dark:border-[#383852] bg-stone-100 dark:bg-[#181825] px-3 py-2 text-xs font-semibold text-stone-700 dark:text-[#CDD6F4] transition hover:border-emerald-600 dark:hover:border-[#A6E3A1]"
          >
            <span>Broker Hub</span>
            <HiArrowTopRightOnSquare className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
