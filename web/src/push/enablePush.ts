import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { app, db } from '../firebase';

const tokenKey = (uid: string) => `mf.fcmToken:${uid}`;

function readCached(uid: string): string | null {
  try {
    return localStorage.getItem(tokenKey(uid));
  } catch {
    return null;
  }
}

function writeCached(uid: string, token: string): void {
  try {
    localStorage.setItem(tokenKey(uid), token);
  } catch {
    /* storage unavailable */
  }
}

async function saveToken(uid: string, onlyIfChanged: boolean): Promise<void> {
  // Loaded on demand so firebase/messaging stays out of the main bundle.
  const { getMessaging, getToken } = await import('firebase/messaging');
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FB_VAPID_KEY,
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });
  if (!token) return;
  if (onlyIfChanged && readCached(uid) === token) return;
  try {
    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) });
    writeCached(uid, token);
  } catch (err) {
    // Rules need the user doc to exist; the next load retries.
    console.error('saving FCM token failed', err);
  }
}

/** Asks for notification permission and stores this device's FCM token. */
export async function enablePush(uid: string): Promise<'granted' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  await saveToken(uid, false);
  return 'granted';
}

/** Silently re-registers the token when permission is already granted; writes only on change. */
export async function refreshPushToken(uid: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  await saveToken(uid, true);
}
