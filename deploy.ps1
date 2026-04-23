# Deploy SCT ERP to production
# Usage: .\deploy.ps1 "commit message"

param([string]$msg = "deploy")

Write-Host "=== SCT ERP Deploy ===" -ForegroundColor Cyan

# 1. Commit & push
git add -A
git commit -m $msg
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Code pushed. Deploying to server..." -ForegroundColor Yellow

# 2. SSH vào server: pull + rebuild
ssh -p 24700 -i "$env:USERPROFILE\.ssh\id_ed25519" root@202.92.6.74 @'
cd /root/noithatsct || cd /app || { echo "Cannot find app dir"; exit 1; }
git pull origin main
docker-compose -f docker-compose.prod.yml up --build -d
docker-compose -f docker-compose.prod.yml ps
'@

Write-Host "=== Deploy done! ===" -ForegroundColor Green
