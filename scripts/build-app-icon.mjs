/**
 * Genera icon.png per l'app da anteprima.jpg:
 * - Sostituisce lo sfondo nero con il colore dell'app (#002b4d)
 * - Applica un leggero blur per forme più morbide e armoniose
 * - Output: assets/icon.png 1024x1024
 *
 * Uso: node scripts/build-app-icon.mjs
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INPUT = join(ROOT, 'anteprima.jpg');
const OUT_DIR = join(ROOT, 'assets');
const OUT_ICON = join(OUT_DIR, 'icon.png');
const OUT_FAVICON = join(OUT_DIR, 'favicon.png');
const APP_BG = { r: 0, g: 43, b: 77 }; // #002b4d
const DARK_THRESHOLD = 90; // pixel con R+G+B sotto questa soglia → sfondo app
const BLUR_SIGMA = 0.8;   // ammorbidisce le forme
const SIZE = 1024;

function main() {
  if (!existsSync(INPUT)) {
    console.error('File non trovato:', INPUT);
    process.exit(1);
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const buf = readFileSync(INPUT);
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
        const sum = r + g + b;
        if (sum <= DARK_THRESHOLD) {
          data[i] = APP_BG.r;
          data[i + 1] = APP_BG.g;
          data[i + 2] = APP_BG.b;
          // alpha invariato
        }
      }
      return sharp(data, {
        raw: { width, height, channels }
      });
    })
    .then(img => img.blur(BLUR_SIGMA))
    .then(img => Promise.all([
      img.clone().resize(SIZE, SIZE).png().toFile(OUT_ICON),
      img.clone().resize(48, 48).png().toFile(OUT_FAVICON)
    ]))
    .then(() => {
      console.log('Icona generata:', OUT_ICON, `(${SIZE}x${SIZE})`);
      console.log('Favicon generato:', OUT_FAVICON, '(48x48)');
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

main();
