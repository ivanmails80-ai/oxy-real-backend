/**
 * Feature flags per roadmap OXY (A/B e rollout).
 * Legge da AsyncStorage (override locale) o da backend GET /api/features.
 * Default: tutte le feature della roadmap attive (rollout completo).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from '../config/backendConfig';

const STORAGE_KEY = '@oxyreal:featureFlags';

/** Chiavi flag (allineate a ROADMAP_DIFFERENZIAZIONE_OXY) */
export const FEATURE_KEYS = {
  DIARY: 'diary',
  STORIES: 'stories',
  VOICE_INPUT: 'voiceInput',
  IMAGE_CONTEXT: 'imageContext',
  COMMUNITY: 'community',
  GROUP_CHAT: 'groupChat',
  REPUTATION: 'reputation',
  AB_TESTS: 'abTests',
};

/** Default: roadmap completa attiva */
const DEFAULT_FLAGS = {
  [FEATURE_KEYS.DIARY]: true,
  [FEATURE_KEYS.STORIES]: true,
  [FEATURE_KEYS.VOICE_INPUT]: true,
  [FEATURE_KEYS.IMAGE_CONTEXT]: true,
  // Non mostrare feature non pronte: se visibili devono essere funzionanti.
  [FEATURE_KEYS.COMMUNITY]: false,
  [FEATURE_KEYS.GROUP_CHAT]: false,
  [FEATURE_KEYS.REPUTATION]: true,
  [FEATURE_KEYS.AB_TESTS]: true,
};

/**
 * Carica override da AsyncStorage (solo chiavi presenti).
 * @returns {Promise<Object>} oggetto { [key]: boolean }
 */
export async function getLocalOverrides() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Restituisce se la feature è attiva: prima override locale, poi serverFlags, poi default.
 * @param {string} key - FEATURE_KEYS.*
 * @param {Object} [serverFlags] - risposta da GET /api/features (opzionale)
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(key, serverFlags = null) {
  const overrides = await getLocalOverrides();
  if (Object.prototype.hasOwnProperty.call(overrides, key)) return !!overrides[key];
  if (serverFlags && Object.prototype.hasOwnProperty.call(serverFlags, key)) return !!serverFlags[key];
  return !!DEFAULT_FLAGS[key];
}

/**
 * Tutti i flag correnti (merge override + server + default).
 * @param {Object} [serverFlags]
 * @returns {Promise<Object>}
 */
export async function getAllFlags(serverFlags = null) {
  const overrides = await getLocalOverrides();
  const out = { ...DEFAULT_FLAGS };
  if (serverFlags && typeof serverFlags === 'object') {
    for (const k of Object.keys(serverFlags)) if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = !!serverFlags[k];
  }
  for (const k of Object.keys(overrides)) if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = !!overrides[k];
  return out;
}

/**
 * Salva override locale (per debug o test).
 * @param {string} key
 * @param {boolean} value
 */
export async function setLocalOverride(key, value) {
  const overrides = await getLocalOverrides();
  overrides[key] = !!value;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

/**
 * Fetch flag da backend (GET /api/features). Opzionale; se fallisce si usano default + local.
 * @param {string} idToken
 * @returns {Promise<Object|null>} { diary: true, ... } o null
 */
export async function fetchServerFlags(idToken) {
  const base = getBackendBaseUrl();
  if (!base || !idToken) return null;
  try {
    const res = await fetch(`${base}/api/features`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}
