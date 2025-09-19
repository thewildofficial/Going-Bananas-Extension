/**
 * Digital Behavior Form Component for Personalization
 * 
 * Collects information about user's technology sophistication,
 * usage patterns, and preferred explanation styles.
 */

import React, { useState } from 'react';
import { Monitor, Smartphone, Activity, Book } from 'lucide-react';
import { DigitalBehavior } from '@/services/personalizationService';

interface DigitalBehaviorFormProps {
  initialData?: Partial<DigitalBehavior>;
  onSubmit: (data: DigitalBehavior) => void;
  onNext?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

const READING_FREQUENCY = [
  { value: 'never', label: 'Never read them', description: 'I always skip Terms & Privacy policies' },
  { value: 'skim_occasionally', label: 'Skim occasionally', description: 'I quickly scan for anything obvious' },
  { value: 'read_important', label: 'Read important sections', description: 'I focus on key parts like privacy and payments' },
  { value: 'read_thoroughly', label: 'Read thoroughly', description: 'I read through most or all of the document' }
] as const;

const COMFORT_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'I prefer simple, non-technical explanations' },
  { value: 'intermediate', label: 'Intermediate', description: 'I can handle some technical terms with explanations' },
  { value: 'advanced', label: 'Advanced', description: 'I understand technical details and legal concepts' },
  { value: 'expert', label: 'Expert', description: 'I prefer concise, technical analysis' }
] as const;

const EXPLANATION_STYLES = [
  { value: 'simple_language', label: 'Plain English', description: 'Simple, everyday language' },
  { value: 'balanced_technical', label: 'Balanced Approach', description: 'Mix of plain language and technical details' },
  { value: 'technical_detailed', label: 'Technical Details', description: 'Detailed legal and technical explanations' },
  { value: 'bullet_summaries', label: 'Quick Bullets', description: 'Concise bullet-point summaries' },
  { value: 'comprehensive_analysis', label: 'Full Analysis', description: 'Comprehensive analysis with examples' }
] as const;

const PRIMARY_ACTIVITIES = [
  { value: 'social_media', label: 'Social Media', icon: '📱', description: 'Privacy and content sharing' },
  { value: 'work_productivity', label: 'Work & Productivity', icon: '💼', description: 'Business apps and collaboration' },
  { value: 'shopping_financial', label: 'Shopping & Finance', icon: '💳', description: 'E-commerce and banking' },
  { value: 'research_learning', label: 'Research & Learning', icon: '📚', description: 'Information and education' },
  { value: 'creative_content', label: 'Creative Content', icon: '🎨', description: 'Design, photo, video creation' },
  { value: 'gaming', label: 'Gaming', icon: '🎮', description: 'Online gaming and entertainment' },
  { value: 'dating_relationships', label: 'Dating & Social', icon: '💕', description: 'Dating apps and social connections' },
  { value: 'healthcare_medical', label: 'Healthcare', icon: '🏥', description: 'Health and medical services' },
  { value: 'travel_booking', label: 'Travel & Booking', icon: '✈️', description: 'Travel and event booking' },
  { value: 'education_courses', label: 'Online Courses', icon: '🎓', description: 'Online learning and certification' }
] as const;

const SIGNUP_FREQUENCY = [
  { value: 'multiple_weekly', label: 'Multiple times per week', description: 'High exposure - need quick, efficient analysis' },
  { value: 'weekly', label: 'About once per week', description: 'Regular exposure - standard protection' },
  { value: 'monthly', label: 'Few times per month', description: 'Moderate exposure - detailed analysis when needed' },
  { value: 'rarely', label: 'Rarely sign up', description: 'Low exposure - comprehensive protection' }
] as const;

const DEVICE_USAGE = [
  { value: 'mobile_primary', label: 'Primarily Mobile', icon: <Smartphone className="h-5 w-5" />, description: 'Phone or tablet is my main device' },
  { value: 'desktop_primary', label: 'Primarily Desktop', icon: <Monitor className="h-5 w-5" />, description: 'Laptop or desktop computer is my main device' },
  { value: 'tablet_primary', label: 'Primarily Tablet', icon: <Monitor className="h-5 w-5" />, description: 'Tablet is my main device' },
  { value: 'mixed_usage', label: 'Mixed Usage', icon: <Activity className="h-5 w-5" />, description: 'I use different devices equally' }
] as const;

