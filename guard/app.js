(() => {
  const STORAGE_PIN = "guard.pin.v1";
  const STORAGE_LOG = "guard.log.v1";
  const MAX_EVENTS = 300;

  const els = {
    lockPanel: document.getElementById("lockPanel"),
    appPanel: document.getElementById("appPanel"),
    pinForm: document.getElementById("pinForm"),
    pinInput: document.getElementById("pinInput"),
    pinHint: document.getElementById("pinHint"),
    statusChip: document.getElementById("statusChip"),
    lockBtn: document.getElementById("lockBtn"),
    whoLine: document.getElementById("whoLine"),
    metaLine: document.getElementById("metaLine"),
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    snapBtn: document.getElementById("snapBtn"),
    screenBtn: document.getElementById("screenBtn"),
    pickFileBtn: document.getElementById("pickFileBtn"),
    pickFolderBtn: document.getElementById("pickFolderBtn"),
    fileInput: document.getElementById("fileInput"),
    cam: document.getElementById("cam"),
    canvas: document.getElementById("canvas"),
    clearBtn: document.getElementById("clearBtn"),
    timeline: document.getElementById("panel-timeline"),
    photos: document.getElementById("panel-photos"),
    files: document.getElementById("panel-files"),
  };

  let stream = null;
  let watching = false;
  let idleTimer = null;
  let lastActivity = Date.now();
  let unlocked = false;

  function nowIso() {
    return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  }

  function loadLog() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_LOG) || "[]");
    } catch {
      return [];
    }
  }

  function saveLog(events) {
    localStorage.setItem(STORAGE_LOG, JSON.stringify(events.slice(0, MAX_EVENTS)));
  }

  function addEvent(event) {
    const events = loadLog();
    events.unshift({ id: crypto.randomUUID(), at: nowIso(), ...event });
    saveLog(events);
    render();
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function render() {
    const events = loadLog();
    const timeline = events;
    const photos = events.filter((e) => e.kind === "photo" || e.kind === "screen");
    const files = events.filter((e) => e.kind === "file");

    const row = (e) => {
      const img = e.image
        ? `<img class="thumb" src="${e.image}" alt="${esc(e.kind)} capture" />`
        : "";
      return `<article class="row">
        <span class="badge ${esc(e.kind)}">${esc(e.kind)}</span>
        <div>
          <p class="path">${esc(e.message)}</p>
          <p class="when">${esc(e.at)}</p>
          ${img}
        </div>
      </article>`;
    };

    els.timeline.innerHTML = timeline.length
      ? timeline.map(row).join("")
      : `<p class="empty">No activity yet. Click Start watching.</p>`;
    els.photos.innerHTML = photos.length
      ? photos.map(row).join("")
      : `<p class="empty">No photos yet.</p>`;
    els.files.innerHTML = files.length
      ? files.map(row).join("")
      : `<p class="empty">No files logged yet. Use Pick file / Pick folder.</p>`;
  }

  function setWatching(on) {
    watching = on;
    els.startBtn.disabled = on;
    els.stopBtn.disabled = !on;
    els.snapBtn.disabled = !on;
    els.screenBtn.disabled = !on;
    els.statusChip.textContent = on ? "Watching · live" : "Idle";
    els.statusChip.classList.toggle("live", on);
    els.whoLine.textContent = on ? "Watching this browser session" : "Ready";
    els.metaLine.textContent = on
      ? "Photos and file picks are saved on this device only."
      : "Works in Chrome, Edge, or Safari — no desktop app.";
  }

  async function startCamera() {
    if (stream) return;
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    els.cam.srcObject = stream;
    await els.cam.play();
  }

  function stopCamera() {
    if (!stream) return;
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
    els.cam.srcObject = null;
  }

  function capturePhoto() {
    const video = els.cam;
    if (!video.videoWidth) return null;
    const canvas = els.canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function startWatching() {
    try {
      await startCamera();
    } catch (err) {
      alert("Camera permission is needed to photograph who is here.\n\n" + err.message);
      return;
    }
    setWatching(true);
    addEvent({
      kind: "session",
      message: "Watching started on " + navigator.userAgent.slice(0, 80),
      image: capturePhoto(),
    });
    bumpActivity();
  }

  function stopWatching() {
    addEvent({ kind: "session", message: "Watching stopped", image: capturePhoto() });
    stopCamera();
    setWatching(false);
    if (idleTimer) clearInterval(idleTimer);
  }

  function bumpActivity() {
    const wasIdle = Date.now() - lastActivity > 60000;
    lastActivity = Date.now();
    if (wasIdle && watching) {
      addEvent({
        kind: "photo",
        message: "Activity resumed — photo taken",
        image: capturePhoto(),
      });
    }
  }

  async function takeScreen() {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const track = display.getVideoTracks()[0];
      const settings = track.getSettings();
      const video = document.createElement("video");
      video.srcObject = display;
      await video.play();
      await new Promise((r) => setTimeout(r, 200));
      const canvas = els.canvas;
      canvas.width = settings.width || video.videoWidth || 1280;
      canvas.height = settings.height || video.videoHeight || 720;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.8);
      track.stop();
      display.getTracks().forEach((t) => t.stop());
      addEvent({ kind: "screen", message: "Screen shot captured", image });
    } catch (err) {
      alert("Screen capture cancelled or not allowed.\n\n" + err.message);
    }
  }

  function logFiles(fileList) {
    [...fileList].forEach((file) => {
      addEvent({
        kind: "file",
        message: `${file.name} (${Math.round(file.size / 1024)} KB)`,
        image: watching ? capturePhoto() : null,
      });
    });
  }

  async function pickFolder() {
    if (!window.showDirectoryPicker) {
      alert("Folder pick works in Chrome/Edge. Use Pick file on this browser.");
      return;
    }
    try {
      const dir = await window.showDirectoryPicker();
      let count = 0;
      for await (const entry of dir.values()) {
        if (entry.kind === "file") {
          count += 1;
          addEvent({
            kind: "file",
            message: `${dir.name}/${entry.name}`,
            image: watching ? capturePhoto() : null,
          });
        }
        if (count >= 40) break;
      }
      if (!count) {
        addEvent({ kind: "file", message: `Folder selected: ${dir.name} (no files listed)` });
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      alert("Could not open folder.\n\n" + err.message);
    }
  }

  // PIN gate
  const existingPin = localStorage.getItem(STORAGE_PIN);
  els.pinHint.textContent = existingPin
    ? "Enter your PIN to open the log."
    : "First visit: enter a new PIN to create it.";

  els.pinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = els.pinInput.value.trim();
    if (value.length < 4) {
      alert("PIN must be at least 4 characters.");
      return;
    }
    const saved = localStorage.getItem(STORAGE_PIN);
    if (!saved) {
      localStorage.setItem(STORAGE_PIN, value);
    } else if (saved !== value) {
      alert("Wrong PIN.");
      return;
    }
    unlocked = true;
    els.lockPanel.hidden = true;
    els.appPanel.hidden = false;
    els.lockBtn.hidden = false;
    els.pinInput.value = "";
    render();
  });

  els.lockBtn.addEventListener("click", () => {
    if (watching) stopWatching();
    unlocked = false;
    els.appPanel.hidden = true;
    els.lockPanel.hidden = false;
    els.lockBtn.hidden = true;
  });

  els.startBtn.addEventListener("click", startWatching);
  els.stopBtn.addEventListener("click", stopWatching);
  els.snapBtn.addEventListener("click", () => {
    const image = capturePhoto();
    if (!image) {
      alert("Camera not ready yet.");
      return;
    }
    addEvent({ kind: "photo", message: "Manual photo", image });
  });
  els.screenBtn.addEventListener("click", takeScreen);
  els.pickFileBtn.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    if (els.fileInput.files?.length) logFiles(els.fileInput.files);
    els.fileInput.value = "";
  });
  els.pickFolderBtn.addEventListener("click", pickFolder);
  els.clearBtn.addEventListener("click", () => {
    if (confirm("Delete all Guard photos and logs on this browser?")) {
      localStorage.removeItem(STORAGE_LOG);
      render();
    }
  });

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".list-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
    });
  });

  ["mousemove", "keydown", "click", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, () => {
      if (unlocked && watching) bumpActivity();
    }, { passive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (!unlocked || !watching) return;
    if (document.visibilityState === "visible") {
      addEvent({
        kind: "photo",
        message: "Tab became active again — photo taken",
        image: capturePhoto(),
      });
    } else {
      addEvent({ kind: "session", message: "Tab hidden / switched away" });
    }
  });

  setWatching(false);
})();
