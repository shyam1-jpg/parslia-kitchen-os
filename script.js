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
      var company = (form.company && form.company.value.trim()) || "";
      var role = (form.role && form.role.value.trim()) || "";
      var businessType = (form.businessType && form.businessType.value) || "";
      var locations = (form.locations && form.locations.value) || "";
      var staff = (form.staff && form.staff.value) || "";
      var device = (form.device && form.device.value) || "";
      var problem = (form.problem && form.problem.value.trim()) || "";
      var message = (form.message && form.message.value.trim()) || "";
      var consentContact = form.consentContact && form.consentContact.checked;
      var consentPrivacy = form.consentPrivacy && form.consentPrivacy.checked;

      if (!name || !email) {
        setNote("Please add your name and email so we can reply.", "err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setNote("That email address does not look right.", "err");
        return;
      }
      if (!consentContact || !consentPrivacy) {
        setNote("Please confirm contact permission and the Privacy Policy.", "err");
        return;
      }

      var modules = [];
      form.querySelectorAll('input[name="modules"]:checked').forEach(function (box) {
        modules.push(box.value);
      });

      var subject = "Parslia early access request — " + name;
      var body =
        "Name: " + name + "\n" +
        "Email: " + email + "\n" +
        "Company / Kitchen: " + (company || "-") + "\n" +
        "Role: " + (role || "-") + "\n" +
        "Business type: " + (businessType || "-") + "\n" +
        "Locations: " + (locations || "-") + "\n" +
        "Staff: " + (staff || "-") + "\n" +
        "Preferred device: " + (device || "-") + "\n" +
        "Main problem: " + (problem || "-") + "\n" +
        "Interested modules: " + (modules.length ? modules.join(", ") : "-") + "\n" +
        "Consent to contact: yes\n" +
        "Agreed to Privacy Policy: yes\n\n" +
        "Message:\n" + (message || "-") + "\n";

      var mailto =
        "mailto:hello@parslia.app?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      window.location.href = mailto;
      setNote("", "");
      var success = document.getElementById("formSuccess");
      if (success) success.hidden = false;
      form.reset();
    });
  }

  function setNote(text, kind) {
    if (!note) return;
    note.textContent = text;
    note.className = "form-note " + (kind || "");
    if (kind === "err") {
      var success = document.getElementById("formSuccess");
      if (success) success.hidden = true;
    }
  }
})();
