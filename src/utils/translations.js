// utils/translations.js - Sistema multi-idioma
const TRANSLATIONS = {
  es: {
    brand_title: "Timer Pro",
    landing_title: "Elige tu temporizador",
    start: "Empezar",
    pause: "Pausar", 
    resume: "Continuar",
    reset: "Reiniciar",
    ready: "Listo"
  },
  en: {
    brand_title: "Timer Pro",
    landing_title: "Choose your timer", 
    start: "Start",
    pause: "Pause",
    resume: "Resume", 
    reset: "Reset",
    ready: "Ready"
  }
};

class TranslationUtil {
  static currentLanguage = 'es';

  static setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem('app_language', lang);
  }

  static t(key, params = {}) {
    const translations = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.es;
    return translations[key] || key;
  }
}

window.t = (key, params) => TranslationUtil.t(key, params);
window.TranslationUtil = TranslationUtil;