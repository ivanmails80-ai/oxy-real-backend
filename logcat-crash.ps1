# Cattura log Android (solo errori) per diagnosticare crash OXY Real.
# Esegui: .\logcat-crash.ps1
# Collega il telefono via USB con debug attivo, avvia l'app e quando crasha ferma con Ctrl+C.

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  Write-Host "adb non trovato in $adb"
  exit 1
}
Write-Host "Avvio logcat (Error). Apri l'app e quando crasha premi Ctrl+C..."
& $adb logcat *:E 2>&1 | Select-String -Pattern "oxy|react|expo|FATAL|Exception|Error|com.oxyreal" -CaseSensitive:$false
