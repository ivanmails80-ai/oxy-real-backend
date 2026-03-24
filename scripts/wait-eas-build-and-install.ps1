# Monitora la build EAS ogni 5 minuti; al completamento scarica l'APK e installa sul dispositivo via adb.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\wait-eas-build-and-install.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CheckIntervalSeconds = 300   # 5 minuti
$BuildId = $null              # usa ultima build Android se non passato come argomento

if ($args.Count -ge 1) { $BuildId = $args[0] }

# adb
$adb = $null
if (Get-Command adb -ErrorAction SilentlyContinue) { $adb = "adb" }
elseif (Test-Path "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") { $adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" }
elseif ($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")) { $adb = "$env:ANDROID_HOME\platform-tools\adb.exe" }
if (-not $adb) {
    Write-Host "ERRORE: adb non trovato. Imposta ANDROID_HOME o aggiungi platform-tools al PATH." -ForegroundColor Red
    exit 1
}

Set-Location $ProjectRoot

function Get-LatestAndroidBuild {
    $out = & npx eas-cli build:list --platform android --limit 1 --json --non-interactive 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { return $null }
    # EAS restituisce un array JSON; estrai la prima riga che inizia con [
    $jsonStr = ($out -split "`n" | Where-Object { $_.TrimStart() -match '^\[' } | Select-Object -First 1)
    if (-not $jsonStr) { $jsonStr = $out.Trim() }
    try {
        $parsed = $jsonStr | ConvertFrom-Json
        if ($parsed -is [Array] -and $parsed.Count -gt 0) { return $parsed[0] }
        if ($parsed -is [PSCustomObject] -and $parsed.id) { return $parsed }
        if ($parsed -is [PSCustomObject]) { return $parsed }
    } catch {}
    return $null
}

function Get-BuildStatus {
    param($b)
    if (-not $b) { return "unknown" }
    $s = $b.status
    if ($b.PSObject.Properties.Name -contains "status") { return $s.ToUpperInvariant() }
    return "unknown"
}

function Get-ArtifactUrl {
    param($b)
    if (-not $b) { return $null }
    $a = $b.artifacts
    if ($a -and ($a.PSObject.Properties | Measure-Object).Count -gt 0) {
        if ($a.buildUrl) { return $a.buildUrl }
        if ($a.applicationArchiveUrl) { return $a.applicationArchiveUrl }
        # EAS può restituire l'URL con altro nome
        $urlProp = $a.PSObject.Properties | Where-Object { $_.Value -match '^https?://' } | Select-Object -First 1
        if ($urlProp) { return $urlProp.Value }
    }
    if ($b.buildArtifactsUrl) { return $b.buildArtifactsUrl }
    if ($b.artifactsUrl) { return $b.artifactsUrl }
    return $null
}

$lastStatus = ""
$attempt = 0

while ($true) {
    $attempt++
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Controllo build EAS (tentativo $attempt)..." -ForegroundColor Cyan
    $build = Get-LatestAndroidBuild
    $status = Get-BuildStatus $build

    if ($status -ne $lastStatus) {
        Write-Host "  Stato: $status" -ForegroundColor $(if ($status -eq "FINISHED") { "Green" } elseif ($status -match "ERRORED|CANCELED|FAILED") { "Red" } else { "Yellow" })
        $lastStatus = $status
    }

    if ($status -eq "FINISHED") {
        $url = Get-ArtifactUrl $build
        if (-not $url -and $build.id) {
            # Prova a ottenere i dettagli con build:view
            $viewOut = & npx eas-cli build:view $build.id --json --non-interactive 2>&1 | Out-String
            $viewStr = ($viewOut -split "`n" | Where-Object { $_.TrimStart() -match '^\{' } | Select-Object -First 1)
            if ($viewStr) {
                try {
                    $view = $viewStr | ConvertFrom-Json
                    if ($view.artifacts.buildUrl) { $url = $view.artifacts.buildUrl }
                    elseif ($view.artifacts.applicationArchiveUrl) { $url = $view.artifacts.applicationArchiveUrl }
                } catch {}
            }
        }
        if (-not $url) {
            Write-Host "  Build completata ma URL artefatto non trovato. Scarica da:" -ForegroundColor Yellow
            Write-Host "  https://expo.dev/accounts/alexxivan80/projects/secondself/builds/$($build.id)" -ForegroundColor Cyan
            exit 1
        }
        Write-Host "  Download APK da: $url" -ForegroundColor Cyan
        $apkPath = Join-Path $env:TEMP "oxy-real-eas-build.apk"
        try {
            Invoke-WebRequest -Uri $url -OutFile $apkPath -UseBasicParsing
        } catch {
            Write-Host "  ERRORE download: $_" -ForegroundColor Red
            exit 1
        }
        if (-not (Test-Path $apkPath)) {
            Write-Host "  ERRORE: file non scaricato." -ForegroundColor Red
            exit 1
        }
        Write-Host "  Installazione su dispositivo..." -ForegroundColor Cyan
        & $adb install -r $apkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nOK: OXY Real installata. Apri l'app sul telefono." -ForegroundColor Green
            Remove-Item $apkPath -Force -ErrorAction SilentlyContinue
            exit 0
        }
        Write-Host "  ERRORE: installazione fallita. Telefono collegato e Debug USB attivo?" -ForegroundColor Red
        exit 1
    }

    if ($status -match "ERRORED|FAILED|CANCELED|CANCELLED") {
        $logUrl = if ($build.logsUrl) { $build.logsUrl } else { "https://expo.dev/accounts/alexxivan80/projects/secondself/builds" }
        Write-Host "  Build fallita o annullata. Log: $logUrl" -ForegroundColor Red
        exit 1
    }

    Write-Host "  Prossimo controllo tra $($CheckIntervalSeconds) secondi." -ForegroundColor Gray
    Start-Sleep -Seconds $CheckIntervalSeconds
}
