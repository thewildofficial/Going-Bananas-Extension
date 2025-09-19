// Supabase configuration and client setup
import { createClient } from '@supabase/supabase-js';
import { createDevLogger } from './devLogger';
import { getApiUrl } from './config';

let supabaseConfig: { url: string; anonKey: string } | null = null;
let supabaseClient: any = null;

const devLog = createDevLogger('supabase');

function formatErrorDetails(err: unknown) {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  try { return { message: JSON.stringify(err), stack: undefined as unknown as string }; }
  catch { return { message: String(err), stack: undefined as unknown as string }; }
}

async function fetchSupabaseConfig(): Promise<{ url: string; anonKey: string }> {
  if (supabaseConfig) {
    devLog.debug('Using cached Supabase config');
    return supabaseConfig;
  }

  try {
    devLog.info('Fetching Supabase configuration from backend...');
    const apiUrl = await getApiUrl();
    const configUrl = `${apiUrl}/config/supabase`;
    const response = await fetch(configUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      devLog.error('Config fetch failed:', { status: response.status, error: errorText });
      throw new Error(`Failed to fetch Supabase config: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.config || !data.config.url || !data.config.anonKey) {
      devLog.error('Invalid config response:', data);
      throw new Error('Supabase configuration is invalid');
    }
    
    supabaseConfig = { url: data.config.url, anonKey: data.config.anonKey };
    devLog.info('Supabase config loaded', { 
      url: supabaseConfig.url, 
      anonKeyPrefix: supabaseConfig.anonKey.substring(0, 20) + '...' 
    });
    
    return supabaseConfig;
  } catch (error) {
    devLog.error('Failed to fetch Supabase configuration:', error);
    throw new Error(
      `Unable to initialize Supabase: ${
        error instanceof Error ? error.message : 'Unknown error'
      }. Please ensure the backend server is running and properly configured.`
    );
  }
}

export async function getSupabaseClient() {
  if (supabaseClient) {
    devLog.debug('Using cached Supabase client');
    return supabaseClient;
  }
  try {
    devLog.info('Creating new Supabase client...');
    const config = await fetchSupabaseConfig();
    supabaseClient = createClient(config.url, config.anonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
    });
    devLog.info('Supabase client created');
    return supabaseClient;
  } catch (error) {
    devLog.error('Failed to create Supabase client:', error);
    throw error;
  }
}

export const supabase = {
  auth: {
    signInWithOAuth: async (options: any) => {
      const client = await getSupabaseClient();
      return client.auth.signInWithOAuth(options);
    },
    getSession: async () => {
      const client = await getSupabaseClient();
      return client.auth.getSession();
    },
    getUser: async () => {
      const client = await getSupabaseClient();
      return client.auth.getUser();
    },
    signOut: async () => {
      const client = await getSupabaseClient();
      return client.auth.signOut();
    },
    onAuthStateChange: (callback: any) => {
      return getSupabaseClient().then(client => client.auth.onAuthStateChange(callback));
    }
  }
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const getCurrentSession = async () => {
  try {
    const client = await getSupabaseClient();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      devLog.error('Error getting session', formatErrorDetails(error));
      return null;
    }
    return session;
  } catch (error) {
    devLog.error('Failed to get session', formatErrorDetails(error));
    return null;
  }
};

export const signInWithGoogle = async () => {
  try {
    devLog.info('Starting Google sign-in process...');
    const client = await getSupabaseClient();
    const redirectURL = chrome.identity.getRedirectURL();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectURL,
        queryParams: { access_type: 'offline', prompt: 'consent' },
        skipBrowserRedirect: true
      }
    });
    if (error) {
      devLog.error('Supabase OAuth error', formatErrorDetails(error));
      throw new Error(`Supabase OAuth failed: ${error.message}`);
    }
    if (!data || !data.url) {
      devLog.error('No OAuth URL received from Supabase');
      throw new Error('No OAuth URL received from Supabase');
    }
    devLog.info('OAuth URL generated', data.url);
    return { data, error };
  } catch (error) {
    devLog.error('Failed to initiate Google sign-in', formatErrorDetails(error));
    throw error;
  }
};

export const exchangeCodeForSession = async (code: string) => {
  try {
    devLog.info('Exchanging authorization code for session...');
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.exchangeCodeForSession({ code });
    if (error) {
      devLog.error('exchangeCodeForSession error', formatErrorDetails(error));
      throw error;
    }
    devLog.info('Authorization code exchanged');
    return data;
  } catch (error) {
    devLog.error('Failed to exchange authorization code', formatErrorDetails(error));
    throw error;
  }
};

export const signOut = async () => {
  try {
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      devLog.error('Sign-out error', formatErrorDetails(error));
      throw error;
    }
  } catch (error) {
    devLog.error('Failed to sign out', formatErrorDetails(error));
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    const client = await getSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) {
      devLog.error('Error getting user', formatErrorDetails(error));
      return null;
    }
    return user;
  } catch (error) {
    devLog.error('Failed to get user profile', formatErrorDetails(error));
    return null;
  }
};

export const setSessionFromTokens = async (tokens: any) => {
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
    if (error) {
      devLog.error('Error setting session from tokens', formatErrorDetails(error));
      throw error;
    }
    devLog.info('Session set from tokens');
    return data;
  } catch (error) {
    devLog.error('Failed to set session from tokens', formatErrorDetails(error));
    throw error;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const session = await getCurrentSession();
    return !!session;
  } catch (error) {
    devLog.error('Error checking authentication', formatErrorDetails(error));
    return false;
  }
};
