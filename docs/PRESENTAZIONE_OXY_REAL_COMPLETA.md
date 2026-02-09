# OXY Real — Documento di presentazione completo (modello OXY)

**Documento da inoltrare:** presentazione tecnica e funzionale del modello OXY, con tutte le funzionalità attuali e dettagli per esposizione o condivisione con collaboratori/investitori.

*Ultimo aggiornamento: febbraio 2025 — Progetto OXY Real / App del Secolo.*

---

## 1. Cos’è OXY Real (in sintesi)

**OXY Real** è un’applicazione multi-piattaforma (mobile, web, desktop) che mette a disposizione un **compagno conversazionale a base di intelligenza artificiale**: una voce amica che ti conosce, ricorda le tue conversazioni e i tuoi obiettivi, e risponde in modo umano e coerente nel tempo. Non è un assistente generico: è pensata per essere **la tua identità reale potenziata dall’IA** — da qui il nome e il payoff **“Real Identity”**.

- **Ideata e sviluppata da Ivan** nel contesto del progetto “App del Secolo”.
- **Destinatari:** utenti che cercano un compagno digitale costante: qualcuno con cui parlare, riflettere, ricevere feedback sincero ma rispettoso, e che col tempo “ti conosce” davvero.
- **Obiettivo prodotto:** esperienza **continua e coerente**, più vicina a un amico o a un coach che a un assistente.

---

## 2. L’IA al centro: Anima (o Marco)

Al centro c’è un’entità conversazionale che in app puoi chiamare **Anima** (versione “amica”) o **Marco** (versione "amico") — nomi inventati e puramente figurativi. La personalità è **la stessa** per entrambi i nomi: lineare, coerente, adatta sia a chi preferisce un’interlocutrice sia a chi preferisce un interlocutore.

- **Tono:** amichevole, morbido, diretto ma con tatto. Niente frasi da manuale (“Certamente”, “Sono qui per aiutarti”), niente raffiche di domande. Parla come parlerebbe un amico vero.
- **Memoria:** non dimentica. Ricorda cosa le/gli hai detto, i tuoi obiettivi, le tue preferenze e “dove eravate rimasti”. Non chiede di ripetere cose che già sa.
- **Modello tecnico:** **GPT-4o** (OpenAI). Le risposte sono generate da questo modello, con regole e personalità definite nel **prompt di sistema** (backend o, in assenza di backend, in app) in modo che il tono resti sempre quello voluto.

L’utente può impostare un **nome personalizzato** per l’IA (es. “Anima”, “Marco” o altro): il valore viene inviato al backend come `customAiName` e usato in tutto il flusso di chat.

---

## 3. Funzionalità principali (elenco completo)

### 3.1 Chat con l’IA

- **Invio messaggi** e ricezione risposte da Anima/Marco.
- **Cronologia persistente:** quando è configurato il backend (`EXPO_PUBLIC_BACKEND_URL`), la cronologia viene salvata per utente (`data/chats/{uid}.json`) e ripristinata al rientro in app.
- **Messaggio iniziale:** alla prima apertura della chat (utente loggato, chiave configurata, cronologia vuota), l’app può richiedere un **messaggio di benvenuto** generato dall’IA (un saluto breve e caloroso, senza liste di domande), tramite il parametro `initialMessage: true` nella chiamata `POST /api/chat`.
- **Limite lunghezza messaggio:** 4000 caratteri (audit 6.2).
- **Invio da tastiera:** su web/desktop è possibile inviare il messaggio con **Invio**; **Shift+Invio** inserisce una nuova riga.

### 3.2 Memoria a lungo termine (Memory Vault)

- **Memory Vault** (in app: “Le mie note”): spazio in cui l’IA e l’utente accumulano **identità, obiettivi, fatti importanti, promemoria, cose da fare, acquisti da ricordare** (es. “comprare le uova”).
- **Struttura memoria (backend):** per ogni utente viene mantenuto un file `data/memories/{uid}.json` con:
  - `identitySummary` — sintesi della personalità e identità
  - `goals` — obiettivi (lavoro, vita, progetti)
  - `keyFacts` — fatti, preferenze, promemoria, cose da fare
  - `lastContext` — dove eravate rimasti nell’ultima conversazione
