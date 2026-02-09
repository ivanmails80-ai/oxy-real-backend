# Guida go-live step by step (Stripe LIVE per ultima)

Ordine: **1 → 2 → 3 → … → Stripe LIVE per ultima.**

---

## Step 1 — google-services.json (Android)

Serve per **Google Sign-In** e servizi Firebase su Android. Il plugin Gradle è già stato aggiunto nel progetto; tu devi solo scaricare il file e metterlo nella cartella giusta.

### 1.1 Apri Firebase Console
- Vai su **https://console.firebase.google.com**
- Seleziona il **progetto** che usi per OXY Real / SecondSelf (lo stesso delle variabili `EXPO_PUBLIC_FIREBASE_*` nel tuo `.env`).

### 1.2 Aggiungi l’app Android (se non c’è già)
- Nel progetto: **Impostazioni** (icona ingranaggio) → **Generali**.
- Scorri fino a **“Le tue app”**.
- Se non c’è un’app Android:
  - Clicca **“Aggiungi app”** → **Android**.
  - **Nome pacchetto Android:** inserisci esattamente:  
    `com.anonymous.secondself`  
    (deve essere identico a `app.json` → `expo.android.package`).
  - Nickname opzionale (es. “OXY Real Android”). Clicca **Registra app**.

### 1.3 Scarica google-services.json
- Nella stessa pagina (o in **Impostazioni progetto** → **Le tue app** → app Android) trovi **“Scarica google-services.json”**.
- Clicca e salva il file sul PC.

### 1.4 Metti il file nel progetto
- **Copia** il file `google-services.json` scaricato.
- **Incollalo** nella cartella:  
  `AppDelSecolo\android\app\`  
  (stessa cartella dove c’è `build.gradle` dell’app, non nella root di `android`).

### 1.5 Verifica
- Controlla che esista:  
  `AppDelSecolo\android\app\google-services.json`
- Il file è in `.gitignore`? Controlla: se vuoi evitare di committarlo (per non esporre il projectId in repo pubblico), aggiungi in `.gitignore`:  
  `android/app/google-services.json`  
  (spesso si ignora in progetti pubblici; in privato puoi anche committarlo).

### 1.6 (Prossimo passo: SHA-1)
Dopo aver messo il file, per **Google Sign-In** su Android dovrai aggiungere le **impronte SHA-1** del keystore in Firebase (lo faremo nello step “Firebase Console – domini e SHA-1”).

---

## Step 2 — Deploy backend e .env (da fare dopo Step 1)

- Deploy del backend su Railway / Render / VPS.
- Compilare `backend/.env` in produzione (OPENAI, MASTER_EMAIL, Firebase, Stripe *test* per ora).
- Compilare `.env` in root per build (EXPO_PUBLIC_BACKEND_URL, EXPO_PUBLIC_FIREBASE_*).

*(Dettaglio in `RIEPILOGO_GO_LIVE_VERIFICATO.md` e `backend/DEPLOY_BACKEND.md`.)*

---

## Step 3 — Firebase Console (domini, SHA-1, Apple)

- Domini autorizzati per Auth.
- Aggiungere **SHA-1** (e opzionale SHA-256) del keystore in Firebase → app Android.
- Se usi iOS: configurazione Apple / Sign in with Apple.

---

## Step 4 — ProGuard / build release

- Già abilitato con `android.enableMinifyInReleaseBuilds=true`.
- Tu: fare una build di test (es. `npx eas build --platform android --profile production`) e verificare che non ci siano crash.

---

## Step 5 — Obfuscation JS (opzionale)

- Decidere livello e integrare (vedi `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md`).

---

## Step 6 — Sito vetrina, versioni, EAS Submit, test

- Dominio, pagine /success e /cancel, HTTPS.
- Aggiornare versioni in `app.json`.
- EAS Build e Submit, test su dispositivo.

---

## Ultimo — Stripe LIVE

- Passare a chiavi LIVE.
- Prodotti/prezzi LIVE, webhook, URL success/cancel in produzione.

---

**Prossimo passo ora:** completare **Step 1** (scarica `google-services.json` e mettilo in `android/app/`). Quando hai fatto, scrivi “fatto step 1” e passiamo allo Step 2.
