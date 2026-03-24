@echo off
setlocal
cd /d "%~dp0"

echo ===== RESET TOTALE AMBIENTE BUILD =====
echo.
echo 1) Fermo daemon Gradle (se android esiste)...
if exist "android\gradlew.bat" (
  cd android
  call gradlew.bat --stop
  cd ..
) else (
  echo    Cartella android non presente, skip --stop
)

echo.
echo 2) Eliminazione cartelle (android, node_modules, .gradle)...
if exist ".gradle" (
  rd /s /q ".gradle"
  echo    Rimosso .gradle (root)
)
REM .gradle in home: opzionale (puo fallire per path lunghi su Windows)
if exist "%USERPROFILE%\.gradle" (
  rd /s /q "%USERPROFILE%\.gradle" 2>nul || echo    .gradle home: skip (in uso o path lungo)
)
if exist "node_modules" (
  rd /s /q "node_modules"
  echo    Rimosso node_modules
)
if exist "android" (
  rd /s /q "android"
  echo    Rimosso android
) else (
  echo    android non presente o gia rimosso
)

echo.
echo 3) Reinstallazione dipendenze (npm install)...
call npm install
if errorlevel 1 (
  echo ERRORE: npm install fallito
  pause
  exit /b 1
)

echo.
echo 4) Rigenerazione cartella android (expo prebuild)...
REM Senza --clean: android e gia stato rimosso al passo 2. --clean su Windows puo dare EBUSY (cartella in uso).
call npx expo prebuild -p android
if errorlevel 1 (
  echo.
  echo ERRORE: prebuild fallito. Leggi il messaggio sopra.
  echo Se vedi EBUSY: chiudi Cursor/Explorer, riavvia e riesegui solo da passo 4:
  echo   npx expo prebuild -p android
  echo.
  pause
  exit /b 1
)

echo.
echo 5) Applicazione versioni stabili (Gradle 8.10.2 + keystore)...
REM Gradle piu stabile per Windows (downgrade da 8.14)
powershell -Command "(Get-Content 'android\gradle\wrapper\gradle-wrapper.properties') -replace 'gradle-8\.14\.3-bin', 'gradle-8.10.2-bin' | Set-Content 'android\gradle\wrapper\gradle-wrapper.properties'"

REM Patch build.gradle: fallback a .android\debug.keystore se manca in android\app
powershell -ExecutionPolicy Bypass -File "scripts\patch-android-keystore-fallback.ps1"

REM Copia keystore da home se non esiste in android\app
if not exist "android\app\debug.keystore" (
  if exist "%USERPROFILE%\.android\debug.keystore" (
    copy "%USERPROFILE%\.android\debug.keystore" "android\app\debug.keystore" >nul
    echo    Copiato debug.keystore in android\app
  )
)

echo.
echo ===== RESET COMPLETATO =====
echo.
echo Prossimo passo: build APK
echo   set ANDROID_HOME=%%LOCALAPPDATA%%\Android\Sdk
echo   cd android
echo   gradlew.bat assembleRelease
echo.
pause
