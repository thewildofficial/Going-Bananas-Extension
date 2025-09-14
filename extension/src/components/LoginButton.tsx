// Login button component for Google authentication
import React from 'react';
import { LogIn, User, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LoginButtonProps {
  variant?: 'default' | 'compact';
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  variant = 'default',
  onLoginSuccess,
  onLoginError
}) => {
  const { isAuthenticated, user, loading, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      onLoginSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-in failed';
      onLoginError?.(errorMessage);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-out failed';
      onLoginError?.(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
        <span className="ml-2 text-sm text-gray-600">Signing in...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center space-x-2">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name || user.email}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <User className="h-6 w-6 text-purple-500" />
          )}
          <span className="text-sm font-medium text-gray-700 truncate max-w-24">
            {user.name || user.email.split('@')[0]}
          </span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name || user.email}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="h-5 w-5 text-green-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleSignIn}
        className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
      >
        <LogIn className="h-4 w-4" />
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to Going Bananas
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Sign in with Google to personalize your T&C analysis experience
        </p>
      </div>
      
      <button
        onClick={handleSignIn}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
      >
        <LogIn className="h-5 w-5" />
        <span>Sign in with Google</span>
      </button>
      
      <p className="text-xs text-gray-500 text-center">
        We'll help you understand terms and conditions better with personalized insights
      </p>
    </div>
  );
};