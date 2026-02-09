# Oscuramento del codice — Prima della vendita

**Requisito:** quando l’app è pronta per la vendita, il codice deve essere reso **indecifrabile**: nessuno deve poter leggere o decifrare la logica in chiaro.

Questo documento riassume le opzioni tecniche per React Native / Expo. Va applicato **prima** di inviare l’app agli store (o prima di distribuire build di produzione a pagamento).

---

## Cosa protegge e cosa no

- **Bundle JavaScript:** in una build release, Metro produce un bundle JS (e spesso un source map). Chi estrae l’APK/IPA può in teoria risalire al codice. **Minificazione** (già attiva in release) rinomina variabili e compatta il codice, ma non lo rende “indecifrabile”. Serve **obfuscazione** aggiuntiva.
- **Codice nativo (Android/iOS):** compilato; su Android ProGuard/R8 offuscano i simboli in release. Su iOS i simboli possono essere stripatti. EAS Build applica già impostazioni release.

---

## Opzioni per il JavaScript (React Native / Expo)

1. **Metro + minificazione (già attiva)**  
   In build di produzione Metro usa minificazione. È il minimo; da solo non basta per “indecifrabile”.

2. **javascript-obfuscator (o simili)**  
   Trasforma il codice in un formato molto difficile da leggere (variabili ridotte a caratteri, stringhe offuscate, controllo flusso alterato).  
   - Si può integrare come **transformer** in Metro (es. `metro-react-native-babel-transformer` + passo di obfuscation, o pacchetti tipo `react-native-obfuscating-transformer` se compatibili con la tua versione Expo).  
   - **Attenzione:** obfuscazione pesante può aumentare dimensione bundle e, in rari casi, rompere reflection o nomi esportati; va testata una build completa.

3. **Pipeline EAS Build**  
   In EAS puoi usare **hooks** (es. `eas.json` → hook pre-build) per lanciare uno script che, dopo il bundle, obfusca il file JS prima del packaging. In alternativa, un transformer Metro personalizzato che obfusca durante il bundle.

4. **Servizi commerciali**  
   Esistono servizi (es. Jscrambler, DexGuard per Android) che offrono offuscazione e anti-tampering; richiedono integrazione e spesso costo.

---

## Checklist pratica (quando sei pronto)

- [ ] Decidere **livello** di protezione: solo minificazione (già fatto) vs obfuscazione forte (javascript-obfuscator o servizio).
- [ ] **Android:** verificare in `android/app/build.gradle` che per la build type `release` sia abilitato minifyEnabled (e ProGuard/R8). Con EAS di solito è già così.
- [ ] **Expo:** se usi Expo managed/workflow, cercare un transformer o uno script compatibile con la versione Expo in uso (es. compatibilità con `expo export` o con EAS Build).
- [ ] **Test:** dopo aver attivato l’obfuscazione, fare una build di produzione e testare login, chat, Memory Vault, Storie, impostazioni, ecc. per escludere crash o errori strani.
- [ ] **Source map:** in produzione è meglio non distribuire source map pubbliche; EAS/Expo permettono di non allegarle alla build finale.

---

## Riferimenti

- [Metro – Minification](https://metrobundler.dev/docs/configuration#minifierpath)
- [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) (uso da Node/script o integrato in build)
- [EAS Build – Custom build hooks](https://docs.expo.dev/build-reference/eas-json/#build-hooks) (per eseguire script pre/post build)
- Android: `minifyEnabled true` e ProGuard/R8 in `build.gradle` per release

---

*Documento creato per ricordare l’impegno: appena l’app è pronta per la vendita, il codice deve essere oscurato e reso indecifrabile.*
