# WhatsApp Bulk Messenger

Send messages to multiple WhatsApp contacts automatically via WhatsApp Web.

## Requirements

- Python 3.10+
- Google Chrome installed
- Internet connection (for WhatsApp Web)

---

## Run Locally

### Windows

Double-click **`start.bat`**

That's it. It will:
1. Create a virtual environment
2. Install all dependencies
3. Start the server and open `http://localhost:5000` in your browser

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

---

## First-time use

1. Click **"Open WhatsApp"** in the app
2. Scan the QR code with your phone (WhatsApp → Linked Devices)
3. Once logged in, add numbers and send messages

Your WhatsApp session is saved locally — you only need to scan once.

---

## Build a standalone .exe (Windows)

```bat
build_exe.bat
```

The `.exe` will be in the `dist/` folder. Share it with users who don't have Python.

---

## Notes

- Run with a single process (the app keeps state in-memory)
- Chrome must be installed — ChromeDriver is downloaded automatically
- Messages are sent via WhatsApp Web, so your phone must stay connected
