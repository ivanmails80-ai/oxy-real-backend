/**
 * Storie a livelli OXY — stato su backend GET/POST /api/stories/state
 */

import { getBackendBaseUrl } from '../config/backendConfig';

const getBaseUrl = () => getBackendBaseUrl();

async function requestWithToken(method, path, idToken, body = null) {
  const base = getBaseUrl();
  if (!base) throw new Error('Endpoint server non configurato');
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    },
    ...(body != null && { body: JSON.stringify(body) }),
  };
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function loadStoryState(idToken) {
  if (!getBaseUrl() || !idToken) return { currentStoryId: null, stepIndex: 0, completed: [] };
  try {
    return await requestWithToken('GET', '/api/stories/state', idToken);
  } catch (_) {
    return { currentStoryId: null, stepIndex: 0, completed: [] };
  }
}

export async function saveStoryState(idToken, { storyId, stepIndex, completed }) {
  if (!getBaseUrl() || !idToken) throw new Error('Backend non configurato');
  return requestWithToken('POST', '/api/stories/state', idToken, { storyId, stepIndex, completed });
}
