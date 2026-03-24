/**
 * Chat Service — Persistenza su backend quando EXPO_PUBLIC_BACKEND_URL è impostato.
 * Percorsi identici al backend: /api/chat/history (GET) e /api/chat/messages (POST).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from '../config/backendConfig';

// Base URL senza trailing slash (stesso nome env usato da aiService)
const getBaseUrl = () => getBackendBaseUrl();

const CHAT_CACHE_PREFIX = 'OXY_CHAT_CACHE_V1:';
const MEMORY_CACHE_PREFIX = 'OXY_MEMORY_CACHE_V1:';
const MAX_CHAT_MESSAGES = 400;
const MAX_MEMORY_NOTES = 300;

function chatCacheKey(userId) {
  return `${CHAT_CACHE_PREFIX}${String(userId || '').trim()}`;
}

function memoryCacheKey(userId) {
  return `${MEMORY_CACHE_PREFIX}${String(userId || '').trim()}`;
}

function emptyMemory() {
  return { identitySummary: '', goals: [], keyFacts: [], lastContext: '' };
}

function safeText(v, maxLen) {
  const s = v == null ? '' : String(v);
  const t = s.trim();
  if (!t) return '';
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readJson(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// Percorsi esatti come in backend/index.js
const PATH_HISTORY = '/api/chat/history';
const PATH_MESSAGES = '/api/chat/messages';

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

export async function loadChatHistory(userId, idToken = null) {
  if (!userId) return [];
  const localKey = chatCacheKey(userId);
  const local = await readJson(localKey, []);
  if (!getBaseUrl() || !idToken) return Array.isArray(local) ? local : [];
  try {
    const { messages } = await requestWithToken('GET', PATH_HISTORY, idToken);
    const arr = Array.isArray(messages) ? messages : [];
    const normalized = arr
      .filter((m) => m && typeof m === 'object' && typeof m.role === 'string' && m.content != null)
      .map((m) => ({ role: m.role, content: String(m.content) }));
    if (normalized.length > 0) {
      await writeJson(localKey, normalized.slice(-MAX_CHAT_MESSAGES));
    }
    return normalized;
  } catch (_) {
    return Array.isArray(local) ? local : [];
  }
}

export async function saveMessageToDb(userId, role, content, idToken = null) {
  if (!userId) return;

  // Sempre: cache locale (così la chat non "sparisce" se backend non c'è o va giù)
  try {
    const localKey = chatCacheKey(userId);
    const local = await readJson(localKey, []);
    const next = Array.isArray(local) ? local.slice() : [];
    if (role && content != null) next.push({ role: String(role), content: String(content) });
    await writeJson(localKey, next.slice(-MAX_CHAT_MESSAGES));
  } catch {
    // ignore
  }

  // Poi: backend (se configurato)
  if (!getBaseUrl() || !idToken) return;
  try {
    await requestWithToken('POST', PATH_MESSAGES, idToken, { role, content });
  } catch (_) {}
}

export async function loadMessages(userId, idToken = null) {
  return loadChatHistory(userId, idToken);
}

export async function appendMessages(userId, messages, idToken = null) {
  if (!userId || !Array.isArray(messages)) return;
  for (const m of messages) {
    if (m?.role && m.content != null) await saveMessageToDb(userId, m.role, m.content, idToken);
  }
}

/** Salva in memoria a lungo termine (obiettivo o fatto da ricordare) — da long-press su messaggio OXY */
export async function saveToMemory(authOrToken, { goal, keyFact } = {}) {
  const auth = typeof authOrToken === 'string'
    ? { idToken: authOrToken, userId: null }
    : (authOrToken && typeof authOrToken === 'object' ? authOrToken : { idToken: null, userId: null });
  const userId = auth?.userId || null;
  const idToken = auth?.idToken || null;

  const goalStr = safeText(goal, 2000);
  const keyFactStr = safeText(keyFact, 2000);
  if (!goalStr && !keyFactStr) throw new Error('Nessun contenuto da salvare');

  // 1) Cache locale (se abbiamo userId)
  if (userId) {
    const key = memoryCacheKey(userId);
    const current = await readJson(key, emptyMemory());
    const next = current && typeof current === 'object' ? { ...emptyMemory(), ...current } : emptyMemory();
    if (goalStr) {
      const goals = Array.isArray(next.goals) ? next.goals.slice() : [];
      goals.push({ id: makeId('goal'), text: goalStr });
      next.goals = goals.slice(-MAX_MEMORY_NOTES);
    }
    if (keyFactStr) {
      const keyFacts = Array.isArray(next.keyFacts) ? next.keyFacts.slice() : [];
      keyFacts.push({ id: makeId('keyFact'), text: keyFactStr });
      next.keyFacts = keyFacts.slice(-MAX_MEMORY_NOTES);
    }
    await writeJson(key, next);
  }

  // 2) Backend (se configurato)
  if (!getBaseUrl() || !idToken) return;
  const body = {};
  if (goalStr) body.goal = goalStr;
  if (keyFactStr) body.keyFact = keyFactStr;
  await requestWithToken('POST', '/api/memory', idToken, body);
}

