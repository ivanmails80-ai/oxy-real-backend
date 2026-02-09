# OXY Real — Backend proxy

Proxy per **nascondere le chiavi API** (OpenAI, Tavily) dall’app. L’app invia il token Firebase; il backend verifica l’utente e chiama le API.

## Ruoli

- **Master**: email in `MASTER_EMAIL`. Il backend usa `OPENAI_API_KEY` e `TAVILY_API_KEY` proprie; l’app **non** deve contenere queste chiavi.
- **Altri utenti**: l’app invia la propria Oxy Key nel body; il backend la usa per chiamare OpenAI/Tavily.

## Setup

1. Copia `.env.example` in `.env` e compila le variabili.
2. **Firebase**: in Firebase Console → Impostazioni progetto → Account di servizio → Genera nuova chiave. Salva il JSON e imposta `GOOGLE_APPLICATION_CREDENTIALS` al path del file (es. `./firebase-service-account.json`).
3. Installa e avvia:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Nell’app (`.env` nella root del progetto Expo) imposta:
   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://TUO_INDIRIZZO:3030
   ```
   In produzione usa l’URL pubblico del backend (es. `https://api.oxyreal.com`).

## Endpoint

- `POST /api/chat` — invio messaggio all'IA. Body: `idToken`, `apiKey?`, `history`, `message`, `imageBase64?`, `language`, `moduleName`, `customAiName`, `nowStr`, `dateISO`. Risposta: `{ answer }`.
- `GET /api/chat/history` — cronologia chat. Header `Authorization: Bearer <idToken>` (o query `idToken`). Risposta: `{ messages }`.
- `POST /api/chat/messages` — salvataggio messaggio. Header o body `idToken`, body `role`, `content`. Risposta: `{ ok: true }`.
- `GET /health` — controllo stato.

## Dati

La cronologia chat è salvata in `data/chats/{uid}.json` (cartella creata all'avvio; `data/` è in `.gitignore`).

## Deploy

Puoi hostare il backend su Railway, Render, Fly.io, o un VPS. Imposta le variabili d’ambiente e assicurati che l’app punti a `EXPO_PUBLIC_BACKEND_URL` in produzione.
