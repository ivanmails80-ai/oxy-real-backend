# Verifica che l'APK esista e sia valido, poi installa sul telefono via ADB.
# Uso: dopo aver generato l'APK (Android Studio: Build -> Build APK(s)), esegui questo script.

$ErrorActionPreference = "Stop"
$apkPath = Join-Path $PSScriptRoot "..\android\app\build\outputs\apk\release\app-release.apk"
$adbPath = "C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $apkPath)) {
    Write-Host "APK non trovato: $apkPath" -ForegroundColor Red
    Write-Host "Genera prima l'APK da Android Studio (Build -> Build Bundle(s) / APK(s) -> Build APK(s))." -ForegroundColor Yellow
    exit 1
}

$size = (Get-Item $apkPath).Length
$sizeMB = [math]::Round($size / 1MB, 2)
if ($size -lt 1000000) {
    Write-Host "APK troppo piccolo ($sizeMB MB): potrebbe essere incompleto o corrotto." -ForegroundColor Yellow
}
Write-Host "APK trovato: $apkPath ($sizeMB MB)" -ForegroundColor Green

if (-not (Test-Path $adbPath)) {
    Write-Host "adb non trovato: $adbPath" -ForegroundColor Red
    exit 1
}

$devices = & $adbPath devices
if ($devices -notmatch "device$") {
    Write-Host "Nessun dispositivo collegato. Collega il telefono con Debug USB attivo." -ForegroundColor Red
    exit 1
}
Write-Host "Dispositivo rilevato. Installazione in corso..." -ForegroundColor Cyan
& $adbPath install -r $apkPath
if ($LASTEXITCODE -eq 0) {
    Write-Host "Installazione completata." -ForegroundColor Green
} else {
    Write-Host "Installazione fallita (codice $LASTEXITCODE)." -ForegroundColor Red
    exit 1
}
