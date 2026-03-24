/**
 * Icona da anteprima.jpg con specifiche avanzate:
 * - Blu più profondo/vibrante (Midnight Blue) per contrasto con l'oro
 * - Oro pulito a gradiente fluido, senza crepe/sbavature
 * - Tratti più spessi (asta + cerchi) per leggibilità quando l'icona è piccola
 * - Blu a tutta icona, simbolo centrato con "respiro"
 *
 * Uso: node scripts/build-app-icon-v2.mjs
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
const SIZE = 1024;
const FAVICON_SIZE = 48;

// Midnight Blue più profondo e vibrante (fa risaltare l'oro)
const BLU_R = 10;
const BLU_G = 28;
const BLU_B = 55;

// Oro pulito: gradiente fluido (colore unico netto per "pulizia")
const ORO_TOP = { r: 212, g: 175, b: 55 };   // #d4af37
const ORO_BOTTOM = { r: 218, g: 185, b: 70 }; // leggermente più chiaro in basso

const DARK_THRESHOLD = 95;   // sotto questa somma R+G+B → blu
const GOLD_MIN_SUM = 180;    // sopra questa somma e giallo/oro → oro
const GOLD_R_MIN = 100;
const GOLD_G_MIN = 80;
const GOLD_B_MAX = 180;
const DILATE_RADIUS = 2;     // pixel di espansione per tratti più spessi
const SYMBOL_SCALE = 0.72;   // simbolo al 72% → più "respiro" sul blu

function isDark(r, g, b) {
  return r + g + b <= DARK_THRESHOLD;
}

function isGold(r, g, b) {
  if (r + g + b < GOLD_MIN_SUM) return false;
  if (r < GOLD_R_MIN || g < GOLD_G_MIN) return false;
  if (b > GOLD_B_MAX) return false;
  return r >= g * 0.7 && g >= b * 0.5;
}

function goldGradient(y, height) {
  const t = height > 1 ? y / (height - 1) : 0;
  return {
    r: Math.round(ORO_TOP.r + t * (ORO_BOTTOM.r - ORO_TOP.r)),
    g: Math.round(ORO_TOP.g + t * (ORO_BOTTOM.g - ORO_TOP.g)),
    b: Math.round(ORO_TOP.b + t * (ORO_BOTTOM.b - ORO_TOP.b))
  };
}

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
      const goldMask = new Uint8Array(width * height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * channels;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (isDark(r, g, b)) {
            data[i] = BLU_R;
            data[i + 1] = BLU_G;
            data[i + 2] = BLU_B;
          } else if (isGold(r, g, b)) {
            goldMask[y * width + x] = 1;
            const o = goldGradient(y, height);
            data[i] = o.r;
            data[i + 1] = o.g;
            data[i + 2] = o.b;
          }
        }
      }

      // Dilatazione: rendi oro leggermente più spesso (asta e cerchi più spessi)
      const dilated = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (goldMask[y * width + x]) {
            dilated[y * width + x] = 1;
            continue;
          }
          let found = 0;
          for (let dy = -DILATE_RADIUS; dy <= DILATE_RADIUS && !found; dy++) {
            for (let dx = -DILATE_RADIUS; dx <= DILATE_RADIUS && !found; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width && goldMask[ny * width + nx])
                found = 1;
            }
          }
          dilated[y * width + x] = found;
        }
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!dilated[y * width + x]) continue;
          const i = (y * width + x) * channels;
          const o = goldGradient(y, height);
          data[i] = o.r;
          data[i + 1] = o.g;
          data[i + 2] = o.b;
        }
      }

      return sharp(data, { raw: { width, height, channels } });
    })
    .then(img => img.blur(0.35))
    .then(img => img.sharpen({ sigma: 0.5, m1: 1, m2: 0.6 }))
    .then(img => img.png().toBuffer())
    .then(pngBuf => {
      const pad = Math.round((SIZE - SIZE * SYMBOL_SCALE) / 2);
      const symbolSize = Math.round(SIZE * SYMBOL_SCALE);
      const blueBg = { r: BLU_R, g: BLU_G, b: BLU_B };

      return sharp(pngBuf)
        .resize(symbolSize, symbolSize, { fit: 'contain', background: blueBg })
        .toBuffer()
        .then(symbolBuf =>
          sharp({
            create: {
              width: SIZE,
              height: SIZE,
              channels: 4,
              background: { ...blueBg, alpha: 1 }
            }
          })
            .png()
            .toBuffer()
            .then(bgBuf =>
              sharp(bgBuf)
                .composite([{ input: symbolBuf, left: pad, top: pad }])
                .toBuffer()
            )
        );
    })
    .then(iconBuf =>
      Promise.all([
        sharp(iconBuf).toFile(OUT_ICON),
        sharp(iconBuf).resize(FAVICON_SIZE, FAVICON_SIZE).toFile(OUT_FAVICON)
      ])
    )
    .then(() => {
      console.log('Icona v2 generata (Midnight Blue, oro pulito, tratti spessi, respiro):', OUT_ICON);
      console.log('Favicon:', OUT_FAVICON);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

main();
