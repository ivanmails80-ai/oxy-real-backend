# Audit Production Ready — OXY Real

**Data audit:** 2026-02-09  
**Obiettivo:** Verificare se l’app è pronta per la vendita di un abbonamento "Master" come prodotto professionale.  
**Esito:** **NON ancora pienamente production ready** per la vendita di un abbonamento Master; molte criticità tecniche sono state risolte, restano soprattutto modello abbonamento/pagamenti e alcuni punti di configurazione/prodotto.

---

## 1. SICUREZZA

### 1.1 Chiavi API esposte nel client (CRITICO) — ✅ FATTO
- **Dove (storico):** `EXPO_PUBLIC_OXY_AI_KEY`, `EXPO_PUBLIC_TAVILY_API_KEY`, `EXPO_PUBLIC_MASTER_EMAIL` in `.env` sono lette con `process.env.EXPO_PUBLIC_*`.
- **Problema:** In Expo/React Native le variabili `EXPO_PUBLIC_*` vengono incluse nel bundle dell’app. Chi estrae l’APK/IPA può recuperare queste chiavi. Una chiave Master OpenAI nel client è un rischio gravissimo (uso non autorizzato, costi, abuso).
- **Cosa fare:** Spostare l’uso delle chiavi OpenAI e Tavily su un backend (proxy): l’app invia il messaggio al tuo server, il server chiama OpenAI/Tavily con chiavi solo lato server. Il "Master" deve essere un utente riconosciuto dal backend, non una chiave nel client.

### 1.2 Profilo utente non persistito (ALTO) — ✅ FATTO
- **Dove (storico):** In registrazione si inviavano `emailSecondaria`, `telefono`, `dataNascita` a `signUpWithProfile` ma il profilo esteso non veniva salvato.
- **Cosa è stato fatto:**  
  - Aggiunto `profileService.js` con persistenza del profilo esteso su Firestore (`users/{uid}`) e caricamento alla login (`saveUserProfile`, `getUserProfile`).  
  - `authService.js` ora salva e rimonta `backup_email`, `phone`, `birth_date` unendo i dati Firebase con quelli Firestore, sia in `signInWithEmailPassword` sia in `restoreSessionAndProfile`.  
- **Stato attuale:** Il profilo utente esteso è persistito correttamente lato server (quando Firestore è configurato); se Firestore manca, l’app continua a funzionare ma senza questo plus.

### 1.3 Admin / Master hardcoded (MEDIO)
- **Dove (ora):** Non ci sono più costanti `ADMIN_EMAIL` / `ADMIN_USER_ID` in `App.js`. Resta `EXPO_PUBLIC_MASTER_EMAIL` in `oxyKeyService.js` come unica fonte per riconoscere il "Proprietario Master".
- **Problema:** Il ruolo Master è ancora deciso da una email in chiaro in env/client; per un prodotto venduto in scala è preferibile un sistema ruoli lato backend/Firestore (es. campo `role: 'master'` su profilo) e controllo centralizzato.
- **Cosa fare:** Per il lancio iniziale con pochi utenti il modello attuale può essere accettabile; per step successivo passare a ruoli/permessi gestiti dal backend.

---

## 2. PERSISTENZA DATI

### 2.1 Cronologia chat non persistita (CRITICO) — ✅ FATTO
- **Dove (storico):** `src/services/chatService.js`: `loadChatHistory()` restituisce sempre `[]`, `saveMessageToDb()` è un no-op.
- **Problema:** La chat è solo in memoria. Alla chiusura dell’app o al cambio dispositivo **tutta la cronologia va persa**. Per un abbonamento a pagamento è inaccettabile.
- **Cosa fare:** Implementare persistenza reale: Firestore (o Supabase/altro) con collezione `chats` o `messages` per userId, e usarla in `loadChatHistory` / `saveMessageToDb`. Oppure un backend che salva e restituisce i messaggi.
- **Fatto:** Backend `GET/POST /api/chat/history` e `POST /api/chat/messages`; persistenza in `data/chats/{uid}.json`; chatService e App.js con idToken.

