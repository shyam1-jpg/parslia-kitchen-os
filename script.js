(function () {
  "use strict";

  // Mobile menu toggle
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Subtle fade-up on section entry
  if ("IntersectionObserver" in window) {
    var fadeEls = document.querySelectorAll(".fade-up");
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    fadeEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll(".fade-up").forEach(function (el) {
      el.classList.add("visible");
    });
  }

  // Early access form -> mailto:hello@parslia.app
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var company = form.company.value.trim();
      var role = form.role.value.trim();
      var message = form.message.value.trim();

      if (!name || !email) {
        setNote("Please add your name and email so we can reply.", "err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNote("That email address does not look right.", "err");
        return;
      }

      var subject = "Parslia early access request — " + name;
      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Company / Kitchen: " + (company || "-") + "\n" +
        "Role: " + (role || "-") + "\n\n" +
        "Message:\n" + (message || "-") + "\n";

      var mailto =
        "mailto:hello@parslia.app?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      window.location.href = mailto;
      setNote(
        "Thank you. Your early access request has been received. We will contact you soon.",
        "ok"
      );
      form.reset();
    });
  }

  function setNote(text, kind) {
    if (!note) return;
    note.textContent = text;
    note.className = "form-note " + (kind || "");
  }

  var SUPPORT_EMAIL = "hello@parslia.app";
  var REASON_LABELS = {
    harmful: "Harmful",
    offensive: "Offensive",
    wrong: "Wrong or misleading",
    other: "Other"
  };

  function setReportNote(form, text, kind) {
    var reportNote = form.querySelector("#reportFormNote") || form.querySelector(".form-note");
    if (!reportNote) return;
    reportNote.textContent = text;
    reportNote.className = "form-note " + (kind || "");
  }

  function buildReportMailto(data) {
    var reasonLabel = REASON_LABELS[data.reason] || data.reason;
    var subject = "Report an Issue — AI-generated content (" + reasonLabel + ")";
    var body =
      "I am reporting inappropriate AI-generated content in Parslia Kitchen OS.\n\n" +
      "Feature: " + data.feature + "\n" +
      "Reason: " + reasonLabel + "\n" +
      "Reporter email: " + (data.email || "not provided") + "\n" +
      "Page: " + window.location.href + "\n\n" +
      "Description of the AI-generated content:\n" +
      data.details + "\n";
    return (
      "mailto:" + SUPPORT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body)
    );
  }

  function bindReportForm(form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var featureEl = form.querySelector('[name="feature"]');
      var reasonEl = form.querySelector('[name="reason"]');
      var detailsEl = form.querySelector('[name="details"]');
      var emailEl = form.querySelector('[name="email"]');
      var feature = featureEl ? featureEl.value.trim() : "Other AI output";
      var reason = reasonEl ? reasonEl.value.trim() : "";
      var details = detailsEl ? detailsEl.value.trim() : "";
      var email = emailEl ? emailEl.value.trim() : "";

      if (!reason) {
        setReportNote(form, "Please choose a reason for this report.", "err");
        return;
      }
      if (!details) {
        setReportNote(form, "Please describe the AI-generated content you are reporting.", "err");
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setReportNote(form, "That email address does not look right.", "err");
        return;
      }

      window.location.href = buildReportMailto({
        feature: feature,
        reason: reason,
        details: details,
        email: email
      });
      setReportNote(
        form,
        "Thank you. Your report has been submitted. We will review the AI-generated content.",
        "ok"
      );
      form.reset();
    });
  }

  document.querySelectorAll("form.report-form").forEach(bindReportForm);

  var reportDialog = document.getElementById("reportIssueDialog");
  function openReportDialog(feature) {
    if (!reportDialog || typeof reportDialog.showModal !== "function") {
      window.location.href = "report.html";
      return;
    }
    var featureSelect = reportDialog.querySelector('[name="feature"]');
    if (feature && featureSelect) featureSelect.value = feature;
    var noteEl = reportDialog.querySelector("#reportFormNote");
    if (noteEl) {
      noteEl.textContent = "";
      noteEl.className = "form-note";
    }
    reportDialog.showModal();
  }
  function closeReportDialog() {
    if (reportDialog && reportDialog.open) reportDialog.close();
  }

  document.querySelectorAll("[data-open-report]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openReportDialog(btn.getAttribute("data-report-feature") || "");
    });
  });
  document.querySelectorAll("[data-close-report]").forEach(function (btn) {
    btn.addEventListener("click", closeReportDialog);
  });
  if (reportDialog) {
    reportDialog.addEventListener("click", function (e) {
      if (e.target === reportDialog) closeReportDialog();
    });
  }
  if (reportDialog && (window.location.hash === "#report-issue" || window.location.hash === "#report-ai")) {
    openReportDialog("");
  }
})();
