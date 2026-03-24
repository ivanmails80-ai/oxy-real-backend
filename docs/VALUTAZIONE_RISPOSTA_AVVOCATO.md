# Valutazione risposta dell'avvocato — OXY Real™

**Data:** 3 marzo 2026  
**Riferimento:** Documentazione tecnica e legale inviata dall'avvocato (Termini, Privacy, UI, requisiti tecnici).

Questo documento confronta quanto richiesto (DOCUMENTI_LEGALI_DA_INVIARE_AVVOCATO.md) con la risposta dell'avvocato e indica **cosa va bene**, **cosa manca** e **cosa chiedere in integrazione**.

---

## 1. Cosa va bene (OK per implementazione)

| Punto | Parere avvocato | Stato |
|-------|------------------|--------|
| **Titolare e fornitore** | Art. 1 Termini: SecondSelf, Legnano, registrazione = accettazione contratto | ✅ Ok, si può sostituire il testo attuale |
| **Età e minori** | Limite 14 anni; minori 14–17 solo con consenso genitori ove richiesto; **Acquisti da minori** = si intendono autorizzati da chi ha responsabilità genitoriale | ✅ Ottimo: la clausola acquisti minori era tra le cose da far prevedere |
| **Disclaimer AI** | Natura statistica, no consulenza, **Emergenze: contattare servizi di emergenza, non fare affidamento sull'IA** | ✅ Bene: aggiunta utile (non c’era prima) |
| **Lifetime** | "Denominazione commerciale", "pro tempore", "ciclo di vita commerciale del software", "non implica durata illimitata in caso di cessazione attività" | ✅ Ottimo: chiarisce il rischio legale del termine "Lifetime" |
| **Proprietà intellettuale** | Licenza limitata, divieti (copia, reverse, uso marchio), perseguibilità | ✅ Ok |
| **Privacy – Titolare e trattamento** | SecondSelf, oxy@oxyreal.it; dati per contratto e obblighi di legge | ✅ Ok |
| **Privacy – Documenti/Email** | Estrazione su comando utente; invio via app o server; verifica destinatario da parte utente | ✅ Ok |
| **Privacy – Trasferimento extra-UE** | Fornitori AI (USA), SCC, GDPR | ✅ Ok |
| **Checkbox (LEG_TERMS, LEG_PRIVACY, LEG_MINOR, LEG_MARKETING, LEG_DOCS)** | Testi chiari; LEG_MINOR condizionale 14–17 | ✅ Ok: allineati alla logica già in app |
| **Storage** | expo-secure-store per token e preferenze consenso | ✅ **Già in uso** in app per sessione e Oxy Key (authService, oxyKeyService) |
| **Feedback validazione** | expo-haptics per errori consensi | ✅ **Già in uso** in AuthScreen (Haptics.impactAsync su errori e tap checkbox) |
| **Autenticazione** | "Sostituire simulazioni con chiamate reali a backend (Firebase/Supabase)" | ✅ **Già fatto**: l’app usa **Firebase Auth** (email/password + Google), non simulazioni |

---

## 2. Cosa manca (rispetto alle 10 richieste che avevamo fatto)

Questi punti erano nella lista "Cosa chiedere all'avvocato di prevedere"; nella risposta **non compaiono** o sono solo parziali. Conviene **chiedere all’avvocato un’integrazione** (o conferma che non servono).

| # | Richiesta originale | Stato nella risposta | Cosa chiedere all’avvocato |
|---|----------------------|----------------------|----------------------------|
| **5** | **Legge applicabile e Foro competente** | ❌ Assente | Aggiungere un articolo (es. Art. 6): legge italiana, Foro di Milano, salvo foro inderogabile a tutela del consumatore. |
| **3** | **Recesso e rimborsi** | ⚠️ Parziale: c’è solo "disdetta 24h prima della scadenza" per il rinnovo | Chiedere se va esplicitato: (a) diritto di recesso 14 gg (consumatori) ove applicabile; (b) che i rimborsi sono regolati da Store/Stripe. |
| **7** | **Diritti dell’interessato (GDPR)** | ⚠️ Parziale: l’avvocato cita solo accesso, rettifica, cancellazione, dati fiscali 10 anni | Il GDPR richiede anche: **limitazione** del trattamento, **portabilità**, **opposizione**, **reclamo al Garante**. Chiedere di inserirli in Privacy (Art. 4 o nuovo articolo) per completezza. |
| **10** | **Modifiche ai Termini/Privacy** | ❌ Assente | Chiedere una clausola tipo: "Il Titolare può modificare Termini e Privacy; le modifiche saranno comunicate in app (o via email); la prosecuzione dell’uso dopo la decorrenza costituisce accettazione; in caso di modifica sostanziale, diritto di recesso con cancellazione account." |
| **9** | **Store (Apple/Google)** | ❌ Non esplicitato | Chiedere se va aggiunto un richiamo: "L’uso dell’app è soggetto anche alle regole delle piattaforme (App Store, Google Play) attraverso cui l’app è distribuita." |

**Riepilogo “cosa manca”:**  
- **Termini:** Legge italiana + Foro di Milano; eventuale recesso 14 gg / rimborsi; modifiche ai documenti; richiamo condizioni Store.  
- **Privacy:** Diritti completi GDPR (limitazione, portabilità, opposizione, reclamo Garante); eventuale clausola modifiche.

