# Riepilogo go-live — Verificato su cartelle e file (esclusa cartella oxy)

**Data verifica:** 2026-02-09  
**Metodo:** analisi di cartelle e file in `AppDelSecolo` (esclusa eventuale cartella `oxy`). Ogni voce è stata controllata nel codice o nei file.

---

## ✅ FATTO (verificato in codice/file)

### Sicurezza e configurazione
| Voce | Dove verificato |
|------|-----------------|
| `.env` e `backend/.env` in `.gitignore` | `.gitignore` (righe 2-5), `backend/.gitignore` |
| Avviso "NON aggiungere OXY_AI_KEY/TAVILY in build" | `.env.example` riga 2 |
| Backend: commento FIREBASE_SERVICE_ACCOUNT_JSON per deploy senza file | `backend/.env.example` righe 19-20 |
| Chiavi OpenAI/Tavily solo backend; cronologia e memoria lato server | `backend/index.js` (route, env) |
| Firebase config da env (EXPO_PUBLIC_FIREBASE_*) | `src/config/firebaseConfig.js` |

### Contenuti legali
| Voce | Dove verificato |
|------|-----------------|
| Titolare e email reali in Privacy/Termini | `src/content/legalContent.js`: "SecondSelf di Ivan Lopez", "oxy@oxyreal.it" (nessun [SOSTITUIRE] nel contenuto) |
| Struttura subscription e consentStrings | `legalContent.js` sezioni subscription, consentStrings |
| Istruzione "PRIMA DEL LANCIO" in cima al file | `legalContent.js` righe 6-10 (commento; dati già compilati sotto) |

### Backend
| Voce | Dove verificato |
|------|-----------------|
| Endpoint `/health` | `backend/index.js` riga 569 |
| Endpoint `/api/billing/checkout`, `/api/billing/status`, `/api/billing/webhook` | `backend/index.js` righe 1100, 1162, 1193 |
| Documentazione deploy (Railway, variabili, Firebase base64) | `backend/DEPLOY_BACKEND.md` |
| `.env.example` con PORT, OPENAI, MASTER_EMAIL, Firebase, Stripe | `backend/.env.example` |

### App e UX
| Voce | Dove verificato |
|------|-----------------|
| ErrorBoundary usato | `App.js` import e più blocchi `<ErrorBoundary>` |
| Banner offline (useNetInfo) | `App.js` riga 333, hook `useNetInfo` |
| README: sezione "Build produzione (EAS)" e riferimento checklist | `README.md` righe 45-48 |
| RELEASE_CHECKLIST con EAS, versioni, store | `RELEASE_CHECKLIST.md` |
| EAS: profili development, preview, production | `eas.json` |
| app.json: version "1.0.0", EAS projectId | `app.json` |
| Pagine redirect Stripe (success/cancel) | `pagine-stripe/success.html`, `pagine-stripe/cancel.html` |

### Documentazione
| Voce | Dove verificato |
|------|-----------------|
| Checklist go-live unica | `CHECKLIST_DEFINITIVA_GO_LIVE.md` |
| Checklist configurazione produzione | `CHECKLIST_CONFIGURAZIONE_PRODUZIONE.md` |
| Doc obfuscazione pre-vendita | `docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md` |
| Regola Cursor obfuscazione | `.cursor/rules/obfuscazione-pre-vendita.mdc` |

### Android (parziale)
| Voce | Dove verificato |
|------|-----------------|
| ProGuard configurato per release (proguardFiles) | `android/app/build.gradle` righe 117-118 |
| File proguard-rules.pro presente | `android/app/proguard-rules.pro` |

---

## ❌ NON FATTO / DA FARE (verificato)

### 1. Contenuti legali (opzionale ma consigliato)
- [ ] **Revisione legale** di Privacy e Termini (i testi ci sono con dati reali; eventuale approvazione da avvocato).
- [ ] **Link e prezzi reali** in `legalContent.js` (sezione subscription) quando hai URL definitivi (Stripe, store).

### 2. Backend e ambiente (azioni tue)
- [ ] **Deploy effettivo** del backend su Railway/Render/VPS con URL pubblico.
- [ ] **backend/.env** in produzione: compilare con OPENAI_API_KEY, MASTER_EMAIL, Firebase (o FIREBASE_SERVICE_ACCOUNT_JSON base64), Stripe (vedi sotto).
- [ ] **.env (root)** per build produzione: EXPO_PUBLIC_BACKEND_URL = URL pubblico backend, tutte EXPO_PUBLIC_FIREBASE_*, eventuale GOOGLE_WEB_CLIENT_ID. **Non** mettere OXY_AI_KEY né TAVILY in build.

