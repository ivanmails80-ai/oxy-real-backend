# Assistente email supporto OXY Real

Programma che **legge le email da IMAP**, capisce il tipo di problematica (login, pagamento, chat, Memory Vault, ecc.) e **genera risposte pertinenti** usando l’intelligenza artificiale (OpenAI). Pensato per la casella di supporto dell’app OXY Real.

## Cosa fa

1. Si connette alla casella email (IMAP) che usi per il supporto (es. `support@oxyreal.app`).
2. Legge le **email non lette**.
3. Per ogni email: invia a OpenAI il testo del messaggio insieme alla **conoscenza** su OXY Real (funzionalità, problematiche comuni, FAQ). L’IA capisce il tipo di richiesta (es. “non riesco ad entrare”, “ho pagato ma non si sblocca”, “Oxy non ricorda”) e scrive una risposta utile **nella stessa lingua dell’utente**.
4. **Invio risposte:**
   - Con **SEND_REPLIES=false** (default): le risposte vengono **salvate in file** nella cartella `replies/`. Puoi controllarle e inviarle tu a mano (o con un altro strumento).
   - Con **SEND_REPLIES=true**: le risposte vengono **inviate in automatico** via SMTP alla stessa casella da cui le leggi (o a quella che configuri).
5. Le email elaborate vengono segnate come **lette** così non vengono riprese al giro successivo.

## Dove farlo girare

Puoi farlo girare in due modi:

### Opzione A – Sul tuo PC (o un server che usi già)

- **Requisiti:** Node.js 18+, connessione internet.
- **Uso tipico:**  
  - Avvio manuale quando vuoi processare la casella: `npm run run-once`.  
  - Oppure avvio in background che controlla ogni 5 minuti: `npm start` (puoi chiudere il terminale se usi `pm2` o un task di sistema, vedi sotto).

Adatto se la casella di supporto non ha un volume altissimo e vuoi tenere tutto sotto controllo sul tuo ambiente.

### Opzione B – Su un server (VPS, stesso host del backend)

- Stesso tipo di programma: installi in una cartella, configuri `.env` (IMAP, SMTP, OpenAI) e lo avvii.
- Puoi schedularlo con **cron** (Linux/macOS) per eseguire ogni 5–10 minuti:
  ```bash
  */10 * * * * cd /path/to/email-support && node run.js --once
  ```
- Oppure farlo girare come servizio (es. con `pm2`) in loop con `npm start`.

Consigliato se vuoi che le email vengano processate anche quando il PC è spento.

## Setup

1. **Copia le variabili d’ambiente**
   ```bash
   cd email-support
   cp .env.example .env
   ```
2. **Compila `.env`**
   - **IMAP_***: host, porta, utente e password della casella da cui leggere (es. support@oxyreal.app su Gmail, Outlook, o un provider con IMAP).
   - **OPENAI_API_KEY**: chiave API OpenAI (stessa che usi per il backend OXY o un’altra chiave).
   - **SEND_REPLIES**: `false` per solo salvare le risposte in `replies/`, `true` per inviarle via SMTP.
   - **SMTP_***: solo se `SEND_REPLIES=true`, per l’invio (spesso stesso account della casella IMAP, con SMTP del provider).

3. **Installa e prova**
   ```bash
   npm install
   node run.js --check
   ```
   `--check` verifica che IMAP e variabili siano configurate (non invia nulla).

4. **Prima esecuzione senza invio**
   - Lascia `SEND_REPLIES=false`.
   - Esegui: `node run.js --once`.
   - Controlla la cartella `replies/`: troverai un file di testo per ogni risposta generata. Verifica che il tono e il contenuto siano ok.

5. **Quando sei soddisfatto**
   - Se vuoi l’invio automatico: imposta `SEND_REPLIES=true` e compila SMTP in `.env`.
   - Avvia in loop con `npm start` oppure metti in cron `node run.js --once` ogni 5–10 minuti.

## Comandi

| Comando | Descrizione |
|--------|-------------|
| `npm run run-once` | Esegue un solo ciclo: legge le non lette, genera risposte, salva/invia e esce. |
| `npm start` | Loop continuo: ogni 5 minuti (o `POLL_INTERVAL_MS`) ripete il ciclo. |
| `node run.js --check` | Verifica configurazione e connessione IMAP, senza processare email. |

## Conoscenza e risposte

Le risposte sono basate sul file **`knowledge/support-knowledge.md`**, che riassume:

- Tipi di problematiche comuni (lingua, login, abbonamento, Oxy Key, chat, Memory Vault, diario, notifiche, ecc.) e cosa rispondere.
- Flusso dell’app (primo avvio, registrazione, login, abbonamento).
- Contatti e tono (supporto OXY Real).

Puoi **modificare** `knowledge/support-knowledge.md` quando aggiungi funzionalità o nuove FAQ: al prossimo avvio il programma userà la versione aggiornata.

## Sicurezza

- **Non committare `.env`**: contiene password e chiavi. Tieni `.env` in `.gitignore`.
- **OpenAI:** il contenuto delle email viene inviato a OpenAI per generare la risposta; usa un account e una chiave che accetti per questo uso.
- **Invio automatico:** con `SEND_REPLIES=true` le risposte partono senza controllo. È meglio testare prima con `SEND_REPLIES=false` e revisionare i file in `replies/`.

## Riepilogo

- **Lettura:** IMAP.  
- **Logica:** capire il tipo di problematica e rispondere in modo pertinente (non generico).  
- **Dove girare:** tu scegli (PC o server); ti guida la documentazione sopra.  
- **Dove sta l’IA:** chiamate API OpenAI (cloud); il programma può girare dove preferisci (PC o VPS).

Se vuoi cambiare modello (es. GPT-4o invece di gpt-4o-mini), imposta `OPENAI_MODEL` nel `.env`.
