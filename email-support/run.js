#!/usr/bin/env node
/**
 * Assistente email OXY Real: legge da IMAP, capisce la problematica, genera risposta con OpenAI.
 * Uso: npm start (loop ogni N min) | npm run run-once | node run.js --check
 */

import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const POLL_INTERVAL_MS = Math.max(60_000, parseInt(process.env.POLL_INTERVAL_MS || '300000', 10)); // default 5 min
const RUN_ONCE = process.argv.includes('--once');
const CHECK_ONLY = process.argv.includes('--check');

const env = {
  imap: {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_USE_TLS !== 'false',
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASSWORD },
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  },
  openaiKey: process.env.OPENAI_API_KEY,
  sendReplies: process.env.SEND_REPLIES === 'true',
  fromAddress: process.env.SUPPORT_FROM_EMAIL || process.env.IMAP_USER || 'support@oxyreal.app',
  replyToFolder: process.env.REPLY_OUTPUT_DIR || join(__dirname, 'replies'),
};

function loadKnowledge() {
  const path = join(__dirname, 'knowledge', 'support-knowledge.md');
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    console.error('Errore lettura knowledge:', e.message);
    return '';
  }
}

const systemPrompt = (knowledge) => `Sei l'assistente del supporto email di OXY Real. Rispondi alle email degli utenti che hanno problemi o domande sull'app OXY Real.

Istruzioni:
- Usa SOLO le informazioni contenute nel seguente documento di conoscenza per rispondere. Non inventare funzionalità o procedure.
- Rispondi nella STESSA LINGUA in cui l'utente ha scritto (italiano, inglese, ecc.).
- Sii preciso, utile e professionale. Evita risposte generiche: identifica il tipo di problematica (login, pagamento, chat, Memory Vault, Oxy Key, notifiche, ecc.) e fornisci passi concreti.
- Firma come "Il team di supporto OXY Real" (o equivalente nella lingua della risposta).
- Se servono più dettagli per aiutare (messaggio di errore, dispositivo, versione app), chiedili con gentilezza.
- Non dare istruzioni su backend, .env o codice; per questioni tecniche invita a contattare il team con i dettagli.

DOCUMENTO DI CONOSCENZA (OXY Real - problematiche e FAQ supporto):
---
${knowledge}
---`;

async function fetchUnreadEmails(client) {
  const messages = [];
  let lock;
  try {
    lock = await client.getMailboxLock('INBOX');
    const list = await client.fetchAll({ seen: false }, { envelope: true, source: true });
    for (const msg of list) {
      const parsed = await simpleParser(msg.source);
      const text = parsed.text || (parsed.html && parsed.html.replace(/<[^>]+>/g, ' ')) || '';
      messages.push({
        uid: msg.uid,
        from: parsed.from?.text || (msg.envelope.from?.[0] && msg.envelope.from[0].address) || '',
        to: parsed.to?.text || '',
        subject: parsed.subject || '(nessun oggetto)',
        date: parsed.date,
        text: text.slice(0, 15000),
        parsed,
      });
    }
  } finally {
    if (lock) lock.release();
  }
  return messages;
}

async function generateReply(openai, knowledge, email) {
  const userContent = `Email ricevuta da un utente da rispondere.

Da: ${email.from}
Oggetto: ${email.subject}
Data: ${email.date}

Corpo del messaggio:
---
${email.text}
---`;

  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt(knowledge) },
      { role: 'user', content: userContent },
    ],
    max_tokens: 1500,
  });

  const reply = res.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('OpenAI non ha restituito testo');
  return reply;
}

async function sendOrSaveReply(email, replyBody) {
  const subject = (email.subject || '').match(/^Re:/i) ? email.subject : `Re: ${email.subject}`;

  if (env.sendReplies && env.smtp.host) {
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.auth,
    });
    await transporter.sendMail({
      from: env.fromAddress,
      to: email.from,
      replyTo: env.fromAddress,
      subject,
      text: replyBody,
    });
    console.log('Inviata risposta a:', email.from);
  } else {
    const { mkdirSync, writeFileSync } = await import('fs');
    try { mkdirSync(env.replyToFolder, { recursive: true }); } catch (_) {}
    const safeFrom = (email.from || 'unknown').replace(/[^a-zA-Z0-9@._-]/g, '_').slice(0, 50);
    const filename = `reply_${Date.now()}_${safeFrom}.txt`;
    const path = join(env.replyToFolder, filename);
    writeFileSync(path, `To: ${email.from}\nSubject: ${subject}\n\n${replyBody}`, 'utf8');
    console.log('Risposta salvata in:', path);
  }
}

async function markAsSeen(client, uid) {
  let lock;
  try {
    lock = await client.getMailboxLock('INBOX');
    await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
  } finally {
    if (lock) lock.release();
  }
}

async function processInbox() {
  if (!env.imap.host || !env.imap.auth?.user || !env.imap.auth?.pass) {
    console.error('Configura IMAP_HOST, IMAP_USER, IMAP_PASSWORD in .env');
    process.exitCode = 1;
    return;
  }
  if (!env.openaiKey) {
    console.error('Configura OPENAI_API_KEY in .env');
    process.exitCode = 1;
    return;
  }

  const knowledge = loadKnowledge();
  const openai = new OpenAI({ apiKey: env.openaiKey });

  const client = new ImapFlow({
    host: env.imap.host,
    port: env.imap.port,
    secure: env.imap.secure,
    auth: env.imap.auth,
    logger: false,
  });

  await client.connect();
  try {
    const emails = await fetchUnreadEmails(client);
    console.log('Email non lette:', emails.length);

    for (const email of emails) {
      try {
        const reply = await generateReply(openai, knowledge, email);
        await sendOrSaveReply(email, reply);
        await markAsSeen(client, email.uid);
      } catch (err) {
        console.error('Errore elaborazione email da', email.from, err.message);
      }
    }
  } finally {
    await client.logout();
  }
}

async function checkConfig() {
  console.log('Controllo configurazione...');
  if (!env.imap.host || !env.imap.auth?.user) {
    console.log('IMAP: mancano IMAP_HOST / IMAP_USER');
  } else {
    console.log('IMAP: host=', env.imap.host, 'user=', env.imap.auth.user);
  }
  if (!env.openaiKey) console.log('OPENAI_API_KEY: non impostata');
  else console.log('OPENAI_API_KEY: impostata');
  if (env.sendReplies && env.smtp.host) console.log('Invio risposte: abilitato (SMTP)', env.smtp.host);
  else console.log('Invio risposte: disabilitato (le risposte vengono salvate in', env.replyToFolder, ')');

  const client = new ImapFlow({
    host: env.imap.host,
    port: env.imap.port,
    secure: env.imap.secure,
    auth: env.imap.auth,
    logger: false,
  });
  try {
    await client.connect();
    console.log('Connessione IMAP: OK');
    await client.logout();
  } catch (e) {
    console.error('Connessione IMAP fallita:', e.message);
  }
}

async function main() {
  if (CHECK_ONLY) {
    await checkConfig();
    return;
  }

  do {
    try {
      await processInbox();
    } catch (err) {
      console.error('Errore:', err.message);
    }
    if (RUN_ONCE) break;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  } while (!RUN_ONCE);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
