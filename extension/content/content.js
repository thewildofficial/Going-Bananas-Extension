// Content Script for Going Bananas T&C Analyzer
class TermsAnalyzer {
  constructor() {
    this.isAnalyzing = false;
    this.termsText = null;
    this.currentUrl = window.location.href;
    
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Auto-detect terms on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.autoDetectTerms());
    } else {
      this.autoDetectTerms();
    }

    console.log('Going Bananas T&C Analyzer initialized');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'analyzeTerms':
          const analysis = await this.analyzeCurrentPage();
          sendResponse({
            success: true,
            analysis: analysis
          });
          break;

        case 'manualScan':
          const manualAnalysis = await this.performManualScan();
          sendResponse({
            success: true,
            analysis: manualAnalysis
          });
          break;

        case 'getPageContent':
          const content = this.extractPageContent();
          sendResponse({
            success: true,
            content: content
          });
          break;

        default:
          sendResponse({
            success: false,
            error: 'Unknown action'
          });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async autoDetectTerms() {
    // Check if current page is likely a terms page
    if (this.isTermsPage()) {
      console.log('Terms page detected, starting analysis...');
      await this.analyzeCurrentPage();
    }
  }

  isTermsPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // Common terms page indicators
    const termsKeywords = [
      'terms', 'conditions', 'privacy', 'policy', 'agreement',
      'legal', 'tos', 'eula', 'license', 'user-agreement'
    ];

    return termsKeywords.some(keyword => 
      url.includes(keyword) || 
      title.includes(keyword) || 
      pathname.includes(keyword)
    ) || this.hasTermsContent();
  }

  hasTermsContent() {
    // Look for common terms and conditions text patterns
    const bodyText = document.body.textContent.toLowerCase();
    const termsIndicators = [
      'terms and conditions',
      'terms of service',
      'privacy policy',
      'user agreement',
      'by using this service',
      'these terms govern',
      'acceptance of terms'
    ];

    return termsIndicators.some(indicator => bodyText.includes(indicator));
  }

  async analyzeCurrentPage() {
    if (this.isAnalyzing) {
      return null;
    }

    this.isAnalyzing = true;

    try {
      // Extract terms text
      const termsText = this.extractTermsText();
      
      if (!termsText || termsText.length < 100) {
        return null;
      }

      // Send to background script for API analysis
      const analysis = await this.sendForAnalysis(termsText);
      
      // Cache the result
      await this.cacheAnalysis(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  async performManualScan() {
    // Force extraction even if not detected as terms page
    const content = this.extractPageContent();
    
    if (!content || content.length < 50) {
      throw new Error('No meaningful content found on this page');
    }

    return await this.sendForAnalysis(content);
  }

  extractTermsText() {
    // Try multiple strategies to extract terms text
    
    // Strategy 1: Look for main content containers
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.terms-content',
      '.privacy-content',
      '.legal-content'
    ];

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = this.cleanExtractedText(element.textContent);
        if (text.length > 500) {
          return text;
        }
      }
    }

    // Strategy 2: Look for article or section tags
    const articles = document.querySelectorAll('article, section');
    for (const article of articles) {
      const text = this.cleanExtractedText(article.textContent);
      if (text.length > 500) {
        return text;
      }
    }

    // Strategy 3: Fall back to body content, filtered
    return this.extractPageContent();
  }

  extractPageContent() {
    // Remove unwanted elements
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer',
      '.navigation', '.menu', '.sidebar', '.ads',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];

    const clone = document.cloneNode(true);
    elementsToRemove.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    return this.cleanExtractedText(clone.body.textContent);
  }

  cleanExtractedText(text) {
    if (!text) return '';

    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common noise
      .replace(/\b(click here|read more|continue reading)\b/gi, '')
      // Remove email addresses (they're usually not relevant to terms)
      .replace(/\S+@\S+\.\S+/g, '')
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Trim
      .trim();
  }

  async sendForAnalysis(text) {
    try {
      // Send message to background script to handle API call
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeTermsText',
        data: {
          text: text,
          url: this.currentUrl,
          timestamp: Date.now()
        }
      });

      if (response.success) {
        return response.analysis;
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Failed to send for analysis:', error);
      
      // Return mock analysis for development
      return this.getMockAnalysis();
    }
  }

  getMockAnalysis() {
    // Mock analysis for development/testing
    return {
      risk_score: 6.8,
      risk_level: 'medium',
      summary: 'This service collects personal data and may share it with third parties. Account termination policies are somewhat restrictive, but data deletion rights are provided.',
      key_points: [
        'Personal data including location and browsing habits may be collected',
        'Information may be shared with third-party advertising partners',
        'Service can terminate accounts with 30 days notice',
        'Users can request data deletion within 90 days',
        'Dispute resolution requires binding arbitration'
      ],
      categories: {
        privacy: {
          score: 7.2,
          concerns: [
            'Extensive data collection',
            'Third-party data sharing',
            'Limited anonymization guarantees'
          ]
        },
        liability: {
          score: 6.5,
          concerns: [
            'Limited company liability',
            'User assumes responsibility for content',
            'No guarantees of service availability'
          ]
        },
        termination: {
          score: 5.8,
          concerns: [
            'Account suspension without detailed appeal process',
            'Content may be retained after account deletion'
          ]
        }
      },
      confidence: 0.85,
      word_count: text?.length || 1000,
      analysis_time: Date.now()
    };
  }

  async cacheAnalysis(analysis) {
    try {
      const cacheKey = `analysis_${this.hashUrl(this.currentUrl)}`;
      await chrome.storage.local.set({
        [cacheKey]: {
          data: analysis,
          timestamp: Date.now(),
          url: this.currentUrl
        }
      });
    } catch (error) {
      console.error('Failed to cache analysis:', error);
    }
  }

  hashUrl(url) {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  // Visual indicator methods
  showAnalysisIndicator() {
    if (document.getElementById('banana-analysis-indicator')) {
      return; // Already showing
    }

    const indicator = document.createElement('div');
    indicator.id = 'banana-analysis-indicator';
    indicator.innerHTML = `
      <div class="banana-indicator-content">
        <span class="banana-icon">🍌</span>
        <span class="banana-text">Analyzing T&C...</span>
      </div>
    `;
    
    document.body.appendChild(indicator);

    // Remove after a few seconds
    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }

  showAnalysisComplete(riskLevel) {
    const indicator = document.getElementById('banana-analysis-indicator');
    if (indicator) {
      const riskColors = {
        low: '#27ae60',
        medium: '#f39c12',
        high: '#e74c3c'
      };

      indicator.innerHTML = `
        <div class="banana-indicator-content" style="background: ${riskColors[riskLevel]}">
          <span class="banana-icon">🍌</span>
          <span class="banana-text">Analysis Complete - ${riskLevel} risk</span>
        </div>
      `;

      setTimeout(() => {
        indicator.remove();
      }, 5000);
    }
  }
}

// Initialize the analyzer
const termsAnalyzer = new TermsAnalyzer();
