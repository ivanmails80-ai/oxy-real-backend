# Handoff al nuovo agente — Istruzioni per proseguire

**Data handoff:** marzo 2025. Cursor è andato in crash; l’utente cambia agente. Questo documento permette al nuovo agente di riprendere da dove si era arrivati.

---

## 1. Contesto progetto

- **App:** OXY Real (React Native/Expo), compagno AI con Memory Vault, Diario, notifiche/promemoria.
- **Piano concordato con l’utente:**
  - Caricare su **Play Store solo la versione free** (5 msg/giorno, Memory Vault, Diario, notifiche).
  - **Nessun upgrade** in Fase 1: niente abbonamenti né acquisti one-shot (niente Stripe, niente “Passa ad abbonamento”).
  - **Incentivare la condivisione** dell’app con la **promessa del 50% di sconto** quando in futuro si attiveranno abbonamenti e Lifetime.
  - **Tracciare** chi ha effettivamente condiviso l’app, per applicare il 50% solo a chi ha condiviso (o, in alternativa, a tutti gli “early adopter” registrati prima della data di attivazione paid).

- **Documenti di riferimento:**
  - **`COME_CREARE_APK_E_INSTALLARLA.md (in root)`** — **build APK e installazione su telefono in autonomia** (se un agente deve creare/installare l’APK: preparazione, bat o Android Studio, adb).
  - `docs/PIANO_LANCIO_FREE_SENZA_UPGRADE.md` — piano Fase 1 (solo free, nessun upgrade, incentivo condivisione + 50%).
  - `docs/MARKETING_LANCIO_FREE_POI_50_SCONTO.md` — strategia due fasi e opzioni early adopter.
  - `docs/EVITARE_INTERRUZIONE_SERVIZIO_FREE.md` — evitare interruzione servizio (free tier + fallback paid).
  - `docs/STIMA_COSTI_OPENAI_MIGLIAIA_UTENTI.md` — stime costi OpenAI 4o-mini.
  - `docs/CONFRONTO_COSTI_API_OPENAI_GEMINI.md` — confronto costi OpenAI vs Gemini.

---

## 2. Ultima richiesta dell’utente (da completare)

L’utente ha chiesto:

1. **Sapere se gli utenti che scaricano l’app sono memorizzati da qualche parte.**  
   **Risposta già individuata:** sì. Gli utenti sono identificati da **Firebase Auth** (uid, email). Il backend riconosce l’utente tramite `idToken` e legge/scrive dati per uid (es. `backend/data/billing/{uid}.json`). Oggi **non** esiste un record esplicito “data di primo accesso” o “ha condiviso per lo sconto”; va aggiunto.

2. **Implementare un tasto “Condividi”** per postare sui social il link Play Store e **tenerne traccia** per applicare il 50% a chi ha condiviso davvero.

---

## 3. Cosa era stato analizzato (stato del codice)

- **Share in app:** già usato `Share.share()` in `App.js` (backup export, forward/share messaggio). Su Android/iOS `Share.share()` può restituire `action: 'sharedAction'` se l’utente ha effettivamente condiviso, oppure `dismissedAction` se ha annullato — utile per tracciare solo le condivisioni reali.
- **Backend:**  
  - `readBilling(uid)` / `writeBilling(uid, data)` in `backend/index.js`: file `data/billing/{uid}.json`. Se non esiste, l’utente è considerato “free” (nessun `createdAt` oggi).  
  - Non esiste ancora un endpoint per “registra che questo utente ha condiviso” né un store dedicato (es. `data/users/{uid}.json`) con `createdAt`, `sharedForDiscount`, `sharedAt`.
- **Link Play Store:** non c’è una costante/env per l’URL (es. `https://play.google.com/store/apps/details?id=com.oxyreal.app`). Va aggiunta e usata nel messaggio di condivisione.
- **i18n:** servono stringhe per “Condividi OXY”, messaggio di condivisione con link e promessa 50%, e eventuale messaggio di conferma “Hai condiviso: avrai il 50% quando attiveremo i piani”.

---

## 4. Cosa implementare (lista per il nuovo agente)

### 4.1 Backend

1. **Store “user meta”** (es. primo accesso + condivisione):
   - Creare una directory/store per metadati utente (es. `data/users/` o riuso di un file per uid).
   - Per ogni uid salvare (almeno):
     - `createdAt`: data/ora del primo “visto” (es. prima chiamata autenticata a `billing/status` o a un nuovo endpoint).
     - `sharedForDiscount`: `true` se l’utente ha completato una condivisione per la promozione 50%.
     - `sharedAt`: data/ora in cui è stata registrata la condivisione (opzionale ma utile).

2. **Registrare il “primo visto”:**
   - In `GET /api/billing/status` (o in un middleware/helper chiamato da lì): se non esiste ancora un record utente per quell’uid, crearlo con `createdAt: new Date().toISOString()`. Usare lo stesso store scelto al punto 1.

