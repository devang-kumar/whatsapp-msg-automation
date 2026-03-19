#!/usr/bin/env bash
# Double-clickable launcher for macOS (Finder)
# Move this file into the extracted app folder before running.

cd "$(dirname "$0")"

# Check Python
if ! command -v python3 &>/dev/null; then
    osascript -e 'display alert "Python 3 not found" message "Please install Python from https://python.org then double-click this file again." buttons {"Open python.org", "OK"} default button "Open python.org"' 2>/dev/null
    open "https://www.python.org/downloads/"
    exit 1
fi

# Create venv once
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Install deps silently
venv/bin/pip install -q --upgrade pip
venv/bin/pip install -q -r requirements.txt

# Launch — browser opens automatically
venv/bin/python launcher.py
