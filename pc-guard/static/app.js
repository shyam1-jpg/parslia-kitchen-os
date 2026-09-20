const panels = {
  files: document.getElementById("panel-files"),
  windows: document.getElementById("panel-windows"),
  sessions: document.getElementById("panel-sessions"),
  log: document.getElementById("panel-log"),
};

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    panels[btn.dataset.tab].classList.add("active");
  });
});

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortPath(p) {
  const s = String(p || "");
  if (s.length < 90) return s;
  return "…" + s.slice(-87);
}

function fileRows(items) {
  const el = document.getElementById("fileList");
  if (!items.length) {
    el.innerHTML = `<p class="empty">No file activity yet. Click <strong>Create test event</strong> above, or save a file in Desktop / Documents / Downloads.</p>`;
    return;
  }
  el.innerHTML = items
    .map((f) => {
      const shots = [];
      if (f.screenshot_path) {
        shots.push(
          `<button type="button" class="shot-btn" data-src="/${esc(f.screenshot_path)}" title="Screen at that moment">
            <img class="snap" src="/${esc(f.screenshot_path)}" alt="Screen shot at file use" />
            <span>Screen</span>
          </button>`
        );
      }
      if (f.webcam_path) {
        shots.push(
          `<button type="button" class="shot-btn" data-src="/${esc(f.webcam_path)}" title="Webcam at that moment">
            <img class="snap" src="/${esc(f.webcam_path)}" alt="Webcam at file use" />
            <span>Face</span>
          </button>`
        );
      }
      const gallery = shots.length
        ? `<div class="shot-row">${shots.join("")}</div>`
        : `<p class="when">No screen shot for this event (on a normal Windows desktop it should appear)</p>`;
      return `
    <article class="row">
      <span class="badge ${esc(f.action)}">${esc(f.action)}</span>
      <div class="body">
        <p class="path">${esc(shortPath(f.path))}</p>
        <p class="when">${esc(f.created_at)} · ${esc(f.username || "")}</p>
        ${gallery}
      </div>
    </article>`;
    })
    .join("");
}

function windowRows(items) {
  const el = document.getElementById("windowList");
  if (!items.length) {
    el.innerHTML = `<p class="empty">No window titles logged yet. Switch between apps while Guard is running.</p>`;
    return;
  }
  el.innerHTML = items
    .map(
      (w) => `
    <article class="row">
      <span class="badge">${esc(w.process_name || "app")}</span>
      <div class="body">
        <p class="path">${esc(w.title)}</p>
        <p class="when">${esc(w.created_at)} · ${esc(w.username || "")}</p>
      </div>
    </article>`
    )
    .join("");
}

function sessionRows(items) {
  const el = document.getElementById("sessionList");
  if (!items.length) {
    el.innerHTML = `<p class="empty">No sessions yet.</p>`;
    return;
  }
  el.innerHTML = items
    .map((s) => {
      const snap = s.snapshot_path
        ? `<img class="snap" src="/${esc(s.snapshot_path)}" alt="Webcam snapshot" />`
        : "";
      return `
    <article class="row">
      <span class="badge">#${esc(s.id)}</span>
      <div class="body">
        <p class="path"><strong>${esc(s.username)}</strong> @ ${esc(s.hostname)}</p>
        <p class="when">${esc(s.started_at)}${s.ended_at ? " → " + esc(s.ended_at) : " · active"} · ${esc(s.os_info || "")}</p>
        ${snap}
      </div>
    </article>`;
    })
    .join("");
}

function logRows(items) {
  const el = document.getElementById("logList");
  if (!items.length) {
    el.innerHTML = `<p class="empty">No activity notes yet.</p>`;
    return;
  }
  el.innerHTML = items
    .map(
      (l) => `
    <article class="row">
      <span class="badge ${esc(l.kind)}">${esc(l.kind)}</span>
      <div class="body">
        <p class="path">${esc(l.message)}</p>
        <p class="when">${esc(l.created_at)}</p>
      </div>
    </article>`
    )
    .join("");
}

async function refresh() {
  const chip = document.getElementById("statusChip");
  try {
    const [statusRes, dataRes] = await Promise.all([
      fetch("/api/status"),
      fetch("/api/activity"),
    ]);
    const status = await statusRes.json();
    const data = await dataRes.json();

    const id = status.identity || data.identity || {};
    document.getElementById("whoLine").textContent =
      `${id.username || "?"} on ${id.hostname || "?"}`;
    document.getElementById("metaLine").textContent =
      `${id.os || ""} · session #${status.session_id ?? "—"}`;

    const count = status.watch_count ?? (status.watched_folders || []).length;
    const fallback = status.fallback_folder || "pc-guard/watched";
    document.getElementById("watchLine").textContent =
      count > 0
        ? `Watching ${count} folder(s). Test folder: ${fallback}`
        : `Not watching folders yet — use test folder: ${fallback}`;

    if (status.last_screen_error) {
      document.getElementById("helpLine").textContent =
        "Screen capture had an error on this machine. Try running on your Windows desktop (not remote).";
    }

    chip.textContent = count > 0 ? "Watching · live" : "Running · no folders";
    chip.classList.toggle("warn", count === 0);

    fileRows(data.files || []);
    windowRows(data.windows || []);
    sessionRows(data.sessions || []);
    logRows(data.logs || []);
  } catch (err) {
    chip.textContent = "Offline — start PC Guard";
    chip.classList.add("warn");
  }
}

document.getElementById("testBtn").addEventListener("click", async () => {
  const btn = document.getElementById("testBtn");
  btn.disabled = true;
  btn.textContent = "Creating…";
  try {
    await fetch("/api/test-event", { method: "POST" });
    await refresh();
    btn.textContent = "Test created ✓";
  } catch (e) {
    btn.textContent = "Failed — is Guard running?";
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "Create test event";
  }, 2000);
});

refresh();
setInterval(refresh, 3000);

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.body.addEventListener("click", (e) => {
  const btn = e.target.closest(".shot-btn");
  if (btn && btn.dataset.src) {
    lightboxImg.src = btn.dataset.src;
    lightbox.hidden = false;
  }
});

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute("src");
}

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});
