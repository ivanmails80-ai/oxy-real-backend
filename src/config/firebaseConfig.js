/**
 * Configurazione Firebase per autenticazione (iOS/Android).
 * Su Web/Desktop viene usato firebaseConfig.web.js (getAuth, persistenza browser).
 *
 * In .env: EXPO_PUBLIC_FIREBASE_* (apiKey, authDomain, projectId, ...)
 * In EAS build (preview/production): imposta le stesse variabili in Environment su expo.dev.
 */
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const hasValidKey = firebaseConfig.apiKey && firebaseConfig.apiKey.length > 20;

function createStubAuth() {
  return {
    currentUser: null,
    onAuthStateChanged(callback) {
      if (typeof callback === 'function') callback(null);
      return () => {};
    },
  };
}

let app;
let auth;

if (hasValidKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (_) {
    auth = createStubAuth();
    app = {};
  }
} else {
  auth = createStubAuth();
  app = {};
}

export { auth, app };
