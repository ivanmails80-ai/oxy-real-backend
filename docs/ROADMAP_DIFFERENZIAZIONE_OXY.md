# Roadmap differenziazione OXY vs competitors

Documento di riferimento per priorità, idee e comunicazione con il team di sviluppo. Fonte: suggerimenti per rendere OXY superiore ai competitor.

## Stato implementazione (roadmap Anima attivata)

| Fase | Elemento | Stato |
|------|----------|--------|
| 0 | Feature flags + analytics (GET /api/features, POST /api/analytics) | ✅ Implementato |
| 1 | Diario interattivo (GET/POST /api/diary, modal Diario, temi/entries/progressSummary) | ✅ Implementato |
| 2 | Storie a livelli (GET/POST /api/stories/state, modal Storie, 2 storie esempio) | ✅ Implementato |
| 3 | Input vocale (registrazione → POST /api/voice/transcribe con Whisper → testo in input) | ✅ Implementato |
| 4 | Contesto immagini (prompt sistema con descrizione strutturata + momenti visivi in memoria) | ✅ Implementato |
| 5 | Community / forum | 🔲 Placeholder (voce menu + modal "In arrivo") |
| 6 | Reputazione e badge community | 🔲 Da fare |
| 7 | Astrazione provider AI + A/B funzionalità | 🔲 Da fare |

---

## 1. Esperienza emozionante e continua

### 1.1 Narrativa continuativa / Diario interattivo
- **Idea:** OXY propone un diario interattivo basato su temi personali dell’utente, con feedback regolari che mostrano il progresso.
- **Nota tecnica:** richiede un modello di “temi” e “progressi” (storage, possibilmente Firestore o memoria strutturata), UI dedicata (schermata Diario), e logica nel backend/prompt per proporre riflessioni e riepiloghi periodici. Può sfruttare Memory Vault + nuovi tipi di memoria (es. “progressi”, “obiettivi diario”).

### 1.2 Interazioni a storie
- **Idea:** funzioni “a storie” che coinvolgono l’utente a più livelli, mantenendo il coinvolgimento tramite narrativa.
- **Nota tecnica:** definire formato “storia” (step, scelte, stato), storage dello stato per utente, e integrazione con la chat (es. “Oggi ti propongo questa storia…”). Può essere un flusso guidato in chat + eventuale UI a card/slide.

---

## 2. Integrazioni multimodali avanzate

### 2.1 Riconoscimento e analisi vocale avanzati
- **Idea:** OXY analizza tono e contenuto della voce per regolare suggerimenti e risposta; uso di API vocali avanzate.
- **Nota tecnica:** oltre al TTS già presente (expo-speech), servono **input vocale** (speech-to-text) e, se possibile, **analisi del tono** (es. sentiment/emotion da audio). Opzioni: Whisper (OpenAI) per STT; eventuali API di emotion/sentiment da audio (es. servizi terzi o modelli dedicati). Il risultato può essere passato al contesto della chat (es. “l’utente sembra stressato”) per adattare il prompt.

### 2.2 Contenuti visivi e riconoscimento immagini
- **Idea:** migliorare il riconoscimento di elementi nelle immagini e collegarli al contesto della conversazione o a suggerimenti in tempo reale.
- **Nota tecnica:** già presente invio immagini in chat (Vision). Possibili estensioni: prompt di sistema che chiedono all’IA di descrivere in modo strutturato (oggetti, contesto, emozioni), salvataggio di “momenti visivi” in Memory Vault, suggerimenti contestuali (es. “in questa foto vedo X, ti potrebbe essere utile Y”).

---

## 3. Community & engagement

### 3.1 Forum e gruppi di supporto interni
- **Idea:** sezione community dove gli utenti condividono esperienze e suggerimenti (tipo forum di supporto).
- **Nota tecnica:** richiede backend (moderazione, storage post/thread, auth), UI (liste, thread, risposte), policy di moderazione e privacy. Valutare se self-hosted (Firestore + Cloud Functions) o servizi terzi (forum as a service).

### 3.2 Feedback e reputazione
- **Idea:** sistema che incentiva interazione positiva: badge community, punteggi di reputazione basati sull’aiuto agli altri.
- **Nota tecnica:** modelli dati (reputazione, badge, azioni “utili”), regole di attribuzione (like, risposte accettate, ecc.), UI profilo/leaderboard. Richiede storage utente esteso e possibilmente Cloud Functions per aggiornamento reputazione.

---

## 4. Innovazioni di avanguardia

### 4.1 Modelli AI sempre aggiornati
- **Idea:** restare aggiornati su ultime versioni e miglioramenti dell’IA; valutare collaborazioni con piattaforme emergenti.
- **Nota tecnica:** oggi backend usa OpenAI (es. GPT-4o). Pianificare revisioni periodiche (nuovi modelli, API) e eventuale astrazione “provider” per provare altri modelli (es. Claude, Llama, modelli locali) senza riscrivere tutto.

### 4.2 Test A/B e adattamenti continui
- **Idea:** sistema di test A/B per nuove funzionalità, con raccolta dati per adattamenti rapidi.
- **Nota tecnica:** feature flags (per utente o per % utenti), invio eventi analitici (es. quale variante ha visto, azioni chiave), dashboard o export per analisi. Strumenti possibili: Firebase Remote Config + Analytics, o servizi dedicati (LaunchDarkly, PostHog, ecc.).

---

## 5. Comunicazione allo sviluppatore

Da applicare quando si trasformano questi punti in backlog:

1. **Priorità e pianificazione**  
   Definire con il team priorità in base a: impatto sull’utente, tempo di implementazione, budget. Questo documento può essere la base per un roadmap a quartieri/anni.

2. **Specifiche tecniche**  
   Per ogni aggiunta o miglioramento: descrizione chiara, casi d’uso, eventuali API/biblioteche/framework consigliati (es. Whisper per STT, Firebase per community). Aggiornare le “Note tecniche” sopra quando si scende nel dettaglio.

3. **Iterazione e collaborazione**  
   Ciclo continuo: test → dati → miglioramenti. Punti di controllo regolari (sprint/review) per valutare progressi ed efficacia delle funzionalità introdotte.

---

## 6. Roadmap post go‑live: OXY Enterprise (es. DHL)

- **Idea business:** dopo il go‑live B2C, preparare una versione **OXY Enterprise** brandizzabile per grandi aziende (es. DHL), con:
  - tema grafico personalizzato (colori, logo, copy),
  - backend dedicato (tenant separato, logging, ruoli, policy dati),
  - eventuali integrazioni con sistemi interni (SSO, ticketing, CRM, knowledge base aziendale).
- **Modello commerciale (da affinare):**
  - pacchetto pilot (20–50 utenti) con fee di setup + canone mensile,
  - pacchetto enterprise (100+ utenti) con setup più ampio, SLA e supporto dedicato.
- **Nota per dopo il go‑live:** usare contatti personali (es. in DHL) per proporre un **pilot interno** con vestito brandizzato e funzionalità server più professionali.

---

*Ultimo aggiornamento: febbraio 2025 (integrazione nota post go‑live Enterprise). Da aggiornare quando si definiscono priorità o si aggiungono dettagli tecnici.*
