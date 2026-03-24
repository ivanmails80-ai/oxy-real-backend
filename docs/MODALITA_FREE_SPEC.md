# OXY Real — Specifica modalità Free (versione gratuita)

Documento di riferimento per come deve comportarsi l’app quando l’utente è in **piano gratuito**: cosa è incluso, cosa è escluso, limiti e flussi. Da usare per implementazione e test.

---

## 1. Chi è in modalità Free

- **Utente registrato** (ha fatto signup/login).
- **Nessun piano a pagamento attivo**: né abbonamento (OXY Pass) né Lifetime acquistato.
- **Nessuna API key utente**: in free non è possibile inserire una propria Oxy Key; l’app usa solo la quota messaggi fornita da voi (chiave server).

In sintesi: **Free = registrato + nessun pagamento + nessuna chiave utente**.

---

## 2. Flusso di accesso alla Free

### 2.1 Primo avvio (invariato)

1. Scelta lingua (solo prima volta).
2. Schermata Login / Registrazione.

### 2.2 Dopo la registrazione (nuovo account)

Dopo aver completato la registrazione, l’utente vede **tre** opzioni:

| Opzione | Cosa succede |
|--------|---------------|
| **Prova gratis** | Entra in modalità Free: va in Chat con limite 5 messaggi/giorno, Memory Vault e notifiche attivi. Nessun pagamento. Può fare upgrade in qualsiasi momento da Menu → Abbonamento. |
| **Abbonamento** | Flusso attuale: apre Menu → Abbonamento (tab Abbonamenti), scelta piano → Stripe → voci → Chat. |
| **Lifetime** | Flusso attuale: apre Menu → Abbonamento (tab Lifetime), scelta piano → Stripe → inserimento Oxy Key (per Lifetime) → voci → Chat. |

- Se sceglie **Prova gratis**, non viene mostrata alcuna schermata pagamento. **In Fase 1 (solo free, senza upgrade):** l’app può richiedere di **condividere il link Play Store** prima di sbloccare la chat (schermata “Condividi per entrare in chat”); solo dopo una condivisione effettiva si accede alla Chat. In altre configurazioni: va direttamente in Chat (e opzionalmente scelta voce se prevista anche per free).
- Se chiude l’app senza aver scelto un piano a pagamento, al riavvio è ancora “senza piano”: può vedere di nuovo la scelta Free / Abbonamento / Lifetime (o andare in Chat come free se già aveva scelto “Prova gratis”).

### 2.3 Dopo il login (utente già registrato)

- Se **ha un piano a pagamento attivo** → va in Chat con funzionalità del piano (abbonamento o Lifetime).
- Se **non ha piano a pagamento** → è trattato come **Free**: va in Chat con limite 5 msg/giorno, senza possibilità di inserire Oxy Key. Il menu Abbonamento mostra sempre la possibilità di upgrade.

### 2.4 Riavvio app (utente già loggato)

- Come oggi: nessuna scelta lingua, nessun login.
- Se ha piano attivo → Chat con quel piano.
- Se non ha piano attivo → Chat in **modalità Free** (limite 5 msg/giorno, funzionalità free).

---

## 3. Limite messaggi (Free)

| Parametro | Valore | Note |
|-----------|--------|------|
| **Messaggi al giorno** | **5** | Per “giorno” si intende finestra di 24h (es. reset a mezzanotte UTC o fuso orario server). |
| **Cosa si conta** | 1 messaggio = 1 invio utente verso l’AI (una richiesta che genera una risposta). | La risposta dell’AI non conta come secondo messaggio. |
| **Reset** | Ogni giorno (stesso orario per tutti, es. 00:00 UTC). | Il backend deve tracciare `used` e `limit` per l’utente free e resettare il conteggio. |

### 3.1 Comportamento quando il limite è raggiunto

- **Durante la chat**: al 5° messaggio inviato, la richiesta viene comunque inviata e l’utente riceve la risposta. Dopo la risposta:
  - Il contatore mostra **5/5** (o equivalente).
  - I successivi tentativi di invio **non** vengono inviati al backend (o il backend risponde con errore “limite giornaliero raggiunto”).
  - L’app mostra un messaggio chiaro: tipo *“Hai raggiunto il limite di 5 messaggi per oggi. Il contatore si azzera a mezzanotte. Passa a un abbonamento per messaggi illimitati.”* con pulsante/link a Menu → Abbonamento.
- **In Menu → Abbonamento**: nella sezione uso/crediti si mostra “X/5 messaggi usati oggi” e l’invito ad upgrade.

### 3.2 Visualizzazione del contatore (Free)

