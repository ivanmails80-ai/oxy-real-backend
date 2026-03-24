# Handoff per il prossimo agente — OXY Real / Google Sign-In su APK

**Data handoff:** 15 febbraio 2025  
**Contesto:** Laptop con problemi di memoria; cambio agente. Questo documento riassume stato e passi da completare.

**Sessione 16 feb 2025:** Letto handoff, verificato che in `AuthScreen.js` è già usato `googleAndroidNeeded` quando `googleConfigured` è true ma `request`/`promptAsync` sono null. Aggiornato `.env.example` con lo SHA-1 esatto (debug keystore) e istruzioni per il client Android. Per abilitare Google sull’APK: completare §3.1.1–3.1.2 (Console + .env), poi §3.1.3–3.1.4 (build e installazione).

**Fix "disponibile dal prossimo aggiornamento":** Il bundle JS non riceveva il `.env` in build, quindi `process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` restava vuoto. Soluzione: (1) `app.config.js` mette i Client ID in `expo.extra`; `createExpoConfig` carica `.env` e scrive il config nel manifest nativo; (2) `AuthScreen.js` legge da `Constants.expoConfig.extra` (helper `getExpoPublic()`). Prima di build APK: `node scripts/check-google-android-config.js`.

---

## 1. Stato attuale del progetto

- **App:** OXY Real (React Native / Expo 54), backend su Render, auth Firebase, Stripe.
- **Ambiente:** Windows, Node 22 LTS, Expo CLI/EAS ok. Test su Android con **APK installato** (non più Expo Go).
- **APK in uso:** build **release** con bundle JS incorporato, così l’app si apre direttamente sulla schermata di login (nessuna schermata Expo).
  - Percorso: `android\app\build\outputs\apk\release\app-release.apk`
  - Package: `com.oxyreal.app`
  - Firma: debug keystore (`android/app/debug.keystore`) perché non c’è `keystore.properties` per release.

---

## 2. Cosa è stato fatto in questa sessione

1. **ADB e installazione APK**
   - ADB trovato in: `C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe`
   - Installato prima l’APK debug (mostrava schermata Expo) poi l’APK **release** (apre direttamente OXY Real).

2. **Google Sign-In sull’APK**
   - Alla pressione del tasto Google l’utente vede: *"Accesso con Google: disponibile dal prossimo aggiornamento"* (o messaggio simile).
   - Causa: sull’APK serve un **client OAuth Android** in Google Cloud; con solo client Web/Expo il flusso non parte e l’app mostra quel messaggio.

3. **Modifiche codice (già applicate)**
   - In **`src/i18n/translations.js`** è stata aggiunta la chiave **`login.social.googleAndroidNeeded`** in tutte le lingue (it, en, fr, es, ar, zh). Messaggio tipo: *"Per l'accesso Google su questa app serve il client Android in Google Cloud (package com.oxyreal.app e SHA-1). Aggiungi EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID nel .env e ricompila l'app."*
   - **NON è stato ancora modificato** `AuthScreen.js`: quando `googleConfigured` è true ma `request`/`promptAsync` sono null, l’app continua a mostrare `unavailableGoogle` ("disponibile dal prossimo aggiornamento"). Il prossimo agente può:
     - usare `googleAndroidNeeded` in quel caso (messaggio più utile per chi ha l’APK senza client Android), oppure
     - completare la configurazione Google (vedi sotto) e poi verificare che il bottone Google funzioni senza cambiare messaggio.

4. **SHA-1 per Google Cloud**
   - Eseguito `.\gradlew.bat signingReport` in `android/`.
   - **SHA-1 da usare per il client OAuth Android:**  
     `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`  
   - Package: **`com.oxyreal.app`**

---

## 3. Cosa deve fare il prossimo agente

### 3.1 Abilitare Google Sign-In sull’APK (priorità alta)

