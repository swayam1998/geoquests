/**
 * useAuth Hook
 * Provides authentication state and methods
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { authAPI, tokenStorage } from '@/lib/api';
import type { User, AuthState } from '@/types/auth';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  /**
   * Load user from API
   */
  const loadUser = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      const user = await authAPI.getCurrentUser();
      setState({
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          is_active: user.is_active,
          is_verified: user.is_verified,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      // Token invalid, clear it
      tokenStorage.clearTokens();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  /**
   * Login with tokens
   */
  const login = useCallback(async (accessToken: string, refreshToken: string) => {
    tokenStorage.setTokens(accessToken, refreshToken);
    await loadUser();
  }, [loadUser]);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    authAPI.logout();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return {
    ...state,
    login,
    logout,
    refreshUser,
  };
}
