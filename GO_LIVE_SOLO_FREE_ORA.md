# Go live — Solo versione gratuita (registrazioni)

**Obiettivo:** andare live con la **sola versione gratuita**, far registrare gli utenti e farli usare la chat (5 messaggi/giorno). Abbonamenti e beta tester con il resto **dopo**.

---

## 1. Cosa vede l’utente (flusso)

1. **Primo avvio** → Scelta lingua (solo una volta).
2. **Login / Registrazione** → Email+password o Google (e registrazione con dati richiesti).
3. **“Come vuoi usare OXY?”** → Compare **solo** il pulsante **“Prova gratis”** (niente Abbonamento né Lifetime).
4. **Tap “Prova gratis”** → Schermata **“Condividi per entrare in chat”** con:
   - Pulsante **“Condividi OXY”** (condivide link app → poi entra in chat).
   - Link **“Entra in chat senza condividere”** (entra subito in chat, senza condividere).
5. **Chat** → 5 messaggi/giorno; al sesto messaggio: messaggio di limite + invito a condividere/upgrade. Memory Vault, Diario, menu funzionanti; Vision/Storie/Community/Cloud visibili ma bloccati (tap → messaggio upgrade).
6. **Menu** → “Piani in arrivo” (testo 50% sconto quando attiverai i piani), Condividi OXY, Impostazioni, Lingua, Privacy, Termini, Logout.

**Nessuna richiesta di carta, Stripe o pagamento.**

---

## 2. Cosa fare tu (in ordine)

### 2.1 Variabili build (versione solo free)

- **Non impostare** `EXPO_PUBLIC_SHOW_UPGRADE` oppure impostalo a **`false`** (in EAS Secrets o nel file `.env` per build locale).  
  Così in “Come vuoi usare OXY?” compare solo **“Prova gratis”**.

### 2.2 Backend online

- Verifica che il backend risponda:  
  `https://oxy-real-backend.onrender.com/health` → `{"ok":true,...}`.  
- Variabili Render: Firebase, `OPENAI_API_KEY`, `DATA_ROOT`; per utenti free il backend usa il limite 5 msg/giorno e la chiave server.

### 2.3 Build e installazione

- **Preflight:** `npm run preflight:go-live` (nella cartella del progetto).
- **Build:**  
  - EAS: `npx eas build --platform android --profile production`  
  - Oppure locale: **COME_CREARE_APK_E_INSTALLARLA.md** (prebuild → bat o Android Studio → APK).
- **Installazione:** APK sul telefono (USB + `INSTALLA-APP-SUL-TELEFONO.bat` o `adb install -r ...`).

### 2.4 Test veloce (solo free)

- Registrazione → solo “Prova gratis” → schermata Condividi → **“Entra in chat senza condividere”** → Chat.
- Invio 5 messaggi → sesto bloccato con messaggio limite.
- Menu: Piani in arrivo, Condividi OXY, Memory Vault, Diario, Logout.

### 2.5 Play Store

- Segui **docs/GUIDA_PLAY_STORE.md**: account, build, scheda store (titolo, descrizione, screenshot, Privacy policy), invio build (internal/closed poi production).
- Descrizione tipo: “Scarica OXY Real. Provalo gratis. Condividi l’app e avrai il 50% di sconto quando lanceremo abbonamenti.”

---

## 3. Dopo il go live

- **Utenti registrati:** li vedi in Firebase (Authentication) e, se il backend salva i metadati, in `data/users` su Render.
- **Beta tester e abbonamenti:** quando vuoi attivare i piani a pagamento, imposti `EXPO_PUBLIC_SHOW_UPGRADE=true` (e configuri Stripe LIVE, webhook, prezzi), rifai build e usi **BETA_PUNTI_CRITICI.md** per i test con i beta tester.

---

## 4. Riepilogo

| Cosa | Dove / Come |
|------|-------------|
| Solo “Prova gratis” (no Abbonamento/Lifetime) | `EXPO_PUBLIC_SHOW_UPGRADE=false` o non impostato |
| Entrare in chat senza condividere | Link “Entra in chat senza condividere” sotto il pulsante Condividi (già in app) |
| Limite 5 msg/giorno | Backend free tier; messaggio in chat + alert al superamento |
| Build | EAS production o locale (vedi **COME_CREARE_APK_E_INSTALLARLA.md**) |
| Store | docs/GUIDA_PLAY_STORE.md |

**Riferimenti:** GO_LIVE.md, COSA_MANCA_GO_LIVE_GRATUITA.md, docs/FASE_1_VERSIONE_FREE_DEFINITIVA.md.
