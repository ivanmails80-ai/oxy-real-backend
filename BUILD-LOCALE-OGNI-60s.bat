@echo off
title Build locale APK ogni 60s e installa
cd /d "%~dp0"
echo.
echo Build APK in locale (controllo ogni 60 secondi). Quando la build riesce, installo sul telefono.
echo Tieni il telefono collegato con Debug USB attivo.
echo.
echo Se la build da terminale fallisce sempre, apri Android Studio, cartella android, Build - Build APK.
echo Poi rilancia questo script: installera' l'APK.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File ".\scripts\build-locale-e-installa-ogni-60s.ps1"
pause
