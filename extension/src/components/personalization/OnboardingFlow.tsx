/**
 * Onboarding Flow Component for Personalization
 * 
 * Main component that orchestrates the multi-step personalization process,
 * handles data collection, submission, and user experience flow.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ArrowRight, Sparkles } from 'lucide-react';
import { DemographicsForm } from './DemographicsForm';
import { DigitalBehaviorForm } from './DigitalBehaviorForm';
import { RiskPreferencesForm } from './RiskPreferencesForm';
import { ContextualFactorsForm } from './ContextualFactorsForm';
import {
  personalizationService,
  UserPersonalizationProfile,
  Demographics,
  DigitalBehavior,
  RiskPreferences,
  ContextualFactors
} from '@/services/personalizationService';
import { createDevLogger } from '@/utils/devLogger';

const devLog = createDevLogger('onboarding');

interface OnboardingFlowProps {
  userId: string;
  onComplete?: (profile: UserPersonalizationProfile) => void;
  onError?: (error: string) => void;
}

const STEPS = [
  { id: 'demographics', title: 'About You', description: 'Basic information for better protection' },
  { id: 'digitalBehavior', title: 'Digital Behavior', description: 'Your tech usage and preferences' },
  { id: 'riskPreferences', title: 'Risk Preferences', description: 'What matters most to you' },
  { id: 'contextualFactors', title: 'Final Details', description: 'Personal situation and alerts' }
] as const;

type StepId = typeof STEPS[number]['id'];

interface OnboardingState {
  currentStep: number;
  demographics?: Demographics;
  digitalBehavior?: DigitalBehavior;
  riskPreferences?: RiskPreferences;
  contextualFactors?: ContextualFactors;
  isSubmitting: boolean;
  error?: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userId,
  onComplete,
  onError
}) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    isSubmitting: false
  });

  // Check if user has already completed personalization
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const hasCompleted = await personalizationService.hasCompletedPersonalization(userId);
        if (hasCompleted) {
          devLog.info('User has already completed personalization', { userId });
          const profile = await personalizationService.getProfile(userId);
          if (profile) {
            onComplete?.(profile);
            return;
          }
        }
      } catch (error) {
        devLog.warn('Error checking existing profile', { error, userId });
        // Continue with onboarding anyway
      }
    };

    checkExistingProfile();
  }, [userId, onComplete]);

  const handleStepComplete = (stepId: StepId, data: any) => {
    setState(prev => ({
      ...prev,
      [stepId]: data,
      error: undefined
    }));
  };

  const nextStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, STEPS.length - 1)
    }));
  };

  const previousStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }));
  };

  const handleFinalSubmit = async (contextualFactors: ContextualFactors) => {
    setState(prev => ({ ...prev, isSubmitting: true, error: undefined }));

    try {
      devLog.info('Submitting complete personalization profile', { userId });

      // Ensure we have all required data
      if (!state.demographics || !state.digitalBehavior || !state.riskPreferences) {
        throw new Error('Missing required form data. Please complete all steps.');
      }

      const profile: UserPersonalizationProfile = {
        userId,
        version: '1.0',
        completedAt: new Date().toISOString(),
        demographics: state.demographics,
        digitalBehavior: state.digitalBehavior,
        riskPreferences: state.riskPreferences,
        contextualFactors
      };

      const response = await personalizationService.submitProfile(profile);
      
      devLog.info('Personalization profile submitted successfully', { 
        userId, 
        profileTags: response.profile?.computedProfile?.profileTags 
      });

      // Mark as completed in storage for future reference
      await chrome.storage.local.set({ 
        personalizationCompleted: true,
        personalizationCompletedAt: new Date().toISOString(),
        computedProfile: response.profile?.computedProfile
      });

      onComplete?.(profile);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save your preferences. Please try again.';
      devLog.error('Personalization submission failed', { error: errorMessage, userId });
      
      setState(prev => ({ 
        ...prev, 
        isSubmitting: false, 
        error: errorMessage 
      }));
      
      onError?.(errorMessage);
    }
  };

  const renderProgressIndicator = () => {
    // Styles similar to settings page
    const progressContainerStyle: React.CSSProperties = {
      marginBottom: '48px',
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f3f4'
    };

    const stepsContainerStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px'
    };

    const stepItemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center'
    };

    const stepCircleBaseStyle: React.CSSProperties = {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      fontSize: '14px',
      fontWeight: '600'
    };

    const stepInfoStyle: React.CSSProperties = {
      marginTop: '12px',
      textAlign: 'center',
      maxWidth: '140px'
    };

    const stepTitleStyle: React.CSSProperties = {
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '4px',
      lineHeight: '1.4'
    };

    const stepDescriptionStyle: React.CSSProperties = {
      fontSize: '12px',
      color: '#6c757d',
      lineHeight: '1.3'
    };

    const arrowStyle: React.CSSProperties = {
      margin: '0 16px',
      color: '#dee2e6',
      transition: 'color 0.3s ease'
    };

    const progressBarContainerStyle: React.CSSProperties = {
      background: '#f8f9fa',
      borderRadius: '8px',
      height: '8px',
      overflow: 'hidden'
    };

    const progressBarStyle: React.CSSProperties = {
      background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
      height: '100%',
      borderRadius: '8px',
      transition: 'width 0.3s ease',
      width: `${((state.currentStep + 1) / STEPS.length) * 100}%`
    };

    return (
      <div style={progressContainerStyle}>
        <div style={stepsContainerStyle}>
          {STEPS.map((step, index) => (
            <div key={step.id} style={stepItemStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  ...stepCircleBaseStyle,
                  background: index < state.currentStep 
                    ? '#10b981' 
                    : index === state.currentStep
                    ? 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)'
                    : '#f8f9fa',
                  color: index <= state.currentStep ? 'white' : '#6c757d',
                  border: index <= state.currentStep ? 'none' : '2px solid #dee2e6'
                }}>
                  {index < state.currentStep ? (
                    <CheckCircle style={{ width: '24px', height: '24px' }} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <div style={stepInfoStyle}>
                  <div style={{
                    ...stepTitleStyle,
                    color: index <= state.currentStep ? '#2c3e50' : '#6c757d'
                  }}>
                    {step.title}
                  </div>
                  <div style={stepDescriptionStyle}>
                    {step.description}
                  </div>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <ArrowRight style={{
                  ...arrowStyle,
                  color: index < state.currentStep ? '#10b981' : '#dee2e6'
                }} />
              )}
            </div>
          ))}
        </div>
        <div style={progressBarContainerStyle}>
          <div style={progressBarStyle} />
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <DemographicsForm
            initialData={state.demographics}
            onSubmit={(data) => handleStepComplete('demographics', data)}
            onNext={nextStep}
            isLoading={false}
          />
        );
      
      case 1:
        return (
          <DigitalBehaviorForm
            initialData={state.digitalBehavior}
            onSubmit={(data) => handleStepComplete('digitalBehavior', data)}
            onNext={nextStep}
            onBack={previousStep}
            isLoading={false}
          />
        );
      
      case 2:
        return (
          <RiskPreferencesForm
            initialData={state.riskPreferences}
            onSubmit={(data) => handleStepComplete('riskPreferences', data)}
            onNext={nextStep}
            onBack={previousStep}
            isLoading={false}
          />
        );
      
      case 3:
        return (
          <ContextualFactorsForm
            initialData={state.contextualFactors}
            onSubmit={handleFinalSubmit}
            onBack={previousStep}
            isLoading={state.isSubmitting}
          />
        );
      
      default:
        return null;
    }
  };

  const renderCompletionState = () => {
    const completionContainerStyle: React.CSSProperties = {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '32px',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      textAlign: 'center',
      border: '1px solid #f1f3f4'
    };

    const sparklesContainerStyle: React.CSSProperties = {
      marginBottom: '24px'
    };

    const completionTitleStyle: React.CSSProperties = {
      fontSize: '28px',
      fontWeight: '700',
      color: '#2c3e50',
      marginBottom: '12px'
    };

    const completionDescriptionStyle: React.CSSProperties = {
      color: '#6c757d',
      lineHeight: '1.6',
      fontSize: '16px'
    };

    const featuresBoxStyle: React.CSSProperties = {
      background: 'linear-gradient(135deg, #fff5f5 0%, #fef7ff 100%)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid #fce7f3'
    };

    const featuresListStyle: React.CSSProperties = {
      textAlign: 'left',
      fontSize: '14px',
      color: '#6d28d9',
      lineHeight: '1.8'
    };

    const completeButtonStyle: React.CSSProperties = {
      background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
      color: 'white',
      border: 'none',
      padding: '16px 32px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      boxShadow: '0 4px 16px rgba(255, 154, 86, 0.3)'
    };

    return (
      <div style={completionContainerStyle}>
        <div style={sparklesContainerStyle}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <Sparkles style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>
          <h2 style={completionTitleStyle}>
            Your personalization is complete!
          </h2>
          <p style={completionDescriptionStyle}>
            Going Bananas is now customized to your preferences and will provide
            personalized analysis based on your risk tolerance and priorities.
          </p>
        </div>
        
        <div style={featuresBoxStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#6d28d9', marginBottom: '16px' }}>
            What happens next?
          </h3>
          <ul style={featuresListStyle}>
            <li style={{ marginBottom: '8px' }}>• Your analysis will be tailored to your risk preferences</li>
            <li style={{ marginBottom: '8px' }}>• Alerts will match your interruption preferences</li>
            <li style={{ marginBottom: '8px' }}>• Explanations will use your preferred style and detail level</li>
            <li>• The system will learn and adapt to your behavior over time</li>
          </ul>
        </div>

        <button
          onClick={() => window.close()}
          style={completeButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(255, 154, 86, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 154, 86, 0.3)';
          }}
        >
          Start Using Going Bananas
        </button>
      </div>
    );
  };

  // Show completion state if user has already completed
  if (state.currentStep >= STEPS.length) {
    return renderCompletionState();
  }

  const mainContainerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)',
    padding: '32px 0',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const contentWrapperStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px'
  };

  const headerContainerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px'
  };

  const logoContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px'
  };

  const logoIconStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px'
  };

  const headerTitleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937'
  };

  const headerDescriptionStyle: React.CSSProperties = {
    color: '#6b7280',
    maxWidth: '512px',
    margin: '0 auto',
    lineHeight: '1.6'
  };

  const errorContainerStyle: React.CSSProperties = {
    marginBottom: '24px',
    padding: '16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px'
  };

  const errorTitleStyle: React.CSSProperties = {
    color: '#991b1b',
    fontWeight: '500'
  };

  const errorMessageStyle: React.CSSProperties = {
    color: '#b91c1c',
    fontSize: '14px',
    marginTop: '4px'
  };

  const footerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '32px',
    fontSize: '14px',
    color: '#9ca3af'
  };

  return (
    <div style={mainContainerStyle}>
      <div style={contentWrapperStyle}>
        {/* Header */}
        <div style={headerContainerStyle}>
          <div style={logoContainerStyle}>
            <div style={logoIconStyle}>
              <Sparkles style={{ width: '24px', height: '24px', color: 'white' }} />
            </div>
            <h1 style={headerTitleStyle}>Going Bananas Setup</h1>
          </div>
          <p style={headerDescriptionStyle}>
            Help us understand your preferences so we can provide personalized protection 
            and analysis tailored specifically to your needs.
          </p>
        </div>

        {/* Progress Indicator */}
        {renderProgressIndicator()}

        {/* Error Display */}
        {state.error && (
          <div style={errorContainerStyle}>
            <div style={errorTitleStyle}>Error</div>
            <div style={errorMessageStyle}>{state.error}</div>
          </div>
        )}

        {/* Current Step */}
        {renderCurrentStep()}

        {/* Footer */}
        <div style={footerStyle}>
          <p>
            Your data is encrypted and private. We only use this information to 
            customize your Terms & Conditions analysis experience.
          </p>
        </div>
      </div>
    </div>
  );
};