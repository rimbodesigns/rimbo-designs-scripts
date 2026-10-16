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

  // ---- DIGITAL FENG SHUI as a moving panel: the recorded preview of the site, first in the row
  var list = opening && opening.querySelector('[data-glass-carousel-list]');
  if (list && !list.querySelector('video')) {
    var item = document.createElement('div');
    item.className = 'glass-carousel__item';
    item.setAttribute('data-glass-carousel-item', '');
    item.innerHTML =
      '<video data-glass-carousel-image class="glass-carousel__item-img" muted loop playsinline autoplay preload="auto" src="/media/dfs-home.mp4"></video>' +
      '<div data-glass-carousel-content class="glass-carousel__item-content"><p class="glass-carousel__item-p">Digital Feng Shui</p><p class="glass-carousel__item-p is--faded">Brand · Web · Course</p></div>' +
      '<a href="https://www.rimbodesigns.com/work/digital-feng-shui" class="glass-carousel__item-link">View Digital Feng Shui</a>';
    list.insertBefore(item, list.firstElementChild);
  }

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

  // ---- CURSOR: the site's own cursor pill says what a click does here.
  // On a side panel: "Drag", on the centred one: "View". It reads the carousel's state attributes.
  var cursor = document.querySelector('.cursor');
  var cursorLabel = cursor && cursor.querySelector('p');
  if (opening && cursor && cursorLabel && matchMedia('(hover: hover)').matches) {
    cursor.classList.add('is-proto');
    var updateCursor = function () {
      var pointer = opening.getAttribute('data-glass-carousel-pointer');
      var centre = opening.getAttribute('data-glass-carousel-focus') === 'center';
      if (pointer === 'grabbing') { cursorLabel.textContent = 'Drag'; cursor.style.opacity = '1'; }
      else if (pointer === 'grab') { cursorLabel.textContent = centre ? 'View' : 'Drag'; cursor.style.opacity = '1'; }
      else cursor.style.opacity = '';
    };
    new MutationObserver(updateCursor).observe(opening, { attributes: true, attributeFilter: ['data-glass-carousel-pointer', 'data-glass-carousel-focus'] });
    opening.addEventListener('pointerleave', function () { cursor.style.opacity = ''; });
  }

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
    'Digital Feng Shui': 'Brand · Web · Course'
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

  // ---- STATEMENT: the H1 opens after the carousel, as its own section
  if (opening && !document.querySelector('.proto-statement')) {
    var statement = document.createElement('section');
    statement.className = 'proto-statement';
    statement.innerHTML =
      '<h1 class="proto-statement_title" data-title>Unlock your next level</h1>' +
      '<p class="proto-statement_line" data-paragraph>Branding <span>·</span> Design <span>·</span> Development</p>';
    opening.insertAdjacentElement('afterend', statement);
  }

  // ---- ARCHITECTURE: placeholder blocks after the work carousel. Each one says what the
  // section should do; nothing here is the design yet.
  var plan = [
    {
      n: '03', name: 'Services', title: 'What working with me looks like',
      does: 'Replaces the Service page. In one strip: the three disciplines, how a project runs, and what it costs to start. Nobody has to leave the home page to find out.',
      inside: ['Branding · Design · Development, one line each', 'The four steps: Discover, Brand, Design, Build', 'Starting price or packages, said plainly', 'One button: Start a project'],
      layout: 'steps'
    },
    {
      n: '04', name: 'Proof', title: 'Numbers and names',
      does: 'A short strip that answers "can I trust this person" before the testimonials do.',
      inside: ['20+ success stories', 'Google rating with the review count', 'A row of client marks, small and quiet'],
      layout: 'strip'
    },
    {
      n: '05', name: 'Kind words', title: 'Three voices, the rest on Google',
      does: 'The testimonials from the Service page, three at a time, with the verified Google link.',
      inside: ['Three quotes, name and company', 'Link: all verified Google reviews', 'Later: the ones that match the project someone just looked at'],
      layout: 'cards'
    },
    {
      n: '06', name: 'About', title: 'Your designer',
      does: 'In the spirit of "Your Instructor" on Digital Feng Shui: a portrait, three lines, and the side projects as credibility.',
      inside: ['Portrait in a ring', 'Three short paragraphs: what you do, how you work, where you are', 'Digital Feng Shui and Rhythms as proof you build your own things'],
      layout: 'split'
    },
    {
      n: '07', name: 'Resources', title: 'Notes worth reading',
      does: 'The latest three pieces from the Resources page, so that page is reachable from home without a menu.',
      inside: ['Three cards from the CMS: title, one line, reading time', 'One line for the newsletter', 'Link: all resources'],
      layout: 'cards'
    },
    {
      n: '08', name: 'Start', title: 'Start a project',
      does: 'The contact page, folded in: pick a time right here. This is where "2 spots left" lives now.',
      inside: ['Cal.com calendar, inline', 'Email for people who do not do calendars', 'Spots left this quarter'],
      layout: 'calendar'
    }
  ];

  var skeletons = {
    steps: '<div class="proto-skel is-steps"><i></i><i></i><i></i><i></i></div>',
    strip: '<div class="proto-skel is-strip"><b>20+</b><b>4.9 ★</b><i></i><i></i><i></i><i></i></div>',
    cards: '<div class="proto-skel is-cards"><i></i><i></i><i></i></div>',
    split: '<div class="proto-skel is-split"><u></u><div><i></i><i></i><i></i></div></div>',
    calendar: '<div class="proto-skel is-calendar"><div><i></i><i></i></div><u></u></div>'
  };

  var work = document.querySelector('[data-glass-carousel]');
  if (work && !document.querySelector('.proto-plan')) {
    var tag = document.createElement('div');
    tag.className = 'proto-tag';
    tag.innerHTML = '<span>02 · Work</span> The carousel stays. The way the work is presented gets its own round later.';
    (document.querySelector('.proto-statement') || work).insertAdjacentElement('afterend', tag);

    var outer = document.createElement('div');
    outer.className = 'proto-plan-wrap';
    var wrap = document.createElement('div');
    wrap.className = 'proto-plan';
    var html = '<div class="proto-plan_intro"><span class="proto-label">Plan</span><h2>The home page does the work of Service, Work, Resources and Contact.</h2><p>Each block below is a placeholder: what the section should do, not yet how it looks. We go through them one by one.</p></div>';
    plan.forEach(function (b) {
      html += '<section class="proto-block" data-layout="' + b.layout + '">' +
        '<div class="proto-block_head"><span class="proto-label">' + b.n + ' · ' + b.name + '</span><h3>' + b.title + '</h3><p>' + b.does + '</p></div>' +
        '<ul class="proto-block_list">' + b.inside.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
        skeletons[b.layout] +
        '</section>';
    });
    wrap.innerHTML = html;
    outer.appendChild(wrap);
    tag.insertAdjacentElement('afterend', outer);
  }
})();
