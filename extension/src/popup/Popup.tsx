// Main Popup Component
import React, { useEffect, useState } from 'react';
import { useAnalysis } from '@/hooks/useAnalysis';
import { RiskScore } from '@/components/RiskScore';
import { KeyPoints } from '@/components/KeyPoints';
import { Settings, RefreshCw, Search, Share } from 'lucide-react';

export const Popup: React.FC = () => {
  const { loading, analysis, error, hasTerms, analyzeCurrentPage, manualScan } = useAnalysis();
  const [content, setContent] = useState('Loading...');
  const [termsPages, setTermsPages] = useState<{ found: boolean; links: Array<{ text: string; url: string; type: string }> } | null>(null);

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


  const handleSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `Check out this T&C analysis from Going Bananas! Risk Score: ${analysis?.risk_score?.toFixed(1)}`
      );
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="w-80 h-96 bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍌</span>
            <h1 className="font-bold text-lg">Going Bananas</h1>
          </div>
          <button
            onClick={handleSettings}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
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
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 truncate"
                  title={link.text}
                >
                  {link.text}
                </a>
              </div>
            ))}
          </div>
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
            {/* Risk Score */}
            <RiskScore
              score={analysis.risk_score}
              level={analysis.risk_level}
              description={analysis.summary}
            />

            {/* Summary */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Quick Summary</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Key Points */}
            <KeyPoints points={analysis.key_points} />

            {/* Action Buttons */}
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

            {/* Metadata */}
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
