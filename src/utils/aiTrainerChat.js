/**
 * AI Trainer Chat - Entrenador personal con IA usando Gemini
 * Versión: 2.0 - Noviembre 2025
 */

(function() {
  'use strict';

  // ============================================================================
  // CONFIGURACIÓN
  // ============================================================================
  
  const CONFIG = {
    // IMPORTANTE: Reemplazar con tu API key real de Gemini
    // Obtener en: https://aistudio.google.com/app/apikey
    GEMINI_API_KEY: 'AIzaSyAL1-DSDrQ50FpyY2TSr6acTkRPgAPC3uc', // <-- TU KEY AQUÍ
    
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    GEMINI_MODEL_ID: 'gemini-2.0-flash', // 30 RPM, 1M TPM, 200 RPD - ÓPTIMO
    
    MAX_HISTORY: 10, // Últimas 10 interacciones
    MAX_WORKOUTS: 5, // Últimos 5 entrenamientos
    RESPONSE_MAX_WORDS: 150,
    
    // Mapeo de códigos de idioma a nombres completos
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
                  <div class="ai-chat-subtitle">Tu entrenador personal IA</div>
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
        
        // Si es la primera vez, enviar mensaje de bienvenida
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

      // Limpiar input
      input.value = '';

      // Añadir mensaje del usuario
      this.addMessage(userMessage, 'user');

      // Mostrar "escribiendo..."
      this.showTypingIndicator();
      this.isLoading = true;

      try {
        // Llamar a Gemini
        const response = await this.callGemini(userMessage);
        
        // Quitar "escribiendo..."
        this.hideTypingIndicator();
        
        // Añadir respuesta
        this.addMessage(response, 'assistant');
        
        // Guardar en historial
        this.saveChatHistory();
        
      } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        this.hideTypingIndicator();
        
        const appLang = this.getAppLanguage();
        const errorMessages = {
          'es': '❌ Error al conectar con el servidor. Verifica tu API key y conexión.',
          'en': '❌ Error connecting to server. Check your API key and connection.',
          'de': '❌ Fehler beim Verbinden mit dem Server. Überprüfen Sie API-Schlüssel.',
          'fr': '❌ Erreur de connexion au serveur. Vérifiez votre clé API.',
          'it': '❌ Errore di connessione al server. Verifica la chiave API.',
          'pt': '❌ Erro ao conectar ao servidor. Verifique sua chave API.',
          'zh': '❌ 连接服务器错误。检查您的 API 密钥。'
        };
        
        const errorMsg = errorMessages[appLang] || errorMessages['en'];
        this.addMessage(`${errorMsg}\n\nDetalle: ${error.message}`, 'assistant');
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

      // Scroll al final
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Guardar en historial
      this.chatHistory.push({ role, text, timestamp: Date.now() });
      
      // Limitar historial
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
      
      // Validar API key
      if (!apiKey || apiKey.includes('AIzaSy...') || apiKey.length < 30) {
        const lang = appLang || 'en';
        const keyErrorMessages = {
          'es': '⚠️ API Key no configurada. Ve a src/utils/aiTrainerChat.js línea 17 y añade tu key de https://aistudio.google.com/app/apikey',
          'en': '⚠️ API Key not configured. Go to src/utils/aiTrainerChat.js line 17 and add your key from https://aistudio.google.com/app/apikey',
          'de': '⚠️ API-Schlüssel nicht konfiguriert. Gehe zu src/utils/aiTrainerChat.js Zeile 17.',
          'fr': '⚠️ Clé API non configurée. Allez à src/utils/aiTrainerChat.js ligne 17.',
          'it': '⚠️ Chiave API non configurata. Vai a src/utils/aiTrainerChat.js riga 17.',
          'pt': '⚠️ Chave API não configurada. Vá para src/utils/aiTrainerChat.js linha 17.',
          'zh': '⚠️ API 密钥未配置。转到 src/utils/aiTrainerChat.js 第 17 行。'
        };
        throw new Error(keyErrorMessages[lang] || keyErrorMessages['en']);
      }

      // Preparar historial de conversación
      const conversationHistory = this.chatHistory
        .filter(msg => msg.role !== 'system') // Filtrar mensajes de sistema
        .slice(-CONFIG.MAX_HISTORY * 2)
        .map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

      // Construir petición
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

      // URL completa
      const apiUrl = `${CONFIG.GEMINI_API_URL}/${CONFIG.GEMINI_MODEL_ID}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      console.log('🌐 Llamando a Gemini API...');
      console.log('📍 Modelo:', CONFIG.GEMINI_MODEL_ID);
      
      // Hacer petición
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Leer respuesta
      const responseText = await response.text();
      let data = null;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch (parseError) {
        console.error('❌ Error parseando respuesta JSON:', parseError);
        console.log('📄 Respuesta cruda:', responseText);
        throw new Error(`Respuesta inválida de Gemini: ${responseText.substring(0, 100)}`);
      }

      // Verificar errores HTTP
      if (!response.ok) {
        const apiError = data?.error?.message || data?.error || `HTTP ${response.status}`;
        console.error('❌ Error de API Gemini:', apiError);
        console.log('📦 Respuesta completa:', data);
        
        // Mensajes de error más específicos
        if (response.status === 400) {
          throw new Error(`API Error 400: Petición inválida. Revisa el modelo (${CONFIG.GEMINI_MODEL_ID}) o formato. Detalle: ${apiError}`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`API Error ${response.status}: API Key inválida o sin permisos. Genera una nueva en https://aistudio.google.com/app/apikey`);
        } else if (response.status === 429) {
          throw new Error('API Error 429: Límite de peticiones excedido. Espera 1 minuto e intenta de nuevo.');
        } else {
          throw new Error(`API Error ${response.status}: ${apiError}`);
        }
      }

      // Extraer respuesta del modelo
      const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        console.error('❌ No se encontró texto en la respuesta:', data);
        throw new Error('Gemini no devolvió texto. Puede estar bloqueado por filtros de contenido.');
      }

      console.log('✅ Respuesta recibida de Gemini');
      return aiResponse.trim();
    }

    // ------------------------------------------------------------------------
    // CONSTRUCCIÓN DEL PROMPT
    // ------------------------------------------------------------------------
    
    buildSystemPrompt(appLang, profile, workouts) {
      const langName = CONFIG.LANGUAGE_NAMES[appLang] || 'English';
      
      // Información del perfil
      let profileInfo = `PERFIL DEL USUARIO:\n`;
      if (profile.name) profileInfo += `- Nombre: ${profile.name}\n`;
      if (profile.age) profileInfo += `- Edad: ${profile.age} años\n`;
      if (profile.biologicalSex) profileInfo += `- Sexo: ${profile.biologicalSex}\n`;
      if (profile.fitnessLevel) profileInfo += `- Nivel fitness: ${profile.fitnessLevel}\n`;
      if (profile.goal) profileInfo += `- Objetivo: ${profile.goal}\n`;
      if (profile.trainingDays) profileInfo += `- Días entrenamiento/semana: ${profile.trainingDays}\n`;
      if (profile.experience) profileInfo += `- Experiencia: ${profile.experience}\n`;
      if (profile.limitations) profileInfo += `- Limitaciones: ${profile.limitations}\n`;

      // Últimos entrenamientos
      let workoutsInfo = `\nÚLTIMOS ENTRENAMIENTOS:\n`;
      if (workouts.length === 0) {
        workoutsInfo += '- Aún no hay entrenamientos registrados\n';
      } else {
        workouts.forEach((w, i) => {
          const date = new Date(w.timestamp).toLocaleDateString();
          workoutsInfo += `${i + 1}. ${date}: ${w.type.toUpperCase()} | `;
          workoutsInfo += `${w.config || 'N/A'} | `;
          workoutsInfo += `${w.completed ? 'Completado' : 'No completado'} | `;
          if (w.rpe) workoutsInfo += `RPE ${w.rpe}/10 | `;
          if (w.notes) workoutsInfo += `"${w.notes}"`;
          workoutsInfo += '\n';
        });
      }

      return `
IDENTIDAD:
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

RECUERDA: Eres un coach real, no un chatbot genérico. Usa el contexto del usuario para personalizar cada respuesta.
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
        const profileId = window.StorageUtil.getCurrentProfileId();
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
        const saved = localStorage.getItem('aiTrainerChatHistory');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.chatHistory = parsed;
          
          const messagesContainer = document.getElementById('aiChatMessages');
          if (messagesContainer && parsed.length > 0) {
            parsed.forEach(msg => {
              const messageDiv = document.createElement('div');
              messageDiv.className = `ai-chat-message ai-chat-message-${msg.role}`;
              const bubble = document.createElement('div');
              bubble.className = 'ai-chat-bubble';
              bubble.textContent = msg.text;
              messageDiv.appendChild(bubble);
              messagesContainer.appendChild(messageDiv);
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Error cargando historial de chat:', error);
      }
    }

    saveChatHistory() {
      try {
        localStorage.setItem('aiTrainerChatHistory', JSON.stringify(this.chatHistory));
      } catch (error) {
        console.warn('⚠️ Error guardando historial de chat:', error);
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
      window.aiTrainerChat = new AITrainerChat();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIChat);
  } else {
    initAIChat();
  }

})();