/** Carica la memoria a lungo termine (per schermata Memory Vault / Le mie note) */
export async function loadMemory(authOrToken) {
  const auth = typeof authOrToken === 'string'
    ? { idToken: authOrToken, userId: null }
    : (authOrToken && typeof authOrToken === 'object' ? authOrToken : { idToken: null, userId: null });
  const userId = auth?.userId || null;
  const idToken = auth?.idToken || null;

  const local = userId ? await readJson(memoryCacheKey(userId), emptyMemory()) : null;
  if (!getBaseUrl() || !idToken) return local || emptyMemory();
  try {
    const data = await requestWithToken('GET', '/api/memory', idToken);
    const normalized = {
      identitySummary: typeof data?.identitySummary === 'string' ? data.identitySummary : '',
      goals: Array.isArray(data?.goals) ? data.goals : [],
      keyFacts: Array.isArray(data?.keyFacts) ? data.keyFacts : [],
      lastContext: typeof data?.lastContext === 'string' ? data.lastContext : '',
    };
    if (userId) await writeJson(memoryCacheKey(userId), normalized);
    return normalized;
  } catch (_) {
    return local || emptyMemory();
  }
}

/** Cancella una o più sezioni della memoria (obiettivi, fatti, identità, ultimo contesto). L'utente può farlo dalla schermata Le mie note; l'IA può farlo tramite tool clear_memory. */
export async function clearMemorySections(authOrToken, sections) {
  const auth = typeof authOrToken === 'string'
    ? { idToken: authOrToken, userId: null }
    : (authOrToken && typeof authOrToken === 'object' ? authOrToken : { idToken: null, userId: null });
  const userId = auth?.userId || null;
  const idToken = auth?.idToken || null;
  if (!Array.isArray(sections) || sections.length === 0) throw new Error('Specifica almeno una sezione da cancellare');
  const valid = ['identitySummary', 'goals', 'keyFacts', 'lastContext'];
  const toClear = sections.filter((s) => valid.includes(s));
  if (toClear.length === 0) throw new Error('Nessuna sezione valida');

  // cache locale
  if (userId) {
    const key = memoryCacheKey(userId);
    const current = await readJson(key, emptyMemory());
    const next = current && typeof current === 'object' ? { ...emptyMemory(), ...current } : emptyMemory();
    for (const s of toClear) {
      if (s === 'goals') next.goals = [];
      else if (s === 'keyFacts') next.keyFacts = [];
      else if (s === 'identitySummary') next.identitySummary = '';
      else if (s === 'lastContext') next.lastContext = '';
    }
    await writeJson(key, next);
  }

  // backend
  if (!getBaseUrl() || !idToken) return;
  await requestWithToken('POST', '/api/memory', idToken, { clearSections: toClear });
}

/** Elimina una singola nota dalla Memory Vault (per id, in goals o keyFacts). */
export async function deleteMemoryNote(authOrToken, noteId) {
  const auth = typeof authOrToken === 'string'
    ? { idToken: authOrToken, userId: null }
    : (authOrToken && typeof authOrToken === 'object' ? authOrToken : { idToken: null, userId: null });
  const userId = auth?.userId || null;
  const idToken = auth?.idToken || null;
  if (!noteId || typeof noteId !== 'string') throw new Error('Id nota richiesto');
  const trimmed = noteId.trim();

  // cache locale
  if (userId) {
    const key = memoryCacheKey(userId);
    const current = await readJson(key, emptyMemory());
    const next = current && typeof current === 'object' ? { ...emptyMemory(), ...current } : emptyMemory();
    const goals = Array.isArray(next.goals) ? next.goals : [];
    const keyFacts = Array.isArray(next.keyFacts) ? next.keyFacts : [];
    next.goals = goals.filter((n) => n?.id !== trimmed);
    next.keyFacts = keyFacts.filter((n) => n?.id !== trimmed);
    await writeJson(key, next);
  }

  // backend
  if (!getBaseUrl() || !idToken) return;
  await requestWithToken('POST', '/api/memory', idToken, { deleteNoteId: trimmed });
}
