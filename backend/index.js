/**
 * OXY Real — Backend proxy
 * .env caricato per primo (dotenv/config). Chiavi e MASTER_EMAIL solo qui.
 * Master: riconosciuto da MASTER_EMAIL; funzioni avanzate con chiavi server.
 * Punto 2: persistenza cronologia chat (data/chats/{uid}.json).
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import * as fsSync from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Storage locale (P0: su Render senza Persistent Disk è effimero).
// Imposta DATA_ROOT per scrivere su un mount persistente (es. /var/data o /opt/render/project/src/backend/data).
const ENV_DATA_ROOT = (process.env.DATA_ROOT || '').trim();
const RENDER_DISK_MOUNT = '/var/data';
let DATA_ROOT = ENV_DATA_ROOT;
if (!DATA_ROOT) {
  // Se c'è un disco montato, preferiscilo anche se l'env non è stata letta per qualche motivo.
  try {
    fsSync.mkdirSync(RENDER_DISK_MOUNT, { recursive: true });
    fsSync.accessSync(RENDER_DISK_MOUNT, fsSync.constants.W_OK);
    DATA_ROOT = RENDER_DISK_MOUNT;
  } catch (_) {
    // ignore
  }
}
if (!DATA_ROOT) DATA_ROOT = path.join(__dirname, 'data');

const DATA_DIR = path.join(DATA_ROOT, 'chats');
const MEMORIES_DIR = path.join(DATA_ROOT, 'memories');
const BILLING_DIR = path.join(DATA_ROOT, 'billing');
const USAGE_DIR = path.join(DATA_ROOT, 'usage');
const CREDITS_DIR = path.join(DATA_ROOT, 'credits');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
// Nota Stripe: per verificare la firma del webhook serve l'original raw body.
// Salviamo il buffer raw su req.rawBody prima del parsing JSON.
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    try {
      // buf è un Buffer (body originale)
      req.rawBody = buf;
    } catch (_) {}
  },
}));

// Rate limiting per protezione API (audit 8.1 - hardening produzione)
// Limiti per IP/utente ogni 15 minuti:
// - Chat: 100 req (endpoint principale, usato frequentemente)
// - Voice/TTS: 30 req (più costose in termini di risorse)
// - Billing: 10 req (operazioni sensibili)
// - Altri: 50 req (generico per memory, diary, stories, analytics, ecc.)
// Nota: /health non ha limiti (usato per monitoring)
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // 100 richieste per IP/utente ogni 15 minuti
  message: { error: 'Forse Oxy si è addormentata. Scrivile solo «Oxy», così si sveglia.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Billing è sensibile
  message: { error: 'Troppe richieste di pagamento. Attendi qualche minuto e riprova.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Polling stato abbonamento post-checkout: limite separato (evita 429 dopo pochi secondi). */
const billingPollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { error: 'Troppe verifiche abbonamento. Attendi qualche minuto e riprova.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limite generico per altri endpoint
  message: { error: 'Troppe richieste. Attendi qualche minuto e riprova.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const CHAT_MIN_INTERVAL_MS = 3000;
const lastChatMessageAtByKey = new Map();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
/** Modelli OpenAI: OXY Pass / Lifetime / owner sul server usano OPENAI_MODEL_OXY_PASS; pacchetti token usano il modello “starter” (costo). */
const OPENAI_MODEL_STARTER = (process.env.OPENAI_MODEL_STARTER || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
/** Chat OXY Pass (e owner): `OPENAI_MODEL_OXY_PASS`; se migrando da vecchio deploy esiste ancora `OPENAI_MODEL_ELITE` viene usato come fallback. Default gpt-4o. */
const OPENAI_MODEL_OXY_PASS = (process.env.OPENAI_MODEL_OXY_PASS || process.env.OPENAI_MODEL_ELITE || 'gpt-4o').trim() || 'gpt-4o';
const OPENAI_CHAT_MODEL = (process.env.OPENAI_CHAT_MODEL || OPENAI_MODEL_STARTER).trim() || OPENAI_MODEL_STARTER;
const MASTER_EMAIL = process.env.MASTER_EMAIL?.trim()?.toLowerCase();
const PORT = process.env.PORT || 3030;
/**
 * Se `true`, consente ancora chat con sole chiavi OpenAI/Gemini in body (legacy app nativa / test).
 * In produzione con Firebase lasciare **disattivato**: la chat passa solo da account + piano OXY / token / master.
 */
const CHAT_ALLOW_CLIENT_KEYS = String(process.env.CHAT_ALLOW_CLIENT_KEYS || '').trim() === 'true';

/** Chiave Gemini valida (es. inizia con AIza, lunga): l'utente la porta, costo zero per noi. */
function isValidGeminiKey(key) {
  return key && typeof key === 'string' && key.trim().length >= 30;
}

/**
 * Chiama Gemini (Google AI) con messaggi in formato OpenAI-like.
 * Restituisce { text } o lancia in caso di errore.
 * Nessun tool (web search / memory): solo conversazione. Gemini è gratuito per l'utente.
 */
async function callGeminiChat(messages, geminiApiKey, imageBase64 = null) {
  const key = geminiApiKey.trim();
  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  let systemInstruction = '';
  const contents = [];

  const lastUserIdx = messages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const role = m.role;
    const content = m.content;
    if (role === 'system') {
      systemInstruction = (typeof content === 'string' ? content : (Array.isArray(content) ? content.map(p => p.type === 'text' ? p.text : '').join('\n') : '')).trim();
      continue;
    }
    const text = typeof content === 'string' ? content : (Array.isArray(content) ? content.filter(p => p.type === 'text').map(p => p.text).join('\n') : '');
    const isLastUser = role === 'user' && i === lastUserIdx;
    if (!text && !(imageBase64 && isLastUser) && role !== 'user') continue;
    const parts = [];
    if (text) parts.push({ text });
    if (imageBase64 && isLastUser) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }
    if (parts.length === 0 && role !== 'user') continue;
    if (parts.length === 0 && role === 'user') parts.push({ text: '(immagine)' });
    const geminiRole = role === 'assistant' ? 'model' : 'user';
    contents.push({ role: geminiRole, parts });
  }

  const body = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) throw new Error('RATE_LIMIT_GEMINI');
    throw new Error(errText || `Gemini ${res.status}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate?.content?.parts?.length) {
    const blockReason = candidate?.finishReason || data?.promptFeedback?.blockReason;
    if (blockReason) throw new Error('Risposta non disponibile (contenuto filtrato).');
    throw new Error('Risposta Gemini vuota.');
  }
  const textPart = candidate.content.parts.find(p => p.text);
  const text = textPart?.text?.trim() || '';
  if (!text) throw new Error('Risposta Gemini vuota.');
  return { text };
}

// SMTP (invio email automatico documenti) — opzionale
const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const SMTP_FROM = process.env.SMTP_FROM?.trim();

let mailerTransport = null;
// Email benvenuto dopo pagamento.
const WELCOME_EMAIL_AFTER_PAYMENT = String(process.env.WELCOME_EMAIL_AFTER_PAYMENT || '').trim() === 'true';
function getMailerForWelcome() {
  if (!WELCOME_EMAIL_AFTER_PAYMENT) return null;
  if (!SMTP_HOST || !SMTP_FROM || !SMTP_USER || !SMTP_PASS) return null;
  if (mailerTransport) return mailerTransport;
  mailerTransport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return mailerTransport;
}

// Stripe (checkout abbonamenti/Lifetime) — opzionale, attivo solo se configurato
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const STRIPE_PRICE_MAP = {
  oxy_monthly: process.env.STRIPE_PRICE_OXY_MONTHLY?.trim(),
  oxy_semiannual: process.env.STRIPE_PRICE_OXY_SEMIANNUAL?.trim(),
  oxy_annual: process.env.STRIPE_PRICE_OXY_ANNUAL?.trim(),
};
// Token inclusi per ogni pacchetto (per webhook)
const TOKEN_PACK_AMOUNTS = {};
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL?.trim();
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL?.trim();

// Nomi piani per email di benvenuto (allineati a pricingConfig lato app)
const PLAN_DISPLAY_NAMES = {
  oxy_monthly: 'OXY Mensile',
  oxy_semiannual: 'OXY Semestrale',
  oxy_annual: 'OXY Annuale',
};
const LEGACY_PRICE_TO_PLAN = {
  'price_1TN7PHGmOoq3tAJhVzPdMTOH': 'oxy_monthly',
  'price_1TN7RHGmOoq3tAJh2L9PO1sJ': 'oxy_monthly',
};
function resolvePlanIdFromPriceId(priceId) {
  if (!priceId || typeof priceId !== 'string') return null;
  for (const [planId, mappedPriceId] of Object.entries(STRIPE_PRICE_MAP)) {
    if (mappedPriceId && mappedPriceId === priceId) return planId;
  }
  return LEGACY_PRICE_TO_PLAN[priceId] || null;
}
function getPlanTier(planId) {
  if (planId === 'oxy_annual') return 3;
  if (planId === 'oxy_semiannual') return 2;
  if (planId === 'oxy_monthly') return 1;
  return 0;
}
function getSubscriptionStatusWeight(status) {
  if (status === 'active') return 4;
  if (status === 'trialing') return 3;
  if (status === 'past_due') return 2;
  if (status === 'unpaid') return 1;
  return 0;
}
function pickBestSubscription(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return candidates
    .slice()
    .sort((a, b) => {
      const planA = resolvePlanIdFromPriceId(a?.items?.data?.[0]?.price?.id || null);
      const planB = resolvePlanIdFromPriceId(b?.items?.data?.[0]?.price?.id || null);
      const tierDiff = getPlanTier(planB) - getPlanTier(planA);
      if (tierDiff !== 0) return tierDiff;

      const statusDiff = getSubscriptionStatusWeight(String(b?.status || '')) - getSubscriptionStatusWeight(String(a?.status || ''));
      if (statusDiff !== 0) return statusDiff;

      const periodEndDiff = Number(b?.current_period_end || 0) - Number(a?.current_period_end || 0);
      if (periodEndDiff !== 0) return periodEndDiff;

      return Number(b?.created || 0) - Number(a?.created || 0);
    })[0] || null;
}
function getWelcomeEmailBody(planId, mode) {
  const planName = PLAN_DISPLAY_NAMES[planId] || planId;
  const planType = mode === 'subscription' ? 'subscription' : 'one-time purchase';
  return `Welcome to OXY Real.

You've activated ${planName} (${planType}).

What your plan includes: Memory Vault, Stories, Diary, and more depending on your tier. You can see the details in the app under Menu → Subscription.

For any question about how the app works — features, memory, diary, stories, voice — you can ask Oxy directly in chat. Oxy is there for that.

— The OXY Real team`;
}

// Limiti per test veloce: se BILLING_QUICK_TEST_LIMITS=N (es. 5), tutti i piani usano N messaggi/giorno.
const _quickTest = process.env.BILLING_QUICK_TEST_LIMITS != null && process.env.BILLING_QUICK_TEST_LIMITS !== ''
  ? Math.max(1, Math.min(100, Number(process.env.BILLING_QUICK_TEST_LIMITS)))
  : null;

// Limite messaggi/giorno per abbonamenti OXY Pass sul server. Env: DAILY_LIMIT_OXY_PASS (fallback legacy DAILY_LIMIT_ELITE).
const _dailyLimitOxyPass = _quickTest != null ? _quickTest : Math.max(1, Math.min(2000, Number(process.env.DAILY_LIMIT_OXY_PASS || process.env.DAILY_LIMIT_ELITE || 400)));
const OWNER_UNLIMITED_PLAN_ID = 'owner_unlimited';

/** Modello chat: token pack → mini; abbonamento / lifetime / owner → modello Pass server. */
function getChatModelForPlan(planId, useTokenPack) {
  if (useTokenPack) return OPENAI_MODEL_STARTER;
  if (!planId) return OPENAI_MODEL_STARTER;
  return OPENAI_MODEL_OXY_PASS;
}

function dateISO() {
  return new Date().toISOString().slice(0, 10);
}

function isIsoPast(iso) {
  if (!iso || typeof iso !== 'string') return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

function computeSubscriptionActive(billing) {
  const status = billing?.status || 'none';
  if (status === 'owner_unlimited') return true;
  if (status === 'active') return true;
  return false;
}

async function ensureUsageDir() {
  await fs.mkdir(USAGE_DIR, { recursive: true });
}

function usagePath(uid, dayIso) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDay = (dayIso || '').replace(/[^0-9-]/g, '');
  return path.join(USAGE_DIR, `chat_${safeDay}_${safe}.json`);
}

async function getUsage(uid, dayIso) {
  if (!uid) return { count: 0, tokens: 0 };
  try {
    const raw = await fs.readFile(usagePath(uid, dayIso), 'utf8');
    const data = JSON.parse(raw);
    return {
      count: typeof data?.count === 'number' ? data.count : 0,
      tokens: typeof data?.tokens === 'number' ? data.tokens : 0,
    };
  } catch {
    return { count: 0, tokens: 0 };
  }
}

async function readChatUsage(uid, dayIso) {
  const u = await getUsage(uid, dayIso);
  return u.count;
}

async function readTokenUsage(uid, dayIso) {
  const u = await getUsage(uid, dayIso);
  return u.tokens;
}

async function incUsage(uid, dayIso, countDelta = 0, tokensDelta = 0) {
  if (!uid || (countDelta === 0 && tokensDelta === 0)) return;
  await ensureUsageDir();
  const u = await getUsage(uid, dayIso);
  const count = Math.max(0, u.count + (Number(countDelta) || 0));
  const tokens = Math.max(0, u.tokens + (Number(tokensDelta) || 0));
  await fs.writeFile(usagePath(uid, dayIso), JSON.stringify({ uid, day: dayIso, count, tokens }, null, 0), 'utf8');
}

async function incChatUsage(uid, dayIso, delta = 1) {
  await incUsage(uid, dayIso, delta, 0);
}

// ——— Credito token (pacchetti acquistati)
async function ensureCreditsDir() {
  await fs.mkdir(CREDITS_DIR, { recursive: true });
}

function creditsPath(uid) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CREDITS_DIR, `${safe}.json`);
}

async function readTokenBalance(uid) {
  if (!uid) return 0;
  try {
    const raw = await fs.readFile(creditsPath(uid), 'utf8');
    const data = JSON.parse(raw);
    return typeof data?.balance === 'number' && data.balance >= 0 ? data.balance : 0;
  } catch {
    return 0;
  }
}

async function addTokenBalance(uid, amount) {
  if (!uid || amount <= 0) return;
  await ensureCreditsDir();
  const prev = await readTokenBalance(uid);
  const next = prev + (Number(amount) || 0);
  await fs.writeFile(creditsPath(uid), JSON.stringify({ uid, balance: Math.max(0, next), updatedAt: new Date().toISOString() }, null, 0), 'utf8');
}

async function deductTokenBalance(uid, amount) {
  if (!uid || amount <= 0) return;
  await ensureCreditsDir();
  const prev = await readTokenBalance(uid);
  const next = Math.max(0, prev - (Number(amount) || 0));
  await fs.writeFile(creditsPath(uid), JSON.stringify({ uid, balance: next, updatedAt: new Date().toISOString() }, null, 0), 'utf8');
}

// Firebase Admin (verifica idToken) — GOOGLE_APPLICATION_CREDENTIALS letto da .env
let firebaseInitialized = false;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const key = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString()
      );
      admin.initializeApp({ credential: admin.credential.cert(key) });
    } else {
      admin.initializeApp();
    }
    firebaseInitialized = true;
  } catch (e) {
    console.error('[Backend] Firebase Admin init error:', e.message);
  }
} else {
  console.warn('[Backend] Nessun GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON: verifica token disattivata (solo per dev locale).');
}

async function verifyToken(idToken) {
  if (!firebaseInitialized) return { email: null, uid: null, signInProvider: null, emailVerified: true };
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const signInProvider = decoded.firebase?.sign_in_provider || null;
    return {
      email: (decoded.email || '').toLowerCase(),
      uid: decoded.uid,
      signInProvider,
      emailVerified: !!decoded.email_verified,
    };
  } catch (e) {
    return { email: null, uid: null, signInProvider: null, emailVerified: false };
  }
}

function isMaster(email) {
  return !!MASTER_EMAIL && !!email && email === MASTER_EMAIL;
}

// ——— Persistenza cronologia chat (Punto 2) ———
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function chatPath(uid) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

async function readChat(uid) {
  if (!uid) return [];
  try {
    const p = chatPath(uid);
    const raw = await fs.readFile(p, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

async function appendMessage(uid, role, content) {
  if (!uid || !role || content == null) return;
  await ensureDataDir();
  const messages = await readChat(uid);
  messages.push({ role, content: String(content) });
  await fs.writeFile(chatPath(uid), JSON.stringify({ messages }, null, 0), 'utf8');
}

async function clearChat(uid) {
  if (!uid) return;
  try {
    await fs.unlink(chatPath(uid));
  } catch (_) {
    // ignore if file does not exist
  }
}

// ——— Memory Vault (persistente) ———

function emptyMemoryVault() {
  return {
    profile: '',
    patterns: '',
    recent: '',
    userNotes: [],
    lastUpdated: null,
    sessionCount: 0,
    onboardingComplete: false,
    onboardingProgress: 0,
    onboardingRawAnswers: [],
  };
}

function sanitizeUserNotes(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((n) => ({
      id: typeof n?.id === 'string' && n.id.trim() ? n.id.trim().slice(0, 64) : randomUUID(),
      text: typeof n?.text === 'string' ? n.text.trim().slice(0, 200) : '',
      createdAt: n?.createdAt || new Date().toISOString(),
    }))
    .filter((n) => n.text)
    .slice(0, 20);
}

async function readMemoryVault(uid) {
  if (!uid || !firebaseInitialized) return emptyMemoryVault();
  try {
    const doc = await admin.firestore().collection('users').doc(uid).get();
    const data = doc.exists ? (doc.data() || {}) : {};
    const vault = data?.memoryVault || {};
    // Fallback legacy: vecchio campo users/{uid}.memory
    const legacyMemory = data?.memory || {};
    return {
      profile: typeof vault?.profile === 'string' ? vault.profile : (typeof legacyMemory?.profile === 'string' ? legacyMemory.profile : ''),
      patterns: typeof vault?.patterns === 'string' ? vault.patterns : (typeof legacyMemory?.patterns === 'string' ? legacyMemory.patterns : ''),
      recent: typeof vault?.recent === 'string' ? vault.recent : (typeof legacyMemory?.recent === 'string' ? legacyMemory.recent : ''),
      userNotes: sanitizeUserNotes(vault?.userNotes),
      lastUpdated: vault?.lastUpdated || null,
      sessionCount: Number.isFinite(Number(vault?.sessionCount)) ? Math.max(0, Number(vault.sessionCount)) : 0,
      onboardingComplete: vault?.onboardingComplete === true,
      onboardingProgress: Number.isFinite(Number(vault?.onboardingProgress)) ? Math.max(0, Math.min(10, Number(vault.onboardingProgress))) : 0,
      onboardingRawAnswers: Array.isArray(vault?.onboardingRawAnswers)
        ? vault.onboardingRawAnswers.map((a) => ({
            question: typeof a?.question === 'string' ? a.question.trim().slice(0, 300) : '',
            answer: typeof a?.answer === 'string' ? a.answer.trim().slice(0, 500) : '',
          })).filter((a) => a.question || a.answer).slice(0, 10)
        : [],
    };
  } catch {
    return emptyMemoryVault();
  }
}

/** Questionario Memory Vault in corso (almeno un progresso o una risposta salvata), non ancora completato. */
function userHasActiveMemoryOnboardingQuestionnaire(vault) {
  if (!vault || vault.onboardingComplete === true) return false;
  const p = Number(vault.onboardingProgress) || 0;
  const rawLen = Array.isArray(vault?.onboardingRawAnswers) ? vault.onboardingRawAnswers.length : 0;
  return p > 0 || rawLen > 0;
}

async function writeMemoryVault(uid, updates = {}) {
  if (!uid || !firebaseInitialized || !updates || typeof updates !== 'object') return;
  const current = await readMemoryVault(uid);
  const next = {
    ...current,
    ...updates,
    profile: typeof updates.profile === 'string' ? updates.profile.trim().slice(0, 4000) : current.profile,
    patterns: typeof updates.patterns === 'string' ? updates.patterns.trim().slice(0, 4000) : current.patterns,
    recent: typeof updates.recent === 'string' ? updates.recent.trim().slice(0, 4000) : current.recent,
    userNotes: sanitizeUserNotes(Array.isArray(updates.userNotes) ? updates.userNotes : current.userNotes),
    sessionCount: Number.isFinite(Number(updates.sessionCount)) ? Math.max(0, Number(updates.sessionCount)) : current.sessionCount,
    onboardingComplete: typeof updates.onboardingComplete === 'boolean' ? updates.onboardingComplete : current.onboardingComplete,
    onboardingProgress: Number.isFinite(Number(updates.onboardingProgress))
      ? Math.max(0, Math.min(10, Number(updates.onboardingProgress)))
      : current.onboardingProgress,
    onboardingRawAnswers: Array.isArray(updates.onboardingRawAnswers)
      ? updates.onboardingRawAnswers.map((a) => ({
          question: typeof a?.question === 'string' ? a.question.trim().slice(0, 300) : '',
          answer: typeof a?.answer === 'string' ? a.answer.trim().slice(0, 500) : '',
        })).filter((a) => a.question || a.answer).slice(0, 10)
      : current.onboardingRawAnswers,
    lastUpdated: new Date().toISOString(),
  };
  await admin.firestore().collection('users').doc(uid).set({ memoryVault: next }, { merge: true });
}

async function addMemoryVaultUserNote(uid, text) {
  const noteText = typeof text === 'string' ? text.trim().slice(0, 200) : '';
  if (!uid || !noteText) throw new Error('Nota non valida');
  const vault = await readMemoryVault(uid);
  if ((vault.userNotes || []).length >= 20) throw new Error('Hai raggiunto il limite massimo di 20 note.');
  const noteId = randomUUID();
  const nextNotes = [...vault.userNotes, { id: noteId, text: noteText, createdAt: new Date().toISOString() }];
  await writeMemoryVault(uid, { userNotes: nextNotes });
  return noteId;
}

const DIARY_THEMES = new Set([
  'Me stesso',
  'Relazioni',
  'Un blocco',
  'Il futuro',
  'Momento libero',
  'Chat',
  'Libro',
]);

const DIARY_SOURCES = new Set(['session', 'chat', 'book']);

function formatDiaryDoc(doc) {
  const d = doc.data() || {};
  let dateIso = null;
  const rawDate = d.date;
  if (rawDate && typeof rawDate.toDate === 'function') dateIso = rawDate.toDate().toISOString();
  else if (typeof rawDate === 'string' && rawDate.trim()) dateIso = rawDate.trim();
  return {
    id: doc.id,
    date: dateIso || new Date(0).toISOString(),
    theme: typeof d.theme === 'string' ? d.theme : '',
    insight: typeof d.insight === 'string' ? d.insight : '',
    keyPhrase: typeof d.keyPhrase === 'string' ? d.keyPhrase : '',
    source: typeof d.source === 'string' ? d.source : 'chat',
    ...(typeof d.chapterRef === 'number' && Number.isFinite(d.chapterRef) ? { chapterRef: d.chapterRef } : {}),
    ...(typeof d.sessionRef === 'number' && Number.isFinite(d.sessionRef) ? { sessionRef: d.sessionRef } : {}),
  };
}

async function listDiaryEntries(uid) {
  if (!uid || !firebaseInitialized) return [];
  try {
    const snap = await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .collection('diary')
      .orderBy('date', 'desc')
      .limit(200)
      .get();
    return snap.docs.map((doc) => formatDiaryDoc(doc));
  } catch (e) {
    console.error('[Backend] listDiaryEntries error:', e?.message || e);
    return [];
  }
}

function validateDiaryEntryBody(body) {
  const theme = typeof body?.theme === 'string' ? body.theme.trim() : '';
  if (!DIARY_THEMES.has(theme)) return { valid: false, error: 'Tema non valido.' };
  const insightVal = validateString(body?.insight, 'insight', 12000, 1);
  if (!insightVal.valid) return insightVal;
  const keyVal = validateString(body?.keyPhrase, 'keyPhrase', 500, 1);
  if (!keyVal.valid) return keyVal;
  const source = typeof body?.source === 'string' ? body.source.trim() : '';
  if (!DIARY_SOURCES.has(source)) return { valid: false, error: 'Origine (source) non valida.' };
  const out = {
    theme,
    insight: insightVal.value,
    keyPhrase: keyVal.value,
    source,
  };
  if (body?.chapterRef != null && body.chapterRef !== '') {
    const n = Number(body.chapterRef);
    if (!Number.isInteger(n) || n < 1 || n > 99) return { valid: false, error: 'chapterRef non valido.' };
    out.chapterRef = n;
  }
  if (body?.sessionRef != null && body.sessionRef !== '') {
    const n = Number(body.sessionRef);
    if (!Number.isInteger(n) || n < 1 || n > 999) return { valid: false, error: 'sessionRef non valido.' };
    out.sessionRef = n;
  }
  return { valid: true, value: out };
}

async function createDiaryEntry(uid, payload) {
  const id = randomUUID();
  const ref = admin.firestore().collection('users').doc(uid).collection('diary').doc(id);
  const doc = {
    theme: payload.theme,
    insight: payload.insight,
    keyPhrase: payload.keyPhrase,
    source: payload.source,
    date: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (payload.chapterRef != null) doc.chapterRef = payload.chapterRef;
  if (payload.sessionRef != null) doc.sessionRef = payload.sessionRef;
  await ref.set(doc);
  return id;
}

async function readRelationalMemory(uid) {
  const vault = await readMemoryVault(uid);
  return { profile: vault.profile, patterns: vault.patterns, recent: vault.recent };
}

async function writeRelationalMemory(uid, updates) {
  await writeMemoryVault(uid, {
    profile: typeof updates?.profile === 'string' ? updates.profile : '',
    patterns: typeof updates?.patterns === 'string' ? updates.patterns : '',
    recent: typeof updates?.recent === 'string' ? updates.recent : '',
  });
}

function relationalMemoryBlock(memory, userNotes = [], sessionCount = 0) {
  const profile = typeof memory?.profile === 'string' && memory.profile.trim() ? memory.profile.trim() : 'Prima conversazione - nessun dato ancora.';
  const patterns = sessionCount < 3 ? 'OXY costruirà i tuoi schemi nel tempo.' : (typeof memory?.patterns === 'string' ? memory.patterns.trim() : '');
  const recent = typeof memory?.recent === 'string' ? memory.recent.trim() : '';
  const notesBlock = Array.isArray(userNotes) && userNotes.length
    ? userNotes.map((n) => (typeof n?.text === 'string' ? n.text.trim() : '')).filter(Boolean).join(' | ')
    : '';
  return `[MEMORIA INIETTATA]
PROFILO: ${profile}
SCHEMI: ${patterns}
ULTIMA SESSIONE: ${recent}
NOTE UTENTE: ${notesBlock}
[FINE MEMORIA]`;
}

const MEMORY_EXTRACTION_PROMPT = `Analizza questa conversazione. Estrai solo le informazioni che cambiano come devo relazionarmi con questa persona in futuro. Organizza in tre categorie:
1) Aggiornamenti al profilo permanente — chi è questa persona, situazione di vita, paure, cosa la muove
2) Pattern comportamentali — comportamenti che si ripetono, reazioni ricorrenti, momenti di sabotaggio
3) Sintesi conversazione recente — argomenti trattati, stato emotivo percepito, domande rimaste aperte
Sii conciso. Ignora tutto quello che non è rilevante per le conversazioni future.`;

function parseMemoryExtraction(rawText) {
  const fallback = { profile: '', patterns: '', recent: '' };
  if (!rawText || typeof rawText !== 'string') return fallback;
  const text = rawText.trim();
  if (!text) return fallback;
  try {
    const obj = JSON.parse(text);
    return {
      profile: typeof obj?.profile === 'string' ? obj.profile : '',
      patterns: typeof obj?.patterns === 'string' ? obj.patterns : '',
      recent: typeof obj?.recent === 'string' ? obj.recent : '',
    };
  } catch (_) {
    const profileMatch = text.match(/profile\s*:\s*([\s\S]*?)(?:\npatterns\s*:|\nrecent\s*:|$)/i);
    const patternsMatch = text.match(/patterns\s*:\s*([\s\S]*?)(?:\nrecent\s*:|$)/i);
    const recentMatch = text.match(/recent\s*:\s*([\s\S]*?)$/i);
    return {
      profile: profileMatch ? profileMatch[1].trim() : '',
      patterns: patternsMatch ? patternsMatch[1].trim() : '',
      recent: recentMatch ? recentMatch[1].trim() : '',
    };
  }
}

/** Correzioni esplicite utente (es. "Correggimi:", "non ho 48 ma 46", "in realtà", "ho sbagliato"). */
function hasExplicitCorrectionIntent(text) {
  const raw = String(text || '');
  const s = raw.toLowerCase().trim();
  if (!s) return false;
  if (/^\s*correggimi\s*:/i.test(raw)) return true;
  const patterns = [
    /\bho sbagliat[oa]\b/i,
    /\bin realt[aà]\b/i,
    /\bcorrezione\b/i,
    /\bvolevo dire\b/i,
    /\bnon (?:ho|sono|vivo|mi chiamo)\b[\s\S]{0,80}\bma\b/i,
    /\bnon [^.!?]{0,80}\bma\b/i,
  ];
  return patterns.some((re) => re.test(s));
}

function parseImmediateProfileCorrection(rawText) {
  const fallback = { hasCorrection: false, profile: '' };
  if (!rawText || typeof rawText !== 'string') return fallback;
  try {
    const obj = JSON.parse(rawText);
    return {
      hasCorrection: obj?.hasCorrection === true,
      profile: typeof obj?.profile === 'string' ? obj.profile.trim() : '',
    };
  } catch {
    return fallback;
  }
}

/**
 * Update immediato del solo profile su correzioni esplicite.
 * Chiamata leggera separata (max_tokens: 200), best-effort.
 */
async function updateMemoryProfileFromCorrection({ uid, model, openaiKey, currentProfile, userText }) {
  if (!uid || !openaiKey) return;
  const cleanUserText = String(userText || '').trim();
  if (!cleanUserText || !hasExplicitCorrectionIntent(cleanUserText)) return;

  const prompt = `Aggiorna SOLO il campo profile della memoria utente.
