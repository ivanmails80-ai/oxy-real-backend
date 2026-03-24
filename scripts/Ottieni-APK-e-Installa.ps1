# Cerca un APK (locale o EAS) e lo installa sul telefono. Se non trova nulla, mostra le istruzioni.
# Uso: dalla root del progetto: .\scripts\Ottieni-APK-e-Installa.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ApkLocal = Join-Path $ProjectRoot "android\app\build\outputs\apk\release\app-release.apk"
$ApkEas = Join-Path $ProjectRoot "app-eas.apk"
$adbPath = "C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe"

$apkToInstall = $null
if (Test-Path $ApkLocal) {
    $apkToInstall = $ApkLocal
    Write-Host "Trovato APK da build locale: $ApkLocal" -ForegroundColor Green
} elseif (Test-Path $ApkEas) {
    $apkToInstall = $ApkEas
    Write-Host "Trovato APK EAS: $ApkEas" -ForegroundColor Green
}

if ($apkToInstall) {
    if (-not (Test-Path $adbPath)) {
        Write-Host "adb non trovato. Installa l'APK manualmente: $apkToInstall" -ForegroundColor Yellow
        exit 0
    }
    $devices = & $adbPath devices 2>&1
    if ($devices -notmatch "device$") {
        Write-Host "Collega il telefono con Debug USB attivo. APK pronto: $apkToInstall" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Installazione in corso..." -ForegroundColor Cyan
    & $adbPath install -r $apkToInstall
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Installazione completata. Apri OXY Real sul telefono." -ForegroundColor Green
    } else {
        Write-Host "Installazione fallita (codice $LASTEXITCODE)." -ForegroundColor Red
        exit 1
    }
    exit 0
}

# Nessun APK trovato: istruzioni
Write-Host ""
Write-Host "Nessun APK trovato." -ForegroundColor Yellow
Write-Host ""
Write-Host "Per avere l'APK:" -ForegroundColor Cyan
Write-Host "  A) Android Studio: apri la cartella 'android', Build -> Build APK(s). Poi riesegui questo script." -ForegroundColor White
Write-Host "  B) EAS: npx eas build --platform android --profile production. Scarica l'APK da expo.dev e salvalo come app-eas.apk nella root. Poi riesegui questo script." -ForegroundColor White
Write-Host ""
Write-Host "Dettagli: docs\COME_AVERE_APK_E_INSTALLARLO.md" -ForegroundColor Gray
exit 1
