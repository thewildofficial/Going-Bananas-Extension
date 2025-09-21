/**
 * Personalization Quiz Schemas for Going Bananas T&C Analyzer
 * 
 * This file defines comprehensive Joi validation schemas for user personalization
 * data collection, enabling highly customized risk analysis based on user demographics,
 * preferences, risk tolerance, and usage patterns.
 * 
 * @fileoverview Validation schemas for user personalization and quiz responses
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const Joi = require('joi');

/**
 * Age range categories that affect legal protections and risk interpretation
 * - Under 18: Special minor protections apply
 * - 18-25: Digital natives, potentially less risk-aware
 * - 26-40: Peak earning/spending, family considerations
 * - 41-55: Established careers, higher stakes decisions
 * - 55+: May need clearer explanations, different risk tolerance
 */
const ageRangeSchema = Joi.string().valid(
  'under_18',
  '18_25',
  '26_40', 
  '41_55',
  'over_55',
  'prefer_not_to_say'
).required().description('User age range for risk assessment calibration');

/**
 * Jurisdiction information for applying relevant legal frameworks
 * Used to determine applicable privacy laws (GDPR, CCPA, etc.)
 */
const jurisdictionSchema = Joi.object({
  primaryCountry: Joi.string().length(2).uppercase().required()
    .description('ISO 3166-1 alpha-2 country code'),
  primaryState: Joi.string().optional()
    .description('State/province code for countries with regional laws'),
  frequentTravel: Joi.boolean().required()
    .description('Whether user frequently travels internationally'),
  isExpatriate: Joi.boolean().required()
    .description('Whether user is living outside their home country'),
  multipleJurisdictions: Joi.array().items(Joi.string().length(2).uppercase()).optional()
    .description('Additional jurisdictions user may be subject to')
}).required().description('User location and jurisdiction information');

/**
 * Professional context that affects risk sensitivity and legal understanding
 * Different occupations have different risk awareness and tolerance levels
 */
const occupationSchema = Joi.string().valid(
  'legal_compliance',      // High sophistication, liability-focused
  'healthcare',           // HIPAA awareness, privacy-sensitive
  'financial_services',   // Liability-conscious, regulatory aware
  'technology',          // Privacy-aware, terms-savvy
  'education',           // Moderate sophistication
  'creative_freelancer', // IP and platform dependency concerns
  'student',             // Limited resources, learning mode
  'retired',             // Fixed income, scam-conscious
  'business_owner',      // Liability and employee considerations
  'government',          // Security and compliance focused
  'nonprofit',           // Resource-conscious, mission-focused
  'other',               // General category
  'prefer_not_to_say'    // Privacy option
).required().description('Professional category affecting risk interpretation');

/**
 * Technology sophistication level for explanation customization
 * Determines depth and technical complexity of risk explanations
 */
const techSophisticationSchema = Joi.object({
  readingFrequency: Joi.string().valid(
    'never',              // Skip reading entirely
    'skim_occasionally',  // Brief overview only
    'read_important',     // Focus on key sections
    'read_thoroughly'     // Comprehensive review
  ).required(),
  
  comfortLevel: Joi.string().valid(
    'beginner',    // Need simple explanations
    'intermediate', // Standard detail level
    'advanced',    // Technical details appreciated
    'expert'       // Concise, technical analysis
  ).required(),
  
  preferredExplanationStyle: Joi.string().valid(
    'simple_language',        // Non-technical, everyday language
    'balanced_technical',     // Mix of technical and plain English
    'technical_detailed',     // Technical details with legal context
    'bullet_summaries',       // Quick bullet points
    'comprehensive_analysis'  // Detailed analysis with examples
  ).required()
}).required().description('Technology sophistication and explanation preferences');

/**
 * Primary internet usage patterns affecting risk priorities
 * Different usage patterns expose users to different types of risks
 */
