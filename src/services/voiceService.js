/**
 * Trascrizione vocale OXY — invio audio al backend (Whisper), ritorno testo (roadmap 2.1)
 */

const getBaseUrl = () => (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');

/**
 * Invia audio in base64 al backend per trascrizione.
 * @param {string} idToken
 * @param {string} audioBase64 - contenuto base64 (senza data URL prefix)
 * @param {string} [apiKey] - Oxy Key se utente non Master
 * @returns {Promise<{ text: string }>}
 */
export async function transcribe(idToken, audioBase64, apiKey = null) {
  const base = getBaseUrl();
  if (!base) throw new Error('EXPO_PUBLIC_BACKEND_URL non impostato');
  const body = { audioBase64 };
  if (apiKey) body.apiKey = apiKey;
  const res = await fetch(`${base}/api/voice/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return { text: data?.text ?? '' };
}