- **Tool `save_memory`:** l’IA può chiamare automaticamente `save_memory` quando l’utente dice “ricordami X”, “memorizza Y”, “salva che Z”. Il backend aggiorna il file memoria e conferma. L’IA non deve mai dire che non può memorizzare.
- **API dedicate:**
  - `GET /api/memory` — lettura memoria (schermata “Le mie note”)
  - `POST /api/memory` — salvataggio da app (es. da long-press su messaggio: “Salva come obiettivo” / “Ricordamelo”)
- **Long-press su messaggio:** su un messaggio dell’assistente l’utente può aprire un menu stile WhatsApp con: **Copia**, **Inoltra**, **Condividi**, **Salva come obiettivo**, **Ricordamelo**. Le ultime due chiamano `saveToMemory` (chatService) → `POST /api/memory` con `goal` o `keyFact`.

### 3.3 Ricerca sul web (Tavily)

- Per domande su **fatti recenti (dopo ottobre 2023)** l’IA può cercare in rete tramite **Tavily** e aggiornare le risposte.
- **Tool `web_search`:** parametri `query`, `max_results` (default 5, max 10), `topic` (general, news, finance), `time_range` (day, week, month, year). Il prompt invita l’IA a usare una seconda ricerca con `time_range: "day"` se i dati sembrano vecchi.
- **Backend:** chiave `TAVILY_API_KEY`; chiamata a `https://api.tavily.com/search` con `search_depth: 'advanced'`. I risultati vengono iniettati nel contesto come messaggi di tipo `tool`.
- **Cut-off:** nel prompt di sistema è esplicitato il cut-off ottobre 2023 e l’obbligo di usare `web_search` per informazioni successive.

### 3.4 Vision (analisi immagini)

- **Invio foto:** l’utente può allegare un’immagine dalla galleria o dalla fotocamera (expo-image-picker). L’immagine viene inviata in base64 al backend (`imageBase64` nel body di `POST /api/chat`).
- **Comportamento:** il backend costruisce un messaggio utente multimodale (testo + `image_url`). L’IA analizza l’immagine e può descriverla, suggerire ricette (es. in abbinamento al Power Badge “GOURMET VISION”), generare bozze di mail se è un documento, ecc.
- **Limitazione:** con immagine non vengono usati i tool (web_search, save_memory) in quella richiesta; il modello risponde in un solo round.

### 3.5 Sintesi vocale (TTS)

- **Opzione “Leggi ad alta voce”:** le risposte dell’IA possono essere lette ad alta voce tramite **expo-speech** (lingua `it-IT`, pitch e rate default). L’utente può attivare/disattivare il TTS dalle impostazioni.
- In caso di errore TTS l’app non blocca la chat; viene solo registrato un warning.

### 3.6 Power Badges (“Agisci come”)

- **17 Power Badges** che modificano il contesto della richiesta inviata all’IA: l’utente seleziona un badge e il relativo **prompt** viene preposto al messaggio (es. “Agisci come un esperto di contenuti virali. Trasforma questa idea in un post magnetico: [messaggio]”).
- Elenco:
  1. **SOCIAL TITAN** — contenuti virali, post magnetici  
  2. **GENIUS MODE** — ingegnere capo, analisi e soluzione problemi  
  3. **BUSINESS SHARK** — pitch aggressivo per vendite  
  4. **LEGAL ARMOR** — avvocato d’affari, analisi rischi  
  5. **GHOST WRITER** — scrittore ombra, riscrittura testi  
  6. **DIPLOMATIC BLADE** — comunicazione strategica, risposta a figure autoritarie  
  7. **GOURMET VISION** — chef stellato, ricette da ingredienti/foto frigo  
  8. **SUPPORTO EMOTIVO** — rileva tono emotivo, risposta empatica e adattiva  
  9. **ROUTINE COACH** — coach abitudini, routine personalizzate (obiettivi + memoria)  
  10. **SUGGERIMENTI PROATTIVI** — 1–2 suggerimenti personalizzati (obiettivi e conversazioni)  
  11. **OTTIMISTA** — tono ottimista e costruttivo  
  12. **ANALITICA** — risposta analitica e strutturata (dati, pro/contro, passi chiari)  
  13. **MINIMALISTA** — essenziale e diretto, solo il necessario  
  14. **COACH** — coach personale, domande mirate e prossimi passi concreti  
  15. **PLANNER** — organizzazione giornata e impegni, task e date strutturati  
  16. **CELEBRAZIONE** — celebrazione progressi e traguardi, tono da tifoso  
  17. **LAUNCH COMMANDER** — super esperto marketing app (store, social, pricing, fasce abbonamento, quali Power Badges per fascia; copy e strategia per vendita e conversione)  
