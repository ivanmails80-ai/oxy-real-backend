# OXY Real — Manutenzione e rischi (per avere un’app funzionante)

**Per chi non scrive codice:** questo documento spiega come restare con un’app funzionante e quali dinamiche possono farla andare in errore. L’esperto (sviluppatore o AI) deve rispettarlo e anticipare i problemi.

---

## 1. Ruoli in sintesi

| Ruolo | Cosa fa |
|-------|--------|
| **Tu (proprietario / product)** | Decidi funzionalità, testi, flussi utente, beta tester, rilascio. Non tocchi codice o file di configurazione sensibili. |
| **Esperto (dev / AI)** | Scrive e modifica codice, previene malfunzionamenti, segue questo documento e le regole in `.cursor/rules/`. |

L’esperto deve **metterti in condizione** di avere un’app funzionante e **prevedere** le dinamiche che porterebbero al malfunzionamento.

**Flusso dell’app (ordine dei passi e conseguenze):** è descritto in **`docs/FLUSSO_APP.md`** (lingua → iscrizione → Abbonamento/Lifetime → pagamento → chat). L’esperto segue quel documento. Se serve una scelta di prodotto sul flusso (es. “dopo il login mostriamo anche X?”), l’esperto **ti chiede** cosa preferisci invece di decidere da solo.

**Cose che potresti non aver previsto** (legali, store, minori, dati): vedi **`docs/COSA_POTRESTI_NON_AVER_PREVISTO.md`** per una checklist pensata per chi non è del settore.

---

## 2. Cose che non devi toccare (se non sei esperto)

- File **`.env`** (contiene chiavi e URL segreti).
- Cartella **`backend/`** (logica server, auth, billing) se non ti è stato detto cosa modificare.
- **`google-services.json`**, **`app.json`** (package, versioni, id app).
- File in **`android/`** e **`ios/`** (build nativi), a meno di istruzioni precise.
- **Chiavi API** (OpenAI, Stripe, Firebase, Tavily): solo l’esperto le gestisce e non le espone nell’app.

Se devi cambiare testi per l’utente (lingua, messaggi, menu), l’esperto ti indica **dove** farlo (es. file traduzioni, contenuti legali) in modo sicuro.

---

## 3. Dinamiche che possono far malfunzionare l’app

L’esperto deve **prevedere e evitare** queste situazioni.

### 3.1 Primo avvio e lingua

- **Rischio:** La scelta lingua al primo avvio deve apparire **solo una volta** (dopo il download). Se qualcuno cancella o sovrascrive il flag `HAS_CHOSEN_LANGUAGE_AT_STARTUP` in modo sbagliato, la schermata lingua può riapparire ogni volta o sparire per sempre.
- **Cosa fare:** Non resettare quel flag se non c’è un flusso esplicito (es. “reimposta app”). La modifica della lingua dopo il primo avvio resta solo nel Menu → Impostazioni.

### 3.2 Login e chat

- **Rischio:** Utente registrato che non ha fatto logout deve andare **sempre direttamente in chat**. Se la logica di `isLogged` o di persistenza (AsyncStorage / Firebase Auth) viene alterata, l’utente può vedersi login ogni volta o perdere l’accesso.
- **Cosa fare:** Non cambiare la logica di `onAuthStateChanged`, di salvataggio di `USER_DATA` / `IS_LOGGED_IN` e di dove si decide se mostrare AuthScreen o la chat, senza verificare tutto il flusso (primo avvio → lingua → login → chat).

### 3.3 Backend e rete

- **Rischio:** Se il backend (es. Render) è spento, non raggiungibile o con variabili d’ambiente sbagliate, chat, Memory Vault, Diario e billing non funzionano.
- **Cosa fare:** L’app deve gestire offline e errori di rete (messaggi chiari, nessun crash). L’esperto non deve rimuovere i controlli di rete (es. `useNetInfo`) o i fallback. Prima di cambiare URL del backend o env, verificare che l’app punti al server giusto.

### 3.4 Dipendenze e build

- **Rischio:** Aggiornare a caso pacchetti npm (`expo`, `react-native`, Firebase, ecc.) può rompere la build o il runtime (crash, errori Gradle, incompatibilità).
- **Cosa fare:** Aggiornamenti solo con test (avvio app, login, chat, una funzione critica). Tenere una versione funzionante (es. tag Git) prima di aggiornare. Per la build APK, seguire **COME_CREARE_APK_E_INSTALLARLA.md** e **GO_LIVE.md**.

### 3.5 Contenuti e legal

- **Rischio:** Testi legali (Privacy, Termini, Abbonamento) o dati di contatto sbagliati espongono a problemi legali e confusione utente.
- **Cosa fare:** Aggiornare i contenuti in `src/content/legalContent.js` (o dove indicato) con dati reali e coerenti. Non lasciare placeholder (“esempio@email.com”) in produzione.

### 3.6 Diario e Memory Vault con Oxy

- **Rischio:** Se il backend non riceve o non legge diario e memoria, Oxy risponde “non posso leggere”.
- **Cosa fare:** Non toccare senza motivo le chiamate che salvano/caricano diario e memoria (`/api/diary`, `/api/memory`) e il modo in cui il backend inietta questi dati nel system prompt della chat. Verificare dopo ogni modifica lato backend che Oxy “veda” ancora diario e note.

### 3.7 Abbonamenti e pagamenti

- **Rischio:** Webhook Stripe o logica di billing sbagliata possono dare accesso sbagliato (utente pagante bloccato o utente non pagante con accesso).
- **Cosa fare:** Ogni modifica a `backend` su billing o webhook va testata (anche in test mode). Non cambiare gli endpoint o la lettura dello stato abbonamento senza verificare l’app (menu, limiti, chat).

---

## 4. Cosa fare tu per tenere l’app funzionante

1. **Test dopo ogni cambiamento**  
   Se l’esperto (o tu con sua guida) modifica qualcosa, testare: avvio app → scelta lingua (solo al primo avvio) → login/registrazione → chat → menu → una funzione sensibile (es. Memory Vault, Diario, impostazioni).

2. **Non cancellare o rinominare file critici**  
   Se non sei sicuro, chiedi: “Se modifico/cancello X, l’app può smettere di funzionare?”.

3. **Backup e versioni**  
   Prima di grandi cambi o prima di andare in produzione, fare un backup del progetto (o un tag/commit) così si può tornare indietro.

4. **Un solo riferimento per il rilascio**  
   Per build, store e go-live usa **GO_LIVE.md** come unico riferimento; l’esperto deve allinearsi a quello.

---

## 5. Cosa deve fare l’esperto (AI / sviluppatore)

- Leggere questo documento e le regole in **`.cursor/rules/`** prima di modifiche importanti.
- **Prevedere** le conseguenze di ogni modifica (avvio, login, chat, backend, build).
- **Non** introdurre dipendenze o cambi di configurazione senza verificare che l’app parta e che i flussi critici funzionino.
- **Documentare** in modo breve dove ha toccato codice sensibile (avvio, auth, billing, diario/memoria) quando è rilevante per il prodotto.
- In caso di dubbio, **chiedere** (“vuoi che cambi anche X?”) invece di assumere.

---

*Ultimo aggiornamento: febbraio 2026. Da aggiornare quando si aggiungono nuove funzionalità o nuovi rischi noti.*
