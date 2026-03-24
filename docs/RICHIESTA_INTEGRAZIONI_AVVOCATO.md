# Richiesta integrazioni alla documentazione legale OXY Real™

**Destinatario:** Studio legale / Avvocato  
**Data:** 3 marzo 2026  
**Riferimento:** Documentazione tecnica e legale inviata in data 3 marzo 2026 (Termini, Privacy, UI, requisiti tecnici)

---

Gentile Avvocato,

La ringraziamo per la documentazione fornita. Abbiamo verificato i testi e procederemo all’implementazione nei file indicati (Termini e Privacy in `legalContent.js`, stringhe checkbox in `translations.js`).

Le chiediamo di integrare per iscritto i seguenti punti, che nella versione attuale non risultano presenti o completi, in modo da poter aggiornare l’app in modo definitivo.

---

## 1. Termini di Servizio

**1.1 Legge applicabile e Foro competente**  
Manca un articolo che indichi espressamente la legge applicabile e il foro competente. La preghiamo di fornire il testo di un articolo (es. Art. 6) che stabilisca:
- applicazione della **legge italiana**;
- **Foro di Milano** competente per le controversie;
- salvo i casi in cui la legge preveda un **foro inderogabile a tutela del consumatore**.

**1.2 Modifiche ai Termini e alla Privacy**  
Manca una clausola che regoli come il Titolare possa modificare Termini di Servizio e Informativa sulla Privacy. La preghiamo di fornire un testo che preveda:
- comunicazione delle modifiche all’utente (es. in app e/o via email);
- decorrenza delle modifiche;
- prosecuzione dell’uso del servizio dopo la decorrenza come accettazione;
- diritto dell’utente di **recedere** (e chiedere la cancellazione dell’account) in caso di **modifica sostanziale** che non accetti.

**1.3 Condizioni delle piattaforme di distribuzione**  
Se lo ritiene opportuno, un richiamo esplicito al fatto che l’utilizzo dell’app è soggetto anche alle **regole e condizioni d’uso delle piattaforme** attraverso cui l’app è distribuita (Apple App Store, Google Play Store), che l’utente accetta di rispettare.

**1.4 Recesso e rimborsi (opzionale)**  
Se lo ritiene necessario per completezza, una clausola che richiami:
- il **diritto di recesso** (14 giorni) per i consumatori, ove applicabile;
- il fatto che **rimborsi** e modalità di disdetta degli abbonamenti sono regolati dalle piattaforme di pagamento (Store, Stripe) e dai relativi termini.

---

## 2. Informativa sulla Privacy (GDPR)

**2.1 Diritti dell’interessato (completezza)**  
Nell’Art. 4 sono attualmente indicati i diritti di accesso, rettifica e cancellazione totale (“diritto all’oblio”), oltre alla conservazione dei dati fiscali per 10 anni.  
Ai sensi del Regolamento (UE) 2016/679, la preghiamo di integrare l’elenco con i seguenti diritti, ove applicabili al nostro trattamento:
- **limitazione del trattamento**;
- **portabilità dei dati**;
- **opposizione** al trattamento;
- **reclamo** all’Autorità Garante per la Protezione dei Dati Personali (o all’autorità competente nello Stato di residenza).

Eventualmente può anche indicare un **termine di risposta** (es. 30 giorni) per le richieste esercitate scrivendo a oxy@oxyreal.it.

---

## 3. Conferma tecnica (solo per sua informazione)

Per completezza Le segnaliamo che:
- **expo-secure-store** e **expo-haptics** sono già in uso nell’app (token, chiavi, feedback validazione);
- l’autenticazione è gestita con **Firebase** (nessuna simulazione);
- stiamo implementando la **cancellazione account** da app: l’utente potrà richiedere l’eliminazione definitiva di tutti i dati (account, Vault, chat) tramite un comando inviato al backend, come da Sua indicazione.

Restiamo a disposizione per eventuali chiarimenti.

Cordiali saluti,

**[Nome / SecondSelf di Ivan Lopez]**  
oxy@oxyreal.it
