export interface User {
  email: string;
  name: string;
  provider: string;
  avatar?: string;
}

export interface Session {
  user: User;
  timestamp: number;
}

import { createDevLogger } from '../utils/devLogger';
const devLog = createDevLogger('authService');

export class AuthService {
  private static instance: AuthService;
  private session: Session | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['session']);
      devLog.debug('Checking session status:', result);
      return !!result.session;
    } catch (error) {
      devLog.error('Error checking login status:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const result = await chrome.storage.local.get(['session']);
      devLog.debug('Getting current user:', result);
      return result.session?.user || null;
    } catch (error) {
      devLog.error('Error getting current user:', error);
      return null;
    }
  }

  async login(user: User): Promise<void> {
    try {
      const session: Session = { user, timestamp: Date.now() };
      await chrome.storage.local.set({ session });
      this.session = session;
      devLog.info('User logged in successfully:', { userId: user.email, name: user.name });
    } catch (error) {
      devLog.error('Error during login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear session and all onboarding/personalization data
      await chrome.storage.local.remove([
        'session', 
        'needsOnboarding',
        'personalizationCompleted',
        'personalizationCompletedAt',
        'computedProfile'
      ]);
      this.session = null;
      devLog.info('User logged out successfully - all data cleared');
    } catch (error) {
      devLog.error('Error during logout:', error);
      throw error;
    }
  }

  async openLoginPage(): Promise<void> {
    try {
      const url = chrome.runtime.getURL('login/login.html');
      await chrome.tabs.create({ url });
      devLog.info('Login page opened:', url);
    } catch (error) {
      devLog.error('Error opening login page:', error);
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
