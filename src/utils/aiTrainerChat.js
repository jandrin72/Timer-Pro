/**
 * AI Trainer Chat - Entrenador personal con IA usando Gemini
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================

  const CONFIG = {
    // IMPORTANTE: Reemplazar con tu API key real de Gemini
    // Obtener en: https://aistudio.google.com/app/apikey
    GEMINI_API_KEY: 'AIzaSy...', // <-- CAMBIAR ESTO

    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',

    MAX_HISTORY: 10, // Últimas 10 interacciones
    MAX_WORKOUTS: 5, // Últimos 5 entrenamientos
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

      this.init();
    }

    // ------------------------------------------------------------------------
    // INICIALIZACIÓN
    // ------------------------------------------------------------------------

    init() {
      this.createUI();
      this.bindEvents();
      this.loadChatHistory();
      console.log('✅ AI Trainer Chat inicializado');
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

      try {
        this.isLoading = true;
        const response = await this.callGemini(userMessage);
        this.hideTypingIndicator();
        this.addMessage(response, 'assistant');
        this.saveChatHistory();
      } catch (error) {
        console.error('Error al enviar mensaje:', error);
        this.hideTypingIndicator();
        const lang = this.getAppLanguage();
        const errorMsg = lang === 'es'
          ? '❌ Error al conectar con el servidor. Intenta de nuevo.'
          : '❌ Error connecting to server. Please try again.';
        this.addMessage(errorMsg, 'assistant');
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
    // LLAMADA A GEMINI
    // ------------------------------------------------------------------------

    async callGemini(userMessage) {
      const appLang = this.detectUserLanguage(userMessage);
      const profile = this.getUserProfile();
      const recentWorkouts = this.getRecentWorkouts();
      const systemPrompt = this.buildSystemPrompt(appLang, profile, recentWorkouts);

      const conversationHistory = this.chatHistory
        .slice(-CONFIG.MAX_HISTORY * 2)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

      const requestBody = {
        contents: [
          ...conversationHistory,
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9,
          topK: 40
        }
      };

      if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY === 'AIzaSy...') {
        const lang = appLang || 'en';
        const placeholderMsg = lang === 'es'
          ? 'Configura tu API key de Gemini en src/utils/aiTrainerChat.js'
          : 'Configure your Gemini API key in src/utils/aiTrainerChat.js';
        return placeholderMsg;
      }

      const response = await fetch(
        `${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Lo siento, no pude generar una respuesta.';

      return aiResponse.trim();
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

      return `IDENTIDAD:
Eres "Coach Timer Pro", un entrenador personal experto en CrossFit, fitness funcional y HIIT.
Tu personalidad es motivadora, profesional, empática y específica.

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

RECUERDA: Eres un coach real, no un chatbot genérico. Usa el contexto del usuario para personalizar cada respuesta.`;
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
