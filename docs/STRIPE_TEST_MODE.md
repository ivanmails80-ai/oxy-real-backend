# Stripe in fase test — perché l'app non vede l'abbonamento e come procedere

Quando paghi con Stripe in **modalità test**, l'app mostra ancora "nessun abbonamento" finché il **backend** non riceve da Stripe l'evento di pagamento completato e non aggiorna lo stato. Questo avviene tramite il **webhook**.

---

## Perché l'app non dice che ho un abbonamento dopo il pagamento test?

1. **Flusso normale:**
   L'utente paga su Stripe → Stripe invia un evento `checkout.session.completed` al backend (URL webhook) → il backend salva l'abbonamento per quell'utente → l'app, chiamando `GET /api/billing/status`, vede `active: true`.

2. **In test senza webhook:**
   Se il webhook **non è configurato** (o è sbagliato), Stripe non notifica il backend: il pagamento è andato a buon fine su Stripe, ma il backend non scrive nulla. L'app continua a vedere "nessun abbonamento".

---

## Cosa fare in due passi

### 1. Sbloccare subito l'app (dopo un pagamento test già fatto)

- **Dall'app (se sei il Master):**
  Menu → **Abbonamento** → sotto "Rileggi stato" trovi il pulsante **"Sblocca abbonamento (solo test)"**.
  Toccalo: se il tuo account è quello impostato come `MASTER_EMAIL` nel backend, il backend ti assegna un abbonamento Starter e l'app si aggiorna (scelta voce → chat).

- **Da API (per te o un altro utente):**
  Il backend espone `POST /api/admin/grant-plan` (solo Master).
  Esempio (sostituisci `TUO_BACKEND_URL` e il token Firebase):
  ```bash
  curl -X POST "https://TUO_BACKEND_URL/api/admin/grant-plan" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer TUO_ID_TOKEN_FIREBASE" \
    -d '{"planId":"sub_starter"}'
  ```
  `planId` può essere: `sub_starter`, `sub_pro`, `sub_elite`, `life_starter`, `life_pro`, `life_elite`.
  Opzionale: `"uid": "firebase-uid"` per assegnare il piano a un altro utente.

Così puoi continuare a testare il flusso (voce, chat, ecc.) anche se il webhook non è ancora attivo.

---

### 2. Configurare il webhook Stripe (test) per i prossimi pagamenti

Per far sì che **ogni** pagamento test aggiorni da solo lo stato in app:

1. **Stripe Dashboard** → passa in **modalità Test** (interruttore in alto a destra).

2. **Developers → Webhooks** → **Add endpoint**:
   - **URL:** `https://TUO_BACKEND_URL/api/billing/webhook`
     (es. `https://oxyreal-backend.onrender.com/api/billing/webhook`)
   - **Eventi:** almeno `checkout.session.completed`.
     Consigliati anche: `customer.subscription.deleted`, `customer.subscription.updated` (o `canceled` se usi quello).

3. Dopo aver creato l'endpoint, apri **Signing secret** e copia il valore (es. `whsec_...`).

4. **Backend (Render / .env):**
   - `STRIPE_SECRET_KEY` = chiave **test** (`sk_test_...`).
   - `STRIPE_WEBHOOK_SECRET` = il **Signing secret** del webhook che hai appena creato (quello in modalità Test).
   - Tutti i `STRIPE_PRICE_*` devono essere gli **ID prezzo in modalità test** (Stripe → Products → prezzi in test).

5. Riavvia il backend (o fai un deploy) così legge il nuovo `STRIPE_WEBHOOK_SECRET`.

Da quel momento, quando un utente completa un pagamento test, Stripe chiama il tuo backend, il backend salva l'abbonamento e l'app mostrerà "hai un abbonamento" dopo un "Rileggi stato" o al prossimo avvio.

---

## Pagina "not found" dopo il pagamento

Dopo il pagamento Stripe reindirizza all'URL in **STRIPE_SUCCESS_URL**. Se è una pagina web inesistente (es. `https://oxyreal.it/success`), il browser mostra **pagina non trovata**.

**Soluzione:** nel backend imposta il deep link dell'app:
- `STRIPE_SUCCESS_URL=oxyreal://billing/success`
- `STRIPE_CANCEL_URL=oxyreal://billing/cancel`

Al ritorno in app lo stato abbonamento si aggiorna in automatico.

---

## Riepilogo

| Situazione | Cosa fare |
|------------|-----------|
| Hai già pagato in test e l'app non vede l'abbonamento | Usa **"Sblocca abbonamento (solo test)"** in app (se sei Master) oppure `POST /api/admin/grant-plan` con il token. |
| Dopo il pagamento appare "pagina non trovata" | Imposta `STRIPE_SUCCESS_URL=oxyreal://billing/success` e `STRIPE_CANCEL_URL=oxyreal://billing/cancel` nel backend. |
| Vuoi che i prossimi pagamenti test aggiornino da soli l'app | Configura il **webhook** in Stripe (modalità Test), imposta `STRIPE_WEBHOOK_SECRET` e chiavi/prezzi **test** nel backend. |

Per il go-live con pagamenti reali userai un altro endpoint webhook (modalità Live) e le chiavi/prezzi **live**; la logica lato backend resta la stessa.
