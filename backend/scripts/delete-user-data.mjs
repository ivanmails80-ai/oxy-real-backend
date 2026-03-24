#!/usr/bin/env node
/**
 * Script per cancellare un utente da Firebase Auth e tutti i suoi dati sul backend
 * (chat, billing, memoria, diario, storie, usage, credits).
 * Così puoi riusare la stessa email per testare l'app.
 *
 * Uso: dalla cartella backend/
 *   node scripts/delete-user-data.mjs <email>
 * oppure
 *   node scripts/delete-user-data.mjs <uid>
 *
 * Richiede: .env con GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON (come il server).
 */

import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, '..');

const ENV_DATA_ROOT = (process.env.DATA_ROOT || '').trim();
const DATA_ROOT = ENV_DATA_ROOT || path.join(BACKEND_ROOT, 'data');

const DATA_DIR = path.join(DATA_ROOT, 'chats');
const MEMORIES_DIR = path.join(DATA_ROOT, 'memories');
const DIARY_DIR = path.join(DATA_ROOT, 'diary');
const STORY_STATE_DIR = path.join(DATA_ROOT, 'storyState');
const BILLING_DIR = path.join(DATA_ROOT, 'billing');
const USAGE_DIR = path.join(DATA_ROOT, 'usage');
const CREDITS_DIR = path.join(DATA_ROOT, 'credits');
const USERS_DIR = path.join(DATA_ROOT, 'users');

function safeUid(uid) {
  return (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function main() {
  const input = process.argv[2];
  if (!input || !input.trim()) {
    console.error('Uso: node scripts/delete-user-data.mjs <email|uid>');
    process.exit(1);
  }
  const emailOrUid = input.trim();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error('Imposta GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON in .env');
    process.exit(1);
  }

  try {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const key = JSON.parse(
          Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, 'base64').toString()
        );
        admin.initializeApp({ credential: admin.credential.cert(key) });
      } else {
        admin.initializeApp();
      }
    }

    let uid = null;
    if (emailOrUid.includes('@')) {
      const userRecord = await admin.auth().getUserByEmail(emailOrUid.toLowerCase());
      uid = userRecord?.uid || null;
      if (!uid) {
        console.error('Nessun utente trovato con email:', emailOrUid);
        process.exit(1);
      }
      console.log('Utente trovato:', uid, userRecord.email);
    } else {
      uid = emailOrUid;
    }

    await admin.auth().deleteUser(uid);
    console.log('Firebase Auth: utente eliminato');

    const safe = safeUid(uid);
    const filesToTry = [
      [DATA_DIR, `${safe}.json`],
      [MEMORIES_DIR, `${safe}.json`],
      [BILLING_DIR, `${safe}.json`],
      [DIARY_DIR, `${safe}.json`],
      [STORY_STATE_DIR, `${safe}.json`],
      [CREDITS_DIR, `${safe}.json`],
      [USERS_DIR, `${safe}.json`],
    ];
    for (const [dir, file] of filesToTry) {
      const p = path.join(dir, file);
      try {
        await fs.unlink(p);
        console.log('Eliminato:', path.basename(dir) + '/' + file);
      } catch (_) {}
    }

    try {
      const usageFiles = await fs.readdir(USAGE_DIR);
      for (const f of usageFiles) {
        if (f.endsWith(`_${safe}.json`)) {
          await fs.unlink(path.join(USAGE_DIR, f));
          console.log('Eliminato: usage/' + f);
        }
      }
    } catch (_) {}

    console.log('Fatto. Puoi riregistrarti con la stessa email.');
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      console.error('Utente non trovato in Firebase Auth.');
      process.exit(1);
    }
    console.error(e?.message || e);
    process.exit(1);
  }
}

main();