### 2.2 Preferenze solo in locale (BASSO)
- **Dove:** Alcune preferenze (es. nome IA personalizzato, immagine profilo locale, config server) sono ancora salvate solo in AsyncStorage.
- **Stato:** Il profilo esteso principale (email di backup, telefono, data di nascita) è ora remoto (vedi 1.2). Restano locali solo preferenze "cosmetiche".
- **Cosa fare:** Facoltativo per il primo lancio: se vuoi che nome IA, avatar e preferenze siano sincronizzati tra dispositivi, estendere `profileService` e App per salvarle e rileggerle da backend/Firestore.

---

## 3. FUNZIONALITÀ SIMULATE / NON PRONTE

### 3.1 Login social (Google, Apple) (ALTO) — ✅ FATTO (Microsoft ancora in arrivo)
- **Dove (ora):** `AuthScreen.js` usa `signInWithGoogle` e `signInWithApple` da `socialAuthService.js`. Microsoft resta esplicitamente marcato "in arrivo".
- **Cosa è stato fatto:**  
  - Implementato login reale con Google (`@react-native-google-signin/google-signin` + `signInWithCredential` Firebase).  
  - Implementato login reale con Apple (`expo-apple-authentication` + `OAuthProvider('apple.com')`).  
  - Entrambi recuperano il profilo esteso da Firestore se presente (`getUserProfile`) e persistono la sessione con `persistSession`.
- **Cosa resta:**  
  - Configurazione corretta di credenziali e `webClientId` in `.env` / Firebase / Google Cloud / Apple Developer (parte operativa, non di codice).  
  - Microsoft può rimanere esplicitamente "non disponibile" o essere implementato in una versione successiva.

### 3.2 Cloud / Server / Drive / iCloud — SOLO UI (ALTO) — ✅ FATTO (messaggio "in arrivo")
- **Dove:** Menu "Gestione Cloud" con opzioni Drive, iCloud, Server personalizzato. "CONNETTI SERVER" esegue solo `Alert.alert(..., t('cloud.serverSuccess'))` senza alcuna chiamata di rete.
- **Problema:** Nessun upload, nessuna sincronizzazione, nessuna connessione reale a Drive/iCloud/server. L’utente crede di configurare un backup/sync ma non succede nulla.
- **Cosa fare:** O implementare integrazioni reali (API Google Drive, iCloud, tuo backend) con upload/sync, o rimuovere/nascondere la sezione e comunicare "in arrivo" in modo esplicito (es. solo in una schermata "Funzionalità prossimamente").
- **Fatto:** La vista Cloud mostra "Funzionalità in arrivo" e il sottotitolo spiega che la sincronizzazione sarà disponibile in un prossimo aggiornamento. Il pulsante "CONNETTI SERVER" mostra un Alert "Disponibile in un prossimo aggiornamento." (nessun messaggio di successo finto).

### 3.3 Abbonamento "Master" — LOGICA SOLO LATO CLIENT (ALTO)
- **Dove:** "Master" = email in `EXPO_PUBLIC_MASTER_EMAIL` + chiave in `EXPO_PUBLIC_OXY_AI_KEY`; nessun pagamento, nessun backend che verifica abbonamento.
- **Problema:** Non esiste un vero abbonamento a pagamento: è solo una lista di email/chiavi in env. Nessuna verifica di pagamento, nessun rinnovo, nessuna revoca.
- **Cosa fare:** Per vendere un abbonamento Master servono: integrazione pagamenti (Stripe, RevenueCat, ecc.), backend che verifica stato abbonamento e assegna il ruolo "Master" (o l’accesso alla chiave condivisa dietro proxy), e rimozione della chiave Master dal client (vedi 1.1).

---

## 4. GESTIONE ERRORI E ROBUSTEZZA

### 4.1 Timeout sulle chiamate IA (MEDIO) — ✅ FATTO
- **Dove:** `aiService.js`: funzioni `fetchWithTimeout` e costante `AI_REQUEST_TIMEOUT_MS = 90000`.
- **Cosa è stato fatto:**  
  - Tutte le chiamate a OpenAI (dirette o via backend) passano da `fetchWithTimeout`, che usa `AbortController` e interrompe la richiesta dopo ~90s.  
  - In caso di abort viene ritornato l’errore `ABORTED_MESSAGE` gestito in App (vedi 4.2).

