@echo off
title Monitora build EAS e installa su telefono
cd /d "%~dp0"
echo.
echo Controllo ogni 5 minuti la build EAS; al completamento scarico l'APK e installo sul telefono.
echo Tieni il telefono collegato con Debug USB attivo.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File ".\scripts\wait-eas-build-and-install.ps1"
pause
