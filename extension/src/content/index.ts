import { getApiUrl } from '../utils/config';

class TermsAnalyzer {
  private static readonly AUTO_HIDE_TIMEOUT_MS = 15000;
  
  private isAnalyzing = false;
  private currentUrl = window.location.href;
  private selectedTextForAnalysis: string = '';
  private boundHandleTextSelection: () => void;

  public hasInjectedStyles = false;
  public selectedSentenceEl: HTMLElement | null = null;
  public tooltipEl: HTMLElement | null = null;
  public firstRunGuideShown = false;

  constructor() {
    this.init();
  }

  private init(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

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

        case 'showToolbar':
          this.showTextSelectionToolbar();
          sendResponse({ success: true, message: 'Toolbar activated' });
          break;

        case 'hideToolbar':
          this.hideTextSelectionToolbar();
          sendResponse({ success: true, message: 'Toolbar deactivated' });
          break;

        case 'getSelectedText':
          const selectedText = this.getSelectedText();
          sendResponse({ success: true, selectedText: selectedText });
          break;

        case 'updateAnalysisResult':
          if (message.data) {
            this.showAnalysisNotification(message.data);
            sendResponse({ success: true, message: 'Analysis result updated' });
          } else {
            sendResponse({ success: false, error: 'No analysis data provided' });
          }
          break;

        case 'showSelectedTextAnalysis':
          if (message.data && message.selectedText) {
            this.showSelectedTextAnalysis(message.data, message.selectedText);
            sendResponse({ success: true, message: 'Selected text analysis displayed' });
          } else {
            sendResponse({ success: false, error: 'No analysis data or selected text provided' });
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
    this.hideExistingNotifications();
    
    const riskColor = this.getRiskColor(analysis.risk_level);
    const riskScore = Math.round(analysis.risk_score || 5);
    
    const notification = document.createElement('div');
    notification.id = 'going-bananas-result';
    notification.className = 'going-bananas-result-notification';
    notification.style.borderLeft = `4px solid ${riskColor}`;
    
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
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode && !isExpanded) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 12000);
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
      console.log('🔗 Using API URL:', apiUrl);
      
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

