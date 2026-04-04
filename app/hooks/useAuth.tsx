'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { saveGame } from '../util/dynamodb';

type AuthUser = Awaited<ReturnType<typeof getCurrentUser>>;

interface AuthContextValue {
  user: AuthUser | null;
  username: string | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  handleSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function checkAuth(): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      setUser(currentUser);
      setUsername(attrs.preferred_username ?? currentUser.signInDetails?.loginId ?? currentUser.username);

      // Save any game completed while the user was unauthenticated
      const raw = typeof window !== 'undefined' ? localStorage.getItem('pendingGame') : null;
      if (raw) {
        try {
          await saveGame(currentUser.userId, JSON.parse(raw));
        } catch {
          // Silently fail — don't block auth if the save fails
        } finally {
          localStorage.removeItem('pendingGame');
        }
      }
    } catch {
      setUser(null);
      setUsername(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignOut(): Promise<void> {
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
