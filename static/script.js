/**
 * WhatsApp Bulk Messenger — Frontend Logic
 * Talks to Flask backend which uses Selenium to auto-send messages.
 * Progress is streamed via Server-Sent Events (SSE).
 */
(() => {
    "use strict";

    // ── DOM refs ──────────────────────────────────────────────
    const tabBtns        = document.querySelectorAll(".tab-btn");
    const tabPanels      = document.querySelectorAll(".tab-panel");
    const numbersInput   = document.getElementById("numbers-input");
    const csvInput       = document.getElementById("csv-input");
    const uploadZone     = document.getElementById("upload-zone");
    const chipsContainer = document.getElementById("chips-container");
    const chipsSummary   = document.getElementById("chips-summary");
    const messageInput   = document.getElementById("message-input");
    const sendBtn        = document.getElementById("send-btn");
    const pauseBtn       = document.getElementById("pause-btn");
    const stopBtn        = document.getElementById("stop-btn");
    const progressWrap   = document.getElementById("progress-wrap");
    const progressBar    = document.getElementById("progress-bar");
    const statusLog      = document.getElementById("status-log");
    const toastEl        = document.getElementById("toast");
    const delayInput     = document.getElementById("delay-input");
    const statSent       = document.getElementById("stat-sent");
    const statFailed     = document.getElementById("stat-failed");
    const statTotal      = document.getElementById("stat-total");
    const installBanner  = document.getElementById("install-banner");
    const installBtn     = document.getElementById("install-btn");
    const installClose   = document.getElementById("install-close");
    const resetBtn       = document.getElementById("reset-btn");

    let phoneNumbers = [];
    let eventSource  = null;

    // ── QR / Screenshot ──────────────────────────────────
    const openWaBtn    = document.getElementById("open-wa-btn");
    const refreshQrBtn = document.getElementById("refresh-qr-btn");
    const qrWrap       = document.getElementById("qr-wrap");
    const qrImg        = document.getElementById("qr-img");
    const qrTs         = document.getElementById("qr-ts");

    function loadScreenshot() {
        const ts = Date.now();
        qrImg.src = `/screenshot?t=${ts}`;
        qrWrap.style.display = "block";
        qrTs.textContent = "Screenshot taken at " + new Date().toLocaleTimeString();
    }

    if (openWaBtn) {
        openWaBtn.addEventListener("click", () => {
            openWaBtn.disabled = true;
            openWaBtn.textContent = "⏳ Opening…";
            fetch("/screenshot")
                .then(r => {
                    if (r.ok) {
                        loadScreenshot();
                        showToast("Browser opened — scan the QR code", "success");
                    } else {
                        showToast("Failed to open browser", "error");
                    }
                })
                .catch(() => showToast("Could not reach server", "error"))
                .finally(() => {
                    openWaBtn.disabled = false;
                    openWaBtn.textContent = "🌐 Open WhatsApp";
                });
        });
    }

    if (refreshQrBtn) {
        refreshQrBtn.addEventListener("click", loadScreenshot);
    }

    // ── PWA Install ──────────────────────────────────────────
    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", e => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBanner) installBanner.classList.add("visible");
    });

    if (installBtn) {
        installBtn.addEventListener("click", async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === "accepted") showToast("App installed! 🎉", "success");
            deferredPrompt = null;
            installBanner.classList.remove("visible");
        });
    }

    if (installClose) {
        installClose.addEventListener("click", () => installBanner.classList.remove("visible"));
    }

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js").catch(() => {});
        });
    }

    // ── Tabs ──────────────────────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabPanels.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.dataset.tab).classList.add("active");
        });
    });

    // ── Manual entry parsing ──────────────────────────────────
    numbersInput.addEventListener("input", () => {
        const nums = numbersInput.value
            .split(/[\n,;]+/)
            .map(n => n.trim().replace(/[\s\-\+\(\)]/g, ""))
            .filter(n => n && /^\d{7,15}$/.test(n));
        setNumbers(nums);
    });

    // ── CSV upload (via Flask backend) ────────────────────────
    csvInput.addEventListener("change", () => {
        const file = csvInput.files[0];
        if (file) uploadCSVFile(file);
    });

    uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("dragover"); });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
    uploadZone.addEventListener("drop", e => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith(".csv")) uploadCSVFile(file);
        else showToast("Please drop a .csv file", "error");
    });

    function uploadCSVFile(file) {
        const fd = new FormData();
        fd.append("file", file);
        fetch("/upload-csv", { method: "POST", body: fd })
            .then(r => r.json())
            .then(data => {
                if (data.error) { showToast(data.error, "error"); return; }
                setNumbers(data.numbers);
                showToast(`Loaded ${data.count} numbers from CSV`, "success");
            })
            .catch(() => showToast("Failed to upload CSV", "error"));
    }

    // ── Number management ─────────────────────────────────────
    function setNumbers(nums) {
        phoneNumbers = [...new Set(nums)];
        renderChips();
        updateStats(0, 0);
        saveState();
    }

    function removeNumber(index) {
        phoneNumbers.splice(index, 1);
        renderChips();
        updateStats(0, 0);
        saveState();
    }

    function renderChips() {
        chipsContainer.innerHTML = "";
        phoneNumbers.forEach((num, i) => {
            const chip = document.createElement("span");
            chip.className = "chip";
            chip.innerHTML = `📱 ${num} <button class="chip__remove" data-index="${i}">&times;</button>`;
            chipsContainer.appendChild(chip);
        });
        chipsSummary.textContent = phoneNumbers.length
            ? `${phoneNumbers.length} number${phoneNumbers.length > 1 ? "s" : ""} ready`
            : "";
        chipsContainer.querySelectorAll(".chip__remove").forEach(btn => {
            btn.addEventListener("click", () => removeNumber(+btn.dataset.index));
        });
    }

    function updateStats(sent, failed) {
        if (statTotal) statTotal.textContent = phoneNumbers.length;
        if (statSent) statSent.textContent = sent;
        if (statFailed) statFailed.textContent = failed;
    }

    // ══════════════════════════════════════════════════════════
    //  SEND — calls Flask /send endpoint, listens to SSE
    // ══════════════════════════════════════════════════════════

    sendBtn.addEventListener("click", startSending);

    function startSending() {
        if (!phoneNumbers.length) { showToast("Add at least one phone number", "error"); return; }
        const message = messageInput.value.trim();
        if (!message) { showToast("Enter a message to send", "error"); return; }

        sendBtn.disabled = true;
        pauseBtn.style.display = "inline-flex";
        stopBtn.style.display = "inline-flex";
        progressWrap.classList.add("visible");
        statusLog.classList.add("visible");
        statusLog.innerHTML = "";
        progressBar.style.width = "0%";

        // Connect SSE first
        connectSSE();

        // Start sending via Flask backend
        fetch("/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                numbers: phoneNumbers,
                message,
                delay_seconds: +delayInput.value || 5,
            }),
        })
        .then(r => r.json())
        .then(data => {
            if (data.error) {
                showToast(data.error, "error");
                resetUI();
            } else {
                addLog("🚀 Sending request sent to server …", "log-success");
            }
        })
        .catch(() => {
            showToast("Could not reach the server. Is it running?", "error");
            resetUI();
        });
    }

    // ── Pause ─────────────────────────────────────────────────
    pauseBtn.addEventListener("click", () => {
        fetch("/pause", { method: "POST" })
            .then(r => r.json())
            .then(data => {
                if (data.paused) {
                    pauseBtn.innerHTML = "▶️ Resume";
                    addLog("⏸ Paused — click Resume to continue", "log-warn");
                } else {
                    pauseBtn.innerHTML = "⏸ Pause";
                    addLog("▶️ Resumed sending", "log-warn");
                }
            })
            .catch(() => showToast("Failed to pause/resume", "error"));
    });

    // ── Stop ──────────────────────────────────────────────────
    stopBtn.addEventListener("click", () => {
        fetch("/stop", { method: "POST" })
            .then(() => {
                showToast("Stopping after current message …", "error");
            })
            .catch(() => showToast("Failed to stop", "error"));
    });

    // ── SSE (Server-Sent Events for real-time progress) ──────
    function connectSSE() {
        if (eventSource) eventSource.close();
        eventSource = new EventSource("/status");

        eventSource.addEventListener("log", e => {
            const data = JSON.parse(e.data);
            addLog(data.message);
        });

        eventSource.addEventListener("progress", e => {
            const data = JSON.parse(e.data);
            const pct = Math.round((data.current / data.total) * 100);
            progressBar.style.width = pct + "%";
            addLog(data.message);
            if (data.success !== undefined) updateStats(data.success, data.failed);
        });

        eventSource.addEventListener("done", e => {
            const data = JSON.parse(e.data);
            addLog(data.message, "log-success");
            showToast(data.message, "success");
            if (data.success !== undefined) updateStats(data.success, data.failed);
            progressBar.style.width = "100%";
            resetUI();
            if (eventSource) { eventSource.close(); eventSource = null; }
        });

        eventSource.onerror = () => { /* SSE auto-reconnects */ };
    }

    // ── Helpers ───────────────────────────────────────────────
    function addLog(msg, className = "") {
        const div = document.createElement("div");
        div.className = "log-entry" + (className ? ` ${className}` : "");
        div.textContent = msg;
        statusLog.appendChild(div);
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    function resetUI() {
        sendBtn.disabled = false;
        sendBtn.innerHTML = "🚀 Start Sending";
        pauseBtn.style.display = "none";
        stopBtn.style.display = "none";
        pauseBtn.innerHTML = "⏸ Pause";
    }

    function showToast(msg, type = "") {
        toastEl.textContent = msg;
        toastEl.className = "toast" + (type ? ` toast--${type}` : "");
        toastEl.classList.add("show");
        clearTimeout(toastEl._timer);
        toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 4000);
    }

    // ── Persistence ──────────────────────────────────────────
    function saveState() {
        try {
            localStorage.setItem("wa_bulk_state", JSON.stringify({
                numbers: phoneNumbers,
                message: messageInput.value,
                delay: delayInput.value,
            }));
        } catch (e) {}
    }

    function restoreState() {
        try {
            const raw = localStorage.getItem("wa_bulk_state");
            if (!raw) return;
            const state = JSON.parse(raw);
            if (state.numbers && state.numbers.length) {
                phoneNumbers = state.numbers;
                numbersInput.value = phoneNumbers.join("\n");
                renderChips();
            }
            if (state.message) messageInput.value = state.message;
            if (state.delay) delayInput.value = state.delay;
            updateStats(0, 0);
        } catch (e) {}
    }

    messageInput.addEventListener("input", saveState);
    delayInput.addEventListener("change", saveState);
    restoreState();

    // ── Session health check on load ─────────────────────
    fetch("/session-status")
        .then(r => r.json())
        .then(data => {
            if (data.is_sending) {
                sendBtn.disabled = true;
                pauseBtn.style.display = "inline-flex";
                stopBtn.style.display = "inline-flex";
                if (data.is_paused) pauseBtn.innerHTML = "▶️ Resume";
                progressWrap.classList.add("visible");
                statusLog.classList.add("visible");
                connectSSE();
                addLog("🔄 Reconnected to active session …", "log-warn");
            }
            // else: nothing running, UI stays in default ready state
        })
        .catch(() => {});

    // ── Reset stuck session ───────────────────────────────
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            fetch("/reset", { method: "POST" })
                .then(r => r.json())
                .then(() => {
                    resetUI();
                    if (eventSource) { eventSource.close(); eventSource = null; }
                    statusLog.innerHTML = "";
                    progressBar.style.width = "0%";
                    showToast("Session reset. Ready to send again.", "success");
                })
                .catch(() => showToast("Failed to reset session", "error"));
        });
    }
})();
