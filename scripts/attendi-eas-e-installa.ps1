# Attende il completamento della build EAS Android, scarica l'APK e lo installa sul telefono.
# Uso: collega il telefono con USB debugging, poi: .\scripts\attendi-eas-e-installa.ps1
# Build ID attuale: 16c8b98e-1d9d-43e2-911d-ae6f2f82a8a7

$ErrorActionPreference = "Stop"
$BuildId = "16c8b98e-1d9d-43e2-911d-ae6f2f82a8a7"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$OutApk = Join-Path $ProjectRoot "app-eas.apk"
$adbPath = "C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe"

Write-Host "Build EAS ID: $BuildId" -ForegroundColor Cyan
Write-Host "Controllo stato ogni 90 secondi. Quando la build sara' pronta, scarico e installo." -ForegroundColor Cyan

while ($true) {
    $viewOut = $null
    try {
        $viewOut = & npx eas build:view $BuildId --json 2>$null
    } catch { $viewOut = "" }
    if (-not $viewOut) { $viewOut = "" }
    $viewOut = $viewOut | Out-String
    $first = $viewOut.IndexOf('{')
    $last = $viewOut.LastIndexOf('}')
    if ($first -ge 0 -and $last -gt $first) {
        $jsonStr = $viewOut.Substring($first, $last - $first + 1)
        $b = $jsonStr | ConvertFrom-Json
    } else {
        Write-Host "Risposta non valida da eas build:view" -ForegroundColor Red
        Start-Sleep -Seconds 90
        continue
    }
    $status = $b.status
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Status: $status"
    if ($status -eq "FINISHED") {
        $url = $b.artifacts.applicationArchiveUrl
        if (-not $url) { $url = $b.artifacts.buildUrl }
        if (-not $url) {
            Write-Host "Build finita ma URL artifact non trovato. Apri: https://expo.dev/accounts/alexxivan80/projects/secondself/builds/$BuildId" -ForegroundColor Red
            exit 1
        }
        Write-Host "Download APK da: $url" -ForegroundColor Green
        Invoke-WebRequest -Uri $url -OutFile $OutApk -UseBasicParsing
        $sizeMB = [math]::Round((Get-Item $OutApk).Length / 1MB, 2)
        Write-Host "Scaricato: $OutApk ($sizeMB MB)" -ForegroundColor Green
        if (-not (Test-Path $adbPath)) {
            Write-Host "adb non trovato. Installa l'APK manualmente: $OutApk" -ForegroundColor Yellow
            exit 0
        }
        $devices = & $adbPath devices 2>&1
        if ($devices -notmatch "device$") {
            Write-Host "Collega il telefono con Debug USB e riprova. APK salvato in: $OutApk" -ForegroundColor Yellow
            exit 1
        }
        & $adbPath install -r $OutApk
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Installazione completata. Apri l'app OXY Real sul telefono." -ForegroundColor Green
        } else {
            Write-Host "Installazione fallita. Installa manualmente: $OutApk" -ForegroundColor Red
        }
        exit $LASTEXITCODE
    }
    if ($status -eq "CANCELED" -or $status -eq "ERROR") {
        Write-Host "Build non riuscita: $status" -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 90
}
