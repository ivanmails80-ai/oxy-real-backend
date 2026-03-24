/**
 * Usa l'immagine allegata come icona definitiva.
 * Solo modifica: sostituisce bianco e margini chiari con il blu dell'icona,
 * così sul telefono non si vedono margini bianchi. Il resto dell'immagine non viene toccato.
 *
 * Uso: node scripts/build-icon-definitiva-senza-margini.mjs <percorso-immagine>
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
  console.error('Uso: node scripts/build-icon-definitiva-senza-margini.mjs <percorso-immagine>');
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
    let br = 0, bg = 0, bb = 0, n = 0;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r < 80 && g < 80 && b > 40 && b < 120) {
        br += r; bg += g; bb += b; n++;
      }
    }
    const BLU = n > 0
      ? { r: Math.round(br / n), g: Math.round(bg / n), b: Math.round(bb / n) }
      : { r: 12, g: 30, b: 58 };
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const chiaro = (r + g + b) / 3 >= 195 || (r >= 185 && g >= 185 && b >= 185);
      if (chiaro) {
        data[i] = BLU.r;
        data[i + 1] = BLU.g;
        data[i + 2] = BLU.b;
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
    console.log('Icona definitiva (solo margini bianchi → blu):', OUT_ICON);
    console.log('Favicon:', OUT_FAVICON);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
