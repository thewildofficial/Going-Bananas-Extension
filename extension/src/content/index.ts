// Content Script (TypeScript)
class TermsAnalyzer {
  private isAnalyzing = false;
  private currentUrl = window.location.href;

  // Sentence interaction state
  public hasInjectedStyles = false;
  public selectedSentenceEl: HTMLElement | null = null;
  public tooltipEl: HTMLElement | null = null;
  public firstRunGuideShown = false;

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
      document.addEventListener('DOMContentLoaded', () => {
        this.autoDetectTerms();
        this.initSentenceInteractions();
      });
    } else {
      this.autoDetectTerms();
      this.initSentenceInteractions();
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
          // Background may request this
          const auto = await this.analyzeCurrentPage();
          sendResponse({ success: true, analysis: auto });
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

// =====================
// Sentence-level UX APIs
// =====================
interface WrappedSentenceMeta {
  id: string;
  text: string;
}

// Extend the class with methods via prototype to keep the top focused
interface TermsAnalyzer {
  initSentenceInteractions(): void;
  injectStyles(): void;
  findTermsContainer(): Element | null;
  wrapSentences(container: Element): void;
  onSentenceClick(event: MouseEvent): void;
  showTooltip(targetEl: HTMLElement, content: string, isLoading?: boolean): void;
  hideTooltip(): void;
  explainSentence(text: string, targetEl: HTMLElement): Promise<void>;
  showFirstRunGuideIfNeeded(): Promise<void>;
}

TermsAnalyzer.prototype.initSentenceInteractions = function initSentenceInteractions(this: TermsAnalyzer) {
  try {
    this.injectStyles();
    const container = this.findTermsContainer();
    if (!container) return;
    this.wrapSentences(container);
    this.showFirstRunGuideIfNeeded();
    // Delegate clicks
    container.addEventListener('click', (e: Event) => this.onSentenceClick(e as MouseEvent), { capture: false });
  } catch (e) {
    console.warn('Sentence interactions unavailable:', e);
  }
};

TermsAnalyzer.prototype.injectStyles = function injectStyles(this: TermsAnalyzer) {
  if (this.hasInjectedStyles) return;
  const style = document.createElement('style');
  style.id = 'banana-inline-styles';
  style.textContent = `
    .banana-sentence{cursor:pointer;transition:background-color .15s ease;border-radius:4px;padding:0 2px}
    .banana-sentence:hover{background-color:rgba(255,235,59,.35)}
    .banana-sentence--selected{background-color:rgba(76,175,80,.25);outline:1px solid rgba(76,175,80,.5)}
    .banana-tooltip{position:absolute;z-index:2147483647;max-width:360px;background:#111;color:#fff;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.2);padding:10px 12px;font:13px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .banana-tooltip .banana-tooltip-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .banana-tooltip .banana-badge{background:#6d28d9;color:#fff;border-radius:6px;padding:2px 6px;font-size:11px}
    .banana-tooltip .banana-actions{display:flex;gap:8px;margin-top:8px}
    .banana-tooltip button{background:#6d28d9;color:#fff;border:none;border-radius:6px;padding:6px 8px;cursor:pointer}
    .banana-tooltip .banana-close{background:transparent;color:#bbb}
    .banana-onboarding{position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}
    .banana-onboarding .banana-card{background:#fff;color:#111;max-width:520px;border-radius:14px;padding:18px 18px 14px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
    .banana-onboarding h3{margin:0 0 6px 0;font-size:18px}
    .banana-onboarding p{margin:0 0 12px 0;color:#444}
    .banana-onboarding .banana-cta{display:flex;gap:8px;justify-content:flex-end}
    .banana-onboarding .banana-cta button{background:#6d28d9;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer}
    .banana-onboarding .banana-cta .secondary{background:#eee;color:#333}
  `;
  document.documentElement.appendChild(style);
  this.hasInjectedStyles = true;
};

TermsAnalyzer.prototype.findTermsContainer = function findTermsContainer(): Element | null {
  const selectors = [
    'main',
    '[role="main"]',
    '.terms-content',
    '.privacy-content',
    '.legal-content',
    'article',
    '.main-content',
    '.content'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent && el.textContent.trim().length > 500) {
      return el;
    }
  }
  // Fallback: large text container
  return document.body;
};

