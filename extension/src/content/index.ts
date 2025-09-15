import { getApiUrl } from '../utils/config';

class TermsAnalyzer {
  private isAnalyzing = false;
  private currentUrl = window.location.href;

  public hasInjectedStyles = false;
  public selectedSentenceEl: HTMLElement | null = null;
  public tooltipEl: HTMLElement | null = null;
  public firstRunGuideShown = false;

  // Block selection properties
  private blockSelectorActive = false;
  private selectedBlocks: Array<{
    id: string, 
    text: string, 
    element: string,
    domElement: HTMLElement,
    originalStyles: {
      border: string,
      backgroundColor: string
    }
  }> = [];
  private selectableElements: HTMLElement[] = [];
  private blockSelectorToolbar: HTMLElement | null = null;
  private lastSelectedBlockIndex: number = -1; // Track last selected block for range selection
  private extensionCheckInterval: number | null = null;
  private boundClickHandler: ((event: Event) => void) | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Listen for extension context invalidation (popup closed)
    chrome.runtime.onConnect.addListener((port) => {
      port.onDisconnect.addListener(() => {
        if (this.blockSelectorActive) {
          console.log('🔌 Extension disconnected, cleaning up block selector');
          this.hideBlockSelector();
        }
      });
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.blockSelectorActive) {
        console.log('👁️ Page became hidden, maintaining block selector state');
        // Keep block selector active even when page is hidden
      }
    });

    // Auto-detect terms when page loads
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
        case 'analyzeTerms': {
          const text = document.body.innerText || '';
          const url = window.location.href;
          try {
            const bgResponse = await chrome.runtime.sendMessage({
              action: 'analyzeTermsText',
              data: { text, url, timestamp: Date.now() }
            });

            if (bgResponse && bgResponse.success) {
              sendResponse({ success: true, analysis: bgResponse.analysis || bgResponse });
            } else {
              sendResponse({ success: false, error: bgResponse?.error || 'Analysis failed' });
            }
          } catch (err) {
            sendResponse({ success: false, error: err instanceof Error ? err.message : 'Analysis request failed' });
          }
          break;
        }

        case 'manualScan': {
          const text = document.body.innerText || '';
          const url = window.location.href;
          try {
            const bgResponse = await chrome.runtime.sendMessage({
              action: 'analyzeTermsText',
              data: { text, url, timestamp: Date.now() }
            });

            if (bgResponse && bgResponse.success) {
              sendResponse({ success: true, analysis: bgResponse.analysis || bgResponse });
            } else {
              sendResponse({ success: false, error: bgResponse?.error || 'Manual scan failed' });
            }
          } catch (err) {
            sendResponse({ success: false, error: err instanceof Error ? err.message : 'Manual scan request failed' });
          }
          break;
        }

        case 'autoAnalyze': {
          // Fire-and-forget compatibility; trigger background flow as needed
          const text = document.body.innerText || '';
          const url = window.location.href;
          try {
            await chrome.runtime.sendMessage({
              action: 'analyzeTermsText',
              data: { text, url, timestamp: Date.now() }
            });
            sendResponse({ success: true });
          } catch (err) {
            sendResponse({ success: false, error: err instanceof Error ? err.message : 'Auto analysis failed' });
          }
          break;
        }

        case "readPageContent":
          const pageContent = document.body.innerText;
          sendResponse({ content: pageContent });
          break;
        case "findTermsPages":
          const termsPages = this.findTermsPages();
          sendResponse({ termsPages: termsPages });
          break;
        case "fetchTermsContent":
          const content = await this.fetchTermsContentFromUrl(message.url);
          sendResponse({ content: content });
          break;
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

        case 'autoAnalyze':
          console.log('🎯 Received autoAnalyze message');
          await this.autoDetectTerms();
          sendResponse({ success: true, message: 'Auto-analysis triggered' });
          break;

        case 'showBlockSelector':
          this.showBlockSelector();
          sendResponse({ success: true, message: 'Block selector activated' });
          break;

        case 'hideBlockSelector':
          this.hideBlockSelector();
          sendResponse({ success: true, message: 'Block selector deactivated' });
          break;

        case 'showSelectedBlocksAnalysis':
          if (message.data) {
            this.showBlockAnalysisResult(message.data, message.selectedBlocks);
            sendResponse({ success: true, message: 'Analysis result displayed' });
          } else {
            sendResponse({ success: false, error: 'No analysis data provided' });
          }
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

  private isPdf(): boolean {
    return this.currentUrl.toLowerCase().endsWith('.pdf');
  }

  private isTermsPageByUrl(): boolean {
    const url = this.currentUrl.toLowerCase();
    const keywords = ['terms', 'privacy', 'policy', 'agreement', 'legal', 'tos', 'eula'];
    const subdomains = ['legal', 'terms', 'privacy'];

    // Parse the URL only once
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    const parts = hostname.split('.');
    if (parts.length > 1 && subdomains.includes(parts[0])) {
      return true;
    }

    // Check for common path patterns
    const path = parsedUrl.pathname;
    if (keywords.some(keyword => new RegExp(`[/-]${keyword}([/-]|$)`).test(path))) {
        return true;
    }

    return false;
  }

  private isTermsPageByContent(): boolean {
    const title = document.title.toLowerCase();
    const keywords = ['terms of service', 'privacy policy', 'user agreement', 'terms and conditions'];

    if (keywords.some(keyword => title.includes(keyword))) {
      return true;
    }

    // Only query headings if title check didn't match
    const headings = Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.toLowerCase() || '');
    // Build a regex to match any keyword
    const keywordPattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const keywordRegex = new RegExp(keywordPattern, 'i');
    if (headings.some(heading => keywordRegex.test(heading))) {
      return true;
    }

    return false;
  }

  private async autoDetectTerms(): Promise<void> {
    if (this.isPdf()) {
      // TODO: Implement PDF parsing
      console.log('📄 PDF file detected. PDF parsing is not yet implemented.');
      this.showPdfNotification(); // New notification for PDFs
      return;
    }

    if (this.isTermsPageByUrl() || this.isTermsPageByContent()) {
        this.triggerAnalysis();
    } else {
      console.log('✅ Not a terms page. No automatic analysis will be performed.');
    }
  }

  private async triggerAnalysis(): Promise<void> {
    console.log(`🔍 Terms page detected on: ${this.currentUrl}`);
    const extractedText = this.extractPageContent();

    if (extractedText && extractedText.length > 100) {
      console.log(`📄 Extracted ${extractedText.split(' ').length} words of text for analysis`);
      this.showLoadingNotification();

      try {
        const analysis = await this.sendForAutoAnalysis(extractedText);
        if (analysis) {
          this.showAnalysisNotification(analysis);
        }
      } catch (error) {
        console.error('Auto-analysis failed:', error);
        this.hideLoadingNotification();
      }
    } else {
      console.log('❌ No sufficient content found for analysis');
    }
  }

  private async sendForAutoAnalysis(text: string): Promise<any> {
    console.log('🚀 Sending text for analysis directly to API...');
    
    try {
      const apiUrl = await getApiUrl();
      const payload = {
        text: text,
        url: this.currentUrl,
        options: {
          language: 'en',
          detail_level: 'standard',
          cache: false,
          categories: ['privacy', 'liability', 'termination', 'payment'],
          multiPass: false,
          streaming: false,
          contextAware: false
        }
      };

      console.log('📤 API Payload:', { textLength: payload.text.length, url: payload.url });
      
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 API Response:', result);

      if (result.success) {
        console.log('✅ Analysis complete:', result.analysis);
        return result.analysis;
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('❌ Failed to call API directly:', error);
      throw error;
    } finally {
      this.hideLoadingNotification();
    }
  }

  private showPdfNotification(): void {
    this.hideExistingNotifications();
    
    const notification = document.createElement('div');
    notification.id = 'going-bananas-pdf-notification';
    notification.className = 'going-bananas-notification going-bananas-pdf-notification';
    notification.innerHTML = `
      <div class="going-bananas-notification-content">
        <span>🍌 PDF detected. Manual analysis is required.</span>
        <button id="going-bananas-pdf-analyze" class="going-bananas-pdf-button" disabled title="PDF analysis is not yet supported.">Analyze</button>
      </div>
    `;
    
    document.body.appendChild(notification);
  }

  private showLoadingNotification(): void {
    this.hideExistingNotifications();

    // Inject notification styles only once
    if (!this.hasInjectedStyles) {
      const style = document.createElement('style');
      style.textContent = `
        .going-bananas-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          color: white;
          padding: 16px 20px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          z-index: 10001;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
        }
        body.going-bananas-block-selector-active .going-bananas-notification { top: 80px; }
        .going-bananas-loading-notification {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .going-bananas-pdf-notification {
          background: #ffc107;
          color: #333;
        }
        .going-bananas-notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .going-bananas-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: going-bananas-spin 1s linear infinite;
        }
        .going-bananas-pdf-button {
            background: #333;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
        }
        .going-bananas-pdf-button:disabled {
            background: #888;
            cursor: not-allowed;
        }
        .going-bananas-result-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: white;
          color: #333;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          z-index: 10001;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          max-width: 300px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        body.going-bananas-block-selector-active .going-bananas-result-notification { top: 80px; }
        .going-bananas-result-header {
          margin-bottom: 12px;
        }
        .going-bananas-result-title {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        .going-bananas-result-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .going-bananas-risk-level {
          font-weight: 500;
        }
        .going-bananas-risk-score {
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .going-bananas-expand-hint {
          color: #007bff;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid #eee;
        }
        .going-bananas-detail-header {
          margin-bottom: 12px;
        }
        .going-bananas-detail-title {
          font-weight: 600;
          color: #1a1a1a;
        }
        .going-bananas-close-button {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .going-bananas-detail-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .going-bananas-collapse-hint {
          color: #007bff;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid #eee;
          cursor: pointer;
        }
        @keyframes going-bananas-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      this.hasInjectedStyles = true;
    }

    const notification = document.createElement('div');
    notification.id = 'going-bananas-loading';
    notification.className = 'going-bananas-notification going-bananas-loading-notification';
    notification.innerHTML = `
      <div class="going-bananas-notification-content">
        <div class="going-bananas-spinner"></div>
        <span>🍌 Analyzing terms & conditions...</span>
      </div>
    `;
    document.body.appendChild(notification);
  }

  private hideLoadingNotification(): void {
    const loading = document.getElementById('going-bananas-loading');
    if (loading) {
      loading.remove();
    }
  }

  private showAnalysisNotification(analysis: any): void {
    console.log('🚀 Displaying analysis notification');
    this.hideExistingNotifications();
    
    const riskColor = this.getRiskColor(analysis.risk_level);
    const riskScore = Math.round(analysis.risk_score || 5);
    
    const notification = document.createElement('div');
    notification.id = 'going-bananas-result';
    notification.className = 'going-bananas-result-notification';
    
    // Apply critical styles inline to ensure visibility
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: white !important;
      color: #333 !important;
      padding: 16px !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
      z-index: 10001 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      max-width: 300px !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      border-left: 4px solid ${riskColor} !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    
    const categories = analysis.categories || {};
    const categoriesHtml = this.buildCategoriesDisplay(categories);
    const confidenceHtml = this.createConfidenceHtml(analysis.confidence);
    
    notification.innerHTML = `
      <div class="going-bananas-result-header">
        <div class="going-bananas-result-title">
          🍌 Terms Analysis Complete
        </div>
        <div class="going-bananas-result-meta">
          <span class="going-bananas-risk-level" style="color: ${riskColor};">
            ${analysis.risk_level ? analysis.risk_level.toUpperCase() : 'UNKNOWN'} Risk
          </span>
          <span class="going-bananas-risk-score" style="background: ${riskColor};">
            ${riskScore}/10
          </span>
          ${confidenceHtml}
        </div>
      </div>
      ${categoriesHtml}
      <div class="going-bananas-expand-hint">
        Click to expand details →
      </div>
    `;
    
    let isExpanded = false;
    
    notification.addEventListener('click', () => {
      if (!isExpanded) {
        this.expandNotification(notification, analysis);
        isExpanded = true;
      } else {
        this.collapseNotification(notification, analysis);
        isExpanded = false;
      }
    });
    
    console.log('📋 About to append notification to document.body');
    document.body.appendChild(notification);
    console.log('✅ Analysis popup displayed successfully');
    
    // For analysis results, make the notification more prominent and persistent
    // Auto-hide only after 20 seconds instead of 12, and only if not expanded
    setTimeout(() => {
      if (notification.parentNode && !isExpanded) {
        console.log('🕒 Popup auto-hiding after 20 seconds, exiting block selection mode');
        this.hideBlockSelector();
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 20000);
    
    // Add a close button for manual dismissal
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(0,0,0,0.1);
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      // Exit block selection mode entirely when popup is manually closed
      console.log('🧹 Popup closed manually, exiting block selection mode');
      this.hideBlockSelector();
      
      setTimeout(() => notification.remove(), 300);
    });
    notification.appendChild(closeBtn);
  }

  private buildCategoriesDisplay(categories: any): string {
    if (!categories || typeof categories !== 'object') {
      return '<div style="color: #666; font-size: 12px; text-align: center; padding: 8px;">No category details available</div>';
    }

    const categoryOrder = ['privacy', 'liability', 'payment', 'termination'];
    let html = '<div style="margin: 8px 0;">';
    
    for (const category of categoryOrder) {
      const categoryData = categories[category];
      if (categoryData && typeof categoryData === 'object') {
        const score = Math.round(categoryData.score || 0);
        const riskColor = this.getCategoryRiskColor(score);
        
        html += `
          <div style="
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin: 4px 0;
            padding: 4px 8px;
            background: #f8f9fa;
            border-radius: 6px;
            font-size: 12px;
          ">
            <span style="text-transform: capitalize; font-weight: 500;">
              ${category}
            </span>
            <span style="
              color: ${riskColor}; 
              font-weight: 600;
              font-size: 11px;
            ">
              ${score}/10
            </span>
          </div>
        `;
      }
    }
    
    html += '</div>';
    return html;
  }

  private getCategoryRiskColor(score: number): string {
    if (score >= 7) return '#dc3545';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  }

  private createConfidenceHtml(confidence: any): string {
    const confidenceValue = parseFloat(confidence);
    if (isNaN(confidenceValue)) {
      return '';
    }
    const confidencePercentage = Math.round(confidenceValue * 100);
    return `<span style="color: #666; font-size: 11px;">${confidencePercentage}% confidence</span>`;
  }

  private createDetailedConfidenceHtml(confidence: any): string {
    const confidenceValue = parseFloat(confidence);
    if (isNaN(confidenceValue)) {
      return '';
    }
    const confidencePercentage = Math.round(confidenceValue * 100);
    return `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-size: 13px;">
            🎯 Analysis Confidence
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 8px; background: #e9ecef; border-radius: 4px;">
              <div style="height: 100%; background: #28a745; border-radius: 4px; width: ${confidencePercentage}%;"></div>
            </div>
            <span style="font-size: 12px; font-weight: 600; color: #28a745;">${confidencePercentage}%</span>
          </div>
        </div>
      `;
  }

  private expandNotification(notification: HTMLElement, analysis: any): void {
    notification.style.maxWidth = '450px';
    notification.style.maxHeight = '80vh';
    notification.style.overflowY = 'auto';
    
    const riskColor = this.getRiskColor(analysis.risk_level);
    const riskScore = Math.round(analysis.risk_score || 5);
    const confidenceHtml = this.createConfidenceHtml(analysis.confidence);
    
    const detailedHtml = this.buildDetailedAnalysisDisplay(analysis);
    
    notification.innerHTML = `
      <div class="going-bananas-detail-header">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div class="going-bananas-detail-title">
            🍌 Terms Analysis Details
          </div>
          <button class="going-bananas-close-button" onclick="this.parentElement.parentElement.parentElement.click()">×</button>
        </div>
        <div class="going-bananas-detail-meta">
          <span class="going-bananas-risk-level" style="color: ${riskColor};">
            ${analysis.risk_level ? analysis.risk_level.toUpperCase() : 'UNKNOWN'} Risk
          </span>
          <span class="going-bananas-risk-score" style="background: ${riskColor};">
            ${riskScore}/10
          </span>
          ${confidenceHtml}
        </div>
      </div>
      ${detailedHtml}
      <div class="going-bananas-collapse-hint" onclick="event.stopPropagation();">
        Click to collapse ↑
      </div>
    `;
  }

  private collapseNotification(notification: HTMLElement, analysis: any): void {
    notification.style.maxWidth = '300px';
    notification.style.maxHeight = 'auto';
    notification.style.overflowY = 'visible';
    
    const riskColor = this.getRiskColor(analysis.risk_level);
    const riskScore = Math.round(analysis.risk_score || 5);
    const categories = analysis.categories || {};
    const categoriesHtml = this.buildCategoriesDisplay(categories);
    const confidenceHtml = this.createConfidenceHtml(analysis.confidence);
    
    notification.innerHTML = `
      <div class="going-bananas-result-header">
        <div class="going-bananas-result-title">
          🍌 Terms Analysis Complete
        </div>
        <div class="going-bananas-result-meta">
          <span class="going-bananas-risk-level" style="color: ${riskColor};">
            ${analysis.risk_level ? analysis.risk_level.toUpperCase() : 'UNKNOWN'} Risk
          </span>
          <span class="going-bananas-risk-score" style="background: ${riskColor};">
            ${riskScore}/10
          </span>
          ${confidenceHtml}
        </div>
      </div>
      ${categoriesHtml}
      <div class="going-bananas-expand-hint">
        Click to expand details →
      </div>
    `;
  }

  private buildDetailedAnalysisDisplay(analysis: any): string {
    let html = '';
    
    if (analysis.summary) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-size: 13px;">
            📋 Summary
          </div>
          <div style="color: #333; font-size: 12px; line-height: 1.4; padding: 8px; background: #f8f9fa; border-radius: 6px;">
            ${analysis.summary}
          </div>
        </div>
      `;
    }
    
    if (analysis.categories) {
      html += this.buildDetailedCategoriesDisplay(analysis.categories);
    }

    if (analysis.major_clauses && analysis.major_clauses.clauses) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-size: 13px;">
            ⚖️ Major Clauses
          </div>
          <div style="font-size: 12px;">
            ${analysis.major_clauses.clauses.map((clause: any) => {
              const riskColor = this.getRiskColor(clause.risk_level);
              return `
                <div style="margin: 6px 0; padding: 8px; background: #f8f9fa; border-left: 3px solid ${riskColor}; border-radius: 4px;">
                  <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${clause.title}</div>
                  <div style="color: #666; font-size: 11px; line-height: 1.3; margin-bottom: 4px;">${clause.description}</div>
                  <div style="display: flex; gap: 8px; font-size: 10px;">
                    <span style="background: ${riskColor}; color: white; padding: 2px 6px; border-radius: 8px;">${clause.risk_level}</span>
                    <span style="background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 8px;">${clause.importance}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    
    if (analysis.key_points && Array.isArray(analysis.key_points)) {
      html += `
        <div style="margin-bottom: 16px;">
          <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-size: 13px;">
            🔑 Key Points
          </div>
          <div style="font-size: 12px;">
            ${analysis.key_points.map((point: string) => `
              <div style="margin: 4px 0; padding: 6px 8px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">
                • ${point}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (analysis.insights) {
      html += this.buildInsightsDisplay(analysis.insights);
    }
    
    if (analysis.confidence !== undefined) {
      html += this.createDetailedConfidenceHtml(analysis.confidence);
    }
    
    if (analysis.mock !== undefined || analysis.analysis_time) {
      html += `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
          <div style="font-size: 10px; color: #999; text-align: center;">
            ${analysis.mock ? '🔧 Mock Data' : '✅ Live Analysis'} 
            ${analysis.analysis_time ? `• ${new Date(analysis.analysis_time).toLocaleTimeString()}` : ''}
            ${analysis.word_count ? `• ${analysis.word_count} words` : ''}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  private buildInsightsDisplay(insights: any): string {
    if (!insights || typeof insights !== 'object') {
      return '';
    }

    let html = `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 6px; font-size: 13px;">
          💡 Insights & Recommendations
        </div>
    `;

    if (insights.recommendations && Array.isArray(insights.recommendations)) {
      html += `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 500; color: #495057; margin-bottom: 4px; font-size: 12px;">Recommendations:</div>
          ${insights.recommendations.map((rec: string) => `
            <div style="margin: 3px 0; padding: 4px 8px; background: #d1ecf1; border-left: 3px solid #17a2b8; border-radius: 4px; font-size: 11px;">
              💡 ${rec}
            </div>
          `).join('')}
        </div>
      `;
    }

    if (insights.key_risk_factors && Array.isArray(insights.key_risk_factors)) {
      html += `
        <div style="margin-bottom: 12px;">
          <div style="font-weight: 500; color: #495057; margin-bottom: 4px; font-size: 12px;">Key Risk Factors:</div>
          ${insights.key_risk_factors.map((risk: any) => {
            const riskColor = this.getCategoryRiskColor(risk.score || 5);
            return `
              <div style="margin: 3px 0; padding: 4px 8px; background: #f8f9fa; border-left: 3px solid ${riskColor}; border-radius: 4px; font-size: 11px;">
                ⚠️ <strong>${risk.category}:</strong> ${risk.severity} severity (${risk.score}/10)
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (insights.comparative_risk) {
      html += `
        <div style="margin-bottom: 8px;">
          <div style="font-weight: 500; color: #495057; margin-bottom: 4px; font-size: 12px;">Comparative Risk:</div>
          <div style="padding: 4px 8px; background: #e9ecef; border-radius: 4px; font-size: 11px; color: #495057;">
            📊 ${insights.comparative_risk}
          </div>
        </div>
      `;
    }

    if (insights.text_complexity) {
      html += `
        <div style="margin-bottom: 8px;">
          <div style="font-weight: 500; color: #495057; margin-bottom: 4px; font-size: 12px;">Text Complexity:</div>
          <div style="display: flex; gap: 8px; font-size: 10px;">
            <span style="background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 8px;">
              ${insights.text_complexity.level}
            </span>
            <span style="background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 8px;">
              ${insights.text_complexity.sentence_count} sentences
            </span>
            <span style="background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 8px;">
              ${insights.text_complexity.avg_words_per_sentence} avg words/sentence
            </span>
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  private buildDetailedCategoriesDisplay(categories: any): string {
    if (!categories || typeof categories !== 'object') {
      return '';
    }

    const categoryOrder = ['privacy', 'liability', 'payment', 'termination'];
    let html = `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px; font-size: 13px;">
          📊 Risk Categories
        </div>
    `;
    
    for (const category of categoryOrder) {
      const categoryData = categories[category];
      if (categoryData && typeof categoryData === 'object') {
        const score = Math.round(categoryData.score || 0);
        const riskColor = this.getCategoryRiskColor(score);
        
        html += `
          <div style="
            margin: 8px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 3px solid ${riskColor};
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="text-transform: capitalize; font-weight: 600; font-size: 13px;">
                ${category}
              </span>
              <span style="
                color: ${riskColor}; 
                font-weight: 600;
                font-size: 12px;
                background: white;
                padding: 2px 6px;
                border-radius: 8px;
              ">
                ${score}/10
              </span>
            </div>
            ${categoryData.concerns && Array.isArray(categoryData.concerns) ? `
              <div style="font-size: 11px; color: #666;">
                <strong>Concerns:</strong>
                ${categoryData.concerns.map((concern: string) => `
                  <div style="margin: 2px 0; padding-left: 8px;">• ${concern}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }
    }
    
    html += '</div>';
    return html;
  }

  private getRiskColor(riskLevel: string): string {
    switch (riskLevel?.toLowerCase()) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  private hideExistingNotifications(): void {
    const existing = document.querySelectorAll('#going-bananas-loading, #going-bananas-result, #going-bananas-pdf-notification');
    existing.forEach(el => el.remove());
  }

  private openAnalysisPopup(analysis: any): void {
    chrome.runtime.sendMessage({
      action: 'openPopup',
      data: analysis
    });
  }

  private isTermsPage(): boolean {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    const termsKeywords = [
      'terms', 'conditions', 'privacy', 'policy', 'agreement',
      'legal', 'tos', 'eula', 'license', 'user-agreement'
    ];

    // Use word boundary matching for URL and pathname to avoid false positives
    const urlMatches = termsKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b|[/-]${keyword}([/-]|$)`);
      return regex.test(url) || regex.test(pathname);
    });

    return urlMatches || 
           termsKeywords.some(keyword => title.includes(keyword)) || 
           this.hasTermsContent();
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

  private findTermsPages(): { found: boolean; links: Array<{ text: string; url: string; type: string }> } {
    const result = {
      found: false,
      links: [] as Array<{ text: string; url: string; type: string }>
    };

    if (this.isTermsPage()) {
      result.found = true;
      result.links.push({
        text: document.title || 'Current Page',
        url: window.location.href,
        type: 'current'
      });
    }

    const termsLinks = this.findTermsLinksOnPage();
    result.links.push(...termsLinks);

    const commonPaths = this.tryCommonTermsPaths();
    result.links.push(...commonPaths);

    if (result.links.length > 0) {
      result.found = true;
    }

    return result;
  }

  private findTermsLinksOnPage(): Array<{ text: string; url: string; type: string }> {
    const links: Array<{ text: string; url: string; type: string }> = [];
    const allLinks = document.querySelectorAll('a[href]');
    
    const termsKeywords = [
      'terms', 'conditions', 'terms of service', 'tos', 'terms of use',
      'privacy policy', 'privacy', 'user agreement', 'terms and conditions',
      'legal', 'eula', 'end user license agreement'
    ];

    allLinks.forEach(link => {
      const linkElement = link as HTMLAnchorElement;
      const href = linkElement.href.toLowerCase();
      const text = linkElement.textContent?.toLowerCase() || '';
      
      const isTermsLink = termsKeywords.some(keyword => 
        href.includes(keyword.replace(/\s+/g, '-')) || 
        href.includes(keyword.replace(/\s+/g, '_')) ||
        href.includes(keyword.replace(/\s+/g, '')) ||
        text.includes(keyword)
      );

      if (isTermsLink) {
        links.push({
          text: linkElement.textContent || 'Terms Link',
          url: linkElement.href,
          type: 'link'
        });
      }
    });

    return links;
  }

  private tryCommonTermsPaths(): Array<{ text: string; url: string; type: string }> {
    const commonPaths = [
      '/terms', '/terms-of-service', '/terms-of-use', '/tos',
      '/privacy', '/privacy-policy', '/legal', '/user-agreement',
      '/terms-and-conditions', '/eula'
    ];
    
    const currentDomain = window.location.origin;
    const suggestions: Array<{ text: string; url: string; type: string }> = [];

    commonPaths.forEach(path => {
      const fullUrl = currentDomain + path;
      suggestions.push({
        text: `Try: ${path}`,
        url: fullUrl,
        type: 'suggestion'
      });
    });

    return suggestions;
  }

  private async fetchTermsContentFromUrl(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      if (url === window.location.href) {
        return {
          success: true,
          content: this.extractTermsText()
        };
      }

      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'fetchExternalTerms',
          url: url
        }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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
      const apiUrl = await getApiUrl();
      const payload = {
        text: text,
        url: this.currentUrl,
        options: {
          language: 'en',
          detail_level: 'standard',
          cache: false,
          categories: ['privacy', 'liability', 'termination', 'payment'],
          multiPass: false,
          streaming: false,
          contextAware: false
        }
      };

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

      if (result.success) {
        return result.analysis;
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Failed to send for analysis:', error);
      
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
      summary: 'Mock analysis completed for testing purposes.',
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

  // Block Selection Methods
  private showBlockSelector(): void {
    console.log('📝 Activating block selector mode');
    this.blockSelectorActive = true;
    this.createBlockSelectorToolbar();
    this.identifySelectableBlocks();
    this.attachBlockSelectionListeners();
    this.startExtensionConnectionCheck();
  }

  private hideBlockSelector(): void {
    console.log('📝 Deactivating block selector mode');
    this.blockSelectorActive = false;
    this.clearSelectedBlocks(); // This properly clears visual highlights
    this.removeBlockSelectionListeners();
    this.clearBlockHighlights(); // This clears hover highlights
    this.aggressiveStyleCleanup(); // Fallback cleanup for any missed elements
    this.removeBlockSelectorToolbar();
    this.stopExtensionConnectionCheck();
    
    // Additional ultra-aggressive cleanup after a short delay to catch any lingering effects
    setTimeout(() => {
      this.ultraAggressiveCleanup();
    }, 200);
  }

  private createBlockSelectorToolbar(): void {
    if (this.blockSelectorToolbar) {
      this.blockSelectorToolbar.remove();
    }

    this.blockSelectorToolbar = document.createElement('div');
    this.blockSelectorToolbar.id = 'going-bananas-block-selector-toolbar';
    this.blockSelectorToolbar.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 999999;
        background: linear-gradient(135deg, #ff8a00, #e52e71);
        color: white;
        padding: 12px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border-bottom: 2px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 18px;">🍌</span>
          <span style="font-weight: 600;">Block Selector Mode</span>
          <span id="block-count-display" style="
            background: rgba(255,255,255,0.25);
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
          ">0 blocks selected</span>
          <span style="
            font-size: 11px;
            opacity: 0.8;
            font-style: italic;
          ">💡 Shift+click for range selection</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="clear-selection-btn" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
          ">Clear All</button>
          <button id="analyze-blocks-btn" style="
            background: rgba(34, 197, 94, 0.9);
            border: 1px solid rgba(34, 197, 94, 1);
            color: white;
            padding: 6px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            opacity: 0.5;
            pointer-events: none;
            transition: all 0.2s ease;
          ">🔍 Analyze</button>
          <button id="close-block-selector-btn" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
          ">✕ Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.blockSelectorToolbar);
    
    // Add event listeners to toolbar buttons
    const clearBtn = this.blockSelectorToolbar.querySelector('#clear-selection-btn');
    const analyzeBtn = this.blockSelectorToolbar.querySelector('#analyze-blocks-btn');
    const closeBtn = this.blockSelectorToolbar.querySelector('#close-block-selector-btn');
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearSelectedBlocks());
    }
    
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeSelectedBlocksFromToolbar());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideBlockSelector();
        chrome.runtime.sendMessage({ action: 'toolbarClosed' });
      });
    }
    
    // Flag body to adjust in-page widget positions
    document.body.classList.add('going-bananas-block-selector-active');
    // Adjust page content to account for toolbar
    document.body.style.paddingTop = '60px';
  }

  private removeBlockSelectorToolbar(): void {
    if (this.blockSelectorToolbar) {
      this.blockSelectorToolbar.remove();
      this.blockSelectorToolbar = null;
    }
    
    // Reset page padding and body flag
    document.body.classList.remove('going-bananas-block-selector-active');
    document.body.style.paddingTop = '';
  }

  private identifySelectableBlocks(): void {
    // Clear previous selectable elements
    this.selectableElements = [];
    
    // Define selectors for content blocks that are likely to contain meaningful text
    const selectors = [
      'p', 'div', 'section', 'article', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'td', 'th', 'span', 'a', 'strong', 'em', 'b', 'i'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element: Element) => {
        const htmlElement = element as HTMLElement;
        const text = htmlElement.innerText?.trim() || '';
        
        // Only include elements with substantial text content
        if (text.length > 20 && 
            !this.isDescendantOfToolbar(htmlElement) &&
            this.isVisible(htmlElement) &&
            !this.hasSelectableParent(htmlElement)) {
          this.selectableElements.push(htmlElement);
          this.addBlockHover(htmlElement);
        }
      });
    });
    
    console.log(`🎯 Identified ${this.selectableElements.length} selectable blocks`);
  }

  private isDescendantOfToolbar(element: HTMLElement): boolean {
    let parent = element.parentElement;
    while (parent) {
      if (parent.id === 'going-bananas-block-selector-toolbar' || 
          parent.id?.startsWith('going-bananas-')) {
        return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  private hasSelectableParent(element: HTMLElement): boolean {
    return this.selectableElements.some(parent => 
      parent !== element && parent.contains(element)
    );
  }

  private addBlockHover(element: HTMLElement): void {
    const originalBorder = element.style.border;
    const originalBackground = element.style.backgroundColor;
    
    const mouseEnterHandler = () => {
      if (!this.isBlockSelected(element)) {
        element.style.border = '2px dashed #ff8a00';
        element.style.backgroundColor = 'rgba(255, 138, 0, 0.1)';
        element.style.cursor = 'pointer';
      }
    };
    
    const mouseLeaveHandler = () => {
      if (!this.isBlockSelected(element)) {
        element.style.border = originalBorder;
        element.style.backgroundColor = originalBackground;
        element.style.cursor = 'default';
      }
    };
    
    element.addEventListener('mouseenter', mouseEnterHandler);
    element.addEventListener('mouseleave', mouseLeaveHandler);
    
    // Store original styles and handlers for cleanup
    (element as any).__blockSelectorData = {
      originalBorder,
      originalBackground,
      mouseEnterHandler,
      mouseLeaveHandler
    };
  }

  private attachBlockSelectionListeners(): void {
    // Create and store the bound handler
    this.boundClickHandler = this.handleBlockClick.bind(this);
    
    this.selectableElements.forEach(element => {
      if (this.boundClickHandler) {
        element.addEventListener('click', this.boundClickHandler);
      }
    });
  }

  private removeBlockSelectionListeners(): void {
    this.selectableElements.forEach(element => {
      // Remove the click listener using the stored bound handler
      if (this.boundClickHandler) {
        element.removeEventListener('click', this.boundClickHandler);
      }
      
      // Clean up hover listeners and data
      const data = (element as any).__blockSelectorData;
      if (data) {
        element.removeEventListener('mouseenter', data.mouseEnterHandler);
        element.removeEventListener('mouseleave', data.mouseLeaveHandler);
        delete (element as any).__blockSelectorData;
      }
    });
    
    // Clear the bound handler
    this.boundClickHandler = null;
    
    // Clear the selectable elements array
    this.selectableElements = [];
  }

  private handleBlockClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const clickEvent = event as MouseEvent;
    const element = event.target as HTMLElement;
    const blockId = this.generateBlockId(element);
    const currentBlockIndex = this.selectableElements.indexOf(element);
    
    if (clickEvent.shiftKey && this.lastSelectedBlockIndex !== -1 && currentBlockIndex !== -1) {
      // Shift+click: Select range between last selected and current block
      this.selectBlockRange(this.lastSelectedBlockIndex, currentBlockIndex);
    } else {
      // Normal click
      if (this.isBlockSelected(element)) {
        // Unselect the block
        this.unselectBlock(element, blockId);
        // Update last selected index to the previous selected block (if any)
        this.updateLastSelectedBlockIndex();
      } else {
        // Select the block
        this.selectBlock(element, blockId);
        // Update last selected index
        this.lastSelectedBlockIndex = currentBlockIndex;
      }
    }
    
    this.updateBlockCountDisplay();
    this.notifyPopupOfSelection();
  }

  private generateBlockId(element: HTMLElement): string {
    // Generate a unique ID for the block based on its position and content
    const rect = element.getBoundingClientRect();
    const text = (element.innerText || element.textContent || '').substring(0, 50);
    return `block_${Math.round(rect.top)}_${Math.round(rect.left)}_${text.replace(/\s+/g, '_')}`;
  }

  private isBlockSelected(element: HTMLElement): boolean {
    const blockId = this.generateBlockId(element);
    return this.selectedBlocks.some(block => block.id === blockId);
  }

  private selectBlock(element: HTMLElement, blockId: string): void {
    // Use textContent for more comprehensive text extraction, fallback to innerText
    const text = (element.textContent?.trim() || element.innerText?.trim() || '');
    const tagName = element.tagName.toLowerCase();
    
    // Only add blocks with meaningful text content
    if (text.length < 10) {
      console.log('🚫 Skipping block with insufficient text:', text.substring(0, 50));
      return;
    }
    
    // Store original styles for later restoration
    const originalBorder = element.style.border || '';
    const originalBackground = element.style.backgroundColor || '';
    
    this.selectedBlocks.push({
      id: blockId,
      text: text,
      element: tagName,
      domElement: element, // Store direct reference to DOM element
      originalStyles: {
        border: originalBorder,
        backgroundColor: originalBackground
      }
    });
    
    // Highlight the selected block
    element.style.border = '2px solid #e52e71';
    element.style.backgroundColor = 'rgba(229, 46, 113, 0.2)';
    element.style.cursor = 'pointer';
    
    console.log(`✅ Selected block: ${tagName} (${text.length} chars)`);
  }

  private selectBlockRange(startIndex: number, endIndex: number): void {
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    console.log(`🔗 Selecting range: blocks ${minIndex} to ${maxIndex} (${maxIndex - minIndex + 1} blocks)`);
    
    for (let i = minIndex; i <= maxIndex; i++) {
      const element = this.selectableElements[i];
      if (element && !this.isBlockSelected(element)) {
        const blockId = this.generateBlockId(element);
        this.selectBlock(element, blockId);
      }
    }
    
    // Update last selected to the clicked block
    this.lastSelectedBlockIndex = endIndex;
  }

  private updateLastSelectedBlockIndex(): void {
    // Find the last selected block index
    if (this.selectedBlocks.length === 0) {
      this.lastSelectedBlockIndex = -1;
    } else {
      // Get the last selected block's element and find its index
      const lastBlock = this.selectedBlocks[this.selectedBlocks.length - 1];
      this.lastSelectedBlockIndex = this.selectableElements.indexOf(lastBlock.domElement);
    }
  }

  private unselectBlock(element: HTMLElement, blockId: string): void {
    const selectedBlock = this.selectedBlocks.find(block => block.id === blockId);
    
    if (selectedBlock) {
      // Restore original styles using stored values
      element.style.border = selectedBlock.originalStyles.border;
      element.style.backgroundColor = selectedBlock.originalStyles.backgroundColor;
      element.style.cursor = '';
    }
    
    // Remove from selected blocks array
    this.selectedBlocks = this.selectedBlocks.filter(block => block.id !== blockId);
    
    console.log(`❌ Unselected block: ${blockId}`);
  }

  private clearSelectedBlocks(): void {
    console.log(`🧹 Clearing ${this.selectedBlocks.length} selected blocks`);
    
    // Clear visual highlights using direct element references
    this.selectedBlocks.forEach((block, index) => {
      try {
        const element = block.domElement;
        if (element && element.parentNode) {
          // Restore original styles completely
          element.style.border = block.originalStyles.border;
          element.style.backgroundColor = block.originalStyles.backgroundColor;
          element.style.cursor = '';
          element.style.outline = ''; // Also clear outline
          
          // Remove any classes we might have added
          element.classList.remove('going-bananas-selected', 'going-bananas-analyzed');
          
          console.log(`✅ Cleared block ${index + 1}: ${block.element}`);
        } else {
          console.log(`⚠️ Block ${index + 1} element no longer in DOM`);
        }
      } catch (error) {
        console.log(`❌ Error clearing block ${index + 1}:`, error);
      }
    });
    
    this.selectedBlocks = [];
    this.lastSelectedBlockIndex = -1; // Reset range selection tracking
    this.updateBlockCountDisplay();
    this.notifyPopupOfSelection();
    
    // Additional aggressive cleanup after regular cleanup
    setTimeout(() => {
      this.ultraAggressiveCleanup();
    }, 100);
    
    console.log('🧹 All selected blocks cleared');
  }

  // Ultra-aggressive cleanup method for stubborn styles
  private ultraAggressiveCleanup(): void {
    console.log('💥 Performing ultra-aggressive style cleanup...');
    
    // Remove any elements with our specific IDs that might be lingering
    const goingBananasElements = document.querySelectorAll('[id*="going-bananas"], [class*="going-bananas"]');
    goingBananasElements.forEach((el) => {
      if (el.id !== 'going-bananas-result') { // Keep analysis results
        console.log(`🗑️ Removing lingering element: ${el.id || el.className}`);
        el.remove();
      }
    });
    
    // Clear any inline styles that match our patterns more aggressively
    const allElements = document.querySelectorAll('*');
    let cleanedCount = 0;
    
    allElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      
      // Check computed styles for our colors and reset if found
      if (computedStyle.borderColor && (
          computedStyle.borderColor.includes('229, 46, 113') ||
          computedStyle.borderColor.includes('255, 138, 0')
        )) {
        htmlElement.style.border = 'none';
        cleanedCount++;
      }
      
      if (computedStyle.backgroundColor && (
          computedStyle.backgroundColor.includes('229, 46, 113') ||
          computedStyle.backgroundColor.includes('255, 138, 0')
        )) {
        htmlElement.style.backgroundColor = 'transparent';
        cleanedCount++;
      }
      
      // Force remove any transition that might be keeping styles
      if (htmlElement.style.transition && htmlElement.style.transition.includes('border')) {
        htmlElement.style.transition = '';
        cleanedCount++;
      }
    });
    
    console.log(`💥 Ultra-aggressive cleanup completed: ${cleanedCount} additional fixes applied`);
  }

  private clearBlockHighlights(): void {
    console.log(`🧹 Clearing hover effects from ${this.selectableElements.length} elements`);
    
    this.selectableElements.forEach((element, index) => {
      try {
        const data = (element as any).__blockSelectorData;
        if (data) {
          // Remove event listeners first
          if (data.mouseEnterHandler) {
            element.removeEventListener('mouseenter', data.mouseEnterHandler);
          }
          if (data.mouseLeaveHandler) {
            element.removeEventListener('mouseleave', data.mouseLeaveHandler);
          }
          
          // Force restore original styles (in case element is currently hovered)
          element.style.border = data.originalBorder || '';
          element.style.backgroundColor = data.originalBackground || '';
          element.style.cursor = '';
          
          // Clean up the stored data
          delete (element as any).__blockSelectorData;
          
          console.log(`✅ Cleared hover effect ${index + 1}`);
        }
      } catch (error) {
        console.log(`❌ Error clearing hover effect ${index + 1}:`, error);
      }
    });
    
    // Clear the selectable elements array
    this.selectableElements = [];
    console.log('🧹 All hover effects cleared');
  }

  private aggressiveStyleCleanup(): void {
    console.log('🧽 Performing aggressive style cleanup...');
    
    // Find any elements that might have our styling applied
    const potentialElements = document.querySelectorAll('*');
    let cleanedCount = 0;
    
    potentialElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      const style = htmlElement.style;
      
      // Look for ANY border styles that might be ours (more comprehensive)
      if (style.border && (
          style.border.includes('2px solid #e52e71') ||     // Selection style
          style.border.includes('2px dashed #ff8a00') ||    // Hover style  
          style.border.includes('2px solid') ||             // Any 2px solid border
          style.border.includes('2px dashed') ||            // Any 2px dashed border
          style.border.includes('#e52e71') ||               // Our pink color
          style.border.includes('#ff8a00') ||               // Our orange color
          style.border.includes('rgba(229, 46, 113') ||     // Pink rgba variations
          style.border.includes('rgba(255, 138, 0')         // Orange rgba variations
        )) {
        const originalBorder = style.border;
        style.border = '';
        console.log(`🧽 Cleaned border: ${originalBorder}`);
        cleanedCount++;
      }
      
      // Look for ANY background colors that might be ours
      if (style.backgroundColor && (
          style.backgroundColor.includes('rgba(229, 46, 113, 0.2)') ||  // Selection background
          style.backgroundColor.includes('rgba(255, 138, 0, 0.1)') ||   // Hover background
          style.backgroundColor.includes('rgba(229, 46, 113') ||        // Any pink rgba
          style.backgroundColor.includes('rgba(255, 138, 0') ||         // Any orange rgba
          style.backgroundColor === 'rgb(229, 46, 113)' ||              // Solid pink
          style.backgroundColor === 'rgb(255, 138, 0)' ||               // Solid orange
          style.backgroundColor.includes('#e52e71') ||                   // Hex pink
          style.backgroundColor.includes('#ff8a00')                     // Hex orange
        )) {
        const originalBg = style.backgroundColor;
        style.backgroundColor = '';
        console.log(`🧽 Cleaned background: ${originalBg}`);
        cleanedCount++;
      }
      
      // Reset cursor if it was set by us
      if (style.cursor === 'pointer') {
        style.cursor = '';
        cleanedCount++;
      }
      
      // Clean up any remaining block selector data
      if ((htmlElement as any).__blockSelectorData) {
        delete (htmlElement as any).__blockSelectorData;
        cleanedCount++;
      }
      
      // Also check for outline styles that might be applied
      if (style.outline && (
          style.outline.includes('#e52e71') ||
          style.outline.includes('#ff8a00') ||
          style.outline.includes('2px')
        )) {
        style.outline = '';
        cleanedCount++;
      }
    });
    
    console.log(`🧽 Aggressive cleanup completed: ${cleanedCount} style fixes applied`);
  }

  private updateBlockCountDisplay(): void {
    const countDisplay = document.getElementById('block-count-display');
    const analyzeBtn = document.getElementById('analyze-blocks-btn') as HTMLButtonElement;
    
    if (countDisplay) {
      const count = this.selectedBlocks.length;
      const totalChars = this.selectedBlocks.reduce((sum, block) => sum + block.text.length, 0);
      countDisplay.textContent = count === 0 
        ? '0 blocks selected' 
        : `${count} block${count === 1 ? '' : 's'} selected (${totalChars} chars)`;
    }
    
    // Enable/disable analyze button based on selection
    if (analyzeBtn) {
      const hasSelection = this.selectedBlocks.length > 0;
      analyzeBtn.style.opacity = hasSelection ? '1' : '0.5';
      analyzeBtn.style.pointerEvents = hasSelection ? 'auto' : 'none';
      analyzeBtn.style.cursor = hasSelection ? 'pointer' : 'default';
    }
  }

  private notifyPopupOfSelection(): void {
    chrome.runtime.sendMessage({
      action: 'blocksSelected',
      blocks: this.selectedBlocks
    });
  }

  private showBlockAnalysisResult(analysis: any, selectedBlocks: any[]): void {
    console.log('📊 Displaying block analysis result:', analysis);
    
    // Use the existing showAnalysisNotification method but with block context
    const enhancedAnalysis = {
      ...analysis,
      context: {
        type: 'block_selection',
        blocks_analyzed: selectedBlocks?.length || 0,
        total_content_length: selectedBlocks?.reduce((sum, block) => sum + block.text.length, 0) || 0
      }
    };
    
    this.showAnalysisNotification(enhancedAnalysis);
  }

  // Extension Connection Check Methods
  private startExtensionConnectionCheck(): void {
    // Check every 2 seconds if extension is still connected
    this.extensionCheckInterval = window.setInterval(() => {
      this.checkExtensionConnection();
    }, 2000);
  }

  private stopExtensionConnectionCheck(): void {
    if (this.extensionCheckInterval) {
      clearInterval(this.extensionCheckInterval);
      this.extensionCheckInterval = null;
    }
  }

  private checkExtensionConnection(): void {
    if (!this.blockSelectorActive) {
      this.stopExtensionConnectionCheck();
      return;
    }

    try {
      // Try to send a ping message to the extension
      chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          console.log('🔌 Extension disconnected, cleaning up block selector');
          this.hideBlockSelector();
        }
      });
    } catch (error) {
      console.log('🔌 Extension context invalidated, cleaning up block selector');
      this.hideBlockSelector();
    }
  }

  // Analyze selected blocks directly from toolbar
  private async analyzeSelectedBlocksFromToolbar(): Promise<void> {
    if (this.selectedBlocks.length === 0) {
      this.showToolbarNotification('⚠️ Please select some content blocks first!', 'error');
      return;
    }

    // Combine all selected block texts with better formatting
    const combinedText = this.selectedBlocks
      .map(block => block.text.trim())
      .filter(text => text.length > 0)  // Remove empty texts
      .join('\n\n');
    
    console.log(`📝 Combined text from ${this.selectedBlocks.length} blocks: ${combinedText.length} characters`);
    console.log(`📄 First 200 chars: "${combinedText.substring(0, 200)}..."`);
    
    if (combinedText.length < 50) {
      this.showToolbarNotification('⚠️ Selected content must be at least 50 characters for analysis', 'error');
      return;
    }

    if (combinedText.length > 50000) {
      this.showToolbarNotification('⚠️ Selected content is too long (max 50,000 chars)', 'error');
      return;
    }

    try {
      // Show loading state
      this.setAnalyzeButtonLoading(true);
      this.showToolbarNotification('🔍 Analyzing selected blocks...', 'info');
      
      console.log(`🎯 Analyzing ${this.selectedBlocks.length} selected blocks (${combinedText.length} chars)`);
      
      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: combinedText,
          url: this.currentUrl,
          options: {
            language: 'en',
            detail_level: 'comprehensive',
            categories: ['privacy', 'liability', 'termination', 'payment'],
            cache: true
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed with status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Toolbar analysis result:', result);
      
      if (result.success && result.analysis) {
        // Show success message
        this.showToolbarNotification(`✅ Analysis complete! Risk: ${result.analysis.risk_level || 'unknown'}`, 'success');
        
        // Display the analysis result
        const enhancedAnalysis = {
          ...result.analysis,
          context: {
            type: 'toolbar_block_selection',
            blocks_analyzed: this.selectedBlocks.length,
            total_content_length: combinedText.length,
            selection_method: 'toolbar'
          }
        };
        
        console.log('🎯 Showing analysis popup with results');
        this.showAnalysisNotification(enhancedAnalysis);
        
        // Auto-expand the notification for toolbar analyses since it's a deliberate user action
        setTimeout(() => {
          const notification = document.getElementById('going-bananas-result');
          if (notification) {
            console.log('📖 Auto-expanding analysis details');
            notification.click(); // This will expand the notification
          }
        }, 500);
        
        // Note: Block selection cleanup is now handled when popup is closed
        
      } else {
        throw new Error(result.error || 'Analysis failed - no analysis data returned');
      }
      
    } catch (error) {
      console.error('❌ Toolbar analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showToolbarNotification(`❌ Analysis failed: ${errorMessage}`, 'error');
    } finally {
      this.setAnalyzeButtonLoading(false);
    }
  }

  private showToolbarNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const countDisplay = document.getElementById('block-count-display');
    if (countDisplay) {
      const originalText = countDisplay.textContent;
      const originalBg = countDisplay.style.background;
      
      // Show notification
      countDisplay.textContent = message;
      countDisplay.style.background = type === 'success' ? 'rgba(34, 197, 94, 0.9)' :
                                     type === 'error' ? 'rgba(239, 68, 68, 0.9)' :
                                     'rgba(59, 130, 246, 0.9)';
      
      // Restore original after 3 seconds
      setTimeout(() => {
        if (countDisplay.textContent === message) {
          countDisplay.textContent = originalText;
          countDisplay.style.background = originalBg;
        }
      }, 3000);
    }
  }

  private setAnalyzeButtonLoading(loading: boolean): void {
    const analyzeBtn = document.getElementById('analyze-blocks-btn') as HTMLButtonElement;
    if (analyzeBtn) {
      if (loading) {
        analyzeBtn.textContent = '⏳ Analyzing...';
        analyzeBtn.style.opacity = '0.7';
        analyzeBtn.style.pointerEvents = 'none';
      } else {
        analyzeBtn.textContent = '🔍 Analyze';
        analyzeBtn.style.opacity = this.selectedBlocks.length > 0 ? '1' : '0.5';
        analyzeBtn.style.pointerEvents = this.selectedBlocks.length > 0 ? 'auto' : 'none';
      }
    }
  }
}

new TermsAnalyzer();