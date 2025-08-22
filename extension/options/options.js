// Options Page JavaScript for Going Bananas T&C Analyzer
class OptionsController {
  constructor() {
    this.defaultSettings = {
      autoAnalyze: true,
      showNotifications: true,
      riskThreshold: 6.0,
      apiEndpoint: 'mock',
      apiKey: '',
      analysisDetail: 'standard',
      cacheTimeout: 86400,
      analyzePrivacy: true,
      analyzeLiability: true,
      analyzeTermination: true,
      analyzePayment: true,
      sendUsageData: false,
      shareAnalytics: false
    };

    this.init();
  }

  async init() {
    this.initializeElements();
    this.bindEvents();
    await this.loadSettings();
    this.initializeTabs();
    await this.updateSystemStatus();
  }

  initializeElements() {
    // Tab elements
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Form elements
    this.autoAnalyze = document.getElementById('autoAnalyze');
    this.showNotifications = document.getElementById('showNotifications');
    this.riskThreshold = document.getElementById('riskThreshold');
    this.riskThresholdValue = document.getElementById('riskThresholdValue');
    this.apiEndpoint = document.getElementById('apiEndpoint');
    this.apiKey = document.getElementById('apiKey');
    this.toggleApiKey = document.getElementById('toggleApiKey');
    this.analysisDetail = document.getElementById('analysisDetail');
    this.cacheTimeout = document.getElementById('cacheTimeout');
    this.clearCache = document.getElementById('clearCache');
    this.cacheSize = document.getElementById('cacheSize');

    // Category checkboxes
    this.analyzePrivacy = document.getElementById('analyzePrivacy');
    this.analyzeLiability = document.getElementById('analyzeLiability');
    this.analyzeTermination = document.getElementById('analyzeTermination');
    this.analyzePayment = document.getElementById('analyzePayment');

    // Privacy settings
    this.sendUsageData = document.getElementById('sendUsageData');
    this.shareAnalytics = document.getElementById('shareAnalytics');

    // Action buttons
    this.saveSettings = document.getElementById('saveSettings');
    this.resetSettings = document.getElementById('resetSettings');
    this.saveStatus = document.getElementById('saveStatus');

    // Status elements
    this.apiStatus = document.getElementById('apiStatus');
    this.aboutCacheSize = document.getElementById('aboutCacheSize');
    this.lastAnalysis = document.getElementById('lastAnalysis');
    this.totalAnalyses = document.getElementById('totalAnalyses');
  }

  bindEvents() {
    // Tab navigation
    this.tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Range slider
    if (this.riskThreshold) {
      this.riskThreshold.addEventListener('input', (e) => {
        this.riskThresholdValue.textContent = parseFloat(e.target.value).toFixed(1);
      });
    }

    // API key toggle
    if (this.toggleApiKey) {
      this.toggleApiKey.addEventListener('click', () => {
        this.toggleApiKeyVisibility();
      });
    }

    // Clear cache
    if (this.clearCache) {
      this.clearCache.addEventListener('click', () => {
        this.handleClearCache();
      });
    }

    // Save and reset buttons
    if (this.saveSettings) {
      this.saveSettings.addEventListener('click', () => {
        this.handleSaveSettings();
      });
    }

    if (this.resetSettings) {
      this.resetSettings.addEventListener('click', () => {
        this.handleResetSettings();
      });
    }

    // Auto-save on change
    this.bindAutoSave();
  }

  bindAutoSave() {
    const inputs = [
      this.autoAnalyze, this.showNotifications, this.apiEndpoint,
      this.analysisDetail, this.cacheTimeout, this.analyzePrivacy,
      this.analyzeLiability, this.analyzeTermination, this.analyzePayment,
      this.sendUsageData, this.shareAnalytics
    ];

    inputs.forEach(input => {
      if (input) {
        input.addEventListener('change', () => {
          this.autoSave();
        });
      }
    });

    // Special handling for range slider
    if (this.riskThreshold) {
      this.riskThreshold.addEventListener('change', () => {
        this.autoSave();
      });
    }

    // API key doesn't auto-save (only on explicit save)
  }

