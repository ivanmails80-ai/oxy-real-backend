import fs from "fs";
import path from "path";

const root = process.cwd();

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function pick(obj, dotted) {
  return String(dotted)
    .split(".")
    .reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function main() {
  const appJsonPath = path.join(root, "app.json");
  const gradlePath = path.join(root, "android", "app", "build.gradle");
  const googleServicesPath = path.join(root, "android", "app", "google-services.json");
  const backendEnvExamplePath = path.join(root, "backend", ".env.example");

  if (!exists(appJsonPath)) return fail("Manca app.json");
  if (!exists(gradlePath)) return fail("Manca android/app/build.gradle");

  const appJson = readJson(appJsonPath);
  const expoAndroidPackage = pick(appJson, "expo.android.package");
  if (!expoAndroidPackage) fail("app.json: manca expo.android.package");
  else ok(`app.json package: ${expoAndroidPackage}`);

  const gradle = fs.readFileSync(gradlePath, "utf8");
  const m = gradle.match(/applicationId\s+['"]([^'"]+)['"]/);
  const gradleAppId = m ? m[1] : null;
  if (!gradleAppId) fail("android/app/build.gradle: applicationId non trovato");
  else ok(`Android applicationId: ${gradleAppId}`);

  if (expoAndroidPackage && gradleAppId && expoAndroidPackage !== gradleAppId) {
    fail(`Package mismatch: app.json (${expoAndroidPackage}) != build.gradle (${gradleAppId})`);
  }

  if (!exists(googleServicesPath)) {
    warn("Manca android/app/google-services.json (Firebase su Android potrebbe non funzionare).");
  } else {
    const gs = readJson(googleServicesPath);
    const clients = Array.isArray(gs?.client) ? gs.client : [];
    const packages = clients
      .map((c) => c?.client_info?.android_client_info?.package_name)
      .filter(Boolean);
    const hasMatch = gradleAppId && packages.includes(gradleAppId);
    if (packages.length === 0) {
      warn("google-services.json: nessun package_name trovato (file forse non valido).");
    } else {
      ok(`google-services.json: ${packages.join(", ")} ${hasMatch ? "(include " + gradleAppId + ")" : ""}`);
      if (gradleAppId && !hasMatch) {
        warn(`google-services.json: nessun client per ${gradleAppId}. Aggiungi l'app Android in Firebase e riscarica il file.`);
      }
    }
  }

  // Stripe webhook security check (server-side)
  if (exists(backendEnvExamplePath)) {
    const envExample = fs.readFileSync(backendEnvExamplePath, "utf8");
    if (!envExample.includes("STRIPE_WEBHOOK_SECRET")) {
      warn("backend/.env.example: manca STRIPE_WEBHOOK_SECRET (verifica firma webhook).");
    } else {
      ok("backend/.env.example include STRIPE_WEBHOOK_SECRET");
    }
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.log("\nPreflight fallito: sistema i punti ❌ sopra prima del go-live.");
  } else {
    console.log("\nPreflight OK: basi tecniche coerenti.");
  }
}

main();

