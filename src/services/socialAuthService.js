/**
 * Login social con Firebase Auth (audit 3.1).
 * Google: @react-native-google-signin/google-signin (richiede development build + configurazione Firebase/Google Cloud).
 * Apple: expo-apple-authentication (solo iOS, richiede usesAppleSignIn e development build).
 * Se i moduli non sono configurati, le funzioni lanciano con messaggio chiaro per l'utente.
 */
import { OAuthProvider, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { userToSessionProfile, persistSession } from './authService';
import { getUserProfile } from './profileService';

let GoogleSignin = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').default;
} catch (_) {
  // Pacchetto non installato: mostra "Configura Google Sign-In" o "in arrivo"
}

let AppleAuth = null;
try {
  AppleAuth = require('expo-apple-authentication');
} catch (_) {}

/**
 * Configura Google Sign-In (da chiamare una volta all'avvio app, es. in App.js).
 * webClientId: Web client ID da Firebase Console (Authentication → Sign-in method → Google → Web SDK configuration).
 */
export function configureGoogleSignIn(webClientId) {
  if (!GoogleSignin || !webClientId) return;
  try {
    GoogleSignin.configure({
      webClientId: webClientId.trim(),
      offlineAccess: true,
    });
  } catch (e) {
    console.warn('[socialAuth] configureGoogleSignIn', e?.message);
  }
}

/**
 * Login con Google. Restituisce { session, profile } come signInWithEmailPassword.
 * Fallback: throw Error con messaggio utente se non configurato o errore.
 */
export async function signInWithGoogle() {
  if (!GoogleSignin) {
    throw new Error('Accesso con Google non configurato. Usa email e password.');
  }
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    let idToken = result?.data?.idToken ?? result?.idToken;
    if (!idToken && result?.data) {
      const tokens = await GoogleSignin.getTokens?.();
      idToken = tokens?.idToken;
    }
    if (!idToken) {
      throw new Error('Accesso annullato.');
    }
    const credential = GoogleAuthProvider.credential(idToken);
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
    if (msg.includes('SIGN_IN_CANCELLED') || msg.includes('12501') || msg.includes('annullato')) {
      throw new Error('Accesso annullato.');
    }
    if (msg.includes('DEVELOPER_ERROR') || msg.includes('10')) {
      throw new Error('Google Sign-In non configurato. Controlla Firebase Console e webClientId.');
    }
    throw new Error(msg || 'Errore accesso Google. Riprova.');
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
  return !!GoogleSignin;
}

export function isAppleSignInAvailable() {
  return !!AppleAuth;
}
