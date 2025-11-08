
    // === GLOBAL APP CONTROLLER ===
    let currentLanguage = window.TranslationUtil ? TranslationUtil.getLanguage() : 'es';
    let wakeLock = null;
    let audioCtx = null;
    let masterGain = null;

    const t = (key, replacements = {}) => {
      if (window.TranslationUtil) {
        return TranslationUtil.t(key, replacements);
      }
      return key;
    };

    const RPE_CONFIG = {
      emom: {
        placeholder: 'rpe_select_placeholder_emom',
        options: ['rpe_emom_4', 'rpe_emom_5', 'rpe_emom_6', 'rpe_emom_7', 'rpe_emom_8', 'rpe_emom_9', 'rpe_emom_10']
      },
      tabata: {
        placeholder: 'rpe_select_placeholder_tabata',
        options: ['rpe_tabata_6', 'rpe_tabata_7', 'rpe_tabata_8', 'rpe_tabata_9', 'rpe_tabata_10']
      },
      fortime: {
        placeholder: 'rpe_select_placeholder_fortime',
        options: ['rpe_fortime_5', 'rpe_fortime_6', 'rpe_fortime_7', 'rpe_fortime_8', 'rpe_fortime_9', 'rpe_fortime_10']
      },
      amrap: {
        placeholder: 'rpe_select_placeholder_amrap',
        options: ['rpe_amrap_5', 'rpe_amrap_6', 'rpe_amrap_7', 'rpe_amrap_8', 'rpe_amrap_9', 'rpe_amrap_10']
      }
    };

    function populateRpeSelect(selectEl, timerKey, selectedValue = null) {
      if (!selectEl) return;
      const config = RPE_CONFIG[timerKey];
      if (!config) return;
      const valueToSet = selectedValue !== null && selectedValue !== undefined ? selectedValue : selectEl.value;
      let optionsHtml = `<option value="">${t(config.placeholder)}</option>`;
      config.options.forEach(key => {
        optionsHtml += `<option value="${key}">${t(key)}</option>`;
      });
      selectEl.innerHTML = optionsHtml;
      if (valueToSet && config.options.includes(valueToSet)) {
        selectEl.value = valueToSet;
      } else {
        selectEl.value = '';
      }
    }

    function getRpeText(timerKey, rpeKey) {
      if (!rpeKey) return '';
      const config = RPE_CONFIG[timerKey];
      if (!config || !config.options.includes(rpeKey)) return '';
      return t(rpeKey);
    }

    function translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const span = el.querySelector('span');
            if (span && el.classList.contains('add-preset')) {
                // Handle complex button like "+ New Preset"
                const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
                if(textNode) textNode.textContent = t(key);
                const spanWithText = el.querySelector('span[data-i18n]');
                if (spanWithText) spanWithText.textContent = t(spanWithText.dataset.i18n);

            } else {
               el.textContent = t(key);
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = t(key);
        });
        const themeOptions = document.querySelectorAll('#themeSelect option');
        themeOptions.forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (key) option.textContent = t(key);
        });
    }

    function updateAllAppsLanguage() {
      if (window.TranslationUtil) {
        currentLanguage = TranslationUtil.getLanguage();
      }
      translatePage();
      if(EmomApp.initialized) EmomApp.updateLanguage();
      if(TabataApp.initialized) TabataApp.updateLanguage();
      if(ForTimeApp.initialized) ForTimeApp.updateLanguage();
      if(AmrapApp.initialized) AmrapApp.updateLanguage();
    }
    
    function showPage(pageId) {
      document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
      const pageToShow = document.getElementById(pageId);
      if(pageToShow) pageToShow.classList.add('active');
      
      const backBtn = document.getElementById('backBtn');
      const logo = document.querySelector('.header .logo');
      if (pageId === 'home') {
        logo.style.display = 'block';
        backBtn.style.display = 'none';
        if(EmomApp.initialized) EmomApp.resetAll();
        if(TabataApp.initialized) TabataApp.resetAll();
        if(ForTimeApp.initialized) ForTimeApp.resetAll();
        if(AmrapApp.initialized) AmrapApp.resetAll();
      } else {
        logo.style.display = 'none';
        backBtn.style.display = 'flex';
        if (pageId === 'emom') EmomApp.init();
        else if (pageId === 'tabata') TabataApp.init();
        else if (pageId === 'fortime') ForTimeApp.init();
        else if (pageId === 'amrap') AmrapApp.init();
      }
    }

    function openSettings() {
      document.getElementById('settingsModal').classList.add('active');
    }

    function closeSettings() {
      document.getElementById('settingsModal').classList.remove('active');
    }
    
    // === AUDIO SYSTEM ===
    async function ensureAudioContext() {
      if (!audioCtx) {
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { console.error("AudioContext not supported"); return; }
      }
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }
      if (!masterGain && audioCtx) {
        masterGain = audioCtx.createGain();
        masterGain.connect(audioCtx.destination);
        const savedVolume = window.AudioUtil ? AudioUtil.getVolume() : 0.8;
        masterGain.gain.value = savedVolume;
      }
      return audioCtx;
    }

    function playTone({ freq = 440, duration = 0.2, type = 'sine', volume = 0.8 }) {
      ensureAudioContext().then(ctx => {
        if(!ctx || !masterGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration - 0.02);
        osc.connect(gain); gain.connect(masterGain);
        osc.start(); osc.stop(ctx.currentTime + duration + 0.01);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (e) { } };
      }).catch(() => { });
    }

    function playSiren({ startFreq = 800, endFreq = 1400, duration = 0.5, type = 'square', volume = 1.0 }) {
      ensureAudioContext().then(ctx => {
        if(!ctx || !masterGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + duration - 0.02);
        osc.connect(gain); gain.connect(masterGain);
        osc.start(); osc.stop(ctx.currentTime + duration + 0.01);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (e) { } };
      }).catch(() => { });
    }
    function beepShort() { playTone({ freq: 1000, duration: 0.18, type: 'square', volume: 0.95 }); }
    function beepPrep() { playTone({ freq: 800, duration: 0.22, type: 'sine', volume: 0.95 }); }
    let ringDebounce = false;

    function ring() {
      // Solo ejecutar si no está en debounce
      if (ringDebounce) {
        console.log('[RING BLOCKED BY DEBOUNCE]');
        return;
      }

      // Activar bloqueo inmediatamente
      ringDebounce = true;
      console.log('[RING EXECUTED]');

      playTone({ freq: 1200, duration: 0.25, type: 'square', volume: 1.0 });
      setTimeout(() => playTone({ freq: 1200, duration: 0.25, type: 'square', volume: 1.0 }), 300);
      setTimeout(() => playTone({ freq: 1200, duration: 0.4, type: 'square', volume: 1.0 }), 600);

      // Desbloquearse después de 2 segundos
      setTimeout(() => {
        ringDebounce = false;
        console.log('[RING DEBOUNCE RELEASED]');
      }, 2000);
    }
    let victoryAudio = null;
    function victoryBells() {
      if (!victoryAudio) {
        victoryAudio = new Audio('src/sounds/final fanfare.wav');
        victoryAudio.preload = 'auto';
      } else {
        try {
          victoryAudio.pause();
        } catch (e) { /* ignore pause errors */ }
        victoryAudio.currentTime = 0;
      }

      const requestedVolume = (typeof AudioUtil !== 'undefined' && typeof AudioUtil.getVolume === 'function')
        ? AudioUtil.getVolume()
        : 1.0;

      // Boost the victory fanfare relative to other notification tones
      const victoryVolumeMultiplier = 1.5;
      const finalVolume = Math.max(0, Math.min(1, (requestedVolume ?? 1.0) * victoryVolumeMultiplier));
      victoryAudio.volume = finalVolume;

      victoryAudio.play().catch(e => console.warn('Error reproduciendo sonido de victoria:', e));
    }
    
    // === WAKE LOCK ===
    async function requestWakeLock() {
      if (document.getElementById('wakeLockToggle').classList.contains('active') && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (e) { console.log('WakeLock request failed'); }
      }
    }
    function releaseWakeLock() {
      if (wakeLock) {
        wakeLock.release().then(() => { wakeLock = null; });
      }
    }

    // === HELPERS ===
    const EXCEL_HEADERS = {
      emom: ['Date', 'Seconds per Cycle', 'Completed Cycles', 'RPE', 'Total Time (min)', 'Notes'],
      tabata: ['Date', 'Work (sec)', 'Rest (sec)', 'Cycles', 'RPE', 'Total Duration (min)', 'Notes'],
      fortime: ['Date', 'Final Time (MM:SS.ms)', 'Time Cap (min)', 'Total Rounds', 'RPE', 'Notes'],
      amrap: ['Date', 'Duration (min)', 'Completed Rounds', 'RPE', 'Notes']
    };

    const EXCEL_FILE_NAMES = {
      emom: 'Track record EMOM.xls',
      tabata: 'Track record Tabata.xls',
      fortime: 'Track record For Time.xls',
      amrap: 'Track record AMRAP.xls'
    };

    function extraerRPE(notas, rpeKey = null, timerKey = null) {
      if (rpeKey && timerKey) {
        const rpeTexto = getRpeText(timerKey, rpeKey);
        if (rpeTexto) {
          const rpeKeyMatch = rpeTexto.match(/(\d{1,2}\/10)/);
          if (rpeKeyMatch) {
            return rpeKeyMatch[1];
          }
        }
      }

      if (!notas) return 'N/A';

      const rpeMatch = notas.match(/(?:RPE\s)?(\d{1,2}\/10)/i);
      if (rpeMatch) {
        return rpeMatch[1];
      }

      return 'N/A';
    }

    function limpiarNotas(notas) {
      if (!notas) return '';
      return notas.replace(/(?:RPE\s)?(\d{1,2}\/10)/i, '').trim();
    }

    function sanitizeForExport(value) {
      return String(value ?? '').replace(/\r?\n/g, ' ').trim();
    }

    function escapeXml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    function sanitizeSheetName(name) {
      const cleaned = String(name || 'Sheet')
        .replace(/[\\/*?:\[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) return 'Sheet';
      return cleaned.substring(0, 31);
    }

    function buildExcelCell(value) {
      const sanitized = sanitizeForExport(value);
      return `<Cell><Data ss:Type="String">${escapeXml(sanitized)}</Data></Cell>`;
    }

    function getRpeScaleEntries(timerKey) {
      const config = RPE_CONFIG[timerKey];
      if (!config) return [];

      return config.options.map(key => {
        const translated = sanitizeForExport(t(key));
        const valueMatch = translated.match(/(\d{1,2}\/10)/);
        const rawValue = valueMatch ? valueMatch[1] : translated;
        let description = translated;

        if (valueMatch) {
          const split = translated.split(valueMatch[1]);
          if (split.length > 1) {
            description = split.slice(1).join(valueMatch[1]);
          }
          description = description.replace(/^[-–—:\s]+/, '').trim();
        }

        if (!description || description === rawValue) {
          description = translated;
        }

        const value = rawValue.replace(/^RPE\s*/i, '').trim();

        return {
          value,
          description
        };
      });
    }

    function buildExcelWorkbook(timerKey, headers, rows) {
      const historySheetName = sanitizeSheetName(t('workout_history') || 'History');
      const rpeSheetName = 'RPE Scale';
      const rpeHeaderValue = t('rpe_scale_header_rpe') || 'RPE';
      const rpeHeaderDescription = t('rpe_scale_header_description') || 'Description';
      const rpeEntries = getRpeScaleEntries(timerKey);

      const historyHeaderRow = `<Row>${headers.map(buildExcelCell).join('')}</Row>`;
      const historyRows = rows
        .map(row => `<Row>${row.map(buildExcelCell).join('')}</Row>`)
        .join('');

      const rpeHeaderRow = `<Row>${buildExcelCell(rpeHeaderValue)}${buildExcelCell(rpeHeaderDescription)}</Row>`;
      const rpeRows = rpeEntries
        .map(entry => `<Row>${buildExcelCell(entry.value)}${buildExcelCell(entry.description)}</Row>`)
        .join('');

      return [
        '<?xml version="1.0"?>',
        '<?mso-application progid="Excel.Sheet"?>',
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">',
        `<Worksheet ss:Name="${escapeXml(historySheetName)}">`,
        '<Table>',
        historyHeaderRow,
        historyRows,
        '</Table>',
        '</Worksheet>',
        `<Worksheet ss:Name="${escapeXml(rpeSheetName)}">`,
        '<Table>',
        rpeHeaderRow,
        rpeRows,
        '</Table>',
        '</Worksheet>',
        '</Workbook>'
      ].join('');
    }

    function downloadCSV(csvContent, filename) {
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    // === EMOM APP LOGIC ===
    const EmomApp = {
      // State
      cycleSeconds: 60, targetCycles: null, prepInterval: null, running: false,
      paused: false, inPrep: false, remaining: 60, cycles: 0, lastAnnouncedSecond: null,
      startTime: 0, pauseTime: 0, pausedDuration: 0, animationFrameId: null,
      currentWorkout: null, editingPresetIndex: -1, initialized: false, workoutViewActive: false,
      
      // DOM Elements
      els: {},

      init() {
        if(this.initialized) return;
        this.cacheDOMElements();
        this.setupEventListeners();
        this.loadSettingsFromLocalStorage();
        this.renderPresets();
        this.loadHistory();
        this.updateUI();
        this.initialized = true;
      },
      
      cacheDOMElements() {
        const ids = ['app', 'secInput', 'targetInput', 'status', 'prep', 'timer', 'startBtn', 'pauseBtn', 'resumeBtn', 'resetBtn', 'cycles', 'progress', 'presetsContainer', 'addPresetBtn', 'quick', 'tabs-nav', 'timer-tab', 'presets-tab', 'history-tab', 'presetsList', 'historyList', 'totalWorkouts', 'totalCycles', 'clearHistoryBtn', 'exportHistoryBtn', 'presetModal', 'presetModalTitle', 'presetName', 'presetSeconds', 'presetCycles', 'savePreset', 'notesModal', 'rpeSelect', 'workoutNotes', 'skipNotes', 'saveNotes', 'completionModal', 'completionStats', 'shareResult', 'addNotesBtn', 'toggleWorkoutViewBtn'];
        ids.forEach(id => this.els[id] = document.getElementById(`emom_${id}`));
        this.els.tabBtns = Array.from(document.querySelectorAll('#emom_tabs-nav .tab-btn'));
        this.els.tabContents = Array.from(document.querySelectorAll('#emom_app .tab-content'));
        this.els.quickBtns = Array.from(document.querySelectorAll('#emom_quick button'));
        this.els.modalCloseBtns = document.querySelectorAll('#emom_presetModal [data-modal-close], #emom_notesModal [data-modal-close], #emom_completionModal [data-modal-close]');
        this.els.modalCancelBtns = document.querySelectorAll('#emom_presetModal [data-modal-cancel]');
         // Shared workout view elements
        this.els.workoutView = document.getElementById('workoutView');
        this.els.workoutClose = document.getElementById('workoutClose');
        this.els.workoutTimer = document.getElementById('workoutTimer');
        this.els.workoutPrep = document.getElementById('workoutPrep');
        this.els.workoutPauseBtn = document.getElementById('workoutPauseBtn');
        this.els.workoutProgress = document.getElementById('workoutProgress');
        populateRpeSelect(this.els.rpeSelect, 'emom');
      },

      setupEventListeners() {
        this.els.tabBtns.forEach(btn => btn.addEventListener('click', () => this.handleTabClick(btn)));
        this.els.quickBtns.forEach(btn => btn.addEventListener('click', () => this.applyCycleSeconds(parseInt(btn.dataset.quick, 10))));
        this.els.secInput.addEventListener('input', () => this.handleSecInputTyping());
        this.els.secInput.addEventListener('blur', () => this.handleSecInputBlur());
        this.els.targetInput.addEventListener('input', () => this.handleTargetInputChange());
        this.els.targetInput.addEventListener('blur', () => {
            const val = parseInt(this.els.targetInput.value, 10);
            if (val <= 0) {
                this.els.targetInput.value = '';
                this.handleTargetInputChange();
            } else if (!isNaN(val)) {
                this.els.targetInput.value = val;
                this.handleTargetInputChange();
            }
        });
        this.els.startBtn.addEventListener('click', () => this.start());
        this.els.pauseBtn.addEventListener('click', () => this.pause());
        this.els.resumeBtn.addEventListener('click', () => this.resumeWithPrep(this.els.prep, this.els.timer));
        this.els.resetBtn.addEventListener('click', () => this.resetAll());
        this.els.toggleWorkoutViewBtn.addEventListener('click', () => this.openWorkoutView());
        this.els.addPresetBtn.addEventListener('click', () => this.openPresetModal());
        this.els.savePreset.addEventListener('click', () => this.savePreset());
        this.els.skipNotes.addEventListener('click', () => this.handleSkipNotes());
        this.els.saveNotes.addEventListener('click', () => this.handleSaveNotes());
        this.els.shareResult.addEventListener('click', () => this.shareResult());
        this.els.addNotesBtn.addEventListener('click', () => this.openNotesFromCompletion());
        this.els.modalCloseBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        this.els.modalCancelBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        this.els.workoutClose.addEventListener('click', () => { if (this.workoutViewActive && EmomApp.running) this.closeWorkoutView() });
        this.els.workoutPauseBtn.addEventListener('click', () => { if (this.workoutViewActive && EmomApp.running) this.handleWorkoutPause() });

        
        this.els.app.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const { action, id, index } = target.dataset;

            switch(action) {
                case 'apply-preset':
                    this.applyPreset(parseInt(index, 10));
                    break;
                case 'delete-preset':
                    e.stopPropagation();
                    if (confirm(t('confirm_delete_preset'))) this.deletePreset(parseInt(index, 10));
                    break;
                case 'edit-preset':
                    this.openPresetModal(parseInt(index, 10));
                    break;
                case 'clear-history':
                    this.clearHistory();
                    break;
                case 'export-history':
                    this.exportHistory();
                    break;
                case 'edit-history':
                    this.openNotesModal(parseInt(id, 10));
                    break;
                case 'share-history':
                    this.shareWorkout(parseInt(id, 10));
                    break;
                case 'delete-history':
                    if (confirm(t('confirm_delete_history'))) this.deleteWorkout(parseInt(id, 10));
                    break;
            }
        });
      },
      
      updateLanguage() {
        this.updateUI();
        this.renderPresets();
        populateRpeSelect(this.els.rpeSelect, 'emom');
        this.loadHistory();
      },

      handleTabClick(btn) {
        const targetTab = btn.dataset.tab;
        this.els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.els.tabContents.forEach(content => {
          content.classList.toggle('active', content.id === `emom_${targetTab}-tab`);
        });
        if (targetTab === 'history') this.loadHistory();
        else if (targetTab === 'presets') this.renderPresets();
      },

      applyCycleSeconds(n) {
        if (isNaN(n)) return;
        this.cycleSeconds = Math.max(10, Math.min(999, n));
        this.els.secInput.value = this.cycleSeconds;
        this.els.quickBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.quick) === this.cycleSeconds));
        if (!this.running || this.paused) {
          this.remaining = this.cycleSeconds;
          this.updateUI();
        }
      },

      handleSecInputTyping() {
        let value = parseInt(this.els.secInput.value, 10);

        if (!isNaN(value)) {
            this.cycleSeconds = value;
            this.els.quickBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.quick) === this.cycleSeconds));
            if (!this.running || this.paused) {
                this.remaining = this.cycleSeconds;
                this.updateUI();
            }
        }
      },

      handleSecInputBlur() {
        let value = parseInt(this.els.secInput.value, 10);
        if (isNaN(value) || value < 10) {
            value = this.cycleSeconds > 10 ? this.cycleSeconds : 60; 
        }
        this.applyCycleSeconds(value);
      },

      handleTargetInputChange() {
        let value = this.els.targetInput.value.replace(/[^0-9]/g, '');
        this.targetCycles = value === '' ? null : parseInt(value, 10);
        this.updateUI();
      },
      
      updateUI() {
        this.els.timer.textContent = this.remaining;
        this.els.cycles.textContent = t('completed_cycles') + ' ' + this.cycles;
        if (this.targetCycles > 0) {
          this.els.progress.textContent = `${t('progress')} ${this.cycles}/${this.targetCycles}`;
          this.els.progress.style.color = this.cycles >= this.targetCycles ? 'var(--success)' : 'var(--muted-text)';
        } else {
          this.els.progress.textContent = '';
        }
        if(this.workoutViewActive) this.updateWorkoutView();
      },
      
      setStatus(statusKey, className) {
        this.els.status.textContent = t(statusKey);
        this.els.status.className = `status ${className}`;
      },

      async start() {
        await ensureAudioContext();
        await requestWakeLock();
        if (this.running && !this.paused) return;
        this.handleSecInputBlur(); // Ensure the value is validated before starting
        this.remaining = this.cycleSeconds;
        this.cycles = 0;
        this.updateUI();
        this.startPreparation(this.els.prep, this.els.timer, () => {
          this.startCycleTick();
          this.openWorkoutView();
        });
        this.els.startBtn.disabled = true;
        this.els.resumeBtn.disabled = true;
        this.els.pauseBtn.disabled = false;
        this.els.toggleWorkoutViewBtn.style.display = 'inline-block';
      },
      
      pause() {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.pauseTime = performance.now();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.prepInterval = null;
        this.setStatus('paused', 'paused');
        releaseWakeLock();
        this.els.resumeBtn.disabled = false;
        this.els.startBtn.disabled = true;
        this.els.pauseBtn.disabled = true;
        this.updateUI();
      },
      
      async resume() {
        if (!this.running || !this.paused) return;
        await ensureAudioContext();
        await requestWakeLock();
        this.paused = false;
        this.pausedDuration += performance.now() - this.pauseTime;
        this.animationFrameId = requestAnimationFrame(() => this.tick());
        this.setStatus('training', 'running');
        this.els.resumeBtn.disabled = true;
        this.els.pauseBtn.disabled = false;
      },
      
      resetAll() {
        this.closeWorkoutView();
        this.running = false; this.paused = false; this.inPrep = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.animationFrameId = null; this.prepInterval = null;
        releaseWakeLock();
        this.cycles = 0; 
        this.remaining = this.cycleSeconds; 
        this.els.prep.style.display = 'none'; 
        this.els.timer.style.display = 'block';
        this.setStatus('ready', 'idle');
        this.els.resumeBtn.disabled = true; 
        this.els.startBtn.disabled = false; 
        this.els.pauseBtn.disabled = true;
        this.els.toggleWorkoutViewBtn.style.display = 'none';
        this.updateUI();
      },
      
      startPreparation(prepEl, timerEl, nextAction) {
        this.inPrep = true;
        prepEl.style.display = 'block';
        timerEl.style.display = 'none';
        this.setStatus('preparing', 'ready');
        let prep = 5;
        prepEl.textContent = prep;
        beepPrep();
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.prepInterval = setInterval(() => {
          prep--;
          if (prep <= 0) {
            clearInterval(this.prepInterval);
            this.prepInterval = null;
            setTimeout(() => {
              this.inPrep = false;
              prepEl.style.display = 'none';
              timerEl.style.display = 'block';
              ring();
              setTimeout(() => {
                nextAction();
              }, 250);
            }, 250);
          } else {
            prepEl.textContent = prep;
            beepPrep();
          }
        }, 1000);
      },
      
      startCycleTick() {
        this.setStatus('training', 'running');
        this.running = true; this.paused = false;
        this.startTime = performance.now();
        this.pausedDuration = 0;
        this.lastAnnouncedSecond = null;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(() => this.tick());
      },
      
      tick() {
        if (!this.running || this.paused || this.inPrep) return;

        const elapsedMs = performance.now() - this.startTime - this.pausedDuration;
        const cycleDurationMs = this.cycleSeconds * 1000;

        const newCycles = Math.floor(elapsedMs / cycleDurationMs);
        if (newCycles > this.cycles) {
          this.cycles = newCycles;
          const reachedTarget = this.targetCycles && this.cycles >= this.targetCycles;
          if (reachedTarget) {
            this.completeWorkout();
            return;
          }
          ring();
        }
        
        const elapsedInCycle = elapsedMs % cycleDurationMs;
        const newRemaining = this.cycleSeconds - Math.floor(elapsedInCycle / 1000);

        if(this.remaining !== newRemaining) {
            this.remaining = newRemaining;
            this.updateUI();
        }

        if (this.remaining <= 5 && this.remaining > 0 && this.lastAnnouncedSecond !== this.remaining) {
          beepShort();
          this.lastAnnouncedSecond = this.remaining;
        } else if (this.remaining > 5) {
          this.lastAnnouncedSecond = null;
        }

        this.animationFrameId = requestAnimationFrame(() => this.tick());
      },
      
      completeWorkout() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        releaseWakeLock();
        this.setStatus('workout_complete_status', 'completed');
        victoryBells();
        this.saveWorkout({ cycles: this.cycles, secondsPerCycle: this.cycleSeconds, totalTime: this.cycles * this.cycleSeconds });
        this.closeWorkoutView();
        if (this.currentWorkout) {
          this.els.workoutNotes.value = this.currentWorkout.notes || '';
          populateRpeSelect(this.els.rpeSelect, 'emom', this.currentWorkout.rpe || null);
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
        setTimeout(() => this.els.notesModal.classList.add('active'), 1000);
        setTimeout(() => this.resetAll(), 1200);
      },

      // Workout View
      openWorkoutView() {
        this.workoutViewActive = true;
        // Configure for EMOM
        document.getElementById('workoutStatus').style.display = 'none';
        document.getElementById('workoutLapBtn').style.display = 'none';
        document.getElementById('workoutLapsList').parentElement.style.display = 'none';
        this.els.workoutProgress.style.display = 'block';
        this.els.workoutTimer.classList.remove('fortime');
        this.els.workoutTimer.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

        this.els.workoutView.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.updateWorkoutView();
      },
      closeWorkoutView() {
        this.workoutViewActive = false;
        this.els.workoutView.classList.remove('active');
        document.body.style.overflow = '';
      },
      updateWorkoutView() {
        if (!this.workoutViewActive) return;
        this.els.workoutTimer.textContent = this.remaining;
        
        if (this.targetCycles > 0) {
          this.els.workoutProgress.textContent = `${t('cycles')} ${this.cycles}/${this.targetCycles}`;
        } else {
          this.els.workoutProgress.textContent = `${t('completed_cycles')} ${this.cycles}`;
        }

        if (this.paused) {
          this.els.workoutPauseBtn.textContent = t('resume');
          this.els.workoutPauseBtn.className = 'workout-btn resume';
        } else {
          this.els.workoutPauseBtn.textContent = t('pause');
          this.els.workoutPauseBtn.className = 'workout-btn pause';
        }
        this.els.workoutPauseBtn.disabled = !this.running;
      },
      handleWorkoutPause() {
        if (this.paused) {
          this.resumeWithPrep(this.els.workoutPrep, this.els.workoutTimer);
        } else {
          this.pause();
        }
      },
      resumeWithPrep(prepEl, timerEl) {
        this.startPreparation(prepEl, timerEl, () => this.resume());
      },
      
      // Presets
      getPresets() { return JSON.parse(localStorage.getItem('emom_presets') || '[]'); },
      savePresets(presets) { localStorage.setItem('emom_presets', JSON.stringify(presets)); },
      renderPresets() {
        const presets = this.getPresets();
        // Clear only the user presets, not the "add new" button if it were here
        this.els.presetsContainer.innerHTML = '';
        presets.forEach((preset, index) => {
          const btn = document.createElement('button');
          btn.className = 'preset-btn';
          btn.dataset.action = 'apply-preset';
          btn.dataset.index = index;
          btn.innerHTML = `${preset.name} <button class="preset-delete" data-action="delete-preset" data-index="${index}">×</button>`;
          this.els.presetsContainer.appendChild(btn);
        });
        this.loadPresetsList();
      },
      applyPreset(index) {
          const presets = this.getPresets();
          if (!presets[index]) return;
          const preset = presets[index];
          this.applyCycleSeconds(preset.seconds);
          this.els.targetInput.value = preset.cycles || '';
          this.handleTargetInputChange();
      },
      deletePreset(index) {
          let presets = this.getPresets();
          presets.splice(index, 1);
          this.savePresets(presets);
          this.renderPresets();
      },
      loadPresetsList() {
        const presets = this.getPresets();
        if (presets.length === 0) {
          this.els.presetsList.innerHTML = `<div class="empty-history">${t('no_presets')}</div>`;
          return;
        }
        this.els.presetsList.innerHTML = presets.map((p, i) => `
          <div class="history-item">
            <div class="history-performance">${p.name}</div>
            <div class="history-details">${p.seconds}s ${t('seconds_per_cycle_short')} ${p.cycles ? `• ${p.cycles} ${t('target_cycles_short')}`: `• ${t('leave_empty_unlimited')}`}</div>
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-preset" data-index="${i}">${t('edit')}</button>
              <button class="history-btn delete" data-action="delete-preset" data-index="${i}">${t('delete')}</button>
            </div>
          </div>`).join('');
      },
      openPresetModal(index = -1) {
        this.editingPresetIndex = index;
        const presets = this.getPresets();
        if (index > -1 && presets[index]) {
          const p = presets[index];
          this.els.presetModalTitle.textContent = t('edit_preset_title');
          this.els.presetName.value = p.name;
          this.els.presetSeconds.value = p.seconds;
          this.els.presetCycles.value = p.cycles || '';
        } else {
          this.els.presetModalTitle.textContent = t('new_preset_title');
          this.els.presetName.value = '';
          this.els.presetSeconds.value = this.cycleSeconds;
          this.els.presetCycles.value = this.targetCycles || '';
        }
        this.els.presetModal.classList.add('active');
      },
      savePreset() {
        const name = this.els.presetName.value.trim();
        const seconds = parseInt(this.els.presetSeconds.value);
        const cycles = this.els.presetCycles.value ? parseInt(this.els.presetCycles.value) : null;
        if (!name || !seconds || seconds < 10) { alert(t('alert_fill_fields')); return; }
        
        const presets = this.getPresets();
        const newPreset = { name, seconds, cycles };

        if (this.editingPresetIndex > -1) {
          presets[this.editingPresetIndex] = newPreset;
        } else {
          presets.push(newPreset);
        }
        this.savePresets(presets);
        this.renderPresets();
        this.closeAllModals();
      },
      
      // History
      getHistory() { return JSON.parse(localStorage.getItem('emom_history') || '[]'); },
      saveHistory(history) { localStorage.setItem('emom_history', JSON.stringify(history)); },
      loadHistory() {
        const history = this.getHistory();
        this.els.totalWorkouts.textContent = history.length;
        this.els.totalCycles.textContent = history.reduce((sum, w) => sum + (w.cycles || 0), 0);
        if (history.length === 0) {
          this.els.historyList.innerHTML = `<div class="empty-history">${t('no_history')}</div>`;
          return;
        }
        this.els.historyList.innerHTML = history.map(w => {
          const date = new Date(w.date);
          const duration = Math.floor((w.totalTime) / 60);
          const rpeText = getRpeText('emom', w.rpe);
          return `
          <div class="history-item">
            <div class="history-date">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="history-performance">${w.cycles} cycles × ${w.secondsPerCycle}s</div>
            <div class="history-details">${duration}min workout</div>
            ${rpeText ? `<div class="history-notes">${t('history_rpe_entry', { rpe: rpeText })}</div>` : ''}
            ${w.notes ? `<div class="history-notes">"${w.notes}"</div>` : ''}
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-history" data-id="${w.id}">${t('edit')}</button>
              <button class="history-btn share" data-action="share-history" data-id="${w.id}">${t('share')}</button>
              <button class="history-btn delete" data-action="delete-history" data-id="${w.id}">${t('delete')}</button>
            </div>
          </div>`;
        }).join('');
      },
      clearHistory() {
        if (confirm(t('confirm_clear_history'))) {
          this.saveHistory([]);
          this.loadHistory();
        }
      },
      exportHistory() {
        const history = this.getHistory();
        if (history.length === 0) return;

        const head = EXCEL_HEADERS.emom;
        const rows = history.map(w => {
          const date = new Date(w.date).toLocaleDateString('en-US');
          const secondsPerCycle = w.secondsPerCycle;
          const completedCycles = w.cycles;
          const rpe = extraerRPE(w.notes, w.rpe, 'emom');
          const totalMinutes = Math.floor((w.totalTime || 0) / 60);
          const notes = limpiarNotas(w.notes);

          return [date, secondsPerCycle, completedCycles, rpe, totalMinutes, notes];
        });

        const workbook = buildExcelWorkbook('emom', head, rows);
        downloadCSV(workbook, EXCEL_FILE_NAMES.emom);
      },
      saveWorkout(data, notes = '', rpe = null) {
        const workout = { id: Date.now(), date: new Date().toISOString(), ...data, notes, rpe };
        let history = this.getHistory();
        history.unshift(workout);
        if (history.length > 50) history.pop();
        this.saveHistory(history);
        this.currentWorkout = workout;
      },
      updateWorkoutNotes(id, notes, rpe = null) {
        const cleanedRpe = rpe || null;
        let history = this.getHistory();
        const workout = history.find(w => w.id === id);
        if (workout) {
          workout.notes = notes;
          workout.rpe = cleanedRpe;
          this.saveHistory(history);
          this.loadHistory();
        }
        if (this.currentWorkout && this.currentWorkout.id === id) {
          this.currentWorkout.notes = notes;
          this.currentWorkout.rpe = cleanedRpe;
        }
      },
      deleteWorkout(id) {
          let history = this.getHistory();
          history = history.filter(w => w.id !== id);
          this.saveHistory(history);
          this.loadHistory();
      },
      
      // Modals
      closeAllModals() {
        document.querySelectorAll('#emom_presetModal, #emom_notesModal, #emom_completionModal').forEach(m => m.classList.remove('active'));
        if (this.els.notesModal) {
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
      },
      handleSkipNotes() {
        this.closeAllModals();
        if (this.currentWorkout) this.showCompletionModal();
      },
      handleSaveNotes() {
        const notes = this.els.workoutNotes.value.trim();
        const rpeValue = this.els.rpeSelect.value || null;
        const workoutId = parseInt(this.els.notesModal.getAttribute('data-workout-id'));
        if (workoutId) {
          this.updateWorkoutNotes(workoutId, notes, rpeValue);
        } else if (this.currentWorkout) {
          this.updateWorkoutNotes(this.currentWorkout.id, notes, rpeValue);
        }
        this.closeAllModals();
        if (this.currentWorkout && !workoutId) {
          this.showCompletionModal();
        }
      },
      openNotesModal(id) {
          const workout = this.getHistory().find(w => w.id === id);
          if (!workout) return;
          populateRpeSelect(this.els.rpeSelect, 'emom', workout.rpe || null);
          this.els.workoutNotes.value = workout.notes || '';
          this.els.notesModal.setAttribute('data-workout-id', id);
          this.els.notesModal.classList.add('active');
      },
      showCompletionModal() {
        if (!this.currentWorkout) return;
        const duration = Math.floor(this.currentWorkout.totalTime / 60);
        this.els.completionStats.innerHTML = `
          <div class="completion-stat"><strong>${this.currentWorkout.cycles}</strong> cycles completed</div>
          <div class="completion-stat"><strong>${this.currentWorkout.secondsPerCycle}s</strong> per cycle</div>
          <div class="completion-stat"><strong>${duration} minutes</strong> total workout</div>`;
        this.els.completionModal.classList.add('active');
      },
      openNotesFromCompletion() {
        if (!this.currentWorkout) return;
        this.closeAllModals();
        this.els.workoutNotes.value = this.currentWorkout?.notes || '';
        populateRpeSelect(this.els.rpeSelect, 'emom', this.currentWorkout?.rpe || null);
        this.els.notesModal.setAttribute('data-workout-id', this.currentWorkout.id);
        this.els.notesModal.classList.add('active');
      },
      shareResult() {
        if (!this.currentWorkout) return;
        this.shareWorkout(this.currentWorkout.id);
      },
      shareWorkout(id) {
          const workout = this.getHistory().find(w => w.id === id);
          if (!workout) return;
          const date = new Date(workout.date).toLocaleDateString();
          const duration = Math.floor(workout.totalTime / 60);
          const notesText = workout.notes ? `\n\nNotes: ${workout.notes}` : '';
          const text = t('share_text_emom', {
            cycles: workout.cycles,
            seconds: workout.secondsPerCycle,
            duration: duration,
            date: date,
            notes: notesText
          });
          if (navigator.share) {
            navigator.share({ title: 'EMOM Workout Complete!', text });
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => alert(t('alert_copied')));
          }
      },
      
      loadSettingsFromLocalStorage() {
        this.applyCycleSeconds(localStorage.getItem('emom_cycleSeconds') || 60);
        this.els.targetInput.value = localStorage.getItem('emom_targetCycles') || '';
        this.handleTargetInputChange();
      },
    };

    // === TABATA APP LOGIC ===
    const TabataApp = {
      workTime: 20, restTime: 10, totalCycles: 8,
      mode: 'idle', // 'prep', 'work', 'rest', 'paused', 'completed'
      currentCycle: 0, timeRemaining: 20,
      running: false, paused: false, prepInterval: null,
      animationFrameId: null, startTime: 0, pauseTime: 0, pausedDuration: 0,
      lastAnnouncedSecond: null, editingPresetIndex: -1,
      lastModeBeforePause: null,
      currentWorkout: null,
      history: [], customPresets: [], initialized: false,
      workoutViewActive: false,
      els: {},

      init() {
        if(this.initialized) return;
        this.cacheDOMElements();
        this.history = JSON.parse(localStorage.getItem('tabata_history') || '[]');
        this.customPresets = JSON.parse(localStorage.getItem('tabata_presets') || '[]');
        this.setupEventListeners();
        this.updateUI();
        this.renderCustomPresets();
        this.loadHistory();
        this.initialized = true;
      },
      
      cacheDOMElements() {
        const ids = ['app', 'timer', 'prep', 'status', 'progress', 'workInput', 'restInput', 'cyclesInput', 'startBtn', 'pauseBtn', 'resumeBtn', 'resetBtn', 'tabs-nav', 'timer-tab', 'presets-tab', 'history-tab', 'presetsContainer', 'addPresetBtn', 'quick', 'presetsList', 'historyList', 'totalWorkouts', 'totalCycles', 'clearHistoryBtn', 'exportHistoryBtn', 'presetModal', 'presetModalTitle', 'presetName', 'presetWork', 'presetRest', 'presetCycles', 'savePreset', 'notesModal', 'rpeSelect', 'workoutNotes', 'skipNotes', 'saveNotes', 'completionModal', 'completionStats', 'shareResult', 'addNotesBtn', 'toggleWorkoutViewBtn'];
        ids.forEach(id => this.els[id] = document.getElementById(`tabata_${id}`));
        this.els.tabBtns = Array.from(document.querySelectorAll('#tabata_tabs-nav .tab-btn'));
        this.els.tabContents = Array.from(document.querySelectorAll('#tabata_app .tab-content'));
        this.els.quickBtns = Array.from(document.querySelectorAll('#tabata_quick button'));
        this.els.modalCloseBtns = document.querySelectorAll('#tabata_presetModal [data-modal-close], #tabata_notesModal [data-modal-close], #tabata_completionModal [data-modal-close]');
        this.els.modalCancelBtns = document.querySelectorAll('#tabata_presetModal [data-modal-cancel]');
         // Shared workout view elements
        this.els.workoutView = document.getElementById('workoutView');
        this.els.workoutClose = document.getElementById('workoutClose');
        this.els.workoutTimer = document.getElementById('workoutTimer');
        this.els.workoutPrep = document.getElementById('workoutPrep');
        this.els.workoutPauseBtn = document.getElementById('workoutPauseBtn');
        this.els.workoutProgress = document.getElementById('workoutProgress');
        this.els.workoutStatus = document.getElementById('workoutStatus');
        populateRpeSelect(this.els.rpeSelect, 'tabata');
      },

      setupEventListeners() {
        this.els.tabBtns.forEach(btn => btn.addEventListener('click', () => this.handleTabClick(btn)));
        this.els.quickBtns.forEach(btn => btn.addEventListener('click', () => this.applyQuickPreset(btn)));
        ['workInput', 'restInput', 'cyclesInput'].forEach(key => {
            this.els[key].addEventListener('input', () => this.updateValues());
            this.els[key].addEventListener('blur', () => this.validateTabataInputs());
        });
        this.els.startBtn.addEventListener('click', () => this.start());
        this.els.pauseBtn.addEventListener('click', () => this.pause());
        this.els.resumeBtn.addEventListener('click', () => this.resumeWithPrep(this.els.prep, this.els.timer));
        this.els.resetBtn.addEventListener('click', () => this.resetAll());
        this.els.toggleWorkoutViewBtn.addEventListener('click', () => this.openWorkoutView());
        this.els.addPresetBtn.addEventListener('click', () => this.openPresetModal());
        this.els.savePreset.addEventListener('click', () => this.savePreset());
        this.els.skipNotes.addEventListener('click', () => this.handleSkipNotes());
        this.els.saveNotes.addEventListener('click', () => this.handleSaveNotes());
        this.els.shareResult.addEventListener('click', () => this.shareResult());
        this.els.addNotesBtn.addEventListener('click', () => this.openNotesFromCompletion());
        this.els.modalCloseBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        this.els.modalCancelBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        this.els.workoutClose.addEventListener('click', () => { if (this.workoutViewActive && TabataApp.running) this.closeWorkoutView() });
        this.els.workoutPauseBtn.addEventListener('click', () => { if (this.workoutViewActive && TabataApp.running) this.handleWorkoutPause() });
        
        this.els.app.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;

            const { action, id, index } = target.dataset;

            switch(action) {
                case 'apply-preset':
                    this.applyPreset(parseInt(index, 10));
                    break;
                case 'delete-preset':
                    e.stopPropagation();
                    if (confirm(t('confirm_delete_preset'))) this.deletePreset(parseInt(index, 10));
                    break;
                case 'edit-preset':
                    this.openPresetModal(parseInt(index, 10));
                    break;
                case 'clear-history':
                    this.clearHistory();
                    break;
                case 'export-history':
                    this.exportHistory();
                    break;
                case 'edit-history':
                    this.openNotesModal(parseInt(id, 10));
                    break;
                case 'share-history':
                    this.shareWorkout(parseInt(id, 10));
                    break;
                case 'delete-history':
                    if (confirm(t('confirm_delete_history'))) this.deleteWorkout(parseInt(id, 10));
                    break;
            }
        });
      },

      validateTabataInputs() {
        let workVal = parseInt(this.els.workInput.value, 10);
        this.els.workInput.value = (!isNaN(workVal) && workVal > 0) ? workVal : 20;

        let restVal = parseInt(this.els.restInput.value, 10);
        this.els.restInput.value = (!isNaN(restVal) && restVal >= 0) ? restVal : 10;

        let cyclesVal = parseInt(this.els.cyclesInput.value, 10);
        this.els.cyclesInput.value = (!isNaN(cyclesVal) && cyclesVal > 0) ? cyclesVal : 8;
        
        this.updateValues();
      },
      
      updateLanguage() {
        this.updateUI();
        this.renderCustomPresets();
        populateRpeSelect(this.els.rpeSelect, 'tabata');
        this.loadHistory();
      },

      handleTabClick(btn) {
        const targetTab = btn.dataset.tab;
        this.els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.els.tabContents.forEach(content => {
          content.classList.toggle('active', content.id === `tabata_${targetTab}-tab`);
        });
        if (targetTab === 'history') this.loadHistory();
        else if (targetTab === 'presets') this.renderCustomPresets();
      },
      
      applyQuickPreset(btn) {
        const presetStr = btn.dataset.preset;
        const [work, rest, cycles] = presetStr.split('-').map(Number);
        this.els.workInput.value = work;
        this.els.restInput.value = rest;
        this.els.cyclesInput.value = cycles;
        this.updateValues();
        document.querySelectorAll('#tabata_app .preset-btn, #tabata_app .quick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      },
      
      updateValues() {
        this.workTime = parseInt(this.els.workInput.value) || 20;
        this.restTime = parseInt(this.els.restInput.value) || 10;
        this.totalCycles = parseInt(this.els.cyclesInput.value) || 8;
        if (!this.running) {
          this.timeRemaining = this.workTime;
          this.updateUI();
        }
      },
      
      updateUI() {
        this.els.timer.textContent = this.timeRemaining;
        this.els.progress.textContent = `${t('progress').replace(':', '')} ${this.currentCycle}/${this.totalCycles}`;
        
        const statusMap = {
          idle: { key: 'ready', class: 'idle' },
          prep: { key: 'preparing', class: 'ready' },
          work: { key: 'status_work', class: 'running' },
          rest: { key: 'status_rest', class: 'paused' },
          paused: { key: 'paused', class: 'paused' },
          completed: { key: 'workout_complete_status', class: 'completed' },
        };
        const newStatus = statusMap[this.mode] || statusMap.idle;
        this.setStatus(newStatus.key, newStatus.class);

        if (this.workoutViewActive) this.updateWorkoutView();
      },
      
      setStatus(statusKey, className) {
        this.els.status.textContent = t(statusKey);
        this.els.status.className = `status ${className}`;
      },
      
      async start() {
        await ensureAudioContext();
        await requestWakeLock();
        this.updateValues();
        this.currentCycle = 0;
        this.timeRemaining = this.workTime;
        this.running = true;
        this.paused = false;
        this.lastModeBeforePause = null;
        this.els.startBtn.disabled = true;
        this.els.pauseBtn.disabled = false;
        this.els.resumeBtn.disabled = true;
        this.els.toggleWorkoutViewBtn.style.display = 'inline-block';
        this.updateUI();
        this.startPreparation(this.els.prep, this.els.timer, 'work', () => {
          this.startTiming();
          this.openWorkoutView();
        });
      },
      
      pause() {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.pauseTime = performance.now();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.animationFrameId = null; this.prepInterval = null;
        this.lastModeBeforePause = this.mode;
        this.mode = 'paused';
        this.updateUI();
        releaseWakeLock();
        this.els.resumeBtn.disabled = false;
        this.els.startBtn.disabled = true;
        this.els.pauseBtn.disabled = true;
      },
      
      async resume() {
        if (!this.running || !this.paused) return;
        await ensureAudioContext();
        await requestWakeLock();
        this.paused = false;
        this.pausedDuration += performance.now() - this.pauseTime;
        this.animationFrameId = requestAnimationFrame(() => this.tick());
        this.updateUI();
        this.els.resumeBtn.disabled = true;
        this.els.pauseBtn.disabled = false;
      },
      
      resetAll() {
        this.closeWorkoutView();
        this.running = false; this.paused = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.animationFrameId = null; this.prepInterval = null;
        releaseWakeLock();
        this.mode = 'idle';
        this.currentCycle = 0;
        this.lastModeBeforePause = null;
        this.updateValues();
        this.els.prep.style.display = 'none';
        this.els.timer.style.display = 'block';
        this.updateUI();
        this.els.startBtn.disabled = false;
        this.els.pauseBtn.disabled = true;
        this.els.resumeBtn.disabled = true;
        this.els.toggleWorkoutViewBtn.style.display = 'none';
      },
      
      startPreparation(prepEl, timerEl, nextMode, nextAction) {
        this.mode = 'prep';
        this.updateUI();
        prepEl.style.display = 'block';
        timerEl.style.display = 'none';
        let prep = 5;
        prepEl.textContent = prep;
        beepPrep();
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.prepInterval = setInterval(() => {
          prep--;
          if (prep <= 0) {
            clearInterval(this.prepInterval);
            this.prepInterval = null;
            setTimeout(() => {
              prepEl.style.display = 'none';
              timerEl.style.display = 'block';
              ring();
              setTimeout(() => {
                nextAction();
              }, 250);
            }, 250);
          } else {
            prepEl.textContent = prep;
            beepPrep();
          }
        }, 1000);
      },

      applyPendingModeAfterPrep(defaultMode = 'work') {
        const targetMode = this.pendingModeAfterPrep || defaultMode;
        this.mode = targetMode;
        this.pendingModeAfterPrep = null;
        this.updateUI();
      },

      startTiming() {
        this.startTime = performance.now();
        this.pausedDuration = 0;
        this.lastAnnouncedSecond = null;
        if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = requestAnimationFrame(() => this.tick());
      },
      
      tick() {
        if (!this.running || this.paused) return;

        const elapsedMs = performance.now() - this.startTime - this.pausedDuration;
        const totalCycleDurationMs = (this.workTime + this.restTime) * 1000;
        const newCycle = Math.floor(elapsedMs / totalCycleDurationMs);

        let shouldRing = false;

        if (this.currentCycle !== newCycle) {
          this.currentCycle = newCycle;

          if (this.currentCycle >= this.totalCycles) {
            this.completeWorkout();
            return;
          }
        }

        const elapsedInCurrentCycleMs = elapsedMs % totalCycleDurationMs;
        const workTimeMs = this.workTime * 1000;

        let newMode;
        let newRemaining;
        if (elapsedInCurrentCycleMs < workTimeMs) {
          newMode = 'work';
          newRemaining = this.workTime - Math.floor(elapsedInCurrentCycleMs / 1000);
        } else {
          newMode = 'rest';
          const elapsedInRest = elapsedInCurrentCycleMs - workTimeMs;
          newRemaining = this.restTime - Math.floor(elapsedInRest / 1000);
        }

        if (this.mode !== newMode) {
          this.mode = newMode;
          shouldRing = true;
        }

        if (this.timeRemaining !== newRemaining) {
          this.timeRemaining = newRemaining;
          this.updateUI();

          if (this.timeRemaining <= 5 && this.timeRemaining >= 0) {
            if (this.lastAnnouncedSecond !== this.timeRemaining) {
              if (!shouldRing) {
                beepShort();
              }
              this.lastAnnouncedSecond = this.timeRemaining;
            }
          } else if (this.timeRemaining > 5) {
            this.lastAnnouncedSecond = null;
          }
        }

        if (shouldRing) {
          ring();
        }

        this.animationFrameId = requestAnimationFrame(() => this.tick());
      },
      
      completeWorkout() {
        this.closeWorkoutView();
        this.running = false; this.paused = false;
        if(this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.mode = 'completed';
        this.pendingModeAfterPrep = null;
        this.updateUI();
        victoryBells();
        releaseWakeLock();
        
        this.currentWorkout = {
          id: Date.now(),
          date: new Date().toISOString(),
          cycles: this.totalCycles,
          work: this.workTime,
          rest: this.restTime,
          totalTime: this.totalCycles * (this.workTime + this.restTime),
          notes: '',
          rpe: null
        };

        this.els.startBtn.disabled = false;
        this.els.pauseBtn.disabled = true;
        this.els.resumeBtn.disabled = true;

        populateRpeSelect(this.els.rpeSelect, 'tabata', null);
        this.els.workoutNotes.value = '';
        this.els.notesModal.setAttribute('data-workout-id', '');
        setTimeout(() => {
          this.els.notesModal.classList.add('active');
        }, 1000);
      },
      
      // Workout View
      openWorkoutView() {
        this.workoutViewActive = true;
        // Configure for Tabata
        this.els.workoutStatus.style.display = 'block';
        document.getElementById('workoutLapBtn').style.display = 'none';
        document.getElementById('workoutLapsList').parentElement.style.display = 'none';
        this.els.workoutProgress.style.display = 'block';
        this.els.workoutTimer.classList.remove('fortime');
        this.els.workoutTimer.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

        this.els.workoutView.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.updateWorkoutView();
      },
      closeWorkoutView() {
        this.workoutViewActive = false;
        this.els.workoutView.classList.remove('active');
        document.body.style.overflow = '';
      },
      updateWorkoutView() {
        if (!this.workoutViewActive) return;
        
        this.els.workoutTimer.textContent = this.timeRemaining;
        this.els.workoutProgress.textContent = `${t('progress').replace(':', '')} ${this.currentCycle}/${this.totalCycles}`;
        
        const statusMap = {
            work: { key: 'status_work', color: 'var(--accent)' },
            rest: { key: 'status_rest', color: 'var(--warn)' },
        };
        
        const currentStatus = statusMap[this.mode];
        if (currentStatus) {
            this.els.workoutStatus.textContent = t(currentStatus.key);
            this.els.workoutStatus.style.color = currentStatus.color;
            this.els.workoutStatus.style.display = 'block';
        } else {
            this.els.workoutStatus.style.display = 'none';
        }

        if (this.paused) {
          this.els.workoutPauseBtn.textContent = t('resume');
          this.els.workoutPauseBtn.className = 'workout-btn resume';
        } else {
          this.els.workoutPauseBtn.textContent = t('pause');
          this.els.workoutPauseBtn.className = 'workout-btn pause';
        }
        this.els.workoutPauseBtn.disabled = !this.running;
      },
      handleWorkoutPause() {
        if (this.paused) {
          this.resumeWithPrep(this.els.workoutPrep, this.els.workoutTimer);
        } else {
          this.pause();
        }
      },
      resumeWithPrep(prepEl, timerEl) {
        const targetMode = this.lastModeBeforePause || 'work';
        this.startPreparation(prepEl, timerEl, targetMode, () => this.resume());
      },
      
      // Presets
      renderCustomPresets() {
        // Clear only the user presets, not the "add new" button
        this.els.presetsContainer.innerHTML = '';
        this.customPresets.forEach((preset, index) => {
          const btn = document.createElement('button');
          btn.className = 'preset-btn';
          btn.dataset.action = 'apply-preset';
          btn.dataset.index = index;
          btn.innerHTML = `${preset.name} <button class="preset-delete" data-action="delete-preset" data-index="${index}">×</button>`;
          this.els.presetsContainer.appendChild(btn);
        });
        this.loadPresetsList();
      },
      applyPreset(index) {
          if (!this.customPresets[index]) return;
          const preset = this.customPresets[index];
          this.els.workInput.value = preset.work;
          this.els.restInput.value = preset.rest;
          this.els.cyclesInput.value = preset.cycles;
          this.updateValues();
          document.querySelectorAll('#tabata_app .preset-btn, #tabata_app .quick-btn').forEach(b => b.classList.remove('active'));
          // Find the button and activate it
          const btnToActivate = this.els.presetsContainer.querySelector(`[data-index="${index}"]`);
          if (btnToActivate) btnToActivate.classList.add('active');
      },
      loadPresetsList() {
        if (this.customPresets.length === 0) {
          this.els.presetsList.innerHTML = `<div class="empty-history">${t('no_presets_tabata')}</div>`;
          return;
        }
        this.els.presetsList.innerHTML = this.customPresets.map((p, i) => `
          <div class="history-item">
            <div class="history-performance">${p.name}</div>
            <div class="history-details">${p.work}s ${t('work_seconds_short')} • ${p.rest}s ${t('rest_seconds_short')} • ${p.cycles} ${t('cycles')}</div>
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-preset" data-index="${i}">${t('edit')}</button>
              <button class="history-btn delete" data-action="delete-preset" data-index="${i}">${t('delete')}</button>
            </div>
          </div>`).join('');
      },
      openPresetModal(index = -1) {
        this.editingPresetIndex = index;
        if (index > -1 && this.customPresets[index]) {
          const p = this.customPresets[index];
          this.els.presetModalTitle.textContent = t('edit_preset_title_tabata');
          this.els.presetName.value = p.name;
          this.els.presetWork.value = p.work;
          this.els.presetRest.value = p.rest;
          this.els.presetCycles.value = p.cycles;
        } else {
          this.els.presetModalTitle.textContent = t('new_preset_title_tabata');
          this.els.presetName.value = '';
          this.els.presetWork.value = this.workTime;
          this.els.presetRest.value = this.restTime;
          this.els.presetCycles.value = this.totalCycles;
        }
        this.els.presetModal.classList.add('active');
      },
      savePreset() {
        const name = this.els.presetName.value.trim();
        const work = parseInt(this.els.presetWork.value);
        const rest = parseInt(this.els.presetRest.value);
        const cycles = parseInt(this.els.presetCycles.value);
        if (!name || !work || !rest || !cycles) { alert(t('alert_fill_fields')); return; }
        const preset = { name, work, rest, cycles };
        if (this.editingPresetIndex >= 0) {
          this.customPresets[this.editingPresetIndex] = preset;
        } else {
          this.customPresets.push(preset);
        }
        localStorage.setItem('tabata_presets', JSON.stringify(this.customPresets));
        this.renderCustomPresets();
        this.closeAllModals();
      },
      deletePreset(index) {
          this.customPresets.splice(index, 1);
          localStorage.setItem('tabata_presets', JSON.stringify(this.customPresets));
          this.renderCustomPresets();
      },

      // History
      loadHistory() {
        this.els.totalWorkouts.textContent = this.history.length;
        this.els.totalCycles.textContent = this.history.reduce((sum, w) => sum + (w.cycles || 0), 0);
        if (this.history.length === 0) {
          this.els.historyList.innerHTML = `<div class="empty-history">${t('no_history_tabata')}</div>`;
          return;
        }
        this.els.historyList.innerHTML = this.history.map(w => {
          const date = new Date(w.date);
          const duration = Math.floor(w.totalTime / 60);
          const rpeText = getRpeText('tabata', w.rpe);
          return `
          <div class="history-item">
            <div class="history-date">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="history-performance">${w.cycles} ${t('cycles')} • ${w.work}s/${w.rest}s</div>
            <div class="history-details">${duration}min workout</div>
            ${rpeText ? `<div class="history-notes">${t('history_rpe_entry', { rpe: rpeText })}</div>` : ''}
            ${w.notes ? `<div class="history-notes">"${w.notes}"</div>` : ''}
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-history" data-id="${w.id}">${t('edit')}</button>
              <button class="history-btn share" data-action="share-history" data-id="${w.id}">${t('share')}</button>
              <button class="history-btn delete" data-action="delete-history" data-id="${w.id}">${t('delete')}</button>
            </div>
          </div>`;
        }).join('');
      },
      exportHistory() {
        const history = this.history;
        if (history.length === 0) return;

        const head = EXCEL_HEADERS.tabata;
        const rows = history.map(w => {
          const date = new Date(w.date).toLocaleDateString('en-US');
          const workSeconds = w.work;
          const restSeconds = w.rest;
          const cycles = w.cycles;
          const rpe = extraerRPE(w.notes, w.rpe, 'tabata');
          const totalMinutes = Math.floor((w.totalTime || 0) / 60);
          const notes = limpiarNotas(w.notes);

          return [date, workSeconds, restSeconds, cycles, rpe, totalMinutes, notes];
        });

        const workbook = buildExcelWorkbook('tabata', head, rows);
        downloadCSV(workbook, EXCEL_FILE_NAMES.tabata);
      },
      saveWorkout(notes = '', rpe = null) {
        if (!this.currentWorkout) return;
        this.currentWorkout.notes = notes;
        this.currentWorkout.rpe = rpe || null;
        this.history.unshift(this.currentWorkout);
        if (this.history.length > 50) this.history.pop();
        localStorage.setItem('tabata_history', JSON.stringify(this.history));
        this.loadHistory();
      },
      clearHistory() {
        if (confirm(t('confirm_clear_history'))) {
          localStorage.removeItem('tabata_history');
          this.history = [];
          this.loadHistory();
        }
      },
      deleteWorkout(id) {
          this.history = this.history.filter(w => w.id !== id);
          localStorage.setItem('tabata_history', JSON.stringify(this.history));
          this.loadHistory();
      },

      // Modals
      closeAllModals() {
        document.querySelectorAll('#tabata_presetModal, #tabata_notesModal, #tabata_completionModal').forEach(m => m.classList.remove('active'));
        if (this.els.notesModal) {
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
      },
      handleSkipNotes() {
        this.closeAllModals();
        if (this.currentWorkout) {
          this.saveWorkout('', null);
          this.showCompletionModal();
        }
      },
      handleSaveNotes() {
        const notes = this.els.workoutNotes.value.trim();
        const rpeValue = this.els.rpeSelect.value || null;
        const workoutId = parseInt(this.els.notesModal.getAttribute('data-workout-id'));

        if (workoutId) {
          const workout = this.history.find(w => w.id === workoutId);
          if (workout) {
            workout.notes = notes;
            workout.rpe = rpeValue;
            localStorage.setItem('tabata_history', JSON.stringify(this.history));
            if (this.currentWorkout && this.currentWorkout.id === workoutId) {
              this.currentWorkout.notes = notes;
              this.currentWorkout.rpe = rpeValue;
            }
          }
          this.loadHistory();
          this.closeAllModals();
        } else if (this.currentWorkout) {
          this.closeAllModals();
          this.saveWorkout(notes, rpeValue);
          this.showCompletionModal();
        }
      },
      openNotesModal(id) {
        const workout = this.history.find(w => w.id === id);
        if (!workout) return;
        populateRpeSelect(this.els.rpeSelect, 'tabata', workout.rpe || null);
        this.els.workoutNotes.value = workout.notes || '';
        this.els.notesModal.setAttribute('data-workout-id', id);
        this.els.notesModal.classList.add('active');
      },
      showCompletionModal() {
        if (!this.currentWorkout) return;
        const duration = Math.floor(this.currentWorkout.totalTime / 60);
        this.els.completionStats.innerHTML = `
          <div class="completion-stat"><strong>${this.currentWorkout.cycles}</strong> ${t('cycles')} ${t('completed_cycles')}</div>
          <div class="completion-stat"><strong>${this.currentWorkout.work}s</strong> ${t('work_seconds_short')} / <strong>${this.currentWorkout.rest}s</strong> ${t('rest_seconds_short')}</div>
          <div class="completion-stat"><strong>${duration}</strong> ${t('minutes_total')}</div>`;
        this.els.completionModal.classList.add('active');
      },
      openNotesFromCompletion() {
        this.closeAllModals();
        if (this.currentWorkout) {
          this.openNotesModal(this.currentWorkout.id);
        }
      },
      shareResult() {
        if(this.currentWorkout) this.shareWorkout(this.currentWorkout.id);
      },
      shareWorkout(id) {
        const workout = this.history.find(w => w.id === id);
        if (!workout) return;
        const date = new Date(workout.date).toLocaleDateString();
        const duration = Math.floor(workout.totalTime / 60);
        const notesText = workout.notes ? `\n\n${t('workout_notes')}: ${workout.notes}` : '';
        const text = t('share_text_tabata', {
          cycles: workout.cycles,
          work: workout.work,
          rest: workout.rest,
          duration: duration,
          date: date,
          notes: notesText
        });

        if (navigator.share) {
          navigator.share({ title: t('share_title_tabata'), text });
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => alert(t('alert_copied')));
        }
      }
    };

    // === FOR TIME APP LOGIC ===
    const ForTimeApp = {
      // State
      timeCap: null, prepInterval: null, running: false, paused: false, inPrep: false,
      startTime: 0, pauseTime: 0, pausedDuration: 0, elapsedTime: 0,
      laps: [], animationFrameId: null,
      currentWorkout: null, editingPresetIndex: -1, initialized: false,
      workoutViewActive: false,
      lastAnnouncedCapSecond: null,
      midpointAnnounced: false,
      
      // DOM Elements
      els: {},

      init() {
        if(this.initialized) return;
        this.cacheDOMElements();
        this.setupEventListeners();
        this.renderPresets();
        this.loadHistory();
        this.updateUI();
        this.initialized = true;
      },
      
      cacheDOMElements() {
        const ids = ['app', 'timeCapInput', 'status', 'prep', 'timer', 'startBtn', 'stopBtn', 'pauseBtn', 'resumeBtn', 'lapBtn', 'resetBtn', 'lapsList', 'presetsContainer', 'addPresetBtn', 'tabs-nav', 'timer-tab', 'presets-tab', 'history-tab', 'presetsList', 'historyList', 'totalWorkouts', 'totalLaps', 'clearHistoryBtn', 'exportHistoryBtn', 'presetModal', 'presetModalTitle', 'presetName', 'presetTimeCap', 'savePreset', 'notesModal', 'rpeSelect', 'workoutNotes', 'skipNotes', 'saveNotes', 'completionModal', 'completionStats', 'shareResult', 'addNotesBtn', 'toggleWorkoutViewBtn'];
        ids.forEach(id => this.els[id] = document.getElementById(`fortime_${id}`));
        this.els.tabBtns = Array.from(document.querySelectorAll('#fortime_tabs-nav .tab-btn'));
        this.els.tabContents = Array.from(document.querySelectorAll('#fortime_app .tab-content'));
        this.els.quickBtns = Array.from(document.querySelectorAll('#fortime_quick button'));
        this.els.modalCloseBtns = document.querySelectorAll('#fortime_presetModal [data-modal-close], #fortime_notesModal [data-modal-close], #fortime_completionModal [data-modal-close]');
        this.els.modalCancelBtns = document.querySelectorAll('#fortime_presetModal [data-modal-cancel]');
        // Elementos de la vista de entrenamiento
        this.els.workoutView = document.getElementById('workoutView');
        this.els.workoutClose = document.getElementById('workoutClose');
        this.els.workoutTimer = document.getElementById('workoutTimer');
        this.els.workoutPrep = document.getElementById('workoutPrep');
        this.els.workoutPauseBtn = document.getElementById('workoutPauseBtn');
        this.els.workoutLapBtn = document.getElementById('workoutLapBtn');
        this.els.workoutLapsList = document.getElementById('workoutLapsList');
        populateRpeSelect(this.els.rpeSelect, 'fortime');
      },

      setupEventListeners() {
        this.els.tabBtns.forEach(btn => btn.addEventListener('click', () => this.handleTabClick(btn)));
        this.els.quickBtns.forEach(btn => btn.addEventListener('click', () => this.applyTimeCap(parseInt(btn.dataset.quick, 10))));
        this.els.timeCapInput.addEventListener('input', () => this.handleTimeCapChange());
        this.els.timeCapInput.addEventListener('blur', () => this.validateForTimeInputs());
        this.els.startBtn.addEventListener('click', () => this.start());
        this.els.stopBtn.addEventListener('click', () => this.stop());
        this.els.pauseBtn.addEventListener('click', () => this.pause());
        this.els.resumeBtn.addEventListener('click', () => this.resumeWithPrep(this.els.prep, this.els.timer));
        this.els.lapBtn.addEventListener('click', () => this.lap());
        this.els.resetBtn.addEventListener('click', () => this.resetAll());
        this.els.addPresetBtn.addEventListener('click', () => this.openPresetModal());
        this.els.savePreset.addEventListener('click', () => this.savePreset());
        this.els.skipNotes.addEventListener('click', () => this.handleSkipNotes());
        this.els.saveNotes.addEventListener('click', () => this.handleSaveNotes());
        this.els.shareResult.addEventListener('click', () => this.shareResult());
        this.els.addNotesBtn.addEventListener('click', () => this.openNotesFromCompletion());
        this.els.toggleWorkoutViewBtn.addEventListener('click', () => this.openWorkoutView());
        this.els.modalCloseBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        this.els.modalCancelBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        
        this.els.app.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const { action, id, index } = target.dataset;
            switch(action) {
                case 'apply-preset': this.applyPreset(parseInt(index, 10)); break;
                case 'delete-preset': e.stopPropagation(); if (confirm(t('confirm_delete_preset'))) this.deletePreset(parseInt(index, 10)); break;
                case 'edit-preset': this.openPresetModal(parseInt(index, 10)); break;
                case 'clear-history': this.clearHistory(); break;
                case 'export-history': this.exportHistory(); break;
                case 'edit-history': this.openNotesModal(parseInt(id, 10)); break;
                case 'share-history': this.shareWorkout(parseInt(id, 10)); break;
                case 'delete-history': if (confirm(t('confirm_delete_history'))) this.deleteWorkout(parseInt(id, 10)); break;
            }
        });
         // Event listeners para la vista de entrenamiento
        this.els.workoutClose.addEventListener('click', () => { if (this.workoutViewActive && ForTimeApp.running) this.closeWorkoutView() });
        this.els.workoutPauseBtn.addEventListener('click', () => { if (this.workoutViewActive && ForTimeApp.running) this.handleWorkoutPause() });
        this.els.workoutLapBtn.addEventListener('click', () => { if(this.workoutViewActive && ForTimeApp.running) this.lap()});
      },
      
      validateForTimeInputs() {
        let val = parseInt(this.els.timeCapInput.value, 10);
        if (isNaN(val) || val <= 0) {
            this.els.timeCapInput.value = '';
        } else {
            this.els.timeCapInput.value = val;
        }
        this.handleTimeCapChange();
      },

      openWorkoutView() {
        this.workoutViewActive = true;
        // Configure for ForTime
        document.getElementById('workoutStatus').style.display = 'none';
        document.getElementById('workoutProgress').style.display = 'none';
        this.els.workoutLapBtn.style.display = 'inline-block';
        this.els.workoutLapsList.parentElement.style.display = 'block';
        this.els.workoutTimer.classList.add('fortime');
        this.els.workoutTimer.style.fontFamily = 'monospace';
        
        this.els.workoutView.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        this.els.workoutLapBtn.textContent = t('lap');
        this.updateWorkoutView();
      },

      closeWorkoutView() {
        this.workoutViewActive = false;
        this.els.workoutView.classList.remove('active');
        document.body.style.overflow = ''; // Restaurar scroll
      },

      updateWorkoutView() {
        if (!this.workoutViewActive) return;
        
        this.els.workoutTimer.textContent = this.formatTime(this.elapsedTime);
        
        if (this.paused) {
          this.els.workoutPauseBtn.textContent = t('resume');
          this.els.workoutPauseBtn.className = 'workout-btn resume';
        } else {
          this.els.workoutPauseBtn.textContent = t('pause');
          this.els.workoutPauseBtn.className = 'workout-btn pause';
        }
        
        this.els.workoutLapsList.innerHTML = this.laps.map((lapTime, i) => `
          <li class="lap-item">
            <span>${t('lap')} ${i + 1}</span>
            <span>${this.formatTime(lapTime)}</span>
          </li>
        `).reverse().join('');
        
        this.els.workoutPauseBtn.disabled = !this.running;
        this.els.workoutLapBtn.disabled = !this.running || this.paused;
      },

      handleWorkoutPause() {
        if (!this.running) return;
        
        if (this.paused) {
          this.resumeWithPrep(this.els.workoutPrep, this.els.workoutTimer);
        } else {
          this.pause();
        }
      },

      resumeWithPrep(prepEl, timerEl) {
        this.startPreparation(prepEl, timerEl, () => this.resume());
      },

      updateLanguage() {
        this.updateUI();
        this.renderPresets();
        populateRpeSelect(this.els.rpeSelect, 'fortime');
        this.loadHistory();
      },

      handleTabClick(btn) {
        const targetTab = btn.dataset.tab;
        this.els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.els.tabContents.forEach(content => {
          content.classList.toggle('active', content.id === `fortime_${targetTab}-tab`);
        });
        if (targetTab === 'history') this.loadHistory();
        else if (targetTab === 'presets') this.renderPresets();
      },
      
      applyTimeCap(minutes) {
        if (isNaN(minutes)) return;
        this.els.timeCapInput.value = minutes;
        this.handleTimeCapChange();
      },

      handleTimeCapChange() {
        const val = this.els.timeCapInput.value.trim();
        const minutes = val ? parseInt(val, 10) : null;
        this.timeCap = minutes ? minutes * 60 * 1000 : null; // convert minutes to ms
        if(this.els.quickBtns) { // check if it exists
             this.els.quickBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.quick) === minutes));
        }
      },

      formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
      },

      updateUI() {
        this.els.timer.textContent = this.formatTime(this.elapsedTime);
        this.renderLaps();
        if (this.workoutViewActive) {
            this.updateWorkoutView();
        }
      },
      
      setStatus(statusKey, className) {
        this.els.status.textContent = t(statusKey);
        this.els.status.className = `status ${className}`;
      },

      async start() {
        await ensureAudioContext();
        await requestWakeLock();
        this.resetAll();
        this.handleTimeCapChange();
        this.startPreparation(this.els.prep, this.els.timer, () => {
          this.running = true;
          this.startTime = performance.now();
          this.pausedDuration = 0;
          this.animationFrameId = requestAnimationFrame(() => this.tick());
          this.setStatus('training', 'running');
          this.els.startBtn.style.display = 'none';
          this.els.stopBtn.style.display = 'inline-block';
          this.els.pauseBtn.disabled = false;
          this.els.lapBtn.disabled = false;
          this.els.toggleWorkoutViewBtn.style.display = 'inline-block';
          this.openWorkoutView();
        });
      },

      stop(isTimeCap = false) {
        if (!this.running) return;
        this.closeWorkoutView();
        this.running = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (!isTimeCap && !this.paused) {
          this.elapsedTime = performance.now() - this.startTime - this.pausedDuration;
        }
        this.updateUI();
        this.completeWorkout();
      },

      pause() {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.pauseTime = performance.now();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) { clearInterval(this.prepInterval); this.prepInterval = null; }
        this.setStatus('paused', 'paused');
        releaseWakeLock();
        this.els.pauseBtn.disabled = true;
        this.els.resumeBtn.disabled = false;
        this.els.lapBtn.disabled = true;
        if (this.workoutViewActive) {
            this.updateWorkoutView();
        }
      },
      
      async resume() {
        if (!this.running || !this.paused) return;
        await ensureAudioContext();
        await requestWakeLock();
        this.paused = false;
        this.pausedDuration += performance.now() - this.pauseTime;
        this.animationFrameId = requestAnimationFrame(() => this.tick());
        this.setStatus('training', 'running');
        this.els.pauseBtn.disabled = false;
        this.els.resumeBtn.disabled = true;
        this.els.lapBtn.disabled = false;
        if (this.workoutViewActive) {
            this.updateWorkoutView();
        }
      },

      lap() {
        if (!this.running || this.paused) return;
        this.laps.push(this.elapsedTime);
        this.renderLaps();
        beepShort();
      },
      
      resetAll() {
        this.closeWorkoutView();
        this.running = false; this.paused = false; this.inPrep = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) clearInterval(this.prepInterval);
        releaseWakeLock();
        this.elapsedTime = 0; this.laps = []; this.pausedDuration = 0;
        this.lastAnnouncedCapSecond = null;
        this.midpointAnnounced = false;
        this.els.prep.style.display = 'none'; 
        this.els.timer.style.display = 'block';
        this.setStatus('ready', 'idle');
        this.els.startBtn.style.display = 'inline-block';
        this.els.stopBtn.style.display = 'none';
        this.els.pauseBtn.disabled = true;
        this.els.resumeBtn.disabled = true;
        this.els.lapBtn.disabled = true;
        this.els.toggleWorkoutViewBtn.style.display = 'none';
        this.updateUI();
      },
      
      startPreparation(prepEl, timerEl, nextAction) {
        this.inPrep = true;
        prepEl.style.display = 'block';
        timerEl.style.display = 'none';
        this.setStatus('preparing', 'ready');
        let prep = 5;
        prepEl.textContent = prep;
        beepPrep();
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.prepInterval = setInterval(() => {
          prep--;
          if (prep <= 0) {
            clearInterval(this.prepInterval);
            this.prepInterval = null;
            setTimeout(() => {
              this.inPrep = false;
              prepEl.style.display = 'none';
              timerEl.style.display = 'block';
              ring();
              setTimeout(() => {
                nextAction();
              }, 250);
            }, 250);
          } else {
            prepEl.textContent = prep;
            beepPrep();
          }
        }, 1000);
      },
      
      tick() {
        if (!this.running || this.paused) return;
        this.elapsedTime = performance.now() - this.startTime - this.pausedDuration;

        if (this.timeCap) {
          if (this.elapsedTime >= this.timeCap) {
            this.elapsedTime = this.timeCap;
            this.stop(true);
            return;
          }

          // Midpoint sound alert
          if (!this.midpointAnnounced && this.elapsedTime >= (this.timeCap / 2)) {
            ring();
            this.midpointAnnounced = true;
          }

          // Final countdown before time cap
          const timeRemainingMs = this.timeCap - this.elapsedTime;
          const secondsRemaining = Math.ceil(timeRemainingMs / 1000);

          if (secondsRemaining <= 5 && secondsRemaining > 0) {
            if (this.lastAnnouncedCapSecond !== secondsRemaining) {
              beepShort();
              this.lastAnnouncedCapSecond = secondsRemaining;
            }
          }
        }

        this.updateUI();
        this.animationFrameId = requestAnimationFrame(() => this.tick());
      },
      
      renderLaps() {
        this.els.lapsList.innerHTML = this.laps.map((lapTime, i) => `
          <li class="lap-item">
            <span>${t('lap')} ${i + 1}</span>
            <span>${this.formatTime(lapTime)}</span>
          </li>
        `).reverse().join('');
      },

      completeWorkout() {
        releaseWakeLock();
        this.setStatus('workout_complete_status', 'completed');
        victoryBells();
        this.saveWorkout({ finalTime: this.elapsedTime, timeCap: this.timeCap, laps: this.laps });
        if (this.currentWorkout) {
          this.els.workoutNotes.value = this.currentWorkout.notes || '';
          populateRpeSelect(this.els.rpeSelect, 'fortime', this.currentWorkout.rpe || null);
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
        setTimeout(() => this.els.notesModal.classList.add('active'), 1000);
      },
      
      // Presets
      getPresets() { return JSON.parse(localStorage.getItem('fortime_presets') || '[]'); },
      savePresets(presets) { localStorage.setItem('fortime_presets', JSON.stringify(presets)); },
      renderPresets() {
        const presets = this.getPresets();
        this.els.presetsContainer.innerHTML = '';
        presets.forEach((preset, index) => {
          const btn = document.createElement('button');
          btn.className = 'preset-btn';
          btn.dataset.action = 'apply-preset';
          btn.dataset.index = index;
          btn.innerHTML = `${preset.name} <button class="preset-delete" data-action="delete-preset" data-index="${index}">×</button>`;
          this.els.presetsContainer.appendChild(btn);
        });
        this.loadPresetsList();
      },
      applyPreset(index) {
          const presets = this.getPresets();
          if (!presets[index]) return;
          const preset = presets[index];
          this.els.timeCapInput.value = preset.timeCap || '';
          this.handleTimeCapChange();
      },
      deletePreset(index) {
          let presets = this.getPresets();
          presets.splice(index, 1);
          this.savePresets(presets);
          this.renderPresets();
      },
      loadPresetsList() {
        const presets = this.getPresets();
        if (presets.length === 0) {
          this.els.presetsList.innerHTML = `<div class="empty-history">${t('no_presets_fortime')}</div>`;
          return;
        }
        this.els.presetsList.innerHTML = presets.map((p, i) => `
          <div class="history-item">
            <div class="history-performance">${p.name}</div>
            <div class="history-details">${p.timeCap ? `${t('time_cap')} ${p.timeCap} min` : t('leave_empty_unlimited')}</div>
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-preset" data-index="${i}">${t('edit')}</button>
              <button class="history-btn delete" data-action="delete-preset" data-index="${i}">${t('delete')}</button>
            </div>
          </div>`).join('');
      },
      openPresetModal(index = -1) {
        this.editingPresetIndex = index;
        const presets = this.getPresets();
        if (index > -1 && presets[index]) {
          const p = presets[index];
          this.els.presetModalTitle.textContent = t('edit_preset_title_fortime');
          this.els.presetName.value = p.name;
          this.els.presetTimeCap.value = p.timeCap || '';
        } else {
          this.els.presetModalTitle.textContent = t('new_preset_title_fortime');
          this.els.presetName.value = '';
          this.els.presetTimeCap.value = this.timeCap ? this.timeCap / 60000 : '';
        }
        this.els.presetModal.classList.add('active');
      },
      savePreset() {
        const name = this.els.presetName.value.trim();
        const timeCap = this.els.presetTimeCap.value ? parseInt(this.els.presetTimeCap.value) : null;
        if (!name) { alert(t('alert_fill_fields')); return; }
        
        const presets = this.getPresets();
        const newPreset = { name, timeCap };

        if (this.editingPresetIndex > -1) {
          presets[this.editingPresetIndex] = newPreset;
        } else {
          presets.push(newPreset);
        }
        this.savePresets(presets);
        this.renderPresets();
        this.closeAllModals();
      },
      
      // History
      getHistory() { return JSON.parse(localStorage.getItem('fortime_history') || '[]'); },
      saveHistory(history) { localStorage.setItem('fortime_history', JSON.stringify(history)); },
      loadHistory() {
        const history = this.getHistory();
        this.els.totalWorkouts.textContent = history.length;
        this.els.totalLaps.textContent = history.reduce((sum, w) => sum + (w.laps?.length || 0), 0);
        if (history.length === 0) {
          this.els.historyList.innerHTML = `<div class="empty-history">${t('no_history_fortime')}</div>`;
          return;
        }
        this.els.historyList.innerHTML = history.map(w => {
          const date = new Date(w.date);
          const rpeText = getRpeText('fortime', w.rpe);
          return `
          <div class="history-item">
            <div class="history-date">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="history-performance">${t('final_time')}: ${this.formatTime(w.finalTime)}</div>
            <div class="history-details">${w.laps.length} Laps ${w.timeCap ? `• Time Cap: ${w.timeCap / 60000}min` : ''}</div>
            ${w.laps && w.laps.length > 0 ? `
              <div class="history-laps">
                <ul>
                  ${w.laps.map((lapTime, i) => `<li>${t('lap')} ${i + 1}: ${this.formatTime(lapTime)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            ${rpeText ? `<div class="history-notes">${t('history_rpe_entry', { rpe: rpeText })}</div>` : ''}
            ${w.notes ? `<div class="history-notes">"${w.notes}"</div>` : ''}
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-history" data-id="${w.id}">${t('edit')}</button>
              <button class="history-btn share" data-action="share-history" data-id="${w.id}">${t('share')}</button>
              <button class="history-btn delete" data-action="delete-history" data-id="${w.id}">${t('delete')}</button>
            </div>
          </div>`;
        }).join('');
      },
      exportHistory() {
        const history = this.getHistory();
        if (history.length === 0) return;
        const head = EXCEL_HEADERS.fortime;
        const rows = history.map(w => {
          const date = new Date(w.date).toLocaleDateString('en-US');
          const tiempoFinal = typeof HelperUtil !== 'undefined' && typeof HelperUtil.formatTime === 'function'
            ? HelperUtil.formatTime(w.finalTime)
            : this.formatTime(w.finalTime);
          const timeCap = w.timeCap ? Math.floor(w.timeCap / 60000) : 'N/A';
          const rounds = w.laps?.length || 0;
          const rpe = extraerRPE(w.notes, w.rpe, 'fortime');
          const notes = limpiarNotas(w.notes);

          return [date, tiempoFinal, timeCap, rounds, rpe, notes];
        });

        const workbook = buildExcelWorkbook('fortime', head, rows);
        downloadCSV(workbook, EXCEL_FILE_NAMES.fortime);
      },
      clearHistory() {
        if (confirm(t('confirm_clear_history'))) {
          this.saveHistory([]);
          this.loadHistory();
        }
      },
      saveWorkout(data, notes = '', rpe = null) {
        const workout = { id: Date.now(), date: new Date().toISOString(), ...data, notes, rpe };
        let history = this.getHistory();
        history.unshift(workout);
        if (history.length > 50) history.pop();
        this.saveHistory(history);
        this.currentWorkout = workout;
        this.loadHistory();
      },
      updateWorkoutNotes(id, notes, rpe = null) {
        let history = this.getHistory();
        const workout = history.find(w => w.id === id);
        if (workout) {
          workout.notes = notes;
          workout.rpe = rpe || null;
          this.saveHistory(history);
          this.loadHistory();
        }
        if (this.currentWorkout && this.currentWorkout.id === id) {
          this.currentWorkout.notes = notes;
          this.currentWorkout.rpe = rpe || null;
        }
      },
      deleteWorkout(id) {
          let history = this.getHistory();
          history = history.filter(w => w.id !== id);
          this.saveHistory(history);
          this.loadHistory();
      },
      
      // Modals
      closeAllModals() {
        document.querySelectorAll('#fortime_presetModal, #fortime_notesModal, #fortime_completionModal').forEach(m => m.classList.remove('active'));
        if (this.els.notesModal) {
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
      },
      handleSkipNotes() {
        this.closeAllModals();
        if (this.currentWorkout) this.showCompletionModal();
      },
      handleSaveNotes() {
        const notes = this.els.workoutNotes.value.trim();
        const rpeValue = this.els.rpeSelect.value || null;
        const workoutId = parseInt(this.els.notesModal.getAttribute('data-workout-id'));
        if (workoutId) {
          this.updateWorkoutNotes(workoutId, notes, rpeValue);
        } else if (this.currentWorkout) {
          this.updateWorkoutNotes(this.currentWorkout.id, notes, rpeValue);
        }
        this.closeAllModals();
        if (this.currentWorkout && !workoutId) {
          this.showCompletionModal();
        }
      },
      openNotesModal(id) {
          const workout = this.getHistory().find(w => w.id === id);
          if (!workout) return;
          populateRpeSelect(this.els.rpeSelect, 'fortime', workout.rpe || null);
          this.els.workoutNotes.value = workout.notes || '';
          this.els.notesModal.setAttribute('data-workout-id', id);
          this.els.notesModal.classList.add('active');
      },
      showCompletionModal() {
        if (!this.currentWorkout) return;
        this.els.completionStats.innerHTML = `
          <div class="completion-stat"><strong>${t('final_time')}:</strong> ${this.formatTime(this.currentWorkout.finalTime)}</div>
          <div class="completion-stat"><strong>${this.currentWorkout.laps.length}</strong> Laps</div>
          ${this.currentWorkout.timeCap ? `<div class="completion-stat"><strong>Time Cap:</strong> ${this.currentWorkout.timeCap/60000} min</div>` : ''}
          `;
        this.els.completionModal.classList.add('active');
      },
      openNotesFromCompletion() {
        if (!this.currentWorkout) return;
        this.closeAllModals();
        this.els.workoutNotes.value = this.currentWorkout?.notes || '';
        populateRpeSelect(this.els.rpeSelect, 'fortime', this.currentWorkout?.rpe || null);
        this.els.notesModal.setAttribute('data-workout-id', this.currentWorkout.id);
        this.els.notesModal.classList.add('active');
      },
      shareResult() {
        if (!this.currentWorkout) return;
        this.shareWorkout(this.currentWorkout.id);
      },
      shareWorkout(id) {
          const workout = this.getHistory().find(w => w.id === id);
          if (!workout) return;
          const date = new Date(workout.date).toLocaleDateString();
          const timeCapText = workout.timeCap ? `\nTime Cap: ${workout.timeCap/60000}min` : '';
          const notesText = workout.notes ? `\n\nNotes: ${workout.notes}` : '';
          const text = t('share_text_fortime', {
            time: this.formatTime(workout.finalTime),
            lapsCount: workout.laps.length,
            date: date,
            timeCapText: timeCapText,
            notes: notesText
          });
          if (navigator.share) {
            navigator.share({ title: t('share_title_fortime'), text });
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => alert(t('alert_copied')));
          }
      },
    };

       // === AMRAP APP LOGIC ===
    const AmrapApp = {
      // State
      duration: 600000, // 10 minutes in ms
      prepInterval: null, running: false, paused: false, inPrep: false,
      startTime: 0, pauseTime: 0, pausedDuration: 0, remainingTime: 600000,
      rounds: 0, animationFrameId: null,
      currentWorkout: null, editingPresetIndex: -1, initialized: false,
      workoutViewActive: false,
      lastAnnouncedSecond: null,
      midpointAnnounced: false,
      
      // DOM Elements
      els: {},

      init() {
        if(this.initialized) return;
        this.cacheDOMElements();
        this.setupEventListeners();
        this.renderPresets();
        this.loadHistory();
        this.handleDurationChange(); // Initialize with default value
        this.initialized = true;
      },
      
      cacheDOMElements() {
        const ids = ['app', 'durationInput', 'status', 'prep', 'timer', 'startBtn', 'pauseBtn', 'resumeBtn', 'roundBtn', 'resetBtn', 'rounds', 'presetsContainer', 'addPresetBtn', 'tabs-nav', 'timer-tab', 'presets-tab', 'history-tab', 'presetsList', 'historyList', 'totalWorkouts', 'totalRounds', 'clearHistoryBtn', 'exportHistoryBtn', 'presetModal', 'presetModalTitle', 'presetName', 'presetDuration', 'savePreset', 'notesModal', 'rpeSelect', 'workoutNotes', 'skipNotes', 'saveNotes', 'completionModal', 'completionStats', 'shareResult', 'addNotesBtn', 'toggleWorkoutViewBtn'];
        ids.forEach(id => this.els[id] = document.getElementById(`amrap_${id}`));
        this.els.tabBtns = Array.from(document.querySelectorAll('#amrap_tabs-nav .tab-btn'));
        this.els.tabContents = Array.from(document.querySelectorAll('#amrap_app .tab-content'));
        this.els.quickBtns = Array.from(document.querySelectorAll('#amrap_quick button'));
        this.els.modalCloseBtns = document.querySelectorAll('#amrap_presetModal [data-modal-close], #amrap_notesModal [data-modal-close], #amrap_completionModal [data-modal-close]');
        this.els.modalCancelBtns = document.querySelectorAll('#amrap_presetModal [data-modal-cancel]');
        // Shared workout view elements
        this.els.workoutView = document.getElementById('workoutView');
        this.els.workoutClose = document.getElementById('workoutClose');
        this.els.workoutTimer = document.getElementById('workoutTimer');
        this.els.workoutPrep = document.getElementById('workoutPrep');
        this.els.workoutPauseBtn = document.getElementById('workoutPauseBtn');
        this.els.workoutLapBtn = document.getElementById('workoutLapBtn'); // Reused for rounds
        this.els.workoutProgress = document.getElementById('workoutProgress');
        populateRpeSelect(this.els.rpeSelect, 'amrap');
      },

      setupEventListeners() {
        this.els.tabBtns.forEach(btn => btn.addEventListener('click', () => this.handleTabClick(btn)));
        this.els.quickBtns.forEach(btn => btn.addEventListener('click', () => this.applyDuration(parseInt(btn.dataset.quick, 10))));
        this.els.durationInput.addEventListener('input', () => this.handleDurationChange());
        this.els.durationInput.addEventListener('blur', () => this.validateAmrapInputs());
        this.els.startBtn.addEventListener('click', () => this.start());
        this.els.pauseBtn.addEventListener('click', () => this.pause());
        this.els.resumeBtn.addEventListener('click', () => this.resumeWithPrep(this.els.prep, this.els.timer));
        this.els.roundBtn.addEventListener('click', () => this.addRound());
        this.els.resetBtn.addEventListener('click', () => this.resetAll());
        this.els.addPresetBtn.addEventListener('click', () => this.openPresetModal());
        this.els.savePreset.addEventListener('click', () => this.savePreset());
        this.els.skipNotes.addEventListener('click', () => this.handleSkipNotes());
        this.els.saveNotes.addEventListener('click', () => this.handleSaveNotes());
        this.els.shareResult.addEventListener('click', () => this.shareResult());
        this.els.addNotesBtn.addEventListener('click', () => this.openNotesFromCompletion());
        this.els.toggleWorkoutViewBtn.addEventListener('click', () => this.openWorkoutView());
        this.els.modalCloseBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        this.els.modalCancelBtns.forEach(btn => btn.addEventListener('click', () => this.closeAllModals()));
        
        this.els.app.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const { action, id, index } = target.dataset;
            switch(action) {
                case 'apply-preset': this.applyPreset(parseInt(index, 10)); break;
                case 'delete-preset': e.stopPropagation(); if (confirm(t('confirm_delete_preset'))) this.deletePreset(parseInt(index, 10)); break;
                case 'edit-preset': this.openPresetModal(parseInt(index, 10)); break;
                case 'clear-history': this.clearHistory(); break;
                case 'export-history': this.exportHistory(); break;
                case 'edit-history': this.openNotesModal(parseInt(id, 10)); break;
                case 'share-history': this.shareWorkout(parseInt(id, 10)); break;
                case 'delete-history': if (confirm(t('confirm_delete_history'))) this.deleteWorkout(parseInt(id, 10)); break;
            }
        });
         // Event listeners para la vista de entrenamiento
        this.els.workoutClose.addEventListener('click', () => { if (this.workoutViewActive && AmrapApp.running) this.closeWorkoutView() });
        this.els.workoutPauseBtn.addEventListener('click', () => { if (this.workoutViewActive && AmrapApp.running) this.handleWorkoutPause() });
        this.els.workoutLapBtn.addEventListener('click', () => { if(this.workoutViewActive && AmrapApp.running) this.addRound()});
      },

      validateAmrapInputs() {
        let val = parseInt(this.els.durationInput.value, 10);
        if (isNaN(val) || val <= 0) {
            this.els.durationInput.value = 10;
        } else {
            this.els.durationInput.value = val;
        }
        this.handleDurationChange();
      },

      updateLanguage() {
        this.updateUI();
        this.renderPresets();
        populateRpeSelect(this.els.rpeSelect, 'amrap');
        this.loadHistory();
      },

      handleTabClick(btn) {
        const targetTab = btn.dataset.tab;
        this.els.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.els.tabContents.forEach(content => {
          content.classList.toggle('active', content.id === `amrap_${targetTab}-tab`);
        });
        if (targetTab === 'history') this.loadHistory();
        else if (targetTab === 'presets') this.renderPresets();
      },
      
      applyDuration(minutes) {
        if (isNaN(minutes)) return;
        this.els.durationInput.value = minutes;
        this.handleDurationChange();
      },

      handleDurationChange() {
        const val = this.els.durationInput.value.trim();
        const minutes = val ? parseInt(val, 10) : 10; // Default to 10 if empty
        this.duration = minutes * 60 * 1000;
        if(this.els.quickBtns) {
             this.els.quickBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.quick) === minutes));
        }
        if (!this.running) {
          this.remainingTime = this.duration;
          this.updateUI();
        }
      },

      formatTime(ms) {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      },

      updateUI() {
        this.els.timer.textContent = this.formatTime(this.remainingTime);
        this.els.rounds.textContent = `${t('completed_rounds')} ${this.rounds}`;
        if (this.workoutViewActive) {
            this.updateWorkoutView();
        }
      },
      
      setStatus(statusKey, className) {
        this.els.status.textContent = t(statusKey);
        this.els.status.className = `status ${className}`;
      },

      async start() {
        await ensureAudioContext();
        await requestWakeLock();
        this.resetAll();
        this.handleDurationChange();
        this.startPreparation(this.els.prep, this.els.timer, () => {
          this.running = true;
          this.startTime = performance.now();
          this.pausedDuration = 0;
          this.animationFrameId = requestAnimationFrame(() => this.tick());
          this.setStatus('training', 'running');
          this.els.startBtn.disabled = true;
          this.els.pauseBtn.disabled = false;
          this.els.roundBtn.disabled = false;
          this.els.toggleWorkoutViewBtn.style.display = 'inline-block';
          this.openWorkoutView();
        });
      },

      pause() {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.pauseTime = performance.now();
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) { clearInterval(this.prepInterval); this.prepInterval = null; }
        this.setStatus('paused', 'paused');
        releaseWakeLock();
        this.els.pauseBtn.disabled = true;
        this.els.resumeBtn.disabled = false;
        this.els.roundBtn.disabled = true;
        if (this.workoutViewActive) {
            this.updateWorkoutView();
        }
      },
      
      async resume() {
        if (!this.running || !this.paused) return;
        await ensureAudioContext();
        await requestWakeLock();
        this.paused = false;
        this.pausedDuration += performance.now() - this.pauseTime;
        this.animationFrameId = requestAnimationFrame(() => this.tick());
        this.setStatus('training', 'running');
        this.els.pauseBtn.disabled = false;
        this.els.resumeBtn.disabled = true;
        this.els.roundBtn.disabled = false;
        if (this.workoutViewActive) {
            this.updateWorkoutView();
        }
      },

      addRound() {
        if (!this.running || this.paused) return;
        this.rounds++;
        this.updateUI();
        beepShort();
      },
      
      resetAll() {
        this.closeWorkoutView();
        this.running = false; this.paused = false; this.inPrep = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.prepInterval) clearInterval(this.prepInterval);
        releaseWakeLock();
        this.remainingTime = this.duration; 
        this.rounds = 0; 
        this.pausedDuration = 0;
        this.lastAnnouncedSecond = null;
        this.midpointAnnounced = false;
        this.els.prep.style.display = 'none'; 
        this.els.timer.style.display = 'block';
        this.setStatus('ready', 'idle');
        this.els.startBtn.disabled = false;
        this.els.pauseBtn.disabled = true;
        this.els.resumeBtn.disabled = true;
        this.els.roundBtn.disabled = true;
        this.els.toggleWorkoutViewBtn.style.display = 'none';
        this.updateUI();
      },
      
      startPreparation(prepEl, timerEl, nextAction) {
        this.inPrep = true;
        prepEl.style.display = 'block';
        timerEl.style.display = 'none';
        this.setStatus('preparing', 'ready');
        let prep = 5;
        prepEl.textContent = prep;
        beepPrep();
        if (this.prepInterval) clearInterval(this.prepInterval);
        this.prepInterval = setInterval(() => {
          prep--;
          if (prep <= 0) {
            clearInterval(this.prepInterval);
            this.prepInterval = null;
            setTimeout(() => {
              this.inPrep = false;
              prepEl.style.display = 'none';
              timerEl.style.display = 'block';
              ring();
              setTimeout(() => {
                nextAction();
              }, 250);
            }, 250);
          } else {
            prepEl.textContent = prep;
            beepPrep();
          }
        }, 1000);
      },
      
      tick() {
        if (!this.running || this.paused) return;
        const elapsedTime = performance.now() - this.startTime - this.pausedDuration;
        this.remainingTime = this.duration - elapsedTime;
        
        if (this.remainingTime <= 0) {
          this.remainingTime = 0;
          this.updateUI();
          this.completeWorkout();
          return;
        }

        if (!this.midpointAnnounced && elapsedTime >= (this.duration / 2)) {
            ring();
            this.midpointAnnounced = true;
        }

        const secondsRemaining = Math.ceil(this.remainingTime / 1000);
        if (secondsRemaining <= 5 && secondsRemaining > 0) {
          if (this.lastAnnouncedSecond !== secondsRemaining) {
            beepShort();
            this.lastAnnouncedSecond = secondsRemaining;
          }
        }

        this.updateUI();
        this.animationFrameId = requestAnimationFrame(() => this.tick());
      },
      
      completeWorkout() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        releaseWakeLock();
        this.setStatus('workout_complete_status', 'completed');
        victoryBells();
        this.saveWorkout({ rounds: this.rounds, duration: this.duration });
        this.closeWorkoutView();
        if (this.currentWorkout) {
          this.els.workoutNotes.value = this.currentWorkout.notes || '';
          populateRpeSelect(this.els.rpeSelect, 'amrap', this.currentWorkout.rpe || null);
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
        setTimeout(() => this.els.notesModal.classList.add('active'), 1000);
      },

      openWorkoutView() {
        this.workoutViewActive = true;
        document.getElementById('workoutStatus').style.display = 'none';
        document.getElementById('workoutLapsList').parentElement.style.display = 'none';
        this.els.workoutLapBtn.style.display = 'inline-block';
        this.els.workoutProgress.style.display = 'block';
        this.els.workoutTimer.classList.add('fortime');
        this.els.workoutTimer.style.fontFamily = 'monospace';
        
        this.els.workoutView.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.updateWorkoutView();
      },

      closeWorkoutView() {
        this.workoutViewActive = false;
        this.els.workoutView.classList.remove('active');
        document.body.style.overflow = '';
      },

      updateWorkoutView() {
        if (!this.workoutViewActive) return;
        
        this.els.workoutTimer.textContent = this.formatTime(this.remainingTime);
        this.els.workoutProgress.textContent = `${t('completed_rounds')} ${this.rounds}`;
        
        if (this.paused) {
          this.els.workoutPauseBtn.textContent = t('resume');
          this.els.workoutPauseBtn.className = 'workout-btn resume';
        } else {
          this.els.workoutPauseBtn.textContent = t('pause');
          this.els.workoutPauseBtn.className = 'workout-btn pause';
        }
        
        this.els.workoutLapBtn.textContent = t('round');
        this.els.workoutPauseBtn.disabled = !this.running;
        this.els.workoutLapBtn.disabled = !this.running || this.paused;
      },

      handleWorkoutPause() {
        if (!this.running) return;
        if (this.paused) {
          this.resumeWithPrep(this.els.workoutPrep, this.els.workoutTimer);
        } else {
          this.pause();
        }
      },

      resumeWithPrep(prepEl, timerEl) {
        this.startPreparation(prepEl, timerEl, () => this.resume());
      },
      
      // Presets
      getPresets() { return JSON.parse(localStorage.getItem('amrap_presets') || '[]'); },
      savePresets(presets) { localStorage.setItem('amrap_presets', JSON.stringify(presets)); },
      renderPresets() {
        const presets = this.getPresets();
        this.els.presetsContainer.innerHTML = '';
        presets.forEach((preset, index) => {
          const btn = document.createElement('button');
          btn.className = 'preset-btn';
          btn.dataset.action = 'apply-preset';
          btn.dataset.index = index;
          btn.innerHTML = `${preset.name} <button class="preset-delete" data-action="delete-preset" data-index="${index}">×</button>`;
          this.els.presetsContainer.appendChild(btn);
        });
        this.loadPresetsList();
      },
      applyPreset(index) {
          const presets = this.getPresets();
          if (!presets[index]) return;
          const preset = presets[index];
          this.applyDuration(preset.duration);
      },
      deletePreset(index) {
          let presets = this.getPresets();
          presets.splice(index, 1);
          this.savePresets(presets);
          this.renderPresets();
      },
      loadPresetsList() {
        const presets = this.getPresets();
        if (presets.length === 0) {
          this.els.presetsList.innerHTML = `<div class="empty-history">${t('no_presets_amrap')}</div>`;
          return;
        }
        this.els.presetsList.innerHTML = presets.map((p, i) => `
          <div class="history-item">
            <div class="history-performance">${p.name}</div>
            <div class="history-details">${t('workout_duration')} ${p.duration} min</div>
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-preset" data-index="${i}">${t('edit')}</button>
              <button class="history-btn delete" data-action="delete-preset" data-index="${i}">${t('delete')}</button>
            </div>
          </div>`).join('');
      },
      openPresetModal(index = -1) {
        this.editingPresetIndex = index;
        const presets = this.getPresets();
        if (index > -1 && presets[index]) {
          const p = presets[index];
          this.els.presetModalTitle.textContent = t('edit_preset_title_amrap');
          this.els.presetName.value = p.name;
          this.els.presetDuration.value = p.duration;
        } else {
          this.els.presetModalTitle.textContent = t('new_preset_title_amrap');
          this.els.presetName.value = '';
          this.els.presetDuration.value = this.duration / 60000;
        }
        this.els.presetModal.classList.add('active');
      },
      savePreset() {
        const name = this.els.presetName.value.trim();
        const duration = this.els.presetDuration.value ? parseInt(this.els.presetDuration.value) : null;
        if (!name || !duration || duration <= 0) { alert(t('alert_fill_fields')); return; }
        
        const presets = this.getPresets();
        const newPreset = { name, duration };

        if (this.editingPresetIndex > -1) {
          presets[this.editingPresetIndex] = newPreset;
        } else {
          presets.push(newPreset);
        }
        this.savePresets(presets);
        this.renderPresets();
        this.closeAllModals();
      },
      
      // History
      getHistory() { return JSON.parse(localStorage.getItem('amrap_history') || '[]'); },
      saveHistory(history) { localStorage.setItem('amrap_history', JSON.stringify(history)); },
      loadHistory() {
        const history = this.getHistory();
        this.els.totalWorkouts.textContent = history.length;
        this.els.totalRounds.textContent = history.reduce((sum, w) => sum + (w.rounds || 0), 0);
        if (history.length === 0) {
          this.els.historyList.innerHTML = `<div class="empty-history">${t('no_history_amrap')}</div>`;
          return;
        }
        this.els.historyList.innerHTML = history.map(w => {
          const date = new Date(w.date);
          const rpeText = getRpeText('amrap', w.rpe);
          return `
          <div class="history-item">
            <div class="history-date">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div class="history-performance">${w.rounds} Rounds</div>
            <div class="history-details">${w.duration / 60000}min AMRAP</div>
            ${rpeText ? `<div class="history-notes">${t('history_rpe_entry', { rpe: rpeText })}</div>` : ''}
            ${w.notes ? `<div class="history-notes">"${w.notes}"</div>` : ''}
            <div class="history-actions">
              <button class="history-btn edit" data-action="edit-history" data-id="${w.id}">${t('edit')}</button>
              <button class="history-btn share" data-action="share-history" data-id="${w.id}">${t('share')}</button>
              <button class="history-btn delete" data-action="delete-history" data-id="${w.id}">${t('delete')}</button>
            </div>
          </div>`;
        }).join('');
      },
      exportHistory() {
        const history = this.getHistory();
        if (history.length === 0) return;
        const head = EXCEL_HEADERS.amrap;
        const rows = history.map(w => {
          const date = new Date(w.date).toLocaleDateString('en-US');
          const durationMinutes = Math.floor((w.duration || 0) / 60000);
          const rounds = w.rounds;
          const rpe = extraerRPE(w.notes, w.rpe, 'amrap');
          const notes = limpiarNotas(w.notes);

          return [date, durationMinutes, rounds, rpe, notes];
        });

        const workbook = buildExcelWorkbook('amrap', head, rows);
        downloadCSV(workbook, EXCEL_FILE_NAMES.amrap);
      },
      clearHistory() {
        if (confirm(t('confirm_clear_history'))) {
          this.saveHistory([]);
          this.loadHistory();
        }
      },
      saveWorkout(data, notes = '', rpe = null) {
        const workout = { id: Date.now(), date: new Date().toISOString(), ...data, notes, rpe };
        let history = this.getHistory();
        history.unshift(workout);
        if (history.length > 50) history.pop();
        this.saveHistory(history);
        this.currentWorkout = workout;
        this.loadHistory();
      },
      updateWorkoutNotes(id, notes, rpe = null) {
        let history = this.getHistory();
        const workout = history.find(w => w.id === id);
        if (workout) {
          workout.notes = notes;
          workout.rpe = rpe || null;
          this.saveHistory(history);
          this.loadHistory();
        }
        if (this.currentWorkout && this.currentWorkout.id === id) {
          this.currentWorkout.notes = notes;
          this.currentWorkout.rpe = rpe || null;
        }
      },
      deleteWorkout(id) {
          let history = this.getHistory();
          history = history.filter(w => w.id !== id);
          this.saveHistory(history);
          this.loadHistory();
      },
      
      // Modals
      closeAllModals() {
        document.querySelectorAll('#amrap_presetModal, #amrap_notesModal, #amrap_completionModal').forEach(m => m.classList.remove('active'));
        if (this.els.notesModal) {
          this.els.notesModal.setAttribute('data-workout-id', '');
        }
      },
      handleSkipNotes() {
        this.closeAllModals();
        if (this.currentWorkout) this.showCompletionModal();
      },
      handleSaveNotes() {
        const notes = this.els.workoutNotes.value.trim();
        const rpeValue = this.els.rpeSelect.value || null;
        const workoutId = parseInt(this.els.notesModal.getAttribute('data-workout-id'));
        if (workoutId) {
          this.updateWorkoutNotes(workoutId, notes, rpeValue);
        } else if (this.currentWorkout) {
          this.updateWorkoutNotes(this.currentWorkout.id, notes, rpeValue);
        }
        this.closeAllModals();
        if (this.currentWorkout && !workoutId) {
          this.showCompletionModal();
        }
      },
      openNotesModal(id) {
          const workout = this.getHistory().find(w => w.id === id);
          if (!workout) return;
          populateRpeSelect(this.els.rpeSelect, 'amrap', workout.rpe || null);
          this.els.workoutNotes.value = workout.notes || '';
          this.els.notesModal.setAttribute('data-workout-id', id);
          this.els.notesModal.classList.add('active');
      },
      showCompletionModal() {
        if (!this.currentWorkout) return;
        this.els.completionStats.innerHTML = `
          <div class="completion-stat"><strong>${t('completed_rounds')}</strong> ${this.currentWorkout.rounds}</div>
          <div class="completion-stat"><strong>${t('workout_duration')}</strong> ${this.currentWorkout.duration/60000} min</div>
          `;
        this.els.completionModal.classList.add('active');
      },
      openNotesFromCompletion() {
        if (!this.currentWorkout) return;
        this.closeAllModals();
        this.els.workoutNotes.value = this.currentWorkout?.notes || '';
        populateRpeSelect(this.els.rpeSelect, 'amrap', this.currentWorkout?.rpe || null);
        this.els.notesModal.setAttribute('data-workout-id', this.currentWorkout.id);
        this.els.notesModal.classList.add('active');
      },
      shareResult() {
        if (!this.currentWorkout) return;
        this.shareWorkout(this.currentWorkout.id);
      },
      shareWorkout(id) {
          const workout = this.getHistory().find(w => w.id === id);
          if (!workout) return;
          const date = new Date(workout.date).toLocaleDateString();
          const notesText = workout.notes ? `\n\nNotes: ${workout.notes}` : '';
          const text = t('share_text_amrap', {
            rounds: workout.rounds,
            duration: workout.duration / 60000,
            date: date,
            notes: notesText
          });
          if (navigator.share) {
            navigator.share({ title: t('share_title_amrap'), text });
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => alert(t('alert_copied')));
          }
      },
    };


    // === GLOBAL INITIALIZATION ===
    document.addEventListener('DOMContentLoaded', () => {
      // Settings Listeners
      document.getElementById('languageSelect').addEventListener('change', function() {
        if (window.TranslationUtil) {
          const changed = TranslationUtil.setLanguage(this.value);
          if (changed) {
            currentLanguage = TranslationUtil.getLanguage();
            updateAllAppsLanguage();
          }
        }
      });
      document.getElementById('themeSelect').addEventListener('change', function() {
        document.documentElement.setAttribute('data-theme', this.value === 'light' ? 'light' : null);
        localStorage.setItem('timer_pro_theme', this.value);
      });
      document.getElementById('volumeSlider').addEventListener('input', function() {
        const sliderValue = parseFloat(this.value);
        ensureAudioContext().then(() => {
            if (masterGain) {
                masterGain.gain.value = sliderValue;
            }
        });
        if (window.AudioUtil) {
          AudioUtil.setVolume(sliderValue);
        }
      });
      document.getElementById('wakeLockToggle').addEventListener('click', function() {
        this.classList.toggle('active');
        localStorage.setItem('timer_pro_wakeLock', this.classList.contains('active'));
      });

      // Load settings
      if (window.TranslationUtil) {
        currentLanguage = TranslationUtil.getLanguage();
      }
      const languageSelect = document.getElementById('languageSelect');
      if (languageSelect) {
        const hasOption = Array.from(languageSelect.options).some(option => option.value === currentLanguage);
        if (!hasOption && window.TranslationUtil) {
          TranslationUtil.setLanguage(TranslationUtil.defaultLanguage);
          currentLanguage = TranslationUtil.getLanguage();
        }
        languageSelect.value = currentLanguage;
      }
      
      const savedTheme = localStorage.getItem('timer_pro_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : null);
      document.getElementById('themeSelect').value = savedTheme;
      
      const savedVolume = window.AudioUtil ? AudioUtil.getVolume() : 0.8;
      document.getElementById('volumeSlider').value = savedVolume;
      
      const wakeLockEnabled = localStorage.getItem('timer_pro_wakeLock') !== 'false';
      document.getElementById('wakeLockToggle').classList.toggle('active', wakeLockEnabled);
      
      // Initialize
      updateAllAppsLanguage();
      showPage('home');

      // Add a listener to release wake lock when page is not visible
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          releaseWakeLock();
        } else if (document.visibilityState === 'visible' && 
                  (EmomApp.running && !EmomApp.paused || 
                   TabataApp.running && !TabataApp.paused || 
                   ForTimeApp.running && !ForTimeApp.paused ||
                   AmrapApp.running && !AmrapApp.paused)) {
          requestWakeLock();
        }
      });
    });
  