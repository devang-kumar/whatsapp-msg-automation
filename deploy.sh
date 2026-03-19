#!/usr/bin/env bash
# Run this on a fresh Ubuntu 22.04 server to deploy WhatsApp Bulk Messenger
set -e

echo "==> Updating system..."
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends \
    python3-pip python3-venv \
    chromium-browser chromium-chromedriver \
    ca-certificates fonts-liberation git

echo "==> Cloning repo..."
cd /opt
sudo git clone https://github.com/devang-kumar/whatsapp-msg-automation.git app || \
    (cd /opt/app && sudo git pull)

cd /opt/app

echo "==> Setting up Python venv..."
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt

echo "==> Writing systemd service..."
sudo tee /etc/systemd/system/wabulk.service > /dev/null <<EOF
[Unit]
Description=WhatsApp Bulk Messenger
After=network.target

[Service]
User=$USER
WorkingDirectory=/opt/app
Environment="HEADLESS=1"
Environment="USE_WEBDRIVER_MANAGER=0"
Environment="CHROME_BINARY=/usr/bin/chromium-browser"
Environment="CHROMEDRIVER_PATH=/usr/lib/chromium-browser/chromedriver"
Environment="CHROME_USER_DATA_DIR=/opt/app/wa_profile"
Environment="PORT=8080"
ExecStart=/opt/app/venv/bin/gunicorn -w 1 --threads 8 -b 0.0.0.0:8080 app:app
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable wabulk
sudo systemctl restart wabulk

echo ""
echo "==> Done! App running at http://$(curl -s ifconfig.me):8080"
