// utils/profiles.js - Sistema de gestión de perfiles
(function() {
  const TIMER_TYPES = ['emom', 'tabata', 'fortime', 'amrap'];
  const DEFAULT_PROFILE_COLOR = '#22c55e';
  const COLOR_PALETTE = [
    DEFAULT_PROFILE_COLOR,
    '#0ea5e9',
    '#a855f7',
    '#f97316',
    '#14b8a6',
    '#f59e0b',
    '#ef4444',
    '#6366f1'
  ];
  const LEGACY_DEFAULT_NAMES = [
    'Perfil Principal',
    'Main Profile',
    'Hauptprofil',
    'Profil principal',
    'Profilo principale',
    'Perfil principal',
    '主要档案'
  ];

  const translate = key => (window.TranslationUtil ? TranslationUtil.t(key) : key);

  const cloneProfileTemplate = () => ({ ...StorageUtil.PROFILE_DATA_TEMPLATE });

  const ProfilesManager = {
    elements: {},
    editingProfileId: null,
    pendingProfile: null,

    initProfilesSystem() {
      if (!window.StorageUtil) return;
      this.migrateLegacyData();
      this.ensureDefaultProfile();
      this.cacheElements();
      this.bindEvents();
      this.updateCurrentProfileIndicator();
      this.renderProfilesList();
    },

    cacheElements() {
      this.elements = {
        profilesModal: document.getElementById('profilesModal'),
        profilesList: document.getElementById('profilesList'),
        createProfileBtn: document.getElementById('createProfileBtn'),
        currentProfileIndicator: document.getElementById('currentProfileIndicator'),
        currentProfileName: document.getElementById('currentProfileName'),
        profileDot: document.querySelector('#currentProfileIndicator .profile-dot'),
        profileDataModal: document.getElementById('profileDataModal'),
        saveProfileDataBtn: document.getElementById('saveProfileDataBtn'),
        profileForm: {
          name: document.getElementById('profileUserName'),
          age: document.getElementById('profileAge'),
          sex: document.getElementById('profileSex'),
          fitnessLevel: document.getElementById('profileFitnessLevel'),
          goal: document.getElementById('profileGoal'),
          trainingDays: document.getElementById('profileTrainingDays'),
          weight: document.getElementById('profileWeight'),
          height: document.getElementById('profileHeight'),
          experience: document.getElementById('profileExperience'),
          limitations: document.getElementById('profileLimitations'),
          preferences: Array.from(document.querySelectorAll('#profileDataModal input[name="preferences"]'))
        }
      };
    },

    bindEvents() {
      if (this.elements.createProfileBtn) {
        this.elements.createProfileBtn.addEventListener('click', () => this.createNewProfile());
      }

      if (this.elements.profilesList) {
        this.elements.profilesList.addEventListener('click', event => {
          const button = event.target.closest('button[data-action]');
          if (!button) return;
          const profileId = button.dataset.profileId;
          if (!profileId) return;
          switch (button.dataset.action) {
            case 'switch':
              this.switchProfile(profileId);
              break;
            case 'edit':
              this.openProfileDataModal(profileId);
              break;
            case 'delete':
              this.deleteProfile(profileId);
              break;
            default:
              break;
          }
        });
      }

      if (this.elements.saveProfileDataBtn) {
        this.elements.saveProfileDataBtn.addEventListener('click', () => this.handleSaveProfileData());
      }

      document.querySelectorAll('#profilesModal [data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => this.closeProfilesModal());
      });

      document.querySelectorAll('#profileDataModal [data-modal-close], #profileDataModal [data-modal-cancel]').forEach(btn => {
        btn.addEventListener('click', () => this.closeProfileDataModal());
      });

      [this.elements.profilesModal, this.elements.profileDataModal].forEach(modal => {
        if (!modal) return;
        modal.addEventListener('click', event => {
          if (event.target === modal) {
            modal.id === 'profilesModal' ? this.closeProfilesModal() : this.closeProfileDataModal();
          }
        });
      });
    },

    getDefaultNamePrefix() {
      const rawPrefix = translate('profile_default_name_prefix');
      if (rawPrefix && rawPrefix !== 'profile_default_name_prefix') {
        return rawPrefix;
      }
      const fallback = translate('profile_name');
      return fallback && fallback !== 'profile_name' ? fallback : 'User';
    },

    formatDefaultProfileName(number = 1) {
      return `${this.getDefaultNamePrefix()} ${number}`.trim();
    },

    getNextDefaultProfileName() {
      const prefix = this.getDefaultNamePrefix();
      const profiles = this.getProfiles();
      const existingNames = new Set(
        profiles
          .map(profile => (profile.name || '').trim().toLowerCase())
          .filter(Boolean)
      );

      let counter = 1;
      let candidate = '';
      do {
        candidate = `${prefix} ${counter}`.trim().toLowerCase();
        counter += 1;
      } while (existingNames.has(candidate));

      return `${prefix} ${counter - 1}`.trim();
    },

    isLegacyDefaultName(name) {
      if (!name) return true;
      const normalized = name.trim().toLowerCase();
      return LEGACY_DEFAULT_NAMES.some(legacy => legacy.trim().toLowerCase() === normalized);
    },

    ensureDefaultProfileNaming(profiles = null) {
      const list = profiles || this.getProfiles();
      if (!Array.isArray(list) || !list.length) return;

      const defaultProfile = list.find(profile => profile.id === 'default');
      if (!defaultProfile) return;

      const expectedName = this.formatDefaultProfileName(1);
      let requiresSave = false;

      if (!defaultProfile.name || this.isLegacyDefaultName(defaultProfile.name)) {
        defaultProfile.name = expectedName;
        requiresSave = true;
      }

      if (!defaultProfile.color || defaultProfile.color === '#3498db') {
        defaultProfile.color = DEFAULT_PROFILE_COLOR;
        requiresSave = true;
      }

      if (requiresSave) {
        this.saveProfiles(list);
      }

      const defaultProfileData = StorageUtil.getProfileData('default');
      if (!defaultProfileData.name || this.isLegacyDefaultName(defaultProfileData.name)) {
        StorageUtil.saveProfileData('default', { ...defaultProfileData, name: expectedName });
      }
    },

    migrateLegacyData() {
      const profiles = StorageUtil.getProfilesList();
      if (profiles && profiles.length) return;

      let migrated = false;
      const defaultId = 'default';

      TIMER_TYPES.forEach(type => {
        const legacyPresets = StorageUtil.get(`${type}_presets`, null);
        if (Array.isArray(legacyPresets) && legacyPresets.length) {
          StorageUtil.set(StorageUtil.getProfileKey(type, 'presets', defaultId), legacyPresets);
          StorageUtil.remove(`${type}_presets`);
          migrated = true;
        }
        const legacyHistory = StorageUtil.get(`${type}_history`, null);
        if (Array.isArray(legacyHistory) && legacyHistory.length) {
          StorageUtil.set(StorageUtil.getProfileKey(type, 'history', defaultId), legacyHistory);
          StorageUtil.remove(`${type}_history`);
          migrated = true;
        }
      });

      if (migrated) {
        const defaultName = this.formatDefaultProfileName(1);
        const newProfile = {
          id: defaultId,
          name: defaultName,
          color: DEFAULT_PROFILE_COLOR,
          createdAt: new Date().toISOString()
        };
        StorageUtil.saveProfilesList([newProfile]);
        StorageUtil.saveProfileData(defaultId, { ...cloneProfileTemplate(), name: defaultName });
        StorageUtil.setCurrentProfile(defaultId);
        this.ensureDefaultProfileNaming([newProfile]);
      }
    },

    ensureDefaultProfile() {
      let profiles = StorageUtil.getProfilesList();
      const settings = StorageUtil.getSettings();
      if (!profiles || !profiles.length) {
        const defaultName = this.formatDefaultProfileName(1);
        profiles = [{
          id: 'default',
          name: defaultName,
          color: DEFAULT_PROFILE_COLOR,
          createdAt: new Date().toISOString()
        }];
        StorageUtil.saveProfilesList(profiles);
        StorageUtil.saveProfileData('default', { ...cloneProfileTemplate(), name: defaultName });
      }
      this.ensureDefaultProfileNaming(profiles);
      if (!settings.activeProfile || !profiles.find(p => p.id === settings.activeProfile)) {
        StorageUtil.setCurrentProfile(profiles[0].id);
      }
    },

    getProfiles() {
      return StorageUtil.getProfilesList();
    },

    saveProfiles(list) {
      StorageUtil.saveProfilesList(list);
    },

    pickColor() {
      const profiles = this.getProfiles();
      const usedColors = profiles.map(profile => profile.color).filter(Boolean);
      const available = COLOR_PALETTE.find(color => !usedColors.includes(color));
      return available || COLOR_PALETTE[profiles.length % COLOR_PALETTE.length] || DEFAULT_PROFILE_COLOR;
    },

    generateId() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `profile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    },

    openProfilesManager() {
      this.renderProfilesList();
      if (this.elements.profilesModal) {
        this.elements.profilesModal.classList.add('active');
      }
    },

    closeProfilesModal() {
      if (this.elements.profilesModal) {
        this.elements.profilesModal.classList.remove('active');
      }
    },

    renderProfilesList() {
      if (!this.elements.profilesList) return;
      const profiles = this.getProfiles();
      const activeId = StorageUtil.getCurrentProfileId();
      const fragment = document.createDocumentFragment();

      profiles.forEach(profile => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        if (profile.id === activeId) {
          card.classList.add('active');
        }

        const info = document.createElement('div');
        info.className = 'profile-info';

        const dot = document.createElement('div');
        dot.className = 'profile-color-dot';
        dot.style.backgroundColor = profile.color || DEFAULT_PROFILE_COLOR;

        const name = document.createElement('div');
        name.className = 'profile-name';
        name.textContent = profile.name || translate('profile_name');

        info.appendChild(dot);
        info.appendChild(name);

        const actions = document.createElement('div');
        actions.className = 'profile-actions';

        const switchBtn = document.createElement('button');
        switchBtn.className = 'btn-switch';
        switchBtn.dataset.action = 'switch';
        switchBtn.dataset.profileId = profile.id;
        switchBtn.dataset.i18n = 'switch_profile';
        switchBtn.textContent = translate('switch_profile');

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.dataset.action = 'edit';
        editBtn.dataset.profileId = profile.id;
        editBtn.dataset.i18n = 'edit_profile';
        editBtn.textContent = translate('edit_profile');

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.dataset.action = 'delete';
        deleteBtn.dataset.profileId = profile.id;
        deleteBtn.dataset.i18n = 'delete_profile';
        deleteBtn.textContent = translate('delete_profile');

        actions.appendChild(switchBtn);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        card.appendChild(info);
        card.appendChild(actions);
        fragment.appendChild(card);
      });

      this.elements.profilesList.innerHTML = '';
      this.elements.profilesList.appendChild(fragment);
    },

    updateCurrentProfileIndicator() {
      if (!this.elements.currentProfileIndicator) return;
      const activeId = StorageUtil.getCurrentProfileId();
      const profiles = this.getProfiles();
      const activeProfile = profiles.find(profile => profile.id === activeId) || profiles[0];
      if (!activeProfile) return;
      const name = activeProfile.name || this.formatDefaultProfileName(1);
      if (this.elements.currentProfileName) {
        this.elements.currentProfileName.textContent = name;
      }
      if (this.elements.profileDot) {
        this.elements.profileDot.style.backgroundColor = activeProfile.color || DEFAULT_PROFILE_COLOR;
      }
    },

    createNewProfile() {
      const id = this.generateId();
      const defaultName = this.getNextDefaultProfileName();
      this.pendingProfile = {
        id,
        name: defaultName,
        color: this.pickColor(),
        createdAt: new Date().toISOString()
      };
      const initialData = { ...cloneProfileTemplate(), name: defaultName };
      this.openProfileDataModal(id, initialData, { preservePending: true });
    },

    switchProfile(profileId) {
      const activeId = StorageUtil.getCurrentProfileId();
      if (activeId === profileId) {
        this.closeProfilesModal();
        return;
      }
      if (this.isAnyTimerActive() && !window.confirm(translate('confirm_switch_profile'))) {
        return;
      }
      StorageUtil.setCurrentProfile(profileId);
      this.updateCurrentProfileIndicator();
      this.refreshAppsForProfileChange();
      this.renderProfilesList();
      this.closeProfilesModal();
    },

    deleteProfile(profileId) {
      const profiles = this.getProfiles();
      if (profiles.length <= 1) {
        alert(translate('profile_delete_last_error'));
        return;
      }
      if (!window.confirm(translate('confirm_delete_profile'))) {
        return;
      }
      const updatedProfiles = profiles.filter(profile => profile.id !== profileId);
      this.saveProfiles(updatedProfiles);
      StorageUtil.removeProfileStorage(profileId);

      if (StorageUtil.getCurrentProfileId() === profileId) {
        StorageUtil.setCurrentProfile(updatedProfiles[0].id);
        this.refreshAppsForProfileChange();
      }
      this.updateCurrentProfileIndicator();
      this.renderProfilesList();
    },

    openProfileDataModal(profileId, initialData = null, options = {}) {
      if (!options.preservePending) {
        this.pendingProfile = null;
      }
      this.editingProfileId = profileId;
      const data = initialData || StorageUtil.getProfileData(profileId);
      this.populateForm(data);
      if (this.elements.profileDataModal) {
        this.elements.profileDataModal.classList.add('active');
      }
    },

    closeProfileDataModal() {
      if (this.elements.profileDataModal) {
        this.elements.profileDataModal.classList.remove('active');
      }
      this.editingProfileId = null;
      this.pendingProfile = null;
    },

    populateForm(data) {
      if (!this.elements.profileForm) return;
      const form = this.elements.profileForm;
      form.name.value = data.name || '';
      form.age.value = data.age !== null && data.age !== undefined ? data.age : '';
      form.sex.value = data.biologicalSex || '';
      form.fitnessLevel.value = data.fitnessLevel || '';
      form.goal.value = data.goal || '';
      form.trainingDays.value = data.trainingDays !== null && data.trainingDays !== undefined ? data.trainingDays : '';
      form.weight.value = data.weight !== null && data.weight !== undefined ? data.weight : '';
      form.height.value = data.height !== null && data.height !== undefined ? data.height : '';
      form.experience.value = data.experience || '';
      form.limitations.value = data.limitations || '';

      const preferenceValues = Array.isArray(data.preferences) ? data.preferences : [];
      form.preferences.forEach(input => {
        input.checked = preferenceValues.includes(input.value);
      });
    },

    collectFormData() {
      if (!this.elements.profileForm) return null;
      const form = this.elements.profileForm;
      const name = form.name.value.trim();
      if (!name) {
        alert(translate('profile_name_required'));
        return null;
      }

      const ageValue = form.age.value.trim();
      let age = null;
      if (ageValue) {
        const parsed = parseInt(ageValue, 10);
        if (Number.isNaN(parsed) || parsed < 13 || parsed > 100) {
          alert(translate('profile_age_invalid'));
          return null;
        }
        age = parsed;
      }

      const trainingDaysValue = form.trainingDays.value.trim();
      const trainingDays = trainingDaysValue ? parseInt(trainingDaysValue, 10) : null;

      const weightValue = form.weight.value.trim();
      const weight = weightValue ? parseFloat(weightValue) : null;

      const heightValue = form.height.value.trim();
      const height = heightValue ? parseInt(heightValue, 10) : null;

      const preferences = form.preferences
        .filter(input => input.checked)
        .map(input => input.value);

      return {
        name,
        age,
        biologicalSex: form.sex.value,
        fitnessLevel: form.fitnessLevel.value,
        goal: form.goal.value,
        trainingDays,
        weight: Number.isNaN(weight) ? null : weight,
        height: Number.isNaN(height) ? null : height,
        experience: form.experience.value,
        limitations: form.limitations.value.trim(),
        preferences
      };
    },

    handleSaveProfileData() {
      if (!this.editingProfileId) {
        this.closeProfileDataModal();
        return;
      }
      const formData = this.collectFormData();
      if (!formData) return;
      const isNewProfile = this.pendingProfile && this.pendingProfile.id === this.editingProfileId;
      StorageUtil.saveProfileData(this.editingProfileId, formData);
      const profiles = this.getProfiles();
      if (isNewProfile) {
        const newProfile = {
          ...this.pendingProfile,
          name: formData.name
        };
        profiles.push(newProfile);
        this.saveProfiles(profiles);
        StorageUtil.setCurrentProfile(newProfile.id);
        this.refreshAppsForProfileChange();
      } else {
        const profile = profiles.find(p => p.id === this.editingProfileId);
        if (profile) {
          profile.name = formData.name;
          if (!profile.color) {
            profile.color = this.pickColor();
          }
          this.saveProfiles(profiles);
        }
      }
      this.pendingProfile = null;
      this.updateCurrentProfileIndicator();
      this.renderProfilesList();
      this.closeProfileDataModal();
    },

    handleLanguageChange() {
      this.renderProfilesList();
      this.updateCurrentProfileIndicator();
      if (this.editingProfileId) {
        const data = StorageUtil.getProfileData(this.editingProfileId);
        this.populateForm(data);
      }
    },

    isAnyTimerActive() {
      const apps = [window.EmomApp, window.TabataApp, window.ForTimeApp, window.AmrapApp];
      return apps.some(app => app && ((app.running && !app.paused) || app.inPrep));
    },

    refreshAppsForProfileChange() {
      if (window.EmomApp && EmomApp.initialized) {
        EmomApp.renderPresets();
        EmomApp.loadHistory();
      }
      if (window.TabataApp && TabataApp.initialized) {
        if (typeof TabataApp.reloadProfileData === 'function') {
          TabataApp.reloadProfileData();
        } else {
          TabataApp.customPresets = StorageUtil.getPresets('tabata');
          TabataApp.history = StorageUtil.getHistory('tabata');
          TabataApp.renderCustomPresets();
          TabataApp.loadHistory();
        }
      }
      if (window.ForTimeApp && ForTimeApp.initialized) {
        ForTimeApp.renderPresets();
        ForTimeApp.loadHistory();
      }
      if (window.AmrapApp && AmrapApp.initialized) {
        AmrapApp.renderPresets();
        AmrapApp.loadHistory();
      }
    }
  };

  window.ProfilesManager = ProfilesManager;
  window.openProfilesManager = () => ProfilesManager.openProfilesManager();
})();
