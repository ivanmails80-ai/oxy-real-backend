/**
 * Chat Service — Persistenza su backend quando EXPO_PUBLIC_BACKEND_URL è impostato.
 * Percorsi identici al backend: /api/chat/history (GET) e /api/chat/messages (POST).
 */

// Base URL senza trailing slash (stesso nome env usato da aiService)
const getBaseUrl = () => (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');

// Percorsi esatti come in backend/index.js
const PATH_HISTORY = '/api/chat/history';
const PATH_MESSAGES = '/api/chat/messages';

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

export async function loadChatHistory(userId, idToken = null) {
  if (!userId) return [];
  if (!getBaseUrl() || !idToken) return [];
  try {
    const { messages } = await requestWithToken('GET', PATH_HISTORY, idToken);
    return Array.isArray(messages) ? messages : [];
  } catch (e) {
    console.warn('[chatService] loadChatHistory error:', e?.message);
    return [];
  }
}

export async function saveMessageToDb(userId, role, content, idToken = null) {
  if (!userId || !getBaseUrl() || !idToken) return;
  try {
    await requestWithToken('POST', PATH_MESSAGES, idToken, { role, content });
  } catch (e) {
    console.warn('[chatService] saveMessageToDb error:', e?.message);
  }
}

export async function loadMessages(userId, idToken = null) {
  return loadChatHistory(userId, idToken);
}

export async function appendMessages(userId, messages, idToken = null) {
  if (!userId || !getBaseUrl() || !idToken || !Array.isArray(messages)) return;
  for (const m of messages) {
    if (m.role && m.content != null) await saveMessageToDb(userId, m.role, m.content, idToken);
  }
}

/** Salva in memoria a lungo termine (obiettivo o fatto da ricordare) — da long-press su messaggio OXY */
export async function saveToMemory(idToken, { goal, keyFact } = {}) {
  if (!getBaseUrl() || !idToken) throw new Error('Backend non configurato');
  const body = {};
  if (goal && String(goal).trim()) body.goal = String(goal).trim().slice(0, 2000);
  if (keyFact && String(keyFact).trim()) body.keyFact = String(keyFact).trim().slice(0, 2000);
  if (!body.goal && !body.keyFact) throw new Error('Nessun contenuto da salvare');
  await requestWithToken('POST', '/api/memory', idToken, body);
}

/** Carica la memoria a lungo termine (per schermata Memory Vault / Le mie note) */
export async function loadMemory(idToken) {
  if (!getBaseUrl() || !idToken) return null;
  try {
    return await requestWithToken('GET', '/api/memory', idToken);
  } catch (e) {
    console.warn('[chatService] loadMemory error:', e?.message);
    return null;
  }
}

/** Cancella una o più sezioni della memoria (obiettivi, fatti, identità, ultimo contesto). L'utente può farlo dalla schermata Le mie note; l'IA può farlo tramite tool clear_memory. */
export async function clearMemorySections(idToken, sections) {
  if (!getBaseUrl() || !idToken) throw new Error('Backend non configurato');
  if (!Array.isArray(sections) || sections.length === 0) throw new Error('Specifica almeno una sezione da cancellare');
  const valid = ['identitySummary', 'goals', 'keyFacts', 'lastContext'];
  const toClear = sections.filter((s) => valid.includes(s));
  if (toClear.length === 0) throw new Error('Nessuna sezione valida');
  await requestWithToken('POST', '/api/memory', idToken, { clearSections: toClear });
}

/** Elimina una singola nota dalla Memory Vault (per id, in goals o keyFacts). */
export async function deleteMemoryNote(idToken, noteId) {
  if (!getBaseUrl() || !idToken) throw new Error('Backend non configurato');
  if (!noteId || typeof noteId !== 'string') throw new Error('Id nota richiesto');
  await requestWithToken('POST', '/api/memory', idToken, { deleteNoteId: noteId.trim() });
}