const usagePatternSchema = Joi.object({
  primaryActivities: Joi.array().items(
    Joi.string().valid(
      'social_media',         // Privacy and content risks
      'work_productivity',    // Business and liability risks
      'shopping_financial',   // Payment and fraud risks
      'research_learning',    // Information and privacy risks
      'creative_content',     // IP and platform risks
      'gaming',              // Payment and virtual asset risks
      'dating_relationships', // Privacy and safety risks
      'healthcare_medical',   // HIPAA and sensitive data risks
      'travel_booking',       // Payment and cancellation risks
      'education_courses'     // Payment and certification risks
    )
  ).min(1).max(5).required().description('Primary online activities'),
  
  signupFrequency: Joi.string().valid(
    'multiple_weekly',  // High exposure, need efficiency
    'weekly',          // Regular exposure, standard protection
    'monthly',         // Moderate exposure, thorough analysis
    'rarely'           // Low exposure, comprehensive protection
  ).required().description('Frequency of new service sign-ups'),
  
  deviceUsage: Joi.string().valid(
    'mobile_primary',   // Mobile-optimized interface needed
    'desktop_primary',  // Full-featured interface available
    'tablet_primary',   // Tablet-optimized interface
    'mixed_usage'       // Responsive design priority
  ).required().description('Primary device usage pattern')
}).required().description('Internet usage patterns and behaviors');

/**
 * Privacy preferences and data sensitivity levels
 * Core component for personalizing privacy risk assessments
 */
const privacyPreferencesSchema = Joi.object({
  overallImportance: Joi.string().valid(
    'extremely_important', // Strict thresholds, comprehensive warnings
    'very_important',      // Conservative thresholds
    'moderately_important', // Standard thresholds
    'not_very_important'   // Relaxed thresholds
  ).required(),
  
  sensitiveDataTypes: Joi.array().items(
    Joi.object({
      dataType: Joi.string().valid(
        'financial_information',
        'personal_communications',
        'location_data',
        'browsing_habits',
        'photos_media',
        'professional_information',
        'health_data',
        'social_connections',
        'biometric_data',
        'purchase_history'
      ).required(),
      
      priorityLevel: Joi.number().integer().min(1).max(10).required()
        .description('Priority ranking (1=highest concern, 10=lowest concern)')
    })
  ).min(1).max(20).required().description('Ranked sensitive data types'),
  
  dataProcessingComfort: Joi.object({
    domesticProcessing: Joi.string().valid('comfortable', 'cautious', 'uncomfortable').required(),
    internationalTransfers: Joi.string().valid('comfortable', 'cautious', 'uncomfortable').required(),
    thirdPartySharing: Joi.string().valid('comfortable', 'cautious', 'uncomfortable').required(),
    aiProcessing: Joi.string().valid('comfortable', 'cautious', 'uncomfortable').required(),
    longTermStorage: Joi.string().valid('comfortable', 'cautious', 'uncomfortable').required()
  }).required().description('Comfort levels with different data processing types')
}).required().description('Privacy preferences and data sensitivity');

/**
 * Financial risk tolerance and payment security preferences
 * Critical for payment-related risk assessment and warnings
 */
const financialPreferencesSchema = Joi.object({
  paymentApproach: Joi.string().valid(
    'very_cautious',    // Read all payment terms, strict validation
    'cautious',         // Check for major issues, standard protection
    'moderate',         // Trust established brands, basic protection
    'relaxed'           // Convenience over security, minimal warnings
  ).required(),
  
  feeImpact: Joi.string().valid(
    'significant',  // Budget-conscious, need all fee warnings
    'moderate',     // Check terms carefully, standard warnings
    'minimal'       // Fees aren't major concern, fewer warnings
  ).required(),
  
  financialSituation: Joi.string().valid(
    'student_limited',     // Higher protection needed
    'stable_employment',   // Standard protection
    'high_income',         // Can tolerate some risk
    'business_owner',      // Different risk considerations
    'retired_fixed',       // Budget-conscious, scam-aware
    'prefer_not_to_say'    // Privacy option
  ).required(),
  
  subscriptionTolerance: Joi.object({
    autoRenewal: Joi.string().valid('avoid', 'cautious', 'acceptable').required(),
    freeTrialToSubscription: Joi.string().valid('avoid', 'cautious', 'acceptable').required(),
    priceChanges: Joi.string().valid('strict_notice', 'reasonable_notice', 'flexible').required()
  }).required().description('Subscription and recurring payment preferences')
}).required().description('Financial risk tolerance and payment preferences');

