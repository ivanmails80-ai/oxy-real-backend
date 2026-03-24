# OXY Real — Flusso dell’app (ordine dei passi e conseguenze)

**Scopo:** definire **cosa deve fare l’app prima e dopo** ogni azione (lingua, iscrizione, Abbonamento/Lifetime, pagamento, chat). L’esperto segue questo flusso; se serve una scelta di prodotto (es. “dopo il login mostriamo anche X?”), l’esperto **chiede al proprietario** invece di decidere da solo.

---

## 1. Ordine generale (percorso utente)

```
[Primo avvio solo una volta]
   → Scelta lingua
   → Login OPPURE Registrazione

[Se ha scelto Registrazione e completa l’iscrizione]
   → Scelta modalità: Abbonamento | Lifetime
   → A seconda della scelta:
        Abbonamento → va in Chat + si apre Menu → Abbonamento (tab Abbonamenti) per pagare
        Lifetime  → va in Chat + si apre Menu → Abbonamento (tab Lifetime) per pagare

[Se ha fatto Login (già registrato)]
   → Se serve Oxy Key (modalità acquisto una tantum e non ha chiave) → schermata Oxy Key
   → Altrimenti → Chat

[Utente già loggato, riapre l’app]
   → Va direttamente in Chat (nessuna scelta lingua, nessun login)
```

---

## 2. Dettaglio passo per passo

### 2.1 Primo avvio (solo la prima volta dopo il download)

| Passo | Cosa vede l’utente | Cosa fa l’app dopo |
|-------|--------------------|--------------------|
| 1 | Schermata **“Scegli la lingua”** | Salva la lingua e il flag “ho già scelto” → non mostrare più questa schermata agli avvii successivi. |
| 2 | Schermata **Login / Registrazione** | Se l’utente fa **Login** → vedi 2.3. Se fa **Registrazione** e completa → vedi 2.2. |

### 2.2 Dopo la registrazione (nuovo account)

| Passo | Cosa vede l’utente | Cosa fa l’app dopo |
|-------|--------------------|--------------------|
| 1 | Schermata **“Come vuoi usare OXY?”** con due pulsanti: **Abbonamento**, **Lifetime** | |
| 2a | Clic su **Abbonamento** | Apre il **Menu** sulla sezione **Abbonamento** con tab **Abbonamenti** (Starter/Pro/Elite). L’utente sceglie il modello e la pagina lo porta su Stripe per il pagamento. |
| 2b | Clic su **Lifetime** | Apre il **Menu** sulla sezione **Abbonamento** con tab **Lifetime**. L’utente sceglie il piano e procede con Stripe. |
| 3 | Tornato da Stripe (pagamento avvenuto) | Si presenta **la pagina delle voci** (scelta voce assistente). |
| 4 | Scelta voce + **Conferma** | Va in **Chat** con OXY. |

Se l’utente chiude l’app e la riapre **senza aver ancora pagato**, il sistema riconosce che è già registrato e presenta subito la pagina Abbonamento/Lifetime (non il login). Non si ripete la scelta Abbonamento/Lifetime dopo che ha un piano attivo.

### 2.3 Dopo il login (utente già registrato)

| Passo | Cosa vede l’utente | Cosa fa l’app dopo |
|-------|--------------------|--------------------|
| 1 | Inserisce email/password (o provider) e fa Login | Verifica credenziali, carica profilo e cronologia chat. |
| 2 | Se l’app è in modalità **abbonamento** (subscription) e l’utente non ha abbonamento attivo | Può mostrare messaggio / gate che invita ad abbonarsi (link alla sezione Abbonamento nel menu). **Non** si mostra di nuovo la scelta Abbonamento/Lifetime (quella è solo dopo la registrazione). |
| 3 | Se l’app è in modalità **acquisto una tantum** (Lifetime) e l’utente non ha inserito la Oxy Key | Schermata **Oxy Key**: inserisce la chiave API OpenAI per usare chat e Vision. |
| 4 | Altrimenti | Va direttamente in **Chat**. |

### 2.4 Utente già loggato che riapre l’app

| Passo | Cosa fa l’app |
|-------|----------------|
| 1 | **Non** mostra scelta lingua, **non** mostra login. |
| 2 | Se **ha già un piano attivo** (pagamento fatto) → va in **Chat**. Se **non ha ancora pagato** → si presenta subito la pagina **Abbonamento/Lifetime** (scelta modello → Stripe → voci → Conferma → Chat). |

### 2.5 Dopo il logout

| Passo | Cosa vede l’utente | Cosa fa l’app dopo |
|-------|--------------------|--------------------|
| 1 | Schermata **Login** (email/password o provider) | Non si mostra di nuovo la scelta lingua (già scelta in passato). L’utente si ri-autentica e torna in Chat. |

---

## 3. Logica di conseguenza (riepilogo)

- **Lingua:** solo una volta al primo avvio; poi modificabile solo da Menu → Impostazioni.
- **Scelta Abbonamento / Lifetime:** solo **dopo la registrazione**; mai dopo il login. Ai successivi avvii non si ripete.
- **Pagamento:** avviene dal **Menu → Abbonamento** (tab Abbonamenti o Lifetime). Dopo la registrazione, se l’utente sceglie Abbonamento o Lifetime, l’app apre subito il menu su quella sezione per agevolare il pagamento.
- **Chat:** destinazione finale dopo login o dopo la scelta Abbonamento/Lifetime (e eventuale Oxy Key se richiesta).
- **Utente registrato che non fa logout:** va sempre direttamente in Chat all’avvio.

---

## 4. Quando l’esperto deve chiedere a te

L’esperto **non** deve inventare flussi. Se serve decidere ad esempio:

- “Dopo il **login**, se l’utente non ha mai scelto un piano, mostriamo di nuovo Abbonamento/Lifetime?”
- “In che ordine mostriamo i piani (Starter, Pro, Elite)?”
- “Dopo un pagamento Stripe fallito, cosa mostriamo?”

l’esperto ti **chiede** (“Per un flusso logico, preferisci A o B?”) e poi implementa in base alla tua risposta. Questo documento può essere aggiornato con la scelta presa.

---

*Ultimo aggiornamento: febbraio 2026. Da aggiornare quando si cambia il flusso (nuovi passi, nuovi pulsanti, nuovi gate).*
