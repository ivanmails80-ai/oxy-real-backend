# Da fare tu — Go-live versione gratuita (checklist operativa)

**Cosa ho già fatto in autonomia:** preflight eseguito (OK); `.env.example` aggiornato con variabili minime e URL backend produzione; documentazione in `docs/COSA_MANCA_GO_LIVE_GRATUITA.md`.

**Segna con [x] quando hai completato ogni punto.** Ordine consigliato: 1 → 2 → 3 → 4 → 5 → 6.

---

## 1. Backend online

- [ ] Apri nel browser: **https://oxy-real-backend.onrender.com/health**  
  Deve rispondere con qualcosa tipo: `{"ok":true,"service":"oxy-real-proxy",...}`  
  Se non risponde o dà errore: controlla su Render che il servizio sia attivo e che in backend siano impostate le variabili (Firebase, `OPENAI_API_KEY`, ecc.). Vedi `backend/DEPLOY_BACKEND.md`.

---

## 2. Variabili per la build

**Se usi EAS Build (cloud):**

- [ ] Vai su **https://expo.dev** → il tuo progetto → **Secrets** (o Environment Variables).
- [ ] Aggiungi almeno (valori da Firebase Console e, se usi, Google Cloud):
  - `EXPO_PUBLIC_BACKEND_URL` = `https://oxy-real-backend.onrender.com`
  - `EXPO_PUBLIC_FIREBASE_API_KEY`
  - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` = `oxy-real.firebaseapp.com`
  - `EXPO_PUBLIC_FIREBASE_PROJECT_ID` = `oxy-real`
  - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` = `oxy-real.firebasestorage.app`
  - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `EXPO_PUBLIC_FIREBASE_APP_ID`
  - (Opzionale, per login con Google su APK:) `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

**Se fai build locale (APK in cartella progetto):**

- [ ] Copia `.env.example` in `.env` (nella root del progetto).
- [ ] Compila in `.env` le stesse variabili sopra (backend URL, Firebase, eventuale Google Android client). Non committare mai `.env`.

---

## 3. Google Services (Android) — se il preflight ha segnalato “Manca google-services.json”

- [ ] In **Firebase Console** → progetto **oxy-real** → Impostazioni progetto → le tue app → app Android con package **com.oxyreal.app**.
- [ ] Scarica **google-services.json** e mettilo in:  
  `android/app/google-services.json`  
  (sostituisci il file se esiste già.)
- [ ] Rilancia il preflight per conferma:  
  `npm run preflight:go-live`

---

## 4. Build dell’APK

**Opzione A — EAS (cloud):**

```bash
npx eas build --platform android --profile production
```

- [ ] Comando eseguito; scaricato l’APK dal link ricevuto.

**Opzione B — Build locale:**

- [ ] Seguito **COME_CREARE_APK_E_INSTALLARLA.md** (npm install → prebuild → build con bat o Android Studio).
- [ ] APK ottenuto in: `android/app/build/outputs/apk/release/app-release.apk`.

---

## 5. Test su telefono

- [ ] APK installato sul telefono (USB + `adb install -r ...` oppure **INSTALLA-APP-SUL-TELEFONO.bat** se in uso).
- [ ] Giro di test fatto (vedi sotto). Eventuali problemi annotati e sistemati.

**Test rapidi da fare:**

1. Primo avvio → scelta lingua → Registrazione → solo pulsante “Prova gratis” → Chat.
2. Invio 5 messaggi → sesto bloccato con messaggio “Condividi OXY” e pulsante Condividi.
3. Menu → Condividi OXY (condivisione funziona).
4. Menu → Piani in arrivo (si apre la modal con 50% e Condividi).
5. Tap su Vision / Storie (bloccati) → esce Alert con Condividi OXY.
6. Memory Vault e Diario: si aprono e si usano.
7. Login con account già creato → va in Chat senza chiedere pagamento.
8. Disattiva Wi‑Fi/dati → in app compare messaggio “Sei offline” (nessun crash).

Per lista completa: **CHECKLIST_TEST_APP.md** (adattata alla versione free).

---

## 6. Play Store (invio e scheda)

- [ ] Account **Google Play Console** (developer) attivo; app creata.
- [ ] Build inviata (es. `npx eas submit --platform android --latest` oppure upload manuale APK dalla Console).
- [ ] In **app.json** controllate `expo.version` e `android.versionCode` (incrementa se serve).
- [ ] Scheda store compilata: titolo, descrizione breve, descrizione lunga, screenshot.
  - Suggerimento testo: “Scarica OXY: il compagno AI che ricorda. Provalo gratis. Condividi l’app e avrai il 50% di sconto quando lanceremo abbonamenti e Lifetime.”
- [ ] Link **Privacy policy** inserito (pagina web o PDF con il testo da `src/content/legalContent.js`; contatto: oxy@oxyreal.it).

---

## Riepilogo

| # | Cosa | Fatto |
|---|------|--------|
| 1 | Backend online (health OK) | [ ] |
| 2 | Variabili build (EAS o .env) | [ ] |
| 3 | google-services.json in android/app (se mancava) | [ ] |
| 4 | Build APK (EAS o locale) | [ ] |
| 5 | Test su telefono | [ ] |
| 6 | Invio e scheda Play Store | [ ] |

Quando tutti i punti sono segnati, il go-live della versione gratuita è completo.