### 4.2 Errore IA salvato come messaggio dell’assistente (BASSO) — ✅ FATTO
- **Dove (storico):** In `sendMessage` l’errore veniva salvato come messaggio `assistant` e mostrato in chat come se fosse una risposta.
- **Cosa è stato fatto:**  
  - In `App.js` il catch di `sendMessage` rimuove il placeholder "sta pensando" e **non** aggiunge più un messaggio `assistant` con l’errore.  
  - L’errore viene mostrato tramite `Alert` e, opzionalmente, voce di fallback, tenendo la cronologia pulita.

### 4.3 Error Boundary React (MEDIO) — ✅ FATTO
- **Dove:** `src/components/ErrorBoundary.js` e uso diffuso in `App.js` (wrappa schermata di loading, errori auth, schermata Auth, schermata principale).
- **Cosa è stato fatto:**  
  - Implementato `ErrorBoundary` con `getDerivedStateFromError` e `componentDidCatch`.  
  - UI di fallback personalizzata con messaggio "Qualcosa è andato storto" e pulsante "Riprova".

### 4.4 Tavily senza chiave: fallback silenzioso (MEDIO)
- **Dove:**  
  - Client: `tavilyService.js` legge `EXPO_PUBLIC_TAVILY_API_KEY` e, se assente, restituisce `{ error: 'Tavily API key non configurata', results: [] }`.  
  - Backend: `backend/index.js` espone `tavilySearchServer` che usa `TAVILY_API_KEY` solo lato server e viene chiamato da `/api/chat` quando l’IA usa lo strumento `web_search`.
- **Stato attuale:** Se non è configurata nessuna chiave Tavily (né lato client né lato backend) l’IA risponde comunque, ma senza dati di ricerca aggiornati; l’utente non ha sempre un’indicazione visiva chiara che la ricerca web non è attiva.
- **Cosa fare:** Preferire la configurazione Tavily solo lato backend; in più, rendere esplicito in app (es. nelle impostazioni o nella sezione di ricerca) quando la ricerca web non è configurata o è disattivata, così l’utente non si aspetta risultati “in tempo reale”.

---

## 5. CONFIGURAZIONE E DEPLOY

### 5.1 Variabili d’ambiente documentate (MEDIO) — ✅ FATTO
- **Dove:** File `.env.example` in root e README.
- **Cosa è stato fatto:**  
  - Aggiunto `.env.example` con tutte le chiavi necessarie (Firebase, backend, Google Sign-In, Master email, modalità app, Oxy Key/Tavily opzionali).  
  - Commenti espliciti su cosa **non** va impostato nelle build di produzione (no `EXPO_PUBLIC_OXY_AI_KEY` / `EXPO_PUBLIC_TAVILY_API_KEY` per app in abbonamento).

### 5.2 Dipendenza Supabase inutilizzata (BASSO)
- **Dove:** `package.json` contiene ancora `@supabase/supabase-js`, ma il codice non usa più Supabase (chatService ora punta al backend custom).
- **Problema:** Dipendenza inutile che aumenta dimensione bundle e superficie di aggiornamento, senza portare valore nella versione attuale.
- **Cosa fare:** Rimuovere `@supabase/supabase-js` se non si prevede di riutilizzarlo a breve; in alternativa, documentare esplicitamente che è una dipendenza per una futura evoluzione (e non parte della versione corrente).

---

## 6. ESPERIENZA UTENTE E EDGE CASE

### 6.1 Recupero password (MEDIO) — ✅ FATTO
- **Dove:** `AuthScreen.js` usa `requestPasswordReset` da `authService.js` (che a sua volta chiama `sendPasswordResetEmail` di Firebase).
- **Cosa è stato fatto:**  
  - Aggiunto link "Password dimenticata?" che richiede l’email e invia l’email di reset.  
  - Gestione messaggi di errore chiari (account non trovato, errore generico).

### 6.2 Limite esplicito alla lunghezza messaggio (BASSO) — ✅ FATTO
- **Dove:** `App.js`, costante `MAX_MESSAGE_LENGTH` e input chat.
- **Cosa è stato fatto:**  
  - Impostato `MAX_MESSAGE_LENGTH` (2000 in modalità subscription, 8000 in modalità one_time_purchase).  
  - Validazione lato JS: se il messaggio supera il limite viene mostrato un Alert e la chiamata IA non parte.  
  - `TextInput` ha `maxLength={MAX_MESSAGE_LENGTH}` per coerenza UX.

