// Google Gemini AI Service for Terms & Conditions Analysis
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'; // Gemini 2.5 Flash
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second base delay

    if (!this.apiKey) {
      logger.warn('Gemini API key not provided, service will run in mock mode');
      this.mockMode = true;
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.generativeModel = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.1, // Lower temperature for legal analysis
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: "application/json" // Enable structured output
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      });
      this.mockMode = process.env.MOCK_GEMINI_API === 'true';
    }
  }

  async analyzeTermsAndConditions(text, options = {}) {
    if (this.mockMode) {
      return this.generateMockAnalysis(text, options);
    }

    try {
      // Single-pass analysis for basic requests
      if (!options.multiPass || options.multiPass === false) {
        const prompt = this.buildAnalysisPrompt(text, options, 1);
        const result = await this.callGeminiWithRetry(prompt);
        return this.parseAnalysisResponse(result);
      }

      // Multi-pass analysis for advanced requests
      return await this.performMultiPassAnalysis(text, options);
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

  async performMultiPassAnalysis(text, options = {}) {
    const maxPasses = 5;
    const results = {};
    let context = {};

    logger.info('Starting multi-pass analysis', {
      textLength: text.length,
      maxPasses: maxPasses
    });

    for (let pass = 1; pass <= maxPasses; pass++) {
      try {
        logger.info(`Performing analysis pass ${pass}/${maxPasses}`);

        const prompt = this.buildAnalysisPrompt(text, options, pass, context);
        const result = await this.callGeminiWithRetry(prompt);
        const parsedResult = this.parseAnalysisResponse(result);

        results[`pass_${pass}`] = parsedResult;

        // Build context from previous passes
        context.previousPasses = {
          pass_1: pass > 1 ? results.pass_1 : null,
          pass_2: pass > 2 ? results.pass_2 : null,
          pass_3: pass > 3 ? results.pass_3 : null,
          pass_4: pass > 4 ? results.pass_4 : null,
        };

        // Call progress callback if provided
        if (options.onProgress) {
          options.onProgress({
            pass: pass,
            maxPasses: maxPasses,
            result: parsedResult,
            progress: (pass / maxPasses) * 100
          });
        }

      } catch (error) {
        logger.error(`Multi-pass analysis failed at pass ${pass}:`, error.message);

        // Continue with next pass or synthesize available results
        if (pass >= 3) {
          logger.info('Sufficient passes completed, synthesizing results');
          break;
        }
      }
    }

    // Synthesize final result from all passes
    return this.synthesizeMultiPassResults(results, text, options);
  }

  synthesizeMultiPassResults(results, originalText, options) {
    const passes = Object.values(results);
    if (passes.length === 0) {
      throw new Error('No analysis passes completed');
    }

    // Use the most comprehensive result (usually the last pass)
    const finalResult = passes[passes.length - 1];

    // Enhance with insights from all passes
    const synthesizedResult = {
      ...finalResult,
      multi_pass_analysis: true,
      passes_completed: passes.length,
      synthesis_method: 'weighted_average',

      // Aggregate risk scores with confidence weighting
      aggregated_scores: this.aggregatePassScores(passes),

      // Collect unique insights from all passes
      comprehensive_insights: this.collectComprehensiveInsights(passes),

      // Determine most confident document classification
      document_metadata: this.determineDocumentMetadata(passes),

      analysis_time: Date.now()
    };

    return synthesizedResult;
  }

  aggregatePassScores(passes) {
    const categories = ['privacy', 'liability', 'termination', 'payment'];
    const aggregated = {};

    categories.forEach(category => {
      const scores = passes
        .map(pass => pass.categories?.[category]?.score)
        .filter(score => score != null);

      if (scores.length > 0) {
        // Weighted average favoring later passes (more comprehensive)
        const weights = scores.map((_, index) => 1 + index * 0.5);
        const weightedSum = scores.reduce((sum, score, index) => sum + score * weights[index], 0);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

        aggregated[category] = {
          score: Math.round((weightedSum / totalWeight) * 10) / 10,
          confidence: Math.min(scores.length / 5, 0.95),
          passes_contributing: scores.length
        };
      }
    });

    return aggregated;
  }

  collectComprehensiveInsights(passes) {
    const insights = {
      key_concerns: new Set(),
      regulatory_flags: new Set(),
      recommendations: new Set(),
      jurisdictions: new Set()
    };

    passes.forEach(pass => {
      // Collect key concerns
      pass.key_points?.forEach(point => insights.key_concerns.add(point));

      // Collect regulatory flags
      pass.regulatory_flags?.forEach(flag => insights.regulatory_flags.add(flag));

      // Collect recommendations
      pass.recommendations?.forEach(rec => insights.recommendations.add(rec));

      // Collect jurisdictions
      if (pass.jurisdiction) {
        insights.jurisdictions.add(pass.jurisdiction);
      }
    });

    return {
      key_concerns: Array.from(insights.key_concerns),
      regulatory_flags: Array.from(insights.regulatory_flags),
      recommendations: Array.from(insights.recommendations),
      jurisdictions: Array.from(insights.jurisdictions)
    };
  }

  determineDocumentMetadata(passes) {
    const metadata = {
      document_types: {},
      jurisdictions: {},
      confidence: 0
    };

    passes.forEach(pass => {
      if (pass.document_type) {
        metadata.document_types[pass.document_type] =
          (metadata.document_types[pass.document_type] || 0) + 1;
      }

      if (pass.jurisdiction) {
        metadata.jurisdictions[pass.jurisdiction] =
          (metadata.jurisdictions[pass.jurisdiction] || 0) + 1;
      }
    });

    // Determine most common document type and jurisdiction
    const topDocType = Object.entries(metadata.document_types)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    const topJurisdiction = Object.entries(metadata.jurisdictions)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    return {
      primary_document_type: topDocType,
      primary_jurisdiction: topJurisdiction,
      confidence: Math.min(passes.length / 5, 0.95)
    };
  }

  buildAnalysisPrompt(text, options, pass = 1, context = {}) {
    const detailLevel = options.detail_level || 'standard';
    const language = options.language || 'en';
    const categories = options.categories || ['privacy', 'liability', 'termination', 'payment'];

    // Multi-pass analysis with different focuses
    const passConfigs = {
      1: {
        focus: 'document_classification',
        task: 'Identify document type, jurisdiction, and key legal frameworks'
      },
      2: {
        focus: 'clause_extraction',
        task: 'Extract and categorize specific legal clauses'
      },
      3: {
        focus: 'risk_assessment',
        task: 'Assess user impact and risk implications'
      },
      4: {
        focus: 'contextual_analysis',
        task: 'Consider jurisdiction-specific and service-type implications'
      },
      5: {
        focus: 'synthesis',
        task: 'Generate final risk scores and actionable recommendations'
      }
    };

    const currentPass = passConfigs[pass] || passConfigs[1];

    // Build personalization context if available
    const personalizationContext = this.buildPersonalizationContext(options);

    // Enhanced system prompt with legal domain knowledge
    const systemPrompt = `You are an expert legal analyst specializing in terms and conditions, privacy policies, and user agreements. You have extensive knowledge of privacy regulations (GDPR, CCPA, PIPEDA), consumer protection laws, and contract law across multiple jurisdictions.

ANALYSIS REQUIREMENTS - PASS ${pass}/${Object.keys(passConfigs).length}:
Current Focus: ${currentPass.task}

1. Provide a risk score from 1-10 (1=very low risk, 10=extremely high risk)
2. Categorize risk level as "low" (1-3), "medium" (4-7), or "high" (8-10)
3. Generate a clear summary in plain English
4. Identify 3-5 key points users should know
5. Analyze specific categories: ${categories.join(', ')}
6. Assess confidence level (0.0-1.0)
7. Provide jurisdiction-specific insights when applicable
8. Include regulatory compliance assessment

RESPONSE FORMAT (JSON):
{
  "pass_number": ${pass},
  "document_type": "privacy_policy|terms_of_service|user_agreement|eula|cookie_policy",
  "jurisdiction": "US-CA|US-NY|EU-GDPR|other",
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
      "concerns": ["Specific privacy concern 1", "Specific privacy concern 2"],
      "regulatory_notes": ["GDPR Article 7 compliance", "CCPA notice requirements"]
    },
    "liability": {
      "score": 6.1,
      "concerns": ["Liability concern 1"],
      "force_majeure": true,
      "indemnification": true
    },
    "termination": {
      "score": 5.8,
      "concerns": ["Termination concern 1"],
      "notice_period": "30 days",
      "data_retention": "90 days"
    },
    "payment": {
      "score": 4.2,
      "concerns": ["Payment concern 1"],
      "refund_policy": "30-day money back",
      "auto_renewal": true
    }
  },
  "confidence": 0.85,
  "regulatory_flags": ["gdpr_compliant", "ccpa_compliant"],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}

ANALYSIS FOCUS AREAS:
- Data collection practices and consent mechanisms
- Third-party data sharing and processor agreements
- User liability limitations and indemnification clauses
- Service termination conditions and data deletion rights
- Payment terms, auto-renewal, and refund policies
- Dispute resolution mechanisms (arbitration vs litigation)
- Content ownership, licensing, and IP rights
- Limitation of liability and warranty disclaimers
- Governing law and jurisdiction clauses
- Regulatory compliance (GDPR, CCPA, consumer protection laws)

SCORING GUIDELINES:
- 1-3 (Low): Standard terms, minimal user risk, clear rights
- 4-7 (Medium): Some concerning clauses, moderate risk, review recommended
- 8-10 (High): Multiple red flags, significant user risk, caution advised

Language: ${language}
Detail Level: ${detailLevel}
Categories: ${categories.join(', ')}

${personalizationContext}

${context.previousPasses ? `Previous Analysis Context: ${JSON.stringify(context.previousPasses)}` : ''}

Now analyze the following terms and conditions:`;

    return `${systemPrompt}\n\n--- TERMS AND CONDITIONS TEXT ---\n${text}\n\n--- END OF TEXT ---\n\nProvide your analysis in the exact JSON format specified above:`;
  }

  buildPersonalizationContext(options) {
    if (!options.personalizationContext) {
      return '';
    }

    const context = options.personalizationContext;
    const profile = context.userProfile || {};

    let personalizationText = '\n\n--- USER PERSONALIZATION CONTEXT ---\n';

    if (context.riskTolerance) {
      personalizationText += `\nRisk Tolerance Levels:
- Privacy: ${context.riskTolerance.privacy}/10 (higher = more tolerant of privacy risks)
- Financial: ${context.riskTolerance.financial}/10 (higher = more tolerant of financial risks)
- Legal: ${context.riskTolerance.legal}/10 (higher = more tolerant of legal risks)
- Overall: ${context.riskTolerance.overall}/10`;
    }

    if (context.alertThresholds) {
      personalizationText += `\n\nAlert Thresholds (lower = more sensitive to issues):
- Privacy alerts: ${context.alertThresholds.privacy}/10
- Liability alerts: ${context.alertThresholds.liability}/10
- Termination alerts: ${context.alertThresholds.termination}/10
- Payment alerts: ${context.alertThresholds.payment}/10`;
    }

    if (context.explanationStyle) {
      personalizationText += `\n\nPreferred Explanation Style: ${context.explanationStyle}`;
    }

    if (profile.ageRange) {
      personalizationText += `\n\nUser Demographics:
- Age Range: ${profile.ageRange}
- Occupation: ${profile.occupation || 'Not specified'}
- Jurisdiction: ${profile.jurisdiction || 'Not specified'}
- Tech Sophistication: ${profile.techSophistication || 'Not specified'}`;
    }

    if (profile.primaryActivities && profile.primaryActivities.length > 0) {
      personalizationText += `\n\nPrimary Online Activities: ${profile.primaryActivities.join(', ')}`;
    }

    if (profile.privacyImportance) {
      personalizationText += `\n\nPrivacy Importance: ${profile.privacyImportance.replace(/_/g, ' ')}`;
    }

    if (profile.arbitrationComfort) {
      personalizationText += `\n\nArbitration Comfort: ${profile.arbitrationComfort.replace(/_/g, ' ')}`;
    }

    personalizationText += '\n\n--- END PERSONALIZATION CONTEXT ---\n';

    personalizationText += '\nIMPORTANT: Tailor your analysis to this user\'s risk tolerance, alert preferences, and explanation style. Use the alert thresholds to determine what issues should be flagged for this specific user.\n';

    return personalizationText;
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

  generateMockAnalysis(text, options = {}) {
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

    const baseAnalysis = {
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
      word_count: wordCount,
      major_clauses: {
        description: 'Key contractual provisions identified in the document',
        clauses: [
          {
            type: 'data_collection',
            title: 'Data Collection & Privacy',
            description: 'Service collects personal data including email, location, and browsing habits with potential third-party sharing',
            importance: 'high',
            risk_level: hasPrivacyTerms ? 'medium' : 'low'
          },
          {
            type: 'liability_limitation',
            title: 'Liability Limitations',
            description: 'Service provider liability is broadly limited, user assumes significant responsibility',
            importance: 'high',
            risk_level: hasLiabilityTerms ? 'high' : 'medium'
          },
          {
            type: 'termination',
            title: 'Account Termination',
            description: 'Service may terminate accounts at any time with or without cause',
            importance: 'medium',
            risk_level: 'medium'
          },
          {
            type: 'payment_terms',
            title: 'Payment & Billing',
            description: 'Non-refundable subscription fees with auto-renewal provisions',
            importance: 'medium',
            risk_level: hasPaymentTerms ? 'medium' : 'low'
          },
          {
            type: 'dispute_resolution',
            title: 'Dispute Resolution',
            description: 'Binding arbitration required, class action waivers present',
            importance: 'high',
            risk_level: 'high'
          }
        ]
      }
    };

    // Add multi-pass analysis data if requested
    if (options.multiPass) {
      return {
        ...baseAnalysis,
        multi_pass_analysis: true,
        passes_completed: 5,
        synthesis_method: 'weighted_average',
        aggregated_scores: {
          privacy: {
            score: hasPrivacyTerms ? 7.3 : 3.6,
            confidence: 0.92,
            passes_contributing: 5
          },
          liability: {
            score: hasLiabilityTerms ? 6.9 : 4.1,
            confidence: 0.88,
            passes_contributing: 5
          },
          termination: {
            score: hasTerminationTerms ? 5.6 : 4.1,
            confidence: 0.85,
            passes_contributing: 4
          },
          payment: {
            score: hasPaymentTerms ? 5.1 : 2.1,
            confidence: 0.78,
            passes_contributing: 3
          }
        },
        comprehensive_insights: {
          key_concerns: [
            'Data collection and sharing practices',
            'Broad liability limitations',
            'Non-refundable payment terms'
          ],
          regulatory_flags: hasPrivacyTerms ? ['gdpr_compliant', 'ccpa_compliant'] : [],
          recommendations: [
            'Review data collection practices carefully',
            'Consider liability implications',
            'Check payment terms before subscribing'
          ],
          jurisdictions: ['US-CA', 'EU-GDPR'],
          major_clauses: {
            description: 'Key contractual provisions identified in the document',
            clauses: [
              {
                type: 'data_collection',
                title: 'Data Collection & Privacy',
                description: 'Service collects personal data including email, location, and browsing habits with potential third-party sharing',
                importance: 'high',
                risk_level: hasPrivacyTerms ? 'medium' : 'low'
              },
              {
                type: 'liability_limitation',
                title: 'Liability Limitations',
                description: 'Service provider liability is broadly limited, user assumes significant responsibility',
                importance: 'high',
                risk_level: hasLiabilityTerms ? 'high' : 'medium'
              },
              {
                type: 'termination',
                title: 'Account Termination',
                description: 'Service may terminate accounts at any time with or without cause',
                importance: 'medium',
                risk_level: 'medium'
              },
              {
                type: 'payment_terms',
                title: 'Payment & Billing',
                description: 'Non-refundable subscription fees with auto-renewal provisions',
                importance: 'medium',
                risk_level: hasPaymentTerms ? 'medium' : 'low'
              },
              {
                type: 'dispute_resolution',
                title: 'Dispute Resolution',
                description: 'Binding arbitration required, class action waivers present',
                importance: 'high',
                risk_level: 'high'
              }
            ]
          }
        },
        document_metadata: {
          primary_document_type: 'terms_of_service',
          primary_jurisdiction: 'US-CA',
          confidence: 0.91
        }
      };
    }

    return baseAnalysis;
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



  buildSelectedTextPrompt(text, options) {
    const context = options.context ? `\n\nContext: ${options.context}` : '';
    const focusAreas = options.focus_areas ? options.focus_areas.join(', ') : 'general legal implications';
    
    return `You are a legal AI assistant specializing in analyzing selected clauses from terms and conditions documents. Analyze the following selected text and provide a comprehensive legal assessment.

SELECTED TEXT TO ANALYZE:
"${text}"${context}

ANALYSIS REQUIREMENTS:
- Focus on: ${focusAreas}
- Provide a risk score from 1-10 (1 = very safe, 10 = very concerning)
- Identify the clause type (privacy, liability, termination, payment, general, etc.)
- Assess legal implications and user impact
- Provide specific recommendations

RESPOND WITH VALID JSON IN THIS EXACT FORMAT:
{
  "risk_score": <number 1-10>,
  "risk_level": "<low|medium|high>",
  "summary": "<brief summary of the clause and its implications>",
  "key_points": ["<point 1>", "<point 2>", "<point 3>"],
  "categories": {
    "privacy": {"score": <1-10>, "concerns": ["<concern 1>", "<concern 2>"]},
    "liability": {"score": <1-10>, "concerns": ["<concern 1>", "<concern 2>"]},
    "termination": {"score": <1-10>, "concerns": ["<concern 1>", "<concern 2>"]},
    "payment": {"score": <1-10>, "concerns": ["<concern 1>", "<concern 2>"]}
  },
  "confidence": <0.0-1.0>,
  "clause_type": "<privacy|liability|termination|payment|general>",
  "legal_implications": ["<implication 1>", "<implication 2>"],
  "user_impact": "<low|moderate|high>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "mock": false
}

Focus on providing actionable insights about this specific clause and its potential impact on users.`;
  }

  generateMockSelectedTextAnalysis(text, options) {
    logger.info('Generating mock selected text analysis');
    
    // Simple heuristic analysis for selected text
    const riskKeywords = [
      'liability', 'disclaim', 'terminate', 'suspend', 'collect', 'share',
      'third party', 'binding arbitration', 'waive', 'indemnify', 'breach'
    ];
    
    const foundKeywords = riskKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    let riskScore = 5.0;
    riskScore += foundKeywords.length * 0.8;
    riskScore = Math.min(10, Math.max(1, riskScore));
    
    const riskLevel = riskScore <= 3.5 ? 'low' : riskScore <= 7.0 ? 'medium' : 'high';
    
    return {
      risk_score: Math.round(riskScore * 10) / 10,
      risk_level: riskLevel,
      summary: `Selected clause analysis: This text contains ${foundKeywords.length} potential risk indicators. ${riskLevel === 'high' ? 'High attention required.' : riskLevel === 'medium' ? 'Moderate attention recommended.' : 'Appears relatively safe.'}`,
      key_points: [
        `Contains ${foundKeywords.length} potential risk keywords`,
        riskLevel === 'high' ? 'High-risk language detected' : 'Standard legal language',
        'Manual review recommended for complete understanding'
      ],
      categories: {
        privacy: { 
          score: text.toLowerCase().includes('privacy') || text.toLowerCase().includes('data') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: text.toLowerCase().includes('privacy') ? ['Data collection mentioned', 'Privacy implications present'] : ['No specific privacy concerns identified']
        },
        liability: { 
          score: text.toLowerCase().includes('liability') || text.toLowerCase().includes('disclaim') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: text.toLowerCase().includes('liability') ? ['Liability limitations present', 'Legal responsibility clauses'] : ['No specific liability concerns identified']
        },
        termination: { 
          score: text.toLowerCase().includes('terminate') || text.toLowerCase().includes('suspend') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: text.toLowerCase().includes('terminate') ? ['Termination clauses present', 'Account suspension possible'] : ['No specific termination concerns identified']
        },
        payment: { 
          score: text.toLowerCase().includes('payment') || text.toLowerCase().includes('fee') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: text.toLowerCase().includes('payment') ? ['Payment terms present', 'Financial obligations mentioned'] : ['No specific payment concerns identified']
        }
      },
      confidence: 0.7,
      clause_type: this.determineClauseType(text),
      legal_implications: this.generateLegalImplications(text, riskScore),
      user_impact: riskLevel,
      recommendations: this.generateSelectedTextRecommendations(riskScore, text),
      mock: true
    };
  }

  determineClauseType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('privacy') || lowerText.includes('data') || lowerText.includes('collect')) {
      return 'privacy';
    } else if (lowerText.includes('liability') || lowerText.includes('disclaim') || lowerText.includes('indemnify')) {
      return 'liability';
    } else if (lowerText.includes('terminate') || lowerText.includes('suspend') || lowerText.includes('cancel')) {
      return 'termination';
    } else if (lowerText.includes('payment') || lowerText.includes('fee') || lowerText.includes('charge')) {
      return 'payment';
    } else {
      return 'general';
    }
  }

  generateLegalImplications(text, riskScore) {
    const implications = [];
    
    if (text.toLowerCase().includes('arbitration')) {
      implications.push('May require arbitration instead of court proceedings');
    }
    
    if (text.toLowerCase().includes('waive')) {
      implications.push('May waive certain legal rights');
    }
    
    if (text.toLowerCase().includes('liability')) {
      implications.push('May limit legal liability and damages');
    }
    
    if (riskScore >= 7) {
      implications.push('High-risk language may have significant legal consequences');
    }
    
    if (implications.length === 0) {
      implications.push('Standard legal language with typical implications');
    }
    
    return implications;
  }

  generateSelectedTextRecommendations(riskScore, text) {
    const recommendations = [];
    
    if (riskScore >= 7) {
      recommendations.push('This clause requires careful review - consider seeking legal advice');
    }
    
    if (text.toLowerCase().includes('arbitration')) {
      recommendations.push('Understand that disputes may be resolved through arbitration');
    }
    
    if (text.toLowerCase().includes('terminate')) {
      recommendations.push('Review termination conditions and your rights');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('This clause appears reasonable but always read carefully');
    }
    
    return recommendations;
  }

  generateFallbackSelectedTextAnalysis(text, error, options) {
    logger.warn('Generating fallback selected text analysis due to error:', error.message);
    
    return {
      risk_score: 5.0,
      risk_level: 'medium',
      summary: 'Selected text analysis encountered technical difficulties. Manual review strongly recommended.',
      key_points: [
        'Automated analysis failed due to technical issues',
        'Manual review of this clause is strongly recommended',
        'Unable to provide detailed risk assessment'
      ],
      categories: {
        privacy: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] },
        liability: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] },
        termination: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] },
        payment: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] }
      },
      confidence: 0.2,
      clause_type: 'general',
      legal_implications: ['Technical error occurred - seek manual legal review'],
      user_impact: 'unknown',
      recommendations: ['Technical error occurred - seek manual legal review'],
      mock: false,
      fallback: true,
      error_type: error.message
    };
  }

  async analyzeSelectedText(text, options = {}) {
    if (this.mockMode) {
      return this.generateMockSelectedTextAnalysis(text, options);
    }

    try {
      logger.info('Starting selected text analysis with Gemini:', {
        textLength: text.length,
        options: options
      });

      // Build specialized prompt for selected text analysis
      const prompt = this.buildSelectedTextAnalysisPrompt(text, options);
      const result = await this.callGeminiWithRetry(prompt);
      const parsedResult = this.parseSelectedTextAnalysisResponse(result);

      logger.info('Selected text analysis completed successfully:', {
        textLength: text.length,
        riskScore: parsedResult.risk_score,
        riskLevel: parsedResult.risk_level
      });

      return parsedResult;

    } catch (error) {
      logger.error('Gemini selected text analysis failed:', {
        error: error.message,
        textLength: text.length,
        options
      });

      // Fall back to mock analysis on error
      logger.info('Falling back to mock selected text analysis due to error');
      return this.generateMockSelectedTextAnalysis(text, options);
    }
  }

  buildSelectedTextAnalysisPrompt(text, options) {
    const context = options.context || 'Selected text from terms and conditions document';
    const focusAreas = options.focus_areas || ['data_usage', 'user_obligations', 'service_limitations', 'privacy_practices'];
    
    return `You are a legal AI assistant specializing in analyzing specific clauses and text selections from terms and conditions documents. 

CONTEXT: ${context}

SELECTED TEXT TO ANALYZE:
"""
${text}
"""

Please analyze this selected text and provide a comprehensive assessment focusing on the following areas: ${focusAreas.join(', ')}.

Return your analysis as a JSON object with the following structure:
{
  "risk_score": <number between 1-10>,
  "risk_level": "<low|medium|high>",
  "summary": "<brief summary of the clause and its implications>",
  "key_points": ["<array of 3-5 key points about this clause>"],
  "categories": {
    "privacy": {"score": <1-10>, "concerns": ["<array of specific concerns>"]},
    "liability": {"score": <1-10>, "concerns": ["<array of specific concerns>"]},
    "termination": {"score": <1-10>, "concerns": ["<array of specific concerns>"]},
    "payment": {"score": <1-10>, "concerns": ["<array of specific concerns>"]}
  },
  "confidence": <number between 0-1>,
  "clause_type": "<privacy|liability|termination|payment|general>",
  "legal_implications": ["<array of legal implications>"],
  "user_impact": "<low|moderate|high>",
  "recommendations": ["<array of actionable recommendations>"]
}

Focus on:
1. The specific legal implications of this exact text
2. How this clause affects the user's rights and obligations
3. Potential risks or concerns in this specific selection
4. Practical recommendations for the user regarding this clause

Be precise and focus only on what is explicitly stated or clearly implied in the selected text.`;
  }

  parseSelectedTextAnalysisResponse(response) {
    try {
      // Try to parse as JSON first
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return this.validateSelectedTextAnalysisResponse(parsed);
        }
      }

      // If it's already an object, validate it
      if (typeof response === 'object') {
        return this.validateSelectedTextAnalysisResponse(response);
      }

      throw new Error('Invalid response format from Gemini');
    } catch (error) {
      logger.error('Failed to parse selected text analysis response:', error.message);
      throw new Error('Failed to parse analysis response');
    }
  }

  validateSelectedTextAnalysisResponse(analysis) {
    // Ensure all required fields are present with defaults
    return {
      risk_score: this.validateRiskScore(analysis.risk_score),
      risk_level: this.validateRiskLevel(analysis.risk_level),
      summary: this.validateSummary(analysis.summary),
      key_points: this.validateKeyPoints(analysis.key_points),
      categories: this.validateCategories(analysis.categories),
      confidence: this.validateConfidence(analysis.confidence),
      clause_type: analysis.clause_type || 'general',
      legal_implications: Array.isArray(analysis.legal_implications) ? analysis.legal_implications : ['Manual review recommended'],
      user_impact: analysis.user_impact || 'moderate',
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : ['Review this clause carefully']
    };
  }

  validateRiskScore(score) {
    const numScore = parseFloat(score);
    if (isNaN(numScore) || numScore < 1 || numScore > 10) {
      logger.warn('Invalid risk score, using default:', score);
      return 5.0;
    }
    return Math.round(numScore * 10) / 10; // Round to 1 decimal place
  }

  validateRiskLevel(level) {
    const validLevels = ['low', 'medium', 'high'];
    if (!validLevels.includes(level)) {
      logger.warn('Invalid risk level, using default:', level);
      return 'medium';
    }
    return level;
  }

  validateSummary(summary) {
    if (!summary || typeof summary !== 'string' || summary.length < 10) {
      return 'Analysis completed for selected text. Manual review recommended.';
    }
    
    // Ensure summary is not too long
    if (summary.length > 500) {
      return summary.substring(0, 497) + '...';
    }
    
    return summary.trim();
  }

  validateKeyPoints(keyPoints) {
    if (!Array.isArray(keyPoints)) {
      return ['Selected text analysis completed'];
    }

    // Filter and validate key points
    const validPoints = keyPoints
      .filter(point => point && typeof point === 'string' && point.length > 5)
      .slice(0, 5) // Maximum 5 key points
      .map(point => point.trim());

    if (validPoints.length === 0) {
      return ['No specific concerns identified in the selected text'];
    }

    return validPoints;
  }

  validateCategories(categories) {
    const defaultCategory = {
      score: 5.0,
      concerns: ['Analysis incomplete for this category']
    };

    if (!categories || typeof categories !== 'object') {
      return {
        privacy: defaultCategory,
        liability: defaultCategory,
        termination: defaultCategory,
        payment: defaultCategory
      };
    }

    const validatedCategories = {};
    const requiredCategories = ['privacy', 'liability', 'termination', 'payment'];

    requiredCategories.forEach(categoryName => {
      const category = categories[categoryName];
      
      if (category && typeof category === 'object') {
        validatedCategories[categoryName] = {
          score: this.validateRiskScore(category.score || 5.0),
          concerns: Array.isArray(category.concerns) 
            ? category.concerns.slice(0, 3) // Max 3 concerns per category
            : ['No specific concerns identified']
        };
      } else {
        validatedCategories[categoryName] = defaultCategory;
      }
    });

    return validatedCategories;
  }

  validateConfidence(confidence) {
    const numConfidence = parseFloat(confidence);
    if (isNaN(numConfidence) || numConfidence < 0 || numConfidence > 1) {
      logger.warn('Invalid confidence score, using default:', confidence);
      return 0.7;
    }
    return Math.round(numConfidence * 100) / 100; // Round to 2 decimal places
  }

  generateMockSelectedTextAnalysis(text, options) {
    logger.info('Generating mock selected text analysis:', {
      textLength: text.length,
      options: options
    });

    // Simple heuristic-based analysis for selected text
    let riskScore = 5.0;
    const lowerText = text.toLowerCase();
    
    // Risk keyword detection
    const riskKeywords = [
      'liability', 'disclaim', 'terminate', 'suspend', 'collect', 'share',
      'third party', 'binding arbitration', 'waive', 'indemnify', 'breach',
      'damages', 'compensation', 'remedy', 'covenant', 'warranty'
    ];
    
    const foundKeywords = riskKeywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    
    riskScore += foundKeywords.length * 0.8;
    riskScore = Math.min(10, Math.max(1, riskScore));
    
    const riskLevel = riskScore <= 3.5 ? 'low' : riskScore <= 7.0 ? 'medium' : 'high';

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      summary: `Selected text analysis completed. This clause appears to be ${riskLevel} risk with ${foundKeywords.length} potential risk indicators.`,
      key_points: [
        `Clause contains ${foundKeywords.length} potential risk keywords`,
        `Overall risk assessment: ${riskLevel}`,
        'Manual review recommended for complete understanding',
        foundKeywords.length > 0 ? `Key concerns: ${foundKeywords.slice(0, 3).join(', ')}` : 'No major concerns identified'
      ],
      categories: {
        privacy: { 
          score: lowerText.includes('privacy') || lowerText.includes('data') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: lowerText.includes('privacy') ? ['Data collection mentioned', 'Privacy implications present'] : ['No specific privacy concerns identified']
        },
        liability: { 
          score: lowerText.includes('liability') || lowerText.includes('disclaim') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: lowerText.includes('liability') ? ['Liability limitations present', 'Legal responsibility clauses'] : ['No specific liability concerns identified']
        },
        termination: { 
          score: lowerText.includes('terminate') || lowerText.includes('suspend') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: lowerText.includes('terminate') ? ['Termination clauses present', 'Account suspension possible'] : ['No specific termination concerns identified']
        },
        payment: { 
          score: lowerText.includes('payment') || lowerText.includes('fee') ? Math.min(10, riskScore + 1) : riskScore,
          concerns: lowerText.includes('payment') ? ['Payment terms present', 'Financial obligations mentioned'] : ['No specific payment concerns identified']
        }
      },
      confidence: 0.7,
      clause_type: this.determineClauseType(text),
      legal_implications: this.generateLegalImplications(text, riskScore),
      user_impact: riskLevel,
      recommendations: this.generateSelectedTextRecommendations(riskScore, text),
      mock: true
    };
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