      console.log('📤 Sending analysis request:', {
        url: `${apiUrl}/analyze`,
        textLength: text.length,
        currentUrl: this.currentUrl
      });

      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`API request failed: ${response.status} - ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ API Response received:', {
        success: result.success,
        hasAnalysis: !!result.analysis,
        mock: result.analysis?.mock,
        riskScore: result.analysis?.risk_score
      });

      if (result.success && result.analysis) {
        console.log('🎉 Using real Gemini analysis data');
        return result.analysis;
      } else {
        console.error('❌ API returned unsuccessful response:', result);
        throw new Error(result.error || 'Analysis failed - no analysis data returned');
      }
    } catch (error) {
      console.error('❌ Failed to send for analysis:', {
        error: error.message,
        stack: error.stack,
        textLength: text.length
      });
      
      // Only fall back to mock data for specific error types
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('CORS') ||
          error.message.includes('timeout')) {
        console.log('🔄 Network error detected, falling back to mock analysis');
        return this.getMockAnalysis(text);
      } else {
        // For other errors, re-throw to let the caller handle it
        console.log('🚨 Non-network error, not falling back to mock data');
        throw error;
      }
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

  // Text Selection Toolbar Methods
  private showTextSelectionToolbar(): void {
    console.log('📝 Activating text selection toolbar');
    this.createToolbarIfNotExists();
    this.attachSelectionListeners();
    
    // Show the toolbar
    const toolbar = document.getElementById('going-bananas-toolbar');
    if (toolbar) {
      toolbar.style.display = 'block';
      toolbar.style.opacity = '1';
      console.log('✅ Toolbar activated and visible');
    } else {
      console.log('❌ Toolbar element not found');
    }
  }

  private hideTextSelectionToolbar(): void {
    console.log('📝 Deactivating text selection toolbar');
    this.removeSelectionListeners();
    
    // Hide the toolbar
    const toolbar = document.getElementById('going-bananas-toolbar');
    if (toolbar) {
      toolbar.style.display = 'none';
    }
  }

  private createToolbarIfNotExists(): void {
    let toolbar = document.getElementById('going-bananas-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'going-bananas-toolbar';
      toolbar.innerHTML = `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999999;
          background: linear-gradient(135deg, #ff8a00, #e52e71);
          color: white;
          padding: 8px 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          border-bottom: 2px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 18px;">🍌</span>
            <span style="font-weight: 600;">Hover Analysis Active</span>
            <span id="selected-text-info" style="
              background: rgba(255,255,255,0.2);
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
            ">Hover over text to analyze</span>
          </div>
          <button id="close-toolbar-btn" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
          ">Close</button>
        </div>
      `;
      
      document.body.appendChild(toolbar);
      
      // Add close button functionality
      const closeBtn = toolbar.querySelector('#close-toolbar-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.hideTextSelectionToolbar();
          // Notify popup that toolbar was closed
          chrome.runtime.sendMessage({ action: 'toolbarClosed' });
        });
      }
      
      // Adjust page content to account for toolbar
      document.body.style.paddingTop = '48px';
    }
  }

  private attachSelectionListeners(): void {
    console.log('🎧 Attaching hover-based analysis listeners');
    this.attachHoverListeners();
    console.log('✅ Hover listeners attached');
  }

  private attachHoverListeners(): void {
    // Target elements that are good for analysis - be more selective
    const selectors = [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'article', 'section', 'main', 
      'div[class*="terms"]', 'div[class*="policy"]', 'div[class*="clause"]',
      'div[class*="content"]:not([class*="nav"]):not([class*="menu"]):not([class*="header"]):not([class*="footer"])',
      'li:not([class*="nav"]):not([class*="menu"])',
      'blockquote'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Additional filtering to avoid navigation and UI elements
        if (this.isGoodForAnalysis(element as HTMLElement)) {
          this.addHoverListenersToElement(element as HTMLElement);
        }
      });
    });

    // Also listen for dynamically added content
    this.observeNewElements();
  }

  private isGoodForAnalysis(element: HTMLElement): boolean {
    // Skip navigation, menus, headers, footers, and other UI elements
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    if (className.includes('nav') || className.includes('menu') || 
        className.includes('header') || className.includes('footer') ||
        className.includes('sidebar') || className.includes('widget') ||
        id.includes('nav') || id.includes('menu') || 
        id.includes('header') || id.includes('footer')) {
      return false;
    }

    // Skip if element is too small
    if (element.textContent?.trim().length < 50) {
      return false;
    }

    // Skip if element is mostly links or buttons
    const links = element.querySelectorAll('a, button');
    if (links.length > element.textContent?.length / 10) {
      return false;
    }

    return true;
  }

  private addHoverListenersToElement(element: HTMLElement): void {
    // Skip if already has listeners, too small, or is nested inside another analyzed element
    if (element.dataset.bananaHover || 
        element.textContent?.trim().length < 50 ||
        element.closest('[data-banana-hover="true"]')) {
      return;
    }

    // Skip if element is inside a larger analyzed element
    const parentWithHover = element.closest('[data-banana-hover="true"]');
    if (parentWithHover) {
      return;
    }

    element.dataset.bananaHover = 'true';
    
    element.addEventListener('mouseenter', (e) => {
      this.handleElementHover(e.target as HTMLElement);
    });

    element.addEventListener('mouseleave', (e) => {
      this.handleElementLeave(e.target as HTMLElement);
    });

    element.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.analyzeHoveredElement(e.target as HTMLElement);
    });
  }

  private observeNewElements(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const selectors = [
              'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
              'div[class*="content"]', 'div[class*="text"]', 'div[class*="section"]',
              'article', 'section', 'main', 'div[class*="terms"]', 'div[class*="policy"]',
              'li', 'blockquote', 'div[class*="clause"]'
            ];

            selectors.forEach(selector => {
              if (element.matches(selector)) {
                this.addHoverListenersToElement(element);
              }
              // Also check children
              element.querySelectorAll(selector).forEach(child => {
                this.addHoverListenersToElement(child as HTMLElement);
              });
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private removeSelectionListeners(): void {
    // Remove hover overlays
    this.removeAllHoverOverlays();
    
    // Reset page padding
    document.body.style.paddingTop = '';
  }

  private handleElementHover(element: HTMLElement): void {
    // Skip if element is too small or already has hover effect
    if (element.textContent?.trim().length < 50 || element.dataset.bananaHovering === 'true') {
      return;
    }

    element.dataset.bananaHovering = 'true';
    
    // Add translucent border and background
    element.style.border = '2px solid rgba(255, 138, 0, 0.6)';
    element.style.backgroundColor = 'rgba(255, 138, 0, 0.1)';
    element.style.borderRadius = '8px';
    element.style.transition = 'all 0.2s ease';
    element.style.cursor = 'pointer';
    element.style.position = 'relative';
    
    // Add a subtle glow effect
    element.style.boxShadow = '0 0 15px rgba(255, 138, 0, 0.3)';
    
    // Create the "Click to analyze" tooltip
    this.createHoverTooltip(element);
  }

  private handleElementLeave(element: HTMLElement): void {
    // Remove hover effects
    element.style.border = '';
    element.style.backgroundColor = '';
    element.style.borderRadius = '';
    element.style.boxShadow = '';
    element.style.cursor = '';
    element.dataset.bananaHovering = 'false';
    
    // Remove tooltip
    const tooltip = element.querySelector('.banana-hover-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  private createHoverTooltip(element: HTMLElement): void {
    const tooltip = document.createElement('div');
    tooltip.className = 'banana-hover-tooltip';
    tooltip.innerHTML = `
      <span class="banana-tooltip-icon">🍌</span>
      <span class="banana-tooltip-text">Click to analyze</span>
    `;

    // Style the tooltip
    tooltip.style.cssText = `
      position: absolute;
      top: -35px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 138, 0, 0.95);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      z-index: 10000;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    // Style the content
    const icon = tooltip.querySelector('.banana-tooltip-icon') as HTMLElement;
    icon.style.cssText = `
      margin-right: 4px;
      font-size: 12px;
    `;