- Il **modulo attivo** (badge) viene inviato al backend come `moduleName` e citato nel prompt di sistema.

### 3.7 Accesso e autenticazione

- **Login:** email/password (Firebase Auth). Opzionali **Google** e **Apple** (configurazione Firebase + pacchetti `@react-native-google-signin/google-signin`, `expo-apple-authentication`). Su Android senza config Google il pulsante mostra messaggio; Sign in with Apple è disponibile solo su iOS.
- **Consenso (checkbox):** in fase di registrazione/login l’app può richiedere accettazione Privacy e Termini. Per il **proprietario** (email Master) il backend espone `GET /api/consent-required?email=xxx`: se l’email coincide con `MASTER_EMAIL` (solo in .env backend), risponde `consentRequired: false` e l’app non mostra le checkbox (bypass consenso per il proprietario).
- **Utente Master (Proprietario):** identificato da `EXPO_PUBLIC_MASTER_EMAIL` in app e `MASTER_EMAIL` nel backend. Il Master non inserisce mai una Oxy Key in app: il backend usa `OPENAI_API_KEY` e `TAVILY_API_KEY` proprie. L’identità “Master” è usata per nascondere la sezione Oxy Key e per bypass consenso.

### 3.8 Oxy Key e modelli di distribuzione

- **Oxy Key:** chiave API OpenAI (formato `sk-...`, lunghezza > 20) che l’utente può inserire nelle impostazioni. Salvata in **expo-secure-store** (non in chiaro in AsyncStorage). Valida con `isValidKeyFormat(key)`.
- **Modalità app (`EXPO_PUBLIC_APP_MODE`):**
  - **`subscription`** (default): modello abbonamento. La chiave resta solo sul server; in app non viene mostrato l’input “Inserisci Oxy Key” (l’utente usa le chiavi gestite dal backend).
  - **`one_time_purchase`:** acquisto una tantum. L’app mostra la sezione “Oxy Key” nelle impostazioni; l’utente deve inserire la propria chiave per chattare e usare Vision. Senza chiave valida non può inviare messaggi.
- **Flusso chiave:**  
  - Se c’è backend e utente è Master → backend usa solo chiavi server.  
  - Se c’è backend e utente non Master → backend accetta `apiKey` nel body (Oxy Key inviata dall’app) e la usa per OpenAI/Tavily.  
  - Senza backend (solo dev) → l’app chiama direttamente OpenAI con la chiave in app (Oxy Key o, per Master, `EXPO_PUBLIC_OXY_AI_KEY` se impostata).

### 3.9 Profilo utente (Firestore)

- **Campi:** nome completo, email principale, email di backup, telefono, data di nascita. Salvati in Firestore nella collezione `users`, documento `{uid}`, tramite `profileService` (`saveUserProfile`, `getUserProfile`).
- Se Firestore non è configurato, l’app funziona uguale; i dati estesi non vengono persistiti.
- Regole Firebase consigliate: lettura/scrittura solo su `users/{uid}` per utente autenticato.

### 3.10 Internazionalizzazione (i18n)

- **Lingua:** l’app supporta più lingue (es. italiano, inglese, arabo) tramite `src/i18n/translations.js`. La lingua selezionata viene inviata al backend come `language` in `POST /api/chat` e inserita nel prompt di sistema.
- **Country Picker:** in registrazione è presente un adattatore per la scelta del paese; su web viene usata una variante (`CountryPickerAdapter.web.js`) per compatibilità con il contesto browser.

### 3.11 Contenuti legali e menu

- Dal menu (hamburger) sono accessibili: **Impostazioni**, **Privacy policy**, **Termini di servizio**, **Abbonamento e pagamenti**. I testi sono gestiti da `src/content/legalContent.js`; in `docs/` sono disponibili riferimenti (PRIVACY_POLICY.md, TERMINI_SERVIZIO.md). Prima della release vanno sostituiti i placeholder con i testi definitivi.

### 3.12 Esperienza utente aggiuntive

