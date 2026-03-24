# Entrare nell'app come proprietario (ivanmails80@gmail.com)

Per testare l'app domani con abbonamento Elite, hai **due modi** (puoi usare entrambi).

---

## 1. Via Master (già configurato)

La tua email **ivanmails80@gmail.com** è già impostata come Master in:
- **App**: `.env` → `EXPO_PUBLIC_MASTER_EMAIL=ivanmails80@gmail.com`
- **Backend**: `backend/.env` → `MASTER_EMAIL=ivanmails80@gmail.com`

Per entrare **senza paywall** basta:
1. **Accedere nell'app** con **ivanmails80@gmail.com** (email/password o Google, come già fai).
2. **Avere il backend raggiungibile** dall’app:
   - **Se usi l’APK da EAS (Preview)**  
     In [expo.dev](https://expo.dev) → il tuo progetto → **Environment variables** (o **Secrets**), profilo **Preview**, aggiungi:
     - `EXPO_PUBLIC_BACKEND_URL` = URL del backend (es. `https://tuo-backend.onrender.com` senza slash finale).
     - Poi **ricostruisci** l’app: `npx eas build --platform android --profile preview --non-interactive`, così la nuova build include l’URL.
   - **Se sviluppi in locale**  
     Nel `.env` in root progetto aggiungi:
     - `EXPO_PUBLIC_BACKEND_URL=http://IP_DEL_PC:3030` (es. `http://10.0.0.5:3030`), con il backend avviato in `backend/` con `npm start`.

Se **backend URL** è impostato e fai login con ivanmails80@gmail.com, l’app ti considera Master e **non mostra la paywall**: entri direttamente.

---

## 2. Via “Elite” in billing (per testare il flusso abbonati)

Se vuoi che il tuo account abbia anche **Elite** in billing (come un utente che ha sottoscritto Elite dal sito):

1. **Accedi nell’app** con ivanmails80@gmail.com.
2. **Chiama una volta** l’endpoint admin (solo tu puoi farlo, perché sei Master):
   - **Da script/Postman/curl** (sostituisci `TUO_ID_TOKEN` e `URL_BACKEND`):
     ```bash
     curl -X POST "URL_BACKEND/api/admin/grant-elite" \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer TUO_ID_TOKEN" \
       -d "{}"
     ```
     Con body `{}` l’endpoint assegna Elite all’uid del token (cioè a te).
   - **Dove prendere l’idToken**: per ora da Firebase (es. in app temporaneamente `console.log(await auth.currentUser.getIdToken())`) o da uno strumento di debug. In futuro si può aggiungere in Impostazioni un pulsante “Attiva Elite (test)” visibile solo al Master che chiama questo endpoint.

Dopo la chiamata, il backend salva per il tuo utente `planId: sub_elite`, `status: active`. Al prossimo avvio l’app, se per qualche motivo non usasse il percorso Master, ti farebbe entrare comunque perché il billing risulterebbe attivo (Elite).

---

## Riepilogo per domani

- **Login**: ivanmails80@gmail.com (come già fai).
- **Per entrare subito**: assicurati che **EXPO_PUBLIC_BACKEND_URL** sia impostato nella build che usi (EAS → variabili → ricostruisci se serve).
- **Opzionale**: in Impostazioni → **Proprietario (test)** → **Attiva Elite (test)** per avere Elite anche in billing (utile per testare il flusso abbonati).

Se qualcosa non funziona (es. paywall ancora visibile), controlla che l’email in sessione sia proprio ivanmails80@gmail.com e che l’app raggiunga il backend (stessa rete o URL Render pubblico).
