// Login page script - handles Supabase Google OAuth authentication
import { signInWithGoogle, getCurrentSession, getUserProfile, setSessionFromTokens, exchangeCodeForSession } from './index';
import { createDevLogger } from '../utils/devLogger';

const devLog = createDevLogger('login');

// DOM selectors
const googleBtn = document.getElementById('googleBtn');
const agreeCheckbox = document.getElementById('agree');
const errorEl = document.getElementById('error');
const envEl = document.getElementById('env');

function setLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    button.disabled = true;
    button.style.opacity = '0.7';
    button.insertBefore(spinner, button.firstChild);
    const label = button.querySelector('span');
    if (label) label.textContent = 'Connecting…';
  } else {
    const spinner = button.querySelector('.spinner');
    if (spinner) spinner.remove();
    button.disabled = false;
    button.style.opacity = '1';
    const label = button.querySelector('span');
    if (label) label.textContent = 'Continue with Google';
  }
}

function isRunningAsExtension() {
  try { return !!chrome?.runtime?.id; } catch { return false; }
}

async function initEnvironment() {
  const isExtension = isRunningAsExtension();
  if (envEl) envEl.textContent = isExtension ? 'Extension Environment' : 'Preview Environment';
}

// Main authentication function
async function handleGoogleSignIn() {
  devLog.info('🚀 Starting Google sign-in process...');
  const isExtension = isRunningAsExtension();

  if (!agreeCheckbox || !(agreeCheckbox instanceof HTMLInputElement) || !agreeCheckbox.checked) {
    devLog.warn('User did not agree to terms');
    if (errorEl) {
      errorEl.textContent = 'Please accept the Terms and Privacy Policy to continue.';
      errorEl.style.color = '#ef4444';
    }
    return;
  }

  setLoading(googleBtn, true);

  try {
    if (!isExtension) {
      devLog.info('🎭 Preview mode: simulating login...');
      await new Promise(r => setTimeout(r, 1000));
      alert('Preview mode: Login simulation complete!');
      return;
    }

    devLog.info('🔧 Extension mode: initiating Supabase OAuth...');

    const result = await signInWithGoogle();
    const data = result?.data ?? result;
    const error = result?.error;

    if (error) {
      devLog.error('❌ Supabase sign-in error:', error);
      throw new Error(`Google sign-in failed: ${error.message}`);
    }

    if (data?.url) {
      devLog.info('🚀 Launching OAuth flow via chrome.identity');
      chrome.identity.launchWebAuthFlow({ url: data.url, interactive: true }, async (redirectedTo) => {
        try {
          if (chrome.runtime.lastError) {
            devLog.error('❌ WebAuthFlow error', { message: chrome.runtime.lastError.message });
            handleOAuthError(chrome.runtime.lastError.message || 'Sign-in was canceled or blocked.');
            return;
          }
          if (!redirectedTo) {
            devLog.error('❌ WebAuthFlow returned no redirect URL');
            handleOAuthError('No redirect captured. Check your OAuth redirect URI.');
            return;
          }

          devLog.debug('🔄 OAuth redirect captured');
          const url = new URL(redirectedTo);

          if (url.searchParams.get('code')) {
            const code = url.searchParams.get('code');
            devLog.info('🔐 Authorization code received, exchanging for session...');
            try {
              await exchangeCodeForSession(code);
              devLog.info('✅ Code exchange successful');
              await handleOAuthSuccess({});
              return;
            } catch (e) {
              devLog.error('❌ Code exchange failed', { message: e?.message, stack: e?.stack });
              handleOAuthError('Failed to complete authentication (code exchange)');
              return;
            }
          }

          const fragment = url.hash.substring(1);
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const expires_in = params.get('expires_in');

          if (!access_token) {
            devLog.error('❌ No access_token in OAuth redirect and no code param');
            handleOAuthError('Authentication failed: missing access token or code.');
            return;
          }

          const tokens = { access_token, refresh_token, expires_in };
          devLog.info('✅ OAuth redirect captured via WebAuthFlow - processing tokens');
          await handleOAuthSuccess(tokens);
        } catch (e) {
          devLog.error('❌ Failed to process OAuth redirect URL', { message: e?.message, stack: e?.stack });
          handleOAuthError('Failed to complete authentication');
        }
      });
    } else if (data?.session) {
      devLog.info('✅ OAuth session received directly, processing tokens...');
      const tokens = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in
      };
      await handleOAuthSuccess(tokens);
    } else {
      devLog.error('No OAuth session or URL received from Supabase', { data, error });
      throw new Error('No OAuth session or URL received from Supabase');
    }
  } catch (error) {
    devLog.error('Login error:', error);
    if (errorEl) {
      errorEl.style.color = '#ef4444';
      errorEl.textContent = error?.message || 'Login failed. Please try again.';
    }
  } finally {
    setLoading(googleBtn, false);
  }
}