- **Banner “Sei offline”:** con `@react-native-community/netinfo` l’app può mostrare un avviso quando non c’è connettività (audit 6.3).
- **Frasi motivazionali:** utilità `getWelcomePhraseForHour` e `getHeaderPhraseForHour` per messaggi/header contestuali all’ora.
- **Error Boundary:** componente `ErrorBoundary` per intercettare errori di rendering e mostrare un fallback.
- **Validazione password:** regole (8+ caratteri, maiuscola, minuscola, numero, simbolo) con messaggi specifici; validazione “lazy” al click.
- **Mascheramento email/telefono:** in UI sensibili (es. impostazioni) email e telefono possono essere mostrati mascherati.

---

## 4. Architettura tecnica

### 4.1 Frontend

- **Stack:** React Native con **Expo**. Piattaforme: iOS, Android, **Web** (Expo web).
- **Navigazione/stato:** stato locale (useState, useRef, useCallback) in `App.js`; gestione messaggi, cronologia, Memory Vault, modali, Power Badges, lingua, TTS, Oxy Key.
- **Chiamate backend:** `loadChatHistory`, `saveMessageToDb`, `loadMemory`, `saveToMemory` (chatService); `callOxyAi` (aiService). Base URL da `EXPO_PUBLIC_BACKEND_URL`.
- **Auth:** Firebase Auth (onAuthStateChanged); servizi `authService`, `socialAuthService`; schermata `AuthScreen` per login/registrazione.

### 4.2 Backend (proxy Node.js)

- **Ruolo:** nascondere le chiavi API (OpenAI, Tavily) dall’app; verificare l’utente tramite token Firebase; persistere cronologia chat e memoria a lungo termine.
- **Stack:** Node.js, Express, `cors`, `express.json({ limit: '10mb' })` per supportare immagini in base64.
- **Firebase Admin:** verifica `idToken` (header `Authorization: Bearer` o body/query `idToken`). Se `GOOGLE_APPLICATION_CREDENTIALS` o `FIREBASE_SERVICE_ACCOUNT_JSON` non sono impostati, la verifica token è disattivata (solo dev).
- **Percorsi dati:**  
  - Cronologia: `data/chats/{uid}.json` (oggetto `{ messages: [...] }`).  
  - Memoria: `data/memories/{uid}.json` (identitySummary, goals, keyFacts, lastContext, updatedAt).
- **Porta:** 3030 (configurabile con `PORT`). In ascolto su `0.0.0.0` per essere raggiungibile da altri dispositivi in rete.

### 4.3 Endpoint backend (riepilogo)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST   | /api/chat | Invio messaggio all’IA. Body: idToken, apiKey?, history, message, imageBase64?, language, moduleName, customAiName, nowStr, dateISO, initialMessage?. Risposta: `{ answer [, initialMessage ] }`. |
| GET    | /api/chat/history | Cronologia chat. Auth: Bearer idToken o query idToken. Risposta: `{ messages }`. |
| POST   | /api/chat/history | Stesso payload di GET, via POST (body idToken). |
| POST   | /api/chat/messages | Salvataggio singolo messaggio. Body: idToken?, role, content. Risposta: `{ ok: true }`. |
| GET    | /api/memory | Lettura memoria (Memory Vault). Auth: Bearer o query idToken. Risposta: identitySummary, goals, keyFacts, lastContext. |
| POST   | /api/memory | Salvataggio in memoria. Body: idToken?, goal?, keyFact?. Risposta: `{ ok: true }`. |
| GET    | /api/consent-required | Query `email=xxx`. Risposta: `{ consentRequired }` (false se email === MASTER_EMAIL). |
| GET    | /health | Health check. Risposta: `{ ok: true, service: 'oxy-real-proxy', time }`. |

### 4.4 Flusso chat (backend)

1. App invia `POST /api/chat` con idToken (e opzionale apiKey per non-Master).
2. Backend verifica token; se Master e presenza `OPENAI_API_KEY` usa quella, altrimenti usa `apiKey` dal body.
3. Backend carica memoria utente (`readMemories(uid)`), costruisce il **prompt di sistema** con `buildOxySystemPrompt` (regole fisse + memoryBlock + data/ora + lingua + modulo).
4. Costruisce l’array `messages`: system, history, ultimo messaggio utente (testo o multimodale con immagine); se `initialMessage` invia il messaggio speciale per il saluto iniziale.
5. Se non c’è immagine, allega **tools**: `web_search`, `save_memory`. Chiama OpenAI `gpt-4o` con `tool_choice: 'auto'` e gestisce fino a 5 round di tool calls (Tavily e merge memoria).
6. Risponde all’app con `{ answer }` (e opzionale `initialMessage`).
7. L’app salva user/assistant in cronologia tramite `POST /api/chat/messages` (due chiamate dopo ogni risposta).