---

## 3. Requisito tecnico: cancellazione account

L’avvocato scrive:

> *"La funzione di cancellazione account deve inviare un comando al backend per l'eliminazione definitiva di tutti i dati associati nel Vault e nelle Chat."*

**Stato attuale:**

- In **backend** esiste uno script/endpoint **solo per amministratori** (`/api/admin/delete-user-data` e `scripts/delete-user-data.mjs`) che elimina l’utente da Firebase Auth e tutti i dati (chat, billing, memoria, diario, ecc.).
- **Nell’app** non c’è un flusso utente "Elimina il mio account" che chiami il backend per cancellare l’account di chi ha fatto login.

Quindi oggi la cancellazione è possibile solo **a richiesta** (es. email a oxy@oxyreal.it) e gestita manualmente lato server. Per adeguarsi alla richiesta dell’avvocato si può:

- **Opzione A:** Aggiungere in app un pulsante "Elimina account" (es. in Impostazioni) che chiama un endpoint tipo `POST /api/me/delete-account` (protetto da token), il quale elimina l’utente corrente e tutti i suoi dati (Vault, chat, ecc.) e poi fa logout.  
- **Opzione B:** Lasciare la cancellazione solo su richiesta (email) e documentare in Privacy che "può richiedere la cancellazione scrivendo a oxy@oxyreal.it" e che il Titolare provvede entro X giorni. L’avvocato ha comunque chiesto che "la funzione" invii un comando al backend: se si sceglie Opzione B, va chiarito con lui che per ora la cancellazione è solo su richiesta email e che il backend è già predisposto (script/admin).

**Suggerimento:** Implementare l’Opzione A (endpoint utente + pulsante in app) per allinearsi in modo esplicito alla richiesta dell’avvocato.

---

## 4. Dove sono già soddisfatti i requisiti tecnici

| Requisito avvocato | Stato in app |
|--------------------|--------------|
| **expo-secure-store** per token e preferenze | ✅ Token di sessione e Oxy Key già in SecureStore (`authService.js`, `oxyKeyService.js`). Le preferenze di consenso (checkbox) sono solo in stato React alla registrazione; i consensi accettati possono essere salvati in backend al momento della registrazione. Se l’avvocato intende "preferenze di consenso" come dato da proteggere in SecureStore, si può valutare di salvare un flag lato client in SecureStore dopo la registrazione (opzionale). |
| **expo-haptics** per errori validazione consensi | ✅ Già usato in AuthScreen (errori, tap su checkbox, ecc.). |
| **Autenticazione reale (Firebase/Supabase)** | ✅ Firebase Auth in uso (email/password + Google); nessuna simulazione OTP/password. |
| **Cancellazione account → backend** | ⚠️ Vedi paragrafo 3 sopra: da implementare flusso utente + endpoint, oppure da chiarire con l’avvocato la procedura "solo su richiesta email". |

---

## 5. Testi checkbox: confronto con l’app

L’avvocato propone:

- **LEG_TERMS:** "Accetto i Termini di Servizio e dichiaro di avere almeno 14 anni."
- **LEG_PRIVACY:** "Ho letto l'Informativa Privacy e acconsento al trattamento dei dati personali per l'erogazione del servizio."
- **LEG_MINOR:** "Confermo di aver informato i miei genitori e di aver ottenuto il loro consenso all'uso del servizio."
- **LEG_MARKETING:** "Acconsento a ricevere comunicazioni su aggiornamenti e novità di OXY Real™."
- **LEG_DOCS:** "Comprendo che l'invio di documenti via email avviene su mia esplicita richiesta e responsabilità."

Sono **equivalenti** per sostanza a quelli attuali; le formule dell’avvocato sono leggermente più stringate. Si possono **sostituire** i testi in `legalContent.js` e in `src/i18n/translations.js` con questi (mantenendo LEG_MINOR obbligatorio solo per 14–17 anni).

---

## 6. Riepilogo: cosa fare

1. **Implementare i testi dell’avvocato** in `legalContent.js` (Termini e Privacy come da suo schema) e aggiornare le stringhe delle checkbox in `translations.js` con LEG_*.
2. **Chiedere all’avvocato un’integrazione scritta** per:
   - **Legge applicabile e Foro competente** (legge italiana, Foro di Milano, eccezione consumatore).
   - **Diritti GDPR completi** in Privacy (limitazione, portabilità, opposizione, reclamo al Garante).
   - **Modifiche ai Termini/Privacy** (comunicazione, decorrenza, diritto di recesso in caso di modifica sostanziale).
   - (Opzionale) Recesso 14 gg / rimborsi e richiamo condizioni Store, se li ritiene necessari.
3. **Cancellazione account:** implementare endpoint utente + pulsante "Elimina account" che chiama il backend per eliminazione definitiva (o, in alternativa, documentare la procedura "solo su richiesta email" e confermare con l’avvocato che sia sufficiente).

Dopo aver ricevuto le integrazioni dall’avvocato, si potranno aggiornare nuovamente Termini e Privacy in `legalContent.js` senza cambiare la struttura già predisposta.

---

*Documento redatto per supportare il proprietario nel confronto con l’avvocato e nell’implementazione tecnica.*
