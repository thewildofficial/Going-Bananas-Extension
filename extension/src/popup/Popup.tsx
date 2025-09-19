import React, { useEffect, useState } from 'react';
import { Settings, RefreshCw, Search, Share, Edit3 } from 'lucide-react';
import { getApiUrl } from '@/utils/config';
import { renderMarkdownText } from '@/utils/markdown';
import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/LoginButton';

export const Popup: React.FC = () => {
  const { isAuthenticated, loading: authLoading, user, signOut } = useAuth();
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [pageStatus, setPageStatus] = useState<'loading' | 'analyzing' | 'complete' | 'error' | 'no-terms'>('loading');
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolbarActive, setToolbarActive] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<Array<{id: string, text: string, element: string}>>([]);
  const [notification, setNotification] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const [cachedAnalysis, setCachedAnalysis] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      await signOut();
      setNotification({ type: 'info', message: 'Signed out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      setNotification({ type: 'error', message: 'Failed to sign out' });
    }
  };

  useEffect(() => {
    initializePopup();
  }, []);

  const initializePopup = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        setPageStatus('error');
        setError('Unable to access current tab');
        return;
      }

      setCurrentTab(tabs[0]);
      const tabUrl = tabs[0].url || '';
      
      // Check cache first
      const cacheKey = `analysis_${hashUrl(tabUrl)}`;
      const cached = await chrome.storage.local.get(cacheKey);
      const cachedData = cached[cacheKey];
      
      if (cachedData && Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
        console.log('📦 Using cached analysis for:', tabUrl);
        setAnalysis(cachedData.data);
        setCachedAnalysis(true);
        setPageStatus('complete');
        return;
      }

      // Check if page has terms content
      setPageStatus('analyzing');
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeTerms',
          data: { tabId: tabs[0].id }
        });

        if (response.success && response.analysis) {
          setAnalysis(response.analysis);
          setPageStatus('complete');
          
          // Cache the result
          await chrome.storage.local.set({
            [cacheKey]: {
              data: response.analysis,
              timestamp: Date.now(),
              url: tabUrl
            }
          });
        } else {
          setPageStatus('no-terms');
          setError(response.error || 'No terms and conditions detected');
        }
      } catch (err) {
        setPageStatus('error');
        setError(err instanceof Error ? err.message : 'Analysis failed');
      }
    } catch (err) {
      setPageStatus('error');
      setError('Failed to initialize popup');
    }
  };

  const hashUrl = (url: string): string => {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  };

  const refreshAnalysis = async () => {
    if (!currentTab?.id) return;
    
    setPageStatus('analyzing');
    setCachedAnalysis(false);
    
    // Clear cache for this URL
    const tabUrl = currentTab.url || '';
    const cacheKey = `analysis_${hashUrl(tabUrl)}`;
    await chrome.storage.local.remove(cacheKey);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeTerms',
        data: { tabId: currentTab.id }
      });

      if (response.success && response.analysis) {
        setAnalysis(response.analysis);
        setPageStatus('complete');
        
        // Cache the new result
        await chrome.storage.local.set({
          [cacheKey]: {
            data: response.analysis,
            timestamp: Date.now(),
            url: tabUrl
          }
        });
        
        showNotification('success', 'Analysis refreshed successfully!');
      } else {
        setPageStatus('no-terms');
        setError(response.error || 'No terms and conditions detected');
      }
    } catch (err) {
      setPageStatus('error');
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
  };

  const manualScan = async () => {
    if (!currentTab?.id) return;
    
    setPageStatus('analyzing');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'manualScan',
        data: { tabId: currentTab.id }
      });

      if (response.success && response.analysis) {
        setAnalysis(response.analysis);
        setPageStatus('complete');
        showNotification('success', 'Manual scan completed!');
      } else {
        setPageStatus('no-terms');
        setError(response.error || 'No terms found in manual scan');
      }
    } catch (err) {
      setPageStatus('error');
      setError(err instanceof Error ? err.message : 'Manual scan failed');
    }
  };


  const handleSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `Check out this T&C analysis from Going Bananas! Risk Score: ${analysis?.risk_score?.toFixed(1)}`
      );
      showNotification('success', 'Analysis shared to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showNotification('error', 'Failed to copy to clipboard');
    }
  };

  const showNotification = (type: 'error' | 'success' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const toggleToolbar = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        if (!toolbarActive) {
          // Inject and show block selector toolbar
          chrome.tabs.sendMessage(tabs[0].id, { action: "showBlockSelector" }, (response) => {
            if (response && response.success) {
              setToolbarActive(true);
            }
          });
        } else {
          // Hide block selector toolbar
          chrome.tabs.sendMessage(tabs[0].id, { action: "hideBlockSelector" }, (response) => {
            if (response && response.success) {
              setToolbarActive(false);
              setSelectedBlocks([]);
            }
          });
        }
      }
    });
  };

  const analyzeSelectedBlocks = async () => {
    if (selectedBlocks.length === 0) {
      showNotification('error', 'Please select some content blocks first!');
      return;
    }

    // Combine all selected block texts
    const combinedText = selectedBlocks.map(block => block.text).join('\n\n');
    
    if (combinedText.length < 10) {
      showNotification('error', 'Selected content is too short to analyze (minimum 10 characters).');
      return;
    }

    if (combinedText.length > 50000) {
      showNotification('error', 'Selected content is too long (maximum 50,000 characters).');
      return;
    }

    try {
      console.log('Analyzing selected blocks:', selectedBlocks.length, 'blocks, total length:', combinedText.length);
      
      // Get current tab URL for context
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0]?.url || 'unknown';
      
      // Get configurable API URL
      const apiUrl = await getApiUrl();
      console.log('Using API URL:', apiUrl);
      
      // Use the main analyze endpoint for block analysis
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: combinedText,
          url: currentUrl,
          options: {
            language: 'en',
            detail_level: 'comprehensive',
            categories: ['privacy', 'liability', 'termination', 'payment'],
            cache: true
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed with status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Selected blocks analysis result:', result);
      
      if (result.success && result.analysis) {
        // Send the analysis result to the content script to display
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { 
              action: "showSelectedBlocksAnalysis", 
              data: result.analysis,
              selectedBlocks: selectedBlocks
            });
          }
        });
        
        showNotification('success', `Analysis complete! ${selectedBlocks.length} blocks analyzed.`);
      } else {
        throw new Error(result.error || 'Analysis failed - no analysis data returned');
      }
      
    } catch (error) {
      console.error('Error analyzing selected blocks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showNotification('error', `Failed to analyze selected blocks: ${errorMessage}`);
    }
  };

  // Listen for selected blocks updates
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'blocksSelected') {
        setSelectedBlocks(message.blocks || []);
      } else if (message.action === 'toolbarClosed') {
        setToolbarActive(false);
        setSelectedBlocks([]);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  // Cleanup effect: Disable block selector when popup closes
  useEffect(() => {
    return () => {
      // This runs when the popup component unmounts (i.e., when popup is closed)
      if (toolbarActive) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "hideBlockSelector" }, () => {
              // Ignore response since popup is closing
            });
          }
        });
      }
    };
  }, [toolbarActive]); // Re-run when toolbarActive changes

  // Clean, full-width container styles
  const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#1a1a1a',
    background: '#ffffff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    border: 'none',
    borderRadius: 0
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
    color: 'white',
    borderRadius: 0,
    boxShadow: 'none',
    position: 'relative',
    overflow: 'hidden',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    zIndex: 2
  };

  const bananaIconStyle: React.CSSProperties = {
    fontSize: '20px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    letterSpacing: '-0.2px'
  };

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    color: 'white',
    position: 'relative',
    zIndex: 2
  };

  const buttonHoverStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.3)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    background: '#ffffff',
    overflowY: 'auto',
    borderRadius: 0
  };

  const loadingStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  };

  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #ff6b95',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  };

  const noTermsStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center'
  };

  const emptyIconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
  };

  const scanButtonStyle: React.CSSProperties = {
    background: '#ff6b95',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const resultsStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '0 0 20px 0'
  };

  const getRiskColor = (score: number) => {
    if (score >= 7) return { bg: '#ff6b95', accent: '#ff4d7d', icon: '🚨', emoji: '⚠️' };
    if (score >= 5) return { bg: '#ff9a56', accent: '#ff8533', icon: '⚠️', emoji: '🔶' };
    return { bg: '#4ecdc4', accent: '#26d0ce', icon: '✅', emoji: '🛡️' };
  };

  const riskHeaderStyle: React.CSSProperties = {
    padding: '20px 16px',
    background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
    color: 'white',
    borderRadius: 0,
    boxShadow: 'none',
    position: 'relative',
    overflow: 'hidden',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const riskScoreStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  };

  const riskIndicatorStyle = (score: number): React.CSSProperties => {
    const colors = getRiskColor(score);
    return {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '80px',
      height: '80px',
      background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%)`,
      borderRadius: '16px',
      boxShadow: `0 4px 16px rgba(0, 0, 0, 0.15)`,
      flexShrink: 0,
      border: '3px solid rgba(255, 255, 255, 0.4)'
    };
  };

  const scoreNumberStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: '800',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
  };

  const riskBadgeStyle = (score: number): React.CSSProperties => {
    const colors = getRiskColor(score);
    return {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      width: '28px',
      height: '28px',
      background: colors.bg,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      border: '2px solid white'
    };
  };

  const riskLevelStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '6px',
    margin: '0 0 6px 0',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    letterSpacing: '-0.5px'
  };

  const riskDescriptionStyle: React.CSSProperties = {
    opacity: 0.95,
    fontSize: '14px',
    margin: 0,
    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    lineHeight: '1.4'
  };

  const sectionStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #f0f0f0',
    background: '#ffffff'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#1a1a1a',
    margin: '0 0 12px 0',
    letterSpacing: '-0.3px'
  };

  const summaryTextStyle: React.CSSProperties = {
    color: '#4a5568',
    lineHeight: '1.6',
    margin: 0,
    fontSize: '15px'
  };

  const keyPointsListStyle: React.CSSProperties = {
    listStyle: 'none',
    margin: 0,
    padding: 0
  };

  const keyPointStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
    padding: '12px',
    borderRadius: '8px',
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s ease'
  };

  const keyPointHighStyle: React.CSSProperties = {
    ...keyPointStyle,
    background: '#fee',
    borderLeft: '4px solid #ef4444',
    border: '1px solid #fecaca'
  };

  const keyPointMediumStyle: React.CSSProperties = {
    ...keyPointStyle,
    background: '#fffbe5',
    borderLeft: '4px solid #f59e0b',
    border: '1px solid #fde68a'
  };

  const keyPointLowStyle: React.CSSProperties = {
    ...keyPointStyle,
    background: '#f0fff4',
    borderLeft: '4px solid #10b981',
    border: '1px solid #a7f3d0'
  };

  const pointIconStyle: React.CSSProperties = {
    fontSize: '18px',
    marginTop: '2px',
    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
  };

  const pointTextStyle: React.CSSProperties = {
    flex: 1,
    color: '#374151',
    lineHeight: '1.5',
    margin: 0,
    fontSize: '14px',
    fontWeight: '500'
  };

  const categoryItemStyle: React.CSSProperties = {
    marginBottom: '16px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    overflow: 'hidden'
  };

  const categoryHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#f8f9fa',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  const categoryIconStyle: React.CSSProperties = {
    fontSize: '16px',
    marginRight: '12px'
  };

  const categoryNameStyle: React.CSSProperties = {
    flex: 1,
    fontWeight: '500'
  };

  const categoryScoreStyle: React.CSSProperties = {
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px'
  };

  const categoryScoreHighStyle: React.CSSProperties = {
    ...categoryScoreStyle,
    background: '#ffebee',
    color: '#d32f2f'
  };

  const categoryScoreMediumStyle: React.CSSProperties = {
    ...categoryScoreStyle,
    background: '#fff8e1',
    color: '#f57c00'
  };

  const categoryScoreLowStyle: React.CSSProperties = {
    ...categoryScoreStyle,
    background: '#e8f5e8',
    color: '#388e3c'
  };

  const categoryDetailsStyle: React.CSSProperties = {
    padding: '12px 16px',
    background: 'white',
    borderTop: '1px solid #e9ecef'
  };

  const actionButtonsStyle: React.CSSProperties = {
    padding: '20px',
    display: 'flex',
    gap: '12px'
  };

  const btnPrimaryStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: '#ff6b95',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const btnSecondaryStyle: React.CSSProperties = {
    ...btnPrimaryStyle,
    background: '#f8f9fa',
    color: '#495057',
    border: '1px solid #dee2e6'
  };

  const errorStateStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center'
  };

  const errorIconStyle: React.CSSProperties = {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.6
  };

  const retryButtonStyle: React.CSSProperties = {
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div style={logoStyle}>
          <span style={bananaIconStyle}>🍌</span>
          <h1 style={titleStyle}>Going Bananas</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Auth area */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {authLoading ? (
              <span style={{ fontSize: '12px', opacity: 0.8 }}>Checking sign-in…</span>
            ) : isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                  title="Sign out and clear all data"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <LoginButton variant="compact" />
            )}
          </div>
          {pageStatus === 'complete' && (
            <button
              onClick={refreshAnalysis}
              style={buttonStyle}
              title={cachedAnalysis ? 'Refresh cached analysis' : 'Refresh analysis'}
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            onClick={toggleToolbar}
            style={{
              ...buttonStyle,
              ...(toolbarActive ? buttonHoverStyle : {})
            }}
            title={toolbarActive ? 'Hide Block Selector' : 'Show Block Selector'}
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={handleSettings}
            style={buttonStyle}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* If not signed in, show login prompt */}
      {!authLoading && !isAuthenticated && (
        <div style={{ padding: '16px', background: '#fff7fb', borderBottom: '1px solid #fbe3ef' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#9b2c2c' }}>
              Sign in to personalize your analysis and sync settings.
            </p>
            {/* LoginButton removed from here to avoid duplicate - main one is in header */}
          </div>
        </div>
      )}

      {/* Toolbar Status */}
      {toolbarActive && (
        <div style={{
          padding: '12px 16px',
          background: '#f8f9fa',
          borderBottom: '1px solid #e9ecef'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🎯</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>
                Block Selector Mode
              </span>
            </div>
            <span style={{
              fontSize: '12px',
              background: selectedBlocks.length > 0 ? '#d4edda' : '#e2e3e5',
              color: selectedBlocks.length > 0 ? '#155724' : '#6c757d',
              padding: '4px 12px',
              borderRadius: '16px',
              fontWeight: '500'
            }}>
              {selectedBlocks.length > 0 ? `${selectedBlocks.length} selected` : 'Ready'}
            </span>
          </div>
          
          {selectedBlocks.length > 0 && (
            <div>
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '12px',
                padding: '12px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                  {selectedBlocks.length} blocks • {selectedBlocks.reduce((total, block) => total + block.text.length, 0)} characters
                </div>
                <div style={{ fontSize: '11px', color: '#868e96' }}>
                  Ready for analysis
                </div>
              </div>
              <button
                onClick={analyzeSelectedBlocks}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(255, 107, 149, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 149, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 149, 0.3)';
                }}
              >
                🔍 Analyze Selected Content
              </button>
            </div>
          )}
          
          {selectedBlocks.length === 0 && (
            <div style={{
              fontSize: '12px',
              color: '#6c757d',
              textAlign: 'center',
              padding: '12px',
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              borderStyle: 'dashed'
            }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>👆</div>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>Click blocks on the page</div>
              <div style={{ fontSize: '11px', color: '#868e96' }}>
                Select content to analyze specific sections
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 1000,
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: notification.type === 'error' ? '#fee' : notification.type === 'success' ? '#d4edda' : '#d1ecf1',
          border: `1px solid ${notification.type === 'error' ? '#f5c6cb' : notification.type === 'success' ? '#c3e6cb' : '#bee5eb'}`,
          color: notification.type === 'error' ? '#721c24' : notification.type === 'success' ? '#155724' : '#0c5460',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              fontSize: '18px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              background: notification.type === 'error' ? 'rgba(220, 53, 69, 0.1)' : 
                         notification.type === 'success' ? 'rgba(40, 167, 69, 0.1)' : 
                         'rgba(23, 162, 184, 0.1)'
            }}>
              {notification.type === 'error' && '⚠️'}
              {notification.type === 'success' && '✅'}
              {notification.type === 'info' && 'ℹ️'}
            </div>
            <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', lineHeight: '1.4' }}>
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '6px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '12px',
                opacity: 0.7
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.opacity = '0.7';
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}


      {/* Main Content */}
      <div style={mainContentStyle}>
        {pageStatus === 'loading' && (
          <div style={loadingStyle}>
            <div style={spinnerStyle}></div>
            <p style={{ color: '#666', margin: 0, textAlign: 'center' }}>Connecting to page...</p>
          </div>
        )}

        {pageStatus === 'analyzing' && (
          <div style={loadingStyle}>
            <div style={spinnerStyle}></div>
            <p style={{ color: '#666', margin: 0, textAlign: 'center' }}>🔍 Analyzing page content...</p>
            <p style={{ color: '#999', margin: '8px 0 0 0', fontSize: '12px', textAlign: 'center' }}>
              This may take a moment
            </p>
          </div>
        )}

        {pageStatus === 'error' && (
          <div style={errorStateStyle}>
            <div style={errorIconStyle}>⚠️</div>
            <h3 style={{ marginBottom: '8px', color: '#d32f2f', margin: '0 0 8px 0' }}>Unable to Analyze</h3>
            <p style={{ color: '#777', marginBottom: '24px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={refreshAnalysis} style={retryButtonStyle}>
                <RefreshCw size={16} />
                Retry
              </button>
              <button onClick={manualScan} style={scanButtonStyle}>
                <Search size={16} />
                Manual Scan
              </button>
            </div>
          </div>
        )}

        {pageStatus === 'no-terms' && (
          <div style={noTermsStyle}>
            <div style={emptyIconStyle}>📄</div>
            <h3 style={{ marginBottom: '8px', color: '#555', margin: '0 0 8px 0' }}>No Terms Detected</h3>
            <p style={{ color: '#777', marginBottom: '24px', margin: '0 0 24px 0' }}>
              This page doesn't appear to contain terms and conditions.
            </p>
            <button onClick={manualScan} style={scanButtonStyle}>
              <Search size={16} />
              Force Scan
            </button>
          </div>
        )}

        {pageStatus === 'complete' && analysis && (
          <div style={resultsStyle}>
            {/* Risk Score Header */}
            <div style={riskHeaderStyle}>
              <div style={riskScoreStyle}>
                <div style={{ position: 'relative' }}>
                  <div style={riskIndicatorStyle(analysis.risk_score || 0)}>
                    <span style={scoreNumberStyle}>{analysis.risk_score?.toFixed(1) || 'N/A'}</span>
                    <div style={riskBadgeStyle(analysis.risk_score || 0)}>
                      {getRiskColor(analysis.risk_score || 0).icon}
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '24px' }}>{getRiskColor(analysis.risk_score || 0).emoji}</span>
                    <h2 style={{
                      ...riskLevelStyle,
                      fontSize: '20px',
                      fontWeight: '700',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}>
                      {analysis.risk_level ? analysis.risk_level.charAt(0).toUpperCase() + analysis.risk_level.slice(1) + ' Risk' : 'Unknown Risk'}
                    </h2>
                  </div>
                  <p style={{
                    ...riskDescriptionStyle,
                    fontSize: '13px',
                    opacity: 0.9,
                    lineHeight: '1.4'
                  }}>
                    {analysis.summary || 'Analysis completed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Quick Summary</h3>
              <p 
                style={summaryTextStyle}
                dangerouslySetInnerHTML={{ __html: renderMarkdownText(analysis.summary) }}
              />
            </div>

            {/* Key Points */}
            <div style={sectionStyle}>
              <h3 style={sectionTitleStyle}>Key Concerns</h3>
              <ul style={keyPointsListStyle}>
                {analysis.key_points?.map((point: string, index: number) => (
                  <li key={index} style={
                    index % 3 === 0 ? keyPointHighStyle : 
                    index % 3 === 1 ? keyPointMediumStyle : 
                    keyPointLowStyle
                  }>
                    <span style={pointIconStyle}>
                      {index % 3 === 0 ? '🔴' : index % 3 === 1 ? '🟡' : '🟢'}
                    </span>
                    <span style={pointTextStyle}>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories Breakdown */}
            {analysis.categories && (
              <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Detailed Analysis</h3>
                {Object.entries(analysis.categories).map(([category, data]: [string, any]) => (
                  <div key={category} style={categoryItemStyle}>
                    <div style={categoryHeaderStyle}>
                      <span style={categoryIconStyle}>
                        {category === 'privacy' ? '🔒' : category === 'liability' ? '⚖️' : category === 'termination' ? '🚪' : '💳'}
                      </span>
                      <span style={categoryNameStyle}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                      <span style={
                        data.score >= 7 ? categoryScoreHighStyle : 
                        data.score >= 4 ? categoryScoreMediumStyle : 
                        categoryScoreLowStyle
                      }>
                        {data.score?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <div style={categoryDetailsStyle}>
                      <p style={{ color: '#666', fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
                        {data.concerns?.join(', ') || 'No specific concerns identified'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              padding: '16px',
              display: 'flex',
              gap: '12px',
              borderTop: '1px solid #f0f0f0',
              background: '#f8f9fa'
            }}>
              <button
                onClick={handleShare}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: '#ffffff',
                  color: '#495057',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e9ecef';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Share size={16} />
                Share
              </button>
              <button
                onClick={() => {
                  // Create a detailed analysis page with analysis data
                  const analysisData = encodeURIComponent(JSON.stringify({
                    url: currentTab?.url || 'Unknown',
                    analysis: analysis,
                    timestamp: new Date().toISOString()
                  }));
                  chrome.tabs.create({ 
                    url: `chrome-extension://${chrome.runtime.id}/options/options.html#analysis=${analysisData}`
                  });
                }}
                style={{
                  flex: 2,
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  boxShadow: '0 2px 8px rgba(255, 107, 149, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 149, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 149, 0.3)';
                }}
              >
                📊 View Full Analysis
              </button>
            </div>

            {/* Cache and Mock Indicators */}
            <div style={{
              padding: '12px 16px',
              background: '#f8f9fa',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {cachedAnalysis && (
                  <span style={{
                    fontSize: '11px',
                    color: '#28a745',
                    background: '#d4edda',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #c3e6cb'
                  }}>
                    📦 Cached
                  </span>
                )}
                {analysis.mock && (
                  <span style={{
                    fontSize: '11px',
                    color: '#856404',
                    background: '#fff3cd',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #ffeaa7'
                  }}>
                    🔧 Demo Mode
                  </span>
                )}
              </div>
              <button
                onClick={refreshAnalysis}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#e9ecef';
                  e.currentTarget.style.color = '#495057';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#6c757d';
                }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          ::-webkit-scrollbar {
            width: 6px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}
      </style>
    </div>
  );
};
