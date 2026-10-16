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

  // ---- BELOW THE OPENING: nothing yet. We build it one component at a time. For now, scroll room.
  if (opening && !document.querySelector('.proto-space')) {
    var space = document.createElement('div');
    space.className = 'proto-space';
    opening.insertAdjacentElement('afterend', space);
  }
})();
