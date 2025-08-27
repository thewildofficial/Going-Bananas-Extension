/**
 * Personalization Routes for Going Bananas T&C Analyzer
 * 
 * This module defines all API endpoints related to user personalization,
 * including quiz submission, profile management, and personalization insights.
 * 
 * Routes handle user personalization data collection, profile computation,
 * and retrieval of personalized settings for risk analysis customization.
 * 
 * @fileoverview API routes for user personalization management
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const express = require('express');
const Joi = require('joi');
const PersonalizationService = require('../services/personalizationService');
const { userPersonalizationSchema, quizUpdateSchema } = require('../schemas/personalizationSchemas');
const logger = require('../utils/logger');

const router = express.Router();
const personalizationService = new PersonalizationService();

/**
 * POST /api/personalization/profile
 * Submit complete user personalization quiz response
 * 
 * This endpoint accepts a complete user personalization profile from the quiz
 * and computes personalized risk thresholds, explanation styles, and alert preferences.
 * 
 * @route POST /api/personalization/profile
 * @param {Object} req.body - Complete user personalization data
 * @returns {Object} Saved profile with computed personalization parameters
 * 
 * @example
 * POST /api/personalization/profile
 * Content-Type: application/json
 * 
 * {
 *   "userId": "123e4567-e89b-12d3-a456-426614174000",
 *   "demographics": {
 *     "ageRange": "26_40",
 *     "jurisdiction": {
 *       "primaryCountry": "US",
 *       "primaryState": "CA",
 *       "frequentTravel": false,
 *       "isExpatriate": false
 *     },
 *     "occupation": "technology"
 *   },
 *   "digitalBehavior": {
 *     "techSophistication": {
 *       "readingFrequency": "read_important",
 *       "comfortLevel": "advanced",
 *       "preferredExplanationStyle": "balanced_technical"
 *     },
 *     "usagePatterns": {
 *       "primaryActivities": ["work_productivity", "social_media"],
 *       "signupFrequency": "monthly",
 *       "deviceUsage": "mixed_usage"
 *     }
 *   },
 *   // ... additional sections
 * }
 */