### 6.3 Offline / rete assente (MEDIO) — ✅ FATTO
- **Dove:** Hook `useNetInfo.js` e `App.js`.
- **Cosa è stato fatto:**  
  - Aggiunto hook che usa `@react-native-community/netinfo` (se disponibile) per leggere `isConnected`.  
  - In `App.js` viene mostrato un banner "Sei offline. Connessione richiesta per inviare messaggi." quando `isConnected === false` e le chiamate IA gestiscono distintamente gli errori di rete.

---

## 7. RIEPILOGO PRIORITÀ (AGGIORNATO 2026-02-09)

| Priorità   | Cosa resta da fare |
|-----------|--------------------|
| **CRITICO** | Abbonamento Master reale: integrazione pagamenti (Stripe/RevenueCat/IAP) + backend che verifica stato abbonamento e assegna il ruolo Master. |
| **ALTO**    | Definire modello ruoli per Master/Admin lato backend/Firestore (invece che solo via `EXPO_PUBLIC_MASTER_EMAIL`). |
| **MEDIO**   | Migliorare UX ricerca web Tavily quando la chiave non è configurata (messaggio più visibile all’utente finale); aggiungere rate limiting lato backend per prevenire abusi; rendere più rigorosa la validazione degli input sulle API (diario, memoria, billing, ecc.). |
| **BASSO**   | Sincronizzare anche preferenze cosmetiche (nome IA personalizzato, avatar, ecc.) lato backend; rimuovere `@supabase/supabase-js` se non utilizzato; ripulire eventuali log non essenziali in produzione e rendere più generici i messaggi di errore presentati all’utente, mantenendo i dettagli solo nei log server. |

---

## 8. HARDENING DI PRODUZIONE (NUOVO)

- **Rate limiting backend (MEDIO)**  
  Attualmente il backend gestisce il rate limit di OpenAI (429) con retry, ma non esiste un rate limiting per utente/IP sulle API. Per un lancio pubblico è consigliato introdurre un middleware (es. `express-rate-limit`) per proteggere `/api/chat`, `/api/voice`, `/api/tts`, `/api/billing` e ridurre rischi di abuso.

- **Validazione input API (MEDIO)**  
  Endpoint come `/api/memory`, `/api/diary`, `/api/stories/state`, `/api/billing/checkout` fanno controlli di base ma non usano una validazione strutturata degli input. Per maggiore robustezza è consigliato introdurre uno schema validator (Joi, Zod, `express-validator`, ecc.) e limitare lunghezza/forma dei campi.

- **Log e messaggi di errore (BASSO)**  
  `console.log`/`console.warn` sono usati soprattutto per errori (accettabile). Per la versione store si può:  
  - ridurre i log non essenziali,  
  - rendere più generici i messaggi di errore mostrati all’utente (senza codici tecnici o testi raw delle API), mantenendo i dettagli completi solo nei log server.

---

## Conclusione

Molte criticità tecniche originarie sono state risolte: le chiavi sensibili possono essere usate solo via backend, la cronologia chat è persistita lato server, il profilo esteso è salvato su Firestore, esistono ErrorBoundary, gestione offline, limite messaggi e recupero password, e i login social Google/Apple sono implementati (a configurazione completata).

L’app **non è ancora pienamente pronta** per essere venduta come abbonamento Master finché:

1. Non esiste un vero flusso di pagamento e rinnovo (Stripe/RevenueCat/IAP) collegato al ruolo Master sul backend.  
2. Il ruolo Master resta legato a una email in env/client anziché a ruoli/permessi gestiti centralmente.  
3. Non è stata presa una decisione chiara su cosa sincronizzare come preferenze cross-dispositivo (facoltativo per il primo lancio).  

Una volta chiusi i punti critici sopra, l’app può essere considerata pronta per un lancio commerciale; i punti di priorità bassa riguardano pulizia tecnica e perfezionamento dell’esperienza d’uso.