- In un punto visibile ma non invadente (es. Menu → Abbonamento, o sotto la chat, o in header):  
  **“Messaggi oggi: X / 5”** (o stringa localizzata equivalente).
- Opzionale: avviso soft quando restano 1–2 messaggi (“Ti restano 2 messaggi gratuiti oggi”).

---

## 4. Funzionalità: incluse ed escluse in Free

### 4.1 Incluse (sempre attive in Free)

| Funzionalità | Descrizione |
|--------------|-------------|
| **Memory Vault** | L’AI ricorda preferenze, obiettivi e contesto dell’utente. Stessa logica e stesso livello “base” del piano Starter (memoria a lungo termine per personalizzazione). |
| **Notifiche / Promemoria** | L’utente può chiedere “ricordami che …” / appuntamenti; l’app può inviare notifiche locali (e/o push se configurate) per richieste di promemoria. Nessun limite aggiuntivo su numero di promemoria (o si può definire un limite ragionevole in seguito). |
| **Diario** | Accesso al diario interattivo: lettura e scrittura. L’AI può riferirsi al diario nel contesto (come per Starter). |
| **Chat con l’AI** | Fino a 5 messaggi/giorno; modello **entry** (es. GPT-4o mini o equivalente). Risposte testuali normali. |
| **Input vocale** | L’utente può parlare per scrivere il messaggio (stessa UX degli altri piani). |
| **Voci TTS (base)** | Solo tier “basic” per la voce dell’assistente (nessuna voce premium). |
| **Lingua e impostazioni** | Stesse lingue e impostazioni generali (notifiche, suoni, ecc.). |

### 4.2 Escluse (sbloccabili solo con upgrade)

| Funzionalità | Note |
|--------------|------|
| **Vision (immagini in chat)** | In Free non si possono allegare/inviare immagini per l’analisi AI. Se l’utente tenta: messaggio tipo “Vision AI è disponibile con OXY Pass Pro/Elite o Lifetime Pro/Elite. Vai ad Abbonamento per sbloccarla.” e link a Menu → Abbonamento. |
| **Storie interattive** | Non accessibili in Free. La sezione/entry point Storie può essere nascosta o disabilitata con messaggio “Sblocca con abbonamento”. |
| **Community** | Non accessibile in Free (nascosta o disabilitata con CTA upgrade). |
| **Cloud / sync avanzato** | Funzionalità premium non disponibili in Free. |
| **Modelli Pro/Elite** | Solo modello entry; nessun accesso a modelli superiori. |
| **Voci TTS premium** | Solo voci “basic”. |
| **Oxy Key (chiave utente)** | In Free **non** è disponibile l’opzione “Inserisci la tua Oxy Key”. L’unico modo per usare l’AI è la quota 5 msg/giorno con la chiave server. |

### 4.3 Riepilogo tecnico (per implementazione)

- **Piano/planId Free**: es. `free` o `plan_free` (da definire in backend e in `pricingConfig`/equivalente).
- **Features Free**:  
  `modelsTier: 'entry'`, `memoryVault: 'base'`, `stories: false`, `diary: true`, `community: false`, `cloud: false`, `voices: 'basic'`, `vision: false`, `dailyMessageLimit: 5`, `oxyKeyIncluded: false` (e nessuna possibilità di inserire chiave utente).

---

## 5. Nessuna API key utente in Free

- In **Free** non viene mostrata alcuna schermata “Inserisci la tua Oxy Key” e non esiste un campo per inserirla.
- La chat usa **solo** la chiave API del backend; il backend riconosce l’utente come `planId = free` e applica il limite di 5 messaggi/giorno.
- Se in futuro si introducesse l’opzione “usa la tua chiave” anche per utenti non paganti, andrebbe trattata come variante separata (es. “Free con tua chiave”); per questa specifica **non** è prevista.

---

## 6. Upgrade (da Free a a pagamento)

- **Dove**: Menu → Abbonamento (come per utenti senza piano).
- **Cosa vede**: stesse tab/schede **Abbonamenti** (Starter/Pro/Elite) e **Lifetime** (Starter/Pro/Elite), con prezzi e CTA per acquistare.
- **Flusso**: tap su un piano → Stripe (o IAP) → conferma pagamento → backend aggiorna piano → l’app mostra lo stato aggiornato (abbonamento o Lifetime) e rimuove il limite 5 msg/giorno (per abbonamento applica i limiti del piano; per Lifetime con chiave utente nessun limite lato messaggi).
- **Messaggi in-app**: in Free è opportuno mostrare in modo chiaro un invito all’upgrade (es. sotto il contatore messaggi, o in Menu → Abbonamento in cima: “Passa a OXY Pass per più messaggi e Vision, Storie e tanto altro.”).

