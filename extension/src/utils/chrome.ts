// Chrome API utilities
import { ChromeMessage, ExtensionSettings } from '@/types';

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

  const stored = await chrome.storage.sync.get(Object.keys(defaults));
  return { ...defaults, ...stored };
};

export const saveSettings = async (settings: Partial<ExtensionSettings>): Promise<void> => {
  await chrome.storage.sync.set(settings);
};

export const getCurrentTab = async (): Promise<chrome.tabs.Tab> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
};
