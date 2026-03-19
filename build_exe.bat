@echo off
title Building WhatsApp Bulk Messenger EXE
echo Installing PyInstaller...
pip install pyinstaller

echo Building executable...
pyinstaller --noconfirm --onefile --windowed ^
    --name "WhatsApp Bulk Messenger" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --icon "static/icons/icon-192.png" ^
    launcher.py

echo.
echo Build complete! Find your .exe in the dist/ folder.
echo Share the entire dist/ folder with users.
pause
