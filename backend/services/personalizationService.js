/**
 * Personalization Service for Going Bananas T&C Analyzer
 * 
 * This service handles user personalization profile management, quiz processing,
 * risk tolerance calculation, and profile-based analysis customization.
 * 
 * The service computes personalized risk thresholds, explanation styles, and
 * alert preferences based on comprehensive user profiling data collected
 * through the personalization quiz.
 * 
 * @fileoverview Core personalization logic and profile management
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const { userPersonalizationSchema, quizUpdateSchema } = require('../schemas/personalizationSchemas');
const mongoose = require('mongoose');
const UserProfile = require('../models/userProfile');

class PersonalizationService {
  constructor() {
    this.computationWeights = this.initializeComputationWeights();
    this.profiles = new Map(); // In-memory storage for testing
    // if (process.env.NODE_ENV !== 'test') {
    //   this.connectDB();
    // }
  }

  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error('MongoDB connection failed:', error.message);
    }
  }

  /**
   * Initialize weights and factors used in profile computation
   * These weights determine how different user characteristics affect risk tolerance
   * and alert thresholds.
   * 
   * @private
   * @returns {Object} Computation weights configuration
   */
  initializeComputationWeights() {
    return {
      // Age-based risk tolerance adjustments
      ageFactors: {
        'under_18': { protection: 1.3, explanation: 'simple', cautiousness: 0.7 },
        '18_25': { protection: 1.1, explanation: 'balanced', cautiousness: 0.9 },
        '26_40': { protection: 1.0, explanation: 'balanced', cautiousness: 1.0 },
        '41_55': { protection: 0.9, explanation: 'detailed', cautiousness: 1.1 },
        'over_55': { protection: 1.2, explanation: 'simple', cautiousness: 0.8 },
        'prefer_not_to_say': { protection: 1.0, explanation: 'balanced', cautiousness: 1.0 }
      },

      // Occupation-based sophistication and risk awareness
      occupationFactors: {
        'legal_compliance': { sophistication: 1.8, riskAwareness: 1.6, explanation: 'technical' },
        'healthcare': { sophistication: 1.4, riskAwareness: 1.5, explanation: 'detailed' },
        'financial_services': { sophistication: 1.5, riskAwareness: 1.4, explanation: 'detailed' },
        'technology': { sophistication: 1.6, riskAwareness: 1.3, explanation: 'technical' },
        'education': { sophistication: 1.2, riskAwareness: 1.1, explanation: 'balanced' },
        'creative_freelancer': { sophistication: 1.0, riskAwareness: 1.2, explanation: 'balanced' },
        'student': { sophistication: 0.8, riskAwareness: 0.9, explanation: 'simple' },
        'retired': { sophistication: 0.9, riskAwareness: 1.3, explanation: 'simple' },
        'business_owner': { sophistication: 1.3, riskAwareness: 1.4, explanation: 'detailed' },
        'government': { sophistication: 1.4, riskAwareness: 1.5, explanation: 'detailed' },
        'nonprofit': { sophistication: 1.1, riskAwareness: 1.2, explanation: 'balanced' },
        'other': { sophistication: 1.0, riskAwareness: 1.0, explanation: 'balanced' },
        'prefer_not_to_say': { sophistication: 1.0, riskAwareness: 1.0, explanation: 'balanced' }
      },

      // Financial situation impact on risk tolerance
      financialFactors: {
        'student_limited': { paymentSensitivity: 1.5, riskTolerance: 0.7 },
        'stable_employment': { paymentSensitivity: 1.0, riskTolerance: 1.0 },
        'high_income': { paymentSensitivity: 0.7, riskTolerance: 1.3 },
        'business_owner': { paymentSensitivity: 0.9, riskTolerance: 1.1 },
        'retired_fixed': { paymentSensitivity: 1.4, riskTolerance: 0.8 },
        'prefer_not_to_say': { paymentSensitivity: 1.0, riskTolerance: 1.0 }
      },

      // Privacy importance scaling factors
      privacyImportanceFactors: {
        'extremely_important': { privacyThreshold: 0.3, alertSensitivity: 1.5 },
        'very_important': { privacyThreshold: 0.5, alertSensitivity: 1.2 },
        'moderately_important': { privacyThreshold: 0.7, alertSensitivity: 1.0 },
        'not_very_important': { privacyThreshold: 0.9, alertSensitivity: 0.7 }
      }
    };
  }

  /**
   * Save a complete user personalization profile
   * Validates the profile data and computes derived parameters
   * 
   * @param {Object} profileData - Complete user personalization data
   * @returns {Promise<Object>} Saved profile with computed parameters
   * @throws {Error} If validation fails or computation errors occur
   */
  async saveUserProfile(profileData) {
    try {
      // Validate the complete profile data
      const { error, value: validatedProfile } = userPersonalizationSchema.validate(profileData);
      if (error) {
        logger.error('Profile validation failed:', {
          error: error.details,
          userId: profileData.userId
        });
        throw new Error(`Profile validation failed: ${error.details.map(d => d.message).join(', ')}`);
      }

      // Compute derived profile parameters
      const computedProfile = await this.computeProfileParameters(validatedProfile);

      // Merge computed parameters with validated profile
      const completeProfile = {
        ...validatedProfile,
        computedProfile: computedProfile,
        lastUpdated: new Date().toISOString()
      };

      let savedProfile;

      // Store the profile based on environment
      if (process.env.NODE_ENV === 'test') {
        // Use in-memory storage for testing
        savedProfile = { ...completeProfile };
        this.profiles.set(completeProfile.userId, savedProfile);
      } else {
        // Use MongoDB for production
        savedProfile = await UserProfile.create(completeProfile);
      }

      logger.info('User profile saved successfully:', {
        userId: savedProfile.userId,
        profileTags: computedProfile.profileTags,
        riskTolerance: computedProfile.riskTolerance
      });

      return savedProfile;

    } catch (error) {
      logger.error('Failed to save user profile:', {
        error: error.message,
        userId: profileData.userId
      });
      throw error;
    }
  }

  /**
   * Update a specific section of user profile
   * Allows partial updates without requiring complete profile re-submission
   * 
   * @param {Object} updateData - Partial update data with section specification
   * @returns {Promise<Object>} Updated profile with recomputed parameters
   * @throws {Error} If validation fails or user not found
   */
  async updateProfileSection(updateData) {
    try {
      // Validate update request
      const { error, value: validatedUpdate } = quizUpdateSchema.validate(updateData);
      if (error) {
        throw new Error(`Update validation failed: ${error.details.map(d => d.message).join(', ')}`);
      }

      const { userId, section, data, recomputeProfile } = validatedUpdate;

      // Retrieve existing profile
      const existingProfile = await UserProfile.findOne({ userId: userId });
      if (!existingProfile) {
        throw new Error(`User profile not found: ${userId}`);
      }

      // Update the specified section
      existingProfile[section] = { ...existingProfile[section], ...data };
      existingProfile.lastUpdated = new Date().toISOString();

      // Recompute derived parameters if requested
      if (recomputeProfile) {
        existingProfile.computedProfile = await this.computeProfileParameters(existingProfile);
      }

      // Save updated profile
      const updatedProfile = await existingProfile.save();

      logger.info('Profile section updated:', {
        userId: userId,
        section: section,
        recomputed: recomputeProfile
      });

      return updatedProfile;

    } catch (error) {
      logger.error('Failed to update profile section:', {
        error: error.message,
        userId: updateData.userId,
        section: updateData.section
      });
      throw error;
    }
  }

  /**
   * Retrieve user profile with computed parameters
   * Returns cached computed profile for performance if available
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object|null>} User profile or null if not found
   */
  async getUserProfile(userId) {
    try {
      let profile;

      if (process.env.NODE_ENV === 'test') {
        // Use in-memory storage for testing
        profile = this.profiles.get(userId);
      } else {
        // Use MongoDB for production
        profile = await UserProfile.findOne({ userId: userId });
      }

      if (!profile) {
        logger.warn('Profile not found for user:', { userId });
        return null;
      }
      return profile;
    } catch (error) {
      logger.error('Failed to retrieve user profile:', {
        error: error.message,
        userId: userId
      });
      throw error;
    }
  }

  /**
   * Compute derived profile parameters from user personalization data
   * This is the core algorithm that transforms user responses into actionable
   * risk thresholds, explanation styles, and profile tags for analysis customization
   * 
   * @private
   * @param {Object} profile - Validated user personalization profile
   * @returns {Promise<Object>} Computed profile parameters
   */
  async computeProfileParameters(profile) {
    try {
      const weights = this.computationWeights;
      
      // Extract key profile components
      const { demographics, digitalBehavior, riskPreferences, contextualFactors } = profile;
      
      // Compute base risk tolerance scores (0-10 scale)
      const riskTolerance = await this.computeRiskTolerance(profile, weights);
      
      // Compute alert thresholds based on risk tolerance and preferences
      const alertThresholds = await this.computeAlertThresholds(profile, riskTolerance, weights);
      
      // Determine optimal explanation style
      const explanationStyle = await this.computeExplanationStyle(profile, weights);
      
      // Generate profile tags for prompt customization
      const profileTags = await this.generateProfileTags(profile, weights);

      return {
        riskTolerance,
        alertThresholds,
        explanationStyle,
        profileTags,
        computedAt: new Date().toISOString(),
        computationVersion: '1.0'
      };

    } catch (error) {
      logger.error('Failed to compute profile parameters:', {
        error: error.message,
        userId: profile.userId
      });
      throw error;
    }
  }

  /**
   * Compute user's risk tolerance across different categories
   * Higher scores indicate higher risk tolerance (less protective)
   * 
   * @private
   * @param {Object} profile - User profile data
   * @param {Object} weights - Computation weights
   * @returns {Promise<Object>} Risk tolerance scores by category
   */
  async computeRiskTolerance(profile, weights) {
    const { demographics, riskPreferences, contextualFactors } = profile;
    
    // Base risk tolerance from explicit preferences
    const basePrivacy = this.mapPrivacyImportanceToTolerance(riskPreferences.privacy.overallImportance);
    const baseFinancial = this.mapFinancialApproachToTolerance(riskPreferences.financial.paymentApproach);
    const baseLegal = this.mapLegalComfortToTolerance(riskPreferences.legal.arbitrationComfort);
    
    // Apply demographic adjustments
    const ageAdjustment = weights.ageFactors[demographics.ageRange].cautiousness || 1.0;
    const occupationAdjustment = weights.occupationFactors[demographics.occupation].riskAwareness || 1.0;
    const financialAdjustment = weights.financialFactors[riskPreferences.financial.financialSituation].riskTolerance || 1.0;
    
    // Apply contextual adjustments for dependents and special circumstances
    const dependentAdjustment = this.computeDependentAdjustment(contextualFactors.dependentStatus);
    const specialCircumstanceAdjustment = this.computeSpecialCircumstanceAdjustment(contextualFactors.specialCircumstances || []);
    
    // Compute final risk tolerance scores
    const privacy = Math.max(0, Math.min(10, 
      basePrivacy * ageAdjustment * dependentAdjustment * specialCircumstanceAdjustment
    ));
    
    const financial = Math.max(0, Math.min(10,
      baseFinancial * financialAdjustment * ageAdjustment * dependentAdjustment
    ));
    
    const legal = Math.max(0, Math.min(10,
      baseLegal * occupationAdjustment * ageAdjustment * dependentAdjustment
    ));
    
    const overall = (privacy + financial + legal) / 3;
    
    return {
      privacy: Math.round(privacy * 10) / 10,
      financial: Math.round(financial * 10) / 10,
      legal: Math.round(legal * 10) / 10,
      overall: Math.round(overall * 10) / 10
    };
  }

  /**
   * Compute alert thresholds based on risk tolerance and user preferences
   * Lower thresholds mean more alerts (more protective)
   * 
   * @private
   * @param {Object} profile - User profile data
   * @param {Object} riskTolerance - Computed risk tolerance scores
   * @param {Object} weights - Computation weights
   * @returns {Promise<Object>} Alert threshold levels by category
   */
  async computeAlertThresholds(profile, riskTolerance, weights) {
    const { contextualFactors } = profile;
    
    // Base thresholds are inverse of risk tolerance
    // High risk tolerance = high threshold = fewer alerts
    const basePrivacyThreshold = 10 - riskTolerance.privacy;
    const baseLiabilityThreshold = 10 - riskTolerance.legal;
    const baseTerminationThreshold = 7.0; // Standard baseline for termination concerns
    const basePaymentThreshold = 10 - riskTolerance.financial;
    
    // Apply alert preference adjustments
    const alertPreferenceAdjustment = this.computeAlertPreferenceAdjustment(
      contextualFactors.alertPreferences.interruptionTiming
    );
    
    // Apply frequency limit considerations
    const frequencyAdjustment = Math.min(1.2, contextualFactors.alertPreferences.alertFrequencyLimit / 20);
    
    return {
      privacy: Math.max(1, Math.min(10, basePrivacyThreshold * alertPreferenceAdjustment * frequencyAdjustment)),
      liability: Math.max(1, Math.min(10, baseLiabilityThreshold * alertPreferenceAdjustment * frequencyAdjustment)),
      termination: Math.max(1, Math.min(10, baseTerminationThreshold * alertPreferenceAdjustment * frequencyAdjustment)),
      payment: Math.max(1, Math.min(10, basePaymentThreshold * alertPreferenceAdjustment * frequencyAdjustment)),
      overall: Math.max(1, Math.min(10, (10 - riskTolerance.overall) * alertPreferenceAdjustment * frequencyAdjustment))
    };
  }

  /**
   * Determine optimal explanation style based on user characteristics
   * 
   * @private
   * @param {Object} profile - User profile data
   * @param {Object} weights - Computation weights
   * @returns {Promise<string>} Explanation style identifier
   */
  async computeExplanationStyle(profile, weights) {
    const { demographics, digitalBehavior, contextualFactors } = profile;
    
    // Get base preference from user selection
    const preferredStyle = digitalBehavior.techSophistication.preferredExplanationStyle;
    
    // Get occupation-based recommendation
    const occupationRecommendation = weights.occupationFactors[demographics.occupation].explanation;
    
    // Get age-based recommendation
    const ageRecommendation = weights.ageFactors[demographics.ageRange].explanation;
    
    // Check for special circumstances requiring specific styles
    const specialCircumstances = contextualFactors.specialCircumstances || [];
    const needsSimpleLanguage = specialCircumstances.includes('non_native_speaker') || 
                               specialCircumstances.includes('elderly_or_vulnerable');
    
    const needsTechnicalDetail = specialCircumstances.includes('handles_sensitive_data') ||
                                specialCircumstances.includes('regulated_industry');
    
    // Determine final style with priority order:
    // 1. Special circumstances override
    // 2. User preference (if reasonable for their context)
    // 3. Occupation-based recommendation
    // 4. Age-based recommendation
    
    if (needsSimpleLanguage) {
      return 'simple_protective';
    }
    
    if (needsTechnicalDetail) {
      return 'technical_efficient';
    }
    
    // Map user preference to computed style categories
    const styleMapping = {
      'simple_language': 'simple_protective',
      'balanced_technical': 'balanced_educational',
      'technical_detailed': 'technical_efficient',
      'bullet_summaries': 'technical_efficient',
      'comprehensive_analysis': 'comprehensive_cautious'
    };
    
    return styleMapping[preferredStyle] || 'balanced_educational';
  }

  /**
   * Generate profile tags for AI prompt customization
   * These tags are used to customize Gemini prompts for personalized analysis
   * 
   * @private
   * @param {Object} profile - User profile data
   * @param {Object} weights - Computation weights
   * @returns {Promise<Array<string>]} Profile tags for prompt customization
   */
  async generateProfileTags(profile, weights) {
    const tags = [];
    const { demographics, digitalBehavior, riskPreferences, contextualFactors } = profile;
    
    // Demographic tags
    tags.push(`age_${demographics.ageRange}`);
    tags.push(`occupation_${demographics.occupation}`);
    tags.push(`jurisdiction_${demographics.jurisdiction.primaryCountry}`);
    
    // Experience and sophistication tags
    const techLevel = digitalBehavior.techSophistication.comfortLevel;
    tags.push(`tech_${techLevel}`);
    
    const readingHabit = digitalBehavior.techSophistication.readingFrequency;
    tags.push(`reading_${readingHabit}`);
    
    // Risk preference tags
    const privacyImportance = riskPreferences.privacy.overallImportance;
    tags.push(`privacy_${privacyImportance}`);
    
    const paymentApproach = riskPreferences.financial.paymentApproach;
    tags.push(`payment_${paymentApproach}`);
    
    const arbitrationComfort = riskPreferences.legal.arbitrationComfort;
    tags.push(`arbitration_${arbitrationComfort}`);
    
    // Usage pattern tags
    const primaryActivities = digitalBehavior.usagePatterns.primaryActivities;
    primaryActivities.forEach(activity => tags.push(`usage_${activity}`));
    
    // Contextual tags
    tags.push(`dependents_${contextualFactors.dependentStatus}`);
    
    const specialCircumstances = contextualFactors.specialCircumstances || [];
    specialCircumstances.forEach(circumstance => tags.push(`special_${circumstance}`));
    
    // Financial situation tag
    const financialSituation = riskPreferences.financial.financialSituation;
    tags.push(`financial_${financialSituation}`);
    
    // Alert preference tags
    const interruptionTiming = contextualFactors.alertPreferences.interruptionTiming;
    tags.push(`alerts_${interruptionTiming}`);
    
    return tags;
  }

  /**
   * Helper method to map privacy importance to risk tolerance scale
   * @private
   */
  mapPrivacyImportanceToTolerance(importance) {
    const mapping = {
      'extremely_important': 2.0,
      'very_important': 4.0,
      'moderately_important': 6.0,
      'not_very_important': 8.0
    };
    return mapping[importance] || 6.0;
  }

  /**
   * Helper method to map financial approach to risk tolerance scale
   * @private
   */
  mapFinancialApproachToTolerance(approach) {
    const mapping = {
      'very_cautious': 2.0,
      'cautious': 4.0,
      'moderate': 6.0,
      'relaxed': 8.0
    };
    return mapping[approach] || 6.0;
  }

  /**
   * Helper method to map legal comfort to risk tolerance scale
   * @private
   */
  mapLegalComfortToTolerance(comfort) {
    const mapping = {
      'strongly_prefer_courts': 2.0,
      'prefer_courts': 4.0,
      'neutral': 6.0,
      'acceptable': 8.0
    };
    return mapping[comfort] || 6.0;
  }

  /**
   * Compute adjustment factor based on dependent status
   * @private
   */
  computeDependentAdjustment(dependentStatus) {
    const adjustments = {
      'just_myself': 1.0,
      'spouse_partner': 0.9,
      'children_dependents': 0.7,
      'employees_team': 0.8,
      'clients_customers': 0.6
    };
    return adjustments[dependentStatus] || 1.0;
  }

  /**
   * Compute adjustment factor for special circumstances
   * @private
   */
  computeSpecialCircumstanceAdjustment(circumstances) {
    let adjustment = 1.0;
    
    circumstances.forEach(circumstance => {
      switch (circumstance) {
        case 'elderly_or_vulnerable':
          adjustment *= 0.7;
          break;
        case 'handles_sensitive_data':
          adjustment *= 0.8;
          break;
        case 'regulated_industry':
          adjustment *= 0.8;
          break;
        case 'small_business_owner':
          adjustment *= 0.9;
          break;
        default:
          // No adjustment for other circumstances
          break;
      }
    });
    
    return Math.max(0.5, adjustment); // Minimum threshold
  }

  /**
   * Compute alert preference adjustment factor
   * @private
   */
  computeAlertPreferenceAdjustment(interruptionTiming) {
    const adjustments = {
      'only_severe': 1.5,      // Higher threshold, fewer alerts
      'moderate_and_high': 1.2,
      'any_concerning': 0.8,   // Lower threshold, more alerts
      'only_when_committing': 1.3
    };
    return adjustments[interruptionTiming] || 1.0;
  }

  /**
   * Generate personalization insights for user dashboard
   * Provides human-readable summary of user's computed profile
   * 
   * @param {string} userId - User identifier
   * @returns {Promise<Object>} Personalization insights and recommendations
   */
  async getPersonalizationInsights(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const { computedProfile, demographics, riskPreferences } = profile;
      
      return {
        riskProfileSummary: this.generateRiskProfileSummary(computedProfile.riskTolerance),
        alertConfiguration: this.generateAlertConfigurationSummary(computedProfile.alertThresholds),
        explanationStyle: this.generateExplanationStyleSummary(computedProfile.explanationStyle),
        recommendations: this.generatePersonalizationRecommendations(profile),
        profileStrengths: this.identifyProfileStrengths(profile),
        improvementSuggestions: this.generateImprovementSuggestions(profile)
      };

    } catch (error) {
      logger.error('Failed to generate personalization insights:', {
        error: error.message,
        userId: userId
      });
      throw error;
    }
  }

  /**
   * Generate human-readable risk profile summary
   * @private
   */
  generateRiskProfileSummary(riskTolerance) {
    const privacy = riskTolerance.privacy <= 3 ? 'Low' : riskTolerance.privacy <= 7 ? 'Moderate' : 'High';
    const financial = riskTolerance.financial <= 3 ? 'Low' : riskTolerance.financial <= 7 ? 'Moderate' : 'High';
    const legal = riskTolerance.legal <= 3 ? 'Low' : riskTolerance.legal <= 7 ? 'Moderate' : 'High';
    
    return {
      privacy: { level: privacy, score: riskTolerance.privacy },
      financial: { level: financial, score: riskTolerance.financial },
      legal: { level: legal, score: riskTolerance.legal },
      overall: { level: riskTolerance.overall <= 3 ? 'Conservative' : riskTolerance.overall <= 7 ? 'Balanced' : 'Risk-Tolerant', score: riskTolerance.overall }
    };
  }

  /**
   * Generate alert configuration summary
   * @private
   */
  generateAlertConfigurationSummary(alertThresholds) {
    const getAlertLevel = (threshold) => {
      if (threshold <= 3) return 'High Sensitivity';
      if (threshold <= 6) return 'Moderate Sensitivity';
      return 'Low Sensitivity';
    };

    return {
      privacy: getAlertLevel(alertThresholds.privacy),
      liability: getAlertLevel(alertThresholds.liability),
      termination: getAlertLevel(alertThresholds.termination),
      payment: getAlertLevel(alertThresholds.payment),
      overall: getAlertLevel(alertThresholds.overall)
    };
  }

  /**
   * Generate explanation style summary
   * @private
   */
  generateExplanationStyleSummary(explanationStyle) {
    const descriptions = {
      'simple_protective': 'Simple language with protective guidance',
      'balanced_educational': 'Balanced approach with educational content',
      'technical_efficient': 'Technical details for efficient review',
      'comprehensive_cautious': 'Comprehensive analysis with cautious approach'
    };
    
    return {
      style: explanationStyle,
      description: descriptions[explanationStyle] || 'Balanced approach'
    };
  }

  /**
   * Generate personalization recommendations
   * @private
   */
  generatePersonalizationRecommendations(profile) {
    const recommendations = [];
    const { computedProfile, riskPreferences, contextualFactors } = profile;
    
    // Check for potential improvements
    if (computedProfile.riskTolerance.privacy < 3 && riskPreferences.privacy.overallImportance !== 'extremely_important') {
      recommendations.push({
        type: 'threshold_adjustment',
        message: 'Consider adjusting privacy settings for more relevant alerts'
      });
    }
    
    if (contextualFactors.alertPreferences.alertFrequencyLimit > 20) {
      recommendations.push({
        type: 'alert_frequency',
        message: 'High alert frequency limit may cause important warnings to be missed'
      });
    }
    
    return recommendations;
  }

  /**
   * Identify profile strengths
   * @private
   */
  identifyProfileStrengths(profile) {
    const strengths = [];
    const { digitalBehavior, riskPreferences } = profile;
    
    if (digitalBehavior.techSophistication.readingFrequency !== 'never') {
      strengths.push('Actively reviews terms and conditions');
    }
    
    if (riskPreferences.privacy.overallImportance === 'extremely_important' || riskPreferences.privacy.overallImportance === 'very_important') {
      strengths.push('Strong privacy awareness');
    }
    
    return strengths;
  }

  /**
   * Generate improvement suggestions
   * @private
   */
  generateImprovementSuggestions(profile) {
    const suggestions = [];
    const { digitalBehavior, riskPreferences } = profile;
    
    if (digitalBehavior.techSophistication.readingFrequency === 'never') {
      suggestions.push({
        area: 'engagement',
        suggestion: 'Consider reviewing key sections of important terms and conditions'
      });
    }
    
    if (riskPreferences.legal.legalKnowledge.contractLaw === 'none') {
      suggestions.push({
        area: 'education',
        suggestion: 'Learn about basic contract law and consumer rights'
      });
    }
    
    return suggestions;
  }

  async deleteUserProfile(userId) {
    try {
      let result;

      if (process.env.NODE_ENV === 'test') {
        // Use in-memory storage for testing
        result = this.profiles.delete(userId);
        if (!result) {
          logger.warn('Profile not found for deletion:', { userId });
          return false;
        }
      } else {
        // Use MongoDB for production
        result = await UserProfile.deleteOne({ userId: userId });
        if (result.deletedCount === 0) {
          logger.warn('Profile not found for deletion:', { userId });
          return false;
        }
      }

      logger.info('User profile deleted successfully:', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete user profile:', {
        error: error.message,
        userId: userId
      });
      throw error;
    }
  }
}

module.exports = PersonalizationService;