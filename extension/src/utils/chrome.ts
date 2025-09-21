// Chrome API utilities
import { ChromeMessage, ExtensionSettings } from '@/types';
import { SecureApiKeyStorage } from './encryption';

export const sendMessage = (message: ChromeMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
};

export const sendTabMessage = (tabId: number, message: ChromeMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
};

export const getSettings = async (): Promise<ExtensionSettings> => {
  const defaults: ExtensionSettings = {
    autoAnalyze: true,
    showNotifications: true,
    riskThreshold: 6.0,
    apiEndpoint: 'mock',
    apiKey: '',
    analysisDetail: 'standard'
  };

  // Get non-sensitive settings from sync storage
  const nonSensitiveKeys = ['autoAnalyze', 'showNotifications', 'riskThreshold', 'apiEndpoint', 'analysisDetail'];
  const stored = await chrome.storage.sync.get(nonSensitiveKeys);
  
  // Get API key from secure storage
  const secureStorage = SecureApiKeyStorage.getInstance();
  const apiKey = await secureStorage.getApiKey();
  
  return { 
    ...defaults, 
    ...stored,
    apiKey: apiKey || ''
  };
};

export const saveSettings = async (settings: Partial<ExtensionSettings>): Promise<void> => {
  // Separate sensitive and non-sensitive settings
  const { apiKey, ...nonSensitiveSettings } = settings;
  
  // Save non-sensitive settings to sync storage
  if (Object.keys(nonSensitiveSettings).length > 0) {
    await chrome.storage.sync.set(nonSensitiveSettings);
  }
  
  // Save API key to secure storage
  if (apiKey !== undefined) {
    const secureStorage = SecureApiKeyStorage.getInstance();
    await secureStorage.storeApiKey(apiKey);
  }
};

export const getCurrentTab = async (): Promise<chrome.tabs.Tab> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};

/**
 * Clear API key securely
 */
export const clearApiKey = async (): Promise<void> => {
  const secureStorage = SecureApiKeyStorage.getInstance();
  await secureStorage.clearApiKey();
};

/**
 * Check if API key is stored
 */
export const hasApiKey = async (): Promise<boolean> => {
  const secureStorage = SecureApiKeyStorage.getInstance();
  return await secureStorage.hasApiKey();
};
