@echo off
title Apri Android Studio per build APK OXY Real
cd /d "%~dp0"

set STUDIO="C:\Program Files\Android\Android Studio\bin\studio64.exe"
if not exist %STUDIO% (
    echo Android Studio non trovato. Apri Android Studio manualmente.
    echo Poi: File -^> Apri -^> seleziona la cartella: %CD%\android
    pause
    exit /b 0
)

echo Apertura Android Studio con il progetto android...
echo.
echo Quando si e' aperto:
echo   1. Attendi "Sync Gradle" (barra in basso)
echo   2. Menu Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo   3. Attendi "APK(s) generated successfully"
echo   4. Esegui SOLO-INSTALLA-APK.bat per installare sul telefono
echo.
start "" %STUDIO% "%CD%\android"
exit /b 0