### 4.5 Desktop (Electron)

- **Cartella:** `desktop/`. Applicazione **Electron** che apre una finestra con titolo “OXY Real - Anima” e carica l’URL dell’app web (es. `http://localhost:8081/?platform=web`).
- **Requisiti:** avviare prima dalla root `npx expo start --web`, poi da `desktop/` eseguire `npm start`. Stesso backend e stesso account Firebase del telefono; stesse funzionalità (chat, Memory Vault, Power Badges, ecc.).
- **Dimensioni finestra:** width 420, height 800; min 360x600. Sfondo `#0a0a0a`. Icona da `assets/icon.png`.
- Per build installabile (es. .exe) si può usare `electron-builder` e, in produzione, puntare a build web esportata con `npx expo export --platform web`.

### 4.6 Connessione app ↔ backend

- **Problema tipico “Impossibile raggiungere il server”:** telefono e PC devono essere sulla **stessa rete Wi‑Fi** (il cavo USB non basta per le chiamate HTTP). In `.env` dell’app: `EXPO_PUBLIC_BACKEND_URL=http://IP_PC:3030` (es. `192.168.1.5`). Dopo modifica .env, riavviare Expo.
- **Firewall:** consentire la porta 3030 per Node/rete privata.
- **Solo USB (Android):** possibile usare `adb reverse tcp:3030 tcp:3030` e `EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:3030`.

---

## 5. Differenza rispetto a un chatbot classico

| Aspetto   | Chatbot classico              | OXY Real |
|----------|--------------------------------|----------|
| Memoria  | Spesso solo sessione corrente  | Memoria a lungo termine (Memory Vault: identità, obiettivi, keyFacts, lastContext) + cronologia persistente |
| Personalità | Generica o “assistente”    | Fissa: Anima/Marco, amica/amico, morbida e coerente |
| Coerenza | Può contraddirsi tra sessioni  | Riprende da dove eravate; non chiede di ripetere; save_memory e POST /api/memory |
| Obiettivo | Completare task               | Compagno continuo, “identità reale potenziata” |
| Ricerca  | Raramente integrata            | Tavily integrato (web_search) per dati dopo ottobre 2023 |
| Immagini | Non sempre                     | Vision (GPT-4o multimodale) con invio foto |
| Voce     | Non sempre                     | TTS (expo-speech) opzionale |
| Modalità “potenziate” | Assenti          | Power Badges (17 modalità “Agisci come”) |

---

## 6. Riepilogo stack e variabili

- **Frontend:** React Native (Expo), iOS, Android, Web. Componenti: SafeAreaView, KeyboardAvoidingView, Modal, ScrollView, RefreshControl (Memory Vault).
- **Autenticazione:** Firebase Auth (email/password, Google, Apple). Firestore per profilo esteso (users).
- **IA:** OpenAI GPT-4o; prompt di sistema con regole fisse, memoria, data/ora, lingua, modulo; tools web_search (Tavily) e save_memory.
- **Ricerca web:** Tavily (backend: TAVILY_API_KEY).
- **Backend:** Node.js, Express, porta 3030; Firebase Admin per idToken; file in `data/chats` e `data/memories`.
- **Variabili ambiente app:** EXPO_PUBLIC_BACKEND_URL, EXPO_PUBLIC_FIREBASE_*, EXPO_PUBLIC_MASTER_EMAIL, EXPO_PUBLIC_APP_MODE (subscription | one_time_purchase), (opzionale) EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
- **Variabili ambiente backend:** OPENAI_API_KEY, TAVILY_API_KEY, MASTER_EMAIL, PORT, GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON.

---

## 7. Come condividere questo documento

Puoi inoltrare il file **`docs/PRESENTAZIONE_OXY_REAL_COMPLETA.md`** (o una sua copia/export in PDF) al tuo amico o a chi deve avere il quadro completo del modello OXY. Il documento è pensato per essere **completo e non sintetizzato**, adatto a una presentazione tecnica e funzionale con tutti i dettagli su funzioni, API, architettura e flussi.

---

*Fine documento — OXY Real / App del Secolo — Febbraio 2025.*
