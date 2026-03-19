#!/usr/bin/env bash
# Linux launcher — run once with: bash start.sh
cd "$(dirname "$0")"

if ! command -v python3 &>/dev/null; then
    echo "[ERROR] Python 3 not found. Install with: sudo apt install python3 python3-venv"
    exit 1
fi

[ ! -d "venv" ] && python3 -m venv venv

venv/bin/pip install -q --upgrade pip
venv/bin/pip install -q -r requirements.txt
venv/bin/python launcher.py
