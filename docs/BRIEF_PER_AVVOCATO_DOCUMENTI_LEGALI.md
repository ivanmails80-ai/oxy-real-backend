# Brief per l’avvocato — Documenti legali per OXY Real

**Scopo del documento:** fornire al legale tutte le informazioni tecniche e di contesto necessarie per redigere **Informativa sulla privacy** (Privacy Policy) e **Termini e condizioni di utilizzo del servizio** (Termini di servizio) per l’applicazione mobile OXY Real, in vista della pubblicazione sugli store (Apple App Store, Google Play) e del rispetto del GDPR e della normativa applicabile.

---

## 1. Descrizione del prodotto e del servizio

- **Nome:** OXY Real (sottotitolo / payoff: “Real Identity”).
- **Tipo:** Applicazione mobile (iOS e Android) che offre:
  - **Chat con intelligenza artificiale:** l’utente invia messaggi di testo (e opzionalmente immagini) e riceve risposte generate da un modello di linguaggio (AI). Le risposte possono avvalersi di ricerca sul web (informazioni aggiornate).
  - **Profilo utente:** registrazione, login, gestione account (cambio password, recupero password), profilo con nome, email, eventuale telefono e email di backup.
  - **Funzionalità aggiuntive (o in arrivo):** “Vision AI” (analisi di foto/documenti), sincronizzazione cloud (annunciata come “in arrivo”), abbonamento / acquisto in-app (pagine presenti, integrazione pagamenti in fase di definizione).
- **Modello di business previsto:**
  - **Abbonamento:** accesso al servizio (chat, AI) dietro abbonamento; l’utente non inserisce chiavi API nel dispositivo; le chiamate AI passano da un server del titolare.
  - **Acquisto una tantum (opzionale):** in una variante dell’app, l’utente può acquistare l’app senza abbonamento e, in quel caso, può inserire una propria chiave API (Oxy Key) per usare il servizio. In tale variante la chiave è memorizzata solo sul dispositivo dell’utente (non nel codice né su server del titolare).
- **Titolare / fornitore del servizio:** da indicare dal cliente (ragione sociale, sede, P.IVA, contatti, eventuale DPO e PEC). *[Placeholder: il legale inserirà i dati del titolare del trattamento e del fornitore del servizio.]*

---

## 2. Documenti da redigere

1. **Informativa sulla privacy (Privacy Policy)**  
   - Da mostrare in-app (menu → “Privacy policy”) e, ove richiesto dagli store, da rendere disponibile via link (es. sito web).  
   - Deve essere comprensibile, completa e conforme al Regolamento UE 2016/679 (GDPR) e al Codice privacy italiano (D.Lgs. 196/2003 e successive modifiche), con particolare attenzione a: titolare, finalità, base giuridica, categorie di dati, destinatari e trasferimenti, conservazione, diritti dell’interessato, reclamo al Garante, eventuale profilazione, eventuale trattamento di minori.

2. **Termini e condizioni di utilizzo del servizio (Termini di servizio)**  
   - Da mostrare in-app (menu → “Termini di servizio”) e, ove richiesto, via link.  
   - Devono regolare: accettazione, descrizione del servizio, registrazione/account, obblighi dell’utente, proprietà intellettuale, limitazione di responsabilità, recesso/sospensione, modifiche ai termini, legge applicabile e foro competente. Eventuali riferimenti a abbonamento, acquisto in-app e rimborsi andranno allineati alle policy degli store (Apple, Google) e alla normativa consumer.

---

## 3. Dati personali trattati (per la Privacy Policy)

Di seguito l’elenco dei dati che l’app e le infrastrutture collegate raccolgono o trattano, così da consentire al legale di descrivere in modo accurato il trattamento nella privacy policy.

### 3.1 Dati forniti direttamente dall’utente

- **Registrazione / account:**  
  Nome, cognome, indirizzo email (principale e, opzionale, secondario/backup), numero di telefono (opzionale), data di nascita (opzionale), password.  
  Questi dati sono richiesti in fase di registrazione (form in-app); email e password sono necessari per l’accesso.

- **Profilo e preferenze:**  
  Nome visualizzato (anche derivato da nome/cognome), eventuale immagine profilo (foto scelta dall’utente), preferenze in-app (es. nome assegnato all’assistente IA, lingua). Parte di questi dati può essere salvata su server (profilo) o solo sul dispositivo (preferenze), come indicato sotto.

