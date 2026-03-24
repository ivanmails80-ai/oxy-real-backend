import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const root = process.cwd();

const skipDirs = new Set([
  "node_modules",
  "android",
  "ios",
  "desktop",
  "backend",
  "_apk_extract",
  "24fish_delivery",
  "sito",
]);

const exts = new Set([".js"]);

function getNested(obj, key) {
  return String(key || "")
    .split(".")
    .reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function walk(dir, outFiles) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (skipDirs.has(ent.name)) continue;
      walk(path.join(dir, ent.name), outFiles);
      continue;
    }
    const ext = path.extname(ent.name);
    if (!exts.has(ext)) continue;
    outFiles.push(path.join(dir, ent.name));
  }
}

function extractKeysFromFile(text) {
  const keys = [];
  const re = /\bt\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) {
    const k = m[1];
    if (!k) continue;
    if (k.includes("\\n")) continue;
    if (k.includes("${")) continue;
    keys.push(k);
  }
  return keys;
}

async function main() {
  const mod = await import(pathToFileURL(path.join(root, "src/i18n/translations.js")));
  const { translations, LANGUAGES } = mod;

  const files = [];
  walk(root, files);

  const usedKeys = new Set();
  for (const file of files) {
    const txt = fs.readFileSync(file, "utf8");
    for (const k of extractKeysFromFile(txt)) usedKeys.add(k);
  }

  const used = [...usedKeys].sort();
  const report = {
    usedCount: used.length,
    missingInIt: [],
    langs: {},
  };

  for (const k of used) {
    const it = getNested(translations.it, k);
    if (typeof it !== "string") report.missingInIt.push(k);
  }

  for (const lang of LANGUAGES) {
    const miss = [];
    for (const k of used) {
      const v = getNested(translations[lang], k);
      const it = getNested(translations.it, k);
      if (typeof it === "string" && typeof v !== "string") miss.push(k);
    }
    report.langs[lang] = { missingCount: miss.length, sample: miss.slice(0, 80) };
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

