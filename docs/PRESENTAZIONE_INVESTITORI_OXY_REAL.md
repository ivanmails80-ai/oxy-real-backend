# OXY Real — Documento per Investitori
## La tua identità reale, potenziata dall'IA

**Confidenziale — Uso esclusivo per valutazione investimento**  
*Versione: 1.0 — Febbraio 2026 — Progetto App del Secolo / SecondSelf*

---

## Indice

1. [Executive Summary](#1-executive-summary)
2. [Visione e posizionamento](#2-visione-e-posizionamento)
3. [Prodotto: cos'è OXY Real (dettaglio completo)](#3-prodotto-cosè-oxy-real-dettaglio-completo)
4. [Funzionalità: elenco esaustivo](#4-funzionalità-elenco-esaustivo)
5. [Architettura tecnica e stack](#5-architettura-tecnica-e-stack)
6. [Modello di business e monetizzazione](#6-modello-di-business-e-monetizzazione)
7. [Confronto con il mercato: OXY vs competitor](#7-confronto-con-il-mercato-oxy-vs-competitor)
8. [Roadmap e differenziazione](#8-roadmap-e-differenziazione)
9. [Team, titolarità e struttura](#9-team-titolarità-e-struttura)
10. [Aspetti legali, privacy e compliance](#10-aspetti-legali-privacy-e-compliance)
11. [Go-to-market e scalabilità](#11-go-to-market-e-scalabilità)
12. [Opportunità di investimento](#12-opportunità-di-investimento)
13. [Trazione e stato attuale](#13-trazione-e-stato-attuale)
14. [Metriche obiettivo e KPI](#14-metriche-obiettivo-e-kpi)
15. [Rischi e mitigazione](#15-rischi-e-mitigazione)
16. [Riepilogo e prossimi passi](#16-riepilogo-e-prossimi-passi)

---

## 1. Executive Summary

**OXY Real** è un'applicazione multi-piattaforma (mobile iOS/Android, web, desktop) che offre un **compagno conversazionale a intelligenza artificiale** non paragonabile a un semplice chatbot: è progettata come **estensione della propria identità** — un'entità che ti conosce nel tempo, ricorda obiettivi e preferenze, risponde in modo coerente e umano e si adatta al contesto (personale, lavoro, creatività, supporto emotivo) attraverso modalità dedicate chiamate **Power Badges**.

- **Problema che risolve:** gli assistenti AI sul mercato sono per lo più generici, senza memoria persistente, senza personalità coerente e senza un modello che unisca compagnia emotiva, produttività e strumenti professionali in un'unica esperienza continuativa.
- **Soluzione:** un unico compagno IA (nome personalizzabile dall'utente) con memoria a lungo termine (**Memory Vault**), ricerca web in tempo reale, analisi immagini (Vision), sintesi vocale e input vocale, diario interattivo, storie a livelli, 17 modalità "Agisci come" (Power Badges) e supporto multilingue — il tutto con un'esperienza coerente su smartphone, browser e desktop.
- **Modello di business:** abbonamenti mensili (OXY Pass Starter / Pro / Elite) e licenze lifetime (Starter / Pro / Elite), con integrazione Stripe e store (App Store, Google Play). Opzione "Oxy Key" per utenti lifetime che portano la propria chiave API OpenAI.
- **Destinatari:** utenti 18+ che cercano un compagno digitale costante: professionisti, creativi, studenti, chi vuole supporto emotivo e organizzativo senza rinunciare a uno strumento potente e personalizzato.
- **Differenziatore chiave:** non siamo "un altro chatbot". Siamo **Real Identity** — l'IA che diventa parte del tuo percorso, ti ricorda chi sei e dove stai andando, e si adatta con un clic da amica/coach a esperto di business, legale o marketing.

---

## 2. Visione e posizionamento

### 2.1 Payoff e brand

- **Nome:** OXY Real  
- **Payoff:** *La tua identità reale, potenziata dall'IA* (Real Identity)  
- **Posizionamento:** primo compagno AI che unisce in un'unica app:
  - **Relazione continua** (memoria, coerenza, tono amichevole ma non invadente)
  - **Produttività e professionalità** (Power Badges: business, legale, contenuti, marketing, piano giornaliero)
  - **Crescita personale** (diario, storie a livelli, obiettivi in Memory Vault)
  - **Informazione aggiornata** (ricerca web Tavily per dati dopo ottobre 2023)
  - **Multimodalità** (testo, voce, immagini, documenti PDF/DOCX)

### 2.2 Perché "diverso" dal mercato

Il mercato degli AI companion si divide grossomodo in:
- **Assistenti generalisti** (es. ChatGPT, Copilot): potenti ma senza identità relazionale, memoria limitata o a sessione, tono da "assistente".
- **Companion emotivi** (es. Replika, Nomi): focalizzati su relazione e supporto emotivo, meno su produttività e strumenti professionali.
- **Piattaforme a personaggi** (es. Character.AI): tanti personaggi, poca continuità e poca memoria strutturata per singolo utente.

**OXY Real** occupa lo spazio **in mezzo e oltre**: un *unico* compagno IA con personalità coerente e nome personalizzabile, memoria a lungo termine strutturata, *più* 17 modalità specializzate (Power Badges) che trasformano la stessa entità in esperto di contenuti virali, avvocato, chef, coach, planner, esperto di lancio app, ecc. Nessun competitor oggi offre questo mix in un'unica identità con memoria persistente e multilingue (italiano, inglese, spagnolo, francese, arabo, cinese).

---

## 3. Prodotto: cos'è OXY Real (dettaglio completo)

### 3.1 L'entità conversazionale (compagno IA)

- L'utente può **personalizzare il nome** del compagno IA (es. un nome di propria scelta). La personalità è **unica e coerente** indipendentemente dal nome: tono da amico/amica, mai da assistente generico.
- **Tono:** amichevole, morbido, diretto ma con tatto. Niente frasi da manuale ("Certamente", "Sono qui per aiutarti"), niente raffiche di domande. Parla come un amico vero.
- **Memoria:** l'IA non dimentica. Ricorda identità, obiettivi, fatti importanti, promemoria e "dove eravate rimasti". Non chiede di ripetere cose già note.
- **Modello:** OpenAI **GPT-4o** (multimodale: testo + immagini). Il prompt di sistema definisce regole, personalità, lingua, data/ora e modulo attivo (Power Badge).

### 3.2 Memory Vault ("Le mie note")

- Spazio persistente per ogni utente: **identità**, **obiettivi**, **fatti chiave**, **promemoria**, **cose da fare**, **ultimo contesto**.
- L'IA può salvare in memoria tramite tool **save_memory** quando l'utente dice "ricordami X", "memorizza Y", "salva che Z".
- Dall'app: long-press su un messaggio dell'assistente → **Salva come obiettivo** / **Ricordamelo** → chiamata `POST /api/memory`.
- La memoria viene iniettata nel contesto a ogni richiesta chat, garantendo risposte sempre contestualizzate.

### 3.3 Power Badges ("Agisci come")

- **17 modalità** che modificano il contesto della richiesta: l'utente seleziona un badge e il relativo prompt viene preposto al messaggio.
- Esempi: **SOCIAL TITAN** (contenuti virali), **GENIUS MODE** (ingegnere capo), **BUSINESS SHARK** (pitch vendite), **LEGAL ARMOR** (avvocato), **GHOST WRITER**, **DIPLOMATIC BLADE**, **GOURMET VISION** (ricette da foto/ingredienti), **SUPPORTO EMOTIVO**, **ROUTINE COACH**, **PLANNER**, **LAUNCH COMMANDER** (esperto marketing app e store), **COACH**, **CELEBRAZIONE**, **OTTIMISTA**, **ANALITICA**, **MINIMALISTA**, **SUGGERIMENTI PROATTIVI**.
- Un solo compagno, molte "lenti" professionali ed emotive: differenziatore forte rispetto a qualsiasi altro prodotto sul mercato.

### 3.4 Ricerca web (Tavily)

- Per domande su **fatti successivi a ottobre 2023** l'IA usa il tool **web_search** (Tavily) con parametri configurabili (query, max_results, topic, time_range).
- I risultati vengono iniettati nel contesto; l'IA aggiorna le risposte con informazioni attuali (notizie, dati, mercati).

### 3.5 Vision (analisi immagini)

- Invio foto da galleria o fotocamera. L'immagine viene inviata in base64 al backend; GPT-4o analizza e risponde (descrizioni, ricette da frigo, bozze mail da documenti, ecc.).
- Con immagine, in quella richiesta non vengono usati tool (web_search, save_memory); risposta in un solo round.

### 3.6 Voce: TTS e input vocale

- **TTS (text-to-speech):** risposte lette ad alta voce (expo-speech su device; backend supporta anche OpenAI TTS con 6 voci: Executive, Brilliant, Harmony, Deep, Strategist, Kind Partner). Lingua e preferenze configurabili.
- **Input vocale (speech-to-text):** registrazione audio inviata al backend → **Whisper** (OpenAI) → testo inserito nell'input chat. Ideale per uso hands-free.

### 3.7 Diario interattivo

- Temi personali, entry e **progressSummary** generato/aggiornato dall'IA. Backend: `GET/POST /api/diary`; storage per utente in `data/diary/{uid}.json`.
- Integrazione con Memory Vault e storie: l'utente può scrivere riflessioni nel diario o condividerle in chat con OXY.

### 3.8 Storie a livelli

- Narrativa guidata a step (es. "Primo passo", "Tre giorni") con stato persistente per utente (`GET/POST /api/stories/state`). Le storie coinvolgono l'utente e si collegano al diario e alla chat per un'esperienza continuativa.

### 3.9 Documenti (PDF, DOCX, TXT)

- **Estrazione testo:** l'utente seleziona un file (dispositivo o provider come Drive/iCloud/OneDrive). Backend: `POST /api/docs/extract` — estrazione con pdf-parse, mammoth (DOCX), testo raw per TXT/MD/CSV/JSON. Testo (max 60k caratteri) restituito all'app per uso in chat.
- **Invio email:** su richiesta utente, invio documento via email (client device o, se configurato, invio automatico server con SMTP). `POST /api/docs/email` con limiti anti-abuso (es. invio solo alla propria email account).

### 3.10 OXY TV (MVP)

- Feed episodi generati dal backend: sintesi da feed RSS (es. ANSA), generazione audio (TTS) e video. Endpoint: `GET /api/oxy-tv/episodes`, `POST /api/admin/oxy-tv/generate`. Contenuti serviti in static da `data/oxy-tv`. Esempio di contenuto "vivo" e brandizzato OXY.

### 3.11 Community (roadmap)

- Menu con voce Community; modal "In arrivo" per forum/gruppi. Roadmap prevede community interna, reputazione e badge.

### 3.12 Autenticazione e profilo

- **Login:** email/password (Firebase Auth), opzionale **Google** e **Apple** (configurazione Firebase + dev build per mobile).
- **Profilo esteso:** nome, email principale, email di backup, telefono, data di nascita — salvati in Firestore (`users/{uid}`) tramite profileService.
- **Utente Master (proprietario):** identificato da email in env; usa solo chiavi server, nessuna Oxy Key in app; bypass consenso Privacy/Termini per testing.

### 3.13 Oxy Key e modalità app

- **Modalità subscription:** chiave API solo sul server; l'utente non inserisce nulla.
- **Modalità one_time_purchase (lifetime):** l'utente inserisce la propria chiave OpenAI (Oxy Key) nelle impostazioni; salvata in expo-secure-store. Senza chiave valida non può inviare messaggi né usare Vision.
- Backend: se non Master, accetta `apiKey` nel body delle richieste e la usa per OpenAI/Tavily.

### 3.14 Internazionalizzazione (i18n)

- Lingue supportate: **italiano**, **inglese**, **spagnolo**, **francese**, **arabo**, **cinese**. Traduzioni in `src/i18n/translations.js`; lingua inviata al backend in `POST /api/chat` e inclusa nel prompt di sistema.
- Country picker in registrazione (adattatore web per compatibilità browser).

### 3.15 Contenuti legali e menu

- Menu (hamburger): **Impostazioni**, **Privacy policy**, **Termini di servizio**, **Abbonamento e pagamenti**. Testi centralizzati in `src/content/legalContent.js`; riferimenti in `docs/PRIVACY_POLICY.md`, `docs/TERMINI_SERVIZIO.md`. Placeholder sostituibili prima della release.

### 3.16 Esperienza utente aggiuntiva

- Banner "Sei offline" (NetInfo) quando non c'è connettività.
- Frasi motivazionali contestuali all'ora (getWelcomePhraseForHour, getHeaderPhraseForHour).
- Error Boundary per intercettare errori di rendering e mostrare fallback.
- Validazione password (8+ caratteri, maiuscola, minuscola, numero, simbolo) con messaggi specifici.
- Mascheramento email/telefono in UI sensibili.
- Limite lunghezza messaggio: 4000 caratteri. Invio con Invio (Shift+Invio per nuova riga su web/desktop).
- Long-press su messaggio: **Copia**, **Inoltra**, **Condividi**, **Salva come obiettivo**, **Ricordamelo**.

---

## 4. Funzionalità: elenco esaustivo

| Area | Funzionalità | Stato |
|-----|--------------|--------|
| Chat | Messaggi testo, cronologia persistente, messaggio di benvenuto iniziale | ✅ |
| Memoria | Memory Vault (identità, obiettivi, keyFacts, lastContext), save_memory da chat, long-press Salva/Ricordamelo | ✅ |
| Ricerca | Tavily web_search (fatti dopo ott 2023), topic e time_range configurabili | ✅ |
| Vision | Invio foto, analisi GPT-4o (descrizioni, ricette, documenti) | ✅ |
| TTS | Lettura ad alta voce risposte (expo-speech + backend OpenAI TTS, 6 voci) | ✅ |
| Input vocale | Registrazione → Whisper → testo in input chat | ✅ |
| Power Badges | 17 modalità "Agisci come" (social, business, legale, coach, planner, launch, ecc.) | ✅ |
| Diario | Temi, entries, progressSummary, GET/POST /api/diary | ✅ |
| Storie | Storie a livelli, stato per utente, GET/POST /api/stories/state | ✅ |
| Documenti | Estrazione testo PDF/DOCX/TXT, invio email (client o server SMTP) | ✅ |
| OXY TV | Feed episodi, generazione admin (RSS → audio/video) | ✅ MVP |
| Feature flags | GET /api/features, override locale, rollout A/B ready | ✅ |
| Analytics | POST /api/analytics (eventi: screen_view, feature_use, story_step, diary_entry, ecc.) | ✅ |
| Auth | Email/password, Google, Apple (iOS); Firestore profilo | ✅ |
| Billing | Stripe checkout, webhook, stato abbonamento/lifetime, piani Starter/Pro/Elite | ✅ |
| i18n | IT, EN, ES, FR, AR, ZH; lingua in prompt | ✅ |
| Piattaforme | iOS, Android, Web (Expo), Desktop (Electron) | ✅ |
| Community | Voce menu + modal "In arrivo" | 🔲 Placeholder |
| Reputazione/badge community | Roadmap | 🔲 |

---

## 5. Architettura tecnica e stack

### 5.1 Frontend

- **Stack:** React Native con **Expo** (SDK 54). React 19, React Native 0.81.
- **Piattaforme:** iOS, Android, **Web** (Expo web), **Desktop** (Electron in `desktop/` che carica l’app web).
- **Stato:** useState, useRef, useCallback in App.js; gestione messaggi, cronologia, Memory Vault, modali, Power Badges, lingua, TTS, Oxy Key.
- **Servizi:** chatService (cronologia, memoria), aiService (chiamate IA), diaryService, storyService, voiceService, ttsService, profileService, authService, socialAuthService, featureFlagsService, analyticsService, oxyKeyService.
- **Config:** backendConfig (EXPO_PUBLIC_BACKEND_URL), pricingConfig (PLANS), firebaseConfig, legalContent.

### 5.2 Backend (Node.js)

- **Ruolo:** nascondere chiavi API (OpenAI, Tavily), verificare utente (Firebase idToken), persistere cronologia, memoria, diario, stato storie, billing, analytics.
- **Stack:** Node.js, Express, cors, express.json(limit 10mb), dotenv, Firebase Admin, rate limiting (chat 100/15min, voice 30, billing 10, general 50).
- **Storage:** file in `data/` (chats, memories, diary, storyState, billing, usage, oxy-tv); opzione `DATA_ROOT` per mount persistente (es. Render).
- **Endpoint principali:**  
  - `POST /api/chat` — messaggio + opz. imageBase64, moduleName, customAiName, language, initialMessage.  
  - `GET/POST /api/chat/history`, `POST /api/chat/messages`  
  - `GET/POST /api/memory`  
  - `GET/POST /api/diary`  
  - `GET/POST /api/stories/state`  
  - `POST /api/voice/transcribe`, `POST /api/tts`  
  - `POST /api/docs/extract`, `POST /api/docs/email`  
  - `GET /api/oxy-tv/episodes`, `POST /api/admin/oxy-tv/generate`  
  - `GET /api/features`, `POST /api/analytics`  
  - `POST /api/billing/checkout`, `GET /api/billing/status`, `POST /api/billing/webhook`  
  - `GET /api/consent-required`, `GET /health`

### 5.3 Sicurezza e produzione

- Chiavi API mai in app in modalità subscription; backend verifica token Firebase.
- Rate limiting per protezione DDoS e abuso.
- Validazione input (lunghezza messaggi, file size, formato Oxy Key). Password con regole complessità.
- Preparazione obfuscazione codice pre-vendita (checklist go-live, docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md).

---

## 6. Modello di business e monetizzazione

### 6.1 Piani (pricingConfig + Stripe)

**Abbonamenti (OXY Pass)**  
- **Starter:** €9,90/mese (suggerito; Stripe doc indica €19) — entry, Memory Vault base, storie, diario, 50 msg/giorno, Oxy Key inclusa.  
- **Pro:** €24,90/mese (Stripe €39) — modelli pro, memoria extended, community, 150 msg/giorno.  
- **Elite:** €59/mese — modelli elite, memoria max, cloud, 400 msg/giorno.

**Lifetime (pagamento una tantum, utente porta Oxy Key)**  
- **Starter:** €99  
- **Pro:** €249  
- **Elite:** €499  

Upgrade tra piani con differenza proporzionata (es. da Starter a Pro: paghi solo la differenza). Descrizioni prodotti Stripe allineate a funzionalità (Memory Vault, Vision, input vocale, diario, storie, priorità, ricerca web, ecc.).

### 6.2 Canali di vendita

- **Stripe:** checkout e webhook per abbonamenti e one-time; stato billing verificato da backend (`GET /api/billing/status`).  
- **App Store / Google Play:** IAP per abbonamenti e lifetime (configurazione store); backend può riconciliare con Stripe o con ricevute store.  
- **Sito/Web:** stesso backend e stesso account utente; acquisti via Stripe o redirect store.

### 6.3 Unit economics (indicativo)

- Costi variabili: API OpenAI (chat, Vision, Whisper, TTS), Tavily, Firebase, hosting backend, storage.  
- Abbonamenti: ricorrenza mensile; lifetime: ricavo una tantum, costi API a carico utente (Oxy Key) o inclusi in bundle se si offre chiave server anche per lifetime.  
- Margini da ottimizzare con tier di modelli (entry/pro/elite) e limiti messaggi per fascia.

---

## 7. Confronto con il mercato: OXY vs competitor

Tabella seguente confronta **OXY Real** con le principali app/piattaforme del settore (AI companion, chatbot conversazionali) per aiutare gli investitori a capire posizionamento, pro e contro.

### 7.1 Tabella sintetica per dimensione

| Dimensione | OXY Real | Replika | Character.AI | ChatGPT (app) | Pi (Inflection) | Nomi AI |
|------------|----------|---------|--------------|----------------|------------------|---------|
| **Memoria a lungo termine** | ✅ Memory Vault strutturata (identità, obiettivi, fatti, contesto) | ✅ Buona memoria relazionale | ⚠️ Limitata / per sessione | ✅ Ottima (Memories) | ⚠️ Media | ✅ Ottima |
| **Personalità coerente** | ✅ Unica, nome personalizzabile, tono fisso | ✅ Coerente, orientata relazione | ⚠️ Per personaggio, non unica | ⚠️ Assistente, non "compagno" | ✅ Empatica | ✅ Compagno dedicato |
| **Modalità professionali** | ✅ 17 Power Badges (business, legale, marketing, coach, planner, ecc.) | ❌ No | ⚠️ Personaggi diversi, non "modalità" | ✅ Plugin/azioni, non identità unica | ❌ No | ❌ No |
| **Ricerca web in tempo reale** | ✅ Tavily integrato | ❌ No | ❌ No | ✅ Sì | ❌ No | ❌ No |
| **Vision (analisi immagini)** | ✅ Foto + documenti (PDF/DOCX) | ⚠️ Limitata | ⚠️ Variabile | ✅ Sì | ⚠️ Limitata | ⚠️ Variabile |
| **Input vocale (STT)** | ✅ Whisper integrato | ✅ Sì | ⚠️ Variabile | ✅ Sì | ✅ Ottima voce | ✅ Sì |
| **TTS (lettura risposte)** | ✅ 6 voci OpenAI + expo-speech | ✅ Sì | ⚠️ Variabile | ✅ Advanced Voice molto umano | ✅ Ottima | ✅ Sì |
| **Diario / crescita personale** | ✅ Diario interattivo + temi + progressSummary | ⚠️ Limitato | ❌ No | ❌ No | ❌ No | ❌ No |
| **Storie / narrativa** | ✅ Storie a livelli con stato persistente | ⚠️ Roleplay | ✅ Roleplay massivo | ❌ No | ❌ No | ❌ No |
| **Multilingue (IT, EN, ES, FR, AR, ZH)** | ✅ 6 lingue in app e in prompt | ⚠️ Limitato | ⚠️ Variabile | ✅ Molte | ⚠️ Limitato | ⚠️ Limitato |
| **Multi-piattaforma** | ✅ iOS, Android, Web, Desktop (Electron) | ✅ Mobile, web | ✅ Web, app | ✅ Mobile, web | ✅ Web, app | ✅ App |
| **Modello business** | Abbonamento + Lifetime (Stripe + store) | Abbonamento annuale/mensile | Freemium + premium | Plus/Team/Enterprise | Gratuito (post-acquisizione) | Abbonamento |
| **Target** | 18+, professionisti + compagnia + crescita | 18+, relazione/emotivo | 13+, creatività/roleplay | Lavoro, studio, produttività | Supporto emotivo | Compagnia/amicizia |
| **Privacy / dati** | Privacy policy, ToS, dati in EU (backend configurabile) | Conversazioni salvate | Conversazioni salvate | Controlli forti, opt-out training | Post Microsoft | Variabile |

### 7.2 Tabella dettagliata: PRO e CONTRO (OXY vs mercato)

| Aspetto | OXY Real | Competitor (sintesi) | PRO OXY | CONTRO OXY |
|---------|----------|----------------------|---------|------------|
| **Memoria** | Memory Vault: identità, obiettivi, keyFacts, lastContext; save_memory da chat e long-press | Replika/ChatGPT/Nomi: buona memoria; Character: per personaggio/sessione | Struttura chiara (obiettivi vs fatti vs contesto); integrata in ogni risposta | Meno “anni” di dati utente rispetto a Replika/ChatGPT per affinare modello |
| **Identità unica** | Un solo compagno IA, nome personalizzabile, tono coerente | Character: molti personaggi; ChatGPT: assistente; Replika/Nomi: un compagno | Coerenza totale; nessuna frammentazione tra personaggi | Chi cerca “varietà” di personaggi non ha 1000 avatar (scelta voluta: qualità relazionale) |
| **Power Badges** | 17 modalità (business, legale, social, coach, planner, launch, gourmet, ecc.) | Nessuno offre “stessa identità + switch modalità” in questo modo | Un’unica relazione, molte competenze; ideale per professionisti e creativi | Utente deve “scegliere” il badge (una scelta in più, ma guidata da UI) |
| **Ricerca web** | Tavily integrato, fatti dopo ott 2023 | ChatGPT sì; Replika/Character/Nomi no o limitato | Risposte aggiornate su notizie, dati, mercati senza uscire dall’app | Dipendenza da servizio terzo (Tavily) |
| **Vision + documenti** | Foto + estrazione PDF/DOCX/TXT + invio email | ChatGPT: sì; altri: limitato o no | Workflow completo: carica doc → analisi → invio via email (anche server) | Limite 60k caratteri per doc; 8MB file (gestibile) |
| **Voce** | STT (Whisper) + TTS (6 voci OpenAI + device) | Replika/ChatGPT/Pi/Nomi: voce forte | Hands-free e accessibilità; voci con personalità (Executive, Deep, ecc.) | TTS server ha costo; device TTS meno “premium” |
| **Diario e storie** | Diario con temi/entries/progressSummary; storie a livelli con stato | Replika: qualche traccia; altri: assenti | Crescita personale e engagement continuativo; differenziatore forte | Contenuto storie da ampliare nel tempo |
| **Prezzi** | Starter ~€10–19/mese, Pro ~€25–39, Elite €59; Lifetime €99–499 | Replika ~$20/mese; Character ~$10; ChatGPT Plus $20; Nomi ~$8–16 | Gamma flessibile; lifetime per chi non vuole abbonamento | Mercato molto competitivo su prezzo; valore va comunicato (Real Identity + Power Badges) |
| **Piattaforme** | iOS, Android, Web, Desktop (Electron) | Tutti mobile + spesso web | Desktop dedicato per lavoro; stesso account ovunque | Manutenzione 4 target (ottimizzata con Expo) |
| **i18n** | 6 lingue (IT, EN, ES, FR, AR, ZH) in UI e in prompt IA | Molti competitor EN-centric o poche lingue | Mercato italiano ed europeo coperto; arabo e cinese per espansione | Traduzioni da mantenere e estendere |
| **Compliance** | Privacy e ToS strutturati; titolare SecondSelf, P.IVA IT; limitazione responsabilità; 18+ | Variabile; alcuni 13+, altri 18+; privacy non sempre chiara | Base solida per store e B2B (future OXY Enterprise) | Richiede aggiornamento continuo (es. AI Act EU) |
| **Notorietà** | Nuovo brand | Replika, Character, OpenAI, Pi (Microsoft), Nomi già noti | Spazio per posizionamento “Real Identity” e B2B (enterprise) | Bisogno di marketing e distribuzione per awareness |

### 7.3 Messaggio per investitori (sintesi confronto)

- **OXY Real** non è “un altro chatbot”: è l’unica proposta che combina **un solo compagno con memoria strutturata** + **17 modalità professionali ed emotive** (Power Badges) + **diario e storie** + **ricerca web e documenti** + **multilingue e multi-piattaforma** in un’unica app.
- **Pro:** differenziazione chiara (Real Identity, Power Badges, Memory Vault, diario/storie); stack moderno; modello subscription + lifetime; roadmap (community, enterprise); compliance e legale curati.
- **Contro:** brand da costruire; mercato affollato; costi API da governare; necessità di investimento in marketing e crescita utenti.

---

## 8. Roadmap e differenziazione

### 8.1 Già implementato (roadmap attiva)

- Feature flags + analytics (GET /api/features, POST /api/analytics).  
- Diario interattivo (GET/POST /api/diary, temi, entries, progressSummary).  
- Storie a livelli (GET/POST /api/stories/state, 2 storie esempio).  
- Input vocale (Whisper).  
- Contesto immagini (descrizione strutturata + momenti visivi in memoria dove applicabile).  
- Documenti (estrazione + email).  
- OXY TV (MVP episodi).  
- Billing Stripe e piani Starter/Pro/Elite (subscription + lifetime).

### 8.2 In roadmap

- **Community / forum:** voce menu + modal "In arrivo"; poi forum/gruppi con moderazione.  
- **Reputazione e badge community:** incentivi e riconoscimento utenti.  
- **Astrazione provider AI + A/B:** supporto multi-modello (es. Claude, Llama) e test A/B funzionalità.  
- **OXY Enterprise:** versione brandizzabile per aziende (es. DHL): tema, backend dedicato, SSO, knowledge base; pacchetti pilot ed enterprise (vedi docs/ROADMAP_DIFFERENZIAZIONE_OXY.md).

---

## 9. Team, titolarità e struttura

- **Progetto:** OXY Real — "App del Secolo".  
- **Titolare / fornitore:** **SecondSelf di Ivan Lopez**, P.IVA 13227270967, sede Legnano (MI), Italia.  
- **Ideazione e sviluppo:** Ivan (sviluppo full-stack, architettura, prodotto).  
- Documentazione tecnica e legale in repo (docs/, src/content/legalContent.js); checklist go-live e obfuscazione pre-vendita definite.

---

## 10. Aspetti legali, privacy e compliance

- **Termini di servizio:** titolare SecondSelf, requisiti utente (18+), limitazione responsabilità (no consulenza medica/legale/finanziaria), piani e pagamenti, comunicazioni di servizio, documenti ed email, contenuti utente, proprietà intellettuale, recesso, legge applicabile (Italia).  
- **Privacy policy:** dati raccolti (account, contenuti chat e Memory Vault, diario, storie, documenti se usati, dati tecnici); finalità; base giuridica; conservazione; diritti (accesso, rettifica, cancellazione, portabilità, opposizione, reclamo); sicurezza; trasferimenti; contatti.  
- **Abbonamento e pagamenti:** descrizione piani, rinnovi, cancellazione, lifetime, Oxy Key.  
- **Consenso:** in registrazione (Privacy e Termini); per proprietario (Master) bypass consenso configurabile lato backend.  
- **Compliance:** orientamento GDPR; dati trattati per erogazione servizio; nessun uso contenuti per training modelli di terzi senza accordo (politica chiara da esplicitare in privacy).  
- **Store:** requisiti Apple/Google rispettati (età, permessi, descrizioni); contenuti legali sostituibili da placeholder prima della release (legalContent.js).

---

## 11. Go-to-market e scalabilità

- **Fase attuale:** app funzionale su iOS, Android, Web, Desktop; backend deployabile (es. Render con Persistent Disk); Stripe e store da completare per go-live commerciale (GO_LIVE.md).  
- **Target iniziale:** Italia ed Europa (lingua e compliance); poi espansione con i18n già presenti (EN, ES, FR, AR, ZH).  
- **Canali:** store (ASO, recensioni), sito web, social, eventuali partnership (coach, creator, aziende per OXY Enterprise).  
- **Scalabilità:** backend stateless con storage file (migrabile a DB); rate limiting; feature flags e analytics per ottimizzare funzionalità e conversioni.  
- **Enterprise:** roadmap OXY Enterprise per B2B (branding, tenant, SSO, supporto dedicato) come secondo step dopo consolidamento B2C.

---

## 12. Opportunità di investimento

- **Cosa abbiamo:** prodotto differenziato (Real Identity, Memory Vault, Power Badges, diario, storie, voce, documenti, multilingue, multi-piattaforma); stack moderno e manutenibile; modello subscription + lifetime; base legale e compliance; roadmap chiara (community, enterprise).  
- **Cosa serve per scalare:** risorse per marketing e acquisizione utenti; eventuale rafforzamento team (growth, customer success, enterprise sales); infrastruttura e costi API ottimizzati; espansione contenuti (storie, community) e possibili partnership.  
- **Perché OXY:** posizionamento unico (un compagno, molte modalità, memoria strutturata, produttività + crescita personale); mercato AI companion in crescita (proiezioni 2025–2030); possibilità di espansione B2B (OXY Enterprise) con margini e retention potenzialmente superiori.

---

## 13. Trazione e stato attuale

### 13.1 Fase prodotto e distribuzione

- **Stato:** prodotto funzionalmente completo; backend operativo; integrazione Stripe e flussi di abbonamento/lifetime implementati. Pronto per go-live commerciale secondo checklist definita (GO_LIVE.md).
- **Piattaforme:** app iOS e Android (build nativa tramite EAS/Expo); versione web e desktop (Electron) per stesso account e stesse funzionalità.
- **Beta / test:** possibilità di beta tramite TestFlight (iOS), build interna (Android) e link web; feedback utente utilizzabile per affinare onboarding, Power Badges e contenuti (storie, diario).

### 13.2 Dati di trazione (da aggiornare post-lancio)

| Indicatore | Descrizione | Note |
|------------|-------------|------|
| Download / installazioni | Numero di installazioni app (store + web) | Da popolare dopo pubblicazione |
| Utenti registrati | Account creati (Firebase Auth) | Base per MAU e conversioni |
| Utenti attivi (DAU/MAU) | Utilizzo effettivo in un giorno/mese | Indicatore di engagement |
| Conversione free → paid | % utenti che passano a piano a pagamento | Funnel da ottimizzare |
| Retention D1/D7/D30 | % utenti che tornano a 1, 7, 30 giorni | Chiave per sostenibilità |
| Messaggi per utente | Media messaggi inviati per utente attivo | Uso reale del compagno IA |
| Utilizzo Power Badges / Diario / Storie | Eventi analytics per feature | Priorità sviluppo e comunicazione |

### 13.3 Feedback qualitativo

- Raccolta feedback da beta tester (NPS, interviste, recensioni store) da strutturare pre/post lancio.
- Punti di forza da evidenziare: memoria che “ricorda”, Power Badges per lavoro e creatività, diario e storie per crescita personale, multilingue e multi-piattaforma.
- Aree di miglioramento: onboarding, discovery dei Power Badges, contenuto storie e community (roadmap).

---

## 14. Metriche obiettivo e KPI

### 14.1 Obiettivi di breve periodo (0–12 mesi post-lancio)

| KPI | Target indicativo | Note |
|-----|-------------------|------|
| Utenti registrati | In crescita costante mese su mese | Obiettivo da fissare in base a budget marketing |
| Conversion rate (free → paid) | 2–5% (benchmark settore) | Ottimizzazione pricing |
| Retention D30 | > 25–30% | Indicatore qualità prodotto e engagement |
| MRR (Monthly Recurring Revenue) | Crescita mese su mese | Abbonamenti + eventuali lifetime riconosciuti a rate |
| Churn mensile (abbonamenti) | < 5–8% | Riduzione con onboarding e valore percepito |

### 14.2 Obiettivi di medio periodo (12–24 mesi)

| KPI | Target indicativo | Note |
|-----|-------------------|------|
| MAU (Monthly Active Users) | Soglia significativa per mercato di riferimento (es. 10k–50k) | Dipende da canale e geografia |
| LTV (Lifetime Value) per utente pagante | 3–6x CAC | Equilibrio con costo acquisizione |
| CAC (Customer Acquisition Cost) | Contenuto e scalabile (organic + paid) | ASO, partnership, contenuti |
| Revenue da B2B (OXY Enterprise) | % sul totale o primo contratto pilot | Roadmap enterprise |

### 14.3 Metriche prodotto

- **Engagement:** messaggi per sessione, utilizzo Memory Vault (salvataggi), utilizzo Power Badges, completamento storie, entry diario.
- **Qualità:** tempo di risposta backend, error rate, crash rate (store).
- **Soddisfazione:** NPS, rating store, supporto (ticket aperti/risolti).

---

## 15. Rischi e mitigazione

| Rischio | Impatto | Probabilità | Mitigazione |
|---------|---------|-------------|-------------|
| **Costi API (OpenAI, Tavily)** elevati | Margini compressi | Media | Tier di modelli e limiti messaggi per piano; monitoraggio usage; eventuale caching o modelli più economici per entry tier |
| **Competizione e prezzo** | Difficoltà a differenziarsi e convertire | Alta | Comunicazione chiara su Real Identity, Memory Vault, Power Badges; focus su nicchie (professionisti, crescita personale); lifetime come alternativa all’abbonamento |
| **Regolamentazione (AI Act EU, privacy)** | Adempimenti e possibili limiti d’uso | Media | ToS e Privacy già strutturati; aggiornamento continuo; eventuale supporto legale per AI Act e store |
| **Dipendenze terze (OpenAI, Firebase, Stripe, Tavily)** | Interruzioni o cambi di policy | Media | Architettura con astrazione provider (roadmap); multi-region/backup dove possibile; contratti e SLA dove applicabile |
| **Brand e awareness** | Crescita lenta senza investimento | Alta | Piano marketing e contenuti; partnership (coach, creator); ASO e presenza store; possibile investimento in growth |
| **Retention bassa** | Churn alto, LTV basso | Media | Miglioramento onboarding, notifiche non invasive, contenuti (storie, community); analytics per capire drop-off |
| **Sicurezza e abuso** | Reputazione, costi, blocchi store | Bassa | Rate limiting, verifica account, policy chiare; moderazione in vista community |

---

## 16. Riepilogo e prossimi passi

### 16.1 Cosa è pronto oggi

- **Prodotto:** compagno IA con memoria (Memory Vault), 17 Power Badges, ricerca web, Vision, voce (TTS/STT), diario, storie, documenti, OXY TV (MVP), multi-piattaforma e multilingue.
- **Tecnologia:** frontend Expo (iOS, Android, Web, Desktop), backend Node.js, Stripe, Firebase, feature flags e analytics.
- **Business:** piani subscription (Starter/Pro/Elite) e lifetime; canali Stripe e store.
- **Legale e compliance:** Termini di servizio, Privacy policy, impostazione 18+, titolare SecondSelf.

### 16.2 Prossimi passi operativi

1. **Go-live:** completamento checklist go-live (store, backend produzione, obfuscazione pre-vendita se prevista), pubblicazione su App Store e Google Play e/o web.
2. **Trazione:** avvio beta/soft launch; raccolta primi utenti e feedback; impostazione dashboard metriche (trazione, revenue, retention).
3. **Crescita:** piano marketing e acquisizione (ASO, social, partnership); ottimizzazione funnel e conversioni.
4. **Roadmap:** community e reputazione; astrazione provider AI e A/B; OXY Enterprise per B2B.

### 16.3 Utilizzo del documento

Questo documento può essere condiviso con investitori e partner in versione confidenziale. Per dettagli tecnici completi: `docs/PRESENTAZIONE_OXY_REAL_COMPLETA.md`. Per roadmap: `docs/ROADMAP_DIFFERENZIAZIONE_OXY.md`. Per go-live: `GO_LIVE.md`.

---

**Contatto:** [inserire email investitori / SecondSelf]

**OXY Real — La tua identità reale, potenziata dall'IA.**
