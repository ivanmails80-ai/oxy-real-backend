# Build APK in locale e installazione

## In autonomia (consigliato)

1. **Collega il telefono** via USB e abilita **Debug USB** (Impostazioni → Opzioni sviluppatore).
2. **Doppio clic** su **`INSTALLA-APP-SUL-TELEFONO.bat`**.
   - Se l’APK esiste già (es. creato con Android Studio), lo script **installa subito** e termina.
   - Altrimenti avvia la build Gradle (15–25 min). Se va a buon fine, installa l’APK.

## Se la build da terminale fallisce

Su Windows la build da riga di comando può fallire con errore tipo *"Cannot query the value of this provider"* (Gradle).

**Soluzione:**

1. Chiudi Cursor (e eventualmente Android Studio).
2. Apri **Android Studio** → **File** → **Apri** → seleziona **solo** la cartella `android` del progetto (es. `...\AppDelSecolo\android`).
3. Attendi il sync Gradle, poi **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.
4. Quando l’APK è pronto, fai di nuovo doppio clic su **`INSTALLA-APP-SUL-TELEFONO.bat`**: lo script troverà l’APK e lo installerà sul telefono.

In alternativa, dopo aver creato l’APK con Android Studio puoi usare **`SOLO-INSTALLA-APK.bat`** per installare senza rifare la build.

## Configurazione attuale

- **New Architecture** è disabilitata in `android/gradle.properties` (`newArchEnabled=false`) per permettere la build locale su Windows. Per EAS/cloud puoi riattivarla.
- **Patch** su `react-native-safe-area-context` e (se presenti) su `@react-native-async-storage/async-storage` vengono riapplicate con `npm run postinstall` (patch-package).

## Comandi utili

| Azione              | Comando / file                                      |
|---------------------|------------------------------------------------------|
| Build + install     | Doppio clic su `INSTALLA-APP-SUL-TELEFONO.bat`      |
| Solo installazione  | Doppio clic su `SOLO-INSTALLA-APK.bat` (APK già pronto) |
| Build da Android Studio | Apri cartella `android` → Build → Build APK(s)   |
