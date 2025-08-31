import { getApiUrl } from '../utils/config';

class TermsAnalyzer {
  private isAnalyzing = false;
  private currentUrl = window.location.href;

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
      document.addEventListener('DOMContentLoaded', () => {
        this.autoDetectTerms();
      });
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
    console.log(`🔍 Auto-detecting terms on: ${this.currentUrl}`);
    
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
        this.hideLoadingNotification();
        return result.analysis;
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('❌ Failed to call API directly:', error);
      this.hideLoadingNotification();
      throw error;
    }
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    notification.className = 'going-bananas-notification';
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
    notification.style.cssText = `
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
      border-left: 4px solid ${riskColor};
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    const categories = analysis.categories || {};
    const categoriesHtml = this.buildCategoriesDisplay(categories);
    const confidenceHtml = this.createConfidenceHtml(analysis.confidence);
    
    notification.innerHTML = `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">
          🍌 Terms Analysis Complete
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-weight: 500; color: ${riskColor};">
            ${analysis.risk_level ? analysis.risk_level.toUpperCase() : 'UNKNOWN'} Risk
          </span>
          <span style="
            background: ${riskColor}; 
            color: white; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: 600;
          ">
            ${riskScore}/10
          </span>
          ${confidenceHtml}
        </div>
      </div>
      ${categoriesHtml}
      <div style="
        color: #007bff; 
        font-size: 12px; 
        font-weight: 500;
        text-align: center;
        padding-top: 8px;
        border-top: 1px solid #eee;
      ">
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
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-weight: 600; color: #1a1a1a;">
            🍌 Terms Analysis Details
          </div>
          <button style="
            background: none; 
            border: none; 
            font-size: 16px; 
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
          " onclick="this.parentElement.parentElement.parentElement.click()">×</button>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-weight: 500; color: ${riskColor};">
            ${analysis.risk_level ? analysis.risk_level.toUpperCase() : 'UNKNOWN'} Risk
          </span>
          <span style="
            background: ${riskColor}; 
            color: white; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: 600;
          ">
            ${riskScore}/10
          </span>
          ${confidenceHtml}
        </div>
      </div>
      ${detailedHtml}
      <div style="
        color: #007bff; 
        font-size: 12px; 
        font-weight: 500;
        text-align: center;
        padding-top: 8px;
        border-top: 1px solid #eee;
        cursor: pointer;
      " onclick="event.stopPropagation();">
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
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">
          🍌 Terms Analysis Complete
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-weight: 500; color: ${riskColor};">
            ${analysis.risk_level ? analysis.risk_level.toUpperCase() : 'UNKNOWN'} Risk
          </span>
          <span style="
            background: ${riskColor}; 
            color: white; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            font-weight: 600;
          ">
            ${riskScore}/10
          </span>
          ${confidenceHtml}
        </div>
      </div>
      ${categoriesHtml}
      <div style="
        color: #007bff; 
        font-size: 12px; 
        font-weight: 500;
        text-align: center;
        padding-top: 8px;
        border-top: 1px solid #eee;
      ">
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
    const existing = document.querySelectorAll('#going-bananas-loading, #going-bananas-result');
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
}

new TermsAnalyzer();
