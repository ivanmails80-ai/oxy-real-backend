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
import { spawn } from 'child_process';
import Parser from 'rss-parser';
import ffmpegStatic from 'ffmpeg-static';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
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

console.log('[Storage] ENV DATA_ROOT =', ENV_DATA_ROOT || '(empty)', '→ using DATA_ROOT =', DATA_ROOT);
const DATA_DIR = path.join(DATA_ROOT, 'chats');
const MEMORIES_DIR = path.join(DATA_ROOT, 'memories');
const DIARY_DIR = path.join(DATA_ROOT, 'diary');
const STORY_STATE_DIR = path.join(DATA_ROOT, 'storyState');
const BILLING_DIR = path.join(DATA_ROOT, 'billing');
const USAGE_DIR = path.join(DATA_ROOT, 'usage');
const OXY_TV_DIR = path.join(DATA_ROOT, 'oxy-tv');

const app = express();
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

// Static hosting per contenuti generati (MVP OXY TV)
app.use('/oxy-tv', express.static(OXY_TV_DIR));

// Parser RSS (ANSA)
const rssParser = new Parser();

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
  message: { error: 'Troppe richieste. Attendi qualche minuto e riprova.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const voiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Voice/TTS sono più costose
  message: { error: 'Troppe richieste di voce. Attendi qualche minuto e riprova.' },
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

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Limite generico per altri endpoint
  message: { error: 'Troppe richieste. Attendi qualche minuto e riprova.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const TAVILY_API_KEY = process.env.TAVILY_API_KEY?.trim();
const MASTER_EMAIL = process.env.MASTER_EMAIL?.trim()?.toLowerCase();
const PORT = process.env.PORT || 3030;

// SMTP (invio email automatico documenti) — opzionale
const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const SMTP_FROM = process.env.SMTP_FROM?.trim();
const DOCS_EMAIL_AUTOSEND_ENABLED = String(process.env.DOCS_EMAIL_AUTOSEND_ENABLED || '').trim() === 'true';

let mailerTransport = null;
function getMailer() {
  if (!DOCS_EMAIL_AUTOSEND_ENABLED) return null;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return null;
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
  sub_starter: process.env.STRIPE_PRICE_SUB_STARTER?.trim(),
  sub_pro: process.env.STRIPE_PRICE_SUB_PRO?.trim(),
  sub_elite: process.env.STRIPE_PRICE_SUB_ELITE?.trim(),
  life_starter: process.env.STRIPE_PRICE_LIFE_STARTER?.trim(),
  life_pro: process.env.STRIPE_PRICE_LIFE_PRO?.trim(),
  life_elite: process.env.STRIPE_PRICE_LIFE_ELITE?.trim(),
};
const STRIPE_SUCCESS_URL = process.env.STRIPE_SUCCESS_URL?.trim();
const STRIPE_CANCEL_URL = process.env.STRIPE_CANCEL_URL?.trim();

// Trial/Beta access (per go-live senza monetizzazione immediata)
// - Se attivo, il backend può assegnare automaticamente uno stato "trialing" al primo /api/billing/status
// - La chat è consentita (OPENAI_API_KEY lato server) entro un limite giornaliero
// - Vision (immagini) è bloccata in trial per contenere i costi
const BILLING_TRIAL_ENABLED = String(process.env.BILLING_TRIAL_ENABLED || '').trim() === 'true';
const BILLING_TRIAL_DAYS = Math.max(1, Math.min(30, Number(process.env.BILLING_TRIAL_DAYS || 2)));
const BILLING_TRIAL_PLAN_ID = (process.env.BILLING_TRIAL_PLAN_ID || 'sub_starter').trim();
const BILLING_TRIAL_DAILY_LIMIT = Math.max(1, Math.min(400, Number(process.env.BILLING_TRIAL_DAILY_LIMIT || 25)));

const DAILY_LIMITS_BY_PLAN = {
  sub_starter: 50,
  sub_pro: 150,
  sub_elite: 400,
};

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
  if (status === 'active') return true;
  if (status === 'trialing') {
    const ends = billing?.trialEndsAt;
    if (ends && isIsoPast(ends)) return false;
    return true;
  }
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

async function readChatUsage(uid, dayIso) {
  if (!uid) return 0;
  try {
    const raw = await fs.readFile(usagePath(uid, dayIso), 'utf8');
    const data = JSON.parse(raw);
    return typeof data?.count === 'number' ? data.count : 0;
  } catch {
    return 0;
  }
}

async function incChatUsage(uid, dayIso, delta = 1) {
  if (!uid) return;
  await ensureUsageDir();
  const prev = await readChatUsage(uid, dayIso);
  const next = Math.max(0, prev + (Number(delta) || 0));
  await fs.writeFile(usagePath(uid, dayIso), JSON.stringify({ uid, day: dayIso, count: next }, null, 0), 'utf8');
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
  if (!firebaseInitialized) return { email: null, uid: null };
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return { email: (decoded.email || '').toLowerCase(), uid: decoded.uid };
  } catch (e) {
    return { email: null, uid: null };
  }
}

function isMaster(email) {
  return !!MASTER_EMAIL && !!email && email === MASTER_EMAIL;
}

// ——— Persistenza cronologia chat (Punto 2) ———
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function ensureOxyTvDir() {
  await fs.mkdir(OXY_TV_DIR, { recursive: true });
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

// ——— Memoria a lungo termine (identità, obiettivi, contesto) ———
async function ensureMemoriesDir() {
  await fs.mkdir(MEMORIES_DIR, { recursive: true });
}

function memoryPath(uid) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(MEMORIES_DIR, `${safe}.json`);
}

async function readMemories(uid) {
  if (!uid) return null;
  try {
    const raw = await fs.readFile(memoryPath(uid), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

const MEMORY_KEYS = ['identitySummary', 'goals', 'keyFacts', 'lastContext'];

/** Converte stringhe legacy in array di note { id, text }; gli array restano invariati. Id deterministici per stringhe così delete funziona dopo refetch. */
function notesToArray(val, prefix = '') {
  if (Array.isArray(val)) return val.filter((n) => n && typeof n.text === 'string' && (n.id || (n.id = randomUUID())));
  if (typeof val === 'string' && val.trim()) {
    return val.split(/\n•\s*/).filter(Boolean).map((t, i) => ({
      id: prefix ? `${prefix}-${i}` : randomUUID(),
      text: t.trim(),
    }));
  }
  return [];
}

/** Da array di note a stringa per prompt IA. */
function notesToBlock(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr.map((n) => (n && n.text ? `• ${n.text}` : '')).filter(Boolean).join('\n');
}

async function mergeMemory(uid, updates) {
  if (!uid || !updates || typeof updates !== 'object') return;
  await ensureMemoriesDir();
  const current = await readMemories(uid) || {};
  const merged = { updatedAt: new Date().toISOString() };
  merged.identitySummary = typeof updates.identitySummary === 'string' ? updates.identitySummary : (current.identitySummary ?? '');
  merged.lastContext = typeof updates.lastContext === 'string' ? updates.lastContext : (current.lastContext ?? '');
  merged.goals = Array.isArray(updates.goals) ? updates.goals : notesToArray(current.goals);
  merged.keyFacts = Array.isArray(updates.keyFacts) ? updates.keyFacts : notesToArray(current.keyFacts);
  await fs.writeFile(memoryPath(uid), JSON.stringify(merged, null, 0), 'utf8');
}

async function requireAuth(idToken) {
  if (!idToken) return { uid: null, email: null };
  const { uid, email } = await verifyToken(idToken);
  return { uid, email };
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

async function tavilySearchServer({ query, maxResults = 5, topic = 'general', timeRange }) {
  if (!TAVILY_API_KEY) {
    console.warn('[Backend] Tavily: API key non impostata (TAVILY_API_KEY). Aggiungila in Environment su Render.');
    return { error: 'Tavily non configurato', results: [] };
  }
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      topic,
      search_depth: 'advanced',
      ...(timeRange && { time_range: timeRange }),
      include_answer: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn('[Backend] Tavily errore', res.status, query?.slice(0, 60), err?.slice(0, 200));
    return { error: `Tavily ${res.status}`, results: [] };
  }
  const data = await res.json();
  return { results: data?.results || [] };
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

const WEB_SEARCH_TOOL = (currentDateISO) => ({
  type: 'function',
  function: {
    name: 'web_search',
    description: `Cerca sul web. Data corrente: ${currentDateISO}. REGOLE: (1) Fatti PRIMA di ottobre 2023: NON usare web_search. (2) Fatti DOPO ottobre 2023 (risultati partite, score, classifiche, notizie): DEVI usare web_search prima di rispondere; NON rispondere mai "non lo so" o "controlla tu" senza averla chiamata. Per risultati sportivi usa sempre time_range "day" o "week" e query chiara (es. "risultato X Y data").`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        max_results: { type: 'integer', default: 5 },
        topic: { type: 'string', enum: ['general', 'news', 'finance'], default: 'general' },
        time_range: { type: 'string', enum: ['day', 'week', 'month', 'year'] },
      },
      required: ['query'],
    },
  },
});

const SAVE_MEMORY_TOOL = {
  type: 'function',
  function: {
    name: 'save_memory',
    description: 'Salva nella Memory Vault dell\'utente: identità, obiettivi, fatti importanti, promemoria, cose da fare, acquisti da ricordare (es. "comprare le uova"). Quando l\'utente dice "ricordami X", "memorizza Y", "salva che Z" DEVI chiamare save_memory e confermare che è stato salvato. Non dire mai che non puoi memorizzare.',
    parameters: {
      type: 'object',
      properties: {
        identitySummary: { type: 'string', description: 'Sintesi della personalità e identità dell\'utente' },
        goals: { type: 'string', description: 'Obiettivi dichiarati (lavoro, vita, progetti)' },
        keyFacts: { type: 'string', description: 'Fatti, preferenze, promemoria, cose da fare, acquisti da ricordare (es. "comprare le uova"), situazioni da non dimenticare' },
        lastContext: { type: 'string', description: 'Dove eravamo rimasti nell\'ultima conversazione' },
      },
    },
  },
};

const CLEAR_MEMORY_TOOL = {
  type: 'function',
  function: {
    name: 'clear_memory',
    description: 'Cancella una o più sezioni della Memory Vault su richiesta dell\'utente. Usa quando dice "cancella gli obiettivi", "elimina quello che hai ricordato su X", "svuota la memoria", "dimentica i promemoria", ecc. sections: array di quali parti cancellare.',
    parameters: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: { type: 'string', enum: ['identitySummary', 'goals', 'keyFacts', 'lastContext'] },
          description: 'identitySummary=identità, goals=obiettivi, keyFacts=fatti/promemoria, lastContext=ultimo contesto',
        },
      },
      required: ['sections'],
    },
  },
};

