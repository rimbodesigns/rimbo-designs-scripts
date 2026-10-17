// V2 prototype: a new opening, after Rimbo's old Figma direction. The page is the synced staging
// page; this script removes the old hero and the glass carousel and builds the V2 hero instead:
// a band of work sliding by in perspective (a laptop-screen angle), the copy in the top corner,
// a small "see what's possible" in the bottom corner. Runs before main.js, so the site's own
// marquee code drives the rows.
(function () {
  'use strict';

  var main = document.getElementById('MainWrap');
  if (!main || document.querySelector('.v2-hero')) return;

  // ---- out with the old opening, and with the pill nav at the top: the burger is the menu now
  ['.spacer_hero', '#FadeOUT', '[data-glass-carousel]', '.topnav'].forEach(function (sel) {
    var el = document.querySelector(sel); if (el) el.remove();
  });

  // ---- the work on the band: clips where we have them, covers otherwise
  var CDN = 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/';
  // every item has a cover; some also have a clip. The front row plays the clips, the back row
  // shows covers only, so the page decodes four videos instead of sixteen.
  var work = [
    { name: 'Innergym', video: '/media/innergym.mp4', rate: 1.5, img: '/media/innergym-cover.jpg', href: 'https://relume-35142b-1c4210f53c5dee0536bbe334f.webflow.io/' },
    { name: 'Digital Feng Shui', video: '/media/dfs-home-test.mp4', rate: 2, img: CDN + '6aa42d7d36f358a8814102d0_PNG%20to%20AVIF%20Cover%20v2.avif', href: 'https://www.digital-fengshui.com/' },
    { name: 'Nathan Rajac', img: CDN + '67e3d914128c8952d1dd6523_Nathan4.avif', href: 'https://www.nathanrajac.com/' },
    { name: "Charlie's Angels", video: '/media/charlies-angels.mp4', rate: 1.5, img: CDN + '6811f08989345b3409601f8b_Charlies_angels.avif', href: 'https://www.charlies-angels-rescue.org/' },
    { name: 'Anapana', img: CDN + '6821a12565a36dfb5f0179c3_Anapana.avif', href: 'https://www.rimbodesigns.com/work/anapana' },
    { name: 'Dieronesie', video: '/media/dieronesie.mp4', rate: 1.5, img: CDN + '68f63e4c1c1c36bdbb3f83d2_V1_dieronesie.avif', href: 'https://www.rimbodesigns.com/work/dieronesie-retreat-festival-ceremony' },
    { name: 'Sandra Dreisbach', img: CDN + '67e3dbbfbf16c85454d3ebf2_Sandra%205.avif', href: 'https://www.sandradreisbach.com/' },
    { name: 'Digital Feng Shui · course', video: '/media/dfs-home.mp4', rate: 1.5, img: CDN + '6aa42d7d36f358a8814102d0_PNG%20to%20AVIF%20Cover%20v2.avif', href: 'https://www.digital-fengshui.com/' },
    { name: 'Pooh Balance', img: CDN + '6821a15537f8a86203c318b7_PoohV2.avif', href: 'https://www.rimbodesigns.com/work/pooh-balance' }
  ];

  function panel(w, coverOnly) {
    var media = (w.video && !coverOnly)
      ? '<video class="v2-panel_media" muted loop playsinline autoplay preload="auto" src="' + w.video + '" data-rate="' + (w.rate || 1.5) + '"></video>'
      : '<img class="v2-panel_media" src="' + w.img + '" alt="" loading="eager">';
    return '<a class="v2-panel" href="' + w.href + '" target="_blank" rel="noopener" aria-label="' + w.name + '">' + media + '<span class="v2-panel_label">' + w.name + '</span></a>';
  }
  function row(items, direction, speed, cls) {
    return '<div class="v2-row ' + (cls || '') + '" data-marquee-scroll-direction-target data-marquee-speed="' + speed + '" data-marquee-direction="' + direction + '" data-marquee-duplicate="1" data-marquee-scroll-speed="0">' +
      '<div class="v2-row_scroll" data-marquee-scroll-target><div class="v2-row_list" data-marquee-collection-target>' + items.join('') + '</div></div></div>';
  }
  // the names, written along the top edge of the band ("text in the angle of the shape")
  var names = work.map(function (w) { return '<span class="v2-edge_name">' + w.name + '</span>'; });

  // button styles to compare: ?buttons=a (ghost pill), b (solid), c (text + line), d (coral outline)
  var buttonVariant = (/[?&]buttons=([a-d])/.exec(location.search) || [])[1] || 'b';

  var hero = document.createElement('section');
  hero.className = 'v2-hero';
  hero.innerHTML =
    '<div class="v2-hero_stage" aria-hidden="true"><div class="v2-band">' +
      row(names, 'left', 55, 'v2-band_edge') +
      row(work.map(function (w) { return panel(w, false); }), 'left', 90) +
      row(work.slice(4).concat(work.slice(0, 4)).map(function (w) { return panel(w, true); }), 'right', 100) +
    '</div></div>' +
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

  // clip speeds, also for the copies the marquee makes (it clones the row after this script ran)
  function tune() {
    hero.querySelectorAll('video').forEach(function (v) {
      var rate = parseFloat(v.getAttribute('data-rate')) || 1.5;
      v.muted = true; v.loop = true; v.playsInline = true;
      v.playbackRate = rate;
      if (!v.__tuned) { v.__tuned = true; v.addEventListener('loadedmetadata', function () { v.playbackRate = rate; }, { once: true }); }
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }
  tune(); setTimeout(tune, 0); setTimeout(tune, 1500); setTimeout(tune, 4000);
})();
