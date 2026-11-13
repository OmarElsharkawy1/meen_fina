import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserDoc } from '@shared/types';
import { auth, db } from '../firebase';
import { detectLang } from '../lib/lang';

type AuthValue = {
  user: User | null;
  loading: boolean;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Creates users/{uid} writing only the fields that don't exist yet. */
async function ensureUserDoc(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as Partial<UserDoc>) : {};
  const defaults: UserDoc = {
    displayName: user.displayName ?? '',
    photoURL: user.photoURL,
    lang: detectLang(navigator.languages),
    fcmTokens: [],
    mutedGroupIds: [],
  };
  const missing = Object.fromEntries(
    Object.entries(defaults).filter(([k]) => !(k in existing)),
  );
  if (Object.keys(missing).length > 0) await setDoc(ref, missing, { merge: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Completes a pending redirect sign-in; auth state itself arrives via onAuthStateChanged.
    getRedirectResult(auth).catch(() => undefined);
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
      if (u) void ensureUserDoc(u).catch(() => undefined);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      signIn: () => signInWithRedirect(auth, new GoogleAuthProvider()),
      signOut: () => fbSignOut(auth),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
