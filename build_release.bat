@echo off
title Building WhatsApp Bulk Messenger — All Platforms
echo ================================================
echo  Building release packages for all platforms
echo ================================================
echo.

:: ── Windows .exe ────────────────────────────────
echo [1/3] Building Windows .exe...
pip install -q pyinstaller
pyinstaller --noconfirm --onefile --windowed ^
    --name "WhatsApp Bulk Messenger" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    launcher.py
echo [OK] dist\WhatsApp Bulk Messenger.exe

:: ── Mac .zip ────────────────────────────────────
echo.
echo [2/3] Packaging Mac zip...
if exist "release_tmp\" rmdir /s /q release_tmp
mkdir release_tmp\WhatsApp-Bulk-Messenger

copy app.py          release_tmp\WhatsApp-Bulk-Messenger\
copy launcher.py     release_tmp\WhatsApp-Bulk-Messenger\
copy requirements.txt release_tmp\WhatsApp-Bulk-Messenger\
copy start.command   release_tmp\WhatsApp-Bulk-Messenger\
xcopy /e /q templates release_tmp\WhatsApp-Bulk-Messenger\templates\
xcopy /e /q static    release_tmp\WhatsApp-Bulk-Messenger\static\

powershell -Command "Compress-Archive -Path 'release_tmp\WhatsApp-Bulk-Messenger' -DestinationPath 'dist\WhatsApp.Bulk.Messenger.mac.zip' -Force"
echo [OK] dist\WhatsApp.Bulk.Messenger.mac.zip

:: ── Linux .zip ──────────────────────────────────
echo.
echo [3/3] Packaging Linux zip...
if exist "release_tmp\" rmdir /s /q release_tmp
mkdir release_tmp\WhatsApp-Bulk-Messenger

copy app.py          release_tmp\WhatsApp-Bulk-Messenger\
copy launcher.py     release_tmp\WhatsApp-Bulk-Messenger\
copy requirements.txt release_tmp\WhatsApp-Bulk-Messenger\
copy start.sh        release_tmp\WhatsApp-Bulk-Messenger\
xcopy /e /q templates release_tmp\WhatsApp-Bulk-Messenger\templates\
xcopy /e /q static    release_tmp\WhatsApp-Bulk-Messenger\static\

powershell -Command "Compress-Archive -Path 'release_tmp\WhatsApp-Bulk-Messenger' -DestinationPath 'dist\WhatsApp.Bulk.Messenger.linux.zip' -Force"
echo [OK] dist\WhatsApp.Bulk.Messenger.linux.zip

:: ── Cleanup ─────────────────────────────────────
rmdir /s /q release_tmp

echo.
echo ================================================
echo  Done! Upload these files to GitHub Releases:
echo    dist\WhatsApp Bulk Messenger.exe
echo    dist\WhatsApp.Bulk.Messenger.mac.zip
echo    dist\WhatsApp.Bulk.Messenger.linux.zip
echo ================================================
pause