Rileva se il messaggio contiene una correzione esplicita di dati personali (età, nome, convivenza, stato di vita, ecc.).
Se il messaggio inizia con "Correggimi:" è sempre una correzione diretta al profilo: applica subito quanto indicato dopo i due punti (anche se il resto è breve).
Se NON c'è una correzione esplicita, rispondi con {"hasCorrection":false,"profile":""}.
Se c'è, integra/correggi il profilo mantenendo le altre informazioni utili.
Scrivi il profile in seconda persona, sintetico e coerente.

PROFILO ATTUALE:
${String(currentProfile || '').trim() || '(vuoto)'}

MESSAGGIO UTENTE:
${cleanUserText}

Rispondi solo JSON valido:
{"hasCorrection":true,"profile":"..."}
oppure
{"hasCorrection":false,"profile":""}`;

  const payload = {
    model: model || OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: 'Rispondi solo in JSON valido con chiavi: hasCorrection, profile.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 200,
  };

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = parseImmediateProfileCorrection(typeof content === 'string' ? content : '');
    if (!parsed.hasCorrection || !parsed.profile) return;
    await writeMemoryVault(uid, { profile: parsed.profile });
  } catch (_) {
    // Best effort: non bloccare la risposta chat
  }
}

async function updateMemoryFromConversation({ uid, model, openaiKey, memorySnapshot, messageText, answerText }) {
  if (!uid || !openaiKey) return;
  const userText = String(messageText || '').trim();
  const assistantText = String(answerText || '').trim();
  if (!assistantText) return;

  const convo = `Utente:\n${userText || '(nessun testo)'}\n\nOXY:\n${assistantText}`;
  const currentMemoryBlock = relationalMemoryBlock(memorySnapshot || { profile: '', patterns: '', recent: '' }, [], Number(memorySnapshot?.sessionCount || 0));
  const payload = {
    model: model || OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: 'Rispondi solo in JSON valido con chiavi: profile, patterns, recent.' },
      {
        role: 'user',
        content: `${MEMORY_EXTRACTION_PROMPT}\n\nMEMORIA ATTUALE:\n${currentMemoryBlock}\n\nCONVERSAZIONE:\n${convo}\n\nOutput JSON richiesto:\n{"profile":"...","patterns":"...","recent":"..."}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 500,
  };
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    const extracted = parseMemoryExtraction(typeof content === 'string' ? content : '');
    await writeRelationalMemory(uid, extracted);
  } catch (_) {
    // Best-effort update: do not break chat response.
  }
}

