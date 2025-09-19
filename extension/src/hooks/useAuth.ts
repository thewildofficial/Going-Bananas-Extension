// React hook for authentication state management aligned with current authService
import { useState, useEffect } from 'react';
import { authService, User as ServiceUser } from '@/services/authService';
import { createDevLogger } from '@/utils/devLogger';

interface AuthState {
  isAuthenticated: boolean;
  user: (ServiceUser & { avatar_url?: string }) | null;
  loading: boolean;
  error?: string;
}

const devLog = createDevLogger('auth');

function mapServiceUserToTypesUser(user: ServiceUser | null): (ServiceUser & { avatar_url?: string }) | null {
  if (!user) return null;
  return {
    ...user,
    avatar_url: (user as any).avatar || undefined
  };
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({ isAuthenticated: false, user: null, loading: true });

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        devLog.debug('Loading auth session from storage');
        
        // Check for existing Chrome extension session
        const result = await chrome.storage.local.get(['session', 'needsOnboarding']);
        const session = result.session as { user: ServiceUser } | undefined;
        const needsOnboarding = result.needsOnboarding;
        
        if (session?.user) {
          devLog.info('✅ Found existing session for user:', session.user.email);
          const mappedUser = mapServiceUserToTypesUser(session.user);
          
          if (!isMounted) return;
          setState({ isAuthenticated: true, user: mappedUser, loading: false });
          
          // Auto-redirect to onboarding if needed
          if (needsOnboarding) {
            devLog.info('🚀 User needs onboarding, redirecting...');
            setTimeout(async () => {
              try {
                const onboardingUrl = chrome.runtime.getURL('onboarding/onboarding.html');
                await chrome.tabs.create({ url: onboardingUrl });
                // Clear the onboarding flag
                await chrome.storage.local.remove(['needsOnboarding']);
              } catch (error) {
                devLog.error('Failed to open onboarding:', error);
              }
            }, 1000);
          }
          
          return;
        }
        
        // No session found
        devLog.debug('No existing session found');
        if (!isMounted) return;
        setState({ isAuthenticated: false, user: null, loading: false });
        
      } catch (error) {
        devLog.error('Failed to load auth session', { error });
        if (!isMounted) return;
        setState((prev) => ({ ...prev, loading: false, error: 'Auth load failed' }));
      }
    };

    loadSession();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.session) {
        const newSession = changes.session.newValue as { user: ServiceUser } | null;
        const mappedUser = mapServiceUserToTypesUser(newSession?.user || null);
        devLog.debug('Auth session changed', { hasUser: Boolean(newSession?.user) });
        setState((prev) => ({ ...prev, isAuthenticated: Boolean(newSession?.user), user: mappedUser }));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      isMounted = false;
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      devLog.info('Opening login page');
      await authService.openLoginPage();
    } catch (error) {
      devLog.error('Sign-in failed', { error });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      devLog.info('Signing out');
      await authService.logout();
    } catch (error) {
      devLog.error('Sign-out failed', { error });
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      const result = await chrome.storage.local.get(['session']);
      const session = result.session as { user: ServiceUser } | undefined;
      setState((prev) => ({ ...prev, isAuthenticated: Boolean(session?.user), user: mapServiceUserToTypesUser(session?.user || null) }));
    } catch {
      // ignore
    }
  };

  const checkFirstTimeUser = async () => {
    try {
      const result = await chrome.storage.local.get(['first_time_user']);
      return Boolean(result.first_time_user);
    } catch {
      return false;
    }
  };

  return { ...state, signInWithGoogle, signOut, refreshSession, checkFirstTimeUser };
};
