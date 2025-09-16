// Personalization form component for first-time users
import React, { useState } from 'react';
import { Save, ArrowRight, ArrowLeft, User, Globe, Shield, DollarSign, Scale } from 'lucide-react';
import { PersonalizationData } from '@/types';

interface PersonalizationFormProps {
  onSubmit: (data: PersonalizationData) => Promise<void>;
  onSkip: () => void;
}

const PersonalizationForm: React.FC<PersonalizationFormProps> = ({ onSubmit, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PersonalizationData>({
    demographics: {
      ageRange: '',
      jurisdiction: {
        primaryCountry: '',
        primaryState: '',
        frequentTravel: false,
        isExpatriate: false
      },
      occupation: ''
    },
    digitalBehavior: {
      techSophistication: {
        readingFrequency: '',
        comfortLevel: '',
        preferredExplanationStyle: ''
      },
      usagePatterns: {
        primaryActivities: [],
        signupFrequency: '',
        deviceUsage: ''
      }
    },
    riskPreferences: {
      privacy: {
        overallImportance: '',
        sensitiveDataTypes: [],
        dataProcessingComfort: {
          domesticProcessing: '',
          internationalTransfers: '',
          thirdPartySharing: '',
          aiProcessing: '',
          longTermStorage: ''
        }
      },
      financial: {
        paymentApproach: '',
        feeImpact: '',
        financialSituation: '',
        subscriptionTolerance: {
          autoRenewal: '',
          freeTrialToSubscription: '',
          priceChanges: ''
        }
      },
      legal: {
        arbitrationComfort: '',
        liabilityTolerance: '',
        legalKnowledge: {
          contractLaw: '',
          privacyLaw: '',
          consumerRights: ''
        },
        previousIssues: ''
      }
    },
    contextualFactors: {
      dependentStatus: '',
      specialCircumstances: [],
      decisionMakingPriorities: [],
      alertPreferences: {
        interruptionTiming: '',
        educationalContent: '',
        alertFrequencyLimit: 5,
        learningMode: true
      }
    }
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit personalization:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (section: keyof PersonalizationData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <User className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold">About You</h3>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Age Range
        </label>
        <select
          value={formData.demographics.ageRange}
          onChange={(e) => updateFormData('demographics', 'ageRange', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select your age range</option>
          <option value="under_18">Under 18</option>
          <option value="18_25">18-25</option>
          <option value="26_40">26-40</option>
          <option value="41_55">41-55</option>
          <option value="over_55">Over 55</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Country
        </label>
        <select
          value={formData.demographics.jurisdiction.primaryCountry}
          onChange={(e) => updateFormData('demographics', 'jurisdiction', {
            ...formData.demographics.jurisdiction,
            primaryCountry: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select your country</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="AU">Australia</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Occupation
        </label>
        <select
          value={formData.demographics.occupation}
          onChange={(e) => updateFormData('demographics', 'occupation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select your occupation</option>
          <option value="technology">Technology</option>
          <option value="education">Education</option>
          <option value="healthcare">Healthcare</option>
          <option value="business">Business</option>
          <option value="student">Student</option>
          <option value="retired">Retired</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Globe className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Digital Behavior</h3>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How often do you read terms and conditions?
        </label>
        <select
          value={formData.digitalBehavior.techSophistication.readingFrequency}
          onChange={(e) => updateFormData('digitalBehavior', 'techSophistication', {
            ...formData.digitalBehavior.techSophistication,
            readingFrequency: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select frequency</option>
          <option value="always">Always</option>
          <option value="read_important">Only for important services</option>
          <option value="occasionally">Occasionally</option>
          <option value="rarely">Rarely</option>
          <option value="never">Never</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Technology comfort level
        </label>
        <select
          value={formData.digitalBehavior.techSophistication.comfortLevel}
          onChange={(e) => updateFormData('digitalBehavior', 'techSophistication', {
            ...formData.digitalBehavior.techSophistication,
            comfortLevel: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select comfort level</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preferred explanation style
        </label>
        <select
          value={formData.digitalBehavior.techSophistication.preferredExplanationStyle}
          onChange={(e) => updateFormData('digitalBehavior', 'techSophistication', {
            ...formData.digitalBehavior.techSophistication,
            preferredExplanationStyle: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select style</option>
          <option value="simple_language">Simple, plain language</option>
          <option value="balanced_technical">Balanced with some technical details</option>
          <option value="detailed_technical">Detailed and technical</option>
          <option value="visual_summary">Visual summaries and infographics</option>
        </select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Privacy & Risk Preferences</h3>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How important is privacy to you?
        </label>
        <select
          value={formData.riskPreferences.privacy.overallImportance}
          onChange={(e) => updateFormData('riskPreferences', 'privacy', {
            ...formData.riskPreferences.privacy,
            overallImportance: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select importance</option>
          <option value="extremely_important">Extremely important</option>
          <option value="very_important">Very important</option>
          <option value="moderately_important">Moderately important</option>
          <option value="not_very_important">Not very important</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Financial risk tolerance
        </label>
        <select
          value={formData.riskPreferences.financial.paymentApproach}
          onChange={(e) => updateFormData('riskPreferences', 'financial', {
            ...formData.riskPreferences.financial,
            paymentApproach: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select approach</option>
          <option value="very_cautious">Very cautious</option>
          <option value="cautious">Cautious</option>
          <option value="balanced">Balanced</option>
          <option value="risk_tolerant">Risk tolerant</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Legal knowledge level
        </label>
        <select
          value={formData.riskPreferences.legal.legalKnowledge.contractLaw}
          onChange={(e) => updateFormData('riskPreferences', 'legal', {
            ...formData.riskPreferences.legal,
            legalKnowledge: {
              ...formData.riskPreferences.legal.legalKnowledge,
              contractLaw: e.target.value
            }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select knowledge level</option>
          <option value="none">No knowledge</option>
          <option value="basic">Basic</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Scale className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold">Context & Preferences</h3>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Who else is affected by your decisions?
        </label>
        <select
          value={formData.contextualFactors.dependentStatus}
          onChange={(e) => updateFormData('contextualFactors', 'dependentStatus', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select status</option>
          <option value="individual">Just me</option>
          <option value="spouse_partner">Spouse/Partner</option>
          <option value="family_children">Family with children</option>
          <option value="elderly_dependents">Elderly dependents</option>
          <option value="business_employees">Business/Employees</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alert frequency preference
        </label>
        <select
          value={formData.contextualFactors.alertPreferences.interruptionTiming}
          onChange={(e) => updateFormData('contextualFactors', 'alertPreferences', {
            ...formData.contextualFactors.alertPreferences,
            interruptionTiming: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Select preference</option>
          <option value="high_only">High risk only</option>
          <option value="moderate_and_high">Moderate and high risk</option>
          <option value="all_risks">All risks</option>
          <option value="minimal">Minimal alerts</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="learningMode"
          checked={formData.contextualFactors.alertPreferences.learningMode}
          onChange={(e) => updateFormData('contextualFactors', 'alertPreferences', {
            ...formData.contextualFactors.alertPreferences,
            learningMode: e.target.checked
          })}
          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
        />
        <label htmlFor="learningMode" className="text-sm text-gray-700">
          Enable learning mode (get educational content with alerts)
        </label>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">Personalize Your Experience</h2>
          <span className="text-sm text-gray-500">{currentStep} of {totalSteps}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        {renderCurrentStep()}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Skip for now
        </button>

        <div className="flex space-x-2">
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Complete Setup'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizationForm;