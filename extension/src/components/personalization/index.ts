/**
 * Personalization Components Index
 * 
 * Central export file for all personalization-related components
 */

export { DemographicsForm } from './DemographicsForm';
export { DigitalBehaviorForm } from './DigitalBehaviorForm';
export { RiskPreferencesForm } from './RiskPreferencesForm';
export { ContextualFactorsForm } from './ContextualFactorsForm';
export { OnboardingFlow } from './OnboardingFlow';

// Re-export types from the service
export type {
  Demographics,
  DigitalBehavior,
  RiskPreferences,
  ContextualFactors,
  UserPersonalizationProfile,
  PersonalizationApiResponse
} from '@/services/personalizationService';