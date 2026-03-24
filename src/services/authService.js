/**
 * Auth Service — Firebase Auth (Email/Password) + expo-secure-store
 * Autenticazione reale, niente OTP simulato.
 */
import * as SecureStore from 'expo-secure-store';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { saveUserProfile, getUserProfile } from './profileService';

const SECURE_KEYS = {
  SESSION: 'oxyreal:firebaseSession',
};

export function userToSessionProfile(user) {
  if (!user) return { session: null, profile: null };
  const profile = {
    id: user.uid,
    full_name: user.displayName || '',
    main_email: user.email || '',
    backup_email: '',
    phone: user.phoneNumber || '',
    birth_date: '',
  };
  const session = {
    user: {
      id: user.uid,
      email: user.email,
      user_metadata: { full_name: user.displayName },
    },
  };
  return { session, profile };
}

/** Persiste sessione + token in SecureStore */
export async function persistSession(session) {
  try {
    if (!session?.user) {
      await SecureStore.deleteItemAsync(SECURE_KEYS.SESSION);
      return;
    }
    const payload = {
      uid: session.user.id,
      email: session.user.email,
      displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
    };
    await SecureStore.setItemAsync(SECURE_KEYS.SESSION, JSON.stringify(payload));
  } catch (_) {}
}

/** Ripristina sessione da Firebase (persistenza nativa) e/o SecureStore */
export async function restoreSessionAndProfile() {
  try {
    return await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ session: null, profile: null }), 3000);
      const unsub = onAuthStateChanged(auth, async (user) => {
        clearTimeout(timeout);
        unsub();
        if (user) {
          const { session, profile } = userToSessionProfile(user);
          const saved = await getUserProfile(user.uid);
          const merged = saved
            ? { ...profile, full_name: saved.full_name || profile.full_name, main_email: saved.main_email || profile.main_email, backup_email: saved.backup_email || '', phone: saved.phone || '', birth_date: saved.birth_date || '' }
            : profile;
          await persistSession(session);
          return resolve({ session, profile: merged });
        }
        const stored = await SecureStore.getItemAsync(SECURE_KEYS.SESSION);
        if (!stored) return resolve({ session: null, profile: null });
        try {
          const { uid, email, displayName } = JSON.parse(stored);
          resolve({
            session: { user: { id: uid, email, user_metadata: { full_name: displayName } } },
            profile: { id: uid, full_name: displayName || '', main_email: email || '', backup_email: '', phone: '', birth_date: '' },
          });
        } catch (_) {
          await SecureStore.deleteItemAsync(SECURE_KEYS.SESSION);
          resolve({ session: null, profile: null });
        }
      });
    });
  } catch (_) {
    return { session: null, profile: null };
  }
}

/** Login con Email e Password */
export async function signInWithEmailPassword(email, password) {
  const emailTrimmed = (email || '').trim();
  const passwordTrimmed = (password || '').trim();
  const { user } = await signInWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
  const { session, profile } = userToSessionProfile(user);
  const saved = await getUserProfile(user.uid);
  const merged = saved
    ? { ...profile, full_name: saved.full_name || profile.full_name, main_email: saved.main_email || profile.main_email, backup_email: saved.backup_email || '', phone: saved.phone || '', birth_date: saved.birth_date || '' }
    : profile;
  try {
    await persistSession(session);
  } catch (_) {
    // SecureStore può fallire (es. Expo Go): il login è comunque riuscito, Firebase persiste la sessione
  }
  return { session, profile: merged };
}

/** Recupero password: invia email con link di reset (Firebase) */
export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Registrazione con Email e Password */
export async function registerWithEmailPassword({ email, password, nome, cognome }) {
  const fullName = `${nome || ''} ${cognome || ''}`.trim();
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (user && fullName) {
    try {
      await updateProfile(user, { displayName: fullName });
    } catch (_) {}
  }
  const { session, profile } = userToSessionProfile(user);
  await persistSession(session);
  return {
    user,
    session,
    profile: {
      ...profile,
      full_name: fullName,
      main_email: email.trim(),
    },
  };
}

/** Registrazione completa (per compatibilità con form esistente) */
export async function signUpWithProfile(regData) {
  const { email, password, nome, cognome, dataNascita, emailSecondaria, telefono } = regData;
  const { user, session, profile } = await registerWithEmailPassword({
    email,
    password,
    nome,
    cognome,
  });
  const fullProfile = {
    ...profile,
    birth_date: dataNascita || '',
    backup_email: emailSecondaria || '',
    phone: telefono || '',
  };
  if (user?.uid) await saveUserProfile(user.uid, fullProfile);
  return { user, session, profile: fullProfile };
}

/** Logout */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (_) {}
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.SESSION);
  } catch (_) {}
}
