/**
 * ücretsiz.ai — Ana Uygulama Modülü
 * Navbar, ayarlar modalı, ortak yardımcı fonksiyonlar
 */

const App = (() => {
  /** Navbar mobil toggle */
  function initNavbar() {
    const toggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
      // Menü açıkken scroll'u kapat
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Menü linkine tıklayınca kapat
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Navbar'ı scroll'da küçült
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (!navbar) return;
      const currentScroll = window.scrollY;
      navbar.classList.toggle('scrolled', currentScroll > 50);
      lastScroll = currentScroll;
    }, { passive: true });
  }

  /** Tema toggle butonu */
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => ThemeManager.toggleTheme());
  }

  /** Dil toggle butonu */
  function initLangToggle() {
    const btn = document.getElementById('lang-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => I18n.toggleLang());
  }

  /** Ayarlar modalı */
  function initSettings() {
    const openBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    if (!openBtn || !modal) return;

    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.modal-close');
    const saveBtn = modal.querySelector('.settings-save');
    const apiKeyInput = modal.querySelector('#api-key-input');

    // Kayıtlı API key'i yükle
    if (apiKeyInput) {
      apiKeyInput.value = localStorage.getItem('ucretsiz-ai-apikey') || '';
    }

    function openModal() {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (apiKeyInput) apiKeyInput.focus();
    }

    function closeModal() {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // ESC ile kapat
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Kaydet
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (apiKeyInput) {
          const key = apiKeyInput.value.trim();
          if (key) {
            localStorage.setItem('ucretsiz-ai-apikey', key);
          } else {
            localStorage.removeItem('ucretsiz-ai-apikey');
          }
        }
        showToast(I18n.t('settings.saved'), 'success');
        closeModal();
      });
    }
  }

  /** Toast bildirimi göster */
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-up`;
    toast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Kapat">&times;</button>
    `;
    container.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  /** HTML kaçışı */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** Sayıyı okunabilir formata çevir (1000 → 1K, 1000000 → 1M) */
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K';
    return num.toString();
  }

  /** Token sayısını okunabilir formata çevir */
  function formatTokens(tokens) {
    if (tokens >= 1000000) return (tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1) + 'M';
    if (tokens >= 1000) return (tokens / 1000).toFixed(0) + 'K';
    return tokens.toString();
  }

  /** Debounce fonksiyonu */
  function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /** Markdown'ı basit HTML'e çevir (chat için) */
  function simpleMarkdown(text) {
    if (!text) return '';
    return text
      // Kod blokları (``` ... ```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline kod (` ... `)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Kalın (**text**)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // İtalik (*text*)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Linkler [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Başlıklar
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      // Listeler
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      // Paragraflar
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hupol])/gm, function(match) { return match ? match : '<p>'; });
  }

  /** API anahtarını al */
  function getApiKey() {
    return localStorage.getItem('ucretsiz-ai-apikey') || '';
  }

  /** Aktif sayfayı navbar'da işaretle */
  function highlightActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      const linkPage = href ? href.split('/').pop() : '';
      if (linkPage === currentPage || 
          (currentPage === 'index.html' && (href === '/' || href === '/index.html')) ||
          (currentPage === '' && (href === '/' || href === '/index.html'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /** Smooth scroll — anchor linkler için */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /** Klavye kısayolları */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K: Arama odakla
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.model-search input, .chat-input textarea');
        if (searchInput) searchInput.focus();
      }
    });
  }

  /** Başlangıç */
  function init() {
    initNavbar();
    initThemeToggle();
    initLangToggle();
    initSettings();
    highlightActiveNav();
    initSmoothScroll();
    initKeyboardShortcuts();
  }

  // DOMContentLoaded bekle
  document.addEventListener('DOMContentLoaded', init);

  // Public API
  return { 
    showToast, 
    escapeHtml, 
    formatNumber, 
    formatTokens, 
    debounce, 
    simpleMarkdown, 
    getApiKey 
  };
})();
