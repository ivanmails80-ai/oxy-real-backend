# Checklist test app OXY Real — una sessione

**Obiettivo:** installare l’app una volta e fare tutti i controlli in sequenza, senza reinstallare.

Usa questa lista quando hai un build (APK o EAS) installato sul telefono e il backend raggiungibile (anche in test). Segna con [x] mentre procedi.

**Da verificare alla prossima installazione (app + backend aggiornati):** acquisto pacchetti token 100k/500k (checkout Stripe senza errore "planId non valido"), webhook e credito token visibile in app — vedi §7.

---

## Verifiche autonome (Sam) — 24 feb 2026

- **Backend online:** `/health` risponde OK (`https://oxy-real-backend.onrender.com/health` → `ok: true`, `service: oxy-real-proxy`, `dataRoot: /var/data`).
- **Webhook Stripe:** in codice è implementato `POST /api/billing/webhook` con gestione di `checkout.session.completed`, `customer.subscription.deleted` e `customer.subscription.canceled`.
- **Config:** `backend/.env.example` documenta OPENAI, Firebase, Stripe, limiti; `backendConfig.js` usa `EXPO_PUBLIC_BACKEND_URL` con fallback su Render. Niente da cambiare da parte mia.

**Per §11 (Stripe Dashboard):** l’URL che il backend si aspetta è `https://oxy-real-backend.onrender.com/api/billing/webhook` (o il tuo dominio se usi proxy). In Stripe Dashboard verifica tu che webhook e eventi siano corretti.

---

## Solo da fare tu (sull’app) — lista snellita

**Già fatto in autonomia (Sam):** verifica backend, webhook, config, i18n (welcomeAfterPayment + launchDiscount fr/es/ar/zh), legalContent senza placeholder. Vedi GO_LIVE.md §3 per le voci segnate ✅.

Hai già l’app installata. I punti sotto sono **solo** ciò che devi fare tu sul telefono (e, dove indicato, su Stripe). Procedi in ordine; quando hai fatto un punto, segna e passiamo al successivo.

| # | Cosa fare (tu) |
|---|----------------|
| **1** | **Piano attivo:** Dopo aver scelto Abbonamento o Lifetime e completato il pagamento (o login con piano attivo), Menu → Abbonamento: verifica stato e barra utilizzo. |
| **2** | **Limite 429:** Con piano attivo, invia messaggi fino a superare il limite. Verifica: messaggio in chat + Alert "Crediti esauriti" + pulsante "Upgrade Now" → apre Abbonamento. |
| **3** | **Smart-Blocking (§6):** Con account Starter: tap Community → modal "Evolvi Ora"; tap Vision → idem; tap Cloud → modal upgrade Elite. Tap "Evolvi Ora" apre Abbonamento. |
| **4** | **Abbonamento Stripe (se configurato):** Menu → Abbonamento → tab Abbonamenti; tap "Abbonati" su un piano → Stripe Checkout → completa test. In app: stato "attivo" e barra utilizzo. |
| **5** | **Pacchetti token (§7, se attivi):** Menu → Acquista Oxy Key → "Acquista token 100k/500k" → Checkout → dopo webhook verifica token disponibili e consumo in chat. |
| **6** | **Cancellazione (§9):** Da Stripe Dashboard cancella un abbonamento di test; in app Menu → Abbonamento (refresh): stato non più "attivo". |
| **7** | **Stripe webhook (§11, solo se qualcosa non torna):** In Stripe Dashboard verifica che il webhook punti all’URL del backend e che gli eventi siano `checkout.session.completed`, `customer.subscription.deleted`. |
| **8** | **Splash (dopo eventuale reinstall):** Avvio app: solo splash poi Login/Home, niente schermata "Caricamento…". |

*(Punti B “con tuo supporto”: recupero password, feedback dopo test Stripe, conferma aggiornamento stato dopo cancellazione — li affrontiamo quando tocchiamo quei flussi.)*

---

## Test SENZA aggiornamento app (build attuale)

**Preparazione:** registrati e scegli Abbonamento o Lifetime; completa il pagamento (o usa un account con piano già attivo). Per testare il limite 429 serve un piano con limite giornaliero (es. Starter).

Usa questa sezione per non restare bloccati: verifica tutto ciò che non dipende dalla nuova build.

| Punto | Cosa fare |
|------|-----------|
| **§5** | Con piano attivo: supera il limite messaggi del giorno; verifica messaggio in chat + Alert "Crediti esauriti" e pulsante "Upgrade Now" → apre Abbonamento. |
| **§6** | **Starter:** tap Community → modal "Evolvi Ora" (upgrade Pro); tap Vision → idem; tap Cloud → modal upgrade Elite. **Pro:** Community/Vision ok, Cloud bloccato. **Elite:** tutto accessibile. |
| **§9** | Se hai un abbonamento di test: da Stripe Dashboard cancellalo; in app Menu → Abbonamento, refresh: stato non più "attivo". |
| **§10** | Tap su funzione bloccata (es. Community) → modal "Evolvi Ora"; tap "Evolvi Ora" → si apre Abbonamento. |
| **§11** | Stripe Dashboard: webhook punta all’URL corretto del backend; eventi `checkout.session.completed`, `customer.subscription.deleted`. |

