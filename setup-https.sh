#!/bin/bash
# =============================================================
# Setup HTTPS (Nginx + Let's Encrypt) cho admin.kientrucsct.com
# Chạy trên VPS root@202.92.6.74
# =============================================================
set -e

DOMAIN="admin.kientrucsct.com"
APP_DIR="/root/noithatsct"
EMAIL="duyhien140892@gmail.com"

echo ""
echo "======================================================"
echo "  HTTPS Setup: $DOMAIN"
echo "======================================================"

# 1. Cài Nginx + Certbot
echo ""
echo "[1/6] Cài Nginx + Certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# 2. Mở firewall (ufw nếu có)
echo ""
echo "[2/6] Mở firewall port 80 & 443..."
if command -v ufw &>/dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "ufw: đã mở port 80 và 443"
else
    echo "ufw không có, bỏ qua (kiểm tra firewall thủ công nếu cần)"
fi

# 3. Tạo Nginx config
echo ""
echo "[3/6] Tạo Nginx config..."
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_CONF'
server {
    listen 80;
    server_name admin.kientrucsct.com;

    # Cho phép upload ảnh lớn (mặt tiền công trình)
    client_max_body_size 50M;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX_CONF

# Kích hoạt site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

# Xoá default site nếu còn
rm -f /etc/nginx/sites-enabled/default

# Kiểm tra config
nginx -t
systemctl enable nginx
systemctl reload nginx
echo "Nginx OK"

# 4. Cấp SSL với Certbot (tự động, không cần nhập)
echo ""
echo "[4/6] Cấp SSL cho $DOMAIN (Let's Encrypt)..."
certbot --nginx \
    -d $DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect
echo "SSL OK"

# 5. Cập nhật .env trên server
echo ""
echo "[5/6] Cập nhật NEXTAUTH_URL và NEXT_PUBLIC_BASE_URL trong .env..."
ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    # Backup .env trước khi sửa
    cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"

    # Cập nhật hoặc thêm các biến HTTPS
    sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" "$ENV_FILE"
    sed -i "s|^NEXT_PUBLIC_BASE_URL=.*|NEXT_PUBLIC_BASE_URL=https://$DOMAIN|" "$ENV_FILE"

    # Nếu chưa có thì thêm vào cuối
    grep -q "^NEXTAUTH_URL=" "$ENV_FILE" || echo "NEXTAUTH_URL=https://$DOMAIN" >> "$ENV_FILE"
    grep -q "^NEXT_PUBLIC_BASE_URL=" "$ENV_FILE" || echo "NEXT_PUBLIC_BASE_URL=https://$DOMAIN" >> "$ENV_FILE"

    echo ".env đã cập nhật:"
    grep -E "^NEXTAUTH_URL=|^NEXT_PUBLIC_BASE_URL=" "$ENV_FILE"
else
    echo "CẢNH BÁO: Không tìm thấy $ENV_FILE — bỏ qua bước này"
    echo "Hãy tự cập nhật thủ công sau khi chạy xong"
fi

# 6. Restart Docker app
echo ""
echo "[6/6] Restart Docker app..."
cd "$APP_DIR"
if [ -f "docker-compose.prod.yml" ]; then
    docker compose -f docker-compose.prod.yml down
    docker compose -f docker-compose.prod.yml up -d
    sleep 5
    docker compose -f docker-compose.prod.yml ps
else
    echo "CẢNH BÁO: Không tìm thấy docker-compose.prod.yml tại $APP_DIR"
fi

# Tổng kết
echo ""
echo "======================================================"
echo "  HOÀN THÀNH!"
echo "======================================================"
echo ""
echo "  App chạy tại: https://$DOMAIN"
echo "  GPS trên điện thoại: hoạt động"
echo "  SSL cert tự gia hạn mỗi 90 ngày"
echo ""
echo "  Kiểm tra cert: certbot certificates"
echo "  Kiểm tra nginx: systemctl status nginx"
echo ""
