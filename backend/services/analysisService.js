// Analysis Service for Going Bananas T&C Analyzer
const logger = require('../utils/logger');
const { calculateRiskScore } = require('../utils/riskCalculator');

class AnalysisService {
  constructor(geminiService) {
    this.geminiService = geminiService;
    this.analysisTimeout = parseInt(process.env.DEFAULT_ANALYSIS_TIMEOUT) || 30000;
    this.confidenceThreshold = parseFloat(process.env.ANALYSIS_CONFIDENCE_THRESHOLD) || 0.7;
  }

  async analyzeText(text, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input for analysis');
      }

      if (text.length < 50) {
        throw new Error('Text too short for meaningful analysis');
      }

      if (text.length > 50000) {
        throw new Error('Text too long for analysis');
      }

      logger.info('Starting text analysis:', {
        textLength: text.length,
        options: options
      });

      // Set timeout for analysis
      const analysisPromise = this.performAnalysis(text, options);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout')), this.analysisTimeout);
      });

      const rawAnalysis = await Promise.race([analysisPromise, timeoutPromise]);

      // Post-process and validate the analysis
      const processedAnalysis = await this.postProcessAnalysis(rawAnalysis, text, options);

      // Log successful analysis
      const processingTime = Date.now() - startTime;
      logger.info('Analysis completed successfully:', {
        textLength: text.length,
        riskScore: processedAnalysis.risk_score,
        riskLevel: processedAnalysis.risk_level,
        confidence: processedAnalysis.confidence,
        processingTime: processingTime
      });

      return processedAnalysis;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Analysis failed:', {
        error: error.message,
        textLength: text.length,
        processingTime: processingTime,
        options: options
      });

      // Return a fallback analysis on error
      return this.generateFallbackAnalysis(text, error, options);
    }
  }

  async performAnalysis(text, options) {
    try {
      // Enhance options with personalization context if available
      const enhancedOptions = this.enhanceOptionsWithPersonalization(options);

      // Debug logging
      logger.debug('Analysis options:', {
        originalMultiPass: options.multiPass,
        enhancedMultiPass: enhancedOptions.multiPass,
        contextAware: options.contextAware,
        hasPersonalizationContext: !!options.personalizationContext
      });

      // Use Gemini service for analysis
      const analysis = await this.geminiService.analyzeTermsAndConditions(text, enhancedOptions);

      if (!analysis || typeof analysis !== 'object') {
        throw new Error('Invalid analysis response from Gemini service');
      }

      // Debug logging for raw analysis
      logger.debug('Raw analysis from Gemini:', {
        hasMultiPass: !!analysis.multi_pass_analysis,
        passesCompleted: analysis.passes_completed,
        mock: analysis.mock,
        riskScore: analysis.risk_score
      });

      return analysis;
    } catch (error) {
      logger.error('Gemini analysis failed:', error.message);
      throw error;
    }
  }

  enhanceOptionsWithPersonalization(options) {
    const enhanced = { ...options };

    // Only enhance if personalization context is available
    if (options.personalizationContext) {
      const profile = options.personalizationContext;
      const riskTolerance = profile.computedProfile?.riskTolerance || {};
      const alertThresholds = profile.computedProfile?.alertThresholds || {};
      const explanationStyle = profile.computedProfile?.explanationStyle || 'balanced_educational';

      // Build personalized context for the AI
      enhanced.personalizationContext = {
        riskTolerance: riskTolerance,
        alertThresholds: alertThresholds,
        explanationStyle: explanationStyle,
        userProfile: {
          ageRange: profile.demographics?.ageRange,
          occupation: profile.demographics?.occupation,
          jurisdiction: profile.demographics?.jurisdiction?.primaryCountry,
          techSophistication: profile.digitalBehavior?.techSophistication?.comfortLevel,
          primaryActivities: profile.digitalBehavior?.usagePatterns?.primaryActivities || [],
          privacyImportance: profile.riskPreferences?.privacy?.overallImportance,
          arbitrationComfort: profile.riskPreferences?.legal?.arbitrationComfort
        }
      };

      logger.debug('Enhanced analysis with personalization context', {
        userId: profile.userId,
        riskTolerance: riskTolerance.overall,
        explanationStyle: explanationStyle
      });
    }

    return enhanced;
  }

  async postProcessAnalysis(rawAnalysis, originalText, options) {
    try {
      // Create the processed analysis object
      const analysis = {
        // Core analysis results
        risk_score: this.validateRiskScore(rawAnalysis.risk_score),
        risk_level: this.validateRiskLevel(rawAnalysis.risk_level),
        summary: this.validateSummary(rawAnalysis.summary),
        key_points: this.validateKeyPoints(rawAnalysis.key_points),
        categories: this.validateCategories(rawAnalysis.categories),
        confidence: this.validateConfidence(rawAnalysis.confidence),

        // Metadata
        analysis_time: Date.now(),
        word_count: originalText.split(/\s+/).length,
        char_count: originalText.length,
        language: options.language || 'en',
        detail_level: options.detail_level || 'standard',

        // Processing flags
        fallback: rawAnalysis.fallback || false,
        mock: rawAnalysis.mock || false,

        // Multi-pass analysis fields (preserve if present)
        multi_pass_analysis: rawAnalysis.multi_pass_analysis,
        passes_completed: rawAnalysis.passes_completed,
        synthesis_method: rawAnalysis.synthesis_method,
        aggregated_scores: rawAnalysis.aggregated_scores,
        comprehensive_insights: rawAnalysis.comprehensive_insights,
        document_metadata: rawAnalysis.document_metadata,
        major_clauses: rawAnalysis.major_clauses,

        // Analysis version for tracking
        analyzer_version: '1.0.0'
      };

      // Ensure risk level matches score
      analysis.risk_level = this.calculateRiskLevelFromScore(analysis.risk_score);

      // Add additional insights
      analysis.insights = this.generateInsights(analysis, originalText);

      // Validate overall coherence
      this.validateAnalysisCoherence(analysis);

      return analysis;

    } catch (error) {
      logger.error('Post-processing failed:', error.message);
      throw new Error('Analysis post-processing failed');
    }
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
      return 'Analysis completed. Manual review of terms and conditions recommended.';
    }
    
    // Ensure summary is not too long
    if (summary.length > 500) {
      return summary.substring(0, 497) + '...';
    }
    
    return summary.trim();
  }

  validateKeyPoints(keyPoints) {
    if (!Array.isArray(keyPoints)) {
      return ['Analysis completed with limited detail extraction'];
    }

    // Filter and validate key points
    const validPoints = keyPoints
      .filter(point => point && typeof point === 'string' && point.length > 5)
      .slice(0, 5) // Maximum 5 key points
      .map(point => point.trim());

    if (validPoints.length === 0) {
      return ['No specific concerns identified in the analysis'];
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

  calculateRiskLevelFromScore(score) {
    if (score <= 3.5) return 'low';
    if (score <= 7.0) return 'medium';
    return 'high';
  }

  generateInsights(analysis, originalText) {
    const insights = {
      text_complexity: this.assessTextComplexity(originalText),
      key_risk_factors: this.identifyKeyRiskFactors(analysis),
      recommendations: this.generateRecommendations(analysis),
      comparative_risk: this.getComparativeRisk(analysis.risk_score)
    };

    return insights;
  }

  assessTextComplexity(text) {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    
    // Simple readability assessment
    let complexity = 'standard';
    if (avgWordsPerSentence > 20 || text.length > 10000) {
      complexity = 'high';
    } else if (avgWordsPerSentence < 10 && text.length < 2000) {
      complexity = 'low';
    }

    return {
      level: complexity,
      word_count: words.length,
      sentence_count: sentences.length,
      avg_words_per_sentence: Math.round(avgWordsPerSentence)
    };
  }

  identifyKeyRiskFactors(analysis) {
    const riskFactors = [];

    // Check for high-risk categories
    Object.entries(analysis.categories).forEach(([category, data]) => {
      if (data.score >= 7) {
        riskFactors.push({
          category: category,
          severity: 'high',
          score: data.score
        });
      }
    });

    // Check overall risk
    if (analysis.risk_score >= 8) {
      riskFactors.push({
        category: 'overall',
        severity: 'critical',
        score: analysis.risk_score
      });
    }

    return riskFactors;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.risk_score >= 7) {
      recommendations.push('Consider seeking legal advice before accepting these terms');
    }

    if (analysis.categories.privacy?.score >= 7) {
      recommendations.push('Review data collection and sharing practices carefully');
    }

    if (analysis.categories.liability?.score >= 7) {
      recommendations.push('Pay special attention to liability and responsibility clauses');
    }

    if (analysis.confidence < this.confidenceThreshold) {
      recommendations.push('Manual review recommended due to analysis uncertainty');
    }

    if (recommendations.length === 0) {
      recommendations.push('Terms appear reasonable but always read carefully');
    }

    return recommendations;
  }

  getComparativeRisk(score) {
    if (score <= 3) return 'Much safer than average terms';
    if (score <= 5) return 'Slightly safer than average terms';
    if (score <= 7) return 'Similar to average terms';
    if (score <= 8.5) return 'More concerning than average terms';
    return 'Significantly more concerning than average terms';
  }

  validateAnalysisCoherence(analysis) {
    // Check that risk level matches risk score
    const expectedLevel = this.calculateRiskLevelFromScore(analysis.risk_score);
    if (analysis.risk_level !== expectedLevel) {
      logger.warn('Risk level mismatch corrected:', {
        original: analysis.risk_level,
        corrected: expectedLevel,
        score: analysis.risk_score
      });
      analysis.risk_level = expectedLevel;
    }

    // Check that category scores are reasonable relative to overall score
    const categoryScores = Object.values(analysis.categories).map(cat => cat.score);
    const avgCategoryScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
    
    if (Math.abs(analysis.risk_score - avgCategoryScore) > 3) {
      logger.warn('Large discrepancy between overall and category scores:', {
        overall: analysis.risk_score,
        average_category: avgCategoryScore
      });
    }
  }

  generateFallbackAnalysis(text, error, options) {
    logger.warn('Generating fallback analysis due to error:', error.message);

    const wordCount = text.split(/\s+/).length;
    
    // Simple heuristic-based analysis
    let riskScore = 5.0;
    
    // Basic keyword detection
    const riskKeywords = [
      'liability', 'disclaim', 'terminate', 'suspend', 'collect', 'share',
      'third party', 'binding arbitration', 'waive', 'indemnify'
    ];
    
    const foundKeywords = riskKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    riskScore += foundKeywords.length * 0.5;
    riskScore = Math.min(10, Math.max(1, riskScore));

    return {
      risk_score: riskScore,
      risk_level: this.calculateRiskLevelFromScore(riskScore),
      summary: 'Analysis completed with limited accuracy due to technical issues. Manual review strongly recommended.',
      key_points: [
        'Automated analysis encountered technical difficulties',
        'Manual review of terms and conditions is strongly recommended',
        `Document contains ${foundKeywords.length} potential risk keywords`
      ],
      categories: {
        privacy: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] },
        liability: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] },
        termination: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] },
        payment: { score: 5.0, concerns: ['Analysis incomplete - manual review required'] }
      },
      confidence: 0.3,
      analysis_time: Date.now(),
      word_count: wordCount,
      char_count: text.length,
      language: options.language || 'en',
      detail_level: options.detail_level || 'standard',
      fallback: true,
      error_type: error.message,
      analyzer_version: '1.0.0',
      insights: {
        text_complexity: { level: 'unknown', word_count: wordCount },
        key_risk_factors: [],
        recommendations: ['Technical error occurred - seek manual legal review'],
        comparative_risk: 'Unable to assess due to technical issues'
      }
    };
  }
}

module.exports = AnalysisService;
