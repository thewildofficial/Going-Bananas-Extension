// Enhanced popup with authentication and first-time user flow
import React, { useEffect, useState } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAuth } from '@/hooks/useAuth';
import { RiskScore } from '@/components/RiskScore';
import { KeyPoints } from '@/components/KeyPoints';
import { LoginButton } from '@/components/LoginButton';
import PersonalizationForm from '@/components/PersonalizationForm';
import { Settings, RefreshCw, Search, Share, User } from 'lucide-react';
import { PersonalizationData } from '@/types';

export const PopupWithAuth: React.FC = () => {
  const { loading, analysis, error, hasTerms, analyzeCurrentPage, manualScan } = useAnalysis();
  const { isAuthenticated, user, checkFirstTimeUser, markPersonalizationCompleted } = useAuth();
  const [content, setContent] = useState('Loading...');
  const [termsPages, setTermsPages] = useState<{ found: boolean; links: Array<{ text: string; url: string; type: string }> } | null>(null);
  const [selectedTermsContent, setSelectedTermsContent] = useState<string | null>(null);
  const [loadingTermsContent, setLoadingTermsContent] = useState<string | null>(null);
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initializePopup = async () => {
      if (isAuthenticated && user) {
        const firstTime = await checkFirstTimeUser();
        setIsFirstTimeUser(firstTime);
        if (firstTime) setShowPersonalization(true);
      }
      setAuthChecked(true);
    };
    initializePopup();
  }, [isAuthenticated, user, checkFirstTimeUser]);

  useEffect(() => {
    if (!authChecked) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'readPageContent' }, (response) => {
          if (response && response.content) setContent(response.content);
          else setContent("Couldn't read terms & conditions.");
        });
        chrome.tabs.sendMessage(tabs[0].id, { action: 'findTermsPages' }, (response) => {
          if (response && response.termsPages) setTermsPages(response.termsPages);
        });
      } else {
        setContent('Unable to access tab.');
      }
    });
  }, [authChecked]);

  const handleTermsLinkClick = async (url: string, linkText: string) => {
    setLoadingTermsContent(url);
    setSelectedTermsContent(null);
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'fetchTermsContent', url },
            (response) => {
              setLoadingTermsContent(null);
              if (response && response.content) setSelectedTermsContent(response.content.content || 'No content found');
              else setSelectedTermsContent(`Failed to load content from: ${linkText}`);
            }
          );
        }
      });
    } catch (error) {
      setLoadingTermsContent(null);
      setSelectedTermsContent(`Error loading content: ${error}`);
    }
  };

  const handleSettings = () => chrome.runtime.openOptionsPage();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `Check out this T&C analysis from Going Bananas! Risk Score: ${analysis?.risk_score?.toFixed(1)}`
      );
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handlePersonalizationSubmit = async (data: PersonalizationData) => {
    try {
      const response = await fetch('https://api.goingbananas.dev/api/personalization/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.id}`,
        },
        body: JSON.stringify({ userId: user?.id, completedAt: new Date().toISOString(), ...data }),
      });
      if (response.ok) {
        await markPersonalizationCompleted();
        setShowPersonalization(false);
        setIsFirstTimeUser(false);
      } else {
        throw new Error('Failed to save personalization data');
      }
    } catch (error) {
      console.error('Failed to submit personalization:', error);
      throw error;
    }
  };

  const handlePersonalizationSkip = () => {
    setShowPersonalization(false);
    setIsFirstTimeUser(false);
  };

  const handleLoginSuccess = () => {
    checkFirstTimeUser().then((firstTime) => {
      setIsFirstTimeUser(firstTime);
      if (firstTime) setShowPersonalization(true);
    });
  };

  if (showPersonalization && isFirstTimeUser && user) {
    return (
      <div className="w-96 h-[500px] bg-white overflow-hidden">
        <PersonalizationForm onSubmit={handlePersonalizationSubmit} onSkip={handlePersonalizationSkip} />
      </div>
    );
  }

  if (!isAuthenticated && authChecked) {
    return (
      <div className="w-80 h-96 bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-400 to-pink-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍌</span>
              <h1 className="font-bold text-lg">Going Bananas</h1>
            </div>
            <button onClick={handleSettings} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="bg-white h-full overflow-y-auto p-4">
          <LoginButton onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="w-80 h-96 bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-400 to-pink-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍌</span>
              <h1 className="font-bold text-lg">Going Bananas</h1>
            </div>
          </div>
        </div>
        <div className="bg-white h-full flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 h-96 bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <h1 className="font-bold text-lg">Going Bananas</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="flex items-center space-x-2">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name || user.email} className="h-6 w-6 rounded-full" />
                ) : (
                  <User className="h-6 w-6" />
                )}
                <span className="text-sm font-medium truncate max-w-20">{user.name || user.email.split('@')[0]}</span>
              </div>
            )}
            <button onClick={handleSettings} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {termsPages && termsPages.found && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">Terms & Conditions Found:</h4>
          <div className="space-y-1">
            {termsPages.links.slice(0, 3).map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs">{link.type === 'current' ? '📍' : link.type === 'link' ? '🔗' : '💡'}</span>
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

      {selectedTermsContent && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 max-h-32 overflow-y-auto">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Terms Content:</h4>
          <div className="text-xs text-gray-700 leading-relaxed">
            {selectedTermsContent.length > 500 ? `${selectedTermsContent.substring(0, 500)}...` : selectedTermsContent}
          </div>
          <button onClick={() => setSelectedTermsContent(null)} className="text-xs text-blue-600 hover:text-blue-800 mt-1">
            ✕ Close
          </button>
        </div>
      )}

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
            <button onClick={analyzeCurrentPage} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              Try Again
            </button>
          </div>
        ) : !hasTerms ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="font-semibold text-gray-800 mb-2">No Terms Found</h3>
            <p className="text-sm text-gray-600 mb-4">We couldn't detect any terms and conditions on this page.</p>
            <button onClick={manualScan} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
              <Search className="w-4 h-4" />
              Scan Manually
            </button>
          </div>
        ) : analysis ? (
          <div className="p-4 space-y-4">
            <RiskScore score={analysis.risk_score} level={analysis.risk_level} description={analysis.summary} />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Quick Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
            </div>
            <KeyPoints points={analysis.key_points} />
            <div className="flex gap-2 pt-2">
              <button onClick={handleShare} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm">
                <Share className="w-4 h-4" />
                Share
              </button>
              <button onClick={() => chrome.tabs.create({ url: '/options/options.html' })} className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm">
                View Details
              </button>
            </div>
            {analysis.mock && <div className="text-xs text-gray-400 text-center">⚠️ Mock analysis for testing</div>}
          </div>
        ) : null}
      </div>
    </div>
  );
};
