# OXY Real — Checklist definitiva per andare online e al mercato

**Obiettivo:** snellire le cose da fare. Qui trovi cosa è già stato fatto (o preparato) e cosa resta **solo a te**.

*Ultimo aggiornamento: febbraio 2025.*

---

# PARTE 1 — Fatto da Sam / da accettare

Queste voci sono già coperte in codice o documentazione. **Tu non devi fare nulla**, salvo accettare le modifiche (o adattare i testi dove indicato).

## Sicurezza e infrastruttura
- [x] Chiavi OpenAI/Tavily solo sul backend; cronologia chat e memoria (inclusi clear e tool IA) persistite.
- [x] Profilo utente esteso su Firestore (`profileService`); recupero password; timeout IA (90 s); Error Boundary; limite messaggio 4000 caratteri; banner offline; errore IA non salvato in cronologia.
- [x] **README:** sezione "Build produzione (EAS)" con indicazioni su quali variabili **non** mettere in build (OXY_AI_KEY, TAVILY) e quali sì (BACKEND_URL, Firebase).
- [x] **RELEASE_CHECKLIST:** richiamo a README per build; nota su versioni (app.json + link EAS versioning).

## Contenuti legali (preparazione)
- [x] **legalContent.js:** in cima al file blocco "PRIMA DEL LANCIO"; nella Privacy il titolare è sostituito con placeholder chiari: **[SOSTITUIRE CON NOME O RAGIONE SOCIALE]** e **[SOSTITUIRE CON EMAIL CONTATTO]**. Tu: cerca questi testi in `src/content/legalContent.js` e sostituisci con i dati reali; opzionale revisione legale.

## Riferimento unico
- [x] **README** punta a questa checklist come "Lista unica pre-lancio" (rimosso riferimento a COSA_MANCA_PER_IL_LANCIO per evitare duplicati).

## Completato da Sam in questa sessione (autonomo)
- [x] **.gitignore:** aggiunto `backend/.env` così non venga mai committato.
- [x] **.env.example (root):** prima riga con avviso "Build produzione: NON aggiungere EXPO_PUBLIC_OXY_AI_KEY né EXPO_PUBLIC_TAVILY_API_KEY".
- [x] **backend/.env.example:** commento su `FIREBASE_SERVICE_ACCOUNT_JSON` per deploy senza file su disco.
- [x] **legalContent.js:** nella sezione "Titolare del Trattamento" i vecchi "XXXXX" sostituiti con **[SOSTITUIRE CON NOME O RAGIONE SOCIALE]** e **[SOSTITUIRE CON EMAIL CONTATTO]** (così in app si vede chiaramente cosa va compilato).

---

# PARTE 2 — Da fare tu

Solo azioni che richiedono **te**: account, deploy, testi definitivi, configurazione esterna, invio agli store.

## 2.1 Contenuti legali (obbligatorio per store e GDPR)
- [ ] In `src/content/legalContent.js`: cercare **[SOSTITUIRE CON NOME O RAGIONE SOCIALE]** e **[SOSTITUIRE CON EMAIL CONTATTO]** e sostituirli con nome/ragione sociale del Titolare e email di contatto.
- [ ] (Consigliato) Far redigere o approvare Privacy e Termini da un legale; aggiornare le sezioni in `legalContent.js` se necessario.
- [ ] Quando hai prezzi e link: aggiornare la sezione **subscription** in `legalContent.js` con link reali (Stripe, App Store, Google Play).

## 2.2 Backend e ambiente
- [ ] **Deploy del backend** su un hosting (VPS, Railway, Render, Fly.io, ecc.) con URL pubblico stabile.
- [ ] Sul server: configurare **Firebase Admin** (`GOOGLE_APPLICATION_CREDENTIALS` o `FIREBASE_SERVICE_ACCOUNT_JSON`) per la verifica token.
- [ ] Nella build EAS di produzione: impostare **EXPO_PUBLIC_BACKEND_URL** (e Firebase, eventuale MASTER_EMAIL per sviluppo). **Non** aggiungere OXY_AI_KEY né TAVILY_API_KEY nel client (vedi README).

## 2.3 Firebase Console
- [ ] **Domini autorizzati** per Auth (e link dinamici se usati).
- [ ] **Android:** `google-services.json` nel progetto; SHA-1 configurato (per Google Sign-In se lo usi).
- [ ] **iOS:** configurazione Apple e, se usi Sign in with Apple, certificati/Service ID.

