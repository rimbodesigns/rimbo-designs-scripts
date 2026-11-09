/* Project calculator. Plain JS, no build.
   Every price and every info text lives in CONFIG. Prices are the draft numbers from docs/offer.md.
   Prices, not hours. The one rate on show is content migration's €97 an hour; the client picks how much
   content they have and the price follows (the hours behind each amount live in CONFIG).

   It only opens from a personal link (docs/apply-flow.md):
     ?make    Rimbo's view: he types the project name and a line, sets the scope, "Create link" copies the link
     #for=…   the lead's view: their project name, Rimbo's pick switched on, and Book a call
   Without either (or with a link that broke in an email) the page says so and offers Apply.

   On rimbodesigns.com it is the hidden page /proposal. The page, its nav and the section [data-calc] are Webflow;
   everything inside the section is built here. The page's footer code loads these files from the repo and calls
   rdCalc.mount(). It stops by itself when the page leaves through a page transition. */
(function () {
  var CONFIG = {
    callUrl: "https://cal.com/rimbo-designs/45-minute-discovery-call", // the lead's one button: they don't need to send anything back, you talk it through
    applyUrl: "/apply",            // the page without a link: strangers apply like everyone else
    previewLead: { v: 1, n: "Sample project", m: "", r: { p: [1, 3, 1, 0], b: 1, t: ["identity", "logo", "seo"] } }, // the client view in the hosted preview
    copy: {
      underMinimum: "You haven't met the {min} minimum yet.",

      // Personal links (?make = Rimbo's maker view, #for=… = the link a lead gets)
      makeEyebrow: "Personal link · only you see this view",
      makeName: "Project name",
      makeCta: "Create link",
      makeCtaAlt: "Copies it for you",
      makeNeedName: ["Not yet", "Give it a project name first."],
      needScope: ["Not yet", "Pick something first."],
      startOver: "Start over",
      undo: "Undo",
      canUndo: "You can undo this",
      undoAlt: "Back to what you had",
      makeDone: ["Link copied", "Send it to them. It opens with this scope."],
      copy: "Copy",
      makeOpen: "Open it",
      clientEyebrow: "Proposal",
      clientLede: "Switch things on or off and the price follows.",
      recommended: "Recommended",
      reset: "Back to my recommendation",
      clientCta: "Book a call",
      clientCtaAlt: "We go through it together",
      copyFailed: ["Couldn't copy", "Copy the link under the button."],
      previewLink: ["Link copied", "Not really: this preview can't copy. On your own site it will."],
      // The page without a (working) link
      none: {
        title: "Open your link",
        lede: "This page opens with the personal link from my email. Lost it? Reply to that email and I'll send it again.",
        cta: "Apply to work with me",
        ctaAlt: "A few short questions"
      },
      views: [["make", "Your view"], ["client", "Client view"], ["none", "No link"]]
    },

    // No fixed build fee (2026-11-05): design system, QA and launch grow with the project,
    // so they sit inside the page prices (the old €2,000 base, spread over the pages, then trimmed to €400 / €800 / €2,000). The minimum
    // covers the fixed part of a small project.
    minimum: 3000,           // no project goes below this; under it the card says "Projects start at"
    priorityPct: 0.25,       // priority start: jump the queue
    totalLabel: { below: "Your estimate", reached: "Your estimate" }, // the number starts at the Brand foundation; the bar shows the minimum
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
        info: "A page with one job and a few sections.\nSame design standard as the rest, with light animation." },
      { id: "medium",  label: "Medium pages",  hint: "Services, about, team",                 price: 800,  max: 20,
        info: "A page with several sections, some interaction and animation.\n~Most pages of a site are medium." },
      { id: "complex", label: "Complex pages", hint: "Home, scroll story, heavy animation",    price: 2000, max: 10,
        info: "A page that carries the brand: custom GSAP animation, scroll stories, interactive pieces.\n~Usually the home page and one or two showpieces." },
      // A whole type of content: structure, template and all its pages (Echo's 12 case studies). €1,500 on my advice, 2026-11-09
      { id: "cms",     label: "CMS templates", hint: "Blogs, news, case studies",             price: 1500, max: 10,
        info: "A whole type of content, like blog posts, news or case studies: the structure and one template, so you can add as many as you like in Webflow.\n~The overview page that lists them counts as a normal page. The content itself is yours to write." }
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
      { id: "seo",        group: "search", label: "SEO and AI-search optimisation",            price: 1000, info: "Technical SEO, titles and descriptions, structured data, and the set-up that lets search engines and AI assistants read and recommend your site.\n~Search and AI search are the same work, so they come together." },
      { id: "analytics",  group: "search", label: "Analytics set-up",                          price: 250,  info: "Tracking that shows where visitors come from and what they do, with goals on your forms and buttons.\nIt needs cookie consent, so add that too.\n~Or skip this and use Webflow Analyze, from about €10 a month." },
      { id: "consent",    group: "search", label: "Cookie consent",                            price: 300,  info: "A consent banner that holds back tracking and marketing scripts until a visitor says yes, as GDPR asks.\nIn the look of your site." },
      { id: "training",   group: "search", label: "SEO training",                              price: 500,
        info: "So you can write and publish pages and posts that get found.\nRecorded tutorial::Watch it again whenever you need it.\nOne-on-one call::About your own site.\nChecklist template::For every new page or post." },
      { id: "i18n",       group: "search", label: "Multi-language",                            price: 500,  info: "A second language with a language switch, set up so each language can be found in search." },
      // Three amounts, not an hours field (Rimbo, 2026-11-05): €97 an hour behind the scenes
      { id: "migration",  group: "search", label: "Content migration",                         hourly: 97,
        question: "How much content do you have?",
        levels: [{ label: "Very little", hours: 2 }, { label: "Quite a bit", hours: 4 }, { label: "A lot", hours: 8 }], start: 0,
        info: "Moving your existing pages, posts and images to the new site, with redirects so old links and search rankings keep working.\n~Pick roughly how much you have. The proposal confirms it." },
      { id: "loader",     group: "motion", label: "Custom page loader",                        price: 800,  info: "A branded intro animation while the site loads." },
      { id: "transition", group: "motion", label: "Custom page transitions",                   price: 900,  info: "Animated transitions between pages, so the site feels like one piece instead of separate pages." },
      { id: "theme",      group: "motion", label: "Light and dark mode",                       price: 600,  info: "A light and a dark version of the whole site, with a switch." },
      { id: "legal",      group: "more",   label: "Legal pages, done for you",                 price: 500,  info: "Privacy, cookie and terms pages written for your business and checked against GDPR.\nYou don't write a word." },
      { id: "a11y",       group: "more",   label: "Accessibility check",                       price: 800,  info: "The site tested for keyboard use, screen readers, contrast and text size against WCAG 2.2 AA, with the fixes made.\n~More and more businesses need this under the European Accessibility Act." },
      { id: "leads",      group: "more",   label: "Automations",                               price: 500,  info: "Your site connected to your other tools: form leads into your CRM or mailing list, with an automatic follow-up." },
      { id: "chatbot",    group: "more",   label: "Chatbot",                                   price: 500,  info: "A chat assistant that answers visitors' questions from your site's content." },
      { id: "system",     group: "more",   label: "Design system docs and team training",      price: 800,  info: "Every build comes with a design system.\nThis adds written documentation and a training session, so your team can build new pages with it." },
      { id: "members",    group: "more",   label: "Members area",                              price: 4000, info: "Log-in, member-only pages and gated content, with payments if needed." },
      { id: "shop",       group: "more",   label: "Webshop",                                   price: 4000, info: "Products, cart and checkout, built on Webflow e-commerce." },
      { id: "priority",   group: "more",   label: "Priority start (jump the queue)",           pct: true,   info: "Your project takes the next free slot instead of waiting in line." }
    ]
  };

  // The markup inside [data-calc]. Ids start with calc- so nothing on the page can share them
  function template(logo) {
    return '<canvas class="calc_ball" id="calc-ball" aria-hidden="true"></canvas>' +
    '<main class="calc">' +
      (logo ? '<a class="calc_logo" href="https://www.rimbodesigns.com" target="_blank" rel="noopener" aria-label="Rimbo Designs"></a>' : '') +
      '<header class="calc_head">' +
        '<p class="calc_eyebrow" id="calc-eyebrow">' + CONFIG.copy.clientEyebrow + '</p>' +
        '<h1 class="calc_title" id="calc-title"></h1>' +
        '<p class="calc_lede" id="calc-lede"></p>' +
      '</header>' +
      '<div class="calc_grid">' +
        '<div class="calc_form">' +
          '<fieldset class="calc_step"><legend><span class="calc_num">01</span>Branding</legend><div id="calc-branding"></div></fieldset>' +
          '<fieldset class="calc_step"><legend><span class="calc_num">02</span>Website</legend><div id="calc-pages"></div><p class="calc_included" id="calc-included"></p></fieldset>' +
          '<div id="calc-groups"></div>' + // 03, 04, …: the add-on groups, built from CONFIG.groups
        '</div>' +
        '<div class="calc_side">' +
          '<aside class="calc_result" aria-live="polite">' +
            '<p class="calc_eyebrow" id="calc-total-label">Your estimate</p>' +
            '<div class="calc_price_row"><p class="calc_range"><span id="calc-total" data-odometer-element>&nbsp;</span></p><span class="calc_vat">Excl. VAT</span></div>' +
            '<div class="calc_meter" id="calc-meter" hidden><div class="calc_meter_bar"><span id="calc-meter-fill"></span></div><p class="calc_meter_text" id="calc-meter-text"></p></div>' +
            '<ul class="calc_lines" id="calc-lines"></ul>' +
            '<button class="calc_cta" id="calc-cta" type="button"></button>' +
            // The copied link, and the ways back
            '<div class="calc_made" id="calc-made" hidden>' +
              '<div class="calc_made_row"><input class="calc_made_link" id="calc-made-link" type="text" readonly aria-label="Link"><button class="calc_made_copy" id="calc-made-copy" type="button"></button></div>' +
              '<a class="calc_link" id="calc-made-open" href="#" target="_blank" rel="noopener" hidden></a>' +
            '</div>' +
            '<button class="calc_cta is-secondary" id="calc-reset" type="button" hidden></button>' +
            '<button class="calc_cta is-secondary" id="calc-start-over" type="button" hidden></button>' +
            '<button class="calc_cta is-secondary" id="calc-undo" type="button" hidden></button>' +
          '</aside>' +
          // Tip card: filled by the (i) buttons; hover previews, click pins
          '<aside class="calc_tip" id="calc-tip" aria-live="polite" aria-labelledby="calc-tip-title" data-lenis-prevent hidden>' +
            '<button class="calc_tip_close" id="calc-tip-close" type="button" aria-label="Close">×</button>' +
            '<h2 class="calc_tip_title" id="calc-tip-title"></h2>' +
            '<p class="calc_tip_text" id="calc-tip-text"></p>' +
          '</aside>' +
        '</div>' +
      '</div>' +
    '</main>' +
    '<div class="calc_toast" id="calc-toast" role="status" aria-live="polite" hidden>' +
      '<canvas class="calc_toast_ball" id="calc-toast-ball" aria-hidden="true"></canvas>' +
      '<p class="calc_toast_copy"><strong class="calc_toast_title" id="calc-toast-title"></strong><span id="calc-toast-text"></span></p>' +
      '<span class="calc_toast_time" id="calc-toast-time"></span>' +
    '</div>' +
    '<svg class="calc_wire" id="calc-wire" aria-hidden="true"><path id="calc-wire-path" d=""/><rect id="calc-wire-a" width="5" height="5"/><rect id="calc-wire-b" width="5" height="5"/></svg>';
  }

  function eur(n) { return "€" + Math.round(n).toLocaleString("en-GB"); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Personal links. Everything sits after the # (browsers never send that part to a server): n = name, m = line,
  // d = the day the link was made, r = Rimbo's pick, c = the lead's own version (only when it differs).
  // A link shows today's prices; d is there so a link could keep its own prices or a "valid until" later.
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
  function today() { var t = new Date(); return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate()); }

  // On the site the files come from jsDelivr, at the same version as this script. The page's head code links the CSS;
  // a page that arrives through a page transition doesn't bring that link along, so it is added here.
  var SCRIPT = (document.currentScript && document.currentScript.src) || "";
  function withCSS(root, go) {
    var repo = SCRIPT.match(/gh\/[^,?#]+?@[^\/,]+\/prototype\/calculator\//);
    if (!repo || document.querySelector('link[rel="stylesheet"][href*="/prototype/calculator/calculator"]')) return go();
    var link = document.createElement("link");
    link.rel = "stylesheet"; link.href = new URL(SCRIPT).origin + "/" + repo[0] + "calculator.min.css";
    root.style.visibility = "hidden";
    link.onload = link.onerror = function () { root.style.visibility = ""; if (root.isConnected) go(); };
    document.head.appendChild(link);
  }

  // The calculator on screen, so the next page can stop it
  var current = null;
  function stopGone() { if (current && !current.root.isConnected) { current.destroy(); current = null; } }

  // Starts the calculator in the page's [data-calc] (once per page)
  function mount() {
    stopGone();
    var root = document.querySelector("[data-calc]");
    if (!root || root.hasAttribute("data-calc-on")) return;
    root.setAttribute("data-calc-on", "");
    withCSS(root, function () { stopGone(); current = start(root); });
  }
  window.rdCalc = { mount: mount, config: CONFIG };
  // Page transitions (Barba, on staging): once the page has gone, everything it started stops
  if (window.barba && barba.hooks) barba.hooks.after(stopGone);

  function start(root) {
    // Everything that listens outside the calculator is written down here, so destroy() can stop it
    var add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener, offs = [];
    function on(target, type, fn, options) { add.call(target, type, fn, options); offs.push(function () { remove.call(target, type, fn, options); }); }
    // Osmo's odometer listens to the window itself: catch that too
    function catchListeners(fn) {
      var own = Object.prototype.hasOwnProperty.call(window, "addEventListener"), before = window.addEventListener;
      window.addEventListener = function (type, f, o) { on(window, type, f, o); };
      try { return fn(); } finally { if (own) window.addEventListener = before; else delete window.addEventListener; }
    }

    var state = { pages: { simple: 0, medium: 0, complex: 0, cms: 0 }, brandOn: false, brandTouched: false, toggles: {}, hours: {} };
    CONFIG.toggles.forEach(function (t) { if (t.hourly) state.hours[t.id] = t.levels[t.start].hours; });
    // An item's price: fixed, or the chosen amount's hours × rate
    function priceOf(t) { return t.hourly ? t.hourly * state.hours[t.id] : t.price; }

    var q = new URLSearchParams(location.search);
    if (q.get("theme") === "light" || q.get("theme") === "dark") root.setAttribute("data-calc-theme", q.get("theme"));

    root.innerHTML = template(root.hasAttribute("data-calc-logo"));
    function $(id) { return document.getElementById("calc-" + id); }

    // Three views of the same page:
    //   make    ?make: Rimbo types the project name and a line in the header, sets the scope, "Create link" copies a link
    //   client  #for=…: the lead sees their project name and Rimbo's pick switched on, and can change it
    //   none    no link, or a broken one: a short line and Apply
    // The hosted preview (build-preview.py): its viewer only passes a plain #name, so #make, #client and #none pick the view
    var preview = !!window.CALC_PREVIEW, view = location.hash.slice(1);
    var share = preview ? (view === "client" ? CONFIG.previewLead : null) : readShare();
    var mode = q.has("make") || (preview && (view === "make" || !view)) ? "make" : share ? "client" : "none";
    // A different link pasted into the same tab: start again with it. Only a new #for= counts, never an anchor
    var lastHash = location.hash;
    on(window, "hashchange", function () { if (preview || (/[#&]for=/.test(location.hash) && location.hash !== lastHash)) location.reload(); });

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

    // Anything picked on top of the Brand foundation?
    function picked() {
      return CONFIG.pages.some(function (p) { return state.pages[p.id]; }) ||
        (state.brandOn && CONFIG.brand.items.some(function (t) { return state.toggles[t.id]; })) ||
        CONFIG.toggles.some(function (t) { return !t.pct && state.toggles[t.id]; });
    }

    // The selected items as [label, price] lines, plus:
    //   scope  the items added up (before priority)
    //   shown  the big number: starts at the Brand foundation and follows the scope, priority included
    function calc() {
      // One line per section, so the card stays short however much is on (the switches already show what's picked)
      var out = [];
      function line(label, sum) { if (sum) out.push([label, sum]); }
      // Branding includes the foundation: it's in every project, so the page starts at its price
      line(CONFIG.brand.label, CONFIG.brand.foundation.price + (state.brandOn ? brandSum() : 0));
      line("Website", CONFIG.pages.reduce(function (a, p) { return a + state.pages[p.id] * p.price; }, 0));
      CONFIG.groups.forEach(function (g) {
        line(g.line || g.legend, CONFIG.toggles.reduce(function (a, t) { return a + (t.group === g.id && !t.pct && state.toggles[t.id] ? priceOf(t) : 0); }, 0));
      });
      var scope = out.reduce(function (a, x) { return a + x[1]; }, 0), pr = state.toggles.priority ? CONFIG.priorityPct : 0;
      if (pr) out.push(["Priority start (+" + Math.round(pr * 100) + "%)", scope * pr]);
      return { lines: out, scope: scope, shown: scope * (1 + pr) };
    }

    function brandSum() {
      return CONFIG.brand.items.reduce(function (a, t) { return a + (state.toggles[t.id] ? t.price : 0); }, 0);
    }

    // The site's fixed nav bar sits over the top of the page: the sticky column and the tip keep clear of it
    function topGap() {
      var bar = document.querySelector(".bold-nav-full__bar");
      return bar && getComputedStyle(bar).position === "fixed" ? bar.offsetHeight + 16 : 16;
    }
    function setTop() { var g = topGap(); root.style.setProperty("--calc-top", (g > 16 ? g : 24) + "px"); }

    // Info: a small round "i" after each label. Hover (or focus) previews the tip card under the
    // price card, a click pins it, and a dashed line runs from the item's box to the card.
    var info = {}, tip = { pinned: null, hover: null, hideT: 0 };
    function addInfo(key, label, text, row) {
      var btn = el("button", "calc_info", "i");
      btn.type = "button"; btn.setAttribute("aria-controls", "calc-tip"); btn.setAttribute("aria-expanded", "false");
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
        var wasHidden = box.hidden;
        // Words stay whole in the title: "Analytics / set-up", never "set- / up"
        var head = $("tip-title"); head.textContent = "";
        info[key].label.split(" ").forEach(function (w, i) { if (i) head.appendChild(document.createTextNode(" ")); head.appendChild(el("span", "calc_nb", w)); });
        var tt = $("tip-text"); tt.textContent = "";
        info[key].text.split("\n").forEach(function (line) {
          var kind = line.charAt(0) === "~" ? "is-note" : line.charAt(0) === "^" ? "is-note is-phone" : "";
          if (kind) line = line.slice(1);
          var step = line.split("::"), row = el("span", "calc_tip_line " + kind, step.length > 1 ? "" : line);
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
        // The lines arrive one after the other (not while hovering from one (i) to the next, that would flicker)
        if (window.gsap && !reduceMotion && wasHidden) {
          var lines = [head].concat(Array.from(tt.children));
          gsap.killTweensOf(lines);
          gsap.fromTo(lines, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .5, ease: "expo.out", stagger: .035, clearProps: "all" });
        }
      }
      box.hidden = false;
      fitSide();
      drawWire();
    }

    // If the tip doesn't fit under the price card, the whole column eases up into the empty space above it, so
    // nothing gets covered. Only as far as needed, and back when the tip closes.
    function fitSide() {
      if (!window.gsap || reduceMotion || matchMedia("(max-width: 860px)").matches) return;
      var side = root.querySelector(".calc_side"), y = gsap.getProperty(side, "y") || 0, shift = 0, top = topGap();
      if (!$("tip").hidden) {
        var r = side.getBoundingClientRect();
        shift = Math.min(0, Math.max(innerHeight - 16 - (r.bottom - y), top - (r.top - y)));
      }
      // A window too short for both: the tip scrolls inside itself
      var box = $("tip"); box.style.maxHeight = ""; box.style.overflowY = "";
      if (!box.hidden) {
        var room = innerHeight - 16 - top - (side.offsetHeight - box.offsetHeight);
        if (room < box.offsetHeight) { box.style.maxHeight = Math.max(room, 160) + "px"; box.style.overflowY = "auto"; }
        if (room < box.scrollHeight) { var r2 = side.getBoundingClientRect(); shift = Math.min(0, Math.max(innerHeight - 16 - (r2.bottom - y), top - (r2.top - y))); }
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
    on(window, "scroll", function () { queueWire(); if (!$("tip").hidden) fitSide(); }, { passive: true });
    on(window, "resize", function () { setTop(); queueWire(); });
    var grid = root.querySelector(".calc_grid"), gridWatch = window.ResizeObserver ? new ResizeObserver(queueWire) : null;
    if (gridWatch) { gridWatch.observe(grid); offs.push(function () { gridWatch.disconnect(); }); }
    on(document, "keydown", function (e) { if (e.key === "Escape" && (tip.pinned || tip.hover)) { tip.pinned = tip.hover = null; showTip(); } });

    function labelLine(label, key, text, row) {
      var line = el("span", "calc_labelline");
      line.appendChild(el("span", "calc_label", label));
      if (text) line.appendChild(addInfo(key, label, text, row));
      return line;
    }

    function buildPages() {
      var box = $("pages");
      CONFIG.pages.forEach(function (p) {
        var item = el("div", "calc_item");
        var row = el("div", "calc_row");
        var step = el("div", "calc_stepper");
        var minus = el("button", "", "−"); minus.type = "button"; minus.setAttribute("aria-label", "Fewer " + p.label.toLowerCase());
        var out = el("output", "", "0"); out.id = "calc-n-" + p.id;
        var plus = el("button", "", "+"); plus.type = "button"; plus.setAttribute("aria-label", "More " + p.label.toLowerCase());
        minus.addEventListener("click", function () { state.pages[p.id] = Math.max(0, state.pages[p.id] - 1); render(); });
        plus.addEventListener("click", function () { state.pages[p.id] = Math.min(p.max, state.pages[p.id] + 1); render(); });
        step.appendChild(minus); step.appendChild(out); step.appendChild(plus);
        row.appendChild(labelLine(p.label, p.id, p.info + "\n^" + p.hint + ".", row)); // ^ shows on phones only: the examples sit next to the (i) elsewhere
        row.appendChild(el("span", "calc_rec calc_examples", p.hint));
        var price = el("span", "calc_price", eur(p.price)); price.id = "calc-page-price-" + p.id;
        row.appendChild(price);
        row.appendChild(step);
        item.appendChild(row);
        box.appendChild(item);
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
      var price = el("span", "calc_price", priceText); price.id = "calc-price-" + t.id;
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
      var B = CONFIG.brand, box = $("branding");
      box.appendChild(makeFixed(B.foundation));
      var parent = makeItem({ id: "brand", label: B.label, info: B.info }, "", function () {
        state.brandOn = !state.brandOn;
        if (state.brandOn && !state.brandTouched) { B.preset.forEach(function (id) { state.toggles[id] = true; }); state.brandTouched = true; }
        render();
      });
      parent.classList.add("calc_item_parent");
      var parentSwitch = parent.querySelector(".calc_toggle");
      parentSwitch.setAttribute("aria-controls", "calc-brand-subs");
      var word = el("span", "calc_rec"); word.id = "calc-brand-word";
      parent.querySelector(".calc_price").before(word);
      box.appendChild(parent);

      var subs = el("div", "calc_subs"); subs.id = "calc-brand-subs"; subs.hidden = true;
      B.items.forEach(function (t) {
        subs.appendChild(makeItem(t, "+" + eur(t.price), function () { state.toggles[t.id] = !state.toggles[t.id]; render(); }));
      });
      box.appendChild(subs);
    }

    // The add-ons: one numbered box per group, after 01 Branding and 02 Website
    function buildToggles() {
      var box = $("groups");
      CONFIG.groups.forEach(function (g, gi) {
        var set = el("fieldset", "calc_step"), list = el("div");
        var legend = el("legend"); legend.appendChild(el("span", "calc_num", String(gi + 3).padStart(2, "0"))); legend.appendChild(document.createTextNode(g.legend));
        set.appendChild(legend);
        set.appendChild(list);
        CONFIG.toggles.filter(function (t) { return t.group === g.id; }).forEach(function (t) {
          var priceText = t.pct ? "+" + Math.round(CONFIG.priorityPct * 100) + "%" : t.hourly ? eur(t.hourly) + " / hour" : "+" + eur(t.price);
          list.appendChild(makeItem(t, priceText, function () { state.toggles[t.id] = !state.toggles[t.id]; render(); }));
          if (t.hourly) list.appendChild(makeHours(t));
        });
        box.appendChild(set);
      });
    }

    // Hourly item: switched on, a question with three choices opens under it (real radio buttons, so arrow keys work)
    function makeHours(t) {
      var wrap = el("div", "calc_hours"); wrap.id = "calc-hours-" + t.id; wrap.hidden = true;
      var ask = el("p", "calc_hours_q", t.question); ask.id = "calc-hours-q-" + t.id;
      var group = el("div", "calc_seg"); group.setAttribute("role", "radiogroup"); group.setAttribute("aria-labelledby", ask.id);
      wrap.appendChild(ask);
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
    var odometer = (window.gsap && typeof initNumberOdometer === "function") ? catchListeners(initNumberOdometer) : null;
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

    var ball = null;
    function render(instant) {
      CONFIG.pages.forEach(function (p) {
        $("n-" + p.id).textContent = state.pages[p.id];
        $("page-price-" + p.id).classList.toggle("is-on", state.pages[p.id] > 0);
      });

      root.querySelectorAll(".calc_toggle").forEach(function (s) {
        var id = s.dataset.id;
        s.setAttribute("aria-checked", String(id === "brand" ? state.brandOn : !!state.toggles[id]));
      });
      reveal($("brand-subs"), state.brandOn);
      var parentSwitch = root.querySelector('.calc_toggle[data-id="brand"]');
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
      if (ball) ball.set(r.shown, CONFIG.minimum);

      // Under the minimum: a bar that fills as the scope grows, gone once the minimum is reached
      reveal($("meter"), !reached);
      $("meter-fill").style.width = Math.min(100, r.scope / CONFIG.minimum * 100) + "%";
      $("meter-text").textContent = CONFIG.copy.underMinimum.replace("{min}", eur(CONFIG.minimum));

      var ul = $("lines");
      if (r.lines.length) fillLines(ul, r.lines);
      reveal(ul, !!r.lines.length);

      if (undo && !sameSnap(snap(), undo.after)) undo = null; // something else changed: nothing left to undo
      swapNow = !!undo !== undoShown; undoShown = !!undo;
      reveal($("undo"), !!undo, swapNow);
      reveal($("start-over"), mode === "make" && picked() && !undo, swapNow); // the lead has "Back to my recommendation"
      if (mode !== "none") syncShare();
      queueWire();
    }

    // Personal links: the address bar always holds the current version, so a reload keeps it
    function shareData() {
      if (mode === "make") return { v: 1, n: $("make-name").value.trim(), m: $("make-line").value.trim(), d: today(), r: snap() };
      var o = { v: 1, n: share.n, m: share.m, r: share.r }, s = snap();
      if (share.d) o.d = share.d;
      if (!sameSnap(s, share.r)) o.c = s;
      return o;
    }
    function syncShare() {
      var o = shareData();
      if (!preview) {
        history.replaceState(history.state, "", location.pathname + (mode === "make" ? "?make" : "") + shareHash(o)); // keeps the page transitions' own history entry
        lastHash = location.hash;
      }
      if (mode === "client") reveal($("reset"), !!o.c && !undo, swapNow);
      $("made").hidden = true; // the scope changed: the copied link is no longer this version
    }

    // The site's button markup (.btn); the site's rdButtons adds the magnet, the label swap and the boil
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
    function toast(msg, bad) {
      var t = $("toast"), title = $("toast-title"), bar = $("toast-time"), side = root.querySelector(".calc_side");
      clearTimeout(toastT);
      if (toast.stop) toast.stop();
      title.textContent = "";
      var chars = Array.from(msg[0]).map(function (ch) { var c = el("span", "calc_toast_ch", ch === " " ? " " : ch); title.appendChild(c); return c; });
      $("toast-text").textContent = msg[1];
      t.classList.toggle("is-bad", !!bad);
      // Under the price card, where the eye already is. On phones the CSS takes it full width
      var wide = innerWidth > 860, r = side.getBoundingClientRect();
      t.style.left = wide ? r.left + "px" : ""; t.style.width = wide ? r.width + "px" : "";
      t.hidden = false;
      toast.stop = ball ? ball.pop($("toast-ball"), !!bad) : null;
      function close() {
        if (toast.stop) { toast.stop(); toast.stop = null; }
        t.hidden = true;
      }
      if (!window.gsap || reduceMotion) { if (window.gsap) gsap.set(bar, { scaleX: 0 }); toastT = setTimeout(close, 3600); t.onclick = close; return; }
      gsap.killTweensOf([t, bar].concat(chars));
      gsap.fromTo(t, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, ease: "expo.out" });
      gsap.fromTo(chars, { yPercent: 110 }, { yPercent: 0, duration: .65, ease: "expo.out", stagger: .014, delay: .05 });
      function out() { gsap.killTweensOf(bar); gsap.to(t, { y: 12, autoAlpha: 0, duration: .35, ease: "power2.in", overwrite: true, onComplete: close }); }
      gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: 3.6, ease: "none", onComplete: out }); // the line shows how long it stays
      t.onclick = out;
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
      $("eyebrow").textContent = mode === "make" ? C.makeEyebrow : C.clientEyebrow;

      if (mode === "make") {
        // The header becomes the two fields, styled as what the lead will see
        var name = el("input", "calc_edit"); name.id = "calc-make-name"; name.type = "text"; name.maxLength = 60;
        name.placeholder = C.makeName; name.setAttribute("aria-label", C.makeName); name.autocomplete = "off";
        var line = el("textarea", "calc_edit"); line.id = "calc-make-line"; line.rows = 2; line.maxLength = 160;
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
        // A real link to the booking page
        var call = el("a", cta.className); call.id = "calc-cta"; call.href = CONFIG.callUrl; call.target = "_blank"; call.rel = "noopener";
        cta.replaceWith(call); cta = call;
        setBtn(cta, C.clientCta, C.clientCtaAlt);
        setBtn($("reset"), C.reset, C.canUndo);
        $("reset").addEventListener("click", function () { resetTo(share.r); });
      }

      $("made-copy").textContent = C.copy;
      $("made-open").textContent = C.makeOpen;

      // Copy a link; the pop-up says whether it worked. Maker: the link stays under the button with Copy
      // and Open it. Lead: the link only shows when copying failed, so they can copy it by hand.
      function copyLink(link) {
        $("made-link").value = link; $("made-open").href = link; $("made-open").hidden = false;
        function done(ok) { toast(ok ? C.makeDone : C.copyFailed, !ok); $("made").hidden = false; }
        function oldCopy() { // browsers that block the clipboard API: select the field and copy
          $("made").hidden = false; var f = $("made-link"); f.focus(); f.select();
          var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
          done(ok);
        }
        if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { done(true); }, oldCopy);
        else oldCopy();
      }

      if (mode === "make") cta.addEventListener("click", function () {
        if (!picked()) { toast(C.needScope, true); return; }
        if (!$("make-name").value.trim()) {
          $("make-name").setAttribute("aria-invalid", "true"); $("make-name").focus();
          toast(C.makeNeedName, true);
          return;
        }
        if (preview) toast(C.previewLink);
        else copyLink(clientLink(shareData()));
      });
      $("made-copy").addEventListener("click", function () { copyLink($("made-link").value); });
      $("made-link").addEventListener("focus", function () { this.select(); });
    }

    // No link, or one that broke on its way: say so, and offer what everyone else gets (Apply)
    function setupNone() {
      var C = CONFIG.copy.none;
      $("title").textContent = C.title;
      $("lede").textContent = C.lede;
      var apply = el("a", "calc_none_cta"); apply.href = CONFIG.applyUrl;
      setBtn(apply, C.cta, C.ctaAlt);
      $("lede").after(apply);
      grid.hidden = true;
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
    root.setAttribute("data-mode", mode);
    if (share) applySnap(share.c || share.r);
    if (mode === "none") setupNone(); else setupShare();
    setupUndo();
    if (preview) {
      var nav = el("nav", "calc_views"); nav.setAttribute("aria-label", "Views");
      CONFIG.copy.views.forEach(function (v) {
        var a = el("a", "", v[1]); a.href = "#" + v[0];
        if (mode === v[0]) a.setAttribute("aria-current", "page");
        nav.appendChild(a);
      });
      root.querySelector(".calc_head").prepend(nav);
    }
    setTop();
    ball = window.calcBallMount ? calcBallMount(root) : null;
    // The site's buttons (main.js), or the preview's copy of them (buttons.js)
    if (window.gsap && window.rdButtons) rdButtons(root);
    render();
    ready = true;

    // The page left without a reload (a page transition): stop everything this started outside the calculator
    function destroy() {
      offs.forEach(function (off) { off(); }); offs = [];
      clearTimeout(tip.hideT); clearTimeout(toastT);
      if (wireFrame) cancelAnimationFrame(wireFrame);
      if (toast.stop) toast.stop();
      if (ball) ball.destroy();
      if (window.gsap) gsap.killTweensOf(root.querySelectorAll("*"));
      root.removeAttribute("data-calc-on");
    }
    return { root: root, destroy: destroy };
  }
})();