1. **Google Cloud Console**
   - Andare in [Google Cloud Console](https://console.cloud.google.com/) → progetto usato per OXY Real → **API e servizi** → **Credenziali**.
   - **Crea credenziali** → **ID client OAuth**.
   - Tipo: **Android**.
   - Nome: es. "OXY Real Android".
   - **Nome pacchetto:** `com.oxyreal.app`
   - **Impronta digitale certificato SHA-1:**  
     `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - Salvare e copiare il **Client ID** (es. `xxxx.apps.googleusercontent.com`).

2. **File .env (root del progetto)**
   - Aggiungere o aggiornare:  
     `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<il Client ID appena creato>`
   - Il `.env` è già usato dalla build (Expo incorpora le `EXPO_PUBLIC_*` al build).

3. **Ricostruire e reinstallare l’APK**
   - Da root progetto:  
     `cd android`  
     `.\gradlew.bat assembleRelease`
   - APK generato:  
     `android\app\build\outputs\apk\release\app-release.apk`
   - Installare sul dispositivo:  
     `"C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "C:\Users\giuse\Desktop\ivan\AppDelSecolo\android\app\build\outputs\apk\release\app-release.apk"`

4. **Abilitare lo schema URI personalizzato (se compare errore 400 "custom uri is not enabled")**
   - Google disabilita di default gli URI personalizzati (es. `oxyreal://`) per i client Android.
   - In **Credenziali** → clicca sul client **OXY Real Android** (tipo Android).
   - Scorri fino a **Impostazioni avanzate** (Advanced settings).
   - Attiva la casella **Abilita schema URI personalizzato** (Enable custom URI scheme).
   - Clicca **Salva**. Dopo il salvataggio il login con Google sull’APK può richiedere qualche minuto per propagarsi.

5. **Firebase Console: abilitare Google come metodo di accesso (obbligatorio)**
   - Se vedi *"Firebase: the identity provider configuration is not found (auth/operation-not-allowed)"* significa che Google non è abilitato in Firebase.
   - [Firebase Console](https://console.firebase.google.com/) → progetto **oxy-real** → **Authentication** → **Sign-in method**.
   - Clicca su **Google** → **Abilita** (Enable) → Salva.
   - Checklist completa: `docs/GOOGLE_SIGNIN_APK_CHECKLIST.md`. Prima di ogni release APK: `node scripts/preflight-google-release.js`.

6. **Test**
   - Aprire l’app, schermata di login, premere **Continua con Google**. Dovrebbe aprirsi il flusso Google (scelta account, ecc.) e poi tornare in app con utente loggato.

### 3.2 (Opzionale) Messaggio più chiaro se Google non è ancora configurato

- In **`src/screens/AuthScreen.js`**, in `handleSocial('Google')`:
  - Oggi: se `!googleAuthRef.current?.request || !googleAuthRef.current?.promptAsync` si lancia `t('login.social.unavailableGoogle')`.
  - Si può distinguere: se **non** c’è nessun client ID (`!googleConfigured`) → lasciare `unavailableGoogle` ("disponibile dal prossimo aggiornamento"); se **c’è** almeno un client ID ma request/promptAsync sono null (tipico APK senza client Android) → lanciare `t('login.social.googleAndroidNeeded')` così l’utente/sviluppatore sa che deve configurare il client Android e ricompilare.

---

## 4. File rilevanti

| File | Nota |
|------|------|
| `src/screens/AuthScreen.js` | Login, bottone Google, `handleSocial`, `GoogleAuthHook`, `googleConfigured`, `googleAuthRef` |
| `src/services/socialAuthService.js` | `signInWithGoogleIdToken`, `configureGoogleSignIn` |
| `src/i18n/translations.js` | `login.social.unavailableGoogle`, `login.social.googleAndroidNeeded` (nuova) |
| `.env` (root) | `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` |
| `.env.example` (root) | Istruzioni per Expo Go (client Web) e per APK (client Android) |
| `android/app/build.gradle` | `applicationId 'com.oxyreal.app'`, signing debug/release |
| `android/app/src/main/java/com/oxyreal/app/MainActivity.kt` | Entry nativa |
| `docs/HANDOFF_AGENTE_GOOGLE_APK.md` | Questo handoff |

---

## 5. Comandi utili

```bash
# SHA-1 (da android/)
.\gradlew.bat signingReport

# Preflight prima di release APK (Google + Firebase + manifest)
node scripts/preflight-google-release.js

# Build release APK (da android/)
.\gradlew.bat assembleRelease

# Dispositivi connessi
"C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices

# Installa APK release
"C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "C:\Users\giuse\Desktop\ivan\AppDelSecolo\android\app\build\outputs\apk\release\app-release.apk"
```

---

## 6. Note brevi

- **Expo Go:** per il login Google in Expo Go si usa il client OAuth **Web** con redirect `https://auth.expo.io/@alexxivan80/secondself` (slug in `app.json` è `secondself`). Su APK installato si usa il client **Android** con package e SHA-1 sopra.
- **Node:** usare Node **22 LTS**; con Node 24 Expo può dare errori (es. UV_HANDLE_CLOSING).
- **EAS Build:** l’account ha esaurito le build Android gratuite del mese; per test locale si usa `gradlew assembleRelease` e installazione via ADB.

Se il prossimo agente segue i punti in §3, il login con Google sull’APK dovrebbe funzionare dopo la creazione del client Android, la variabile in `.env` e la ricompilazione/reinstallazione.
