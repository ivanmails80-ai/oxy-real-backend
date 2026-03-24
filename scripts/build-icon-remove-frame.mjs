/**
 * Icona a tutta superficie: niente bianco, niente trasparenza.
 * Lo sfondo bianco viene sostituito con il blu dell'app (#002b4d). Logo a tutta icona per cellulare.
 *
 * Uso: node scripts/build-icon-remove-frame.mjs <percorso-immagine>
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

// Blu: dove c'era bianco/grigio mettiamo questo (nessuna trasparenza)
// Midnight Blue per abbinare l'icona che piace all'utente
const APP_BG = { r: 10, g: 28, b: 55 };

const WHITE_LO = 200;
const WHITE_HI = 248;

function blendWhiteToBg(r, g, b) {
  const w = (r + g + b) / 3;
  if (w >= WHITE_HI) return { r: APP_BG.r, g: APP_BG.g, b: APP_BG.b, mix: 0 };
  if (w <= WHITE_LO) return null;
  const mix = (WHITE_HI - w) / (WHITE_HI - WHITE_LO);
  return {
    r: Math.round(r * mix + APP_BG.r * (1 - mix)),
    g: Math.round(g * mix + APP_BG.g * (1 - mix)),
    b: Math.round(b * mix + APP_BG.b * (1 - mix)),
    mix
  };
}

const inputPath = process.argv[2];
if (!inputPath || !existsSync(inputPath)) {
  console.error('Uso: node scripts/build-icon-remove-frame.mjs <percorso-immagine>');
  process.exit(1);
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const buf = readFileSync(inputPath);

sharp(buf)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    const { width, height, channels } = info;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const replaced = blendWhiteToBg(r, g, b);
      if (replaced) {
        data[i] = replaced.r;
        data[i + 1] = replaced.g;
        data[i + 2] = replaced.b;
      }
      data[i + 3] = 255;
    }
    return sharp(data, { raw: { width, height, channels } });
  })
  .then(img =>
    Promise.all([
      img.clone().resize(SIZE, SIZE, { fit: 'fill' }).png().toFile(OUT_ICON),
      img.clone().resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'fill' }).png().toFile(OUT_FAVICON)
    ])
  )
  .then(() => {
    console.log('Icona a tutta superficie (blu #002b4d, niente bianco/trasparenza):', OUT_ICON);
    console.log('Favicon:', OUT_FAVICON);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
