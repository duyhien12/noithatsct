# =============================================================
# Upload va chay setup HTTPS tren VPS
# Chay tu may Windows: .\run-https-setup.ps1
# =============================================================

$SSH_HOST  = "root@202.92.6.74"
$SSH_PORT  = "24700"
$SSH_KEY   = "$env:USERPROFILE\.ssh\id_ed25519"
$SSH_OPTS  = "-p $SSH_PORT -i `"$SSH_KEY`" -o StrictHostKeyChecking=no"

Write-Host ""
Write-Host "=== HTTPS Setup: admin.kientrucsct.com ===" -ForegroundColor Cyan

# Buoc 1: Kiem tra DNS
Write-Host ""
Write-Host "[Kiem tra DNS] admin.kientrucsct.com ..." -ForegroundColor Yellow
$dns = Resolve-DnsName "admin.kientrucsct.com" -ErrorAction SilentlyContinue |
       Where-Object { $_.Type -eq "A" } |
       Select-Object -ExpandProperty IPAddress
if ($dns -contains "202.92.6.74") {
    Write-Host "DNS OK: $dns -> 202.92.6.74" -ForegroundColor Green
} else {
    Write-Host "CANH BAO: DNS hien tai la '$dns'" -ForegroundColor Red
    Write-Host "Can tro A record: admin.kientrucsct.com -> 202.92.6.74" -ForegroundColor Red
    $confirm = Read-Host "Tiep tuc du sao? (y/N)"
    if ($confirm -ne "y") { exit 1 }
}

# Buoc 2: Upload script len VPS
Write-Host ""
Write-Host "[Upload] setup-https.sh len VPS..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$localScript = Join-Path $scriptDir "setup-https.sh"
& scp -P $SSH_PORT -i "$SSH_KEY" -o StrictHostKeyChecking=no `
    "$localScript" "${SSH_HOST}:/root/setup-https.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Loi upload script!" -ForegroundColor Red
    exit 1
}
Write-Host "Upload OK" -ForegroundColor Green

# Buoc 3: Chay script tren VPS
Write-Host ""
Write-Host "[Chay] setup-https.sh tren VPS..." -ForegroundColor Yellow
Write-Host "(Qua trinh nay mat khoang 1-2 phut)" -ForegroundColor Gray
Write-Host ""
& ssh -p $SSH_PORT -i "$SSH_KEY" -o StrictHostKeyChecking=no `
    $SSH_HOST "chmod +x /root/setup-https.sh && bash /root/setup-https.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== THANH CONG! ===" -ForegroundColor Green
    Write-Host "Mo dien thoai va vao: https://admin.kientrucsct.com" -ForegroundColor Cyan
    Write-Host "GPS se hoat dong binh thuong." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Co loi xay ra. Xem log phia tren de biet them chi tiet." -ForegroundColor Red
    exit 1
}
