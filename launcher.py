"""
Launcher — starts Flask server and opens the browser automatically.
This is the entry point for the packaged .exe
"""
import threading
import time
import webbrowser
import sys
import os

# Make sure bundled files are found when running as .exe
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    os.chdir(os.path.dirname(sys.executable))
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

# Add base dir to path so app.py imports work
sys.path.insert(0, base_dir)

PORT = 5000

def open_browser():
    time.sleep(2)  # wait for Flask to start
    webbrowser.open(f"http://localhost:{PORT}")

# Open browser in background thread
threading.Thread(target=open_browser, daemon=True).start()

# Start Flask app
from app import app
app.run(debug=False, host="127.0.0.1", port=PORT, threaded=True, use_reloader=False)
