# Cosa fare adesso — step by step

## Step A: Build e installazione (in corso)

La build Android è partita con:
```bash
npx expo run:android --no-bundler
```

- **Attendi** che in terminale compaia qualcosa tipo: `BUILD SUCCESSFUL` e `Installing the app...` / `Successfully installed on device`.
- Se chiede di avviare il bundler Metro, puoi rispondere Sì (oppure in un altro terminale lancia `npx expo start` e tieni quella finestra aperta).
- Alla fine l’app **OXY** dovrebbe aprirsi da sola sul telefono (o trovi l’icona nel drawer).

Se la build **fallisce** (errore in rosso), copia l’ultima parte del messaggio di errore e incollala qui così la sistemiamo.

---

## Step B: Backend raggiungibile dal telefono

- Se usi il **backend su Render** (es. `https://oxy-real-backend.onrender.com`): non serve nulla, l’app userà quell’URL (se in `.env` non c’è `EXPO_PUBLIC_BACKEND_URL` usa il default).
- Se usi il **backend sul PC**:
  1. Sul PC avvia il backend: nella cartella `backend` → `npm start`.
  2. Nel `.env` alla **root del progetto app** (non in backend) metti:
     ```
     EXPO_PUBLIC_BACKEND_URL=http://IP_DEL_TUO_PC:3030
     ```
     Per trovare l’IP del PC: apri CMD e scrivi `ipconfig`, cerca “Indirizzo IPv4” della rete Wi‑Fi (es. 192.168.1.10).
  3. Telefono e PC devono essere sulla **stessa rete Wi‑Fi**.
  4. Se hai cambiato `.env` dopo la build, rifai la build (o riavvia Metro e ricarica l’app) perché le variabili vengono lette a build time.

---

## Step C: Test punto per punto (ordine consigliato)

Quando l’app è installata e si apre senza crash:

1. **Accesso** — Login email/password, logout, riavvio app (sessione mantenuta).
2. **Chat** — Invia un messaggio: arriva risposta? (serve backend attivo e piano attivo o Oxy Key).
3. **Menu** — Apri menu: Abbonamento, Impostazioni, Privacy, Termini. Tutto si apre?
4. **Stato abbonamento** — Menu → Abbonamento: vedi “Nessun piano” o “Piano attivo”? Barra utilizzo visibile?
5. **Limite (429)** — Con piano attivo, supera il limite messaggi del giorno (o abbassa temporaneamente il limite in backend) e verifica che compaia il messaggio “Daily High-Priority Credits…” e il pulsante “Upgrade Now”.
6. **Funzioni bloccate** — Con piano Starter: tocca Community, Vision (fotocamera), Gestione Cloud: deve apparire la modal “Evolvi Ora” e le tile con lucchetto/opacità.
7. **Checkout** — Solo se Stripe è configurato: da Abbonamento tocca “Abbonati” e controlla che si apra Stripe Checkout (poi puoi annullare).

Per ogni punto: se qualcosa non va, annota **numero punto + cosa hai fatto + cosa è successo** (messaggio a schermo o comportamento). Così sistemiamo nell’ordine giusto.

---

## Riferimento completo

Lista completa di tutti i test: **`CHECKLIST_TEST_APP.md`**. Puoi usarla dopo aver fatto questi primi passi per un giro completo.
