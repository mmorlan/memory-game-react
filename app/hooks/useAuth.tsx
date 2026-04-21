'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { saveGame, ensureUser } from '../util/dynamodb';

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

interface AuthContextValue {
  user: AuthUser | null;
  username: string | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const AUTH_CACHE_KEY = 'auth_cache';

interface AuthCache {
  userId: string;
  username: string;
}

function loadAuthCache(): AuthCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthCache) : null;
  } catch {
    return null;
  }
}

function saveAuthCache(userId: string, username: string) {
  localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ userId, username }));
}

function clearAuthCache() {
  localStorage.removeItem(AUTH_CACHE_KEY);
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start with null/true to match SSR — cache is applied client-side in useEffect
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkAuth(): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      const resolvedUsername = currentUser.username ?? attrs.preferred_username ?? currentUser.signInDetails?.loginId ?? '';
      setUser(currentUser);
      setUsername(resolvedUsername);
      saveAuthCache(currentUser.userId, resolvedUsername);
      ensureUser(currentUser.userId, resolvedUsername).catch(() => {});

      // Save any game completed while the user was unauthenticated
      const raw = typeof window !== 'undefined' ? localStorage.getItem('pendingGame') : null;
      if (raw) {
        localStorage.removeItem('pendingGame');
        try {
          await saveGame(currentUser.userId, JSON.parse(raw));
        } catch {
          // Silently fail — don't block auth if the save fails
        }
      }
    } catch {
      // Confirmed logged out — clear cached state
      setUser(null);
      setUsername(null);
      clearAuthCache();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut(): Promise<void> {
    clearAuthCache();
    localStorage.removeItem('survivalGameState');
    localStorage.removeItem('gameMode');
    ['mg-started', 'mg-board', 'mg-rows', 'mg-cols', 'mg-start', 'mg-end', 'mg-score'].forEach(k =>
      localStorage.removeItem(k)
    );
    await signOut();
    setUser(null);
    setUsername(null);
  }

  useEffect(() => {
    // Apply cache synchronously before checkAuth resolves to prevent flash
    const cached = loadAuthCache();
    if (cached) {
      setUser({ userId: cached.userId } as AuthUser);
      setUsername(cached.username);
      setIsLoading(false);
    }
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, username, isLoading, checkAuth, handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export default function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
