# Checklist Configurazione Produzione — OXY Real

**Data:** 2026-02-09  
**Obiettivo:** Configurare app e backend per il lancio in produzione (vendita dal sito vetrina).

---

## ⚠️ PROMEMORIA CRITICO — STRIPE LIVE MODE

**ATTENZIONE:** Prima del lancio in produzione, ricordati di:
1. ✅ Passare Stripe Dashboard da modalità **TEST** a modalità **LIVE**
2. ✅ Copiare la **Secret Key LIVE** (inizia con `sk_live_...`)
3. ✅ Sostituire `STRIPE_SECRET_KEY=sk_test_...` con `STRIPE_SECRET_KEY=sk_live_...` in `backend/.env`
4. ✅ Verificare che tutti i prodotti/prezzi siano creati anche in modalità LIVE (non solo TEST)

**Stato attuale:** Stripe è in modalità TEST per sviluppo/test. ✅ OK per ora.

---

## 1. BACKEND — Configurazione `.env`

Crea `backend/.env` copiando da `backend/.env.example` e compila:

### Obbligatori:
- [ ] `PORT=3030` (o porta che preferisci)
- [ ] `OPENAI_API_KEY=sk-...` (chiave OpenAI per Master/abbonati)
- [ ] `MASTER_EMAIL=ivanmails80@gmail.com` (o la tua email Master)
- [ ] `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json` (path al file JSON Firebase Admin)  
  **OPPURE** `FIREBASE_SERVICE_ACCOUNT_JSON=<base64 del JSON>` (per deploy senza file su disco)

### Opzionali ma consigliati:
- [ ] `TAVILY_API_KEY=tvly-...` (per ricerca web in tempo reale)
- [ ] `STRIPE_SECRET_KEY=sk_live_...` (da Stripe Dashboard → Developers → API keys)
- [ ] `STRIPE_PRICE_SUB_STARTER=price_...` (Price ID da Stripe Dashboard → Products)
- [ ] `STRIPE_PRICE_SUB_PRO=price_...`
- [ ] `STRIPE_PRICE_SUB_ELITE=price_...`
- [ ] `STRIPE_PRICE_LIFE_STARTER=price_...`
- [ ] `STRIPE_PRICE_LIFE_PRO=price_...`
- [ ] `STRIPE_PRICE_LIFE_ELITE=price_...`
- [ ] `STRIPE_SUCCESS_URL=https://oxyreal.it/success` (URL dopo pagamento riuscito)
- [ ] `STRIPE_CANCEL_URL=https://oxyreal.it/cancel` (URL se utente annulla)

**Nota:** Per ottenere i Price ID Stripe:
1. Vai su Stripe Dashboard → Products
2. Crea un prodotto per ogni piano (o usa quelli esistenti)
3. Clicca sul prodotto → Pricing → copia il "Price ID" (inizia con `price_`)

---

## 2. APP — Configurazione `.env`

Crea `.env` nella root del progetto (copiando da `.env.example`) e compila:

