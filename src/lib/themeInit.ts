/**
 * Immediate zero-flicker theme initializer for Sentry AI
 * Safely executes in external script context conforming to Manifest V3 script-src 'self' CSP.
 */
(function initTheme() {
  try {
    const saved = localStorage.getItem('sentry_theme_preference');
    const isDark =
      saved === 'dark' ||
      ((!saved || saved === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch {
    // Graceful fallback to CSS default
  }
})();

export {};
