import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * useTheme Hook for Sentry AI
 * 
 * Aesthetic Matrix:
 * - Light Mode: Warm Linen Beige (#FAF9F6) & Solid Pure White (#FFFFFF) with Natural Forest Green (#15803D)
 * - Dark Mode: Catppuccin Cappuccino / Macchiato (#1E1E2E) with Natural Sage (#A6E3A1) & Creamy Froth (#F5E0DC)
 * - Auto / System: Dynamically synchronizes with browser theme preference and active browsing navigation history.
 */
export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sentry_theme_preference');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sentry_theme_preference');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    }
    return false;
  });

  const applyThemeClasses = useCallback((dark: boolean) => {
    setIsDark(dark);
    if (typeof document !== 'undefined') {
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body?.classList.add('dark');
        document.body?.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body?.classList.remove('dark');
        document.body?.classList.add('light');
      }
    }
  }, []);

  // Sync initial setting from chrome.storage.local
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['sentry_theme_preference'], (result) => {
        if (result?.sentry_theme_preference) {
          const stored = result.sentry_theme_preference as ThemeMode;
          if (stored === 'light' || stored === 'dark' || stored === 'system') {
            setThemeModeState(stored);
          }
        }
      });

      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.sentry_theme_preference?.newValue) {
          setThemeModeState(changes.sentry_theme_preference.newValue as ThemeMode);
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // Active theme calculation and browser event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

    const evaluateTheme = () => {
      let activeIsDark = false;
      if (themeMode === 'system') {
        activeIsDark = mediaQuery ? mediaQuery.matches : false;
      } else {
        activeIsDark = themeMode === 'dark';
      }
      applyThemeClasses(activeIsDark);
    };

    evaluateTheme();

    try {
      localStorage.setItem('sentry_theme_preference', themeMode);
    } catch {
      // Storage unavailable or sandboxed
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ sentry_theme_preference: themeMode });
    }

    // 1. Listen to browser color-scheme changes
    const mediaListener = () => {
      if (themeMode === 'system') {
        evaluateTheme();
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', mediaListener);
    }

    // 2. Listen to browser history / tab navigation events to adapt if in system mode
    let tabListener: ((activeInfo: chrome.tabs.TabActiveInfo) => void) | null = null;
    if (typeof chrome !== 'undefined' && chrome.tabs?.onActivated && themeMode === 'system') {
      tabListener = () => {
        evaluateTheme();
      };
      chrome.tabs.onActivated.addListener(tabListener);
    }

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', mediaListener);
      }
      if (tabListener && typeof chrome !== 'undefined' && chrome.tabs?.onActivated) {
        chrome.tabs.onActivated.removeListener(tabListener);
      }
    };
  }, [themeMode, applyThemeClasses]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  const cycleTheme = () => {
    setThemeModeState((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  return { themeMode, isDark, setThemeMode, cycleTheme };
}