    // Add to element
    element.appendChild(tooltip);

    // Animate in
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });
  }

  private removeAllHoverOverlays(): void {
    const overlays = document.querySelectorAll('.banana-hover-overlay');
    overlays.forEach(overlay => overlay.remove());
  }

  private analyzeHoveredElement(element: HTMLElement): void {
    const text = element.textContent?.trim();
    if (!text || text.length < 10) {
      return;
    }

    // Remove any existing overlays
    this.removeAllHoverOverlays();

    // Store the text for analysis
    this.selectedTextForAnalysis = text;
    console.log('🎯 Analyzing hovered element:', text.substring(0, 100) + '...');

    // Show loading indicator
    this.showLoadingIndicator(element);

    // Send analysis request
    this.analyzeSelectedText(text, element);
  }

  // Legacy text selection handler - hover-based analysis is now primary
  private handleTextSelection(): void {
    const selectedText = this.getSelectedText();
    const infoElement = document.getElementById('selected-text-info');
    
    console.log('🔍 Legacy text selection handler called:', { selectedText: selectedText?.substring(0, 50), length: selectedText?.length });
    
    // Check if selection is from extension popup or other extension elements
    if (this.isSelectionFromExtensionElement()) {
      console.log('🚫 Selection is from extension element, ignoring');
      return;
    }
    
    if (infoElement && selectedText && selectedText.length > 0) {
      console.log('✅ Text selected via legacy method, updating UI');
      
      // Update UI to show selected text
      infoElement.textContent = `${selectedText.length} characters selected`;
      infoElement.style.background = 'rgba(255,255,255,0.4)';
      infoElement.style.border = '2px solid rgba(255,255,255,0.6)';
      infoElement.style.transform = 'scale(1.05)';
      infoElement.style.transition = 'all 0.3s ease';
      
      // Send selected text to popup
      chrome.runtime.sendMessage({ 
        action: 'textSelected', 
        text: selectedText 
      });

      // Store the selected text for analysis
      this.selectedTextForAnalysis = selectedText;
    } else if (infoElement) {
      // Reset UI when no text selected
      infoElement.textContent = 'Hover over text to analyze';
      infoElement.style.background = 'rgba(255,255,255,0.2)';
      infoElement.style.border = 'none';
      infoElement.style.transform = 'scale(1)';
      
      this.selectedTextForAnalysis = '';
    }
  }

  private getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }

  private isSelectionFromExtensionElement(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Check if the selection is within any extension-related elements
    const extensionSelectors = [
      'going-bananas-toolbar',
      'going-bananas-contextual-analyze',
      'going-bananas-analysis-widget',
      'going-bananas-popup',
      'going-bananas-overlay',
      '[data-extension="going-bananas"]',
      '.going-bananas-extension'
    ];

    // Check if the container or any parent element matches extension selectors
    let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element;
    
    while (element) {
      // Check if element has extension-related ID or class
      if (element.id && extensionSelectors.some(selector => element.id.includes('going-bananas'))) {
        return true;
      }
      
      // Check if element has extension-related classes
      if (element.className && typeof element.className === 'string' && 
          element.className.includes('going-bananas')) {
        return true;
      }
      
      // Check if element has extension data attribute
      if (element.hasAttribute && element.hasAttribute('data-extension')) {
        return true;
      }
      
      element = element.parentElement;
    }

    return false;
  }

  // Contextual Analyze Button Methods
  private showContextualAnalyzeButton(selectedText: string): void {
    console.log('🎯 showContextualAnalyzeButton called with text:', selectedText.substring(0, 50));
    
    // Don't show button if text is too short
    if (selectedText.length < 10) {
      console.log('🚫 Text too short for analysis, not showing button');
      return;
    }
    
    // Remove any existing contextual button
    this.removeContextualAnalyzeButton();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('❌ No selection or range found');
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    console.log('📍 Selection rect:', rect);
    
    // Calculate button position with improved positioning logic
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buttonWidth = 220; // Slightly larger button
    const buttonHeight = 48; // Slightly taller button
    const padding = 12; // Padding from edges
    
    // Calculate optimal position
    let top = rect.bottom + padding;
    let left = rect.left + (rect.width / 2) - (buttonWidth / 2); // Center horizontally on selection
    
    // Adjust if button would go off-screen horizontally
    if (left < padding) {
      left = padding;
    } else if (left + buttonWidth > viewportWidth - padding) {
      left = viewportWidth - buttonWidth - padding;
    }
    
    // Adjust if button would go off-screen vertically
    if (top + buttonHeight > viewportHeight - padding) {
      // Try positioning above the selection
      top = rect.top - buttonHeight - padding;
      
      // If still off-screen, position at the top of the viewport
      if (top < padding) {
        top = padding;
      }
    }
    
    // Ensure minimum top position
    if (top < padding) {
      top = padding;
    }
    
    // Fallback: if selection rect is invalid, position near cursor
    if (rect.width === 0 && rect.height === 0) {
      console.log('⚠️ Invalid selection rect, positioning near cursor');
      top = Math.max(padding, viewportHeight / 2 - buttonHeight / 2);
      left = Math.max(padding, viewportWidth / 2 - buttonWidth / 2);
    }
    
    console.log('📍 Calculated button position:', { top, left, viewportWidth, viewportHeight, selectionRect: rect });
    
    // Create the contextual analyze button with improved styling
    const analyzeButton = document.createElement('div');
    analyzeButton.id = 'going-bananas-contextual-analyze';
    analyzeButton.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      background: linear-gradient(135deg, #ff8a00, #e52e71);
      color: white;
      padding: 12px 20px;
      border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(255, 138, 0, 0.5);
      border: 3px solid rgba(255, 255, 255, 0.2);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      animation: going-bananas-button-appear 0.4s ease-out;
      min-width: 200px;
      max-width: 280px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `;
    
    analyzeButton.innerHTML = `
      <span style="font-size: 18px; animation: going-bananas-bounce 2s ease-in-out infinite;">🍌</span>
      <span>Analyze This Text</span>
      <span style="font-size: 12px; opacity: 0.8;">→</span>
    `;

    // Add enhanced hover effects
    analyzeButton.addEventListener('mouseenter', () => {
      analyzeButton.style.transform = 'scale(1.08) translateY(-2px)';
      analyzeButton.style.boxShadow = '0 12px 32px rgba(255, 138, 0, 0.7)';
      analyzeButton.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    });

    analyzeButton.addEventListener('mouseleave', () => {
      analyzeButton.style.transform = 'scale(1) translateY(0)';
      analyzeButton.style.boxShadow = '0 8px 24px rgba(255, 138, 0, 0.5)';
      analyzeButton.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });

    // Add click handler
    analyzeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.analyzeSelectedTextInSitu(selectedText);
    });

    document.body.appendChild(analyzeButton);
    console.log('✅ Contextual analyze button added to DOM');
    
    // Verify the button is actually visible
    setTimeout(() => {
      const button = document.getElementById('going-bananas-contextual-analyze');
      if (button) {
        const buttonRect = button.getBoundingClientRect();
        console.log('🔍 Button actual position:', buttonRect);
        console.log('🔍 Button computed styles:', {
          display: getComputedStyle(button).display,
          visibility: getComputedStyle(button).visibility,
          opacity: getComputedStyle(button).opacity,
          zIndex: getComputedStyle(button).zIndex
        });
      } else {
        console.log('❌ Button not found in DOM after creation');
      }
    }, 100);

    // Add the button animation styles
    this.addContextualButtonAnimation();

    // Auto-hide after configured timeout if not clicked
    setTimeout(() => {
      if (document.getElementById('going-bananas-contextual-analyze')) {
        console.log(`⏰ Auto-hiding contextual button after ${TermsAnalyzer.AUTO_HIDE_TIMEOUT_MS / 1000} seconds`);
        this.removeContextualAnalyzeButton();
      }
    }, TermsAnalyzer.AUTO_HIDE_TIMEOUT_MS);
  }

  private removeContextualAnalyzeButton(): void {
    const existingButton = document.getElementById('going-bananas-contextual-analyze');
    if (existingButton) {
      console.log('🗑️ Removing existing contextual button');
      existingButton.remove();
    } else {
      console.log('ℹ️ No existing contextual button to remove');
    }
  }

  private addContextualButtonAnimation(): void {
    if (document.getElementById('going-bananas-contextual-button-styles')) return;

    const style = document.createElement('style');
    style.id = 'going-bananas-contextual-button-styles';
    style.textContent = `
      @keyframes going-bananas-button-appear {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes going-bananas-bounce {
        0%, 20%, 50%, 80%, 100% {
          transform: translateY(0);
        }
        40% {
          transform: translateY(-3px);
        }
        60% {
          transform: translateY(-1px);
        }
      }
      
      @keyframes going-bananas-pulse {
        0% {
          transform: scale(1);
          box-shadow: 0 6px 20px rgba(255, 138, 0, 0.4);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 8px 28px rgba(255, 138, 0, 0.6);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 6px 20px rgba(255, 138, 0, 0.4);
        }
      }
    `;
    document.head.appendChild(style);
  }

  private async analyzeSelectedTextInSitu(selectedText: string): Promise<void> {
    console.log('🚀 Starting in-situ analysis for text:', selectedText.substring(0, 50) + '...');
    
    // Clear the selection now that the button has been clicked
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
    
    // Remove the contextual button
    this.removeContextualAnalyzeButton();
    
    // Store the selected text for analysis (non-invasive approach)
    this.highlightSelectedTextImproved(selectedText);
    console.log('✅ Text stored for analysis');
    
    // Show loading indicator with better positioning
    this.showAnalysisLoadingIndicator();
    console.log('⏳ Loading indicator shown');
    
    try {
      console.log('📡 Sending request to backend...');
      
      // Validate selected text length before sending
      if (selectedText.length < 10) {
        throw new Error(`Selected text is too short (${selectedText.length} characters). Please select at least 10 characters for analysis.`);
      }
      
      if (selectedText.length > 5000) {
        throw new Error(`Selected text is too long (${selectedText.length} characters). Please select text with 5000 characters or less.`);
      }
      
      // Get current tab URL for context
      const currentUrl = window.location.href;
      
      // Try the new selected text analysis endpoint first
      const apiUrl = await getApiUrl();
      console.log('🔗 Using API URL for selected text analysis:', apiUrl);
      
      let response;
      try {
        console.log('📤 Trying selected text analysis endpoint...');
        response = await fetch(`${apiUrl}/analyze/selected-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: selectedText,
            url: currentUrl,
            context: 'Selected text from terms and conditions document',
            options: {
              language: 'en',
              detail_level: 'comprehensive',
              focus_areas: ['data_usage', 'user_obligations', 'service_limitations', 'privacy_practices', 'liability_clauses', 'termination_terms'],
              include_recommendations: true,
              risk_assessment: true
            }
          }),
        });
        console.log('✅ Selected text endpoint response status:', response.status);
      } catch (fetchError) {
        console.log('⚠️ Selected text endpoint failed, trying main analysis endpoint:', fetchError.message);
        // Fallback to main analysis endpoint
        response = await fetch(`${apiUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: selectedText,
            url: currentUrl,
            options: {
              language: 'en',
              detail_level: 'standard',
              cache: false,
              categories: ['privacy', 'liability', 'termination', 'payment'],
              multiPass: false,
              streaming: false,
              contextAware: false
            }
          }),
        });
        console.log('✅ Main analysis endpoint response status:', response.status);
      }

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Analysis failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Analysis completed:', {
        success: result.success,
        hasAnalysis: !!result.analysis,
        mock: result.analysis?.mock,
        riskScore: result.analysis?.risk_score,
        analysisType: result.analysis?.analysis_type
      });
      
      // Hide loading indicator
      this.hideAnalysisLoadingIndicator();
      console.log('✅ Loading indicator hidden');
      
      // Show the analysis results in situ
      console.log('🎨 Showing analysis widget...');
      if (result.analysis?.mock) {
        console.log('⚠️ Using mock analysis data for selected text');
      } else {
        console.log('🎉 Using real Gemini analysis data for selected text');
      }
      this.showInSituAnalysisResults(result.analysis || result, selectedText);
      console.log('✅ Analysis widget should now be visible');
      
    } catch (error) {
      console.error('❌ Error analyzing selected text:', error);
      this.hideAnalysisLoadingIndicator();
      
      // Show a more user-friendly error message based on error type
      let friendlyError;
      
      if (error instanceof Error) {
        if (error.message.includes('too short')) {
          friendlyError = {
            message: 'Text Too Short',
            details: error.message
          };
        } else if (error.message.includes('too long')) {
          friendlyError = {
            message: 'Text Too Long', 
            details: error.message
          };
        } else if (error.message.includes('400')) {
          friendlyError = {
            message: 'Invalid Request',
            details: 'The selected text could not be processed. Please try selecting different text or check that the text is valid.'
          };
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          friendlyError = {
            message: 'Connection Error',
            details: 'Unable to connect to the analysis service. Please check your internet connection and try again.'
          };
        } else {
          friendlyError = {
            message: 'Analysis Failed',
            details: error.message
          };
        }
      } else {
        friendlyError = {
          message: 'Analysis Failed',
          details: 'Unable to analyze the selected text. Please try again or check your connection.'
        };
      }
      
      this.showAnalysisError(friendlyError);
    }
  }

  // Selected Text Analysis Methods
  private showSelectedTextAnalysis(analysis: any, selectedText: string): void {
    console.log('📊 Displaying selected text analysis:', analysis);
    
    // First, highlight the selected text with a pulsating effect
    this.highlightSelectedText(selectedText);
    
    // Then show the analysis results
    this.displaySelectedTextAnalysisResults(analysis, selectedText);
  }

  private highlightSelectedTextImproved(selectedText: string): void {
    // Non-invasive approach: Just store the selection info without modifying DOM
    console.log('✅ Selected text stored for analysis:', selectedText.substring(0, 50) + '...');
    
    // Store the selection info for the analysis widget
    this.selectedTextForAnalysis = selectedText;
    
    // Add the CSS animation styles if not already present
    this.addHighlightAnimation();
  }

  private highlightSelectedTextBySearch(selectedText: string): void {
    // Find and highlight the selected text with improved visibility
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes: Text[] = [];
    let node;
    
    while ((node = walker.nextNode())) {
      if (node.textContent && node.textContent.includes(selectedText)) {
        textNodes.push(node as Text);
      }
    }

    textNodes.forEach(textNode => {
      const parent = textNode.parentNode;
      if (!parent) return;

      const text = textNode.textContent || '';
      const index = text.indexOf(selectedText);
      
      if (index !== -1) {
        // Split the text node
        const beforeText = text.substring(0, index);
        const afterText = text.substring(index + selectedText.length);
        
        // Create the highlighted span with improved visibility
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'going-bananas-highlight';
        highlightSpan.textContent = selectedText;
        highlightSpan.style.cssText = `
          background: linear-gradient(135deg, #ff8a00, #e52e71);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          animation: going-bananas-pulse 2s ease-in-out infinite;
          box-shadow: 0 6px 20px rgba(255, 138, 0, 0.6);
          font-weight: 700;
          position: relative;
          z-index: 1000;
          border: 3px solid rgba(255, 255, 255, 0.4);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
          display: inline-block;
          margin: 3px 0;
          transform: scale(1.02);
          transition: all 0.3s ease;
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        `;

        // Replace the text node with the new structure
        if (beforeText) {
          parent.insertBefore(document.createTextNode(beforeText), textNode);
        }
        parent.insertBefore(highlightSpan, textNode);
        if (afterText) {
          parent.insertBefore(document.createTextNode(afterText), textNode);
        }
        parent.removeChild(textNode);
      }
    });
  }

  private highlightSelectedText(selectedText: string): void {
    // Use the improved version
    this.highlightSelectedTextImproved(selectedText);
  }

  private addHighlightAnimation(): void {
    if (document.getElementById('going-bananas-highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'going-bananas-highlight-styles';
    style.textContent = `
      @keyframes going-bananas-pulse {
        0% {
          transform: scale(1.02);
          box-shadow: 0 6px 20px rgba(255, 138, 0, 0.4);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 8px 28px rgba(255, 138, 0, 0.6);
        }
        100% {
          transform: scale(1.02);
          box-shadow: 0 6px 20px rgba(255, 138, 0, 0.4);
        }
      }
      
      .going-bananas-highlight {
        transition: all 0.3s ease;
        cursor: pointer;
      }
      
      .going-bananas-highlight:hover {
        transform: scale(1.08) !important;
        box-shadow: 0 10px 32px rgba(255, 138, 0, 0.7) !important;
        border-color: rgba(255, 255, 255, 0.6) !important;
      }
      
      .going-bananas-highlight::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(135deg, #ff8a00, #e52e71);
        border-radius: 10px;
        z-index: -1;
        opacity: 0.3;
        animation: going-bananas-pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  private removeExistingHighlights(): void {
    const highlights = document.querySelectorAll('.going-bananas-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
  }

  private addTemporarySelectionHighlight(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Remove any existing temporary highlight
    this.removeTemporarySelectionHighlight();

    const range = selection.getRangeAt(0);
    const tempHighlight = document.createElement('span');
    tempHighlight.id = 'going-bananas-temp-highlight';
    tempHighlight.style.cssText = `
      background: rgba(255, 138, 0, 0.3);
      border-radius: 4px;
      padding: 2px 4px;
      transition: all 0.2s ease;
      animation: going-bananas-temp-pulse 1s ease-in-out;
    `;

    try {
      const contents = range.extractContents();
      tempHighlight.appendChild(contents);
      range.insertNode(tempHighlight);
    } catch (error) {
      console.log('Could not add temporary highlight:', error);
    }

    // Add the temporary pulse animation
    this.addTemporaryHighlightAnimation();
  }

  private removeTemporarySelectionHighlight(): void {
    const tempHighlight = document.getElementById('going-bananas-temp-highlight');
    if (tempHighlight) {
      const parent = tempHighlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(tempHighlight.textContent || ''), tempHighlight);
        parent.normalize();
      }
    }
  }

  private addTemporaryHighlightAnimation(): void {
    if (document.getElementById('going-bananas-temp-highlight-styles')) return;

    const style = document.createElement('style');
    style.id = 'going-bananas-temp-highlight-styles';
    style.textContent = `
      @keyframes going-bananas-temp-pulse {
        0% {
          background: rgba(255, 138, 0, 0.1);
          transform: scale(1);
        }
        50% {
          background: rgba(255, 138, 0, 0.4);
          transform: scale(1.02);
        }
        100% {
          background: rgba(255, 138, 0, 0.3);
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }

  private displaySelectedTextAnalysisResults(analysis: any, selectedText: string): void {
    // Remove any existing analysis display
    this.removeExistingAnalysisDisplay();
    
    // Create the analysis results panel
    const analysisPanel = document.createElement('div');
    analysisPanel.id = 'going-bananas-analysis-panel';
    analysisPanel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      border: 2px solid #ff8a00;
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      animation: going-bananas-slide-in 0.3s ease-out;
    `;

    // Add slide-in animation
    this.addAnalysisPanelAnimation();

    const riskColor = this.getRiskColor(analysis.risk_level);
    const riskIcon = this.getRiskIcon(analysis.risk_level);

    analysisPanel.innerHTML = `
      <div style="
        background: linear-gradient(135deg, ${riskColor}, ${riskColor}dd);
        color: white;
        padding: 16px;
        position: relative;
      ">
        <button id="close-analysis-btn" style="
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <span style="font-size: 24px;">${riskIcon}</span>
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Selected Text Analysis</h3>
            <p style="margin: 0; font-size: 12px; opacity: 0.9;">${analysis.clause_type || 'general'} clause</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 28px; font-weight: bold;">${analysis.risk_score?.toFixed(1) || 'N/A'}</div>
            <div style="font-size: 12px; opacity: 0.9;">Risk Score</div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">${analysis.risk_level?.toUpperCase() || 'UNKNOWN'} RISK</div>
            <div style="font-size: 12px; opacity: 0.9;">${analysis.user_impact || 'moderate'} impact</div>
          </div>
        </div>
      </div>
      
      <div style="padding: 16px; max-height: 60vh; overflow-y: auto;">
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">Summary</h4>
          <p style="margin: 0; font-size: 13px; line-height: 1.4; color: #666;">${analysis.summary || 'No summary available'}</p>
        </div>
        
        ${analysis.key_points && analysis.key_points.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">Key Points</h4>
            <ul style="margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.4; color: #666;">
              ${analysis.key_points.slice(0, 3).map((point: string) => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.legal_implications && analysis.legal_implications.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">Legal Implications</h4>
            <ul style="margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.4; color: #666;">
              ${analysis.legal_implications.slice(0, 3).map((implication: string) => `<li>${implication}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${analysis.recommendations && analysis.recommendations.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #333;">Recommendations</h4>
            <ul style="margin: 0; padding-left: 16px; font-size: 13px; line-height: 1.4; color: #666;">
              ${analysis.recommendations.slice(0, 3).map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid #ff8a00;
          font-size: 12px;
          color: #666;
        ">
          <strong>Selected Text:</strong><br>
          "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"
        </div>
      </div>
    `;

    document.body.appendChild(analysisPanel);

    // Add close button functionality
    const closeBtn = analysisPanel.querySelector('#close-analysis-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.removeExistingAnalysisDisplay();
        this.removeExistingHighlights();
      });
    }

    // Auto-close after 30 seconds
    setTimeout(() => {
      if (document.getElementById('going-bananas-analysis-panel')) {
        this.removeExistingAnalysisDisplay();
        this.removeExistingHighlights();
      }
    }, 30000);
  }

  private addWidgetAnimationStyles(): void {
    if (document.getElementById('going-bananas-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'going-bananas-widget-styles';
    style.textContent = `
      @keyframes going-bananas-widget-appear {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      #going-bananas-analysis-panel {
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      
      #going-bananas-analysis-panel::-webkit-scrollbar {
        width: 6px;
      }
      
      #going-bananas-analysis-panel::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }
      
      #going-bananas-analysis-panel::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      #going-bananas-analysis-panel::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    document.head.appendChild(style);
  }

  private addAnalysisPanelAnimation(): void {
    // Use the new widget animation styles
    this.addWidgetAnimationStyles();
  }

  private removeExistingAnalysisDisplay(): void {
    const existingPanel = document.getElementById('going-bananas-analysis-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
  }

  private getRiskColor(riskLevel: string): string {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      default: return '#6b7280';
    }
  }

  private getRiskIcon(riskLevel: string): string {
    switch (riskLevel?.toLowerCase()) {
      case 'low': return '✅';
      case 'medium': return '⚠️';
      case 'high': return '🚨';
      default: return '❓';
    }
  }

  // Loading and Error Display Methods
  private showAnalysisLoadingIndicator(): void {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'going-bananas-loading-indicator';
    loadingIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 500;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    loadingIndicator.innerHTML = `
      <div style="
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid #ff8a00;
        border-radius: 50%;
        animation: going-bananas-spin 1s linear infinite;
      "></div>
      <span>Analyzing selected text...</span>
    `;

    document.body.appendChild(loadingIndicator);
    this.addLoadingAnimation();
  }

  private hideAnalysisLoadingIndicator(): void {
    const loadingIndicator = document.getElementById('going-bananas-loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }

  private addLoadingAnimation(): void {
    if (document.getElementById('going-bananas-loading-styles')) return;

    const style = document.createElement('style');
    style.id = 'going-bananas-loading-styles';
    style.textContent = `
      @keyframes going-bananas-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  private showAnalysisError(error: any): void {
    const errorPanel = document.createElement('div');
    errorPanel.id = 'going-bananas-error-panel';
    errorPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 24px 32px;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      max-width: 450px;
      text-align: center;
      box-shadow: 0 12px 40px rgba(239, 68, 68, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    `;
    
    errorPanel.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>
      <div style="font-weight: 700; margin-bottom: 12px; font-size: 18px;">Analysis Failed</div>
      <div style="opacity: 0.9; margin-bottom: 8px; line-height: 1.4;">${error.message || 'An error occurred while analyzing the text'}</div>
      ${error.details ? `<div style="opacity: 0.8; font-size: 13px; margin-bottom: 16px; line-height: 1.3;">${error.details}</div>` : ''}
      <button id="close-error-btn" style="
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        margin-top: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">Close</button>
    `;

    document.body.appendChild(errorPanel);

    // Add close button functionality
    const closeBtn = errorPanel.querySelector('#close-error-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        errorPanel.remove();
      });
    }

    // Auto-close after 8 seconds (increased from 5)
    setTimeout(() => {
      if (document.getElementById('going-bananas-error-panel')) {
        errorPanel.remove();
      }
    }, 8000);
  }

  private showInSituAnalysisResults(analysis: any, selectedText: string): void {
    console.log('🎨 Creating analysis widget with data:', analysis);
    
    // Remove any existing analysis display
    this.removeExistingAnalysisDisplay();
    
    // Get the position of the highlighted text
    const highlightedElement = document.querySelector('.going-bananas-highlight');
    let position = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    
    if (highlightedElement) {
      const rect = highlightedElement.getBoundingClientRect();
      position = {
        top: `${rect.bottom + window.scrollY + 20}px`,
        left: `${rect.left + window.scrollX}px`,
        transform: 'none'
      };
      console.log('📍 Positioned widget near highlighted text:', position);
    } else {
      console.log('📍 No highlighted element found, centering widget');
    }
    
    // Create the styled analysis widget matching the extension design
    const analysisWidget = document.createElement('div');
    analysisWidget.id = 'going-bananas-analysis-panel';
    analysisWidget.style.cssText = `
      position: fixed;
      top: ${position.top};
      left: ${position.left};
      transform: ${position.transform};
      width: 400px;
      max-height: 80vh;
      background: linear-gradient(135deg, #7c3aed, #3b82f6);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      animation: going-bananas-widget-appear 0.4s ease-out;
      border: 2px solid rgba(255, 255, 255, 0.1);
    `;

    // Add the widget animation styles
    this.addWidgetAnimationStyles();

    const riskColor = this.getRiskColor(analysis.risk_level);
    const riskIcon = this.getRiskIcon(analysis.risk_level);

    analysisWidget.innerHTML = `
      <!-- Header matching extension design -->
      <div style="
        background: linear-gradient(135deg, #fb923c, #ec4899);
        color: white;
        padding: 16px;
        position: relative;
      ">
        <button id="close-analysis-btn" style="
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span style="font-size: 28px;">🍌</span>
          <div>
            <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Going Bananas</h3>
            <p style="margin: 0; font-size: 13px; opacity: 0.9;">Analysis Complete</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 32px; font-weight: bold;">${analysis.risk_score?.toFixed(1) || 'N/A'}</div>
            <div style="font-size: 12px; opacity: 0.9; font-weight: 500;">Risk Score</div>
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 20px;">${riskIcon}</span>
              <div style="font-size: 16px; font-weight: 600;">${analysis.risk_level?.toUpperCase() || 'UNKNOWN'} RISK</div>
            </div>
            <div style="font-size: 13px; opacity: 0.9;">${analysis.clause_type || 'general'} clause • ${analysis.user_impact || 'moderate'} impact</div>
          </div>
        </div>
      </div>
      
      <!-- Content area with white background -->
      <div style="
        background: white;
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      ">
        <!-- Summary Section -->
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">📋</span>
            Summary
          </h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563; background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 4px solid #fb923c;">
            ${analysis.summary || 'No summary available'}
          </p>
        </div>
        
        ${analysis.key_points && analysis.key_points.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🔍</span>
              Key Points
            </h4>
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px;">
              <ul style="margin: 0; padding-left: 16px; font-size: 14px; line-height: 1.5; color: #92400e;">
                ${analysis.key_points.slice(0, 3).map((point: string) => `<li style="margin-bottom: 4px;">${point}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}
        
        ${analysis.legal_implications && analysis.legal_implications.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">⚖️</span>
              Legal Implications
            </h4>
            <div style="background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 12px;">
              <ul style="margin: 0; padding-left: 16px; font-size: 14px; line-height: 1.5; color: #991b1b;">
                ${analysis.legal_implications.slice(0, 3).map((implication: string) => `<li style="margin-bottom: 4px;">${implication}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}
        
        ${analysis.recommendations && analysis.recommendations.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">💡</span>
              Recommendations
            </h4>
            <div style="background: #f0fdf4; border: 1px solid #4ade80; border-radius: 8px; padding: 12px;">
              <ul style="margin: 0; padding-left: 16px; font-size: 14px; line-height: 1.5; color: #166534;">
                ${analysis.recommendations.slice(0, 3).map((rec: string) => `<li style="margin-bottom: 4px;">${rec}</li>`).join('')}
              </ul>
            </div>
          </div>
        ` : ''}
        
        <!-- Selected Text Preview -->
        <div style="
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          padding: 16px;
          border-radius: 12px;
          border: 2px solid #d1d5db;
          font-size: 13px;
          color: #374151;
          position: relative;
          max-height: 200px;
          overflow-y: auto;
        ">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #1f2937;">
            <span style="font-size: 16px;">📝</span>
            Selected Text
          </div>
          <div style="line-height: 1.4; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;">
            "${selectedText}"
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(analysisWidget);
    console.log('✅ Analysis widget added to DOM');

    // Add close button functionality
    const closeBtn = analysisWidget.querySelector('#close-analysis-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.removeExistingAnalysisDisplay();
      });
    }

    // Auto-close after 45 seconds
    setTimeout(() => {
      if (document.getElementById('going-bananas-analysis-panel')) {
        this.removeExistingAnalysisDisplay();
      }
    }, 45000);
  }
}

new TermsAnalyzer();