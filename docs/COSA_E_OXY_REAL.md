# Cos’è OXY Real — Guida per chi non l’ha mai usato

Documento da condividere con amici o collaboratori per spiegare in modo chiaro e dettagliato di cosa si tratta.

---

## In una frase

**OXY Real** è un’app mobile (per smartphone) che mette in tasca un compagno a base di intelligenza artificiale: una voce amica che ti conosce, ricorda le tue conversazioni e i tuoi obiettivi, e ti risponde in modo umano e coerente nel tempo. Non è un “assistente” generico: è pensata per essere **la tua identità reale, potenziata dall’IA** — da qui il nome e il payoff “Real Identity”.

---

## Chi c’è dietro e a chi è rivolta

- **Ideata e sviluppata da Ivan** (progetto “App del Secolo”).
- Rivolta a chi vuole un **compagno digitale** costante: qualcuno con cui parlare, riflettere, ricevere feedback sincero ma morbido, e che col tempo “ti conosce” davvero.
- Non è una semplice chat con un bot: l’obiettivo è un’esperienza **continua e coerente**, più vicina a un amico o a un coach che a un assistente.

---

## L’IA: Anima (o Marco)

Al centro c’è un’entità conversazionale che in app puoi chiamare **Anima** (versione “amica”) o **Marco** (versione "amico") — nomi inventati e puramente figurativi. La personalità è **la stessa** per entrambi i nomi: lineare, coerente, adatta sia a chi preferisce un’interlocutrice sia a chi preferisce un interlocutore.

- **Tono**: amichevole, morbido, diretto ma con tatto. Niente frasi da manuale (“Certamente”, “Sono qui per aiutarti”), niente raffiche di domande. Parla come parlerebbe un amico vero.
- **Memoria**: non dimentica. Ricorda cosa le/gli hai detto, i tuoi obiettivi, le tue preferenze e “dove eravate rimasti”. Non ti chiede di ripetere cose che già sa.
- **Modello tecnico**: usa **GPT-4o** (OpenAI). Le risposte sono generate da questo modello, con regole e personalità definite nel sistema in modo che il tono resti sempre quello voluto.

---

## Cosa fa l’app (funzionalità principali)

1. **Chat con l’IA**  
   Scrivi messaggi e ricevi risposte da Anima/Marco. La cronologia viene salvata (se usi il backend), così quando riapri l’app la conversazione continua da dove era rimasta.

2. **Memoria a lungo termine**  
   L’IA può salvare informazioni su di te (sintesi di identità, obiettivi, fatti importanti, ultimo contesto). Queste vengono rilette a ogni conversazione, così le risposte sono sempre contestualizzate e coerenti.

3. **Ricerca sul web (quando serve)**  
   Per domande su fatti recenti (dopo ottobre 2023) l’IA può cercare in rete (tramite Tavily) e aggiornare le risposte. Utile per notizie, dati, mercati, ecc.

4. **Vision (immagini)**  
   Puoi inviare foto: l’IA le analizza e risponde sul contenuto (descrizioni, suggerimenti, bozze di mail se è un documento, ecc.).

5. **Voce (TTS)**  
   Opzione per far leggere ad alta voce le risposte (sintesi vocale).

6. **Accesso**  
   Login con email/password o (se configurato) con Google/Apple. Esiste un utente “Master” che usa le chiavi gestite dal server; gli altri utenti possono usare una propria “Oxy Key” (chiave API) a seconda del modello di business scelto.

7. **Contenuti legali e abbonamento**  
   In app sono presenti (o previsti) testi per Privacy policy, Termini di servizio e Abbonamento e pagamenti, accessibili dal menu.

---

## Come funziona “sotto il cofano” (in parole semplici)

- **App (telefono)**  
  Applicazione mobile realizzata con **React Native / Expo**. Gestisce login, chat, invio messaggi, cronologia a schermo e chiamate verso il backend.

- **Backend (server)**  
  Un server (Node.js/Express) che:
  - riceve i messaggi dall’app (con identificazione utente tramite token Firebase);
  - gestisce le chiavi API (OpenAI, Tavily) in modo che non stiano nell’app;
  - salva la **cronologia chat** (per utente) e la **memoria a lungo termine** (identità, obiettivi, contesto);
  - risponde all’app con il testo generato dall’IA.

- **Memoria**  
  Per ogni utente il backend mantiene un “profilo memoria” (cosa l’IA ha capito di te, obiettivi, ultimo contesto). A ogni richiesta questo contesto viene iniettato nel sistema così che l’IA risponda in modo coerente e senza chiedere di nuovo cose già note.

- **Modelli di distribuzione**  
  L’app può essere configurata in due modalità:
  - **Abbonamento (subscription)**: la chiave API resta solo sul server; l’utente non inserisce nulla in app.
  - **Acquisto una tantum (one-time purchase)**: l’utente può inserire la propria “Oxy Key” per usare la chat.

---

## Differenza rispetto a un chatbot “normale”

| Aspetto        | Chatbot classico     | OXY Real                          |
|----------------|----------------------|-----------------------------------|
| Memoria        | Spesso solo la chat corrente | Memoria a lungo termine per identità, obiettivi, contesto |
| Personalità    | Generica o “assistente”      | Fissa: amica/amico (Anima/Marco), morbida e coerente |
| Coerenza       | Può contraddirsi tra sessioni | Riprende da dove eravate, non richiede di ripetere |
| Obiettivo      | Completare task      | Essere un compagno continuo (“identità reale potenziata”) |

---

## Riepilogo tecnico (per chi è curioso)

- **Frontend**: React Native (Expo), iOS e Android.
- **Autenticazione**: Firebase Auth (email/password, opzionale Google/Apple).
- **IA**: OpenAI GPT-4o, con prompt di sistema che definiscono Anima/Marco e le regole (tono, memoria, niente interrogatori).
- **Ricerca web**: Tavily (chiamata dal backend).
- **Backend**: Node.js, Express, porta 3030; endpoint principali: `POST /api/chat`, `GET /api/chat/history`, `POST /api/chat/messages`, `GET /health`.
- **Dati**: cronologia chat e memoria utente salvate lato server (file o, in futuro, database/Firebase).

---

## Come condividere questo documento

Puoi inoltrare il file **`docs/COSA_E_OXY_REAL.md`** (o una sua copia/export in PDF) a chi vuoi. Se preferisci una versione più breve o solo per “pitch” commerciale, si può ricavare una versione ridotta a partire da questo testo.

---

*Ultimo aggiornamento: febbraio 2025 — progetto OXY Real / App del Secolo.*