- **Contenuti generati dall’utente:**  
  Testi dei messaggi inviati nella chat, eventuali immagini o file inviati per l’analisi (es. “Vision AI”). Tali contenuti sono necessari per erogare il servizio (risposte dell’IA) e possono essere conservati per la cronologia della conversazione.

### 3.2 Dati raccolti o generati automaticamente

- **Identificativi tecnici e sessione:**  
  Identificativo utente (uid) assegnato dalla piattaforma di autenticazione (Firebase), token di sessione, indirizzo IP e dati tecnici di connessione (nei log di server e/o dei fornitori terzi), identificativo del dispositivo o dell’app ove applicabile.

- **Utilizzo del servizio:**  
  Cronologia delle conversazioni (messaggi utente e risposte dell’IA) salvata per consentire la continuità della chat e il funzionamento del servizio. Tali dati possono essere conservati su server del titolare (backend) e/o su infrastrutture terze (es. database Firebase).

### 3.3 Dati sensibili o particolari

- **Data di nascita:**  
  Se raccolta, può essere utilizzata per verificare l’età (es. maggiorenni) o per finalità di servizio; il legale potrà indicare base giuridica e eventuali cautele (es. limitazione d’età del servizio, trattamento di minori se previsto).

- **Immagine profilo / foto inviate:**  
  Non sono trattate come dati biometrici; le foto inviate per “Vision AI” sono elaborate per generare risposte testuali e possono essere conservate nei limiti tecnici e di legge. Il legale potrà precisare finalità e conservazione.

---

## 4. Soggetti che trattano i dati (titolare e responsabili/terzi)

- **Titolare del trattamento:**  
  Il cliente / fornitore dell’app (ragione sociale, sede e contatti da fornire al legale). Il titolare decide finalità e mezzi del trattamento.

- **Fornitori terzi che trattano dati per conto del titolare (o in qualità di responsabili/contitolari, da qualificare con il legale):**
  - **Google Firebase (Google LLC / Google Ireland):**  
    Autenticazione (Auth) e database (Firestore). Trattano: email, password (hash), identificativo utente, nome, eventuale telefono, dati di profilo salvati su Firestore (nome, email principale/secondaria, telefono, data di nascita).  
    Sedi/trasferimenti: possibile trasferimento in paesi extra-UE; verificare condizioni standard e clausole tipo.
  - **Backend del titolare (server dedicato / hosting):**  
    Riceve token di autenticazione (idToken) e messaggi della chat; conserva la cronologia delle conversazioni (messaggi utente e risposte IA) associata all’identificativo utente. Può risiedere in UE o extra-UE a seconda dell’hosting scelto dal titolare.
  - **OpenAI:**  
    Il contenuto dei messaggi (e eventuali immagini) viene inviato a OpenAI per generare le risposte dell’IA. Trattamento di dati personali (contenuti delle chat) da parte di OpenAI; condizioni e sede/trasferimenti secondo i termini OpenAI e normativa applicabile.
  - **Tavily (ricerca web):**  
    Se il servizio utilizza Tavily per la ricerca sul web, le query di ricerca (derivate dai messaggi o dal contesto della chat) possono essere inviate a Tavily. Verificare policy e sede/trasferimenti.
  - **Apple e Google (store e login):**  
    Se è attivo il login con Apple o Google, questi soggetti trattano i dati di accesso (es. identificativo, email) secondo le rispettive policy. Gli acquisti in-app (abbonamento / acquisto una tantum) sono gestiti da Apple e Google; i dati di pagamento sono trattati da loro, non dall’app (salvo eventuali dati di fatturazione che il titolare riceva).
  - **Expo / EAS (build e distribuzione):**  
    Servizi per la build e la distribuzione dell’app; in fase di sviluppo e build possono essere in gioco dati di progetto; il legale può considerare solo il contesto “app in produzione” se non vi è trattamento di dati utente da parte di Expo per il servizio finale.

Il legale potrà indicare in privacy policy: elenco (o categorie) di destinatari/responsabili, finalità del trattamento da parte di ciascuno, base legale per eventuali trasferimenti extra-UE (clausole tipo, decisioni di adeguatezza, ecc.).

---

## 5. Finalità e basi giuridiche (suggerimenti per il legale)

