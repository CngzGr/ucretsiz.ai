/**
 * ücretsiz.ai — Model Karşılaştırma (Compare) Modülü
 */

const Compare = (() => {
  let freeModels = [];
  let conversationHistory = []; // Ortak geçmiş
  
  let isGenerating = false;
  let abortControllerA = null;
  let abortControllerB = null;

  const els = {
    selectA: document.getElementById('compare-model-a'),
    selectB: document.getElementById('compare-model-b'),
    messagesA: document.getElementById('compare-messages-a'),
    messagesB: document.getElementById('compare-messages-b'),
    input: document.querySelector('.compare-input-area textarea'),
    sendBtn: document.getElementById('compare-send-btn'),
    stopBtn: document.getElementById('compare-stop-btn')
  };

  /** Başlangıç */
  async function init() {
    if (!els.input) return;
    
    await loadModels();
    setupEventListeners();
  }

  /** Modelleri yükle ve select'leri doldur */
    async function loadModels() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models');
      const data = await response.json();
      const allModels = data.data;

      // Tüm OpenRouter ücretsiz modellerini filtrele
      freeModels = allModels.filter(m => m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
      
      const optionsHTML = freeModels.map(m => `
<option value="${m.id}" data-free="true">${m.name} (${m.id.split('/')[0]}) (Ücretsiz)</option>`).join('');

      els.selectA.innerHTML = '<option value="" disabled>Model Seçin</option>' + optionsHTML;
      els.selectB.innerHTML = '<option value="" disabled>Model Seçin</option>' + optionsHTML;

      if (freeModels.length > 0) els.selectA.value = freeModels[0].id;
      if (freeModels.length > 1) els.selectB.value = freeModels[1].id;
      else if (freeModels.length > 0) els.selectB.value = freeModels[0].id;
      
      els.selectA.dispatchEvent(new Event('change'));
      els.selectB.dispatchEvent(new Event('change'));
      
      if(typeof checkFormState === 'function') checkFormState();
    } catch (error) {
      console.error('Modeller yüklenirken hata oluştu:', error);
    }
  }

  /** Olay Dinleyicileri */
  function setupEventListeners() {
    // Textarea otomatik boyutlandırma
    els.input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
      if (this.value.trim() !== '') {
        els.sendBtn.style.opacity = '1';
        els.sendBtn.style.pointerEvents = 'auto';
      } else {
        els.sendBtn.style.opacity = '0.5';
        els.sendBtn.style.pointerEvents = 'none';
      }
    });

    els.selectA.addEventListener('change', checkFormState);
    els.selectB.addEventListener('change', checkFormState);

    // Enter ile gönderme
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    els.sendBtn.addEventListener('click', sendMessage);
    els.stopBtn.addEventListener('click', stopGeneration);
  }

  function checkFormState() {
    const optA = els.selectA.options[els.selectA.selectedIndex];
    const optB = els.selectB.options[els.selectB.selectedIndex];
    
    const isPaidA = optA && optA.getAttribute('data-free') === 'false';
    const isPaidB = optB && optB.getAttribute('data-free') === 'false';
    
    if (isPaidA || isPaidB) {
      els.input.disabled = true;
      els.input.placeholder = "Seçilen modellerden biri ücretlidir, şimdilik kullanılamaz.";
      els.sendBtn.disabled = true;
      els.sendBtn.style.opacity = '0.5';
      els.sendBtn.style.pointerEvents = 'none';
    } else {
      els.input.disabled = false;
      els.input.placeholder = "Her iki modele de gönderilecek mesajınızı yazın...";
      if (els.input.value.trim() !== '') {
        els.sendBtn.disabled = false;
        els.sendBtn.style.opacity = '1';
        els.sendBtn.style.pointerEvents = 'auto';
      }
    }
  }

  /** Ortak mesajı gönder */

  const generativeTexts = ['Bağlanıyor...', 'Düşünüyor...', 'Anlamlandırıyor...', 'Dönüştürüyor...', 'Yazıyor...'];
  let statusInterval = null;

  function showTypingIndicator(show) {
    const statusInd = document.querySelector('.compare-input-area .ai-status-indicator');
    const statusText = document.querySelector('.compare-input-area .ai-status-text');
    
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

  async function sendMessage() {
    if (isGenerating) return;
    
    const text = els.input.value.trim();
    if (!text) return;

    const apiKey = localStorage.getItem('ucretsiz-ai-apikey');
    if (!apiKey) {
      App.showToast('Lütfen Ayarlar kısmından API anahtarınızı girin.', 'error');
      const settingsModal = document.getElementById('settings-modal');
      if (settingsModal) settingsModal.classList.add('active');
      return;
    }

    const modelA = els.selectA.value;
    const modelB = els.selectB.value;
    
    if (!modelA || !modelB) {
      App.showToast('Lütfen her iki sütun için de bir model seçin.', 'warning');
      return;
    }

    // Arayüzü temizle (Empty state'leri kaldır)
    const emptyStates = document.querySelectorAll('.chat-empty');
    emptyStates.forEach(el => el.remove());

    // Kullanıcı mesajını ekle
    appendMessage(els.messagesA, 'user', text);
    appendMessage(els.messagesB, 'user', text);

    els.input.value = '';
    els.input.style.height = 'auto';
    
    // Geçmişe ekle
    conversationHistory.push({ role: 'user', content: text });

    // UI'ı oluşturuluyor durumuna getir
    isGenerating = true;
    els.sendBtn.style.display = 'none';
    els.stopBtn.style.display = 'flex';
    showTypingIndicator(true);
    els.selectA.disabled = true;
    els.selectB.disabled = true;

    // AI cevap baloncuklarını oluştur
    const bubbleA = createAiBubble(els.messagesA);
    const bubbleB = createAiBubble(els.messagesB);
    
    const contentA = bubbleA.querySelector('.bubble-content');
    const contentB = bubbleB.querySelector('.bubble-content');

    // İstekleri paralel olarak başlat
    abortControllerA = new AbortController();
    abortControllerB = new AbortController();

    let textA = "";
    let textB = "";

          const reqA = streamRequest(modelA, apiKey, abortControllerA, (chunk) => {
        if (chunk.startsWith('__TOKEN_USAGE__:')) {
          const tokens = chunk.split(':')[1];
          let costEl = bubbleA.querySelector('.bubble-cost');
          if (!costEl) {
             const meta = document.createElement('div');
             meta.className = 'bubble-meta';
             meta.innerHTML = `<span class="bubble-cost">${tokens} Token (Ücretsiz)</span>`;
             bubbleA.querySelector('.bubble-body').appendChild(meta);
          } else {
             costEl.textContent = `${tokens} Token (Ücretsiz)`;
          }
          return;
        }
        textA += chunk;
        contentA.innerHTML = App.simpleMarkdown(textA);
        scrollToBottom(els.messagesA);
      });

          const reqB = streamRequest(modelB, apiKey, abortControllerB, (chunk) => {
        if (chunk.startsWith('__TOKEN_USAGE__:')) {
          const tokens = chunk.split(':')[1];
          let costEl = bubbleB.querySelector('.bubble-cost');
          if (!costEl) {
             const meta = document.createElement('div');
             meta.className = 'bubble-meta';
             meta.innerHTML = `<span class="bubble-cost">${tokens} Token (Ücretsiz)</span>`;
             bubbleB.querySelector('.bubble-body').appendChild(meta);
          } else {
             costEl.textContent = `${tokens} Token (Ücretsiz)`;
          }
          return;
        }
        textB += chunk;
        contentB.innerHTML = App.simpleMarkdown(textB);
        scrollToBottom(els.messagesB);
      });

    try {
      await Promise.allSettled([reqA, reqB]);
      
      // Her ikisi de bittiğinde geçmişe sadece birini veya karmaşık durumu ekleyebiliriz.
      // Basitlik için, bu MVP'de karşılaştırma ekranı history'yi bağlam olarak tutar ama
      // AI'ın kendi cevabını eklemeyiz, sadece user promptlarını tutarız veya
      // bağlamın kopmaması için A'nın cevabını baz alabiliriz. Şimdilik sadece user tutalım.
    } catch (err) {
      console.error('Karşılaştırma hatası:', err);
    } finally {
      isGenerating = false;
      showTypingIndicator(false);
      els.sendBtn.style.display = 'flex';
      els.stopBtn.style.display = 'none';
      els.selectA.disabled = false;
      els.selectB.disabled = false;
    }
  }

  /** Jenerasyonu durdur */
  function stopGeneration() {
    if (abortControllerA) abortControllerA.abort();
    if (abortControllerB) abortControllerB.abort();
    isGenerating = false;
    els.sendBtn.style.display = 'flex';
    els.stopBtn.style.display = 'none';
    els.selectA.disabled = false;
    els.selectB.disabled = false;
  }

  /** Basit baloncuk ekleyici */
  function appendMessage(container, role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-bubble-wrapper ${role}`;
    
    const isUser = role === 'user';
    const avatar = isUser 
      ? `<div class="chat-avatar">Sen</div>`
      : `<div class="chat-avatar ai-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 12"/><path d="M12 12 19 4.9"/><path d="M12 12 4.9 19"/></svg></div>`;
      
    wrapper.innerHTML = `
      ${avatar}
      <div class="chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}">
        <div class="chat-bubble-content">
          ${isUser ? App.escapeHtml(text) : (App.parseMarkdown ? App.parseMarkdown(text) : App.escapeHtml(text))}
        </div>
      </div>
    `;
    
    container.appendChild(wrapper);
    scrollToBottom(container);
  }

  /** AI baloncuğu oluştur ve referansını dön */
  function createAiBubble(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-bubble-wrapper ai';
    wrapper.innerHTML = `
      <div class="chat-avatar ai-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>
      <div class="chat-bubble chat-bubble-ai">
        <div class="chat-bubble-content">
          <div class="typing-dots" style="padding: 0.5rem 0;"><span></span><span></span><span></span></div>
        </div>
      </div>
    `;
    container.appendChild(wrapper);
    scrollToBottom(container);
    return wrapper;
  }

  /** Scroll'u aşağı kaydır */
  function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
  }

  /** OpenRouter Stream İsteği */
  async function streamRequest(modelId, apiKey, controller, onChunk) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ucretsiz.ai',
          'X-Title': 'ücretsiz.ai Compare'
        },
        body: JSON.stringify({
          model: modelId,
          messages: conversationHistory, // Tüm user mesajları dahil ediliyor
          stream: true,
          stream_options: { include_usage: true },
          max_tokens: 4096
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        if (response.status === 429) {
          onChunk("\n\n**Limit Aşıldı:** Ortak ücretsiz API anahtarının limiti dolmuş olabilir. Lütfen sağ üstteki Ayarlar (⚙️) menüsünden kendi OpenRouter anahtarınızı oluşturup girin.");
          return;
        }
        const error = await response.json();
        onChunk(`\n\n**Hata:** ${error.error?.message || 'Bilinmeyen bir hata oluştu.'}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              const content = data.choices[0]?.delta?.content || '';
              if (content) onChunk(content);
            } catch (e) {
              // Ignore parse errors on incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onChunk(`\n\n**Bağlantı Hatası:** ${err.message}`);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
