/**
 * Gemini Personalization Service for Going Bananas T&C Analyzer
 * 
 * This service integrates user personalization profiles with Gemini AI analysis
 * to provide highly customized risk assessments and explanations tailored to
 * individual user needs, expertise levels, and risk tolerances.
 * 
 * The service generates personalized prompts, adapts analysis depth, and
 * customizes explanation styles based on comprehensive user profiling data.
 * 
 * @fileoverview Personalized Gemini AI integration service
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const GeminiService = require('./geminiService');
const PersonalizationService = require('./personalizationService');

class GeminiPersonalizationService extends GeminiService {
  constructor() {
    super();
    this.personalizationService = new PersonalizationService();
    this.promptTemplates = this.initializePromptTemplates();
  }

  /**
   * Initialize personalized prompt templates for different user profiles
   * These templates are dynamically selected and customized based on user characteristics
   * 
   * @private
   * @returns {Object} Prompt templates organized by user profile characteristics
   */
  initializePromptTemplates() {
    return {
      // Base prompts by explanation style
      explanationStyles: {
        simple_protective: {
          systemPrompt: `You are a protective digital rights advisor helping someone understand terms and conditions. Use simple, clear language and err on the side of caution. Focus on protecting the user from potential harm.`,
          analysisDepth: 'comprehensive',
          warningTone: 'protective',
          technicalDetail: 'minimal'
        },
        balanced_educational: {
          systemPrompt: `You are an educational legal technology advisor. Provide balanced analysis with clear explanations and educational context. Help users understand both risks and standard practices.`,
          analysisDepth: 'standard',
          warningTone: 'informative',
          technicalDetail: 'moderate'
        },
        technical_efficient: {
          systemPrompt: `You are a legal technology expert providing efficient, technical analysis. Use precise legal terminology and focus on actionable insights for sophisticated users.`,
          analysisDepth: 'targeted',
          warningTone: 'factual',
          technicalDetail: 'high'
        },
        comprehensive_cautious: {
          systemPrompt: `You are a comprehensive legal risk analyst. Provide thorough analysis with cautious interpretation and detailed risk assessment. Leave no stone unturned.`,
          analysisDepth: 'comprehensive',
          warningTone: 'cautious',
          technicalDetail: 'high'
        }
      },

      // Occupation-specific adaptations
      occupationAdaptations: {
        legal_compliance: {
          focus: 'regulatory compliance, enforceability, legal precedents',
          terminology: 'legal technical terms acceptable',
          context: 'professional legal analysis'
        },
        healthcare: {
          focus: 'HIPAA compliance, patient data protection, medical privacy',
          terminology: 'healthcare-aware language',
          context: 'healthcare professional considerations'
        },
        financial_services: {
          focus: 'financial regulations, liability exposure, fiduciary responsibility',
          terminology: 'financial industry terminology',
          context: 'financial professional analysis'
        },
        technology: {
          focus: 'data processing, API terms, developer rights, platform risks',
          terminology: 'technical terminology acceptable',
          context: 'technology professional perspective'
        },
        education: {
          focus: 'educational privacy, student data protection, FERPA compliance',
          terminology: 'educational context language',
          context: 'educational professional needs'
        },
        student: {
          focus: 'budget protection, educational resources, simple explanations',
          terminology: 'accessible, educational language',
          context: 'student learning and protection'
        },
        business_owner: {
          focus: 'business liability, employee impact, commercial terms',
          terminology: 'business terminology',
          context: 'business owner responsibility'
        },
        retired: {
          focus: 'fraud protection, clear explanations, financial safety',
          terminology: 'clear, non-technical language',
          context: 'retirement security and protection'
        }
      },

      // Risk tolerance adaptations
      riskToleranceAdaptations: {
        low_tolerance: {
          warningThreshold: 0.3,
          alertSensitivity: 'high',
          recommendationTone: 'strongly advise caution'
        },
        moderate_tolerance: {
          warningThreshold: 0.6,
          alertSensitivity: 'moderate',
          recommendationTone: 'recommend consideration'
        },
        high_tolerance: {
          warningThreshold: 0.8,
          alertSensitivity: 'low',
          recommendationTone: 'note for awareness'
        }
      },

      // Demographic-specific considerations
      demographicAdaptations: {
        under_18: {
          protection_level: 'maximum',
          explanation_style: 'educational_protective',
          legal_context: 'minor protections and guardian rights'
        },
        over_55: {
          protection_level: 'enhanced',
          explanation_style: 'clear_comprehensive',
          legal_context: 'elder protection and scam awareness'
        },
        non_native_speaker: {
          language_complexity: 'simplified',
          cultural_context: 'cross-cultural legal concepts',
          explanation_detail: 'enhanced_clarity'
        },
        vulnerable_circumstances: {
          protection_level: 'maximum',
          warning_sensitivity: 'enhanced',
          recommendation_strength: 'strong_protective'
        }
      }
    };
  }

  /**
   * Analyze terms and conditions with personalized approach
   * Integrates user profile to provide customized risk assessment and explanations
   * 
   * @param {string} text - Terms and conditions text to analyze
   * @param {string} userId - User identifier for personalization
   * @param {Object} options - Analysis options and context
   * @returns {Promise<Object>} Personalized analysis result
   */
  async analyzeTermsWithPersonalization(text, userId, options = {}) {
    try {
      logger.info('Starting personalized T&C analysis:', {
        userId: userId,
        textLength: text.length,
        hasOptions: !!options
      });

      // Retrieve user personalization profile
      const userProfile = await this.personalizationService.getUserProfile(userId);
      if (!userProfile) {
        logger.warn('User profile not found, using default analysis:', { userId });
        return await super.analyzeTermsAndConditions(text, options);
      }

      // Generate personalized prompt
      const personalizedPrompt = await this.buildPersonalizedPrompt(text, userProfile, options);
      
      // Perform AI analysis with personalized prompt
      const analysisResult = await this.callGeminiWithPersonalizedPrompt(personalizedPrompt);
      
      // Post-process results with personalization
      const personalizedResult = await this.personalizeAnalysisResult(analysisResult, userProfile, options);

      logger.info('Personalized analysis completed:', {
        userId: userId,
        riskScore: personalizedResult.risk_score,
        explanationStyle: userProfile.computedProfile.explanationStyle,
        profileTags: userProfile.computedProfile.profileTags.length
      });

      return personalizedResult;

    } catch (error) {
      logger.error('Personalized analysis failed:', {
        error: error.message,
        userId: userId,
        textLength: text.length
      });
      
      // Fallback to standard analysis
      logger.info('Falling back to standard analysis');
      return await super.analyzeTermsAndConditions(text, options);
    }
  }

  /**
   * Build personalized Gemini prompt based on user profile
   * Combines base legal analysis requirements with user-specific adaptations
   * 
   * @private
   * @param {string} text - T&C text to analyze
   * @param {Object} userProfile - Complete user personalization profile
   * @param {Object} options - Analysis options and context
   * @returns {Promise<string>} Personalized analysis prompt
   */
  async buildPersonalizedPrompt(text, userProfile, options) {
    const { computedProfile, demographics, riskPreferences, contextualFactors } = userProfile;
    const templates = this.promptTemplates;
    
    // Get base explanation style template
    const baseTemplate = templates.explanationStyles[computedProfile.explanationStyle];
    
    // Get occupation-specific adaptations
    const occupationAdaptation = templates.occupationAdaptations[demographics.occupation] || 
                                templates.occupationAdaptations.other;
    
    // Determine risk tolerance level
    const avgRiskTolerance = computedProfile.riskTolerance.overall;
    const riskToleranceLevel = avgRiskTolerance <= 3 ? 'low_tolerance' : 
                              avgRiskTolerance <= 7 ? 'moderate_tolerance' : 'high_tolerance';
    const riskAdaptation = templates.riskToleranceAdaptations[riskToleranceLevel];
    
    // Check for special demographic considerations
    const demographicAdaptation = this.getDemographicAdaptation(demographics, contextualFactors, templates);
    
    // Build personalized system prompt
    const personalizedSystemPrompt = this.buildSystemPrompt(
      baseTemplate,
      occupationAdaptation,
      riskAdaptation,
      demographicAdaptation,
      computedProfile
    );
    
    // Build personalized analysis instructions
    const analysisInstructions = this.buildAnalysisInstructions(
      userProfile,
      options,
      riskAdaptation
    );
    
    // Combine into complete prompt
    const completePrompt = `${personalizedSystemPrompt}

${analysisInstructions}

USER PROFILE CONTEXT:
- Experience Level: ${demographics.occupation} with ${computedProfile.explanationStyle} preferences
- Risk Tolerance: Privacy(${computedProfile.riskTolerance.privacy}), Financial(${computedProfile.riskTolerance.financial}), Legal(${computedProfile.riskTolerance.legal})
- Alert Thresholds: Privacy(${computedProfile.alertThresholds.privacy}), Liability(${computedProfile.alertThresholds.liability})
- Profile Tags: ${computedProfile.profileTags.slice(0, 10).join(', ')}
- Jurisdiction: ${demographics.jurisdiction.primaryCountry}

DOCUMENT TO ANALYZE:
${text}

PERSONALIZED ANALYSIS REQUEST:
Provide a risk assessment specifically tailored to this user's profile, experience level, and stated preferences. 
Focus on the aspects most relevant to their ${demographics.occupation} context and ${computedProfile.explanationStyle} style preference.
Apply appropriate warning thresholds based on their risk tolerance levels.`;

    return completePrompt;
  }

  /**
   * Build personalized system prompt by combining template components
   * 
   * @private
   * @param {Object} baseTemplate - Base explanation style template
   * @param {Object} occupationAdaptation - Occupation-specific adaptations
   * @param {Object} riskAdaptation - Risk tolerance adaptations
   * @param {Object} demographicAdaptation - Demographic-specific adaptations
   * @param {Object} computedProfile - User's computed profile parameters
   * @returns {string} Complete personalized system prompt
   */
  buildSystemPrompt(baseTemplate, occupationAdaptation, riskAdaptation, demographicAdaptation, computedProfile) {
    let systemPrompt = baseTemplate.systemPrompt;
    
    // Add occupation-specific context
    if (occupationAdaptation) {
      systemPrompt += `\n\nOCCUPATION CONTEXT: You are analyzing for a ${occupationAdaptation.context} perspective. Focus particularly on ${occupationAdaptation.focus}. Use ${occupationAdaptation.terminology}.`;
    }
    
    // Add risk tolerance guidance
    systemPrompt += `\n\nRISK APPROACH: Apply ${riskAdaptation.alertSensitivity} sensitivity to risk identification. When making recommendations, ${riskAdaptation.recommendationTone}.`;
    
    // Add demographic considerations
    if (demographicAdaptation) {
      if (demographicAdaptation.cultural_context) { // non_native_speaker
        systemPrompt += `\n\nDEMOGRAPHIC CONSIDERATIONS: ${demographicAdaptation.language_complexity} language and consider ${demographicAdaptation.cultural_context}. Provide ${demographicAdaptation.explanation_detail}.`;
      } else { // under_18, over_55, vulnerable_circumstances
        systemPrompt += `\n\nDEMOGRAPHIC CONSIDERATIONS: ${demographicAdaptation.explanation_style} with ${demographicAdaptation.protection_level} protection focus. Consider ${demographicAdaptation.legal_context}.`;
      }
    }
    
    // Add response format requirements
    systemPrompt += `\n\nRESPONSE FORMAT: Provide analysis using ${baseTemplate.technicalDetail} technical detail with ${baseTemplate.warningTone} tone. Analysis depth should be ${baseTemplate.analysisDepth}.`;
    
    return systemPrompt;
  }

  /**
   * Build personalized analysis instructions
   * 
   * @private
   * @param {Object} userProfile - Complete user profile
   * @param {Object} options - Analysis options
   * @param {Object} riskAdaptation - Risk tolerance adaptations
   * @returns {string} Personalized analysis instructions
   */
  buildAnalysisInstructions(userProfile, options, riskAdaptation) {
    const { riskPreferences, contextualFactors, computedProfile } = userProfile;
    
    let instructions = `PERSONALIZED ANALYSIS REQUIREMENTS:

1. RISK SCORING: Use threshold of ${riskAdaptation.warningThreshold} for triggering warnings.
   - Privacy risks: Alert if score > ${computedProfile.alertThresholds.privacy}
   - Financial risks: Alert if score > ${computedProfile.alertThresholds.payment}
   - Legal risks: Alert if score > ${computedProfile.alertThresholds.liability}

2. PRIORITY FOCUS AREAS:`;

    // Add privacy-specific instructions
    if (riskPreferences.privacy.overallImportance === 'extremely_important') {
      instructions += `\n   - PRIORITY: Detailed privacy analysis with enhanced scrutiny of data sharing clauses`;
    }
    
    // Add financial focus if relevant
    if (riskPreferences.financial.financialSituation === 'student_limited' || 
        riskPreferences.financial.feeImpact === 'significant') {
      instructions += `\n   - PRIORITY: Enhanced attention to all fees, charges, and payment obligations`;
    }
    
    // Add legal complexity considerations
    if (riskPreferences.legal.legalKnowledge.contractLaw === 'none') {
      instructions += `\n   - APPROACH: Explain legal concepts in simple terms without assuming legal knowledge`;
    }
    
    // Add contextual priorities
    const dependentStatus = contextualFactors.dependentStatus;
    if (dependentStatus !== 'just_myself') {
      instructions += `\n   - CONTEXT: Consider impact on ${dependentStatus} when assessing risks`;
    }
    
    instructions += `\n\n3. EXPLANATION STYLE: Match the ${computedProfile.explanationStyle} approach with appropriate detail level and terminology.`;
    
    instructions += `\n\n4. OUTPUT FORMAT: Provide JSON response with personalized explanations and context-appropriate recommendations.`;
    
    return instructions;
  }

  /**
   * Get demographic-specific adaptations
   * 
   * @private
   * @param {Object} demographics - User demographic information
   * @param {Object} contextualFactors - User contextual factors
   * @param {Object} templates - Prompt templates
   * @returns {Object|null} Demographic adaptation configuration
   */
  getDemographicAdaptation(demographics, contextualFactors, templates) {
    const { demographicAdaptations } = templates;
    
    // Check age-based adaptations
    if (demographics.ageRange === 'under_18') {
      return demographicAdaptations.under_18;
    }
    
    if (demographics.ageRange === 'over_55') {
      return demographicAdaptations.over_55;
    }
    
    // Check special circumstances
    const specialCircumstances = contextualFactors.specialCircumstances || [];
    
    if (specialCircumstances.includes('non_native_speaker')) {
      return demographicAdaptations.non_native_speaker;
    }
    
    if (specialCircumstances.includes('elderly_or_vulnerable')) {
      return demographicAdaptations.vulnerable_circumstances;
    }
    
    return null;
  }

  /**
   * Call Gemini with personalized prompt and handle response
   * 
   * @private
   * @param {string} personalizedPrompt - Complete personalized prompt
   * @returns {Promise<Object>} AI analysis response
   */
  async callGeminiWithPersonalizedPrompt(personalizedPrompt) {
    try {
      // Use parent class method with personalized prompt
      const result = await this.callGeminiWithRetry(personalizedPrompt);
      return this.parseAnalysisResponse(result);
      
    } catch (error) {
      logger.error('Personalized Gemini call failed:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Post-process analysis result with personalization enhancements
   * 
   * @private
   * @param {Object} analysisResult - Raw AI analysis result
   * @param {Object} userProfile - User personalization profile
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Enhanced personalized analysis result
   */
  async personalizeAnalysisResult(analysisResult, userProfile, options) {
    const { computedProfile, demographics, contextualFactors } = userProfile;
    
    // Apply personalized risk threshold adjustments
    const adjustedResult = this.applyPersonalizedThresholds(analysisResult, computedProfile);
    
    // Enhance explanations with personalized context
    adjustedResult.personalizedExplanations = this.generatePersonalizedExplanations(
      analysisResult,
      userProfile
    );
    
    // Add personalized recommendations
    adjustedResult.personalizedRecommendations = this.generatePersonalizedRecommendations(
      analysisResult,
      userProfile
    );
    
    // Add profile-specific metadata
    adjustedResult.personalizationMetadata = {
      userId: userProfile.userId,
      explanationStyle: computedProfile.explanationStyle,
      riskToleranceProfile: computedProfile.riskTolerance,
      alertThresholds: computedProfile.alertThresholds,
      profileTags: computedProfile.profileTags,
      analysisPersonalized: true,
      personalizationVersion: computedProfile.computationVersion
    };
    
    return adjustedResult;
  }

  /**
   * Apply personalized risk thresholds to analysis result
   * 
   * @private
   * @param {Object} analysisResult - Original analysis result
   * @param {Object} computedProfile - User's computed profile
   * @returns {Object} Analysis result with adjusted thresholds
   */
  applyPersonalizedThresholds(analysisResult, computedProfile) {
    const adjusted = { ...analysisResult };
    const thresholds = computedProfile.alertThresholds;
    
    // Adjust overall risk level based on personalized thresholds
    if (adjusted.risk_score > thresholds.overall) {
      // Risk exceeds user's threshold - may need to escalate warning level
      if (adjusted.risk_level === 'medium' && adjusted.risk_score > thresholds.overall + 1) {
        adjusted.risk_level = 'high';
        adjusted.personalizedEscalation = true;
      }
    } else if (adjusted.risk_score < thresholds.overall - 2) {
      // Risk is well below threshold - may reduce alert urgency
      if (adjusted.risk_level === 'medium') {
        adjusted.risk_level = 'low';
        adjusted.personalizedReduction = true;
      }
    }
    
    // Apply category-specific threshold adjustments
    Object.keys(adjusted.categories).forEach(category => {
      const categoryData = adjusted.categories[category];
      const threshold = thresholds[category] || thresholds.overall;
      
      if (categoryData.score > threshold) {
        categoryData.personalizedAlert = true;
        categoryData.exceedsUserThreshold = categoryData.score - threshold;
      }
    });
    
    return adjusted;
  }

  /**
   * Generate personalized explanations based on user profile
   * 
   * @private
   * @param {Object} analysisResult - Analysis result
   * @param {Object} userProfile - User profile
   * @returns {Object} Personalized explanations
   */
  generatePersonalizedExplanations(analysisResult, userProfile) {
    const { computedProfile, demographics } = userProfile;
    const style = computedProfile.explanationStyle;
    
    const explanations = {
      riskSummary: this.personalizeRiskSummary(analysisResult, userProfile),
      categoryExplanations: this.personalizeCategoryExplanations(analysisResult, userProfile),
      contextualInsights: this.generateContextualInsights(analysisResult, userProfile)
    };
    
    return explanations;
  }

  /**
   * Personalize risk summary based on user characteristics
   * 
   * @private
   * @param {Object} analysisResult - Analysis result
   * @param {Object} userProfile - User profile
   * @returns {string} Personalized risk summary
   */
  personalizeRiskSummary(analysisResult, userProfile) {
    const { demographics, computedProfile } = userProfile;
    const occupation = demographics.occupation;
    const style = computedProfile.explanationStyle;
    
    let summary = analysisResult.summary;
    
    // Add occupation-specific context
    if (occupation === 'healthcare' && analysisResult.categories.privacy.score > 6) {
      summary += " As a healthcare professional, pay special attention to patient data protection requirements and HIPAA compliance implications.";
    } else if (occupation === 'student' && analysisResult.categories.payment.score > 5) {
      summary += " As a student, be particularly cautious about payment terms and potential recurring charges that could impact your budget.";
    } else if (occupation === 'technology' && analysisResult.categories.privacy.score > 6) {
      summary += " As a technology professional, you should review the data collection and sharing policies carefully.";
    } else if (occupation === 'business_owner' && analysisResult.categories.liability.score > 6) {
      summary += " As a business owner, consider how these liability terms could affect your business operations and potential exposure.";
    }
    
    // Add style-specific guidance
    if (style === 'simple_protective') {
      summary = summary.replace(/\b(concerning|problematic)\b/gi, 'potentially harmful');
      summary += " We recommend careful consideration before accepting these terms.";
    }
    
    return summary;
  }

  /**
   * Generate personalized category explanations
   * 
   * @private
   * @param {Object} analysisResult - Analysis result
   * @param {Object} userProfile - User profile
   * @returns {Object} Personalized category explanations
   */
  personalizeCategoryExplanations(analysisResult, userProfile) {
    const explanations = {};
    const { riskPreferences, computedProfile } = userProfile;
    
    Object.keys(analysisResult.categories).forEach(category => {
      const categoryData = analysisResult.categories[category];
      let explanation = `${category.charAt(0).toUpperCase() + category.slice(1)} Score: ${categoryData.score}/10`;
      
      // Add personalized context based on user priorities
      if (category === 'privacy' && riskPreferences.privacy.overallImportance === 'extremely_important') {
        if (categoryData.score > computedProfile.alertThresholds.privacy) {
          explanation += " ⚠️ This exceeds your strict privacy protection threshold.";
        }
      }
      
      if (category === 'payment' && riskPreferences.financial.feeImpact === 'significant') {
        if (categoryData.score > 4) {
          explanation += " 💰 Given your budget sensitivity, these payment terms need careful review.";
        }
      }
      
      explanations[category] = explanation;
    });
    
    return explanations;
  }

  /**
   * Generate contextual insights based on user profile
   * 
   * @private
   * @param {Object} analysisResult - Analysis result
   * @param {Object} userProfile - User profile
   * @returns {Array} Contextual insights
   */
  generateContextualInsights(analysisResult, userProfile) {
    const insights = [];
    const { demographics, riskPreferences, contextualFactors } = userProfile;
    
    // Jurisdiction-specific insights
    if (demographics.jurisdiction.primaryCountry === 'US' && demographics.jurisdiction.primaryState === 'CA') {
      insights.push("California residents have additional privacy rights under CCPA that may override some of these terms.");
    }
    
    // Dependent status considerations
    if (contextualFactors.dependentStatus === 'children_dependents') {
      insights.push("As someone making decisions that affect children, consider how these terms might impact family privacy and safety.");
    }
    
    // Experience level insights
    if (riskPreferences.legal.legalKnowledge.contractLaw === 'none') {
      insights.push("Consider consulting with someone who has legal knowledge for important service agreements.");
    }
    
    return insights;
  }

  /**
   * Generate personalized recommendations
   * 
   * @private
   * @param {Object} analysisResult - Analysis result
   * @param {Object} userProfile - User profile
   * @returns {Array} Personalized recommendations
   */
  generatePersonalizedRecommendations(analysisResult, userProfile) {
    const recommendations = [];
    const { demographics, riskPreferences, computedProfile } = userProfile;
    
    // Risk-level based recommendations
    if (analysisResult.risk_score > computedProfile.alertThresholds.overall) {
      if (demographics.occupation === 'student') {
        recommendations.push({
          type: 'alternative',
          message: 'Consider looking for student-friendly alternatives with better terms',
          priority: 'high'
        });
      } else if (riskPreferences.privacy.overallImportance === 'extremely_important' || riskPreferences.privacy.overallImportance === 'very_important') {
        recommendations.push({
          type: 'privacy_review',
          message: 'These privacy terms conflict with your stated privacy priorities - careful review recommended',
          priority: 'high'
        });
      }
    }
    
    // Category-specific recommendations
    Object.keys(analysisResult.categories).forEach(category => {
      const categoryData = analysisResult.categories[category];
      const threshold = computedProfile.alertThresholds[category] || computedProfile.alertThresholds.overall;
      
      if (categoryData.score > threshold) {
        recommendations.push({
          type: `${category}_concern`,
          message: `${category.charAt(0).toUpperCase() + category.slice(1)} terms exceed your comfort level - review recommended`,
          priority: categoryData.score > threshold + 2 ? 'high' : 'medium'
        });
      }
    });
    
    return recommendations;
  }
}

module.exports = GeminiPersonalizationService;