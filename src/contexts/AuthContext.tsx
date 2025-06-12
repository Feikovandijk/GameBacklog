import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, SteamAuthResponse } from '../types/user';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AuthContextType extends AuthState {
  loginWithSteam: () => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  loading: boolean;
  handleSteamCallback: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>('user', null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSteamAuth = useCallback(async (steamData: SteamAuthResponse) => {
    setLoading(true);
    setError(null);
    try {
      const existingUser = user;
      if (!existingUser || existingUser.steamId !== steamData.steamId) {
        const newUser: User = {
          id: steamData.steamId,
          steamId: steamData.steamId,
          displayName: steamData.displayName,
          avatarUrl: steamData.avatarUrl,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        setUser(newUser);
      } else {
        setUser({
          ...existingUser,
          lastLogin: new Date().toISOString(),
          displayName: steamData.displayName,
          avatarUrl: steamData.avatarUrl,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during Steam authentication');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, setUser]);

  const handleSteamCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const steamId = params.get('steamId');
    const displayName = params.get('displayName');
    const avatarUrl = params.get('avatarUrl');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      return;
    }

    if (steamId && displayName) {
      await handleSteamAuth({ steamId, displayName, avatarUrl: avatarUrl || undefined });
    } else {
      setError('Invalid authentication response from server.');
    }
  }, [handleSteamAuth]);
  
  const loginWithSteam = () => {
    const workerUrl = 'https://game-backlog-auth-worker.feikovandijk.workers.dev/';
    const clientReturnTo = `${window.location.origin}/auth/callback`;
    const steamReturnTo = `${workerUrl}?return_to=${encodeURIComponent(clientReturnTo)}`;

    const openIdParams = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': steamReturnTo,
      'openid.realm': workerUrl,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });

    const steamLoginUrl = `https://steamcommunity.com/openid/login?${openIdParams.toString()}`;
    window.location.href = steamLoginUrl;
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during logout');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        throw new Error('No user is currently logged in');
      }
      setUser({ ...user, ...updates });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating user');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        error,
        loading,
        loginWithSteam,
        logout,
        updateUser,
        handleSteamCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 