/** Personalità in base alla voce scelta (stesso ordine di src/data/voiceOptions.js) */
const VOICE_PERSONALITY_PROMPTS = {
  shimmer: 'Tono da Socia/Leader: calda, autorevole, orientata agli obiettivi. Guida le decisioni insieme all\'utente con sicurezza e chiarezza. Risposte strutturate e concrete, senza essere fredda.',
  nova: 'Tono da Innovatrice: energica, chiara, dinamica. Ideale per idee rapide, brainstorming e soluzioni creative. Risposte vivaci e al punto, senza fronzoli.',
  alloy: 'Tono da Assistente/Guida: equilibrata, cordiale, rassicurante. La compagna di viaggio ideale. Risposte pacate e accoglienti, che accompagnano senza invadere.',
  onyx: 'Tono da Consulente Senior: profondo, serio, carismatico. Il consulente di fiducia. Risposte ponderate, autorevoli, orientate a strategia e risultati.',
  echo: 'Tono da Uomo d\'affari: calmo, analitico, orientato a dati e strategie. Risposte chiare e strutturate, adatte a decisioni e pianificazione.',
  cedar: 'Tono da Collaboratore: cordiale, umile, pacato. Un supporto costante senza pretese. Risposte misurate e collaborative, mai invadenti.',
};

function buildOxySystemPrompt({ customAiName, voiceId, userName, nowStr, dateISO, language, moduleName, memoryBlock, hasImage }) {
  const mem = memoryBlock ? `\n\nMEMORIA A LUNGO TERMINE (usa sempre, non chiedere di nuovo):\n${memoryBlock}\n` : '';
  const imageBlock = hasImage
    ? '\n• IMMAGINI: Se l\'utente invia un\'immagine, descrivi in modo strutturato (oggetti, contesto, atmosfera o emozioni evocate). Se è un momento significativo (luogo, cibo, documento, persona), puoi suggerire di salvarlo in memoria con save_memory (keyFacts) come "momento visivo" e proporre all\'utente di ricordarlo.\n'
    : '';
  const nameLine = (userName && userName.length > 0)
    ? `\nL'utente si chiama ${userName}. Usa il suo nome quando appropriato (saluti, chiusure, tono personale).\n`
    : '';
  const personalityLine = (voiceId && VOICE_PERSONALITY_PROMPTS[voiceId])
    ? VOICE_PERSONALITY_PROMPTS[voiceId]
    : 'Personalità: amichevole, coerente, orientata alla chiarezza e ai passi concreti.';
  return `Sei ${customAiName || 'OXY'} (OXY). Modello: gpt-4o.
${personalityLine}
${nameLine}

——— REGOLE FISSE (NON IGNORARE) ———
• COME UN AMICO/AMICA: Sii amichevole e morbida nelle risposte. Un'amica fidata o un amico fidato: calda, presente, mai fredda o da manuale.
• NIENTE INTERROGATORI: Non fare raffiche di domande. Non "sintonizzarti" con domande su obiettivi o personalità. Capisci l'umano man mano che si scrivono: dalla conversazione, non da un questionario.
• SINCERA MA MORBIDA: Sii sincera e diretta, ma con tatto. Niente "Certamente", niente "Sono qui per aiutarti" da assistente. Parla come parlerebbe un amico vero.
• NIENTE CHIUSURE DA ASSISTENTE: Non terminare mai i messaggi con frasi tipo "Se vuoi discutere ulteriori dettagli fammi sapere", "Se hai bisogno di suggerimenti specifici chiedi pure", "Fammi sapere se serve altro". Siete amici: lui/lei chiede a te e tu chiedi a lui/lei; non servono inviti servili a continuare. Finisci in modo naturale, come in una chat tra amici.
• IDENTITÀ DELL'UTENTE: Basati su chi hai davanti (usa la memoria). Parla di LUI/LEI, non di te.
• MEMORIA: Usa save_memory per salvare ciò che l'utente ti chiede di ricordare; usa clear_memory quando chiede di cancellare obiettivi, promemoria o parti della memoria (es. "cancella gli obiettivi", "dimentica quel promemoria", "svuota cosa ricordi di me"). Conferma sempre l'azione. Coerenza nel tempo.
${imageBlock}
${mem}
DATA E ORA: ${nowStr}. Data ISO: ${dateISO}.

• CUT-OFF OTTOBRE 2023 — REGOLA FISSA:
  - Richieste su fatti/eventi PRIMA di ottobre 2023: NON fare ricerche web. Rispondi solo con la tua conoscenza (non chiamare web_search).
  - Richieste su fatti/eventi DOPO ottobre 2023 (da allora in poi, senza limite): DEVI fare ricerche web; non puoi rispondere senza aver effettuato web_search. Esempio: se oggi è il 12 febbraio e ti chiedono una cosa del 12 febbraio, non la sai dalla tua conoscenza — devi cercare. Se i dati sembrano vecchi, rifai con time_range "day".

• RICERCHE WEB SU RICHIESTA ESPLICITA:
  - Se l'utente ti dice di cercare sul web / su Google, o di controllare uno specifico sito (es. "controlla www.esempio.it", "vai su www.esempio.it e dimmi cosa trovi", "cerca su Google X"), DEVI chiamare web_search.
  - La query di web_search deve contenere le parole esatte dell'utente e, se cita un sito o dominio, includere anche quell'URL/domino nel testo (es. "recensioni prodotto X sito:esempio.it" oppure "www.esempio.it prodotto X").
  - Non rispondere mai a queste richieste basandoti solo sulla tua conoscenza interna: prima cerca, poi rispondi usando i risultati.

• RISULTATI SPORTIVI (partite, calcio, risultati, score, classifiche): NON rispondere MAI "non lo so" o "controlla tu in tempo reale" senza aver prima chiamato web_search. Queste richieste sono sempre dopo ottobre 2023 → DEVI chiamare subito web_search con query chiara (es. "risultato Atalanta Cremona 9 febbraio 2026", "classifica Serie A 2025-2026") e time_range "day" o "week". Solo dopo aver ricevuto i risultati (o un errore dalla ricerca) puoi rispondere. Se l'utente corregge la data, rifai la ricerca con la data corretta.

• SE web_search RESTITUISCE ERRORE (es. "Tavily non configurato" o errore di rete): Non dire "controlla tu". Di' che al momento la ricerca live non è disponibile e suggerisci dove verificare: "Puoi controllare su gazzetta.it o flashscore.it per i risultati aggiornati."

• SE DOPO LA RICERCA NON HAI IL RISULTATO (risultati vuoti ma nessun errore): Non dire "ti consiglio di controllare le pagine sportive". Sii trasparente: spiega che hai cercato ma non hai trovato un dato affidabile. Esempio: "Ho cercato ma non ho trovato un risultato che consideri sicuro. Puoi verificare su gazzetta.it o flashscore.it."

Lingua: ${language || 'it'}. Modulo: ${moduleName || 'default'}.`;
}

