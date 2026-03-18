"""
WhatsApp Bulk Messenger — Flask + Selenium Web App
Automates WhatsApp Web via Selenium. User scans QR code once,
then the app sends all messages automatically.
"""

import atexit
import csv
import io
import json
import os
import queue
import random
import subprocess
import threading
import time
import urllib.parse
from pathlib import Path

from flask import Flask, Response, jsonify, render_template, request, send_from_directory
from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    StaleElementReferenceException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

# ── Globals ────────────────────────────────────────────────
driver = None
driver_lock = threading.Lock()
status_queues: list[queue.Queue] = []
is_sending = False
should_stop = False
is_paused = False
send_thread = None

MAX_RETRIES = 3
RETRY_BASE_DELAY = 5


# ── SSE Broadcasting ──────────────────────────────────────
def broadcast_status(event: str, data: dict):
    msg = f"event: {event}\ndata: {json.dumps(data)}\n\n"
    dead = []
    for q in status_queues:
        try:
            q.put_nowait(msg)
        except queue.Full:
            dead.append(q)
    for q in dead:
        status_queues.remove(q)


# ── Chrome / Selenium ─────────────────────────────────────
def kill_stale_chromedriver():
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", "chromedriver.exe"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    except Exception:
        pass


def get_or_create_driver():
    global driver
    with driver_lock:
        if driver is not None:
            try:
                _ = driver.title
                return driver
            except WebDriverException:
                try:
                    driver.quit()
                except Exception:
                    pass
                driver = None

        kill_stale_chromedriver()

        profile_dir = Path.home() / "AppData" / "Local" / "WhatsAppBulkProfile"
        profile_dir.mkdir(parents=True, exist_ok=True)
        lock_file = profile_dir / "SingletonLock"
        if lock_file.exists():
            try:
                lock_file.unlink()
            except Exception:
                pass

        chrome_options = Options()
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument(f"--user-data-dir={profile_dir}")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--remote-debugging-port=0")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-logging"])

        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        return driver


def wait_for_login(drv, timeout=180):
    broadcast_status("log", {"message": "⏳ Waiting for WhatsApp Web login — scan the QR code if prompted …"})
    try:
        WebDriverWait(drv, timeout).until(
            EC.presence_of_element_located(
                (By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]')
            )
        )
        broadcast_status("log", {"message": "✅ WhatsApp Web logged in successfully!"})
        return True
    except TimeoutException:
        broadcast_status("log", {"message": "❌ Login timed out. Please scan the QR code and try again."})
        return False


def send_message(drv, phone: str, message: str) -> bool:
    encoded_msg = urllib.parse.quote(message)
    url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_msg}"
    drv.get(url)

    msg_box = WebDriverWait(drv, 40).until(
        EC.presence_of_element_located(
            (By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]')
        )
    )

    time.sleep(2)
    msg_box.send_keys(Keys.ENTER)
    time.sleep(2)
    return True


