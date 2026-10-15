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
      const themeName = dark ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(themeName);
      document.documentElement.setAttribute('data-theme', themeName);
      document.documentElement.style.colorScheme = themeName;
      if (document.body) {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(themeName);
        document.body.setAttribute('data-theme', themeName);
        document.body.style.colorScheme = themeName;
      }
    }
  }, []);

  // Sync initial setting from chrome.storage.local and listen for real-time broadcasts
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
          const newMode = changes.sentry_theme_preference.newValue as ThemeMode;
          setThemeModeState(newMode);
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

    return () => {
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', mediaListener);
      }
    };
  }, [themeMode, applyThemeClasses]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ sentry_theme_preference: mode });
    }
  };

  const cycleTheme = () => {
    setThemeModeState((prev) => {
      const next: ThemeMode = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light';
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ sentry_theme_preference: next });
      }
      return next;
    });
  };

  return { themeMode, isDark, setThemeMode, cycleTheme };
}
