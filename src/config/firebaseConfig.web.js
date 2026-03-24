/**
 * Firebase Auth per Web/Desktop: getAuth con persistenza browser (default).
 * Su web non usiamo getReactNativePersistence (non disponibile nel build browser).
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

const extra =
  (Constants?.expoConfig && Constants.expoConfig.extra) ||
  (Constants?.manifest && Constants.manifest.extra) ||
  {};
const firebaseExtra = extra?.firebase || {};

const firebaseConfig = {
  // IMPORTANT: use static EXPO_PUBLIC_* access so Expo can inline values at build time.
  apiKey: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_API_KEY) || firebaseExtra.apiKey || '',
  authDomain: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) || firebaseExtra.authDomain || '',
  projectId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID) || firebaseExtra.projectId || '',
  storageBucket: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) || firebaseExtra.storageBucket || '',
  messagingSenderId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || firebaseExtra.messagingSenderId || '',
  appId: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIREBASE_APP_ID) || firebaseExtra.appId || '',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { app };
