/**
 * AI Trainer Chat - Entrenador personal con IA usando Perplexity Sonar
 * Versión: 2.5 - Integración Perplexity Sonar + Solución CORS Proxy
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================

  const CONFIG = {
    // API KEY integrada directamente
    PERPLEXITY_API_KEY: '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',
    PERPLEXITY_API_URL: 'https://api.perplexity.ai/chat/completions',
    PERPLEXITY_MODEL_ID: 'sonar',
    
    // Proxy para evitar el error de CORS en el navegador
    CORS_PROXY: 'https://api.allorigins.win/raw?url=',

    MAX_HISTORY: 10,
    MAX_WORKOUTS: 5,
    RESPONSE_MAX_WORDS: 150,

    LANGUAGE_NAMES: {
      es: 'español',
      en: 'English',
      de: 'Deutsch',
      fr: 'français',
      it: 'italiano',
      pt: 'português',
      zh: '中文'
    }
  };

  // ============================================================================
  // CLASE PRINCIPAL
  // ============================================================================

  class AITrainerChat {
    constructor() {
      this.chatHistory = [];
      this.isOpen = false;
      this.isLoading = false;
      this.userPreferredLanguage = null;
      this.cachedPerplexityKey = null;

      this.init();
    }

    init() {
      this.createUI();
      this.bindEvents();
      this.loadChatHistory();
      console.log('✅ AI Trainer Chat inicializado con Perplexity Sonar (CORS Fix)');
    }

    createUI() {
      if (document.getElementById('aiChatFloatingBtn')) return;

      const floatingBtn = document.createElement('button');
      floatingBtn.id = 'aiChatFloatingBtn';
      floatingBtn.className = 'ai-chat-floating-btn';
      floatingBtn.innerHTML = '💬';
      document.body.appendChild(floatingBtn);

      const modalHTML = `
        <div id="aiChatModal" class="ai-chat-modal">
          <div class="ai-chat-container">
            <div class="ai-chat-header">
              <div class="ai-chat-header-info">
                <span class="ai-chat-avatar">🤖</span>
                <div>
                  <div class="ai-chat-title">Coach Timer Pro</div>
                  <div class="ai-chat-subtitle">Tu entrenador personal IA</div>
                </div>
              </div>
              <button id="aiChatCloseBtn" class="ai-chat-close-btn">✕</button>
            </div>
            <div id="aiChatMessages" class="ai-chat-messages"></div>
            <div class="ai-chat-input-container">
              <input type="text" id="aiChatInput" class="ai-chat-input" placeholder="Escribe tu pregunta..." autocomplete="off" />
              <button id="aiChatSendBtn" class="ai-chat-send-btn"><span>📤</span></button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
      document.getElementById('aiChatFloatingBtn')?.addEventListener('click', () => this.openChat());
      document.getElementById('aiChatCloseBtn')?.addEventListener('click', () => this.closeChat());
      document.getElementById('aiChatSendBtn')?.addEventListener('click', () => this.sendMessage());
      document.getElementById('aiChatInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    openChat() {
      const modal = document.getElementById('aiChatModal');
      if (modal) {
        modal.classList.add('active');
        this.isOpen = true;
        if (this.chatHistory.length === 0) this.sendWelcomeMessage();
        setTimeout(() => document.getElementById('aiChatInput')?.focus(), 100);
      }
    }

    closeChat() {
      document.getElementById('aiChatModal')?.classList.remove('active');
      this.isOpen = false;
    }

    async sendWelcomeMessage() {
      const profile = this.getUserProfile();
      const userName = profile.name || 'atleta';
      const lang = this.getAppLanguage();
      
      const msgs = {
        es: `¡Hola ${userName}! 👋 Soy tu Coach Timer Pro. ¿En qué puedo ayudarte?`,
        en: `Hello ${userName}! 👋 I'm your Coach Timer Pro. How can I help?`
      };
      this.addMessage(msgs[lang] || msgs.en, 'assistant');
    }

    async sendMessage() {
      const input = document.getElementById('aiChatInput');
      if (!input || this.isLoading) return;

      const userMessage = input.value.trim();
      if (!userMessage) return;

      input.value = '';
      this.addMessage(userMessage, 'user');
      this.showTypingIndicator();
      this.isLoading = true;

      try {
        const response = await this.callSonar(userMessage);
        this.hideTypingIndicator();
        this.addMessage(response, 'assistant');
        this.saveChatHistory();
      } catch (error) {
        console.error('❌ Error:', error);
        this.hideTypingIndicator();
        this.addMessage(`❌ Error: ${error.message}. Intenta de nuevo.`, 'assistant');
      } finally {
        this.isLoading = false;
      }
    }

    addMessage(text, role) {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;

      const div = document.createElement('div');
      div.className = `ai-chat-message ai-chat-message-${role}`;
      div.innerHTML = `<div class="ai-chat-bubble">${text}</div>`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;

      this.chatHistory.push({ role, text, timestamp: Date.now() });
      if (this.chatHistory.length > CONFIG.MAX_HISTORY * 2) {
        this.chatHistory = this.chatHistory.slice(-CONFIG.MAX_HISTORY * 2);
      }
    }

    showTypingIndicator() {
      const container = document.getElementById('aiChatMessages');
      const typing = document.createElement('div');
      typing.id = 'aiTypingIndicator';
      typing.className = 'ai-chat-message ai-chat-message-assistant';
      typing.innerHTML = `<div class="ai-chat-bubble ai-chat-typing"><span></span><span></span><span></span></div>`;
      container.appendChild(typing);
      container.scrollTop = container.scrollHeight;
    }

    hideTypingIndicator() {
      document.getElementById('aiTypingIndicator')?.remove();
    }

    // ------------------------------------------------------------------------
    // LLAMADA A PERPLEXITY CON FIX DE CORS
    // ------------------------------------------------------------------------

    getApiKey() {
      const stored = localStorage.getItem('perplexity_api_key');
      return (stored && stored.startsWith('pplx-')) ? stored.trim() : CONFIG.PERPLEXITY_API_KEY;
    }

    async callSonar(userMessage) {
      const apiKey = this.getApiKey();
      const appLang = this.getAppLanguage();
      const profile = this.getUserProfile();
      const workouts = this.getRecentWorkouts();
      const systemPrompt = this.buildSystemPrompt(appLang, profile, workouts);

      // Configuración de mensajes para la API
      const messages = [
        { role: 'system', content: systemPrompt },
        ...this.chatHistory.map(m => ({ 
          role: m.role === 'assistant' ? 'assistant' : 'user', 
          content: m.text 
        })),
        { role: 'user', content: userMessage }
      ];

      const body = {
        model: CONFIG.PERPLEXITY_MODEL_ID,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      };

      // ✅ USANDO PROXY ALLORIGINS PARA EVITAR CORS
      const fullUrl = CONFIG.CORS_PROXY + encodeURIComponent(CONFIG.PERPLEXITY_API_URL);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Error API Perplexity: ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) throw new Error('No se recibió respuesta de la IA');
      return content.trim();
    }

    // ------------------------------------------------------------------------
    // MÉTODOS DE APOYO (PERFIL, ENTRENAMIENTOS, ETC)
    // ------------------------------------------------------------------------

    buildSystemPrompt(appLang, profile, workouts) {
      const langName = CONFIG.LANGUAGE_NAMES[appLang] || 'español';
      let info = `Eres Coach Timer Pro, experto en CrossFit. Responde en ${langName}.\n`;
      info += `Usuario: ${profile.name || 'Atleta'}, Objetivo: ${profile.goal || 'Fitness'}.\n`;
      if (workouts.length > 0) info += `Últimos entrenos: ${workouts.map(w => w.type).join(', ')}.`;
      return info;
    }

    getAppLanguage() {
      return (navigator.language || 'es').split('-')[0];
    }

    getUserProfile() {
      try {
        const id = window.ProfilesManager?.getActiveProfileId() || 'default';
        return window.StorageUtil?.getProfileData(id) || {};
      } catch (e) { return {}; }
    }

    getRecentWorkouts() {
      try {
        const history = window.StorageUtil?.getHistory('emom') || [];
        return history.slice(0, CONFIG.MAX_WORKOUTS);
      } catch (e) { return []; }
    }

    loadChatHistory() {
      try {
        const saved = localStorage.getItem('aiTrainerChatHistory');
        if (saved) {
          this.chatHistory = JSON.parse(saved);
          this.chatHistory.forEach(m => this.addMessageToDOM(m.text, m.role));
        }
      } catch (e) {}
    }

    addMessageToDOM(text, role) {
      const container = document.getElementById('aiChatMessages');
      if (!container) return;
      const div = document.createElement('div');
      div.className = `ai-chat-message ai-chat-message-${role}`;
      div.innerHTML = `<div class="ai-chat-bubble">${text}</div>`;
      container.appendChild(div);
    }

    saveChatHistory() {
      localStorage.setItem('aiTrainerChatHistory', JSON.stringify(this.chatHistory));
    }
  }

  // Inicialización
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.aiTrainerChat = new AITrainerChat());
  } else {
    window.aiTrainerChat = new AITrainerChat();
  }
})();