- **Erogazione del servizio (chat, AI, account, cronologia):** esecuzione del contratto (e, ove applicabile, misure precontrattuali).
- **Autenticazione e sicurezza (login, recupero password, verifica token):** esecuzione del contratto e legittimo interesse (sicurezza).
- **Gestione abbonamenti / acquisti in-app:** esecuzione del contratto; adempimento obblighi di legge (fatturazione, contabilità) ove applicabile.
- **Comunicazioni di servizio (es. notifiche su modifiche ai termini o al servizio):** esecuzione del contratto e/o legittimo interesse.
- **Miglioramento del servizio, analisi (anonimizzate o aggregate):** legittimo interesse o consenso, a seconda di come il titolare intende strutturare il trattamento; indicare se sono previsti analytics e con quali fornitori.
- **Marketing / newsletter:** solo con consenso esplicito; indicare se previsto e come si raccoglie il consenso.
- **Adempimento obblighi di legge:** obbligo legale (es. conservazione per contabilità, richieste autorità).

Il legale adatterà le finalità e le basi giuridiche alle scelte effettive del cliente (es. nessun marketing senza consenso, limitazione d’età, ecc.).

---

## 6. Conservazione dei dati

- **Account e profilo:**  
  Fino a cancellazione account (e periodo successivo eventualmente richiesto per legge o per gestione contenziosi, da definire con il legale).
- **Cronologia chat:**  
  Conservata sul backend (e/o su Firebase) per la durata del rapporto contrattuale e, eventualmente, per un periodo limitato dopo la cancellazione dell’account (es. backup, obblighi di legge); il legale potrà indicare un periodo massimo o criteri di cancellazione.
- **Log e dati tecnici:**  
  Periodo limitato (es. 12–24 mesi o quanto richiesto per sicurezza e troubleshooting), salvo obblighi di legge diversi.
- **Dati di pagamento:**  
  Non conservati dall’app; gestiti da Apple/Google (e eventualmente da Stripe o altri). Il titolare può conservare solo dati di fatturazione/abbonamento (es. identificativo transazione, stato abbonamento) per il tempo necessario a contratto e legge.

Il legale indicherà i tempi di conservazione (o i criteri) in modo conforme al GDPR (limitazione della conservazione).

---

## 7. Diritti dell’interessato e reclamo

- Inserire in privacy policy: diritto di accesso, rettifica, cancellazione, limitazione del trattamento, portabilità (ove applicabile), opposizione, revoca del consenso (ove la base sia il consenso), diritto di proporre reclamo all’autorità di controllo (Garante per la protezione dei dati personali – Italia).
- Indicare modalità di esercizio (es. email, PEC, form) e termine di risposta (es. 30 giorni, salvo proroga per complessità).

---

## 8. Minori ed età

- In registrazione può essere richiesta la **data di nascita** (opzionale).  
- Il legale dovrà precisare:  
  - se il servizio è vietato ai minori (es. sotto i 16 anni o sotto i 18) e come si verifica l’età;  
  - se è previsto il trattamento di minori (es. sopra i 16 con consenso del genitore, o secondo normativa applicabile);  
  - eventuali clausole di responsabilità per uso da parte di minori in violazione dei termini.

---

## 9. Trasferimenti fuori dall’UE

- Firebase (Google), OpenAI, Tavily, Apple, Google possono prevedere trasferimenti in paesi extra-UE (es. USA).  
- Il legale dovrà indicare in privacy policy: quali trasferimenti sono previsti, su quale base (decisione di adeguatezza, clausole tipo, garanzie aggiuntive, ecc.) e dove l’utente può ottenere copia delle garanzie (es. link alle policy dei fornitori o alle clausole tipo).

---

## 10. Aspetti specifici per i Termini di servizio

- **Descrizione del servizio:**  
  App mobile OXY Real che offre chat con intelligenza artificiale, profilo utente, eventuale analisi di immagini (Vision AI), con possibilità di abbonamento o acquisto una tantum (e, in una variante, inserimento di chiave API da parte dell’utente). Funzionalità “in arrivo” (es. cloud) da descrivere come non ancora operative.
- **Registrazione e account:**  
  Obbligo di fornire dati veritieri; divieto di account multipli abusivi; responsabilità della custodia delle credenziali.
