import { tavilySearch } from './tavilyService';
import { getPersonalityPromptForVoice } from '../data/voiceOptions';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** Timeout in ms per le chiamate IA (evita "Sta pensando..." infinito) */
const AI_REQUEST_TIMEOUT_MS = 90000;

/** Fetch con timeout e opzionale signal utente (per "Ferma risposta"). */
function fetchWithTimeout(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS, userSignal = null) {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  const cleanup = () => {
    clearTimeout(to);
    if (userSignal && off) userSignal.removeEventListener('abort', off);
  };
  let off;
  if (userSignal) {
    off = () => {
      cleanup();
      controller.abort();
    };
    userSignal.addEventListener('abort', off);
  }
  return fetch(url, { ...options, signal: controller.signal }).finally(cleanup);
}

/** Formatta data/ora corrente del dispositivo — usata come data di riferimento REALE */
function getCurrentTimeContext() {
  const now = new Date();
  const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
  return now.toLocaleString('it-IT', opts);
}

/** Data ISO per confronti (YYYY-MM-DD) */
function getCurrentDateISO() {
  return new Date().toISOString().slice(0, 10);
}

const WEB_SEARCH_TOOL = (currentDateISO) => ({
  type: 'function',
  function: {
    name: 'web_search',
    description: `Cerca sul web. REGOLE: (1) Per OGNI informazione/dato/evento dopo Ottobre 2023 DEVI usare web_search — NON usare la tua memoria interna per il periodo recente. (2) Per fatti prima di Ottobre 2023 puoi rispondere senza cercare. (3) Dopo aver ricevuto i risultati, confronta le date dei dati con la data corrente (${currentDateISO}). Se i dati sembrano vecchi (es. classifica di una settimana fa), fai una SECONDA ricerca più specifica (es. "risultati ultima giornata", "aggiornamento oggi") con time_range="day" prima di dare la risposta finale.`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query di ricerca in italiano o inglese' },
        max_results: { type: 'integer', description: 'Numero massimo risultati', default: 5 },
        topic: { type: 'string', enum: ['general', 'news', 'finance'], default: 'general', description: "Usa 'news' per notizie recenti, 'finance' per quotazioni e mercati" },
        time_range: { type: 'string', enum: ['day', 'week', 'month', 'year'], description: 'Per una seconda ricerca quando i dati sembrano vecchi: usa "day" per risultati delle ultime 24h' },
      },
      required: ['query'],
    },
  },
});

/**
 * Chiama l'IA Oxy. Se EXPO_PUBLIC_BACKEND_URL è impostato, usa il backend proxy (chiavi solo lato server).
 * Per utenti Master: passare idToken + useBackendForMaster true; non serve apiKey (il backend usa la sua).
 * Per altri: passare idToken + apiKey (o solo apiKey se backend non usato).
 */
/** Messaggio lanciato quando l'utente interrompe la risposta (Ferma). */
export const ABORTED_MESSAGE = 'Risposta interrotta.';

