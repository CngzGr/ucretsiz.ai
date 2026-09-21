/**
 * ücretsiz.ai — Model Arama & Filtreleme Modülü
 * models.json'dan modelleri yükler, arar, filtreler ve render eder
 */

const Models = (() => {
  let allModels = [];
  let filteredModels = [];
  let currentFilter = 'all';
  let currentSort = 'popularity';
  let searchQuery = '';

  /** Modelleri JSON'dan yükle */
  async function loadModels() {
    try {
      const response = await fetch('/data/models.json');
      if (!response.ok) throw new Error('Models yüklenemedi');
      allModels = await response.json();
      filteredModels = [...allModels];
      applyFilters();
      updateCount();
    } catch (error) {
      console.error('Model yükleme hatası:', error);
      const grid = document.getElementById('model-grid');
      if (grid) {
        grid.innerHTML = `<p class="text-center text-secondary" style="grid-column: 1/-1; padding: 2rem;">${I18n.t('general.error')}</p>`;
      }
    }
  }

  /** Filtreleri uygula */
  function applyFilters() {
    const lang = I18n.getLang();

    // Arama
    filteredModels = allModels.filter(model => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        model.name.toLowerCase().includes(q) ||
        model.provider.toLowerCase().includes(q) ||
        model.category.toLowerCase().includes(q) ||
        (model.description?.[lang] || model.description?.tr || '').toLowerCase().includes(q) ||
        (model.tags?.[lang] || model.tags?.tr || []).some(t => t.toLowerCase().includes(q)) ||
        model.slug.toLowerCase().includes(q)
      );
    });

    // Kategori filtresi
    if (currentFilter === 'free') {
      filteredModels = filteredModels.filter(m => m.pricing?.type === 'free' || m.openRouterFree);
    } else if (currentFilter !== 'all') {
      filteredModels = filteredModels.filter(m => m.category === currentFilter);
    }

    // Sıralama
    filteredModels.sort((a, b) => {
      switch (currentSort) {
        case 'popularity': return (b.popularity || 0) - (a.popularity || 0);
        case 'name': return a.name.localeCompare(b.name);
        case 'context': return (b.specs?.contextWindow || 0) - (a.specs?.contextWindow || 0);
        case 'turkish': return (b.turkishScore || 0) - (a.turkishScore || 0);
        default: return 0;
      }
    });

    renderModels();
    updateCount();
  }

  /** Model kartlarını render et */
  function renderModels() {
    const grid = document.getElementById('model-grid');
    if (!grid) return;

    const lang = I18n.getLang();

    if (filteredModels.length === 0) {
      grid.innerHTML = `
        <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" style="margin-bottom: 1rem;">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p data-i18n="models.no.results">${I18n.t('models.no.results')}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredModels.map(model => {
      const description = model.description?.[lang] || model.description?.tr || '';
      const tags = model.tags?.[lang] || model.tags?.tr || [];
      const isFree = model.pricing?.type === 'free' || model.openRouterFree;
      const pricingBadge = isFree 
        ? `<span class="badge badge-free">${I18n.t('detail.free')}</span>` 
        : model.pricing?.type === 'freemium' 
          ? `<span class="badge badge-new">Freemium</span>`
          : `<span class="badge badge-paid">${I18n.t('detail.paid')}</span>`;

      const contextStr = model.specs?.contextWindow 
        ? App.formatTokens(model.specs.contextWindow) 
        : '—';

      // Kabiliyet ikonları
      const capabilities = [];
      if (model.capabilities?.chat) capabilities.push('💬');
      if (model.capabilities?.codeGeneration) capabilities.push('💻');
      if (model.capabilities?.imageUnderstanding) capabilities.push('👁️');
      if (model.capabilities?.reasoning) capabilities.push('🧠');
      if (model.capabilities?.functionCalling) capabilities.push('🔧');
      if (model.capabilities?.imageGeneration) capabilities.push('🎨');

      return `
        <a href="/models/${model.slug}.html" class="model-card" data-model-id="${model.id}">
          <div class="card-header">
            <div class="model-card-provider">
              <span class="provider-dot" style="background: ${model.providerColor || '#6366f1'}"></span>
              <span class="provider-name">${App.escapeHtml(model.provider)}</span>
            </div>
            ${pricingBadge}
          </div>
          <div class="card-body">
            <h3 class="model-card-name">${App.escapeHtml(model.name)}</h3>
            <p class="model-card-desc line-clamp-2">${App.escapeHtml(description)}</p>
          </div>
          <div class="card-footer">
            <div class="model-card-specs">
              <span class="spec-chip" title="${I18n.t('detail.context')}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
                ${contextStr}
              </span>
              <span class="spec-chip capabilities-chip">${capabilities.join(' ')}</span>
            </div>
            <div class="model-card-tags">
              ${tags.slice(0, 3).map(tag => `<span class="tag">${App.escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  /** Sonuç sayısını güncelle */
  function updateCount() {
    const countEl = document.getElementById('model-count');
    if (countEl) {
      countEl.textContent = I18n.t('models.count', { count: filteredModels.length });
    }
  }

  /** Arama inputunu başlat */
  function initSearch() {
    const input = document.getElementById('model-search-input');
    if (!input) return;

    const debouncedSearch = App.debounce((value) => {
      searchQuery = value;
      applyFilters();
    }, 200);

    input.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });

    // Ctrl+K ile odakla
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
      }
    });
  }

  /** Filtre butonlarını başlat */
  function initFilters() {
    const filterContainer = document.getElementById('model-filters');
    if (!filterContainer) return;

    filterContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;

      currentFilter = pill.dataset.filter;
      filterContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyFilters();
    });
  }

  /** Sıralama dropdown */
  function initSort() {
    const select = document.getElementById('model-sort');
    if (!select) return;

    select.addEventListener('change', (e) => {
      currentSort = e.target.value;
      applyFilters();
    });
  }

  /** Dil değiştiğinde yeniden render et */
  function onLangChange() {
    applyFilters();
  }

  /** Başlangıç */
  function init() {
    loadModels();
    initSearch();
    initFilters();
    initSort();
    window.addEventListener('langchange', onLangChange);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('model-grid')) {
      init();
    }
  });

  // Public API
  return { loadModels, applyFilters };
})();
