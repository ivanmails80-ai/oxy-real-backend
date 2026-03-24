# Patch android/app/build.gradle: fallback a %USERPROFILE%\.android\debug.keystore
# se android/app/debug.keystore non esiste (build locale Windows).
$path = Join-Path $PSScriptRoot "..\android\app\build.gradle"
if (-not (Test-Path $path)) { Write-Host "build.gradle non trovato"; exit 1 }
$content = Get-Content $path -Raw -Encoding UTF8
$old = "storeFile file('debug.keystore')"
$new = @"
def localKeystore = file('debug.keystore')
            def userHome = System.getProperty('user.home')
            def globalKeystore = file("`${userHome}/.android/debug.keystore")
            storeFile localKeystore.exists() ? localKeystore : globalKeystore
"@
if ($content -match [regex]::Escape($old)) {
  $content = $content.Replace($old, $new.Trim())
  Set-Content $path -Value $content -Encoding UTF8 -NoNewline
  Write-Host "Patch keystore fallback applicata a android/app/build.gradle"
} else {
  Write-Host "Pattern keystore non trovato (gia patchato?)"
}