*(§4 stato/barra dopo pagamento e §7 pacchetti token richiedono app aggiornata e/o webhook raggiungibile.)*

---

## Test DOPO aggiornamento app

Quando hai installato la nuova build (e backend aggiornato), verifica in ordine:

1. **§4** — Dopo un acquisto (o con webhook già ricevuto): in Menu → Abbonamento vedi stato "attivo" e **barra utilizzo** (X messaggi oggi / X limite). Chat con limite del piano.
2. **§7** — Tap "Acquista token 100k" o "500k": si apre Stripe Checkout (nessun "planId non valido"); dopo pagamento e webhook vedi token disponibili; chat consuma credito.
3. **§5 / §6 / §10** — Ritest limiti 429, Smart-Blocking e modal "Evolvi Ora" se serve.
4. **Memory Vault, Diario, Storie, Ferma risposta** — Ritest fix (Aggiungi nota, colore input + elimina voce, fine storia Sì/No, stop risposta).
5. **Splash** — Dopo reinstall: avvio mostra solo splash e poi Login/Home (no schermata "Caricamento…").

---

## Divisione dei compiti

| Chi | Cosa |
|-----|------|
| **Sam (io)** | Verifiche in autonomia: codice, config, chiamate API (es. `/health`), documentazione. |
| **Con tuo supporto** | Punti dove mi servono info da te (es. “è arrivata l’email?”, “cosa vedi in Stripe?”). |
| **Tu (step by step)** | Tutto ciò che va fatto sul telefono, in app o su Stripe Dashboard: li facciamo insieme uno per uno. |

---

## A — Verifiche che faccio io in autonomia

- [x] Backend online: chiamo `/health` e verifico che risponda (es. `https://oxy-real-backend.onrender.com/health`).
- [x] Variabili backend: verifico in codice/`.env.example` che siano documentate: `OPENAI_API_KEY`, Firebase Admin, (opz.) Stripe e webhook.
- [x] Backend: verifico che `DATA_ROOT` (o disco persistente) sia previsto in produzione (codice/README).
- [x] Backend: verifico che l’endpoint webhook Stripe esista (es. `/api/billing/webhook`) e gestisca `checkout.session.completed`, `customer.subscription.deleted`.
- [x] App/EAS: verifico che `EXPO_PUBLIC_BACKEND_URL` e variabili Firebase/Google siano usate nel progetto (app.json, config).

---

## B — Con il tuo supporto (mi dici tu il risultato)

- [ ] Recupero password: tu clicchi “Recupera password” e mi dici se l’email arriva (se il flusso è configurato).
- [ ] Dopo un test Stripe (abbonamento/pacchetto): se qualcosa non torna, mi dici cosa vedi in Menu → Abbonamento e (se puoi) nei log del backend.
- [ ] Webhook cancellazione: tu cancelli un abbonamento di test da Stripe Dashboard; io verifico in codice che `customer.subscription.deleted` sia gestito; tu mi dici se in app lo stato si aggiorna.

---

## C — Da fare tu (step by step insieme)

### Prima di iniziare

- [ ] App installata sul dispositivo (build release/debug con backend puntato) — **già fatto**.

---

### 1. Accesso e base

- [x] Avvio app senza crash.
- [x] Login con email/password: funziona.
- [x] Recupero password: link/email ricevuta (se configurato) — *dominio mittente Firebase finché oxyreal.it non verificato*.
- [x] (Se attivo) Login con Google: funziona.
- [x] Logout: torna alla schermata di accesso.
- [x] Riavvio app: sessione mantenuta (resti loggato).

---

### 2. Chat

- [x] Invio messaggio: risposta ricevuta (usa backend o piano attivo).
- [x] Cronologia: i messaggi restano visibili.
- [x] "Ferma risposta": la risposta si interrompe (anche durante animazione) — *da ritestare dopo build*.
- [x] Senza rete: messaggio/banner "Sei offline" o errore chiaro (nessun crash) — Alert "Impossibile raggiungere il server" + verifiche (1–4).

---

### 3. Piano attivo e limite — *verifica anche §6 (Smart-Blocking) e §10 (modal "Evolvi Ora") con account non-Master*

- [ ] Dopo login con piano attivo: in Menu → Abbonamento vedi stato e limite giornaliero.
- [ ] Barra utilizzo visibile (es. “X / 25 Crediti High-Priority” o simile).
- [ ] Dopo N messaggi (limite raggiunto): risposta 429 e messaggio tipo “Daily High-Priority Credits esauriti” con pulsante “Upgrade Now” / “Evolvi Ora”.

---

### 4. Abbonamento e pagamenti (Stripe configurato)

