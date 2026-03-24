# Checklist implementazione versione Free (Play Store)

Obiettivo: **un’unica app** pubblicabile su Play Store con **tier gratuito** attivo. Tutte le funzionalità sono **visibili** ma quelle non incluse in free sono **non attive**; al tap l’utente viene **mandato al menu Abbonamento / vendita one-shot** per fare upgrade. Stesso comportamento quando **supera il limite messaggi**.

Riferimento: `docs/MODALITA_FREE_SPEC.md`.

---

## 1. Cosa fare (checklist)

### 1.1 Backend

- [ ] **Stato “free”**  
  Utente registrato senza abbonamento e senza Lifetime acquistato → trattato come piano **free** (es. `planId: 'free'`, `status: 'free'`, `mode: 'free'`).  
  Endpoint `GET /api/billing/status` deve restituire per questi utenti: `active: false` o uno stato dedicato free con `usage: { used, limit: 5 }`.

- [ ] **Limite 5 messaggi/giorno**  
  Per utenti free: conteggio messaggi per utente per giorno (reset es. mezzanotte UTC).  
  Se `used >= 5` per il giorno corrente: rispondere con **403** (o 429) e messaggio riconoscibile dall’app (es. “limite giornaliero” / “daily_high_priority_credits_used” o codice dedicato free), così l’app può mostrare l’alert e il pulsante “Vai ad Abbonamento”.

- [ ] **Chiave server per free**  
  Per le richieste chat degli utenti free usare sempre la **vostra** API key (nessuna Oxy Key utente).  
  Modello: **entry** (es. GPT-4o mini).

- [ ] **Memory Vault, Diario, notifiche**  
  Stessa logica del piano Starter (memoria base, diario, promemoria) senza limiti aggiuntivi oltre ai 5 msg/giorno in chat.

---

### 1.2 App – Flusso dopo registrazione

- [ ] **Tre opzioni dopo la registrazione**  
  Nella schermata “Come vuoi usare OXY?” aggiungere la terza opzione:  
  **Prova gratis** | **Abbonamento** | **Lifetime**.

- [ ] **Tap “Prova gratis”**  
  - Non aprire Stripe né schermata pagamento.  
  - Considerare l’utente in piano **free** (l’app lo deduce da `billingStatus` senza piano attivo).  
  - Andare in **Chat** (e opzionalmente mostrare scelta voce come per gli altri percorsi).  
  - Non mostrare schermata “Inserisci Oxy Key”.

- [ ] **Tap “Abbonamento” o “Lifetime”**  
  Flusso attuale: scelta piano → Stripe → eventuale Oxy Key (Lifetime) → voci → Chat.

---

### 1.3 App – Funzionalità visibili ma non attive (tap → Menu Abbonamento)

Regola: **tutte le funzionalità sono visibili**. Se non sono incluse nel piano free, al **tap** l’app apre il **Menu → Abbonamento** (tab Abbonamenti o Lifetime, come già fatto per Community/Vision) e non esegue l’azione.

- [ ] **Vision (immagini in chat)**  
  Già gestita in parte: quando `!effectiveFlags.vision` si chiama `openUpgradeModal('Pro')`.  
  Verificare che per utente free `effectiveFlags.vision` sia `false` e che il flusso porti comunque al **Menu → Abbonamento** (il modal può avere pulsante “Vai ad Abbonamento” che apre il menu).

- [ ] **Storie**  
  Oggi la tile Storie è **nascosta** se `!effectiveFlags.stories`.  
  **Modifica**: mostrare **sempre** la tile Storie; se il piano è free (o comunque `!effectiveFlags.stories`), mostrarla con **lock** (es. icona lucchetto) e al **tap** aprire **Menu → Abbonamento** (non aprire il modal Storie).

- [ ] **Community**  
  Già visibile con opacity e lock; al tap si chiama `openUpgradeModal('Pro')` che apre il menu.  
  Verificare che per free il comportamento sia: **tap → Menu → Abbonamento**.

- [ ] **Cloud / Documenti** (se considerato premium)  
  Se l’invio documenti è solo per piani a pagamento: lasciare il pulsante **visibile**, al tap (se free) aprire **Menu → Abbonamento** invece di aprire il document picker.