router.post('/profile', async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('Personalization profile submission received:', {
      userId: req.body.userId,
      hasAllSections: !!(req.body.demographics && req.body.digitalBehavior && req.body.riskPreferences && req.body.contextualFactors),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Add completion timestamp if not provided
    if (!req.body.completedAt) {
      req.body.completedAt = new Date().toISOString();
    }

    // Save the complete profile and compute personalization parameters
    const savedProfile = await personalizationService.saveUserProfile(req.body);

    logger.info('Personalization profile saved successfully:', {
      userId: savedProfile.userId,
      computedRiskTolerance: savedProfile.computedProfile.riskTolerance,
      explanationStyle: savedProfile.computedProfile.explanationStyle,
      profileTags: savedProfile.computedProfile.profileTags.length,
      processingTime: Date.now() - startTime
    });

    // Return success response with computed profile
    res.status(201).json({
      success: true,
      message: 'Personalization profile saved successfully',
      profile: {
        userId: savedProfile.userId,
        computedProfile: savedProfile.computedProfile,
        lastUpdated: savedProfile.lastUpdated
      },
      metadata: {
        processing_time: Date.now() - startTime,
        profile_version: savedProfile.version,
        computation_version: savedProfile.computedProfile.computationVersion,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Personalization profile submission failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.body?.userId,
      processingTime: processingTime,
      ip: req.ip
    });

    // Determine appropriate error response
    let statusCode = 500;
    let errorMessage = 'Failed to save personalization profile';

    if (error.message.includes('validation failed') || error.message.includes('Validation failed')) {
      statusCode = 400;
      errorMessage = 'Invalid personalization data provided';
    } else if (error.message.includes('computation failed')) {
      statusCode = 422;
      errorMessage = 'Failed to compute personalization parameters';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PATCH /api/personalization/profile/:userId
 * Update specific section of user personalization profile
 * 
 * Allows partial updates to user profiles without requiring complete re-submission.
 * Automatically recomputes personalization parameters when sections are updated.
 * 
 * @route PATCH /api/personalization/profile/:userId
 * @param {string} req.params.userId - User identifier
 * @param {Object} req.body - Section update data
 * @returns {Object} Updated profile with recomputed parameters
 * 
 * @example
 * PATCH /api/personalization/profile/123e4567-e89b-12d3-a456-426614174000
 * Content-Type: application/json
 * 
 * {
 *   "section": "riskPreferences",
 *   "data": {
 *     "privacy": {
 *       "overallImportance": "extremely_important"
 *     }
 *   },
 *   "recomputeProfile": true
 * }
 */
router.patch('/profile/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    
    logger.info('Profile section update received:', {
      userId: userId,
      section: req.body.section,
      recompute: req.body.recomputeProfile,
      ip: req.ip
    });

    // Prepare update data with user ID from URL
    const updateData = {
      userId: userId,
      ...req.body
    };

    // Update the profile section
    const updatedProfile = await personalizationService.updateProfileSection(updateData);

    logger.info('Profile section updated successfully:', {
      userId: userId,
      section: req.body.section,
      recomputed: req.body.recomputeProfile,
      processingTime: Date.now() - startTime
    });

    // Return updated profile
    res.json({
      success: true,
      message: 'Profile section updated successfully',
      profile: {
        userId: updatedProfile.userId,
        updatedSection: req.body.section,
        computedProfile: updatedProfile.computedProfile,
        lastUpdated: updatedProfile.lastUpdated
      },
      metadata: {
        processing_time: Date.now() - startTime,
        recomputed: req.body.recomputeProfile,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Profile section update failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      section: req.body?.section,
      processingTime: processingTime
    });

    let statusCode = 500;
    let errorMessage = 'Failed to update profile section';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = 'User profile not found';
    } else if (error.message.includes('validation failed')) {
      statusCode = 400;
      errorMessage = 'Invalid update data provided';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/personalization/profile/:userId
 * Retrieve user personalization profile and computed parameters
 * 
 * Returns the complete user profile including computed risk thresholds,
 * explanation styles, and profile tags for analysis customization.
 * 
 * @route GET /api/personalization/profile/:userId
 * @param {string} req.params.userId - User identifier
 * @returns {Object} Complete user personalization profile
 * 
 * @example
 * GET /api/personalization/profile/123e4567-e89b-12d3-a456-426614174000
 * 
 * Response:
 * {
 *   "success": true,
 *   "profile": {
 *     "userId": "123e4567-e89b-12d3-a456-426614174000",
 *     "demographics": { ... },
 *     "computedProfile": {
 *       "riskTolerance": { "privacy": 4.2, "financial": 6.1, ... },
 *       "alertThresholds": { "privacy": 5.8, "liability": 3.9, ... },
 *       "explanationStyle": "balanced_educational",
 *       "profileTags": ["age_26_40", "occupation_technology", ...]
 *     }
 *   }
 * }
 */
router.get('/profile/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    
    logger.info('Profile retrieval requested:', {
      userId: userId,
      ip: req.ip
    });

    // Retrieve user profile
    const profile = await personalizationService.getUserProfile(userId);

    if (!profile) {
      logger.warn('Profile not found for retrieval:', { userId });
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
        metadata: {
          processing_time: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.info('Profile retrieved successfully:', {
      userId: userId,
      hasComputedProfile: !!profile.computedProfile,
      profileAge: profile.lastUpdated,
      processingTime: Date.now() - startTime
    });

    // Return profile data
    res.json({
      success: true,
      profile: profile,
      metadata: {
        processing_time: Date.now() - startTime,
        profile_version: profile.version,
        last_updated: profile.lastUpdated,
        computation_version: profile.computedProfile?.computationVersion,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Profile retrieval failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      processingTime: processingTime
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/personalization/insights/:userId
 * Get personalization insights and recommendations for user
 * 
 * Provides human-readable insights about the user's computed profile,
 * including risk tolerance summary, alert configuration, and recommendations
 * for improving their personalization settings.
 * 
 * @route GET /api/personalization/insights/:userId
 * @param {string} req.params.userId - User identifier
 * @returns {Object} Personalization insights and recommendations
 * 
 * @example
 * GET /api/personalization/insights/123e4567-e89b-12d3-a456-426614174000
 * 
 * Response:
 * {
 *   "success": true,
 *   "insights": {
 *     "riskProfileSummary": {
 *       "privacy": { "level": "Low", "score": 4.2 },
 *       "financial": { "level": "Moderate", "score": 6.1 }
 *     },
 *     "alertConfiguration": {
 *       "privacy": "High Sensitivity",
 *       "liability": "Moderate Sensitivity"
 *     },
 *     "recommendations": [
 *       { "type": "threshold_adjustment", "message": "..." }
 *     ]
 *   }
 * }
 */
router.get('/insights/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    
    logger.info('Personalization insights requested:', {
      userId: userId,
      ip: req.ip
    });

    // Generate personalization insights
    const insights = await personalizationService.getPersonalizationInsights(userId);

    logger.info('Personalization insights generated successfully:', {
      userId: userId,
      recommendationCount: insights.recommendations?.length || 0,
      strengthCount: insights.profileStrengths?.length || 0,
      processingTime: Date.now() - startTime
    });

    res.json({
      success: true,
      insights: insights,
      metadata: {
        processing_time: Date.now() - startTime,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Personalization insights generation failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      processingTime: processingTime
    });

    let statusCode = 500;
    let errorMessage = 'Failed to generate personalization insights';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorMessage = 'User profile not found';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /api/personalization/profile/:userId
 * Delete user personalization profile
 * 
 * Completely removes a user's personalization profile and computed parameters.
 * This action cannot be undone and the user will need to retake the quiz.
 * 
 * @route DELETE /api/personalization/profile/:userId
 * @param {string} req.params.userId - User identifier
 * @returns {Object} Deletion confirmation
 */
router.delete('/profile/:userId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId } = req.params;
    
    logger.info('Profile deletion requested:', {
      userId: userId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Delete the profile
    const deleted = await personalizationService.deleteUserProfile(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    logger.info('Profile deleted successfully:', {
      userId: userId,
      processingTime: Date.now() - startTime
    });

    res.json({
      success: true,
      message: 'User profile deleted successfully',
      metadata: {
        processing_time: Date.now() - startTime,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Profile deletion failed:', {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      processingTime: processingTime
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete user profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/personalization/quiz/schema
 * Get personalization quiz schema and structure
 * 
 * Returns the complete quiz structure, question definitions, and validation
 * requirements for building the frontend quiz interface.
 * 
 * @route GET /api/personalization/quiz/schema
 * @returns {Object} Quiz schema and structure definition
 */
router.get('/quiz/schema', (req, res) => {
  try {
    logger.info('Quiz schema requested:', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return quiz structure and schema information
    const quizSchema = {
      version: '1.0',
      sections: {
        demographics: {
          title: 'Demographics & Context',
          description: 'Basic information about you and your legal context',
          fields: {
            ageRange: {
              type: 'select',
              required: true,
              options: ['under_18', '18_25', '26_40', '41_55', 'over_55', 'prefer_not_to_say'],
              description: 'Your age range affects legal protections and risk interpretation'
            },
            jurisdiction: {
              type: 'object',
              required: true,
              fields: {
                primaryCountry: { type: 'country_select', required: true },
                primaryState: { type: 'state_select', required: false },
                frequentTravel: { type: 'boolean', required: true },
                isExpatriate: { type: 'boolean', required: true }
              }
            },
            occupation: {
              type: 'select',
              required: true,
              options: ['legal_compliance', 'healthcare', 'financial_services', 'technology', 'education', 'creative_freelancer', 'student', 'retired', 'business_owner', 'government', 'nonprofit', 'other', 'prefer_not_to_say']
            }
          }
        },
        digitalBehavior: {
          title: 'Digital Behavior & Preferences',
          description: 'How you interact with technology and online services',
          fields: {
            techSophistication: {
              type: 'object',
              required: true,
              fields: {
                readingFrequency: {
                  type: 'select',
                  options: ['never', 'skim_occasionally', 'read_important', 'read_thoroughly']
                },
                comfortLevel: {
                  type: 'select',
                  options: ['beginner', 'intermediate', 'advanced', 'expert']
                },
                preferredExplanationStyle: {
                  type: 'select',
                  options: ['simple_language', 'balanced_technical', 'technical_detailed', 'bullet_summaries', 'comprehensive_analysis']
                }
              }
            },
            usagePatterns: {
              type: 'object',
              required: true,
              fields: {
                primaryActivities: {
                  type: 'multi_select',
                  min: 1,
                  max: 5,
                  options: ['social_media', 'work_productivity', 'shopping_financial', 'research_learning', 'creative_content', 'gaming', 'dating_relationships', 'healthcare_medical', 'travel_booking', 'education_courses']
                },
                signupFrequency: {
                  type: 'select',
                  options: ['multiple_weekly', 'weekly', 'monthly', 'rarely']
                },
                deviceUsage: {
                  type: 'select',
                  options: ['mobile_primary', 'desktop_primary', 'tablet_primary', 'mixed_usage']
                }
              }
            }
          }
        },
        riskPreferences: {
          title: 'Risk Preferences',
          description: 'Your tolerance and preferences for different types of risks',
          fields: {
            privacy: {
              type: 'object',
              required: true,
              fields: {
                overallImportance: {
                  type: 'select',
                  options: ['extremely_important', 'very_important', 'moderately_important', 'not_very_important']
                },
                sensitiveDataTypes: {
                  type: 'ranking',
                  items: ['financial_information', 'personal_communications', 'location_data', 'browsing_habits', 'photos_media', 'professional_information', 'health_data', 'social_connections', 'biometric_data', 'purchase_history']
                }
              }
            },
            financial: {
              type: 'object',
              required: true,
              fields: {
                paymentApproach: {
                  type: 'select',
                  options: ['very_cautious', 'cautious', 'moderate', 'relaxed']
                },
                feeImpact: {
                  type: 'select',
                  options: ['significant', 'moderate', 'minimal']
                },
                financialSituation: {
                  type: 'select',
                  options: ['student_limited', 'stable_employment', 'high_income', 'business_owner', 'retired_fixed', 'prefer_not_to_say']
                }
              }
            },
            legal: {
              type: 'object',
              required: true,
              fields: {
                arbitrationComfort: {
                  type: 'select',
                  options: ['strongly_prefer_courts', 'prefer_courts', 'neutral', 'acceptable']
                },
                liabilityTolerance: {
                  type: 'select',
                  options: ['want_full_protection', 'reasonable_limitations', 'business_standard', 'minimal_concern']
                }
              }
            }
          }
        },
        contextualFactors: {
          title: 'Additional Context',
          description: 'Special circumstances and preferences that affect your needs',
          fields: {
            dependentStatus: {
              type: 'select',
              required: true,
              options: ['just_myself', 'spouse_partner', 'children_dependents', 'employees_team', 'clients_customers']
            },
            specialCircumstances: {
              type: 'multi_select',
              options: ['small_business_owner', 'content_creator', 'handles_sensitive_data', 'frequent_international', 'regulated_industry', 'accessibility_needs', 'non_native_speaker', 'elderly_or_vulnerable']
            },
            alertPreferences: {
              type: 'object',
              required: true,
              fields: {
                interruptionTiming: {
                  type: 'select',
                  options: ['only_severe', 'moderate_and_high', 'any_concerning', 'only_when_committing']
                },
                educationalContent: {
                  type: 'select',
                  options: ['yes_teach_rights', 'occasionally_important', 'just_analysis']
                },
                alertFrequencyLimit: {
                  type: 'number',
                  min: 1,
                  max: 50,
                  default: 10
                }
              }
            }
          }
        }
      },
      estimatedTime: '5-8 minutes',
      purpose: 'Personalize risk analysis and explanations based on your specific needs and context'
    };

    res.json({
      success: true,
      schema: quizSchema,
      metadata: {
        schema_version: '1.0',
        last_updated: '2024-01-01',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to return quiz schema:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quiz schema',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/personalization/stats
 * Get anonymized personalization statistics
 * 
 * Returns aggregated statistics about personalization usage without
 * revealing individual user information.
 * 
 * @route GET /api/personalization/stats
 * @returns {Object} Anonymized personalization statistics
 */
router.get('/stats', (req, res) => {
  try {
    logger.info('Personalization stats requested:', {
      ip: req.ip
    });

    // Calculate anonymized statistics
    const totalProfiles = personalizationService.profiles.size;
    const profileArray = Array.from(personalizationService.profiles.values());
    
    const stats = {
      totalProfiles: totalProfiles,
      demographics: {
        ageDistribution: calculateDistribution(profileArray, 'demographics.ageRange'),
        occupationDistribution: calculateDistribution(profileArray, 'demographics.occupation'),
        jurisdictionDistribution: calculateDistribution(profileArray, 'demographics.jurisdiction.primaryCountry')
      },
      preferences: {
        privacyImportanceDistribution: calculateDistribution(profileArray, 'riskPreferences.privacy.overallImportance'),
        techSophisticationDistribution: calculateDistribution(profileArray, 'digitalBehavior.techSophistication.comfortLevel'),
        explanationStyleDistribution: calculateDistribution(profileArray, 'computedProfile.explanationStyle')
      },
      riskTolerance: {
        averagePrivacyTolerance: calculateAverage(profileArray, 'computedProfile.riskTolerance.privacy'),
        averageFinancialTolerance: calculateAverage(profileArray, 'computedProfile.riskTolerance.financial'),
        averageLegalTolerance: calculateAverage(profileArray, 'computedProfile.riskTolerance.legal')
      },
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataPoints: totalProfiles
      }
    };

    res.json({
      success: true,
      stats: stats,
      metadata: {
        anonymized: true,
        aggregated: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to generate personalization stats:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve personalization statistics',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Helper method to calculate distribution of values
 * @private
 */
function calculateDistribution(profiles, path) {
  const distribution = {};
  profiles.forEach(profile => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], profile);
    if (value) {
      distribution[value] = (distribution[value] || 0) + 1;
    }
  });
  return distribution;
}

/**
 * Helper method to calculate average of numeric values
 * @private
 */
function calculateAverage(profiles, path) {
  const values = profiles.map(profile => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], profile);
    return typeof value === 'number' ? value : null;
  }).filter(v => v !== null);
  
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
}

module.exports = router;