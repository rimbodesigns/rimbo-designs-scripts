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

  // ---- the work on the band. Two rows with different projects, so nothing shows twice; clips
  // (scroll-throughs of the live sites) in both rows, covers for the rest. Every clip has its
  // cover as poster, so a panel is never black while a clip loads.
  var CDN = 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/';
  var SITE = 'https://www.rimbodesigns.com/work/';
  var DFS_COVER = CDN + '6aa42d7d36f358a8814102d0_PNG%20to%20AVIF%20Cover%20v2.avif';
  // upper row, moves left
  var rowA = [
    { name: 'Innergym', video: '/media/innergym.mp4', rate: 1.5, img: '/media/innergym-cover.jpg', href: 'https://relume-35142b-1c4210f53c5dee0536bbe334f.webflow.io/' },
    { name: 'Nathan Rajac', video: '/media/nathan.mp4', rate: 1.5, img: CDN + '67e3d914128c8952d1dd6523_Nathan4.avif', href: 'https://www.nathanrajac.com/' },
    { name: 'Anapana', img: CDN + '6821a12565a36dfb5f0179c3_Anapana.avif', href: SITE + 'anapana' },
    { name: "Charlie's Angels", video: '/media/charlies-angels.mp4', rate: 1.5, img: CDN + '6811f08989345b3409601f8b_Charlies_angels.avif', href: 'https://www.charlies-angels-rescue.org/' },
    { name: 'Henry Byrne', img: CDN + '68b6c1384718b6d16ab9b8ef_HenriTEST.avif', href: 'https://www.henrybyrne.com/' },
    { name: 'Pooh Balance', video: '/media/pooh-balance.mp4', rate: 1.5, img: CDN + '6821a15537f8a86203c318b7_PoohV2.avif', href: 'https://www.poohbalance.nl/' },
    { name: 'Psychedelic Passage', img: CDN + '64e130a9e5ca48456f60ff2a_PP2.avif', href: SITE + 'psychedelic-passage' },
    { name: 'Digital Feng Shui · course', img: DFS_COVER, href: 'https://www.digital-fengshui.com/' }
  ];
  // lower row, moves right
  var rowB = [
    { name: 'Digital Feng Shui', video: '/media/dfs-home-test.mp4', rate: 2, img: DFS_COVER, href: 'https://www.digital-fengshui.com/' },
    { name: 'theFactor.e', img: CDN + '677ed78b8af70720ad69054f_TFE2.avif', href: SITE + 'case-study-thefactor-e' },
    { name: 'Sandra Dreisbach', video: '/media/sandra.mp4', rate: 1.5, img: CDN + '67e3dbbfbf16c85454d3ebf2_Sandra%205.avif', href: 'https://www.sandradreisbach.com/' },
    { name: 'Tripsitters', img: CDN + '6637ae25ff58ba25de769e3d_Trip_new_overview.webp', href: SITE + 'grow-guide-tripsitters' },
    { name: 'Dieronesie', video: '/media/dieronesie.mp4', rate: 1.5, img: CDN + '68f63e4c1c1c36bdbb3f83d2_V1_dieronesie.avif', href: SITE + 'dieronesie-retreat-festival-ceremony' },
    { name: 'Catherine Hamilton', img: CDN + '677ed7268af70720ad6897be_Catherine_%40.avif', href: SITE + 'catherine-hamilton' },
    { name: 'Zen met Madeleine', img: CDN + '6661ae69b5ed54891bf88a2e_test2.webp', href: 'https://www.zenmetmadeleine.nl/' }
  ];

  function panel(w, coverOnly) {
    var media = (w.video && !coverOnly)
      ? '<video class="v2-panel_media" muted loop playsinline autoplay preload="auto" src="' + w.video + '" poster="' + w.img + '" data-rate="' + (w.rate || 1.5) + '"></video>'
      : '<img class="v2-panel_media" src="' + w.img + '" alt="" loading="eager">';
    return '<a class="v2-panel" href="' + w.href + '" target="_blank" rel="noopener" aria-label="' + w.name + '">' + media + '<span class="v2-panel_label">' + w.name + '</span></a>';
  }
  function row(items, direction, speed, cls) {
    return '<div class="v2-row ' + (cls || '') + '" data-marquee-scroll-direction-target data-marquee-speed="' + speed + '" data-marquee-direction="' + direction + '" data-marquee-duplicate="1" data-marquee-scroll-speed="0">' +
      '<div class="v2-row_scroll" data-marquee-scroll-target><div class="v2-row_list" data-marquee-collection-target>' + items.join('') + '</div></div></div>';
  }
  // the names, written along the top edge of the band ("text in the angle of the shape")
  var names = rowA.concat(rowB).map(function (w) { return '<span class="v2-edge_name">' + w.name + '</span>'; });

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
      row(rowA.map(function (w) { return panel(w, noClips); }), 'left', 90) +
      row(rowB.map(function (w) { return panel(w, noClips); }), 'right', 95) +
    '</div><div class="v2-edgeblur"></div></div>' +
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
      gx = -ny * 3; gz = nx * 2; // ±1.5° around x, ±1° around z
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
