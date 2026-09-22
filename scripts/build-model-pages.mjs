#!/usr/bin/env node
/**
 * ücretsiz.ai — Model detay sayfası üreteci.
 *
 * data/models.json içindeki her model için models/<slug>.html static olarak üretilir.
 * Tüm içerik (specs, capabilities, pricing, use-cases, tools, API örnekleri, related
 * models) derleme zamanında HTML'e gömülür — tarayıcıda JS ile doldurulmaz. Bu sayede
 * arama motorları içeriği doğrudan görür.
 *
 * Kullanım:
 *   node scripts/build-model-pages.mjs
 *
 * Yeni bir model eklemek için data/models.json'a bir kayıt ekleyip bu script'i
 * tekrar çalıştırmak yeterlidir — tüm models/*.html dosyaları yeniden üretilir.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = 'https://ucretsiz.ai';
const GA_ID = 'G-N4ZVHS9RV4';

const models = JSON.parse(readFileSync(join(ROOT, 'data', 'models.json'), 'utf-8'));

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTokens(tokens) {
  if (tokens === undefined || tokens === null) return '—';
  if (tokens >= 1000000) return (tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1) + 'M';
  if (tokens >= 1000) return (tokens / 1000).toFixed(0) + 'K';
  return tokens.toString();
}

const CAP_LIST = [
  { key: 'chat', icon: '💬', label: 'Sohbet' },
  { key: 'codeGeneration', icon: '💻', label: 'Kod Üretimi' },
  { key: 'imageUnderstanding', icon: '👁️', label: 'Görsel Anlama' },
  { key: 'imageGeneration', icon: '🎨', label: 'Görsel Üretimi' },
  { key: 'functionCalling', icon: '🔧', label: 'Fonksiyon Çağırma' },
  { key: 'streaming', icon: '⚡', label: 'Streaming' },
  { key: 'jsonMode', icon: '📋', label: 'JSON Modu' },
  { key: 'reasoning', icon: '🧠', label: 'Akıl Yürütme' },
  { key: 'webSearch', icon: '🔍', label: 'Web Arama' },
  { key: 'fileUpload', icon: '📁', label: 'Dosya Yükleme' },
];

function renderHero(model) {
  const desc = model.descriptionLong?.tr || model.description?.tr || '';
  const isFree = model.pricing?.type === 'free' || model.openRouterFree;
  return `
        <div class="model-hero-info">
          <div class="model-hero-provider">
            <span class="provider-dot" style="background: ${model.providerColor || 'var(--primary)'}; width: 12px; height: 12px;"></span>
            <a href="${model.providerUrl || '#'}" target="_blank" rel="noopener" class="text-secondary">${escapeHtml(model.provider)}</a>
          </div>
          <h1>${escapeHtml(model.name)}</h1>
          <p class="text-lg text-secondary">${escapeHtml(desc)}</p>
          <div class="model-hero-badges">
            ${isFree ? `<span class="badge badge-free">Ücretsiz</span>` : `<span class="badge badge-paid">Ücretli</span>`}
            <span class="badge badge-category">${escapeHtml(model.category)}</span>
            ${model.specs?.license ? `<span class="badge">${escapeHtml(model.specs.license)}</span>` : ''}
          </div>
          <div class="model-hero-actions" style="margin-top: 1.5rem;">
            ${model.openRouterFree ? `<a href="/#chat-section" class="btn btn-primary btn-lg" onclick="localStorage.setItem('ucretsiz-ai-selected-model','${model.openRouterId || ''}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Bu Modeli Dene
            </a>` : ''}
            <a href="/models.html" class="btn btn-secondary">← AI Modeller</a>
          </div>
        </div>`;
}

function renderSpecs(model) {
  const s = model.specs;
  if (!s) return '';
  return `
        <h2>Teknik Özellikler</h2>
        <div class="specs-grid">
          <div class="spec-item">
            <span class="spec-label">Bağlam Penceresi</span>
            <span class="spec-value">${s.contextWindow ? formatTokens(s.contextWindow) + ' token' : '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Maks. Çıktı</span>
            <span class="spec-value">${s.maxOutput ? formatTokens(s.maxOutput) + ' token' : '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Parametre Sayısı</span>
            <span class="spec-value">${escapeHtml(s.parameters) || '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Eğitim Kesimi</span>
            <span class="spec-value">${escapeHtml(s.trainingCutoff) || '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Lisans</span>
            <span class="spec-value">${escapeHtml(s.license) || '—'}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Mimari</span>
            <span class="spec-value">${escapeHtml(s.architecture) || '—'}</span>
          </div>
        </div>
        ${s.modalities?.length ? `<div style="margin-top:1rem;"><strong>Modaliteler:</strong> ${s.modalities.map(m => `<span class="badge">${escapeHtml(m)}</span>`).join(' ')}</div>` : ''}
        ${s.languages?.length ? `<div style="margin-top:0.5rem;"><strong>Diller:</strong> ${s.languages.slice(0, 10).map(l => `<span class="badge">${escapeHtml(l)}</span>`).join(' ')}${s.languages.length > 10 ? ` +${s.languages.length - 10}` : ''}</div>` : ''}`;
}

function renderPricing(model) {
  const p = model.pricing;
  if (!p) return '';
  const isFree = p.type === 'free' || model.openRouterFree;
  return `
        <h2>Fiyatlandırma</h2>
        <div class="card ${isFree ? 'card-featured' : ''}">
          <div class="card-body">
            <div class="pricing-header">
              ${isFree ? `<span class="badge badge-free" style="font-size:1rem;padding:0.5rem 1rem;">✨ Ücretsiz</span>` : `<span class="badge badge-paid" style="font-size:1rem;padding:0.5rem 1rem;">Ücretli</span>`}
            </div>
            ${p.inputPer1M !== undefined ? `
            <div class="pricing-details" style="margin-top:1rem;">
              <div class="flex" style="justify-content:space-between;margin-bottom:0.5rem;">
                <span class="text-secondary">Giriş / 1M Token</span>
                <span class="text-lg"><strong>$${p.inputPer1M}</strong></span>
              </div>
              <div class="flex" style="justify-content:space-between;">
                <span class="text-secondary">Çıkış / 1M Token</span>
                <span class="text-lg"><strong>$${p.outputPer1M}</strong></span>
              </div>
            </div>` : ''}
            ${p.freeLimit ? `<p class="text-sm text-muted" style="margin-top:1rem;">Limit: ${escapeHtml(p.freeLimit)}</p>` : ''}
          </div>
        </div>`;
}

function renderCapabilities(model) {
  const caps = model.capabilities;
  if (!caps) return '';
  return `
        <h2>Kabiliyetler</h2>
        <div class="capabilities-grid">
          ${CAP_LIST.map(cap => `
            <div class="capability-item ${caps[cap.key] ? 'active' : 'inactive'}">
              <span class="cap-icon">${cap.icon}</span>
              <span class="cap-name">${cap.label}</span>
              <span class="cap-status">${caps[cap.key] ? '✓' : '✗'}</span>
            </div>`).join('')}
        </div>`;
}

function renderUseCases(model) {
  const useCases = model.useCases?.tr || [];
  if (!useCases.length) return '';
  return `
        <h2>Kullanım Alanları</h2>
        <div class="use-cases-list">
          ${useCases.map(uc => `
            <div class="use-case-item card">
              <div class="card-body" style="padding: 1rem;">
                <span>📌</span> ${escapeHtml(uc)}
              </div>
            </div>`).join('')}
        </div>`;
}

function renderTools(model) {
  const t = model.tools;
  if (!t) return '';
  return `
        <h2>Araç Seti &amp; IDE'ler</h2>
        <div class="tools-grid">
          ${t.ides?.length ? `
          <div class="card"><div class="card-body">
            <h4>🖥️ IDE'ler</h4>
            <div class="tags-list">${t.ides.map(i => `<span class="badge">${escapeHtml(i)}</span>`).join('')}</div>
          </div></div>` : ''}
          ${t.agents?.length ? `
          <div class="card"><div class="card-body">
            <h4>🤖 Ajanlar</h4>
            <div class="tags-list">${t.agents.map(a => `<span class="badge">${escapeHtml(a)}</span>`).join('')}</div>
          </div></div>` : ''}
          ${t.platforms?.length ? `
          <div class="card"><div class="card-body">
            <h4>🌐 Platformlar</h4>
            <div class="tags-list">${t.platforms.map(p => `<span class="badge">${escapeHtml(p)}</span>`).join('')}</div>
          </div></div>` : ''}
        </div>`;
}

function renderApi(model) {
  if (!model.openRouterId) return '';
  return `
        <h2>API Kullanımı</h2>
        <div class="code-block">
          <div class="code-header">
            <span>cURL</span>
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('api-code').textContent);App.showToast('Kopyalandı!','success')">
              Kopyala
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
            <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('api-code-js').textContent);App.showToast('Kopyalandı!','success')">
              Kopyala
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
        </div>`;
}

function renderScore(model) {
  const score = model.turkishScore;
  if (!score) return '';
  const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-mid' : 'score-low';
  const note = score >= 80 ? 'Mükemmel Türkçe desteği' : score >= 60 ? 'İyi Türkçe desteği' : 'Temel Türkçe desteği';
  return `
        <div class="turkish-score card card-glass">
          <div class="card-body" style="text-align: center; padding: 1.5rem;">
            <h4>🇹🇷 Türkçe Performans Skoru</h4>
            <div class="score-circle ${scoreClass}" style="margin: 1rem auto; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; border: 3px solid;">
              ${score}
            </div>
            <p class="text-sm text-secondary">${note}</p>
          </div>
        </div>`;
}

function renderRelated(model, allModels) {
  const related = allModels
    .filter(m => m.slug !== model.slug && (m.provider === model.provider || m.category === model.category))
    .slice(0, 4);
  if (!related.length) return '';
  return `
        <h2>İlgili Modeller</h2>
        <div class="grid" style="--grid-min: 250px;">
          ${related.map(m => {
            const desc = m.description?.tr || '';
            const isFree = m.pricing?.type === 'free' || m.openRouterFree;
            return `
            <a href="/models/${m.slug}.html" class="card model-card">
              <div class="card-header">
                <div class="model-card-provider">
                  <span class="provider-dot" style="background: ${m.providerColor || 'var(--primary)'}"></span>
                  <span class="provider-name">${escapeHtml(m.provider)}</span>
                </div>
                ${isFree ? '<span class="badge badge-free">Ücretsiz</span>' : ''}
              </div>
              <div class="card-body">
                <h3 class="model-card-name">${escapeHtml(m.name)}</h3>
                <p class="model-card-desc line-clamp-2">${escapeHtml(desc)}</p>
              </div>
            </a>`;
          }).join('')}
        </div>`;
}

function renderPage(model, allModels) {
  const descLong = model.descriptionLong?.tr || model.description?.tr || '';
  const url = `${SITE_URL}/models/${model.slug}.html`;
  const title = `${model.name} — ${model.provider} | Ücretsiz AI Model | ücretsiz.ai`;
  const metaDesc = `${model.name} teknik özellikleri, kabiliyetleri ve API kullanımı. ${model.provider} tarafından geliştirilen ${escapeHtml(model.category)} modeli. ${descLong}`.slice(0, 300);
  const keywords = [model.name, model.provider, 'ücretsiz AI', 'yapay zeka', model.category, 'AI model']
    .concat(model.tags?.tr || [])
    .join(', ');

  return `<!DOCTYPE html>
<html lang="tr" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO - UNIQUE per model -->
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <meta name="keywords" content="${escapeHtml(keywords)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">

  <!-- Open Graph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(model.name)} — ${escapeHtml(model.provider)} | ücretsiz.ai">
  <meta property="og:description" content="${escapeHtml(model.description?.tr || '')}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="ücretsiz.ai">
  <meta property="og:image" content="${SITE_URL}/assets/og-image.png">

  <!-- Favicon & CSS -->
  <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
  <link rel="stylesheet" href="/css/style.css">

  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": ${JSON.stringify(model.name)},
    "applicationCategory": "Artificial Intelligence",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": ${JSON.stringify(model.description?.tr || '')},
    "url": ${JSON.stringify(url)}
  }
  </script>

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', '${GA_ID}');
  </script>
</head>
<body>
  <!-- NAVBAR -->
  <header class="navbar" role="banner">
    <div class="container">
      <a href="/" class="nav-brand"><img src="/assets/logo.svg" alt="ücretsiz.ai" width="32" height="32" class="nav-logo"><span class="nav-brand-text">ücretsiz<span class="text-primary">.ai</span></span></a>
      <nav class="nav-links" id="nav-links" role="navigation">
        <a href="/" data-i18n="nav.home">Ana Sayfa</a>
        <a href="/models.html" class="active" data-i18n="nav.models">AI Modeller</a>
        <a href="/chat.html" data-i18n="nav.chat">Sohbet</a>
        <a href="/karsilastir.html" data-i18n="nav.compare">Karşılaştır</a>
        <a href="/vizyon.html" data-i18n="nav.vision">Vizyon</a>
        <a href="/hakkimizda.html" data-i18n="nav.about">Hakkımızda</a>
      </nav>
      <div class="nav-actions">
        <button id="lang-toggle" class="btn btn-ghost btn-sm">EN</button>
        <button id="theme-toggle" class="btn btn-ghost btn-icon" aria-label="Tema"></button>
        <button id="nav-toggle" class="nav-toggle" aria-label="Menü" aria-expanded="false"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <main id="model-detail-content">
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="breadcrumb" style="padding: 1rem 0;">
      <div class="container">
        <a href="/">Ana Sayfa</a> <span>›</span>
        <a href="/models.html">AI Modeller</a> <span>›</span>
        <span class="text-primary">${escapeHtml(model.name)}</span>
      </div>
    </nav>

    <!-- Model Hero -->
    <section class="model-detail-hero model-hero section-padding">
      <div class="container">
        <div id="model-hero-content">${renderHero(model)}</div>
      </div>
    </section>

    <!-- Model Details Grid -->
    <section class="section-padding" style="background: var(--surface-color);">
      <div class="container">
        <div class="model-detail-grid">
          <div class="model-detail-main">
            <div id="model-specs" class="model-section">${renderSpecs(model)}</div>
            <div id="model-capabilities" class="model-section">${renderCapabilities(model)}</div>
            <div id="model-use-cases" class="model-section">${renderUseCases(model)}</div>
            <div id="model-tools" class="model-section">${renderTools(model)}</div>
            <div id="model-api" class="model-section">${renderApi(model)}</div>
          </div>
          <aside class="model-detail-sidebar">
            <div id="model-pricing" class="model-section">${renderPricing(model)}</div>
            <div id="model-turkish-score" class="model-section">${renderScore(model)}</div>
          </aside>
        </div>
      </div>
    </section>

    <!-- Related Models -->
    <section class="section-padding">
      <div class="container">
        <div id="model-related">${renderRelated(model, allModels)}</div>
      </div>
    </section>
  </main>

  <footer class="footer"><div class="container"><div class="footer-bottom"><p><a href="/vizyon.html" class="text-secondary" data-i18n="nav.vision">Vizyon</a></p><p>© 2026 ücretsiz.ai</p><p>❤️ ile Türkiye'de yapıldı</p></div></div></footer>

  <div id="toast-container"></div>
  <script src="/js/theme.js"></script>
  <script src="/js/i18n.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>
`;
}

function main() {
  const outDir = join(ROOT, 'models');
  mkdirSync(outDir, { recursive: true });

  for (const model of models) {
    const html = renderPage(model, models);
    writeFileSync(join(outDir, `${model.slug}.html`), html, 'utf-8');
  }

  console.log(`${models.length} model sayfası üretildi (models/*.html).`);
}

main();
