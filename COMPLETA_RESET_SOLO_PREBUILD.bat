@echo off
cd /d "%~dp0"

echo Completamento reset: solo prebuild + patch (android gia rimosso, npm install gia eseguito)
echo.
echo 1) Chiudi Cursor e qualsiasi finestra su questa cartella, poi premi un tasto qui.
pause

echo.
echo 2) Rimozione eventuale cartella android (se presente)...
if exist "android" (
  rd /s /q "android" 2>nul
  if exist "android" (
    echo    Impossibile rimuovere android (in uso). Chiudi tutto e riesegui, oppure riavvia il PC.
    pause
    exit /b 1
  )
)
echo 3) Rigenerazione android...
call npx expo prebuild -p android
if errorlevel 1 (
  echo.
  echo Prebuild fallito. Se vedi EBUSY, riavvia il PC e riesegui questo file.
  pause
  exit /b 1
)

echo.
echo 4) Gradle 8.10.2 e keystore...
powershell -Command "(Get-Content 'android\gradle\wrapper\gradle-wrapper.properties') -replace 'gradle-8\.14\.3-bin', 'gradle-8.10.2-bin' | Set-Content 'android\gradle\wrapper\gradle-wrapper.properties'"
powershell -ExecutionPolicy Bypass -File "scripts\patch-android-keystore-fallback.ps1"
if not exist "android\app\debug.keystore" if exist "%USERPROFILE%\.android\debug.keystore" copy "%USERPROFILE%\.android\debug.keystore" "android\app\debug.keystore" >nul

echo.
echo Fatto. Build APK: set ANDROID_HOME=%%LOCALAPPDATA%%\Android\Sdk  ^&^&  cd android  ^&^&  gradlew.bat assembleRelease
pause
