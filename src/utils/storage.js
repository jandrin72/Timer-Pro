// utils/storage.js - Gestión centralizada de localStorage
class StorageUtil {
  static DEFAULT_HISTORY_LIMIT = 50;
  static PROFILE_DATA_TEMPLATE = {
    name: '',
    age: null,
    biologicalSex: '',
    fitnessLevel: '',
    goal: '',
    trainingDays: null,
    weight: null,
    height: null,
    experience: '',
    limitations: '',
    preferences: []
  };
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

  // Gestión de perfiles
  static getProfilesList() {
    return this.get('profiles_list', []);
  }

  static saveProfilesList(profiles) {
    return this.set('profiles_list', profiles);
  }

  static getCurrentProfileId() {
    const settings = this.getSettings();
    if (settings && settings.activeProfile) {
      return settings.activeProfile;
    }
    return 'default';
  }

  static setCurrentProfile(profileId) {
    const settings = this.getSettings();
    settings.activeProfile = profileId;
    return this.saveSettings(settings);
  }

  static getProfileData(profileId) {
    const defaultData = { ...this.PROFILE_DATA_TEMPLATE };
    const data = this.get(`profile_${profileId}_data`, defaultData);
    return { ...defaultData, ...data, preferences: Array.isArray(data?.preferences) ? data.preferences : [] };
  }

  static saveProfileData(profileId, data) {
    const payload = { ...this.PROFILE_DATA_TEMPLATE, ...data };
    if (!Array.isArray(payload.preferences)) {
      payload.preferences = [];
    }
    return this.set(`profile_${profileId}_data`, payload);
  }

  static removeProfileStorage(profileId) {
    this.remove(`profile_${profileId}_data`);
    const timerTypes = ['emom', 'tabata', 'fortime', 'amrap'];
    timerTypes.forEach(type => {
      this.remove(`profile_${profileId}_${type}_presets`);
      this.remove(`profile_${profileId}_${type}_history`);
    });
  }

  static getProfileKey(timerType, suffix, profileId = null) {
    const resolvedProfile = profileId || this.getCurrentProfileId();
    return `profile_${resolvedProfile}_${timerType}_${suffix}`;
  }

  // Métodos específicos para la app
  static getPresets(timerType) {
    return this.get(this.getProfileKey(timerType, 'presets'), []);
  }

  static savePresets(timerType, presets) {
    return this.set(this.getProfileKey(timerType, 'presets'), presets);
  }

  static getHistory(timerType) {
    return this.get(this.getProfileKey(timerType, 'history'), []);
  }

  static saveHistory(timerType, history) {
    return this.set(this.getProfileKey(timerType, 'history'), history);
  }

  static saveWorkout(timerType, workout) {
    const history = this.getHistory(timerType);
    history.unshift(workout);

    const historyLimit = this.getHistoryLimit();
    if (historyLimit && history.length > historyLimit) {
      history.splice(historyLimit);
    }

    return this.saveHistory(timerType, history);
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

  static getProfileContextForAI(profileId) {
    const timerTypes = ['emom', 'tabata', 'fortime', 'amrap'];
    const resolvedProfileId = profileId || this.getCurrentProfileId();
    const profileData = this.getProfileData(resolvedProfileId);

    const history = {};
    const presets = {};

    timerTypes.forEach(type => {
      history[type] = this.get(this.getProfileKey(type, 'history', resolvedProfileId), []);
      presets[type] = this.get(this.getProfileKey(type, 'presets', resolvedProfileId), []);
    });

    return {
      user: profileData,
      training_history: history,
      current_presets: presets,
      profile_id: resolvedProfileId
    };
  }
}

window.StorageUtil = StorageUtil;