/**
 * Genera un QR code da scansionare con Expo Go.
 * Lancia prima "npm start" (expo start) in un altro terminale, poi esegui: npm run expo:qr
 * Il file expo-qr.png viene salvato nella root del progetto.
 */

import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const defaultPort = 8081;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const port = process.env.EXPO_DEVTOOLS_LISTEN_PORT || process.env.PORT || defaultPort;
const ip = getLocalIP();
const expUrl = `exp://${ip}:${port}`;

let QRCode;
try {
  QRCode = (await import('qrcode')).default;
} catch {
  console.error('Installa la dipendenza: npm install --save-dev qrcode');
  process.exit(1);
}

const outPath = path.join(projectRoot, 'expo-qr.png');
await QRCode.toFile(outPath, expUrl, { width: 400, margin: 2 });

console.log('\n  QR code salvato in: expo-qr.png\n');
console.log('  URL Expo:', expUrl);
console.log('\n  Passi:');
console.log('  1. Avvia il server in un altro terminale:  npm start');
console.log('  2. Apri expo-qr.png su questo PC (o stampalo).');
console.log('  3. Scansiona il QR con l\'app Expo Go sul telefono (stesso Wi‑Fi).\n');
