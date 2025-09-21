/**
 * Personalization Service for Going Bananas Extension
 * 
 * This service handles all communication with the backend personalization API,
 * including profile submission, updates, and retrieval.
 * 
 * @fileoverview Frontend personalization API service
 * @author Extension Team
 * @version 1.0.0
 */

import { createDevLogger } from '../utils/devLogger';

const devLog = createDevLogger('personalizationService');

// Type definitions based on backend schema
export interface Demographics {
  ageRange: 'under_18' | '18_25' | '26_40' | '41_55' | 'over_55' | 'prefer_not_to_say';
  jurisdiction: {
    primaryCountry: string;
    primaryState?: string;
    frequentTravel: boolean;
    isExpatriate: boolean;
    multipleJurisdictions?: string[];
  };
  occupation: 'legal_compliance' | 'healthcare' | 'financial_services' | 'technology' | 
            'education' | 'creative_freelancer' | 'student' | 'retired' | 'business_owner' |
            'government' | 'nonprofit' | 'other' | 'prefer_not_to_say';
}

export interface TechSophistication {
  readingFrequency: 'never' | 'skim_occasionally' | 'read_important' | 'read_thoroughly';
  comfortLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferredExplanationStyle: 'simple_language' | 'balanced_technical' | 'technical_detailed' |
                           'bullet_summaries' | 'comprehensive_analysis';
}

export interface UsagePatterns {
  primaryActivities: Array<'social_media' | 'work_productivity' | 'shopping_financial' | 
                          'research_learning' | 'creative_content' | 'gaming' | 
                          'dating_relationships' | 'healthcare_medical' | 'travel_booking' | 
                          'education_courses'>;
  signupFrequency: 'multiple_weekly' | 'weekly' | 'monthly' | 'rarely';
  deviceUsage: 'mobile_primary' | 'desktop_primary' | 'tablet_primary' | 'mixed_usage';
}

export interface DigitalBehavior {
  techSophistication: TechSophistication;
  usagePatterns: UsagePatterns;
}

export interface PrivacyPreferences {
  overallImportance: 'extremely_important' | 'very_important' | 'moderately_important' | 'not_very_important';
  sensitiveDataTypes: Array<{
    dataType: 'financial_information' | 'personal_communications' | 'location_data' |
             'browsing_habits' | 'photos_media' | 'professional_information' | 'health_data' |
             'social_connections' | 'biometric_data' | 'purchase_history';
    priorityLevel: number; // 1-10, 1 = highest concern
  }>;
  dataProcessingComfort: {
    domesticProcessing: 'comfortable' | 'cautious' | 'uncomfortable';
    internationalTransfers: 'comfortable' | 'cautious' | 'uncomfortable';
    thirdPartySharing: 'comfortable' | 'cautious' | 'uncomfortable';
    aiProcessing: 'comfortable' | 'cautious' | 'uncomfortable';
    longTermStorage: 'comfortable' | 'cautious' | 'uncomfortable';
  };
}

export interface FinancialPreferences {
  paymentApproach: 'very_cautious' | 'cautious' | 'moderate' | 'relaxed';
  feeImpact: 'significant' | 'moderate' | 'minimal';
  financialSituation: 'student_limited' | 'stable_employment' | 'high_income' | 
                     'business_owner' | 'retired_fixed' | 'prefer_not_to_say';
  subscriptionTolerance: {
    autoRenewal: 'avoid' | 'cautious' | 'acceptable';
    freeTrialToSubscription: 'avoid' | 'cautious' | 'acceptable';
    priceChanges: 'strict_notice' | 'reasonable_notice' | 'flexible';
  };
}

export interface LegalPreferences {
  arbitrationComfort: 'strongly_prefer_courts' | 'prefer_courts' | 'neutral' | 'acceptable';
  liabilityTolerance: 'want_full_protection' | 'reasonable_limitations' | 'business_standard' | 'minimal_concern';
  legalKnowledge: {
    contractLaw: 'expert' | 'intermediate' | 'basic' | 'none';
    privacyLaw: 'expert' | 'intermediate' | 'basic' | 'none';
    consumerRights: 'expert' | 'intermediate' | 'basic' | 'none';
  };
  previousIssues: 'no_issues' | 'minor_problems' | 'moderate_problems' | 'serious_problems';
}

export interface RiskPreferences {
  privacy: PrivacyPreferences;
  financial: FinancialPreferences;
  legal: LegalPreferences;
}

export interface ContextualFactors {
  dependentStatus: 'just_myself' | 'spouse_partner' | 'children_dependents' | 'employees_team' | 'clients_customers';
  specialCircumstances?: Array<'small_business_owner' | 'content_creator' | 'handles_sensitive_data' |
                              'frequent_international' | 'regulated_industry' | 'accessibility_needs' |
                              'non_native_speaker' | 'elderly_or_vulnerable'>;
  decisionMakingPriorities: Array<{
    factor: 'privacy_protection' | 'cost_value' | 'features_functionality' | 'reputation_reviews' |
           'ease_of_use' | 'customer_support' | 'terms_fairness' | 'security_safety' | 'compliance_legal';
    priority: number; // 1-9, 1 = highest priority
  }>;
  alertPreferences: {
    interruptionTiming: 'only_severe' | 'moderate_and_high' | 'any_concerning' | 'only_when_committing';
    educationalContent: 'yes_teach_rights' | 'occasionally_important' | 'just_analysis';
    alertFrequencyLimit: number; // 1-50
    learningMode: boolean;
  };
}

