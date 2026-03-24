# Fase 1: Versione gratuita definitiva e funzionante

**Ordine scelto:** prima portiamo a termine la versione free (completa e stabile), poi ci concentriamo su cosa scrivere su Play Store, screenshot, landing e marketing.

---

## Obiettivo Fase 1

Avere un’app che in modalità **solo gratuita**:

- Si installa e si apre senza crash
- Permette registrazione e login
- Offre “Prova gratis” dopo la registrazione → va in Chat con voce default, senza pagamento
- Chat: 5 messaggi/giorno, oltre si blocca con messaggio chiaro e invito upgrade
- Memory Vault, Diario, notifiche/promemoria: funzionanti
- Vision, Storie, Community, Cloud, voci extra: visibili con lock, tap → messaggio/redirect (anche se in Fase 1 il menu Abbonamento può essere nascosto o “in arrivo”)
- Nessun flusso che chiede carta o Stripe
- Testi e comportamento coerenti in tutte le lingue supportate

Quando questa fase è chiusa, passi alla **Fase 2**: testi Play Store, screenshot, descrizione, eventuale landing e comunicazione.

---

## Cosa verificare per “definitiva e funzionante”

### Backend

| Verifica | Cosa controllare |
|----------|-------------------|
| Stato free | Utente senza abbonamento/Lifetime → `GET /api/billing/status` restituisce `status: 'free'`, `usage: { used, limit: 5 }` |
| Limite 5 msg/giorno | Dopo 5 messaggi nello stesso giorno (UTC) → risposta 403/429 con messaggio che l’app riconosce come “limite raggiunto” |
| Chiave server per free | Chat utenti free usa sempre la vostra API key (GPT-4o mini), mai Oxy Key utente |
| Memory Vault / Diario / notifiche | Stessa logica del piano Starter: memoria, diario, promemoria attivi |

### App

| Verifica | Cosa controllare |
|----------|-------------------|
| Registrazione → “Prova gratis” | Tre opzioni visibili (Prova gratis \| Abbonamento \| Lifetime). Tap “Prova gratis” → Chat senza Stripe, senza Oxy Key, voce default |
| Chat free | Invio messaggi funziona; contatore “X / 5” visibile dove previsto; al 6° messaggio blocco + messaggio + (se previsto) pulsante upgrade |
| Memory Vault | Apertura, aggiunta obiettivi/promemoria, toast “Salvato in Memory Vault” e “Vedi” |
| Diario | Apertura e uso base funzionanti |
| Feature bloccate | Vision, Storie, Community, Cloud: visibili con lock, tap non esegue l’azione ma mostra messaggio o apre menu “in arrivo” / upgrade |
| Oxy Key | Non visibile o disabilitata per utente free |
| Lingue | IT, EN, FR, ES, AR, ZH: stringhe free/limite/Prova gratis/upgrade corrette, niente chiavi raw |
| Riavvio / login | Utente già registrato senza piano → torna in Chat come free, non bloccato su schermata pagamento |

### Opzionale per Fase 1 (non bloccante per “funzionante”)

- Menu Abbonamento/Lifetime: puoi nasconderlo in Fase 1 o mostrarlo come “Piani in arrivo – sconto 50% per chi scarica ora”
- Richiesta recensione e “Invita un amico”: utili ma possono essere Fase 2
- Privacy policy e Termini: per pubblicare sullo store servono; puoi considerarli parte “finale” della Fase 1 o inizio Fase 2

---

## Cosa lasciare alla Fase 2 (dopo che la free è ok)

- **Play Store:** titolo, sottotitolo, descrizione lunga, parole chiave
- **Screenshot e grafica:** quali schermate mostrare, didascalie, eventuale video
- **Landing / sito:** una pagina con messaggio + “Scarica da Play Store”
- **Comunicazione:** cosa dire su social, gruppi, “Invita un amico”, recensioni
- **Eventuale build release e submit:** quando la free è stabile e i testi store sono pronti

---

## Prossimi step concreti (solo Fase 1)

1. **Verifica backend:** utente free, limite 5, chiave server, risposta 403/429 al superamento limite (e che l’app riconosca il messaggio).
2. **Test flusso completo su build (o emulatore):** registrazione → Prova gratis → Chat (5 messaggi) → 6° messaggio bloccato → Memory Vault e Diario aperti e usabili → tap su Vision/Storie/Community/Cloud → comportamento atteso.
3. **Controllo i18n:** tutte le stringhe legate a free, limite, “Prova gratis”, upgrade presenti e corrette in tutte le lingue.
4. **Eventuali fix:** correggere bug o testi trovati nei punti sopra.
5. **Chiusura Fase 1:** quando il flusso free è stabile e ripetibile, consideri la versione gratuita “definitiva e funzionante” e passi alla Fase 2 (Play Store e copy).

---

## Verifica effettuata (codice)

- **Backend:** stato free (`status: 'free'`, `planId: 'free'`, `usage: { used, limit: 5 }`), limite 5 msg/giorno (`FREE_DAILY_LIMIT`), 429 con `error: 'daily_high_priority_credits_used'` al superamento, Vision bloccata per free (403). Chiave server usata per free.
- **App:** riconoscimento `isDailyCreditsUsed` su `daily_high_priority_credits_used` in `err.message`; `freeLimitReached` con `limit === 5` e `used >= 5`; Alert con "Upgrade" che apre Menu → Abbonamento. `aiService` passa `data.error` in `Error.message` per 429.
- **AI a costo zero:** vedi `docs/AI_GRATUITA_SENZA_BUDGET.md` (Gemini free tier o “porta la tua chiave” per ridurre costi senza togliere la funzionalità).

Se vuoi, il passo successivo può essere: fare insieme la verifica punto per punto (backend + app) e segnare nella checklist cosa è già ok e cosa va sistemato.
