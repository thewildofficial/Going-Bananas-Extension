// Authentication service for Chrome extension with Supabase
import { supabase, getCurrentSession } from '@/utils/supabase';
import type { AuthState, User } from '@/types';

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null
  };

  private listeners: Array<(state: AuthState) => void> = [];

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
    const mappedUser: User = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      created_at: user.created_at
    };

    this.authState.user = mappedUser;
    this.authState.isAuthenticated = true;
    this.authState.error = null;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.authState }));
  }

  // Public state accessors
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

  // Auth actions
  public async signInWithGoogle(): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: chrome.identity.getRedirectURL()
        }
      });
      if (error) throw error;
      // Session update will be handled by Supabase; also fetch explicitly
      const session = await getCurrentSession();
      if (session?.user) {
        await this.setUser(session.user);
        await chrome.storage.local.set({ supabase_session: session });
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
      if (error) throw error;
      if (data.session?.user) {
        await this.setUser(data.session.user);
        await chrome.storage.local.set({ supabase_session: data.session });
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      await this.signOut();
    }
  }

  public async checkFirstTimeUser(): Promise<boolean> {
    try {
      if (!this.authState.user) return false;
      const result = await chrome.storage.local.get(['user_personalization_completed']);
      return !result.user_personalization_completed;
    } catch (error) {
      console.error('Error checking first-time user status:', error);
      return false;
    }
  }

  public async markPersonalizationCompleted(): Promise<void> {
    try {
      await chrome.storage.local.set({
        user_personalization_completed: true,
        personalization_completed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking personalization as completed:', error);
      throw error;
    }
  }

  // Backward-compat convenience methods (optional)
  public async isLoggedIn(): Promise<boolean> {
    return this.authState.isAuthenticated;
  }

  public async getCurrentUser(): Promise<User | null> {
    return this.authState.user;
  }
}

// Export singleton instance
export const authService = new AuthService();
