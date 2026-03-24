# OXY Real — Unico riferimento go-live e release

**Ultimo aggiornamento:** 21 febbraio 2026.

**Questo è l’unico documento di riferimento** per stato, ordine dei passi e comandi. Nessun altro file in repo sostituisce questo. Ordine prima di tutto.

**Se lanci solo la versione gratuita (Fase 1):** usa **`docs/COSA_MANCA_GO_LIVE_GRATUITA.md`** per la lista “cosa manca” in linguaggio semplice (backend online, variabili build, build, test, store).

**Verificato in codice (21 feb 2026):** le voci Completato e Stato sotto sono state controllate nel repository. Dove dipendono da servizi esterni (Render, Firebase Console, EAS Dashboard) la verifica va fatta da te.

---

## 1. Stato attuale

| Area | Stato (verificato in codice dove applicabile) |
|------|--------|
| Backend (Render) | ✅ URL in codice: `https://oxy-real-backend.onrender.com`; backend usa DATA_ROOT e FIREBASE_SERVICE_ACCOUNT_JSON. Deploy e health da verificare su Render. |
| Firebase | ✅ `google-services.json` con client `com.oxyreal.app` e OAuth. Google e SHA-1 da abilitare/configurare in Firebase Console. |
| Variabili EAS production | ✅ In `eas.json` (production) c'è solo `EXPO_PUBLIC_FIREBASE_PROJECT_ID: "oxy-real"`. Le altre variabili vanno impostate in EAS Dashboard. |
| Preflight | ✅ Script `scripts/go-live-preflight.mjs` presente; controlla package, applicationId, google-services, backend/.env.example. |
| Sicurezza / app | ✅ Verificato: .env in .gitignore; ErrorBoundary; useNetInfo (offline); MAX_MESSAGE_LENGTH 1500/8000; timeout IA 90 s; profileService Firestore; requestPasswordReset; legalContent con dati reali. Chiavi OpenAI/Tavily solo via backend (aiService). |
| Build EAS production | ⏳ Da rilanciare (quota Android Free esaurita; variabili da impostare in EAS). |
| Test su dispositivo | Da fare con APK release locale o build EAS quando disponibile. |
| Store (Submit) | Da fare quando pronto. |
| Abbonamento (Stripe LIVE) | Da fare se vendi abbonamento. |
| Oscuramento codice | Da fare prima della vendita: `android.enableMinifyInReleaseBuilds=false` in gradle.properties; ProGuard in build.gradle. Vedi `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md`. |

---

## 2. Completato (non rifare)

- **Backend:** Verificato in codice: `backendConfig.js` DEFAULT_BACKEND_URL = quel URL; `backend/index.js` usa DATA_ROOT e FIREBASE_SERVICE_ACCOUNT_JSON. Deploy Render e health `/health` da verificare su Render.
- **Firebase:** Verificato: google-services.json con client com.oxyreal.app e OAuth. Google e SHA-1 da abilitare in Firebase Console; per build EAS aggiungere in Firebase l’SHA-1 da EAS Credentials.
- **EAS:** Verificato: in `eas.json` profilo production c'è solo `EXPO_PUBLIC_FIREBASE_PROJECT_ID: "oxy-real"`. Le altre variabili vanno impostate in EAS Dashboard.
- **Codice:** Verificato: .env in .gitignore; aiService usa backend con idToken (chiavi solo server); ErrorBoundary; useNetInfo (offline); MAX_MESSAGE_LENGTH 1500/8000; timeout 90 s; profileService Firestore; requestPasswordReset; legalContent con dati reali (SecondSelf, oxy@oxyreal.it).
- **Android:** Verificato: applicationId e package com.oxyreal.app; MainActivity/MainApplication in com/oxyreal/app/; google-services.json con client com.oxyreal.app; gradle.properties ha android.enableMinifyInReleaseBuilds=false (da abilitare prima della vendita).

---

## 3. Da fare (in ordine)

**Snellimento lista:** le voci con ✅ o "(Sam)" sono state fatte o verificate in autonomia. Restano da fare **solo** le attività che richiedono te (telefono, Stripe Dashboard, EAS, revisione legale, store).

### 3.0 Prima del go-live — Lingue (i18n)

- [x] **Traduzioni fr, es, ar, zh:** completate `welcomeAfterPayment` e `billing.launchDiscount*` (feb 2026).
- [x] **Controllo chiavi (Sam):** le chiavi usate in app per welcomeAfterPayment e launchDiscount esistono in tutte e 6 le lingue (it, en, fr, es, ar, zh). Nessuna chiave raw dovrebbe apparire; un test veloce in Menu → Lingua conferma.

### 3.1 Build e test app

