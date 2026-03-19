# Deployment Guide — WhatsApp Bulk Messenger

This app uses Selenium + Chromium to automate WhatsApp Web. It must run as a **single process** (state is in-memory globals).

---

## Deploy to Render (recommended, no Docker)

1. Push this repo to GitHub/GitLab.
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo.
3. Render will auto-detect `render.yaml` and configure everything.
4. On first deploy, open the app URL and scan the WhatsApp QR code.
5. The Chrome profile is saved to the persistent disk (`/data/wa_profile`) so you only scan once.

> Free tier note: Render free instances spin down after inactivity. When they spin back up, Chrome restarts and you may need to re-scan the QR code unless the persistent disk retained the session.

---

## Deploy to a VPS (DigitalOcean, Hetzner, etc.)

```bash
# 1. Install dependencies
sudo apt-get update
sudo apt-get install -y python3-pip chromium chromium-driver

# 2. Clone and install
git clone <your-repo>
cd whatsapp-bulk-messenger
pip3 install -r requirements.txt

# 3. Run
export HEADLESS=1
export CHROME_BINARY=/usr/bin/chromium
export CHROMEDRIVER_PATH=/usr/bin/chromedriver
export CHROME_USER_DATA_DIR=/home/$USER/.wa_profile
export USE_WEBDRIVER_MANAGER=0
gunicorn -w 1 --threads 8 -b 0.0.0.0:5000 app:app
```

Use `systemd` or `supervisor` to keep it running.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `HEADLESS` | `0` | Set to `1` on servers (no GUI) |
| `CHROME_BINARY` | auto | Path to Chrome/Chromium binary |
| `CHROMEDRIVER_PATH` | auto | Path to chromedriver |
| `USE_WEBDRIVER_MANAGER` | `1` | Set to `0` when chromedriver is pre-installed |
| `CHROME_USER_DATA_DIR` | auto | Where to persist the WhatsApp login session |
| `PORT` | `5000` | Port to listen on |

---

## Local Development

```bash
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```
