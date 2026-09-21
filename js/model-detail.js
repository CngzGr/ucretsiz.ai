/**
 * ücretsiz.ai — Model Detay Sayfası Modülü
 * URL'den model slug'ını alıp models.json'dan verileri yükler
 */

const ModelDetail = (() => {
  let model = null;
  let allModels = [];

  /** URL'den model slug'ını al */
  function getSlugFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/models\/([^/]+?)\.html/);
    return match ? match[1] : null;
  }

  /** Modeli yükle ve sayfayı doldur */
  async function init() {
    const slug = getSlugFromUrl();
    if (!slug) return;

    try {
      const response = await fetch('/data/models.json');
      allModels = await response.json();
      model = allModels.find(m => m.slug === slug);

      if (!model) {
        document.getElementById('model-detail-content').innerHTML = `
          <div style="text-align:center;padding:3rem;">
            <h2>Model bulunamadı</h2>
            <a href="/models.html" class="btn btn-primary" style="margin-top:1rem;">Modellere Dön</a>
          </div>`;
        return;
      }

      renderModel();
      renderRelatedModels();
    } catch (error) {
      console.error('Model yükleme hatası:', error);
    }
  }

  /** Model detaylarını render et */
  function renderModel() {
    const lang = I18n.getLang();
    const desc = model.descriptionLong?.[lang] || model.descriptionLong?.tr || model.description?.[lang] || '';
    const useCases = model.useCases?.[lang] || model.useCases?.tr || [];
    const tags = model.tags?.[lang] || model.tags?.tr || [];
    const isFree = model.pricing?.type === 'free' || model.openRouterFree;

    // Sayfa başlığını güncelle
    document.title = `${model.name} — ${model.provider} | ücretsiz.ai`;

    // Hero
    const heroEl = document.getElementById('model-hero-content');
    if (heroEl) {
      heroEl.innerHTML = `
        <div class="model-hero-info">
          <div class="model-hero-provider">
            <span class="provider-dot" style="background: ${model.providerColor || '#6366f1'}; width: 12px; height: 12px;"></span>
            <a href="${model.providerUrl || '#'}" target="_blank" rel="noopener" class="text-secondary">${model.provider}</a>
          </div>
          <h1>${model.name}</h1>
          <p class="text-lg text-secondary">${App.escapeHtml(desc)}</p>
          <div class="model-hero-badges">
            ${isFree ? `<span class="badge badge-free">${I18n.t('detail.free')}</span>` : `<span class="badge badge-paid">${I18n.t('detail.paid')}</span>`}
            <span class="badge badge-category">${model.category}</span>
            ${model.specs?.license ? `<span class="badge">${model.specs.license}</span>` : ''}
          </div>
          <div class="model-hero-actions" style="margin-top: 1.5rem;">
            ${model.openRouterFree ? `<a href="/#chat-section" class="btn btn-primary btn-lg" onclick="localStorage.setItem('ucretsiz-ai-selected-model','${model.openRouterId || ''}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              ${I18n.t('detail.try')}
            </a>` : ''}
            <a href="/models.html" class="btn btn-secondary">← ${I18n.t('nav.models')}</a>
          </div>
        </div>
      `;
    }

    // Teknik özellikler
    const specsEl = document.getElementById('model-specs');
    if (specsEl && model.specs) {
      const s = model.specs;
      specsEl.innerHTML = `
        <h2>${I18n.t('detail.specs')}</h2>
        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">${I18n.t('detail.context')}</span>
            <span class="spec-value">${s.contextWindow ? App.formatTokens(s.contextWindow) + ' token' : '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">${I18n.t('detail.maxOutput')}</span>
            <span class="spec-value">${s.maxOutput ? App.formatTokens(s.maxOutput) + ' token' : '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">${I18n.t('detail.parameters')}</span>
            <span class="spec-value">${s.parameters || '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">${I18n.t('detail.training')}</span>
            <span class="spec-value">${s.trainingCutoff || '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">${I18n.t('detail.license')}</span>
            <span class="spec-value">${s.license || '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Mimari</span>
            <span class="spec-value">${s.architecture || '—'}</span>
          </div>
        </div>
        ${s.modalities ? `<div style="margin-top:1rem;"><strong>Modaliteler:</strong> ${s.modalities.map(m => `<span class="badge">${m}</span>`).join(' ')}</div>` : ''}
        ${s.languages ? `<div style="margin-top:0.5rem;"><strong>Diller:</strong> ${s.languages.slice(0, 10).map(l => `<span class="badge">${l}</span>`).join(' ')}${s.languages.length > 10 ? ` +${s.languages.length - 10}` : ''}</div>` : ''}
      `;
    }

    // Fiyatlandırma
    const pricingEl = document.getElementById('model-pricing');
    if (pricingEl && model.pricing) {
      const p = model.pricing;
      pricingEl.innerHTML = `
        <h2>${I18n.t('detail.pricing')}</h2>
        <div class="card ${isFree ? 'card-featured' : ''}">
          <div class="card-body">
            <div class="pricing-header">
              ${isFree ? `<span class="badge badge-free" style="font-size:1rem;padding:0.5rem 1rem;">✨ ${I18n.t('detail.free')}</span>` : `<span class="badge badge-paid" style="font-size:1rem;padding:0.5rem 1rem;">${I18n.t('detail.paid')}</span>`}
            </div>
            ${p.inputPer1M !== undefined ? `
            <div class="pricing-details" style="margin-top:1rem;">
              <div class="flex" style="justify-content:space-between;margin-bottom:0.5rem;">
                <span class="text-secondary">${I18n.t('detail.input')}</span>
                <span class="text-lg"><strong>\$${p.inputPer1M}</strong></span>
              </div>
              <div class="flex" style="justify-content:space-between;">
                <span class="text-secondary">${I18n.t('detail.output')}</span>
                <span class="text-lg"><strong>\$${p.outputPer1M}</strong></span>
              </div>
            </div>` : ''}
            ${p.freeLimit ? `<p class="text-sm text-muted" style="margin-top:1rem;">Limit: ${p.freeLimit}</p>` : ''}
          </div>
        </div>
      `;
    }

    // Kabiliyetler
    const capsEl = document.getElementById('model-capabilities');
    if (capsEl && model.capabilities) {
      const caps = model.capabilities;
      const capList = [
        { key: 'chat', icon: '💬' },
        { key: 'codeGeneration', icon: '💻' },
        { key: 'imageUnderstanding', icon: '👁️' },
        { key: 'imageGeneration', icon: '🎨' },
        { key: 'functionCalling', icon: '🔧' },
        { key: 'streaming', icon: '⚡' },
        { key: 'jsonMode', icon: '📋' },
        { key: 'reasoning', icon: '🧠' },
        { key: 'webSearch', icon: '🔍' },
        { key: 'fileUpload', icon: '📁' },
      ];

      capsEl.innerHTML = `
        <h2>${I18n.t('detail.capabilities')}</h2>
        <div class="capabilities-grid">
          ${capList.map(cap => `
            <div class="capability-item ${caps[cap.key] ? 'active' : 'inactive'}">
              <span class="cap-icon">${cap.icon}</span>
              <span class="cap-name">${I18n.t('cap.' + cap.key)}</span>
              <span class="cap-status">${caps[cap.key] ? '✓' : '✗'}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Kullanım alanları
    const useCasesEl = document.getElementById('model-use-cases');
    if (useCasesEl && useCases.length > 0) {
      useCasesEl.innerHTML = `
        <h2>${I18n.t('detail.usecases')}</h2>
        <div class="use-cases-list">
          ${useCases.map(uc => `
            <div class="use-case-item card">
              <div class="card-body" style="padding: 1rem;">
                <span>📌</span> ${App.escapeHtml(uc)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Araç seti
    const toolsEl = document.getElementById('model-tools');
    if (toolsEl && model.tools) {
      const t = model.tools;
      toolsEl.innerHTML = `
        <h2>${I18n.t('detail.tools')}</h2>
        <div class="tools-grid">
          ${t.ides?.length ? `
          <div class="card"><div class="card-body">
            <h4>🖥️ IDE'ler</h4>
            <div class="tags-list">${t.ides.map(i => `<span class="badge">${i}</span>`).join('')}</div>
          </div></div>` : ''}
          ${t.agents?.length ? `
          <div class="card"><div class="card-body">
            <h4>🤖 Ajanlar</h4>
            <div class="tags-list">${t.agents.map(a => `<span class="badge">${a}</span>`).join('')}</div>
          </div></div>` : ''}
          ${t.platforms?.length ? `
          <div class="card"><div class="card-body">
            <h4>🌐 Platformlar</h4>
            <div class="tags-list">${t.platforms.map(p => `<span class="badge">${p}</span>`).join('')}</div>
          </div></div>` : ''}
        </div>
      `;
    }

    // API kullanımı
    const apiEl = document.getElementById('model-api');
    if (apiEl && model.openRouterId) {
      apiEl.innerHTML = `
        <h2>${I18n.t('detail.api')}</h2>
        <div class="code-block">
          <div class="code-header">
            <span>cURL</span>
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('api-code').textContent);App.showToast('${I18n.t('general.copied')}','success')">
              ${I18n.t('general.copy')}
            </button>
          </div>
          <pre><code id="api-code">curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model.openRouterId}",
    "messages": [
      {"role": "user", "content": "Merhaba!"}
    ]
  }'</code></pre>
        </div>
        <div class="code-block" style="margin-top: 1rem;">
          <div class="code-header">
            <span>JavaScript (fetch)</span>
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('api-code-js').textContent);App.showToast('${I18n.t('general.copied')}','success')">
              ${I18n.t('general.copy')}
            </button>
          </div>
          <pre><code id="api-code-js">const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: '${model.openRouterId}',
    messages: [{ role: 'user', content: 'Merhaba!' }],
  }),
});
const data = await response.json();
console.log(data.choices[0].message.content);</code></pre>
        </div>
      `;
    }

    // Türkçe skoru
    const scoreEl = document.getElementById('model-turkish-score');
    if (scoreEl && model.turkishScore) {
      const score = model.turkishScore;
      const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low';
      scoreEl.innerHTML = `
        <div class="turkish-score card card-glass">
          <div class="card-body" style="text-align: center; padding: 1.5rem;">
            <h4>🇹🇷 Türkçe Performans Skoru</h4>
            <div class="score-circle ${scoreClass}" style="margin: 1rem auto; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; border: 3px solid;">
              ${score}
            </div>
            <p class="text-sm text-secondary">${score >= 80 ? 'Mükemmel Türkçe desteği' : score >= 60 ? 'İyi Türkçe desteği' : 'Temel Türkçe desteği'}</p>
          </div>
        </div>
      `;
    }
  }

  /** İlgili modelleri render et */
  function renderRelatedModels() {
    const el = document.getElementById('model-related');
    if (!el || !model) return;
    const lang = I18n.getLang();

    // Aynı provider veya aynı kategoriden modeller
    const related = allModels
      .filter(m => m.slug !== model.slug && (m.provider === model.provider || m.category === model.category))
      .slice(0, 4);

    if (related.length === 0) return;

    el.innerHTML = `
      <h2>${I18n.t('detail.related')}</h2>
      <div class="grid" style="--grid-min: 250px;">
        ${related.map(m => {
          const desc = m.description?.[lang] || m.description?.tr || '';
          const isFree = m.pricing?.type === 'free' || m.openRouterFree;
          return `
            <a href="/models/${m.slug}.html" class="card model-card">
              <div class="card-header">
                <div class="model-card-provider">
                  <span class="provider-dot" style="background: ${m.providerColor || '#6366f1'}"></span>
                  <span class="provider-name">${m.provider}</span>
                </div>
                ${isFree ? '<span class="badge badge-free">Ücretsiz</span>' : ''}
              </div>
              <div class="card-body">
                <h3 class="model-card-name">${m.name}</h3>
                <p class="model-card-desc line-clamp-2">${App.escapeHtml(desc)}</p>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('model-detail-content')) {
      init();
    }
  });

  return { init };
})();
