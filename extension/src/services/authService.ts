export interface User {
  email: string;
  name: string;
  provider: string;
}

export interface Session {
  user: User;
  timestamp: number;
}

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
      return !!result.session;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const result = await chrome.storage.local.get(['session']);
      return result.session?.user || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async login(user: User): Promise<void> {
    try {
      const session: Session = {
        user,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ session });
      this.session = session;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await chrome.storage.local.remove(['session']);
      this.session = null;
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  async openLoginPage(): Promise<void> {
    try {
      const url = chrome.runtime.getURL('login/login.html');
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Error opening login page:', error);
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
<<<<<<< HEAD
// Authentication service for Chrome extension with Supabase
import { supabase, getCurrentSession, getUserProfile } from '@/utils/supabase';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  };

  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    this.setLoading(true);
    try {
      const session = await getCurrentSession();
      if (session?.user) {
        await this.setUser(session.user);
      }
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.authState.loading = loading;
    this.notifyListeners();
  }

  private setError(error: string | null) {
    this.authState.error = error;
    this.notifyListeners();
  }

  private async setUser(user: any) {
    this.authState.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      created_at: user.created_at
    };
    this.authState.isAuthenticated = true;
    this.authState.error = null;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.authState }));
  }

  // Public methods
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async signInWithGoogle(): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      // Use Chrome identity API for OAuth
      const redirectUrl = chrome.identity.getRedirectURL();
      
      // Launch OAuth flow
      const authUrl = await this.buildGoogleAuthUrl(redirectUrl);
      
      // Launch auth flow
      const responseUrl = await new Promise<string>((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true
        }, (responseUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (responseUrl) {
            resolve(responseUrl);
          } else {
            reject(new Error('No response URL received'));
          }
        });
      });

      // Extract code from response URL
      const code = this.extractCodeFromUrl(responseUrl);
      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        throw error;
      }

      if (data.session?.user) {
        await this.setUser(data.session.user);
        
        // Store session in Chrome storage
        await chrome.storage.local.set({
          supabase_session: data.session
        });
      }

    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Sign-in failed');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public async signOut(): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      await supabase.auth.signOut();
      
      // Clear Chrome storage
      await chrome.storage.local.remove(['supabase_session']);
      
      this.authState.isAuthenticated = false;
      this.authState.user = null;
      this.authState.error = null;
      this.notifyListeners();

    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Sign-out failed');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  public async refreshSession(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      
      if (data.session?.user) {
        await this.setUser(data.session.user);
        
        // Update stored session
        await chrome.storage.local.set({
          supabase_session: data.session
        });
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      // If refresh fails, user needs to sign in again
      await this.signOut();
    }
  }

  private async buildGoogleAuthUrl(redirectUrl: string): Promise<string> {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
    const clientId = process.env.REACT_APP_SUPABASE_CLIENT_ID || 'your-client-id';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private extractCodeFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('code');
    } catch (error) {
      console.error('Failed to extract code from URL:', error);
      return null;
    }
  }

  public async checkFirstTimeUser(): Promise<boolean> {
    try {
      const user = this.authState.user;
      if (!user) return false;

      // Check if user has completed personalization
      const { data } = await chrome.storage.local.get(['user_personalization_completed']);
      return !data.user_personalization_completed;
    } catch (error) {
      console.error('Error checking first-time user status:', error);
=======
export interface User {
  email: string;
  name: string;
  provider: string;
}

export interface Session {
  user: User;
  timestamp: number;
}

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
      return !!result.session;
    } catch (error) {
      console.error('Error checking login status:', error);
>>>>>>> ad0c48c (feat: update login UI to match extension theme)
      return false;
    }
  }

<<<<<<< HEAD
  public async markPersonalizationCompleted(): Promise<void> {
    try {
      await chrome.storage.local.set({
        user_personalization_completed: true,
        personalization_completed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking personalization as completed:', error);
=======
  async getCurrentUser(): Promise<User | null> {
    try {
      const result = await chrome.storage.local.get(['session']);
      return result.session?.user || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async login(user: User): Promise<void> {
    try {
      const session: Session = {
        user,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ session });
      this.session = session;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await chrome.storage.local.remove(['session']);
      this.session = null;
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  async openLoginPage(): Promise<void> {
    try {
      const url = chrome.runtime.getURL('login/login.html');
      await chrome.tabs.create({ url });
    } catch (error) {
      console.error('Error opening login page:', error);
>>>>>>> ad0c48c (feat: update login UI to match extension theme)
      throw error;
    }
  }
}

<<<<<<< HEAD
// Export singleton instance
export const authService = new AuthService();
=======
export const authService = AuthService.getInstance();
>>>>>>> ad0c48c (feat: update login UI to match extension theme)