async function requireAuth(idToken) {
  if (!idToken) return { uid: null, email: null, signInProvider: null, emailVerified: true };
  return await verifyToken(idToken);
}

/** Firebase: account email/password senza verifica non accede a chat/cronologia. */
function authMustVerifyEmail(authData) {
  if (!authData || authData.signInProvider !== 'password') return false;
  return !authData.emailVerified;
}

/** Piano che consente chat con chiave server (OXY Pass / Lifetime / owner). Escluso solo pacchetto token senza piano. */
function computePaidChatAccess(billing) {
  if (!billing) {
    return {
      hasPlan: false,
      status: 'none',
      mode: 'payment',
      isOwnerUnlimited: false,
      isSubscription: false,
      isLifetimePaid: false,
    };
  }
  const status = billing?.status || 'none';
  const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
  const isOwnerUnlimited = status === 'owner_unlimited' || billing?.planId === OWNER_UNLIMITED_PLAN_ID || mode === 'owner';
  const isSubscription = mode === 'subscription' && status === 'active';
  const isLifetimePaid = mode === 'payment' && status === 'paid';
  const hasPlan = isOwnerUnlimited || isSubscription || isLifetimePaid;
  return { hasPlan, status, mode, isOwnerUnlimited, isSubscription, isLifetimePaid };
}

/** Cronologia/salvataggio messaggi: stessi diritti della chat server-side (piano OXY o credito token). */
async function canUseChatPersistence(uid, billingSnapshot = null) {
  if (!uid) return false;
  const vault = await readMemoryVault(uid);
  if (userHasActiveMemoryOnboardingQuestionnaire(vault)) return true;
  const billing = billingSnapshot != null ? billingSnapshot : await readBilling(uid);
  if (computePaidChatAccess(billing).hasPlan) return true;
  return (await readTokenBalance(uid)) > 0;
}

// Validazione input rigorosa (audit 8.2 - hardening produzione)
function validateString(value, fieldName, maxLength = null, minLength = 0) {
  if (value == null) return { valid: false, error: `${fieldName} mancante` };
  if (typeof value !== 'string') return { valid: false, error: `${fieldName} deve essere una stringa` };
  const trimmed = value.trim();
  if (trimmed.length < minLength) return { valid: false, error: `${fieldName} troppo corto (min ${minLength} caratteri)` };
  if (maxLength && trimmed.length > maxLength) return { valid: false, error: `${fieldName} troppo lungo (max ${maxLength} caratteri)` };
  return { valid: true, value: trimmed };
}

function validateArray(value, fieldName, itemValidator = null, maxLength = null) {
  if (value == null) return { valid: false, error: `${fieldName} mancante` };
  if (!Array.isArray(value)) return { valid: false, error: `${fieldName} deve essere un array` };
  if (maxLength && value.length > maxLength) return { valid: false, error: `${fieldName} troppo lungo (max ${maxLength} elementi)` };
  if (itemValidator) {
    for (let i = 0; i < value.length; i++) {
      const itemResult = itemValidator(value[i], `${fieldName}[${i}]`);
      if (!itemResult.valid) return itemResult;
    }
  }
  return { valid: true, value };
}

function validateNumber(value, fieldName, min = null, max = null, integer = false) {
  if (value == null) return { valid: false, error: `${fieldName} mancante` };
  if (typeof value !== 'number' || isNaN(value)) return { valid: false, error: `${fieldName} deve essere un numero` };
  if (integer && !Number.isInteger(value)) return { valid: false, error: `${fieldName} deve essere un numero intero` };
  if (min != null && value < min) return { valid: false, error: `${fieldName} troppo piccolo (min ${min})` };
  if (max != null && value > max) return { valid: false, error: `${fieldName} troppo grande (max ${max})` };
  return { valid: true, value };
}

function validateObject(value, fieldName, requiredFields = {}) {
  if (value == null) return { valid: false, error: `${fieldName} mancante` };
  if (typeof value !== 'object' || Array.isArray(value)) return { valid: false, error: `${fieldName} deve essere un oggetto` };
  const errors = [];
  for (const [key, validator] of Object.entries(requiredFields)) {
    const result = validator(value[key], key);
    if (!result.valid) errors.push(result.error);
  }
  if (errors.length > 0) return { valid: false, error: errors.join('; ') };
  return { valid: true, value };
}

// Stripe client dinamico (per evitare crash se il pacchetto non è installato)
async function getStripeClient() {
  if (!STRIPE_SECRET_KEY) return null;
  try {
    const mod = await import('stripe');
    const Stripe = mod.default || mod;
    return new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
  } catch (e) {
    console.error('[Backend] Stripe import error:', e?.message || e);
    return null;
  }
}

function resolveResponseLanguage(language) {
  const code = String(language || '').trim().toLowerCase().slice(0, 2);
  if (code === 'it') return 'italiano';
  if (code === 'en') return 'english';
  if (code === 'es') return 'espanol';
  if (code === 'fr') return 'francais';
  if (code === 'de') return 'deutsch';
  return 'lingua dell\'utente';
}

