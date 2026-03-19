#!/usr/bin/env bash
# WhatsApp Bulk Messenger — Local launcher for macOS / Linux
set -e

echo "================================================"
echo "  WhatsApp Bulk Messenger — Local Launcher"
echo "================================================"
echo

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 not found."
    echo "  macOS:  brew install python"
    echo "  Ubuntu: sudo apt install python3 python3-venv"
    exit 1
fi

# Create venv on first run
if [ ! -d "venv" ]; then
    echo "[SETUP] Creating virtual environment..."
    python3 -m venv venv
fi

# Install / upgrade deps
echo "[SETUP] Installing dependencies (first run may take a minute)..."
venv/bin/pip install -q --upgrade pip
venv/bin/pip install -q -r requirements.txt

echo
echo "[OK] Starting app — browser will open automatically..."
echo "     Press Ctrl+C to stop the server."
echo

venv/bin/python launcher.py
