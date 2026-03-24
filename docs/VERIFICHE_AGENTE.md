# Verifiche per il prossimo agente — OXY Real

**Data:** febbraio 2026.  
**Riferimento:** istruzioni utente (email benvenuto, sconto 30 giorni, lingua, limite 429, URL Stripe).

---

## Verifica 5 — Limite giornaliero (crediti) e 429

### Comportamento attuale (verificato in codice)

- **Backend (`backend/index.js`):**
  - Per piani subscription (active/trialing), prima di chiamare OpenAI viene controllato `readChatUsage(uid, day)` contro il limite del piano (`DAILY_LIMITS_BY_PLAN`, ecc.).
  - Se `used >= limit` → risposta **429** con body `{ error: 'daily_high_priority_credits_used' }`.
  - Un 429 da **OpenAI** (rate limit API) viene ritentato fino a 2 volte; se persiste → 429 con messaggio generico “Forse Oxy si è addormentata…”.

- **App (`App.js`, `src/services/aiService.js`):**
  - `aiService` riceve 429 e lancia `Error(data?.error || RATE_LIMIT_SENTINEL)`.
  - In `App.js` si distingue:
    - **Limite crediti giornalieri:** `isDailyCreditsUsed` (match su `daily_high_priority_credits_used` nel messaggio di errore).
    - **Rate limit generico:** `isRateLimit` (429 / “rate limit” / sentinel).

- **Messaggio all’utente:**
  - Se **limite crediti:** in chat viene mostrato `t('billing.limitReachedMessage')` e un **Alert** con due pulsanti:
    - “OK”
    - **“Passa al piano superiore”** (`t('billing.upgradeNow')`) → apre **Menu → Abbonamento** con tab subscription.
  - Se **429 generico:** solo messaggio in chat (“Forse Oxy si è addormentata…”).

- **Menu → Abbonamento:**
  - Barra utilizzo: `billing.usageTitle`, `usageLabel` / `usageLabelNoLimit`, `usageTokensLabel`, eventuale `tokenBalance`.
  - Avviso al 90%: `usageWarning90` e CTA “Vai ai piani” (`usageCtaUpgrade`).

### Conclusione

- **429 da limite crediti:** gestito con messaggio dedicato e CTA “upgrade” che apre il menu Abbonamento. **Nessuna CTA esplicita** “riprova domani” o “acquista crediti” (Oxy Keys) nello stesso alert; l’utente può comunque andare in Menu → Abbonamento per upgrade o (se disponibile) pacchetti token.

### Suggerimenti (opzionali)

- Aggiungere nel testo `limitReachedMessage` (o in un sottotitolo) un richiamo tipo “Riprova domani al rinnovo” e “Oppure passa a un piano superiore o acquista crediti dal menu Abbonamento”.
- In Menu Abbonamento, se il piano ha limite e l’utente è al 100%, mostrare un breve messaggio con link “Vai ai piani” / “Acquista crediti” già presente tramite la sezione.

---

## Verifica 6 — Ritorno da Stripe (success / cancel URL)

### Comportamento attuale (verificato in codice)

- **Backend `POST /api/billing/checkout` (`backend/index.js`):**
  - `success_url` = `process.env.STRIPE_SUCCESS_URL` oppure fallback `'https://example.com/oxy/success'`.
  - `cancel_url` = `process.env.STRIPE_CANCEL_URL` oppure fallback `'https://example.com/oxy/cancel'`.
  - Le variabili sono documentate in `backend/.env.example`:
    - `STRIPE_SUCCESS_URL=https://oxyreal.it/success`
    - `STRIPE_CANCEL_URL=https://oxyreal.it/cancel`
  - Non viene passato alcun parametro dinamico (es. `session_id`) negli URL; sono pagine web fisse.

- **Flusso utente:**
  - Dopo il pagamento Stripe l’utente viene reindirizzato alla **pagina web** indicata da `STRIPE_SUCCESS_URL` (es. `https://oxyreal.it/success`).
  - In caso di annullamento → `STRIPE_CANCEL_URL` (es. `https://oxyreal.it/cancel`).
  - **Nessun deep link** verso l’app (nessun `exp://` o custom scheme tipo `oxyreal://`) nei URL attuali.

- **App (`App.js`):**
  - All’attivazione dell’app (ritorno in primo piano) viene usato **AppState** per chiamare `refreshBillingStatus()`.
  - Se il billing diventa attivo (es. dopo pagamento completato), l’app mostra la **scelta voce** e poi il messaggio di benvenuto in chat come da flusso esistente.

### Conclusione

- Il ritorno dopo Stripe è su **pagina web**; l’utente deve **tornare manualmente all’app** (cambio app o chiusura browser). Il refresh del billing e la scelta voce funzionano correttamente **se** l’utente riapre l’app dopo aver visto la pagina di success.
- Per un’UX migliore si potrebbe in futuro:
  - Configurare `STRIPE_SUCCESS_URL` (e opzionalmente `cancel`) con deep link verso l’app (es. `oxyreal://billing/success`) e gestire il deep link in app per refresh immediato, oppure
  - Mostrare nella pagina success un bottone “Torna all’app OXY Real” con istruzioni chiare.

---

## Riepilogo priorità (da istruzioni utente)

1. **Email benvenuto:** già implementata nel webhook `checkout.session.completed` (dopo `writeBilling`): invio con `getMailerForWelcome()` e `getWelcomeEmailBody(planId, mode)`. Abilitazione: `WELCOME_EMAIL_AFTER_PAYMENT=true` in backend (o SMTP già attivo con `DOCS_EMAIL_AUTOSEND_ENABLED=true`). Variabili SMTP e commento in `backend/.env.example`.
2. **Sconto 30 giorni:** già presente in UI: data go-live da `EXPO_PUBLIC_GO_LIVE_DATE` (default `2026-03-15`), testi `billing.launchDiscount50`, `launchDiscountDaysLeft`, `launchDiscountLastDay` in it/en; da completare fr, es, ar, zh (vedi sotto).
3. **Lingua/onboarding:** system prompt contiene già “LINGUA: Rispondi sempre e solo nella lingua indicata in ‘Lingua:’”. `getOnboardingSystemBlock` ha en/it; per altre lingue (fr, es, ar, zh) è stato aggiunto un blocco generico con invito a rispondere nella lingua indicata.
4. **i18n go-live:** completare `welcomeAfterPayment` e `billing.launchDiscount*` per fr, es, ar, zh come da § 3.0 GO_LIVE.md.
