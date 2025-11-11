/**
 * AI Trainer Chat - Entrenador personal con IA usando Gemini
 * Versión: 2.1 - Chat independiente por perfil
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================
  
  const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyAL1-DSDrQ50FpyY2TSr6acTkRPgAPC3uc', // TU KEY
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    GEMINI_MODEL_ID: 'gemini-2.0-flash',
    
    MAX_HISTORY: 10,
    MAX_WORKOUTS: 5,
    RESPONSE_MAX_WORDS: 150,
    
    LANGUAGE_NAMES: {
      'es': 'español',
      'en': 'English',
      'de': 'Deutsch',
      'fr': 'français',
      'it': 'italiano',
      'pt': 'português',
      'zh': '中文'
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
      this.currentProfileId = null; // NUEVO: Trackear perfil actual
      
      this.init();
    }

    // ------------------------------------------------------------------------
    // INICIALIZACIÓN
    // ------------------------------------------------------------------------
    
    init() {
      this.createUI();
      this.bindEvents();
      this.loadCurrentProfile();
      this.loadChatHistory();
      this.setupProfileChangeListener(); // NUEVO: Detectar cambios de perfil
      console.log('✅ AI Trainer Chat inicializado (v2.1 - Chat por perfil)');
    }

    // ------------------------------------------------------------------------
    // NUEVO: GESTIÓN DE PERFILES
    // ------------------------------------------------------------------------
    
    loadCurrentProfile() {
      this.currentProfileId = this.getCurrentProfileId();
    }

    getCurrentProfileId() {
      if (window.StorageUtil && typeof window.StorageUtil.getCurrentProfileId === 'function') {
        return window.StorageUtil.getCurrentProfileId();
      }
      return 'default';
    }

    getChatStorageKey() {
      // Clave única por perfil: aiTrainerChat_perfil_abc123
      return `aiTrainerChat_perfil_${this.currentProfileId}`;
    }

    setupProfileChangeListener() {
      // Detectar cambios de perfil mediante MutationObserver en el indicador
      const profileIndicator = document.getElementById('currentProfileName');
      
      if (profileIndicator) {
        const observer = new MutationObserver(() => {
          const newProfileId = this.getCurrentProfileId();
          
          if (newProfileId !== this.currentProfileId) {
            console.log(`🔄 Cambio de perfil detectado: ${this.currentProfileId} → ${newProfileId}`);
            this.handleProfileSwitch(newProfileId);
          }
        });
        
        observer.observe(profileIndicator, { 
          childList: true, 
          characterData: true, 
          subtree: true 
        });
      }

      // Fallback: Revisar cada 2 segundos (por si el MutationObserver falla)
      setInterval(() => {
        const newProfileId = this.getCurrentProfileId();
        if (newProfileId !== this.currentProfileId) {
          this.handleProfileSwitch(newProfileId);
        }
      }, 2000);
    }

    handleProfileSwitch(newProfileId) {
      // Guardar historial del perfil anterior
      if (this.currentProfileId) {
        this.saveChatHistory();
      }

      // Actualizar perfil actual
      this.currentProfileId = newProfileId;

      // Limpiar UI del chat
      this.clearChatUI();

      // Cargar historial del nuevo perfil
      this.loadChatHistory();

      // Si el chat está abierto, mostrar mensaje de bienvenida si no hay historial
      if (this.isOpen && this.chatHistory.length === 0) {
        this.sendWelcomeMessage();
      }

      console.log(`✅ Chat cargado para perfil: ${newProfileId}`);
    }

    clearChatUI() {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (messagesContainer) {
        messagesContainer.innerHTML = '';
      }
    }

    // ------------------------------------------------------------------------
    // CREACIÓN DE UI
    // ------------------------------------------------------------------------
    
    createUI() {
      // Botón flotante
      const floatingBtn = document.createElement('button');
      floatingBtn.id = 'aiChatFloatingBtn';
      floatingBtn.className = 'ai-chat-floating-btn';
      floatingBtn.innerHTML = '💬';
      floatingBtn.setAttribute('aria-label', 'Abrir chat con entrenador IA');
      document.body.appendChild(floatingBtn);

      // Modal de chat
      const modalHTML = `
        <div id="aiChatModal" class="ai-chat-modal">
          <div class="ai-chat-container">
            <!-- Header -->
            <div class="ai-chat-header">
              <div class="ai-chat-header-info">
                <span class="ai-chat-avatar">🤖</span>
                <div>
                  <div class="ai-chat-title">Coach Timer Pro</div>
                  <div class="ai-chat-subtitle" id="aiChatSubtitle">Tu entrenador personal IA</div>
                </div>
              </div>
              <button id="aiChatCloseBtn" class="ai-chat-close-btn">✕</button>
            </div>

            <!-- Mensajes -->
            <div id="aiChatMessages" class="ai-chat-messages">
              <!-- Los mensajes se insertan aquí dinámicamente -->
            </div>

            <!-- Input -->
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
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
      }

      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
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
        
        // Actualizar subtítulo con nombre del perfil
        this.updateChatSubtitle();
        
        // Si es la primera vez para este perfil, enviar mensaje de bienvenida
        if (this.chatHistory.length === 0) {
          this.sendWelcomeMessage();
        }
        
        // Focus en input
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

    updateChatSubtitle() {
      const subtitle = document.getElementById('aiChatSubtitle');
      if (!subtitle) return;

      const profile = this.getUserProfile();
      const profileName = profile.name || 'Atleta';
      
      const appLang = this.getAppLanguage();
      const subtitles = {
        'es': `Conversación con ${profileName}`,
        'en': `Conversation with ${profileName}`,
        'de': `Gespräch mit ${profileName}`,
        'fr': `Conversation avec ${profileName}`,
        'it': `Conversazione con ${profileName}`,
        'pt': `Conversa com ${profileName}`,
        'zh': `与 ${profileName} 的对话`
      };
      
      subtitle.textContent = subtitles[appLang] || subtitles['en'];
    }

    // ------------------------------------------------------------------------
    // MENSAJES
    // ------------------------------------------------------------------------
    
    sendWelcomeMessage() {
      const appLang = this.getAppLanguage();
      const profile = this.getUserProfile();
      const userName = profile.name || 'atleta';
      
      const welcomeMessages = {
        'es': `¡Hola ${userName}! 👋 Soy tu Coach Timer Pro. ¿En qué puedo ayudarte hoy?`,
        'en': `Hello ${userName}! 👋 I'm your Coach Timer Pro. How can I help you today?`,
        'de': `Hallo ${userName}! 👋 Ich bin dein Coach Timer Pro. Wie kann ich dir helfen?`,
        'fr': `Bonjour ${userName}! 👋 Je suis votre Coach Timer Pro. Comment puis-je vous aider?`,
        'it': `Ciao ${userName}! 👋 Sono il tuo Coach Timer Pro. Come posso aiutarti?`,
        'pt': `Olá ${userName}! 👋 Sou seu Coach Timer Pro. Como posso ajudar?`,
        'zh': `你好 ${userName}! 👋 我是你的 Coach Timer Pro。我能帮你什么?`
      };
      
      const welcomeMsg = welcomeMessages[appLang] || welcomeMessages['en'];
      this.addMessage(welcomeMsg, 'assistant');
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
        const response = await this.callGemini(userMessage);
        this.hideTypingIndicator();
        this.addMessage(response, 'assistant');
        this.saveChatHistory();
      } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        this.hideTypingIndicator();
        
        const appLang = this.getAppLanguage();
        const errorMessages = {
          'es': '❌ Error al conectar. Verifica tu API key y conexión.',
          'en': '❌ Connection error. Check your API key and connection.',
          'de': '❌ Verbindungsfehler. API-Schlüssel prüfen.',
          'fr': '❌ Erreur de connexion. Vérifiez votre clé API.',
          'it': '❌ Errore di connessione. Verifica la chiave API.',
          'pt': '❌ Erro de conexão. Verifique sua chave API.',
          'zh': '❌ 连接错误。检查您的 API 密钥。'
        };
        
        const errorMsg = errorMessages[appLang] || errorMessages['en'];
        this.addMessage(`${errorMsg}\n\n${error.message}`, 'assistant');
      } finally {
        this.isLoading = false;
      }
    }

    addMessage(text, role) {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-chat-message ai-chat-message-${role}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      bubble.textContent = text;
      
      messageDiv.appendChild(bubble);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.chatHistory.push({ role, text, timestamp: Date.now() });
      
      if (this.chatHistory.length > CONFIG.MAX_HISTORY * 2) {
        this.chatHistory = this.chatHistory.slice(-CONFIG.MAX_HISTORY * 2);
      }
    }

    showTypingIndicator() {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer) return;

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
      const appLang = this.getAppLanguage();
      const profile = this.getUserProfile();
      const recentWorkouts = this.getRecentWorkouts();
      const systemPrompt = this.buildSystemPrompt(appLang, profile, recentWorkouts);
      
      const apiKey = CONFIG.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.includes('AIzaSy...') || apiKey.length < 30) {
        throw new Error('API Key no configurada correctamente');
      }

      const conversationHistory = this.chatHistory
        .filter(msg => msg.role !== 'system')
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

      const apiUrl = `${CONFIG.GEMINI_API_URL}/${CONFIG.GEMINI_MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
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

      const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        throw new Error('Gemini no devolvió texto');
      }

      return aiResponse.trim();
    }

    // ------------------------------------------------------------------------
    // CONSTRUCCIÓN DEL PROMPT
    // ------------------------------------------------------------------------
    
    buildSystemPrompt(appLang, profile, workouts) {
      const langName = CONFIG.LANGUAGE_NAMES[appLang] || 'English';
      
      let profileInfo = `PERFIL DEL USUARIO:\n`;
      if (profile.name) profileInfo += `- Nombre: ${profile.name}\n`;
      if (profile.age) profileInfo += `- Edad: ${profile.age} años\n`;
      if (profile.biologicalSex) profileInfo += `- Sexo: ${profile.biologicalSex}\n`;
      if (profile.fitnessLevel) profileInfo += `- Nivel: ${profile.fitnessLevel}\n`;
      if (profile.goal) profileInfo += `- Objetivo: ${profile.goal}\n`;
      if (profile.trainingDays) profileInfo += `- Días/semana: ${profile.trainingDays}\n`;
      if (profile.experience) profileInfo += `- Experiencia: ${profile.experience}\n`;
      if (profile.limitations) profileInfo += `- Limitaciones: ${profile.limitations}\n`;

      let workoutsInfo = `\nÚLTIMOS ENTRENAMIENTOS:\n`;
      if (workouts.length === 0) {
        workoutsInfo += '- Aún no hay entrenamientos registrados\n';
      } else {
        workouts.forEach((w, i) => {
          const date = new Date(w.timestamp).toLocaleDateString();
          workoutsInfo += `${i + 1}. ${date}: ${w.type.toUpperCase()} | `;
          workoutsInfo += `${w.config || 'N/A'} | `;
          workoutsInfo += `${w.completed ? 'Completado' : 'No completado'}`;
          if (w.rpe) workoutsInfo += ` | RPE ${w.rpe}/10`;
          if (w.notes) workoutsInfo += ` | "${w.notes}"`;
          workoutsInfo += '\n';
        });
      }

      return `
IDENTIDAD:
Eres "Coach Timer Pro", un entrenador personal experto en CrossFit y fitness funcional.

IDIOMA:
- Idioma de la app: ${langName}
- Responde SIEMPRE en el idioma que te escriban
- Si detectas cambio de idioma vs app, pregunta preferencia UNA VEZ

CONTEXTO:
${profileInfo}
${workoutsInfo}

REGLAS:
1. Máximo ${CONFIG.RESPONSE_MAX_WORDS} palabras
2. 2-3 consejos específicos y accionables
3. Menciona entrenamientos recientes si es relevante
4. Máximo 2 emojis por mensaje
5. No inventes datos
6. Termina con motivación cuando sea apropiado

RECUERDA: Eres un coach real, usa el contexto para personalizar.
`.trim();
    }

    // ------------------------------------------------------------------------
    // OBTENCIÓN DE DATOS
    // ------------------------------------------------------------------------
    
    getAppLanguage() {
      if (window.TranslationUtil && typeof window.TranslationUtil.getLanguage === 'function') {
        return window.TranslationUtil.getLanguage();
      }
      const navLang = navigator.language || navigator.userLanguage || 'en';
      return navLang.split('-')[0];
    }

    getUserProfile() {
      if (window.StorageUtil && typeof window.StorageUtil.getProfileData === 'function') {
        const profileId = this.currentProfileId || this.getCurrentProfileId();
        return window.StorageUtil.getProfileData(profileId) || {};
      }
      return {};
    }

    getRecentWorkouts() {
      if (!window.StorageUtil) return [];

      const timerTypes = ['emom', 'tabata', 'fortime', 'amrap'];
      const allWorkouts = [];

      timerTypes.forEach(type => {
        const history = window.StorageUtil.getHistory(type) || [];
        history.forEach(workout => {
          allWorkouts.push({ type, ...workout });
        });
      });

      allWorkouts.sort((a, b) => b.timestamp - a.timestamp);
      return allWorkouts.slice(0, CONFIG.MAX_WORKOUTS);
    }

    // ------------------------------------------------------------------------
    // PERSISTENCIA (MODIFICADO: Por perfil)
    // ------------------------------------------------------------------------
    
    loadChatHistory() {
      try {
        const storageKey = this.getChatStorageKey();
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          this.chatHistory = Array.isArray(parsed) ? parsed : [];
          
          // Renderizar mensajes guardados
          this.chatHistory.forEach(msg => {
            this.addMessageToDOM(msg.text, msg.role);
          });
          
          console.log(`📂 Historial cargado para perfil ${this.currentProfileId}: ${this.chatHistory.length} mensajes`);
        } else {
          this.chatHistory = [];
        }
      } catch (error) {
        console.warn('⚠️ Error cargando historial:', error);
        this.chatHistory = [];
      }
    }

    saveChatHistory() {
      try {
        const storageKey = this.getChatStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(this.chatHistory));
        console.log(`💾 Historial guardado para perfil ${this.currentProfileId}`);
      } catch (error) {
        console.warn('⚠️ Error guardando historial:', error);
      }
    }

    addMessageToDOM(text, role) {
      const messagesContainer = document.getElementById('aiChatMessages');
      if (!messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-chat-message ai-chat-message-${role}`;
      
      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      bubble.textContent = text;
      
      messageDiv.appendChild(bubble);
      messagesContainer.appendChild(messageDiv);
    }

    clearHistory() {
      const storageKey = this.getChatStorageKey();
      this.chatHistory = [];
      localStorage.removeItem(storageKey);
      this.clearChatUI();
      if (this.isOpen) {
        this.sendWelcomeMessage();
      }
      console.log(`🗑️ Historial borrado para perfil ${this.currentProfileId}`);
    }
  }

  // ============================================================================
  // INICIALIZACIÓN AUTOMÁTICA
  // ============================================================================
  
  function initAIChat() {
    setTimeout(() => {
      window.aiTrainerChat = new AITrainerChat();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIChat);
  } else {
    initAIChat();
  }

})();
