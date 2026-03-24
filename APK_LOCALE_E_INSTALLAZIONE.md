# APK in locale e installazione sul telefono

**Obiettivo:** creare l’APK sul tuo PC (senza usare EAS/servizi esterni) e installarla sul telefono via USB.

## Cosa è stato fatto (6 marzo)

1. **Configurazione**
   - Aggiunto `babel.config.js` nella root (mancava; richiesto da Expo per la build).
   - Configurato il **keystore** per la firma: creato `%USERPROFILE%\.android\debug.keystore` e aggiornato `android/app/build.gradle` per usare prima `android/app/debug.keystore` e, se assente, il keystore in `.android` (così la build funziona anche dopo un clone pulito).

2. **Build locale**
   - Comando usato: da cartella `android` eseguire  
     `gradlew.bat assembleRelease`  
     con `ANDROID_HOME` impostato (es. `%LOCALAPPDATA%\Android\Sdk`).
   - L’APK di release viene generata in:  
     `android\app\build\outputs\apk\release\app-release.apk`

3. **Script unico**
   - **`BUILD-E-INSTALLA-APK-LOCALE.bat`** (nella root del progetto): imposta `ANDROID_HOME`, lancia la build e, se va a buon fine, installa l’APK sul telefono con `adb install -r`.

## Come usarlo

1. **Prerequisiti**
   - JDK installato (es. Eclipse Adoptium).
   - Android SDK (es. in `%LOCALAPPDATA%\Android\Sdk`) con platform-tools (per `adb`).
   - Telefono Android con **Opzioni sviluppatore** attivate e **Debug USB** abilitato, connesso via USB.

2. **Build + installazione**
   - Doppio clic su **`BUILD-E-INSTALLA-APK-LOCALE.bat`** (oppure eseguilo da terminale dalla root del progetto).
   - La prima build può richiedere 5–10 minuti.
   - Se tutto va bene, l’app viene installata e puoi aprire **OXY Real** sul telefono.

3. **Solo installazione** (se l’APK è già stata creata)
   - Apri un terminale nella root del progetto e lancia:
     ```bat
     set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
     "%ANDROID_HOME%\platform-tools\adb.exe" install -r android\app\build\outputs\apk\release\app-release.apk
     ```

## Se la build fallisce

- **ANDROID_HOME non impostato**  
  Imposta prima di lanciare Gradle, es.:  
  `set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`

- **Errore di firma / keystore**  
  Verifica che esista uno di:
  - `android\app\debug.keystore`, oppure  
  - `%USERPROFILE%\.android\debug.keystore`  
  (lo script di build usa il secondo se il primo non c’è.)

- **Gradle / SDK**  
  Controlla che Android SDK e JDK siano installati e che in `android\` il comando `gradlew.bat assembleRelease` mostri l’errore preciso; spesso indica un path SDK errato o una versione Gradle/AGP incompatibile.

## Se l’app si installa ma va in crash all’avvio

- **Firebase / backend**  
  L’app usa Firebase (config in `app.json` → `extra.firebase`) e il backend (default: `https://oxy-real-backend.onrender.com`; override con `.env` → `EXPO_PUBLIC_BACKEND_URL`).  
  Per la build, i valori in `app.json` sono inclusi nell’APK; un eventuale `.env` serve per sovrascrivere in sviluppo. Se backend o Firebase non sono raggiungibili (rete, server spento), l’app può dare errori o messaggi di “non connesso” ma non necessariamente crash: dipende da come sono gestiti gli errori nei punti in cui si chiamano.

- **Controlli utili**
  - Verifica che il backend risponda (es. da browser o da un altro dispositivo sulla stessa rete).
  - Controlla che in Firebase Console il progetto e le chiavi siano corretti e che l’app sia configurata (package `com.oxyreal.app` per Android).

## Riepilogo percorsi

| Cosa              | Dove |
|-------------------|------|
| Script build+install | `BUILD-E-INSTALLA-APK-LOCALE.bat` |
| APK release       | `android\app\build\outputs\apk\release\app-release.apk` |
| Keystore (fallback) | `%USERPROFILE%\.android\debug.keystore` |
