/**
 * Analytics per roadmap OXY: eventi per A/B, funnel, engagement.
 * Invia a backend POST /api/analytics quando disponibile; altrimenti solo console (dev).
 */

import { getBackendBaseUrl } from '../config/backendConfig';

const getBaseUrl = () => getBackendBaseUrl();

/**
 * Registra un evento (screen_view, feature_used, story_step, diary_entry, ecc.).
 * @param {string} event - nome evento
 * @param {Object} [props] - proprietà aggiuntive (screen, feature, variant, ...)
 * @param {string} [idToken] - opzionale; se fornito e backend ha /api/analytics, invia al server
 */
export async function track(event, props = {}, idToken = null) {
  const payload = {
    event: String(event),
    timestamp: new Date().toISOString(),
    ...(typeof props === 'object' && props !== null ? props : {}),
  };
  const base = getBaseUrl();
  if (!base || !idToken) return;
  try {
    await fetch(`${base}/api/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    // Ignora errori di invio analytics
  }
}

/** Eventi standard (naming consistente) */
export const EVENTS = {
  SCREEN_VIEW: 'screen_view',
  FEATURE_OPEN: 'feature_open',
  FEATURE_USE: 'feature_use',
  DIARY_ENTRY: 'diary_entry',
  STORY_START: 'story_start',
  STORY_STEP: 'story_step',
  VOICE_INPUT: 'voice_input',
  COMMUNITY_POST: 'community_post',
  AB_VARIANT: 'ab_variant',
};
