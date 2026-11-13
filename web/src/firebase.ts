import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { REGION } from '@shared/constants';

const env = import.meta.env;
const useEmulators = env.VITE_USE_EMULATORS === '1';

const config = {
  apiKey: env.VITE_FB_API_KEY || (useEmulators ? 'demo' : ''),
  authDomain: env.VITE_FB_AUTH_DOMAIN || (useEmulators ? 'localhost' : ''),
  projectId: env.VITE_FB_PROJECT_ID || (useEmulators ? 'demo-meen-fina' : ''),
  storageBucket: env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FB_MESSAGING_SENDER_ID,
  appId: env.VITE_FB_APP_ID || (useEmulators ? 'demo-app' : ''),
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, REGION);

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
