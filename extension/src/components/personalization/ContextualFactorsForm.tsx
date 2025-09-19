/**
 * Contextual Factors Form Component for Personalization
 * 
 * Collects information about user's personal situation, special circumstances,
 * and alert preferences to complete the personalization profile.
 */

import React, { useState } from 'react';
import { Users, Settings, Bell, Target } from 'lucide-react';
import { ContextualFactors } from '@/services/personalizationService';

interface ContextualFactorsFormProps {
  initialData?: Partial<ContextualFactors>;
  onSubmit: (data: ContextualFactors) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

const DEPENDENT_STATUS = [
  { value: 'just_myself', label: 'Just Myself', description: 'Individual decisions affecting only me' },
  { value: 'spouse_partner', label: 'Spouse/Partner', description: 'Shared financial and privacy considerations' },
  { value: 'children_dependents', label: 'Children/Dependents', description: 'Family protection considerations' },
  { value: 'employees_team', label: 'Employees/Team', description: 'Business liability considerations' },
  { value: 'clients_customers', label: 'Clients/Customers', description: 'Professional responsibility considerations' }
] as const;

const SPECIAL_CIRCUMSTANCES = [
  { value: 'small_business_owner', label: 'Small Business Owner', icon: '🏢', description: 'Business liability and employee considerations' },
  { value: 'content_creator', label: 'Content Creator', icon: '🎥', description: 'Intellectual property and platform dependency' },
  { value: 'handles_sensitive_data', label: 'Handle Sensitive Data', icon: '🔒', description: 'Professional data protection requirements' },
  { value: 'frequent_international', label: 'Frequent International Travel', icon: '✈️', description: 'Multi-jurisdiction complications' },
  { value: 'regulated_industry', label: 'Regulated Industry', icon: '⚖️', description: 'Compliance and regulatory requirements' },
  { value: 'accessibility_needs', label: 'Accessibility Needs', icon: '♿', description: 'Interface and communication adaptations needed' }
] as const;

const DECISION_PRIORITIES = [
  { factor: 'privacy_protection', label: 'Privacy Protection', icon: '🔐', description: 'Data security and privacy' },
  { factor: 'cost_value', label: 'Cost & Value', icon: '💰', description: 'Price and value for money' },
  { factor: 'features_functionality', label: 'Features & Functionality', icon: '⚙️', description: 'What the service can do' },
  { factor: 'reputation_reviews', label: 'Reputation & Reviews', icon: '⭐', description: 'Company reputation and user reviews' },
  { factor: 'ease_of_use', label: 'Ease of Use', icon: '👆', description: 'Simple, intuitive interface' },
  { factor: 'customer_support', label: 'Customer Support', icon: '🎧', description: 'Help and support quality' },
  { factor: 'terms_fairness', label: 'Terms Fairness', icon: '📋', description: 'Fair terms and conditions' },
  { factor: 'security_safety', label: 'Security & Safety', icon: '🛡️', description: 'Technical security measures' },
  { factor: 'compliance_legal', label: 'Legal Compliance', icon: '⚖️', description: 'Legal compliance and standards' }
] as const;

const INTERRUPTION_TIMING = [
  { value: 'only_severe', label: 'Only Severe Issues', description: 'Only interrupt me for major risks' },
  { value: 'moderate_and_high', label: 'Moderate & High Risks', description: 'Interrupt for moderate to high risks' },
  { value: 'any_concerning', label: 'Any Concerning Issues', description: 'Interrupt for any concerning terms' },
  { value: 'only_when_committing', label: 'Only When Committing', description: 'Only when signing up or making payments' }
] as const;

const EDUCATIONAL_CONTENT = [
  { value: 'yes_teach_rights', label: 'Yes, Teach My Rights', description: 'I want to learn about my consumer rights' },
  { value: 'occasionally_important', label: 'Occasionally for Important Topics', description: 'Only for important legal concepts' },
  { value: 'just_analysis', label: 'Just Analysis', description: 'Just tell me the risks, no educational content' }
] as const;

export const ContextualFactorsForm: React.FC<ContextualFactorsFormProps> = ({
  initialData,
  onSubmit,
  onBack,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ContextualFactors>({
    dependentStatus: initialData?.dependentStatus || 'just_myself',
    specialCircumstances: initialData?.specialCircumstances || [],
    decisionMakingPriorities: initialData?.decisionMakingPriorities || DECISION_PRIORITIES.map((item, index) => ({
      factor: item.factor as any,
      priority: index + 1
    })),
    alertPreferences: {
      interruptionTiming: initialData?.alertPreferences?.interruptionTiming || 'moderate_and_high',
      educationalContent: initialData?.alertPreferences?.educationalContent || 'occasionally_important',
      alertFrequencyLimit: initialData?.alertPreferences?.alertFrequencyLimit || 10,
      learningMode: initialData?.alertPreferences?.learningMode || true
    }
  });

  const [priorityItems, setPriorityItems] = useState(
    DECISION_PRIORITIES.map((item, index) => ({
      ...item,
      priority: formData.decisionMakingPriorities.find(p => p.factor === item.factor)?.priority || index + 1
    })).sort((a, b) => a.priority - b.priority)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      decisionMakingPriorities: priorityItems.map(item => ({
        factor: item.factor as any,
        priority: item.priority
      }))
    };
    onSubmit(finalData);
  };

  const toggleSpecialCircumstance = (circumstance: string) => {
    setFormData(prev => ({
      ...prev,
      specialCircumstances: prev.specialCircumstances?.includes(circumstance as any)
        ? prev.specialCircumstances.filter(c => c !== circumstance)
        : [...(prev.specialCircumstances || []), circumstance as any]
    }));
  };

  const movePriorityItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...priorityItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newItems.length) {
      // Swap priorities
      const temp = newItems[index].priority;
      newItems[index].priority = newItems[targetIndex].priority;
      newItems[targetIndex].priority = temp;
      
      // Sort by new priorities
      newItems.sort((a, b) => a.priority - b.priority);
      setPriorityItems(newItems);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center mb-6">
        <Settings className="h-6 w-6 text-purple-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Final Preferences</h2>
          <p className="text-gray-600">Just a few more questions to personalize your experience</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Dependent Status */}
        <div>
          <div className="flex items-center mb-3">
            <Users className="h-5 w-5 text-purple-600 mr-2" />
            <label className="block text-sm font-medium text-gray-900">
              Who might be affected by your online service decisions?
            </label>
          </div>
          <div className="space-y-3">
            {DEPENDENT_STATUS.map(({ value, label, description }) => (
              <label key={value} className="relative block">
                <input
                  type="radio"
                  name="dependentStatus"
                  value={value}
                  checked={formData.dependentStatus === value}
                  onChange={(e) => setFormData(prev => ({ ...prev, dependentStatus: e.target.value as any }))}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.dependentStatus === value
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

        {/* Special Circumstances */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Do any of these special circumstances apply to you? (Optional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECIAL_CIRCUMSTANCES.map(({ value, label, icon, description }) => (
              <label key={value} className="relative">
                <input
                  type="checkbox"
                  checked={formData.specialCircumstances?.includes(value) || false}
                  onChange={() => toggleSpecialCircumstance(value)}
                  className="sr-only"
                />
                <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.specialCircumstances?.includes(value)
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

        {/* Decision Making Priorities */}
        <div>
          <div className="flex items-center mb-3">
            <Target className="h-5 w-5 text-purple-600 mr-2" />
            <label className="block text-sm font-medium text-gray-900">
              Rank what matters most to you when choosing online services
            </label>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Drag to reorder or use the arrows. Your top priorities will get more attention in our analysis.
          </p>
          <div className="space-y-2">
            {priorityItems.map((item, index) => (
              <div key={item.factor} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col mr-3">
                  <button
                    type="button"
                    onClick={() => movePriorityItem(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => movePriorityItem(index, 'down')}
                    disabled={index === priorityItems.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex items-center flex-1">
                  <span className="w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center mr-3">
                    {item.priority}
                  </span>
                  <span className="text-lg mr-2">{item.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert Preferences */}
        <div>
          <div className="flex items-center mb-4">
            <Bell className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Alert Preferences</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                When should we interrupt you with alerts?
              </label>
              <div className="space-y-3">
                {INTERRUPTION_TIMING.map(({ value, label, description }) => (
                  <label key={value} className="relative block">
                    <input
                      type="radio"
                      name="interruptionTiming"
                      value={value}
                      checked={formData.alertPreferences.interruptionTiming === value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        alertPreferences: { ...prev.alertPreferences, interruptionTiming: e.target.value as any }
                      }))}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.alertPreferences.interruptionTiming === value
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
                Do you want educational content about your rights?
              </label>
              <div className="space-y-3">
                {EDUCATIONAL_CONTENT.map(({ value, label, description }) => (
                  <label key={value} className="relative block">
                    <input
                      type="radio"
                      name="educationalContent"
                      value={value}
                      checked={formData.alertPreferences.educationalContent === value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        alertPreferences: { ...prev.alertPreferences, educationalContent: e.target.value as any }
                      }))}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.alertPreferences.educationalContent === value
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
                Maximum alerts per day: {formData.alertPreferences.alertFrequencyLimit}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={formData.alertPreferences.alertFrequencyLimit}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  alertPreferences: { ...prev.alertPreferences, alertFrequencyLimit: parseInt(e.target.value) }
                }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1 (Minimal)</span>
                <span>50 (Maximum)</span>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.alertPreferences.learningMode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    alertPreferences: { ...prev.alertPreferences, learningMode: e.target.checked }
                  }))}
                  className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  Enable learning mode (system adapts to your preferences over time)
                </span>
              </label>
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
            Complete Setup
          </button>
        </div>
      </form>
    </div>
  );
};