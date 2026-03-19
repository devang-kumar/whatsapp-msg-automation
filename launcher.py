"""
Launcher — starts Flask server and opens the browser automatically.
Waits for the server to be ready before opening the browser.
"""
import threading
import time
import webbrowser
import sys
import os
import urllib.request
import urllib.error

# Make sure bundled files are found when running as .exe
if getattr(sys, "frozen", False):
    base_dir = sys._MEIPASS
    os.chdir(os.path.dirname(sys.executable))
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, base_dir)

PORT = int(os.environ.get("PORT", 5000))
URL = f"http://localhost:{PORT}"


def wait_and_open():
    """Poll /health until Flask is up, then open the browser."""
    for _ in range(30):  # up to ~15 seconds
        try:
            urllib.request.urlopen(f"{URL}/health", timeout=1)
            webbrowser.open(URL)
            return
        except (urllib.error.URLError, OSError):
            time.sleep(0.5)
    # Fallback — open anyway
    webbrowser.open(URL)


threading.Thread(target=wait_and_open, daemon=True).start()

from app import app  # noqa: E402

print("=" * 50)
print("  WhatsApp Bulk Messenger")
print(f"  Open {URL} in your browser")
print("  Press Ctrl+C to stop")
print("=" * 50)

app.run(debug=False, host="127.0.0.1", port=PORT, threaded=True, use_reloader=False)
