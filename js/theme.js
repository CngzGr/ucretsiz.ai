/**
 * ücretsiz.ai — Tema Yönetimi (Dark/Light Mode)
 * localStorage ile tercih saklar, sistem tercihini dinler
 */

const ThemeManager = (() => {
  const STORAGE_KEY = 'ucretsiz-ai-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  /** Mevcut temayı al */
  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || DARK;
  }

  /** Temayı uygula */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcon(theme);
    // Diğer bileşenlere bildir
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  /** Temayı değiştir (toggle) */
  function toggleTheme() {
    const current = getTheme();
    setTheme(current === DARK ? LIGHT : DARK);
  }

  /** Toggle butonundaki ikonu güncelle */
  function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btn.innerHTML = theme === DARK ? sunIcon : moonIcon;
    btn.setAttribute('aria-label', theme === DARK ? 'Açık temaya geç' : 'Koyu temaya geç');
  }

  /** Başlangıç: kayıtlı veya sistem tercihini uygula */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setTheme(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? DARK : LIGHT);
    }

    // Sistem tercih değişikliğini dinle
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? DARK : LIGHT);
      }
    });
  }

  return { init, getTheme, setTheme, toggleTheme };
})();

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', ThemeManager.init);
