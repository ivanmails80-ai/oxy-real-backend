# Aggiunge una regola al Firewall di Windows per permettere connessioni in entrata sulla porta 3030.
# Esegui PowerShell come Amministratore, poi:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   cd backend
#   .\apri-porta-3030-firewall.ps1

$ruleName = "OXY Real Backend (porta 3030)"
$port = 3030

$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Regola '$ruleName' gia presente. Nessuna modifica."
  exit 0
}

New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
Write-Host "OK: Regola firewall aggiunta. Porta $port ora accetta connessioni da altri dispositivi."
Write-Host "Riavvia il backend (npm start) e riprova dall'app."
