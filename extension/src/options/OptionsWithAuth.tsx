// Enhanced Options Page with Authentication
import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/utils/chrome';
import { ExtensionSettings } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/LoginButton';
import { Save, RotateCcw, User, Settings, LogOut } from 'lucide-react';

export const OptionsWithAuth: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Reset all settings to defaults?')) {
      await loadSettings();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🍌</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Going Bananas</h1>
                <p className="text-sm text-gray-600">T&C Analyzer Settings</p>
              </div>
            </div>
            
            {/* Authentication Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name || user.email}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <LoginButton variant="compact" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Extension Settings</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Auto Analysis */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Auto Analysis</h3>
                    <p className="text-sm text-gray-500">Automatically analyze terms when detected</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoAnalyze}
                      onChange={(e) => setSettings({ ...settings, autoAnalyze: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Show Notifications</h3>
                    <p className="text-sm text-gray-500">Display notifications for high-risk findings</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showNotifications}
                      onChange={(e) => setSettings({ ...settings, showNotifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Risk Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Risk Threshold: {settings.riskThreshold}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={settings.riskThreshold}
                    onChange={(e) => setSettings({ ...settings, riskThreshold: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Low Risk</span>
                    <span>High Risk</span>
                  </div>
                </div>

                {/* API Endpoint */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    API Endpoint
                  </label>
                  <select
                    value={settings.apiEndpoint}
                    onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="mock">Mock API (Testing)</option>
                    <option value="local">Local Development</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                {/* Analysis Detail */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Analysis Detail Level
                  </label>
                  <select
                    value={settings.analysisDetail}
                    onChange={(e) => setSettings({ ...settings, analysisDetail: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="comprehensive">Comprehensive</option>
                  </select>
                </div>

                {/* Analysis Categories */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Analysis Categories</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'analyzePrivacy', label: 'Privacy Analysis', description: 'Analyze privacy-related terms' },
                      { key: 'analyzeLiability', label: 'Liability Analysis', description: 'Analyze liability and responsibility terms' },
                      { key: 'analyzeTermination', label: 'Termination Analysis', description: 'Analyze account termination terms' },
                      { key: 'analyzePayment', label: 'Payment Analysis', description: 'Analyze payment and billing terms' }
                    ].map((category) => (
                      <div key={category.key} className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{category.label}</h4>
                          <p className="text-sm text-gray-500">{category.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings[category.key as keyof ExtensionSettings] as boolean}
                            onChange={(e) => setSettings({ 
                              ...settings, 
                              [category.key]: e.target.checked 
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleReset}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset to Defaults</span>
                  </button>
                  
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>
                
                {saved && (
                  <div className="mt-3 text-sm text-green-600 text-center">
                    ✓ Settings saved successfully!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Profile Card */}
            {isAuthenticated && user && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h3>
                <div className="flex items-center space-x-3 mb-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name || user.email}
                      className="h-12 w-12 rounded-full"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Your personalized T&C analysis experience is active. 
                  Risk assessments are tailored to your preferences.
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => chrome.tabs.create({ url: 'https://goingbananas.dev' })}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Visit Website
                </button>
                <button
                  onClick={() => chrome.tabs.create({ url: 'https://github.com/goingbananas/extension' })}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  View Source Code
                </button>
                <button
                  onClick={() => chrome.tabs.create({ url: 'https://goingbananas.dev/privacy' })}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};