// Custom hook for managing analysis state
import { useState, useEffect } from 'react';
import { AnalysisResult, AnalysisState } from '@/types';
import { sendMessage, getCurrentTab } from '@/utils/chrome';

export const useAnalysis = () => {
  const [state, setState] = useState<AnalysisState>({
    loading: true,
    analysis: null,
    error: null,
    hasTerms: false
  });

  const analyzeCurrentPage = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const tab = await getCurrentTab();
      const response = await sendMessage({
        action: 'analyzeTerms',
        data: { tabId: tab.id }
      });

      if (response.success) {
        setState({
          loading: false,
          analysis: response.analysis,
          error: null,
          hasTerms: !!response.analysis
        });
      } else {
        setState({
          loading: false,
          analysis: null,
          error: response.error || 'Analysis failed',
          hasTerms: false
        });
      }
    } catch (error) {
      setState({
        loading: false,
        analysis: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasTerms: false
      });
    }
  };

  const manualScan = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const tab = await getCurrentTab();
      const response = await sendMessage({
        action: 'manualScan',
        data: { tabId: tab.id }
      });

      if (response.success) {
        setState({
          loading: false,
          analysis: response.analysis,
          error: null,
          hasTerms: !!response.analysis
        });
      } else {
        setState({
          loading: false,
          analysis: null,
          error: response.error || 'Manual scan failed',
          hasTerms: false
        });
      }
    } catch (error) {
      setState({
        loading: false,
        analysis: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasTerms: false
      });
    }
  };

  useEffect(() => {
    analyzeCurrentPage();
  }, []);

  return {
    ...state,
    analyzeCurrentPage,
    manualScan
  };
};
