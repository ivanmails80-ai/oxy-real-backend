# Build APK OXY Real – unica strada che funziona su questo PC

Su questo PC la build da **terminale** (PowerShell / `gradlew.bat`) fallisce con l’errore Gradle *"Cannot query the value of this provider"*. È un bug noto con Expo SDK 54 su Windows.

**L’unica strada che funziona è usare Android Studio per creare l’APK.**

---

## Passi (pochi minuti)

### 1. Chiudi Cursor
Chiudi Cursor (e eventualmente altri programmi sulla cartella del progetto) per evitare blocchi sulla cartella `android`.

### 2. Apri il progetto in Android Studio
- **Opzione A:** Doppio clic su **`APRI-ANDROID-STUDIO-PER-BUILD.bat`** (apre Android Studio sulla cartella `android`).
- **Opzione B:** Apri Android Studio → **File** → **Apri** → seleziona la cartella:
  ```
  C:\Users\giuse\Desktop\ivan\AppDelSecolo\android
  ```
  (solo la cartella **android**, non la radice del progetto).

### 3. Sync e build
- Attendi che in basso compaia **"Sync Gradle"** e che finisca senza errori.
- Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
- Attendi il messaggio **"APK(s) generated successfully"**.

### 4. Installa sul telefono
- Collega il telefono con **USB** e attiva **Debug USB** (Impostazioni → Opzioni sviluppatore).
- Doppio clic su **`SOLO-INSTALLA-APK.bat`**.
- Sul telefono apri **OXY Real**.

---

## Riepilogo

| Cosa fare | Azione |
|-----------|--------|
| Creare l’APK | Android Studio → apri cartella `android` → Build → Build APK(s) |
| Installare | Doppio clic su **SOLO-INSTALLA-APK.bat** (telefono collegato, Debug USB attivo) |

L’APK generato si trova in:  
`android\app\build\outputs\apk\release\app-release.apk`

---

*Se in futuro Expo/React Native correggono il bug del Provider, la build da terminale (es. `INSTALLA-APP-SUL-TELEFONO.bat`) potrebbe tornare a funzionare.*