- [ ] **Voci TTS premium** (se c’è una schermata o lista voci)  
  Le voci “premium” devono essere **visibili** ma disabilitate o con lock; al tap → **Menu → Abbonamento**.

- [ ] **Oxy Key**  
  Per utenti **free** **non** mostrare la sezione “Inserisci la tua Oxy Key” (in free non è possibile usare una propria chiave).  
  In alternativa: mostrare la voce ma disabilitata con messaggio “Disponibile con abbonamento o Lifetime” e tap → **Menu → Abbonamento**.

---

### 1.4 App – Limite messaggi superato

- [ ] **Backend**  
  Quando l’utente free ha già inviato 5 messaggi nel giorno: risposta **403** (o equivalente) con messaggio che l’app riconosce come “limite giornaliero free” (es. contenente “limite giornaliero” o un codice dedicato).

- [ ] **App**  
  Già presente gestione `isDailyCreditsUsed`: Alert con messaggio tipo “Limite raggiunto” e pulsante “Upgrade” che apre **Menu → Abbonamento**.  
  Verificare che il messaggio di errore restituito dal backend per il limite free sia riconosciuto (es. stessa stringa o stesso codice usato per `isDailyCreditsUsed`) così che si mostri l’Alert con pulsante “Vai ad Abbonamento” / “Upgrade” che apre il menu.

- [ ] **Blocco invio in app (opzionale)**  
  Se `billingStatus.usage.used >= 5` e `billingStatus.usage.limit === 5`, si può disabilitare il pulsante Invia e mostrare sotto la chat un messaggio: “Hai raggiunto il limite di 5 messaggi per oggi” + pulsante “Passa ad abbonamento” che apre **Menu → Abbonamento**.

---

### 1.5 App – Riconoscere l’utente free e le feature

- [ ] **Piano free in config**  
  In `pricingConfig.js` (o equivalente) definire il piano **free** con:  
  `dailyMessageLimit: 5`, `vision: false`, `stories: false`, `community: false`, `diary: true`, `memoryVault: 'base'`, `voices: 'basic'`, `oxyKeyIncluded: false`, ecc.

- [ ] **effectiveFlags per utente free**  
  Quando `billingStatus` indica free (nessun piano a pagamento attivo), le feature effettive devono derivare dal piano **free**:  
  Memory Vault sì, Diario sì, Notifiche sì, Vision no, Storie no, Community no, voci solo basic.

- [ ] **Contatore messaggi**  
  In **Menu → Abbonamento** (e opzionalmente in chat/header) mostrare per utenti free: **“Messaggi oggi: X / 5”**.

---

### 1.6 App – Login e riavvio

- [ ] **Utente già registrato senza piano**  
  Al login o al riavvio, se non ha abbonamento né Lifetime → trattato come **free**: va in Chat con limite 5 msg/giorno, senza possibilità di inserire Oxy Key.  
  Non forzare la schermata “Scegli Abbonamento/Lifetime” in modo bloccante: può andare in Chat come free e vedere la scelta (o l’invito upgrade) dal Menu → Abbonamento.

- [ ] **Schermata “Scegli piano”**  
  Quando mostrare la schermata con **Prova gratis | Abbonamento | Lifetime**:  
  - dopo la **registrazione** (prima volta);  
  - opzionalmente al **login** se non ha mai scelto (o sempre “senza piano”) e si vuole rivedere le opzioni.  
  Se l’utente ha già scelto “Prova gratis” in passato, al riavvio va direttamente in Chat come free.

---

### 1.7 Testi e localizzazione

- [ ] **Nuove stringhe** (e relative traduzioni) per tutte le lingue supportate, ad esempio:  
  - “Prova gratis”  
  - “Messaggi oggi: {used} / {limit}”  
  - “Hai raggiunto il limite di 5 messaggi per oggi. Passa a un abbonamento per continuare.”  
  - “Funzionalità disponibile con abbonamento o acquisto. Vai ad Abbonamento per sbloccarla.”  
  - Eventuali messaggi del modal upgrade e pulsanti “Vai ad Abbonamento” / “Upgrade”.

