// utils/helpers.js - Funciones de ayuda generales
class HelperUtil {
  static query(selector, parent = document) {
    return parent.querySelector(selector);
  }

  static queryAll(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  static formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}.${ms.toString().padStart(2, '0')}`;
    }
  }

  static downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

window.HelperUtil = HelperUtil;