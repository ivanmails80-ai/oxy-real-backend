@echo off
title Build e installazione OXY Real sul telefono
cd /d "%~dp0"

echo.
echo ========================================
echo  OXY Real - Build e installazione APK
echo ========================================
echo.
echo  1. Collega il telefono al PC con il cavo USB
echo  2. Sul telefono: Impostazioni - Opzioni sviluppatore - Debug USB = ON
echo  3. Se hai Cursor o Android Studio aperti, chiudili (evita errori di build)
echo.
echo  La build richiede 15-25 minuti. Non chiudere questa finestra.
echo  Alla fine l'app si installa da sola sul telefono.
echo ========================================
echo.

REM Con retry: in caso di errore riprova fino a 3 volte, poi installa sul telefono
powershell -ExecutionPolicy Bypass -File ".\scripts\build-install-apk-with-retry.ps1"

echo.
echo ========================================
pause