async function handleOAuthSuccess(tokens) {
  devLog.info('🎉 OAuth success, processing tokens', {
    hasAccessToken: !!tokens.access_token,
    hasRefreshToken: !!tokens.refresh_token,
  });

  try {
    if (tokens?.access_token) {
      devLog.debug('🔐 Setting Supabase session from tokens');
      await setSessionFromTokens(tokens);
      devLog.debug('✅ setSessionFromTokens completed');
    }

    const session = await getCurrentSession();
    const user = await getUserProfile();

    if (session && user) {
      devLog.info('✅ User authenticated successfully', { email: user.email });
      const sessionData = {
        user: {
          email: user.email,
          name: user.user_metadata?.full_name || 
                user.user_metadata?.name || 
                user.user_metadata?.display_name ||
                user.email?.split('@')[0] || 
                'User',
          provider: 'google',
          avatar: user.user_metadata?.avatar_url
        },
        timestamp: Date.now(),
        supabase_session: session
      };

      await chrome.storage.local.set({ session: sessionData });
      devLog.info('Stored session in Chrome storage', { email: sessionData.user.email });

      // Check if this is a first-time user and if personalization is needed
      const storage = await chrome.storage.local.get(['first_time_user', 'personalizationCompleted']);
      const isFirstTime = storage.first_time_user !== false; // Default to true for new users
      const hasCompletedPersonalization = storage.personalizationCompleted === true;

      if (isFirstTime || !hasCompletedPersonalization) {
        devLog.info('🎊 First-time user detected - redirecting to personalization onboarding');
        
        if (errorEl) {
          errorEl.style.color = '#10b981';
          errorEl.textContent = `Welcome ${sessionData.user.name}! Setting up your personalized experience...`;
        }

        // Mark that this is no longer a first-time user
        await chrome.storage.local.set({ first_time_user: false });

        // Redirect to onboarding in same tab
        setTimeout(() => {
          const onboardingUrl = chrome.runtime.getURL('onboarding/onboarding.html');
          window.location.href = onboardingUrl;
        }, 1000);
        
        return;
      }

      // Existing user with completed personalization
      if (errorEl) {
        errorEl.style.color = '#10b981';
        errorEl.textContent = `Login successful! Welcome back ${sessionData.user.name}. Redirecting to extension...`;
      }

      devLog.info('🎉 Login flow completed successfully - redirecting to extension');
      setTimeout(() => { 
        // Close the login tab and let user use the extension popup
        window.close();
      }, 1500);
    } else {
      devLog.error('Session or user not available after authentication');
      handleOAuthError('Authentication incomplete. Please try again.');
    }
  } catch (error) {
    devLog.error('Error processing OAuth success', { message: error?.message, stack: error?.stack });
    handleOAuthError(error.message || 'Failed to complete authentication');
  }
}

function handleOAuthError(errorMessage) {
  devLog.error('OAuth error', { errorMessage });
  if (errorEl) {
    errorEl.style.color = '#ef4444';
    errorEl.textContent = errorMessage || 'Authentication failed. Please try again.';
  }
}

// Set up event listener when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initEnvironment();
  
  // Check if we're on a redirect page with tokens in the URL
  const isExtension = isRunningAsExtension();
  if (!isExtension && window.location.hash) {
    handleDirectOAuthRedirect();
    return;
  }
  
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleGoogleSignIn();
    });
  }
});

// Handle direct OAuth redirect (when opened in browser tab)
async function handleDirectOAuthRedirect() {
  devLog.info('🔗 Handling direct OAuth redirect from browser tab');
  
  try {
    const fragment = window.location.hash.substring(1);
    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const expires_in = params.get('expires_in');

    if (access_token) {
      devLog.info('✅ Found access token in URL, processing...');
      
      // Show processing message
      if (errorEl) {
        errorEl.style.color = '#10b981';
        errorEl.textContent = 'Processing login... Please wait.';
      }
      
      // Create Chrome extension tab with the tokens
      const extensionId = 'YOUR_EXTENSION_ID'; // This would be dynamically determined
      const onboardingUrl = `chrome-extension://${extensionId}/onboarding/onboarding.html`;
      
      // Store tokens in a way that can be accessed by the extension
      const tokenData = {
        access_token,
        refresh_token,
        expires_in,
        timestamp: Date.now()
      };
      
      // Try to communicate with extension or open extension pages
      devLog.info('🚀 Redirecting to personalization onboarding...');
      
      // Create a message to show the user
      document.body.innerHTML = `
        <div style="
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          font-family: system-ui; 
          background: linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%);
          color: white;
          text-align: center;
          padding: 20px;
        ">
          <div style="
            background: white; 
            color: #1a1a1a; 
            padding: 40px; 
            border-radius: 20px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            max-width: 400px;
          ">
            <div style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">
              🎉 Login Successful!
            </div>
            <div style="font-size: 16px; margin-bottom: 24px; color: #4a5568;">
              Welcome Malay Patel! Let's set up your personalized experience.
            </div>
            <div style="font-size: 14px; color: #718096; margin-bottom: 20px;">
              Please follow these steps to complete your setup:
            </div>
            <ol style="text-align: left; font-size: 14px; color: #4a5568; line-height: 1.6;">
              <li>Open the Going Bananas extension popup</li>
              <li>Click the "Sign in" button if you see it</li>
              <li>You'll be automatically taken to the personalization setup</li>
            </ol>
            <button onclick="window.close()" style="
              background: #ff6b95; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 8px; 
              font-weight: 600; 
              cursor: pointer;
              margin-top: 20px;
            ">
              Close This Tab
            </button>
          </div>
        </div>
      `;
      
    } else {
      devLog.error('❌ No access token found in URL redirect');
      handleOAuthError('No access token found in redirect. Please try logging in again.');
    }
    
  } catch (error) {
    devLog.error('❌ Error handling direct OAuth redirect', { error });
    handleOAuthError('Failed to process login redirect. Please try again.');
  }
}
