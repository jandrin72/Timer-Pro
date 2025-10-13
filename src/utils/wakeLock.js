// utils/wakeLock.js - Control de pantalla encendida
class WakeLockUtil {
  static wakeLock = null;
  static enabled = true;

  static async request() {
    if (!this.enabled || !('wakeLock' in navigator)) return;

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake lock activated');
    } catch (error) {
      console.warn('Wake lock failed:', error);
    }
  }

  static async release() {
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
      console.log('Wake lock released');
    }
  }

  static enable() {
    this.enabled = true;
  }

  static disable() {
    this.enabled = false;
    this.release();
  }
}

window.WakeLockUtil = WakeLockUtil;