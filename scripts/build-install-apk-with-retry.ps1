# Build APK + install con retry in caso di errore (max 3 tentativi).
# Controlla la creazione dell'APK e riavvia il tutto se ci sono errori; installa sempre sul telefono se la build riesce.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BuildScript = Join-Path $PSScriptRoot "build-and-install-apk.ps1"
$MaxAttempts = 3
$Attempt = 1

while ($Attempt -le $MaxAttempts) {
    Write-Host "`n========== Tentativo $Attempt di $MaxAttempts ==========" -ForegroundColor Cyan
    & powershell -ExecutionPolicy Bypass -File $BuildScript
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Host "`nBuild e installazione completate con successo." -ForegroundColor Green
        exit 0
    }
    Write-Host "`nTentativo $Attempt fallito (exit code $exitCode). Riavvio tra 15 secondi..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    $Attempt++
}

Write-Host "`nERRORE: Tutti i $MaxAttempts tentativi sono falliti." -ForegroundColor Red
exit 1