export async function callOxyAi({
  apiKey,
  idToken,
  useBackendForMaster,
  userId,
  language,
  moduleName,
  userProfile,
  history,
  message,
  imageBase64,
  customAiName = 'Anima',
  voiceId,
  initialMessage = false,
  signal = null,
}) {
  const baseUrl = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '');
  const useBackend = !!baseUrl && (idToken || (apiKey && !useBackendForMaster));

  if (useBackend) {
    const nowStr = getCurrentTimeContext();
    const dateISO = getCurrentDateISO();
    const body = {
      idToken: idToken || undefined,
      apiKey: useBackendForMaster ? undefined : (apiKey || '').trim() || undefined,
      history: history || [],
      message: message || '',
      imageBase64: imageBase64 || undefined,
      language: language || 'it',
      moduleName: moduleName || 'default',
      customAiName: customAiName || 'Anima',
      voiceId: voiceId || undefined,
      userName: (userProfile?.nomeUtente || '').trim() || undefined,
      nowStr,
      dateISO,
      ...(initialMessage && { initialMessage: true }),
    };
    // Percorso identico al backend: POST /api/chat (con timeout e signal per Ferma)
    try {
      const res = await fetchWithTimeout(
        `${baseUrl}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        AI_REQUEST_TIMEOUT_MS,
        signal ?? undefined
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Errore server: ${res.status}`);
      if (!data?.answer) throw new Error('Risposta IA non valida');
      return { answer: data.answer };
    } catch (e) {
      if (e?.name === 'AbortError') throw new Error(ABORTED_MESSAGE);
      // Nessun fallback con chiave in app: la chiave deve restare solo sul server (backend)
      throw e;
    }
  }

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Oxy Key non configurata. Inserisci la tua chiave API nelle impostazioni.');
  }

  const messages = [];
  const nowStr = getCurrentTimeContext();
  const dateISO = getCurrentDateISO();

  const userName = (userProfile?.nomeUtente || '').trim();
  const nameLine = userName ? `\nL'utente si chiama ${userName}. Usa il suo nome quando appropriato (saluti, chiusure, tono personale).\n` : '';
  const personalityFragment = getPersonalityPromptForVoice(voiceId);
  const systemPersonality = `Sei ${customAiName} (Oxy), l'anima dell'App del Secolo creata da Ivan. Modello: gpt-4o.${personalityFragment ? ` ${personalityFragment}` : ' Personalità: amica/amico fidato.'}
${nameLine}
REGOLE: Amichevole e morbida nelle risposte. Niente raffiche di domande: capisci l'utente man mano che si scrive. Sincera ma con tatto; niente "Certamente" o "Sono qui per aiutarti". Parla come un amico vero. Basati sull'identità dell'utente. Memoria: ricorda ciò che impari, non chiedere di nuovo.

DATA E ORA: ${nowStr}. Data ISO: ${dateISO}. Per dati dopo Ottobre 2023 usa web_search. Lingua: ${language || 'it'}. Modulo: ${moduleName || 'default'}.`;
  messages.push({ role: 'system', content: systemPersonality });

  if (Array.isArray(history) && history.length > 0) {
    for (const m of history) {
      if (m.role === 'user' || m.role === 'assistant') {
        messages.push({ role: m.role, content: m.content || '' });
      }
    }
  }

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: message || 'Analizza questa immagine e, se è un documento o una lettera, genera una bozza di mail professionale. Altrimenti descrivi cosa vedi.' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: message });
  }

  const useTools = !imageBase64;
  const payload = {
    model: 'gpt-4o',
    messages,
    ...(useTools && { tools: [WEB_SEARCH_TOOL(dateISO)], tool_choice: 'auto' }),
  };

  let lastContent = null;
  let maxToolRounds = useTools ? 3 : 1;
  let round = 0;

  while (round < maxToolRounds) {
    let response;
    try {
      response = await fetchWithTimeout(
        OPENAI_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        },
        AI_REQUEST_TIMEOUT_MS,
        signal ?? undefined
      );
    } catch (e) {
      if (e?.name === 'AbortError') throw new Error(ABORTED_MESSAGE);
      throw e;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Errore IA: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json().catch(() => null);
    const choice = data?.choices?.[0];
    const msg = choice?.message;

    if (!msg) {
      throw new Error('Risposta IA non valida');
    }

    messages.push(msg);
    lastContent = msg.content;

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    for (const tc of toolCalls) {
      const fn = tc.function;
      if (fn?.name !== 'web_search') continue;

      let args = {};
      try {
        args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments || {};
      } catch (_) {}

      const { query, max_results = 5, topic = 'general', time_range } = args;
      const searchRes = await tavilySearch({
        query: query || message,
        maxResults: Math.min(Math.max(1, max_results), 10),
        topic,
        timeRange: time_range,
      });

      const toolContent = searchRes.error
        ? JSON.stringify({
            error: searchRes.error,
            userMessage: 'Ricerca web non configurata. Configura EXPO_PUBLIC_TAVILY_API_KEY (o usa il backend con Tavily) per risposte aggiornate.',
          })
        : JSON.stringify({ results: searchRes.results.map((r) => ({ title: r.title, url: r.url, content: r.content })) });

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: toolContent,
      });
    }

    round++;
  }

  const finalContent = typeof lastContent === 'string' ? lastContent : (lastContent && lastContent[0]?.text) || '';
  if (!finalContent) {
    throw new Error('Risposta IA non valida');
  }

  return { answer: finalContent };
}
