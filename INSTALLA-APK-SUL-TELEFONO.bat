@echo off
title Installa OXY Real sul telefono
cd /d "%~dp0"
echo.
echo  Collega il telefono via USB e abilita Debug USB.
echo  L'APK deve essere gia' stato creato da Android Studio.
echo.
powershell -ExecutionPolicy Bypass -File ".\scripts\installa-apk-sul-telefono.ps1"
echo.
pause
