/**
 * AI Trainer Chat - Entrenador personal con IA usando Gemini
 * Versión: 2.3 - Chat por perfil + Limpiar + Lectura completa de entrenamientos
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================
  
  const CONFIG = {
    GEMINI_API_KEY: 'AIzaSyAL1-DSDrQ50FpyY2TSr6acTkRPgAPC3uc', // TU API KEY
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
      this.currentProfileId = null;
      
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
      this.setupProfileChangeListener();
      console.log('✅ AI Trainer Chat inicializado (v2.3 - Lectura completa)');
    }

    // ------------------------------------------------------------------------
    // GESTIÓN DE PERFILES
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
      return `aiTrainerChat_perfil_${this.currentProfileId}`;
    }

    setupProfileChangeListener() {
      const profileIndicator = document.getElementById('currentProfileName');
      
      if (profileIndicator) {
        const observer = new MutationObserver(() => {
          const newProfileId = this.getCurrentProfileId();
          if (newProfileId !== this.currentProfileId) {
            console.log(`🔄 Cambio de perfil: ${this.currentProfileId} → ${newProfileId}`);
            this.handleProfileSwitch(newProfileId);
          }
        });
        
        observer.observe(profileIndicator, { 
          childList: true, 
          characterData: true, 
          subtree: true 
        });
      }

      setInterval(() => {
        const newProfileId = this.getCurrentProfileId();
        if (newProfileId !== this.currentProfileId) {
          this.handleProfileSwitch(newProfileId);
        }
      }, 2000);
    }

    handleProfileSwitch(newProfileId) {
      if (this.currentProfileId) {
        this.saveChatHistory();
      }

      this.currentProfileId = newProfileId;
      this.clearChatUI();
      this.loadChatHistory();

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
              <div class="ai-chat-header-actions">
                <button id="aiChatClearBtn" class="ai-chat-clear-btn" title="Limpiar historial">
                  🗑️
                </button>
                <button id="aiChatCloseBtn" class="ai-chat-close-btn">✕</button>
              </div>
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
      const clearBtn = document.getElementById('aiChatClearBtn');
      const sendBtn = document.getElementById('aiChatSendBtn');
      const input = document.getElementById('aiChatInput');
      const modal = document.getElementById('aiChatModal');

      if (floatingBtn) {
        floatingBtn.addEventListener('click', () => this.openChat());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeChat());
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.confirmClearHistory());
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
    // LIMPIAR HISTORIAL
    // ------------------------------------------------------------------------
    
    confirmClearHistory() {
      const appLang = this.getAppLanguage();
      const profile = this.getUserProfile();
      const profileName = profile.name || 'este perfil';
      
      const confirmMessages = {
        'es': `¿Borrar todo el historial de conversación con ${profileName}?\n\nEsta acción no se puede deshacer.`,
        'en': `Delete all conversation history with ${profileName}?\n\nThis action cannot be undone.`,
        'de': `Gesamte Gesprächsverlauf mit ${profileName} löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
        'fr': `Supprimer tout l'historique de conversation avec ${profileName} ?\n\nCette action est irréversible.`,
        'it': `Eliminare tutta la cronologia delle conversazioni con ${profileName}?\n\nQuesta azione non può essere annullata.`,
        'pt': `Excluir todo o histórico de conversa com ${profileName}?\n\nEsta ação não pode ser desfeita.`,
        'zh': `删除与 ${profileName} 的所有对话历史记录？\n\n此操作无法撤消。`
      };
      
      const confirmMsg = confirmMessages[appLang] || confirmMessages['en'];
      
      if (confirm(confirmMsg)) {
        this.clearHistory();
      }
    }

    clearHistory() {
      const storageKey = this.getChatStorageKey();
      this.chatHistory = [];
      localStorage.removeItem(storageKey);
      this.clearChatUI();
      this.sendWelcomeMessage();
      
      console.log(`🗑️ Historial borrado para perfil ${this.currentProfileId}`);
    }

    // ------------------------------------------------------------------------
    // GESTIÓN DE CHAT
    // ------------------------------------------------------------------------
    
    openChat() {
      const modal = document.getElementById('aiChatModal');
      if (modal) {
        modal.classList.add('active');
        this.isOpen = true;
        
        this.updateChatSubtitle();
        
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
        console.error('❌ Error:', error);
        this.hideTypingIndicator();
        
        const appLang = this.getAppLanguage();
        const errorMessages = {
          'es': '❌ Error al conectar. Verifica tu API key.',
          'en': '❌ Connection error. Check your API key.',
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
        throw new Error('API Key no configurada');
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
          { role: 'user', parts: [{ text: userMessage }] }
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
    // CONSTRUCCIÓN DEL PROMPT (MEJORADO v2.3)
    // ------------------------------------------------------------------------
    
    buildSystemPrompt(appLang, profile, workouts) {
      const langName = CONFIG.LANGUAGE_NAMES[appLang] || 'English';
      
      // Información del perfil
      let profileInfo = `PERFIL DEL USUARIO:\n`;
      if (profile.name) profileInfo += `- Nombre: ${profile.name}\n`;
      if (profile.age) profileInfo += `- Edad: ${profile.age} años\n`;
      if (profile.biologicalSex) profileInfo += `- Sexo: ${profile.biologicalSex}\n`;
      if (profile.fitnessLevel) profileInfo += `- Nivel: ${profile.fitnessLevel}\n`;
      if (profile.goal) profileInfo += `- Objetivo: ${profile.goal}\n`;
      if (profile.trainingDays) profileInfo += `- Días/semana: ${profile.trainingDays}\n`;
      if (profile.experience) profileInfo += `- Experiencia: ${profile.experience}\n`;
      if (profile.limitations) profileInfo += `- Limitaciones: ${profile.limitations}\n`;

      // Últimos entrenamientos (MEJORADO - TODOS LOS DATOS)
      let workoutsInfo = `\nÚLTIMOS ENTRENAMIENTOS (detallados):\n`;
      
      if (workouts.length === 0) {
        workoutsInfo += '- Aún no hay entrenamientos registrados\n';
      } else {
        workouts.forEach((w, i) => {
          const date = w.timestamp ? new Date(w.timestamp).toLocaleDateString() : 'Fecha desconocida';
          const type = w.type ? w.type.toUpperCase() : 'DESCONOCIDO';
          
          workoutsInfo += `\n${i + 1}. ${date} - ${type}:\n`;
          
          // Detalles específicos por tipo de timer
          switch(w.type) {
            case 'emom':
              if (w.cycles) workoutsInfo += `   • Ciclos completados: ${w.cycles}\n`;
              if (w.secondsPerCycle) workoutsInfo += `   • Segundos por ciclo: ${w.secondsPerCycle}s\n`;
              if (w.totalTime) {
                const totalMin = Math.floor(w.totalTime / 60);
                workoutsInfo += `   • Tiempo total: ${totalMin}min ${w.totalTime % 60}s\n`;
              }
              break;
              
            case 'tabata':
              if (w.cycles) workoutsInfo += `   • Ciclos completados: ${w.cycles}\n`;
              if (w.work) workoutsInfo += `   • Trabajo: ${w.work}s\n`;
              if (w.rest) workoutsInfo += `   • Descanso: ${w.rest}s\n`;
              if (w.totalTime) {
                const totalMin = Math.floor(w.totalTime / 60);
                workoutsInfo += `   • Duración total: ${totalMin}min ${w.totalTime % 60}s\n`;
              }
              break;
              
            case 'fortime':
              if (w.finalTime !== undefined && w.finalTime !== null) {
                const minutes = Math.floor(w.finalTime / 60000);
                const seconds = Math.floor((w.finalTime % 60000) / 1000);
                const centiseconds = Math.floor((w.finalTime % 1000) / 10);
                workoutsInfo += `   • Tiempo final: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}\n`;
              }
              
              if (w.timeCap) {
                const capMin = Math.floor(w.timeCap / 60000);
                workoutsInfo += `   • Time Cap: ${capMin}min\n`;
              }
              
              if (w.laps && Array.isArray(w.laps) && w.laps.length > 0) {
                workoutsInfo += `   • Laps completados: ${w.laps.length}\n`;
                w.laps.forEach((lapTime, idx) => {
                  const minutes = Math.floor(lapTime / 60000);
                  const seconds = Math.floor((lapTime % 60000) / 1000);
                  const centiseconds = Math.floor((lapTime % 1000) / 10);
                  workoutsInfo += `     - Lap ${idx + 1}: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}\n`;
                });
              }
              
              // Estado de completado
              if (w.finalTime && w.timeCap) {
                const completado = w.finalTime < w.timeCap;
                workoutsInfo += `   • Estado: ${completado ? 'Completado' : 'No completado (alcanzó time cap)'}\n`;
              }
              break;
              
            case 'amrap':
              if (w.rounds) workoutsInfo += `   • Rondas completadas: ${w.rounds}\n`;
              if (w.duration) {
                const durationMin = Math.floor(w.duration / 60000);
                workoutsInfo += `   • Duración: ${durationMin}min\n`;
              }
              break;
          }
          
          // RPE (común para todos)
          if (w.rpe) {
            const rpeValue = this.extractRPEValue(w.rpe);
            workoutsInfo += `   • RPE: ${rpeValue}/10\n`;
          }
          
          // Notas (común para todos)
          if (w.notes && w.notes.trim()) {
            workoutsInfo += `   • Notas: "${w.notes.trim()}"\n`;
          }
        });
      }

      return `
IDENTIDAD:
Eres "Coach Timer Pro", un entrenador personal experto en CrossFit y fitness funcional.

IDIOMA:
- Idioma de la app: ${langName}
- Responde SIEMPRE en el idioma que te escriban

CONTEXTO:
${profileInfo}
${workoutsInfo}

REGLAS:
1. Máximo ${CONFIG.RESPONSE_MAX_WORDS} palabras
2. 2-3 consejos específicos y accionables
3. Menciona entrenamientos recientes si es relevante (usa los datos detallados arriba)
4. Máximo 2 emojis por mensaje
5. Termina con motivación

IMPORTANTE: Tienes TODOS los datos del entrenamiento (tiempos, laps, rounds, RPE, notas). Úsalos para dar feedback preciso.

RECUERDA: Personaliza con el contexto del usuario.
`.trim();
    }

    // ------------------------------------------------------------------------
    // FUNCIÓN AUXILIAR: Extraer valor RPE
    // ------------------------------------------------------------------------
    
    extractRPEValue(rpeKey) {
      if (!rpeKey) return 'N/A';
      
      // Si ya es un número, retornar
      if (!isNaN(rpeKey)) return rpeKey;
      
      // Extraer número del string tipo "rpeemom8" o "RPE 8/10"
      const match = String(rpeKey).match(/(\d{1,2})/);
      return match ? match[1] : 'N/A';
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
    // PERSISTENCIA
    // ------------------------------------------------------------------------
    
    loadChatHistory() {
      try {
        const storageKey = this.getChatStorageKey();
        const saved = localStorage.getItem(storageKey);
        
        if (saved) {
          const parsed = JSON.parse(saved);
          this.chatHistory = Array.isArray(parsed) ? parsed : [];
          
          this.chatHistory.forEach(msg => {
            this.addMessageToDOM(msg.text, msg.role);
          });
          
          console.log(`📂 Historial cargado: ${this.chatHistory.length} mensajes`);
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
  }

  // ============================================================================
  // INICIALIZACIÓN
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