- **Uso lecito:**  
  Divieto di uso per scopi illeciti, violazione di diritti di terzi, invio di contenuti illeciti o dannosi; possibilità di sospensione/chiusura account in caso di violazione.
- **Proprietà intellettuale:**  
  Marchi, contenuti e materiale dell’app di proprietà del fornitore (o concessi in licenza); nessuna cessione di diritti all’utente oltre alla licenza d’uso.
- **Limitazione di responsabilità:**  
  Servizio fornito “as is” nei limiti di legge; esclusione o limitazione di responsabilità per danni indiretti, perdita di dati, dipendenza dalle risposte dell’IA, comportamento di terzi (Firebase, OpenAI, ecc.); obblighi inderogabili del consumatore ove applicabile.
- **Abbonamento e pagamenti:**  
  Riferimento ad abbonamento e/o acquisto in-app; condizioni di rinnovo, disdetta e rimborso secondo policy Apple/Google e normativa consumer; dove si acquista (Apple/Google) e che i pagamenti sono gestiti da loro.
- **Modifiche al servizio e ai termini:**  
  Possibilità di modificare termini e servizio con preavviso; comunicazione in-app o via email; uso continuato dopo le modifiche come accettazione (salvo diritto di recesso ove previsto).
- **Recesso e risoluzione:**  
  Diritto dell’utente di cessare l’uso e cancellare l’account; diritto del fornitore di sospendere o chiudere l’account in caso di violazioni.
- **Legge applicabile e foro:**  
  Legge italiana (e normativa UE applicabile); foro competente (es. tribunale del consumatore per utenti consumer; luogo dove ha sede il fornitore). Il legale indicherà la clausola precisa.

---

## 11. Dove inserire i testi nell’app

- I testi definitivi andranno inseriti in:
  - **App:** file `src/content/legalContent.js` (costanti `PRIVACY_POLICY_PLACEHOLDER` e `TERMINI_SERVIZIO_PLACEHOLDER` sostituite con il testo approvato). Tali testi sono mostrati nelle schermate “Privacy policy” e “Termini di servizio” raggiungibili dal menu dell’app.
  - **Documentazione/archivio:** i file `docs/PRIVACY_POLICY.md` e `docs/TERMINI_SERVIZIO.md` possono essere aggiornati con la versione definitiva per riferimento e, se necessario, per pubblicazione su sito web o link negli store.
- Si consiglia di mantenere una **versione datata** (es. “Ultimo aggiornamento: gg/mm/aaaa”) in calce a entrambi i documenti e di indicare in privacy policy dove l’utente può trovare la versione aggiornata (in-app e/o URL).

---

## 12. Checklist per il legale

- [ ] Titolare del trattamento: ragione sociale, sede legale, P.IVA, contatti (email, PEC), eventuale DPO.
- [ ] Privacy policy: tutte le informazioni richieste dal GDPR (art. 13 o 14), in linguaggio chiaro; destinatari e trasferimenti extra-UE; conservazione; diritti; reclamo; minori (se applicabile).
- [ ] Termini di servizio: accettazione, descrizione servizio, account, uso lecito, proprietà intellettuale, limitazione responsabilità, abbonamento/pagamenti, modifiche, recesso, legge e foro.
- [ ] Allineamento con policy Apple e Google (dove richiesto per app e acquisti in-app).
- [ ] Indicazione “Ultimo aggiornamento” e canale di comunicazione per modifiche (in-app, email, link).

---

## 13. Note operative per il cliente

- **Dopo la redazione:**  
  Il cliente fornirà al sviluppatore i testi definitivi (Privacy policy e Termini di servizio) approvati dall’avvocato; il sviluppatore li inserirà in `src/content/legalContent.js` e aggiornerà eventualmente i file in `docs/`.
- **Revisioni future:**  
  In caso di cambiamenti del servizio (nuovi dati, nuovi fornitori, nuovi paesi) o di obblighi di legge, si consiglia di far rivedere i documenti dal legale e aggiornare la data “Ultimo aggiornamento” e la versione in app.

---

*Documento predisposto a supporto della redazione dei documenti legali per l’app OXY Real. Le qualificazioni giuridiche (titolare, responsabile, contitolare, base giuridica, trasferimenti) sono da confermare e adattare dall’avvocato in base alla struttura effettiva del cliente e alle scelte di compliance.*
