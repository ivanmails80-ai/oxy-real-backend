# Promemoria sessione + audit domani

**Data:** 7–8 febbraio 2025 (sessione lunga fino alle 02:12).  
**Domani:** finire l’audit. Non riavviare il backend stanotte (l’utente chiude tutto).

---

## Lavoro fatto in questa sessione (da rispiegare domani)

### 1. **#3 – Salva come obiettivo / Ricordamelo (long-press su messaggi OXY)**
- **Cosa:** Su un messaggio della chat scritto da OXY/Anima, long-press → menu con due voci in più (solo per messaggi bot):
  - **Salva come obiettivo** → il testo viene salvato in memoria come “obiettivo” (campo `goals`).
  - **Ricordamelo** → il testo viene salvato come “cosa ricordo di te” (campo `keyFacts`).
- **Dove in codice:**
  - **App.js:** `openMessageMenu(text, isFromBot)` ora riceve anche se il messaggio è del bot; stato `selectedMessageFromBot`; due voci nel menu messaggio (condizionate a `selectedMessageFromBot`); handler `handleSaveAsGoal` e `handleRememberThis` che chiamano `saveToMemory`.
  - **chatService.js:** nuova funzione `saveToMemory(idToken, { goal, keyFact })` che fa POST a `/api/memory`.
  - **Backend (index.js):** nuova route **POST /api/memory** che richiede `idToken`, accetta body `goal` e/o `keyFact`, legge la memoria utente (`data/memories/{uid}.json`), **aggiunge** il nuovo testo (con "• " a inizio riga) a `goals` o `keyFacts`, e salva con `mergeMemory`.
- **Nota:** Per usarlo serve backend avviato e `EXPO_PUBLIC_BACKEND_URL` impostato. Se non c’è backend, l’app mostra un alert “Non disponibile”.

### 2. **Altre modifiche recenti (stessa sessione / precedenti)**
- Badge prompt: resi rettangolari, icona a sx e nome a destra; lista ordinata nel tab Prompt.
- “Crea Chat di Gruppo” spostato da tab Prompt a tab **Impostazioni** → sezione “Chat e gruppi”.
- Area chat: angoli arrotondati (`mainCard` borderRadius 20), cornice dorata fine (borderColor come superBar), barra input abbassata (padding/margini footer e superBar).
- Primo messaggio OXY: non si sovrascrive più la cronologia se nel frattempo è stata caricata (uso di `setMessaggi(prev => ...)` e `setChatHistory(prev => ...)` per aggiornare solo se chat ancora vuota).
- Memoria a lungo termine: backend `data/memories/{uid}.json`, tool `save_memory` per l’IA, iniezione nel system message.

---

## Cosa fare domani
- **Finire l’audit** (checklist / punti aperti).
- **Riavviare il backend** quando si riprende (per avere anche POST /api/memory attivo).
- **Rispiegare** all’utente, se serve: (1) come funziona “Salva come obiettivo” e “Ricordamelo” e dove va a finire il testo; (2) eventuali altri punti della sessione che chiederà.

---

Grazie a tutti, buonanotte. A domani.