export const DigitalBehaviorForm: React.FC<DigitalBehaviorFormProps> = ({
  initialData,
  onSubmit,
  onNext,
  onBack,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<DigitalBehavior>({
    techSophistication: {
      readingFrequency: initialData?.techSophistication?.readingFrequency || 'read_important',
      comfortLevel: initialData?.techSophistication?.comfortLevel || 'intermediate',
      preferredExplanationStyle: initialData?.techSophistication?.preferredExplanationStyle || 'balanced_technical'
    },
    usagePatterns: {
      primaryActivities: initialData?.usagePatterns?.primaryActivities || ['work_productivity', 'social_media'],
      signupFrequency: initialData?.usagePatterns?.signupFrequency || 'monthly',
      deviceUsage: initialData?.usagePatterns?.deviceUsage || 'mixed_usage'
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onNext?.();
  };

  const updateTechSophistication = (field: keyof DigitalBehavior['techSophistication'], value: any) => {
    setFormData(prev => ({
      ...prev,
      techSophistication: {
        ...prev.techSophistication,
        [field]: value
      }
    }));
  };

  const updateUsagePatterns = (field: keyof DigitalBehavior['usagePatterns'], value: any) => {
    setFormData(prev => ({
      ...prev,
      usagePatterns: {
        ...prev.usagePatterns,
        [field]: value
      }
    }));
  };

  const toggleActivity = (activity: string) => {
    const currentActivities = formData.usagePatterns.primaryActivities;
    let newActivities;
    
    if (currentActivities.includes(activity as any)) {
      newActivities = currentActivities.filter(a => a !== activity);
    } else {
      if (currentActivities.length < 5) {
        newActivities = [...currentActivities, activity as any];
      } else {
        return; // Don't add if already at max
      }
    }
    
    updateUsagePatterns('primaryActivities', newActivities);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center mb-6">
        <Activity className="h-6 w-6 text-purple-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Digital Behavior</h2>
          <p className="text-gray-600">Tell us about your technology usage and preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Reading Frequency */}
        <div>
          <div className="flex items-center mb-3">
            <Book className="h-5 w-5 text-purple-600 mr-2" />
            <label className="block text-sm font-medium text-gray-900">
              How often do you read Terms of Service and Privacy Policies?
            </label>
          </div>
          <div className="space-y-3">
            {READING_FREQUENCY.map(({ value, label, description }) => (
              <label key={value} className="relative block">
                <input
                  type="radio"
                  name="readingFrequency"
                  value={value}
                  checked={formData.techSophistication.readingFrequency === value}
                  onChange={(e) => updateTechSophistication('readingFrequency', e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.techSophistication.readingFrequency === value
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

        {/* Technical Comfort Level */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            How comfortable are you with technical and legal language?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMFORT_LEVELS.map(({ value, label, description }) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  name="comfortLevel"
                  value={value}
                  checked={formData.techSophistication.comfortLevel === value}
                  onChange={(e) => updateTechSophistication('comfortLevel', e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.techSophistication.comfortLevel === value
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

        {/* Preferred Explanation Style */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            How would you like risks and issues explained to you?
          </label>
          <div className="space-y-3">
            {EXPLANATION_STYLES.map(({ value, label, description }) => (
              <label key={value} className="relative block">
                <input
                  type="radio"
                  name="explanationStyle"
                  value={value}
                  checked={formData.techSophistication.preferredExplanationStyle === value}
                  onChange={(e) => updateTechSophistication('preferredExplanationStyle', e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.techSophistication.preferredExplanationStyle === value
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

        {/* Primary Activities */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            What are your primary online activities? (Select up to 5)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRIMARY_ACTIVITIES.map(({ value, label, icon, description }) => (
              <label key={value} className="relative">
                <input
                  type="checkbox"
                  checked={formData.usagePatterns.primaryActivities.includes(value)}
                  onChange={() => toggleActivity(value)}
                  disabled={
                    !formData.usagePatterns.primaryActivities.includes(value) && 
                    formData.usagePatterns.primaryActivities.length >= 5
                  }
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.usagePatterns.primaryActivities.includes(value)
                    ? 'border-purple-500 bg-purple-50'
                    : formData.usagePatterns.primaryActivities.length >= 5
                    ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{description}</div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Selected: {formData.usagePatterns.primaryActivities.length}/5
          </div>
        </div>

        {/* Signup Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            How often do you sign up for new online services?
          </label>
          <div className="space-y-3">
            {SIGNUP_FREQUENCY.map(({ value, label, description }) => (
              <label key={value} className="relative block">
                <input
                  type="radio"
                  name="signupFrequency"
                  value={value}
                  checked={formData.usagePatterns.signupFrequency === value}
                  onChange={(e) => updateUsagePatterns('signupFrequency', e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.usagePatterns.signupFrequency === value
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

        {/* Device Usage */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            What devices do you primarily use?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEVICE_USAGE.map(({ value, label, icon, description }) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  name="deviceUsage"
                  value={value}
                  checked={formData.usagePatterns.deviceUsage === value}
                  onChange={(e) => updateUsagePatterns('deviceUsage', e.target.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.usagePatterns.deviceUsage === value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <div className="flex items-center">
                    <div className="text-purple-600 mr-3">{icon}</div>
                    <div>
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-sm text-gray-500">{description}</div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
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
            disabled={isLoading || formData.usagePatterns.primaryActivities.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            ) : null}
            Continue to Risk Preferences
          </button>
        </div>
      </form>
    </div>
  );
};