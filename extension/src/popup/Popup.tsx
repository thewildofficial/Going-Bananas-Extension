import React, { useEffect, useState } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Settings, RefreshCw, Search, Share, Edit3 } from 'lucide-react';
import { getApiUrl } from '@/utils/config';
import { renderMarkdownText } from '@/utils/markdown';

export const Popup: React.FC = () => {
  const { loading, analysis, error, hasTerms, analyzeCurrentPage, manualScan } = useAnalysis();
  const [content, setContent] = useState('Loading...');
  const [termsPages, setTermsPages] = useState<{ found: boolean; links: Array<{ text: string; url: string; type: string }> } | null>(null);
  const [selectedTermsContent, setSelectedTermsContent] = useState<string | null>(null);
  const [loadingTermsContent, setLoadingTermsContent] = useState<string | null>(null);
  const [toolbarActive, setToolbarActive] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<Array<{id: string, text: string, element: string}>>([]);
  const [notification, setNotification] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "readPageContent" }, (response) => {
          if (response && response.content) {
            setContent(response.content);
          } else {
            setContent("Couldn't read terms & conditions.");
          }
        });

        chrome.tabs.sendMessage(tabs[0].id, { action: "findTermsPages" }, (response) => {
          if (response && response.termsPages) {
            setTermsPages(response.termsPages);
          }
        });
      } else {
        setContent('Unable to access tab.');
      }
    });
  }, []);

  const handleTermsLinkClick = async (url: string, linkText: string) => {
    setLoadingTermsContent(url);
    setSelectedTermsContent(null);

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: "fetchTermsContent", 
            url: url 
          }, (response) => {
            setLoadingTermsContent(null);
            if (response && response.content) {
              setSelectedTermsContent(response.content.content || 'No content found');
            } else {
              setSelectedTermsContent(`Failed to load content from: ${linkText}`);
            }
          });
        }
      });
    } catch (error) {
      setLoadingTermsContent(null);
      setSelectedTermsContent(`Error loading content: ${error}`);
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

  // Beautiful enhanced inline styles
  const containerStyle: React.CSSProperties = {
    width: '400px',
    height: '650px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#1a1a1a',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '16px',
    margin: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 50%, #ffa8a8 100%)',
    color: 'white',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 4px 20px rgba(255, 107, 107, 0.3)',
    position: 'relative',
    overflow: 'hidden'
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    zIndex: 2
  };

  const bananaIconStyle: React.CSSProperties = {
    fontSize: '28px',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
    animation: 'bounce 2s infinite'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    letterSpacing: '-0.5px'
  };

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    borderRadius: '12px',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    zIndex: 2
  };

  const buttonHoverStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.25)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    overflowY: 'auto',
    borderRadius: '0 0 16px 16px'
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

  const riskHeaderStyle: React.CSSProperties = {
    padding: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
    position: 'relative',
    overflow: 'hidden'
  };

  const riskScoreStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  };

  const scoreCircleStyle: React.CSSProperties = {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    position: 'relative',
    zIndex: 2
  };

  const scoreNumberStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '800',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
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
    padding: '24px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(10px)'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#1a1a1a',
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px'
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
    gap: '16px',
    marginBottom: '16px',
    padding: '16px',
    borderRadius: '12px',
    background: 'rgba(248, 249, 250, 0.8)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.3s ease'
  };

  const keyPointHighStyle: React.CSSProperties = {
    ...keyPointStyle,
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    borderLeft: '4px solid #ef4444',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
  };

  const keyPointMediumStyle: React.CSSProperties = {
    ...keyPointStyle,
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    borderLeft: '4px solid #f59e0b',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
  };

  const keyPointLowStyle: React.CSSProperties = {
    ...keyPointStyle,
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    borderLeft: '4px solid #10b981',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
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

      {/* Toolbar Status */}
      {toolbarActive && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'white' }}>
              Block Selector Active
            </span>
            <span style={{
              fontSize: '11px',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 8px',
              borderRadius: '12px',
              color: 'white'
            }}>
              {selectedBlocks.length > 0 ? `${selectedBlocks.length} blocks selected` : 'Ready to select'}
            </span>
          </div>
          
          {selectedBlocks.length > 0 && (
            <div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '8px',
                padding: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                maxHeight: '40px',
                overflowY: 'auto'
              }}>
                {selectedBlocks.length} content blocks selected ({selectedBlocks.reduce((total, block) => total + block.text.length, 0)} chars total)
              </div>
              <button
                onClick={analyzeSelectedBlocks}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#ff6b95',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Analyze Selected Blocks
              </button>
            </div>
          )}
          
          {selectedBlocks.length === 0 && (
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              padding: '8px'
            }}>
              💡 Click on content blocks on the page to select them for analysis
            </div>
          )}
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '20px',
          right: '20px',
          zIndex: 50,
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
          background: notification.type === 'error' ? '#fee' : notification.type === 'success' ? '#e8f5e8' : '#e3f2fd',
          border: notification.type === 'error' ? '1px solid #ffcdd2' : notification.type === 'success' ? '1px solid #c8e6c9' : '1px solid #bbdefb',
          color: notification.type === 'error' ? '#c62828' : notification.type === 'success' ? '#2e7d32' : '#1565c0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>
              {notification.type === 'error' && '⚠️ '}
              {notification.type === 'success' && '✅ '}
              {notification.type === 'info' && 'ℹ️ '}
            </span>
            <span style={{ flex: 1, fontSize: '12px', fontWeight: '500' }}>
              {notification.message}
            </span>
            <button
              onClick={() => setNotification(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                opacity: 0.7
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Terms Pages Found */}
      {termsPages && termsPages.found && (
        <div style={{
          padding: '12px 20px',
          background: '#fff3cd',
          borderBottom: '1px solid #ffeaa7'
        }}>
          <h4 style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#856404',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Terms & Conditions Found:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {termsPages.links.slice(0, 3).map((link, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px' }}>
                  {link.type === 'current' ? '📍' : link.type === 'link' ? '🔗' : '💡'}
                </span>
                <button
                  onClick={() => handleTermsLinkClick(link.url, link.text)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0066cc',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  title={`Click to read: ${link.text}`}
                  disabled={loadingTermsContent === link.url}
                >
                  {loadingTermsContent === link.url ? '⏳ Loading...' : link.text}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Terms Content */}
      {selectedTermsContent && (
        <div style={{
          padding: '12px 20px',
          background: '#e3f2fd',
          borderBottom: '1px solid #bbdefb',
          maxHeight: '120px',
          overflowY: 'auto'
        }}>
          <h4 style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#1565c0',
            marginBottom: '8px',
            margin: '0 0 8px 0'
          }}>
            Terms Content:
          </h4>
          <div style={{
            fontSize: '11px',
            color: '#333',
            lineHeight: '1.4',
            marginBottom: '8px'
          }}>
            {selectedTermsContent.length > 500 
              ? selectedTermsContent.substring(0, 500) + '...' 
              : selectedTermsContent
            }
          </div>
          <button
            onClick={() => setSelectedTermsContent(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#1565c0',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={mainContentStyle}>
        {loading ? (
          <div style={loadingStyle}>
            <div style={spinnerStyle}></div>
            <p style={{ color: '#666', margin: 0 }}>Analyzing terms and conditions...</p>
          </div>
        ) : error ? (
          <div style={errorStateStyle}>
            <div style={errorIconStyle}>⚠️</div>
            <h3 style={{ marginBottom: '8px', color: '#d32f2f', margin: '0 0 8px 0' }}>Analysis Failed</h3>
            <p style={{ color: '#777', marginBottom: '24px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
              {error}
            </p>
            <button
              onClick={analyzeCurrentPage}
              style={retryButtonStyle}
            >
              Try Again
            </button>
          </div>
        ) : !hasTerms ? (
          <div style={noTermsStyle}>
            <div style={emptyIconStyle}>📄</div>
            <h3 style={{ marginBottom: '8px', color: '#555', margin: '0 0 8px 0' }}>No Terms Found</h3>
            <p style={{ color: '#777', marginBottom: '24px', margin: '0 0 24px 0' }}>
              We couldn't detect any terms and conditions on this page.
            </p>
            <button
              onClick={manualScan}
              style={scanButtonStyle}
            >
              <Search size={16} />
              Scan Manually
            </button>
          </div>
        ) : analysis ? (
          <div style={resultsStyle}>
            {/* Risk Score Header */}
            <div style={riskHeaderStyle}>
              <div style={riskScoreStyle}>
                <div style={scoreCircleStyle}>
                  <span style={scoreNumberStyle}>{analysis.risk_score?.toFixed(1) || 'N/A'}</span>
                </div>
                <div>
                  <h2 style={riskLevelStyle}>
                    {analysis.risk_level ? analysis.risk_level.charAt(0).toUpperCase() + analysis.risk_level.slice(1) + ' Risk' : 'Unknown Risk'}
                  </h2>
                  <p style={riskDescriptionStyle}>
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
                {analysis.key_points?.map((point, index) => (
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
            <div style={actionButtonsStyle}>
              <button
                onClick={handleShare}
                style={btnSecondaryStyle}
              >
                <Share size={16} />
                Share Results
              </button>
              <button
                onClick={() => chrome.tabs.create({ url: '/options/options.html' })}
                style={btnPrimaryStyle}
              >
                View Full Analysis
              </button>
            </div>

            {analysis.mock && (
              <div style={{
                textAlign: 'center',
                fontSize: '11px',
                color: '#999',
                padding: '8px',
                background: '#f8f9fa',
                borderTop: '1px solid #e9ecef'
              }}>
                ⚠️ Mock analysis for testing
              </div>
            )}
          </div>
        ) : null}
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