## 2.4 Login social (se li mostri in app)
- [ ] **Google:** Firebase Sign-in method Google abilitato; `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in .env / segreti EAS; development build; su Android `google-services.json` e SHA-1.
- [ ] **Apple:** Firebase provider Apple abilitato; su iOS certificati/Service ID per Sign in with Apple.

## 2.5 Pagamenti e abbonamento (solo se vendi abbonamento)
- [ ] Scegliere e configurare un **sistema di pagamento** (Stripe, RevenueCat, IAP Apple/Google).
- [ ] **Backend:** far verificare lo stato abbonamento (webhook o API) e riconoscere l’utente come “Master”/abbonato solo se pagamento attivo (non solo email in .env).
- [ ] Aggiornare la pagina Abbonamento in app con prezzi e link reali (anche in `legalContent.js`).

## 2.6 Oscuramento del codice (prima della vendita)
- [ ] **Obiettivo:** il codice dell’app deve essere reso indecifrabile prima della messa in vendita; nessuno deve poter leggere o decifrare la logica in chiaro.
- [ ] Applicare **obfuscazione** al bundle JavaScript (es. strumenti tipo javascript-obfuscator o transformer Metro; vedi `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md`).
- [ ] **Android:** verificare che ProGuard/R8 sia attivo per il codice nativo (EAS/Expo di solito lo gestiscono in release).
- [ ] **iOS:** build release già compilata; eventuale offuscamento simboli se necessario.
- [ ] Testare una build di produzione dopo l’obfuscazione per evitare crash o comportamenti strani.

## 2.7 Build e store
- [ ] **Versioni:** prima di ogni invio, aggiornare `expo.version` in `app.json` (e, se usi, versionCode/buildNumber; vedi RELEASE_CHECKLIST).
- [ ] **EAS Build:** account EAS configurato; `npx eas build --platform android` e/o `ios`.
- [ ] **EAS Submit:** credenziali Google Play / Apple Developer; `npx eas submit --platform android --latest` (e iOS se applicabile).

## 2.8 Test pre-release
- [ ] Su **dispositivo reale**: login (email, recupero password, eventualmente Google/Apple), chat, cronologia, Memory Vault, Power Badges, menu (Privacy, Termini, Abbonamento, Impostazioni, Cloud, logout).
- [ ] Verificare che con **rete assente** compaia il banner "Sei offline" e messaggio chiaro in caso di errore server.

---

# Riepilogo veloce

| Cosa | Chi |
|------|-----|
| Sostituire i placeholder [SOSTITUIRE CON...] in legalContent, eventuale revisione legale, prezzi/link abbonamento | Tu |
| Deploy backend, Firebase Admin, URL in build | Tu |
| Firebase Console (domini, google-services, SHA-1, Apple) | Tu |
| Login Google/Apple (configurazione) | Tu |
| Pagamenti + verifica abbonamento in backend | Tu (se vendi abbonamento) |
| **Oscuramento codice** (obfuscazione JS + ProGuard) prima della vendita | Tu |
| Versioni, EAS Build, EAS Submit | Tu |
| Test pre-release su dispositivo | Tu |

Tutto il resto (chiavi solo server, cronologia, memoria, profilo, timeout, Error Boundary, limite messaggio, offline, recupero password, README/build doc, commenti in legalContent, gitignore, placeholder legali) è **già fatto o preparato**; ti basta accettare le modifiche e seguire i punti della Parte 2.

---

# Quando tocca a te

1. **Legali** — In `src/content/legalContent.js` sostituisci **[SOSTITUIRE CON NOME O RAGIONE SOCIALE]** e **[SOSTITUIRE CON EMAIL CONTATTO]** con i dati reali. (Opzionale: far revisionare Privacy e Termini da un legale.)
2. **Backend** — Metti online il backend (VPS/cloud), configura Firebase Admin sul server, e in build EAS imposta `EXPO_PUBLIC_BACKEND_URL` (e Firebase). Non mettere OXY_AI_KEY né TAVILY in build.
3. **Firebase** — Domini autorizzati, Android `google-services.json` + SHA-1, iOS se usi Apple.
4. **Login social** — Se li usi: configura Google e Apple in Firebase e in .env/EAS.
5. **Pagamenti** — Se vendi abbonamento: integra pagamenti e fai verificare l’abbonamento dal backend.
6. **Oscuramento codice** — Prima della vendita: applica obfuscazione al codice (vedi `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md`) così che nessuno possa decifrare il codice dell’app.
7. **Store** — Aggiorna `expo.version` in `app.json`, fai EAS Build e Submit, test su dispositivo reale.
