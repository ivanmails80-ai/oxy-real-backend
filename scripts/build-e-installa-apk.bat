@echo off
REM Build APK release e installazione sul telefono (stesso comportamento di build-and-install-apk.ps1)
REM Esegui dalla cartella del progetto: scripts\build-e-installa-apk.bat
cd /d "%~dp0.."
if not exist "android\gradlew.bat" (
    echo ERRORE: cartella android non trovata. Esegui prima: npx expo prebuild --platform android --clean
    exit /b 1
)
echo === Build APK release ===
cd android
call gradlew.bat clean assembleRelease
if errorlevel 1 (
    echo Build fallita.
    cd ..
    exit /b 1
)
cd ..
if not exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo APK non trovato.
    exit /b 1
)
echo.
echo === Installazione sul dispositivo ===
adb install -r android\app\build\outputs\apk\release\app-release.apk
if errorlevel 1 (
    echo Installazione fallita. Collega il telefono via USB e abilita Debug USB.
    exit /b 1
)
echo.
echo OK: App installata. Apri OXY Real sul telefono.
