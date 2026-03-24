# Beta tester — Punti critici da verificare

**Obiettivo:** testare **solo** i flussi essenziali, intervenire sui punti critici e poi passare al Play Store.

---

## 1. Cosa far testare (in ordine)

Fai fare ai beta tester **una sola sessione** con questa lista. Se qualcosa fallisce, annota: **numero, cosa ha fatto, cosa è successo** (messaggio o schermata).

| # | Cosa | Cosa verificare |
|---|------|------------------|
| **1** | **Avvio** | App si apre senza crash. Prima volta: compare schermata **Scelta lingua** → scelta → poi Login/Registrazione. |
| **2** | **Registrazione** | Email + password (o Google) → registrazione completata → compare **"Come vuoi usare OXY?"** (Abbonamento / Lifetime). |
| **3** | **Scelta piano** | Tap **Abbonamento** → si apre Menu su tab Abbonamenti (Starter, Pro, Elite). Oppure **Lifetime** → tab Lifetime. |
| **4** | **Pagamento** | Tap "Abbonati" su un piano → si apre **Stripe Checkout** (browser o in-app). Pagamento 0,10 € (se configurato) → completamento. |
| **5** | **Ritorno in app** | Dopo il pagamento l’app si riapre (o si torna manualmente). **Non** restare bloccati su una pagina bianca. |
| **6** | **Stato abbonamento** | Menu → Abbonamento: si vede piano **attivo** e (se presente) barra utilizzo (X messaggi / limite). |
| **7** | **Scelta voce** | Se dopo il pagamento compare la schermata voci: scegli una voce → **Conferma** → si entra in **Chat**. |
| **8** | **Chat** | Invio messaggio → arriva risposta da OXY. Cronologia visibile. |
| **9** | **Limite messaggi (free/Starter)** | Con limite basso (es. 5): dopo N messaggi compare messaggio tipo "Crediti esauriti" / "Daily High-Priority Credits" e pulsante **Upgrade Now** o **Evolvi Ora** → apre Abbonamento. |
| **10** | **Menu** | Menu laterale o hamburger: Abbonamento, Memory Vault, Diario, Impostazioni, Lingua, Privacy, Termini, Logout. Tutti accessibili. |

---

## 2. Se qualcosa non va — dove intervenire

| Problema | Dove guardare / Cosa fare |
|----------|----------------------------|
| Crash all’avvio | Build con `npx expo prebuild --platform android --clean` e rifare APK; verificare che non ci siano moduli nativi rimossi (vedi **COME_CREARE_APK_E_INSTALLARLA.md**). |
| Lingua che riappare ogni volta | Non toccare il flag `HAS_CHOSEN_LANGUAGE_AT_STARTUP`; verificare AsyncStorage e primo avvio in App.js. |
| Dopo pagamento stato non "attivo" | Webhook Stripe deve puntare a `https://oxy-real-backend.onrender.com/api/billing/webhook`; in Render: `STRIPE_WEBHOOK_SECRET` impostato; eventi `checkout.session.completed` (e `customer.subscription.deleted`). |
| "PlanId non valido" in checkout | In Render verificare che le variabili `STRIPE_PRICE_SUB_*`, `STRIPE_PRICE_LIFE_*` siano i **Price ID** corretti (es. `price_xxxxx`) per i piani usati dall’app. |
| Limite messaggi non compare | Backend: `DAILY_LIMIT_STARTER` (e Pro/Elite) impostati; l’app mostra il messaggio quando il backend risponde 429 con `daily_high_priority_credits_used`. |
| Ritorno da Stripe non riapre l’app | Backend: `STRIPE_SUCCESS_URL` e `STRIPE_CANCEL_URL` in `.env` (es. deep link `oxyreal://billing/success` o pagina "Torna all’app"). In app, al ritorno in primo piano (`AppState` active) viene chiamato `refreshBillingStatus()`. |

---

## 3. Configurazione minima per i test beta

- **Stripe:** prezzi 0,10 € (test o live) e **Price ID** impostati in **Render** (vedi CHECKLIST_BETA_TESTER_DOMANI.md).
- **Backend Render:** variabili Firebase, Stripe, `STRIPE_WEBHOOK_SECRET`; opzionale limiti bassi (5, 10, 15) per far arrivare subito al limite.
- **APK:** build locale (**COME_CREARE_APK_E_INSTALLARLA.md**) o EAS `npx eas build --platform android --profile preview`; invio ai tester (link o file).

---

## 4. Dopo il beta

Quando i punti critici sopra sono tutti ok: **versione e versionCode** in `app.json` aggiornati, poi si può procedere con la **Guida Play Store** (caricamento su Google Play).

Riferimento completo test: **CHECKLIST_TEST_APP.md**.  
Riferimento go-live e build: **GO_LIVE.md**.
