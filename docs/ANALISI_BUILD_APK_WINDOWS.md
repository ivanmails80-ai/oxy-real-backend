# Analisi: perché la build APK fallisce su Windows (e cosa fare)

## Il problema non è “il comando sbagliato”

L’errore che vedi è:

```text
Could not determine the dependencies of task ':expo:compileReleaseJavaWithJavac'.
> Cannot query the value of this provider because it has no value available.
```

Non è un comando errato o una variabile d’ambiente mancante. È un **problema di architettura** della build Gradle con Expo/React Native su Windows.

---

## Cosa succede davvero (in breve)

1. **Composite build**  
   In `android/settings.gradle` viene usato `includeBuild(...)` per il React Native Gradle Plugin. Quel build “incluso” non solo fornisce il plugin, ma **sostituisce** la dipendenza `com.facebook.react:react-android` con un suo output.

2. **Provider lazy**  
   In Gradle molti valori sono “Provider”: non hanno un valore subito, ma solo quando servono (es. dopo che un task è stato configurato o eseguito). L’output del composite build che sostituisce `react-android` è legato a uno di questi Provider.

3. **Ordine di configurazione**  
   Per calcolare le dipendenze di `:expo:compileReleaseJavaWithJavac`, Gradle deve risolvere la classpath di `:expo`. In quel momento chiede al composite build “dov’è react-android?”. Su Windows l’ordine in cui i progetti vengono configurati può far sì che quel Provider **non sia ancora valorizzato**, quindi Gradle non può “leggerlo” e fallisce con “has no value available”.

4. **Perché su Windows**  
   L’ordine di configurazione può cambiare tra OS (e tra versioni di Gradle). Su macOS/Linux la stessa build spesso funziona; su Windows si vede questo errore. È un problema noto in vari issue Expo/Gradle.

Quindi: **il problema è l’ordine tra composite build (e i suoi Provider) e il progetto :expo su Windows**, non un singolo comando.

---

## Cosa è stato già provato (e perché non basta)

- **Keystore**: creato e configurato correttamente.
- **evaluationDependsOn(':app')**: :expo viene configurato dopo :app, ma il Provider che manca è **dentro** il composite build, non in :app.
- **AAR locale** in `expo/android/build.gradle`: :expo usa già `files(reactAndroidAar)` quando il file esiste; il problema è che un’altra parte della risoluzione (il composite build) viene comunque interrogata e lì il Provider non è pronto.
- **Maven locale per react-android**: messo per primo nei repository; il composite build ha la precedenza nella sostituzione, quindi Gradle continua a usare il suo output (Provider).
- **Rimozione del secondo `includeBuild`**: senza quel `includeBuild` non si risolvono le versioni dei plugin (es. `com.android.tools.build:gradle`, `react-native-gradle-plugin`) e la build fallisce per “Could not find ... :.”.
- **--no-parallel / --no-configuration-cache**: ordine più lineare, ma il Provider nel composite build resta non valorizzato quando serve a :expo.

Quindi: **non è che manca un comando “giusto”; è che su questo stack (Expo 54 + RN 0.81 + Gradle 8.14 + Windows) la combinazione composite build + Provider + ordine non è risolta**.

---

## Cosa puoi fare in pratica (opzioni reali)

### 1. **Un build EAS in cloud (consigliato per avere l’APK subito)**  
- **Cosa**: usare **un solo** dei 5 build gratuiti EAS per generare l’APK Android.  
- **Perché ha senso**: la build gira sui server Expo (Linux), dove questo bug di ordine non si presenta. In pochi minuti hai un APK installabile e puoi iniziare i beta test.  
- **Come**: da progetto: `npx eas build --platform android --profile preview` (o il profile che usi). Poi scarichi l’APK e lo installi sul telefono.  
- I restanti build gratuiti li tieni per quando l’app sarà “perfetta”.

### 2. **Build da WSL2 (Linux su Windows)**  
- **Cosa**: installare WSL2, aprire il progetto da dentro Linux (es. `cd /mnt/c/Users/.../AppDelSecolo`) e lanciare la build da lì (`npx expo run:android --variant release` o `./gradlew assembleRelease`).  
- **Perché può funzionare**: su Linux l’ordine di configurazione Gradle è spesso quello per cui il Provider è già valorizzato quando :expo lo richiede.  
- **Requisiti**: WSL2 attivo, Node/Java/Android SDK installati nell’ambiente WSL (o PATH che punta a quelli di Windows, a seconda di come preferisci configurarlo).

### 3. **Prebuild pulito (solo se hai chiuso tutto)**  
- **Cosa**: chiudere Android Studio, fermare i daemon Gradle (`gradlew --stop`), eventualmente riavviare il PC. Poi:  
  `npx expo prebuild -p android --clean`  
  e dopo:  
  `cd android && .\gradlew.bat assembleRelease` (con ANDROID_HOME impostato).  
- **Perché può aiutare**: a volte una cartella `android` rigenerata da zero (e nessun processo che la blocca) ha un ordine di inclusione leggermente diverso e la build può passare. Non è garantito che risolva il Provider su Windows, ma vale un tentativo.

### 4. **Segnalare a Expo**  
- Aprire un issue su [expo/expo](https://github.com/expo/expo/issues) con:  
  - messaggio di errore completo;  
  - `expo doctor` e versioni (Expo, RN, Node, sistema “Windows”);  
  - nota che su Windows con `assembleRelease` si ottiene “Cannot query the value of this provider” in `:expo:compileReleaseJavaWithJavac` e che su altri OS spesso la build va a buon fine.  
- Aiuta il progetto e, in futuro, potrebbe uscire un fix ufficiale per Windows.

---

## Conclusione

- **Problema**: build APK in locale su Windows fallisce per un **bug di ordine** tra composite build (React Native) e progetto :expo (Provider non valorizzato).  
- **Non è** un errore di comando o di configurazione singola che si risolve con “il comando giusto”.  
- **Strade utili**:  
  1) **Un build EAS** per avere subito l’APK e i beta test;  
  2) **WSL2** per provare la build locale in ambiente Linux;  
  3) **Prebuild --clean** (dopo aver chiuso tutto) per un tentativo “pulito”;  
  4) **Issue a Expo** per dare visibilità al problema su Windows.

I file del progetto (keystore, Maven locale, `evaluationDependsOn`, patch in `expo/android/build.gradle`) restano utili per quando la build locale funzionerà (es. su WSL o dopo un fix Expo) e non vanno considerati “sbagliati”: il collo di bottiglia è l’ordine del Provider nel composite build su Windows.
