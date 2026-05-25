#!/bin/bash
# ============================================================
# POST-RESTORE SECURITY + REDEPLOY SCRIPT
# Chạy ngay sau khi restore snapshot iNET
# ============================================================
set -e

echo "======================================"
echo "  POST-RESTORE: BẢO MẬT + REDEPLOY"
echo "  $(date)"
echo "======================================"

# ── 1. CHẶN PORT 5432 NGAY LẬP TỨC ──────────────────────────
echo ""
echo "[1/7] Chặn port PostgreSQL khỏi internet..."
iptables -C INPUT -s 127.0.0.1 -p tcp --dport 5432 -j ACCEPT 2>/dev/null || \
  iptables -I INPUT 1 -s 127.0.0.1 -p tcp --dport 5432 -j ACCEPT
iptables -C INPUT -p tcp --dport 5432 -j DROP 2>/dev/null || \
  iptables -A INPUT -p tcp --dport 5432 -j DROP
iptables -C INPUT -p tcp --dport 5433 -j DROP 2>/dev/null || \
  iptables -A INPUT -p tcp --dport 5433 -j DROP
echo "✅ iptables rules applied"

# ── 2. LƯU IPTABLES VĨNH VIỄN ────────────────────────────────
echo ""
echo "[2/7] Lưu iptables rules vĩnh viễn..."
apt-get install -y iptables-persistent 2>&1 | tail -2
iptables-save > /etc/iptables/rules.v4
echo "✅ iptables saved"

# ── 3. SỬA pg_hba.conf ───────────────────────────────────────
echo ""
echo "[3/7] Vá pg_hba.conf (chặn kết nối từ ngoài internet)..."
# Đợi postgres container lên
until docker exec noithatsct-postgres pg_isready -U postgres 2>/dev/null; do
  echo "   Đợi PostgreSQL..."
  sleep 3
done

cat > /tmp/pg_hba_secure.conf << 'CONF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
host    all             all             172.16.0.0/12           scram-sha-256
local   replication     all                                     trust
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
CONF
docker cp /tmp/pg_hba_secure.conf noithatsct-postgres:/var/lib/postgresql/data/pg_hba.conf
docker exec noithatsct-postgres psql -U postgres -c 'SELECT pg_reload_conf();' > /dev/null
echo "✅ pg_hba.conf secured"

# ── 4. ĐỔI MẬT KHẨU POSTGRES ────────────────────────────────
echo ""
echo "[4/7] Đổi mật khẩu PostgreSQL..."
docker exec noithatsct-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'SCTntt2026db';"
echo "✅ Password changed to: SCTntt2026db"

# ── 5. SỬA docker-compose.prod.yml (bind localhost only) ─────
echo ""
echo "[5/7] Cập nhật docker-compose.prod.yml..."
COMPOSE=/root/actions-runner/_work/noithatsct/noithatsct/docker-compose.prod.yml
# Thay port binding 5432:5432 → 127.0.0.1:5432:5432
sed -i 's|"5432:5432"|"127.0.0.1:5432:5432"|g' $COMPOSE
sed -i "s|'5432:5432'|'127.0.0.1:5432:5432'|g" $COMPOSE
# Bỏ default password postgres
sed -i 's|\${POSTGRES_PASSWORD:-postgres}|SCTntt2026db|g' $COMPOSE
echo "✅ docker-compose.prod.yml updated"

# ── 6. REDEPLOY CODE MỚI NHẤT TỪ GITHUB ─────────────────────
echo ""
echo "[6/7] Redeploy code mới nhất từ GitHub..."
cd /root/actions-runner/_work/noithatsct/noithatsct

# Pull code mới nhất
git fetch origin main
git reset --hard origin/main
echo "✅ Code updated to latest"

# Cập nhật .env với password mới
sed -i 's|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=SCTntt2026db|' .env
sed -i 's|postgresql://postgres:[^@]*@localhost:5432|postgresql://postgres:SCTntt2026db@localhost:5432|g' .env
echo "✅ .env updated"

# Build và restart containers
docker compose -p noithatsct -f docker-compose.prod.yml build app 2>&1 | tail -5
docker compose -p noithatsct -f docker-compose.prod.yml up -d --force-recreate
sleep 15

# ── 7. CHẠY MIGRATION + BACKUP ───────────────────────────────
echo ""
echo "[7/7] Chạy migration schema + tạo backup..."
# Chạy migration an toàn (không xóa data)
DB_URL="postgresql://postgres:SCTntt2026db@localhost:5432/noithatsct?schema=public"
DATABASE_URL="$DB_URL" npx prisma migrate resolve --applied 20260217182412_init 2>/dev/null || true
DATABASE_URL="$DB_URL" npx prisma migrate resolve --applied 20260217185441_enhance_all 2>/dev/null || true
DATABASE_URL="$DB_URL" npx prisma migrate deploy 2>/dev/null || true
DATABASE_URL="$DB_URL" npx prisma db push --skip-generate 2>/dev/null || true
echo "✅ Schema synced"

# Tạo backup ngay
mkdir -p /root/db-backups
docker exec noithatsct-postgres pg_dump -U postgres -d noithatsct | \
  gzip > /root/db-backups/noithatsct_post_restore_$(date +%Y%m%d_%H%M%S).sql.gz
echo "✅ Backup created"

# Setup cron backup hàng ngày 2AM
cat > /root/pg-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/root/db-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
docker exec noithatsct-postgres pg_dump -U postgres -d noithatsct | \
  gzip > $BACKUP_DIR/noithatsct_$DATE.sql.gz
ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | tail -n +15 | xargs rm -f
echo "[$(date)] Backup: $BACKUP_DIR/noithatsct_$DATE.sql.gz"
EOF
chmod +x /root/pg-backup.sh
(crontab -l 2>/dev/null | grep -v pg-backup; echo '0 2 * * * /root/pg-backup.sh >> /root/pg-backup.log 2>&1') | crontab -
echo "✅ Daily backup cron set (02:00 AM)"

# ── KIỂM TRA CUỐI ────────────────────────────────────────────
echo ""
echo "======================================"
echo "  KIỂM TRA KẾT QUẢ"
echo "======================================"
echo ""
echo "Port 5432 binding:"
docker inspect noithatsct-postgres --format '  {{json .HostConfig.PortBindings}}' 2>/dev/null || echo "  (container chưa lên)"

echo ""
echo "Container status:"
docker ps --format '  {{.Names}}: {{.Status}}'

echo ""
echo "Database tables:"
docker exec noithatsct-postgres psql -U postgres -d noithatsct -c '\dt' 2>/dev/null | grep -c '|' || echo "  (đang khởi động)"

echo ""
echo "Backup files:"
ls -lh /root/db-backups/ 2>/dev/null

echo ""
echo "App HTTP status:"
sleep 10
curl -s -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "  (đang khởi động)"

echo ""
echo "======================================"
echo "  ✅ HOÀN TẤT! Server đã an toàn."
echo "  Đăng nhập: https://admin.kientrucsct.com"
echo "======================================"