3. **Endpoint per “ho condiviso”:**
   - Aggiungere `POST /api/user/share-done` (o nome simile) protetto da auth (`idToken`).
   - Body vuoto o `{ shared: true }`.
   - Logica: aggiornare il record utente con `sharedForDiscount: true` e `sharedAt: now`. Rispondere 200 con es. `{ ok: true }`.

4. **(Opzionale) Endpoint per leggere stato sconto:**
   - `GET /api/user/discount-status` (auth): risponde con `{ sharedForDiscount: boolean, createdAt: string }` così l’app può mostrare “Hai già condiviso: avrai il 50%” o “Condividi per sbloccare il 50%”.

### 4.2 App (App.js + i18n)

1. **Costante / env per link Play Store:**
   - Es. `EXPO_PUBLIC_PLAY_STORE_URL` o costante in `App.js` / config: `https://play.google.com/store/apps/details?id=com.oxyreal.app` (verificare il package id in `app.json`).

2. **Pulsante “Condividi OXY” / “Invita amici”:**
   - Aggiungere una voce di menu (es. in Impostazioni o in una schermata “Piani in arrivo”) che chiama una funzione `handleShareOxyForDiscount`.
   - La funzione:
     - Chiama `Share.share({ message: ..., title: ..., url: ... })` con messaggio precompilato che include il link Play Store e la promessa “Scarica ora e avrai il 50% quando attiveremo abbonamenti e Lifetime”.
     - Su React Native, `Share.share()` restituisce una Promise che in molti casi risolve con `{ action: 'sharedAction' }` se l’utente ha condiviso, o `{ action: 'dismissedAction' }` se ha chiuso senza condividere.
     - Se `action === 'sharedAction'` (o equivalente), chiamare `POST /api/user/share-done` con `idToken` per registrare la condivisione.
     - Mostrare un breve feedback (toast o alert): “Grazie! Avrai il 50% di sconto quando attiveremo i piani.”

3. **i18n (`src/i18n/translations.js`):**
   - Aggiungere chiavi per tutte le lingue supportate (it, en, fr, es, ar, zh), ad esempio:
     - `share.shareOxyButton`: "Condividi OXY" / "Share OXY"
     - `share.messageWithDiscount`: messaggio lungo con link e promessa 50% (può contenere placeholder per il link).
     - `share.thanksShared`: "Grazie! Avrai il 50% di sconto quando attiveremo i piani." / "Thanks! You'll get 50% off when we launch paid plans."

4. **Dove mostrare il pulsante:**
   - In base a `docs/PIANO_LANCIO_FREE_SENZA_UPGRADE.md`: Menu (voce “Condividi OXY” o “Invita amici”), e/o schermata “Piani in arrivo” (quando la si implementa), e/o dopo il messaggio di limite 5 messaggi (invece del pulsante “Passa ad abbonamento”). Per la Fase 1 “solo free senza upgrade” è prioritario: almeno una voce in menu + uso nel flusso “Condividi” con tracciamento.

### 4.3 Verifiche

- Con utente loggato: aprire menu → “Condividi OXY” → condividere (es. su WhatsApp) → verificare che il backend riceva `POST /api/user/share-done` e che il record utente abbia `sharedForDiscount: true`.
- Se l’utente chiude il sheet di condivisione senza condividere, non deve essere chiamato `share-done` (solo in caso di `sharedAction` o equivalente).
- Controllare che il link nel messaggio sia quello corretto (package id da `app.json`).

---

## 5. Ordine suggerito di lavoro

1. Backend: store user meta + `createdAt` al primo accesso (in billing/status o helper) + endpoint `POST /api/user/share-done`.
2. App: costante Play Store URL + `handleShareOxyForDiscount` + chiamata a `share-done` quando `Share.share` indica successo.
3. i18n: stringhe per Condividi OXY e messaggio con promessa 50%.
4. Integrare la voce “Condividi OXY” nel menu (e, se già presente, nella schermata “Piani in arrivo” o limite messaggi).

---

## 6. Note importanti

- **Regole progetto:** rispettare `.cursor/rules/manutenzione-app.mdc` e `obfuscazione-pre-vendita.mdc`; non alterare senza necessità il flusso `HAS_CHOSEN_LANGUAGE_AT_STARTUP`, `isLogged`, persistenza utente, integrazione Memory Vault/Diario/backend.
- **Flusso app:** vedere `docs/FLUSSO_APP.md` per ordine lingua → iscrizione → chat.
- **Utenti “chi ha scaricato l’app”:** sono gli utenti che hanno un account (Firebase) e che il backend “vede” almeno una volta; registrarli con `createdAt` al primo accesso permette di applicare in futuro il 50% a “tutti gli early adopter” (registrati prima della data di attivazione paid). Il flag `sharedForDiscount` permette di applicare il 50% (o un trattamento preferenziale) a chi ha effettivamente condiviso, se l’utente vuole limitare lo sconto a questi ultimi.

---

Il nuovo agente può usare questo file come riferimento unico per riprendere il lavoro e completare: (1) memorizzazione utenti + data primo accesso, (2) tasto Condividi con link Play Store e messaggio 50%, (3) tracciamento condivisione lato backend e uso per lo sconto 50%.
