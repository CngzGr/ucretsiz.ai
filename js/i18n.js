/**
 * ücretsiz.ai — Çoklu Dil Desteği (i18n — Türkçe / İngilizce)
 * data-i18n attribute'ları kullanarak dil değişikliği yapar
 */

const I18n = (() => {
  const STORAGE_KEY = 'ucretsiz-ai-lang';
  const DEFAULT_LANG = 'tr';
  const SUPPORTED = ['tr', 'en'];

  // Çeviri sözlüğü — tüm statik UI metinleri
  const translations = {
    // Navigasyon
    'nav.home': { tr: 'Ana Sayfa', en: 'Home' },
    'nav.models': { tr: 'AI Modeller', en: 'AI Models' },
    'nav.chat': { tr: 'Chat', en: 'Chat' },
    'nav.about': { tr: 'Hakkımızda', en: 'About' },
    'nav.compare': { tr: 'Karşılaştır', en: 'Compare' },
    'nav.vision': { tr: 'Vizyon', en: 'Vision' },

    // Hero
    'hero.title': { tr: "Türkiye'nin Ücretsiz AI Platformu", en: "Turkey's Free AI Platform" },
    'hero.subtitle': {
      tr: 'Ücretsiz yapay zeka modellerini keşfedin, karşılaştırın ve hemen deneyin. OpenRouter üzerinden ücretsiz AI modelleriyle sohbet edin.',
      en: 'Discover, compare and try free AI models instantly. Chat with free AI models via OpenRouter.'
    },
    'hero.cta.chat': { tr: 'Hemen Sohbet Et', en: 'Start Chatting' },
    'hero.cta.models': { tr: 'Modelleri Keşfet', en: 'Explore Models' },
    'hero.stat.models': { tr: 'AI Model', en: 'AI Models' },
    'hero.stat.free': { tr: 'Ücretsiz', en: 'Free' },
    'hero.stat.providers': { tr: 'Sağlayıcı', en: 'Providers' },

    // Chat
    'chat.title': { tr: 'AI Sohbet', en: 'AI Chat' },
    'chat.placeholder': { tr: 'Mesajınızı yazın...', en: 'Type your message...' },
    'chat.send': { tr: 'Gönder', en: 'Send' },
    'chat.model.select': { tr: 'Model Seçin', en: 'Select Model' },
    'chat.history': { tr: 'Sohbet Geçmişi', en: 'Chat History' },
    'chat.new': { tr: 'Yeni Sohbet', en: 'New Chat' },
    'chat.empty.title': { tr: 'AI ile sohbete başlayın', en: 'Start a conversation with AI' },
    'chat.empty.subtitle': {
      tr: 'Ücretsiz AI modellerinden birini seçin ve hemen sormaya başlayın.',
      en: 'Choose a free AI model and start asking right away.'
    },
    'chat.suggestion.1': { tr: 'Python ile web scraper nasıl yazılır?', en: 'How to write a web scraper in Python?' },
    'chat.suggestion.2': { tr: "Türkiye'nin en güzel 10 yeri nedir?", en: 'What are the 10 most beautiful places in Turkey?' },
    'chat.suggestion.3': { tr: 'React vs Vue karşılaştırması yap', en: 'Compare React vs Vue' },
    'chat.suggestion.4': { tr: 'Yapay zeka nedir? Basitçe anlat.', en: 'What is AI? Explain simply.' },
    'chat.error.nokey': {
      tr: 'Lütfen Ayarlar\'dan OpenRouter API anahtarınızı girin.',
      en: 'Please enter your OpenRouter API key in Settings.'
    },
    'chat.error.generic': { tr: 'Bir hata oluştu. Lütfen tekrar deneyin.', en: 'An error occurred. Please try again.' },
    'chat.typing': { tr: 'Yanıt yazıyor...', en: 'Typing response...' },
    'chat.stop': { tr: 'Durdur', en: 'Stop' },

    // Modeller sayfası
    'models.title': { tr: 'AI Modelleri Keşfet', en: 'Discover AI Models' },
    'models.subtitle': {
      tr: 'Piyasadaki en güncel ücretsiz ve ücretli yapay zeka modellerini keşfedin.',
      en: 'Discover the most up-to-date free and paid AI models on the market.'
    },
    'models.search': { tr: 'Model ara... (isim, firma, kategori)', en: 'Search models... (name, provider, category)' },
    'models.filter.all': { tr: 'Tümü', en: 'All' },
    'models.filter.free': { tr: 'Ücretsiz', en: 'Free' },
    'models.filter.text': { tr: 'Metin', en: 'Text' },
    'models.filter.code': { tr: 'Kod', en: 'Code' },
    'models.filter.multimodal': { tr: 'Multimodal', en: 'Multimodal' },
    'models.filter.reasoning': { tr: 'Akıl Yürütme', en: 'Reasoning' },
    'models.filter.image': { tr: 'Görsel', en: 'Image' },
    'models.filter.audio': { tr: 'Ses', en: 'Audio' },
    'models.count': { tr: '{count} model bulundu', en: '{count} models found' },
    'models.sort.popular': { tr: 'Popülerlik', en: 'Popularity' },
    'models.sort.name': { tr: 'İsim (A-Z)', en: 'Name (A-Z)' },
    'models.sort.context': { tr: 'Bağlam Penceresi', en: 'Context Window' },
    'models.sort.turkish': { tr: 'Türkçe Skoru', en: 'Turkish Score' },
    'models.no.results': { tr: 'Sonuç bulunamadı.', en: 'No results found.' },

    // Model detay
    'detail.specs': { tr: 'Teknik Özellikler', en: 'Technical Specifications' },
    'detail.capabilities': { tr: 'Kabiliyetler', en: 'Capabilities' },
    'detail.usecases': { tr: 'Kullanım Alanları', en: 'Use Cases' },
    'detail.tools': { tr: 'Araç Seti & IDE\'ler', en: 'Tools & IDEs' },
    'detail.api': { tr: 'API Kullanımı', en: 'API Usage' },
    'detail.related': { tr: 'İlgili Modeller', en: 'Related Models' },
    'detail.try': { tr: 'Bu Modeli Dene', en: 'Try This Model' },
    'detail.context': { tr: 'Bağlam Penceresi', en: 'Context Window' },
    'detail.maxOutput': { tr: 'Maks. Çıktı', en: 'Max Output' },
    'detail.parameters': { tr: 'Parametre Sayısı', en: 'Parameters' },
    'detail.training': { tr: 'Eğitim Kesimi', en: 'Training Cutoff' },
    'detail.license': { tr: 'Lisans', en: 'License' },
    'detail.pricing': { tr: 'Fiyatlandırma', en: 'Pricing' },
    'detail.free': { tr: 'Ücretsiz', en: 'Free' },
    'detail.paid': { tr: 'Ücretli', en: 'Paid' },
    'detail.freemium': { tr: 'Freemium', en: 'Freemium' },
    'detail.input': { tr: 'Giriş / 1M Token', en: 'Input / 1M Tokens' },
    'detail.output': { tr: 'Çıkış / 1M Token', en: 'Output / 1M Tokens' },

    // Kabiliyetler
    'cap.chat': { tr: 'Sohbet', en: 'Chat' },
    'cap.codeGeneration': { tr: 'Kod Üretimi', en: 'Code Generation' },
    'cap.imageUnderstanding': { tr: 'Görsel Anlama', en: 'Image Understanding' },
    'cap.imageGeneration': { tr: 'Görsel Üretimi', en: 'Image Generation' },
    'cap.functionCalling': { tr: 'Fonksiyon Çağırma', en: 'Function Calling' },
    'cap.streaming': { tr: 'Streaming', en: 'Streaming' },
    'cap.jsonMode': { tr: 'JSON Modu', en: 'JSON Mode' },
    'cap.reasoning': { tr: 'Akıl Yürütme', en: 'Reasoning' },
    'cap.webSearch': { tr: 'Web Arama', en: 'Web Search' },
    'cap.fileUpload': { tr: 'Dosya Yükleme', en: 'File Upload' },

    // Ayarlar
    'settings.title': { tr: 'Ayarlar', en: 'Settings' },
    'settings.apikey': { tr: 'OpenRouter API Anahtarı', en: 'OpenRouter API Key' },
    'settings.apikey.placeholder': { tr: 'sk-or-v1-xxxx...', en: 'sk-or-v1-xxxx...' },
    'settings.apikey.help': {
      tr: 'openrouter.ai adresinden ücretsiz API anahtarı alabilirsiniz.',
      en: 'Get a free API key from openrouter.ai.'
    },
    'settings.save': { tr: 'Kaydet', en: 'Save' },
    'settings.saved': { tr: 'Kaydedildi!', en: 'Saved!' },
    'settings.theme': { tr: 'Tema', en: 'Theme' },
    'settings.language': { tr: 'Dil', en: 'Language' },

    // Footer
    'footer.description': {
      tr: 'Türkiye\'nin ücretsiz yapay zeka platformu. Ücretsiz AI modellerini keşfedin ve deneyin.',
      en: 'Turkey\'s free AI platform. Discover and try free AI models.'
    },
    'footer.links': { tr: 'Hızlı Bağlantılar', en: 'Quick Links' },
    'footer.resources': { tr: 'Kaynaklar', en: 'Resources' },
    'footer.legal': { tr: 'Yasal', en: 'Legal' },
    'footer.privacy': { tr: 'Gizlilik Politikası', en: 'Privacy Policy' },
    'footer.terms': { tr: 'Kullanım Şartları', en: 'Terms of Use' },
    'footer.copyright': { tr: '© 2026 ücretsiz.ai — Tüm hakları saklıdır.', en: '© 2026 ücretsiz.ai — All rights reserved.' },
    'footer.made': { tr: '❤️ ile Türkiye\'de yapıldı', en: 'Made with ❤️ in Turkey' },

    // Hakkımızda
    'about.title': { tr: 'Hakkımızda', en: 'About Us' },
    'about.mission.title': { tr: 'Misyonumuz', en: 'Our Mission' },
    'about.mission.text': {
      tr: 'Yapay zeka teknolojilerine erişimi demokratikleştirmek ve Türkiye\'deki geliştiricilere, öğrencilere ve meraklılara ücretsiz AI araçlarını keşfetme imkanı sunmak.',
      en: 'Democratize access to AI technologies and provide developers, students and enthusiasts in Turkey the opportunity to discover free AI tools.'
    },

    // 404
    '404.title': { tr: 'Sayfa Bulunamadı', en: 'Page Not Found' },
    '404.text': { tr: 'Aradığınız sayfa mevcut değil veya taşınmış olabilir.', en: 'The page you are looking for does not exist or may have been moved.' },
    '404.home': { tr: 'Ana Sayfaya Dön', en: 'Return Home' },

    // Genel
    'general.loading': { tr: 'Yükleniyor...', en: 'Loading...' },
    'general.error': { tr: 'Bir hata oluştu', en: 'An error occurred' },
    'general.close': { tr: 'Kapat', en: 'Close' },
    'general.copy': { tr: 'Kopyala', en: 'Copy' },
    'general.copied': { tr: 'Kopyalandı!', en: 'Copied!' },
    'general.learnmore': { tr: 'Daha Fazla', en: 'Learn More' },
  };

  let currentLang = DEFAULT_LANG;

  /** Mevcut dili al */
  function getLang() {
    return currentLang;
  }

  /** Dili değiştir */
  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  /** Dili toggle et (TR ↔ EN) */
  function toggleLang() {
    setLang(currentLang === 'tr' ? 'en' : 'tr');
  }

  /** Çeviri al */
  function t(key, replacements = {}) {
    const entry = translations[key];
    if (!entry) return key;
    let text = entry[currentLang] || entry[DEFAULT_LANG] || key;
    // {placeholder} değiştirme
    Object.keys(replacements).forEach(k => {
      text = text.replace(`{${k}}`, replacements[k]);
    });
    return text;
  }

  /** data-i18n attribute'larını kullanarak sayfa çevirilerini uygula */
  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      // Attribute bazlı çeviriler
      const target = el.getAttribute('data-i18n-target');
      if (target === 'placeholder') {
        el.placeholder = text;
      } else if (target === 'aria-label') {
        el.setAttribute('aria-label', text);
      } else if (target === 'title') {
        el.title = text;
      } else {
        el.textContent = text;
      }
    });

    // Dil değiştir butonunu güncelle
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
      langBtn.textContent = currentLang === 'tr' ? 'EN' : 'TR';
      langBtn.setAttribute('aria-label', currentLang === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç');
    }
  }

  /** Başlangıç */
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) {
      currentLang = saved;
    } else {
      // Tarayıcı dilini kontrol et
      const browserLang = navigator.language.substring(0, 2);
      currentLang = SUPPORTED.includes(browserLang) ? browserLang : DEFAULT_LANG;
    }
    document.documentElement.setAttribute('lang', currentLang);
    applyTranslations();
  }

  return { init, getLang, setLang, toggleLang, t, applyTranslations };
})();

document.addEventListener('DOMContentLoaded', I18n.init);
