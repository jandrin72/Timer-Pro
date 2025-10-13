// utils/audio.js - Gestión de audio y sonidos
class AudioUtil {
  static audioContext = null;
  static volume = 0.8;
  static enabled = true;

  static async ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  static setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('audio_volume', this.volume);
  }

  static getVolume() {
    const saved = localStorage.getItem('audio_volume');
    return saved ? parseFloat(saved) : this.volume;
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