- [ ] Menu → Abbonamento: tab Abbonamenti mostra piani (Starter, Pro, Elite) con prezzi e opzione mensile/annuale.
- [ ] Tap “Abbonati” (o equivalente) su un piano: si apre Stripe Checkout (browser o in-app).
- [ ] Completare un acquisto di test (Stripe test o live 1€): redirect di ritorno all’app.
- [ ] Dopo il pagamento (senza reinstallare): in Menu → Abbonamento lo stato è "attivo" e il piano mostrato è quello acquistato. *Se non vedi stato attivo (es. account Master): il webhook Stripe deve raggiungere il backend; in locale spesso non arriva.*
- [ ] Barra utilizzo: visibile in Abbonamento (X messaggi oggi; con piano attivo: X / limite). *Da ritestare con app aggiornata.*
- [ ] Chat: funziona con il limite del piano (nessuna richiesta di Oxy Key se abbonamento attivo).

---

### 5. Limite giornaliero (429)

- [ ] Con piano attivo, superare il limite messaggi del giorno (o usare un limite basso in backend per il test).
- [ ] Alla richiesta successiva: messaggio in chat + Alert (o modal) con testo tipo “Hai utilizzato i tuoi Daily High-Priority Credits…” e pulsante “Upgrade Now” / “Evolvi Ora”.
- [ ] Tap “Upgrade Now”: si apre la sezione Abbonamento (tab Abbonamenti).

---

### 6. Funzioni per piano (Smart-Blocking)

- [ ] **Starter:**  
  - Tap su **Community** (menu Strumenti): icona/tile con lucchetto o opacità; tap apre modal “Evolvi Ora” con messaggio upgrade al piano Pro.  
  - Tap **Vision** (fotocamera in azioni chat): stessa modal upgrade Pro (o messaggio equivalente).  
  - Tap **Gestione Cloud** (menu): messaggio upgrade Elite + pulsante “Evolvi Ora”.
- [ ] **Pro:**  
  - Community e Vision accessibili; Cloud ancora bloccato con modal Elite.
- [ ] **Elite:**  
  - Community, Vision e Cloud tutti accessibili (nessun lucchetto).

---

### 7. Pacchetti token (se attivi) — **da ritestare con prossima installazione app aggiornata**

- [ ] Menu → Acquista Oxy Key (o Abbonamento): sezione pacchetti token visibile.
- [ ] Tap "Acquista token 100k" / "500k": si apre Stripe Checkout (nessun errore "planId non valido"); backend con `STRIPE_PRICE_PACK_100K` / `STRIPE_PRICE_PACK_500K` configurati.
- [ ] Completamento pagamento pacchetto: redirect e (dopo webhook) in stato/utilizzo vedi “Token disponibili (pacchetto): X” (numero > 0).
- [ ] Chat: invio messaggi consuma il credito (il numero di token disponibili diminuisce).

---

### 8. Lifetime (se vendi Lifetime)

- [ ] Acquisto Lifetime (checkout one-time): completamento e redirect.
- [ ] Menu → Abbonamento: stato “Lifetime” con piano corretto (Starter/Pro/Elite).
- [ ] Inserimento Oxy Key (se richiesta per quel piano): salvataggio e chat con chiave utente.

---

### 9. Cancellazione abbonamento (webhook)

- [ ] Da Stripe Dashboard (o Customer portal): cancellazione abbonamento di un account di test.
- [ ] (Sam verifica in codice il webhook; tu) In app (refresh Menu → Abbonamento): stato non più “attivo” per quell’abbonamento (piano azzerato o “Nessun piano attivo”).

---

### 10. Menu e contenuti

- [x] Menu: Privacy, Termini, Abbonamento, Impostazioni, Logout accessibili.
- [x] Memory Vault: apertura, salvataggio nota/obiettivo — *aggiunto "Aggiungi nota" (salva come fatto); da ritestare*.
- [x] Diario: apertura, creazione voce — *fix: colore testo input visibile + eliminazione voce; da ritestare*.
- [x] Storie: apertura e avvio storia — *fix: fine storia → "Sei pronto per parlarne con OXY?" Sì/No; Sì → chat, No → altra storia; da ritestare*.
- [ ] Modal “Evolvi Ora” (per funzioni bloccate): chiusura e tap “Evolvi Ora” apre Abbonamento. *(Da fare insieme a §6 con account non-Master)*

---

### 11. Configurazione (solo se qualcosa non torna)

- [ ] Stripe: webhook LIVE punta a `https://tuodominio.com/api/billing/webhook` (o URL reale); eventi `checkout.session.completed`, `customer.subscription.deleted` (e `customer.subscription.updated` se aggiunto). *(Sam può verificare l’URL in codice; tu verifichi in Stripe Dashboard.)*

---

## Da riverificare dopo il primo giro

- [ ] **Splash / avvio:** Dopo aver completato il primo giro della checklist e reinstallato l’app, verificare che all’avvio non compaia la schermata “Caricamento…” ma solo lo splash e poi direttamente Login/Home.

---

## Note

- Se un punto fallisce, annota: **numero punto, cosa hai fatto, cosa è successo (messaggio o schermata)**. Così si può correggere senza rifare tutto.
- Per test Stripe senza addebiti reali: usa chiavi e webhook in **modalità test** (sk_test_, whsec_...).
- Riferimento go-live e comandi: `GO_LIVE.md`.
