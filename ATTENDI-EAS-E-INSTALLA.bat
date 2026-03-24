@echo off
cd /d "%~dp0"
echo Collega il telefono con USB debugging attivo.
echo Lo script attende la build EAS, poi scarica e installa l'APK.
echo.
powershell -ExecutionPolicy Bypass -File ".\scripts\attendi-eas-e-installa.ps1"
pause
