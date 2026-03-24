# Scarica react-android AAR da Maven Central per build locale (evita Provider da includeBuild)
$url = "https://repo1.maven.org/maven2/com/facebook/react/react-android/0.81.5/react-android-0.81.5-release.aar"
$outDir = Join-Path $PSScriptRoot "..\android\.react-android-cache"
$outFile = Join-Path $outDir "react-android-0.81.5-release.aar"
if (Test-Path $outFile) {
    Write-Host "react-android AAR gia' presente: $outFile"
    exit 0
}
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
Write-Host "Download $url ..."
try {
    Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing
    Write-Host "OK: $outFile"
} catch {
    Write-Host "ERRORE: $_"
    exit 1
}
