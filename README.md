# parslia-kitchen-os
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Parslia Kitchen OS | Smart Kitchen Software for Chefs</title>
  <meta name="description" content="Parslia Kitchen OS helps chefs and food teams manage recipes, menus, allergens, stock, suppliers, rota, logs, labels and kitchen operations in one professional system." />
  <meta name="keywords" content="kitchen software, chef app, recipe management, menu planner, allergen software, catering software, kitchen OS, Parslia" />
  <meta name="theme-color" content="#063F32" />
  <link rel="canonical" href="https://parslia.app/" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="Parslia Kitchen OS | Smart Kitchen Software for Chefs" />
  <meta property="og:description" content="Smarter kitchens. Calmer chefs. Manage recipes, menus, allergens, stock, suppliers, rota and logs in one calm, organised system." />
  <meta property="og:url" content="https://parslia.app/" />
  <meta property="og:image" content="assets/USE_THIS_parslia_app_icon_1024.png" />
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Favicon / app icon: use ONLY the provided app-icon file -->
  <link rel="icon" href="assets/USE_THIS_parslia_app_icon_1024.png" />
  <link rel="apple-touch-icon" href="assets/USE_THIS_parslia_app_icon_1024.png" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Parslia Kitchen OS",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "description": "Parslia Kitchen OS helps chefs and food teams manage recipes, menus, allergens, stock, suppliers, rota, logs, labels and kitchen operations in one professional system.",
    "url": "https://parslia.app/"
  }
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <!-- 1. Header / navigation -->
  <header class="site-header" id="top">
    <div class="container header-inner">
      <a class="brand" href="#top" aria-label="Parslia Kitchen OS home">
        <img class="brand-logo" src="assets/USE_THIS_parslia_header_logo_clean.png" alt="Parslia Kitchen OS"
             onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" />
        <span class="brand-fallback" style="display:none">Parslia<span>&nbsp;Kitchen OS</span></span>
      </a>

      <nav class="nav" aria-label="Primary">
        <a href="#features">Features</a>
        <a href="#modules">Modules</a>
        <a href="#for-kitchens">For Kitchens</a>
        <a href="#early-access">Early Access</a>
        <a class="btn btn-primary btn-sm" href="#early-access">Request Early Access</a>
      </nav>

      <button class="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav">
        <span></span><span></span><span></span>
      </button>
    </div>
    <nav class="mobile-nav" id="mobileNav" aria-label="Mobile">
      <a href="#features">Features</a>
      <a href="#modules">Modules</a>
      <a href="#for-kitchens">For Kitchens</a>
      <a href="#early-access">Early Access</a>
      <a class="btn btn-primary" href="#early-access">Request Early Access</a>
    </nav>
  </header>

  <main id="main">

    <!-- 2. Hero -->
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <img class="hero-logo" src="assets/USE_THIS_parslia_header_logo_clean.png" alt="Parslia Kitchen OS"
               onerror="this.style.display='none';" />
          <span class="badge">Now preparing for selected kitchens</span>
          <h1>Smarter kitchens.<br />Calmer chefs.</h1>
          <p class="hero-sub">
            Parslia Kitchen OS helps professional kitchens manage recipes, menus, allergens,
            stock, suppliers, rota, logs, labels and daily food operations in one calm,
            organised system.
          </p>
          <div class="hero-cta">
            <a class="btn btn-primary" href="#early-access">Request Early Access</a>
            <a class="btn btn-outline" href="#features">View Features</a>
          </div>
          <p class="trust-line">
            Built for chefs, caterers, retreat centres, hospitality teams and vegetarian food operations.
          </p>
        </div>

        <!-- App preview mockup (UI only, no logo redraw, no food photos) -->
        <div class="hero-visual" aria-hidden="true">
          <div class="app-window">
            <div class="app-topbar">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <div class="app-url">parslia.app</div>
            </div>
            <div class="app-body">
              <aside class="app-side">
                <div class="app-appicon">
                  <img src="assets/USE_THIS_parslia_app_icon_1024.png" alt=""
                       onerror="this.style.display='none';this.parentElement.classList.add('noimg');" />
                </div>
                <span class="app-navi active">Dashboard</span>
                <span class="app-navi">Recipes</span>
                <span class="app-navi">Menu Planner</span>
                <span class="app-navi">Allergens</span>
                <span class="app-navi">Stock</span>
                <span class="app-navi">Rota</span>
                <span class="app-navi">Logs</span>
              </aside>
              <div class="app-main">
                <div class="app-h">Today's kitchen</div>
                <div class="app-stats">
                  <div class="app-stat"><b>18</b><span>Recipes on menu</span></div>
                  <div class="app-stat"><b>4</b><span>Allergen flags</span></div>
                  <div class="app-stat"><b>7</b><span>Staff on rota</span></div>
                </div>
                <div class="app-row"><span>Fridge &amp; freezer checks</span><em class="ok">Complete</em></div>
                <div class="app-row"><span>Supplier order — dry goods</span><em>Draft</em></div>
                <div class="app-row"><span>Lunch service prep</span><em class="ok">On track</em></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Trust / audience strip -->
    <section class="strip" id="for-kitchens">
      <div class="container strip-inner">
        <span>Professional kitchens</span>
        <span>Catering teams</span>
        <span>Retreat centres</span>
        <span>Hotels &amp; hospitality</span>
        <span>Vegetarian restaurants</span>
        <span>Food production</span>
      </div>
    </section>

    <!-- 4. Problem -->
    <section class="section section-light">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">The daily reality</span>
          <h2>Kitchen work is chaotic. Your system shouldn't be.</h2>
          <p>
            Menus change, guests change, allergens matter, rotas move, stock runs low and
            suppliers need clear orders — usually spread across paper, spreadsheets and memory.
            Parslia replaces the scattered mess with one calm, organised place.
          </p>
        </div>
        <div class="problem-grid">
          <div class="problem-card"><h3>Paper everywhere</h3><p>Recipes, checks and orders lost across folders, notebooks and printouts.</p></div>
          <div class="problem-card"><h3>Allergen risk</h3><p>Manual allergen tracking is slow and easy to get wrong under service pressure.</p></div>
          <div class="problem-card"><h3>Disconnected tools</h3><p>Stock, rota, menus and suppliers live in separate places that never talk to each other.</p></div>
        </div>
      </div>
    </section>

    <!-- 5. Features -->
    <section class="section section-soft" id="features">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Features</span>
          <h2>One system for your whole kitchen.</h2>
          <p>Everything a busy food team needs to plan, prepare and stay compliant — connected in one place.</p>
        </div>
        <div class="card-grid">
          <article class="card"><div class="card-icon">&#128218;</div><h3>Recipe Library</h3><p>Create, store, scale and print professional recipes.</p></article>
          <article class="card"><div class="card-icon">&#128197;</div><h3>Menu Planner</h3><p>Plan breakfast, lunch, dinner, retreats, events and buffets.</p></article>
          <article class="card"><div class="card-icon">&#9888;&#65039;</div><h3>Allergen Control</h3><p>Clear allergen information for every dish and menu.</p></article>
          <article class="card"><div class="card-icon">&#128230;</div><h3>Stock &amp; Suppliers</h3><p>Track ingredients, suppliers, orders and purchasing.</p></article>
          <article class="card"><div class="card-icon">&#128101;</div><h3>Rota &amp; Staff</h3><p>Manage shifts, roles, attendance and team hours.</p></article>
          <article class="card"><div class="card-icon">&#9989;</div><h3>Logs &amp; Checks</h3><p>Fridge, freezer, cleaning, opening and closing checks.</p></article>
          <article class="card"><div class="card-icon">&#128202;</div><h3>Reports</h3><p>See kitchen activity, compliance and costs at a glance.</p></article>
          <article class="card"><div class="card-icon">&#127991;&#65039;</div><h3>Labels</h3><p>Print prep, date and allergen labels in seconds.</p></article>
        </div>
      </div>
    </section>

    <!-- 6. How it works -->
    <section class="section section-light">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">How it works</span>
          <h2>Up and running in four calm steps.</h2>
        </div>
        <div class="steps">
          <div class="step"><span class="step-num">1</span><h3>Set up your kitchen</h3><p>Add your team, suppliers and preferences once.</p></div>
          <div class="step"><span class="step-num">2</span><h3>Build recipes &amp; menus</h3><p>Create recipes, scale portions and plan menus fast.</p></div>
          <div class="step"><span class="step-num">3</span><h3>Run daily operations</h3><p>Manage stock, rota, allergens, labels and checks.</p></div>
          <div class="step"><span class="step-num">4</span><h3>Review &amp; improve</h3><p>Use reports to stay compliant and control cost.</p></div>
        </div>
      </div>
    </section>

    <!-- 7. Modules -->
    <section class="section section-dark" id="modules">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow eyebrow-copper">Modules</span>
          <h2>Everything, connected.</h2>
          <p>Parslia Kitchen OS brings every part of kitchen operations into one platform.</p>
        </div>
        <ul class="modules">
          <li>Dashboard</li>
          <li>Recipes</li>
          <li>Menu Planner</li>
          <li>Allergens</li>
          <li>Stock</li>
          <li>Suppliers</li>
          <li>Orders</li>
          <li>Rota</li>
          <li>Fridge &amp; Freezer Logs</li>
          <li>Cleaning Logs</li>
          <li>Labels</li>
          <li>Reports</li>
          <li>Settings</li>
        </ul>
      </div>
    </section>

    <!-- 8. App preview -->
    <section class="section section-soft">
      <div class="container app-preview">
        <div class="section-head section-head-left">
          <span class="eyebrow">App preview</span>
          <h2>Calm, clear and made for service.</h2>
          <p>
            A clean dashboard shows today's menus, checks, stock and rota at a glance — so your
            team always knows what matters right now. Available on desktop and tablet in the kitchen.
          </p>
          <ul class="ticks">
            <li>Live daily overview</li>
            <li>Allergens visible on every dish</li>
            <li>One tap to labels, logs and reports</li>
          </ul>
        </div>
        <div class="preview-phone" aria-hidden="true">
          <div class="phone-icon">
            <img src="assets/USE_THIS_parslia_app_icon_1024.png" alt=""
                 onerror="this.style.display='none';this.parentElement.classList.add('noimg');" />
          </div>
          <div class="phone-screen">
            <div class="phone-h">Parslia</div>
            <div class="phone-card"><b>Menu — Lunch</b><span>18 dishes · 4 allergen flags</span></div>
            <div class="phone-card"><b>Rota</b><span>7 staff · 2 shifts</span></div>
            <div class="phone-card"><b>Checks</b><span>Fridge &amp; cleaning complete</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- 9. Benefits -->
    <section class="section section-light">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Why Parslia</span>
          <h2>Less paper. Less stress. More control.</h2>
        </div>
        <div class="benefits">
          <div class="benefit"><span class="b-num">01</span><h3>Plan faster</h3><p>Build menus and recipes quickly.</p></div>
          <div class="benefit"><span class="b-num">02</span><h3>Stay safer</h3><p>Keep allergens and logs clear.</p></div>
          <div class="benefit"><span class="b-num">03</span><h3>Run smoother</h3><p>Connect recipes, stock, rota and orders.</p></div>
        </div>
      </div>
    </section>

    <!-- 10. Early access / contact -->
    <section class="section section-accent" id="early-access">
      <div class="container early-grid">
        <div class="early-copy">
          <h2>Get early access</h2>
          <p>
            Interested in Parslia Kitchen OS for your kitchen, retreat centre or catering
            operation? Send us your details and we will contact you.
          </p>
          <p class="contact-email"><a href="mailto:hello@parslia.app">hello@parslia.app</a></p>
        </div>
        <form class="contact-form" id="contactForm" novalidate>
          <div class="field">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" autocomplete="name" required />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" autocomplete="email" required />
          </div>
          <div class="field">
            <label for="company">Company / kitchen name</label>
            <input type="text" id="company" name="company" autocomplete="organization" />
          </div>
          <div class="field">
            <label for="role">Role</label>
            <input type="text" id="role" name="role" placeholder="e.g. Head Chef, Owner, Manager" />
          </div>
          <div class="field">
            <label for="message">Message</label>
            <textarea id="message" name="message" rows="4"></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Request Early Access</button>
          <p class="form-note" id="formNote" role="status" aria-live="polite"></p>
        </form>
      </div>
    </section>
  </main>

  <!-- 11. Footer -->
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <img class="footer-logo" src="assets/USE_THIS_parslia_header_logo_clean.png" alt="Parslia Kitchen OS"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block';" />
        <p class="footer-fallback" style="display:none">Parslia Kitchen OS</p>
        <p class="footer-tagline">Smarter kitchens. Calmer chefs.</p>
      </div>
      <nav class="footer-links" aria-label="Footer">
        <a href="#features">Features</a>
        <a href="#modules">Modules</a>
        <a href="#for-kitchens">For Kitchens</a>
        <a href="#early-access">Early Access</a>
      </nav>
    </div>
    <div class="container footer-bottom">
      <p>&copy; 2026 Parslia. All rights reserved.</p>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>
