/**
 * Onboarding Page Script for Going Bananas Extension
 * 
 * This script initializes the React-based onboarding flow for new users
 * to complete their personalization preferences.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { OnboardingFlow } from '@/components/personalization/OnboardingFlow';
import { createDevLogger } from '@/utils/devLogger';

const devLog = createDevLogger('onboarding-page');

// Get current user session
async function getCurrentUser() {
  try {
    const result = await chrome.storage.local.get(['session']);
    const session = result.session;
    
    if (!session?.user) {
      devLog.error('No user session found');
      throw new Error('No user session found. Please sign in first.');
    }
    
    devLog.info('Current user session loaded', { email: session.user.email });
    return session.user;
  } catch (error) {
    devLog.error('Failed to get current user', { error });
    throw error;
  }
}

// Show error state
function showError(message) {
  devLog.error('Showing error state', { message });
  
  const root = document.getElementById('root');
  const errorTemplate = document.getElementById('error-template');
  
  if (root && errorTemplate) {
    const errorContent = errorTemplate.content.cloneNode(true);
    const errorMessage = errorContent.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    
    root.innerHTML = '';
    root.appendChild(errorContent);
  }
}

// Handle onboarding completion
function handleOnboardingComplete(profile) {
  devLog.info('Onboarding completed successfully', { 
    userId: profile.userId,
    hasComputedProfile: !!profile.computedProfile 
  });
  
  // Show success message briefly
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div class="loading-container">
        <div style="width: 48px; height: 48px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="loading-text">Setup Complete!</div>
        <div class="loading-subtext">
          Going Bananas is now personalized to your preferences. Closing in 3 seconds...
        </div>
      </div>
    `;
  }
  
  // Close the tab after showing success
  setTimeout(() => {
    window.close();
  }, 3000);
}

// Handle onboarding error
function handleOnboardingError(error) {
  devLog.error('Onboarding failed', { error });
  showError(error || 'Failed to complete setup. Please try again.');
}

// Initialize the onboarding flow
async function initializeOnboarding() {
  try {
    devLog.info('Initializing onboarding flow');
    
    // Get the current user
    const user = await getCurrentUser();
    
    // Check if we have a valid user ID (could be email or actual ID)
    const userId = user.id || user.email;
    if (!userId) {
      throw new Error('Invalid user data. Please sign in again.');
    }
    
    // Initialize React app
    const root = document.getElementById('root');
    if (!root) {
      throw new Error('Root element not found');
    }
    
    devLog.info('Starting React onboarding app', { userId });
    
    const reactRoot = ReactDOM.createRoot(root);
    reactRoot.render(
      <OnboardingFlow
        userId={userId}
        onComplete={handleOnboardingComplete}
        onError={handleOnboardingError}
      />
    );
    
  } catch (error) {
    devLog.error('Failed to initialize onboarding', { error });
    showError(error.message || 'Failed to initialize setup. Please try signing in again.');
  }
}

// Check if this is a Chrome extension environment
function isRunningAsExtension() {
  try { 
    return !!chrome?.runtime?.id; 
  } catch { 
    return false; 
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  devLog.info('DOM loaded, checking environment');
  
  if (!isRunningAsExtension()) {
    devLog.warn('Not running in extension environment');
    showError('This page must be opened from the Going Bananas extension.');
    return;
  }
  
  // Small delay to ensure everything is loaded
  setTimeout(initializeOnboarding, 100);
});

// Handle errors that might occur during loading
window.addEventListener('error', (event) => {
  devLog.error('Unhandled error during onboarding', { 
    message: event.message,
    filename: event.filename,
    lineno: event.lineno 
  });
  showError('An unexpected error occurred. Please refresh the page and try again.');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  devLog.error('Unhandled promise rejection during onboarding', { 
    reason: event.reason 
  });
  showError('An unexpected error occurred. Please refresh the page and try again.');
});