/**
 * Legal risk tolerance and dispute resolution preferences
 * Affects warnings about arbitration, liability, and legal protections
 */
const legalPreferencesSchema = Joi.object({
  arbitrationComfort: Joi.string().valid(
    'strongly_prefer_courts', // Strong warnings for arbitration clauses
    'prefer_courts',          // Moderate warnings for arbitration
    'neutral',                // Standard warnings, explain differences
    'acceptable'              // Minimal arbitration warnings
  ).required(),
  
  liabilityTolerance: Joi.string().valid(
    'want_full_protection',   // Warn about any liability limitations
    'reasonable_limitations', // Warn about excessive limitations
    'business_standard',      // Accept standard business limitations
    'minimal_concern'         // Few liability warnings
  ).required(),
  
  legalKnowledge: Joi.object({
    contractLaw: Joi.string().valid('expert', 'intermediate', 'basic', 'none').required(),
    privacyLaw: Joi.string().valid('expert', 'intermediate', 'basic', 'none').required(),
    consumerRights: Joi.string().valid('expert', 'intermediate', 'basic', 'none').required()
  }).required().description('Self-assessed legal knowledge levels'),
  
  previousIssues: Joi.string().valid(
    'no_issues',        // No experience with problems
    'minor_problems',   // Billing, account access issues
    'moderate_problems', // Unexpected charges, data issues
    'serious_problems'  // Fraud, legal issues, major losses
  ).required().description('Previous experience with online service problems')
}).required().description('Legal risk tolerance and experience');

/**
 * Contextual factors affecting risk assessment and user protection needs
 * Additional factors that influence risk tolerance and protection requirements
 */
const contextualFactorsSchema = Joi.object({
  dependentStatus: Joi.string().valid(
    'just_myself',        // Individual risk only
    'spouse_partner',     // Shared financial/privacy risks
    'children_dependents', // Family protection considerations
    'employees_team',     // Business liability considerations
    'clients_customers'   // Professional responsibility considerations
  ).required(),
  
  specialCircumstances: Joi.array().items(
    Joi.string().valid(
      'small_business_owner',      // Business liability and employee considerations
      'content_creator',           // IP and platform dependency risks
      'handles_sensitive_data',    // Professional data protection requirements
      'frequent_international',    // Multi-jurisdiction complications
      'regulated_industry',        // Compliance and regulatory requirements
      'accessibility_needs',       // Interface and communication adaptations
      'non_native_speaker',        // Language and cultural considerations
      'elderly_or_vulnerable'      // Enhanced protection and clearer explanations
    )
  ).optional().description('Special circumstances requiring adapted analysis'),
  
  decisionMakingPriorities: Joi.array().items(
    Joi.object({
      factor: Joi.string().valid(
        'privacy_protection',
        'cost_value',
        'features_functionality',
        'reputation_reviews',
        'ease_of_use',
        'customer_support',
        'terms_fairness',
        'security_safety',
        'compliance_legal'
      ).required(),
      
      priority: Joi.number().integer().min(1).max(9).required()
        .description('Priority ranking (1=highest priority, 9=lowest priority)')
    })
  ).length(9).required().description('Ranked decision-making priorities'),
  
  alertPreferences: Joi.object({
    interruptionTiming: Joi.string().valid(
      'only_severe',           // Only interrupt for severe risks
      'moderate_and_high',     // Interrupt for moderate+ risks
      'any_concerning',        // Interrupt for any concerning terms
      'only_when_committing'   // Only when signing up/paying
    ).required(),
    
    educationalContent: Joi.string().valid(
      'yes_teach_rights',      // Want educational content about rights
      'occasionally_important', // Occasional education for important topics
      'just_analysis'         // Just provide analysis, no education
    ).required(),
    
    alertFrequencyLimit: Joi.number().integer().min(1).max(50).required()
      .description('Maximum alerts per day before suppression'),
    
    learningMode: Joi.boolean().required()
      .description('Whether system should learn from user behavior and adapt')
  }).required().description('Alert and notification preferences')
}).required().description('Contextual factors and special circumstances');

