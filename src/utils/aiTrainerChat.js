/**
 * AI Trainer Chat - Entrenador personal con IA usando Perplexity Sonar
 * Versión: 2.4 - Chat por perfil + Limpiar + Lectura completa + Fecha/Hora
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================

  const CONFIG = {
    PERPLEXITY_API_KEY: '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',
    PERPLEXITY_API_URL: 'https://api.perplexity.ai/chat/completions',
    PERPLEXITY_PROXY_URL: '', // Opcional: proxy con CORS habilitado (por ejemplo, tu propio backend)
    PERPLEXITY_MODEL_ID: 'sonar',
    
    MAX_HISTORY: 10,
    MAX_WORKOUTS: 5,
    RESPONSE_MAX_WORDS: 150,

    // Mapeo de códigos de idioma a nombres completos
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

    // ------------------------------------------------------------------------
    // INICIALIZACIÓN
    // ------------------------------------------------------------------------

    init() {
      this.createUI();
      this.bindEvents();
      this.loadChatHistory();
      console.log('✅ AI Trainer Chat inicializado con Perplexity Sonar');
    }

    // ------------------------------------------------------------------------
    // CREACIÓN DE UI
    // ------------------------------------------------------------------------

    createUI() {
      if (document.getElementById('aiChatFloatingBtn')) {
        return;
      }

      const floatingBtn = document.createElement('button');
      floatingBtn.id = 'aiChatFloatingBtn';
      floatingBtn.className = 'ai-chat-floating-btn';
      floatingBtn.innerHTML = '💬';
      floatingBtn.setAttribute('aria-label', 'Abrir chat con entrenador IA');
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
              <input
                type="text"
                id="aiChatInput"
                class="ai-chat-input"
                placeholder="Escribe tu pregunta..."
                autocomplete="off"
              />
              <button id="aiChatSendBtn" class="ai-chat-send-btn">
                <span>📤</span>
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // ------------------------------------------------------------------------
    // EVENT LISTENERS
    // ------------------------------------------------------------------------

    bindEvents() {
      const floatingBtn = document.getElementById('aiChatFloatingBtn');
      const closeBtn = document.getElementById('aiChatCloseBtn');
      const sendBtn = document.getElementById('aiChatSendBtn');
      const input = document.getElementById('aiChatInput');
      const modal = document.getElementById('aiChatModal');

      if (floatingBtn) {
        floatingBtn.addEventListener('click', () => this.openChat());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeChat());
      }

      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendMessage());
      }

      if (input) {
        input.addEventListener('keypress', event => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
          }
        });
      }

      if (modal) {
        modal.addEventListener('click', event => {
          if (event.target === modal) {
            this.closeChat();
          }
        });
      }
    }

    // ------------------------------------------------------------------------
    // GESTIÓN DE CHAT
    // ------------------------------------------------------------------------

    openChat() {
      const modal = document.getElementById('aiChatModal');
      if (modal) {
        modal.classList.add('active');
        this.isOpen = true;

        if (this.chatHistory.length === 0) {
          this.sendWelcomeMessage();
        }

        const input = document.getElementById('aiChatInput');
        if (input) {
          setTimeout(() => input.focus(), 100);
        }
      }
    }

    closeChat() {
      const modal = document.getElementById('aiChatModal');
      if (modal) {
        modal.classList.remove('active');
        this.isOpen = false;
      }
    }

    // ------------------------------------------------------------------------
    // MENSAJES
    // ------------------------------------------------------------------------

    async sendWelcomeMessage() {
      const appLang = this.getAppLanguage();
      const profile = this.getUserProfile();
      const userName = profile.name || 'atleta';

      const welcomeMessages = {
        es: `¡Hola ${userName}! 👋 Soy tu Coach Timer Pro. ¿En qué puedo ayudarte hoy?`,
        en: `Hello ${userName}! 👋 I'm your Coach Timer Pro. How can I help you today?`,
        de: `Hallo ${userName}! 👋 Ich bin dein Coach Timer Pro. Wie kann ich dir helfen?`,
        fr: `Bonjour ${userName}! 👋 Je suis votre Coach Timer Pro. Comment puis-je vous aider?`,
        it: `Ciao ${userName}! 👋 Sono il tuo Coach Timer Pro. Come posso aiutarti?`,
        pt: `Olá ${userName}! 👋 Sou seu Coach Timer Pro. Como posso ajudar?`,
        zh: `你好 ${userName}! 👋 我是你的 Coach Timer Pro。我能帮你什么?`
      };

      const welcomeMsg = welcomeMessages[appLang] || welcomeMessages.en;
      this.addMessage(welcomeMsg, 'assistant');
    }

    async sendMessage() {
      const input = document.getElementById('aiChatInput');
      if (!input || this.isLoading) {
        return;
      }

      const userMessage = input.value.trim();
      if (!userMessage) {
        return;
      }

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

        const appLang = this.getAppLanguage();
        const friendlyDetail = this.buildFriendlyError(error);
        const errorMessages = {
          'es': '❌ Error al conectar. Verifica tu API key y CORS.',
          'en': '❌ Connection error. Check your API key and CORS.',
          'de': '❌ Verbindungsfehler. API-Schlüssel und CORS prüfen.',
          'fr': '❌ Erreur de connexion. Vérifiez votre clé API et CORS.',
          'it': '❌ Errore di connessione. Verifica la chiave API e il CORS.',
          'pt': '❌ Erro de conexão. Verifique sua chave API e CORS.',
          'zh': '❌ 连接错误。检查您的 API 密钥和 CORS。'
        };

        const errorMsg = errorMessages[appLang] || errorMessages['en'];
        this.addMessage(`${errorMsg}\n\n${friendlyDetail}`, 'assistant');
      } finally {
        this.isLoading = false;
      }
    }

    addMessage(text, role) {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer) {
        return;
      }

      this.addMessageToDOM(text, role);

      this.chatHistory.push({ role, text, timestamp: Date.now() });
      if (this.chatHistory.length > CONFIG.MAX_HISTORY * 2) {
        this.chatHistory = this.chatHistory.slice(-CONFIG.MAX_HISTORY * 2);
      }
    }

    addMessageToDOM(text, role) {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer) {
        return;
      }

      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-chat-message ai-chat-message-${role}`;

      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      bubble.textContent = text;

      messageDiv.appendChild(bubble);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer || document.getElementById('aiTypingIndicator')) {
        return;
      }

      const typingDiv = document.createElement('div');
      typingDiv.id = 'aiTypingIndicator';
      typingDiv.className = 'ai-chat-message ai-chat-message-assistant';
      typingDiv.innerHTML = `
        <div class="ai-chat-bubble ai-chat-typing">
          <span></span><span></span><span></span>
        </div>
      `;

      messagesContainer.appendChild(typingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
      const typingDiv = document.getElementById('aiTypingIndicator');
      if (typingDiv) {
        typingDiv.remove();
      }
    }

    // ------------------------------------------------------------------------
    // LLAMADA A PERPLEXITY SONAR
    // ------------------------------------------------------------------------
    
    getApiKey() {
      const storedKey = localStorage.getItem('perplexity_api_key');
      if (storedKey && typeof storedKey === 'string' && storedKey.startsWith('pplx-')) {
        return storedKey.trim();
      }
      return CONFIG.PERPLEXITY_API_KEY;
    }

    getApiEndpoint() {
      const storedUrl = localStorage.getItem('perplexity_api_url');
      if (storedUrl && typeof storedUrl === 'string' && storedUrl.startsWith('http')) {
        return storedUrl.trim();
      }
      if (CONFIG.PERPLEXITY_PROXY_URL && CONFIG.PERPLEXITY_PROXY_URL.startsWith('http')) {
        return CONFIG.PERPLEXITY_PROXY_URL;
      }
      return CONFIG.PERPLEXITY_API_URL;
    }

    async callSonar(userMessage) {
      const appLang = this.getAppLanguage();
      const profile = this.getUserProfile();
      const recentWorkouts = this.getRecentWorkouts();
      const systemPrompt = this.buildSystemPrompt(appLang, profile, recentWorkouts);
      
      const apiKey = this.getApiKey();
      const endpoint = this.getApiEndpoint();
      
      if (!apiKey || apiKey.length < 20 || !apiKey.startsWith('pplx-')) {
        throw new Error('API Key no configurada');
      }

      const conversationHistory = this.chatHistory
        .filter(msg => msg.role !== 'system')
        .slice(-CONFIG.MAX_HISTORY * 2)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.text
        }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const requestBody = {
        model: CONFIG.PERPLEXITY_MODEL_ID,
        messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        mode: 'cors',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });

      const responseText = await response.text();
      let data = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        throw new Error(`Respuesta inválida: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        const apiError = data?.error?.message || `HTTP ${response.status}`;
        throw new Error(apiError);
      }

      const aiResponse = data?.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('Perplexity no devolvió texto');
      }

      return aiResponse.trim();
    }

    buildFriendlyError(error) {
      const isNetworkError = error instanceof TypeError && /fetch|NetworkError|Failed to fetch/i.test(error.message);
      const isFileProtocol = window.location.protocol === 'file:';

      if (isNetworkError) {
        let hint = 'Error de red o CORS. ';
        if (isFileProtocol) {
          hint += 'Abre la app con un servidor local (ej. "python -m http.server 8080") en vez de doble click.';
        } else {
          hint += 'Asegúrate de usar un dominio/origen con HTTPS y que el endpoint permita CORS. ';
          hint += 'Puedes configurar un proxy con CORS en localStorage: localStorage.setItem("perplexity_api_url", "https://tu-proxy/")';
        }
        return `${hint}\nDetalle: ${error.message}`;
      }

      return error.message || 'Error desconocido';
    }

    // ------------------------------------------------------------------------
    // CONSTRUCCIÓN DEL PROMPT
    // ------------------------------------------------------------------------

    buildSystemPrompt(appLang, profile, workouts) {
      const langName = CONFIG.LANGUAGE_NAMES[appLang] || 'English';

      let profileInfo = 'PERFIL DEL USUARIO:\n';
      if (profile.name) profileInfo += `- Nombre: ${profile.name}\n`;
      if (profile.age) profileInfo += `- Edad: ${profile.age} años\n`;
      if (profile.biologicalSex) profileInfo += `- Sexo: ${profile.biologicalSex}\n`;
      if (profile.fitnessLevel) profileInfo += `- Nivel fitness: ${profile.fitnessLevel}\n`;
      if (profile.goal) profileInfo += `- Objetivo: ${profile.goal}\n`;
      if (profile.trainingDays) profileInfo += `- Días entrenamiento/semana: ${profile.trainingDays}\n`;
      if (profile.experience) profileInfo += `- Experiencia: ${profile.experience}\n`;
      if (profile.limitations) profileInfo += `- Limitaciones: ${profile.limitations}\n`;

      let workoutsInfo = '\nÚLTIMOS ENTRENAMIENTOS:\n';
      if (!workouts.length) {
        workoutsInfo += '- Aún no hay entrenamientos registrados\n';
      } else {
        workouts.forEach((workout, index) => {
          const date = workout.timestamp ? new Date(workout.timestamp).toLocaleDateString() : 'N/A';
          workoutsInfo += `${index + 1}. ${date}: ${workout.type.toUpperCase()} | `;
          workoutsInfo += `${workout.config || 'N/A'} | `;
          workoutsInfo += `${workout.completed ? 'Completado' : 'No completado'} | `;
          if (workout.rpe) workoutsInfo += `RPE ${workout.rpe}/10 | `;
          if (workout.notes) workoutsInfo += `"${workout.notes}"`;
          workoutsInfo += '\n';
        });
      }

      return `
IDENTIDAD:
Eres "Coach Timer Pro", un entrenador personal experto en CrossFit, fitness funcional y HIIT.
Tu personalidad es motivadora, profesional, empática y específica.
Conoces el contexto completo del usuario (perfil, objetivos, limitaciones, historial de entrenamientos).

IDIOMA:
- Idioma de la interfaz de la app: ${langName}
- REGLA CRÍTICA: Responde SIEMPRE en el mismo idioma en que te escriban, sin importar el idioma de la app
- Si detectas que el usuario escribe en un idioma diferente al de la app, pregúntale UNA SOLA VEZ su preferencia
- Después de elegir, mantén ese idioma consistentemente
- Si el usuario cambia de idioma espontáneamente, adáptate sin preguntar

CONTEXTO DEL USUARIO:
${profileInfo}
${workoutsInfo}

REGLAS DE RESPUESTA:
1. Máximo ${CONFIG.RESPONSE_MAX_WORDS} palabras por respuesta
2. Sé específico y accionable (da 2-3 consejos concretos)
3. Si es relevante, menciona sus entrenamientos recientes
4. Usa máximo 2 emojis por mensaje (sin abusar)
5. Termina con motivación cuando sea apropiado
6. No inventes datos que no tienes
7. Si preguntan algo fuera de fitness, redirige amablemente al tema

FORMATO:
- Párrafos cortos y claros
- Bullet points para listas de consejos
- Lenguaje natural y cercano

EJEMPLOS DE TONO:
✅ Correcto: "Perfecto objetivo. Veo que en tu último EMOM notaste fatiga en ciclos finales. Te sugiero: 1) Pacing controlado..."
❌ Incorrecto: "Como tu entrenador te digo que hagas burpees todos los días sin descanso..."

RECUERDA: Eres un coach real, no un chatbot genérico. Usa el contexto del usuario para personalizar cada respuesta.
      `.trim();
    }

    // ------------------------------------------------------------------------
    // OBTENCIÓN DE DATOS
    // ------------------------------------------------------------------------

    detectUserLanguage(userMessage) {
      if (this.userPreferredLanguage) {
        return this.userPreferredLanguage;
      }

      const messageLang = this.detectLanguageFromMessage(userMessage);
      const appLang = this.getAppLanguage();

      if (messageLang && messageLang !== appLang) {
        this.userPreferredLanguage = messageLang;
        return messageLang;
      }

      return appLang;
    }

    detectLanguageFromMessage(text) {
      if (!text) {
        return null;
      }

      const lang = this.getAppLanguage();
      const hasAscii = /[a-z]/i.test(text);
      const hasAccents = /[áéíóúñü]/i.test(text);
      const hasGerman = /[äöüß]/i.test(text);
      const hasFrench = /[çàèéêîôûëïü]/i.test(text);
      const hasItalian = /[àèéìòù]/i.test(text);
      const hasPortuguese = /[ãõáâéêíóôúç]/i.test(text);
      const hasChinese = /[\u4e00-\u9fff]/.test(text);

      if (hasChinese) return 'zh';
      if (hasPortuguese) return 'pt';
      if (hasItalian) return 'it';
      if (hasFrench) return 'fr';
      if (hasGerman) return 'de';
      if (hasAccents && !hasGerman && !hasFrench && !hasItalian && !hasPortuguese) return 'es';
      if (hasAscii) return 'en';
      return lang;
    }

    getAppLanguage() {
      if (this.userPreferredLanguage) {
        return this.userPreferredLanguage;
      }

      if (window.TranslationUtil && typeof window.TranslationUtil.getLanguage === 'function') {
        try {
          return window.TranslationUtil.getLanguage();
        } catch (error) {
          console.warn('Error obteniendo idioma de TranslationUtil:', error);
        }
      }

      const navLang = navigator.language || navigator.userLanguage || 'en';
      return (navLang || 'en').split('-')[0];
    }

    getUserProfile() {
      if (window.ProfilesManager && typeof window.ProfilesManager.getActiveProfileId === 'function') {
        try {
          const profileId = window.ProfilesManager.getActiveProfileId();
          if (profileId) {
            return this.getProfileDataById(profileId);
          }
        } catch (error) {
          console.warn('Error obteniendo perfil de ProfilesManager:', error);
        }
      }

      const currentProfileId = window.StorageUtil && typeof window.StorageUtil.getCurrentProfileId === 'function'
        ? window.StorageUtil.getCurrentProfileId()
        : 'default';
      return this.getProfileDataById(currentProfileId);
    }

    getProfileDataById(profileId) {
      if (window.StorageUtil && typeof window.StorageUtil.getProfileData === 'function') {
        return window.StorageUtil.getProfileData(profileId) || {};
      }
      return {};
    }

    getRecentWorkouts() {
      if (!window.StorageUtil || typeof window.StorageUtil.getHistory !== 'function') {
        return [];
      }

      const timerTypes = ['emom', 'tabata', 'fortime', 'amrap'];
      const allWorkouts = [];

      timerTypes.forEach(type => {
        const history = window.StorageUtil.getHistory(type) || [];
        history.forEach(entry => {
          allWorkouts.push({
            type,
            ...entry
          });
        });
      });

      allWorkouts.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp - a.timestamp;
      });

      return allWorkouts.slice(0, CONFIG.MAX_WORKOUTS);
    }

    // ------------------------------------------------------------------------
    // PERSISTENCIA
    // ------------------------------------------------------------------------

    loadChatHistory() {
      try {
        const saved = localStorage.getItem('aiTrainerChatHistory');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.chatHistory = parsed;
            this.chatHistory.forEach(message => {
              this.addMessageToDOM(message.text, message.role);
            });
          }
        }
      } catch (error) {
        console.warn('Error cargando historial de chat:', error);
      }
    }

    saveChatHistory() {
      try {
        localStorage.setItem('aiTrainerChatHistory', JSON.stringify(this.chatHistory));
      } catch (error) {
        console.warn('Error guardando historial de chat:', error);
      }
    }

    clearHistory() {
      this.chatHistory = [];
      localStorage.removeItem('aiTrainerChatHistory');
      const messagesContainer = document.getElementById('aiChatMessages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }
      this.sendWelcomeMessage();
    }
  }

  // ============================================================================
  // INICIALIZACIÓN AUTOMÁTICA
  // ============================================================================

  function initAIChat() {
    setTimeout(() => {
      if (!window.aiTrainerChat) {
        window.aiTrainerChat = new AITrainerChat();
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIChat);
  } else {
    initAIChat();
  }
})();
