// Options Page Component
import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/utils/chrome';
import { ExtensionSettings } from '@/types';
import { Save, RotateCcw } from 'lucide-react';

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍌</span>
            <h1 className="text-2xl font-bold">Going Bananas Settings</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          
          {/* General Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">General Settings</h2>
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Auto-analyze T&C Pages</label>
                  <p className="text-sm text-gray-600">Automatically analyze terms when visiting T&C pages</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoAnalyze}
                  onChange={(e) => setSettings({...settings, autoAnalyze: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Show Risk Notifications</label>
                  <p className="text-sm text-gray-600">Get notified when high-risk terms are detected</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showNotifications}
                  onChange={(e) => setSettings({...settings, showNotifications: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded"
                />
              </div>

              <div>
                <label className="font-medium">Risk Notification Threshold</label>
                <p className="text-sm text-gray-600 mb-2">Show notifications for risk scores above this level</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={settings.riskThreshold}
                    onChange={(e) => setSettings({...settings, riskThreshold: parseFloat(e.target.value)})}
                    className="flex-1"
                  />
                  <span className="font-medium text-purple-600 min-w-[3rem]">
                    {settings.riskThreshold.toFixed(1)}
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* API Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
            <div className="space-y-4">
              
              <div>
                <label className="font-medium">API Endpoint</label>
                <p className="text-sm text-gray-600 mb-2">Choose your preferred API endpoint</p>
                <select
                  value={settings.apiEndpoint}
                  onChange={(e) => setSettings({...settings, apiEndpoint: e.target.value as any})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="mock">Mock API (for testing)</option>
                  <option value="local">Local Development</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div>
                <label className="font-medium">Gemini API Key</label>
                <p className="text-sm text-gray-600 mb-2">Required for production analysis</p>
                <input
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                  placeholder="Enter your Gemini API key"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-medium">Analysis Detail Level</label>
                <p className="text-sm text-gray-600 mb-2">Choose how detailed the analysis should be</p>
                <select
                  value={settings.analysisDetail}
                  onChange={(e) => setSettings({...settings, analysisDetail: e.target.value as any})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="basic">Basic - Quick overview</option>
                  <option value="standard">Standard - Detailed analysis</option>
                  <option value="comprehensive">Comprehensive - Full breakdown</option>
                </select>
              </div>

            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>

            {saved && (
              <div className="flex items-center text-green-600 font-medium">
                ✅ Settings saved!
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