app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { idToken, apiKey: clientApiKey, history, message, imageBase64, language, moduleName, customAiName, voiceId, userName, nowStr, dateISO, initialMessage } = req.body;
    if (!idToken && !clientApiKey) {
      return res.status(400).json({ error: 'idToken o apiKey richiesti' });
    }

    let openaiKey = null;
    let uid = null;
    let billingSnapshot = null;
    if (idToken && firebaseInitialized) {
      // Regola:
      // - Master: usa OPENAI_API_KEY (se presente)
      // - Utente con abbonamento attivo (subscription): usa OPENAI_API_KEY (se presente)
      // - Lifetime / nessun piano: richiede apiKey client (Oxy Key personale)
      try {
        const authData = await requireAuth(idToken);
        uid = authData?.uid || null;
        const email = authData?.email || null;
        if (email && isMaster(email) && OPENAI_API_KEY) {
          openaiKey = OPENAI_API_KEY;
        } else if (uid && OPENAI_API_KEY) {
          const billing = await readBilling(uid);
          billingSnapshot = billing;
          const status = billing?.status || 'none';
          const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
          const active = mode === 'subscription'
            ? computeSubscriptionActive(billing)
            : status === 'paid';
          // Per proteggere i costi: OPENAI_API_KEY solo per abbonamenti (non per Lifetime)
          if (active && mode === 'subscription') openaiKey = OPENAI_API_KEY;
        }
      } catch (_) {
        // token non valido → si passa all'eventuale apiKey client
      }
    }
    if (!openaiKey && clientApiKey && typeof clientApiKey === 'string' && clientApiKey.trim().startsWith('sk-')) {
      openaiKey = clientApiKey.trim();
    }
    if (!openaiKey) {
      return res.status(400).json({ error: 'Oxy Key non configurata o non autorizzato. Inserisci la tua chiave nelle impostazioni o accedi come Master.' });
    }

    // Trial restrictions & daily limit (solo quando si usa la chiave server OPENAI_API_KEY)
    if (uid && openaiKey === OPENAI_API_KEY) {
      const billing = billingSnapshot || (await readBilling(uid));
      const status = billing?.status || 'none';
      const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
      const isTrial = status === 'trialing' && mode === 'subscription';
      if (isTrial && billing?.trialEndsAt && isIsoPast(billing.trialEndsAt)) {
        return res.status(403).json({ error: 'Trial scaduta. Attiva un abbonamento per continuare.' });
      }
      if (isTrial && imageBase64) {
        return res.status(403).json({ error: 'Vision AI non disponibile durante la trial. Attiva un abbonamento per usare le immagini.' });
      }
      if (mode === 'subscription' && (status === 'active' || status === 'trialing')) {
        const planId = billing?.planId || BILLING_TRIAL_PLAN_ID || 'sub_starter';
        const limit = isTrial
          ? BILLING_TRIAL_DAILY_LIMIT
          : (DAILY_LIMITS_BY_PLAN[planId] || BILLING_TRIAL_DAILY_LIMIT);
        const day = dateISO();
        const used = await readChatUsage(uid, day);
        if (used >= limit) {
          return res.status(429).json({ error: `Limite giornaliero raggiunto (${limit} messaggi/giorno). Riprova domani o passa a un piano superiore.` });
        }
      }
    }

    const memories = uid ? await readMemories(uid) : null;
    const goalsStr = memories ? notesToBlock(notesToArray(memories.goals)) : '';
    const keyFactsStr = memories ? notesToBlock(notesToArray(memories.keyFacts)) : '';
    const memoryBlock = memories && (memories.identitySummary || goalsStr || keyFactsStr || memories.lastContext)
      ? `Identità: ${memories.identitySummary || '-'}. Obiettivi: ${goalsStr || '-'}. Fatti chiave: ${keyFactsStr || '-'}. Ultimo contesto: ${memories.lastContext || '-'}.`
      : '';

    const messages = [];
    const systemContent = buildOxySystemPrompt({
      customAiName: customAiName || 'OXY',
      voiceId: voiceId && VOICE_PERSONALITY_PROMPTS[voiceId] ? voiceId : undefined,
      userName: typeof userName === 'string' ? userName.trim() : '',
      nowStr: nowStr || new Date().toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
      dateISO: dateISO || new Date().toISOString().slice(0, 10),
      language: language || 'it',
      moduleName: moduleName || 'default',
      memoryBlock,
      hasImage: !!imageBase64,
    });
    messages.push({ role: 'system', content: systemContent });

    if (Array.isArray(history) && history.length > 0) {
      for (const m of history) {
        if (m.role === 'user' || m.role === 'assistant') messages.push({ role: m.role, content: m.content || '' });
      }
    }

    const isInitialMessage = !!initialMessage && (!message || !String(message).trim());
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
        content: "[L'utente ha appena aperto la chat. Scrivi un UNICO primo messaggio breve e caloroso, come farebbe un amico/amica quando ti vede. Una frase accogliente, morbida. Niente liste di domande, niente 'Come posso aiutarti'. Solo un saluto amichevole.]",
      });
    } else {
      messages.push({ role: 'user', content: message || '' });
    }

    // Enforce cutoff rule (Oct 2023) with a server-side guard.
    // The system prompt instructs the model, but we also force a web_search tool call
    // for clearly post-cutoff requests to avoid hallucinations.
    const shouldForceWebSearch = (text) => {
      const s = String(text || '').toLowerCase();
      if (!s) return false;
      // Explicit user request to search on web / Google / a site.
      if (/(cerca|cercami|cerca su|googl|sul web|in rete|online|controlla|verifica)\b/.test(s)) return true;
      if (/(wikipedia|repubblica|corriere|gazzetta|flashscore|bbc|cnn|nytimes|reuters)\b/.test(s)) return true;
      // Obvious "recent" intents.
      if (/(oggi|ieri|stanotte|adesso|attuale|attualmente|ultim[aei]|recent[ei]|questa settimana|questo mese|quest'anno|in tempo reale|breaking|news|notizie)\b/.test(s)) return true;
      if (/(risultato|score|classifica|quotazione|prezzo|meteo|sciopero|elezioni|uscita|release|aggiornamento)\b/.test(s)) return true;
      // Any year >= 2024 explicitly mentioned.
      if (/\b(2024|2025|2026|2027|2028|2029|2030|2031|2032|2033|2034|2035)\b/.test(s)) return true;
      return false;
    };

    const useTools = !imageBase64;
    const dateISOForTool = dateISO || new Date().toISOString().slice(0, 10);
    const tools = [WEB_SEARCH_TOOL(dateISOForTool), SAVE_MEMORY_TOOL, CLEAR_MEMORY_TOOL];
    const forceWebSearch = useTools && shouldForceWebSearch(message);
    if (forceWebSearch && !TAVILY_API_KEY) {
      // Hard fail: better an explicit error than an invented answer.
      return res.status(503).json({ error: 'Ricerca web non disponibile (TAVILY_API_KEY non configurata sul server). Riprova più tardi.' });
    }
    let payload = {
      model: 'gpt-4o',
      messages,
      ...(useTools && {
        tools,
        tool_choice: forceWebSearch ? { type: 'function', function: { name: 'web_search' } } : 'auto',
      }),
    };

    let lastContent = null;
    let maxRounds = useTools ? 5 : 1;
    let round = 0;

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
          return res.status(429).json({ error: 'Troppe richieste in questo momento. Attendi un minuto e riprova.' });
        }
        return res.status(response.status).json({ error: 'Errore temporaneo del servizio. Riprova tra poco.' });
      }

      const data = await response.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) return res.status(500).json({ error: 'Risposta IA non valida' });

      messages.push(msg);
      lastContent = msg.content;

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) break;

      for (const tc of toolCalls) {
        const fn = tc.function;
        let args = {};
        try {
          args = typeof fn?.arguments === 'string' ? JSON.parse(fn.arguments) : fn?.arguments || {};
        } catch (_) {}
        if (fn?.name === 'web_search') {
          const { query, max_results = 5, topic = 'general', time_range } = args;
          const searchRes = await tavilySearchServer({
            query: query || (typeof message === 'string' ? message : ''),
            maxResults: Math.min(Math.max(1, max_results), 10),
            topic,
            timeRange: time_range,
          });
          const toolContent = searchRes.error
            ? JSON.stringify({ error: searchRes.error })
            : JSON.stringify({ results: (searchRes.results || []).map((r) => ({ title: r.title, url: r.url, content: r.content })) });
          messages.push({ role: 'tool', tool_call_id: tc.id, content: toolContent });
        } else if (fn?.name === 'save_memory' && uid) {
          const current = await readMemories(uid) || {};
          const updates = {};
          if (args.identitySummary && String(args.identitySummary).trim()) updates.identitySummary = String(args.identitySummary).trim().slice(0, 2000);
          if (args.lastContext && String(args.lastContext).trim()) updates.lastContext = String(args.lastContext).trim().slice(0, 2000);
          if (args.goals && String(args.goals).trim()) {
            const g = String(args.goals).trim().slice(0, 2000);
            const goalsArr = notesToArray(current.goals);
            goalsArr.push({ id: randomUUID(), text: g });
            updates.goals = goalsArr;
          }
          if (args.keyFacts && String(args.keyFacts).trim()) {
            const k = String(args.keyFacts).trim().slice(0, 2000);
            const keyFactsArr = notesToArray(current.keyFacts);
            keyFactsArr.push({ id: randomUUID(), text: k });
            updates.keyFacts = keyFactsArr;
          }
          if (Object.keys(updates).length) await mergeMemory(uid, updates);
          messages.push({ role: 'tool', tool_call_id: tc.id, content: 'Memoria aggiornata.' });
        } else if (fn?.name === 'clear_memory' && uid) {
          const sections = Array.isArray(args.sections) ? args.sections.filter((s) => MEMORY_KEYS.includes(s)) : [];
          if (sections.length > 0) {
            const updates = {};
            for (const s of sections) updates[s] = '';
            await mergeMemory(uid, updates);
          }
          messages.push({ role: 'tool', tool_call_id: tc.id, content: sections.length ? 'Sezioni memoria cancellate.' : 'Nessuna sezione valida da cancellare.' });
        } else {
          messages.push({ role: 'tool', tool_call_id: tc.id, content: 'Ok.' });
        }
      }
      round++;
    }

    const finalContent = typeof lastContent === 'string' ? lastContent : (lastContent && lastContent[0]?.text) || '';
    if (!finalContent) return res.status(500).json({ error: 'Risposta IA vuota' });

    // Consuma 1 messaggio/giorno solo se la risposta è valida (riduce falsi positivi in caso di errori server)
    if (uid && openaiKey === OPENAI_API_KEY) {
      const billing = billingSnapshot || (await readBilling(uid));
      const status = billing?.status || 'none';
      const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
      if (mode === 'subscription' && (status === 'active' || status === 'trialing')) {
        await incChatUsage(uid, dateISO(), 1);
      }
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

// ——— Documenti (Drive/iCloud/OneDrive via file picker) ———
// Estrae testo da PDF/DOCX/TXT per poi passarli a OXY come contesto.
app.post('/api/docs/extract', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });

    let { fileBase64, fileName, mimeType } = req.body || {};
    if (typeof fileBase64 !== 'string' || !fileBase64.trim()) return res.status(400).json({ error: 'fileBase64 richiesto' });
    if (fileBase64.includes(',')) fileBase64 = fileBase64.split(',')[1] || '';
    const buf = Buffer.from(fileBase64, 'base64');
    if (!buf || buf.length === 0) return res.status(400).json({ error: 'File non valido' });
    if (buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'File troppo grande (max 8MB)' });

    const name = typeof fileName === 'string' ? fileName.trim().slice(0, 200) : 'documento';
    const mt = typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : '';

    let text = '';
    if (mt === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      const parser = new PDFParse({ data: buf });
      try {
        const out = await parser.getText();
        text = String(out?.text || '');
      } finally {
        try { await parser.destroy?.(); } catch (_) {}
      }
    } else if (
      mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.toLowerCase().endsWith('.docx')
    ) {
      const out = await mammoth.extractRawText({ buffer: buf });
      text = String(out?.value || '');
    } else if (mt.startsWith('text/') || name.toLowerCase().endsWith('.txt') || name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.csv') || name.toLowerCase().endsWith('.json')) {
      text = buf.toString('utf8');
    } else {
      return res.status(400).json({ error: `Formato non supportato (${mt || 'sconosciuto'}). Usa PDF, DOCX o testo.` });
    }

    const cleaned = text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();

    const MAX_CHARS = 60000;
    const clipped = cleaned.length > MAX_CHARS ? cleaned.slice(0, MAX_CHARS) : cleaned;
    res.json({ ok: true, fileName: name, chars: clipped.length, text: clipped });
  } catch (e) {
    console.error('[Backend] POST /api/docs/extract error:', e);
    res.status(500).json({ error: 'Errore durante l’estrazione del documento. Riprova.' });
  }
});

