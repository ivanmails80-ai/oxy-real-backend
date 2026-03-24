# Render: attivare /api/landing/newsletter

La route **POST /api/landing/newsletter** è nel backend (`backend/index.js`). Se il form della landing dà errore, verifica su Render questi tre punti.

---

## 1. Variabile d’ambiente BREVO_API_KEY

Senza questa variabile il backend risponde **503** con messaggio "Servizio newsletter non configurato."

**Cosa fare:**

1. Vai su [dashboard Render](https://dashboard.render.com).
2. Apri il servizio **oxy-real-backend** (o il nome che usi per il backend).
3. Menu **Environment** (Variabili d’ambiente).
4. Clicca **Add Environment Variable**.
5. **Key:** `BREVO_API_KEY`  
   **Value:** la chiave API Brevo (es. `xkeysib-...`).
6. Salva. Render farà un **redeploy** automatico dopo il salvataggio.

La chiave la trovi in: `visione OXYReal/api_brevo.txt`  
Oppure in Brevo: **Impostazioni → Chiavi API**.

---

## 2. Deploy aggiornato con l’ultimo codice

Se l’endpoint è stato aggiunto dopo l’ultimo deploy, Render sta ancora eseguendo una versione vecchia senza la route.

**Cosa fare:**

1. Nella pagina del servizio backend su Render, scheda **Deploys**.
2. Clicca **Manual Deploy** → **Deploy latest commit** (oppure **Clear build cache & deploy** se hai dubbi).
3. Attendi che il deploy sia **Live** (verde).

Assicurati che il repo connesso a Render contenga l’ultimo codice (commit e push da locale se lavori in locale).

---

## 3. Verifica che la route risponda

Dopo aver impostato `BREVO_API_KEY` e fatto il deploy:

- **Health:**  
  `https://oxy-real-backend.onrender.com/health`  
  deve rispondere `{"ok":true,...}`.

- **Newsletter (test):**  
  Da terminale o da Postman:
  ```bash
  curl -X POST https://oxy-real-backend.onrender.com/api/landing/newsletter \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"tua@email.it"}'
  ```
  Risposta attesa: `{"ok":true}` (status 200).  
  Se ricevi **503**, `BREVO_API_KEY` non è impostata o il deploy non è ancora aggiornato.  
  Se ricevi **502**, la chiamata a Brevo è fallita (controlla i log su Render).

---

## Log su Render

In **Logs** del servizio puoi vedere:

- `[Backend] Brevo newsletter error: ...` se Brevo restituisce errore (es. lista 3 inesistente, chiave errata).
- `Servizio newsletter non configurato` se `BREVO_API_KEY` è assente.

Dopo aver impostato la variabile e ridistribuito, il form della landing dovrebbe funzionare.
