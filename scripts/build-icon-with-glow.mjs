/**
 * Icona con glow sul simbolo oro e oro più luminoso.
 * - Sostituisce bianco/grigio con Midnight Blue
 * - Oro più brillante e leggermente più saturo
 * - Alone morbido (glow) attorno al simbolo dorato
 *
 * Uso: node scripts/build-icon-with-glow.mjs <percorso-immagine>
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
const WHITE_LO = 200;
const WHITE_HI = 248;
const GOLD_BRIGHTEN = 1.22;
const GOLD_SATURATE = 1.12;
const GLOW_SIGMA = 22;
const GLOW_COLOR = { r: 255, g: 228, b: 170 };
const GLOW_MAX_ALPHA = 0.5;

function blendWhiteToBg(r, g, b) {
  const w = (r + g + b) / 3;
  if (w >= WHITE_HI) return { r: APP_BG.r, g: APP_BG.g, b: APP_BG.b };
  if (w <= WHITE_LO) return null;
  const mix = (WHITE_HI - w) / (WHITE_HI - WHITE_LO);
  return {
    r: Math.round(r * mix + APP_BG.r * (1 - mix)),
    g: Math.round(g * mix + APP_BG.g * (1 - mix)),
    b: Math.round(b * mix + APP_BG.b * (1 - mix))
  };
}

function isGold(r, g, b) {
  if (r + g + b < 260) return false;
  if (r < 90 || g < 70) return false;
  if (b > 200) return false;
  return r >= g * 0.6 && g >= b * 0.4;
}

function brightenGold(r, g, b) {
  const L = (r + g + b) / 3;
  const scale = GOLD_BRIGHTEN;
  let nr = Math.min(255, Math.round(r * scale));
  let ng = Math.min(255, Math.round(g * scale));
  let nb = Math.min(255, Math.round(b * scale));
  const nL = (nr + ng + nb) / 3;
  const sat = GOLD_SATURATE;
  nr = Math.min(255, Math.round(nL + (nr - nL) * sat));
  ng = Math.min(255, Math.round(nL + (ng - nL) * sat));
  nb = Math.min(255, Math.round(nL + (nb - nL) * sat));
  return { r: nr, g: ng, b: nb };
}

const inputPath = process.argv[2];
if (!inputPath || !existsSync(inputPath)) {
  console.error('Uso: node scripts/build-icon-with-glow.mjs <percorso-immagine>');
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
      const bg = blendWhiteToBg(r, g, b);
      if (bg) {
        data[i] = bg.r;
        data[i + 1] = bg.g;
        data[i + 2] = bg.b;
      } else if (isGold(r, g, b)) {
        const o = brightenGold(r, g, b);
        data[i] = o.r;
        data[i + 1] = o.g;
        data[i + 2] = o.b;
      }
      data[i + 3] = 255;
    }
    return sharp(data, { raw: { width, height, channels } })
      .resize(SIZE, SIZE, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  })
  .then(({ data, info }) => {
    const { width, height, channels } = info;
    const w = width, h = height;
    const goldMask = Buffer.alloc(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * channels;
        goldMask[y * w + x] = isGold(data[i], data[i + 1], data[i + 2]) ? 255 : 0;
      }
    }
    return sharp(goldMask, { raw: { width: w, height: h, channels: 1 } })
      .blur(GLOW_SIGMA)
      .raw()
      .toBuffer()
      .then(blurred => ({ data, info, goldMask: blurred, w, h, channels }));
  })
  .then(({ data, info, goldMask, w, h, channels }) => {
    const glowPixels = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const a = Math.round((goldMask[i] / 255) * GLOW_MAX_ALPHA * 255);
      glowPixels[i * 4] = GLOW_COLOR.r;
      glowPixels[i * 4 + 1] = GLOW_COLOR.g;
      glowPixels[i * 4 + 2] = GLOW_COLOR.b;
      glowPixels[i * 4 + 3] = a;
    }
    const glowImg = sharp(glowPixels, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const baseImg = sharp(data, { raw: { width: w, height: h, channels } }).png().toBuffer();
    return Promise.all([baseImg, glowImg]);
  })
  .then(([basePng, glowPng]) =>
    sharp(basePng).composite([{ input: glowPng, blend: 'over' }]).toBuffer()
  )
  .then(iconBuf => sharp(iconBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }))
  .then(({ data, info }) => {
    const { width: w, height: h, channels } = info;
    const foregroundAlpha = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const j = i * channels;
      const r = data[j], g = data[j + 1], b = data[j + 2];
      const isGlow = r > 95 && g > 80 && r + g + b > 280;
      const isFg = isGold(r, g, b) || isGlow;
      foregroundAlpha[i * 4] = data[j];
      foregroundAlpha[i * 4 + 1] = data[j + 1];
      foregroundAlpha[i * 4 + 2] = data[j + 2];
      foregroundAlpha[i * 4 + 3] = isFg ? 255 : 0;
    }
    return { foregroundAlpha, w, h };
  })
  .then(({ foregroundAlpha, w, h }) => {
    const foregroundPng = sharp(foregroundAlpha, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const solidBg = sharp({
      create: { width: w, height: h, channels: 3, background: APP_BG }
    }).png().toBuffer();
    return Promise.all([solidBg, foregroundPng]);
  })
  .then(([bgPng, fgPng]) =>
    sharp(bgPng).composite([{ input: fgPng, blend: 'over' }]).toBuffer()
  )
  .then(iconBuf => {
    const w = SIZE, h = SIZE;
    const gloss = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) {
      const t = 1 - y / h;
      const a = Math.round(22 * Math.max(0, t) * t);
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        gloss[i] = 255;
        gloss[i + 1] = 255;
        gloss[i + 2] = 255;
        gloss[i + 3] = a;
      }
    }
    const glossPng = sharp(gloss, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    return glossPng.then(gl => sharp(iconBuf).composite([{ input: gl, blend: 'over' }]).toBuffer());
  })
  .then(iconBuf =>
    Promise.all([
      sharp(iconBuf).toFile(OUT_ICON),
      sharp(iconBuf).resize(FAVICON_SIZE, FAVICON_SIZE).toFile(OUT_FAVICON)
    ])
  )
  .then(() => {
    console.log('Icona con glow e oro più luminoso:', OUT_ICON);
    console.log('Favicon:', OUT_FAVICON);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
