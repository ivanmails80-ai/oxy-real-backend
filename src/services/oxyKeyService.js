import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const OXY_KEY_STORE = 'oxy_api_key';
const GEMINI_KEY_STORE = 'gemini_api_key';

/** Email del proprietario (Master): da EXPO_PUBLIC_MASTER_EMAIL. Se l'email in login è questa, l'app può non richiedere le checkbox consenso. */
function getMasterEmail() {
  const fromExtra = Constants?.expoConfig?.extra?.EXPO_PUBLIC_MASTER_EMAIL;
  if (fromExtra != null && String(fromExtra).trim()) return String(fromExtra).trim().toLowerCase();
  return (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MASTER_EMAIL || '').trim().toLowerCase();
}

/** Restituisce true se l'email è quella del proprietario (Master). */
export function isOwnerEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const master = getMasterEmail();
  return !!master && email.trim().toLowerCase() === master;
}

/** Chiave Oxy Key salvata in SecureStore (utente) */
export async function getOxyKey() {
  try {
    return await SecureStore.getItemAsync(OXY_KEY_STORE);
  } catch (_) {
    return null;
  }
}

export async function setOxyKey(key) {
  try {
    if (!key || !key.trim()) {
      await SecureStore.deleteItemAsync(OXY_KEY_STORE);
      return false;
    }
    await SecureStore.setItemAsync(OXY_KEY_STORE, key.trim());
    return true;
  } catch (_) {
    return false;
  }
}

export async function removeOxyKey() {
  try {
    await SecureStore.deleteItemAsync(OXY_KEY_STORE);
    return true;
  } catch (_) {
    return false;
  }
}

/** Valida formato chiave OpenAI (sk-...) */
export function isValidKeyFormat(key) {
  return key && typeof key === 'string' && key.trim().startsWith('sk-') && key.trim().length > 20;
}

/** Chiave Gemini (Google AI): salvata in SecureStore. Gratuita per l'utente, costo zero per noi. */
export async function getGeminiKey() {
  try {
    return await SecureStore.getItemAsync(GEMINI_KEY_STORE);
  } catch (_) {
    return null;
  }
}

export async function setGeminiKey(key) {
  try {
    if (!key || !key.trim()) {
      await SecureStore.deleteItemAsync(GEMINI_KEY_STORE);
      return false;
    }
    await SecureStore.setItemAsync(GEMINI_KEY_STORE, key.trim());
    return true;
  } catch (_) {
    return false;
  }
}

export async function removeGeminiKey() {
  try {
    await SecureStore.deleteItemAsync(GEMINI_KEY_STORE);
    return true;
  } catch (_) {
    return false;
  }
}

/** Valida formato chiave Gemini (es. AIza..., lunga almeno 30 caratteri). */
export function isValidGeminiKeyFormat(key) {
  return key && typeof key === 'string' && key.trim().length >= 30;
}

/** Restituisce la chiave da usare per l'utente corrente (solo SecureStore). */
export async function getKeyForCurrentUser() {
  return await getOxyKey();
}
