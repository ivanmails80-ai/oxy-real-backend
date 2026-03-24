# Cosa manca per il go-live — Solo versione gratuita (Fase 1)

**Riferimento unico** per capire cosa è già pronto e cosa devi fare tu per pubblicare l’app gratuita su Play Store.  
Se sei profano del settore: questa lista è in ordine; segui i punti “Da fare tu” e quando sono tutti ✅ sei pronto.

---

## 1. Già pronto (verificato in codice — non devi fare nulla)

| Cosa | Stato |
|------|--------|
| **Flusso Fase 1 (solo free)** | Con `EXPO_PUBLIC_SHOW_UPGRADE` non impostato (o `false`): solo “Prova gratis”, limite 5 msg con messaggio “Condividi OXY” e 50%, feature bloccate con Alert + Condividi, menu “Piani in arrivo” al posto Abbonamento. |
| **Condividi OXY e tracciamento** | Voce menu “Condividi OXY”, link Play Store nel messaggio, `POST /api/user/share-done` per lo sconto 50% futuro. |
| **Backend: utenti e primo accesso** | `data/users/{uid}.json` con `createdAt`, `sharedForDiscount`, `sharedAt`; `ensureUserMeta(uid)` in `GET /api/billing/status`. |
| **Contenuti legali** | Privacy e Termini in `src/content/legalContent.js` con dati reali (SecondSelf, oxy@oxyreal.it, Legnano). Nessun placeholder “XXXXX” nei testi. |
| **Configurazione app** | `backendConfig.js` con URL backend di default (Render); `app.json` con `com.oxyreal.app`; EAS production in `eas.json`. |
| **Lingue (i18n)** | Stringhe per free, limite, Condividi, Piani in arrivo in it, en, fr, es, ar, zh. |

**In sintesi:** l’app è completa e coerente per la versione gratuita. Non manca nulla *nel codice* per andare in produzione free.  
**Allineamento alle specifiche:** il comportamento è allineato a `docs/MODALITA_FREE_SPEC.md` e `docs/FASE_1_VERSIONE_FREE_DEFINITIVA.md` (limite 5 msg, Condividi OXY con 50%, schermata “Condividi per entrare in chat” per free, una sola voce e messaggio per “Prova” su altre voci, feature bloccate con Alert + Condividi, “Piani in arrivo” al posto Abbonamento quando `EXPO_PUBLIC_SHOW_UPGRADE` non è true).

---

## 2. Da fare tu (in ordine) — Cosa manca davvero per il go-live

**Checklist operativa con comandi e passi precisi:** **`docs/DA_FARE_TU_GO_LIVE_GRATUITA.md`** (apri e segna mentre procedi).

### 2.1 Backend online

- [ ] **Verificare che il backend risponda**  
  Apri nel browser: `https://oxy-real-backend.onrender.com/health`  
  Deve rispondere con qualcosa tipo `{"ok":true,"service":"oxy-real-proxy",...}`.  
  Se il backend è su Render e non risponde o dà errore, controlla su Render che il servizio sia attivo e che le variabili d’ambiente (Firebase, `OPENAI_API_KEY`, `DATA_ROOT` se usi disco) siano impostate (vedi `backend/DEPLOY_BACKEND.md`).

### 2.2 Variabili per la build (EAS o APK locale)