### Obbligatori:
- [ ] `EXPO_PUBLIC_BACKEND_URL=https://tuo-dominio.com` (URL pubblico del backend in produzione)
- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY=...` (da Firebase Console → Project Settings → General → Your apps)
- [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...`
- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID=...`
- [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...`
- [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...`
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID=...`

### Opzionali:
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...` (per login Google, da Firebase Console → Authentication → Sign-in method → Google → Web SDK)
- [ ] `EXPO_PUBLIC_MASTER_EMAIL=ivanmails80@gmail.com` (solo per sviluppo/test, in produzione può essere vuoto)
- [ ] `EXPO_PUBLIC_APP_MODE=subscription` (default: subscription, oppure `one_time_purchase`)

**IMPORTANTE:** Per build produzione (EAS Build), **NON** aggiungere:
- `EXPO_PUBLIC_OXY_AI_KEY` (chiavi solo sul backend)
- `EXPO_PUBLIC_TAVILY_API_KEY` (chiavi solo sul backend)

---

## 3. FIREBASE — Configurazione Console

### Autenticazione:
- [ ] Email/Password abilitato
- [ ] Google Sign-In abilitato (se vuoi login Google)
- [ ] Apple Sign-In abilitato (se vuoi login Apple, solo iOS)
- [ ] Domini autorizzati: aggiungi il dominio del tuo sito vetrina (es. `oxyreal.it`)

### Firebase Admin (per backend):
- [ ] Vai su Firebase Console → Project Settings → Service Accounts
- [ ] Clicca "Generate new private key" → scarica il file JSON
- [ ] Salva come `backend/firebase-service-account.json` (o codifica in base64 per `FIREBASE_SERVICE_ACCOUNT_JSON`)

### Android (se distribuisci APK):
- [ ] `google-services.json` scaricato da Firebase Console → Project Settings → Your apps → Android
- [ ] SHA-1 fingerprint aggiunto in Firebase Console (per Google Sign-In)
  - Ottieni SHA-1: `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`
  - Aggiungi SHA-1 in Firebase Console → Project Settings → Your apps → Android → SHA certificate fingerprints

### iOS (se distribuisci IPA):
- [ ] Configurazione Apple Developer per Sign in with Apple (se usi login Apple)
- [ ] Bundle ID configurato in Firebase Console

---

## 4. STRIPE — Configurazione Dashboard

### Setup iniziale:
- [ ] Account Stripe creato e verificato
- [ ] **⚠️ PRIMA DEL LANCIO:** Passato a modalità "Live" (non più Test mode) — **ATTENZIONE: attualmente in TEST per sviluppo**
- [ ] **⚠️ PRIMA DEL LANCIO:** Secret Key Live copiata → `STRIPE_SECRET_KEY` in `backend/.env` (sostituire `sk_test_` con `sk_live_`)

### Prodotti e Prezzi:
- [ ] Creato prodotto "OXY Pass Starter" → Price ricorrente mensile → Price ID → `STRIPE_PRICE_SUB_STARTER`
- [ ] Creato prodotto "OXY Pass Pro" → Price ricorrente mensile → Price ID → `STRIPE_PRICE_SUB_PRO`
- [ ] Creato prodotto "OXY Pass Elite" → Price ricorrente mensile → Price ID → `STRIPE_PRICE_SUB_ELITE`
- [ ] Creato prodotto "OXY Lifetime Starter" → Price una tantum → Price ID → `STRIPE_PRICE_LIFE_STARTER`
- [ ] Creato prodotto "OXY Lifetime Pro" → Price una tantum → Price ID → `STRIPE_PRICE_LIFE_PRO`
- [ ] Creato prodotto "OXY Lifetime Elite" → Price una tantum → Price ID → `STRIPE_PRICE_LIFE_ELITE`

### Webhook (per aggiornare stato abbonamento):
- [ ] Vai su Stripe Dashboard → Developers → Webhooks
- [ ] Clicca "Add endpoint"
- [ ] URL: `https://tuo-backend.com/api/billing/webhook`
- [ ] Eventi da ascoltare:
  - `checkout.session.completed`
  - `customer.subscription.deleted`
  - `customer.subscription.updated`
- [ ] Copia il "Signing secret" → salvalo (in futuro puoi usarlo per verificare la firma del webhook)

---

## 5. DEPLOY BACKEND

### Opzioni hosting:
- [ ] **VPS** (es. DigitalOcean, Hetzner, AWS EC2)
- [ ] **Platform as a Service** (es. Railway, Render, Fly.io, Heroku)

### Checklist deploy:
- [ ] Server con Node.js 18+ installato
- [ ] File `backend/.env` creato sul server con tutti i valori
- [ ] File `firebase-service-account.json` caricato sul server (o `FIREBASE_SERVICE_ACCOUNT_JSON` in base64)
- [ ] Porta 3030 (o quella scelta) aperta nel firewall
- [ ] Process manager installato (es. PM2): `npm install -g pm2`
- [ ] Backend avviato: `cd backend && npm install && pm2 start index.js --name oxy-backend`
- [ ] Backend raggiungibile: `curl https://tuo-backend.com/health` deve rispondere `{"ok":true,...}`
- [ ] URL backend inserito in `EXPO_PUBLIC_BACKEND_URL` dell'app

---

## 6. SITO VETRINA (opzionale ma consigliato)

- [ ] Dominio registrato (es. `oxyreal.it`)
- [ ] Landing page creata con:
  - Descrizione app
  - Piani e prezzi
  - Link download app (APK Android / TestFlight iOS / link diretto)
  - Link checkout Stripe per ogni piano
- [ ] Pagine `/success` e `/cancel` per redirect dopo pagamento Stripe
- [ ] SSL/HTTPS configurato (obbligatorio per Stripe)

---

## 7. VERSIONI APP

- [ ] `app.json`: aggiornare `version` (es. `1.0.0` → `1.0.1` per ogni release)
- [ ] Android: `android.versionCode` (EAS può auto-incrementarlo)
- [ ] iOS: `ios.buildNumber` (EAS può auto-incrementarlo)

---

## 8. TEST PRE-RELEASE

Prima di vendere, testa su dispositivo reale:

- [ ] Login con email/password
- [ ] Login con Google (se configurato)
- [ ] Login con Apple (se configurato, solo iOS)
- [ ] Recupero password ("Password dimenticata?")
- [ ] Chat funziona (messaggi inviati/ricevuti)
- [ ] Cronologia chat si carica dopo logout/login
- [ ] Memory Vault (salva obiettivo/fatto, visualizza, cancella)
- [ ] Diario (crea tema, aggiungi voce)
- [ ] Storie (avvia storia, salva progresso)
- [ ] Menu → Abbonamento: mostra stato abbonamento
- [ ] Menu → Abbonamento: click su piano → apre checkout Stripe
- [ ] Menu → Privacy / Termini: testi legali si visualizzano correttamente
- [ ] Banner "Sei offline" appare quando disconnetti Wi‑Fi
- [ ] Cambio password funziona
- [ ] Logout funziona

---

## 9. OBFUSCAZIONE CODICE (prima della vendita)

Vedi `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md` e `CHECKLIST_DEFINITIVA_GO_LIVE.md` sezione 2.6.

- [ ] JavaScript: minificazione/offuscamento del bundle
- [ ] Android: ProGuard/R8 attivato in `android/app/build.gradle`
- [ ] iOS: build ottimizzato (EAS Build production profile)
- [ ] Test: verifica che l'app funzioni ancora dopo offuscazione

---

## 10. BUILD E DISTRIBUZIONE

### Per vendita dal sito (senza store):

**Android:**
- [ ] `npx eas build --platform android --profile production`
- [ ] APK scaricato e caricato sul sito vetrina (link download)

**iOS:**
- [ ] `npx eas build --platform ios --profile production`
- [ ] IPA caricato su TestFlight (link pubblico) OPPURE distribuzione enterprise (se hai account Enterprise)

### Per vendita dagli store (futuro):
- [ ] Account Apple Developer ($99/anno)
- [ ] Account Google Play Developer ($25 una tantum)
- [ ] `npx eas submit --platform android --latest`
- [ ] `npx eas submit --platform ios --latest`

---

## Note Finali

- **⚠️ STRIPE LIVE MODE:** Prima del lancio, ricordati di passare Stripe da TEST a LIVE e aggiornare `STRIPE_SECRET_KEY` nel `.env` (vedi promemoria in alto)
- **Sicurezza:** Mai committare file `.env` (sono già in `.gitignore`)
- **Backup:** Fai backup di `backend/data/` (contiene chat, memorie, diari degli utenti)
- **Monitoraggio:** Considera di aggiungere logging/monitoring (es. Sentry, LogRocket) per tracciare errori in produzione
- **Rate limiting:** Già implementato nel backend, ma verifica che i limiti siano adeguati al tuo traffico

---

**Quando hai completato i punti 1-8, l'app è pronta per essere venduta dal sito vetrina.**
