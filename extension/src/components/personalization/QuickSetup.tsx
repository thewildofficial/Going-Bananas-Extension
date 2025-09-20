/**
 * Quick Setup Component - Streamlined Personalization
 * 
 * A fast, intuitive 2-minute setup experience with smart defaults
 * and intelligent suggestions based on user context.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Sparkles, Zap, Shield, Target } from 'lucide-react';
import { createDevLogger } from '@/utils/devLogger';

const devLog = createDevLogger('quick-setup');

interface QuickSetupProps {
  userId: string;
  userData?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  onComplete?: (profile: any) => void;
  onError?: (error: string) => void;
}

interface QuickSetupData {
  riskLevel: 'conservative' | 'balanced' | 'adventurous';
  techLevel: 'simple' | 'detailed' | 'expert';
  focusAreas: string[];
  alertStyle: 'minimal' | 'helpful' | 'comprehensive';
}

const RISK_PROFILES = [
  {
    id: 'conservative',
    title: 'Conservative',
    icon: '🛡️',
    description: 'Maximum protection, detailed analysis',
    details: 'You prefer thorough analysis and want to know about every potential risk',
    color: '#10b981'
  },
  {
    id: 'balanced',
    title: 'Balanced',
    icon: '⚖️',
    description: 'Smart protection, practical insights',
    details: 'You want important risks highlighted with practical advice',
    color: '#3b82f6'
  },
  {
    id: 'adventurous',
    title: 'Adventurous',
    icon: '🚀',
    description: 'Quick insights, focus on major risks',
    details: 'You prefer quick summaries focusing only on significant issues',
    color: '#f59e0b'
  }
];

const TECH_LEVELS = [
  {
    id: 'simple',
    title: 'Simple & Clear',
    description: 'Plain English explanations',
    icon: '📝'
  },
  {
    id: 'detailed',
    title: 'Detailed & Balanced',
    description: 'Mix of simple and technical',
    icon: '📊'
  },
  {
    id: 'expert',
    title: 'Expert & Technical',
    description: 'Technical details and legal analysis',
    icon: '🔬'
  }
];

const FOCUS_AREAS = [
  { id: 'privacy', label: 'Privacy & Data', icon: '🔒', description: 'How your data is used' },
  { id: 'payments', label: 'Payments & Billing', icon: '💳', description: 'Charges and refunds' },
  { id: 'liability', label: 'Liability & Risks', icon: '⚠️', description: 'What you\'re responsible for' },
  { id: 'termination', label: 'Account & Termination', icon: '🚪', description: 'Account closure policies' },
  { id: 'content', label: 'Content & IP', icon: '📄', description: 'Intellectual property rights' },
  { id: 'disputes', label: 'Disputes & Legal', icon: '⚖️', description: 'Legal procedures and arbitration' }
];

const ALERT_STYLES = [
  {
    id: 'minimal',
    title: 'Minimal',
    description: 'Only critical issues',
    icon: '🔕'
  },
  {
    id: 'helpful',
    title: 'Helpful',
    description: 'Important issues with context',
    icon: '🔔'
  },
  {
    id: 'comprehensive',
    title: 'Comprehensive',
    description: 'All issues with detailed explanations',
    icon: '📢'
  }
];

export const QuickSetup: React.FC<QuickSetupProps> = ({
  userId,
  userData,
  onComplete,
  onError
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<QuickSetupData>({
    riskLevel: 'balanced',
    techLevel: 'detailed',
    focusAreas: ['privacy', 'payments'],
    alertStyle: 'helpful'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger fade-in animation on mount and check completion status
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    
    // Check if user has already completed personalization
    const checkCompletion = async () => {
      try {
        const result = await chrome.storage.local.get(['personalizationCompleted', 'computedProfile']);
        if (result.personalizationCompleted && result.computedProfile) {
          devLog.info('User has already completed personalization', { userId });
          onComplete?.(result.computedProfile);
          return;
        }
      } catch (error) {
        devLog.warn('Error checking completion status', { error, userId });
        // Continue with onboarding anyway
      }
    };
    
    checkCompletion();
    return () => clearTimeout(timer);
  }, [userId, onComplete]);

  const steps = [
    { id: 'risk', title: 'Risk Level', description: 'How thorough should we be?' },
    { id: 'tech', title: 'Tech Level', description: 'How technical should explanations be?' },
    { id: 'focus', title: 'Focus Areas', description: 'What matters most to you?' },
    { id: 'alerts', title: 'Alerts', description: 'How often should we notify you?' }
  ];

  const handleRiskSelect = (riskLevel: QuickSetupData['riskLevel']) => {
    setSetupData(prev => ({ ...prev, riskLevel }));
    setTimeout(() => setCurrentStep(1), 300);
  };

  const handleTechSelect = (techLevel: QuickSetupData['techLevel']) => {
    setSetupData(prev => ({ ...prev, techLevel }));
    setTimeout(() => setCurrentStep(2), 300);
  };

  const handleFocusToggle = (areaId: string) => {
    setSetupData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(areaId)
        ? prev.focusAreas.filter(id => id !== areaId)
        : [...prev.focusAreas, areaId]
    }));
  };

  const handleAlertSelect = (alertStyle: QuickSetupData['alertStyle']) => {
    setSetupData(prev => ({ ...prev, alertStyle }));
    setTimeout(() => setCurrentStep(3), 300);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      devLog.info('Completing quick setup', { userId, setupData });
      
      // Convert to the format expected by the backend
      const profile = {
        userId,
        version: '2.0',
        completedAt: new Date().toISOString(),
        quickSetup: setupData,
        // Map to legacy format for compatibility
        demographics: {
          ageRange: '26_40',
          jurisdiction: {
            primaryCountry: 'US',
            primaryState: '',
            frequentTravel: false,
            isExpatriate: false,
            multipleJurisdictions: []
          },
          occupation: 'technology'
        },
        digitalBehavior: {
          techSophistication: {
            readingFrequency: setupData.riskLevel === 'conservative' ? 'read_thoroughly' : 
                            setupData.riskLevel === 'balanced' ? 'read_important' : 'skim_occasionally',
            comfortLevel: setupData.techLevel === 'simple' ? 'beginner' :
                        setupData.techLevel === 'detailed' ? 'intermediate' : 'expert',
            preferredExplanationStyle: setupData.techLevel === 'simple' ? 'simple_language' :
                                      setupData.techLevel === 'detailed' ? 'balanced_technical' : 'technical_detailed'
          },
          usagePatterns: {
            primaryActivities: ['work_productivity', 'social_media'],
            signupFrequency: 'monthly',
            deviceUsage: 'mixed_usage'
          }
        },
        riskPreferences: {
          riskTolerance: setupData.riskLevel,
          priorityAreas: setupData.focusAreas,
          alertPreferences: {
            frequency: setupData.alertStyle,
            interruptionLevel: setupData.alertStyle === 'minimal' ? 'low' :
                              setupData.alertStyle === 'helpful' ? 'medium' : 'high'
          }
        },
        contextualFactors: {
          timeConstraints: setupData.riskLevel === 'adventurous' ? 'high' : 'medium',
          legalSophistication: setupData.techLevel === 'expert' ? 'high' : 'medium',
          privacyConcerns: setupData.focusAreas.includes('privacy') ? 'high' : 'medium'
        }
      };

      // Store in Chrome storage
      await chrome.storage.local.set({
        personalizationCompleted: true,
        personalizationCompletedAt: new Date().toISOString(),
        quickSetupData: setupData,
        computedProfile: {
          profileTags: [setupData.riskLevel, setupData.techLevel, ...setupData.focusAreas],
          riskLevel: setupData.riskLevel,
          techLevel: setupData.techLevel,
          focusAreas: setupData.focusAreas,
          alertStyle: setupData.alertStyle
        }
      });

      devLog.info('Quick setup completed successfully');
      onComplete?.(profile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save your preferences';
      devLog.error('Quick setup failed', { error: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRiskStep = () => (
    <div style={{
      ...stepContainerStyle,
      opacity: isLoaded ? 1 : 0,
      transform: isLoaded ? 'translateY(0)' : 'translateY(30px)',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={stepHeaderStyle}>
        <h2 style={stepTitleStyle}>How thorough should we be?</h2>
        <p style={stepDescriptionStyle}>Choose your risk analysis style</p>
      </div>
      
      <div style={optionsGridStyle}>
        {RISK_PROFILES.map((profile, index) => (
          <button
            key={profile.id}
            onClick={() => handleRiskSelect(profile.id as QuickSetupData['riskLevel'])}
            style={{
              ...optionCardStyle,
              borderColor: setupData.riskLevel === profile.id ? profile.color : '#e5e7eb',
              backgroundColor: setupData.riskLevel === profile.id ? `${profile.color}10` : 'white',
              opacity: isLoaded ? 1 : 0,
              transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`
            }}
            onMouseEnter={(e) => {
              if (setupData.riskLevel !== profile.id) {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (setupData.riskLevel !== profile.id) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
              }
            }}
          >
            <div style={optionIconStyle}>{profile.icon}</div>
            <h3 style={optionTitleStyle}>{profile.title}</h3>
            <p style={optionDescriptionStyle}>{profile.description}</p>
            <p style={optionDetailsStyle}>{profile.details}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTechStep = () => (
    <div style={stepContainerStyle}>
      <div style={stepHeaderStyle}>
        <h2 style={stepTitleStyle}>How technical should explanations be?</h2>
        <p style={stepDescriptionStyle}>Choose your preferred explanation style</p>
      </div>
      
      <div style={optionsListStyle}>
        {TECH_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => handleTechSelect(level.id as QuickSetupData['techLevel'])}
            style={{
              ...optionListItemStyle,
              borderColor: setupData.techLevel === level.id ? '#3b82f6' : '#e5e7eb',
              backgroundColor: setupData.techLevel === level.id ? '#eff6ff' : 'white'
            }}
          >
            <div style={optionIconStyle}>{level.icon}</div>
            <div style={optionContentStyle}>
              <h3 style={optionTitleStyle}>{level.title}</h3>
              <p style={optionDescriptionStyle}>{level.description}</p>
            </div>
            {setupData.techLevel === level.id && (
              <CheckCircle style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const renderFocusStep = () => (
    <div style={stepContainerStyle}>
      <div style={stepHeaderStyle}>
        <h2 style={stepTitleStyle}>What matters most to you?</h2>
        <p style={stepDescriptionStyle}>Select the areas you care about (choose 2-4)</p>
      </div>
      
      <div style={focusGridStyle}>
        {FOCUS_AREAS.map((area) => (
          <button
            key={area.id}
            onClick={() => handleFocusToggle(area.id)}
            style={{
              ...focusCardStyle,
              borderColor: setupData.focusAreas.includes(area.id) ? '#3b82f6' : '#e5e7eb',
              backgroundColor: setupData.focusAreas.includes(area.id) ? '#eff6ff' : 'white'
            }}
          >
            <div style={focusIconStyle}>{area.icon}</div>
            <h3 style={focusTitleStyle}>{area.label}</h3>
            <p style={focusDescriptionStyle}>{area.description}</p>
            {setupData.focusAreas.includes(area.id) && (
              <div style={selectedIndicatorStyle}>
                <CheckCircle style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div style={focusFooterStyle}>
        <p style={focusFooterTextStyle}>
          Selected: {setupData.focusAreas.length} areas
        </p>
        {setupData.focusAreas.length >= 2 && (
          <button
            onClick={() => setCurrentStep(3)}
            style={continueButtonStyle}
          >
            Continue
            <ArrowRight style={{ width: '16px', height: '16px', marginLeft: '8px' }} />
          </button>
        )}
      </div>
    </div>
  );

  const renderAlertsStep = () => (
    <div style={stepContainerStyle}>
      <div style={stepHeaderStyle}>
        <h2 style={stepTitleStyle}>How often should we notify you?</h2>
        <p style={stepDescriptionStyle}>Choose your alert frequency</p>
      </div>
      
      <div style={optionsListStyle}>
        {ALERT_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => handleAlertSelect(style.id as QuickSetupData['alertStyle'])}
            style={{
              ...optionListItemStyle,
              borderColor: setupData.alertStyle === style.id ? '#3b82f6' : '#e5e7eb',
              backgroundColor: setupData.alertStyle === style.id ? '#eff6ff' : 'white'
            }}
          >
            <div style={optionIconStyle}>{style.icon}</div>
            <div style={optionContentStyle}>
              <h3 style={optionTitleStyle}>{style.title}</h3>
              <p style={optionDescriptionStyle}>{style.description}</p>
            </div>
            {setupData.alertStyle === style.id && (
              <CheckCircle style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
            )}
          </button>
        ))}
      </div>
      
      <button
        onClick={handleComplete}
        disabled={isSubmitting}
        style={{
          ...completeButtonStyle,
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }}
      >
        {isSubmitting ? (
          <>
            <div style={spinnerStyle} />
            Setting up...
          </>
        ) : (
          <>
            Complete Setup
            <Sparkles style={{ width: '16px', height: '16px', marginLeft: '8px' }} />
          </>
        )}
      </button>
    </div>
  );

  const renderCompletionStep = () => (
    <div style={completionContainerStyle}>
      <div style={completionIconStyle}>
        <Sparkles style={{ width: '48px', height: '48px', color: 'white' }} />
      </div>
      <h2 style={completionTitleStyle}>Setup Complete! 🎉</h2>
      <p style={completionDescriptionStyle}>
        Going Bananas is now personalized for you. We'll provide analysis tailored to your preferences.
      </p>
      
      <div style={summaryContainerStyle}>
        <h3 style={summaryTitleStyle}>Your Preferences:</h3>
        <div style={summaryGridStyle}>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Risk Level:</span>
            <span style={summaryValueStyle}>{RISK_PROFILES.find(p => p.id === setupData.riskLevel)?.title}</span>
          </div>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Tech Level:</span>
            <span style={summaryValueStyle}>{TECH_LEVELS.find(t => t.id === setupData.techLevel)?.title}</span>
          </div>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Focus Areas:</span>
            <span style={summaryValueStyle}>{setupData.focusAreas.length} selected</span>
          </div>
          <div style={summaryItemStyle}>
            <span style={summaryLabelStyle}>Alerts:</span>
            <span style={summaryValueStyle}>{ALERT_STYLES.find(a => a.id === setupData.alertStyle)?.title}</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => window.close()}
        style={finalButtonStyle}
      >
        Start Using Going Bananas
      </button>
    </div>
  );

  // Styles
  const mainContainerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '24px'
  };

  const welcomeContainerStyle: React.CSSProperties = {
    marginTop: '8px'
  };

  const welcomeTextStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px'
  };

  const logoIconStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px'
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '16px'
  };

  const progressStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px',
    gap: '12px'
  };

  const progressStepStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    transition: 'all 0.3s ease'
  };

  const stepContainerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    border: '1px solid #f1f5f9',
    minHeight: '500px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const stepHeaderStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px'
  };

  const stepTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '8px'
  };

  const stepDescriptionStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '16px'
  };

  const optionsGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    maxWidth: '800px',
    margin: '0 auto'
  };

  const optionsListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '600px',
    margin: '0 auto'
  };

  const optionCardStyle: React.CSSProperties = {
    padding: '32px',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '200px',
    justifyContent: 'center'
  };

  const optionListItemStyle: React.CSSProperties = {
    padding: '24px',
    border: '2px solid #e5e7eb',
    borderRadius: '16px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    minHeight: '80px'
  };

  const optionIconStyle: React.CSSProperties = {
    fontSize: '32px',
    marginBottom: '12px'
  };

  const optionContentStyle: React.CSSProperties = {
    flex: 1,
    textAlign: 'left'
  };

  const optionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  };

  const optionDescriptionStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '8px'
  };

  const optionDetailsStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '1.4'
  };

  const focusGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
    maxWidth: '800px',
    margin: '0 auto 32px auto'
  };

  const focusCardStyle: React.CSSProperties = {
    padding: '20px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'center',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '120px',
    justifyContent: 'center'
  };

  const focusIconStyle: React.CSSProperties = {
    fontSize: '24px',
    marginBottom: '8px'
  };

  const focusTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px'
  };

  const focusDescriptionStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '12px',
    lineHeight: '1.3'
  };

  const selectedIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '8px'
  };

  const focusFooterStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9'
  };

  const focusFooterTextStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: '500'
  };

  const continueButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: '24px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(255, 154, 86, 0.3)'
  };

  const spinnerStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  };

  const completionContainerStyle: React.CSSProperties = {
    maxWidth: '500px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    textAlign: 'center',
    border: '1px solid #f1f5f9'
  };

  const completionIconStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px auto'
  };

  const completionTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '12px'
  };

  const completionDescriptionStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '32px'
  };

  const summaryContainerStyle: React.CSSProperties = {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    textAlign: 'left'
  };

  const summaryTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px',
    textAlign: 'center'
  };

  const summaryGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  };

  const summaryItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const summaryLabelStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '14px'
  };

  const summaryValueStyle: React.CSSProperties = {
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: '500'
  };

  const finalButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(255, 154, 86, 0.3)',
    width: '100%'
  };

  return (
    <div style={{
      ...mainContainerStyle,
      opacity: isLoaded ? 1 : 0,
      transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={headerStyle}>
        <div style={logoStyle}>
          <div style={logoIconStyle}>
            <Sparkles style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <h1 style={titleStyle}>Quick Setup</h1>
        </div>
        <div style={welcomeContainerStyle}>
          <p style={welcomeTextStyle}>
            Welcome{userData?.name ? `, ${userData.name}` : ''}! 
          </p>
          <p style={subtitleStyle}>Let's personalize Going Bananas in 2 minutes</p>
        </div>
      </div>

      <div style={progressStyle}>
        {steps.map((_, index) => (
          <div
            key={index}
            style={{
              ...progressStepStyle,
              backgroundColor: index <= currentStep ? '#3b82f6' : '#e5e7eb'
            }}
          />
        ))}
      </div>

      {currentStep === 0 && renderRiskStep()}
      {currentStep === 1 && renderTechStep()}
      {currentStep === 2 && renderFocusStep()}
      {currentStep === 3 && renderAlertsStep()}
      {currentStep === 4 && renderCompletionStep()}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};