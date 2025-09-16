// Type definitions for Going Bananas Extension

export interface AnalysisResult {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  summary: string;
  key_points: string[];
  categories: {
    privacy: CategoryAnalysis;
    liability: CategoryAnalysis;
    termination: CategoryAnalysis;
    payment: CategoryAnalysis;
  };
  confidence: number;
  analysis_time: number;
  word_count?: number;
  cached?: boolean;
  mock?: boolean;
}

export interface CategoryAnalysis {
  score: number;
  concerns: string[];
}

export interface AnalysisRequest {
  text: string;
  url?: string;
  options?: {
    language?: string;
    detail_level?: 'basic' | 'standard' | 'comprehensive';
    cache?: boolean;
  };
}

export interface ExtensionSettings {
  autoAnalyze: boolean;
  showNotifications: boolean;
  riskThreshold: number;
  apiEndpoint: 'production' | 'local' | 'mock';
  apiKey: string;
  analysisDetail: 'basic' | 'standard' | 'comprehensive';
}

export interface ChromeMessage {
  action: string;
  data?: any;
}

export interface AnalysisState {
  loading: boolean;
  analysis: AnalysisResult | null;
  error: string | null;
  hasTerms: boolean;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  api_reachable: boolean;
  cache_size: number;
  last_analysis: number | null;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface PersonalizationData {
  demographics: {
    ageRange: string;
    jurisdiction: {
      primaryCountry: string;
      primaryState: string;
      frequentTravel: boolean;
      isExpatriate: boolean;
    };
    occupation: string;
  };
  digitalBehavior: {
    techSophistication: {
      readingFrequency: string;
      comfortLevel: string;
      preferredExplanationStyle: string;
    };
    usagePatterns: {
      primaryActivities: string[];
      signupFrequency: string;
      deviceUsage: string;
    };
  };
  riskPreferences: {
    privacy: {
      overallImportance: string;
      sensitiveDataTypes: Array<{ dataType: string; priorityLevel: number }>;
      dataProcessingComfort: {
        domesticProcessing: string;
        internationalTransfers: string;
        thirdPartySharing: string;
        aiProcessing: string;
        longTermStorage: string;
      };
    };
    financial: {
      paymentApproach: string;
      feeImpact: string;
      financialSituation: string;
      subscriptionTolerance: {
        autoRenewal: string;
        freeTrialToSubscription: string;
        priceChanges: string;
      };
    };
    legal: {
      arbitrationComfort: string;
      liabilityTolerance: string;
      legalKnowledge: {
        contractLaw: string;
        privacyLaw: string;
        consumerRights: string;
      };
      previousIssues: string;
    };
  };
  contextualFactors: {
    dependentStatus: string;
    specialCircumstances: string[];
    decisionMakingPriorities: Array<{ factor: string; priority: number }>;
    alertPreferences: {
      interruptionTiming: string;
      educationalContent: string;
      alertFrequencyLimit: number;
      learningMode: boolean;
    };
  };
}
