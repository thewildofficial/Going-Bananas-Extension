// Key Points Component
import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Utility function to render markdown-style text
const renderMarkdownText = (text: string) => {
  // Convert **text** to <strong>text</strong>
  const boldText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* to <em>text</em>
  const italicText = boldText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return italicText;
};

interface KeyPointsProps {
  points: string[];
}

export const KeyPoints: React.FC<KeyPointsProps> = ({ points }) => {
  const getPointIcon = (index: number) => {
    if (index === 0) return <XCircle className="w-4 h-4 text-red-500" />;
    if (index === 1) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getPointStyle = (index: number) => {
    if (index === 0) return 'bg-red-50 border-l-red-400';
    if (index === 1) return 'bg-yellow-50 border-l-yellow-400';
    return 'bg-green-50 border-l-green-400';
  };

  if (!points || points.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No key points identified
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">Key Concerns</h3>
      <div className="space-y-2">
        {points.slice(0, 5).map((point, index) => (
          <div
            key={index}
            className={`p-3 border-l-4 rounded-r-lg ${getPointStyle(index)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getPointIcon(index)}
              </div>
              <p 
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdownText(point) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