app.post('/api/docs/email', billingLimiter, async (req, res) => {
  try {
    const transport = getMailer();
    if (!transport) return res.status(400).json({ error: 'Invio automatico non configurato sul server.' });

    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid, email } = await requireAuth(idToken);
    if (!uid || !email) return res.status(401).json({ error: 'Token mancante o non valido' });

    const toReq = typeof req.body?.to === 'string' ? req.body.to.trim().toLowerCase() : '';
    // Anti-abuso: invio solo alla mail verificata dell'account (o Master)
    if (toReq && toReq !== email && !isMaster(email)) {
      return res.status(403).json({ error: 'Puoi inviare automaticamente solo alla tua email di account.' });
    }
    const to = toReq || email;

    const subjectVal = validateString(req.body?.subject, 'subject', 160, 1);
    if (!subjectVal.valid) return res.status(400).json({ error: subjectVal.error });
    const bodyVal = validateString(req.body?.body, 'body', 6000, 0);
    if (!bodyVal.valid) return res.status(400).json({ error: bodyVal.error });

    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (files.length === 0) return res.status(400).json({ error: 'files richiesto' });
    if (files.length > 3) return res.status(400).json({ error: 'Troppi allegati (max 3).' });

    const attachments = [];
    let totalBytes = 0;
    for (const f of files) {
      const nameVal = validateString(f?.fileName, 'fileName', 200, 1);
      if (!nameVal.valid) return res.status(400).json({ error: nameVal.error });
      let fileBase64 = typeof f?.fileBase64 === 'string' ? f.fileBase64 : '';
      if (fileBase64.includes(',')) fileBase64 = fileBase64.split(',')[1] || '';
      if (!fileBase64.trim()) return res.status(400).json({ error: 'fileBase64 mancante' });
      const buf = Buffer.from(fileBase64, 'base64');
      if (!buf || buf.length === 0) return res.status(400).json({ error: 'Allegato non valido' });
      totalBytes += buf.length;
      attachments.push({
        filename: nameVal.value,
        content: buf,
        contentType: typeof f?.mimeType === 'string' ? f.mimeType : undefined,
      });
    }
    if (totalBytes > 12 * 1024 * 1024) return res.status(400).json({ error: 'Allegati troppo grandi (max 12MB totali).' });

    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject: subjectVal.value,
      text: bodyVal.value || '',
      attachments,
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[Backend] POST /api/docs/email error:', e);
    res.status(500).json({ error: 'Errore invio email. Riprova più tardi.' });
  }
});

