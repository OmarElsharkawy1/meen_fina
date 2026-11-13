import { arrayUnion, doc, setDoc, updateDoc } from 'firebase/firestore';
import { app, db } from '../firebase';

async function saveToken(uid: string): Promise<void> {
  // Loaded on demand so firebase/messaging stays out of the main bundle.
  const { getMessaging, getToken } = await import('firebase/messaging');
  const token = await getToken(getMessaging(app), {
    vapidKey: import.meta.env.VITE_FB_VAPID_KEY,
    serviceWorkerRegistration: await navigator.serviceWorker.ready,
  });
  if (!token) return;
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, { fcmTokens: arrayUnion(token) });
  } catch (err) {
    if ((err as { code?: string }).code !== 'not-found') throw err;
    await setDoc(ref, { fcmTokens: arrayUnion(token) }, { merge: true });
  }
}

/** Asks for notification permission and stores this device's FCM token. */
export async function enablePush(uid: string): Promise<'granted' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  await saveToken(uid);
  return 'granted';
}

/** Silently re-registers the token when permission is already granted (token rotation). */
export async function refreshPushToken(uid: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  await saveToken(uid);
}
