# Reset totale ambiente di build

Per tornare allo “stato di grazia” in cui la build funzionava: ambiente pulito, versioni bloccate, Gradle più stabile.

## Cosa fa il reset

1. **Ferma i daemon Gradle** (`gradlew --stop`)
2. **Elimina** le cartelle:
   - `android/` (progetto Android generato)
   - `node_modules/`
   - `.gradle/` (nella root del progetto)
   - opzionale: `.gradle` nella home (può fallire per path lunghi su Windows)
3. **Reinstalla** le dipendenze con `npm install`
4. **Rigenera** la cartella Android con `npx expo prebuild -p android --clean`
5. **Applica versioni stabili**:
   - **Gradle 8.10.2** al posto di 8.14.3 (più stabile su Windows) in `android/gradle/wrapper/gradle-wrapper.properties`
   - **Keystore**: patch in `android/app/build.gradle` per usare `%USERPROFILE%\.android\debug.keystore` se non esiste `android/app/debug.keystore`; eventuale copia del keystore da home in `android/app`

## Come eseguirlo

### Opzione A: script automatico (consigliato)

1. **Chiudi tutto** ciò che può tenere aperta la cartella del progetto:
   - Cursor / VS Code
   - Esplora file sulla cartella `AppDelSecolo` o su `android`
   - Eventuali terminali con `cd` nella cartella del progetto
2. Apri un **Prompt dei comandi** (cmd) o **PowerShell** **fuori** da Cursor.
3. Vai alla root del progetto:
   ```bat
   cd c:\Users\giuse\Desktop\ivan\AppDelSecolo
   ```
4. Esegui:
   ```bat
   RESET_BUILD_AMBIENTE.bat
   ```
5. Se la cancellazione di `android` fallisce con “in uso”, riavvia il PC e ripeti dal punto 2.

### Opzione B: passi a mano

Da terminale nella root del progetto:

```bat
cd android
gradlew.bat --stop
cd ..

rd /s /q .gradle
rd /s /q node_modules
rd /s /q android

npm install
npx expo prebuild -p android --clean
```

Poi:

- In `android\gradle\wrapper\gradle-wrapper.properties` sostituisci `gradle-8.14.3-bin` con `gradle-8.10.2-bin`.
- Esegui lo script di patch del keystore:
  ```bat
  powershell -ExecutionPolicy Bypass -File scripts\patch-android-keystore-fallback.ps1
  ```
- Se non esiste `android\app\debug.keystore` ma esiste `%USERPROFILE%\.android\debug.keystore`, copialo in `android\app\`.

## Dopo il reset: build APK

```bat
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
cd android
gradlew.bat assembleRelease
```

L’APK sarà in `android\app\build\outputs\apk\release\app-release.apk`.

## Versioni bloccate

- **Gradle**: 8.10.2 (nel wrapper dopo il reset).
- **Expo / React Native**: quelle definite in `package.json` (non modificate dal reset); il prebuild usa quelle per rigenerare `android`.
- **Plugin Android**: versioni decise da Expo al prebuild; con Gradle 8.10.2 si usa un set compatibile e più collaudato su Windows.

## Se il problema persiste

Dopo il reset, se vedi ancora “Cannot query the value of this provider”:

1. Prova un’ulteriore **downgrade di Gradle** in `android/gradle/wrapper/gradle-wrapper.properties`, ad es.:
   - `gradle-8.8-bin.zip` o
   - `gradle-8.6-bin.zip`
2. Valuta le alternative descritte in `docs/ANALISI_BUILD_APK_WINDOWS.md` (EAS, WSL2, ecc.).
