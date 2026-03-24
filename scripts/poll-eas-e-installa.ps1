# Controlla la build EAS ogni 5 minuti; quando e' pronta scarica l'APK e installa sul telefono.
$BuildId = "16c8b98e-1d9d-43e2-911d-ae6f2f82a8a7"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$OutApk = Join-Path $ProjectRoot "app-eas.apk"
$adbPath = "C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$IntervalSeconds = 300  # 5 minuti

Write-Host "Build EAS: $BuildId | Controllo ogni 5 minuti." -ForegroundColor Cyan

while ($true) {
    $viewOut = cmd /c "npx eas build:view $BuildId --json 2>nul"
    $viewOut = $viewOut | Out-String
    $first = $viewOut.IndexOf('{')
    $last = $viewOut.LastIndexOf('}')
    if ($first -lt 0 -or $last -le $first) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Risposta non valida, riprovo tra 5 min." -ForegroundColor Yellow
        Start-Sleep -Seconds $IntervalSeconds
        continue
    }
    $b = $viewOut.Substring($first, $last - $first + 1) | ConvertFrom-Json
    $status = $b.status
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Status: $status" -ForegroundColor White

    if ($status -eq "FINISHED") {
        $url = $b.artifacts.applicationArchiveUrl
        if (-not $url) { $url = $b.artifacts.buildUrl }
        if (-not $url) {
            Write-Host "Build finita ma URL non trovato. Apri: https://expo.dev/accounts/alexxivan80/projects/secondself/builds/$BuildId" -ForegroundColor Red
            exit 1
        }
        Write-Host "Download APK in corso..." -ForegroundColor Green
        Invoke-WebRequest -Uri $url -OutFile $OutApk -UseBasicParsing
        $sizeMB = [math]::Round((Get-Item $OutApk).Length / 1MB, 2)
        Write-Host "Scaricato: $OutApk ($sizeMB MB)" -ForegroundColor Green
        if (-not (Test-Path $adbPath)) {
            Write-Host "adb non trovato. Installa manualmente: $OutApk" -ForegroundColor Yellow
            exit 0
        }
        $devices = & $adbPath devices 2>&1
        if ($devices -notmatch "device$") {
            Write-Host "Collega il telefono (USB debugging). APK: $OutApk" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Installazione sul telefono..." -ForegroundColor Cyan
        & $adbPath install -r $OutApk
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Installazione completata. Apri OXY Real sul telefono." -ForegroundColor Green
        } else {
            Write-Host "Installazione fallita. Prova manualmente: adb install -r $OutApk" -ForegroundColor Red
        }
        exit $LASTEXITCODE
    }

    if ($status -eq "CANCELED" -or $status -eq "ERROR") {
        Write-Host "Build non riuscita: $status" -ForegroundColor Red
        exit 1
    }

    Start-Sleep -Seconds $IntervalSeconds
}
