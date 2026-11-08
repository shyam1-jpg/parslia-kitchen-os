(function () {
  "use strict";

  var DATA = window.VEDANTA_SOP_DATA;
  var main = document.getElementById("main");
  var screenTitle = document.getElementById("screenTitle");
  var brandMark = document.getElementById("brandMark");
  var backBtn = document.getElementById("backBtn");
  var searchToggle = document.getElementById("searchToggle");
  var searchBar = document.getElementById("searchBar");
  var searchInput = document.getElementById("searchInput");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));

  var state = {
    tab: "home",
    sopId: null,
    query: "",
    searchOpen: false,
    deferredPrompt: null
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findSop(id) {
    for (var i = 0; i < DATA.sops.length; i++) {
      if (DATA.sops[i].id === id) return DATA.sops[i];
    }
    return null;
  }

  function filteredSops() {
    var q = state.query.trim().toLowerCase();
    if (!q) return DATA.sops;
    return DATA.sops.filter(function (sop) {
      var blob = (sop.code + " " + sop.title + " " + sop.blurb).toLowerCase();
      sop.sections.forEach(function (sec) {
        blob += " " + sec.h;
        if (sec.body) blob += " " + sec.body;
        if (sec.bullets) blob += " " + sec.bullets.join(" ");
      });
      return blob.indexOf(q) !== -1;
    });
  }

  function sopRowsHtml(list) {
    if (!list.length) {
      return '<div class="empty">No SOPs match that search.</div>';
    }
    return (
      '<div class="sop-list">' +
      list
        .map(function (sop) {
          return (
            '<button type="button" class="sop-row" data-open="' +
            escapeHtml(sop.id) +
            '">' +
            '<span class="sop-glyph">' +
            escapeHtml(sop.code) +
            "</span>" +
            "<div><strong>" +
            escapeHtml(sop.title) +
            "</strong><span>" +
            escapeHtml(sop.blurb) +
            "</span></div>" +
            '<span class="chev" aria-hidden="true">›</span>' +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderHome() {
    screenTitle.textContent = "Veg SOP";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    main.innerHTML =
      '<section class="hero">' +
      '<h2 class="hero-brand">' +
      escapeHtml(DATA.company) +
      "</h2>" +
      "<p>" +
      escapeHtml(DATA.tagline) +
      "</p>" +
      '<div class="hero-meta">' +
      '<span class="chip">No onion</span>' +
      '<span class="chip">No garlic</span>' +
      '<span class="chip">Hing OK</span>' +
      '<span class="chip">v' +
      escapeHtml(DATA.version) +
      "</span>" +
      "</div></section>" +
      '<p class="section-label">Quick open</p>' +
      sopRowsHtml(DATA.sops.slice(0, 4)) +
      '<p class="section-label" style="margin-top:18px">All procedures</p>' +
      '<button type="button" class="btn" id="gotoSops">Open full SOP list</button>';
  }

  function renderSops() {
    screenTitle.textContent = "All SOPs";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    main.innerHTML =
      '<div class="warn-banner">Hard rule: no onion, no garlic, no other alliums. Chai SOP is out of scope.</div>' +
      '<p class="section-label">' +
      filteredSops().length +
      " procedures</p>" +
      sopRowsHtml(filteredSops());
  }

  function renderRules() {
    screenTitle.textContent = "Hard rules";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    main.innerHTML =
      '<div class="warn-banner">Non-negotiable for every Vedanta Limited vegetarian kitchen.</div>' +
      '<ul class="rule-list">' +
      DATA.hardRules
        .map(function (r) {
          return "<li>" + escapeHtml(r) + "</li>";
        })
        .join("") +
      "</ul>";
  }

  function renderInstall() {
    screenTitle.textContent = "Install";
    brandMark.textContent = "Pocket app";
    backBtn.hidden = true;
    var canPrompt = !!state.deferredPrompt;
    main.innerHTML =
      '<div class="install-panel">' +
      "<h2>Add to your phone</h2>" +
      "<p>Works on Android and iPhone. Install once, then open offline like a normal app.</p>" +
      "<h3 style=\"margin:0 0 8px;font-size:0.95rem\">Android (Chrome)</h3>" +
      "<ol>" +
      "<li>Open this page in Chrome.</li>" +
      "<li>Tap the menu ⋮ → <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>" +
      "<li>Confirm. The Vedanta SOP icon appears on your home screen.</li>" +
      "</ol>" +
      "<h3 style=\"margin:0 0 8px;font-size:0.95rem\">iPhone / iPad (Safari)</h3>" +
      "<ol>" +
      "<li>Open this page in Safari (not Chrome).</li>" +
      "<li>Tap the Share button □↑.</li>" +
      "<li>Scroll and tap <strong>Add to Home Screen</strong>.</li>" +
      "<li>Tap Add. Open it from your home screen anytime.</li>" +
      "</ol>" +
      '<button type="button" class="btn" id="installBtn"' +
      (canPrompt ? "" : " disabled") +
      ">" +
      (canPrompt ? "Install now" : "Use browser menu to install") +
      "</button>" +
      '<button type="button" class="btn btn-ghost" id="offlineHint">Works offline after first open</button>' +
      "</div>";
  }

  function renderDetail(sop) {
    screenTitle.textContent = sop.code;
    brandMark.textContent = DATA.company;
    backBtn.hidden = false;
    var sections = sop.sections
      .map(function (sec) {
        var inner = "";
        if (sec.body) inner += "<p>" + escapeHtml(sec.body) + "</p>";
        if (sec.bullets && sec.bullets.length) {
          inner +=
            "<ul>" +
            sec.bullets
              .map(function (b) {
                return "<li>" + escapeHtml(b) + "</li>";
              })
              .join("") +
            "</ul>";
        }
        return (
          '<article class="block"><h3>' +
          escapeHtml(sec.h) +
          "</h3>" +
          inner +
          "</article>"
        );
      })
      .join("");

    main.innerHTML =
      '<div class="detail-head">' +
      '<div class="detail-code">' +
      escapeHtml(sop.code) +
      "</div>" +
      "<h2>" +
      escapeHtml(sop.title) +
      "</h2>" +
      "<p>" +
      escapeHtml(sop.blurb) +
      "</p></div>" +
      sections;
  }

  function setTabActive(tab) {
    tabs.forEach(function (btn) {
      var on = btn.getAttribute("data-tab") === tab;
      btn.classList.toggle("active", on);
      if (on) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
  }

  function render() {
    main.style.animation = "none";
    // eslint-disable-next-line no-unused-expressions
    main.offsetHeight;
    main.style.animation = "";

    if (state.sopId) {
      var sop = findSop(state.sopId);
      if (sop) {
        setTabActive("sops");
        renderDetail(sop);
        return;
      }
      state.sopId = null;
    }

    setTabActive(state.tab);
    if (state.tab === "home") renderHome();
    else if (state.tab === "sops") renderSops();
    else if (state.tab === "rules") renderRules();
    else renderInstall();
  }

  function goTab(tab) {
    state.tab = tab;
    state.sopId = null;
    if (tab !== "sops") {
      state.searchOpen = false;
      searchBar.hidden = true;
    }
    render();
  }

  document.querySelector(".tabbar").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn) return;
    goTab(btn.getAttribute("data-tab"));
  });

  backBtn.addEventListener("click", function () {
    state.sopId = null;
    state.tab = "sops";
    render();
  });

  searchToggle.addEventListener("click", function () {
    state.tab = "sops";
    state.sopId = null;
    state.searchOpen = !state.searchOpen;
    searchBar.hidden = !state.searchOpen;
    render();
    if (state.searchOpen) searchInput.focus();
  });

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value;
    state.tab = "sops";
    state.sopId = null;
    render();
  });

  main.addEventListener("click", function (e) {
    var open = e.target.closest("[data-open]");
    if (open) {
      state.sopId = open.getAttribute("data-open");
      searchBar.hidden = true;
      state.searchOpen = false;
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (e.target.id === "gotoSops") {
      goTab("sops");
      return;
    }
    if (e.target.id === "installBtn" && state.deferredPrompt) {
      state.deferredPrompt.prompt();
      state.deferredPrompt.userChoice.finally(function () {
        state.deferredPrompt = null;
        render();
      });
    }
  });

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    state.deferredPrompt = e;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }

  render();
})();
