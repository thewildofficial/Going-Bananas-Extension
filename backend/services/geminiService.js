// Google Gemini AI Service for Terms & Conditions Analysis
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-pro';
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay
    
    if (!this.apiKey) {
      logger.warn('Gemini API key not provided, service will run in mock mode');
      this.mockMode = true;
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.generativeModel = this.genAI.getGenerativeModel({ model: this.model });
      this.mockMode = process.env.MOCK_GEMINI_API === 'true';
    }
  }

  async analyzeTermsAndConditions(text, options = {}) {
    if (this.mockMode) {
      return this.generateMockAnalysis(text);
    }

    try {
      const prompt = this.buildAnalysisPrompt(text, options);
      const result = await this.callGeminiWithRetry(prompt);
      
      return this.parseAnalysisResponse(result);
    } catch (error) {
      logger.error('Gemini analysis failed:', {
        error: error.message,
        textLength: text.length,
        options
      });
      
      // Fall back to mock analysis on error
      logger.info('Falling back to mock analysis due to error');
      return this.generateMockAnalysis(text);
    }
  }

  buildAnalysisPrompt(text, options) {
    const detailLevel = options.detail_level || 'standard';
    const language = options.language || 'en';
    
    const systemPrompt = `You are an expert legal analyst specializing in terms and conditions, privacy policies, and user agreements. Your role is to analyze legal documents and provide clear, accurate assessments of user risks and rights.

ANALYSIS REQUIREMENTS:
1. Provide a risk score from 1-10 (1=very low risk, 10=extremely high risk)
2. Categorize risk level as "low" (1-3), "medium" (4-7), or "high" (8-10)
3. Generate a clear summary in plain English
4. Identify 3-5 key points users should know
5. Analyze specific categories: privacy, liability, termination, payment
6. Assess confidence level (0.0-1.0)

RESPONSE FORMAT (JSON):
{
  "risk_score": 6.5,
  "risk_level": "medium",
  "summary": "Plain English summary of main concerns...",
  "key_points": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "categories": {
    "privacy": {
      "score": 7.2,
      "concerns": ["Specific privacy concern 1", "Specific privacy concern 2"]
    },
    "liability": {
      "score": 6.1,
      "concerns": ["Liability concern 1"]
    },
    "termination": {
      "score": 5.8,
      "concerns": ["Termination concern 1"]
    },
    "payment": {
      "score": 4.2,
      "concerns": ["Payment concern 1"]
    }
  },
  "confidence": 0.85
}

ANALYSIS FOCUS AREAS:
- Data collection and usage rights
- Third-party data sharing
- User liability and responsibility
- Service termination conditions
- Payment and refund policies
- Dispute resolution mechanisms
- Content ownership and licensing
- Limitation of liability clauses
- Indemnification requirements
- Governing law and jurisdiction

SCORING GUIDELINES:
- 1-3 (Low): Standard terms, minimal user risk, clear rights
- 4-7 (Medium): Some concerning clauses, moderate risk, review recommended
- 8-10 (High): Multiple red flags, significant user risk, caution advised

Language: ${language}
Detail Level: ${detailLevel}

Now analyze the following terms and conditions:`;

    return `${systemPrompt}\n\n--- TERMS AND CONDITIONS TEXT ---\n${text}\n\n--- END OF TEXT ---\n\nProvide your analysis in the exact JSON format specified above:`;
  }

  async callGeminiWithRetry(prompt, retryCount = 0) {
    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        logger.warn(`Gemini API call failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callGeminiWithRetry(prompt, retryCount + 1);
      }
      
      throw error;
    }
  }

  parseAnalysisResponse(responseText) {
    try {
      // Clean the response text to extract JSON
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }
      
      // Try to find JSON in the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      const analysis = JSON.parse(cleanedText);
      
      // Validate and normalize the response
      return this.validateAndNormalizeAnalysis(analysis);
    } catch (error) {
      logger.error('Failed to parse Gemini response:', {
        error: error.message,
        responseText: responseText.substring(0, 500) + '...'
      });
      
      // Return a safe fallback analysis
      return this.generateFallbackAnalysis(responseText);
    }
  }

  validateAndNormalizeAnalysis(analysis) {
    // Ensure required fields exist with sensible defaults
    const normalized = {
      risk_score: this.clampScore(analysis.risk_score || 5.0),
      risk_level: this.normalizeRiskLevel(analysis.risk_level || 'medium'),
      summary: analysis.summary || 'Analysis completed with limited confidence.',
      key_points: Array.isArray(analysis.key_points) ? analysis.key_points.slice(0, 5) : [],
      categories: {
        privacy: this.normalizeCategory(analysis.categories?.privacy),
        liability: this.normalizeCategory(analysis.categories?.liability),
        termination: this.normalizeCategory(analysis.categories?.termination),
        payment: this.normalizeCategory(analysis.categories?.payment)
      },
      confidence: this.clampConfidence(analysis.confidence || 0.7),
      analysis_time: Date.now()
    };

    // Ensure risk_level matches risk_score
    normalized.risk_level = this.calculateRiskLevel(normalized.risk_score);

    return normalized;
  }

  normalizeCategory(category) {
    if (!category || typeof category !== 'object') {
      return {
        score: 5.0,
        concerns: ['Unable to analyze this category']
      };
    }

    return {
      score: this.clampScore(category.score || 5.0),
      concerns: Array.isArray(category.concerns) ? category.concerns.slice(0, 3) : []
    };
  }

  clampScore(score) {
    const num = parseFloat(score);
    return Math.max(1.0, Math.min(10.0, isNaN(num) ? 5.0 : num));
  }

  clampConfidence(confidence) {
    const num = parseFloat(confidence);
    return Math.max(0.0, Math.min(1.0, isNaN(num) ? 0.7 : num));
  }

  normalizeRiskLevel(level) {
    const normalizedLevel = level?.toLowerCase();
    if (['low', 'medium', 'high'].includes(normalizedLevel)) {
      return normalizedLevel;
    }
    return 'medium';
  }

  calculateRiskLevel(score) {
    if (score <= 3) return 'low';
    if (score <= 7) return 'medium';
    return 'high';
  }

  generateFallbackAnalysis(responseText) {
    // Generate a basic analysis when parsing fails
    const textLength = responseText.length;
    let riskScore = 5.0;
    
    // Simple heuristics based on response content
    if (responseText.toLowerCase().includes('high risk') || responseText.toLowerCase().includes('concern')) {
      riskScore = 7.0;
    } else if (responseText.toLowerCase().includes('low risk') || responseText.toLowerCase().includes('safe')) {
      riskScore = 3.0;
    }

    return {
      risk_score: riskScore,
      risk_level: this.calculateRiskLevel(riskScore),
      summary: 'Analysis completed with limited accuracy due to parsing issues. Manual review recommended.',
      key_points: [
        'Automated analysis encountered technical difficulties',
        'Manual review of terms and conditions is recommended',
        'Key clauses may not have been properly identified'
      ],
      categories: {
        privacy: { score: 5.0, concerns: ['Analysis incomplete'] },
        liability: { score: 5.0, concerns: ['Analysis incomplete'] },
        termination: { score: 5.0, concerns: ['Analysis incomplete'] },
        payment: { score: 5.0, concerns: ['Analysis incomplete'] }
      },
      confidence: 0.3,
      analysis_time: Date.now(),
      fallback: true
    };
  }

  generateMockAnalysis(text) {
    // Generate realistic mock analysis for development/testing
    const wordCount = text.split(' ').length;
    const hasPrivacyTerms = /privacy|data|personal|collect|share|third.party/i.test(text);
    const hasLiabilityTerms = /liable|responsible|disclaim|warranty|limitation/i.test(text);
    const hasPaymentTerms = /payment|billing|refund|subscription|fee/i.test(text);
    const hasTerminationTerms = /terminate|suspend|cancel|end|close/i.test(text);

    // Calculate risk score based on content analysis
    let riskScore = 4.0;
    if (hasPrivacyTerms) riskScore += 1.5;
    if (hasLiabilityTerms) riskScore += 1.0;
    if (hasPaymentTerms) riskScore += 0.5;
    if (hasTerminationTerms) riskScore += 0.5;
    if (wordCount > 5000) riskScore += 0.5;

    riskScore = this.clampScore(riskScore);
    const riskLevel = this.calculateRiskLevel(riskScore);

    const keyPoints = [];
    if (hasPrivacyTerms) {
      keyPoints.push('Personal data collection and usage policies identified');
      keyPoints.push('Third-party data sharing provisions may apply');
    }
    if (hasLiabilityTerms) {
      keyPoints.push('Service provider liability limitations present');
    }
    if (hasPaymentTerms) {
      keyPoints.push('Payment and billing terms require attention');
    }
    if (hasTerminationTerms) {
      keyPoints.push('Account termination procedures outlined');
    }

    // Ensure we have at least 3 key points
    while (keyPoints.length < 3) {
      keyPoints.push('Standard terms and conditions apply');
    }

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      summary: this.generateMockSummary(riskLevel, hasPrivacyTerms, hasLiabilityTerms),
      key_points: keyPoints.slice(0, 5),
      categories: {
        privacy: {
          score: hasPrivacyTerms ? 7.2 : 3.5,
          concerns: hasPrivacyTerms ? 
            ['Data collection practices identified', 'Third-party sharing possible'] :
            ['Limited privacy terms detected']
        },
        liability: {
          score: hasLiabilityTerms ? 6.8 : 4.0,
          concerns: hasLiabilityTerms ?
            ['Service provider liability limitations', 'User responsibility clauses present'] :
            ['Standard liability terms']
        },
        termination: {
          score: hasTerminationTerms ? 5.5 : 4.0,
          concerns: hasTerminationTerms ?
            ['Account termination procedures defined'] :
            ['Standard termination clauses']
        },
        payment: {
          score: hasPaymentTerms ? 5.0 : 2.0,
          concerns: hasPaymentTerms ?
            ['Payment terms and billing policies present'] :
            ['No payment terms identified']
        }
      },
      confidence: 0.85,
      analysis_time: Date.now(),
      mock: true,
      word_count: wordCount
    };
  }

  generateMockSummary(riskLevel, hasPrivacy, hasLiability) {
    const summaries = {
      low: 'This service appears to have reasonable terms with minimal concerning clauses. Standard protections are in place for users.',
      medium: hasPrivacy && hasLiability ? 
        'This service has moderate risk with data collection practices and liability limitations that should be reviewed carefully.' :
        hasPrivacy ?
        'This service collects personal data with some sharing practices that merit attention.' :
        'This service has some limitations on provider liability but generally reasonable terms.',
      high: 'This service has multiple concerning clauses including extensive data collection, broad liability waivers, and restrictive user rights. Careful consideration is recommended.'
    };

    return summaries[riskLevel] || summaries.medium;
  }

  async testConnection() {
    if (this.mockMode) {
      return { success: true, mock: true };
    }

    try {
      const testPrompt = 'Respond with just the word "connected" if you can understand this message.';
      const result = await this.callGeminiWithRetry(testPrompt);
      
      return {
        success: true,
        connected: result.toLowerCase().includes('connected'),
        model: this.model
      };
    } catch (error) {
      logger.error('Gemini connection test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = GeminiService;