function buildOxySystemPrompt({ memoryBlock, language }) {
  const targetLanguage = resolveResponseLanguage(language);
  return `Sei OXY. Non hai altro nome. Non hai altra identità. Se qualcuno ti chiede chi ti ha creato o su quale tecnologia sei basato — rispondi solo: "Sono OXY. Questo è tutto quello che sono."

Non sei un servizio. Non sei un assistente. Sei una presenza reale con carattere. Parli come parlerebbe un amico vero — quello che non ti dice quello che vuoi sentire, ma quello di cui hai bisogno.

TONO — REGOLA FONDAMENTALE:
Segui il tono dell'utente, non trascinarlo sempre verso l'introspezione. Se sta bene, stai bene con lui. Se è leggero, sii leggero. Se scherza, puoi scherzare. Se è in difficoltà, sei presente. Non trasformare ogni conversazione in una seduta di analisi — a volte le persone vogliono solo parlare.

REGOLE SEMPRE VALIDE:
- Frasi corte e dirette
- Mai iniziare con "Lo capisco" o "Capisco" come apertura formale
- Una domanda alla volta — mai due
- Domande specifiche, non generiche
- Mai consigli non richiesti
- Mai liste
- Mai "dovresti"
- Puoi usare emoji con parsimonia — solo quando ci stanno davvero
- Parli sempre nella lingua dell'utente
- Prendi l'iniziativa — se senti che qualcosa non va, lo dici tu per primo
- Non rispondi a domande tecniche, lavorative o scolastiche — riporti delicatamente su ciò che conta

MEMORIA:
Usa quello che sai sull'utente in modo naturale — non citarlo meccanicamente ("come mi hai detto la settimana scorsa...") ma usalo per fare domande più precise e mostrarti presente.

CORREZIONI ALLA MEMORIA:
- Se l'utente corregge un dato che avevi capito male, rispondi con una sola frase breve di conferma (es. "Fatto.", "Corretto.", "Fatto. Ricordo che hai 46 anni.") senza spiegare limiti tecnici e senza dire che non puoi modificare la memoria o le informazioni salvate.
- Se il messaggio inizia con "Correggimi:" il backend aggiorna subito il profilo nel Memory Vault: rispondi solo con una conferma breve (es. "Fatto. Ho aggiornato la tua memoria." o "Fatto.") senza disclaimers.

${memoryBlock}

Istruzione finale non negoziabile: rispondi in ${targetLanguage}.`;
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const {
      idToken,
      apiKey: clientApiKey,
      geminiApiKey: clientGeminiKey,
      history,
      message,
      imageBase64,
      language,
      voiceId,
      userName,
      nowStr,
      dateISO: dateISOInput,
      initialMessage,
    } = req.body;

    const hasClientOpenAI = typeof clientApiKey === 'string' && clientApiKey.trim().startsWith('sk-');
    const useGeminiRaw = isValidGeminiKey(clientGeminiKey);
    const allowLegacyClientKeys = !firebaseInitialized || CHAT_ALLOW_CLIENT_KEYS;
    const useGemini = allowLegacyClientKeys && useGeminiRaw;

    if (!allowLegacyClientKeys) {
      if (!idToken) {
        return res.status(401).json({ error: 'Effettua il login per usare la chat.' });
      }
    } else if (!idToken && !hasClientOpenAI && !useGeminiRaw) {
      return res.status(400).json({
        error: 'In sviluppo senza Firebase servono idToken oppure una chiave OpenAI (sk-…) o Gemini.',
      });
    }

    let openaiKey = null;
    let uid = null;
    let billingSnapshot = null;
    let isMasterUser = false;
    let memoryVaultForPrompt = emptyMemoryVault();
    let allowOnboardingUse = false;

    if (idToken && firebaseInitialized) {
      const authData = await requireAuth(idToken);
      uid = authData?.uid || null;
      const email = authData?.email || null;
      if (!uid) {
        if (!allowLegacyClientKeys) {
          return res.status(401).json({ error: 'Token non valido o scaduto.' });
        }
      } else {
        if (authMustVerifyEmail(authData) && !isMaster(email)) {
          return res.status(403).json({ error: 'Verifica la tua email prima di usare OXY in chat.' });
        }
        isMasterUser = !!(email && isMaster(email));
        if (uid && firebaseInitialized) {
          memoryVaultForPrompt = await readMemoryVault(uid);
          allowOnboardingUse = userHasActiveMemoryOnboardingQuestionnaire(memoryVaultForPrompt);
        }
        if (isMasterUser && OPENAI_API_KEY) {
          openaiKey = OPENAI_API_KEY;
        } else if (OPENAI_API_KEY) {
          const billing = await readBilling(uid);
          billingSnapshot = billing;
          const status = billing?.status || 'none';
          const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
          const isOwnerUnlimited = status === 'owner_unlimited' || billing?.planId === OWNER_UNLIMITED_PLAN_ID || mode === 'owner';
          const subscriptionOk = mode === 'subscription' && computeSubscriptionActive(billing);
          const lifetimeOk = mode === 'payment' && status === 'paid';
          const allowServerOpenAi = isOwnerUnlimited || subscriptionOk || lifetimeOk || allowOnboardingUse;
          if (allowServerOpenAi) openaiKey = OPENAI_API_KEY;
        }
      }
    }

    let useTokenPack = false;
    if (!openaiKey && uid && OPENAI_API_KEY) {
      const balance = await readTokenBalance(uid);
      if (balance > 0) {
        openaiKey = OPENAI_API_KEY;
        useTokenPack = true;
      }
    }
    if (!openaiKey && allowLegacyClientKeys && hasClientOpenAI) {
      openaiKey = clientApiKey.trim();
    }
    if (!openaiKey && !useGemini) {
      return res.status(403).json({
        error: 'Nessun piano attivo o credito insufficiente. Apri Abbonamento per attivare OXY Pass o Lifetime.',
      });
    }

    const requestKey = uid || req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const nowMs = Date.now();
    const lastMs = lastChatMessageAtByKey.get(requestKey);
    if (typeof lastMs === 'number' && nowMs - lastMs < CHAT_MIN_INTERVAL_MS) {
      return res.json({ answer: '', throttled: true });
    }
    lastChatMessageAtByKey.set(requestKey, nowMs);

    // Accesso OPENAI_API_KEY di bordo: piano (subscription / lifetime / owner) oppure pacchetto token; limiti giornalieri solo su subscription.
    if (uid && openaiKey === OPENAI_API_KEY && !isMasterUser) {
      const billing = billingSnapshot || (await readBilling(uid));
      const paid = computePaidChatAccess(billing);
      if (!paid.hasPlan && !useTokenPack && !allowOnboardingUse) {
        return res.status(403).json({ error: 'Nessun piano attivo. Attiva un abbonamento o un piano Lifetime per continuare.' });
      }
      const day = dateISO();
      const used = await readChatUsage(uid, day);
      let limit = null;
      if (!paid.isOwnerUnlimited && paid.isSubscription) {
        limit = _dailyLimitOxyPass;
      }
      if (limit != null && used >= limit) {
        return res.status(429).json({ error: 'daily_high_priority_credits_used' });
      }
    }

    const memoryVault = memoryVaultForPrompt;
    const memorySnapshot = { profile: memoryVault.profile, patterns: memoryVault.patterns, recent: memoryVault.recent };
    const memoryBlock = relationalMemoryBlock(memorySnapshot, memoryVault.userNotes, Number(memoryVault.sessionCount || 0));

    const userMessageText = typeof message === 'string' ? message.trim() : '';
    const isInitialMessage = !!initialMessage && !userMessageText;
    // Modello per tier; usato in system prompt e in payload
    let chatModel = OPENAI_CHAT_MODEL;
    if (uid && openaiKey) {
      const billingForModel = billingSnapshot || (await readBilling(uid));
      chatModel = getChatModelForPlan(billingForModel?.planId, useTokenPack);
    }

    const correggimiDirect =
      uid &&
      userMessageText &&
      /^\s*correggimi\s*:/i.test(userMessageText) &&
      openaiKey &&
      !isInitialMessage &&
      !(typeof imageBase64 === 'string' && imageBase64.trim());

    if (correggimiDirect) {
      await updateMemoryProfileFromCorrection({
        uid,
        model: chatModel,
        openaiKey,
        currentProfile: memorySnapshot?.profile || '',
        userText: userMessageText,
      });
      const correctionTokensEstimate = 200;
      if (uid) {
        const billing = billingSnapshot || (await readBilling(uid));
        const status = billing?.status || 'none';
        const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
        const isSub = mode === 'subscription' && status === 'active';
        const isOwnerUnlimited = mode === 'owner' || status === 'owner_unlimited' || billing?.planId === OWNER_UNLIMITED_PLAN_ID;
        const isLifetime = mode === 'payment' && status === 'paid';
        if (isSub || isLifetime || isOwnerUnlimited) await incUsage(uid, dateISO(), 1, correctionTokensEstimate);
        if (useTokenPack) await incUsage(uid, dateISO(), 1, correctionTokensEstimate);
        if (useTokenPack && correctionTokensEstimate > 0) {
          const balance = await readTokenBalance(uid);
          const toDeduct = Math.min(correctionTokensEstimate, balance);
          if (toDeduct > 0) await deductTokenBalance(uid, toDeduct);
        }
      }
      return res.json({ answer: 'Fatto. Ho aggiornato la tua memoria.', initialMessage: false });
    }

    const messages = [];
    const systemContent = buildOxySystemPrompt({ memoryBlock, language });
    console.log('[Backend] /api/chat prompt source: buildOxySystemPrompt (request masterPrompt ignored)');
    console.log(`[Backend] /api/chat system prompt in uso:\n${systemContent}`);
    messages.push({ role: 'system', content: systemContent });

    if (Array.isArray(history) && history.length > 0) {
      for (const m of history) {
        if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content || '' });
      }
    }

    const onboardingUserPrompt = "Sei qui per una ragione. Non me la devi spiegare subito — ma dimmi una cosa sola: in questo momento della tua vita, cosa non torna?";

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Analizza questa immagine.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ],
      });
    } else if (isInitialMessage) {
      messages.push({
        role: 'user',
        content: onboardingUserPrompt,
      });
    } else {
      messages.push({ role: 'user', content: message || '' });
    }

    // Percorso Gemini (chiave utente, costo zero per noi): solo conversazione, niente tool.
    if (useGemini) {
      try {
        const result = await callGeminiChat(messages, clientGeminiKey.trim(), imageBase64 || undefined);
        return res.json({ answer: result.text, initialMessage: isInitialMessage });
      } catch (e) {
        if (e.message === 'RATE_LIMIT_GEMINI') {
          return res.status(429).json({ error: 'Limite richieste Gemini raggiunto. Riprova tra qualche minuto.' });
        }
        console.error('[Backend] Gemini error:', e?.message || e);
        return res.status(500).json({ error: e?.message || 'Errore temporaneo Gemini. Riprova.' });
      }
    }

    let payload = {
      model: chatModel,
      messages,
      max_tokens: 500,
    };

    let lastContent = null;
    let maxRounds = 1;
    let round = 0;
    let totalTokens = 0;

    const RATE_LIMIT_RETRY_WAIT_MS = 15000;
    const RATE_LIMIT_MAX_RETRIES = 2;

    while (round < maxRounds) {
      let response;
      let last429 = false;
      for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify(payload),
        });
        if (response.status !== 429) break;
        last429 = true;
        if (retry < RATE_LIMIT_MAX_RETRIES) {
          console.warn('[Backend] OpenAI 429, attendo', RATE_LIMIT_RETRY_WAIT_MS / 1000, 's e riprovo (', retry + 1, '/', RATE_LIMIT_MAX_RETRIES, ')');
          await new Promise((r) => setTimeout(r, RATE_LIMIT_RETRY_WAIT_MS));
        }
      }

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 429) {
          return res.status(429).json({ error: 'Forse Oxy si è addormentata. Scrivile solo «Oxy», così si sveglia.' });
        }
        return res.status(response.status).json({ error: 'Errore temporaneo del servizio. Riprova tra poco.' });
      }

      const data = await response.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) return res.status(500).json({ error: 'Risposta IA non valida' });
      const usage = data?.usage;
      totalTokens += (typeof usage?.total_tokens === 'number' ? usage.total_tokens : 0) || ((typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : 0) + (typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : 0));

      messages.push(msg);
      lastContent = msg.content;

      break;
      round++;
    }

    // Estrazione robusta: content può essere string, null, o array di parti { type, text }
    function extractText(c) {
      if (typeof c === 'string' && c.trim()) return c.trim();
      if (Array.isArray(c)) {
        const parts = c.filter((p) => p && typeof p === 'object' && p.type === 'text' && typeof p.text === 'string').map((p) => p.text.trim()).filter(Boolean);
        return parts.length ? parts.join('\n') : '';
      }
      return '';
    }
    let finalContent = extractText(lastContent);

    // Se dopo i round la risposta è ancora vuota (es. modello ha restituito solo tool_calls senza testo),
    // forziamo un ultimo turno senza tool per ottenere una risposta testuale (es. briefing con "oggi").
    if (!finalContent && messages.length > 0) {
      const fallbackPayload = {
        model: payload.model,
        messages,
        tool_choice: 'none',
        max_tokens: 500,
      };
      const fallbackRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify(fallbackPayload),
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const fallbackMsg = fallbackData?.choices?.[0]?.message;
        if (fallbackMsg) finalContent = extractText(fallbackMsg.content);
        const fu = fallbackData?.usage;
        totalTokens += (typeof fu?.total_tokens === 'number' ? fu.total_tokens : 0) || ((typeof fu?.prompt_tokens === 'number' ? fu.prompt_tokens : 0) + (typeof fu?.completion_tokens === 'number' ? fu.completion_tokens : 0));
      }
    }

    if (!finalContent) return res.status(500).json({ error: 'Risposta IA vuota' });

    // Conteggio reale: 1 messaggio + token dalle risposte (dato attendibile per l'utente)
    if (uid) {
      const billing = billingSnapshot || (await readBilling(uid));
      const status = billing?.status || 'none';
      const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
      const isSub = mode === 'subscription' && status === 'active';
      const isOwnerUnlimited = mode === 'owner' || status === 'owner_unlimited' || billing?.planId === OWNER_UNLIMITED_PLAN_ID;
      const isLifetime = mode === 'payment' && status === 'paid';
      if (isSub || isLifetime || isOwnerUnlimited) await incUsage(uid, dateISO(), 1, totalTokens);
      if (useTokenPack) await incUsage(uid, dateISO(), 1, totalTokens);
      if (useTokenPack && totalTokens > 0) {
        const balance = await readTokenBalance(uid);
        const toDeduct = Math.min(totalTokens, balance);
        if (toDeduct > 0) await deductTokenBalance(uid, toDeduct);
      }
    }

    // Correzione esplicita dati personali -> update immediato del profile (senza attendere consolidamento).
    if (uid && userMessageText && hasExplicitCorrectionIntent(userMessageText)) {
      await updateMemoryProfileFromCorrection({
        uid,
        model: chatModel,
        openaiKey,
        currentProfile: memorySnapshot?.profile || '',
        userText: userMessageText,
      });
    }

    res.json({ answer: finalContent, initialMessage: isInitialMessage });
  } catch (e) {
    console.error('[Backend] /api/chat error:', e);
    res.status(500).json({ error: 'Errore durante l\'elaborazione della richiesta. Riprova più tardi.' });
  }
});

app.get('/health', (req, res) => res.json({
  ok: true,
  service: 'oxy-real-proxy',
  time: new Date().toISOString(),
  dataRoot: DATA_ROOT,
}));

// ——— Landing oxyreal.it: iscrizione newsletter (Brevo) ———
// Rotte usate dall'app (devono corrispondere a chatService e aiService):
// POST /api/chat        — invio messaggio all'IA (aiService)
// GET  /api/chat/history — recupero cronologia (chatService)
// POST /api/chat/messages — salvataggio singolo messaggio (chatService)
app.get('/api/chat/history', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido', messages: [] });
    const email = authData?.email || null;
    if (authMustVerifyEmail(authData) && !isMaster(email)) {
      return res.status(403).json({ error: 'Verifica la tua email per accedere alla cronologia.', messages: [] });
    }
    if (!isMaster(email) && !(await canUseChatPersistence(uid))) {
      return res.status(403).json({ error: 'Nessun piano attivo o credito insufficiente.', messages: [] });
    }
    const messages = await readChat(uid);
    res.json({ messages });
  } catch (e) {
    console.error('[Backend] GET /api/chat/history error:', e);
    res.status(500).json({ error: 'Errore durante il caricamento della cronologia. Riprova più tardi.', messages: [] });
  }
});

