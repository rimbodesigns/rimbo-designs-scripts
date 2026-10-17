// V2 prototype: a new opening, after Rimbo's old Figma direction. The page is the synced staging
// page; this script removes the old hero and the glass carousel and builds the V2 hero instead:
// a band of work sliding by in perspective (a laptop-screen angle), the copy in the top corner,
// a small "see what's possible" in the bottom corner. Runs before main.js, so the site's own
// marquee code drives the rows.
(function () {
  'use strict';

  var main = document.getElementById('MainWrap');
  if (!main || document.querySelector('.v2-hero')) return;

  // ---- out with the old opening
  ['.spacer_hero', '#FadeOUT', '[data-glass-carousel]'].forEach(function (sel) {
    var el = document.querySelector(sel); if (el) el.remove();
  });

  // ---- the work on the band: clips where we have them, covers otherwise
  var CDN = 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/';
  var work = [
    { name: 'Digital Feng Shui', video: '/media/dfs-home-test.mp4', rate: 2, href: 'https://www.digital-fengshui.com/' },
    { name: 'Nathan Rajac', img: CDN + '67e3d914128c8952d1dd6523_Nathan4.avif', href: 'https://www.nathanrajac.com/' },
    { name: "Charlie's Angels", video: '/media/charlies-angels.mp4', rate: 1.5, href: 'https://www.charlies-angels-rescue.org/' },
    { name: 'Anapana', img: CDN + '6821a12565a36dfb5f0179c3_Anapana.avif', href: 'https://www.rimbodesigns.com/work/anapana' },
    { name: 'Dieronesie', video: '/media/dieronesie.mp4', rate: 1.5, href: 'https://www.rimbodesigns.com/work/dieronesie-retreat-festival-ceremony' },
    { name: 'Sandra Dreisbach', img: CDN + '67e3dbbfbf16c85454d3ebf2_Sandra%205.avif', href: 'https://www.sandradreisbach.com/' },
    { name: 'Digital Feng Shui · course', video: '/media/dfs-home.mp4', rate: 1.5, href: 'https://www.digital-fengshui.com/' },
    { name: 'Pooh Balance', img: CDN + '6821a15537f8a86203c318b7_PoohV2.avif', href: 'https://www.rimbodesigns.com/work/pooh-balance' }
  ];

  function panel(w) {
    var media = w.video
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

  var hero = document.createElement('section');
  hero.className = 'v2-hero';
  hero.innerHTML =
    '<div class="v2-hero_stage" aria-hidden="true"><div class="v2-band">' +
      row(names, 'left', 55, 'v2-band_edge') +
      row(work.slice(0, 4).map(panel), 'left', 70) +
      row(work.slice(4, 8).map(panel), 'right', 80) +
    '</div></div>' +
    '<div class="v2-hero_copy">' +
      '<span class="v2-eyebrow">Branding <i>·</i> Design <i>·</i> Development</span>' +
      '<h1 class="v2-title">Unlock your<br>next level</h1>' +
      '<div class="v2-links"><a href="https://cal.com/rimbo-designs/45-minute-discovery-call" target="_blank" rel="noopener">Book a call <span>→</span></a><a href="https://www.rimbodesigns.com/work">See the work <span>→</span></a></div>' +
    '</div>' +
    '<a class="v2-hero_hint" href="#v2-next"><img src="' + CDN + '6346d0e17ad57fc0a45093aa_dingDVG.svg" alt=""><span>See what’s possible</span></a>';
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
