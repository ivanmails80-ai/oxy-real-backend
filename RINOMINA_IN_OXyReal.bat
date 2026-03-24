@echo off
title Rinomina in OxyReal
cd /d "c:\Users\giuse\Desktop\ivan"
if not exist "AppDelSecolo" (
  echo Cartella AppDelSecolo non trovata (gia rinominata?).
  pause
  exit /b 0
)
if exist "OxyReal" (
  echo Esiste gia una cartella OxyReal. Eliminala o rinominala prima.
  pause
  exit /b 1
)
echo Chiudi Cursor e tutti i programmi che usano la cartella AppDelSecolo.
echo Poi premi un tasto per rinominare AppDelSecolo in OxyReal.
pause >nul
ren "AppDelSecolo" "OxyReal"
if errorlevel 1 (
  echo Errore. Prova: tasto destro - Esegui come amministratore.
) else (
  echo Fatto. La cartella ora si chiama OxyReal.
  echo Riapri Cursor su: c:\Users\giuse\Desktop\ivan\OxyReal
)
pause
