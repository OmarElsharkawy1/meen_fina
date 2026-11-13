import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { UserDoc } from '@shared/types';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../firebase';
import { applyLang, type Lang } from '../lib/lang';

export function useProfile(): UserDoc | null {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as UserDoc) : null),
      () => setProfile(null),
    );
  }, [uid]);

  return profile;
}

/** Persists the language on the user's profile (when signed in) and applies it. */
export async function setLang(lang: Lang): Promise<void> {
  applyLang(lang);
  const { auth } = await import('../firebase');
  const uid = auth.currentUser?.uid;
  if (uid) await setDoc(doc(db, 'users', uid), { lang }, { merge: true });
}
