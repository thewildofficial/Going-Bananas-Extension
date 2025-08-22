// Background Service Worker for Going Bananas T&C Analyzer
class BackgroundService {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api';
    this.mockApiUrl = 'http://localhost:3001/api';
    this.useMockApi = true; // Toggle for development
    
    this.initializeListeners();
    this.initializeSettings();
  }

  initializeListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates to detect new T&C pages
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle browser action click
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });
  }

  async initializeSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'apiKey',
        'autoAnalyze',
        'showNotifications',
        'riskThreshold'
      ]);

      // Set default settings if not present
      const defaultSettings = {
        autoAnalyze: true,
        showNotifications: true,
        riskThreshold: 6.0,
        apiKey: ''
      };

      const newSettings = { ...defaultSettings, ...settings };
      await chrome.storage.sync.set(newSettings);
      
      console.log('Background service initialized with settings:', newSettings);
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  }

  handleInstallation(details) {
    if (details.reason === 'install') {
      // First time installation
      chrome.tabs.create({
        url: chrome.runtime.getURL('options/options.html')
      });
      
      this.showNotification({
        title: 'Going Bananas Installed!',
        message: 'T&C analyzer is ready. Visit any terms page to get started.',
        iconUrl: 'assets/icon48.png'
      });
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Extension updated from', details.previousVersion);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'analyzeTermsText':
          const analysis = await this.analyzeTermsText(message.data);
          sendResponse({
            success: true,
            analysis: analysis
          });
          break;

        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({
            success: true,
            settings: settings
          });
          break;

        case 'updateSettings':
          await this.updateSettings(message.data);
          sendResponse({
            success: true
          });
          break;

        case 'healthCheck':
          const health = await this.performHealthCheck();
          sendResponse({
            success: true,
            health: health
          });
          break;

        case 'clearCache':
          await this.clearAnalysisCache();
          sendResponse({
            success: true
          });
          break;

        default:
          sendResponse({
            success: false,
            error: 'Unknown action: ' + message.action
          });
      }
    } catch (error) {
      console.error('Background message handling error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async analyzeTermsText(data) {
    const { text, url, timestamp } = data;
    
    try {
      // Check cache first
      const cached = await this.getCachedAnalysis(url);
      if (cached) {
        return cached;
      }

      // Prepare request payload
      const payload = {
        text: text,
        url: url,
        options: {
          language: 'en',
          detail_level: 'standard'
        },
        timestamp: timestamp
      };

      // Choose API endpoint
      const apiUrl = this.useMockApi ? this.mockApiUrl : this.apiBaseUrl;
      
      // Get API key from settings
      const settings = await this.getSettings();
      
      const headers = {
        'Content-Type': 'application/json'
      };

      if (settings.apiKey && !this.useMockApi) {
        headers['Authorization'] = `Bearer ${settings.apiKey}`;
      }

      // Make API request
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Cache the result
      await this.cacheAnalysis(url, result.analysis);
      
      // Show notification for high-risk findings
      if (result.analysis.risk_score >= 8) {
        this.showHighRiskNotification(url, result.analysis);
      }

      return result.analysis;
    } catch (error) {
      console.error('Terms analysis failed:', error);
      
      // Fall back to mock analysis in development
      if (this.useMockApi || error.message.includes('fetch')) {
        return this.getMockAnalysis(text);
      }
      
      throw error;
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      const settings = await this.getSettings();
      
      if (settings.autoAnalyze && this.isTermsUrl(tab.url)) {
        // Auto-analyze if enabled
        setTimeout(() => {
          this.triggerAutoAnalysis(tabId);
        }, 2000); // Give page time to load
      }
    }
  }

  handleActionClick(tab) {
    // This is called when extension icon is clicked
    // The popup should handle the interaction
    console.log('Extension action clicked for tab:', tab.id);
  }

  isTermsUrl(url) {
    const urlLower = url.toLowerCase();
    const termsKeywords = [
      'terms', 'conditions', 'privacy', 'policy', 'agreement',
      'legal', 'tos', 'eula', 'license'
    ];
    
    return termsKeywords.some(keyword => urlLower.includes(keyword));
  }

  async triggerAutoAnalysis(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'autoAnalyze'
      });
    } catch (error) {
      // Content script might not be injected yet
      console.log('Could not trigger auto-analysis:', error.message);
    }
  }

  async getCachedAnalysis(url) {
    try {
      const cacheKey = `analysis_${this.hashUrl(url)}`;
      const result = await chrome.storage.local.get(cacheKey);
      const cached = result[cacheKey];
      
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        return cached.data;
      }
    } catch (error) {
      console.error('Failed to get cached analysis:', error);
    }
    return null;
  }

  async cacheAnalysis(url, analysis) {
    try {
      const cacheKey = `analysis_${this.hashUrl(url)}`;
      await chrome.storage.local.set({
        [cacheKey]: {
          data: analysis,
          timestamp: Date.now(),
          url: url
        }
      });
    } catch (error) {
      console.error('Failed to cache analysis:', error);
    }
  }

  async clearAnalysisCache() {
    try {
      const allData = await chrome.storage.local.get();
      const analysisKeys = Object.keys(allData).filter(key => key.startsWith('analysis_'));
      
      if (analysisKeys.length > 0) {
        await chrome.storage.local.remove(analysisKeys);
        console.log(`Cleared ${analysisKeys.length} cached analyses`);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getSettings() {
    try {
      return await chrome.storage.sync.get([
        'apiKey',
        'autoAnalyze',
        'showNotifications',
        'riskThreshold'
      ]);
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        autoAnalyze: true,
        showNotifications: true,
        riskThreshold: 6.0,
        apiKey: ''
      };
    }
  }

  async updateSettings(newSettings) {
    try {
      await chrome.storage.sync.set(newSettings);
      console.log('Settings updated:', newSettings);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async performHealthCheck() {
    const health = {
      status: 'unknown',
      api_reachable: false,
      cache_size: 0,
      last_analysis: null,
      settings_valid: false
    };

    try {
      // Check API reachability
      const apiUrl = this.useMockApi ? this.mockApiUrl : this.apiBaseUrl;
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      health.api_reachable = response.ok;
      
      // Check cache size
      const allData = await chrome.storage.local.get();
      const analysisKeys = Object.keys(allData).filter(key => key.startsWith('analysis_'));
      health.cache_size = analysisKeys.length;
      
      // Check for recent analysis
      if (analysisKeys.length > 0) {
        const recentKey = analysisKeys[analysisKeys.length - 1];
        health.last_analysis = allData[recentKey]?.timestamp;
      }
      
      // Validate settings
      const settings = await this.getSettings();
      health.settings_valid = !this.useMockApi ? !!settings.apiKey : true;
      
      health.status = health.api_reachable && health.settings_valid ? 'healthy' : 'unhealthy';
      
    } catch (error) {
      console.error('Health check failed:', error);
      health.status = 'error';
    }

    return health;
  }

  showNotification(options) {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: options.iconUrl || 'assets/icon48.png',
        title: options.title,
        message: options.message
      });
    }
  }

  showHighRiskNotification(url, analysis) {
    this.showNotification({
      title: '⚠️ High Risk Terms Detected',
      message: `Risk Score: ${analysis.risk_score.toFixed(1)} - Click to view details`,
      iconUrl: 'assets/icon48.png'
    });
  }

  getMockAnalysis(text) {
    // Generate realistic mock data based on text length and content
    const wordCount = text.split(' ').length;
    const hasPrivacyTerms = /privacy|data|personal|collect/i.test(text);
    const hasLiabilityTerms = /liable|responsible|disclaim|warranty/i.test(text);
    
    let riskScore = 5.0;
    if (hasPrivacyTerms) riskScore += 1.5;
    if (hasLiabilityTerms) riskScore += 1.0;
    if (wordCount > 5000) riskScore += 0.5;
    
    const riskLevel = riskScore >= 7 ? 'high' : riskScore >= 5 ? 'medium' : 'low';
    
    return {
      risk_score: Math.min(riskScore, 10),
      risk_level: riskLevel,
      summary: this.generateMockSummary(riskLevel),
      key_points: this.generateMockKeyPoints(hasPrivacyTerms, hasLiabilityTerms),
      categories: {
        privacy: { 
          score: hasPrivacyTerms ? 7.2 : 4.1,
          concerns: hasPrivacyTerms ? 
            ['Extensive data collection', 'Third-party sharing'] :
            ['Basic data collection only']
        },
        liability: { 
          score: hasLiabilityTerms ? 6.8 : 3.5,
          concerns: hasLiabilityTerms ?
            ['Limited company liability', 'User assumes risk'] :
            ['Standard liability terms']
        },
        termination: { 
          score: 5.2,
          concerns: ['Standard termination clauses']
        }
      },
      confidence: 0.85,
      word_count: wordCount,
      analysis_time: Date.now()
    };
  }

  generateMockSummary(riskLevel) {
    const summaries = {
      low: 'This service has reasonable terms with minimal concerning clauses. Your data is generally protected and you retain most rights.',
      medium: 'This service has some concerning clauses around data usage and liability. Review carefully before agreeing.',
      high: 'This service has multiple concerning clauses including extensive data collection, broad liability waivers, and restrictive user rights.'
    };
    return summaries[riskLevel];
  }

  generateMockKeyPoints(hasPrivacy, hasLiability) {
    const points = [];
    
    if (hasPrivacy) {
      points.push('Personal data including location and browsing habits may be collected');
      points.push('Information may be shared with third-party partners');
    }
    
    if (hasLiability) {
      points.push('Company disclaims most liability for service issues');
      points.push('Users are responsible for content and account security');
    }
    
    points.push('Account termination policies allow for immediate suspension');
    points.push('Terms can be changed with minimal notice requirements');
    
    return points.slice(0, 5);
  }

  hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

console.log('Going Bananas background service started');
