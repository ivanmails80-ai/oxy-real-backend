/**
 * Adatta un'immagine sorgente (es. icona 3D generata) a icon.png e favicon.png.
 * Ritaglia la parte centrale senza cornice (INSET elimina i bordi), poi ridimensiona.
 *
 * Uso: node scripts/build-icon-from-source.mjs <percorso-immagine> [inset%]
 *      inset% opzionale (default 14): percentuale da tagliare da ogni lato → solo centro senza cornice
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
const INSET_PERCENT = Math.min(45, Math.max(0, parseInt(process.argv[3], 10) || 32)) / 100;

const inputPath = process.argv[2];
if (!inputPath || !existsSync(inputPath)) {
  console.error('Uso: node scripts/build-icon-from-source.mjs <percorso-immagine> [inset%]');
  console.error('File non trovato:', inputPath || '(non specificato)');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const buf = readFileSync(inputPath);

sharp(buf)
  .metadata()
  .then(({ width, height }) => {
    const w = width || 1;
    const h = height || 1;
    const left = Math.round(w * INSET_PERCENT);
    const top = Math.round(h * INSET_PERCENT);
    const cropW = Math.max(1, w - 2 * left);
    const cropH = Math.max(1, h - 2 * top);
    return sharp(buf)
      .extract({ left, top, width: cropW, height: cropH })
      .resize(SIZE, SIZE, { fit: 'fill' })
      .png()
      .toFile(OUT_ICON)
      .then(() =>
        sharp(buf)
          .extract({ left, top, width: cropW, height: cropH })
          .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'fill' })
          .png()
          .toFile(OUT_FAVICON)
      );
  })
  .then(() => {
    console.log('Icona generata (senza cornice):', OUT_ICON, `(${SIZE}x${SIZE})`);
    console.log('Favicon generato:', OUT_FAVICON, `(${FAVICON_SIZE}x${FAVICON_SIZE})`);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