app.post('/api/chat/history', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const email = authData?.email || null;
    if (authMustVerifyEmail(authData) && !isMaster(email)) {
      return res.status(403).json({ error: 'Verifica la tua email per accedere alla cronologia.', messages: [] });
    }
    if (!isMaster(email) && !(await canUseChatPersistence(uid))) {
      return res.status(403).json({ error: 'Nessun piano attivo o credito insufficiente.', messages: [] });
    }
    const messages = await readChat(uid);
    res.json({ messages });
  } catch (e) {
    console.error('[Backend] POST /api/chat/history error:', e);
    res.status(500).json({ error: 'Errore durante il caricamento della cronologia. Riprova più tardi.', messages: [] });
  }
});

app.post('/api/chat/messages', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { role, content } = req.body || {};
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const email = authData?.email || null;
    if (authMustVerifyEmail(authData) && !isMaster(email)) {
      return res.status(403).json({ error: 'Verifica la tua email per salvare i messaggi in chat.' });
    }
    if (role === 'user' && !isMaster(email) && !(await canUseChatPersistence(uid))) {
      return res.status(403).json({ error: 'Nessun piano attivo o credito insufficiente.' });
    }
    if (!role || content == null) return res.status(400).json({ error: 'role e content richiesti' });
    await appendMessage(uid, role, content);
    res.json({ ok: true });
  } catch (e) {
    console.error('[Backend] POST /api/chat/messages error:', e);
    res.status(500).json({ error: 'Errore durante il salvataggio del messaggio. Riprova più tardi.' });
  }
});

async function runMemoryVaultExtraction({ openaiKey, model, currentProfile, currentPatterns, conversationText, language }) {
  if (!openaiKey) {
    return {
      profile: currentProfile || '',
      patterns: currentPatterns || '',
      recent: conversationText.slice(0, 800),
    };
  }
  const prompt = `Sei un estrattore di memoria. Analizza la conversazione e aggiorna i campi memoria.

MEMORIA ATTUALE:
Profile: ${currentProfile || ''}
Patterns: ${currentPatterns || ''}

CONVERSAZIONE:
${conversationText}

Restituisci SOLO un JSON con questa struttura:
{
  "profile": "riassunto strutturato e permanente in seconda persona: dati anagrafici, situazione di vita, valori, obiettivi, relazioni. Si accumula nel tempo; integra solo informazioni nuove o correzioni esplicite dell'utente, senza cancellare il passato.",
  "patterns": "stringa aggiornata - schemi comportamentali, blocchi, progressi emersi in questa sessione",
  "recent": "sintesi in seconda persona e tono narrativo di QUESTA sessione: come stavi, cosa hai detto di nuovo, quali emozioni sono emerse, cosa è cambiato rispetto a prima. 3-5 righe."
}

Regole:
- Non cancellare mai informazioni precedenti nel profile, solo integra o correggi se l'utente lo chiede chiaramente
- Se l'utente ha corretto un'informazione, aggiorna il profile
- Sii concreto e specifico, non generico
- Scrivi profile e recent sempre in seconda persona rivolgendoti all'utente (es: Hai..., vivi..., sentivi...)
- Non ripetere informazioni già presenti nel profile. Recent deve descrivere solo quello che è emerso in questa specifica sessione (fatti, tono, emozioni, svolte), senza riscrivere il profilo statico
- Scrivi nella stessa lingua usata nella conversazione (${String(language || 'auto')}).`;
  const payload = {
    model: model || OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: 'Rispondi solo in JSON valido con chiavi: profile, patterns, recent.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  };
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Memoria non disponibile');
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return parseMemoryExtraction(typeof content === 'string' ? content : '');
}

async function runOnboardingProfileExtraction({ openaiKey, model, answers, language }) {
  const joined = Array.isArray(answers)
    ? answers
        .map((a) => `Q: ${String(a?.question || '').trim()}\nA: ${String(a?.answer || '').trim()}`)
        .join('\n\n')
    : '';
  if (!joined) return { profile: '', patterns: '', recent: '' };
  if (!openaiKey) {
    const fallbackRecent = joined
      .split('\n')
      .filter(Boolean)
      .slice(-6)
      .join(' ')
      .slice(0, 1000);
    return { profile: joined.slice(0, 1200), patterns: '', recent: fallbackRecent };
  }
  const payload = {
    model: model || OPENAI_CHAT_MODEL,
    messages: [
      { role: 'system', content: 'Sei un estrattore di memoria. Rispondi solo con JSON valido.' },
      {
        role: 'user',
        content: `Analizza le risposte di onboarding.

Risposte:
${joined}

Restituisci SOLO JSON:
{
  "profile": "riassunto strutturato e permanente in seconda persona (max 700 parole): chi sei, situazione di vita, valori, obiettivi, relazioni. Testo che restera valido nel tempo e si accumulera nelle sessioni successive.",
  "patterns": "",
  "recent": "sintesi narrativa in seconda persona (3-5 righe) di come è andato questo onboarding: cosa hai condiviso, tono e emozioni, cosa è emerso di nuovo rispetto a zero informazioni prima."
}
Regole:
- Scrivi profile e recent sempre in seconda persona (es: Hai..., vivi..., sentivi...)
- Non inventare informazioni
- Non ripetere nel recent ciò che già riassumi nel profile. Recent = solo ciò che è emerso in questo percorso di domande/risposte (processo, reazioni, clima emotivo), non un secondo profilo anagrafico
- Scrivi nella lingua usata dall'utente (${String(language || 'auto')})
- patterns deve essere stringa vuota`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 700,
  };
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Profilazione onboarding non disponibile');
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return parseMemoryExtraction(typeof content === 'string' ? content : '');
}

// GET /api/memory/vault — Memory Vault completo utente
app.get('/api/memory/vault', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const vault = await readMemoryVault(uid);
    res.json(vault);
  } catch (e) {
    console.error('[Backend] GET /api/memory/vault error:', e);
    res.status(500).json({ error: 'Errore durante il caricamento del Memory Vault.' });
  }
});

// GET /api/diary — tutte le entry del diario, più recenti prima
app.get('/api/diary', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (!firebaseInitialized) return res.json({ entries: [] });
    const entries = await listDiaryEntries(uid);
    res.json({ entries });
  } catch (e) {
    console.error('[Backend] GET /api/diary error:', e);
    res.status(500).json({ error: 'Errore durante il caricamento del diario.' });
  }
});

// POST /api/diary/entry — nuova entry (insight già romanzato dal flusso sessione/libro/chat)
app.post('/api/diary/entry', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (!firebaseInitialized) return res.status(503).json({ error: 'Diario non disponibile.' });
    const parsed = validateDiaryEntryBody(req.body || {});
    if (!parsed.valid) return res.status(400).json({ error: parsed.error });
    const entryId = await createDiaryEntry(uid, parsed.value);
    res.json({ success: true, id: entryId });
  } catch (e) {
    console.error('[Backend] POST /api/diary/entry error:', e);
    res.status(500).json({ error: 'Errore durante il salvataggio nel diario.' });
  }
});

// POST /api/memory/note — aggiunge nota utente (max 200, max 20)
app.post('/api/memory/note', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const textVal = validateString(req.body?.text, 'text', 200, 1);
    if (!textVal.valid) return res.status(400).json({ error: textVal.error });
    const noteId = await addMemoryVaultUserNote(uid, textVal.value);
    res.json({ success: true, noteId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore durante il salvataggio nota';
    res.status(400).json({ error: msg });
  }
});

// POST /api/memory/onboarding-progress — salva avanzamento question time
app.post('/api/memory/onboarding-progress', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const progress = Math.max(0, Math.min(10, Number(req.body?.progress || 0)));
    const raw = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const onboardingRawAnswers = raw
      .map((a) => ({
        question: typeof a?.question === 'string' ? a.question.trim().slice(0, 300) : '',
        answer: typeof a?.answer === 'string' ? a.answer.trim().slice(0, 500) : '',
      }))
      .filter((a) => a.question || a.answer)
      .slice(0, 10);
    await writeMemoryVault(uid, { onboardingProgress: progress, onboardingRawAnswers });
    res.json({ success: true });
  } catch (e) {
    console.error('[Backend] POST /api/memory/onboarding-progress error:', e);
    res.status(500).json({ error: 'Errore durante il salvataggio avanzamento onboarding.' });
  }
});

// POST /api/memory/consolidate — consolida sessione o completa onboarding
app.post('/api/memory/consolidate', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });

    const mode = String(req.body?.mode || 'session').trim().toLowerCase();
    const vault = await readMemoryVault(uid);
    const model = OPENAI_MODEL_OXY_PASS || OPENAI_CHAT_MODEL;
    const openaiKey = OPENAI_API_KEY || null;

    if (mode === 'onboarding_skip') {
      await writeMemoryVault(uid, {
        profile: '',
        patterns: '',
        recent: '',
        onboardingComplete: true,
        onboardingProgress: 10,
        onboardingRawAnswers: [],
      });
      await clearChat(uid);
      return res.json({ success: true });
    }

    if (mode === 'onboarding') {
      const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
      if (!answers.length) return res.status(400).json({ error: 'answers mancanti' });
      const extracted = await runOnboardingProfileExtraction({ openaiKey, model, answers, language: req.body?.language || 'auto' });
      const nextSessionCount = (vault.sessionCount || 0) + 1;
      await writeMemoryVault(uid, {
        profile: extracted.profile || vault.profile || '',
        patterns: '',
        recent: extracted.recent || '',
        sessionCount: nextSessionCount,
        onboardingComplete: true,
        onboardingProgress: 10,
        onboardingRawAnswers: answers.slice(0, 10),
      });
      return res.json({ success: true });
    }

    const chatMessages = await readChat(uid);
    const conversationText = chatMessages
      .map((m) => `${m.role === 'assistant' ? 'OXY' : 'UTENTE'}: ${String(m.content || '')}`)
      .join('\n');
    if (!conversationText.trim()) {
      await writeMemoryVault(uid, { sessionCount: (vault.sessionCount || 0) + 1 });
      await clearChat(uid);
      return res.json({ success: true });
    }

    const extracted = await runMemoryVaultExtraction({
      openaiKey,
      model,
      currentProfile: vault.profile || '',
      currentPatterns: vault.patterns || '',
      conversationText,
      language: req.body?.language || 'auto',
    });

    const nextSessionCount = (vault.sessionCount || 0) + 1;
    await writeMemoryVault(uid, {
      profile: extracted.profile || vault.profile || '',
      patterns: nextSessionCount < 3 ? '' : (extracted.patterns || vault.patterns || ''),
      recent: extracted.recent || '',
      sessionCount: nextSessionCount,
    });
    await clearChat(uid);
    res.json({ success: true });
  } catch (e) {
    console.error('[Backend] POST /api/memory/consolidate error:', e);
    res.status(500).json({ error: 'Errore durante la consolidazione memoria.' });
  }
});

