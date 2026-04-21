# OXY Real — Backend proxy

Proxy per **nascondere le chiavi API** (OpenAI, Tavily) dall’app. L’app invia il token Firebase; il backend verifica l’utente e chiama le API.

## Ruoli

- **Master**: email in `MASTER_EMAIL`. Il backend usa `OPENAI_API_KEY` e `TAVILY_API_KEY` proprie; l’app **non** deve contenere queste chiavi.
- **Altri utenti (produzione)**: l’app invia solo `idToken` Firebase; il backend usa `OPENAI_API_KEY` se l’utente ha **OXY Pass**, **Lifetime** o **credito token**, altrimenti risponde 403. (Opzionale per test legacy: `CHAT_ALLOW_CLIENT_KEYS=true` consente ancora `apiKey` / Gemini nel body.)

## Setup

1. Copia `.env.example` in `.env` e compila le variabili.
2. **Firebase**: in Firebase Console → Impostazioni progetto → Account di servizio → Genera nuova chiave. Salva il JSON e imposta `GOOGLE_APPLICATION_CREDENTIALS` al path del file (es. `./firebase-service-account.json`).
3. Installa e avvia:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. **Log chat Studio (opzionale)**: con `moduleName: "Studio"`, il server logga in console una riga di verifica (`study_level` raw/normalized, presenza della riga `Current study level:`) e il **system prompt completo** (delimitatori `FINAL_SYSTEM_PROMPT_*`). Per disattivare solo il dump lungo: `OXY_LOG_STUDIO_PROMPT=0` (default: log completo). Test locale: `node scripts/test-studio-prompt.mjs`, `node scripts/test-lavoro-prompt.mjs`.

5. Nell’app (`.env` nella root del progetto Expo) imposta:
   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://TUO_INDIRIZZO:3030
   ```
   In produzione usa l’URL pubblico del backend (es. `https://api.oxyreal.com`).

## Endpoint

- `POST /api/chat` — invio messaggio all'IA. Body: `idToken`, `history`, `message`, `imageBase64?`, `language`, `moduleName`, `customAiName`, `nowStr`, `dateISO`, `study_level?` (solo **Studio**: `unknown` \| `primary` \| `middle` \| `high` \| `university` \| `vocational` \| `adult`, default `unknown`), `work_sector?` (solo **Lavoro**: `unknown` \| `administration` \| `marketing` \| `sales` \| `hr` \| `finance` \| `logistics` \| `it` \| `legal` \| `other`, default `unknown`), `intent_anchor?` (opzionale, max 160 caratteri). Risposta: `{ answer }`. Con **`moduleName: "Studio"`** il system message è **solo** il prompt tutor Studio + memoria essenziale. Con **`moduleName: "Lavoro"`** — stesso schema: prompt **Lavoro** dedicato (discovery una domanda alla volta, poi piano) + settore + memoria essenziale, **senza** prompt base OXY Real.
- `GET /api/chat/history` — cronologia chat. Header `Authorization: Bearer <idToken>` (o query `idToken`). Risposta: `{ messages }`.
- `POST /api/chat/messages` — salvataggio messaggio. Header o body `idToken`, body `role`, `content`. Risposta: `{ ok: true }`.
- `GET /health` — controllo stato.

## Conoscenza per l'assistente IA

Il file **`knowledge/oxy_app_knowledge.md`** contiene la descrizione di funzionalità, prompt, server, piani OXY, Memory Vault, Power Badges e istruzioni d'uso. Viene caricato all'avvio del server e iniettato nel system prompt dell'IA: così OXY può rispondere in modo esaustivo quando l'utente chiede "cosa puoi fare", "come funziona", "come accedo al server", ecc. Il file **non** è incluso nell'app; resta solo sul server. Per aggiornare le risposte dell'assistente, modifica il file e riavvia il backend (o implementa un reload su richiesta).

## Dati

La cronologia chat è salvata in `data/chats/{uid}.json` (cartella creata all'avvio; `data/` è in `.gitignore`).

## Script cancellazione utenti

- **Un utente:** `node scripts/delete-user-data.mjs <email|uid>` — cancella da Firebase Auth e dai file backend (chat, billing, memoria, ecc.).
- **Tutti gli utenti:** `node scripts/delete-all-users.mjs` — elenca gli utenti (dry-run). Con `--confirm` cancella tutti (Firebase Auth + dati backend). Se in `.env` è impostato `MASTER_EMAIL`, quell'account non viene cancellato.

## Stripe in fase test

Se l'app non vede l'abbonamento dopo un pagamento Stripe in test, di solito il **webhook** non è configurato. Per sbloccare subito: usa in app il pulsante **"Sblocca abbonamento (solo test)"** (Menu → Abbonamento) se sei il Master, oppure chiama `POST /api/admin/grant-plan` con body `{ "planId": "sub_starter" }` e header `Authorization: Bearer <idToken>`. Guida completa: **`docs/STRIPE_TEST_MODE.md`**.

## Deploy

Puoi hostare il backend su Railway, Render, Fly.io, o un VPS. Imposta le variabili d’ambiente e assicurati che l’app punti a `EXPO_PUBLIC_BACKEND_URL` in produzione.
