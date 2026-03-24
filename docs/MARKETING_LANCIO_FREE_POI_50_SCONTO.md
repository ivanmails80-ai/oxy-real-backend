# Marketing lancio: solo Free, poi 50% per chi ha scaricato “adesso”

Strategia proposta: **lancio in due fasi** con messaggio chiaro per early adopters.

---

## 1. Strategia in sintesi

| Fase | Cosa succede | Messaggio |
|------|----------------|-----------|
| **Fase 1** | App in store **solo versione gratuita** (tutto definito e funzionante). Niente acquisti in app ancora. | “Scarica OXY: il compagno AI che ricorda. Provalo gratis.” |
| **Fase 2** | Si abilitano **abbonamenti e vendita one-shot**. | “Chi ha scaricato l’app in fase 1 ha **50% di sconto** su abbonamenti e acquisti una tantum.” |

**Vantaggi:**
- Riduce rischio: validi prima il prodotto (free) senza dipendere da pagamenti.
- Crea urgenza e gratitudine: “se l’hai scaricata adesso, sei premiato”.
- Messaggio semplice: “Scarica ora = sconto 50% quando attiviamo i piani a pagamento.”

---

## 2. Cosa intendere per “chi scarica l’app adesso”

Due interpretazioni possibili:

### Opzione A — “Adesso” = prima dell’attivazione del paid  
**Definizione:** early adopter = utente **registrato** (o con app installata) **prima della data in cui abiliti** abbonamenti/one-shot.  
**Pro:** messaggio fedele a “chi scarica adesso”.  
**Contro:** serve in backend (o in app) sapere “questo utente è early adopter” e applicare lo sconto solo a loro (es. coupon Stripe dedicato, o prezzi scontati solo per quella fascia).

### Opzione B — “Adesso” = primi 30 giorni dopo l’attivazione del paid  
**Definizione:** per i **primi 30 giorni** da quando attivi i piani a pagamento, **tutti** (anche chi scarica il giorno dopo) hanno 50%.  
**Pro:** nessuna logica “early adopter”: usi la data di go-live paid + 30 giorni, come già in parte previsto con `EXPO_PUBLIC_GO_LIVE_DATE` e `launchDiscount50`.  
**Contro:** il messaggio “chi scarica adesso” andrebbe adattato a “nei primi 30 giorni da quando attiviamo i piani a pagamento”.

**Raccomandazione:**  
- Se vuoi essere **molto chiaro** (“chi ha scaricato in fase free è premiato”) → **Opzione A**: salvi la data di registrazione (o prima apertura app) e quando abiliti il paid consideri “early adopter” chi è registrato prima di una **data soglia** (es. “Paid Launch Date”). In app e Stripe mostri 50% solo a loro.  
- Se vuoi **semplicità** e un messaggio tipo “lancio piani a pagamento: per 30 giorni tutti hanno 50%” → **Opzione B**: nessun tracking aggiuntivo, riusi la logica “primi 30 giorni da go-live” già presente.

---

## 3. Implicazioni per prodotto e store

### Fase 1 — Solo free
- **Store:** descrizione e screenshot che parlano solo di “prova gratuita”, nessun prezzo, nessun “abbonamento disponibile”.
- **In app:**  
  - Puoi **nascondere** completamente Menu → Abbonamento / Lifetime, **oppure**  
  - Mostrare una sola schermata “Piani in arrivo: chi usa OXY ora avrà **50% di sconto** quando li attiviamo” (senza prezzi né checkout).  
- **Backend:** nessun Stripe LIVE necessario in Fase 1; opzionale salvare `createdAt` (o simile) per ogni utente per la Opzione A.

### Fase 2 — Abilitazione paid + 50%
- **Store:** aggiornare descrizione: “Abbonamenti e Lifetime disponibili. **Sconto 50% per chi ha scaricato l’app in anteprima.**”
- **In app:**  
  - Menu Abbonamento/Lifetime attivi.  
  - Se **Opzione A**: in app leggi “early adopter” (es. da backend o da dato salvato) e mostri prezzi scontati + CTA “Il tuo sconto early adopter: 50%”.  
  - Se **Opzione B**: per tutti, per 30 giorni da `EXPO_PUBLIC_GO_LIVE_DATE` (data in cui abiliti il paid), mostri già i testi `launchDiscount50` e prezzi scontati.
- **Stripe:**  
  - **Opzione A**: coupon “EARLY_ADOPTER_50” (o prezzi promozionali) da applicare solo agli utenti early.  
  - **Opzione B**: prezzi lancio 50% per tutti per 30 giorni (o coupon generico con scadenza).

---

## 4. Messaggio di marketing (esempi)

**Fase 1 (solo free):**
- Store: “OXY – Compagno AI che ricorda. Provalo gratis: memoria, diario, promemoria. Niente abbonamento per provare.”
- In app (se mostri “piani in arrivo”): “Presto abbonamenti e Lifetime. **Chi usa OXY adesso avrà il 50% di sconto** quando li attiveremo.”

**Fase 2 (paid attivo, 50% early):**
- Store: “Abbonamenti e Lifetime disponibili. **Se hai scaricato OXY in anteprima: 50% di sconto** su tutti i piani.”
- In app: “Il tuo sconto early adopter: **50%** su abbonamenti e Lifetime” (solo se Opzione A) oppure “**Offerta lancio: 50% per i prossimi 30 giorni**” (Opzione B).

---

## 5. Checklist operativa

- [ ] Decidere: **Opzione A** (solo chi era in fase free ha 50%) oppure **Opzione B** (50% per tutti per 30 gg da attivazione paid).
- [ ] **Fase 1:** build solo free (eventualmente nascondere o mostrare “in arrivo” per Abbonamento/Lifetime); store listing solo free; opzionale salvare `createdAt` utente se Opzione A.
- [ ] **Fase 2:** fissare “Paid Launch Date” (e impostare `EXPO_PUBLIC_GO_LIVE_DATE` a quella data se usi Opzione B); abilitare Stripe LIVE e Menu Abbonamento/Lifetime; coupon o prezzi 50% come da scelta A/B; aggiornare store e testi in app.
- [ ] Testi i18n: aggiungere se serve una stringa tipo “Sconto 50% per chi ha scaricato l’app in anteprima” e le varianti per le due opzioni.

---

Se confermi la strategia (solo free poi paid con 50%) e la scelta tra A e B, si può adattare il codice (nascondere/mostrare Abbonamento in Fase 1, eventuale flag early adopter e logica sconto in Fase 2).
