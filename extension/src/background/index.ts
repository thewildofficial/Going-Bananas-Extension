interface ChromeMessage {
  action: string;
  data?: any;
  url?: string;
}

interface AnalysisData {
  text: string;
  url: string;
  timestamp: number;
}

class BackgroundService {
  private apiBaseUrl = 'http://localhost:3000/api';
  private mockApiUrl = 'http://localhost:3001/api';
  private useMockApi = true;

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners(): void {
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
  }

  private handleInstallation(details: chrome.runtime.InstalledDetails): void {
    if (details.reason === 'install') {
      chrome.tabs.create({
        url: chrome.runtime.getURL('options/options.html')
      });
    }
  }

  private async handleMessage(
    message: ChromeMessage, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (message.action) {
        case 'analyzeTermsText':
          const analysis = await this.analyzeTermsText(message.data);
          sendResponse({
            success: true,
            analysis: analysis
          });
          break;

        case 'analyzeTerms':
          if (message.data?.tabId) {
            const result = await this.requestTabAnalysis(message.data.tabId);
            sendResponse(result);
          } else {
            sendResponse({
              success: false,
              error: 'Tab ID required'
            });
          }
          break;

        case 'manualScan':
          if (message.data?.tabId) {
            const result = await this.requestManualScan(message.data.tabId);
            sendResponse(result);
          } else {
            sendResponse({
              success: false,
              error: 'Tab ID required'
            });
          }
          break;

        case 'fetchExternalTerms':
          if (message.url) {
            const fetchResult = await this.fetchExternalTermsContent(message.url);
            sendResponse(fetchResult);
          } else {
            sendResponse({
              success: false,
              error: 'URL required'
            });
          }
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
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async requestTabAnalysis(tabId: number): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'analyzeTerms'
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to communicate with content script'
      };
    }
  }

  private async requestManualScan(tabId: number): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'manualScan'
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to perform manual scan'
      };
    }
  }

  private async analyzeTermsText(data: AnalysisData): Promise<any> {
    const { text, url, timestamp } = data;
    
    try {
      const cached = await this.getCachedAnalysis(url);
      if (cached) {
        return cached;
      }

      const payload = {
        text: text,
        url: url,
        options: {
          language: 'en',
          detail_level: 'standard'
        },
        timestamp: timestamp
      };

      const apiUrl = this.useMockApi ? this.mockApiUrl : this.apiBaseUrl;
      
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      await this.cacheAnalysis(url, result.analysis);
      
      return result.analysis;
    } catch (error) {
      console.error('Terms analysis failed:', error);
      
      return this.getMockAnalysis(text);
    }
  }

  private async handleTabUpdate(
    tabId: number, 
    changeInfo: chrome.tabs.TabChangeInfo, 
    tab: chrome.tabs.Tab
  ): Promise<void> {
    if (changeInfo.status === 'complete' && tab.url) {
      const settings = await this.getSettings();
      
      if (settings.autoAnalyze && this.isTermsUrl(tab.url)) {
        setTimeout(() => {
          this.triggerAutoAnalysis(tabId);
        }, 2000);
      }
    }
  }

  private isTermsUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    const termsKeywords = [
      'terms', 'conditions', 'privacy', 'policy', 'agreement',
      'legal', 'tos', 'eula', 'license'
    ];
    
    return termsKeywords.some(keyword => urlLower.includes(keyword));
  }

  private async triggerAutoAnalysis(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'autoAnalyze'
      });
    } catch (error) {
      console.log('Could not trigger auto-analysis:', error);
    }
  }

  private async getCachedAnalysis(url: string): Promise<any> {
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

  private async cacheAnalysis(url: string, analysis: any): Promise<void> {
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

  private async getSettings(): Promise<any> {
    try {
      return await chrome.storage.sync.get([
        'autoAnalyze',
        'showNotifications',
        'riskThreshold',
        'apiEndpoint'
      ]);
    } catch (error) {
      return {
        autoAnalyze: true,
        showNotifications: true,
        riskThreshold: 6.0,
        apiEndpoint: 'mock'
      };
    }
  }

  private getMockAnalysis(text: string): any {
    const wordCount = text.split(' ').length;
    let riskScore = 5.0;
    
    if (/privacy|data|personal|collect/i.test(text)) riskScore += 1.5;
    if (/liable|responsible|disclaim|warranty/i.test(text)) riskScore += 1.0;
    if (wordCount > 5000) riskScore += 0.5;
    
    const riskLevel = riskScore >= 7 ? 'high' : riskScore >= 5 ? 'medium' : 'low';
    
    return {
      risk_score: Math.min(riskScore, 10),
      risk_level: riskLevel,
      summary: 'Mock analysis for development. This service has moderate risk with some concerning clauses.',
      key_points: [
        'Personal data collection practices identified',
        'Third-party data sharing provisions may apply',
        'Service provider liability limitations present'
      ],
      categories: {
        privacy: { score: 7.2, concerns: ['Data collection', 'Third-party sharing'] },
        liability: { score: 6.5, concerns: ['Limited liability'] },
        termination: { score: 5.8, concerns: ['Termination clauses'] },
        payment: { score: 4.2, concerns: ['Standard payment terms'] }
      },
      confidence: 0.85,
      analysis_time: Date.now(),
      mock: true
    };
  }

  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  private async fetchExternalTermsContent(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      // Validate URL
      if (!url || !url.startsWith('http')) {
        return {
          success: false,
          error: 'Invalid URL'
        };
      }

      // Fetch the content
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const html = await response.text();
      
      // Extract text content from HTML
      const textContent = this.extractTextFromHtml(html);
      
      return {
        success: true,
        content: textContent
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch content'
      };
    }
  }

  private extractTextFromHtml(html: string): string {
    const cleaned = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  }
}

new BackgroundService();

console.log('Going Bananas background service started (TypeScript)');
