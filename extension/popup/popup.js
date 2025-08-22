// Popup JavaScript for Going Bananas T&C Analyzer
class PopupController {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.initializePopup();
  }

  initializeElements() {
    // State containers
    this.loadingState = document.getElementById('loadingState');
    this.noTcState = document.getElementById('noTcState');
    this.resultsContainer = document.getElementById('resultsContainer');
    this.errorState = document.getElementById('errorState');

    // Interactive elements
    this.settingsBtn = document.getElementById('settingsBtn');
    this.scanBtn = document.getElementById('scanBtn');
    this.retryBtn = document.getElementById('retryBtn');
    this.viewFullBtn = document.getElementById('viewFullBtn');
    this.shareBtn = document.getElementById('shareBtn');

    // Result elements
    this.scoreNumber = document.getElementById('scoreNumber');
    this.scoreCircle = document.getElementById('scoreCircle');
    this.riskLevel = document.getElementById('riskLevel');
    this.riskDescription = document.getElementById('riskDescription');
    this.summaryText = document.getElementById('summaryText');
    this.keyPointsList = document.getElementById('keyPointsList');
    this.errorMessage = document.getElementById('errorMessage');
  }

  bindEvents() {
    this.settingsBtn?.addEventListener('click', () => this.openSettings());
    this.scanBtn?.addEventListener('click', () => this.manualScan());
    this.retryBtn?.addEventListener('click', () => this.retryAnalysis());
    this.viewFullBtn?.addEventListener('click', () => this.viewFullAnalysis());
    this.shareBtn?.addEventListener('click', () => this.shareResults());

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  async initializePopup() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we have cached analysis for this URL
      const cachedAnalysis = await this.getCachedAnalysis(tab.url);
      
      if (cachedAnalysis) {
        this.displayResults(cachedAnalysis);
      } else {
        // Request analysis from content script
        this.requestAnalysis(tab.id);
      }
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize extension');
    }
  }

  async requestAnalysis(tabId) {
    try {
      // Send message to content script to start analysis
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'analyzeTerms'
      });

      if (response && response.success) {
        if (response.analysis) {
          this.displayResults(response.analysis);
        } else {
          this.showNoTermsFound();
        }
      } else {
        this.showError(response?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Failed to request analysis:', error);
      // Try to inject content script if it's not already there
      this.injectContentScript(tabId);
    }
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
      
      // Wait a moment for script to initialize
      setTimeout(() => {
        this.requestAnalysis(tabId);
      }, 500);
    } catch (error) {
      console.error('Failed to inject content script:', error);
      this.showError('Unable to analyze this page');
    }
  }

  displayResults(analysis) {
    this.hideAllStates();
    this.resultsContainer.style.display = 'block';

    // Update risk score
    this.updateRiskScore(analysis.risk_score, analysis.risk_level);
    
    // Update summary
    if (this.summaryText) {
      this.summaryText.textContent = analysis.summary || 'Analysis completed successfully.';
    }

    // Update key points
    this.updateKeyPoints(analysis.key_points || []);

    // Update categories
    this.updateCategories(analysis.categories || {});
  }

  updateRiskScore(score, level) {
    if (this.scoreNumber) {
      this.scoreNumber.textContent = score.toFixed(1);
    }

    if (this.riskLevel) {
      this.riskLevel.textContent = this.formatRiskLevel(level);
    }

    if (this.riskDescription) {
      this.riskDescription.textContent = this.getRiskDescription(level);
    }

    // Update circle color based on risk level
    if (this.scoreCircle) {
      this.scoreCircle.className = `score-circle ${level}-risk`;
    }
  }

  updateKeyPoints(keyPoints) {
    if (!this.keyPointsList) return;

    this.keyPointsList.innerHTML = '';
    
    keyPoints.slice(0, 3).forEach((point, index) => {
      const li = document.createElement('li');
      li.className = `key-point ${this.getPointRiskClass(index)}`;
      
      li.innerHTML = `
        <span class="point-icon">${this.getPointIcon(index)}</span>
        <span class="point-text">${point}</span>
      `;
      
      this.keyPointsList.appendChild(li);
    });
  }

  updateCategories(categories) {
    // This would update the categories section
    // Implementation depends on the exact structure needed
    console.log('Categories:', categories);
  }

  showNoTermsFound() {
    this.hideAllStates();
    this.noTcState.style.display = 'block';
  }

  showError(message) {
    this.hideAllStates();
    this.errorState.style.display = 'block';
    
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }
  }

  hideAllStates() {
    this.loadingState.style.display = 'none';
    this.noTcState.style.display = 'none';
    this.resultsContainer.style.display = 'none';
    this.errorState.style.display = 'none';
  }

  // Event handlers
  openSettings() {
    chrome.runtime.openOptionsPage();
  }

  async manualScan() {
    this.hideAllStates();
    this.loadingState.style.display = 'block';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Force a manual scan
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'manualScan'
      });

      if (response && response.success) {
        if (response.analysis) {
          this.displayResults(response.analysis);
        } else {
          this.showError('No terms and conditions found on this page');
        }
      } else {
        this.showError(response?.error || 'Manual scan failed');
      }
    } catch (error) {
      console.error('Manual scan failed:', error);
      this.showError('Manual scan failed');
    }
  }

  retryAnalysis() {
    this.hideAllStates();
    this.loadingState.style.display = 'block';
    this.initializePopup();
  }

  viewFullAnalysis() {
    // Open a new tab with detailed analysis
    chrome.tabs.create({
      url: chrome.runtime.getURL('analysis.html')
    });
  }

  shareResults() {
    // Share functionality
    navigator.clipboard?.writeText('Check out this T&C analysis from Going Bananas extension!')
      .then(() => {
        // Show brief success message
        this.showToast('Results copied to clipboard!');
      })
      .catch(() => {
        this.showToast('Sharing not available');
      });
  }

  // Utility methods
  async getCachedAnalysis(url) {
    try {
      const result = await chrome.storage.local.get(`analysis_${this.hashUrl(url)}`);
      const cached = result[`analysis_${this.hashUrl(url)}`];
      
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
        return cached.data;
      }
    } catch (error) {
      console.error('Failed to get cached analysis:', error);
    }
    return null;
  }

  hashUrl(url) {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  formatRiskLevel(level) {
    const levels = {
      low: 'Low Risk',
      medium: 'Medium Risk',
      high: 'High Risk'
    };
    return levels[level] || 'Unknown Risk';
  }

  getRiskDescription(level) {
    const descriptions = {
      low: 'Generally safe terms',
      medium: 'Some concerning clauses',
      high: 'Multiple red flags found'
    };
    return descriptions[level] || 'Unable to assess risk';
  }

  getPointRiskClass(index) {
    const classes = ['high-risk', 'medium-risk', 'low-risk'];
    return classes[index] || 'medium-risk';
  }

  getPointIcon(index) {
    const icons = ['🔴', '🟡', '🟢'];
    return icons[index] || '🟡';
  }

  showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'analysisComplete':
        if (message.success) {
          this.displayResults(message.data);
        } else {
          this.showError(message.error);
        }
        break;
      
      case 'analysisProgress':
        // Update progress if needed
        break;
      
      default:
        console.log('Unknown message:', message);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Handle popup being opened
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Popup became visible, refresh if needed
    console.log('Popup opened');
  }
});
