(function () {
  "use strict";

  var DATA = window.KITELINE_SOP_DATA;
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
    category: "all",
    searchOpen: false,
    deferredPrompt: null
  };

  var player = {
    sopId: null,
    playing: false,
    t: 0,
    timer: null
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

  function catLabel(id) {
    for (var i = 0; i < DATA.categories.length; i++) {
      if (DATA.categories[i].id === id) return DATA.categories[i].label;
    }
    return id;
  }

  function filteredSops() {
    var q = state.query.trim().toLowerCase();
    return DATA.sops.filter(function (sop) {
      if (state.category !== "all" && sop.category !== state.category) return false;
      if (!q) return true;
      var blob = (sop.code + " " + sop.title + " " + sop.blurb + " " + catLabel(sop.category)).toLowerCase();
      sop.sections.forEach(function (sec) {
        blob += " " + sec.h;
        if (sec.body) blob += " " + sec.body;
        if (sec.bullets) blob += " " + sec.bullets.join(" ");
      });
      if (sop.video) blob += " " + sop.video.title;
      return blob.indexOf(q) !== -1;
    });
  }

  function sopRowsHtml(list) {
    if (!list.length) return '<div class="empty">No SOPs match that filter.</div>';
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
            escapeHtml(catLabel(sop.category) + " · " + sop.blurb) +
            "</span></div>" +
            '<span class="chev" aria-hidden="true">›</span>' +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function filterBarHtml() {
    var chips =
      '<button type="button" class="filter' +
      (state.category === "all" ? " active" : "") +
      '" data-cat="all">All</button>' +
      DATA.categories
        .map(function (c) {
          return (
            '<button type="button" class="filter' +
            (state.category === c.id ? " active" : "") +
            '" data-cat="' +
            escapeHtml(c.id) +
            '">' +
            escapeHtml(c.label) +
            "</button>"
          );
        })
        .join("");
    return '<div class="filters" role="tablist" aria-label="Sort by station">' + chips + "</div>";
  }

  function stopPlayer() {
    if (player.timer) {
      clearInterval(player.timer);
      player.timer = null;
    }
    player.playing = false;
  }

  function currentScene(sop, t) {
    var scenes = sop.video.scenes;
    var cur = scenes[0];
    for (var i = 0; i < scenes.length; i++) {
      if (t >= scenes[i].t) cur = scenes[i];
    }
    return cur;
  }

  function fmtTime(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function paintPlayer(sop) {
    var stage = document.getElementById("playerStage");
    var fill = document.getElementById("playerFill");
    var time = document.getElementById("playerTime");
    var toggle = document.getElementById("playerToggle");
    if (!stage || !sop.video) return;
    var scene = currentScene(sop, player.t);
    var dur = sop.video.durationSec;
    stage.innerHTML =
      '<p class="player-kicker">Short video · ' +
      escapeHtml(catLabel(sop.category)) +
      "</p><h3>" +
      escapeHtml(scene.title) +
      "</h3><p>" +
      escapeHtml(scene.line) +
      "</p>";
    if (fill) fill.style.width = Math.min(100, (player.t / dur) * 100) + "%";
    if (time) time.textContent = fmtTime(player.t) + " / " + fmtTime(dur);
    if (toggle) toggle.textContent = player.playing ? "Pause" : "Play";
  }

  function startPlayer(sop) {
    stopPlayer();
    player.sopId = sop.id;
    player.playing = true;
    player.timer = setInterval(function () {
      if (!player.playing) return;
      player.t += 0.25;
      if (player.t >= sop.video.durationSec) {
        player.t = sop.video.durationSec;
        stopPlayer();
      }
      paintPlayer(sop);
    }, 250);
    paintPlayer(sop);
  }

  function renderHome() {
    screenTitle.textContent = "Kitchen SOP";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    main.innerHTML =
      '<section class="hero">' +
      '<div class="hero-lockup"><img src="icons/mark.png" alt="Kiteline" width="48" height="48">' +
      "<div><h2>Kiteline Kitchen SOP</h2></div></div>" +
      "<p>" +
      escapeHtml(DATA.tagline) +
      "</p>" +
      '<div class="hero-meta">' +
      '<span class="chip">Commercial only</span>' +
      '<span class="chip">HACCP</span>' +
      '<span class="chip">Allergens</span>' +
      '<span class="chip">Short videos</span>' +
      '<span class="chip">v' +
      escapeHtml(DATA.version) +
      "</span></div></section>" +
      '<p class="section-label">Start here</p>' +
      sopRowsHtml(DATA.sops.slice(0, 4)) +
      '<p class="section-label" style="margin-top:18px">Full pack</p>' +
      '<button type="button" class="btn" id="gotoSops">All kitchen SOPs</button>' +
      '<button type="button" class="btn ghost" id="gotoVideos" style="margin-top:10px">Sort short videos</button>' +
      '<button type="button" class="btn ghost" id="gotoInstall" style="margin-top:10px">Install on phone</button>';
  }

  function renderSops() {
    screenTitle.textContent = "All SOPs";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    var list = filteredSops();
    main.innerHTML =
      '<div class="warn-banner">Professional commercial kitchen only — hotels, restaurants, catering, schools, production. Not home cooking.</div>' +
      filterBarHtml() +
      '<p class="section-label">' +
      list.length +
      " procedures</p>" +
      sopRowsHtml(list);
  }

  function renderVideos() {
    screenTitle.textContent = "Short videos";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    var list = filteredSops();
    var rows = list
      .map(function (sop) {
        return (
          '<button type="button" class="sop-row" data-open="' +
          escapeHtml(sop.id) +
          '">' +
          '<span class="sop-glyph">▶</span>' +
          "<div><strong>" +
          escapeHtml(sop.video.title) +
          "</strong><span>" +
          escapeHtml(sop.code + " · " + catLabel(sop.category) + " · " + sop.video.durationSec + "s") +
          "</span></div>" +
          '<span class="chev">›</span></button>'
        );
      })
      .join("");
    main.innerHTML =
      '<p class="section-label">Sort by station</p>' +
      filterBarHtml() +
      '<p class="section-label">' +
      list.length +
      " short briefings</p>" +
      '<div class="sop-list">' +
      rows +
      "</div>";
  }

  function renderRules() {
    screenTitle.textContent = "House rules";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    main.innerHTML =
      '<div class="warn-banner">Post these on the pass. Every starter signs CK-00 and CK-06.</div>' +
      '<div class="rule-list">' +
      DATA.hardRules
        .map(function (r) {
          return '<div class="rule">' + escapeHtml(r) + "</div>";
        })
        .join("") +
      "</div>";
  }

  function renderInstall() {
    screenTitle.textContent = "Install";
    brandMark.textContent = DATA.company;
    backBtn.hidden = true;
    var installBtn = state.deferredPrompt
      ? '<button type="button" class="btn" id="installBtn">Install this app</button>'
      : "";
    main.innerHTML =
      '<section class="block install"><h3>Android (Chrome)</h3>' +
      "<ol><li>Open this page in Chrome.</li><li>Menu ⋮ → <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Open Kitchen SOP from the home screen.</li></ol></section>" +
      '<section class="block install"><h3>iPhone / iPad (Safari)</h3>' +
      "<ol><li>Open this page in Safari.</li><li>Share □↑ → <b>Add to Home Screen</b>.</li><li>Tap Add. Works offline after first open.</li></ol></section>" +
      installBtn +
      '<p class="section-label" style="margin-top:18px">For</p>' +
      "<p>" +
      escapeHtml(DATA.audience) +
      "</p>";
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
        return '<article class="block"><h3>' + escapeHtml(sec.h) + "</h3>" + inner + "</article>";
      })
      .join("");

    main.innerHTML =
      '<div class="detail-head"><div class="detail-code">' +
      escapeHtml(sop.code + " · " + catLabel(sop.category)) +
      "</div><h2>" +
      escapeHtml(sop.title) +
      "</h2><p>" +
      escapeHtml(sop.blurb) +
      "</p></div>" +
      '<div class="player" id="sopPlayer">' +
      '<div class="player-stage" id="playerStage"></div>' +
      '<div class="player-bar">' +
      '<button type="button" id="playerToggle">Play</button>' +
      '<div class="player-progress"><span id="playerFill"></span></div>' +
      '<div class="player-time" id="playerTime"></div></div></div>' +
      sections;

    if (player.sopId !== sop.id) {
      player.t = 0;
      player.sopId = sop.id;
      stopPlayer();
    }
    paintPlayer(sop);
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
    main.offsetHeight;
    main.style.animation = "";

    if (state.sopId) {
      var sop = findSop(state.sopId);
      if (sop) {
        setTabActive(state.tab === "videos" ? "videos" : "sops");
        renderDetail(sop);
        return;
      }
      state.sopId = null;
    }

    stopPlayer();
    setTabActive(state.tab);
    if (state.tab === "home") renderHome();
    else if (state.tab === "sops") renderSops();
    else if (state.tab === "videos") renderVideos();
    else if (state.tab === "rules") renderRules();
    else renderInstall();
  }

  function goTab(tab) {
    state.tab = tab;
    state.sopId = null;
    if (tab !== "sops" && tab !== "videos") {
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
    if (state.tab !== "videos") state.tab = "sops";
    render();
  });

  searchToggle.addEventListener("click", function () {
    if (state.tab !== "videos") state.tab = "sops";
    state.sopId = null;
    state.searchOpen = !state.searchOpen;
    searchBar.hidden = !state.searchOpen;
    render();
    if (state.searchOpen) searchInput.focus();
  });

  searchInput.addEventListener("input", function () {
    state.query = searchInput.value;
    if (state.tab !== "videos") state.tab = "sops";
    state.sopId = null;
    render();
  });

  main.addEventListener("click", function (e) {
    var cat = e.target.closest("[data-cat]");
    if (cat) {
      state.category = cat.getAttribute("data-cat");
      render();
      return;
    }
    var open = e.target.closest("[data-open]");
    if (open) {
      state.sopId = open.getAttribute("data-open");
      searchBar.hidden = true;
      state.searchOpen = false;
      player.t = 0;
      stopPlayer();
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (e.target.id === "gotoSops") {
      goTab("sops");
      return;
    }
    if (e.target.id === "gotoVideos") {
      goTab("videos");
      return;
    }
    if (e.target.id === "gotoInstall") {
      goTab("install");
      return;
    }
    if (e.target.id === "playerToggle") {
      var sop = findSop(state.sopId);
      if (!sop) return;
      if (player.playing) {
        player.playing = false;
        stopPlayer();
        paintPlayer(sop);
      } else {
        if (player.t >= sop.video.durationSec) player.t = 0;
        startPlayer(sop);
      }
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
