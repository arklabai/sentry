import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Cpu,
  Volume2,
  ExternalLink,
  Power,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  Layers,
} from 'lucide-react';
import { PrivacySettings, TabThreatStats, GlobalPrivacyStats } from '../types';

export default function Popup() {
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
    chrome.runtime.sendMessage({ action: 'ACTIVATE_ELEMENT_ZAPPER' }, () => {
      window.close(); // Close popup so user can immediately click in page
    });
  };

  const handleOpenDashboard = (tab?: string) => {
    chrome.runtime.openOptionsPage();
  };

  if (loading || !settings) {
    return (
      <div className="flex h-[580px] w-full flex-col items-center justify-center space-y-4 bg-[#060913] p-6 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest">
          Synchronizing Sentry Defense...
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
  const scoreColors: Record<string, string> = {
    'A+': 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    A: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    B: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    C: 'text-amber-400 border-amber-500/40 bg-amber-950/40',
    D: 'text-orange-400 border-orange-500/40 bg-orange-950/40',
    F: 'text-rose-500 border-rose-500/40 bg-rose-950/40',
  };

  return (
    <div className="flex flex-col h-[580px] w-[380px] select-none bg-[#060913] text-slate-100 overflow-y-auto">
      {/* Top Cyber Bar */}
      <header className="flex items-center justify-between border-b border-cyan-500/20 bg-[#090e1c] px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center justify-center">
            <Shield className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.7)]" />
            <span className="absolute h-2 w-2 rounded-full bg-cyan-300 animate-ping" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-white">
              SENTRY <span className="text-cyan-400">AI</span>
            </h1>
            <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-500/80">
              BE FEARLESS ONLINE
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' });
              window.close();
            }}
            title="Dock Sentry AI to Browser Side Panel"
            className="flex items-center space-x-1 rounded-md border border-blue-500/40 bg-blue-950/50 px-2 py-1 text-xs text-blue-300 transition hover:bg-blue-900/60 hover:border-blue-400"
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-mono text-[10px]">SIDEBAR</span>
          </button>

          <button
            onClick={() => handleOpenDashboard()}
            title="Open Privacy Command Center & Data Broker Hub"
            className="flex items-center space-x-1 rounded-md border border-cyan-500/30 bg-cyan-950/30 px-2 py-1 text-xs text-cyan-300 transition hover:bg-cyan-900/40 hover:border-cyan-400"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px]">VAULT</span>
          </button>
        </div>
      </header>

      {/* Main Defense Panel */}
      <div className="p-4 space-y-4">
        {/* Master Shield & Score Banner */}
        <div className="cyber-card p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            {/* Master Toggle Button */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleToggleMasterShield}
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  settings.masterShield
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(0,240,255,0.5)] radar-active text-cyan-300'
                    : 'border-slate-700 bg-slate-900 text-slate-500'
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
                  <h2 className="text-sm font-bold text-white">
                    {isShieldOn ? 'SHIELD ARMED' : 'SHIELD DISABLED'}
                  </h2>
                </div>
                <p className="font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                  {stats?.domain ? stats.domain : 'Chrome Browser'}
                </p>
              </div>
            </div>

            {/* Safety Grade Indicator */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase text-slate-400">
                Safety Grade
              </span>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-lg border font-black text-xl shadow-lg transition-all ${
                  scoreColors[score] || scoreColors['F']
                }`}
              >
                {score}
              </div>
            </div>
          </div>

          {/* Whitelist Domain Row */}
          {stats?.domain && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                {isWhitelisted ? 'Site is Whitelisted' : 'Protection Active for Site'}
              </span>
              <button
                onClick={handleToggleWhitelist}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border transition ${
                  isWhitelisted
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/60'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/50'
                }`}
              >
                {isWhitelisted ? 'Remove Whitelist' : 'Whitelist Domain'}
              </button>
            </div>
          )}
        </div>

        {/* Real-time Threat Ticker */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="cyber-card p-2.5">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-mono uppercase">Trackers Intercepted</span>
              <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300 glow-cyan">
              {stats?.trackersBlocked || 0}
            </div>
            <span className="text-[9px] text-slate-500 font-mono">DNR Static & Dynamic</span>
          </div>

          <div className="cyber-card p-2.5">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-mono uppercase">Canvas Scrambled</span>
              <Cpu className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div className="text-xl font-bold font-mono text-violet-300 glow-violet">
              {stats?.canvasFaked || 0}
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Math Noise Injection</span>
          </div>

          <div className="cyber-card p-2.5">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-mono uppercase">Audio Freq Masked</span>
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-300 glow-emerald">
              {stats?.audioFaked || 0}
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Acoustic Perturbation</span>
          </div>

          <div className="cyber-card p-2.5">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-mono uppercase">AI Beacons Blocked</span>
              <Eye className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-300">
              {stats?.aiBeaconsBlocked || 0}
            </div>
            <span className="text-[9px] text-slate-500 font-mono">Meta / Google Pixels</span>
          </div>
        </div>

        {/* Protection Mode Toggle */}
        <div className="cyber-card p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">
              DEFENSE PROFILE
            </span>
            <span className="font-mono text-[10px] text-cyan-400 uppercase font-semibold">
              {settings.mode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900/80 p-1 border border-slate-800">
            {(['permissive', 'balanced', 'strict'] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`py-1 text-[11px] font-medium rounded capitalize transition ${
                  settings.mode === m
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Core Defense Toggles */}
        <div className="cyber-card p-3 space-y-2">
          <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">
            SHIELD SUB-SYSTEMS
          </span>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-300">Canvas & WebGL Defense</span>
              <button
                onClick={() => handleToggleFeature('canvasShield')}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  settings.canvasShield ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                    settings.canvasShield ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-300">AudioContext Perturbation</span>
              <button
                onClick={() => handleToggleFeature('audioShield')}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  settings.audioShield ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                    settings.audioShield ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-300">AI Scrapers & Training Pixels</span>
              <button
                onClick={() => handleToggleFeature('aiScraperShield')}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  settings.aiScraperShield ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                    settings.aiScraperShield ? 'translate-x-4' : 'translate-x-0'
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
            className="flex items-center justify-center space-x-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-900/40 hover:border-rose-400"
          >
            <Zap className="h-3.5 w-3.5 text-rose-400" />
            <span>Element Zapper</span>
          </button>

          <button
            onClick={() => handleOpenDashboard()}
            className="flex items-center justify-center space-x-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/40 hover:border-cyan-400"
          >
            <span>Broker Hub</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
