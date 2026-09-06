(function () {
  "use strict";

  window.ParsliaNativeStorefront = "microsoft";

  var KITCHEN_URL = "https://parslia-kitchen-os-667132.onhercules.app/";
  var EMBED_TIMEOUT_MS = 8000;

  var frame = document.getElementById("kitchenFrame");
  var statusEl = document.getElementById("kitchenStatus");
  var fallback = document.getElementById("kitchenFallback");
  var intro = document.getElementById("firstRun");
  var enterButtons = document.querySelectorAll("[data-enter-kitchen]");
  var openButtons = document.querySelectorAll("[data-open-kitchen]");
  var retryButton = document.getElementById("retryEmbed");

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
  }

  function showFallback(reason) {
    if (fallback) fallback.hidden = false;
    if (frame) frame.setAttribute("aria-hidden", "true");
    setStatus(reason || "Open the kitchen workspace to continue.");
  }

  function hideFallback() {
    if (fallback) fallback.hidden = true;
    if (frame) frame.removeAttribute("aria-hidden");
  }

  function enterKitchen() {
    if (intro) intro.hidden = true;
    sessionStorage.setItem("parslia-first-run-seen", "1");
    loadKitchen();
  }

  function openKitchenTopLevel() {
    window.location.assign(KITCHEN_URL);
  }

  function loadKitchen() {
    hideFallback();
    setStatus("Opening the kitchen workspace…");
    if (!frame) {
      showFallback("The kitchen workspace is ready.");
      return;
    }

    var settled = false;
    function succeed() {
      if (settled) return;
      settled = true;
      hideFallback();
      setStatus("Kitchen workspace loaded.");
    }
    function fail() {
      if (settled) return;
      settled = true;
      showFallback("The workspace could not be shown inside this window. Continue to open Parslia Kitchen OS.");
    }

    frame.addEventListener("load", succeed, { once: true });
    frame.addEventListener("error", fail, { once: true });
    frame.src = KITCHEN_URL;
    window.setTimeout(function () {
      if (settled) return;
      try {
        if (frame.contentWindow && frame.contentDocument) {
          succeed();
          return;
        }
      } catch (err) {
        succeed();
        return;
      }
      fail();
    }, EMBED_TIMEOUT_MS);
  }

  enterButtons.forEach(function (button) {
    button.addEventListener("click", enterKitchen);
  });
  openButtons.forEach(function (button) {
    button.addEventListener("click", openKitchenTopLevel);
  });
  if (retryButton) {
    retryButton.addEventListener("click", loadKitchen);
  }

  if (sessionStorage.getItem("parslia-first-run-seen") === "1" && intro) {
    intro.hidden = true;
    loadKitchen();
  } else {
    setStatus("Enter the kitchen to use recipes, menus, allergens, stock and rota.");
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(function () {
      /* Shell still works without a worker. */
    });
  }
})();