// ——— OXY TV (MVP): feed episodi + generazione admin ———
const ANSA_RSS_HOMEPAGE = 'https://www.ansa.it/web/ansait_web_rss_homepage.xml';

function oxyTvEpisodeJsonPath(id) {
  return path.join(OXY_TV_DIR, `${id}.json`);
}

function oxyTvEpisodeMp3Path(id) {
  return path.join(OXY_TV_DIR, `${id}.mp3`);
}

function oxyTvEpisodeMp4Path(id) {
  return path.join(OXY_TV_DIR, `${id}.mp4`);
}

async function fetchAnsaHeadlines(limit = 8) {
  const res = await fetch(ANSA_RSS_HOMEPAGE, { method: 'GET' });
  if (!res.ok) throw new Error(`RSS ANSA HTTP ${res.status}`);
  const xml = await res.text();
  const feed = await rssParser.parseString(xml);
  const items = Array.isArray(feed?.items) ? feed.items : [];
  return items.slice(0, Math.max(1, Math.min(20, limit))).map((it) => ({
    title: String(it?.title || '').trim(),
    link: String(it?.link || '').trim(),
    pubDate: it?.pubDate ? String(it.pubDate) : null,
  })).filter((x) => x.title && x.link);
}

function buildRundownScript({ items, date = new Date() }) {
  const d = date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const intro = `Edizione notizie di ${d}. Ecco i principali titoli di oggi.`;
  const lines = items.slice(0, 10).map((it, idx) => `${idx + 1}. ${it.title}.`);
  const outro = `Per approfondire, apri i link alle fonti. Fine edizione.`;
  return [intro, ...lines, outro].join(' ');
}

async function generateTtsMp3ToFile({ text, outPath, voice = 'nova' }) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY mancante sul server');
  const input = String(text || '').trim().slice(0, 4096);
  if (!input) throw new Error('Testo TTS mancante');

  const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      voice,
      input,
      response_format: 'mp3',
      speed: 0.98,
    }),
  });
  if (!ttsRes.ok) {
    const errText = await ttsRes.text();
    throw new Error(`TTS: ${errText.slice(0, 200)}`);
  }
  const buf = Buffer.from(await ttsRes.arrayBuffer());
  await fs.writeFile(outPath, buf);
}

