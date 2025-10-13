// utils/storage.js - Gestión centralizada de localStorage
class StorageUtil {
  static DEFAULT_HISTORY_LIMIT = 50;
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error al leer ${key} del storage:`, error);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error al guardar ${key} en storage:`, error);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error al eliminar ${key} del storage:`, error);
      return false;
    }
  }

  // Métodos específicos para la app
  static getPresets(timerType) {
    return this.get(`${timerType}_presets`, []);
  }

  static savePresets(timerType, presets) {
    return this.set(`${timerType}_presets`, presets);
  }

  static getHistory(timerType) {
    return this.get(`${timerType}_history`, []);
  }

  static saveWorkout(timerType, workout) {
    const history = this.getHistory(timerType);
    history.unshift(workout);

    const historyLimit = this.getHistoryLimit();
    if (historyLimit && history.length > historyLimit) {
      history.splice(historyLimit);
    }

    return this.set(`${timerType}_history`, history);
  }

  static getHistoryLimit() {
    const settings = this.getSettings();
    const limit = settings && typeof settings.historyLimit !== 'undefined'
      ? parseInt(settings.historyLimit, 10)
      : this.DEFAULT_HISTORY_LIMIT;

    if (Number.isNaN(limit) || limit <= 0) {
      return this.DEFAULT_HISTORY_LIMIT;
    }

    return limit;
  }

  static getSettings() {
    return this.get('app_settings', {});
  }

  static saveSettings(settings) {
    return this.set('app_settings', settings);
  }
}

window.StorageUtil = StorageUtil;