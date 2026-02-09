# Lista punti da chiudere — uno per uno

Elenco completo in ordine. Si risolve **un punto per volta**; quando è fatto si spunta e si passa al successivo.

---

## Punto 1 — Privacy policy (testi definitivi)
- Sostituire i placeholder in `src/content/legalContent.js` (costante `PRIVACY_POLICY_PLACEHOLDER`) con il testo definitivo (eventualmente fatto redigere/approvare da un legale).
- Allineare, se usi i file in repo, `docs/PRIVACY_POLICY.md`.
- **Chi:** Tu (o legale). **Io:** posso solo tenere la struttura; i testi legali li decidi tu.

---

## Punto 2 — Termini di servizio (testi definitivi)
- Sostituire in `src/content/legalContent.js` (`TERMINI_SERVIZIO_PLACEHOLDER`) e, se serve, `docs/TERMINI_SERVIZIO.md`.
- **Chi:** Tu (o legale).

---

## Punto 3 — Pagina Abbonamento (testi e link)
- Aggiornare i testi in `ABBONAMENTO_PLACEHOLDER` in `src/content/legalContent.js` con piano prezzi e, se previsto, link reali (Stripe, App Store, Google Play).
- **Chi:** Tu (contenuti). **Io:** posso aggiungere link/bottoni se mi dai gli URL.

---

## Punto 4 — Verifica .env e segreti (nessuna chiave in repo)
- Verificare che `.env` sia in `.gitignore` e non sia mai committato.
- Per build produzione (EAS): usare segreti EAS o variabili di build per Firebase, backend URL, Master email. Nessuna chiave OpenAI/Tavily nel client per l’app in abbonamento.
- **Chi:** Tu (config). **Io:** posso controllare .gitignore e documentazione.

---

## Punto 5 — Chiave Master solo sul server
- In produzione la chiave OpenAI non deve stare nell’app (né in `.env` pubblico dell’app). Solo il backend la usa (es. `backend/.env`).
- Già previsto con `EXPO_PUBLIC_APP_MODE=subscription` e backend. Verificare che in build store non ci siano `EXPO_PUBLIC_OXY_AI_KEY` o simili.
- **Chi:** Tu (build/env). **Io:** posso rivedere doc e .env.example.

---

## Punto 6 — Backend in produzione
- Deploy del backend (VPS o cloud) con `EXPO_PUBLIC_BACKEND_URL` puntato all’URL reale.
- Sul server: configurare `GOOGLE_APPLICATION_CREDENTIALS` o `FIREBASE_SERVICE_ACCOUNT_JSON` per la verifica token Firebase.
- **Chi:** Tu (devops/hosting).

---

## Punto 7 — Firebase (Auth e domini)
- Domini autorizzati per Auth (e link dinamici se usati).
- Android: `google-services.json` e SHA-1 configurati.
- iOS: configurazione Apple se usi Sign in with Apple.
- **Chi:** Tu (Firebase Console + EAS/credentials).

---

## Punto 8 — Login social Google e Apple
- Google: Sign-in method abilitato in Firebase; `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in .env; development build; su Android `google-services.json` e SHA-1.
- Apple: provider Apple abilitato in Firebase; su iOS certificati/Service ID per Sign in with Apple.
- **Chi:** Tu (config Firebase + EAS). Il codice lato app è già presente.

---

## Punto 9 — Integrazione pagamenti (abbonamento)
- Scegliere e configurare un sistema (Stripe, RevenueCat, IAP Apple/Google).
- Collegare la pagina “Abbonamento e pagamenti” (o flusso in-app) al sistema scelto.
- **Chi:** Tu (account, config). **Io:** posso preparare UI/placeholder e integrare chiamate quando hai scelto il provider.

---

## Punto 10 — Backend: verifica abbonamento
- Il backend deve verificare lo stato abbonamento (webhook Stripe, API store, ecc.) e riconoscere l’utente come abbonato (o “Master”) solo se pagante.
- Oggi “Master” è solo email in `MASTER_EMAIL`; andrà sostituito/esteso con verifica abbonamento reale.
- **Chi:** Tu (backend + provider pagamenti). **Io:** posso definire l’API (es. endpoint che riceve idToken e restituisce hasSubscription) e la doc.

---

## Punto 11 — Versioni app (app.json)
- Aggiornare `version` e `android.versionCode` / `ios.buildNumber` in `app.json` (o dove gestisci le versioni) prima di ogni invio agli store.
- **Chi:** Tu. **Io:** posso indicarti dove e come incrementare.

---

## Punto 12 — EAS Build
- Account Expo/EAS configurato; eseguire build per Android e/o iOS (vedi `RELEASE_CHECKLIST.md`).
- **Chi:** Tu.

---

## Punto 13 — EAS Submit e review store
- Dopo build riuscita: invio a Google Play e/o App Store (credenziali, account developer, certificati/keystore).
- **Chi:** Tu.

---

## Punto 14 — Test pre-release su dispositivo reale
- Login (email e, se attivi, Google/Apple), recupero password, chat, cronologia, menu (Privacy, Termini, Abbonamento, Gestisci Cloud), cambio password, logout.
- Verificare banner “Sei offline” quando non c’è rete.
- **Chi:** Tu.

---

## Punto 15 — Opzionali (dopo il lancio)
- Cloud (Drive/iCloud/Server) reale.
- Chat di gruppo (logica backend + inviti).
- Pagina/link Supporto (es. help center).
- Implementare lingua cinese (zh) nel sistema di traduzioni (`translations.js`, selettore lingua, passaggio `language: 'zh'` al backend).
- Autenticazione a due fattori (2FA) per il login (es. codice via email/SMS/app autenticatore), da progettare e integrare dopo il lancio iniziale.
- Trasparenza limiti utilizzo: mostrare in app una barra/progresso (es. 80% / 95%) dei limiti giornalieri/mensili per piano e suggerire upgrade o ricarica quando l’utente si avvicina al limite.
- **Chi:** Da decidere dopo aver chiuso i punti 1–14.

---

## Ordine consigliato

1. **Punto 1** → Privacy policy  
2. **Punto 2** → Termini di servizio  
3. **Punto 3** → Pagina Abbonamento (testi)  
4. **Punto 4** → Verifica .env e segreti  
5. **Punto 5** → Chiave Master solo server  
6. **Punto 6** → Backend in produzione  
7. **Punto 7** → Firebase  
8. **Punto 8** → Login Google/Apple  
9. **Punto 9** → Pagamenti  
10. **Punto 10** → Backend verifica abbonamento  
11. **Punto 11** → Versioni  
12. **Punto 12** → EAS Build  
13. **Punto 13** → EAS Submit  
14. **Punto 14** → Test pre-release  
15. **Punto 15** → Opzionali  

Quando un punto è chiuso, segnalo qui con [x] e si passa al successivo.
