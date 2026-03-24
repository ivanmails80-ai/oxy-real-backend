@echo off
title Installa APK OXY Real (solo installazione)
cd /d "%~dp0"

set APK=android\app\build\outputs\apk\release\app-release.apk
if not exist "%APK%" (
    echo.
    echo APK non trovato: %APK%
    echo Prima crea l'APK con Android Studio: Apri cartella "android" -^> Build -^> Build APK(s)
    echo oppure esegui INSTALLA-APP-SUL-TELEFONO.bat per build + installazione.
    echo.
    pause
    exit /b 1
)

echo Installazione APK sul telefono...
set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
if not exist "%ADB%" set ADB=adb
"%ADB%" install -r "%APK%"
if %ERRORLEVEL% neq 0 (
    echo Collega il telefono con USB e abilita Debug USB.
    pause
    exit /b 1
)
echo OK: OXY Real installata. Apri l'app sul telefono.
pause
