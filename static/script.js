/**
 * WhatsApp Bulk Messenger — Web App Logic
 * Uses wa.me URL scheme + Flask backend for CSV processing.
 * PWA-enabled: installable on phones and desktops.
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
    const countdownEl    = document.getElementById("countdown");
    const countdownNum   = document.getElementById("countdown-num");
    const installBanner  = document.getElementById("install-banner");
    const installBtn     = document.getElementById("install-btn");
    const installClose   = document.getElementById("install-close");
    const statSent       = document.getElementById("stat-sent");
    const statFailed     = document.getElementById("stat-failed");
    const statTotal      = document.getElementById("stat-total");

    let phoneNumbers = [];
    let isSending    = false;
    let isPaused     = false;
    let shouldStop   = false;
    let successCount = 0;
    let failCount    = 0;

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
            if (result.outcome === "accepted") {
                showToast("App installed! 🎉", "success");
            }
            deferredPrompt = null;
            installBanner.classList.remove("visible");
        });
    }

    if (installClose) {
        installClose.addEventListener("click", () => {
            installBanner.classList.remove("visible");
        });
    }

    // Register Service Worker
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
        const raw = numbersInput.value;
        const nums = raw
            .split(/[\n,;]+/)
            .map(n => n.trim().replace(/[\s\-\+\(\)]/g, ""))
            .filter(n => n && /^\d{7,15}$/.test(n));
        setNumbers(nums);
    });

    // ── CSV upload (uses Flask backend) ──────────────────────
    csvInput.addEventListener("change", handleCSV);

    uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("dragover"); });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
    uploadZone.addEventListener("drop", e => {
        e.preventDefault();
        uploadZone.classList.remove("dragover");
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith(".csv")) {
            uploadCSVFile(file);
        } else {
            showToast("Please drop a .csv file", "error");
        }
    });

    function handleCSV() {
        const file = csvInput.files[0];
        if (!file) return;
        uploadCSVFile(file);
    }

    function uploadCSVFile(file) {
        const formData = new FormData();
        formData.append("file", file);
        fetch("/upload-csv", { method: "POST", body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    showToast(data.error, "error");
                    return;
                }
                setNumbers(data.numbers);
                showToast(`Loaded ${data.count} numbers from CSV`, "success");
            })
            .catch(() => {
                // Fallback: parse CSV client-side if server is unavailable
                parseCSVLocally(file);
            });
    }

    function parseCSVLocally(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const numbers = [];
                const rows = text.split(/\r?\n/);
                for (const row of rows) {
                    const cells = row.split(/[,;\t]/);
                    for (const cell of cells) {
                        const cleaned = cell.trim().replace(/["']/g, "").replace(/[\s\-\+\(\)]/g, "");
                        if (cleaned && /^\d{7,15}$/.test(cleaned)) {
                            numbers.push(cleaned);
                        }
                    }
                }
                const unique = [...new Set(numbers)];
                setNumbers(unique);
                showToast(`Loaded ${unique.length} numbers from CSV`, "success");
            } catch (err) {
                showToast("Failed to parse CSV: " + err.message, "error");
            }
        };
        reader.onerror = () => showToast("Failed to read file", "error");
        reader.readAsText(file, "utf-8");
    }

    // ── Number management ─────────────────────────────────────
    function setNumbers(nums) {
        phoneNumbers = [...new Set(nums)];
        renderChips();
        updateStats();
        saveState();
    }

    function removeNumber(index) {
        phoneNumbers.splice(index, 1);
        renderChips();
        updateStats();
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

    function updateStats() {
        if (statTotal) statTotal.textContent = phoneNumbers.length;
        if (statSent) statSent.textContent = successCount;
        if (statFailed) statFailed.textContent = failCount;
    }

    // ── Send ──────────────────────────────────────────────────
    sendBtn.addEventListener("click", startSending);

    async function startSending() {
        if (!phoneNumbers.length) {
            showToast("Add at least one phone number", "error");
            return;
        }
        const message = messageInput.value.trim();
        if (!message) {
            showToast("Enter a message to send", "error");
            return;
        }

        isSending = true;
        isPaused = false;
        shouldStop = false;
        successCount = 0;
        failCount = 0;

        sendBtn.disabled = true;
        pauseBtn.style.display = "inline-flex";
        stopBtn.style.display = "inline-flex";
        progressWrap.classList.add("visible");
        statusLog.classList.add("visible");
        statusLog.innerHTML = "";
        progressBar.style.width = "0%";

        const delay = Math.max(2, Math.min(30, parseInt(delayInput.value) || 5)) * 1000;
        const total = phoneNumbers.length;
        const encodedMsg = encodeURIComponent(message);

        addLog("🚀 Sending started …", "log-success");

        for (let i = 0; i < total; i++) {
            if (shouldStop) {
                addLog("🛑 Sending stopped by user.", "log-error");
                break;
            }

            while (isPaused && !shouldStop) {
                await sleep(300);
            }
            if (shouldStop) {
                addLog("🛑 Sending stopped by user.", "log-error");
                break;
            }

            const number = phoneNumbers[i];
            const current = i + 1;

            const pct = Math.round((current / total) * 100);
            progressBar.style.width = pct + "%";
            addLog(`📤 (${current}/${total}) Opening WhatsApp for ${number} …`);

            try {
                const url = `https://wa.me/${number}?text=${encodedMsg}`;
                const newTab = window.open(url, '_blank');

                if (newTab) {
                    successCount++;
                    addLog(`✅ Opened chat for ${number} — click Send in WhatsApp`, "log-success");
                } else {
                    failCount++;
                    addLog(`❌ Pop-up blocked for ${number}. Allow pop-ups and retry.`, "log-error");
                    showToast("Pop-up blocked! Please allow pop-ups for this page.", "error");
                    await sleep(3000);
                }
            } catch (err) {
                failCount++;
                addLog(`❌ Error for ${number}: ${err.message}`, "log-error");
            }

            updateStats();

            if (i < total - 1 && !shouldStop) {
                await countdownDelay(delay);
            }
        }

        const summary = `Finished! Opened: ${successCount} | Failed: ${failCount} | Total: ${total}`;
        addLog(`🏁 ${summary}`, "log-success");
        showToast(summary, "success");
        updateStats();
        resetUI();
    }

    function countdownDelay(ms) {
        return new Promise(resolve => {
            const seconds = Math.ceil(ms / 1000);
            let remaining = seconds;
            countdownEl.classList.add("visible");
            countdownNum.textContent = remaining;

            const interval = setInterval(() => {
                if (shouldStop || !isSending) {
                    clearInterval(interval);
                    countdownEl.classList.remove("visible");
                    resolve();
                    return;
                }
                remaining--;
                countdownNum.textContent = Math.max(0, remaining);
                if (remaining <= 0) {
                    clearInterval(interval);
                    countdownEl.classList.remove("visible");
                    resolve();
                }
            }, 1000);
        });
    }

    function sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // ── Pause ─────────────────────────────────────────────────
    pauseBtn.addEventListener("click", () => {
        if (isPaused) {
            isPaused = false;
            pauseBtn.innerHTML = "⏸ Pause";
            addLog("▶️ Resumed sending", "log-warn");
        } else {
            isPaused = true;
            pauseBtn.innerHTML = "▶️ Resume";
            addLog("⏸ Paused — click Resume to continue", "log-warn");
        }
    });

    // ── Stop ──────────────────────────────────────────────────
    stopBtn.addEventListener("click", () => {
        shouldStop = true;
        showToast("Stopping after current message …", "error");
    });

    // ── Helpers ───────────────────────────────────────────────
    function addLog(msg, className = "") {
        const div = document.createElement("div");
        div.className = "log-entry" + (className ? ` ${className}` : "");
        div.textContent = msg;
        statusLog.appendChild(div);
        statusLog.scrollTop = statusLog.scrollHeight;
    }

    function resetUI() {
        isSending = false;
        isPaused = false;
        shouldStop = false;
        sendBtn.disabled = false;
        pauseBtn.style.display = "none";
        stopBtn.style.display = "none";
        pauseBtn.innerHTML = "⏸ Pause";
        countdownEl.classList.remove("visible");
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
            updateStats();
        } catch (e) {}
    }

    messageInput.addEventListener("input", saveState);
    delayInput.addEventListener("change", saveState);

    restoreState();
})();
