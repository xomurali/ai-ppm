#!/bin/bash
set -e
echo "========================================="; echo "  AI-PPM Platform — Azure VM Deployment"; echo "========================================="
echo "[1/6] Checking dependencies..."
if ! command -v nginx &> /dev/null; then echo "  Installing nginx..."; sudo apt-get update -qq; sudo apt-get install -y -qq nginx; fi
if ! command -v node &> /dev/null; then echo "  Installing Node.js..."; curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -; sudo apt-get install -y -qq nodejs; fi
echo "[2/6] Deploying frontend..."
sudo mkdir -p /var/www/ai-ppm; sudo cp -r dist/* /var/www/ai-ppm/; sudo chown -R www-data:www-data /var/www/ai-ppm
echo "[3/6] Setting up backend..."
sudo mkdir -p /opt/ai-ppm-server; sudo cp -r server/* /opt/ai-ppm-server/; cd /opt/ai-ppm-server; sudo npm install --production 2>&1 | tail -2; cd -
echo "[4/6] Creating systemd service..."
sudo tee /etc/systemd/system/ai-ppm-api.service > /dev/null << 'SVC'
[Unit]
Description=AI-PPM Backend API
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/ai-ppm-server
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment=PORT=3001
User=www-data
[Install]
WantedBy=multi-user.target
SVC
sudo mkdir -p /opt/ai-ppm-server/data; sudo chown -R www-data:www-data /opt/ai-ppm-server
sudo systemctl daemon-reload; sudo systemctl enable ai-ppm-api; sudo systemctl restart ai-ppm-api
echo "[5/6] Configuring nginx..."
sudo tee /etc/nginx/sites-available/ai-ppm > /dev/null << 'NGX'
server {
    listen 80; server_name _;
    root /var/www/ai-ppm; index index.html;
    gzip on; gzip_types text/plain text/css application/json application/javascript;
    location /api/ { proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; client_max_body_size 20M; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    location / { try_files $uri $uri/ /index.html; }
}
NGX
sudo ln -sf /etc/nginx/sites-available/ai-ppm /etc/nginx/sites-enabled/ai-ppm
sudo rm -f /etc/nginx/sites-enabled/default; sudo nginx -t; sudo systemctl reload nginx
VM_IP=$(hostname -I | awk '{print $1}')
echo "[6/6] Done!"
echo "  Frontend: http://${VM_IP}"
echo "  API:      http://${VM_IP}/api/health"
echo "  Set Backend URL in Settings to: http://${VM_IP}"
echo "  Open port 80 in Azure NSG!"