---

### 1.8 Upgrade (già in gran parte presente)

- [ ] **Menu → Abbonamento**  
  Sempre accessibile. Tab **Abbonamenti** e **Lifetime** con prezzi e CTA per acquistare.  
  Verificare che da free, dopo l’acquisto (Stripe/IAP), il backend aggiorni il piano e l’app mostri lo stato aggiornato (limite messaggi e feature aggiornati).

---

## 2. Cosa potresti aver tralasciato (non esperto)

- **Scelta voce dopo “Prova gratis”**  
  Dopo il tap “Prova gratis” vuoi mostrare la **scelta voce** (come dopo pagamento) prima di entrare in Chat, oppure andare direttamente in Chat con voce default? Decidere e implementare di conseguenza.

- **Pacchetti token (token packs)**  
  In free l’utente non ha Oxy Key, quindi i pacchetti token (100k/500k) non si applicano. Se da qualche parte c’è un pulsante “Acquista token”, per utente free: nasconderlo oppure mostrarlo disabilitato con “Disponibile con piano a pagamento” e tap → **Menu → Abbonamento**.

- **Abuso (più account)**  
  Con 5 msg/giorno per account, qualcuno potrebbe aprire più account. Opzionale: sul backend limitare per dispositivo o IP (es. max N account free per device in un periodo). Non obbligatorio per il primo rilascio.

- **Messaggio di errore backend per limite free**  
  L’app riconosce già “limite giornaliero” per mostrare l’Alert con pulsante Upgrade. Il backend deve restituire per il limite free un messaggio che contenga una di quelle stringhe (o un codice che l’app mappa a “limite raggiunto”) così che l’utente venga mandato al menu Abbonamento come per le funzionalità bloccate.

- **Modal upgrade vs apertura diretta menu**  
  Oggi per Vision/Community si usa `openUpgradeModal('Pro')` (modal + pulsante che apre il menu). Va bene anche **aprire direttamente** il menu sulla tab Abbonamento senza modal. L’importante è che **l’esito sia sempre: utente arriva al Menu → Abbonamento** (e possibilmente tab giusta). Scegliere un comportamento unico (sempre modal o sempre diretto) per coerenza.

- **Diario**  
  In free il **Diario è attivo**: la tile Diario deve aprirsi normalmente (non mandare ad Abbonamento). Verificare che per il piano free `effectiveFlags.diary` sia `true`.

- **Memory Vault**  
  In free è attivo (base). Non serve un tile “Memory Vault” separato che reindirizza ad Abbonamento; l’AI usa già la memoria in chat. Se esiste un’entry “Memory Vault” in menu, in free deve restare utilizzabile.

- **Notifiche / permessi**  
  I promemoria e le notifiche in free funzionano come per gli altri piani. Verificare che i permessi notifiche siano richiesti anche per utenti free (stesso flusso).

- **Build e store**  
  Per “caricare su Play Store l’app in versione free” si intende: **un’unica app** (freemium) con tier free implementato come sopra. Stesso bundle/APK, non una seconda app “solo free”. La listing su Play Store descriverà “Prova gratis con 5 messaggi al giorno, poi abbonamento o acquisto per sbloccare tutto”.

---

## 3. Riepilogo regole UX

| Situazione | Comportamento |
|------------|----------------|
| Tap su funzionalità **non** inclusa in free (Vision, Storie, Community, Cloud, voci premium, ecc.) | Funzionalità **visibile** (con lock se utile). Al tap → **Menu → Abbonamento** (tab appropriata). |
| Utente supera i 5 messaggi/giorno | Messaggio chiaro (in chat e/o Alert) + pulsante che apre **Menu → Abbonamento**. |
| Utente free che cerca “Inserisci Oxy Key” | Voce non disponibile o disabilitata; tap → **Menu → Abbonamento**. |
| Contatore messaggi (free) | Visibile es. “Messaggi oggi: X / 5” in Menu → Abbonamento (e opz. in chat). |

---

*Checklist per implementazione versione Free. Allineata a `MODALITA_FREE_SPEC.md`. Aggiornare quando si completano i punti o si cambiano scelte.*
