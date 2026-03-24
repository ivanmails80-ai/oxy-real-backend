# Test beta — un punto alla volta

Quando Sam ti dice un punto, esegui il test. Quando hai finito, scrivi "ho fatto" (o "fatto"). Sam depenna e passa al successivo.

**Per simulare sempre il primo accesso (scelta lingua ogni avvio):** nel file `.env` imposta `EXPO_PUBLIC_BETA_ALWAYS_SHOW_LANGUAGE_FIRST=true` e riavvia Expo. Ogni volta che apri l'app senza essere loggato vedrai prima "Scegli la lingua", poi Login. Per produzione togli la variabile o mettila a `false`.

---

## Lista (ordine da rispettare)

- [ ] **1. Avvio app** — Apri l’app (Expo Go o build). Verifica che parta senza crash: vedi splash e poi schermata Login o (se già loggato) Chat. Nessuna schermata rossa né “Caricamento…” prolungata.
- [ ] **2. Lingua (primo avvio)** — Se è la prima volta: compare la schermata “Scegli la lingua”? Scegli una lingua (es. Italiano). Passi alla schermata Login/Registrazione?
- [ ] **3. Login** — Inserisci email e password di un account esistente e fai Login. Arrivi in Chat (lista messaggi o schermata vuota con campo di input)?
- [ ] **4. Chat — primo messaggio** — Scrivi un messaggio (es. “Ciao”) e invia. Ricevi una risposta da Oxy (testo o voce)? Nessun crash.
- [ ] **5. Menu** — Apri il menu (icona o pulsante che apre il drawer/sidebar). Vedi le voci: Abbonamento, Memory Vault, Diario, Impostazioni, Privacy, Termini, Logout?
- [ ] **6. Menu → Abbonamento** — Entra in Abbonamento. Si apre la sezione con tab Abbonamenti / Lifetime (o simile)? Vedi lo stato (es. “Nessun piano attivo” o “Attivo”) e, se presente, la barra utilizzo (crediti)?
- [ ] **7. Sconto lancio (se nei primi 30 gg)** — In schermata “Come vuoi usare OXY?” o in Menu → Abbonamento vedi il box “Sconto lancio 50%” e (se applicabile) “Mancano X giorni”? Testi leggibili, nessuna chiave raw (es. `billing.launchDiscount50`).
- [ ] **8. Lingua da menu** — Menu → Impostazioni (o Lingua). Cambia lingua (es. in English). L’interfaccia si aggiorna (testi in inglese)? Torna in Chat: i testi restano nella nuova lingua?
- [ ] **9. Memory Vault** — Menu → Memory Vault (o “Le mie note”). Si apre la schermata? Puoi aggiungere una nota/obiettivo e salvarla? Nessun crash.
- [ ] **10. Diario** — Menu → Diario. Si apre? Puoi creare una voce e salvarla? Nessun crash.
- [ ] **11. Offline** — Con app aperta, disattiva Wi‑Fi e dati (o attiva “Aereo”). Invia un messaggio in chat. Compare un messaggio/banner tipo “Sei offline” o “Impossibile raggiungere il server” (nessun crash)?
- [ ] **12. Logout** — Menu → Logout (conferma se richiesta). Torna alla schermata Login?
- [ ] **13. Riavvio** — Chiudi l’app e riaprila. Se prima eri loggato e hai fatto logout: vedi Login. Se prima eri loggato e non hai fatto logout: torni in Chat senza dover rifare login?

---

*Dopo il punto 13 la base è coperta. Se vuoi, possiamo aggiungere passi per limite 429, Stripe, ecc.*
