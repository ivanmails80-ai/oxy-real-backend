# Valutazione go-live — Funzionalità presenti nell’app

**Obiettivo:** chiarire cosa serve per il **buon funzionamento** in produzione e cosa è **funzionalità utente** eventualmente rimandabile; cosa è “non attivo” e andrebbe **nascosto** in vista del go-live.

---

## 1. Cosa è già “per il buon funzionamento” (necessario al go-live)

| Elemento | Stato | Note |
|----------|--------|------|
| **Backend URL** | OK | C’è fallback `DEFAULT_BACKEND_URL` (Render). Per produzione è meglio impostare `EXPO_PUBLIC_BACKEND_URL` in build. |
| **Firebase Auth** | OK | Login email/password, recupero password. Richiede `.env` con `EXPO_PUBLIC_FIREBASE_*`. |
| **Chat + cronologia** | OK | Passano dal backend (proxy, persistenza). Funzionano se backend è raggiungibile. |
| **Memory Vault, profilo** | OK | Backend + Firestore. |
| **Privacy / Termini** | OK | Contenuti in `legalContent.js`; voci menu sempre visibili (obbligatorie per store/GDPR). |
| **Banner offline** | OK | Già gestito. |
| **Consenso (consent)** | OK | Se `EXPO_PUBLIC_BACKEND_URL` non c’è, il check consenso non parte; con backend OK funziona. |

Nessuna modifica obbligatoria qui per “far funzionare” l’app: sono già coperte a livello codice.

---

## 2. Login social (Google, Apple, Microsoft)

- **Comportamento attuale:** i tre pulsanti sono **sempre visibili**; se il provider non è configurato il pulsante è **disabilitato** (grigio) e al tap mostra messaggi tipo “disponibile dal prossimo aggiornamento” (o `googleAndroidNeeded` su APK senza client Android).
- **Per go-live:**
  - **Opzione A (consigliata):** **Nascondere** i pulsanti dei provider non configurati. L’utente vede solo “Continua con Google” (o Apple/Microsoft) se quel provider è attivo; niente pulsanti grigi né messaggi “dal prossimo aggiornamento”.
  - **Opzione B:** Lasciare tutto com’è (pulsanti sempre visibili, disabilitati se non configurati).

Se scegli **Opzione A**, in fase go-live si può:
- mostrare solo **Email + eventualmente Google** (se Google è configurato);
- non mostrare Apple su Android e Microsoft se non configurati.

**Riepilogo:** non è un blocco al funzionamento; è una scelta UX: nascondere (A) o tenere visibili ma disabilitati (B) i provider non attivi.

---

## 3. Abbonamento e pagamenti (Stripe)

- **Comportamento attuale:** in menu Impostazioni c’è sempre la voce **“Abbonamento e pagamenti”**. La schermata mostra piani (OXY Pass, Lifetime), stato abbonamento da backend (`/api/billing/status`) e CTA per checkout (`/api/billing/checkout`). Se il backend non ha Stripe configurato o risponde con errore, l’utente vede “Nessun piano attivo” e al tap su “Sottoscrivi” può ricevere un errore dal backend.
- **Per go-live:**
  - Se **non** vendi abbonamento subito: si può **nascondere** la voce “Abbonamento e pagamenti” (e la relativa schermata) tramite una variabile tipo `EXPO_PUBLIC_BILLING_ENABLED=false`. Così in app non compare nulla che inviti a pagare finché Stripe non è pronto.
  - Se **sì** vendi abbonamento: lasci visibile; backend e Stripe vanno configurati (GO_LIVE.md, §2.5).

**Riepilogo:** funzionalità utente (monetizzazione). Può essere rimandata dopo go-live **nascostando** la voce menu; oppure tenuta visibile se i pagamenti sono pronti.

---

## 4. Oxy Key (modalità one_time_purchase)

