import * as SecureStore from 'expo-secure-store';

const OXY_KEY_STORE = 'oxy_api_key';

/** Chiave Master (solo .env, Proprietario Prestige) */
export function getMasterKey() {
  const k = process.env.EXPO_PUBLIC_OXY_AI_KEY;
  return k && typeof k === 'string' && k.trim() ? k.trim() : null;
}

/** True se l'email appartiene al Proprietario Master */
export function isMasterUser(userEmail) {
  const masterEmail = process.env.EXPO_PUBLIC_MASTER_EMAIL;
  if (!masterEmail || !userEmail) return false;
  return userEmail.trim().toLowerCase() === masterEmail.trim().toLowerCase();
}

/** Chiave SecureStore (Ospite / Pay-per-use) */
export async function getOxyKey() {
  try {
    return await SecureStore.getItemAsync(OXY_KEY_STORE);
  } catch (e) {
    console.warn('Errore lettura Oxy Key:', e);
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
  } catch (e) {
    console.warn('Errore salvataggio Oxy Key:', e);
    return false;
  }
}

export async function removeOxyKey() {
  try {
    await SecureStore.deleteItemAsync(OXY_KEY_STORE);
    return true;
  } catch (e) {
    console.warn('Errore rimozione Oxy Key:', e);
    return false;
  }
}

/** Valida formato chiave OpenAI (sk-...) */
export function isValidKeyFormat(key) {
  return key && typeof key === 'string' && key.trim().startsWith('sk-') && key.trim().length > 20;
}

/**
 * IDENTITÀ CHIAVE - Token Independence
 * Determina con certezza quale chiave usare per l'utente corrente.
 * MAI fallback: Master usa SOLO .env, Ospite usa SOLO SecureStore.
 */
export async function getKeyForCurrentUser(userEmail) {
  if (isMasterUser(userEmail)) {
    return getMasterKey();
  }
  return await getOxyKey();
}
