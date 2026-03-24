# Installa l'APK release sul telefono (USB, Debug attivo).
# L'APK deve essere gia' stato creato (da Android Studio: Build -> Build APK(s)).
# Uso: dalla cartella del progetto: .\scripts\installa-apk-sul-telefono.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ApkPath = Join-Path $ProjectRoot "android\app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path $ApkPath)) {
    Write-Host "APK non trovato: $ApkPath" -ForegroundColor Red
    Write-Host "Crea prima l'APK da Android Studio: File -> Open -> android -> Build -> Build Bundle(s) / APK(s) -> Build APK(s)" -ForegroundColor Yellow
    exit 1
}

$adb = $null
if (Get-Command adb -ErrorAction SilentlyContinue) { $adb = "adb" }
elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") { $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }
elseif ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) { $adb = "$env:ANDROID_HOME\platform-tools\adb.exe" }
if (-not $adb) {
    Write-Host "adb non trovato. Imposta ANDROID_HOME o aggiungi platform-tools al PATH." -ForegroundColor Red
    exit 1
}

Write-Host "Dispositivi collegati:" -ForegroundColor Cyan
& $adb devices
Write-Host "`nInstallazione APK..." -ForegroundColor Cyan
& $adb install -r $ApkPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installazione fallita. Collega il telefono via USB e abilita Debug USB." -ForegroundColor Red
    exit 1
}
Write-Host "`nOK: App installata. Apri OXY Real sul telefono." -ForegroundColor Green