- **Comportamento attuale:** la sezione **“Oxy Key”** nel menu (e il flusso “Inserisci Oxy Key”) è visibile **solo** se `EXPO_PUBLIC_APP_MODE=one_time_purchase`. Con `subscription` (default) non compare.
- **Per go-live:** se vai in produzione in modalità **subscription** (default), non c’è nulla da fare: Oxy Key resta nascosta. Se invece lanci in modalità **one_time_purchase**, gli utenti devono poter inserire la chiave; la logica c’è già.

**Riepilogo:** già pilotata da `APP_MODE`. Nessun cambiamento necessario per go-live in subscription.

---

## 5. Funzionalità “roadmap” (Diario, Storie, Community, Chat di gruppo)

- **Comportamento attuale:**
  - **Diario** e **Storie**: flag iniziali `true` in App.js; azioni in menu “Azioni” e relative modal sono visibili.
  - **Community**: flag iniziale `true` in App.js (in `featureFlagsService.js` il default è `false`; può essere sovrascritto da backend/AsyncStorage).
  - **Chat di gruppo**: flag `groupChat: false` → voce menu “Crea Chat di Gruppo” **nascosta**.

Se Diario/Storie/Community non sono considerati “pronti” o non volete esporli al go-live, si possono **disattivare** i relativi flag (in App.js stato iniziale o tramite backend/featureFlagsService) e le voci/azioni spariscono.

**Riepilogo:** funzionalità utente. Si possono rimandare dopo go-live **disattivando** i flag (Diario, Storie, Community) così non compaiono in menu/Azioni.

---

## 6. “Proprietario (test)” nel menu

- **Comportamento attuale:** la sezione **“Proprietario (test)”** con “Attiva Elite (test)” è visibile **solo** per l’utente Master (`isMasterUser`).
- **Per go-live:** è già nascosta ai normali utenti. Se vuoi nasconderla anche al Master in produzione, si può aggiungere un check su una variabile tipo `EXPO_PUBLIC_HIDE_MASTER_TEST=true` in build produzione.

**Riepilogo:** opzionale; utile in sviluppo, può essere nascosta in produzione con un flag.

---

## 7. Riepilogo decisioni possibili (da valutare insieme)

| Tema | Scelta possibile | Effetto |
|------|-------------------|--------|
| **Login social** | Nascondere provider non configurati | Solo Email + i provider attivi (es. solo Google se configurato). Niente pulsanti grigi. |
| **Abbonamento** | Nascondere se Stripe non pronto | Niente voce “Abbonamento e pagamenti” in menu fino a quando non abiliti i pagamenti. |
| **Diario / Storie / Community** | Disattivare flag se non pronti | Niente azioni “Diario”, “Storie”, “Community” in menu Azioni (e relative modal). |
| **Proprietario (test)** | Nascondere in build produzione | Nessuna sezione “Attiva Elite (test)” neanche per Master. |

---

## 8. Cosa non va toccato per il “buon funzionamento”

- Backend URL, Firebase, Auth email/password, recupero password.
- Chat, cronologia, Memory Vault, profilo.
- Privacy policy e Termini (devono restare accessibili).
- Gestione offline e messaggi di errore già presenti.

Queste parti sono già coerenti con il go-live; eventuali interventi sono solo configurazione (`.env`, backend, Stripe), non “funzionalità da attivare” in codice.

---

## 9. Prossimo passo

Dopo aver letto questa valutazione, indica:

1. **Login social:** preferisci **nascondere** i provider non configurati (solo Email + quelli attivi) oppure **lasciare** i tre pulsanti sempre visibili (disabilitati se non configurati)?
2. **Abbonamento:** al go-live Stripe sarà configurato? Se no, vuoi **nascondere** la voce “Abbonamento e pagamenti” (con flag tipo `EXPO_PUBLIC_BILLING_ENABLED`)?
3. **Diario / Storie / Community:** vanno **mostrati** al go-live o **nascosti** (disattivando i flag)?
4. **Proprietario (test):** va **nascosto** in produzione (solo build release) o lasciato visibile al Master?

In base alle tue risposte si possono applicare solo le modifiche concordate (nascosto/visibile) senza toccare il resto.
