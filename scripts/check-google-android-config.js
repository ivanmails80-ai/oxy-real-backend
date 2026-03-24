/**
 * Verifica che il config Expo includa EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in extra
 * (come farà createExpoConfig durante la build Android).
 * Eseguire prima di gradlew assembleRelease per essere certi che il login Google sull'APK funzioni.
 * Uso: node scripts/check-google-android-config.js
 */
const path = require('path');
const projectRoot = path.resolve(__dirname, '..');
require('@expo/env').load(projectRoot);
const { getConfig } = require('@expo/config');
const { exp } = getConfig(projectRoot, { isPublicConfig: true, skipSDKVersionRequirement: true });
const extra = exp.extra || {};
const androidId = extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
if (!androidId || !String(androidId).trim()) {
  console.error('ERRORE: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID non presente in app config extra.');
  console.error('Verifica che .env contenga EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID e che app.config.js esponga extra.');
  process.exit(1);
}
console.log('OK: Google Android Client ID presente nel config (extra). Puoi procedere con la build APK.');
