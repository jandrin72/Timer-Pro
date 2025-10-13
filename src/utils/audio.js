// utils/audio.js - Gestión de audio y sonidos
class AudioUtil {
  static audioContext = null;
  static volume = 0.8;
  static enabled = true;
  static storageKey = 'timer_pro_volume';
  static _volumeLoaded = false;

  static async ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  static readStoredVolume() {
    try {
      if (typeof window !== 'undefined' && window.StorageUtil) {
        const stored = StorageUtil.get(this.storageKey);
        if (typeof stored === 'number') {
          return stored;
        }
        if (typeof stored === 'string') {
          const parsed = parseFloat(stored);
          return Number.isNaN(parsed) ? null : parsed;
        }
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw !== null) {
          const parsed = parseFloat(raw);
          return Number.isNaN(parsed) ? null : parsed;
        }
      }
    } catch (error) {
      console.warn('Unable to read audio volume from storage:', error);
    }
    return null;
  }

  static persistVolume(vol) {
    try {
      if (typeof window !== 'undefined' && window.StorageUtil) {
        StorageUtil.set(this.storageKey, vol);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, vol);
      }
    } catch (error) {
      console.warn('Unable to persist audio volume:', error);
    }
  }

  static ensureVolumeLoaded() {
    if (this._volumeLoaded) return;
    const stored = this.readStoredVolume();
    if (typeof stored === 'number' && !Number.isNaN(stored)) {
      this.volume = Math.max(0, Math.min(1, stored));
    }
    this._volumeLoaded = true;
  }

  static setVolume(vol) {
    this.ensureVolumeLoaded();
    const numericVolume = Number.isFinite(vol) ? vol : parseFloat(vol);
    const safeVolume = Math.max(0, Math.min(1, Number.isNaN(numericVolume) ? this.volume : numericVolume));
    this.volume = safeVolume;
    this.persistVolume(safeVolume);
    return this.volume;
  }

  static getVolume() {
    this.ensureVolumeLoaded();
    return this.volume;
  }

  static async playBeep(freq = 800, duration = 200) {
    if (!this.enabled) return;

    try {
      await this.ensureContext();
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration/1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration/1000);
    } catch (error) {
      console.warn('Error playing beep:', error);
    }
  }

  static async playTick() {
    await this.playBeep(600, 100);
  }

  static async playComplete() {
    await this.playBeep(1000, 300);
    setTimeout(() => this.playBeep(1200, 300), 200);
  }
}

window.AudioUtil = AudioUtil;