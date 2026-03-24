@echo off
REM Build APK in locale (senza EAS) e installa sul telefono via USB.
REM Prerequisiti: JDK, Android SDK, telefono con USB debugging attivo e connesso.

set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
if not exist "%ANDROID_HOME%" (
  echo ERRORE: Android SDK non trovato in %ANDROID_HOME%
  pause
  exit /b 1
)

cd /d "%~dp0"
echo === Build APK release in corso (puo richiedere 5-10 minuti) ===
cd android
call gradlew.bat assembleRelease
if errorlevel 1 (
  echo BUILD FALLITA. Controlla i messaggi sopra.
  cd ..
  pause
  exit /b 1
)
cd ..

set APK=android\app\build\outputs\apk\release\app-release.apk
if not exist "%APK%" (
  echo ERRORE: APK non trovata in %APK%
  pause
  exit /b 1
)

echo.
echo === Installazione sul telefono ===
"%ANDROID_HOME%\platform-tools\adb.exe" devices
"%ANDROID_HOME%\platform-tools\adb.exe" install -r "%APK%"
if errorlevel 1 (
  echo.
  echo Installazione fallita. Verifica:
  echo - Telefono connesso via USB
  echo - Opzioni sviluppatore attivate, USB debugging ON
  echo - Autorizza il computer sul telefono se richiesto
  pause
  exit /b 1
)

echo.
echo OK: App installata. Apri "OXY Real" sul telefono.
pause
