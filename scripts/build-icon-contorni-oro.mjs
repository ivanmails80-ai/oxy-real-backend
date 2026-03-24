/**
 * Icona definitiva: contorni bianchi/grigi → dorati come il simbolo.
 * Sfondo blu solido a tutta icona. Nessun bianco/grigio visibile.
 *
 * Uso: node scripts/build-icon-contorni-oro.mjs <percorso-immagine>
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

const APP_BG = { r: 10, g: 28, b: 55 };
const ORO = { r: 212, g: 175, b: 55 };

const inputPath = process.argv[2];
if (!inputPath || !existsSync(inputPath)) {
  console.error('Uso: node scripts/build-icon-contorni-oro.mjs <percorso-immagine>');
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
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const w = (r + g + b) / 3;
      if (w >= 130 || (r >= 140 && g >= 140 && b >= 140)) {
        data[i] = ORO.r;
        data[i + 1] = ORO.g;
        data[i + 2] = ORO.b;
      } else if (w >= 80 && w < 130 && !(b > r && b > g)) {
        data[i] = ORO.r;
        data[i + 1] = ORO.g;
        data[i + 2] = ORO.b;
      } else if (w >= 60 && w < 80 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
        data[i] = APP_BG.r;
        data[i + 1] = APP_BG.g;
        data[i + 2] = APP_BG.b;
      }
      data[i + 3] = 255;
    }
    return sharp(data, { raw: { width, height, channels } })
      .resize(SIZE, SIZE, { fit: 'fill' });
  })
  .then(img => img.raw().toBuffer({ resolveWithObject: true }))
  .then(({ data, info }) => {
    const { width: w, height: h, channels } = info;
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const w_ = (r + g + b) / 3;
      if (w_ >= 120 || (r > 110 && g > 110 && b > 110)) {
        data[i] = ORO.r;
        data[i + 1] = ORO.g;
        data[i + 2] = ORO.b;
      } else if (r <= 45 && g <= 45 && b <= 70) {
        data[i] = APP_BG.r;
        data[i + 1] = APP_BG.g;
        data[i + 2] = APP_BG.b;
      }
    }
    return sharp(data, { raw: { width: w, height: h, channels } });
  })
  .then(img =>
    Promise.all([
      img.clone().png().toFile(OUT_ICON),
      img.clone().resize(FAVICON_SIZE, FAVICON_SIZE).png().toFile(OUT_FAVICON)
    ])
  )
  .then(() => {
    console.log('Icona definitiva (contorni dorati, sfondo blu):', OUT_ICON);
    console.log('Favicon:', OUT_FAVICON);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
