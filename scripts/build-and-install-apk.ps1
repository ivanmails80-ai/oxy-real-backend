# Build APK release e installazione sul dispositivo collegato via USB
# Se l'APK esiste gia' (es. creato con Android Studio), installa subito senza rifare la build.

$ErrorActionPreference = "Stop"
if (-not $env:ANDROID_HOME) {
    $lp = Join-Path $PSScriptRoot "..\android\local.properties"
    if (Test-Path $lp) {
        $content = Get-Content $lp -Raw
        if ($content -match 'sdk\.dir=(.+)') {
            $env:ANDROID_HOME = $matches[1].Replace('\\', '\').Trim()
        }
    }
    if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
}
$env:GRADLE_USER_HOME = "C:\g"
if (-not (Test-Path $env:GRADLE_USER_HOME)) { New-Item -ItemType Directory -Path $env:GRADLE_USER_HOME -Force | Out-Null }
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = (Resolve-Path ".").Path }
$AndroidDir = Join-Path $ProjectRoot "android"
if (-not (Test-Path (Join-Path $AndroidDir "gradlew.bat"))) {
    $ParentRoot = Split-Path -Parent $ProjectRoot
    $AndroidDirAlt = Join-Path $ParentRoot "android"
    if (Test-Path (Join-Path $AndroidDirAlt "gradlew.bat")) { $AndroidDir = $AndroidDirAlt }
}
$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"

$adb = $null
if (Get-Command adb -ErrorAction SilentlyContinue) { $adb = "adb" }
elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") { $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }
elseif ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) { $adb = "$env:ANDROID_HOME\platform-tools\adb.exe" }
if (-not $adb) {
    Write-Host "ERRORE: adb non trovato. Imposta ANDROID_HOME o aggiungi platform-tools al PATH." -ForegroundColor Red
    exit 1
}

# Se l'APK esiste gia', installa e esci (utente puo' averlo creato con Android Studio)
if (Test-Path $ApkPath) {
    Write-Host "APK trovato. Installazione sul telefono..." -ForegroundColor Green
    & $adb install -r $ApkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: OXY Real installata. Apri l'app sul telefono." -ForegroundColor Green
        Set-Location $ProjectRoot
        exit 0
    }
    Write-Host "Installazione fallita. Collega il telefono con Debug USB attivo." -ForegroundColor Red
    exit 1
}

# Altrimenti: build da Gradle
Write-Host "=== Preflight (opzionale) ===" -ForegroundColor Cyan
Set-Location $ProjectRoot
$preflight = Join-Path $ProjectRoot "scripts\preflight-google-release.js"
if (Test-Path $preflight) { node $preflight 2>$null }

Set-Location $AndroidDir
Write-Host "`n=== Build APK release (15-25 min) ===" -ForegroundColor Cyan
& .\gradlew.bat clean assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n*** Build da terminale fallita ***" -ForegroundColor Red
    Write-Host "Su Windows spesso Gradle da riga di comando da errore 'Cannot query the value of this provider'." -ForegroundColor Yellow
    Write-Host "`nFai cosi':" -ForegroundColor White
    Write-Host "  1. Chiudi Cursor." -ForegroundColor White
    Write-Host "  2. Apri Android Studio -> File -> Apri -> seleziona la cartella:" -ForegroundColor White
    Write-Host "     $AndroidDir" -ForegroundColor Cyan
    Write-Host "  3. Attendi il sync Gradle, poi: Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor White
    Write-Host "  4. Quando l'APK e' pronto, esegui di nuovo questo script (doppio clic su INSTALLA-APP-SUL-TELEFONO.bat): installera' l'APK sul telefono." -ForegroundColor White
    Set-Location $ProjectRoot
    exit 1
}

if (-not (Test-Path $ApkPath)) {
    Write-Host "APK non generato in: $ApkPath" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}

Write-Host "`n=== Installazione sul telefono ===" -ForegroundColor Cyan
& $adb install -r $ApkPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installazione fallita. Collega il telefono con cavo USB e Debug USB = ON." -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}
Write-Host "`nOK: OXY Real installata. Apri l'app sul telefono." -ForegroundColor Green
Set-Location $ProjectRoot
