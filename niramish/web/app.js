const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
const photo = document.querySelector("#photo");
const paste = document.querySelector("#paste");
const scanText = document.querySelector("#scan-text");
const statusEl = document.querySelector("#status");
const review = document.querySelector("#review");
const libraryList = document.querySelector("#library-list");
const searchForm = document.querySelector("#search-form");
const search = document.querySelector("#search");

let currentCapture = null;

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    panels.forEach((panel) => panel.classList.toggle("is-active", panel.id === tab.dataset.tab));
    if (tab.dataset.tab === "library") loadLibrary();
  });
});

photo.addEventListener("change", async () => {
  if (!photo.files?.[0]) return;
  await scan({ photo: photo.files[0] });
  photo.value = "";
});

scanText.addEventListener("click", async () => {
  await scan({ text: paste.value });
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadLibrary(search.value);
});

function setStatus(message) {
  statusEl.hidden = !message;
  statusEl.textContent = message || "";
}

async function scan({ photo, text }) {
  setStatus("Reading the page and building a house version…");
  review.hidden = true;
  const body = new FormData();
  if (photo) body.append("photo", photo);
  if (text) body.append("text", text);
  const response = await fetch("/api/scan", { method: "POST", body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus(data.detail || "Could not read that recipe.");
    return;
  }
  currentCapture = data;
  setStatus("House version ready. Check the swaps, then save it to the database.");
  renderReview(data);
}

function renderReview(capture) {
  const recipe = capture.transformed;
  review.hidden = false;
  review.innerHTML = recipeMarkup(recipe, {
    captureId: capture.id,
    ocr: capture.ocr_text,
    canSave: true,
  });
  review.querySelector("#save-recipe")?.addEventListener("click", saveCurrent);
}

function recipeMarkup(recipe, { captureId, ocr, canSave, recipeId } = {}) {
  const chips = (recipe.substitutions || [])
    .map((item) => `<span class="chip">${escapeHtml(item.original)} → ${escapeHtml(item.replacement)}</span>`)
    .join("");
  const ingredients = (recipe.ingredients || [])
    .map((item) => {
      const was = item.quantity_original != null && item.quantity != null && item.quantity !== item.quantity_original
        ? `<span class="was">${item.quantity_original} ${item.unit || ""}</span>`
        : "";
      return `<li>${was}${escapeHtml(item.display || item.item)}</li>`;
    })
    .join("");
  const steps = (recipe.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  const meta = [
    recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : "",
    recipe.course ? `Course: ${recipe.course}` : "",
    recipe.prep_time ? `Prep: ${recipe.prep_time}` : (recipe.prep_minutes ? `Prep: ${recipe.prep_minutes} minutes` : ""),
    recipe.cook_time ? `Cook: ${recipe.cook_time}` : (recipe.cook_minutes ? `Cook: ${recipe.cook_minutes} minutes` : ""),
    recipe.servings ? `Serves: ${recipe.servings}` : "",
    recipe.taste ? `Taste: ${recipe.taste}` : "",
    recipe.difficulty ? `Difficulty: ${recipe.difficulty}` : "",
  ].filter(Boolean).join("  ");
  return `
    <p class="meta">House recipe${recipe.original_title ? ` from “${escapeHtml(recipe.original_title)}”` : ""}</p>
    <h2>${escapeHtml(recipe.title)}</h2>
    <p>${escapeHtml(recipe.description || "")}</p>
    <p class="meta">${escapeHtml(meta)}</p>
    <div class="chips">${chips}</div>
    <h3>Ingredients</h3>
    <ul class="ingredients">${ingredients}</ul>
    <h3>Method</h3>
    <ol class="method">${steps}</ol>
    ${ocr ? `<details class="hidden-original"><summary>Photographed text (not stored as the recipe)</summary><pre>${escapeHtml(ocr)}</pre></details>` : ""}
    <div class="actions">
      ${canSave ? `<button class="primary" id="save-recipe" type="button">Save to database</button>` : ""}
      ${recipeId ? `<button class="danger" type="button" data-delete="${recipeId}">Remove</button>` : ""}
    </div>
  `;
}

async function saveCurrent() {
  if (!currentCapture) return;
  const payload = { ...currentCapture.transformed, capture_id: currentCapture.id };
  const response = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus(data.detail || "Could not save that recipe.");
    return;
  }
  setStatus("Saved to the Niramish database.");
  currentCapture = null;
  document.querySelector('[data-tab="library"]').click();
}

async function loadLibrary(query = "") {
  const response = await fetch("/api/recipes" + (query ? `?q=${encodeURIComponent(query)}` : ""));
  const data = await response.json();
  libraryList.innerHTML = data.recipes.map((recipe) => `
    <article class="card" data-id="${recipe.id}">
      ${recipeMarkup(recipe, { recipeId: recipe.id })}
    </article>
  `).join("") || "<p class='status'>No house recipes yet.</p>";
  libraryList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      await fetch(`/api/recipes/${button.dataset.delete}`, { method: "DELETE" });
      loadLibrary(search.value);
    });
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

loadLibrary();