### 3. Firebase Console (azioni tue)
- [ ] **Domini autorizzati** per Auth (e redirect se usi link dinamici).
- [ ] **google-services.json**: **non presente** in `android/app/` → scaricare da Firebase Console e aggiungere (necessario per Google Sign-In su Android).
- [ ] **SHA-1** configurato in Firebase (per Google Sign-In Android).
- [ ] **iOS**: configurazione Apple e, se usi Sign in with Apple, certificati/Service ID.

### 4. Stripe (se vendi abbonamento)
- [ ] Passare Stripe da **TEST** a **LIVE**.
- [ ] Copiare **Secret Key LIVE** (`sk_live_...`) e impostarla in `backend/.env` come `STRIPE_SECRET_KEY`.
- [ ] Creare **prodotti e prezzi in modalità LIVE** (Starter, Pro, Elite, eventuali Lifetime) e impostare i Price ID in `backend/.env` (STRIPE_PRICE_*).
- [ ] Configurare **webhook** Stripe → `https://tuo-backend.com/api/billing/webhook` (eventi: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted).
- [ ] In `backend/.env`: STRIPE_SUCCESS_URL e STRIPE_CANCEL_URL (es. https://oxyreal.it/success e /cancel).

### 5. Android: minify/ProGuard in release
- [x] **Fatto (da accettare):** aggiunta in `android/gradle.properties` la riga `android.enableMinifyInReleaseBuilds=true`. In build release minify e ProGuard/R8 saranno attivi.
- [ ] **Da fare tu:** una build di release di test (es. `npx eas build --platform android --profile production`) per verificare che non ci siano crash con ProGuard attivo.

### 6. Oscuramento codice (prima della vendita)
- [ ] **Obfuscazione JavaScript:** la doc esiste (`docs/OBFUSCAZIONE_CODICE_PRE_VENDITA.md`) ma nel repo **non** c’è un transformer/script di obfuscation (solo minificazione Metro). Valutare integrazione (es. javascript-obfuscator o EAS hook) e testare una build.
- [ ] Dopo aver attivato minify Android (punto 5) e eventuale obfuscation JS: **test** build produzione (login, chat, menu, abbonamento, offline).

### 7. Sito vetrina (se vendi dal sito)
- [ ] Dominio (es. oxyreal.it), landing, link download app.
- [ ] Pagine **/success** e **/cancel** pubblicate e raggiungibili (in repo hai `pagine-stripe/`; vanno messe online sul sito).
- [ ] HTTPS attivo.

### 8. Versioni e build
- [ ] Prima di ogni release: aggiornare **expo.version** in `app.json` (e versionCode/buildNumber se li usi).
- [ ] **EAS Build:** `npx eas build --platform android --profile production` (e iOS se serve).
- [ ] **Distribuzione:** APK/IPA sul sito o EAS Submit agli store (account Apple/Google).

### 9. Test pre-release
- [ ] Su **dispositivo reale**: login (email, recupero password, Google/Apple se configurati), chat, cronologia, Memory Vault, menu (Privacy, Termini, Abbonamento, Impostazioni, Cloud, logout), abbonamento e checkout Stripe.
- [ ] **Offline:** verificare che compaia il banner "Sei offline" e messaggi chiari in assenza di rete.

---

## Riepilogo veloce

| Categoria | Stato |
|-----------|--------|
| Legali (dati titolare/email) | ✅ Compilati (SecondSelf, oxy@oxyreal.it) |
| .gitignore e .env.example | ✅ Ok |
| Backend (health, billing, deploy doc) | ✅ Presente in codice e doc |
| ErrorBoundary, offline, Firebase config | ✅ Presente |
| Pagine success/cancel (file) | ✅ In `pagine-stripe/` |
| google-services.json | ❌ Assente (da Firebase Console) |
| ProGuard/R8 in release | ✅ Abilitato (property in gradle.properties; resta da testare una build release) |
| Obfuscation JS | ❌ Solo doc, nessuno script/transformer |
| Deploy backend, Stripe LIVE, Firebase Console, Build/Submit, Test | ❌ Azioni da fare da te |

---

*Questo file è stato generato verificando le cartelle e i file del progetto (esclusa la cartella oxy). Per i dettagli operativi usa `CHECKLIST_DEFINITIVA_GO_LIVE.md` e `CHECKLIST_CONFIGURAZIONE_PRODUZIONE.md`.*
