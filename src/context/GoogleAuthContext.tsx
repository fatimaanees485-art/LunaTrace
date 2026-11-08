import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout as firebaseLogout, getAccessToken } from '../services/firebaseAuth';

interface GoogleAuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const GoogleAuthProviderContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      // Format friendly message
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled by user.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by browser. Please allow popups for this site.');
      } else {
        setError(err.message || 'Failed to authenticate with Google Drive.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseLogout();
      setUser(null);
      setAccessToken(null);
      setError(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out.');
    }
  };

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isLoggingIn,
        error,
        signIn,
        signOut,
        clearError: () => setError(null)
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProviderContext');
  }
  return context;
};
