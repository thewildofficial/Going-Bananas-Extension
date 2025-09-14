// React hook for authentication state management
import { useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { AuthState } from '@/types';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      await authService.refreshSession();
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  };

  const checkFirstTimeUser = async () => {
    try {
      return await authService.checkFirstTimeUser();
    } catch (error) {
      console.error('Error checking first-time user:', error);
      return false;
    }
  };

  const markPersonalizationCompleted = async () => {
    try {
      await authService.markPersonalizationCompleted();
    } catch (error) {
      console.error('Error marking personalization completed:', error);
      throw error;
    }
  };

  return {
    ...authState,
    signInWithGoogle,
    signOut,
    refreshSession,
    checkFirstTimeUser,
    markPersonalizationCompleted
  };
};