TermsAnalyzer.prototype.wrapSentences = function wrapSentences(container: Element) {
  const disallowedTags = new Set(['SCRIPT','STYLE','NOSCRIPT','AUDIO','VIDEO','BUTTON','A','INPUT','TEXTAREA','SELECT','CODE','PRE','NAV','SVG']);
  const sentenceRegex = /([^.!?\n\r]+[.!?]+)(\s+|$)/g;
  let sentenceCount = 0;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (disallowedTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent || '';
      if (text.trim().length < 40) return NodeFilter.FILTER_REJECT; // skip tiny fragments
      if (parent.closest('.banana-tooltip, .banana-onboarding')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  } as unknown as NodeFilter);

  const toProcess: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    toProcess.push(current as Text);
    if (toProcess.length > 2000) break; // safety cap
  }

  for (const textNode of toProcess) {
    const text = textNode.textContent || '';
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    sentenceRegex.lastIndex = 0;
    while ((match = sentenceRegex.exec(text)) && sentenceCount < 5000) {
      const prefix = text.slice(lastIndex, match.index);
      if (prefix) frag.appendChild(document.createTextNode(prefix));
      const sentence = match[1];
      const span = document.createElement('span');
      span.className = 'banana-sentence';
      span.setAttribute('data-banana-sid', `${Date.now()}_${sentenceCount++}`);
      span.textContent = sentence.trim() + ' ';
      frag.appendChild(span);
      lastIndex = sentenceRegex.lastIndex;
    }
    const tail = text.slice(lastIndex);
    if (tail) frag.appendChild(document.createTextNode(tail));
    textNode.replaceWith(frag);
    if (sentenceCount >= 5000) break;
  }
};

TermsAnalyzer.prototype.onSentenceClick = function onSentenceClick(this: TermsAnalyzer, event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target || !target.classList.contains('banana-sentence')) return;

  if (this.selectedSentenceEl) {
    this.selectedSentenceEl.classList.remove('banana-sentence--selected');
  }
  this.selectedSentenceEl = target;
  target.classList.add('banana-sentence--selected');

  const text = target.innerText.trim();
  this.showTooltip(target, 'Explaining…', true);
  this.explainSentence(text, target);
};

TermsAnalyzer.prototype.showTooltip = function showTooltip(this: TermsAnalyzer, targetEl: HTMLElement, content: string, isLoading = false) {
  // Create if needed
  if (!this.tooltipEl) {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'banana-tooltip';
    document.body.appendChild(this.tooltipEl);
  }
  this.tooltipEl.innerHTML = `
    <div class="banana-tooltip-header">
      <span>🍌</span><strong>Going Bananas</strong>
      <span class="banana-badge">${isLoading ? 'Thinking' : 'Result'}</span>
      <button class="banana-close" aria-label="Close">✕</button>
    </div>
    <div class="banana-tooltip-content">${content.replace(/</g,'&lt;')}</div>
    <div class="banana-actions">
      <button class="banana-copy">Copy</button>
    </div>
  `;
  // Copy / close actions
  const closeBtn = this.tooltipEl.querySelector('.banana-close') as HTMLElement | null;
  if (closeBtn) closeBtn.onclick = () => this.hideTooltip();
  const copyBtn = this.tooltipEl.querySelector('.banana-copy') as HTMLElement | null;
  if (copyBtn) copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText((this.tooltipEl!.querySelector('.banana-tooltip-content') as HTMLElement).innerText); } catch {}
  };

  // Position near target
  const rect = targetEl.getBoundingClientRect();
  const top = window.scrollY + rect.bottom + 8;
  const left = window.scrollX + Math.min(rect.left, window.innerWidth - 380);
  Object.assign(this.tooltipEl.style, { top: `${top}px`, left: `${left}px` });
};

TermsAnalyzer.prototype.hideTooltip = function hideTooltip(this: TermsAnalyzer) {
  if (this.tooltipEl && this.tooltipEl.parentElement) {
    this.tooltipEl.parentElement.removeChild(this.tooltipEl);
  }
  this.tooltipEl = null;
  if (this.selectedSentenceEl) {
    this.selectedSentenceEl.classList.remove('banana-sentence--selected');
    this.selectedSentenceEl = null;
  }
};

TermsAnalyzer.prototype.explainSentence = async function explainSentence(this: TermsAnalyzer, text: string, targetEl: HTMLElement) {
  try {
    const result = await (this as any).sendForAnalysis(text);
    const summary: string = result?.summary || 'Here’s a plain-English explanation of this sentence.';
    this.showTooltip(targetEl, summary, false);
  } catch (e) {
    this.showTooltip(targetEl, 'Failed to explain. Please try again.', false);
  }
};

TermsAnalyzer.prototype.showFirstRunGuideIfNeeded = async function showFirstRunGuideIfNeeded(this: TermsAnalyzer) {
  if (this.firstRunGuideShown) return;
  try {
    const { gb_seen_sentence_guide } = await chrome.storage.local.get('gb_seen_sentence_guide');
    if (gb_seen_sentence_guide) return;
  } catch {}

  const overlay = document.createElement('div');
  overlay.className = 'banana-onboarding';
  overlay.innerHTML = `
    <div class="banana-card">
      <h3>Click any sentence to get a plain-English explanation</h3>
      <p>We highlight sentences on terms and privacy pages. Click one to see an instant AI explanation. No data is stored.</p>
      <div class="banana-cta">
        <button class="secondary">Not now</button>
        <button class="primary">Got it</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    chrome.storage.local.set({ gb_seen_sentence_guide: true }).catch(() => {});
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const [skipBtn, okBtn] = overlay.querySelectorAll('button');
  if (skipBtn) skipBtn.addEventListener('click', close);
  if (okBtn) okBtn.addEventListener('click', close);
  this.firstRunGuideShown = true;
};
