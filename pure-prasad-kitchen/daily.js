(function () {
  "use strict";

  var dateEl = document.getElementById("ppkDate");
  var themeEl = document.getElementById("ppkTheme");
  var titleEl = document.getElementById("ppkTitle");
  var ideaEl = document.getElementById("ppkIdea");
  var actionEl = document.getElementById("ppkAction");
  var metaEl = document.getElementById("ppkMeta");
  var statusEl = document.getElementById("ppkStatus");
  var archiveEl = document.getElementById("ppkArchive");

  function todayISO() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function formatNice(iso) {
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return iso;
    }
  }

  function dayOfYear(d) {
    var start = new Date(d.getFullYear(), 0, 0);
    var diff = d - start;
    return Math.floor(diff / 86400000);
  }

  function pickFromBank(tips) {
    if (!tips || !tips.length) return null;
    var idx = (dayOfYear(new Date()) - 1) % tips.length;
    return tips[idx];
  }

  function renderTip(tip, opts) {
    if (!tip) return;
    opts = opts || {};
    if (dateEl) dateEl.textContent = formatNice(opts.date || todayISO());
    if (themeEl) themeEl.textContent = tip.theme || "Ayurvedic idea";
    if (titleEl) titleEl.textContent = tip.title || "";
    if (ideaEl) ideaEl.textContent = tip.idea || "";
    if (actionEl) actionEl.textContent = tip.action || "";
    if (metaEl) {
      var bits = [];
      if (tip.dosha_focus) bits.push("Focus: " + tip.dosha_focus);
      if (tip.season) bits.push("Season: " + tip.season);
      metaEl.textContent = bits.join(" · ");
    }
    if (statusEl) {
      statusEl.textContent =
        opts.source === "today.json"
          ? "Today’s featured idea (auto file)"
          : "Auto-selected for today from the Pure Prasad tip bank";
    }
    document.title = (tip.title || "Daily idea") + " | Pure Prasad Kitchen";
  }

  function fillArchive(tips) {
    if (!archiveEl || !tips || !tips.length) return;
    var frag = document.createDocumentFragment();
    tips.slice(0, 12).forEach(function (tip) {
      var li = document.createElement("li");
      var strong = document.createElement("strong");
      strong.textContent = tip.title;
      var span = document.createElement("span");
      span.textContent = tip.theme + " — " + tip.idea;
      li.appendChild(strong);
      li.appendChild(span);
      frag.appendChild(li);
    });
    archiveEl.innerHTML = "";
    archiveEl.appendChild(frag);
  }

  function load() {
    var date = todayISO();
    Promise.all([
      fetch("content/today.json", { cache: "no-store" }).then(function (r) {
        return r.ok ? r.json() : null;
      }),
      fetch("content/tips.json", { cache: "no-store" }).then(function (r) {
        return r.ok ? r.json() : null;
      }),
    ])
      .then(function (pair) {
        var todayDoc = pair[0];
        var bank = pair[1];
        var tips = (bank && bank.tips) || [];

        if (todayDoc && todayDoc.date === date && todayDoc.tip) {
          renderTip(todayDoc.tip, { date: date, source: "today.json" });
        } else {
          renderTip(pickFromBank(tips), { date: date, source: "rotation" });
        }

        // Show a rotating preview of upcoming themes (skip today’s title)
        var start = (dayOfYear(new Date())) % Math.max(tips.length, 1);
        var preview = [];
        for (var i = 0; i < tips.length && preview.length < 12; i++) {
          preview.push(tips[(start + i) % tips.length]);
        }
        fillArchive(preview);
      })
      .catch(function () {
        if (titleEl) titleEl.textContent = "Warm water before the rush";
        if (ideaEl)
          ideaEl.textContent =
            "Could not load today’s tip file. Try refreshing — Pure Prasad Kitchen still believes in a calm first sip.";
        if (actionEl) actionEl.textContent = "Drink a cup of warm water, then reload this page.";
      });
  }

  // Subtle hero motion
  var hero = document.querySelector(".ppk-hero-panel");
  if (hero && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    requestAnimationFrame(function () {
      hero.classList.add("is-in");
    });
  }

  var reveal = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    reveal.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveal.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  load();
})();
