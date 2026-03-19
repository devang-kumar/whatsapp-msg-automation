#!/usr/bin/env bash
# Render build script — installs Chromium + chromedriver, then pip deps
set -e

echo "==> Installing Chromium and chromedriver..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    ca-certificates \
    fonts-liberation

echo "==> Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "==> Build complete."
