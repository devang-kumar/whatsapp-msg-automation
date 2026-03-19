@echo off
title Building WhatsApp Bulk Messenger — All Platforms
echo ================================================
echo  Building release packages for all platforms
echo ================================================
echo.

:: ── Windows .exe (PyInstaller) ───────────────────
echo [1/4] Building Windows .exe with PyInstaller...
pip install -q pyinstaller
pyinstaller --noconfirm --onefile --windowed ^
    --name "WhatsApp Bulk Messenger" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    launcher.py
if not exist "dist\WhatsApp Bulk Messenger.exe" (
    echo [ERROR] PyInstaller build failed.
    pause & exit /b 1
)
echo [OK] dist\WhatsApp Bulk Messenger.exe

:: ── Windows Installer (Inno Setup) ──────────────
echo.
echo [2/4] Building Windows installer with Inno Setup...

:: Try default Inno Setup install paths
set ISCC=""
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set ISCC="C:\Program Files\Inno Setup 6\ISCC.exe"

if %ISCC%=="" (
    echo [SKIP] Inno Setup not found. Download from https://jrsoftware.org/isinfo.php
    echo        Then re-run this script to build the installer.
) else (
    %ISCC% installer.iss
    if exist "dist\WhatsApp-Bulk-Messenger-Setup.exe" (
        echo [OK] dist\WhatsApp-Bulk-Messenger-Setup.exe
    ) else (
        echo [ERROR] Inno Setup build failed.
    )
)

:: ── Mac .zip ────────────────────────────────────
echo.
echo [3/4] Packaging Mac zip...
if exist "release_tmp\" rmdir /s /q release_tmp
mkdir release_tmp\WhatsApp-Bulk-Messenger
copy app.py           release_tmp\WhatsApp-Bulk-Messenger\ >nul
copy launcher.py      release_tmp\WhatsApp-Bulk-Messenger\ >nul
copy requirements.txt release_tmp\WhatsApp-Bulk-Messenger\ >nul
copy start.command    release_tmp\WhatsApp-Bulk-Messenger\ >nul
xcopy /e /q templates release_tmp\WhatsApp-Bulk-Messenger\templates\ >nul
xcopy /e /q static    release_tmp\WhatsApp-Bulk-Messenger\static\ >nul
powershell -Command "Compress-Archive -Path 'release_tmp\WhatsApp-Bulk-Messenger' -DestinationPath 'dist\WhatsApp.Bulk.Messenger.mac.zip' -Force"
echo [OK] dist\WhatsApp.Bulk.Messenger.mac.zip

:: ── Linux .zip ──────────────────────────────────
echo.
echo [4/4] Packaging Linux zip...
if exist "release_tmp\" rmdir /s /q release_tmp
mkdir release_tmp\WhatsApp-Bulk-Messenger
copy app.py           release_tmp\WhatsApp-Bulk-Messenger\ >nul
copy launcher.py      release_tmp\WhatsApp-Bulk-Messenger\ >nul
copy requirements.txt release_tmp\WhatsApp-Bulk-Messenger\ >nul
copy start.sh         release_tmp\WhatsApp-Bulk-Messenger\ >nul
xcopy /e /q templates release_tmp\WhatsApp-Bulk-Messenger\templates\ >nul
xcopy /e /q static    release_tmp\WhatsApp-Bulk-Messenger\static\ >nul
powershell -Command "Compress-Archive -Path 'release_tmp\WhatsApp-Bulk-Messenger' -DestinationPath 'dist\WhatsApp.Bulk.Messenger.linux.zip' -Force"
echo [OK] dist\WhatsApp.Bulk.Messenger.linux.zip

:: ── Cleanup ─────────────────────────────────────
rmdir /s /q release_tmp

echo.
echo ================================================
echo  Done! Upload these to GitHub Releases:
echo    dist\WhatsApp-Bulk-Messenger-Setup.exe  (Windows installer)
echo    dist\WhatsApp Bulk Messenger.exe         (Windows portable)
echo    dist\WhatsApp.Bulk.Messenger.mac.zip
echo    dist\WhatsApp.Bulk.Messenger.linux.zip
echo ================================================
pause