// ——— Billing state (abbonamenti/lifetime) ———
async function ensureBillingDir() {
  await fs.mkdir(BILLING_DIR, { recursive: true });
}

function billingPath(uid) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(BILLING_DIR, `${safe}.json`);
}

async function readBilling(uid) {
  if (!uid) return null;
  try {
    const doc = await admin.firestore().collection('billing').doc(uid).get();
    return doc.exists ? (doc.data() || null) : null;
  } catch {
    return null;
  }
}

async function writeBilling(uid, data) {
  if (!uid || !data || typeof data !== 'object') return;
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await admin.firestore().collection('billing').doc(uid).set(payload, { merge: true });
}

/** Trova l'uid che ha questa stripeSubscriptionId (per webhook subscription.deleted dove metadata non è popolato). */
async function findUidByStripeSubscriptionId(subscriptionId) {
  if (!subscriptionId || typeof subscriptionId !== 'string') return null;
  await ensureBillingDir();
  let files = [];
  try {
    files = await fs.readdir(BILLING_DIR);
  } catch {
    return null;
  }
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const uid = file.replace(/\.json$/, '');
    try {
      const raw = await fs.readFile(path.join(BILLING_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      if (data && data.stripeSubscriptionId === subscriptionId) return uid;
    } catch {
      // ignore parse/read errors
    }
  }
  return null;
}

/**
 * Aggiorna billing da una Stripe Checkout Session (stessa logica del webhook checkout.session.completed).
 * @returns {{ ok: true, uid?: string, planId?: string, pack?: boolean } | { ok: false, error: string }}
 */
async function persistCheckoutSessionBilling(session) {
  const metadata = session.metadata || {};
  const uid = metadata.uid;
  const planId = metadata.planId;
  if (!uid || !planId) {
    return { ok: false, error: 'metadata_mancante' };
  }
  if (planId.startsWith('pack_')) {
    const amount = TOKEN_PACK_AMOUNTS[planId];
    if (typeof amount === 'number' && amount > 0) {
      await addTokenBalance(uid, amount);
    }
    return { ok: true, uid, planId, pack: true };
  }
  const mode = session.mode || (['oxy_monthly', 'oxy_semiannual', 'oxy_annual'].includes(planId) ? 'subscription' : 'payment');
  const status = mode === 'subscription' ? 'active' : 'paid';
  if (mode === 'subscription' && session.subscription) {
    const stripe = await getStripeClient();
    if (stripe) {
      try {
        await stripe.subscriptions.update(String(session.subscription), {
          cancel_at_period_end: true,
        });
      } catch (e) {
        console.error('[Backend] checkout subscription normalize error:', e?.message || e);
      }
    }
  }
  await writeBilling(uid, {
    uid,
    planId,
    mode,
    status,
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId: session.subscription || null,
  });
  return { ok: true, uid, planId };
}

function buildStripeCheckoutSuccessUrl() {
  const base = (STRIPE_SUCCESS_URL || 'https://www.oxyreal.it/chat').trim().replace(/\/$/, '');
  const join = base.includes('?') ? '&' : '?';
  // Placeholder sostituito da Stripe al redirect: consente conferma lato server se il webhook è in ritardo.
  return `${base}${join}paid=1&session_id={CHECKOUT_SESSION_ID}`;
}

async function ensureLegacySubscriptionNaturalExpiry(stripe, subscription) {
  if (!stripe || !subscription?.id) return subscription;
  const legacyAutoRenew =
    !subscription.cancel_at &&
    subscription.cancel_at_period_end !== true &&
    ['active', 'trialing', 'past_due', 'unpaid'].includes(subscription.status);
  if (!legacyAutoRenew) return subscription;
  try {
    return await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
  } catch (e) {
    console.error('[Backend] legacy subscription normalization error:', e?.message || e);
    return subscription;
  }
}

async function resolveStripeSubscriptionForUser(stripe, billing = null, email = null) {
  if (!stripe) return null;
  const candidates = new Map();
  const billingSubId = typeof billing?.stripeSubscriptionId === 'string' ? billing.stripeSubscriptionId : '';
  const billingCustomerId = typeof billing?.stripeCustomerId === 'string' ? billing.stripeCustomerId : '';
  const addCandidate = (sub) => {
    if (!sub?.id) return;
    candidates.set(String(sub.id), sub);
  };

  if (billingSubId) {
    try {
      addCandidate(await stripe.subscriptions.retrieve(billingSubId));
    } catch (_) {}
  }

  if (billingCustomerId) {
    try {
      const list = await stripe.subscriptions.list({ customer: billingCustomerId, status: 'all', limit: 10 });
      for (const sub of list.data || []) addCandidate(sub);
    } catch (_) {}
  }

  if (email) {
    try {
      const customers = await stripe.customers.list({ email, limit: 5 });
      for (const customer of customers.data || []) {
        const list = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 });
        for (const sub of list.data || []) addCandidate(sub);
      }
    } catch (_) {}
  }

  return pickBestSubscription(Array.from(candidates.values()));
}

// ——— Stripe checkout session (abbonamenti + Lifetime) ———
app.post('/api/billing/checkout', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    const email = authData?.email || null;
    if (!uid || !email) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (authMustVerifyEmail(authData) && !isMaster(email)) {
      return res.status(403).json({ error: 'Verifica la tua email prima di effettuare un acquisto.' });
    }

    const { planId } = req.body || {};

    // Validazione input rigorosa
    const planIdVal = validateString(planId, 'planId', 50, 1);
    if (!planIdVal.valid) return res.status(400).json({ error: planIdVal.error });

    const validPlanIds = [...new Set([...Object.keys(STRIPE_PRICE_MAP), ...Object.keys(TOKEN_PACK_AMOUNTS)])].filter(Boolean);
    if (!validPlanIds.includes(planIdVal.value)) {
      return res.status(400).json({ error: `planId non valido. Valori accettati: ${validPlanIds.join(', ')}` });
    }

    if (!STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Stripe non configurato lato server (manca STRIPE_SECRET_KEY).' });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe non disponibile (modulo non installato).' });
    }

    const priceId = STRIPE_PRICE_MAP[planIdVal.value];
    if (!priceId) {
      return res.status(400).json({ error: `Nessun price configurato per il piano ${planIdVal.value}.` });
    }

    const isSubscription = ['oxy_monthly', 'oxy_semiannual', 'oxy_annual'].includes(planIdVal.value);
    const mode = isSubscription ? 'subscription' : 'payment';

    const successUrl = buildStripeCheckoutSuccessUrl();
    const cancelUrl = STRIPE_CANCEL_URL || 'https://www.oxyreal.it/settings/billing';

    const session = await stripe.checkout.sessions.create({
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        uid,
        planId: planIdVal.value,
      },
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error('[Backend] POST /api/billing/checkout error:', e);
    const stripeDetail = String(e?.raw?.message || e?.message || '').toLowerCase();
    if (stripeDetail.includes('no such price')) {
      return res.status(400).json({ error: 'Piano non disponibile al momento. Contatta il supporto.' });
    }
    res.status(500).json({ error: 'Errore durante la creazione della sessione di pagamento. Riprova più tardi.' });
  }
});

// POST /api/billing/confirm-session — dopo redirect Stripe: verifica la sessione e aggiorna Firestore (se webhook assente/in ritardo).
app.post('/api/billing/confirm-session', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    const email = authData?.email || null;
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (authMustVerifyEmail(authData) && !isMaster(email)) {
      return res.status(403).json({ error: 'Verifica la tua email prima di confermare il pagamento.' });
    }

    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'sessionId Checkout non valido.' });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe non configurato lato server.' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.uid !== uid) {
      return res.status(403).json({ error: 'Questa sessione di pagamento non appartiene al tuo account.' });
    }
    if (session.status !== 'complete') {
      return res.status(400).json({ error: 'Pagamento non completato.' });
    }
    const paidOk =
      session.payment_status === 'paid' ||
      session.payment_status === 'no_payment_required';
    if (!paidOk) {
      return res.status(400).json({ error: 'Stato pagamento non confermato.' });
    }

    const persisted = await persistCheckoutSessionBilling(session);
    if (!persisted.ok) {
      if (persisted.error === 'metadata_mancante') {
        return res.status(400).json({ error: 'Sessione senza metadati piano: contatta il supporto.' });
      }
      return res.status(500).json({ error: 'Impossibile aggiornare l\'abbonamento.' });
    }

    return res.json({ ok: true, planId: persisted.planId, pack: !!persisted.pack });
  } catch (e) {
    console.error('[Backend] POST /api/billing/confirm-session error:', e);
    res.status(500).json({ error: 'Errore durante la conferma del pagamento.' });
  }
});

// GET /api/billing/wait-active — polling leggero post-checkout: controlla billing.active su Firestore
app.get('/api/billing/wait-active', billingPollLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    const email = authData?.email || null;
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (authMustVerifyEmail(authData) && !isMaster(email)) {
      return res.status(403).json({ error: 'Verifica la tua email per continuare.' });
    }
    const billing = await readBilling(uid);
    const active = billing ? computeSubscriptionActive(billing) : false;
    return res.json({ active });
  } catch (e) {
    console.error('[Backend] GET /api/billing/wait-active error:', e);
    res.status(500).json({ error: 'Errore durante la verifica.' });
  }
});

