# Piano lancio: versione free su Play Store, senza upgrade, incentivo condivisione + 50%

**Piano concordato:** caricare su Play Store la **sola versione gratuita**, **senza** possibilità di upgrade ad abbonamenti o acquisti one-shot (Lifetime). Incentivare gli utenti a **pubblicizzare l’app** con la **promessa del 50% di sconto** quando abbonamenti e one-shot saranno attivati.

---

## 1. Obiettivi

| Cosa | Dettaglio |
|------|-----------|
| **Store** | Una sola app: versione free (5 msg/giorno, Memory Vault, Diario, notifiche). Nessun prezzo, nessun “abbonamento disponibile”. |
| **In app** | Nessun flusso di acquisto: niente Menu Abbonamento / Lifetime attivi, niente Stripe, niente “Passa ad abbonamento”. |
| **Incentivo** | Spingere gli utenti a **condividere / pubblicizzare** l’app (invita amici, condividi link, ecc.). |
| **Promessa** | “Quando attiveremo abbonamenti e Lifetime, **avrai il 50% di sconto**” (per chi ha l’app in questa fase / early adopter). |

---

## 2. Messaggio chiave

- **In store:** “Scarica OXY: il compagno AI che ricorda. Provalo gratis. Condividi l’app e avrai **50% di sconto** quando lanceremo abbonamenti e Lifetime.”
- **In app:** “Piani in arrivo. **Condividi OXY** con gli amici: quando attiveremo abbonamenti e acquisti, tu (e chi hai invitato) avrete **50% di sconto**.”

*(Formulazione “tu e chi hai invitato” opzionale: puoi limitarti a “tu avrai 50%” per semplicità.)*

---

## 3. Cosa fare in app (Fase 1 – solo free, senza upgrade)

### 3.1 Nascondere upgrade e pagamenti

- **Menu:** non mostrare la voce “Abbonamento” / “Lifetime” come scelta di acquisto. Oppure mostrare una sola voce tipo **“Piani in arrivo”** che apre una schermata dedicata (vedi sotto), non il flusso Stripe.
- **Chat / limiti:** quando l’utente raggiunge i 5 messaggi/giorno, mostrare un messaggio tipo: “Hai usato i 5 messaggi di oggi. **Condividi OXY** e avrai **50% di sconto** quando attiveremo i piani. Riprova domani.” Senza pulsante “Passa ad abbonamento” (perché l’upgrade non c’è).
- **Feature bloccate (Vision, Storie, Community, Cloud):** al tap, invece di “Vai ad Abbonamento”, messaggio tipo: “Disponibile quando attiveremo i piani. **Condividi l’app** e avrai **50% di sconto**.” + pulsante “Condividi” o “Scopri di più” che apre la schermata “Piani in arrivo / Condividi”.
- **Registrazione:** dopo “Come vuoi usare OXY?” puoi mostrare solo **“Prova gratis”** (e nascondere “Abbonamento” e “Lifetime”), oppure mostrare tutte e tre ma “Abbonamento” e “Lifetime” portano alla schermata “Piani in arrivo” invece che a Stripe.

### 3.2 Schermata “Piani in arrivo” + incentivo condivisione

- Una schermata (es. da Menu → “Piani in arrivo” o “Prossimamente”) con:
  - Titolo: “Abbonamenti e Lifetime in arrivo”.
  - Testo: “Stiamo per attivare piani a pagamento (abbonamento mensile/annuale e acquisto una tantum). **Chi ha l’app ora e condivide OXY avrà il 50% di sconto** quando li lanceremo.”
  - Pulsante principale: **“Condividi OXY”** (apre condivisione: messaggio + link store).
  - Opzionale: “Avvisami quando sono attivi” (email o notifica) se vuoi raccogliere contatti.

### 3.3 Flusso “Condividi l’app”

- **Dove:** Menu (voce “Invita amici” / “Condividi OXY”) e/o dalla schermata “Piani in arrivo” e/o dopo il limite 5 messaggi.
- **Cosa fa:** apre la condivisione nativa (WhatsApp, Telegram, SMS, ecc.) con un messaggio precompilato, es.:
  - “Sto usando OXY, l’app dove l’AI ricorda obiettivi e promemoria. Provala gratis: [link Play Store]. Se la scarichi ora, avrai il 50% di sconto quando lanceranno abbonamenti e Lifetime.”
- **Link:** link alla pagina Play Store dell’app (quando sarà pubblicata).

### 3.4 Backend

- **Stripe:** non necessario in Fase 1 (nessun acquisto).
- **Utenti:** salvare la **data di registrazione** (o prima apertura app) per poter riconoscere gli “early adopter” quando attiverai il paid (e applicare il 50% a loro, es. con coupon Stripe o prezzi dedicati).
- **Billing status:** resta “free” per tutti; nessun flusso di verifica abbonamento/Stripe.

---

## 4. Fase 2 (quando attivi abbonamenti e one-shot)

- Abiliti Menu Abbonamento / Lifetime, Stripe, prezzi.
- Per gli utenti **registrati prima della data di attivazione** (early adopter): applicare **50% di sconto** (coupon Stripe o prezzi promozionali).
- Messaggio in app e in store: “Abbonamenti e Lifetime attivi. **Sconto 50% per chi aveva già OXY.**”
- Opzionale: bonus extra per chi ha condiviso (es. “se hai invitato amici, il tuo sconto resta 50%”; senza dover tracciare i singoli inviti se non vuoi).

---

## 5. Checklist operativa (Fase 1)

- [x] **Build:** versione free only — flag `EXPO_PUBLIC_SHOW_UPGRADE=false` (o non impostato) nasconde upgrade; vedi `.env.example`. Default = Fase 1 (solo free).
- [x] **Menu:** nascondere o sostituire “Abbonamento” / “Lifetime” con “Piani in arrivo” che apre la schermata incentivo (testo 50% + “Condividi OXY”).
- [x] **Limite 5 msg:** messaggio “Condividi e avrai 50% quando attiveremo i piani” (senza pulsante “Passa ad abbonamento”).
- [x] **Feature bloccate:** messaggio “Condividi l’app per il 50%” + link a “Piani in arrivo” o Condividi.
- [x] **Registrazione:** solo “Prova gratis” visibile, oppure “Abbonamento”/“Lifetime” → “Piani in arrivo”.
- [x] **Condividi:** voce “Invita amici” / “Condividi OXY” in menu + messaggio precompilato con link store e promessa 50%.
- [x] **Backend:** salvare `createdAt` (o equivalente) per utente per future early-adopter; nessun Stripe.
- [ ] **Store listing:** descrizione free only + “Condividi e avrai 50% quando lanceremo abbonamenti e Lifetime”.

---

## 6. Riepilogo

| Fase 1 (ora) | Fase 2 (dopo) |
|--------------|----------------|
| App su Play Store = solo free, nessun acquisto | Abbonamenti e Lifetime attivi |
| Incentivo: “Condividi l’app” | Sconto 50% per early adopter |
| Promessa: “50% quando attiveremo i piani” | Coupon/prezzi 50% per chi era già registrato |
| Nessun Stripe, nessun Menu Abbonamento attivo | Stripe LIVE, Menu Abbonamento/Lifetime attivo |

Quando vuoi passare all’implementazione, si può partire da: flag per nascondere upgrade, schermata “Piani in arrivo” con CTA “Condividi OXY”, e messaggio condivisione con promessa 50%.
