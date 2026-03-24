/**
 * Backend URL configuration (single source of truth).
 *
 * In build/standalone APK the EXPO_PUBLIC_BACKEND_URL env may be missing.
 * We fallback to the production Render URL so critical flows (health check,
 * billing, chat proxy, voice/TTS) remain connected.
 */

export const DEFAULT_BACKEND_URL = 'https://oxy-real-backend.onrender.com';

export function getBackendBaseUrl() {
  const envUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL
    ? String(process.env.EXPO_PUBLIC_BACKEND_URL)
    : '').trim();

  const base = (envUrl || DEFAULT_BACKEND_URL).trim();
  return base.replace(/\/$/, '');
}

export function isBackendUrlFromEnv() {
  const envUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL
    ? String(process.env.EXPO_PUBLIC_BACKEND_URL)
    : '').trim();
  return !!envUrl;
}

