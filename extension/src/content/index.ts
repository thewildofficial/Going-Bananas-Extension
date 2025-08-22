// Content Script (TypeScript)
class TermsAnalyzer {
  private isAnalyzing = false;
  private currentUrl = window.location.href;

  constructor() {
    this.init();
  }

  private init(): void {
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

    console.log('Going Bananas T&C Analyzer initialized (TypeScript)');
  }

  private async handleMessage(message: any, sender: any, sendResponse: any): Promise<void> {
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
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async autoDetectTerms(): Promise<void> {
    if (this.isTermsPage()) {
      console.log('Terms page detected, starting analysis...');
      await this.analyzeCurrentPage();
    }
  }

  private isTermsPage(): boolean {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

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

  private hasTermsContent(): boolean {
    const bodyText = document.body.textContent?.toLowerCase() || '';
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

  private async analyzeCurrentPage(): Promise<any> {
    if (this.isAnalyzing) {
      return null;
    }

    this.isAnalyzing = true;

    try {
      const termsText = this.extractTermsText();
      
      if (!termsText || termsText.length < 100) {
        return null;
      }

      // Send to background script for API analysis
      const analysis = await this.sendForAnalysis(termsText);
      
      return analysis;
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    } finally {
      this.isAnalyzing = false;
    }
  }

  private async performManualScan(): Promise<any> {
    const content = this.extractPageContent();
    
    if (!content || content.length < 50) {
      throw new Error('No meaningful content found on this page');
    }

    return await this.sendForAnalysis(content);
  }

  private extractTermsText(): string {
    // Try multiple strategies to extract terms text
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
        const text = this.cleanExtractedText(element.textContent || '');
        if (text.length > 500) {
          return text;
        }
      }
    }

    return this.extractPageContent();
  }

  private extractPageContent(): string {
    // Remove unwanted elements
    const elementsToRemove = [
      'script', 'style', 'nav', 'header', 'footer',
      '.navigation', '.menu', '.sidebar', '.ads',
      '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
    ];

    const clone = document.cloneNode(true) as Document;
    elementsToRemove.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    return this.cleanExtractedText(clone.body?.textContent || '');
  }

  private cleanExtractedText(text: string): string {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')
      .replace(/\b(click here|read more|continue reading)\b/gi, '')
      .replace(/\S+@\S+\.\S+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();
  }

  private async sendForAnalysis(text: string): Promise<any> {
    try {
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
      return this.getMockAnalysis(text);
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
      summary: 'Mock analysis completed for development. This service has some concerning clauses that should be reviewed.',
      key_points: [
        'Personal data collection practices identified',
        'Third-party data sharing provisions may apply',
        'Service provider liability limitations present',
        'Account termination procedures outlined'
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
}

// Initialize the analyzer
new TermsAnalyzer();
