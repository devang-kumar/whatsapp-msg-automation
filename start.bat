@echo off
title WhatsApp Bulk Messenger

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python not found. Opening download page...
    start https://www.python.org/downloads/
    echo.
    echo Please install Python 3.10+, make sure to check "Add Python to PATH",
    echo then double-click this file again.
    pause
    exit /b 1
)

:: Create venv once
if not exist "venv\" (
    python -m venv venv >nul 2>&1
)

:: Install deps silently
venv\Scripts\pip install -q --upgrade pip >nul 2>&1
venv\Scripts\pip install -q -r requirements.txt >nul 2>&1

:: Launch — browser opens automatically
venv\Scripts\python launcher.py
