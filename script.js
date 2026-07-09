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
})();
