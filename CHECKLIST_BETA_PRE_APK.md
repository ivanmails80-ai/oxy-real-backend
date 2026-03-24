# Check pre-beta / pre-APK — Go-live versione gratuita

**Obiettivo:** verificare che non manchi nulla per il go-live in versione gratuita e che non ci siano bug o rischi di crash prima di creare l’APK e passarla al beta tester.

**Riferimenti:** `docs/COSA_MANCA_GO_LIVE_GRATUITA.md`, `GO_LIVE.md`, `CHECKLIST_TEST_APP.md`.

---

## 1. Verifiche effettuate in codice (check automatico)

| Voce | Stato | Note |
|------|--------|------|
| **Backend URL** | ✅ | `backendConfig.js`: fallback su `https://oxy-real-backend.onrender.com` se `EXPO_PUBLIC_BACKEND_URL` non impostato. |
| **Firebase** | ✅ | Senza chiave valida usa auth stub (nessun crash). |
| **Traduzioni (t)** | ✅ | Fallback: chiave mancante → restituisce la chiave (no crash). `limitReachedShareMessage`, `shareOxy.*`, `pianiInArrivo*`, `enterWithoutSharing` presenti in it, en, fr, es, ar, zh. |
| **Contenuti legali** | ✅ | Nessun placeholder "XXXXX" nei testi; solo istruzione in commento. Titolare SecondSelf, email oxy@oxyreal.it. |
| **Modale Termini/Privacy** | ✅ | Uso di `termsDoc?.sections?.map` e `privacyDoc?.sections?.map` (nessun .map su undefined). |
| **Avvio app** | ✅ | `appReady` impostato dopo lettura lingua da AsyncStorage (sempre, anche in catch). Splash nascosto quando `appReady` e non loading. |
| **ErrorBoundary** | ✅ | Radice in `index.js`; cattura errori React e mostra "Qualcosa è andato storto". |
| **JSON.parse a avvio** | ✅ | Lettura prefs: `JSON.parse(storedServer)` protetta con try/catch per evitare che JSON corrotto blocchi le altre prefs. |
| **Flusso free (Fase 1)** | ✅ | Con `EXPO_PUBLIC_SHOW_UPGRADE` non impostato/false: Prova gratis, Condividi OXY, limite 5 msg, Piani in arrivo, share gate con "Entra senza condividere". |

---

## 2. Cosa fare tu prima di creare l’APK

- [ ] **Backend online**  
  Apri `https://oxy-real-backend.onrender.com/health`: deve rispondere con `{"ok":true,...}`. Se non risponde, attiva/verifica il servizio su Render.

- [ ] **Variabili di build**  
  Per build locale: file `.env` nella root (copia da `.env.example`).  
  Variabili minime: `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`.  
  Per login Google su Android: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

- [ ] **Preflight**  
  Esegui: `npm run preflight:go-live`  
  Deve concludere con "Preflight OK". Eventuali avvisi Stripe per la Fase 1 free si possono ignorare.

- [ ] **Build APK**  
  Segui **COME_CREARE_APK_E_INSTALLARLA.md** (unica guida: preparazione, build con bat o Android Studio, installazione) oppure EAS: `npx eas build --platform android --profile production`.

---

## 3. Test consigliati dopo l’installazione (beta tester)

Usa **CHECKLIST_TEST_APP.md** adattata alla versione free:

1. **Avvio** — Nessun crash; scelta lingua solo al primo avvio; poi Login/Registrazione.
2. **Registrazione** — Solo "Prova gratis" (niente Abbonamento/Lifetime se SHOW_UPGRADE=false).
3. **Share gate** — Dopo login free: schermata "Condividi per entrare in chat" con "Condividi OXY" e "Entra in chat senza condividere".
4. **Chat** — Invio di 5 messaggi; al sesto messaggio: limite con messaggio "Condividi OXY" e riprova domani.
5. **Menu** — Condividi OXY, Piani in arrivo (modal 50%), Memory Vault, Diario, Impostazioni, Privacy, Termini, Logout.
6. **Offline** — Senza rete: messaggio "Sei offline" (nessun crash).
7. **Login esistente** — Logout e nuovo login: va in chat senza richiedere di nuovo share/piano.

---

## 4. Riepilogo

- **Codice:** nessun bug o carattere mancante rilevato che causi crash; avvio, auth, chat e modali legali sono protetti (optional chaining, fallback backend/Firebase, ErrorBoundary, JSON parse prefs).
- **Go-live gratuito:** requisiti di codice e contenuti soddisfatti secondo `docs/COSA_MANCA_GO_LIVE_GRATUITA.md`. Restano da fare da te: backend online, variabili build, preflight, build APK e test su dispositivo.

*Ultimo check: marzo 2026.*
