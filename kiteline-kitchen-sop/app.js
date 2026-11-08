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
  var networkStatus = document.getElementById("networkStatus");
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
    timer: null,
    rate: 1,
    narration: true,
    sceneTitle: null
  };

  var completed = JSON.parse(localStorage.getItem("kiteline-sop-completed-v1") || "{}");
  var competencyResults = JSON.parse(localStorage.getItem("kiteline-sop-competency-v1") || "{}");
  var evidenceLedger = JSON.parse(localStorage.getItem("kiteline-sop-evidence-v1") || "[]");

  function recordEvidence(type, sop, detail) {
    var event = { id: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random()), type: type, sopId: sop.id, sopVersion: sop.revision, occurredAt: new Date().toISOString(), pendingSync: true, detail: detail || {} };
    evidenceLedger.push(event);
    localStorage.setItem("kiteline-sop-evidence-v1", JSON.stringify(evidenceLedger));
    return event;
  }

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
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speakScene(scene) {
    if (!player.narration || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(scene.title + ". " + scene.line);
    utterance.lang = "en-GB";
    utterance.rate = player.rate;
    var voices = window.speechSynthesis.getVoices();
    var preferred = voices.find(function (v) { return v.lang === "en-GB" && /premium|natural|enhanced/i.test(v.name); }) || voices.find(function (v) { return v.lang === "en-GB"; });
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
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
      '<div class="scene-visual" aria-hidden="true"><span></span><span></span><span></span></div><p class="player-kicker">Narrated animation · ' +
      escapeHtml(catLabel(sop.category)) +
      "</p><h3>" +
      escapeHtml(scene.title) +
      "</h3><p>" +
      escapeHtml(scene.line) +
      "</p>";
    if (player.playing && player.sceneTitle !== scene.title) {
      player.sceneTitle = scene.title;
      speakScene(scene);
    }
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
        completed[sop.id] = { version: sop.revision, completedAt: new Date().toISOString() };
        localStorage.setItem("kiteline-sop-completed-v1", JSON.stringify(completed));
        recordEvidence("training.completed", sop, { durationSec: sop.video.durationSec, narrated: player.narration });
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
      '<span class="chip">Narrated training</span>' +
      '<span class="chip">v' +
      escapeHtml(DATA.version) +
      "</span></div>" +
      '<p class="hero-url"><a href="https://kiteline.uk/kitchen-sop/">kiteline.uk/kitchen-sop</a></p></section>' +
      '<p class="section-label">Start here</p>' +
      sopRowsHtml(DATA.sops.slice(0, 4)) +
      '<p class="section-label" style="margin-top:18px">Full pack</p>' +
      '<button type="button" class="btn" id="gotoSops">All kitchen SOPs</button>' +
      '<button type="button" class="btn ghost" id="gotoVideos" style="margin-top:10px">Narrated training</button>' +
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
    screenTitle.textContent = "Narrated training";
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
          escapeHtml(sop.code + " · " + catLabel(sop.category) + " · " + sop.video.durationSec + "s" + (completed[sop.id] && completed[sop.id].version === sop.revision ? " · Completed" : "")) +
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
      " narrated briefings</p>" +
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
      "</p><p class=\"doc-control\">Version " + escapeHtml(sop.revision) + " · Effective " + escapeHtml(sop.effectiveDate) + " · Review " + escapeHtml(sop.reviewDate) + "</p></div>" +
      '<div class="player" id="sopPlayer">' +
      '<div class="player-stage" id="playerStage"></div>' +
      '<div class="player-bar">' +
      '<button type="button" id="playerToggle">Play</button>' +
      '<button type="button" id="narrationToggle" aria-pressed="true">Voice on</button>' +
      '<div class="player-progress" id="playerSeek" role="slider" aria-label="Training progress" tabindex="0"><span id="playerFill"></span></div>' +
      '<div class="player-time" id="playerTime"></div></div></div>' +
      sections + assessmentHtml(sop);

    if (player.sopId !== sop.id) {
      player.t = 0;
      player.sopId = sop.id;
      stopPlayer();
    }
    paintPlayer(sop);
  }

  function assessmentHtml(sop) {
    var prior = competencyResults[sop.id];
    var questions = sop.assessment.questions.map(function (q, qi) {
      return '<fieldset class="quiz-question"><legend>' + (qi + 1) + '. ' + escapeHtml(q.prompt) + '</legend>' + q.options.map(function (option, oi) {
        return '<label><input type="radio" name="q' + qi + '" value="' + oi + '"> <span>' + escapeHtml(option) + '</span></label>';
      }).join("") + '</fieldset>';
    }).join("");
    return '<section class="block competency"><h3>Competency check</h3><p>Pass mark: 100%. Results are stored offline with the controlled SOP version.</p>' + questions + '<button type="button" class="btn" id="submitAssessment">Submit competency check</button><div id="assessmentResult" role="status" aria-live="polite">' + (prior ? escapeHtml("Previous result: " + prior.score + "% · " + (prior.passed ? "Passed" : "Retraining required")) : "") + '</div></section>' +
      '<section class="block"><h3>Evidence & audit</h3><ul>' + sop.evidenceRequired.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join("") + '</ul><button type="button" class="btn ghost" id="exportEvidence">Export offline evidence ledger</button></section>';
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
    if (e.target.id === "narrationToggle") {
      player.narration = !player.narration;
      e.target.textContent = player.narration ? "Voice on" : "Voice off";
      e.target.setAttribute("aria-pressed", player.narration ? "true" : "false");
      if (!player.narration && "speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    var seek = e.target.closest("#playerSeek");
    if (seek) {
      var sopSeek = findSop(state.sopId);
      var rect = seek.getBoundingClientRect();
      player.t = Math.max(0, Math.min(sopSeek.video.durationSec, ((e.clientX - rect.left) / rect.width) * sopSeek.video.durationSec));
      player.sceneTitle = null;
      paintPlayer(sopSeek);
      return;
    }
    if (e.target.id === "submitAssessment") {
      var assessedSop = findSop(state.sopId);
      var answers = assessedSop.assessment.questions.map(function (_, qi) {
        var selected = main.querySelector('input[name="q' + qi + '"]:checked');
        return selected ? Number(selected.value) : -1;
      });
      var correct = answers.filter(function (answer, qi) { return answer === assessedSop.assessment.questions[qi].correctIndex; }).length;
      var score = Math.round((correct / answers.length) * 100);
      var passed = score >= assessedSop.assessment.passPercent;
      competencyResults[assessedSop.id] = { score: score, passed: passed, sopVersion: assessedSop.revision, attemptedAt: new Date().toISOString() };
      localStorage.setItem("kiteline-sop-competency-v1", JSON.stringify(competencyResults));
      recordEvidence(passed ? "competency.passed" : "competency.retraining_required", assessedSop, { score: score, answersComplete: answers.indexOf(-1) === -1 });
      document.getElementById("assessmentResult").textContent = passed ? "Passed: " + score + "%. Manager sign-off may now be completed." : "Score: " + score + "%. Review this SOP and repeat the check.";
      return;
    }
    if (e.target.id === "exportEvidence") {
      var blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records: evidenceLedger }, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "kiteline-sop-evidence-" + new Date().toISOString().slice(0, 10) + ".json";
      link.click();
      URL.revokeObjectURL(link.href);
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
      navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {});
    });
  }

  function updateNetworkStatus() {
    if (!networkStatus) return;
    networkStatus.hidden = navigator.onLine;
    networkStatus.textContent = navigator.onLine ? "" : "Offline mode — saved SOPs and training remain available; updates resume when connected.";
  }
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  updateNetworkStatus();

  render();
})();
