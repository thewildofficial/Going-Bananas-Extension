// Content script to handle OAuth success and communicate with extension
// This script runs on localhost:3000 pages and helps transfer session data

console.log('🎯 Going Bananas OAuth content script loaded');

// Listen for session data from the OAuth success page
window.addEventListener('message', (event) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) {
    return;
  }
  
  if (event.data.type === 'GOING_BANANAS_SESSION_CREATED') {
    console.log('🎉 Received session data from OAuth success page');
    
    // Send session data to extension background script
    chrome.runtime.sendMessage({
      action: 'OAUTH_SESSION_CREATED',
      sessionData: event.data.sessionData
    }, (response) => {
      console.log('✅ Session data sent to extension:', response);
    });
  }
});

// Also check for existing session data on page load
window.addEventListener('load', () => {
  try {
    const sessionData = localStorage.getItem('goingBananas_userSession');
    const loginSuccess = localStorage.getItem('goingBananas_loginSuccess');
    
    if (sessionData && loginSuccess) {
      console.log('🔍 Found existing session data on page load');
      const parsedSession = JSON.parse(sessionData);
      
      // Send to extension
      chrome.runtime.sendMessage({
        action: 'OAUTH_SESSION_FOUND',
        sessionData: parsedSession
      }, (response) => {
        console.log('✅ Existing session data sent to extension:', response);
      });
    }
  } catch (error) {
    console.log('⚠️ Could not check for existing session data:', error);
  }
});