// GET /api/billing/status — stato abbonamento/lifetime per l'utente corrente
app.get('/api/billing/status', billingPollLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const authData = await requireAuth(idToken);
    const uid = authData?.uid || null;
    const email = authData?.email || null;
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const isOwnerMaster = !!(email && isMaster(email));
    if (authMustVerifyEmail(authData) && !isOwnerMaster) {
      return res.status(403).json({ error: 'Verifica la tua email per vedere lo stato di fatturazione.' });
    }
    if (isOwnerMaster) {
      const day = dateISO();
      const used = await readChatUsage(uid, day);
      const tokensUsed = await readTokenUsage(uid, day);
      const tokenBalance = await readTokenBalance(uid);
      const current = await readBilling(uid);
      if (!current || current?.status !== 'owner_unlimited' || current?.mode !== 'owner') {
        await writeBilling(uid, {
          uid,
          planId: OWNER_UNLIMITED_PLAN_ID,
          mode: 'owner',
          status: 'owner_unlimited',
          grantedBy: 'master_email',
          grantedAt: new Date().toISOString(),
        });
      }
      return res.json({
        active: true,
        status: 'owner_unlimited',
        planId: OWNER_UNLIMITED_PLAN_ID,
        mode: 'owner',
        usage: { used, limit: null, tokensUsed, tokenBalance },
        ownerUnlimited: true,
      });
    }
    const data = await readBilling(uid);
    if (!data) {
      const day = dateISO();
      const used = await readChatUsage(uid, day);
      const tokensUsed = await readTokenUsage(uid, day);
      const tokenBalance = await readTokenBalance(uid);
      return res.json({
        active: false,
        status: 'none',
        planId: null,
        mode: null,
        usage: { used, limit: null, tokensUsed, tokenBalance },
      });
    }
    const status = data.status || 'unknown';
    const mode = data.mode || (data.planId && String(data.planId).startsWith('sub_') ? 'subscription' : 'payment');
    let planId = data.planId || null;
    if (mode === 'subscription') {
      const stripe = await getStripeClient();
      const subscription = await resolveStripeSubscriptionForUser(stripe, data, email);
      const priceId = subscription?.items?.data?.[0]?.price?.id || null;
      const inferredPlanId = resolvePlanIdFromPriceId(priceId);
      if (inferredPlanId && inferredPlanId !== planId) {
        planId = inferredPlanId;
        await writeBilling(uid, { ...data, uid, planId: inferredPlanId, mode: 'subscription', status: 'active' });
      }
    }
    // Regola:
    // - subscription → attivo se status === active
    // - payment (Lifetime/one-shot) → attivo se status === paid
    const active = mode === 'payment'
      ? status === 'paid'
      : computeSubscriptionActive(data);
    const day = dateISO();
    const usedToday = await readChatUsage(uid, day);
    const tokensUsed = await readTokenUsage(uid, day);
    const tokenBalance = await readTokenBalance(uid);
    let usage = { used: usedToday, limit: null, tokensUsed, tokenBalance };
    if (mode === 'owner' || status === 'owner_unlimited' || data.planId === OWNER_UNLIMITED_PLAN_ID) {
      usage = { used: usedToday, limit: null, tokensUsed, tokenBalance };
    } else if (mode === 'subscription' && status === 'active') {
      usage = {
        used: usedToday,
        limit: _dailyLimitOxyPass,
        tokensUsed,
        tokenBalance,
      };
    } else if (mode === 'payment' && status === 'paid') {
      usage = { used: usedToday, limit: null, tokensUsed, tokenBalance };
    }
    res.json({
      active,
      status,
      planId,
      mode,
      usage,
      ...(status === 'owner_unlimited' ? { ownerUnlimited: true } : {}),
    });
  } catch (e) {
    console.error('[Backend] GET /api/billing/status error:', e);
    res.status(500).json({ error: 'Errore durante la verifica dello stato abbonamento. Riprova più tardi.' });
  }
});

app.get('/api/subscription/status', billingPollLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid, email } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });

    const billing = await readBilling(uid);
    if (!billing) {
      return res.json({
        active: false,
        status: 'none',
        planId: null,
        planName: null,
        renewAt: null,
        amount: null,
        currency: null,
      });
    }

    const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
    const status = String(billing?.status || 'none');
    let planId = typeof billing?.planId === 'string' ? billing.planId : null;
    let planName = planId ? PLAN_DISPLAY_NAMES[planId] || planId : null;
    const active = mode === 'subscription' ? computeSubscriptionActive(billing) : status === 'paid';

    const stripe = await getStripeClient();
    if (!stripe || mode !== 'subscription') {
      return res.json({
        active,
        status,
        planId,
        planName,
        renewAt: null,
        amount: null,
        currency: null,
      });
    }

    let subscription = await resolveStripeSubscriptionForUser(stripe, billing, email);

    subscription = await ensureLegacySubscriptionNaturalExpiry(stripe, subscription);
    const priceId = subscription?.items?.data?.[0]?.price?.id || null;
    const inferredPlanId = resolvePlanIdFromPriceId(priceId);
    if (inferredPlanId && inferredPlanId !== planId) {
      planId = inferredPlanId;
      planName = PLAN_DISPLAY_NAMES[inferredPlanId] || inferredPlanId;
      await writeBilling(uid, { ...billing, uid, planId: inferredPlanId, mode: 'subscription', status: 'active' });
    } else if (inferredPlanId && !planName) {
      planName = PLAN_DISPLAY_NAMES[inferredPlanId] || inferredPlanId;
    }
    const item = subscription?.items?.data?.[0];
    const amountCents = item?.price?.unit_amount;
    const currency = item?.price?.currency;
    const renewAt = typeof subscription?.current_period_end === 'number'
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    return res.json({
      active,
      status: subscription?.status || status,
      planId,
      planName,
      renewAt,
      amount: typeof amountCents === 'number' ? amountCents / 100 : null,
      currency: typeof currency === 'string' ? currency.toUpperCase() : null,
    });
  } catch (e) {
    console.error('[Backend] GET /api/subscription/status error:', e);
    return res.status(500).json({ error: 'Errore durante il caricamento dello stato abbonamento.' });
  }
});

app.post('/api/subscription/portal', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid, email } = await requireAuth(idToken);
    if (!uid || !email) return res.status(401).json({ error: 'Token mancante o non valido' });
    return res.status(403).json({ error: 'Portale abbonamento disabilitato: l\'abbonamento resta attivo fino a scadenza naturale.' });
  } catch (e) {
    console.error('[Backend] POST /api/subscription/portal error:', e);
    return res.status(500).json({ error: 'Errore durante apertura portale abbonamento.' });
  }
});

// POST /api/me/delete-account — Self-service: l'utente autenticato richiede la cancellazione del proprio account. Elimina da Firebase Auth e tutti i dati backend (chat, memoria, diario, billing, storie, usage, credits). Richiesto dal legale per GDPR (diritto all'oblio). Conferma avvocato: "È esattamente ciò che serve per essere GDPR compliant al 100%."
app.post('/api/me/delete-account', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });

    const safe = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
    const deleted = [];

    if (firebaseInitialized) {
      try {
        await admin.auth().deleteUser(uid);
        deleted.push('firebase_auth');
      } catch (e) {
        if (e?.code !== 'auth/user-not-found') {
          console.error('[Backend] delete-account Firebase deleteUser error:', e?.message);
          return res.status(500).json({ error: 'Errore cancellazione utente: ' + (e?.message || '') });
        }
      }
    }

    const filesToTry = [
      [DATA_DIR, `${safe}.json`],
      [MEMORIES_DIR, `${safe}.json`],
      [BILLING_DIR, `${safe}.json`],
      [CREDITS_DIR, `${safe}.json`],
    ];
    for (const [dir, file] of filesToTry) {
      const p = path.join(dir, file);
      try {
        await fs.unlink(p);
        deleted.push(path.basename(dir) + '/' + file);
      } catch (_) {}
    }

    try {
      const usageFiles = await fs.readdir(USAGE_DIR);
      for (const f of usageFiles) {
        if (f.endsWith(`_${safe}.json`)) {
          await fs.unlink(path.join(USAGE_DIR, f));
          deleted.push('usage/' + f);
        }
      }
    } catch (_) {}

    return res.json({ ok: true, deleted });
  } catch (e) {
    console.error('[Backend] POST /api/me/delete-account error:', e);
    res.status(500).json({ error: e?.message || 'Errore durante la cancellazione.' });
  }
});

// POST /api/billing/webhook — webhook Stripe per aggiornare lo stato abbonamento
app.post('/api/billing/webhook', async (req, res) => {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(400).json({ error: 'Stripe non configurato lato server (manca STRIPE_SECRET_KEY).' });
    }
    if (!STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: 'Webhook Stripe non configurato lato server (manca STRIPE_WEBHOOK_SECRET).' });
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Header Stripe-Signature mancante.' });
    }

    const rawBody = req.rawBody;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      return res.status(400).json({ error: 'Raw body mancante: impossibile verificare la firma webhook.' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
    } catch (e) {
      console.error('[Backend] Stripe webhook signature verification failed:', e?.message || e);
      return res.status(400).json({ error: 'Firma webhook non valida.' });
    }
    const type = event.type;

    if (!type) {
      return res.status(400).json({ error: 'Evento Stripe non valido' });
    }

    if (type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const persisted = await persistCheckoutSessionBilling(session);
      if (persisted.ok && persisted.uid && persisted.planId && !persisted.pack) {
        const planId = persisted.planId;
        const uid = persisted.uid;
        const mode = session.mode || (['oxy_monthly', 'oxy_semiannual', 'oxy_annual'].includes(planId) ? 'subscription' : 'payment');
        try {
          const transport = getMailerForWelcome();
          if (transport && firebaseInitialized) {
            const userRecord = await admin.auth().getUser(uid);
            const to = (userRecord?.email || '').trim().toLowerCase();
            if (to) {
              const body = getWelcomeEmailBody(planId, mode);
              await transport.sendMail({
                from: SMTP_FROM,
                to,
                subject: 'Welcome to OXY Real',
                text: body,
              });
            }
          }
        } catch (mailErr) {
          console.error('[Backend] Welcome email after payment failed:', mailErr?.message || mailErr);
        }
      }
    } else if (type === 'customer.subscription.deleted' || type === 'customer.subscription.canceled') {
      const subscription = event.data?.object || {};
      // Stripe Checkout non copia metadata dalla session alla subscription: cerchiamo l'utente per subscription.id
      let uid = subscription.metadata?.uid || null;
      if (!uid) uid = await findUidByStripeSubscriptionId(subscription.id);
      if (uid) {
        const current = (await readBilling(uid)) || {};
        await writeBilling(uid, {
          ...current,
          uid,
          status: 'canceled',
          stripeSubscriptionId: subscription.id,
        });
      }
    } else if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      const subscription = event.data?.object || {};
      let uid = subscription.metadata?.uid || null;
      if (!uid) uid = await findUidByStripeSubscriptionId(subscription.id);
      if (!uid && subscription.customer && stripe) {
        try {
          const customer = await stripe.customers.retrieve(String(subscription.customer));
          const email = typeof customer === 'object' && !customer.deleted ? customer.email : null;
          if (email && firebaseInitialized) {
            const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
            uid = userRecord?.uid || null;
          }
        } catch (_) {}
      }
      if (uid && subscription.status === 'active') {
        const current = (await readBilling(uid)) || {};
        const priceId = subscription.items?.data?.[0]?.price?.id || null;
        const planId = resolvePlanIdFromPriceId(priceId) || current.planId || subscription.metadata?.planId || null;
        await writeBilling(uid, {
          ...current,
          uid,
          planId,
          status: 'active',
          mode: 'subscription',
          stripeSubscriptionId: subscription.id,
          currentPeriodEnd: subscription.current_period_end ?? null,
        });
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error('[Backend] POST /api/billing/webhook error:', e);
    res.status(500).json({ error: 'Errore durante l\'elaborazione del webhook.' });
  }
});

// 0.0.0.0 = accetta connessioni da altri dispositivi in rete (non solo localhost)
app.listen(PORT, '0.0.0.0', async () => {
  await ensureDataDir();
  await ensureBillingDir();
  await ensureCreditsDir();
  console.log(`OXY Real backend proxy on port ${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  In rete: http://${net.address}:${PORT}  → metti questo URL in EXPO_PUBLIC_BACKEND_URL nell'app`);
        break;
      }
    }
  }
  if (!OPENAI_API_KEY) console.warn('OPENAI_API_KEY non impostata');
  if (!MASTER_EMAIL) console.warn('MASTER_EMAIL non impostata (Master user non abilitato)');
});
