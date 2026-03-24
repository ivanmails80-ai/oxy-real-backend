# Come creare l’APK in locale e installarla sul telefono

Istruzione unica per generare l’APK di OXY Real sul tuo PC e installarla sul telefono Android.

---

## L’agente può usare queste istruzioni in autonomia?

**In parte sì.** Ecco cosa può e cosa no.

| Azione | L’agente può farlo da solo? |
|--------|-----------------------------|
| `npm install` | ✅ Sì (da terminale nella cartella del progetto). |
| `npx expo prebuild --platform android --clean` | ✅ Sì (da terminale). |
| Verificare o creare `android\local.properties` | ✅ Sì (lettura/scrittura file). |
| Eseguire `gradlew.bat clean assembleRelease` | ⚠️ Può provarci; su Windows spesso fallisce (errore Gradle “Cannot query the value of this provider”). In quel caso la build va fatta **da te** con Android Studio (Opzione B). |
| **Aprire Android Studio e usare Build → Build APK(s)** | ❌ No (richiede interfaccia grafica e utente). |
| **Collegare il telefono via USB e abilitare Debug USB** | ❌ No (azione fisica tua). |
| `adb install -r ...` | ⚠️ Solo se il telefono è **già collegato e autorizzato** da te e se `adb` è disponibile nel PATH del terminale usato dall’agente. |

**In sintesi:** l’agente può **preparare il progetto** (npm install, prebuild, local.properties) e **tentare** la build da terminale e l’installazione con adb. Tutto ciò che richiede **telefono collegato**, **Android Studio (GUI)** o **autorizzazioni sul dispositivo** deve farlo **tu**.

---

## Prima di iniziare

- **Node.js** e **npm** installati.
- **Android Studio** installato (serve per la build se il comando da terminale fallisce).
- **Android SDK** (viene con Android Studio; percorso tipico: `C:\Users\TUO_USER\AppData\Local\Android\Sdk`).
- **Telefono Android** con **Debug USB** attivo:  
  Impostazioni → Opzioni sviluppatore → **Debug USB = ON**.
- **Cavo USB** per collegare il telefono al PC.

---

## Passo 0 — Preparazione (la prima volta o dopo aver cambiato dipendenze)

Apri un terminale (PowerShell o CMD) nella cartella del progetto:

```text
cd c:\Users\giuse\Desktop\ivan\AppDelSecolo
```

1. **Installa le dipendenze:**
   ```text
   npm install
   ```

2. **Rigenera la cartella Android** (obbligatorio dopo modifiche a plugin Expo o pacchetti nativi):
   ```text
   npx expo prebuild --platform android --clean
   ```
   Se compare "EBUSY" o "resource busy", chiudi Cursor e Android Studio e riprova.

3. **Controlla `android\local.properties`**  
   Deve contenere una riga tipo (adatta il percorso al tuo utente Windows):
   ```text
   sdk.dir=C\:\\Users\\giuse\\AppData\\Local\\Android\\Sdk
   ```
   Se il file non c’è dopo il prebuild, crealo con quel contenuto.

---

## Passo 1 — Creare l’APK

### Opzione A — Doppio clic (consigliata per provare per prima)

1. Collega il telefono al PC con il cavo USB e abilita **Debug USB** sul telefono.
2. Chiudi Cursor e Android Studio (per evitare blocchi sulla cartella `android`).
3. Nella cartella del progetto fai **doppio clic** su:
   ```text
   INSTALLA-APP-SUL-TELEFONO.bat
   ```
   Lo script esegue la build (15–25 minuti) e, se va a buon fine, installa l’app sul telefono.

**Se la build fallisce** con un errore tipo *"Cannot query the value of this provider"* (Gradle), usa l’**Opzione B**.

---

### Opzione B — Build da Android Studio (se Opzione A fallisce)

Su Windows a volte la build da terminale (Gradle) fallisce; in quel caso si usa Android Studio.

1. Chiudi Cursor e altri programmi che usano la cartella del progetto.
2. Apri **Android Studio** → **File** → **Apri** → seleziona **solo** la cartella:
   ```text
   c:\Users\giuse\Desktop\ivan\AppDelSecolo\android
   ```
3. Attendi il **sync Gradle** (barra in basso). Se chiede di installare componenti (es. SDK Platform 36), accetta.
4. Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
5. Attendi "APK(s) generated successfully". L’APK si trova in:
   ```text
   android\app\build\outputs\apk\release\app-release.apk
   ```

---

## Passo 2 — Installare l’APK sul telefono

### Se hai usato l’Opzione A (bat)

L’installazione viene fatta automaticamente dallo script. Sul telefono apri **OXY Real**.

### Se hai usato l’Opzione B (Android Studio)

1. Collega il telefono via USB con **Debug USB** attivo.
2. Apri un terminale nella cartella del progetto:
   ```text
   cd c:\Users\giuse\Desktop\ivan\AppDelSecolo
   adb install -r android\app\build\outputs\apk\release\app-release.apk
   ```
   Se `adb` non è riconosciuto, usa il percorso completo:
   ```text
   "C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r "c:\Users\giuse\Desktop\ivan\AppDelSecolo\android\app\build\outputs\apk\release\app-release.apk"
   ```
   (adatta i percorsi al tuo utente e alla tua cartella).

3. Sul telefono apri **OXY Real**.

---

## Riepilogo veloce

| Cosa fare | Comando / azione |
|-----------|-------------------|
| Preparazione (prima volta) | `npm install` → `npx expo prebuild --platform android --clean` → verificare `android\local.properties` |
| Build + install in un clic | Doppio clic su **INSTALLA-APP-SUL-TELEFONO.bat** (telefono collegato, Debug USB ON) |
| Se il bat fallisce | Build da **Android Studio** (apri cartella `android` → Build → Build APK(s)) |
| Solo installazione (APK già pronto) | `adb install -r android\app\build\outputs\apk\release\app-release.apk` |

---

## Problemi comuni

- **"adb non è riconosciuto"**  
  Aggiungi al PATH la cartella `platform-tools` dell’SDK (es. `C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools`), oppure usa il percorso completo a `adb.exe` come sopra.

- **"device unauthorized" o telefono non visto**  
  Sul telefono deve apparire "Consenti debug USB?": accetta e spunta "Sempre da questo computer". Poi nel terminale: `adb kill-server` e `adb start-server`, quindi riprova.

- **Build fallita con errore Gradle** (es. *"Cannot query the value of this provider"* su `react-native-safe-area-context` o `:app:compileReleaseJavaWithJavac`)  
  Su Windows è un bug noto con build da terminale. Usa l’**Opzione B** (Android Studio). In alternativa: **EAS Build** in cloud: `npx eas build --platform android --profile preview` (scarichi l’APK dal link che EAS ti manda; richiede account Expo).

---

*Percorsi riferiti all’utente `giuse`; adattali al tuo PC se necessario.*
