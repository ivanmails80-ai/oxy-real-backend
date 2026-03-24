/**
 * Copia l'immagine come icona SENZA modificare nulla: solo ridimensionamento.
 * Nessun tocco a pixel, colori o bordi — niente sgranatura.
 *
 * Uso: node scripts/build-icon-copia-senza-modifiche.mjs <percorso-immagine>
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'assets');
const OUT_ICON = join(OUT_DIR, 'icon.png');
const OUT_FAVICON = join(OUT_DIR, 'favicon.png');
const SIZE = 1024;
const FAVICON_SIZE = 48;

const inputPath = process.argv[2];
if (!inputPath || !existsSync(inputPath)) {
  console.error('Uso: node scripts/build-icon-copia-senza-modifiche.mjs <percorso-immagine>');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const buf = readFileSync(inputPath);

sharp(buf)
  .resize(SIZE, SIZE, { fit: 'fill' })
  .png()
  .toFile(OUT_ICON)
  .then(() =>
    sharp(buf)
      .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'fill' })
      .png()
      .toFile(OUT_FAVICON)
  )
  .then(() => {
    console.log('Icona salvata senza modifiche:', OUT_ICON);
    console.log('Favicon:', OUT_FAVICON);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