  switchTab(tabId) {
    // Update tab buttons
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab content
    this.tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });

    // Update system status when about tab is opened
    if (tabId === 'about') {
      this.updateSystemStatus();
    }
  }

  initializeTabs() {
    // Show first tab by default
    const firstTab = this.tabButtons[0];
    if (firstTab) {
      this.switchTab(firstTab.dataset.tab);
    }
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(Object.keys(this.defaultSettings));
      const mergedSettings = { ...this.defaultSettings, ...settings };

      // Apply settings to form elements
      this.applySettingsToForm(mergedSettings);
      
      console.log('Settings loaded:', mergedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  applySettingsToForm(settings) {
    // Checkboxes
    if (this.autoAnalyze) this.autoAnalyze.checked = settings.autoAnalyze;
    if (this.showNotifications) this.showNotifications.checked = settings.showNotifications;
    if (this.analyzePrivacy) this.analyzePrivacy.checked = settings.analyzePrivacy;
    if (this.analyzeLiability) this.analyzeLiability.checked = settings.analyzeLiability;
    if (this.analyzeTermination) this.analyzeTermination.checked = settings.analyzeTermination;
    if (this.analyzePayment) this.analyzePayment.checked = settings.analyzePayment;
    if (this.sendUsageData) this.sendUsageData.checked = settings.sendUsageData;
    if (this.shareAnalytics) this.shareAnalytics.checked = settings.shareAnalytics;

    // Range slider
    if (this.riskThreshold) {
      this.riskThreshold.value = settings.riskThreshold;
      this.riskThresholdValue.textContent = settings.riskThreshold.toFixed(1);
    }

    // Select elements
    if (this.apiEndpoint) this.apiEndpoint.value = settings.apiEndpoint;
    if (this.analysisDetail) this.analysisDetail.value = settings.analysisDetail;
    if (this.cacheTimeout) this.cacheTimeout.value = settings.cacheTimeout;

    // API key (don't load for security)
    if (this.apiKey) this.apiKey.value = settings.apiKey ? '••••••••••••••••' : '';
  }

  collectFormData() {
    return {
      autoAnalyze: this.autoAnalyze?.checked ?? this.defaultSettings.autoAnalyze,
      showNotifications: this.showNotifications?.checked ?? this.defaultSettings.showNotifications,
      riskThreshold: parseFloat(this.riskThreshold?.value ?? this.defaultSettings.riskThreshold),
      apiEndpoint: this.apiEndpoint?.value ?? this.defaultSettings.apiEndpoint,
      analysisDetail: this.analysisDetail?.value ?? this.defaultSettings.analysisDetail,
      cacheTimeout: parseInt(this.cacheTimeout?.value ?? this.defaultSettings.cacheTimeout),
      analyzePrivacy: this.analyzePrivacy?.checked ?? this.defaultSettings.analyzePrivacy,
      analyzeLiability: this.analyzeLiability?.checked ?? this.defaultSettings.analyzeLiability,
      analyzeTermination: this.analyzeTermination?.checked ?? this.defaultSettings.analyzeTermination,
      analyzePayment: this.analyzePayment?.checked ?? this.defaultSettings.analyzePayment,
      sendUsageData: this.sendUsageData?.checked ?? this.defaultSettings.sendUsageData,
      shareAnalytics: this.shareAnalytics?.checked ?? this.defaultSettings.shareAnalytics
    };
  }

  async autoSave() {
    try {
      const settings = this.collectFormData();
      await chrome.storage.sync.set(settings);
      this.showStatus('Settings saved automatically', 'success', 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  async handleSaveSettings() {
    try {
      const settings = this.collectFormData();
      
      // Handle API key separately (only save if changed)
      if (this.apiKey && this.apiKey.value && !this.apiKey.value.includes('•')) {
        settings.apiKey = this.apiKey.value;
      }

      await chrome.storage.sync.set(settings);
      
      // Notify background script of settings change
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        data: settings
      });

      this.showStatus('All settings saved successfully!', 'success');
      
      // Mask API key again
      if (this.apiKey && settings.apiKey) {
        this.apiKey.value = '••••••••••••••••';
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  async handleResetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(this.defaultSettings);
      
      this.applySettingsToForm(this.defaultSettings);
      this.showStatus('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showStatus('Failed to reset settings', 'error');
    }
  }

  async handleClearCache() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearCache'
      });

      if (response.success) {
        this.showStatus('Cache cleared successfully', 'success');
        await this.updateCacheSize();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showStatus('Failed to clear cache', 'error');
    }
  }

  toggleApiKeyVisibility() {
    if (this.apiKey.type === 'password') {
      this.apiKey.type = 'text';
      this.toggleApiKey.textContent = '🙈';
    } else {
      this.apiKey.type = 'password';
      this.toggleApiKey.textContent = '👁️';
    }
  }

  async updateSystemStatus() {
    try {
      // Get health check from background script
      const response = await chrome.runtime.sendMessage({
        action: 'healthCheck'
      });

      if (response.success) {
        this.updateStatusDisplay(response.health);
      }
      
      // Update cache size
      await this.updateCacheSize();
      
    } catch (error) {
      console.error('Failed to update system status:', error);
      this.updateStatusDisplay({
        status: 'error',
        api_reachable: false,
        cache_size: 0,
        last_analysis: null
      });
    }
  }

  updateStatusDisplay(health) {
    // API Status
    if (this.apiStatus) {
      const statusText = health.api_reachable ? '✅ Connected' : '❌ Disconnected';
      const statusColor = health.api_reachable ? '#28a745' : '#dc3545';
      this.apiStatus.textContent = statusText;
      this.apiStatus.style.color = statusColor;
    }

    // Last Analysis
    if (this.lastAnalysis && health.last_analysis) {
      const date = new Date(health.last_analysis);
      this.lastAnalysis.textContent = date.toLocaleString();
    }

    // Total Analyses (cache size as proxy)
    if (this.totalAnalyses) {
      this.totalAnalyses.textContent = health.cache_size.toString();
    }
  }

  async updateCacheSize() {
    try {
      const allData = await chrome.storage.local.get();
      const analysisKeys = Object.keys(allData).filter(key => key.startsWith('analysis_'));
      const cacheCount = analysisKeys.length;
      
      // Calculate approximate size
      const cacheSize = JSON.stringify(allData).length;
      const sizeFormatted = this.formatBytes(cacheSize);
      
      const cacheText = `${cacheCount} analyses (${sizeFormatted})`;
      
      if (this.cacheSize) {
        this.cacheSize.textContent = cacheText;
      }
      
      if (this.aboutCacheSize) {
        this.aboutCacheSize.textContent = cacheText;
      }
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      if (this.cacheSize) this.cacheSize.textContent = 'Error calculating';
      if (this.aboutCacheSize) this.aboutCacheSize.textContent = 'Error calculating';
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showStatus(message, type = 'success', duration = 5000) {
    if (!this.saveStatus) return;

    this.saveStatus.textContent = message;
    this.saveStatus.className = `save-status ${type}`;

    if (duration > 0) {
      setTimeout(() => {
        this.saveStatus.textContent = '';
        this.saveStatus.className = 'save-status';
      }, duration);
    }
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Page became visible, update status
    console.log('Options page visible');
  }
});
