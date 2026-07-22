(function () {
  var COOKIE_KEY = "parslia_cookie_consent";
  var checklist = document.getElementById("onboardingChecklist");
  var progress = document.getElementById("checklistProgress");
  var banner = document.getElementById("cookieBanner");
  var menuBtn = document.getElementById("menuBtn");
  var sidebar = document.getElementById("appSidebar");
  var backdrop = document.getElementById("sidebarBackdrop");

  function updateChecklistProgress() {
    if (!checklist || !progress) return;
    var boxes = checklist.querySelectorAll("input[data-step]");
    var done = 0;
    boxes.forEach(function (box) {
      if (box.checked) done += 1;
    });
    progress.textContent = done + " of " + boxes.length + " done";
  }

  if (checklist) {
    checklist.addEventListener("change", updateChecklistProgress);
    updateChecklistProgress();
  }

  function setConsent(value) {
    try {
      localStorage.setItem(COOKIE_KEY, value);
    } catch (e) { /* ignore */ }
    if (banner) banner.hidden = true;
  }

  if (banner) {
    var existing = null;
    try {
      existing = localStorage.getItem(COOKIE_KEY);
    } catch (e) { /* ignore */ }
    if (!existing) banner.hidden = false;

    var accept = document.getElementById("cookieAccept");
    var essential = document.getElementById("cookieEssential");
    if (accept) accept.addEventListener("click", function () { setConsent("all"); });
    if (essential) essential.addEventListener("click", function () { setConsent("essential"); });
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("open");
    if (backdrop) backdrop.hidden = true;
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("open");
    if (backdrop) backdrop.hidden = false;
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
  }

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      if (sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  if (sidebar) {
    sidebar.querySelectorAll("a.nav-item").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 860px)").matches) closeSidebar();
      });
    });
  }
})();
