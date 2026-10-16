// Prototype changes on top of the synced staging page. Runs before main.js, so the site
// script animates whatever this leaves in the DOM. Keep every change small and reversible.
(function () {
  'use strict';

  // ---- OPENING: no hero text, the carousel is the first screen (hero and spacer hidden in CSS).
  var opening = document.querySelector('[data-glass-carousel]');
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (opening) {
    opening.setAttribute('data-glass-carousel-height', '0.46');
    opening.setAttribute('data-glass-carousel-intro-delay', '0.4');
  }

  // ---- DIGITAL FENG SHUI as moving panels: the new home (scroll story) first, the course site later
  var list = opening && opening.querySelector('[data-glass-carousel-list]');
  function videoItem(src, name, line, href) {
    var item = document.createElement('div');
    item.className = 'glass-carousel__item';
    item.setAttribute('data-glass-carousel-item', '');
    item.innerHTML =
      '<video data-glass-carousel-image class="glass-carousel__item-img" muted loop playsinline autoplay preload="auto" src="' + src + '"></video>' +
      '<div data-glass-carousel-content class="glass-carousel__item-content"><p class="glass-carousel__item-p">' + name + '</p><p class="glass-carousel__item-p is--faded">' + line + '</p></div>' +
      '<a href="' + href + '" target="_blank" rel="noopener" class="glass-carousel__item-link">Visit ' + name + '</a>';
    return item;
  }
  if (list && !list.querySelector('video')) {
    list.insertBefore(videoItem('/media/dfs-home-test.mp4', 'Digital Feng Shui', 'Brand · Web · Course', 'https://www.digital-fengshui.com/'), list.firstElementChild);
    var items = list.querySelectorAll('[data-glass-carousel-item]');
    list.insertBefore(videoItem('/media/dfs-home.mp4', 'Digital Feng Shui · 2025', 'Course site', 'https://www.digital-fengshui.com/'), items[Math.min(3, items.length - 1)].nextElementSibling);
  }

  // ---- LINKS: straight to the live sites, in a new tab (no case-study stories on the home page)
  var liveSites = {
    'Nathan Rajac': 'https://www.nathanrajac.com/',
    "Charlie's Angels Costa Rica": 'https://www.charlies-angels-rescue.org/',
    'Dieronesie': 'https://www.dieronesie.com/',
    'Sandra Dreisbach': 'https://www.sandradreisbach.com/'
    // Anapana: the shop is offline, its link stays on the case study
  };
  document.querySelectorAll('[data-glass-carousel-item]').forEach(function (item) {
    var name = item.querySelector('[data-glass-carousel-content] p');
    var link = item.querySelector('a');
    if (name && link && liveSites[name.textContent.trim()]) {
      link.href = liveSites[name.textContent.trim()];
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Visit ' + name.textContent.trim();
    }
  });

  // ---- TEST AID: ?nocache makes every cover load over the network again (the cold-cache path)
  if (/[?&]nocache/.test(location.search)) {
    document.querySelectorAll('[data-glass-carousel-item] img').forEach(function (img) {
      var bust = (img.src.indexOf('?') > -1 ? '&' : '?') + 'nocache=' + Date.now();
      img.removeAttribute('srcset'); img.removeAttribute('sizes');
      img.src = img.src + bust;
    });
  }

  // ---- FEWER, BETTER: the older or simpler sites leave the row for now
  ['Muzammil Hussain', 'MushroomTao'].forEach(function (name) {
    document.querySelectorAll('[data-glass-carousel-item]').forEach(function (item) {
      var first = item.querySelector('[data-glass-carousel-content] p');
      if (first && first.textContent.trim() === name) item.remove();
    });
  });

  // ---- CAPTIONS: the name only; the line under it (what was done) shows once you are on the
  // centred panel (data-glass-carousel-focus, see CSS). Short lines, RM Mono caps.
  var lines = {
    'Nathan Rajac': 'Branding · Webflow',
    "Charlie's Angels Costa Rica": 'Branding · Webflow',
    'Anapana': 'Branding · Shopify',
    'Dieronesie': 'Webflow',
    'Muzammil Hussain': 'Branding · Webflow',
    'Sandra Dreisbach': 'Branding · Webflow',
    'MushroomTao': 'Custom CMS · Webflow',
    'Digital Feng Shui': 'Brand · Web · Course',
    'Digital Feng Shui · 2025': 'Course site'
  };
  document.querySelectorAll('[data-glass-carousel-content]').forEach(function (content) {
    var ps = content.querySelectorAll('p');
    var name = ps[0] && ps[0].textContent.trim();
    if (ps[1] && lines[name]) ps[1].textContent = lines[name];
  });

  // ---- NAV TIMING: whatever nav the page would show is held back until the grow-in has finished.
  // A class on <html> keeps it at opacity 0 (see CSS); removing the class lets the page's own
  // rules and interactions take over again (on desktop the fixed logo and burger only come on scroll).
  if (opening && !reduceMotion) {
    document.documentElement.classList.add('proto-nav-wait');
    var navShown = false;
    function showNav() {
      if (navShown) return;
      navShown = true;
      setTimeout(function () { document.documentElement.classList.remove('proto-nav-wait'); }, 500);
    }
    window.addEventListener('glass-carousel:intro-done', showNav, { once: true });
    setTimeout(showNav, 6000); // never leave the page without a nav
  }

  // ---- STATEMENT: the H1 opens after the carousel, peeking into the first screen
  if (opening && !document.querySelector('.proto-statement')) {
    var statement = document.createElement('section');
    statement.className = 'proto-statement';
    statement.innerHTML =
      '<h1 class="proto-statement_title" data-title>Unlock your<br>next level</h1>' +
      '<p class="proto-statement_line" data-paragraph>Branding <span>·</span> Design <span>·</span> Development</p>';
    opening.insertAdjacentElement('afterend', statement);
  }

  // ---- THE REST OF THE PAGE, built for real. Each section is one function so any of them can
  // be kept, moved or thrown away on its own.
  var GOOGLE = 'https://www.google.com/maps/place/Rimbo+Designs/@46.423669,-79.5417226,4z/data=!4m8!3m7!1s0xa776f9ed49735c5f:0x670eecc344d2a298!8m2!3d46.423669!4d-79.5417226!9m1!1b1!16s%2Fg%2F11rq9qpsxs?entry=ttu';
  var sections = [];

  // 1. Names: who the work was for, as a quiet marquee (the site's own marquee code drives it)
  sections.push(function () {
    var names = ['Digital Feng Shui', 'Nathan Rajac', "Charlie's Angels Costa Rica", 'Dieronesie', 'Sandra Dreisbach', 'Anapana', 'theFactor.e', 'Pooh Balance', 'MushroomTao', 'Zen met Madeleine', 'Catherine Hamilton', 'Henry Byrne', 'Psychedelic Passage', 'Tripsitters', 'Muzammil Hussain'];
    var row = names.map(function (n) { return '<span class="proto-names_item">' + n + '</span><span class="proto-names_dot">·</span>'; }).join('');
    return '<section class="proto-names">' +
      '<div class="proto-names_head"><span class="proto-label">Selected clients</span><p>20+ success stories, from one-person practices to platforms. <a href="' + GOOGLE + '" target="_blank" rel="noopener">Verified on Google</a></p></div>' +
      '<div class="proto-names_marquee" data-marquee-scroll-direction-target data-marquee-speed="40" data-marquee-direction="left" data-marquee-duplicate="2" data-marquee-scroll-speed="6">' +
        '<div class="proto-names_scroll" data-marquee-scroll-target><div class="proto-names_list" data-marquee-collection-target>' + row + '</div></div>' +
      '</div>' +
      '</section>';
  });

  // 2. Kind words: four voices, the rest on Google
  sections.push(function () {
    var words = [
      { q: 'Absolutely thrilled with our experience working with Rimbo Designs. Our e-commerce store has never looked better and the results speak for themselves: real-world conversions like never before.', who: 'Marko Bosnjak', role: 'Anapana' },
      { q: "Rimbout created a refreshing and creative website that perfectly fits my company. His branding workshops gave me a lot of clarity in how I want to position myself.", who: 'Madeleine', role: 'Founder, Zen met Madeleine' },
      { q: "I couldn't be happier with the website Rimbo Designs created for my paintings. An elegant touch combined with a playful, seamless flow, and a keen eye for detail.", who: 'Muzammil Hussain', role: 'Painter' },
      { q: 'Never a dull moment with Rimbo on the team. A creative with a great imagination who surprised me with his inquisitive attitude. Curious, analytical, and it shows in his work.', who: 'Marvin Reingoud', role: 'UX Designer, theFactor.e' }
    ];
    return '<section class="proto-words">' +
      '<div class="proto-words_head"><span class="proto-label">Kind words</span><h2 class="proto-h2" data-title>Said by the people<br>I built with</h2></div>' +
      '<div class="proto-words_grid">' + words.map(function (w, i) {
        return '<figure class="proto-words_item" data-component><span class="proto-words_n">0' + (i + 1) + '</span><blockquote>' + w.q + '</blockquote><figcaption>' + w.who + '<span>' + w.role + '</span></figcaption></figure>';
      }).join('') + '</div>' +
      '<p class="proto-foot"><a href="' + GOOGLE + '" target="_blank" rel="noopener">All reviews on Google</a></p>' +
      '</section>';
  });

  // 3. About: the person, in the spirit of "Your Instructor"
  sections.push(function () {
    return '<section class="proto-about" id="about">' +
      '<div class="proto-about_portrait" data-component><img src="https://cdn.prod.website-files.com/67f2341f69b4c6d58de38b9d/69b9c2ae8e5e9cb19fbca33d_Rimbo_image.avif" alt="Rimbout Bobeldijk"></div>' +
      '<div class="proto-about_copy">' +
        '<span class="proto-label">About</span>' +
        '<h2 class="proto-h2" data-title>Rimbout Bobeldijk</h2>' +
        '<p class="proto-about_lead" data-paragraph>I’m a UX designer. My job is obsessing over how a system should feel to use, so that what you ship comes out effortless.</p>' +
        '<p data-paragraph>I’ve done that for brands, web shops, course platforms and my own tools, and I build what I design: in Webflow, in code, and lately in native apps. Based in the Netherlands, working with clients anywhere. One project at a time.</p>' +
        '<div class="proto-about_links"><a href="https://www.linkedin.com/in/rimbout-bobeldijk-9836ba168/" target="_blank" rel="noopener">LinkedIn</a><a href="https://www.instagram.com/rimbodesigns_/" target="_blank" rel="noopener">Instagram</a><a href="https://www.rimbodesigns.com/my-story">My story</a></div>' +
      '</div>' +
      '</section>';
  });

  // 4. Own things: proof that I build, not only design
  sections.push(function () {
    var own = [
      { name: 'Digital Feng Shui', what: 'A course and a method for a calm digital life. Brand, site, course platform, the lot.', meta: 'digital-fengshui.com', href: 'https://www.digital-fengshui.com/' },
      { name: 'Rhythms', what: 'A Mac app that closes what pulls at you, on a rhythm you set. Menu bar, block page, no snooze button.', meta: 'macOS · in the works', href: 'https://www.digital-fengshui.com/' }
    ];
    return '<section class="proto-own">' +
      '<div class="proto-own_head"><span class="proto-label">Own things</span><h2 class="proto-h2" data-title>What I build when<br>nobody asks</h2></div>' +
      '<div class="proto-own_list">' + own.map(function (o, i) {
        return '<a class="proto-own_item" href="' + o.href + '" target="_blank" rel="noopener" data-component><span class="proto-own_n">0' + (i + 1) + '</span><span class="proto-own_name">' + o.name + '</span><span class="proto-own_what">' + o.what + '</span><span class="proto-own_meta">' + o.meta + ' ↗</span></a>';
      }).join('') + '</div>' +
      '</section>';
  });

  // 5. Notes: three from the Resources page
  sections.push(function () {
    var notes = [
      { t: 'Top 50 Best Websites 2025: Get inspired', c: 'UI/UX Design', href: 'https://www.rimbodesigns.com/post/top-50-best-websites-2025' },
      { t: 'Conversion Optimization Trends 2025', c: 'Online Marketing', href: 'https://www.rimbodesigns.com/post/conversion-optimization-trends-2025' },
      { t: 'How to Build a Brand That Stands Out', c: 'Branding', href: 'https://www.rimbodesigns.com/post/how-to-build-a-brand-that-stands-out' }
    ];
    return '<section class="proto-notes">' +
      '<div class="proto-notes_head"><span class="proto-label">Notes</span><h2 class="proto-h2" data-title>Things worth<br>reading</h2></div>' +
      '<div class="proto-notes_list">' + notes.map(function (n) {
        return '<a class="proto-notes_item" href="' + n.href + '" data-component><span class="proto-notes_cat">' + n.c + '</span><span class="proto-notes_title">' + n.t + '</span><span class="proto-notes_arrow">→</span></a>';
      }).join('') + '</div>' +
      '<p class="proto-foot"><a href="https://www.rimbodesigns.com/resources">All resources</a></p>' +
      '</section>';
  });

  // 6. Start: no pitch, one line, two ways in
  sections.push(function () {
    return '<section class="proto-start" id="contact">' +
      '<span class="proto-label"><i class="proto-start_dot"></i> 2 spots left this quarter</span>' +
      '<h2 class="proto-start_title" data-title>Have something<br>in mind?</h2>' +
      '<div class="proto-start_ways">' +
        '<a class="proto-start_way" href="https://cal.com/rimbo-designs/45-minute-discovery-call" target="_blank" rel="noopener"><span class="proto-start_way-k">45 minutes</span><span class="proto-start_way-v">Book a call ↗</span></a>' +
        '<a class="proto-start_way" href="mailto:hello@rimbodesigns.com"><span class="proto-start_way-k">Or write</span><span class="proto-start_way-v">hello@rimbodesigns.com</span></a>' +
      '</div>' +
      '</section>';
  });

  var after = document.querySelector('.proto-statement');
  if (after && !document.querySelector('.proto-rest')) {
    var rest = document.createElement('div');
    rest.className = 'proto-rest';
    rest.innerHTML = sections.map(function (make) { return make(); }).join('');
    after.insertAdjacentElement('afterend', rest);
  }
})();
