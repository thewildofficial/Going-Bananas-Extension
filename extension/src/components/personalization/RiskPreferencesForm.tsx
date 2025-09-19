/**
 * Risk Preferences Form Component for Personalization
 * 
 * Collects information about user's privacy, financial, and legal risk preferences.
 * This is a simplified version focusing on the most essential preferences.
 */

import React, { useState } from 'react';
import { Shield, DollarSign, Scale, Lock } from 'lucide-react';
import { RiskPreferences } from '@/services/personalizationService';

interface RiskPreferencesFormProps {
  initialData?: Partial<RiskPreferences>;
  onSubmit: (data: RiskPreferences) => void;
  onNext?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

const PRIVACY_IMPORTANCE = [
  { value: 'extremely_important', label: 'Extremely Important', description: 'Privacy is my top priority - warn me about everything' },
  { value: 'very_important', label: 'Very Important', description: 'Privacy matters a lot - warn me about significant issues' },
  { value: 'moderately_important', label: 'Moderately Important', description: 'Privacy is important but not my main concern' },
  { value: 'not_very_important', label: 'Not Very Important', description: 'Convenience is more important than privacy' }
] as const;

const SENSITIVE_DATA_TYPES = [
  { type: 'financial_information', label: 'Financial Information', icon: '💳', description: 'Bank details, credit cards, payment info' },
  { type: 'personal_communications', label: 'Personal Communications', icon: '💬', description: 'Messages, emails, call logs' },
  { type: 'location_data', label: 'Location Data', icon: '📍', description: 'Where you are, where you go' },
  { type: 'browsing_habits', label: 'Browsing Habits', icon: '🔍', description: 'What you search and visit online' },
  { type: 'photos_media', label: 'Photos & Media', icon: '📸', description: 'Pictures, videos, personal media' },
  { type: 'professional_information', label: 'Professional Info', icon: '💼', description: 'Work details, LinkedIn data' },
  { type: 'health_data', label: 'Health Data', icon: '🏥', description: 'Medical records, fitness data' },
  { type: 'social_connections', label: 'Social Connections', icon: '👥', description: 'Friends, family, social networks' }
] as const;

const PAYMENT_APPROACHES = [
  { value: 'very_cautious', label: 'Very Cautious', description: 'I read all payment terms and want strict validation' },
  { value: 'cautious', label: 'Cautious', description: 'I check for major payment issues and want standard protection' },
  { value: 'moderate', label: 'Moderate', description: 'I trust established brands with basic payment protection' },
  { value: 'relaxed', label: 'Relaxed', description: 'I prioritize convenience and need minimal payment warnings' }
] as const;

const FEE_IMPACTS = [
  { value: 'significant', label: 'Significant Impact', description: 'Budget-conscious - I need warnings about all fees' },
  { value: 'moderate', label: 'Moderate Impact', description: 'I want to know about fees but they\'re not a major concern' },
  { value: 'minimal', label: 'Minimal Impact', description: 'Fees aren\'t a major concern for me' }
] as const;

const FINANCIAL_SITUATIONS = [
  { value: 'student_limited', label: 'Student/Limited Income', description: 'Need maximum protection from unexpected costs' },
  { value: 'stable_employment', label: 'Stable Employment', description: 'Standard financial protection' },
  { value: 'high_income', label: 'High Income', description: 'Can tolerate some financial risk' },
  { value: 'business_owner', label: 'Business Owner', description: 'Different liability considerations' },
  { value: 'retired_fixed', label: 'Retired/Fixed Income', description: 'Budget-conscious, scam-aware' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', description: '' }
] as const;

const LEGAL_KNOWLEDGE_LEVELS = [
  { value: 'none', label: 'None', description: 'No legal background' },
  { value: 'basic', label: 'Basic', description: 'Some understanding' },
  { value: 'intermediate', label: 'Intermediate', description: 'Good understanding' },
  { value: 'expert', label: 'Expert', description: 'Professional knowledge' }
] as const;

const PREVIOUS_ISSUES = [
  { value: 'no_issues', label: 'No Issues', description: 'Never had problems with online services' },
  { value: 'minor_problems', label: 'Minor Problems', description: 'Billing issues, account access problems' },
  { value: 'moderate_problems', label: 'Moderate Problems', description: 'Unexpected charges, data privacy issues' },
  { value: 'serious_problems', label: 'Serious Problems', description: 'Fraud, legal issues, or major losses' }
] as const;

export const RiskPreferencesForm: React.FC<RiskPreferencesFormProps> = ({
  initialData,
  onSubmit,
  onNext,
  onBack,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<RiskPreferences>({
    privacy: {
      overallImportance: initialData?.privacy?.overallImportance || 'very_important',
      sensitiveDataTypes: initialData?.privacy?.sensitiveDataTypes || [
        { dataType: 'financial_information', priorityLevel: 1 },
        { dataType: 'personal_communications', priorityLevel: 2 },
        { dataType: 'location_data', priorityLevel: 3 },
        { dataType: 'photos_media', priorityLevel: 4 }
      ],
      dataProcessingComfort: initialData?.privacy?.dataProcessingComfort || {
        domesticProcessing: 'cautious',
        internationalTransfers: 'cautious',
        thirdPartySharing: 'uncomfortable',
        aiProcessing: 'cautious',
        longTermStorage: 'cautious'
      }
    },
    financial: {
      paymentApproach: initialData?.financial?.paymentApproach || 'cautious',
      feeImpact: initialData?.financial?.feeImpact || 'moderate',
      financialSituation: initialData?.financial?.financialSituation || 'stable_employment',
      subscriptionTolerance: initialData?.financial?.subscriptionTolerance || {
        autoRenewal: 'cautious',
        freeTrialToSubscription: 'cautious',
        priceChanges: 'reasonable_notice'
      }
    },
    legal: {
      arbitrationComfort: initialData?.legal?.arbitrationComfort || 'prefer_courts',
      liabilityTolerance: initialData?.legal?.liabilityTolerance || 'reasonable_limitations',
      legalKnowledge: initialData?.legal?.legalKnowledge || {
        contractLaw: 'basic',
        privacyLaw: 'basic',
        consumerRights: 'basic'
      },
      previousIssues: initialData?.legal?.previousIssues || 'no_issues'
    }
  });

  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(
    formData.privacy.sensitiveDataTypes.map(item => item.dataType)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update sensitive data types before submitting
    const updatedFormData = {
      ...formData,
      privacy: {
        ...formData.privacy,
        sensitiveDataTypes: selectedDataTypes.map((dataType, index) => ({
          dataType: dataType as any,
          priorityLevel: index + 1
        }))
      }
    };
    onSubmit(updatedFormData);
    onNext?.();
  };

  const toggleDataType = (dataType: string) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(dataType)) {
        return prev.filter(type => type !== dataType);
      } else {
        return [...prev, dataType];
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center mb-6">
        <Shield className="h-6 w-6 text-purple-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Risk Preferences</h2>
          <p className="text-gray-600">Help us understand what matters most to you</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Privacy Preferences */}
        <div>
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Privacy Preferences</h3>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              How important is privacy to you?
            </label>
            <div className="space-y-3">
              {PRIVACY_IMPORTANCE.map(({ value, label, description }) => (
                <label key={value} className="relative block">
                  <input
                    type="radio"
                    name="privacyImportance"
                    value={value}
                    checked={formData.privacy.overallImportance === value}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      privacy: { ...prev.privacy, overallImportance: e.target.value as any }
                    }))}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.privacy.overallImportance === value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-sm text-gray-500 mt-1">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Which types of personal data are you most concerned about? (Select any that apply)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SENSITIVE_DATA_TYPES.map(({ type, label, icon, description }) => (
                <label key={type} className="relative">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes(type)}
                    onChange={() => toggleDataType(type)}
                    className="sr-only"
                  />
                  <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedDataTypes.includes(type)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-start">
                      <span className="text-lg mr-2">{icon}</span>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{label}</div>
                        <div className="text-xs text-gray-500 mt-1">{description}</div>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Preferences */}
        <div>
          <div className="flex items-center mb-4">
            <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Financial Preferences</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                How do you approach online payments?
              </label>
              <div className="space-y-3">
                {PAYMENT_APPROACHES.map(({ value, label, description }) => (
                  <label key={value} className="relative block">
                    <input
                      type="radio"
                      name="paymentApproach"
                      value={value}
                      checked={formData.financial.paymentApproach === value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        financial: { ...prev.financial, paymentApproach: e.target.value as any }
                      }))}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.financial.paymentApproach === value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500 mt-1">{description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                What best describes your financial situation?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FINANCIAL_SITUATIONS.map(({ value, label, description }) => (
                  <label key={value} className="relative">
                    <input
                      type="radio"
                      name="financialSituation"
                      value={value}
                      checked={formData.financial.financialSituation === value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        financial: { ...prev.financial, financialSituation: e.target.value as any }
                      }))}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.financial.financialSituation === value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{label}</div>
                      {description && (
                        <div className="text-sm text-gray-500 mt-1">{description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legal Experience */}
        <div>
          <div className="flex items-center mb-4">
            <Scale className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Legal Experience</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                How would you rate your legal knowledge?
              </label>
              <div className="grid grid-cols-2 gap-4">
                {LEGAL_KNOWLEDGE_LEVELS.map(({ value, label, description }) => (
                  <label key={value} className="relative">
                    <input
                      type="radio"
                      name="legalKnowledge"
                      value={value}
                      checked={formData.legal.legalKnowledge.contractLaw === value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        legal: {
                          ...prev.legal,
                          legalKnowledge: {
                            contractLaw: e.target.value as any,
                            privacyLaw: e.target.value as any,
                            consumerRights: e.target.value as any
                          }
                        }
                      }))}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.legal.legalKnowledge.contractLaw === value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500 mt-1">{description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Have you ever had problems with online services?
              </label>
              <div className="space-y-3">
                {PREVIOUS_ISSUES.map(({ value, label, description }) => (
                  <label key={value} className="relative block">
                    <input
                      type="radio"
                      name="previousIssues"
                      value={value}
                      checked={formData.legal.previousIssues === value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        legal: { ...prev.legal, previousIssues: e.target.value as any }
                      }))}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.legal.previousIssues === value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500 mt-1">{description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : null}
            Continue to Final Step
          </button>
        </div>
      </form>
    </div>
  );
};