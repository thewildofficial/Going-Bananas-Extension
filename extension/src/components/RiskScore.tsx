// Risk Score Component
import React from 'react';
import { RiskLevel } from '@/types';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

// Utility function to render markdown-style text
const renderMarkdownText = (text: string) => {
  // Convert **text** to <strong>text</strong>
  const boldText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* to <em>text</em>
  const italicText = boldText.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return italicText;
};

interface RiskScoreProps {
  score: number;
  level: RiskLevel;
  description?: string;
}

export const RiskScore: React.FC<RiskScoreProps> = ({ score, level, description }) => {
  const getRiskIcon = () => {
    switch (level) {
      case 'low':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'high':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getRiskColor = () => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const formatRiskLevel = (level: RiskLevel) => {
    return level.charAt(0).toUpperCase() + level.slice(1) + ' Risk';
  };

  return (
    <div className={clsx(
      'p-4 rounded-lg border-2 transition-all duration-200',
      getRiskColor()
    )}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {getRiskIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {formatRiskLevel(level)}
            </h3>
            <div className="text-2xl font-bold">
              {score.toFixed(1)}
            </div>
          </div>
          {description && (
            <p 
              className="text-sm opacity-75 mt-1"
              dangerouslySetInnerHTML={{ __html: renderMarkdownText(description) }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
