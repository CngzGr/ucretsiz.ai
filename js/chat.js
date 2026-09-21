/**
 * ücretsiz.ai — Chat Modülü
 * OpenRouter API üzerinden ücretsiz AI modelleriyle sohbet
 * Streaming destekli, sohbet geçmişi localStorage'da
 */

const Chat = (() => {
  const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const HISTORY_KEY = 'ucretsiz-ai-chat-history';
  const MAX_HISTORY = 50; // Maksimum sohbet geçmişi sayısı

  let conversations = []; // [{id, title, messages, modelId, createdAt}]
  let activeConversationId = null;
  let abortController = null;
  let isGenerating = false;

  // Varsayılan ücretsiz modeller (models.json'dan da yüklenir)
  const defaultFreeModels = [
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', provider: 'Google' },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta' },
    { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek V3', provider: 'DeepSeek' },
    { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', provider: 'DeepSeek' },
    { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B', provider: 'Qwen' },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B', provider: 'Mistral' },
    { id: 'microsoft/phi-4:free', name: 'Phi-4', provider: 'Microsoft' },
  ];

  let availableModels = [...defaultFreeModels];

  /** Geçmişi localStorage'dan yükle */
  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        conversations = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Sohbet geçmişi yüklenemedi:', e);
      conversations = [];
    }
  }

  /** Geçmişi localStorage'a kaydet */
  function saveHistory() {
    try {
      // Sadece son MAX_HISTORY sohbeti tut
      if (conversations.length > MAX_HISTORY) {
        conversations = conversations.slice(-MAX_HISTORY);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(conversations));
    } catch (e) {
      console.warn('Sohbet geçmişi kaydedilemedi:', e);
    }
  }

  /** Yeni sohbet oluştur */
  function createConversation(modelId) {
    const conv = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      title: I18n.t('chat.new'),
      messages: [],
      modelId: modelId || availableModels[0]?.id || 'openrouter/auto',
      createdAt: new Date().toISOString()
    };
    conversations.unshift(conv);
    activeConversationId = conv.id;
    saveHistory();
    renderHistoryList();
    renderMessages();
    return conv;
  }

  /** Aktif sohbeti getir */
  function getActiveConversation() {
    return conversations.find(c => c.id === activeConversationId);
  }

  /** Sohbete geç */
  function switchConversation(id) {
    activeConversationId = id;
    renderHistoryList();
    renderMessages();
    // Model seçiciyi güncelle
    const conv = getActiveConversation();
    const modelSelect = document.getElementById('chat-model-select');
    if (modelSelect && conv) {
      modelSelect.value = conv.modelId;
    }
  }

  /** Sohbeti sil */
  function deleteConversation(id) {
    conversations = conversations.filter(c => c.id !== id);
    if (activeConversationId === id) {
      activeConversationId = conversations[0]?.id || null;
    }
    saveHistory();
    renderHistoryList();
    renderMessages();
  }

  /** Mesaj gönder */
  async function sendMessage(content) {
    const apiKey = App.getApiKey();
    if (!apiKey) {
      App.showToast(I18n.t('chat.error.nokey'), 'error', 5000);
      // Ayarlar modalını aç
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) settingsModal.classList.add('active');
      return;
    }

    let conv = getActiveConversation();
    if (!conv) {
      conv = createConversation();
    }

    // Kullanıcı mesajını ekle
    const userMessage = { role: 'user', content, timestamp: Date.now() };
    conv.messages.push(userMessage);

    // İlk mesajsa başlığı güncelle
    if (conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    saveHistory();
    renderMessages();
    renderHistoryList();
    scrollToBottom();

    // Giriş alanını temizle
    const textarea = document.querySelector('.chat-input textarea');
    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }

    // AI yanıtı al
    await generateResponse(conv);
  }

  /** AI yanıtı al (streaming) */
  async function generateResponse(conv) {
    const apiKey = App.getApiKey();
    if (!apiKey) return;

    isGenerating = true;
    updateSendButton();

    // Boş AI mesajı oluştur
    const aiMessage = { role: 'assistant', content: '', timestamp: Date.now() };
    conv.messages.push(aiMessage);
    renderMessages();
    scrollToBottom();

    // Typing indicator göster
    showTypingIndicator(true);

    abortController = new AbortController();

    try {
      // Mesaj geçmişini hazırla (sistem mesajı + son 20 mesaj)
      const systemMessage = {
        role: 'system',
        content: I18n.getLang() === 'tr' 
          ? 'Sen yardımcı bir AI asistanısın. Türkçe yanıt ver. Markdown formatını kullan.'
          : 'You are a helpful AI assistant. Respond in English. Use markdown formatting.'
      };

      const chatMessages = conv.messages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ucretsiz.ai',
          'X-Title': 'ücretsiz.ai'
        },
        body: JSON.stringify({
          model: conv.modelId,
          messages: [systemMessage, ...chatMessages],
          stream: true,
          stream_options: { include_usage: true },
          max_tokens: 4096
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        if (response.status === 429) {
          onChunk("\n\n**Limit Aşıldı:** Ortak ücretsiz API anahtarının limiti dolmuş olabilir. Lütfen sağ üstteki Ayarlar (⚙️) menüsünden kendi OpenRouter anahtarınızı oluşturup girin.");
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      // Streaming yanıtı oku
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            
            const data = JSON.parse(trimmed.slice(6));
            
            if (data.usage) {
              const tokens = data.usage.total_tokens || 0;
              updateAiTokenCost(tokens);
            }
            
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              aiMessage.content += delta;
              updateLastAiMessage(aiMessage.content);
              scrollToBottom();
            }
          } catch (e) {
            // JSON parse hatası, devam et
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Kullanıcı durdurdu
        if (!aiMessage.content) {
          aiMessage.content = '*(Yanıt durduruldu)*';
        }
      } else {
        console.error('Chat hatası:', error);
        aiMessage.content = `⚠️ ${I18n.t('chat.error.generic')}: ${error.message}`;
        App.showToast(error.message, 'error');
      }
    } finally {
      isGenerating = false;
      abortController = null;
      showTypingIndicator(false);
      updateSendButton();
      saveHistory();
    }
  }

  /** Yanıt üretmeyi durdur */
  function stopGeneration() {
    if (abortController) {
      abortController.abort();
    }
  }

  /** Son AI mesajını güncelle (streaming sırasında) */

  function updateAiTokenCost(tokens) {
    const messages = document.querySelectorAll('.chat-bubble-ai');
    const lastAi = messages[messages.length - 1];
    if (lastAi) {
      const meta = lastAi.querySelector('.bubble-meta');
      if (meta) {
        let costEl = meta.querySelector('.bubble-cost');
        if (!costEl) {
          costEl = document.createElement('span');
          costEl.className = 'bubble-cost';
          meta.appendChild(costEl);
        }
        costEl.textContent = `${tokens} Token (Ücretsiz)`;
      }
    }
  }

  function updateLastAiMessage(content) {
    const messages = document.querySelectorAll('.chat-bubble-ai');
    const lastAi = messages[messages.length - 1];
    if (lastAi) {
      const contentEl = lastAi.querySelector('.bubble-content');
      if (contentEl) {
        contentEl.innerHTML = App.simpleMarkdown(content);
      }
    }
  }

  /** Mesajları render et */
  function renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const conv = getActiveConversation();
    
    if (!conv || conv.messages.length === 0) {
      // Boş durum — öneriler göster
      container.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 data-i18n="chat.empty.title">${I18n.t('chat.empty.title')}</h3>
          <p data-i18n="chat.empty.subtitle">${I18n.t('chat.empty.subtitle')}</p>
          <div class="chat-suggestions">
            <button class="chat-suggestion" onclick="Chat.sendMessage('${I18n.t('chat.suggestion.1')}')">${I18n.t('chat.suggestion.1')}</button>
            <button class="chat-suggestion" onclick="Chat.sendMessage('${I18n.t('chat.suggestion.2')}')">${I18n.t('chat.suggestion.2')}</button>
            <button class="chat-suggestion" onclick="Chat.sendMessage('${I18n.t('chat.suggestion.3')}')">${I18n.t('chat.suggestion.3')}</button>
            <button class="chat-suggestion" onclick="Chat.sendMessage('${I18n.t('chat.suggestion.4')}')">${I18n.t('chat.suggestion.4')}</button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = conv.messages.map(msg => {
      const isUser = msg.role === 'user';
      const avatarIcon = isUser 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1.17A7 7 0 0113 22h-2a7 7 0 01-6.83-6H3a1 1 0 110-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/></svg>';
      
      const content = isUser 
        ? App.escapeHtml(msg.content) 
        : App.simpleMarkdown(msg.content || I18n.t('chat.typing'));

      return `
        <div class="chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}">
          <div class="bubble-avatar">${avatarIcon}</div>
          <div class="bubble-body">
            <div class="bubble-content">${content}</div>
            <div class="bubble-meta">
              <span class="bubble-time">${new Date(msg.timestamp).toLocaleTimeString(I18n.getLang() === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              ${!isUser ? `<button class="bubble-copy" onclick="Chat.copyMessage(this)" title="${I18n.t('general.copy')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /** Sohbet geçmişi listesini render et */
  function renderHistoryList() {
    const list = document.getElementById('chat-history-list');
    if (!list) return;

    if (conversations.length === 0) {
      list.innerHTML = '<p class="chat-history-empty text-secondary" style="padding: 1rem; text-align: center; font-size: 0.875rem;">Henüz sohbet yok</p>';
      return;
    }

    list.innerHTML = conversations.map(conv => `
      <div class="chat-history-item ${conv.id === activeConversationId ? 'active' : ''}" 
           onclick="Chat.switchConversation('${conv.id}')">
        <div class="history-item-content">
          <span class="history-item-title">${App.escapeHtml(conv.title)}</span>
          <span class="history-item-meta">${new Date(conv.createdAt).toLocaleDateString(I18n.getLang() === 'tr' ? 'tr-TR' : 'en-US')}</span>
        </div>
        <button class="history-item-delete" onclick="event.stopPropagation(); Chat.deleteConversation('${conv.id}')" title="Sil">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6l-1.5 14.5a2 2 0 01-2 1.5H8.5a2 2 0 01-2-1.5L5 6M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    `).join('');
  }

  /** Typing indicator */
  const generativeTexts = ['Bağlanıyor...', 'Düşünüyor...', 'Anlamlandırıyor...', 'Dönüştürüyor...', 'Yazıyor...'];
  let statusInterval = null;

  function showTypingIndicator(show) {
    const statusInd = document.querySelector('.ai-status-indicator');
    const statusText = document.querySelector('.ai-status-text');
    
    if (show) {
      if (statusInd) statusInd.style.display = 'flex';
      let step = 0;
      if (statusText) statusText.textContent = generativeTexts[step];
      statusInterval = setInterval(() => {
        step = (step + 1) % generativeTexts.length;
        if (statusText) statusText.textContent = generativeTexts[step];
      }, 1500);
    } else {
      if (statusInd) statusInd.style.display = 'none';
      if (statusInterval) clearInterval(statusInterval);
    }
  }

  /** En alta kaydır */
  function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }

  /** Gönder butonunu güncelle */
  function updateSendButton() {
    const sendBtn = document.getElementById('chat-send-btn');
    const stopBtn = document.getElementById('chat-stop-btn');
    if (sendBtn) sendBtn.style.display = isGenerating ? 'none' : 'flex';
    if (stopBtn) stopBtn.style.display = isGenerating ? 'flex' : 'none';
  }

  /** Mesajı panoya kopyala */
  function copyMessage(btn) {
    const content = btn.closest('.bubble-body')?.querySelector('.bubble-content');
    if (content) {
      navigator.clipboard.writeText(content.textContent).then(() => {
        App.showToast(I18n.t('general.copied'), 'success', 2000);
      });
    }
  }

  /** Model seçiciyi doldur */
  function populateModelSelect() {
    const select = document.getElementById('chat-model-select');
    if (!select) return;

    fetch('https://openrouter.ai/api/v1/models')
      .then(r => r.json())
      .then(data => {
        const models = data.data;
        const validModels = models.filter(m => m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
        if (validModels.length > 0) {
          availableModels = validModels.map(m => ({
            id: m.id,
            name: m.name,
            provider: m.id.split('/')[0],
            isFree: true
          }));
        }
                renderModelOptions(select);
        if (availableModels.length > 0 && !select.value) {
            select.value = availableModels[0].id;
        }
        
      })
      .catch((e) => {
        console.error('Modeller yüklenemedi:', e);
        renderModelOptions(select);
      });
  }

  function renderModelOptions(select) {
    select.innerHTML = availableModels.map(m => 
      `<option value="${m.id}">${m.provider} — ${m.name}</option>`
    ).join('');

    // Aktif sohbetin modelini seç
    const conv = getActiveConversation();
    if (conv) {
      select.value = conv.modelId;
    }

    // Model değiştiğinde
    select.addEventListener('change', () => {
      const conv = getActiveConversation();
      if (conv) {
        conv.modelId = select.value;
        saveHistory();
      }
    });
  }

  /** Textarea otomatik boyutlandırma */
  function initTextarea() {
    const textarea = document.querySelector('.chat-input textarea');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = textarea.value.trim();
        if (content && !isGenerating) {
          sendMessage(content);
        }
      }
    });
  }

  /** Gönder butonuna tıklama */
  function initSendButton() {
    const sendBtn = document.getElementById('chat-send-btn');
    const stopBtn = document.getElementById('chat-stop-btn');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const textarea = document.querySelector('.chat-input textarea');
        const content = textarea?.value.trim();
        if (content && !isGenerating) {
          sendMessage(content);
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', stopGeneration);
    }
  }

  /** Yeni sohbet butonu */
  function initNewChatButton() {
    const btn = document.getElementById('chat-new-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const select = document.getElementById('chat-model-select');
        createConversation(select?.value);
      });
    }
  }

  /** Sidebar toggle (mobil) */
  
  
  function initSidebarToggle() {
    const toggle = document.getElementById('history-toggle-btn');
    const closeBtn = document.getElementById('chat-sidebar-close');
    const sidebar = document.querySelector('.chat-sidebar');
    const overlay = document.getElementById('chat-overlay');
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        if (overlay) overlay.classList.toggle('show');
      });
    }
    const closeSidebar = () => {
        sidebar.classList.remove('show');
        if(overlay) overlay.classList.remove('show');
    };
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay && sidebar) overlay.addEventListener('click', closeSidebar);
  }
/** Başlangıç */
  function init() {
    loadHistory();
    populateModelSelect();
    initTextarea();
    initSendButton();
    initNewChatButton();
    initSidebarToggle();

    // Son sohbeti aç veya yeni oluştur
    if (conversations.length > 0) {
      activeConversationId = conversations[0].id;
    }

    renderHistoryList();
    renderMessages();
  }

  // Sayfa yüklendiğinde başlat (sadece chat sayfasında)
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('chat-container')) {
      init();
    }
  });

  // Public API
  return { 
    sendMessage, 
    switchConversation, 
    deleteConversation, 
    createConversation, 
    copyMessage, 
    stopGeneration 
  };
})();