- [ ] **Impostare le variabili necessarie** dove fai la build:
  - **EAS (build nel cloud):** in EAS Dashboard → progetto → Secrets / Environment Variables, imposta almeno:
    - `EXPO_PUBLIC_BACKEND_URL` = `https://oxy-real-backend.onrender.com` (o il tuo URL backend)
    - Tutte le variabili Firebase: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`
    - Per login con Google su Android: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (client OAuth Android in Google Cloud con package `com.oxyreal.app` e SHA-1)
  - **Build locale (APK):** stesso elenco nel file `.env` nella root del progetto (copia da `.env.example` e compila). Non committare mai `.env`.

- [ ] **Per la versione gratuita non serve** impostare `EXPO_PUBLIC_SHOW_UPGRADE`: se non lo imposti (o lo metti a `false`), l’app è già in modalità “solo free”.

### 2.3 Preflight (controllo prima della build)

- [ ] **Eseguire il preflight** (in un terminale nella cartella del progetto):
  ```bash
  npm run preflight:go-live
  ```
  Deve finire con “Preflight OK”. Se segnala errori (❌) su package o `google-services.json`, sistemali. Avvisi (⚠️) su Stripe per la Fase 1 free si possono ignorare.

### 2.4 Build dell’app

- [ ] **Generare l’APK** in uno di questi modi:
  - **EAS (consigliato se hai account Expo):**  
    `npx eas build --platform android --profile production`  
    Poi scarica l’APK dal link che ricevi.
  - **Build locale:**  
    Seguire **COME_CREARE_APK_E_INSTALLARLA.md** (unica guida: preparazione, build, installazione).  
    L’APK sarà in `android/app/build/outputs/apk/release/app-release.apk`.

### 2.5 Test su telefono

- [ ] **Installare l’APK** sul telefono (via USB con `adb install -r ...` o con **INSTALLA-APP-SUL-TELEFONO.bat** se usi build locale).
- [ ] **Fare un giro completo** con **CHECKLIST_TEST_APP.md** adattato alla versione free:
  - Primo avvio → scelta lingua → Registrazione → **solo “Prova gratis”** → Chat
  - Invio di 5 messaggi → sesto messaggio bloccato con messaggio “Condividi OXY” e pulsante Condividi
  - Menu → Condividi OXY (condivisione e, se possibile, verifica che il backend registri)
  - Menu → Piani in arrivo (modal con 50% e Condividi)
  - Tap su Vision / Storie / Community (bloccati) → Alert con Condividi OXY
  - Memory Vault, Diario, notifiche: apertura e uso base
  - Login con account esistente → va in Chat senza richiedere pagamento
  - Assenza di rete → messaggio “Sei offline” (nessun crash)

Se qualcosa non funziona, annotalo e sistemalo prima di andare in store.

### 2.6 Play Store (submit)

- [ ] **Account Google Play** (developer) attivo e app creata nella Console.
- [ ] **Versioni:** in `app.json` controlla `expo.version` e `android.versionCode` (EAS può auto-incrementarli; vedi documentazione EAS).
- [ ] **Invio build:**  
  `npx eas submit --platform android --latest`  
  (con credenziali Google Play configurate in EAS), oppure carica manualmente l’APK dalla Play Console.
- [ ] **Scheda store:** titolo, descrizione breve, descrizione lunga, screenshot. Testo tipo: “Scarica OXY: il compagno AI che ricorda. Provalo gratis. Condividi l’app e avrai il 50% di sconto quando lanceremo abbonamenti e Lifetime.” (vedi `docs/PIANO_LANCIO_FREE_SENZA_UPGRADE.md`).
- [ ] **Privacy policy:** in store è richiesto un link. Puoi usare una pagina web che riporta il testo da `legalContent.js` (Privacy) oppure un link a un PDF; l’email di contatto è oxy@oxyreal.it.

---

## 3. Non serve per il go-live gratuito (puoi fare dopo)

| Cosa | Quando |
|------|--------|
| **Stripe LIVE, webhook, abbonamenti** | Solo quando attivi i piani a pagamento (Fase 2). |
| **Oscuramento codice (ProGuard/minify)** | Solo prima della “vendita” dell’app / codice; vedi `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md` e regola obfuscazione. |
| **EXPO_PUBLIC_SHOW_UPGRADE=true** | Solo quando vuoi mostrare di nuovo Abbonamento/Lifetime in app. |

---

## 4. Riepilogo in una frase

**Manca solo:** avere il backend online, impostare le variabili di build (backend URL + Firebase + eventuale Google Android client), fare la build, testare l’APK sul telefono con la checklist free, poi inviare l’app e compilare la scheda Play Store. Il codice e i contenuti per la versione gratuita sono pronti.

---

*Ultimo aggiornamento: marzo 2026. Per build, deploy backend e store usa anche GO_LIVE.md e COME_CREARE_APK_E_INSTALLARLA.md.*
