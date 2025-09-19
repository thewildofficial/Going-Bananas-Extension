// Options Page Component
import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/utils/chrome';
import { ExtensionSettings } from '@/types';

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    // Check for analysis data in URL hash
    const hash = window.location.hash;
    if (hash.startsWith('#analysis=')) {
      try {
        const encodedData = hash.substring('#analysis='.length);
        const decodedData = JSON.parse(decodeURIComponent(encodedData));
        setAnalysisData(decodedData);
        setActiveTab('analysis');
      } catch (error) {
        console.error('Failed to parse analysis data:', error);
      }
    }
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}></div>
        <p style={{ margin: 0 }}>Loading settings...</p>
      </div>
    );
  }

  // Beautiful inline styles
  const containerStyle: React.CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    background: 'white',
    minHeight: '100vh',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 32px',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
    color: 'white'
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const bananaIconStyle: React.CSSProperties = {
    fontSize: '32px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0
  };

  const versionStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500'
  };

  const navTabsStyle: React.CSSProperties = {
    display: 'flex',
    background: '#f8f9fa',
    borderBottom: '1px solid #dee2e6'
  };

  const tabButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '16px 24px',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6c757d',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderBottom: '3px solid transparent'
  };

  const tabButtonActiveStyle: React.CSSProperties = {
    ...tabButtonStyle,
    color: '#ff6b95',
    background: 'white',
    borderBottomColor: '#ff6b95'
  };

  const tabContentStyle: React.CSSProperties = {
    display: 'none',
    padding: '32px'
  };

  const tabContentActiveStyle: React.CSSProperties = {
    ...tabContentStyle,
    display: 'block'
  };

  const settingsSectionStyle: React.CSSProperties = {
    marginBottom: '48px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#2c3e50',
    margin: '0 0 8px 0'
  };

  const sectionDescriptionStyle: React.CSSProperties = {
    color: '#6c757d',
    marginBottom: '24px',
    margin: '0 0 24px 0'
  };

  const settingItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 0',
    borderBottom: '1px solid #f1f3f4'
  };

  const settingInfoStyle: React.CSSProperties = {
    flex: 1,
    marginRight: '24px'
  };

  const settingLabelStyle: React.CSSProperties = {
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: '4px',
    display: 'block',
    margin: '0 0 4px 0'
  };

  const settingDescriptionStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6c757d',
    lineHeight: '1.4',
    margin: 0
  };

  const settingControlStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
    transition: 'border-color 0.2s'
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    background: 'white'
  };

  const toggleSwitchStyle: React.CSSProperties = {
    display: 'none'
  };

  const switchLabelStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: '48px',
    height: '24px',
    background: '#ced4da',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  const switchLabelAfterStyle: React.CSSProperties = {
    content: '""',
    position: 'absolute',
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    background: 'white',
    borderRadius: '50%',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  };

  const rangeSliderStyle: React.CSSProperties = {
    width: '120px',
    height: '6px',
    borderRadius: '3px',
    background: '#e9ecef',
    outline: 'none',
    WebkitAppearance: 'none'
  };

  const rangeValueStyle: React.CSSProperties = {
    fontWeight: '500',
    color: '#ff6b95',
    minWidth: '30px',
    textAlign: 'center'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const btnPrimaryStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#ff6b95',
    color: 'white'
  };

  const btnSecondaryStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#f8f9fa',
    color: '#6c757d',
    border: '1px solid #dee2e6'
  };

  const btnIconStyle: React.CSSProperties = {
    ...buttonStyle,
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    width: '36px',
    height: '36px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const categoryGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '20px'
  };

  const categoryItemStyle: React.CSSProperties = {
    position: 'relative'
  };

  const categoryLabelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  };

  const categoryLabelCheckedStyle: React.CSSProperties = {
    ...categoryLabelStyle,
    borderColor: '#ff6b95',
    background: '#fff5f8'
  };

  const categoryIconStyle: React.CSSProperties = {
    fontSize: '24px',
    marginBottom: '8px'
  };

  const categoryNameStyle: React.CSSProperties = {
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: '4px'
  };

  const categoryDescStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6c757d'
  };

  const privacyInfoStyle: React.CSSProperties = {
    background: '#f8f9fa',
    padding: '24px',
    borderRadius: '12px',
    marginTop: '24px'
  };

  const privacyTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    marginBottom: '12px',
    color: '#2c3e50',
    margin: '0 0 12px 0'
  };

  const privacyListStyle: React.CSSProperties = {
    listStyle: 'none',
    marginBottom: '20px',
    margin: '0 0 20px 0',
    padding: 0
  };

  const privacyListItemStyle: React.CSSProperties = {
    padding: '4px 0',
    fontSize: '13px',
    color: '#495057'
  };

  const aboutInfoStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px'
  };

  const logoLargeStyle: React.CSSProperties = {
    marginBottom: '24px'
  };

  const bananaIconLargeStyle: React.CSSProperties = {
    fontSize: '64px',
    display: 'block',
    marginBottom: '16px'
  };

  const aboutTitleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '8px',
    margin: '0 0 8px 0'
  };

  const versionInfoStyle: React.CSSProperties = {
    color: '#6c757d',
    fontSize: '14px',
    marginBottom: '20px',
    margin: '0 0 20px 0'
  };

  const descriptionStyle: React.CSSProperties = {
    color: '#495057',
    maxWidth: '500px',
    margin: '0 auto 32px',
    lineHeight: '1.6'
  };

  const featureHighlightsStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  };

  const featureStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#495057'
  };

  const featureIconStyle: React.CSSProperties = {
    fontSize: '24px',
    marginBottom: '8px'
  };

  const systemStatusStyle: React.CSSProperties = {
    marginBottom: '32px'
  };

  const statusGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  };

  const statusItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px'
  };

  const statusLabelStyle: React.CSSProperties = {
    fontWeight: '500',
    color: '#495057'
  };

  const statusValueStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#6c757d'
  };

  const linksSectionStyle: React.CSSProperties = {
    marginBottom: '32px'
  };

  const linksGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px'
  };

  const linkItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#495057',
    transition: 'all 0.2s'
  };

  const linkIconStyle: React.CSSProperties = {
    fontSize: '16px'
  };

  const footerStyle: React.CSSProperties = {
    padding: '24px 32px',
    background: '#f8f9fa',
    borderTop: '1px solid #dee2e6'
  };

  const footerContentStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px'
  };

  const footerStatusStyle: React.CSSProperties = {
    textAlign: 'center'
  };

  const saveStatusStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: '500'
  };

  const saveStatusSuccessStyle: React.CSSProperties = {
    ...saveStatusStyle,
    color: '#28a745'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={logoStyle}>
          <span style={bananaIconStyle}>🍌</span>
          <h1 style={titleStyle}>Going Bananas Settings</h1>
        </div>
        <div style={versionStyle}>v1.0.0</div>
      </header>

      {/* Navigation Tabs */}
      <nav style={navTabsStyle}>
        <button 
          style={activeTab === 'general' ? tabButtonActiveStyle : tabButtonStyle}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button 
          style={activeTab === 'analysis' ? tabButtonActiveStyle : tabButtonStyle}
          onClick={() => setActiveTab('analysis')}
        >
          Analysis
        </button>
        <button 
          style={activeTab === 'privacy' ? tabButtonActiveStyle : tabButtonStyle}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy
        </button>
        <button 
          style={activeTab === 'about' ? tabButtonActiveStyle : tabButtonStyle}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </nav>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div style={tabContentActiveStyle}>
          <section style={settingsSectionStyle}>
            <h2 style={sectionTitleStyle}>General Settings</h2>
            
            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Auto-analyze Terms & Conditions</label>
                <p style={settingDescriptionStyle}>Automatically analyze T&C pages when you visit them</p>
              </div>
              <div style={settingControlStyle}>
                <input 
                  type="checkbox" 
                  id="autoAnalyze" 
                  style={toggleSwitchStyle}
                  checked={settings.autoAnalyze}
                  onChange={(e) => setSettings({...settings, autoAnalyze: e.target.checked})}
                />
                <label htmlFor="autoAnalyze" style={switchLabelStyle}></label>
              </div>
            </div>

            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Show Risk Notifications</label>
                <p style={settingDescriptionStyle}>Get notified when high-risk terms are detected</p>
              </div>
              <div style={settingControlStyle}>
                <input 
                  type="checkbox" 
                  id="showNotifications" 
                  style={toggleSwitchStyle}
                  checked={settings.showNotifications}
                  onChange={(e) => setSettings({...settings, showNotifications: e.target.checked})}
                />
                <label htmlFor="showNotifications" style={switchLabelStyle}></label>
              </div>
            </div>

            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Risk Notification Threshold</label>
                <p style={settingDescriptionStyle}>Show notifications for risk scores above this level</p>
              </div>
              <div style={settingControlStyle}>
                <input 
                  type="range" 
                  id="riskThreshold" 
                  min="1" 
                  max="10" 
                  step="0.5" 
                  value={settings.riskThreshold}
                  onChange={(e) => setSettings({...settings, riskThreshold: parseFloat(e.target.value)})}
                  style={rangeSliderStyle}
                />
                <span style={rangeValueStyle}>{settings.riskThreshold.toFixed(1)}</span>
              </div>
            </div>

            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>API Endpoint</label>
                <p style={settingDescriptionStyle}>Choose between production API or local development server</p>
              </div>
              <div style={settingControlStyle}>
                <select 
                  value={settings.apiEndpoint}
                  onChange={(e) => setSettings({...settings, apiEndpoint: e.target.value as any})}
                  style={selectStyle}
                >
                  <option value="production">Production (api.goingbananas.dev)</option>
                  <option value="local">Local Development (localhost:3000)</option>
                  <option value="mock">Mock API (localhost:3001)</option>
                </select>
              </div>
            </div>

          </section>
        </div>
      )}

      {/* Analysis Settings Tab */}
      {activeTab === 'analysis' && (
        <div style={tabContentActiveStyle}>
          {analysisData ? (
            <section style={settingsSectionStyle}>
              <h2 style={sectionTitleStyle}>Full Analysis Report</h2>
              
              <div style={{
                background: 'white',
                border: '1px solid #e1e5e9',
                borderRadius: '8px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                  paddingBottom: '20px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '12px',
                    background: analysisData.analysis.risk_score >= 7 ? '#ff4757' : 
                               analysisData.analysis.risk_score >= 5 ? '#ffa502' : '#2ed573',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: '900'
                  }}>
                    {analysisData.analysis.risk_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', color: '#2c3e50' }}>
                      {analysisData.analysis.risk_level ? 
                        analysisData.analysis.risk_level.charAt(0).toUpperCase() + 
                        analysisData.analysis.risk_level.slice(1) + ' Risk' : 
                        'Unknown Risk'
                      }
                    </h3>
                    <p style={{ margin: 0, color: '#7f8c8d', fontSize: '14px' }}>
                      Analyzed: {new Date(analysisData.timestamp).toLocaleString()}
                    </p>
                    <p style={{ margin: '4px 0 0 0', color: '#95a5a6', fontSize: '12px' }}>
                      URL: {analysisData.url}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                {analysisData.analysis.summary && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#2c3e50', marginBottom: '12px' }}>Summary</h4>
                    <p style={{ color: '#34495e', lineHeight: '1.6' }}>
                      {analysisData.analysis.summary}
                    </p>
                  </div>
                )}

                {/* Key Points */}
                {analysisData.analysis.key_points && analysisData.analysis.key_points.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#2c3e50', marginBottom: '12px' }}>Key Concerns</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {analysisData.analysis.key_points.map((point: string, index: number) => (
                        <li key={index} style={{ 
                          color: '#34495e', 
                          lineHeight: '1.6', 
                          marginBottom: '8px' 
                        }}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Categories */}
                {analysisData.analysis.categories && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#2c3e50', marginBottom: '12px' }}>Detailed Analysis</h4>
                    {Object.entries(analysisData.analysis.categories).map(([category, data]: [string, any]) => (
                      <div key={category} style={{
                        border: '1px solid #ecf0f1',
                        borderRadius: '6px',
                        padding: '16px',
                        marginBottom: '12px',
                        background: '#fafbfc'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <h5 style={{
                            margin: 0,
                            color: '#2c3e50',
                            textTransform: 'capitalize'
                          }}>
                            {category}
                          </h5>
                          <span style={{
                            background: data.score >= 7 ? '#ff4757' : 
                                       data.score >= 4 ? '#ffa502' : '#2ed573',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {data.score?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <p style={{
                          margin: 0,
                          color: '#7f8c8d',
                          fontSize: '14px',
                          lineHeight: '1.5'
                        }}>
                          {data.concerns?.join(', ') || 'No specific concerns identified'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setAnalysisData(null);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ← Back to Settings
                </button>
              </div>
            </section>
          ) : (
            <section style={settingsSectionStyle}>
              <h2 style={sectionTitleStyle}>Analysis Configuration</h2>
            
            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Gemini API Key</label>
                <p style={settingDescriptionStyle}>Your Google AI Studio API key for Gemini (required for production)</p>
              </div>
              <div style={settingControlStyle}>
                <input 
                  type={showApiKey ? "text" : "password"} 
                  value={settings.apiKey}
                  onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                  placeholder="Enter your Gemini API key"
                  style={inputStyle}
                />
                <button 
                  type="button" 
                  style={btnIconStyle}
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Analysis Detail Level</label>
                <p style={settingDescriptionStyle}>Choose how detailed the analysis should be</p>
              </div>
              <div style={settingControlStyle}>
                <select 
                  value={settings.analysisDetail}
                  onChange={(e) => setSettings({...settings, analysisDetail: e.target.value as any})}
                  style={selectStyle}
                >
                  <option value="basic">Basic - Quick overview</option>
                  <option value="standard">Standard - Detailed analysis</option>
                  <option value="comprehensive">Comprehensive - Full breakdown</option>
                </select>
              </div>
            </div>

            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Cache Management</label>
                <p style={settingDescriptionStyle}>Manage stored analysis cache</p>
              </div>
              <div style={settingControlStyle}>
                <button type="button" style={btnSecondaryStyle}>Clear Cache</button>
                <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '8px' }}>Calculating...</span>
              </div>
            </div>
          </section>
          )}

          {/* Analysis Categories */}
          <section style={settingsSectionStyle}>
            <h2 style={sectionTitleStyle}>Analysis Categories</h2>
            <p style={sectionDescriptionStyle}>Choose which aspects to focus on during analysis</p>
            
            <div style={categoryGridStyle}>
              <div style={categoryItemStyle}>
                <input type="checkbox" id="analyzePrivacy" defaultChecked style={toggleSwitchStyle} />
                <label htmlFor="analyzePrivacy" style={categoryLabelStyle}>
                  <span style={categoryIconStyle}>🔒</span>
                  <span style={categoryNameStyle}>Privacy & Data</span>
                  <span style={categoryDescStyle}>Data collection and usage</span>
                </label>
              </div>
              
              <div style={categoryItemStyle}>
                <input type="checkbox" id="analyzeLiability" defaultChecked style={toggleSwitchStyle} />
                <label htmlFor="analyzeLiability" style={categoryLabelStyle}>
                  <span style={categoryIconStyle}>⚖️</span>
                  <span style={categoryNameStyle}>Liability</span>
                  <span style={categoryDescStyle}>Legal responsibility clauses</span>
                </label>
              </div>
              
              <div style={categoryItemStyle}>
                <input type="checkbox" id="analyzeTermination" defaultChecked style={toggleSwitchStyle} />
                <label htmlFor="analyzeTermination" style={categoryLabelStyle}>
                  <span style={categoryIconStyle}>🚪</span>
                  <span style={categoryNameStyle}>Termination</span>
                  <span style={categoryDescStyle}>Account closure policies</span>
                </label>
              </div>
              
              <div style={categoryItemStyle}>
                <input type="checkbox" id="analyzePayment" defaultChecked style={toggleSwitchStyle} />
                <label htmlFor="analyzePayment" style={categoryLabelStyle}>
                  <span style={categoryIconStyle}>💳</span>
                  <span style={categoryNameStyle}>Payment</span>
                  <span style={categoryDescStyle}>Billing and refund terms</span>
                </label>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Privacy Settings Tab */}
      {activeTab === 'privacy' && (
        <div style={tabContentActiveStyle}>
          <section style={settingsSectionStyle}>
            <h2 style={sectionTitleStyle}>Privacy & Data Protection</h2>
            
            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Send Anonymous Usage Data</label>
                <p style={settingDescriptionStyle}>Help improve Going Bananas by sending anonymous usage statistics</p>
              </div>
              <div style={settingControlStyle}>
                <input type="checkbox" id="sendUsageData" style={toggleSwitchStyle} />
                <label htmlFor="sendUsageData" style={switchLabelStyle}></label>
              </div>
            </div>

            <div style={settingItemStyle}>
              <div style={settingInfoStyle}>
                <label style={settingLabelStyle}>Share Analysis Results</label>
                <p style={settingDescriptionStyle}>Help build a community database of T&C analysis (anonymized)</p>
              </div>
              <div style={settingControlStyle}>
                <input type="checkbox" id="shareAnalytics" style={toggleSwitchStyle} />
                <label htmlFor="shareAnalytics" style={switchLabelStyle}></label>
              </div>
            </div>

            <div style={privacyInfoStyle}>
              <h3 style={privacyTitleStyle}>What We Don't Collect</h3>
              <ul style={privacyListStyle}>
                <li style={privacyListItemStyle}>🚫 Your personal browsing history</li>
                <li style={privacyListItemStyle}>🚫 Identifying information from analyzed pages</li>
                <li style={privacyListItemStyle}>🚫 Your personal data or login credentials</li>
                <li style={privacyListItemStyle}>🚫 Full text of terms and conditions</li>
              </ul>
              
              <h3 style={privacyTitleStyle}>What We May Collect (if enabled)</h3>
              <ul style={privacyListStyle}>
                <li style={privacyListItemStyle}>✅ Extension usage patterns (anonymized)</li>
                <li style={privacyListItemStyle}>✅ Analysis result summaries (without identifying info)</li>
                <li style={privacyListItemStyle}>✅ Feature usage statistics</li>
                <li style={privacyListItemStyle}>✅ Error reports for debugging</li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div style={tabContentActiveStyle}>
          <section style={settingsSectionStyle}>
            <h2 style={sectionTitleStyle}>About Going Bananas</h2>
            
            <div style={aboutInfoStyle}>
              <div style={logoLargeStyle}>
                <span style={bananaIconLargeStyle}>🍌</span>
                <h3 style={aboutTitleStyle}>Going Bananas T&C Analyzer</h3>
                <p style={versionInfoStyle}>Version 1.0.0</p>
              </div>
              
              <p style={descriptionStyle}>
                Going Bananas uses advanced AI to help you understand terms and conditions 
                in plain English. Never again wonder what you're signing up for!
              </p>
              
              <div style={featureHighlightsStyle}>
                <div style={featureStyle}>
                  <span style={featureIconStyle}>🤖</span>
                  <span>AI-Powered Analysis</span>
                </div>
                <div style={featureStyle}>
                  <span style={featureIconStyle}>🎯</span>
                  <span>Risk Assessment</span>
                </div>
                <div style={featureStyle}>
                  <span style={featureIconStyle}>🔒</span>
                  <span>Privacy Focused</span>
                </div>
                <div style={featureStyle}>
                  <span style={featureIconStyle}>⚡</span>
                  <span>Instant Results</span>
                </div>
              </div>
            </div>

            <div style={systemStatusStyle}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#2c3e50', margin: '0 0 16px 0' }}>
                System Status
              </h3>
              <div style={statusGridStyle}>
                <div style={statusItemStyle}>
                  <span style={statusLabelStyle}>API Connection</span>
                  <span style={statusValueStyle}>Checking...</span>
                </div>
                <div style={statusItemStyle}>
                  <span style={statusLabelStyle}>Cache Size</span>
                  <span style={statusValueStyle}>Calculating...</span>
                </div>
                <div style={statusItemStyle}>
                  <span style={statusLabelStyle}>Last Analysis</span>
                  <span style={statusValueStyle}>Never</span>
                </div>
                <div style={statusItemStyle}>
                  <span style={statusLabelStyle}>Total Analyses</span>
                  <span style={statusValueStyle}>0</span>
                </div>
              </div>
            </div>

            <div style={linksSectionStyle}>
              <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#2c3e50', margin: '0 0 16px 0' }}>
                Links & Resources
              </h3>
              <div style={linksGridStyle}>
                <a href="https://github.com/goingbananas/extension" target="_blank" style={linkItemStyle}>
                  <span style={linkIconStyle}>📚</span>
                  <span>Documentation</span>
                </a>
                <a href="https://github.com/goingbananas/extension/issues" target="_blank" style={linkItemStyle}>
                  <span style={linkIconStyle}>🐛</span>
                  <span>Report Issues</span>
                </a>
                <a href="https://goingbananas.dev/privacy" target="_blank" style={linkItemStyle}>
                  <span style={linkIconStyle}>🔒</span>
                  <span>Privacy Policy</span>
                </a>
                <a href="https://discord.gg/going-bananas" target="_blank" style={linkItemStyle}>
                  <span style={linkIconStyle}>💬</span>
                  <span>Community</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer style={footerStyle}>
        <div style={footerContentStyle}>
          <button 
            type="button" 
            style={btnPrimaryStyle}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button 
            type="button" 
            style={btnSecondaryStyle}
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
        </div>
        <div style={footerStatusStyle}>
          <span style={saved ? saveStatusSuccessStyle : saveStatusStyle}>
            {saved ? '✅ Settings saved!' : ''}
          </span>
        </div>
      </footer>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input[type="checkbox"]:checked + label {
            background: #ff6b95;
            color: white;
          }
          
          input[type="checkbox"]:checked + label::after {
            transform: translateX(24px);
          }
          
          input[type="text"]:focus,
          input[type="password"]:focus,
          select:focus {
            outline: none;
            border-color: #ff6b95;
            box-shadow: 0 0 0 3px rgba(255, 107, 149, 0.1);
          }
          
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ff6b95;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ff6b95;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          button:hover {
            transform: translateY(-1px);
          }
          
          .tab-btn:hover {
            background: #e9ecef;
            color: #495057;
          }
          
          .btn-secondary:hover {
            background: #e9ecef;
            color: #495057;
          }
          
          .btn-icon:hover {
            background: #e9ecef;
          }
          
          .link-item:hover {
            background: #e9ecef;
            transform: translateY(-1px);
          }
          
          .category-item input[type="checkbox"]:checked + label {
            border-color: #ff6b95;
            background: #fff5f8;
          }
          
          @media (max-width: 768px) {
            .container {
              margin: 0;
              min-height: 100vh;
            }
            
            .header {
              padding: 16px 20px;
            }
            
            .logo h1 {
              font-size: 18px;
            }
            
            .tab-content {
              padding: 20px;
            }
            
            .setting-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
            
            .setting-control {
              width: 100%;
              justify-content: flex-end;
            }
            
            .category-grid {
              grid-template-columns: 1fr;
            }
            
            .status-grid,
            .links-grid {
              grid-template-columns: 1fr;
            }
            
            .footer-content {
              flex-direction: column;
            }
          }
        `}
      </style>
    </div>
  );
};