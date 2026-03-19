@echo off
title WhatsApp Bulk Messenger
echo Starting WhatsApp Bulk Messenger...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python from https://python.org
    pause
    exit
)

REM Install dependencies if needed
if not exist ".deps_installed" (
    echo Installing dependencies for first time setup...
    pip install -r requirements.txt
    echo. > .deps_installed
)

echo Opening app in browser...
start "" python launcher.py
