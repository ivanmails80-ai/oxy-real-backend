/**
 * Login social con Firebase Auth (audit 3.1).
 * Google: OAuth via expo-auth-session (idToken) → Firebase credential.
 * Apple: expo-apple-authentication (solo iOS, richiede usesAppleSignIn).
 * Microsoft: OAuth via expo-auth-session (code→token) → Firebase OAuthProvider credential.
 * Se i moduli non sono configurati, le funzioni lanciano con messaggio chiaro per l'utente.
 */
import { OAuthProvider, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { userToSessionProfile, persistSession } from './authService';
import { getUserProfile } from './profileService';

let AppleAuth = null;
try {
  AppleAuth = require('expo-apple-authentication');
} catch (_) {}

/**
 * Compat: in passato configurava un modulo nativo.
 * Ora Google OAuth è gestito direttamente da AuthScreen tramite expo-auth-session.
 */
export function configureGoogleSignIn() {
  // no-op
}

/**
 * Login con Google tramite idToken (ottenuto da OAuth).
 * Restituisce { session, profile } come signInWithEmailPassword.
 */
export async function signInWithGoogleIdToken(idToken) {
  const token = (idToken || '').trim();
  if (!token) throw new Error('Accesso annullato.');
  try {
    const credential = GoogleAuthProvider.credential(token);
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const { session, profile } = userToSessionProfile(user);
    const saved = await getUserProfile(user.uid);
    const merged = saved
      ? { ...profile, full_name: saved.full_name || profile.full_name, main_email: saved.main_email || profile.main_email, backup_email: saved.backup_email || '', phone: saved.phone || '', birth_date: saved.birth_date || '' }
      : profile;
    await persistSession(session);
    return { session, profile: merged };
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('cancel') || msg.includes('annullato')) {
      throw new Error('Accesso annullato.');
    }
    throw new Error(msg || 'Errore accesso Google. Riprova.');
  }
}

/**
 * Login Microsoft tramite token OAuth (ottenuti con PKCE via AuthSession).
 * Nota: richiede che Microsoft sia abilitato su Firebase (Authentication → Sign-in method).
 */
export async function signInWithMicrosoftTokens({ idToken, accessToken }) {
  const idTok = (idToken || '').trim();
  const accTok = (accessToken || '').trim();
  if (!idTok && !accTok) throw new Error('Accesso annullato.');
  try {
    const provider = new OAuthProvider('microsoft.com');
    const credential = provider.credential({
      ...(idTok ? { idToken: idTok } : {}),
      ...(accTok ? { accessToken: accTok } : {}),
    });
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const { session, profile } = userToSessionProfile(user);
    const saved = await getUserProfile(user.uid);
    const merged = saved
      ? { ...profile, full_name: saved.full_name || profile.full_name, main_email: saved.main_email || profile.main_email, backup_email: saved.backup_email || '', phone: saved.phone || '', birth_date: saved.birth_date || '' }
      : profile;
    await persistSession(session);
    return { session, profile: merged };
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('cancel') || msg.includes('annullato')) throw new Error('Accesso annullato.');
    throw new Error(msg || 'Errore accesso Microsoft. Riprova.');
  }
}

/**
 * Login con Apple (solo iOS). Su Android non disponibile.
 */
export async function signInWithApple() {
  if (!AppleAuth || !AppleAuth.isAvailableAsync) {
    throw new Error('Accesso con Apple non disponibile su questo dispositivo.');
  }
  const available = await AppleAuth.isAvailableAsync();
  if (!available) {
    throw new Error('Accesso con Apple non disponibile su questo dispositivo.');
  }
  try {
    const result = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
    });
    const { identityToken } = result;
    if (!identityToken) {
      throw new Error('Accesso annullato.');
    }
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken,
    });
    const userCredential = await signInWithCredential(auth, credential);
    const user = userCredential.user;
    const { session, profile } = userToSessionProfile(user);
    const saved = await getUserProfile(user.uid);
    const merged = saved
      ? { ...profile, full_name: saved.full_name || profile.full_name, main_email: saved.main_email || profile.main_email, backup_email: saved.backup_email || '', phone: saved.phone || '', birth_date: saved.birth_date || '' }
      : profile;
    await persistSession(session);
    return { session, profile: merged };
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('cancel') || msg.includes('1001')) {
      throw new Error('Accesso annullato.');
    }
    throw new Error(msg || 'Errore accesso Apple. Riprova.');
  }
}

export function isGoogleSignInAvailable() {
  // Google OAuth viene gestito dal componente (AuthSession). Qui lasciamo true come "feature disponibile".
  return true;
}

export function isAppleSignInAvailable() {
  return !!AppleAuth;
}
