# Installa l'APK release sul telefono se esiste (dopo che la build e' completata).
# Uso: dalla cartella AppDelSecolo: powershell -ExecutionPolicy Bypass -File .\scripts\install-apk-if-ready.ps1

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ApkPath = Join-Path $ProjectRoot "android\app\build\outputs\apk\release\app-release.apk"

$adb = $null
if (Get-Command adb -ErrorAction SilentlyContinue) { $adb = "adb" }
elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") { $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }
elseif ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) { $adb = "$env:ANDROID_HOME\platform-tools\adb.exe" }

if (-not $adb) {
    Write-Host "ERRORE: adb non trovato. Aggiungi Android SDK platform-tools al PATH." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ApkPath)) {
    Write-Host "APK non trovato. Attendi che la build termini (BUILD SUCCESSFUL), poi rilancia questo script." -ForegroundColor Yellow
    Write-Host "Percorso atteso: $ApkPath" -ForegroundColor Gray
    exit 1
}

Write-Host "APK trovato. Dispositivi collegati:" -ForegroundColor Cyan
& $adb devices
Write-Host "`nInstallazione in corso..." -ForegroundColor Cyan
& $adb install -r $ApkPath
if ($LASTEXITCODE -eq 0) {
    Write-Host "`nOK: App installata. Apri OXY Real sul telefono." -ForegroundColor Green
} else {
    Write-Host "`nInstallazione fallita. Collega il telefono con Debug USB attivo e riprova." -ForegroundColor Red
    exit 1
}