- [ ] **Build EAS:** `npx eas build --platform android --profile production` (quando quota disponibile o con piano a pagamento).
- [ ] **Test su dispositivo:** installa l’APK. Usa **CHECKLIST_TEST_APP.md** per una sessione unica: accesso, chat, abbonamento, limite 429, funzioni per piano, pacchetti token, Lifetime, cancellazione, menu (eviti reinstallazioni).

### 3.2 Beta tester e Store (quando pronto)

- [ ] **Beta:** usa **BETA_PUNTI_CRITICI.md** per far testare ai beta tester solo i flussi essenziali (avvio, registrazione, pagamento, ritorno in app, chat, limite messaggi, menu).
- [ ] **Versioni:** in `app.json` aggiorna `expo.version` e `android.versionCode` (e `ios.buildNumber` se usi iOS). EAS può auto-incrementarli ([EAS versioning](https://docs.expo.dev/build-reference/app-versions/)).
- [ ] **Submit:** `npx eas submit --platform android --latest` (credenziali Google Play in EAS). Consigliato: prima internal/closed testing, poi produzione. **Guida passo-passo:** `docs/GUIDA_PLAY_STORE.md`.

### 3.3 Se vendi abbonamento

- [ ] **Stripe LIVE (prima del go-live):** Secret Key LIVE in `backend/.env`, prodotti/prezzi LIVE, webhook LIVE verso `/api/billing/webhook`. Configurare anche prezzi o coupon per lo **sconto lancio 50%** (primi 30 gg) se vuoi che il checkout Stripe rispecchi i prezzi mostrati in app (per difetto, senza centesimi). Vedi `STRIPE_PRODOTTI_COMPLETI.md`.
- [ ] **Backend:** riconoscere Master/abbonato da stato pagamento (webhook/API), non solo da email.
- [ ] **Testi:** in `src/content/legalContent.js` (sezione subscription) prezzi e link reali.

### 3.4 Legali (consigliato)

- [x] **Verifica in codice (Sam):** `legalContent.js` non contiene placeholder "XXXXX"; titolare SecondSelf, email oxy@oxyreal.it, sede Legnano (MI). Struttura Privacy/Termini/Abbonamento presente.
- [ ] **(Solo tu)** Eventuale revisione legale; policy "dati & retention" (memoria, cancellazione, scadenza abbonamento).

### 3.5 Prima della vendita (codice indecifrabile)

- [ ] Obfuscazione bundle JS: `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md` e `.cursor/rules/obfuscazione-pre-vendita.mdc`.
- [ ] Android: in `android/gradle.properties` impostare `android.enableMinifyInReleaseBuilds=true` e testare build.
- [ ] Test build dopo obfuscazione (login, chat, menu).

---

## 4. Verifica prima di installare l’APK

1. **Preflight:** esegui tu `npm run preflight:go-live` (controlla package, applicationId, google-services, backend/.env.example). *Sam non può eseguirlo in ambiente Cursor; va lanciato da te in un terminale nella cartella del progetto.*
2. **Variabili EAS (production):** almeno EXPO_PUBLIC_BACKEND_URL, EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID. Per Google Sign-In su APK: EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.
3. **Test dopo installazione:** avvio, login email/password, recupero password, (se configurato) login Google, chat, cronologia, Memory Vault, menu, banner offline.

---

## 5. Build locale (prova)

- **Android:** `npx expo run:android` (con `.env` e backend raggiungibile).
- **iOS:** `npx expo run:ios`.

---

## 6. Comandi

| Cosa | Comando |
|------|---------|
| Preflight | `npm run preflight:go-live` |
| Build Android production | `npx eas build --platform android --profile production` |
| Submit ultima build | `npx eas submit --platform android --latest` |

**Solo due file tecnici di supporto (dettaglio, non stato):**

- Deploy backend (Render, variabili, disco): `backend/DEPLOY_BACKEND.md`
- Obfuscazione pre-vendita: `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md`

---

*Un solo documento. Ordine prima di tutto. Per dettagli tecnici usare solo i due file indicati sopra.*

**Riepilogo verifica:** Le voci «Da fare» (build EAS, test dispositivo, store, Stripe LIVE, legali, obfuscazione) sono state controllate: non risultano completate nel codice (es. android.enableMinifyInReleaseBuilds resta false; nessun submit/store dipende dal repo). Lo stato «Completato» e la tabella «Stato attuale» riflettono il codice verificato il 21 feb 2026.

---

## 6bis. Da ora alla fine: beta (Expo) → APK → tutto ok

**Fase 1 — Beta con Expo (adesso)**  
- Continuate a testare con `npx expo start` e Expo Go (o development build).  
- Obiettivo: chiudere i bug, confermare il flusso (registrazione → scelta piano → pagamento test → voce → chat, limite 429, menu, Memory Vault, Diario).  
- Usate **CHECKLIST_TEST_APP.md** per non dimenticare nulla.

**Fase 2 — APK sul telefono (dopo il beta)**  
- Quando il beta vi convince, generate l’APK e installatelo sul telefono per il test “reale” (stesso comportamento della versione che andrà in store).  
- **Opzione A — Build locale (consigliata per velocità):**  
  1. `npm run preflight:go-live`  
  2. Seguire **COME_CREARE_APK_E_INSTALLARLA.md** (unica guida: preparazione, build, installazione).  
  3. Installare: doppio clic su **INSTALLA-APP-SUL-TELEFONO.bat** (telefono via USB, Debug USB attivo) oppure manualmente:  
     `adb install -r android\app\build\outputs\apk\release\app-release.apk`  
- **Opzione B — EAS Build (cloud):**  
  `npx eas build --platform android --profile production` (o `preview` per APK). Scaricate l’APK dal link che EAS vi manda e installatelo sul telefono.

**Fase 3 — Verifica finale**  
- Con l’APK installato: stesso giro della checklist (avvio, login, chat, abbonamento, limite, menu, Memory Vault). Se tutto ok, siete pronti per legali, Stripe LIVE (se serve) e poi store.

---

## 7. Ordine logico — Come procedere

Usa questo ordine per non fare passi inutilmente prima del momento giusto o in ritardo.

| Ordine | Cosa | Perché |
|--------|------|--------|
| **1** | **Lingue (i18n)** — Completare fr, es, ar, zh per tutte le stringhe nuove (welcomeAfterPayment, ecc.) | Così build e test coprono tutte le lingue; eviti di dover rifare build solo per i testi. |
| **2** | **Test flusso completo** — Registrazione → payment gate → pagamento (Stripe test) → scelta voce → messaggio benvenuto in chat | Verifichi che tutto il flusso prodotto funzioni prima di investire in build/store. |
| **3** | **Build e test su dispositivo** — EAS o APK, checklist test (login, chat, abbonamento, limite, menu) | Serve un artefatto stabile prima di store e obfuscazione. |
| **4** | **Legali** — Privacy, Termini, testi abbonamento in legalContent.js | Richiesto per store e GDPR; meglio allineati prima del submit. |
| **5** | **Stripe LIVE** (se vendi abbonamento) — Chiavi LIVE, webhook LIVE, prodotti/prezzi LIVE | Solo quando sei pronto a vendere; non blocca il resto. |
| **6** | **Oscuramento codice** — Prima della vendita: vedi § 3.5 e docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md | Va fatto prima di mettere l’app in vendita, dopo che i test sono ok. |
| **7** | **Store** — Versioni, submit, closed testing, poi produzione | Ultimo passo quando app, testi e pagamenti sono pronti. |

**In sintesi:** prima contenuti e lingue, poi test del flusso, poi build e test dispositivo, poi legali e (se serve) Stripe LIVE, poi obfuscazione, infine store.

---

## 8. Note tecniche (verifiche effettuate)

- **Limite giornaliero (429):** In menu → Abbonamento sono mostrati piano attivo, utilizzo (used/limit), barra percentuale e avviso al 90%. Al 100% l’utente vede il messaggio di limite e può: attendere il giorno successivo, passare al piano superiore (CTA "Passa al piano superiore") o acquistare pacchetti Oxy Key. Gestione 429 in chat: messaggio `billing.limitReachedMessage` e Alert con CTA che apre il menu Abbonamento.
- **Ritorno da Stripe:** Il backend usa `STRIPE_SUCCESS_URL` e `STRIPE_CANCEL_URL` da `.env` (vedi `backend/.env.example`). Impostare URL reali (es. deep link `oxyreal://payment/success` o pagina web "Torna all’app"). Al ritorno in app, `AppState` 'active' triggera `refreshBillingStatus()` quindi lo stato billing si aggiorna senza bisogno di deep link obbligatori.
- **Sconto lancio 50%:** Countdown "Mancano X giorni" basato su `EXPO_PUBLIC_GO_LIVE_DATE` (default in codice; impostare in EAS/build al go-live). In app i prezzi mostrati sono già al 50% per difetto e senza centesimi. **Da fare prima del go-live:** configurare su Stripe i prezzi scontati o una coupon 50% così il checkout corrisponde a quanto mostrato in app.
- **Email benvenuto dopo pagamento:** In webhook Stripe `checkout.session.completed` (solo per piani subscription/lifetime, non pack) viene inviata email di benvenuto se SMTP configurato. Attivare con `WELCOME_EMAIL_AFTER_PAYMENT=true` in backend `.env` (o usare lo stesso SMTP di `DOCS_EMAIL_AUTOSEND_ENABLED`).
- **Memory Vault (idea futura):** Opzionale: salvare un riepilogo piano/funzionalità in Memory Vault non eliminabile così Oxy lo ha sempre presente. Non implementato; da valutare dopo go-live.
