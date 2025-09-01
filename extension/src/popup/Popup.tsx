import React, { useEffect, useState } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';
import { RiskScore } from '@/components/RiskScore';
import { KeyPoints } from '@/components/KeyPoints';
import { Settings, RefreshCw, Search, Share, Edit3 } from 'lucide-react';

export const Popup: React.FC = () => {
  const { loading, analysis, error, hasTerms, analyzeCurrentPage, manualScan } = useAnalysis();
  const [content, setContent] = useState('Loading...');
  const [termsPages, setTermsPages] = useState<{ found: boolean; links: Array<{ text: string; url: string; type: string }> } | null>(null);
  const [selectedTermsContent, setSelectedTermsContent] = useState<string | null>(null);
  const [loadingTermsContent, setLoadingTermsContent] = useState<string | null>(null);
  const [toolbarActive, setToolbarActive] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');

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
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const toggleToolbar = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        if (!toolbarActive) {
          // Inject and show toolbar
          chrome.tabs.sendMessage(tabs[0].id, { action: "showToolbar" }, (response) => {
            if (response && response.success) {
              setToolbarActive(true);
            }
          });
        } else {
          // Hide toolbar
          chrome.tabs.sendMessage(tabs[0].id, { action: "hideToolbar" }, (response) => {
            if (response && response.success) {
              setToolbarActive(false);
              setSelectedText('');
            }
          });
        }
      }
    });
  };

  const analyzeSelectedText = async () => {
    if (!selectedText.trim()) {
      alert('Please select some text first!');
      return;
    }

    try {
      console.log('Analyzing selected text:', selectedText.substring(0, 100) + '...');
      
      // Get current tab URL for context
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0]?.url || 'unknown';
      
      // Use the new selected text analysis endpoint
      const response = await fetch('http://localhost:3000/api/analyze/selected-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          url: currentUrl,
          context: 'Selected text from terms and conditions document',
          options: {
            language: 'en',
            detail_level: 'comprehensive',
            focus_areas: ['data_usage', 'user_obligations', 'service_limitations', 'privacy_practices', 'liability_clauses', 'termination_terms'],
            include_recommendations: true,
            risk_assessment: true
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Selected text analysis result:', result);
      
      // Send the analysis result to the content script to display
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: "showSelectedTextAnalysis", 
            data: result.analysis,
            selectedText: selectedText
          });
        }
      });
      
    } catch (error) {
      console.error('Error analyzing selected text:', error);
      alert(`Failed to analyze selected text: ${error}`);
    }
  };

  // Listen for selected text updates
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'textSelected') {
        setSelectedText(message.text);
      } else if (message.action === 'toolbarClosed') {
        setToolbarActive(false);
        setSelectedText('');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  return (
    <div className="w-80 h-96 bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <h1 className="font-bold text-lg">Going Bananas</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleToolbar}
              className={`p-2 rounded-full transition-colors ${
                toolbarActive 
                  ? 'bg-white/30 text-white' 
                  : 'hover:bg-white/20'
              }`}
              title={toolbarActive ? 'Hide Text Selector' : 'Show Text Selector'}
            >
              <Edit3 className="w-5 h-5" />
            </button>
            <button
              onClick={handleSettings}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Status and Selected Text Display */}
        {toolbarActive && (
          <div className="mt-3 p-3 bg-white/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Text Selector Active</span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">
                {selectedText ? `${selectedText.length} chars` : 'No text selected'}
              </span>
            </div>
            
            {selectedText && (
              <div className="space-y-2">
                <div className="text-xs bg-white/10 p-2 rounded max-h-16 overflow-y-auto">
                  "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
                </div>
                <button
                  onClick={analyzeSelectedText}
                  className="w-full py-2 px-3 bg-white text-purple-600 rounded hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  Analyze Selected Text
                </button>
              </div>
            )}
            
            {!selectedText && (
              <div className="text-xs text-white/80">
                💡 Select any text on the page to analyze it
              </div>
            )}
          </div>
        )}
      </div>
      <p>{content}</p>
      
      {termsPages && termsPages.found && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Terms & Conditions Found:</h4>
          <div className="space-y-1">
            {termsPages.links.slice(0, 3).map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs">
                  {link.type === 'current' ? '📍' : link.type === 'link' ? '🔗' : '💡'}
                </span>
                <button
                  onClick={() => handleTermsLinkClick(link.url, link.text)}
                  className="text-xs text-blue-600 hover:text-blue-800 truncate text-left hover:underline"
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
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 max-h-32 overflow-y-auto">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Terms Content:</h4>
          <div className="text-xs text-gray-700 leading-relaxed">
            {selectedTermsContent.length > 500 
              ? selectedTermsContent.substring(0, 500) + '...' 
              : selectedTermsContent
            }
          </div>
          <button
            onClick={() => setSelectedTermsContent(null)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            ✕ Close
          </button>
        </div>
      )}

      {/* Content */}
      <div className="bg-white h-full overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-600">Analyzing terms and conditions...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="font-semibold text-gray-800 mb-2">Analysis Failed</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={analyzeCurrentPage}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasTerms ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="font-semibold text-gray-800 mb-2">No Terms Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              We couldn't detect any terms and conditions on this page.
            </p>
            <button
              onClick={manualScan}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Scan Manually
            </button>
          </div>
        ) : analysis ? (
          <div className="p-4 space-y-4">
            <RiskScore
              score={analysis.risk_score}
              level={analysis.risk_level}
              description={analysis.summary}
            />

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Quick Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            <KeyPoints points={analysis.key_points} />

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleShare}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Share className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => chrome.tabs.create({ url: '/options/options.html' })}
                className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
              >
                View Details
              </button>
            </div>

            {analysis.mock && (
              <div className="text-xs text-gray-400 text-center">
                ⚠️ Mock analysis for testing
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