/**
 * Complete user personalization profile schema
 * Combines all personalization components into a comprehensive user profile
 */
const userPersonalizationSchema = Joi.object({
  userId: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().email()
  ).required().description('Unique user identifier (UUID or email)'),
  
  version: Joi.string().valid('1.0').default('1.0')
    .description('Schema version for migration compatibility'),
  
  completedAt: Joi.date().iso().required()
    .description('When the personalization quiz was completed'),
  
  demographics: Joi.object({
    ageRange: ageRangeSchema,
    jurisdiction: jurisdictionSchema,
    occupation: occupationSchema
  }).required().description('Demographic information affecting legal context'),
  
  digitalBehavior: Joi.object({
    techSophistication: techSophisticationSchema,
    usagePatterns: usagePatternSchema
  }).required().description('Digital behavior and technology usage patterns'),
  
  riskPreferences: Joi.object({
    privacy: privacyPreferencesSchema,
    financial: financialPreferencesSchema,
    legal: legalPreferencesSchema
  }).required().description('Risk tolerance and preference settings'),
  
  contextualFactors: contextualFactorsSchema,
  
  computedProfile: Joi.object({
    riskTolerance: Joi.object({
      privacy: Joi.number().min(0).max(10).required(),
      financial: Joi.number().min(0).max(10).required(),
      legal: Joi.number().min(0).max(10).required(),
      overall: Joi.number().min(0).max(10).required()
    }).required().description('Computed risk tolerance scores'),
    
    alertThresholds: Joi.object({
      privacy: Joi.number().min(0).max(10).required(),
      liability: Joi.number().min(0).max(10).required(),
      termination: Joi.number().min(0).max(10).required(),
      payment: Joi.number().min(0).max(10).required(),
      overall: Joi.number().min(0).max(10).required()
    }).required().description('Computed alert threshold levels'),
    
    explanationStyle: Joi.string().valid(
      'simple_protective',     // Simple language, protective stance
      'balanced_educational',  // Balanced approach with education
      'technical_efficient',   // Technical details, efficiency focused
      'comprehensive_cautious' // Comprehensive analysis, cautious approach
    ).required().description('Computed explanation style preference'),
    
    profileTags: Joi.array().items(Joi.string()).required()
      .description('Computed profile tags for prompt customization')
  }).optional().description('Computed personalization parameters')
}).required().description('Complete user personalization profile');

/**
 * Quiz response update schema for partial updates
 * Allows updating specific sections without requiring complete re-submission
 */
const quizUpdateSchema = Joi.object({
  userId: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().email()
  ).required(),
  section: Joi.string().valid(
    'demographics',
    'digitalBehavior', 
    'riskPreferences',
    'contextualFactors'
  ).required(),
  data: Joi.object().required(),
  recomputeProfile: Joi.boolean().default(true)
    .description('Whether to recompute derived profile parameters')
}).description('Partial quiz response update');

module.exports = {
  userPersonalizationSchema,
  quizUpdateSchema,
  ageRangeSchema,
  jurisdictionSchema,
  occupationSchema,
  techSophisticationSchema,
  usagePatternSchema,
  privacyPreferencesSchema,
  financialPreferencesSchema,
  legalPreferencesSchema,
  contextualFactorsSchema
};