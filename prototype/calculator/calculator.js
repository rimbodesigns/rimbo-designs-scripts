/* Project calculator. Plain JS, no build.
   Every price and every info text lives in CONFIG. Prices are the draft numbers from docs/offer.md.
   Prices, not hours. The one rate on show is content migration's €97 an hour; the client picks how much
   content they have and the price follows (the hours behind each amount live in CONFIG). */
(function () {
  var CONFIG = {
    // Apply step (docs/apply-flow.md §4-5). Nothing is sent anywhere until submitUrl is filled in.
    submitUrl: "",                 // PLACEHOLDER: MailerLite / email endpoint. Empty = log to the console only.
    previewLead: { v: 1, n: "Sample project", m: "", r: { p: [1, 3, 1, 0], b: 1, t: ["identity", "logo", "seo"] } }, // the client view in the hosted preview
    underBudgetAutoMessage: true,  // true: "under €3k" sees the kind message instead of a reply promise. false: always the normal confirmation (reply by hand).
    showNewsletterOptIn: false,    // OPEN DECISION: rare-update checkbox, unticked by default. See apply-flow.md §5.3.
    dfsUrl: "https://digitalfengshui.com", // PLACEHOLDER: Digital Feng Shui link
    copy: {
      intro: "This is the scope you picked. I'll reply within 2 working days with a suggestion and a price. If it fits, we talk.",
      fine: "I read every application myself.",
      optIn: "Send me a rare personal update (a few times a year)",
      doneTitle: "Got it. Thank you.",
      doneText: "I'll reply within 2 working days with a suggestion and a price.",
      doneLink: "In the meantime: Digital Feng Shui",
      underTitle: "Thank you for applying.",
      underText: "My projects start at €3,000. If that is more than you have right now, the tools at Digital Feng Shui might get you further.",
      underLink: "Have a look at Digital Feng Shui",
      error: "Something went wrong sending this. Please try again.",
      missing: "Please fill in the highlighted fields.",

      underMinimum: "You haven't met the {min} minimum yet.",

      // Personal links (?make = Rimbo's maker view, #for=… = the link a lead gets)
      makeEyebrow: "Personal link · only you see this view",
      makeName: "Project name",
      makeCta: "Create link",
      makeCtaAlt: "Copies it for you",
      applyCta: "Apply with this scope",
      applyCtaAlt: "A few short questions",
      submit: "Send my application",
      submitAlt: "I read every one",
      makeNeedName: "Give it a project name first.",
      needScope: "Pick something first.",
      startOver: "Start over",
      undo: "Undo",
      canUndo: "You can undo this",
      undoAlt: "Back to what you had",
      makeDone: "Link copied to your clipboard.",
      copy: "Copy",
      makeOpen: "Open it",
      clientEyebrow: "Scoped by Rimbo",
      clientLede: "This is what I'd build for you. Switch things on or off and the price follows.",
      recommended: "Recommended",
      reset: "Back to my recommendation",
      clientCta: "Copy the link",
      clientCtaAlt: "Paste it in your reply",
      clientDone: "Link copied. Paste it in your reply to me.",
      copyFailed: "Couldn't copy. Copy the link under the button.",
      previewLink: "Links work once this is on your own site.",
      views: [["public", "Public"], ["make", "Your view"], ["client", "Client view"]]
    },

    // No fixed build fee (2026-11-05): design system, QA and launch grow with the project,
    // so they sit inside the page prices (the old €2,000 base, spread over the pages, then trimmed to €400 / €800 / €2,000). The minimum
    // covers the fixed part of a small project.
    minimum: 3000,           // no project goes below this; under it the card says "Projects start at"
    priorityPct: 0.25,       // priority start: jump the queue
    totalLabel: { below: "Your estimate", reached: "Your estimate" }, // the number starts at €0; the bar shows the minimum
    included: {
      line: "Every page includes the design system, QA, performance and onboarding.",
      title: "Included in every page",
      text: "Design system::Colours, type, spacing and components, so every page fits and new ones are quick to add.\n" +
        "Navigation and footer::With the motion that runs through the whole site.\n" +
        "QA (quality assurance)::Every page checked on phone, tablet and desktop, in Chrome, Safari, Firefox and Edge, before launch.\n" +
        "Performance::Images, code and loading tuned so the site is fast.\n" +
        "Onboarding::I show you how to manage the site yourself."
    },

    // Pages, by complexity: one counter each
    pages: [
      { id: "simple",  label: "Simple pages",  hint: "Contact, thank-you, plain text",         price: 400,  max: 20,
        info: "A page with one job and a few sections. Same design standard as the rest, with light animation." },
      { id: "medium",  label: "Medium pages",  hint: "Services, about, team",                 price: 800,  max: 20,
        info: "A page with several sections, some interaction and animation. Most pages of a site are medium." },
      { id: "complex", label: "Complex pages", hint: "Home, scroll story, heavy animation",    price: 2000, max: 10,
        info: "A page that carries the brand: custom GSAP animation, scroll stories, interactive pieces. Usually the home page and one or two showpieces." },
      // A whole type of content: structure, template and all its pages (Echo's 12 case studies). €1,500 on my advice, 2026-11-09
      { id: "cms",     label: "CMS templates", hint: "Blogs, news, case studies",             price: 1500, max: 10,
        info: "A whole type of content, like blog posts, news or case studies: the structure and one template, so you can add as many as you like in Webflow. The overview page that lists them counts as a normal page. The content itself is yours to write." }
    ],

    // Branding: one switch that opens the parts. Turning it on the first time selects the preset.
    brand: {
      label: "Branding",
      info: "Switch this on if you also need the brand itself made, then pick the parts.",
      // Every project starts here, even with an existing brand: no switch
      foundation: { id: "foundation", label: "Brand foundation", price: 500, tag: "Every project",
        // A line "01::Name::Text" shows as a numbered step in the tip card
        info: "Every project starts here, even if your brand already exists.\n" +
          "01::Kickoff questionnaire::Your business, goals, competitors and a moodboard, before we talk.\n" +
          "02::Discovery workshop::A 60 to 90 minute call on your mission, vision and audience.\n" +
          "03::Competitor review::I look at who you're up against and where you can stand out.\n" +
          "04::Direction call::Where the website should go, how much freedom I have to evolve the brand, and how we work together." },
      preset: ["identity", "logo"],
      items: [
        // Colour and type aren't sold apart: picking colours isn't the work, finding the visual language is (Rimbo, 2026-11-08)
        { id: "identity", label: "Brand identity", price: 1200,
          info: "The whole visual language of your brand, not just some colours and fonts.\n" +
            "01::Stylescapes::Three directions side by side: A, B and C.\n" +
            "02::Rounds::We take the best one through a few rounds of colour, typography and style.\n" +
            "03::The system::One visual language, ready for the design system of your site." },
        { id: "logo",   label: "Logo",                  price: 500, info: "A logo and its versions (full, icon, one colour), ready for web and print." },
        { id: "guide",  label: "Brand guide",           price: 500, info: "A short guide to using the logo, colours and type, so others can work with your brand." },
        { id: "illustrations", label: "Illustrations",  price: 600, info: "A set of custom illustrations in the style of your brand." }, // DRAFT price
        { id: "social", label: "Social profiles",       price: 200, info: "Profile images and banners for your social channels." },
        { id: "print",  label: "Business card + flyer", price: 200, info: "A print-ready business card and flyer." }
      ]
    },

    // Everything else, in groups after Branding and Pages (numbered 03, 04, …).
    // Within a group: ranked by how often it is needed (the big builds last).
    groups: [
      { id: "motion", legend: "Motion and feel" },
      { id: "more",   legend: "Add what you need", line: "Extras" },
      { id: "search", legend: "Search and analytics" }
    ],
    // DRAFT prices (2026-11-05): consent and a11y not confirmed yet; analytics lowered to €250, transitions
    // to €900, automations €500 (Rimbo, 2026-11-05)
    toggles: [
      { id: "seo",        group: "search", label: "SEO and AI-search optimisation",            price: 1000, info: "Technical SEO, titles and descriptions, structured data, and the set-up that lets search engines and AI assistants read and recommend your site. Search and AI search are the same work, so they come together." },
      { id: "analytics",  group: "search", label: "Analytics set-up",                          price: 250,  brings: "consent", info: "Tracking that shows where visitors come from and what they do, with goals on your forms and buttons. It needs cookie consent, so that switches on with it. Or skip this and use Webflow Analyze, from about €10 a month." },
      { id: "consent",    group: "search", label: "Cookie consent",                            price: 300,  info: "A consent banner that holds back tracking and marketing scripts until a visitor says yes, as GDPR asks. In the look of your site." },
      { id: "training",   group: "search", label: "SEO training",                              price: 500,
        info: "So you can write and publish pages and posts that get found. What you get:\nA recorded tutorial you can watch again.\nA one-on-one call about your own site.\nA checklist template for every new page or post." },
      { id: "i18n",       group: "search", label: "Multi-language",                            price: 500,  info: "A second language with a language switch, set up so each language can be found in search." },
      // Three amounts, not an hours field (Rimbo, 2026-11-05): €97 an hour behind the scenes
      { id: "migration",  group: "search", label: "Content migration",                         hourly: 97,
        question: "How much content do you have?",
        levels: [{ label: "Very little", hours: 2 }, { label: "Quite a bit", hours: 4 }, { label: "A lot", hours: 8 }], start: 0,
        info: "Moving your existing pages, posts and images to the new site, with redirects so old links and search rankings keep working. Pick roughly how much you have; the proposal confirms it." },
      { id: "loader",     group: "motion", label: "Custom page loader",                        price: 800,  info: "A branded intro animation while the site loads." },
      { id: "transition", group: "motion", label: "Custom page transitions",                   price: 900,  info: "Animated transitions between pages, so the site feels like one piece instead of separate pages." },
      { id: "theme",      group: "motion", label: "Light and dark mode",                       price: 600,  info: "A light and a dark version of the whole site, with a switch." },
      { id: "legal",      group: "more",   label: "Legal pages, done for you",                 price: 500,  info: "Privacy, cookie and terms pages written for your business and checked against GDPR. You don't write a word." },
      { id: "a11y",       group: "more",   label: "Accessibility check",                       price: 800,  info: "The site tested for keyboard use, screen readers, contrast and text size against WCAG 2.2 AA, with the fixes made. More and more businesses need this under the European Accessibility Act." },
      { id: "leads",      group: "more",   label: "Automations",                               price: 500,  info: "Your site connected to your other tools: form leads into your CRM or mailing list, with an automatic follow-up." },
      { id: "chatbot",    group: "more",   label: "Chatbot",                                   price: 500,  info: "A chat assistant that answers visitors' questions from your site's content." },
      { id: "system",     group: "more",   label: "Design system docs and team training",      price: 800,  info: "Every build comes with a design system. This adds written documentation and a training session, so your team can build new pages with it." },
      { id: "members",    group: "more",   label: "Members area",                              price: 4000, info: "Log-in, member-only pages and gated content, with payments if needed." },
      { id: "shop",       group: "more",   label: "Webshop",                                   price: 4000, info: "Products, cart and checkout, built on Webflow e-commerce." },
      { id: "priority",   group: "more",   label: "Priority start (jump the queue)",           pct: true,   info: "Your project takes the next free slot instead of waiting in line." }
    ]
  };

  var state = { pages: { simple: 0, medium: 0, complex: 0, cms: 0 }, brandOn: false, brandTouched: false, toggles: {}, hours: {} };
  CONFIG.toggles.forEach(function (t) { if (t.hourly) state.hours[t.id] = t.levels[t.start].hours; });
  // An item's price: fixed, or the chosen amount's hours × rate
  function priceOf(t) { return t.hourly ? t.hourly * state.hours[t.id] : t.price; }

  var q = new URLSearchParams(location.search);
  if (q.get("theme") === "light" || q.get("theme") === "dark") {
    document.documentElement.setAttribute("data-calc-theme", q.get("theme"));
  }

  function $(id) { return document.getElementById(id); }
  function eur(n) { return "€" + Math.round(n).toLocaleString("en-GB"); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  // Personal links. Three views of the same page:
  //   public  the calculator as it is (apply at the end)
  //   make    ?make: Rimbo types the project name and a line in the header, sets the scope, "Create link" copies a link
  //   client  #for=…: the lead sees their project name, Rimbo's pick marked "Recommended", and can change it
  // Everything sits after the # (browsers never send that part to a server): n = name, m = line,
  // r = Rimbo's pick, c = the lead's own version (only when it differs).
  var byId = {};
  CONFIG.brand.items.concat(CONFIG.toggles).forEach(function (t) { byId[t.id] = t; });
  function isBrandPart(id) { return CONFIG.brand.items.indexOf(byId[id]) >= 0; }

  function b64e(str) { var s = ""; new TextEncoder().encode(str).forEach(function (c) { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64d(s) { var bin = atob(s.replace(/-/g, "+").replace(/_/g, "/")), b = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new TextDecoder().decode(b); }
  function readShare() {
    var m = location.hash.match(/[#&]for=([\w-]+)/);
    if (!m) return null;
    try { var o = JSON.parse(b64d(m[1])); return o && o.r && o.r.p ? o : null; } catch (e) { return null; }
  }
  function shareHash(o) { return "#for=" + b64e(JSON.stringify(o)); }
  function clientLink(o) { return location.origin + location.pathname + shareHash(o); }

  // The hosted preview (build-preview.py): its viewer only passes a plain #name, so #make and #client pick the view
  var preview = !!window.CALC_PREVIEW, view = location.hash.slice(1);
  var share = preview ? (view === "client" ? CONFIG.previewLead : null) : readShare();
  var mode = q.has("make") || (preview && view === "make") ? "make" : share ? "client" : "public";
  addEventListener("hashchange", function () { location.reload(); }); // a different link pasted into the same tab

  // The scope as a small object: page counts, branding on/off, the ids that are on (brand parts only with
  // branding on), and the hours behind the chosen amount of items that are on
  function snap() {
    var s = {
      p: CONFIG.pages.map(function (p) { return state.pages[p.id]; }),
      b: state.brandOn ? 1 : 0,
      t: Object.keys(byId).filter(function (id) { return state.toggles[id] && (state.brandOn || !isBrandPart(id)); }).sort()
    };
    s.t.forEach(function (id) { if (byId[id].hourly) { s.h = s.h || {}; s.h[id] = state.hours[id]; } });
    return s;
  }
  // Any hours (also from older links) snap to the nearest of the item's amounts
  function clampHours(t, n) {
    n = +n; if (!n) return t.levels[t.start].hours;
    return t.levels.reduce(function (best, l) { return Math.abs(l.hours - n) < Math.abs(best - n) ? l.hours : best; }, t.levels[0].hours);
  }
  function levelOf(t, h) { h = h || state.hours[t.id]; return t.levels.filter(function (l) { return l.hours === h; })[0] || t.levels[t.start]; }
  function applySnap(s) {
    CONFIG.pages.forEach(function (p, i) { state.pages[p.id] = Math.max(0, Math.min(p.max, Math.round(+s.p[i]) || 0)); });
    state.brandOn = !!s.b; state.brandTouched = !!s.b;
    state.toggles = {};
    (s.t || []).forEach(function (id) { if (byId[id]) state.toggles[id] = true; });
    CONFIG.toggles.forEach(function (t) { if (t.hourly) state.hours[t.id] = clampHours(t, s.h && s.h[t.id]); });
  }
  // A link's pick in the same shape as snap(), so the two compare
  function normSnap(b) {
    var s = { p: CONFIG.pages.map(function (p, i) { return Math.max(0, Math.min(p.max, Math.round(+b.p[i]) || 0)); }), b: b.b ? 1 : 0,
      t: (b.t || []).filter(function (id) { return byId[id]; }).sort() }; // older links: fewer page types, retired items
    s.t.forEach(function (id) { var t = byId[id]; if (t && t.hourly) { s.h = s.h || {}; s.h[id] = clampHours(t, b.h && b.h[id]); } });
    return s;
  }
  function sameSnap(a, b) { return JSON.stringify(a) === JSON.stringify(normSnap(b)); }

  // Nothing picked yet: no lines, an empty bar
  function picked() {
    return CONFIG.pages.some(function (p) { return state.pages[p.id]; }) ||
      (state.brandOn && CONFIG.brand.items.some(function (t) { return state.toggles[t.id]; })) ||
      CONFIG.toggles.some(function (t) { return !t.pct && state.toggles[t.id]; });
  }

  // The selected items as [label, price] lines, plus:
  //   scope  the items added up (before priority)
  //   shown  the big number: starts at €0 and follows the scope, priority included
  //   total  the estimate for the application: never below the minimum, priority on top
  function calc() {
    if (!picked()) return { lines: [], scope: 0, shown: 0, total: CONFIG.minimum };
    // One line per section, so the card stays short however much is on (the switches already show what's picked)
    var out = [];
    function line(label, sum) { if (sum) out.push([label, sum]); }
    // Branding includes the foundation; this only runs once something is picked, so the page still starts at €0
    line(CONFIG.brand.label, CONFIG.brand.foundation.price + (state.brandOn ? brandSum() : 0));
    line("Website", CONFIG.pages.reduce(function (a, p) { return a + state.pages[p.id] * p.price; }, 0));
    CONFIG.groups.forEach(function (g) {
      line(g.line || g.legend, CONFIG.toggles.reduce(function (a, t) { return a + (t.group === g.id && !t.pct && state.toggles[t.id] ? priceOf(t) : 0); }, 0));
    });
    var scope = out.reduce(function (a, x) { return a + x[1]; }, 0), pr = state.toggles.priority ? CONFIG.priorityPct : 0;
    if (pr) out.push(["Priority start (+" + Math.round(pr * 100) + "%)", scope * pr]);
    return { lines: out, scope: scope, shown: scope * (1 + pr), total: Math.max(scope, CONFIG.minimum) * (1 + pr) };
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
    if (!key) { box.hidden = true; fitSide(); drawWire(); return; }
    if (box.hidden || box.dataset.key !== key) {
      $("tip-title").textContent = info[key].label;
      var tt = $("tip-text"); tt.textContent = "";
      info[key].text.split("\n").forEach(function (line) {
        var step = line.split("::"), row = el("span", "calc_tip_line", step.length > 1 ? "" : line);
        if (step.length === 3) {
          row.classList.add("is-step");
          row.appendChild(el("span", "calc_tip_num", step[0]));
          step.shift();
        }
        if (step.length === 2) {
          row.appendChild(el("span", "calc_tip_name", step[0]));
          row.appendChild(el("span", "calc_tip_desc", step[1]));
        }
        tt.appendChild(row);
      });
      box.dataset.key = key;
      box.classList.remove("is-in"); void box.offsetWidth; box.classList.add("is-in");
    }
    box.hidden = false;
    fitSide();
    drawWire();
  }

  // If the tip doesn't fit under the price card, the whole column eases up into the empty space above it, so
  // nothing gets covered. Only as far as needed, and back when the tip closes.
  function fitSide() {
    if (!window.gsap || reduceMotion || matchMedia("(max-width: 860px)").matches) return;
    var side = document.querySelector(".calc_side"), y = gsap.getProperty(side, "y") || 0, shift = 0;
    if (!$("tip").hidden) {
      var r = side.getBoundingClientRect();
      shift = Math.min(0, Math.max(innerHeight - 16 - (r.bottom - y), 16 - (r.top - y)));
    }
    // A window too short for both: the tip scrolls inside itself
    var box = $("tip"); box.style.maxHeight = ""; box.style.overflowY = "";
    if (!box.hidden) {
      var room = innerHeight - 32 - (side.offsetHeight - box.offsetHeight);
      if (room < box.offsetHeight) { box.style.maxHeight = Math.max(room, 160) + "px"; box.style.overflowY = "auto"; }
      if (room < box.scrollHeight) { var r2 = side.getBoundingClientRect(); shift = Math.min(0, Math.max(innerHeight - 16 - (r2.bottom - y), 16 - (r2.top - y))); }
    }
    if (Math.abs(shift - (side._fit === undefined ? 0 : side._fit)) < 1) return;
    side._fit = shift;
    gsap.to(side, { y: shift, duration: .55, ease: "expo.out", overwrite: "auto", onUpdate: queueWire, onComplete: function () { if (!shift) gsap.set(side, { clearProps: "transform" }); } });
  }

  // The dashed line: from the right edge of the item's box, at the "i", to the tip card's title
  function drawWire() {
    var svg = $("wire"), key = tip.hover || tip.pinned, box = $("tip");
    var step = key && info[key].row.closest(".calc_step");
    if (!key || !step || box.hidden || matchMedia("(max-width: 860px)").matches) { svg.classList.remove("is-on"); return; }
    var b = info[key].btn.getBoundingClientRect(), s = step.getBoundingClientRect(), t = box.getBoundingClientRect();
    var x1 = Math.round(s.right) + .5, y1 = Math.round(b.top + b.height / 2) + .5;
    var x2 = Math.round(t.left) + .5, y2 = Math.round(t.top + 38) + .5, xm = Math.round((x1 + x2) / 2) + .5;
    $("wire-path").setAttribute("d", "M" + x1 + " " + y1 + " H" + xm + " V" + y2 + " H" + x2);
    $("wire-a").setAttribute("x", x1 - 2.5); $("wire-a").setAttribute("y", y1 - 2.5);
    $("wire-b").setAttribute("x", x2 - 2.5); $("wire-b").setAttribute("y", y2 - 2.5);
    svg.classList.add("is-on");
  }
  var wireFrame = 0;
  function queueWire() { if (!wireFrame) wireFrame = requestAnimationFrame(function () { wireFrame = 0; drawWire(); }); }
  addEventListener("scroll", function () { queueWire(); if (!$("tip").hidden) fitSide(); }, { passive: true });
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
      var step = el("div", "calc_stepper");
      var minus = el("button", "", "−"); minus.type = "button"; minus.setAttribute("aria-label", "Fewer " + p.label.toLowerCase());
      var out = el("output", "", "0"); out.id = "n-" + p.id;
      var plus = el("button", "", "+"); plus.type = "button"; plus.setAttribute("aria-label", "More " + p.label.toLowerCase());
      minus.addEventListener("click", function () { state.pages[p.id] = Math.max(0, state.pages[p.id] - 1); render(); });
      plus.addEventListener("click", function () { state.pages[p.id] = Math.min(p.max, state.pages[p.id] + 1); render(); });
      step.appendChild(minus); step.appendChild(out); step.appendChild(plus);
      row.appendChild(labelLine(p.label, p.id, p.info + "\n" + p.hint + ".", row));
      row.appendChild(el("span", "calc_rec calc_examples", p.hint));
      var price = el("span", "calc_price", eur(p.price)); price.id = "page-price-" + p.id;
      row.appendChild(price);
      row.appendChild(step);
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

  // The row that's part of every project: no switch, because there's nothing to choose. It starts flush left
  function makeFixed(t) {
    var item = el("div", "calc_item"), row = el("div", "calc_item_row is-fixed");
    row.appendChild(el("span", "calc_label", t.label));
    row.appendChild(addInfo(t.id, t.label, t.info, row));
    var tag = el("span", "calc_rec"); tag.appendChild(el("span", "calc_rec_word", t.tag));
    row.appendChild(tag);
    row.appendChild(el("span", "calc_price", eur(t.price)));
    item.appendChild(row);
    return item;
  }

  function buildBranding() {
    var B = CONFIG.brand, root = $("branding");
    root.appendChild(makeFixed(B.foundation));
    var parent = makeItem({ id: "brand", label: B.label, info: B.info }, "", function () {
      state.brandOn = !state.brandOn;
      if (state.brandOn && !state.brandTouched) { B.preset.forEach(function (id) { state.toggles[id] = true; }); state.brandTouched = true; }
      render();
    });
    parent.classList.add("calc_item_parent");
    var parentSwitch = parent.querySelector(".calc_toggle");
    parentSwitch.setAttribute("aria-controls", "brand-subs");
    var word = el("span", "calc_rec"); word.id = "brand-word";
    parent.querySelector(".calc_price").before(word);
    root.appendChild(parent);

    var subs = el("div", "calc_subs"); subs.id = "brand-subs"; subs.hidden = true;
    B.items.forEach(function (t) {
      subs.appendChild(makeItem(t, "+" + eur(t.price), function () { state.toggles[t.id] = !state.toggles[t.id]; render(); }));
    });
    root.appendChild(subs);
  }

  // The add-ons: one numbered box per group, after 01 Branding and 02 Pages
  function buildToggles() {
    var root = $("groups");
    CONFIG.groups.forEach(function (g, gi) {
      var box = el("fieldset", "calc_step"), list = el("div");
      var legend = el("legend"); legend.appendChild(el("span", "calc_num", String(gi + 3).padStart(2, "0"))); legend.appendChild(document.createTextNode(g.legend));
      box.appendChild(legend);
      box.appendChild(list);
      CONFIG.toggles.filter(function (t) { return t.group === g.id; }).forEach(function (t) {
        var priceText = t.pct ? "+" + Math.round(CONFIG.priorityPct * 100) + "%" : t.hourly ? eur(t.hourly) + " / hour" : "+" + eur(t.price);
        list.appendChild(makeItem(t, priceText, function () {
          state.toggles[t.id] = !state.toggles[t.id];
          if (state.toggles[t.id] && t.brings) state.toggles[t.brings] = true; // analytics needs cookie consent: separate rows, on together
          render();
        }));
        if (t.hourly) list.appendChild(makeHours(t));
      });
      root.appendChild(box);
    });
  }

  // Hourly item: switched on, a question with three choices opens under it (real radio buttons, so arrow keys work)
  function makeHours(t) {
    var wrap = el("div", "calc_hours"); wrap.id = "hours-" + t.id; wrap.hidden = true;
    var q = el("p", "calc_hours_q", t.question); q.id = "hours-q-" + t.id;
    var group = el("div", "calc_seg"); group.setAttribute("role", "radiogroup"); group.setAttribute("aria-labelledby", q.id);
    wrap.appendChild(q);
    t.levels.forEach(function (l) {
      var opt = el("label", "calc_seg_opt"), input = el("input");
      input.type = "radio"; input.name = "level-" + t.id; input.value = l.hours;
      input.addEventListener("change", function () { state.hours[t.id] = l.hours; render(); });
      opt.appendChild(input); opt.appendChild(el("span", "", l.label));
      group.appendChild(opt);
    });
    wrap.appendChild(group);
    return wrap;
  }

  // The big number: Osmo's odometer rolls it; without GSAP or with reduced motion it just changes
  var odometer = (window.gsap && typeof initNumberOdometer === "function") ? initNumberOdometer() : null;
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var firstPaint = true;
  function setTotal(text, instant) {
    var n = $("total");
    // A click during a roll: finish the running roll first, so the next one starts from a clean number
    var rollers = n.querySelectorAll('[data-odometer-part="roller"]');
    if (rollers.length) gsap.getTweensOf(rollers).forEach(function (tw) { (tw.parent && tw.parent !== gsap.globalTimeline ? tw.parent : tw).progress(1); });
    // First paint, no GSAP, reduced motion, or dragging a slider: the number just changes
    if (firstPaint || instant || !odometer || reduceMotion) { if (n.textContent.trim() !== text) n.textContent = text; firstPaint = false; return; }
    odometer(n, text);
  }

  // Open and close with ease: height, the spacing around it and a fade, with GSAP. A quick second click
  // picks up from where it is. On the first paint, with reduced motion or without GSAP it just switches.
  var FOLD = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom"], ready = false;
  function eased() { return ready && window.gsap && !reduceMotion; }
  function fold(box) { var cs = getComputedStyle(box), o = {}; FOLD.forEach(function (k) { o[k] = parseFloat(cs[k]) || 0; }); return o; }
  function reveal(box, show, instant) {
    if (box.dataset.show === String(show)) return;
    box.dataset.show = show;
    if (instant && window.gsap) { // one button takes over from another in the same spot
      gsap.killTweensOf(box); gsap.killTweensOf(Array.from(box.children));
      gsap.set(box, { clearProps: FOLD.join(",") + ",overflow" }); gsap.set(Array.from(box.children), { clearProps: "opacity,visibility,y" });
    }
    if (!eased() || instant) { box.hidden = !show; return; }
    var kids = Array.from(box.children), from = {}, to;
    if (box.hidden) FOLD.forEach(function (k) { from[k] = 0; }); else from = fold(box);
    gsap.killTweensOf(box); gsap.killTweensOf(kids);
    box.hidden = false;
    if (show) {
      FOLD.forEach(function (k) { box.style[k] = ""; });
      to = fold(box);
      to.duration = .6; to.ease = "expo.out";
      gsap.fromTo(kids, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: .45, ease: "power3.out", stagger: .035, delay: .05, clearProps: "all" });
    } else {
      to = {}; FOLD.forEach(function (k) { to[k] = 0; });
      to.duration = .42; to.ease = "power3.inOut";
      gsap.to(kids, { autoAlpha: 0, duration: .2, ease: "power2.out" });
    }
    box.style.overflow = "hidden";
    to.onUpdate = queueWire;
    to.onComplete = function () {
      box.hidden = !show;
      gsap.set(box, { clearProps: FOLD.join(",") + ",overflow" });
      gsap.set(kids, { clearProps: "all" });
      queueWire();
    };
    gsap.fromTo(box, from, to);
  }

  // The lines in the price card: new ones fade in and the card eases to its new height
  function fillLines(ul, lines) {
    var had = Array.from(ul.children).map(function (li) { return li.firstChild.textContent; });
    var before = ul.hidden ? 0 : ul.offsetHeight;
    if (window.gsap) gsap.killTweensOf(ul);
    FOLD.forEach(function (k) { ul.style[k] = ""; }); ul.style.overflow = ""; // also when this cuts a running reveal() short
    ul.innerHTML = "";
    var fresh = [];
    lines.forEach(function (x) {
      var li = el("li");
      li.appendChild(el("span", "", x[0])); li.appendChild(el("span", "", eur(x[1])));
      ul.appendChild(li);
      if (had.indexOf(x[0]) < 0) fresh.push(li);
    });
    if (!eased() || !before) return;
    if (fresh.length) gsap.from(fresh, { autoAlpha: 0, duration: .45, ease: "power2.out", clearProps: "all" });
    var after = ul.offsetHeight;
    if (after === before) return;
    ul.style.overflow = "hidden";
    gsap.fromTo(ul, { height: before }, { height: after, duration: .55, ease: "expo.out", onUpdate: queueWire, clearProps: "height,overflow" });
  }

  function render(instant) {
    CONFIG.pages.forEach(function (p) {
      $("n-" + p.id).textContent = state.pages[p.id];
      $("page-price-" + p.id).classList.toggle("is-on", state.pages[p.id] > 0);
    });

    document.querySelectorAll(".calc_toggle").forEach(function (s) {
      var id = s.dataset.id;
      s.setAttribute("aria-checked", String(id === "brand" ? state.brandOn : !!state.toggles[id]));
    });
    reveal($("brand-subs"), state.brandOn);
    var parentSwitch = document.querySelector('.calc_toggle[data-id="brand"]');
    parentSwitch.setAttribute("aria-expanded", String(state.brandOn));
    // Branding row: its total when on. Off it has no price yet (the parts open with the switch), just a word by the (i)
    var brandWord = mode === "client" ? "" : CONFIG.copy.recommended; // in a lead's link, what's on already is the recommendation
    $("brand-word").textContent = brandWord;
    $("brand-word").hidden = state.brandOn || !brandWord;
    $("price-brand").textContent = state.brandOn ? "+" + eur(brandSum()) : "";

    CONFIG.toggles.forEach(function (t) {
      if (!t.hourly) return;
      var on = !!state.toggles[t.id];
      reveal($("hours-" + t.id), on);
      $("hours-" + t.id).querySelectorAll("input").forEach(function (i) { i.checked = +i.value === state.hours[t.id]; });
      $("price-" + t.id).textContent = on ? "+" + eur(priceOf(t)) : eur(t.hourly) + " / hour";
    });

    var r = calc(), reached = r.scope >= CONFIG.minimum;
    $("total-label").textContent = reached ? CONFIG.totalLabel.reached : CONFIG.totalLabel.below;
    setTotal(eur(r.shown), instant === true);
    if (window.calcBall) calcBall.set(r.shown, CONFIG.minimum);

    // Under the minimum: a bar that fills as the scope grows, gone once the minimum is reached
    reveal($("meter"), !reached);
    $("meter-fill").style.width = Math.min(100, r.scope / CONFIG.minimum * 100) + "%";
    $("meter-text").textContent = CONFIG.copy.underMinimum.replace("{min}", eur(CONFIG.minimum));

    var ul = $("lines");
    if (r.lines.length) fillLines(ul, r.lines);
    reveal(ul, !!r.lines.length);

    current = { scope: scopeText(eur(r.total) + (reached ? "" : ", the minimum")), range: eur(r.total) };
    $("scope-summary").textContent = current.scope;
    $("f-selections").value = current.scope.split("\nEstimate:")[0];
    $("f-range").value = current.range;
    if (undo && !sameSnap(snap(), undo.after)) undo = null; // something else changed: nothing left to undo
    swapNow = !!undo !== undoShown; undoShown = !!undo;
    reveal($("undo"), !!undo, swapNow);
    reveal($("start-over"), mode !== "client" && picked() && !undo, swapNow); // the lead has "Back to my recommendation"
    if (mode !== "public") syncShare();
    queueWire();
  }

  // Personal links: the address bar always holds the current version, so a reload keeps it
  function shareData() {
    if (mode === "make") return { v: 1, n: $("make-name").value.trim(), m: $("make-line").value.trim(), r: snap() };
    var o = { v: 1, n: share.n, m: share.m, r: share.r }, s = snap();
    if (!sameSnap(s, share.r)) o.c = s;
    return o;
  }
  function syncShare() {
    var o = shareData();
    if (!preview) history.replaceState(null, "", location.pathname + (mode === "make" ? "?make" : "") + shareHash(o));
    if (mode === "client") reveal($("reset"), !!o.c && !undo, swapNow);
    $("made").hidden = true; // the scope changed: the copied link is no longer this version
  }

  // The site's button markup (.btn); buttons.js adds the magnet, the label swap and the boil
  function setBtn(b, label, alt) {
    var inner = el("span", "btn_in"), swap = el("span", "btn_swap"), line = el("span", "btn_line");
    line.appendChild(el("span", "btn_t", label));
    swap.appendChild(line); inner.appendChild(swap);
    b.textContent = ""; b.appendChild(inner);
    b.classList.add("btn"); b.setAttribute("aria-label", label);
    if (alt) b.setAttribute("data-btn-alt", alt);
  }

  // A short pop-up at the bottom of the screen (copied, or what's missing)
  var toastT = 0;
  function toast(text, bad) {
    var t = $("toast");
    t.textContent = text; t.classList.toggle("is-bad", !!bad);
    t.hidden = false; t.classList.remove("is-in"); void t.offsetWidth; t.classList.add("is-in");
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2800);
  }

  // Start over and Back to my recommendation change everything at once, so the button itself turns into Undo.
  // It stays until something else changes: no pop-up that fades away before you've decided.
  var undo = null, undoShown = false, swapNow = false;
  function resetTo(target) {
    undo = { before: snap() };
    applySnap(target);
    undo.after = snap();
    render();
  }
  function setupUndo() {
    var C = CONFIG.copy;
    setBtn($("start-over"), C.startOver, C.canUndo);
    $("start-over").addEventListener("click", function () { resetTo({ p: [], b: 0, t: [] }); });
    setBtn($("undo"), C.undo, C.undoAlt);
    $("undo").addEventListener("click", function () { var b = undo.before; undo = null; applySnap(b); render(); });
  }

  function setupShare() {
    var C = CONFIG.copy, cta = $("cta");
    cta.removeAttribute("aria-controls"); cta.removeAttribute("aria-expanded");
    $("eyebrow").textContent = mode === "make" ? C.makeEyebrow : C.clientEyebrow;

    if (mode === "make") {
      // The header becomes the two fields, styled as what the lead will see
      var name = el("input", "calc_edit"); name.id = "make-name"; name.type = "text"; name.maxLength = 60;
      name.placeholder = C.makeName; name.setAttribute("aria-label", C.makeName); name.autocomplete = "off";
      var line = el("textarea", "calc_edit"); line.id = "make-line"; line.rows = 2; line.maxLength = 160;
      line.placeholder = C.clientLede; line.setAttribute("aria-label", "A line for them (optional)");
      if (share) { name.value = share.n || ""; line.value = share.m || ""; }
      $("title").textContent = ""; $("title").appendChild(name);
      $("lede").textContent = ""; $("lede").appendChild(line);
      [name, line].forEach(function (f) { f.addEventListener("input", function () { f.removeAttribute("aria-invalid"); syncShare(); }); });
      setBtn(cta, C.makeCta, C.makeCtaAlt);
    } else {
      $("title").textContent = share.n || "Your project";
      $("lede").textContent = share.m || C.clientLede;
      document.title = (share.n || "Your project") + " · Rimbo Designs";
      setBtn(cta, C.clientCta, C.clientCtaAlt);
      setBtn($("reset"), C.reset, C.canUndo);
      $("reset").addEventListener("click", function () { resetTo(share.r); });
    }

    $("made-copy").textContent = C.copy;
    $("made-open").textContent = C.makeOpen;

    // Copy a link; the pop-up says whether it worked. Maker: the link stays under the button with Copy
    // and Open it. Lead: the link only shows when copying failed, so they can copy it by hand.
    function copyLink(link) {
      $("made-link").value = link; $("made-open").href = link; $("made-open").hidden = mode !== "make";
      function done(ok) { toast(ok ? (mode === "make" ? C.makeDone : C.clientDone) : C.copyFailed, !ok); $("made").hidden = mode !== "make" && ok; }
      function oldCopy() { // browsers that block the clipboard API: select the field and copy
        $("made").hidden = false; var f = $("made-link"); f.focus(); f.select();
        var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
        done(ok);
      }
      if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { done(true); }, oldCopy);
      else oldCopy();
    }

    cta.addEventListener("click", function () {
      if (!picked()) { toast(C.needScope, true); return; }
      if (mode === "make" && !$("make-name").value.trim()) {
        $("make-name").setAttribute("aria-invalid", "true"); $("make-name").focus();
        toast(C.makeNeedName, true);
        return;
      }
      if (preview) toast(C.previewLink);
      else copyLink(mode === "make" ? clientLink(shareData()) : location.href);
    });
    $("made-copy").addEventListener("click", function () { copyLink($("made-link").value); });
    $("made-link").addEventListener("focus", function () { this.select(); });
  }

  var current = { scope: "", range: "" };

  // The scope as plain lines for the application. Prices of single items are left out on purpose;
  // an item sold by amount says which amount.
  function scopeText(total) {
    var pages = CONFIG.pages.slice().reverse().filter(function (p) { return state.pages[p.id]; })
      .map(function (p) { return state.pages[p.id] + " " + p.id; });
    var b = [CONFIG.brand.foundation.label.toLowerCase()].concat(state.brandOn ? CONFIG.brand.items.filter(function (t) { return state.toggles[t.id]; }).map(function (t) { return t.label.toLowerCase(); }) : []);
    var tg = CONFIG.toggles.filter(function (t) { return state.toggles[t.id]; })
      .map(function (t) { return t.label + (t.hourly ? " (" + levelOf(t).label.toLowerCase() + ")" : ""); });
    return "Pages: " + (pages.join(", ") || "none") + "\n" +
      "Branding: " + (b.join(", ") || "none") + "\n" +
      "Toggles: " + (tg.join(", ") || "none") + "\n" +
      "Estimate: " + total + " (excl. VAT, an estimate, not a quote)";
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
    setBtn(cta, C.applyCta, C.applyCtaAlt);
    setBtn($("apply-submit"), C.submit, C.submitAlt);
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
      data.selections = current.scope.split("\nEstimate:")[0];
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

  // At the bottom of the Website box: what every page includes, with its (i)
  function buildIncluded() {
    var I = CONFIG.included, p = $("included");
    p.appendChild(el("span", "calc_label", I.line));
    p.appendChild(addInfo("included", I.title, I.text, p));
  }

  buildIncluded();
  buildBranding();
  buildPages();
  buildToggles();
  document.documentElement.setAttribute("data-mode", mode);
  if (share) applySnap(share.c || share.r);
  if (mode === "public") setupApply(); else setupShare();
  setupUndo();
  if (preview) {
    var nav = el("nav", "calc_views"); nav.setAttribute("aria-label", "Views");
    CONFIG.copy.views.forEach(function (v) {
      var a = el("a", "", v[1]); a.href = "#" + v[0];
      if (mode === (v[0] === "client" ? "client" : v[0])) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
    document.querySelector(".calc_head").prepend(nav);
  }
  if (window.gsap && window.rdButtons) rdButtons();
  render();
  ready = true;
})();
