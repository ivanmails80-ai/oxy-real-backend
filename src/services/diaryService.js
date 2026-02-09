/**
 * Diario interattivo OXY — chiamate al backend GET/POST /api/diary
 */

const getBaseUrl = () => (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');

async function requestWithToken(method, path, idToken, body = null) {
  const base = getBaseUrl();
  if (!base) throw new Error('EXPO_PUBLIC_BACKEND_URL non impostato');
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

/**
 * Carica temi, entries e progressSummary
 * @param {string} idToken
 * @returns {Promise<{ themes: Array<{id, label}>, entries: Array<{id, date, themeId, content}>, progressSummary: string }>}
 */
export async function loadDiary(idToken) {
  if (!getBaseUrl() || !idToken) return { themes: [], entries: [], progressSummary: '' };
  try {
    const data = await requestWithToken('GET', '/api/diary', idToken);
    return {
      themes: Array.isArray(data.themes) ? data.themes : [],
      entries: Array.isArray(data.entries) ? data.entries : [],
      progressSummary: typeof data.progressSummary === 'string' ? data.progressSummary : '',
    };
  } catch (e) {
    console.warn('[diaryService] loadDiary error:', e?.message);
    return { themes: [], entries: [], progressSummary: '' };
  }
}

/**
 * Aggiunge un tema (opzionale), una entry e/o aggiorna progressSummary
 * @param {string} idToken
 * @param {{ theme?: { id: string, label: string }, content?: string, progressSummary?: string }} payload
 */
export async function saveDiaryEntry(idToken, payload = {}) {
  if (!getBaseUrl() || !idToken) throw new Error('Backend non configurato');
  return requestWithToken('POST', '/api/diary', idToken, payload);
}
