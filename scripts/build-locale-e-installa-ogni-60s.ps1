# Build APK in locale ogni 60 secondi finche' non riesce, poi installa sul telefono.
# NON usa EAS (quota esaurita). Solo build locale (gradlew) o APK gia' presente.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\build-locale-e-installa-ogni-60s.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CheckIntervalSeconds = 60
$MaxFailuresBeforeHint = 3

# Android
if (-not $env:ANDROID_HOME) {
    $lp = Join-Path $ProjectRoot "android\local.properties"
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

$AndroidDir = Join-Path $ProjectRoot "android"
if (-not (Test-Path (Join-Path $AndroidDir "gradlew.bat"))) {
    $AndroidDir = Join-Path (Split-Path -Parent $ProjectRoot) "android"
}
$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"

# adb
$adb = $null
if (Get-Command adb -ErrorAction SilentlyContinue) { $adb = "adb" }
elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") { $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }
elseif ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) { $adb = "$env:ANDROID_HOME\platform-tools\adb.exe" }
if (-not $adb) {
    Write-Host "ERRORE: adb non trovato. Imposta ANDROID_HOME o aggiungi platform-tools al PATH." -ForegroundColor Red
    exit 1
}

Write-Host "=== Build APK in locale e installazione (controllo ogni $CheckIntervalSeconds secondi) ===" -ForegroundColor Cyan
Write-Host "Telefono collegato con Debug USB attivo." -ForegroundColor Gray
Write-Host ""

$failureCount = 0
$attempt = 0

while ($true) {
    $attempt++
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] Tentativo $attempt - " -NoNewline

    # Se l'APK esiste gia' (es. creato con Android Studio), installa e esci
    if (Test-Path $ApkPath) {
        Write-Host "APK trovato. Installazione su dispositivo..." -ForegroundColor Green
        & $adb install -r $ApkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nOK: OXY Real installata. Apri l'app sul telefono." -ForegroundColor Green
            exit 0
        }
        Write-Host "Installazione fallita. Riprovo tra $CheckIntervalSeconds s." -ForegroundColor Yellow
        Start-Sleep -Seconds $CheckIntervalSeconds
        continue
    }

    # Altrimenti tenta build
    Write-Host "avvio build locale..." -ForegroundColor Cyan
    Push-Location $AndroidDir
    & .\gradlew.bat assembleRelease
    $buildOk = ($LASTEXITCODE -eq 0)
    Pop-Location

    if ($buildOk -and (Test-Path $ApkPath)) {
        Write-Host "  Build riuscita. Installazione..." -ForegroundColor Green
        & $adb install -r $ApkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nOK: OXY Real installata. Apri l'app sul telefono." -ForegroundColor Green
            exit 0
        }
    } else {
        $failureCount++
        Write-Host "  Build fallita (o APK non generato)." -ForegroundColor Yellow
        if ($failureCount -ge $MaxFailuresBeforeHint) {
            Write-Host "`n--- Se la build da terminale continua a fallire (errore Gradle 'provider') ---" -ForegroundColor Yellow
            Write-Host "1. Apri Android Studio" -ForegroundColor White
            Write-Host "2. File -> Apri -> seleziona la cartella: $AndroidDir" -ForegroundColor White
            Write-Host "3. Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor White
            Write-Host "4. Quando e' pronto, rilancia questo script: installera' l'APK dal percorso standard." -ForegroundColor White
            Write-Host "---" -ForegroundColor Yellow
        }
    }

    Write-Host "  Prossimo tentativo tra $CheckIntervalSeconds secondi." -ForegroundColor Gray
    Start-Sleep -Seconds $CheckIntervalSeconds
}
