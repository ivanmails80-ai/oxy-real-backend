# Checklist domani — Beta tester e test con prezzi 0,10 €

**Obiettivo:** far testare l’app ai beta tester con prezzi Stripe a 0,10 € e limiti messaggi bassi, e verificare che tutto funzioni (registrazione, pagamento, ritorno in app, abbonamento attivo).

---

## 1. Stripe (prezzi 0,10 € per i test)

- [ ] Accedi a **Stripe Dashboard** (modalità **Test** se usi test, oppure Live quando sei pronto).
- [ ] Per ogni piano usato dall’app crea (o modifica) **prodotti e prezzi a 0,10 €**:
  - **Abbonamenti:** Starter, Pro, Elite (mensili) → prezzo **0,10 €** ricorrente/mese.
  - **Lifetime:** Starter, Pro, Elite → prezzo **0,10 €** una tantum.
- [ ] Copia i **Price ID** (es. `price_xxxxx`) e impostali su **Render** nelle variabili d’ambiente:
  - `STRIPE_PRICE_SUB_STARTER`, `STRIPE_PRICE_SUB_PRO`, `STRIPE_PRICE_SUB_ELITE`
  - `STRIPE_PRICE_LIFE_STARTER`, `STRIPE_PRICE_LIFE_PRO`, `STRIPE_PRICE_LIFE_ELITE`
  - (e gli annuali se li usi: `STRIPE_PRICE_SUB_*_ANNUAL`)
- [ ] Salva e fai un **deploy manuale** su Render così il backend usa i nuovi Price ID.

**Nota:** L’app mostra già 0,10 € (modifica in `pricingConfig.js` già fatta). Stripe e backend devono usare gli stessi prezzi/Price ID.

---

## 2. Backend Render — limiti messaggi (opzionale ma utile)

Per far arrivare i beta tester al “limite messaggi” in fretta:

- [ ] In **Render** → servizio **oxy-real-backend** → **Environment**.
- [ ] Imposta (o modifica):
  - `DAILY_LIMIT_STARTER` = **5**
  - `DAILY_LIMIT_PRO` = **10**
  - `DAILY_LIMIT_ELITE` = **15**
- [ ] Salva e **ridistribuisci** il backend.

*(Quando finisci i test, rimetti 50, 150, 400 e ripristina i prezzi in app/Stripe per la produzione.)*

---

## 3. APK per i beta tester

- [ ] **Creare l’APK** (una delle due strade):
  - **EAS Build:** se la quota Free è di nuovo disponibile:  
    `npx eas build --platform android --profile preview`  
    Poi scarica l’APK dal link che ti dà Expo.
  - **Build locale:** apri la cartella **`android`** in **Android Studio** → Build → Build APK(s). Poi usa `.\INSTALLA-APP-SUL-TELEFONO.bat` con il telefono collegato via USB, oppure copia l’APK e invialo ai tester.
- [ ] **Far installare l’APK** ai beta tester (link download o file APK via mail/Drive/altro).

Guida dettagliata: **`BUILD_APK_TEST_0.10.md`**.

---

## 4. Cosa verificare con i beta tester

- [ ] **Registrazione** (email/password o Google).
- [ ] **Scelta Abbonamento / Lifetime** → schermata **Starter, Pro, Elite** → tap su un piano.
- [ ] **Pagamento Stripe** (0,10 €) → completamento pagamento.
- [ ] **Ritorno in app** (deep link `oxyreal://billing/success`): l’app si riapre dopo il pagamento.
- [ ] **Stato abbonamento**: in app si vede piano attivo (es. dopo “Rileggi stato” o al ritorno).
- [ ] **Scelta voce** (se prevista dopo il pagamento) → **Conferma** → ingresso in **chat**.
- [ ] **Limite messaggi**: inviare abbastanza messaggi per raggiungere il limite (5/10/15) e verificare che compaia il messaggio di limite / upgrade.

---

## 5. Webhook Stripe (se l’app non vede l’abbonamento dopo il pagamento)

- [ ] In **Stripe Dashboard** (Test o Live) → **Developers** → **Webhooks** → **Add endpoint**.
- [ ] **URL:** `https://oxy-real-backend.onrender.com/api/billing/webhook`
- [ ] **Eventi:** almeno `checkout.session.completed` (e opzionale `customer.subscription.deleted`).
- [ ] Copia il **Signing secret** (`whsec_...`) e in **Render** imposta **`STRIPE_WEBHOOK_SECRET`**.
- [ ] Ridistribuisci il backend.

Guida: **`docs/STRIPE_TEST_MODE.md`**.

---

## 6. Riepilogo veloce domani

1. **Stripe:** prezzi 0,10 € e Price ID in Render.
2. **Render:** (opzionale) limiti 5, 10, 15; webhook se serve.
3. **APK:** build EAS o Android Studio e invio ai beta tester.
4. **Test:** registrazione → scelta piano → pagamento → ritorno in app → abbonamento attivo → chat e limite messaggi.

Quando ti ricolleghi, apri questo file (**`CHECKLIST_BETA_TESTER_DOMANI.md`**) e segui i punti in ordine.
