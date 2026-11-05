/* Project calculator. Plain JS, no build.
   Every price and every info text lives in CONFIG. Prices are the draft numbers from docs/offer.md.
   Prices only: no hours anywhere. */
(function () {
  var CONFIG = {
    // Apply step (docs/apply-flow.md §4-5). Nothing is sent anywhere until submitUrl is filled in.
    submitUrl: "",                 // PLACEHOLDER: MailerLite / email endpoint. Empty = log to the console only.
    underBudgetAutoMessage: true,  // true: "under €3k" sees the kind message instead of a reply promise. false: always the normal confirmation (reply by hand).
    showNewsletterOptIn: false,    // OPEN DECISION: rare-update checkbox, unticked by default. See apply-flow.md §5.3.
    dfsUrl: "https://digitalfengshui.com", // PLACEHOLDER: Digital Feng Shui link
    copy: {
      intro: "This is the scope you picked. I'll reply within 2 working days with a suggestion and a price. If it fits, we talk.",
      fine: "No sales call to book. I read every application myself.",
      optIn: "Send me a rare personal update (a few times a year)",
      doneTitle: "Got it. Thank you.",
      doneText: "I'll reply within 2 working days with a suggestion and a price.",
      doneLink: "In the meantime: Digital Feng Shui",
      underTitle: "Thank you for applying.",
      underText: "My projects start at €3,000. If that is more than you have right now, the tools at Digital Feng Shui might get you further.",
      underLink: "Have a look at Digital Feng Shui",
      error: "Something went wrong sending this. Please try again.",
      missing: "Please fill in the highlighted fields."
    },

    base: 2000,              // every build: getting to know the brand, kickoff, design system, QA, launch
    minimum: 3000,           // no project goes below this; under it the card says "Projects start at"
    priorityPct: 0.25,       // priority start: jump the queue
    totalLabel: { below: "Projects start at", reached: "Your project" },

    // Pages, by complexity: one counter each
    pages: [
      { id: "simple",  label: "Simple pages",  hint: "Contact, thank-you, a plain text page", price: 300,  max: 20,
        info: "A page with one job and a few sections. Same design standard as the rest, with light animation." },
      { id: "medium",  label: "Medium pages",  hint: "Services, about, a case study",         price: 700,  max: 20,
        info: "A page with several sections, some interaction and animation. Most pages of a site are medium." },
      { id: "complex", label: "Complex pages", hint: "Home, a scroll story, heavy animation",  price: 1600, max: 10,
        info: "A page that carries the brand: custom GSAP animation, scroll stories, interactive pieces. Usually the home page and one or two showpieces." }
    ],

    // Branding: one switch that opens the parts. Turning it on the first time selects the preset.
    brand: {
      label: "Branding",
      info: "Getting to know your brand is part of every project. Switch this on if you also need the brand itself made, then pick the parts.",
      preset: ["logo", "colour", "type"],
      items: [
        { id: "logo",   label: "Logo",                  price: 500, info: "A logo and its versions (full, icon, one colour), ready for web and print." },
        { id: "colour", label: "Colour system",         price: 800, info: "A palette built for screens: main colours, tints and which goes where. It becomes part of the site's design system." },
        { id: "type",   label: "Typography research",   price: 400, info: "Typefaces chosen and paired, with sizes and spacing that work from big headings to small print." },
        { id: "guide",  label: "Brand guide",           price: 500, info: "A short guide to using the logo, colours and type, so others can work with your brand." },
        { id: "social", label: "Social profiles",       price: 200, info: "Profile images and banners for your social channels." },
        { id: "print",  label: "Business card + flyer", price: 200, info: "A print-ready business card and flyer." }
      ]
    },

    // Everything else, ranked by how often it is needed (the big builds last)
    toggles: [
      { id: "seo",        label: "SEO and AI-search optimisation",            price: 1000, info: "Technical SEO, titles and descriptions, structured data, and the set-up that lets search engines and AI assistants read and recommend your site." },
      { id: "legal",      label: "Legal pages, done for you",                 price: 500,  info: "Privacy, cookie and terms pages written for your business and checked against GDPR. You don't write a word." },
      { id: "cms",        label: "Blog / CMS, with content and SEO training", price: 2000, info: "A blog or collection you edit yourself in Webflow, plus a session on writing and publishing posts that get found." },
      { id: "i18n",       label: "Multi-language",                            price: 500,  info: "A second language with a language switch, set up so each language can be found in search." },
      { id: "loader",     label: "Custom page loader",                        price: 800,  info: "A branded intro animation while the site loads." },
      { id: "transition", label: "Custom page transitions",                   price: 1500, info: "Animated transitions between pages, so the site feels like one piece instead of separate pages." },
      { id: "theme",      label: "Light and dark mode",                       price: 600,  info: "A light and a dark version of the whole site, with a switch." },
      { id: "leads",      label: "Lead automation",                           price: 1500, info: "Form leads go straight into your CRM or mailing list, with automatic follow-up." },
      { id: "migration",  label: "Content migration",                         price: 970,  info: "Moving your existing pages, posts and images to the new site. €97 an hour, estimated at 10 hours." },
      { id: "chatbot",    label: "Chatbot",                                   price: 500,  info: "A chat assistant that answers visitors' questions from your site's content." },
      { id: "system",     label: "Design system docs and team training",      price: 800,  info: "Every build comes with a design system. This adds written documentation and a training session, so your team can build new pages with it." },
      { id: "members",    label: "Members area",                              price: 4000, info: "Log-in, member-only pages and gated content, with payments if needed." },
      { id: "shop",       label: "Webshop",                                   price: 4000, info: "Products, cart and checkout, built on Webflow e-commerce." },
      { id: "priority",   label: "Priority start (jump the queue)",           pct: true,   info: "Your project takes the next free slot instead of waiting in line." }
    ]
  };

  var state = { pages: { simple: 2, medium: 4, complex: 2 }, brandOn: false, brandTouched: false, toggles: {} };

  var q = new URLSearchParams(location.search);
  if (q.get("theme") === "light" || q.get("theme") === "dark") {
    document.documentElement.setAttribute("data-theme", q.get("theme"));
  }

  function $(id) { return document.getElementById(id); }
  function eur(n) { return "€" + Math.round(n).toLocaleString("en-GB"); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  // The selected items as [label, price] lines, plus the scope (before minimum and priority) and the total
  function calc() {
    var out = [["Build (brand discovery, design system, QA, launch)", CONFIG.base]];
    CONFIG.pages.forEach(function (p) {
      var n = state.pages[p.id];
      if (n) out.push([n + " × " + p.label.toLowerCase(), n * p.price]);
    });
    if (state.brandOn) CONFIG.brand.items.forEach(function (t) { if (state.toggles[t.id]) out.push(["Branding: " + t.label.toLowerCase(), t.price]); });
    CONFIG.toggles.forEach(function (t) { if (!t.pct && state.toggles[t.id]) out.push([t.label, t.price]); });
    var scope = out.reduce(function (a, x) { return a + x[1]; }, 0), sum = scope;
    if (sum < CONFIG.minimum) { out.push(["Minimum project top-up", CONFIG.minimum - sum]); sum = CONFIG.minimum; }
    if (state.toggles.priority) { var extra = sum * CONFIG.priorityPct; out.push(["Priority start (+" + Math.round(CONFIG.priorityPct * 100) + "%)", extra]); sum += extra; }
    return { lines: out, scope: scope, total: sum };
  }

  function brandSum() {
    return CONFIG.brand.items.reduce(function (a, t) { return a + (state.toggles[t.id] ? t.price : 0); }, 0);
  }

  // Info: a small round "i" after each label. Hover (or focus) previews the tip card under the
  // price card, a click pins it, and a dashed line runs from the item's box to the card.
  var info = {}, tip = { pinned: null, hover: null, hideT: 0 };
  function addInfo(key, label, text, row) {
    var btn = el("button", "calc_info", "i");
    btn.type = "button"; btn.setAttribute("aria-controls", "tip"); btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", "About " + label.toLowerCase());
    info[key] = { label: label, text: text, btn: btn, row: row };
    function enter() { clearTimeout(tip.hideT); tip.hover = key; showTip(); }
    function leave() { tip.hover = null; tip.hideT = setTimeout(showTip, 140); }
    btn.addEventListener("mouseenter", enter); btn.addEventListener("focus", enter);
    btn.addEventListener("mouseleave", leave); btn.addEventListener("blur", leave);
    btn.addEventListener("click", function (e) { e.stopPropagation(); tip.pinned = tip.pinned === key ? null : key; showTip(); });
    return btn;
  }

  function showTip() {
    var key = tip.hover || tip.pinned, box = $("tip");
    Object.keys(info).forEach(function (k) {
      info[k].btn.classList.toggle("is-active", k === key);
      info[k].btn.classList.toggle("is-pinned", k === tip.pinned);
      info[k].btn.setAttribute("aria-expanded", String(k === key));
      info[k].row.classList.toggle("is-lit", k === key);
    });
    if (!key) { box.hidden = true; drawWire(); return; }
    if (box.hidden || box.dataset.key !== key) {
      $("tip-title").textContent = info[key].label;
      $("tip-text").textContent = info[key].text;
      box.dataset.key = key;
      box.classList.remove("is-in"); void box.offsetWidth; box.classList.add("is-in");
    }
    box.hidden = false;
    drawWire();
  }

  // The dashed line: from the right edge of the item's box, at the "i", to the tip card's title
  function drawWire() {
    var svg = $("wire"), key = tip.hover || tip.pinned, box = $("tip");
    if (!key || box.hidden || matchMedia("(max-width: 860px)").matches) { svg.classList.remove("is-on"); return; }
    var b = info[key].btn.getBoundingClientRect(), s = info[key].row.closest(".calc_step").getBoundingClientRect(), t = box.getBoundingClientRect();
    var x1 = Math.round(s.right) + .5, y1 = Math.round(b.top + b.height / 2) + .5;
    var x2 = Math.round(t.left) + .5, y2 = Math.round(t.top + 38) + .5, xm = Math.round((x1 + x2) / 2) + .5;
    $("wire-path").setAttribute("d", "M" + x1 + " " + y1 + " H" + xm + " V" + y2 + " H" + x2);
    $("wire-a").setAttribute("x", x1 - 2.5); $("wire-a").setAttribute("y", y1 - 2.5);
    $("wire-b").setAttribute("x", x2 - 2.5); $("wire-b").setAttribute("y", y2 - 2.5);
    svg.classList.add("is-on");
  }
  var wireFrame = 0;
  function queueWire() { if (!wireFrame) wireFrame = requestAnimationFrame(function () { wireFrame = 0; drawWire(); }); }
  addEventListener("scroll", queueWire, { passive: true });
  addEventListener("resize", queueWire);
  if (window.ResizeObserver) new ResizeObserver(queueWire).observe(document.querySelector(".calc_grid"));
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && (tip.pinned || tip.hover)) { tip.pinned = tip.hover = null; showTip(); } });

  function labelLine(label, key, text, row) {
    var line = el("span", "calc_labelline");
    line.appendChild(el("span", "calc_label", label));
    if (text) line.appendChild(addInfo(key, label, text, row));
    return line;
  }

  function buildPages() {
    var root = $("pages");
    CONFIG.pages.forEach(function (p) {
      var item = el("div", "calc_item");
      var row = el("div", "calc_row");
      var txt = el("div", "calc_txt");
      txt.appendChild(labelLine(p.label, p.id, p.info, row));
      txt.appendChild(el("span", "calc_hint", p.hint + " · " + eur(p.price) + " each"));
      var step = el("div", "calc_stepper");
      var minus = el("button", "", "−"); minus.type = "button"; minus.setAttribute("aria-label", "Fewer " + p.label.toLowerCase());
      var out = el("output", "", "0"); out.id = "n-" + p.id;
      var plus = el("button", "", "+"); plus.type = "button"; plus.setAttribute("aria-label", "More " + p.label.toLowerCase());
      minus.addEventListener("click", function () { state.pages[p.id] = Math.max(0, state.pages[p.id] - 1); render(); });
      plus.addEventListener("click", function () { state.pages[p.id] = Math.min(p.max, state.pages[p.id] + 1); render(); });
      step.appendChild(minus); step.appendChild(out); step.appendChild(plus);
      row.appendChild(txt); row.appendChild(step);
      item.appendChild(row);
      root.appendChild(item);
    });
  }

  // One switch row: [switch label] (i) .......... price. The whole row toggles, except the (i).
  function makeItem(t, priceText, onToggle) {
    var item = el("div", "calc_item");
    var row = el("div", "calc_item_row");
    var sw = el("button", "calc_toggle");
    sw.type = "button"; sw.setAttribute("role", "switch"); sw.dataset.id = t.id;
    sw.appendChild(el("span", "calc_switch"));
    sw.appendChild(el("span", "calc_label", t.label));
    sw.addEventListener("click", onToggle);
    var price = el("span", "calc_price", priceText); price.id = "price-" + t.id;
    sw.setAttribute("aria-describedby", price.id);
    row.appendChild(sw);
    if (t.info) row.appendChild(addInfo(t.id, t.label, t.info, row));
    row.appendChild(price);
    row.addEventListener("click", function (e) { if (!e.target.closest("button")) sw.click(); });
    item.appendChild(row);
    return item;
  }

  function buildBranding() {
    var B = CONFIG.brand, root = $("branding");
    var from = Math.min.apply(null, B.items.map(function (t) { return t.price; }));
    var parent = makeItem({ id: "brand", label: B.label, info: B.info }, "from " + eur(from), function () {
      state.brandOn = !state.brandOn;
      if (state.brandOn && !state.brandTouched) { B.preset.forEach(function (id) { state.toggles[id] = true; }); state.brandTouched = true; }
      render();
    });
    parent.classList.add("calc_item_parent");
    var parentSwitch = parent.querySelector(".calc_toggle");
    parentSwitch.setAttribute("aria-controls", "brand-subs");
    root.appendChild(parent);

    var subs = el("div", "calc_subs"); subs.id = "brand-subs"; subs.hidden = true;
    B.items.forEach(function (t) {
      subs.appendChild(makeItem(t, "+" + eur(t.price), function () { state.toggles[t.id] = !state.toggles[t.id]; render(); }));
    });
    root.appendChild(subs);
  }

  function buildToggles() {
    var root = $("toggles");
    CONFIG.toggles.forEach(function (t) {
      root.appendChild(makeItem(t, t.pct ? "+" + Math.round(CONFIG.priorityPct * 100) + "%" : "+" + eur(t.price),
        function () { state.toggles[t.id] = !state.toggles[t.id]; render(); }));
    });
  }

  // The big number: Osmo's odometer rolls it; without GSAP or with reduced motion it just changes
  var odometer = (window.gsap && typeof initNumberOdometer === "function") ? initNumberOdometer() : null;
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var firstPaint = true;
  function setTotal(text) {
    var n = $("total");
    if (firstPaint || !odometer || reduceMotion) { n.textContent = text; firstPaint = false; return; }
    // A click during a roll: finish the running roll first, so the next one starts from a clean number
    var rollers = n.querySelectorAll('[data-odometer-part="roller"]');
    if (rollers.length) gsap.getTweensOf(rollers).forEach(function (tw) { (tw.parent && tw.parent !== gsap.globalTimeline ? tw.parent : tw).progress(1); });
    odometer(n, text);
  }

  function render() {
    CONFIG.pages.forEach(function (p) { $("n-" + p.id).textContent = state.pages[p.id]; });

    document.querySelectorAll(".calc_toggle").forEach(function (s) {
      var id = s.dataset.id;
      s.setAttribute("aria-checked", String(id === "brand" ? state.brandOn : !!state.toggles[id]));
    });
    var subs = $("brand-subs"); subs.hidden = !state.brandOn;
    var parentSwitch = document.querySelector('.calc_toggle[data-id="brand"]');
    parentSwitch.setAttribute("aria-expanded", String(state.brandOn));
    $("price-brand").textContent = state.brandOn ? "+" + eur(brandSum())
      : "from " + eur(Math.min.apply(null, CONFIG.brand.items.map(function (t) { return t.price; })));

    var r = calc(), reached = r.scope >= CONFIG.minimum;
    $("total-label").textContent = reached ? CONFIG.totalLabel.reached : CONFIG.totalLabel.below;
    setTotal(eur(r.total));

    // Under the minimum: a bar that fills as the scope grows, gone once the minimum is reached
    $("meter").hidden = reached;
    $("meter-fill").style.width = Math.min(100, r.scope / CONFIG.minimum * 100) + "%";
    $("meter-text").textContent = "Your scope: " + eur(r.scope) + " of the " + eur(CONFIG.minimum) + " minimum";

    var ul = $("lines");
    ul.innerHTML = "";
    r.lines.forEach(function (x) {
      var li = el("li");
      li.appendChild(el("span", "", x[0])); li.appendChild(el("span", "", eur(x[1])));
      ul.appendChild(li);
    });

    current = { scope: scopeText(eur(r.total)), range: eur(r.total) };
    $("scope-summary").textContent = current.scope;
    $("f-selections").value = current.scope.split("\nEstimate shown:")[0];
    $("f-range").value = current.range;
    queueWire();
  }

  var current = { scope: "", range: "" };

  // The scope as plain lines for the application. Prices of single items and any hours are left out on purpose.
  function scopeText(total) {
    var pages = CONFIG.pages.slice().reverse().filter(function (p) { return state.pages[p.id]; })
      .map(function (p) { return state.pages[p.id] + " " + p.id; });
    var b = state.brandOn ? CONFIG.brand.items.filter(function (t) { return state.toggles[t.id]; }).map(function (t) { return t.label.toLowerCase(); }) : [];
    var tg = CONFIG.toggles.filter(function (t) { return state.toggles[t.id]; }).map(function (t) { return t.label; });
    return "Pages: " + (pages.join(", ") || "none") + "\n" +
      "Branding: " + (b.join(", ") || "none") + "\n" +
      "Toggles: " + (tg.join(", ") || "none") + "\n" +
      "Estimate shown: " + total + " (excl. VAT, an estimate, not a quote)";
  }

  // Apply step: reveal, validate, submit (stub), confirm
  function submitApplication(data) {
    if (!CONFIG.submitUrl) { console.log("[apply] CONFIG.submitUrl is empty, nothing sent. Payload:", data); return Promise.resolve(); }
    return fetch(CONFIG.submitUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); });
  }

  function setupApply() {
    var C = CONFIG.copy;
    var cta = $("cta"), box = $("apply"), form = $("apply-form"), err = $("apply-error");
    $("apply-intro").textContent = C.intro;
    $("apply-fine").textContent = C.fine;
    $("optin-label").textContent = C.optIn;
    $("optin-row").hidden = !CONFIG.showNewsletterOptIn;

    cta.addEventListener("click", function () {
      box.hidden = false;
      cta.setAttribute("aria-expanded", "true");
      box.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      setTimeout(function () { $("f-name").focus({ preventScroll: true }); }, 350);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var bad = false;
      form.querySelectorAll("input, select, textarea").forEach(function (f) {
        var ok = f.checkValidity();
        if (!ok) bad = true;
        f.setAttribute("aria-invalid", String(!ok));
      });
      if (bad) {
        err.textContent = C.missing; err.hidden = false;
        var first = form.querySelector("[aria-invalid='true']"); if (first) first.focus();
        return;
      }
      err.hidden = true;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.selections = current.scope.split("\nEstimate shown:")[0];
      data.range_shown = current.range;
      data.page = location.href;
      var btn = $("apply-submit"); btn.disabled = true;
      submitApplication(data).then(function () {
        var under = CONFIG.underBudgetAutoMessage && data.budget === "under-3k";
        $("done-title").textContent = under ? C.underTitle : C.doneTitle;
        $("done-text").textContent = under ? C.underText : C.doneText;
        var a = $("done-link"); a.textContent = under ? C.underLink : C.doneLink; a.href = CONFIG.dfsUrl;
        form.hidden = true; $("apply-intro").hidden = true; $("scope-summary").hidden = true;
        var done = $("apply-done"); done.hidden = false; done.focus();
      }).catch(function () {
        btn.disabled = false; err.textContent = C.error; err.hidden = false;
      });
    });

    // Clear the red border as soon as a field is fixed
    form.addEventListener("input", function (e) { if (e.target.checkValidity()) e.target.setAttribute("aria-invalid", "false"); });
    form.addEventListener("change", function (e) { if (e.target.checkValidity()) e.target.setAttribute("aria-invalid", "false"); });
  }

  $("tip-close").addEventListener("click", function () { tip.pinned = tip.hover = null; showTip(); });

  buildBranding();
  buildPages();
  buildToggles();
  setupApply();
  render();
})();
