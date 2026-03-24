# Lista definitiva: cosa manca per attivare e lanciare l’app

Punto per punto: azioni da completare prima del lancio. Segna con [x] quando hai chiuso ogni voce.

---

## 1. Contenuti legali (obbligatorio per store e GDPR)

- [ ] **Privacy policy**
  - Sostituire i placeholder in `src/content/legalContent.js` (costante `PRIVACY_POLICY_PLACEHOLDER`) con il testo definitivo (eventualmente fatto redigere/approvare da un legale).
  - Allineare, se usi i file in repo, `docs/PRIVACY_POLICY.md`.

- [ ] **Termini di servizio**
  - Stesso procedimento: sostituire in `src/content/legalContent.js` (`TERMINI_SERVIZIO_PLACEHOLDER`) e, se serve, `docs/TERMINI_SERVIZIO.md`.

- [ ] **Pagina Abbonamento**
  - I testi in `ABBONAMENTO_PLACEHOLDER` sono solo UX/placeholder. Quando avrai un piano prezzi e link reali (Stripe, App Store, Google Play), aggiornare il testo e, se previsto, i link in app.

---

## 2. Abbonamento Master e pagamenti (audit 3.3)

- [ ] **Integrazione pagamenti**
  - Scegliere e configurare un sistema (es. Stripe, RevenueCat, IAP Apple/Google).
  - Nessuna integrazione reale è attualmente presente: la pagina “Abbonamento e pagamenti” è solo placeholder.

- [ ] **Backend: verifica abbonamento**
  - Il backend deve verificare lo stato abbonamento (es. tramite webhook Stripe o API store) e riconoscere l’utente come “Master” (o assegnare l’accesso alla chiave condivisa) solo se abbonato. Oggi “Master” è solo l’email in `EXPO_PUBLIC_MASTER_EMAIL` / `MASTER_EMAIL`.

- [ ] **Rimuovere chiave Master dal client**
  - In produzione la chiave OpenAI Master non deve stare nell’app (né in `.env` pubblico). Solo il backend deve usarla; l’app Master deve autenticarsi (idToken) e il backend, dopo aver verificato l’abbonamento, usa la chiave server.

---

## 3. Configurazione e ambiente

- [ ] **`.env` / segreti**
  - Verificare che `.env` non sia mai committato.
  - Per build di produzione (EAS): usare segreti EAS o variabili di build per tutte le chiavi (Firebase, backend URL, eventuale Master email per sviluppo).
  - **EXPO_PUBLIC_APP_MODE**: `subscription` = app in abbonamento (Oxy Key nascosta, chiave solo sul server; default). `one_time_purchase` = acquisto una tantum senza abbonamento (mostra "Inserisci Oxy Key" in Impostazioni). Due build diverse: una per store abbonamento, una per vendita senza abbonamento.

- [ ] **Backend in produzione**
  - Deploy del backend (es. su un VPS o servizio cloud) con `EXPO_PUBLIC_BACKEND_URL` (o equivalente) puntato all’URL reale.
  - Firebase Admin (verifica token): configurare `GOOGLE_APPLICATION_CREDENTIALS` o `FIREBASE_SERVICE_ACCOUNT_JSON` sul server.

- [ ] **Firebase**
  - Domini autorizzati per Auth (e, se usi, link dinamici).
  - Android: `google-services.json` e SHA-1 configurati; iOS: configurazione Apple se usi Sign in with Apple.

---

## 4. Login social (Google / Apple)

- [ ] **Google**
  - Firebase: Sign-in method Google abilitato; Web client ID in `.env` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`).
  - Development build (non Expo Go); su Android: `google-services.json` e SHA-1.

- [ ] **Apple**
  - Firebase: provider Apple abilitato; su iOS configurare Sign in with Apple (certificati/Service ID). Su Android il pulsante può mostrare messaggio “non disponibile”.

---

## 5. Build e invio agli store

- [ ] **Versioni**
  - Aggiornare `version` e `android.versionCode` / `ios.buildNumber` in `app.json` (o dove gestisci le versioni) prima di ogni invio.

- [ ] **EAS Build**
  - Account Expo/EAS configurato; eseguire build per Android e/o iOS come da `GO_LIVE.md`.

- [ ] **EAS Submit**
  - Dopo build riuscita: invio a Google Play e/o App Store (credenziali, account developer, prima volta configurazione certificati/keystore).

- [ ] **Test pre-release**
  - Su dispositivo reale: login (email e, se attivi, Google/Apple), recupero password, chat, cronologia, menu (Privacy, Termini, Abbonamento, Gestisci Cloud), cambio password, logout. Verificare che in assenza di rete compaia il banner “Sei offline”.

---

## 6. Opzionali / miglioramenti successivi

- [ ] **Cloud (Drive / iCloud / Server)**
  - Attualmente la sezione “Gestione Cloud” mostra “Funzionalità in arrivo”. Quando vorrai offrire sync reale, implementare le integrazioni (API Google Drive, iCloud, tuo server) e aggiornare testi e flusso.

- [ ] **Chat di gruppo**
  - La creazione gruppo dal menu è solo UX (“Funzionalità in arrivo”). Quando implementerai la logica (backend, inviti, ruoli), aggiornare il flusso.

- [ ] **Supporto**
  - La voce “Supporto” nel menu apre un Alert con email. Puoi sostituirla con una pagina dedicata o un link a un help center.

---

## Riepilogo

| # | Cosa | Chi / Dove |
|---|------|------------|
| 1 | Testi definitivi Privacy e Termini | Tu (eventualmente legale); file `src/content/legalContent.js` e `docs/` |
| 2 | Pagamenti + backend verifica abbonamento + niente chiave Master in app | Tu (integrazione + backend) |
| 3 | .env sicuro, backend in produzione, Firebase configurato | Tu (devops / config) |
| 4 | Login Google/Apple configurati e testati | Tu (Firebase + EAS/credentials) |
| 5 | Build, versioni, submit store, test su dispositivo | Tu (EAS + account store) |
| 6 | Cloud / Gruppi / Supporto (opzionale) | Dopo il lancio |

Quando avrai chiuso i punti 1–5 (e, per un prodotto “Master” a pagamento, il punto 2), l’app sarà pronta per essere attivata e lanciata. La lista in questo file può essere usata come checklist da spuntare punto per punto.
