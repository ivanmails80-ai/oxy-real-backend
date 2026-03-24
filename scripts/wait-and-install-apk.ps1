# Attende che esista app-release.apk (max 15 min), poi installa via ADB.
$apk = "c:\Users\giuse\Desktop\ivan\AppDelSecolo\android\app\build\outputs\apk\release\app-release.apk"
$adb = "C:\Users\giuse\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$maxWaitSec = 900
$elapsed = 0
while (-not (Test-Path $apk)) {
    Start-Sleep -Seconds 30
    $elapsed += 30
    if ($elapsed -ge $maxWaitSec) {
        Write-Host "Timeout: APK non trovato dopo $maxWaitSec secondi."
        exit 1
    }
    Write-Host "Attendo APK... ($elapsed s)"
}
Write-Host "APK trovato. Installazione..."
& $adb install -r $apk
if ($LASTEXITCODE -eq 0) { Write-Host "Installazione completata." } else { exit $LASTEXITCODE }
