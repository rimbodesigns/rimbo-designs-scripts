// V2 prototype: a new opening, after Rimbo's old Figma direction. The page is the synced staging
// page; this script removes the old hero and the glass carousel and builds the V2 hero instead:
// a band of work sliding by in perspective (a laptop-screen angle), the copy in the top corner.
// Runs before main.js, so the site's own marquee code drives the rows.
(function () {
  'use strict';

  var main = document.getElementById('MainWrap');
  if (!main || document.querySelector('.v2-hero')) return;

  // ---- out with the old opening, and with the pill nav at the top: the burger is the menu now
  ['.spacer_hero', '#FadeOUT', '[data-glass-carousel]', '.topnav'].forEach(function (sel) {
    var el = document.querySelector(sel); if (el) el.remove();
  });

  // test switches: ?noclips (covers only), ?nograin (no grain overlay), ?noblur (no edge blur), ?notilt,
  // ?nodrag, ?noloader (band at once)
  var noClips = /[?&]noclips/.test(location.search);
  if (/[?&]nograin/.test(location.search)) document.documentElement.classList.add('v2-nograin');
  if (/[?&]noblur/.test(location.search)) document.documentElement.classList.add('v2-noblur');
  var noTilt = /[?&]notilt/.test(location.search);
  var noDrag = /[?&]nodrag/.test(location.search);
  var noLoader = /[?&]noloader/.test(location.search);

  // ---- the work on the band: only the projects Rimbo approved (older work stays out; Pooh Balance
  // cut on 2026-11-04, Meet Tinko in its place). Clips where there is one, covers for the rest. Sandra
  // and Nathan stay static on purpose (their clips were recorded and set aside).
  var CDN = 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/';
  var DFS_COVER = CDN + '6aa42d7d36f358a8814102d0_PNG%20to%20AVIF%20Cover%20v2.avif';
  var W = {
    innergym: { name: 'Innergym', video: '/media/innergym.mp4', rate: 1.5, img: '/media/innergym-cover.jpg', href: 'https://relume-35142b-1c4210f53c5dee0536bbe334f.webflow.io/' },
    dfs: { name: 'Digital Feng Shui', video: '/media/dfs-home-test.mp4', rate: 2, img: DFS_COVER, href: 'https://www.digital-fengshui.com/' },
    nathan: { name: 'Nathan Rajac', img: CDN + '67e3d914128c8952d1dd6523_Nathan4.avif', href: 'https://www.nathanrajac.com/' },
    charlies: { name: "Charlie's Angels", video: '/media/charlies-angels.mp4', rate: 1.5, img: CDN + '6811f08989345b3409601f8b_Charlies_angels.avif', href: 'https://www.charlies-angels-rescue.org/' },
    anapana: { name: 'Anapana', img: CDN + '6821a12565a36dfb5f0179c3_Anapana.avif', href: 'https://www.rimbodesigns.com/work/anapana' },
    dieronesie: { name: 'Dieronesie', video: '/media/dieronesie.mp4', rate: 1.5, img: CDN + '68f63e4c1c1c36bdbb3f83d2_V1_dieronesie.avif', href: 'https://www.rimbodesigns.com/work/dieronesie-retreat-festival-ceremony' },
    sandra: { name: 'Sandra Dreisbach', img: CDN + '67e3dbbfbf16c85454d3ebf2_Sandra%205.avif', href: 'https://www.sandradreisbach.com/' },
    course: { name: 'Digital Feng Shui · course', video: '/media/dfs-home.mp4', rate: 1.5, img: '/media/dfs-course-cover.jpg', href: 'https://www.digital-fengshui.com/' },
    echo: { name: 'Echo Creative Agency', video: '/media/echo.mp4', rate: 1.5, img: '/media/echo/echo-preview-a.jpg', href: 'https://echocreativeagency.nl/' },
    tinko: { name: 'Meet Tinko', video: '/media/tinko.mp4', rate: 1.5, img: '/media/tinko-cover.jpg', href: 'https://www.digital-fengshui.com/tinko' }
  };
  // ---- which projects, in which order: the ranking tool (/rank, prototype/v2/rank.html) saves
  // { order, hidden } in localStorage; without it the default order applies. The rows move against
  // each other (Rimbo missed that when it was gone), so a project lives on ONE row only: ranks
  // 1, 3, 5 ... on the upper row, 2, 4, 6 ... on the lower one, and with an even count the last one
  // goes up as well: the upper row is the far one, more of it is on screen, so that is where a short
  // loop shows the same project twice (Rimbo saw it there). Along a row a project repeats at a fixed
  // distance (the loop), never next to its own copy.
  var DEFAULT_ORDER = ['echo', 'dfs', 'innergym', 'charlies', 'dieronesie', 'course', 'sandra', 'anapana', 'nathan', 'tinko'];
  var rank = null;
  try { rank = JSON.parse(localStorage.getItem('v2-rank') || 'null'); } catch (e) {}
  var order = ((rank && rank.order) || DEFAULT_ORDER).filter(function (k) { return W[k]; });
  DEFAULT_ORDER.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); }); // new projects go last
  var hidden = (rank && rank.hidden) || [];
  var visible = order.filter(function (k) { return hidden.indexOf(k) < 0; });
  if (visible.length < 2) visible = DEFAULT_ORDER.slice();
  var keysA = [], keysB = [];
  visible.forEach(function (k, i) { (i % 2 === 0 || (i === visible.length - 1 && visible.length % 2 === 0) ? keysA : keysB).push(k); });
  var rowA = keysA.map(function (k) { return W[k]; }), rowB = keysB.map(function (k) { return W[k]; });
  // the marquee needs more content than the band is wide (250vw, 340vw on phones): copies per row
  function copies(len) { return len >= 6 ? 1 : (len >= 4 ? 2 : 3); }
  window.v2Band = { order: visible, rowA: keysA, rowB: keysB }; // read-only peek for debugging

  function panel(w, coverOnly) {
    var media = (w.video && !coverOnly)
      ? '<video class="v2-panel_media" muted loop playsinline autoplay preload="auto" draggable="false" src="' + w.video + '" poster="' + w.img + '" data-rate="' + (w.rate || 1.5) + '"></video>'
      : '<img class="v2-panel_media" src="' + w.img + '" alt="" loading="eager" draggable="false">';
    // not a link: the band is there to look at, the page below is where people should go
    return '<div class="v2-panel" aria-label="' + w.name + '">' + media + '<span class="v2-panel_label">' + w.name + '</span></div>';
  }
  function row(items, direction, speed, cls, dup) {
    return '<div class="v2-row ' + (cls || '') + '" data-marquee-scroll-direction-target data-marquee-speed="' + speed + '" data-marquee-direction="' + direction + '" data-marquee-duplicate="' + (dup || 1) + '" data-marquee-scroll-speed="0">' +
      '<div class="v2-row_scroll" data-marquee-scroll-target><div class="v2-row_list" data-marquee-collection-target>' + items.join('') + '</div></div></div>';
  }
  // the names, written along the top edge of the band ("text in the angle of the shape")
  var names = visible.map(function (k) { return '<span class="v2-edge_name">' + W[k].name + '</span>'; });

  // button styles to compare: ?buttons=a (ghost), b (solid + glow), c (text + line), d (coral outline)
  var buttonVariant = (/[?&]buttons=([a-d])/.exec(location.search) || [])[1] || 'b';

  var hero = document.createElement('section');
  hero.className = 'v2-hero';
  hero.innerHTML =
    '<div class="v2-hero_stage" aria-hidden="true"><div class="v2-band">' +
      row(names, 'left', 55, 'v2-band_edge') +
      row(rowA.map(function (w) { return panel(w, noClips); }), 'left', 18 * rowA.length, '', copies(rowA.length)) +
      row(rowB.map(function (w) { return panel(w, noClips); }), 'right', 19 * rowB.length, '', copies(rowB.length)) +
    '</div><div class="v2-edgeblur"></div></div>' +
    '<div class="v2-scroll" aria-hidden="true"><span class="v2-scroll_line"><i></i></span><span class="v2-scroll_t">Scroll</span></div>' +
    '<div class="v2-hero_copy">' +
      '<span class="v2-eyebrow">Branding <i>·</i> Design <i>·</i> Development</span>' +
      '<h1 class="v2-title">Unlock your<br>next level</h1>' +
      '<div class="v2-links is-' + buttonVariant + '"><a class="v2-btn" href="https://cal.com/rimbo-designs/45-minute-discovery-call" target="_blank" rel="noopener"><span class="v2-btn_t">Book a call</span><span class="v2-btn_a">→</span></a><a class="v2-btn is-second" href="https://www.rimbodesigns.com/work"><span class="v2-btn_t">See the work</span><span class="v2-btn_a">→</span></a></div>' +
    '</div>' +
    // the loader sits over the hero while the clips get going (bottom-left, where the scroll line takes over)
    (noLoader ? '' : '<div class="v2-loader" aria-hidden="true"><div class="v2-loader_box"><span class="v2-loader_t"><span class="v2-loader_w">Loading the work</span><span class="v2-loader_n">00</span></span><span class="v2-loader_bar"><i></i></span></div></div>');
  main.insertAdjacentElement('afterbegin', hero);

  // scroll room after it, for whatever comes next
  var space = document.createElement('div');
  space.className = 'proto-space'; space.id = 'v2-next';
  hero.insertAdjacentElement('afterend', space);

  var stage = hero.querySelector('.v2-hero_stage');
  var band = hero.querySelector('.v2-band');

  // ---- the band tilts with the pointer (one flat layer, so this is one transform a frame)
  if (band && !noTilt && window.matchMedia('(pointer: fine)').matches) {
    var tx = 0, tz = 0, gx = 0, gz = 0, raf = null;
    var settle = function () {
      tx += (gx - tx) * 0.05; tz += (gz - tz) * 0.05;
      band.style.setProperty('--tilt-x', tx.toFixed(3) + 'deg');
      band.style.setProperty('--tilt-z', tz.toFixed(3) + 'deg');
      raf = (Math.abs(gx - tx) > 0.002 || Math.abs(gz - tz) > 0.002) ? requestAnimationFrame(settle) : null;
    };
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      gx = -ny * 10; gz = nx * 7; // ±5° around x, ±3.5° around z ("a bit more extreme" than ±3/±2)
      if (!raf) raf = requestAnimationFrame(settle);
    });
    hero.addEventListener('mouseleave', function () { gx = 0; gz = 0; if (!raf) raf = requestAnimationFrame(settle); });
  }

  // ---- drag the band: the panels "feel so clickable", so the hand is a grab hand and the band
  // follows it. All three rows move with the pointer; a flick keeps going and dies out; while the
  // hand holds the band its own motion eases to a stop, and it picks up again after the release.
  // The rows are the site's Osmo marquees: each is a looping xPercent tween on its lists, found
  // lazily (main.js builds them after this script ran). Moving progress moves the row.
  if (stage && !noDrag) {
    var dragRows = null, axis = null, lastX = 0, lastY = 0, lastT = 0, vel = 0, inertia = null, dragging = false;
    var rowsOf = function () {
      return Array.prototype.map.call(hero.querySelectorAll('.v2-row'), function (r) {
        var list = r.querySelector('[data-marquee-collection-target]');
        var tween = (window.gsap && list) ? gsap.getTweensOf(list).filter(function (t) { return t.duration() > 0; })[0] : null;
        if (tween && r.__base == null) r.__base = tween.timeScale() || 1; // its resting speed (sign = direction)
        return { el: r, tween: tween, width: list ? list.offsetWidth : 0 };
      });
    };
    // how the band's own x axis lies on screen near the pointer: unit vector + band px per screen px,
    // measured between two neighbouring panels (perspective makes the far end move less per px)
    var rowAxis = function (px, py) {
      var list = hero.querySelector('.v2-row:not(.v2-band_edge) .v2-row_list');
      var ps = list ? list.children : [], best = -1, bd = Infinity;
      for (var i = 0; i < ps.length - 1; i++) {
        var c = ps[i].getBoundingClientRect(), d = Math.hypot(c.left + c.width / 2 - px, c.top + c.height / 2 - py);
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) return null;
      var a = ps[best].getBoundingClientRect(), b = ps[best + 1].getBoundingClientRect();
      var vx = (b.left + b.width / 2) - (a.left + a.width / 2), vy = (b.top + b.height / 2) - (a.top + a.height / 2);
      var len = Math.hypot(vx, vy), bandPx = ps[best + 1].offsetLeft - ps[best].offsetLeft;
      return len ? { x: vx / len, y: vy / len, scale: bandPx / len } : null;
    };
    var shift = function (px) { // move every row by px along the band (positive = to the right)
      dragRows.forEach(function (r) {
        if (!r.tween || !r.width) return;
        var p = r.tween.progress() - px / r.width; // progress up = content left
        r.tween.progress(p - Math.floor(p));
      });
    };
    var stop = function () {
      if (!dragging) return;
      dragging = false; hero.classList.remove('is-dragging');
      var v = Math.max(-3, Math.min(3, vel)), prev = performance.now(); // band px per ms
      var step = function (now) {
        var dt = Math.min(50, now - prev); prev = now;
        shift(v * dt); v *= Math.pow(0.95, dt / 16.7);
        inertia = Math.abs(v) > 0.005 ? requestAnimationFrame(step) : null;
      };
      if (inertia) cancelAnimationFrame(inertia);
      inertia = requestAnimationFrame(step);
      dragRows.forEach(function (r) { if (r.tween) gsap.to(r.tween, { timeScale: r.el.__base, duration: 1.6, ease: 'power2.out', overwrite: true }); });
    };
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragRows = rowsOf(); axis = rowAxis(e.clientX, e.clientY);
      if (!axis || !dragRows.some(function (r) { return r.tween; })) return;
      dragging = true; hero.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp; vel = 0;
      if (inertia) { cancelAnimationFrame(inertia); inertia = null; }
      dragRows.forEach(function (r) { if (r.tween) gsap.to(r.tween, { timeScale: 0, duration: 0.4, ease: 'power2.out', overwrite: true }); });
      e.preventDefault();
    });
    stage.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY, dt = e.timeStamp - lastT;
      var along = (dx * axis.x + dy * axis.y) * axis.scale;
      shift(along);
      if (dt > 0) vel = 0.7 * (along / dt) + 0.3 * vel;
      lastX = e.clientX; lastY = e.clientY; lastT = e.timeStamp;
    });
    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);
    stage.addEventListener('lostpointercapture', stop);
  }

  // clip speeds, also for the copies the marquee makes (it clones the row after this script ran).
  // Touch a video only once: re-setting the rate or calling play() on a running one makes it hiccup.
  function tune() {
    hero.querySelectorAll('video').forEach(function (v) {
      if (v.__tuned) return;
      v.__tuned = true;
      var rate = parseFloat(v.getAttribute('data-rate')) || 1.5;
      v.muted = true; v.loop = true; v.playsInline = true;
      var apply = function () { if (v.playbackRate !== rate) v.playbackRate = rate; };
      if (v.readyState >= 1) apply(); else v.addEventListener('loadedmetadata', apply, { once: true });
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }
  tune(); setTimeout(tune, 0); setTimeout(tune, 1500); setTimeout(tune, 4000);

  // ---- the loader: the clips start under a dark cover (that was the lag he saw), a counter and
  // a thin line fill up as the covers and clips get ready, then html.v2-ready brings the band up.
  // Never shorter than 1.3 s (so it reads), never longer than 5 s (a slow clip must not hold the page).
  var ready = function () {
    var el = hero.querySelector('.v2-loader');
    document.documentElement.classList.add('v2-ready');
    if (el) setTimeout(function () { el.remove(); }, 1200);
  };
  if (noLoader) { ready(); }
  else {
    var num = hero.querySelector('.v2-loader_n'), bar = hero.querySelector('.v2-loader_bar i');
    var t0 = performance.now(), shown = 0;
    var readiness = function () { // one unit per distinct cover and clip; a clip is ready once it can play on
      var seen = {}, total = 0, done = 0;
      hero.querySelectorAll('.v2-panel_media').forEach(function (m) {
        var key = m.currentSrc || m.getAttribute('src');
        if (seen[key]) { if (!seen[key].ok) seen[key].ok = (m.tagName === 'VIDEO') ? m.readyState >= 3 : (m.complete && m.naturalWidth > 0); return; }
        seen[key] = { ok: (m.tagName === 'VIDEO') ? m.readyState >= 3 : (m.complete && m.naturalWidth > 0) };
      });
      for (var k in seen) { total++; if (seen[k].ok) done++; }
      return total ? done / total : 1;
    };
    var tick = function () {
      var elapsed = performance.now() - t0;
      var target = Math.max(readiness() * 100, Math.min(90, elapsed / 1300 * 90));
      if (elapsed > 5000) target = 100;
      shown += (target - shown) * 0.09;
      if (target >= 100 && shown > 99.3) shown = 100;
      if (num) num.textContent = (shown < 9.5 ? '0' : '') + Math.round(shown);
      if (bar) bar.style.transform = 'scaleX(' + (shown / 100).toFixed(3) + ')';
      if (shown >= 100) { setTimeout(ready, 350); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
})();
