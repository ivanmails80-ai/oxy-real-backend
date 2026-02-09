/**
 * TTS Anima — voce naturale OpenAI (tts-1-hd, nova) invece del sintetizzatore di sistema
 */

const getBaseUrl = () => (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');

/**
 * Richiede audio della frase al backend (OpenAI TTS).
 * @param {string} text - Testo da sintetizzare (max 4096 caratteri)
 * @param {string} idToken
 * @param {string} [apiKey] - Oxy Key se non Master
 * @param {string} [voice] - id voce: shimmer, nova, alloy, onyx, echo, cedar (default nova)
 * @returns {Promise<{ audioBase64: string }>}
 */
export async function fetchTtsAudio(text, idToken, apiKey = null, voice = null) {
  const base = getBaseUrl();
  if (!base) throw new Error('Backend non configurato');
  const body = { text: String(text).trim().slice(0, 4096) };
  if (apiKey) body.apiKey = apiKey;
  if (voice) body.voice = voice;
  const res = await fetch(`${base}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken && { Authorization: `Bearer ${idToken}` }),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
