/**
 * Preflight prima di una release APK con Google Sign-In.
 * Verifica: config Google Android, variabili Firebase, intent-filter redirect in AndroidManifest.
 * Stampa anche il passo MANUALE obbligatorio: abilitare Google in Firebase Console.
 * Uso: node scripts/preflight-google-release.js
 */
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
let hasError = false;

function fail(msg) {
  console.error(msg);
  hasError = true;
}

function ok(msg) {
  console.log('OK:', msg);
}

// 1) Carica .env e config Expo
require('@expo/env').load(projectRoot);
const { getConfig } = require('@expo/config');
const { exp } = getConfig(projectRoot, { isPublicConfig: true, skipSDKVersionRequirement: true });
const extra = exp.extra || {};

// 2) Google Android Client ID in extra
const androidClientId = extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
if (!androidClientId || !String(androidClientId).trim()) {
  fail('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID non presente in app config (extra). Verifica .env e app.config.js.');
} else {
  ok('Google Android Client ID presente nel config.');
}

// 3) Firebase: almeno apiKey e projectId (da extra o da env caricato da @expo/env)
const firebaseApiKey = extra.firebase?.apiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const firebaseProjectId = extra.firebase?.projectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (!firebaseApiKey || firebaseApiKey.length < 20) {
  fail('Firebase API key non configurata (extra.firebase o EXPO_PUBLIC_FIREBASE_API_KEY).');
} else {
  ok('Firebase API key presente.');
}
if (!firebaseProjectId || !String(firebaseProjectId).trim()) {
  fail('Firebase projectId non configurato.');
} else {
  ok('Firebase projectId: ' + firebaseProjectId);
}

// 4) AndroidManifest: intent-filter per com.oxyreal.app /oauthredirect
const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) {
  fail('AndroidManifest.xml non trovato in android/app/src/main/.');
} else {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const hasScheme = manifest.includes('android:scheme="com.oxyreal.app"');
  const hasPath = manifest.includes('android:pathPrefix="/oauthredirect"');
  if (!hasScheme || !hasPath) {
    fail('AndroidManifest: manca intent-filter per com.oxyreal.app con pathPrefix /oauthredirect (redirect Google OAuth).');
  } else {
    ok('AndroidManifest: intent-filter redirect Google presente.');
  }
}

console.log('');
console.log('--- VERIFICA MANUALE OBBLIGATORIA ---');
console.log('Firebase Console → Authentication → Sign-in method → Google deve essere ABILITATO.');
console.log('Altrimenti vedrai: auth/operation-not-allowed (identity provider configuration is not found).');
console.log('Vedi: docs/GOOGLE_SIGNIN_APK_CHECKLIST.md');
console.log('');

if (hasError) {
  process.exit(1);
}
console.log('Preflight completato. Esegui build APK e, se non l\'hai già fatto, abilita Google in Firebase.');
process.exit(0);
