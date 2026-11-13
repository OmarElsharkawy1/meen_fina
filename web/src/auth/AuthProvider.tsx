import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { arrayRemove, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { UserDoc } from '@shared/types';
import { app, auth, db } from '../firebase';
import { detectLang, storedLang } from '../lib/lang';

type AuthValue = {
  user: User | null;
  loading: boolean;
  /** i18n key of the last sign-in failure, or null. */
  authError: string | null;
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
    lang: storedLang() ?? detectLang(navigator.languages),
    fcmTokens: [],
    mutedGroupIds: [],
  };
  const missing = Object.fromEntries(
    Object.entries(defaults).filter(([k]) => !(k in existing)),
  );
  if (Object.keys(missing).length > 0) await setDoc(ref, missing, { merge: true });
}

/** Drops this device's push token from the user doc and FCM before signing out. */
async function releasePushToken(uid: string): Promise<void> {
  const key = `mf.fcmToken:${uid}`;
  let token: string | null = null;
  try {
    token = localStorage.getItem(key);
  } catch {
    /* storage unavailable */
  }
  if (!token) return;
  try {
    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) });
  } catch (e) {
    console.error('removing FCM token failed', e);
  }
  try {
    const { deleteToken, getMessaging, isSupported } = await import('firebase/messaging');
    if (await isSupported()) await deleteToken(getMessaging(app));
  } catch (e) {
    console.error('deleting FCM token failed', e);
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Completes a pending redirect sign-in; auth state itself arrives via onAuthStateChanged.
    getRedirectResult(auth).catch((e) => {
      console.error('getRedirectResult failed', e);
      if (active) setAuthError('auth.signInFailed');
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
      if (u) void ensureUserDoc(u).catch((e) => console.error('ensureUserDoc failed', e));
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
      authError,
      signIn: () => {
        setAuthError(null);
        return signInWithRedirect(auth, new GoogleAuthProvider());
      },
      signOut: async () => {
        if (auth.currentUser) await releasePushToken(auth.currentUser.uid);
        await fbSignOut(auth);
      },
    }),
    [user, loading, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