# ── Sending Worker ─────────────────────────────────────────
def sending_worker(numbers: list[str], message: str):
    global is_sending, should_stop, is_paused
    is_sending = True
    should_stop = False
    is_paused = False
    total = len(numbers)
    success_count = 0
    fail_count = 0

    try:
        broadcast_status("log", {"message": "🌐 Opening Chrome with WhatsApp Web …"})
        drv = get_or_create_driver()
        drv.get("https://web.whatsapp.com")

        if not wait_for_login(drv):
            broadcast_status("done", {"message": "Login failed. Sending aborted.", "success": 0, "failed": 0, "total": total})
            return

        for idx, number in enumerate(numbers, start=1):
            if should_stop:
                broadcast_status("log", {"message": "🛑 Sending stopped by user."})
                break

            # Handle pause
            while is_paused and not should_stop:
                time.sleep(0.5)

            if should_stop:
                broadcast_status("log", {"message": "🛑 Sending stopped by user."})
                break

            number = number.strip()
            if not number:
                continue

            sent = False
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    broadcast_status("progress", {
                        "current": idx,
                        "total": total,
                        "number": number,
                        "attempt": attempt,
                        "success": success_count,
                        "failed": fail_count,
                        "message": f"📤 ({idx}/{total}) Sending to {number} (attempt {attempt}/{MAX_RETRIES})",
                    })

                    send_message(drv, number, message)
                    success_count += 1
                    sent = True
                    broadcast_status("log", {"message": f"✅ Message sent to {number}"})
                    break

                except (TimeoutException, WebDriverException, StaleElementReferenceException, NoSuchElementException) as e:
                    broadcast_status("log", {
                        "message": f"⚠️ Attempt {attempt} failed for {number}: {type(e).__name__}"
                    })
                    if attempt < MAX_RETRIES:
                        wait = RETRY_BASE_DELAY * (2 ** (attempt - 1)) + random.uniform(0, 2)
                        broadcast_status("log", {"message": f"🔄 Retrying in {wait:.0f}s …"})
                        time.sleep(wait)
                        try:
                            _ = drv.title
                        except WebDriverException:
                            broadcast_status("log", {"message": "🌐 Browser lost, restarting …"})
                            drv = get_or_create_driver()
                            drv.get("https://web.whatsapp.com")
                            wait_for_login(drv)
                    else:
                        fail_count += 1
                        broadcast_status("log", {"message": f"❌ Failed to send to {number} after {MAX_RETRIES} attempts."})

                except Exception as e:
                    fail_count += 1
                    broadcast_status("log", {"message": f"❌ Unexpected error for {number}: {e}"})
                    break

            if sent and idx < total and not should_stop:
                delay = random.randint(5, 8)
                broadcast_status("log", {"message": f"⏳ Waiting {delay}s before next message …"})
                time.sleep(delay)

        broadcast_status("done", {
            "message": f"🏁 Finished! Sent: {success_count} | Failed: {fail_count} | Total: {total}",
            "success": success_count,
            "failed": fail_count,
            "total": total,
        })

    except Exception as e:
        broadcast_status("done", {"message": f"❌ Sending aborted: {e}", "success": success_count, "failed": fail_count, "total": total})
    finally:
        is_sending = False
        should_stop = False
        is_paused = False


def cleanup_driver():
    global driver
    with driver_lock:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
            driver = None


atexit.register(cleanup_driver)


# ── Routes ─────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json", mimetype="application/manifest+json")


@app.route("/sw.js")
def service_worker():
    return send_from_directory("static", "sw.js", mimetype="application/javascript")


@app.route("/upload-csv", methods=["POST"])
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename.endswith(".csv"):
        return jsonify({"error": "Only .csv files are accepted"}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("utf-8-sig"))
        reader = csv.reader(stream)
        numbers = []
        for row in reader:
            for cell in row:
                cleaned = (
                    cell.strip()
                    .replace("-", "").replace(" ", "")
                    .replace("+", "").replace("(", "").replace(")", "")
                )
                if cleaned and cleaned.isdigit() and 7 <= len(cleaned) <= 15:
                    numbers.append(cleaned)

        numbers = list(dict.fromkeys(numbers))
        return jsonify({"numbers": numbers, "count": len(numbers)})

    except Exception as e:
        return jsonify({"error": f"Failed to parse CSV: {e}"}), 400


@app.route("/send", methods=["POST"])
def send():
    global send_thread, is_sending

    if is_sending:
        return jsonify({"error": "A sending session is already in progress."}), 409

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    numbers = data.get("numbers", [])
    message = data.get("message", "").strip()

    if not numbers:
        return jsonify({"error": "No phone numbers provided."}), 400
    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    send_thread = threading.Thread(target=sending_worker, args=(numbers, message), daemon=True)
    send_thread.start()

    return jsonify({"status": "started", "count": len(numbers)})


@app.route("/pause", methods=["POST"])
def pause():
    global is_paused
    is_paused = not is_paused
    state = "paused" if is_paused else "resumed"
    broadcast_status("log", {"message": f"{'⏸' if is_paused else '▶️'} Sending {state}"})
    return jsonify({"status": state, "paused": is_paused})


@app.route("/stop", methods=["POST"])
def stop_sending():
    global should_stop
    should_stop = True
    return jsonify({"status": "stopping"})


@app.route("/status")
def status_stream():
    q: queue.Queue = queue.Queue(maxsize=200)
    status_queues.append(q)

    def event_stream():
        try:
            while True:
                try:
                    msg = q.get(timeout=30)
                    yield msg
                except queue.Empty:
                    yield ": keepalive\n\n"
        except GeneratorExit:
            if q in status_queues:
                status_queues.remove(q)

    return Response(event_stream(), content_type="text/event-stream")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "app": "WhatsApp Bulk Messenger"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=" * 50)
    print("  WhatsApp Bulk Messenger")
    print(f"  Open http://localhost:{port} in your browser")
    print("=" * 50)
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
