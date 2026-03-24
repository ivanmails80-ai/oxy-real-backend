# Deploy Backend OXY Real — Ordine logico (una volta sola)

Il backend deve essere online **prima** di configurare l'app per produzione. Segui i passi in ordine.

---

## Step 1: Scegliere dove hostare

- **Railway.app** (consigliato): gratuito per iniziare, deploy da GitHub o da cartella.
- **Render.com**: simile, free tier disponibile.

Qui sotto le istruzioni per **Railway** (stessi concetti per Render).

---

## Step 2: Preparare Firebase per il cloud

Sul server **non** c’è il file `firebase-service-account.json`. Devi usare la variabile **FIREBASE_SERVICE_ACCOUNT_JSON** (JSON del service account codificato in base64).

**Come ottenere il base64 (PowerShell, dalla cartella backend):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\firebase-service-account.json"))
```
Copia l’output (stringa lunga). La incollerai nelle variabili d’ambiente del servizio (Step 4).

---

## Step 3: Creare il progetto su Railway

1. Vai su https://railway.app e accedi (GitHub o email).
2. **New Project** → **Deploy from GitHub repo**.
   - Se il backend è dentro `AppDelSecolo`, connetti il repo e imposta **Root Directory** = `backend`.
   - Oppure crea un repo che contenga solo la cartella `backend` (package.json, index.js, ecc.) e connetti quello.
3. Railway rileva Node.js e usa `npm start` (già in package.json).
4. Dopo il deploy, apri il servizio → **Settings** → **Networking** → **Generate Domain**. Ottieni un URL tipo `https://oxy-real-backend.up.railway.app`.

---

## Step 4: Variabili d’ambiente su Railway

Nel progetto Railway: **Variables** (o **Settings → Environment**) e aggiungi **tutte** le variabili sotto. Nessun file `.env` da caricare: solo chiave-valore nel pannello.

| Variabile | Valore | Note |
|-----------|--------|------|
| `PORT` | `3030` | Railway può impostarla da solo; se la imposti, usa 3030 o quella assegnata. |
| `OPENAI_API_KEY` | `sk-...` | La tua chiave OpenAI. |
| `TAVILY_API_KEY` | `tvly-...` | Chiave Tavily (opzionale). |
| `MASTER_EMAIL` | `ivanmails80@gmail.com` | Email Master. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | *(base64 del JSON)* | Vedi Step 2. **Non** usare `GOOGLE_APPLICATION_CREDENTIALS` su Railway. |
| `STRIPE_SECRET_KEY` | `sk_test_...` o `sk_live_...` | Stripe secret key. |
| `STRIPE_PRICE_SUB_STARTER` | `price_...` | Price ID Stripe. |
| `STRIPE_PRICE_SUB_PRO` | `price_...` | |
| `STRIPE_PRICE_SUB_ELITE` | `price_...` | |
| `STRIPE_PRICE_LIFE_STARTER` | `price_...` | |
| `STRIPE_PRICE_LIFE_PRO` | `price_...` | |
| `STRIPE_PRICE_LIFE_ELITE` | `price_...` | |
| `STRIPE_PRICE_PACK_100K` | `price_...` | Pacchetto token 100k (pagamento una tantum). |
| `STRIPE_PRICE_PACK_500K` | `price_...` | Pacchetto token 500k (pagamento una tantum). |
| `STRIPE_SUCCESS_URL` | `https://oxyreal.it/success.html` | Pagina success (o `/success` se configuri redirect). |
| `STRIPE_CANCEL_URL` | `https://oxyreal.it/cancel.html` | Pagina cancel. |

Dopo aver salvato le variabili, Railway fa un nuovo deploy. Attendi che sia completato.

---

## Step 5: Verificare che il backend risponda

1. Apri l’URL pubblico del backend (es. `https://oxy-real-backend.up.railway.app`).
2. Aggiungi `/health` → `https://oxy-real-backend.up.railway.app/health`.
3. Deve rispondere con JSON tipo: `{"ok":true,...}`.

Se vedi quel JSON, il backend è online. **Annota l’URL base** (senza `/health`): servirà per l’app.

---

## Step 6: Aggiornare l’app (.env)

Nella **root del progetto app** (non in `backend`), apri `.env` e imposta:

```env
EXPO_PUBLIC_BACKEND_URL=https://TUO-DOMINIO-RAILWAY.up.railway.app
```

Sostituisci con l’URL reale ottenuto da Railway (senza `/health`, senza slash finale).

- Per **test in locale**: puoi tenere anche `EXPO_PUBLIC_BACKEND_URL=http://10.24.65.19:3030` in un file `.env.local` o commentare temporaneamente, ma per produzione e build l’app deve usare l’URL pubblico del backend.

---

## Riepilogo ordine

1. **Backend online** (Railway/Render) con variabili e dominio.
2. **Test** `/health` → OK.
3. **App** `.env` con `EXPO_PUBLIC_BACKEND_URL` = URL pubblico backend.
4. **Sito** oxyreal.it: caricare `success.html` e `cancel.html` (cartella `OXY Real`).
5. **Test end-to-end**: login app → chat → abbonamento (checkout Stripe).
6. **Build produzione** (EAS) quando tutto funziona.

Così fai ogni cosa una volta sola in ordine; si torna indietro solo per modifiche puntuali.

---

## Go-live su Render: Persistent Disk e Firebase Admin

Se il backend è già su **Render** (es. https://oxy-real-backend.onrender.com), prima del go-live fai questi due passi.

### Persistent Disk (P0 — dati non si perdono a restart)

1. In **Render Dashboard** → il tuo servizio backend → **Settings**.
2. Passa a un **piano a pagamento** (serve per i dischi).
3. **Disks** → **Add Disk** → scegli un nome (es. `data`) e dimensione (es. 1 GB). Il mount path su Render è spesso `/var/data` o simile (controlla la doc Render aggiornata).
4. Nelle **Environment** del servizio aggiungi (se Render usa un path diverso):
   - `DATA_ROOT` = path di mount del disco (es. `/var/data`).  
   Il backend usa già `DATA_ROOT` o, se non impostato, prova `/var/data` e poi `backend/data` in locale. Così chat, memoria, diario e billing restano sul disco e non si perdono a redeploy.

### Firebase Admin (verifica token in produzione)

- Il backend legge **FIREBASE_SERVICE_ACCOUNT_JSON** (JSON del service account in base64). Se è già nelle variabili d’ambiente su Render, Firebase Admin è attivo e la verifica token funziona.
- Se in produzione i login “non vanno” o ricevi errori di autorizzazione, controlla che su Render la variabile **FIREBASE_SERVICE_ACCOUNT_JSON** sia impostata (stesso valore base64 usato in sviluppo).  
- **Niente** file su disco in produzione: solo questa variabile.