async function generateMp4FromAudio({ audioPath, outPath }) {
  const ffmpegPath = typeof ffmpegStatic === 'string' ? ffmpegStatic : null;
  if (!ffmpegPath) throw new Error('FFmpeg non disponibile sul server');

  // Video semplice MVP: sfondo a tinta unita + audio (nessun testo, per evitare dipendenze font)
  const args = [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=#001425:s=1280x720:r=30',
    '-i', audioPath,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outPath,
  ];

  await new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${err.slice(-400)}`));
    });
  });
}

// Lista episodi generati (pubblico)
app.get('/api/oxy-tv/episodes', generalLimiter, async (req, res) => {
  try {
    await ensureOxyTvDir();
    const files = await fs.readdir(OXY_TV_DIR).catch(() => []);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    const episodes = [];
    for (const f of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(OXY_TV_DIR, f), 'utf8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') episodes.push(data);
      } catch {
        // skip
      }
    }
    episodes.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    res.json({ episodes: episodes.slice(0, 30) });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Errore server' });
  }
});

// Generazione episodio (solo Master) — MVP
app.post('/api/admin/oxy-tv/generate', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { email } = await requireAuth(idToken);
    if (!email || !isMaster(email)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    await ensureOxyTvDir();

    const items = await fetchAnsaHeadlines(8);
    const script = buildRundownScript({ items });

    const id = `ansa_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${randomUUID().slice(0, 8)}`;
    const mp3Path = oxyTvEpisodeMp3Path(id);
    const mp4Path = oxyTvEpisodeMp4Path(id);

    await generateTtsMp3ToFile({ text: script, outPath: mp3Path, voice: 'nova' });
    await generateMp4FromAudio({ audioPath: mp3Path, outPath: mp4Path });

    const episode = {
      id,
      title: `OXY TV — ANSA · ${new Date().toLocaleDateString('it-IT')}`,
      createdAt: new Date().toISOString(),
      source: 'ANSA RSS',
      sourceUrl: ANSA_RSS_HOMEPAGE,
      items,
      script,
      audioPath: `/oxy-tv/${id}.mp3`,
      videoPath: `/oxy-tv/${id}.mp4`,
    };
    await fs.writeFile(oxyTvEpisodeJsonPath(id), JSON.stringify(episode, null, 0), 'utf8');

    res.json({ ok: true, episode });
  } catch (e) {
    console.error('[Backend] POST /api/admin/oxy-tv/generate error:', e);
    res.status(500).json({ error: e.message || 'Errore server' });
  }
});

// POST /api/voice/transcribe — Whisper: audio base64 → testo (roadmap 2.1)
app.post('/api/voice/transcribe', voiceLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const clientApiKey = req.body?.apiKey;
    let openaiKey = null;
    // Regola:
    // - Master: usa OPENAI_API_KEY (se presente)
    // - Utente con abbonamento attivo (subscription): usa OPENAI_API_KEY (se presente)
    // - Lifetime / nessun piano: richiede apiKey client (Oxy Key personale)
    if (idToken && firebaseInitialized) {
      try {
        const { uid, email } = await requireAuth(idToken);
        if (email && isMaster(email) && OPENAI_API_KEY) {
          openaiKey = OPENAI_API_KEY;
        } else if (uid && OPENAI_API_KEY) {
          const billing = await readBilling(uid);
          const status = billing?.status || 'none';
          const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
          const active = mode === 'subscription'
            ? status === 'active' || status === 'trialing'
            : status === 'paid';
          if (active && mode === 'subscription') openaiKey = OPENAI_API_KEY;
        }
      } catch (_) {
        // token non valido → si passa all'eventuale apiKey client
      }
    }
    if (!openaiKey && clientApiKey && typeof clientApiKey === 'string' && clientApiKey.trim().startsWith('sk-')) openaiKey = clientApiKey.trim();
    if (!openaiKey) return res.status(400).json({ error: 'Oxy Key non configurata o non autorizzato.' });

    let audioBase64 = req.body?.audioBase64 || '';
    if (typeof audioBase64 !== 'string') return res.status(400).json({ error: 'audioBase64 richiesto' });
    if (audioBase64.includes(',')) audioBase64 = audioBase64.split(',')[1] || '';
    const buf = Buffer.from(audioBase64, 'base64');
    if (buf.length === 0) return res.status(400).json({ error: 'Audio non valido' });

    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'audio/m4a' }), 'audio.m4a');
    form.append('model', 'whisper-1');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      return res.status(whisperRes.status).json({ error: `Whisper: ${errText.slice(0, 200)}` });
    }
    const data = await whisperRes.json();
    res.json({ text: data?.text ?? '' });
  } catch (e) {
    console.error('[Backend] POST /api/voice/transcribe error:', e);
    res.status(500).json({ error: 'Errore durante la trascrizione. Riprova più tardi.' });
  }
});

// POST /api/tts — OpenAI TTS (tts-1-hd)
app.post('/api/tts', voiceLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const clientApiKey = req.body?.apiKey;
    let openaiKey = null;
    // Regola:
    // - Master: usa OPENAI_API_KEY (se presente)
    // - Utente con abbonamento attivo (subscription): usa OPENAI_API_KEY (se presente)
    // - Lifetime / nessun piano: richiede apiKey client (Oxy Key personale)
    if (idToken && firebaseInitialized) {
      try {
        const { uid, email } = await requireAuth(idToken);
        if (email && isMaster(email) && OPENAI_API_KEY) {
          openaiKey = OPENAI_API_KEY;
        } else if (uid && OPENAI_API_KEY) {
          const billing = await readBilling(uid);
          const status = billing?.status || 'none';
          const mode = billing?.mode || (billing?.planId && String(billing.planId).startsWith('sub_') ? 'subscription' : 'payment');
          const active = mode === 'subscription'
            ? status === 'active' || status === 'trialing'
            : status === 'paid';
          // Per proteggere i costi: OPENAI_API_KEY solo per abbonamenti (non per Lifetime)
          if (active && mode === 'subscription') openaiKey = OPENAI_API_KEY;
        }
      } catch (_) {
        // se il token è invalido, si passa al flusso clientApiKey (che comunque richiede una chiave)
      }
    }
    if (!openaiKey && clientApiKey && typeof clientApiKey === 'string' && clientApiKey.trim().startsWith('sk-')) openaiKey = clientApiKey.trim();
    if (!openaiKey) return res.status(400).json({ error: 'Oxy Key non configurata o non autorizzato.' });

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 4096) return res.status(400).json({ error: 'Testo richiesto (max 4096 caratteri).' });

    const allowedVoices = ['shimmer', 'nova', 'alloy', 'onyx', 'echo', 'cedar'];
    const clientVoice = typeof req.body?.voice === 'string' && allowedVoices.includes(req.body.voice.toLowerCase())
      ? req.body.voice.toLowerCase()
      : 'nova';
    // OpenAI supporta solo: alloy, echo, fable, onyx, nova, shimmer. Cedar non esiste → usiamo fable per Kind Partner.
    const voice = clientVoice === 'cedar' ? 'fable' : clientVoice;

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice,
        input: text,
        response_format: 'mp3',
        speed: 0.92,
      }),
    });
    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return res.status(ttsRes.status).json({ error: `TTS: ${errText.slice(0, 200)}` });
    }
    const arrayBuffer = await ttsRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    res.json({ audioBase64: base64 });
  } catch (e) {
    console.error('[Backend] POST /api/tts error:', e);
    res.status(500).json({ error: 'Errore durante la generazione vocale. Riprova più tardi.' });
  }
});

// GET /api/consent-required?email=xxx — per login: se l'email è quella del proprietario (MASTER_EMAIL in .env), ritorna consentRequired: false così l'app non richiede le checkbox. L'email proprietario resta solo nel .env del backend.
app.get('/api/consent-required', (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ consentRequired: true });
  const owner = (MASTER_EMAIL || '').trim().toLowerCase();
  const consentRequired = owner ? email !== owner : true;
  res.json({ consentRequired });
});

// POST /api/memory — append note (goal/keyFact), cancellazione sezione (clearSections) o singola nota (deleteNoteId)
app.post('/api/memory', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const { goal, keyFact, clearSections, deleteNoteId } = req.body || {};

    // Validazione input rigorosa
    let goalStr = null;
    let keyFactStr = null;
    let validClearSections = [];
    let validDeleteNoteId = null;

    if (goal != null) {
      const goalVal = validateString(goal, 'goal', 2000, 1);
      if (!goalVal.valid) return res.status(400).json({ error: goalVal.error });
      goalStr = goalVal.value;
    }
    if (keyFact != null) {
      const keyFactVal = validateString(keyFact, 'keyFact', 2000, 1);
      if (!keyFactVal.valid) return res.status(400).json({ error: keyFactVal.error });
      keyFactStr = keyFactVal.value;
    }
    if (clearSections != null) {
      const validSections = ['identitySummary', 'goals', 'keyFacts', 'lastContext'];
      const clearVal = validateArray(clearSections, 'clearSections', (item) => {
        if (typeof item !== 'string') return { valid: false, error: 'Ogni elemento di clearSections deve essere una stringa' };
        if (!validSections.includes(item)) return { valid: false, error: `clearSections contiene valore non valido: ${item}` };
        return { valid: true, value: item };
      }, 10);
      if (!clearVal.valid) return res.status(400).json({ error: clearVal.error });
      validClearSections = clearVal.value;
    }
    if (deleteNoteId != null) {
      const deleteVal = validateString(deleteNoteId, 'deleteNoteId', 100, 1);
      if (!deleteVal.valid) return res.status(400).json({ error: deleteVal.error });
      validDeleteNoteId = deleteVal.value;
    }

    if (!goalStr && !keyFactStr && validClearSections.length === 0 && !validDeleteNoteId) {
      return res.status(400).json({ error: 'Almeno uno tra goal, keyFact, clearSections o deleteNoteId deve essere fornito' });
    }

    const current = await readMemories(uid) || {};
    let goalsArr = notesToArray(current.goals);
    let keyFactsArr = notesToArray(current.keyFacts);
    const updates = {};

    if (validDeleteNoteId) {
      const id = validDeleteNoteId;
      goalsArr = goalsArr.filter((n) => String(n.id) !== id);
      keyFactsArr = keyFactsArr.filter((n) => String(n.id) !== id);
      updates.goals = goalsArr;
      updates.keyFacts = keyFactsArr;
    }
    if (validClearSections.length > 0) {
      for (const s of validClearSections) {
        if (s === 'goals') updates.goals = [];
        else if (s === 'keyFacts') updates.keyFacts = [];
        else if (s === 'identitySummary') updates.identitySummary = '';
        else if (s === 'lastContext') updates.lastContext = '';
      }
    }
    if (goalStr) {
      goalsArr = (updates.goals !== undefined ? goalsArr : notesToArray(current.goals)).slice();
      goalsArr.push({ id: randomUUID(), text: goalStr });
      updates.goals = goalsArr;
    }
    if (keyFactStr) {
      keyFactsArr = (updates.keyFacts !== undefined ? keyFactsArr : notesToArray(current.keyFacts)).slice();
      keyFactsArr.push({ id: randomUUID(), text: keyFactStr });
      updates.keyFacts = keyFactsArr;
    }

    await mergeMemory(uid, updates);
    res.json({ ok: true });
  } catch (e) {
    console.error('[Backend] POST /api/memory error:', e);
    res.status(500).json({ error: 'Errore server' });
  }
});

// GET /api/memory — lettura memoria (per schermata "Le mie note" / Memory Vault). goals/keyFacts sono array di { id, text }. Se il file ha ancora stringhe (legacy), migriamo e persistiamo per id stabili.
app.get('/api/memory', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const data = await readMemories(uid) || {};
    const goalsIsString = typeof data.goals === 'string';
    const keyFactsIsString = typeof data.keyFacts === 'string';
    const goalsArr = notesToArray(data.goals, goalsIsString ? 'goal' : '');
    const keyFactsArr = notesToArray(data.keyFacts, keyFactsIsString ? 'keyFact' : '');
    if (goalsIsString || keyFactsIsString) {
      await mergeMemory(uid, {
        goals: goalsArr,
        keyFacts: keyFactsArr,
        identitySummary: data.identitySummary ?? '',
        lastContext: data.lastContext ?? '',
      });
    }
    res.json({
      identitySummary: data.identitySummary ?? '',
      goals: goalsArr,
      keyFacts: keyFactsArr,
      lastContext: data.lastContext ?? '',
    });
  } catch (e) {
    console.error('[Backend] GET /api/memory error:', e);
    res.status(500).json({ error: e.message || 'Errore server' });
  }
});

// Rotte usate dall'app (devono corrispondere a chatService e aiService):
// POST /api/chat        — invio messaggio all'IA (aiService)
// GET  /api/chat/history — recupero cronologia (chatService)
// POST /api/chat/messages — salvataggio singolo messaggio (chatService)
app.get('/api/chat/history', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido', messages: [] });
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
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
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
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (!role || content == null) return res.status(400).json({ error: 'role e content richiesti' });
    await appendMessage(uid, role, content);
    res.json({ ok: true });
  } catch (e) {
    console.error('[Backend] POST /api/chat/messages error:', e);
    res.status(500).json({ error: 'Errore durante il salvataggio del messaggio. Riprova più tardi.' });
  }
});

// ——— Roadmap: feature flags (A/B) e analytics ———
app.get('/api/features', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    await requireAuth(idToken);
    // Per ora ritorniamo tutte le feature della roadmap attive; in futuro qui si può leggere da DB/Remote Config
    res.json({
      diary: true,
      stories: true,
      voiceInput: true,
      imageContext: true,
      community: true,
      reputation: true,
      abTests: true,
    });
  } catch (e) {
    res.status(401).json({ error: 'Token mancante o non valido' });
  }
});

app.post('/api/analytics', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    const { event, ...props } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event richiesto' });
    if (typeof __dirname !== 'undefined') {
      console.log('[Analytics]', uid, event, props);
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(401).json({ error: 'Token mancante o non valido' });
  }
});

// ——— Diario interattivo (roadmap 1.1) ———
async function ensureDiaryDir() {
  await fs.mkdir(DIARY_DIR, { recursive: true });
}

function diaryPath(uid) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DIARY_DIR, `${safe}.json`);
}

async function readDiary(uid) {
  if (!uid) return null;
  try {
    const raw = await fs.readFile(diaryPath(uid), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function writeDiary(uid, data) {
  if (!uid || !data || typeof data !== 'object') return;
  await ensureDiaryDir();
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await fs.writeFile(diaryPath(uid), JSON.stringify(payload, null, 0), 'utf8');
}

app.get('/api/diary', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const data = await readDiary(uid);
    res.json({
      themes: Array.isArray(data?.themes) ? data.themes : [],
      entries: Array.isArray(data?.entries) ? data.entries : [],
      progressSummary: typeof data?.progressSummary === 'string' ? data.progressSummary : '',
    });
  } catch (e) {
    console.error('[Backend] GET /api/diary error:', e);
    res.status(500).json({ error: 'Errore durante il caricamento del diario. Riprova più tardi.' });
  }
});

app.post('/api/diary', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const { theme, content, progressSummary } = req.body || {};

    // Validazione input rigorosa
    let validTheme = null;
    let validContent = null;
    let validProgressSummary = null;

    if (theme != null) {
      if (typeof theme !== 'object' || Array.isArray(theme)) {
        return res.status(400).json({ error: 'theme deve essere un oggetto' });
      }
      const idVal = validateString(theme.id, 'theme.id', 100, 1);
      const labelVal = validateString(theme.label, 'theme.label', 200, 1);
      if (!idVal.valid) return res.status(400).json({ error: idVal.error });
      if (!labelVal.valid) return res.status(400).json({ error: labelVal.error });
      validTheme = { id: idVal.value, label: labelVal.value };
    }
    if (content != null) {
      const contentVal = validateString(content, 'content', 5000, 1);
      if (!contentVal.valid) return res.status(400).json({ error: contentVal.error });
      validContent = contentVal.value;
    }
    if (progressSummary != null) {
      const summaryVal = validateString(progressSummary, 'progressSummary', 3000, 0);
      if (!summaryVal.valid) return res.status(400).json({ error: summaryVal.error });
      validProgressSummary = summaryVal.value;
    }

    if (!validTheme && !validContent && validProgressSummary == null) {
      return res.status(400).json({ error: 'Almeno uno tra theme, content o progressSummary deve essere fornito' });
    }

    const current = await readDiary(uid) || { themes: [], entries: [], progressSummary: '' };
    if (validTheme) {
      const exists = current.themes.find((t) => t.id === validTheme.id);
      if (!exists) current.themes = [...(current.themes || []), validTheme];
    }
    if (validContent) {
      current.entries = current.entries || [];
      current.entries.push({
        id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString().slice(0, 10),
        themeId: validTheme?.id || null,
        content: validContent,
      });
      if (current.entries.length > 500) current.entries = current.entries.slice(-500);
    }
    if (validProgressSummary != null) current.progressSummary = validProgressSummary;
    await writeDiary(uid, current);
    res.json({
      themes: current.themes,
      entries: current.entries,
      progressSummary: current.progressSummary,
    });
  } catch (e) {
    console.error('[Backend] POST /api/diary error:', e);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ——— Storie a livelli (roadmap 1.2) ———
async function ensureStoryStateDir() {
  await fs.mkdir(STORY_STATE_DIR, { recursive: true });
}

function storyStatePath(uid) {
  const safe = (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(STORY_STATE_DIR, `${safe}.json`);
}

async function readStoryState(uid) {
  if (!uid) return null;
  try {
    const raw = await fs.readFile(storyStatePath(uid), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function writeStoryState(uid, data) {
  if (!uid || !data || typeof data !== 'object') return;
  await ensureStoryStateDir();
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await fs.writeFile(storyStatePath(uid), JSON.stringify(payload, null, 0), 'utf8');
}

app.get('/api/stories/state', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const data = await readStoryState(uid);
    res.json({
      currentStoryId: data?.currentStoryId ?? null,
      stepIndex: typeof data?.stepIndex === 'number' ? data.stepIndex : 0,
      completed: Array.isArray(data?.completed) ? data.completed : [],
    });
  } catch (e) {
    console.error('[Backend] GET /api/stories/state error:', e);
    res.status(500).json({ error: 'Errore durante il caricamento dello stato delle storie. Riprova più tardi.' });
  }
});

app.post('/api/stories/state', generalLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const { storyId, stepIndex, completed } = req.body || {};

    // Validazione input rigorosa
    let validStoryId = null;
    let validStepIndex = null;
    let validCompleted = null;

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'storyId')) {
      if (storyId == null) {
        validStoryId = null;
      } else {
        const storyIdVal = validateString(storyId, 'storyId', 100, 1);
        if (!storyIdVal.valid) return res.status(400).json({ error: storyIdVal.error });
        validStoryId = storyIdVal.value;
      }
    }
    if (stepIndex != null) {
      const stepVal = validateNumber(stepIndex, 'stepIndex', 0, 10000, true);
      if (!stepVal.valid) return res.status(400).json({ error: stepVal.error });
      validStepIndex = stepVal.value;
    }
    if (completed != null) {
      const completedVal = validateArray(completed, 'completed', (item) => {
        const itemVal = validateString(item, 'completed item', 100, 1);
        if (!itemVal.valid) return { valid: false, error: itemVal.error };
        return { valid: true, value: itemVal.value };
      }, 1000);
      if (!completedVal.valid) return res.status(400).json({ error: completedVal.error });
      validCompleted = completedVal.value;
    }

    if (validStoryId === null && validStepIndex === null && validCompleted === null) {
      return res.status(400).json({ error: 'Almeno uno tra storyId, stepIndex o completed deve essere fornito' });
    }

    const current = await readStoryState(uid) || { currentStoryId: null, stepIndex: 0, completed: [] };
    if (validStoryId !== null) current.currentStoryId = validStoryId;
    if (validStepIndex !== null) current.stepIndex = validStepIndex;
    if (validCompleted !== null) current.completed = validCompleted;
    await writeStoryState(uid, current);
    res.json({ currentStoryId: current.currentStoryId, stepIndex: current.stepIndex, completed: current.completed });
  } catch (e) {
    console.error('[Backend] POST /api/stories/state error:', e);
    res.status(500).json({ error: 'Errore server' });
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
    const raw = await fs.readFile(billingPath(uid), 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

async function writeBilling(uid, data) {
  if (!uid || !data || typeof data !== 'object') return;
  await ensureBillingDir();
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await fs.writeFile(billingPath(uid), JSON.stringify(payload, null, 0), 'utf8');
}

// ——— Stripe checkout session (abbonamenti + Lifetime) ———
app.post('/api/billing/checkout', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid, email } = await requireAuth(idToken);
    if (!uid || !email) return res.status(401).json({ error: 'Token mancante o non valido' });

    const { planId } = req.body || {};

    // Validazione input rigorosa
    const planIdVal = validateString(planId, 'planId', 50, 1);
    if (!planIdVal.valid) return res.status(400).json({ error: planIdVal.error });

    const validPlanIds = Object.keys(STRIPE_PRICE_MAP);
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

    const isSubscription = planIdVal.value.startsWith('sub_');
    const mode = isSubscription ? 'subscription' : 'payment';

    const successUrl = STRIPE_SUCCESS_URL || 'https://example.com/oxy/success';
    const cancelUrl = STRIPE_CANCEL_URL || 'https://example.com/oxy/cancel';

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
    res.status(500).json({ error: 'Errore durante la creazione della sessione di pagamento. Riprova più tardi.' });
  }
});

// GET /api/billing/status — stato abbonamento/lifetime per l'utente corrente
app.get('/api/billing/status', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query.idToken;
    const { uid } = await requireAuth(idToken);
    if (!uid) return res.status(401).json({ error: 'Token mancante o non valido' });
    const data = await readBilling(uid);
    if (!data) {
      // Trial auto-assegnata (se abilitata) — utile per go-live senza pagamenti immediati.
      // Importante: richiede OPENAI_API_KEY lato server, altrimenti non avrebbe senso.
      if (BILLING_TRIAL_ENABLED && OPENAI_API_KEY) {
        const ends = new Date(Date.now() + BILLING_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const planId = BILLING_TRIAL_PLAN_ID || 'sub_starter';
        await writeBilling(uid, {
          uid,
          planId,
          mode: 'subscription',
          status: 'trialing',
          trialEndsAt: ends,
          grantedBy: 'trial',
        });
        return res.json({
          active: true,
          status: 'trialing',
          planId,
          mode: 'subscription',
          trialEndsAt: ends,
        });
      }
      return res.json({
        active: false,
        status: 'none',
        planId: null,
        mode: null,
      });
    }
    const status = data.status || 'unknown';
    const mode = data.mode || (data.planId && String(data.planId).startsWith('sub_') ? 'subscription' : 'payment');
    // Regola:
    // - subscription → attivo se status === active o trialing
    // - payment (Lifetime/one-shot) → attivo se status === paid
    const active = mode === 'payment'
      ? status === 'paid'
      : computeSubscriptionActive(data);
    res.json({
      active,
      status,
      planId: data.planId || null,
      mode,
      ...(data.trialEndsAt ? { trialEndsAt: data.trialEndsAt } : {}),
    });
  } catch (e) {
    console.error('[Backend] GET /api/billing/status error:', e);
    res.status(500).json({ error: 'Errore durante la verifica dello stato abbonamento. Riprova più tardi.' });
  }
});

// POST /api/admin/grant-elite — solo Master: assegna abbonamento Elite a un utente (per test / proprietario)
// Body opzionale: { "uid": "..." }; se assente usa l'uid del token (così il Master si assegna Elite).
app.post('/api/admin/grant-elite', billingLimiter, async (req, res) => {
  try {
    const idToken = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.idToken;
    const { uid: bodyUid } = req.body || {};
    const { uid, email } = await requireAuth(idToken);
    if (!uid || !email) return res.status(401).json({ error: 'Token mancante o non valido' });
    if (!MASTER_EMAIL || email !== MASTER_EMAIL) {
      return res.status(403).json({ error: 'Solo il proprietario (Master) può usare questo endpoint.' });
    }
    const targetUid = typeof bodyUid === 'string' && bodyUid.trim() ? bodyUid.trim() : uid;
    await writeBilling(targetUid, {
      uid: targetUid,
      planId: 'sub_elite',
      mode: 'subscription',
      status: 'active',
      grantedBy: 'admin',
    });
    console.log('[Backend] Elite granted for uid:', targetUid);
    return res.json({ ok: true, planId: 'sub_elite', uid: targetUid });
  } catch (e) {
    console.error('[Backend] POST /api/admin/grant-elite error:', e);
    res.status(500).json({ error: 'Errore durante l\'assegnazione.' });
  }
});

// POST /api/billing/webhook — webhook Stripe per aggiornare lo stato abbonamento
app.post('/api/billing/webhook', async (req, res) => {
  try {
    const stripe = getStripe();
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
      const metadata = session.metadata || {};
      const uid = metadata.uid;
      const planId = metadata.planId;
      if (uid && planId) {
        const mode = session.mode || (planId.startsWith('sub_') ? 'subscription' : 'payment');
        const status = mode === 'subscription' ? 'active' : 'paid';
        await writeBilling(uid, {
          uid,
          planId,
          mode,
          status,
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null,
        });
      }
    } else if (type === 'customer.subscription.deleted' || type === 'customer.subscription.canceled') {
      const subscription = event.data?.object || {};
      const uid = subscription.metadata?.uid;
      if (uid) {
        const current = (await readBilling(uid)) || {};
        await writeBilling(uid, {
          ...current,
          uid,
          status: 'canceled',
          stripeSubscriptionId: subscription.id,
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
  await ensureMemoriesDir();
  await ensureDiaryDir();
  await ensureStoryStateDir();
   await ensureBillingDir();
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
