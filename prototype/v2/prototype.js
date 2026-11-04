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

  // ---- the work on the band: only the ten projects Rimbo approved (older work stays out).
  // The six clips are spread over both rows so both rows move; the rest show covers. A project
  // appears once per row, with its clip in one row and its cover in the other where it has a clip.
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
    pooh: { name: 'Pooh Balance', img: CDN + '6821a15537f8a86203c318b7_PoohV2.avif', href: 'https://www.rimbodesigns.com/work/pooh-balance' },
    echo: { name: 'Echo Creative Agency', video: '/media/echo.mp4', rate: 1.5, img: '/media/echo/echo-preview-a.jpg', href: 'https://echocreativeagency.nl/' }
  };
  function cover(w) { return { name: w.name, img: w.img, href: w.href }; }
  // ---- which projects, in which order: the ranking tool (/rank, prototype/v2/rank.html) saves
  // { order, hidden } in localStorage; without it the default order applies. The rows move against
  // each other (Rimbo missed that when it was gone), so a project lives on ONE row only: ranks
  // 1, 3, 5 ... on the upper row, 2, 4, 6 ... on the lower one. Along a row it repeats at a fixed
  // distance (the loop), so a project never sits next to its own copy.
  var DEFAULT_ORDER = ['echo', 'dfs', 'innergym', 'charlies', 'dieronesie', 'course', 'sandra', 'anapana', 'nathan', 'pooh'];
  var rank = null;
  try { rank = JSON.parse(localStorage.getItem('v2-rank') || 'null'); } catch (e) {}
  var order = ((rank && rank.order) || DEFAULT_ORDER).filter(function (k) { return W[k]; });
  DEFAULT_ORDER.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); }); // new projects go last
  var hidden = (rank && rank.hidden) || [];
  var visible = order.filter(function (k) { return hidden.indexOf(k) < 0; });
  if (visible.length < 2) visible = DEFAULT_ORDER.slice();
  var keysA = visible.filter(function (k, i) { return i % 2 === 0; }), keysB = visible.filter(function (k, i) { return i % 2 === 1; });
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
  // test switches: ?noclips (covers only), ?nograin (no grain overlay), ?noblur (no edge blur), ?notilt
  var noClips = /[?&]noclips/.test(location.search);
  if (/[?&]nograin/.test(location.search)) document.documentElement.classList.add('v2-nograin');
  if (/[?&]noblur/.test(location.search)) document.documentElement.classList.add('v2-noblur');
  var noTilt = /[?&]notilt/.test(location.search);

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
    '</div>';
  main.insertAdjacentElement('afterbegin', hero);

  // scroll room after it, for whatever comes next
  var space = document.createElement('div');
  space.className = 'proto-space'; space.id = 'v2-next';
  hero.insertAdjacentElement('afterend', space);

  // ---- the band tilts a touch with the pointer (one flat layer, so this is one transform a frame)
  var band = hero.querySelector('.v2-band');
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
      gx = -ny * 6; gz = nx * 4; // ±3° around x, ±2° around z
      if (!raf) raf = requestAnimationFrame(settle);
    });
    hero.addEventListener('mouseleave', function () { gx = 0; gz = 0; if (!raf) raf = requestAnimationFrame(settle); });
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
})();
