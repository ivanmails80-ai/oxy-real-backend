#!/usr/bin/env node
/**
 * Cancella TUTTI gli utenti Firebase Auth (e i relativi dati su backend: chat, billing, memoria, ecc.).
 * Utile per ripartire da zero (test, pre go-live).
 *
 * Uso: dalla cartella backend/
 *   node scripts/delete-all-users.mjs
 *   node scripts/delete-all-users.mjs --confirm
 *
 * Se in .env è impostato MASTER_EMAIL, quell'account NON viene cancellato.
 * Senza --confirm lo script elenca solo gli utenti e non cancella.
 *
 * Richiede: .env con GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON.
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

const MASTER_EMAIL = (process.env.MASTER_EMAIL || '').trim().toLowerCase();

function safeUid(uid) {
  return (uid || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function deleteUserDataFiles(uid) {
  const safe = safeUid(uid);
  const filesToTry = [
    [DATA_DIR, `${safe}.json`],
    [MEMORIES_DIR, `${safe}.json`],
    [BILLING_DIR, `${safe}.json`],
    [DIARY_DIR, `${safe}.json`],
    [STORY_STATE_DIR, `${safe}.json`],
    [CREDITS_DIR, `${safe}.json`],
  ];
  for (const [dir, file] of filesToTry) {
    const p = path.join(dir, file);
    try {
      await fs.unlink(p);
    } catch (_) {}
  }
  try {
    const usageFiles = await fs.readdir(USAGE_DIR);
    for (const f of usageFiles) {
      if (f.endsWith(`_${safe}.json`)) {
        await fs.unlink(path.join(USAGE_DIR, f));
      }
    }
  } catch (_) {}
}

async function main() {
  const confirm = process.argv.includes('--confirm');
  if (!confirm) {
    console.log('Modalità DRY-RUN: verranno solo elencati gli utenti. Per cancellare davvero: node scripts/delete-all-users.mjs --confirm');
  }

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

    const toDelete = [];
    let pageToken;
    do {
      const listResult = await admin.auth().listUsers(1000, pageToken);
      for (const u of listResult.users) {
        const email = (u.email || '').toLowerCase();
        if (MASTER_EMAIL && email === MASTER_EMAIL) {
          console.log('Salto (Master):', u.uid, u.email);
          continue;
        }
        toDelete.push({ uid: u.uid, email: u.email || u.uid });
      }
      pageToken = listResult.pageToken;
    } while (pageToken);

    console.log('Utenti da cancellare:', toDelete.length);
    if (toDelete.length === 0) {
      console.log('Nessun utente da cancellare.');
      process.exit(0);
    }

    if (!confirm) {
      toDelete.forEach((u, i) => console.log(`  ${i + 1}. ${u.email || u.uid} (${u.uid})`));
      console.log('\nEsegui con --confirm per cancellarli.');
      process.exit(0);
    }

    let ok = 0;
    let err = 0;
    for (const u of toDelete) {
      try {
        await admin.auth().deleteUser(u.uid);
        await deleteUserDataFiles(u.uid);
        console.log('Eliminato:', u.email || u.uid, u.uid);
        ok++;
      } catch (e) {
        if (e?.code === 'auth/user-not-found') {
          await deleteUserDataFiles(u.uid);
          ok++;
        } else {
          console.error('Errore', u.uid, e?.message || e);
          err++;
        }
      }
    }
    console.log('\nFatto. Eliminati:', ok, 'Errori:', err);
  } catch (e) {
    console.error(e?.message || e);
    process.exit(1);
  }
}

main();