export interface UserPersonalizationProfile {
  userId: string;
  version?: string;
  completedAt: string;
  demographics: Demographics;
  digitalBehavior: DigitalBehavior;
  riskPreferences: RiskPreferences;
  contextualFactors: ContextualFactors;
  computedProfile?: {
    riskTolerance: {
      privacy: number;
      financial: number;
      legal: number;
      overall: number;
    };
    alertThresholds: {
      privacy: number;
      liability: number;
      termination: number;
      payment: number;
      overall: number;
    };
    explanationStyle: 'simple_protective' | 'balanced_educational' | 'technical_efficient' | 'comprehensive_cautious';
    profileTags: string[];
  };
}

export interface PersonalizationApiResponse {
  success: boolean;
  message?: string;
  profile?: {
    userId: string;
    computedProfile: UserPersonalizationProfile['computedProfile'];
    lastUpdated: string;
  };
  metadata?: {
    processing_time: number;
    profile_version?: string;
    computation_version?: string;
    timestamp: string;
  };
  error?: string;
  details?: string;
}

class PersonalizationService {
  private apiBaseUrl: string;
  private fallbackUrls: string[];

  constructor() {
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    this.fallbackUrls = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
  }

  private async fetchWithFallback(endpoint: string, options: RequestInit): Promise<Response> {
    const urls = [this.apiBaseUrl, ...this.fallbackUrls.filter(url => url !== this.apiBaseUrl)];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const fullUrl = `${url}${endpoint}`;
      
      try {
        const response = await fetch(fullUrl, {
          ...options,
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok || response.status !== 0) {
          if (this.apiBaseUrl !== url) {
            this.apiBaseUrl = url;
          }
          return response;
        }
        
      } catch (error) {
        if (i === urls.length - 1) {
          throw error;
        }
      }
    }
    
    throw new Error('All API endpoints failed');
  }

  /**
   * Submit a complete user personalization profile
   */
  async submitProfile(profile: UserPersonalizationProfile): Promise<PersonalizationApiResponse> {
    try {
      devLog.info('Submitting personalization profile', { userId: profile.userId });

      const response = await this.fetchWithFallback('/api/personalization/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      const data: PersonalizationApiResponse = await response.json();

      if (!response.ok) {
        devLog.error('Profile submission failed', { status: response.status, data });
        throw new Error(data.error || `HTTP ${response.status}: Profile submission failed`);
      }

      devLog.info('Profile submitted successfully', { 
        userId: profile.userId,
        processingTime: data.metadata?.processing_time 
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devLog.error('Profile submission error', { error: errorMessage, userId: profile.userId });
      throw error;
    }
  }

  /**
   * Update a specific section of user profile
   */
  async updateProfileSection(
    userId: string, 
    section: 'demographics' | 'digitalBehavior' | 'riskPreferences' | 'contextualFactors',
    data: any,
    recomputeProfile: boolean = true
  ): Promise<PersonalizationApiResponse> {
    try {
      devLog.info('Updating profile section', { userId, section });

      const response = await fetch(`${this.apiBaseUrl}/api/personalization/profile/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          data,
          recomputeProfile,
        }),
      });

      const result: PersonalizationApiResponse = await response.json();

      if (!response.ok) {
        devLog.error('Profile section update failed', { status: response.status, result });
        throw new Error(result.error || `HTTP ${response.status}: Profile section update failed`);
      }

      devLog.info('Profile section updated successfully', { userId, section });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devLog.error('Profile section update error', { error: errorMessage, userId, section });
      throw error;
    }
  }

  /**
   * Retrieve user personalization profile
   */
  async getProfile(userId: string): Promise<UserPersonalizationProfile | null> {
    try {
      devLog.info('Retrieving user profile', { userId });

      const response = await this.fetchWithFallback(`/api/personalization/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        devLog.info('User profile not found', { userId });
        return null;
      }

      const data: PersonalizationApiResponse = await response.json();

      if (!response.ok) {
        devLog.error('Profile retrieval failed', { status: response.status, data });
        throw new Error(data.error || `HTTP ${response.status}: Profile retrieval failed`);
      }

      devLog.info('Profile retrieved successfully', { userId });
      return data.profile as any; // Cast to full profile for retrieval
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devLog.error('Profile retrieval error', { error: errorMessage, userId });
      throw error;
    }
  }

  /**
   * Check if user has completed personalization
   */
  async hasCompletedPersonalization(userId: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId);
      return profile !== null && profile.computedProfile !== undefined;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      devLog.error('Error checking personalization status', { error: errorMessage, userId });
      return false;
    }
  }
}

export const personalizationService = new PersonalizationService();
export default PersonalizationService;