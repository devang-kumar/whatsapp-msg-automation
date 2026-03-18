"""
WhatsApp Bulk Messenger — Flask Web App
Deployable on Render, Railway, PythonAnywhere, or any Python hosting.

Two modes:
  1. WEB MODE (default for deployment): Uses wa.me URL scheme — works for everyone
  2. LOCAL MODE (optional): Uses Selenium for automated sending — requires Chrome
"""

import csv
import io
import os
from flask import Flask, jsonify, render_template, request, send_from_directory

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB max upload


@app.route("/")
def index():
    """Serve the main app page."""
    return render_template("index.html")


@app.route("/manifest.json")
def manifest():
    """Serve PWA manifest."""
    return send_from_directory("static", "manifest.json", mimetype="application/manifest+json")


@app.route("/sw.js")
def service_worker():
    """Serve service worker from root (required for PWA scope)."""
    return send_from_directory("static", "sw.js", mimetype="application/javascript")


@app.route("/upload-csv", methods=["POST"])
def upload_csv():
    """Parse a CSV file and extract phone numbers."""
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
                    .replace("-", "")
                    .replace(" ", "")
                    .replace("+", "")
                    .replace("(", "")
                    .replace(")", "")
                )
                if cleaned and cleaned.isdigit() and 7 <= len(cleaned) <= 15:
                    numbers.append(cleaned)

        # Deduplicate while preserving order
        numbers = list(dict.fromkeys(numbers))
        return jsonify({"numbers": numbers, "count": len(numbers)})

    except Exception as e:
        return jsonify({"error": f"Failed to parse CSV: {e}"}), 400


@app.route("/health")
def health():
    """Health check endpoint for deployment platforms."""
    return jsonify({"status": "ok", "app": "WhatsApp Bulk Messenger"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"

    print("=" * 50)
    print("  WhatsApp Bulk Messenger")
    print(f"  Open http://localhost:{port} in your browser")
    print("=" * 50)

    app.run(debug=debug, host="0.0.0.0", port=port, threaded=True)
