/**
 * Profilo utente su Firestore (audit 1.2).
 * Persistenza backup_email, telefono, data nascita. Se Firestore non è abilitato, fallback silenzioso.
 */
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from '../config/firebaseConfig';

let db = null;
try {
  db = getFirestore(app);
} catch (_) {
  // Firestore non disponibile: l'app funziona uguale, profilo esteso non persistito
}

const COLLECTION = 'users';

export async function saveUserProfile(uid, profile) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, COLLECTION, uid), {
      full_name: profile?.full_name ?? '',
      main_email: profile?.main_email ?? '',
      backup_email: profile?.backup_email ?? '',
      phone: profile?.phone ?? '',
      birth_date: profile?.birth_date ?? '',
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (e) {
    console.warn('[profileService] saveUserProfile error', e?.message);
  }
}

export async function getUserProfile(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (!snap?.exists()) return null;
    const d = snap.data();
    return {
      full_name: d?.full_name ?? '',
      main_email: d?.main_email ?? '',
      backup_email: d?.backup_email ?? '',
      phone: d?.phone ?? '',
      birth_date: d?.birth_date ?? '',
    };
  } catch (e) {
    console.warn('[profileService] getUserProfile error', e?.message);
    return null;
  }
}
