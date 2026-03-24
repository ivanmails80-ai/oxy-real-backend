# OXY Real — Cose che potresti non aver previsto

**Per chi non è del settore:** questa checklist ti aiuta a non dimenticare passi importanti (legali, store, minori, dati). L’app già fa diverse cose in automatico; qui trovi **cosa dipende da te** e cosa vale la pena decidere o far verificare.

---

## 1. Età e minori (già gestito in app)

| Cosa | Stato in app |
|------|----------------|
| Età minima 14 anni | ✅ Se l’utente inserisce una data di nascita valida e risulta under 14, non può proseguire allo step successivo: compare un messaggio che invita a chiedere a un genitore o a tornare quando avrà 14 anni. |
| Checkbox “consenso minore” (14–17 anni) | ✅ Se dalla data risulta che ha tra 14 e 17 anni, nello step Sicurezza compare la checkbox obbligatoria “ho informato genitori/tutori e ottenuto il consenso ove richiesto dalla legge”. Senza quella spunta non si può registrare. |
| Maggiorenni (18+) | ✅ La checkbox minore non viene mostrata; per registrarsi bastano Termini + Privacy. |

**Cosa potresti non aver previsto:**  
- In alcuni paesi la legge può richiedere **consenso esplicito del genitore** (es. modulo firmato, verifica). I testi in app dicono “ove richiesto dalla legge”: per essere tranquillo in ogni giurisdizione, un legale può suggerire se serve un flusso aggiuntivo (es. email al genitore, modulo da conservare).  
- Se in futuro vorrai **vietare del tutto** l’accesso ai minori (solo 18+), basterà aggiornare i Termini e la logica in `getAgeFromBirthDate` / step personal (età minima 18 invece di 14).

---

## 2. Legale e privacy

| Cosa | Consiglio |
|------|-----------|
| Revisione Termini e Privacy | I testi in `legalContent.js` sono una **bozza**. Prima del lancio (e ancor più se hai utenti 14–17) è consigliabile farli **revisionare da un avvocato/DPO** (anche una sola volta), per adeguarli alla tua attività e alle leggi dei paesi in cui distribuisci. |
| Contatti e titolare | Verifica che in Termini e Privacy ci siano **nome/ragione sociale, sede, email** corretti (es. oxy@oxyreal.it, SecondSelf, Legnano). Sono già impostati; se cambi titolare o contatti, aggiorna `legalContent.js`. |
| Diritti utente (GDPR) | L’informativa descrive già accesso, rettifica, cancellazione, portabilità, reclamo al Garante. Se aggiungi nuovi trattamenti (es. analytics, pubblicità), aggiorna la Privacy e, se serve, le basi giuridiche. |

**Cosa potresti non aver previsto:**  
- **Conservazione dati di minori:** alcune normative suggeriscono tempi più brevi o politiche specifiche per under-18. Un legale può indicare se inserire una frase dedicata in Privacy (es. “Per gli utenti minorenni i dati sono conservati per…”).  
- **Cookie / tracker:** se in futuro userai strumenti che impostano cookie o tracciano (es. analytics, ads), andranno menzionati in Privacy e, dove richiesto, consenso specifico.

---

## 3. Store (Google Play / App Store)

| Cosa | Consiglio |
|------|-----------|
| Classificazione età (content rating) | Su Google Play e App Store va indicata l’età minima (es. 14+ o 18+). Deve essere **coerente** con i Termini: se in app dici “da 14 anni”, il content rating non dovrebbe dire “solo 18+”. |
| Politica famiglia / minori | Google e Apple hanno policy su app usate da minori (famiglia, bambini). Se la tua app è “14+”, di solito non rientri nelle regole più stringenti per bambini, ma è bene **leggere le linee guida** dello store e dichiarare correttamente la fascia d’età. |
| Descrizione e screenshot | Nella scheda store indica chiaramente che il servizio è per utenti da **14 anni in su** (e che i minori 14–17 devono avere il consenso dei genitori ove richiesto), così gli utenti e gli store non hanno dubbi. |

**Cosa potresti non aver previsto:**  
- Se in futuro aggiungi contenuti a pagamento o funzioni “social”, gli store possono chiedere **disclaimer o controlli parentali** aggiuntivi; tieni d’occhio le email da Google/Apple dopo il submit.

---

## 4. Dati e sicurezza

| Cosa | Stato / consiglio |
|------|-------------------|
| Password e account | L’app usa Firebase Auth; le password non passano dal tuo backend. Mantieni **variabili e chiavi** (.env, EAS, Firebase) solo dove servono e non in repo pubblici. |
| Dati sensibili in chat | I messaggi vanno al backend e ai modelli IA. I Termini avvisano di non condividere dati sensibili in modo incauto. Puoi aggiungere in-app un breve avviso (“Non condividere dati sanitari o finanziari sensibili”) se vuoi essere più esplicito. |
| Backup e cancellazione | Se un utente chiede **cancellazione account/dati**, devi poterli eliminare (Firebase, backend, eventuali log). Verifica che il backend e Firebase permettano cancellazione utente e che la Privacy spieghi come richiederla (es. email a oxy@oxyreal.it). |

**Cosa potresti non aver previsto:**  
- **Export dati (portabilità):** il GDPR dà diritto alla portabilità. Se un utente chiede “tutti i miei dati in formato leggibile”, avere una procedura (anche manuale: export da Firebase/DB e invio via email) evita problemi.  
- **Violazioni dati:** avere un’idea di cosa fare se qualcuno accede ai dati in modo illecito (chi contattare, come notificare utenti/Garante) è utile; un legale può prepararti un mini protocollo.

---

## 5. Pagamenti e abbonamenti

| Cosa | Consiglio |
|------|-----------|
| Minori e pagamenti | Gli under-18 spesso non possono stipulare contratti o usare carte. Stripe e gli store gestiscono il pagamento; l’app già raccoglie la data di nascita. Se vuoi essere prudente, un legale può dirti se serve un **avviso esplicito** tipo “Se hai meno di 18 anni, l’acquisto deve essere autorizzato da un genitore/tutore”. |
| Rimborsi e recesso | Termini e condizioni store (Google/Apple) e Stripe regolano rimborsi e recesso. Assicurati che i **Termini in app** non promettano condizioni più favorevoli di quelle che poi applichi (o allineali). |

---

## 6. Manutenzione e rischi tecnici

Per tutto ciò che può far “andare in errore” l’app (backend, login, chat, abbonamenti, diario, Memory Vault), il riferimento è **`docs/MANUTENZIONE_E_RISCHI.md`**.  
Per l’ordine dei passi utente (lingua → registrazione → abbonamento → chat), il riferimento è **`docs/FLUSSO_APP.md`**.

---

## Riepilogo rapido (cosa fare tu)

1. **Prima del go-live:** revisione legale di Termini e Privacy (almeno una volta); verificare content rating e descrizione store (età 14+).
2. **Contatti:** tenere aggiornati titolare e email in `legalContent.js`.
3. **Minori:** l’app già blocca under-14 e chiede la checkbox consenso per 14–17; valuta con un legale se serve qualcosa in più (es. consenso genitore documentato).
4. **Dati:** sapere come cancellare un account e rispondere a richieste di accesso/portabilità (email + procedura interna).
5. **Store:** dopo il primo submit, controllare eventuali richieste di Google/Apple su policy famiglia o contenuti.

Se in futuro aggiungi funzionalità (es. social, pubblicità, nuovi dati), rileggi questa lista e aggiorna Termini/Privacy e store di conseguenza.

---

*Documento creato per supportare il proprietario non esperto; da aggiornare quando cambiano policy, età minima o funzionalità.*