---

## 7. Backend (comportamento atteso)

- **Identificazione Free**: utente autenticato senza `planId` a pagamento (né subscription né lifetime attivo) → trattato come `planId = free` (o equivalente).
- **Endpoint billing/status**: per utente Free deve restituire ad es. `status: 'free'`, `planId: 'free'`, `mode: 'free'`, `usage: { used: N, limit: 5 }` e `trialEndsAt` assente (a meno che non si usi un trial separato; in questa spec Free e Trial sono distinti: Free è permanente finché non fa upgrade).
- **Invio messaggi**: per `planId === 'free'` il backend conta i messaggi per `userId` e per giorno; se `used >= 5` per quel giorno risponde con errore HTTP (es. 403) e messaggio “Limite giornaliero raggiunto”; altrimenti incrementa il conteggio e processa la richiesta con la chiave server (modello entry).
- **Memory Vault, Diario, Notifiche**: stesse API e stessa logica del piano Starter (entry + memory base + diary); nessuna limitazione aggiuntiva sul numero di “ricordi” o note diario per la Free (solo il limite messaggi chat).

---

## 8. Notifiche e promemoria (Free)

- **Promemoria richiesti dall’utente** (es. “ricordami domani alle 10 di chiamare Marco”): **attivi** in Free. L’app (e/o il backend) può creare promemoria e inviare notifiche locali (e push se configurate) come per gli altri piani.
- **Altre notifiche** (es. “buongiorno”, promozioni): seguono le stesse impostazioni e preferenze dell’utente (opt-in dove richiesto).

---

## 9. Diario (Free)

- **Accesso**: lettura e scrittura come per Starter.
- **Integrazione con l’AI**: l’AI può ricevere contesto dal diario (stessa logica degli altri piani) nei messaggi che rientrano nel limite dei 5/giorno.

---

## 10. Memory Vault (Free)

- **Stesso livello “base”** del piano Starter: memoria a lungo termine, preferenze, obiettivi.
- **Nessun limite aggiuntivo** sul numero di “memorie” o sulla dimensione del vault per la Free; l’unico limite è quello dei 5 messaggi/giorno in chat.

---

## 11. UI/UX (riepilogo)

| Elemento | Comportamento in Free |
|----------|------------------------|
| **Badge / etichetta piano** | Mostrare “Free” o “Piano gratuito” (es. in Menu → Abbonamento o in profilo). |
| **Contatore messaggi** | “Messaggi oggi: X / 5” visibile (Menu → Abbonamento e/o in chat). |
| **Limite raggiunto** | Messaggio chiaro + CTA “Passa ad abbonamento” / “Vai ad Abbonamento”. |
| **Vision disabilitata** | Nessun pulsante allegato immagine in chat, o pulsante disabilitato con tooltip/messaggio che spiega che serve upgrade. |
| **Storie / Community** | Nascoste o disabilitate con messaggio “Sblocca con abbonamento”. |
| **Menu Abbonamento** | Sempre accessibile; in evidenza piani a pagamento e invito ad upgrade. |

---

## 12. Localizzazione e test

- Tutte le stringhe specifiche della Free (es. “Prova gratis”, “Messaggi oggi: X/5”, “Limite giornaliero raggiunto”, “Vision disponibile con abbonamento”) devono essere presenti nei file di traduzione (i18n) per tutte le lingue supportate.
- **Test consigliati**: registrazione → Prova gratis → invio 5 messaggi → sesto messaggio bloccato e messaggio corretto; attivazione promemoria e notifica; accesso Memory Vault e Diario; tentativo Vision bloccato; upgrade da Menu Abbonamento e verifica che dopo il pagamento il limite scompaia e le funzionalità si sbloccano.

---

## 13. Riepilogo numeri e flag

| Voce | Valore |
|------|--------|
| Messaggi/giorno (Free) | 5 |
| Modello AI | entry (es. GPT-4o mini) |
| Memory Vault | base (attivo) |
| Diario | attivo |
| Notifiche/promemoria | attive |
| Vision | disattiva |
| Storie | disattive |
| Community | disattiva |
| Oxy Key utente | non disponibile |
| Voci TTS | solo basic (una voce; "Prova" su altre → messaggio abbonamento/one-shot) |

---

*Documento di specifica modalità Free. Ultimo aggiornamento: marzo 2026. Da aggiornare se si cambiano limiti, funzionalità o flussi.*
