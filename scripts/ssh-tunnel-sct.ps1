# SSH Tunnel SCT - Auto reconnect
# Keeps localhost:15433 -> server:5432 alive

$sshArgs = "-o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 15433:localhost:5432 sct -N"

Write-Host "[SCT Tunnel] Starting auto-reconnect loop..." -ForegroundColor Cyan

while ($true) {
    Write-Host "[SCT Tunnel] $(Get-Date -Format 'HH:mm:ss') - Connecting..." -ForegroundColor Yellow
    Start-Process -FilePath "ssh" -ArgumentList $sshArgs -Wait -NoNewWindow
    Write-Host "[SCT Tunnel] $(Get-Date -Format 'HH:mm:ss') - Disconnected. Reconnecting in 5s..." -ForegroundColor Red
    Start-Sleep -Seconds 5
}
