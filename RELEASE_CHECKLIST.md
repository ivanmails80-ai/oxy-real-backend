# Guida build e release – OXY Real

Checklist e comandi utili prima di inviare l’app agli store.

## Build di prova (locale)

- **iOS (simulatore / dispositivo):**
  ```bash
  npx expo run:ios
  ```
- **Android (emulatore / dispositivo):**
  ```bash
  npx expo run:android
  ```

Assicurati che `.env` sia configurato e che il backend sia raggiungibile se usi cronologia remota.

## EAS Build (Expo Application Services)

1. **Configurazione:** verifica `eas.json` (profili `development`, `preview`, `production`).
2. **Build:**
   ```bash
   npx eas build --platform android
   npx eas build --platform ios
   # oppure
   npx eas build --platform all
   ```
3. **Submit agli store (dopo build riuscita):**
   ```bash
   npx eas submit --platform android --latest
   npx eas submit --platform ios --latest
   ```

## Prima di inviare agli store

- [ ] `.env` non committato; in produzione usare segreti EAS o variabili di build (vedi README, sezione "Build produzione").
- [ ] Backend in produzione raggiungibile (URL corretto in config).
- [ ] Firebase: domini autorizzati e (per Android) `google-services.json` e SHA-1 configurati.
- [ ] Login social: Google/Apple configurati in Firebase e in EAS (credentials).
- [ ] Test su dispositivo reale: login, chat, recupero password, menu (Privacy, Termini, Abbonamento, Cloud).
- [ ] **Versioni:** in `app.json` aggiornare `expo.version` (es. 1.0.0 → 1.0.1). Per `android.versionCode` e `ios.buildNumber` vedi [EAS Build versioning](https://docs.expo.dev/build-reference/app-versions/) (EAS può auto-incrementarli).
- [ ] **Contenuti legali:** sostituire i placeholder con testi definitivi (eventualmente approvati da un legale):
  - In app: modificare i testi in `src/content/legalContent.js` (PRIVACY_POLICY_PLACEHOLDER, TERMINI_SERVIZIO_PLACEHOLDER, ABBONAMENTO_PLACEHOLDER).
  - File di riferimento: `docs/PRIVACY_POLICY.md` e `docs/TERMINI_SERVIZIO.md` (stessa struttura da allineare).

## Note

- Per **Apple**: richiesto account Apple Developer; certificati e provisioning gestibili con EAS.
- Per **Google Play**: servizio account e keystore; EAS può gestire il keystore.
- Documentazione ufficiale: [Expo EAS Build](https://docs.expo.dev/build/introduction/), [EAS Submit](https://docs.expo.dev/submit/introduction/).
