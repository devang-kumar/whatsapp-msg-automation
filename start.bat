@echo off
title WhatsApp Bulk Messenger
echo ================================================
echo   WhatsApp Bulk Messenger — Local Launcher
echo ================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo Please install Python 3.10+ from https://python.org
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

REM Create venv on first run
if not exist "venv\" (
    echo [SETUP] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Install / upgrade deps
echo [SETUP] Installing dependencies ^(first run may take a minute^)...
venv\Scripts\pip install -q --upgrade pip
venv\Scripts\pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [OK] Starting app — browser will open automatically...
echo      Press Ctrl+C in this window to stop the server.
echo.

venv\Scripts\python launcher.py
pause
