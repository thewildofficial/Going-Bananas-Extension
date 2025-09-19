/**
 * Demographics Form Component for Personalization
 * 
 * Collects user demographic information including age range,
 * jurisdiction, and occupation for risk analysis customization.
 */

import React, { useState } from 'react';
import { User, MapPin, Briefcase } from 'lucide-react';
import { Demographics } from '@/services/personalizationService';

interface DemographicsFormProps {
  initialData?: Partial<Demographics>;
  onSubmit: (data: Demographics) => void;
  onNext?: () => void;
  isLoading?: boolean;
}

const AGE_RANGES = [
  { value: 'under_18', label: 'Under 18', description: 'Special protections apply' },
  { value: '18_25', label: '18-25', description: 'Digital native generation' },
  { value: '26_40', label: '26-40', description: 'Peak earning years' },
  { value: '41_55', label: '41-55', description: 'Established career' },
  { value: 'over_55', label: 'Over 55', description: 'Experience focused' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', description: '' }
] as const;

const OCCUPATIONS = [
  { value: 'legal_compliance', label: 'Legal & Compliance', description: 'Legal, regulatory, compliance roles' },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical, nursing, healthcare services' },
  { value: 'financial_services', label: 'Financial Services', description: 'Banking, finance, accounting' },
  { value: 'technology', label: 'Technology', description: 'Software, IT, engineering' },
  { value: 'education', label: 'Education', description: 'Teaching, research, academia' },
  { value: 'creative_freelancer', label: 'Creative & Freelance', description: 'Design, writing, creative work' },
  { value: 'student', label: 'Student', description: 'Full-time student' },
  { value: 'retired', label: 'Retired', description: 'Retired from work' },
  { value: 'business_owner', label: 'Business Owner', description: 'Entrepreneur, business owner' },
  { value: 'government', label: 'Government', description: 'Public sector, civil service' },
  { value: 'nonprofit', label: 'Nonprofit', description: 'NGO, charity, nonprofit work' },
  { value: 'other', label: 'Other', description: 'Other profession' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', description: '' }
] as const;

const COUNTRIES = [
  { code: 'US', name: 'United States', hasStates: true },
  { code: 'CA', name: 'Canada', hasStates: true },
  { code: 'GB', name: 'United Kingdom', hasStates: false },
  { code: 'DE', name: 'Germany', hasStates: false },
  { code: 'FR', name: 'France', hasStates: false },
  { code: 'AU', name: 'Australia', hasStates: true },
  { code: 'JP', name: 'Japan', hasStates: false },
  { code: 'KR', name: 'South Korea', hasStates: false },
  { code: 'IN', name: 'India', hasStates: true },
  { code: 'BR', name: 'Brazil', hasStates: true }
] as const;

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const DemographicsForm: React.FC<DemographicsFormProps> = ({
  initialData,
  onSubmit,
  onNext,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Demographics>({
    ageRange: initialData?.ageRange || '26_40',
    jurisdiction: {
      primaryCountry: initialData?.jurisdiction?.primaryCountry || 'US',
      primaryState: initialData?.jurisdiction?.primaryState || '',
      frequentTravel: initialData?.jurisdiction?.frequentTravel || false,
      isExpatriate: initialData?.jurisdiction?.isExpatriate || false,
      multipleJurisdictions: initialData?.jurisdiction?.multipleJurisdictions || []
    },
    occupation: initialData?.occupation || 'technology'
  });

  const selectedCountry = COUNTRIES.find(c => c.code === formData.jurisdiction.primaryCountry);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onNext?.();
  };

  const updateJurisdiction = (field: keyof Demographics['jurisdiction'], value: any) => {
    setFormData(prev => ({
      ...prev,
      jurisdiction: {
        ...prev.jurisdiction,
        [field]: value
      }
    }));
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    border: '1px solid #f1f3f4'
  };

  const headerContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px'
  };

  const headerIconStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    color: '#a855f7',
    marginRight: '12px'
  };

  const headerTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '4px'
  };

  const headerDescriptionStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '14px'
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px'
  };

  return (
    <div style={containerStyle}>
      <div style={headerContainerStyle}>
        <User style={headerIconStyle} />
        <div>
          <h2 style={headerTitleStyle}>About You</h2>
          <p style={headerDescriptionStyle}>Help us understand your background for better protection</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        {/* Age Range */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            What's your age range?
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            {AGE_RANGES.map(({ value, label, description }) => (
              <label key={value} style={{ position: 'relative' }}>
                <input
                  type="radio"
                  name="ageRange"
                  value={value}
                  checked={formData.ageRange === value}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageRange: e.target.value as any }))}
                  style={{ 
                    position: 'absolute',
                    left: '-9999px',
                    opacity: 0 
                  }}
                />
                <div style={{
                  padding: '16px',
                  border: formData.ageRange === value ? '2px solid #a855f7' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: formData.ageRange === value ? '#faf5ff' : 'white'
                }}>
                  <div style={{
                    fontWeight: '500',
                    color: '#1f2937'
                  }}>{label}</div>
                  {description && (
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginTop: '4px'
                    }}>{description}</div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Location & Jurisdiction */}
        <div>
          <div className="flex items-center mb-3">
            <MapPin className="h-5 w-5 text-purple-600 mr-2" />
            <label className="block text-sm font-medium text-gray-900">
              Where are you located?
            </label>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Country
              </label>
              <select
                value={formData.jurisdiction.primaryCountry}
                onChange={(e) => updateJurisdiction('primaryCountry', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {COUNTRIES.map(({ code, name }) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            {selectedCountry?.hasStates && formData.jurisdiction.primaryCountry === 'US' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <select
                  value={formData.jurisdiction.primaryState || ''}
                  onChange={(e) => updateJurisdiction('primaryState', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select a state</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.jurisdiction.frequentTravel}
                  onChange={(e) => updateJurisdiction('frequentTravel', e.target.checked)}
                  className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">I travel internationally frequently</span>
              </label>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.jurisdiction.isExpatriate}
                  onChange={(e) => updateJurisdiction('isExpatriate', e.target.checked)}
                  className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">I'm living outside my home country</span>
              </label>
            </div>
          </div>
        </div>

        {/* Occupation */}
        <div>
          <div className="flex items-center mb-3">
            <Briefcase className="h-5 w-5 text-purple-600 mr-2" />
            <label className="block text-sm font-medium text-gray-900">
              What best describes your profession?
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {OCCUPATIONS.map(({ value, label, description }) => (
              <label key={value} className="relative">
                <input
                  type="radio"
                  name="occupation"
                  value={value}
                  checked={formData.occupation === value}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value as any }))}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.occupation === value
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
          ) : null}
          Continue to Digital Behavior
        </button>
      </form>
    </div>
  );
};