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
