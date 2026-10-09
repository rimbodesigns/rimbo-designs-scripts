/* =========================================================
   Rimbo Designs — site JavaScript (rimbodesigns.com)
   Loaded once, site-wide, from Site settings → Footer, below GSAP,
   ScrollTrigger, SplitText and Lenis (no defer):
   <script src="https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@vX.Y.Z/main.min.js"></script>
   (jsDelivr builds main.min.js from this file automatically)

   One section per page or feature, each in its own function so names
   can't clash. The router at the bottom decides what runs where.
   ========================================================= */

(function () {
  'use strict';

  // =========================================================
  // SETTINGS
  // =========================================================

  var LENIS_OPTIONS = {
    lerp: 0.1,
    wheelMultiplier: 0.7,
    gestureOrientation: 'vertical',
    normalizeWheel: false,
    smoothTouch: false
  };

  // Classes the SplitText pieces get (the site CSS masks .lines-js)
  var SPLIT_OPTIONS = {
    type: 'lines,words,chars',
    linesClass: 'lines-js',
    wordsClass: 'word-js',
    charsClass: 'char-js'
  };

  // The hero title reveal most pages share: letters rise out of their line mask
  function heroCharsIn(delay) {
    return { delay: delay || 0, duration: 0.8, ease: 'expo.out', yPercent: 100, stagger: 0.03 };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  function byId(id) {
    return document.getElementById(id);
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // Splits an element (or selector) into lines, words and chars.
  // A missing element gives empty lists instead of an error.
  function split(target) {
    var el = typeof target === 'string' ? qs(target) : target;
    return el ? new SplitText(el, SPLIT_OPTIONS) : { lines: [], words: [], chars: [] };
  }

  // Wraps every character of an element in its own <span> with a growing
  // transition delay, so the CSS hover effect ripples through the letters.
  function staggerChars(el) {
    var text = el.textContent;
    el.innerHTML = '';
    Array.from(text).forEach(function (char, i) {
      var span = document.createElement('span');
      span.textContent = char;
      span.style.transitionDelay = (i * 0.01) + 's';
      if (char === ' ') span.style.whiteSpace = 'pre'; // keep the space's width
      el.appendChild(span);
    });
  }

  // =========================================================
  // GLOBAL — every page (was Slater 35206 GLOBAL.js)
  // =========================================================
  function rdGlobal() {
    initNav();
    qsa('[data-button-animate-chars]').forEach(staggerChars);
    initScrollReveals();
    initMarquees();
    initCursor();
  }

  // Top nav drops in on load. On desktop the fixed nav slides down as #Top_Nav scrolls away.
  function initNav() {
    var navItems = qsa('#Container_topNAv > *');
    if (navItems.length) {
      gsap.from(navItems, {
        y: -50,
        opacity: 0,
        filter: 'blur(10px)',
        duration: 1,
        ease: 'expo.out',
        stagger: { amount: 0.3, from: 'center' }
      });
    }

    var topNav = byId('Top_Nav');
    var fixedNav = byId('FIXED_NAV');
    if (!topNav || !fixedNav) return;

    // matchMedia reverts the set and the tween (with its ScrollTrigger) by itself
    // when the window drops below 992px. The old cleanup function killed EVERY
    // ScrollTrigger on the page instead, which froze all scroll animations after a resize.
    gsap.matchMedia().add('(min-width: 992px)', function () {
      gsap.set(fixedNav, { y: -64 });
      gsap.to(fixedNav, {
        y: 0,
        scrollTrigger: { trigger: topNav, start: 'top top', end: 'top -300', scrub: true }
      });
    });
  }

  // Scroll-scrubbed reveals: [data-title], [data-paragraph] (line by line) and [data-component]
  function initScrollReveals() {
    function reveal(targets, trigger, end, vars) {
      vars.ease = 'expo.out';
      vars.scrollTrigger = { trigger: trigger, start: 'top 133%', end: end, scrub: true };
      return gsap.from(targets, vars);
    }

    qsa('[data-title]').forEach(function (title) {
      reveal(title, title, 'bottom 80%', { y: 50, opacity: 0, scale: 0.95, filter: 'blur(3px)' });
    });

    qsa('[data-paragraph]').forEach(function (paragraph) {
      // autoSplit re-splits the lines when the width changes and rebuilds the returned tween
      new SplitText(paragraph, {
        type: 'lines',
        autoSplit: true,
        onSplit: function (self) {
          return reveal(self.lines, paragraph, 'bottom 100%', {
            y: 50, opacity: 0, scale: 0.95, filter: 'blur(3px)', stagger: 0.1
          });
        }
      });
    });

    qsa('[data-component]').forEach(function (component) {
      reveal(component, component, 'bottom 80%', { y: 50, opacity: 0, scale: 0.98, filter: 'blur(2px)' });
    });
  }

  // Osmo marquee: [data-marquee-scroll-direction-target] with data-marquee-speed,
  // -direction, -duplicate and -scroll-speed. Every marquee flips when the scroll direction does.
  function initMarquees() {
    var marquees = [];

    qsa('[data-marquee-scroll-direction-target]').forEach(function (marquee) {
      var content = qs('[data-marquee-collection-target]', marquee);
      var scroll = qs('[data-marquee-scroll-target]', marquee);
      if (!content || !scroll) return;

      var direction = marquee.dataset.marqueeDirection === 'right' ? 1 : -1;
      var duplicates = parseInt(marquee.dataset.marqueeDuplicate, 10) || 0;
      var scrollSpeed = parseFloat(marquee.dataset.marqueeScrollSpeed);
      var speedMultiplier = window.innerWidth < 479 ? 0.25 : window.innerWidth < 991 ? 0.5 : 1;
      var duration = parseFloat(marquee.dataset.marqueeSpeed) *
        (content.offsetWidth / window.innerWidth) * speedMultiplier;

      // Room for the scroll-driven shift on both sides
      scroll.style.marginLeft = (scrollSpeed * -1) + '%';
      scroll.style.width = (scrollSpeed * 2 + 100) + '%';

      if (duplicates > 0) {
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < duplicates; i++) fragment.appendChild(content.cloneNode(true));
        scroll.appendChild(fragment);
      }

      var items = qsa('[data-marquee-collection-target]', marquee);
      var animation = gsap.to(items, { xPercent: -100, repeat: -1, duration: duration, ease: 'linear' })
        .totalProgress(0.5);

      gsap.set(items, { xPercent: direction === 1 ? 100 : -100 });
      animation.timeScale(direction);
      animation.play();
      marquee.setAttribute('data-marquee-status', 'normal');
      marquees.push({ el: marquee, animation: animation, direction: direction });

      // Extra shift while the marquee scrolls through the viewport
      var shiftStart = direction === -1 ? scrollSpeed : -scrollSpeed;
      gsap.timeline({
        scrollTrigger: { trigger: marquee, start: '0% 100%', end: '100% 0%', scrub: 0 }
      }).fromTo(scroll, { x: shiftStart + 'vw' }, { x: -shiftStart + 'vw', ease: 'none' });
    });

    if (!marquees.length) return;

    // One watcher so every marquee flips at the same moment
    var lastDirection = 0;
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        if (self.direction === lastDirection) return;
        lastDirection = self.direction;
        var inverted = self.direction === 1; // scrolling down
        marquees.forEach(function (m) {
          m.animation.timeScale(inverted ? -m.direction : m.direction);
          m.el.setAttribute('data-marquee-status', inverted ? 'inverted' : 'normal');
        });
      }
    });
  }

  // Custom cursor: .cursor follows the pointer and shows the [data-cursor] text of what's hovered
  function initCursor() {
    var cursor = qs('.cursor');
    var label = cursor && qs('p', cursor);
    if (!cursor || !label) return;

    var xOffset = 6;   // default: a little right of the pointer…
    var yOffset = 80;  // …and below it
    var lastXPercent = xOffset;
    var lastYPercent = yOffset;
    var lastText = '';

    gsap.set(cursor, { xPercent: xOffset, yPercent: yOffset });
    var xTo = gsap.quickTo(cursor, 'x', { ease: 'power3' });
    var yTo = gsap.quickTo(cursor, 'y', { ease: 'power3' });

    window.addEventListener('mousemove', function (e) {
      // Flip to the left near the right edge, and above the pointer near the bottom
      var edge = cursor.offsetWidth + 16;
      var xPercent = e.clientX > window.innerWidth - edge ? -100 : xOffset;
      var yPercent = e.clientY > window.innerHeight * 0.9 ? -30 : yOffset;

      // One flip tween when the side changes (the old code started a new
      // 0.9s tween on every single mousemove)
      if (xPercent !== lastXPercent || yPercent !== lastYPercent) {
        lastXPercent = xPercent;
        lastYPercent = yPercent;
        gsap.to(cursor, { xPercent: xPercent, yPercent: yPercent, duration: 0.9, ease: 'power3', overwrite: 'auto' });
      }
      xTo(e.clientX);
      yTo(e.clientY);
    });

    qsa('[data-cursor]').forEach(function (target) {
      target.addEventListener('mouseenter', function () {
        var text = target.getAttribute('data-cursor');
        if (text === lastText) return;
        label.innerHTML = text;
        lastText = text;
      });
    });
  }

  // =========================================================
  // FORM VALIDATION — every form inside [data-form-validate] (was Slater 39499 FORM CODE.js)
  // Osmo pattern: each [data-validate] group gets is--filled / is--success / is--error,
  // errors only show once the visitor has started on that field.
  // =========================================================
  function rdFormValidation() {
    qsa('[data-form-validate]').forEach(function (container) {
      var form = qs('form', container);
      var submitWrap = form && qs('[data-submit]', form);
      var realSubmit = submitWrap && qs('input[type="submit"]', submitWrap);
      if (!realSubmit) return;

      var groups = qsa('[data-validate]', form);
      var loadedAt = Date.now();

      function isPlaceholder(value) {
        return value === '' || value === 'disabled' || value === 'null' || value === 'false';
      }

      // Placeholder options can't be picked
      groups.forEach(function (group) {
        qsa('select option', group).forEach(function (option) {
          if (isPlaceholder(option.value)) option.disabled = true;
        });
      });

      function checkInputs(group) {
        return qsa('input[type="radio"], input[type="checkbox"]', group);
      }

      function isValid(group) {
        var checkGroup = qs('[data-radiocheck-group]', group);
        if (checkGroup) {
          var inputs = checkInputs(checkGroup);
          if (!inputs.length) return false;
          var checked = qsa('input:checked', checkGroup).length;
          var min = parseInt(checkGroup.getAttribute('min'), 10) || 1;
          var max = parseInt(checkGroup.getAttribute('max'), 10) || inputs.length;
          if (inputs[0].type === 'radio') return checked >= 1;
          if (inputs.length === 1) return inputs[0].checked;
          return checked >= min && checked <= max;
        }

        var input = qs('input, textarea, select', group);
        if (!input) return false;
        var value = input.value.trim();
        if (input.tagName === 'SELECT') return !isPlaceholder(value);
        if (input.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        var min = parseInt(input.getAttribute('min'), 10) || 0;
        var max = parseInt(input.getAttribute('max'), 10) || Infinity;
        if (input.hasAttribute('min') && value.length < min) return false;
        if (input.hasAttribute('max') && value.length > max) return false;
        return true;
      }

      function updateStatus(group) {
        var checkGroup = qs('[data-radiocheck-group]', group);
        var filled, started;
        if (checkGroup) {
          filled = qsa('input:checked', checkGroup).length > 0;
          started = checkInputs(checkGroup).some(function (input) { return input.__validationStarted; });
        } else {
          var input = qs('input, textarea, select', group);
          if (!input) return;
          filled = input.value.trim() !== '';
          started = input.__validationStarted;
        }
        var valid = isValid(group);
        group.classList.toggle('is--filled', filled);
        group.classList.toggle('is--success', valid);
        group.classList.toggle('is--error', !valid && !!started);
      }

      // Live validation starts once a field has been filled in properly (or blurred)
      groups.forEach(function (group) {
        var checkGroup = qs('[data-radiocheck-group]', group);
        if (checkGroup) {
          checkInputs(checkGroup).forEach(function (input) {
            input.__validationStarted = false;
            input.addEventListener('change', function () {
              requestAnimationFrame(function () {
                var min = parseInt(checkGroup.getAttribute('min'), 10) || 1;
                if (qsa('input:checked', checkGroup).length >= min) input.__validationStarted = true;
                if (input.__validationStarted) updateStatus(group);
              });
            });
            input.addEventListener('blur', function () {
              input.__validationStarted = true;
              updateStatus(group);
            });
          });
          return;
        }

        var input = qs('input, textarea, select', group);
        if (!input) return;
        input.__validationStarted = false;

        if (input.tagName === 'SELECT') {
          input.addEventListener('change', function () {
            input.__validationStarted = true;
            updateStatus(group);
          });
          return;
        }

        input.addEventListener('input', function () {
          if (!input.__validationStarted) {
            var length = input.value.trim().length;
            var min = parseInt(input.getAttribute('min'), 10) || 0;
            var max = parseInt(input.getAttribute('max'), 10) || Infinity;
            if (input.type === 'email') {
              if (isValid(group)) input.__validationStarted = true;
            } else if ((input.hasAttribute('min') && length >= min) ||
              (input.hasAttribute('max') && length <= max)) {
              input.__validationStarted = true;
            }
          }
          if (input.__validationStarted) updateStatus(group);
        });
        input.addEventListener('blur', function () {
          input.__validationStarted = true;
          updateStatus(group);
        });
      });

      // Marks every field as started, shows all errors, focuses the first one
      function validateAll() {
        var firstInvalid = null;
        groups.forEach(function (group) {
          var checkGroup = qs('[data-radiocheck-group]', group);
          var input = qs('input, textarea, select', group);
          if (!input && !checkGroup) return;
          if (input) input.__validationStarted = true;
          if (checkGroup) {
            checkInputs(checkGroup).forEach(function (i) { i.__validationStarted = true; });
          }
          updateStatus(group);
          if (!isValid(group) && !firstInvalid) firstInvalid = input || qs('input', checkGroup);
        });
        if (firstInvalid) firstInvalid.focus();
        return !firstInvalid;
      }

      function trySubmit() {
        if (!validateAll()) return;
        if (Date.now() - loadedAt < 5000) { // bots fill forms faster than people
          alert('Form submitted too quickly. Please try again.');
          return;
        }
        realSubmit.click();
      }

      submitWrap.addEventListener('click', trySubmit);
      form.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return;
        event.preventDefault();
        trySubmit();
      });
    });
  }

  // =========================================================
  // MENU — every page: the burger menu's links rise in letter by letter,
  // like the hero titles. The Webflow interaction keeps doing the fade and
  // the burger animation; this only adds the letters.
  // =========================================================
  function rdMenu() {
    var nav = qs('.nav');
    var links = qsa('.pop-up_nav_menu .nav_link');
    if (!nav || !links.length) return;

    var chars = [];
    links.forEach(function (link) {
      var pieces = split(link);
      gsap.set(pieces.lines, { overflow: 'hidden' }); // the line masks the letters while they rise
      chars = chars.concat(pieces.chars);
    });
    gsap.set(chars, { yPercent: 110 });

    function reveal() {
      gsap.fromTo(chars, { yPercent: 110 }, {
        yPercent: 0,
        duration: 0.9,
        ease: 'expo.out',
        stagger: 0.02,
        delay: 0.15,
        overwrite: true
      });
    }

    // The interaction switches .nav from display:none to flex once the burger
    // has animated; that moment is the cue to start.
    var open = false;
    new MutationObserver(function () {
      var visible = getComputedStyle(nav).display !== 'none';
      if (visible && !open) reveal();
      open = visible;
    }).observe(nav, { attributes: true, attributeFilter: ['style'] });
  }

  // =========================================================
  // LENIS — smooth scroll on every page (was the inline block in the Webflow footer)
  // =========================================================
  function rdLenis() {
    if (typeof Lenis === 'undefined') return;                            // library not loaded
    if (window.Webflow && Webflow.env('editor') !== undefined) return;   // never inside the Webflow editor

    // Until the old "LENIS SCROLL JS" block is deleted from the Webflow footer it
    // still creates `lenis` and wires the buttons below, so then we only reuse it.
    var instance = typeof lenis !== 'undefined' && lenis ? lenis : null;
    var ownInstance = !instance;

    if (ownInstance) {
      instance = new Lenis(LENIS_OPTIONS);
      // Drive Lenis from GSAP's ticker so scrolling and animations share one frame
      // (GSAP's lag smoothing stays on: after a stall, animations continue instead of jumping)
      instance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { instance.raf(time * 1000); });
    }
    window.lenis = instance;
    if (!ownInstance) return;

    // Buttons that stop and start the page scroll (menus, popups)
    qsa('[data-lenis-start]').forEach(function (el) {
      el.addEventListener('click', function () { instance.start(); });
    });
    qsa('[data-lenis-stop]').forEach(function (el) {
      el.addEventListener('click', function () { instance.stop(); });
    });
    qsa('[data-lenis-toggle]').forEach(function (el) {
      el.addEventListener('click', function () {
        if (el.classList.toggle('stop-scroll')) instance.stop();
        else instance.start();
      });
    });
  }

  // =========================================================
  // HOME — / (was Slater 35211 HOME.js)
  // =========================================================
  function rdHome() {
    // The hero CTA fades out over the first 2% of scroll and leaves the flow
    var fadeOut = byId('FadeOUT');
    if (fadeOut) {
      gsap.to(fadeOut, {
        opacity: 0,
        filter: 'blur(10px)',
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#MainWrap',
          start: 'top top',
          end: '2% top',
          scrub: true,
          onEnterBack: function () { fadeOut.style.display = 'flex'; }
        },
        onComplete: function () { fadeOut.style.display = 'none'; }
      });
    }

    gsap.timeline()
      .from(split('#HeroTitle').chars, { delay: 0.2, duration: 1.6, ease: 'expo.out', yPercent: 200, stagger: 0.04 })
      .from(split('#HeroText').lines, { duration: 0.8, ease: 'expo.out', opacity: 0, yPercent: 40 }, '<50%')
      .from(byId('MotionBtn'), { duration: 0.8, ease: 'expo.out', opacity: 0, yPercent: 20 }, '<44%')
      .from(byId('RED_DOT'), { duration: 0.8, ease: 'expo.out', opacity: 0, filter: 'blur(10px)', yPercent: 20 }, '<12%')
      .from([byId('M1'), byId('M2')].filter(Boolean), { duration: 1.5, ease: 'power2.out', y: '40vh' }, '<40%');

    // The "magic" title letters rise while #TRIGY scrolls through the top of the viewport
    gsap.from(split('#MagicTitle').chars, {
      duration: 1.6,
      ease: 'expo.out',
      yPercent: 200,
      stagger: 0.04,
      scrollTrigger: { trigger: '#TRIGY', start: 'top 20%', end: 'bottom top', scrub: true }
    });
  }

  // =========================================================
  // SERVICE — /service and every /locations/… page (was Slater 35312 SERVICE.js)
  // =========================================================
  function rdService() {
    var tl = gsap.timeline()
      .from(split('#HeroTitle').chars, heroCharsIn(0.33), 'pair')
      .from(byId('DARK_section'), { duration: 1.4, y: '50vh', ease: 'power2.out' }, 'pair')
      .from(byId('First_content'), { y: 50, opacity: 0, scale: 0.95, filter: 'blur(5px)', duration: 1, ease: 'expo.out' })
      .from(split('#Special_text').chars, heroCharsIn(), 'pair2');

    var local = byId('text_local'); // only the /locations/… pages have this line
    if (local) tl.from(local, { duration: 0.8, opacity: 0, ease: 'expo.out' }, 'pair2');

    qsa('[data-tabs="wrapper"]').forEach(initTabs);
  }

  // Osmo tabs: clicking a content item shows its visual; optional autoplay with a progress bar
  function initTabs(wrapper) {
    var contentItems = qsa('[data-tabs="content-item"]', wrapper);
    var visualItems = qsa('[data-tabs="visual-item"]', wrapper);
    var autoplay = wrapper.dataset.tabsAutoplay === 'true';
    var autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration, 10) || 5000;
    if (!contentItems.length) return;

    var activeContent = null;
    var activeVisual = null;
    var isAnimating = false;
    var progressTween = null;

    function startProgressBar(index) {
      if (progressTween) progressTween.kill();
      var bar = qs('[data-tabs="item-progress"]', contentItems[index]);
      if (!bar) return;
      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });
      progressTween = gsap.to(bar, {
        scaleX: 1,
        duration: autoplayDuration / 1000,
        ease: 'power1.inOut',
        onComplete: function () {
          if (!isAnimating) switchTab((index + 1) % contentItems.length);
        }
      });
    }

    function switchTab(index) {
      var incomingContent = contentItems[index];
      if (isAnimating || incomingContent === activeContent) return;
      isAnimating = true;
      if (progressTween) progressTween.kill();

      var outgoingContent = activeContent;
      var outgoingVisual = activeVisual;
      var incomingVisual = visualItems[index];

      var tl = gsap.timeline({
        defaults: { duration: 0.65, ease: 'power3' },
        onComplete: function () {
          activeContent = incomingContent;
          activeVisual = incomingVisual;
          isAnimating = false;
          if (autoplay) startProgressBar(index);
        }
      });

      if (outgoingContent) { // there's no outgoing tab on the first run
        var outgoingBar = qs('[data-tabs="item-progress"]', outgoingContent);
        outgoingContent.classList.remove('active');
        if (outgoingVisual) outgoingVisual.classList.remove('active');
        tl.set(outgoingBar, { transformOrigin: 'right center' })
          .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
          .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
          .to(qs('[data-tabs="item-details"]', outgoingContent), { height: 0 }, 0);
      }

      incomingContent.classList.add('active');
      if (incomingVisual) incomingVisual.classList.add('active');
      tl.fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, { autoAlpha: 1, xPercent: 0 }, 0.3)
        .fromTo(qs('[data-tabs="item-details"]', incomingContent), { height: 0 }, { height: 'auto' }, 0)
        .set(qs('[data-tabs="item-progress"]', incomingContent), { scaleX: 0, transformOrigin: 'left center' }, 0);
    }

    switchTab(0);
    contentItems.forEach(function (item, i) {
      item.addEventListener('click', function () { switchTab(i); });
    });
  }

  // =========================================================
  // WORK — /work (was Slater 35413 WORK.js)
  // =========================================================
  function rdWork() {
    // "See older work": the button fades in on scroll, a click expands #WORK_CONTAINER
    var button = byId('SEE_OLD_WORK');
    var container = byId('WORK_CONTAINER');
    if (button && container) {
      gsap.from(button, {
        duration: 2,
        opacity: 0,
        yPercent: 40,
        ease: 'power3.out',
        scrollTrigger: { trigger: button, start: 'top 133%' }
      });
      button.addEventListener('click', function () {
        gsap.to(container, {
          height: container.scrollHeight,
          duration: 1,
          ease: 'power2.inOut',
          onComplete: function () { container.style.height = 'auto'; }
        });
        gsap.to(button, {
          opacity: 0,
          duration: 0.5,
          ease: 'power1.out',
          onComplete: function () { button.style.display = 'none'; }
        });
      });
    }

    gsap.timeline()
      .from(split('#HeroTitle').chars, heroCharsIn(0.33), 'pair')
      .from(byId('DARK_section'), { duration: 1.2, y: '50vh', ease: 'power2.out' }, 'pair')
      .from(byId('First_content'), { duration: 0.6, opacity: 0, filter: 'blur(5px)' }, '-=0.6')
      .from(byId('work_title'), { duration: 0.8, opacity: 0, ease: 'expo.out', yPercent: 120 }, '-=0.3');

    // Grid items rise in as they scroll into view
    var grid = byId('WORK_GRID');
    if (grid) {
      var items = Array.from(grid.children);
      gsap.set(items, { opacity: 0, yPercent: 40 });
      ScrollTrigger.batch(items, {
        start: 'top 133%',
        onEnter: function (batch) {
          gsap.to(batch, { duration: 2, opacity: 1, yPercent: 0, ease: 'power3.out', stagger: 0.2 });
        }
      });
    }
  }

  // =========================================================
  // CASE STUDY — every /work/… page (was Slater 35499 PortFolioContent.js)
  // =========================================================
  function rdWorkItem() {
    var intro = byId('INTRO');
    if (!intro) return;

    // Not every case study has a button, a text block or a video. A null in a
    // GSAP target list throws, and a missing button must not shift the timing
    // of what follows, so it tweens an empty object instead.
    var button = qs('.btn-icon-link') || {};
    var extras = [qs('.intro_data_work'), qs('.work_video')].filter(Boolean);

    var tl = gsap.timeline()
      .from(split(intro).chars, heroCharsIn(0.33), 'pair')
      .from(qs('.project_content'), { duration: 1.6, y: '50vh', ease: 'power2.out' }, 'pair')
      // The old script had "elastic.out(2, 0.1" without its ")", so GSAP ignored the
      // numbers and played the default elastic. Written out here exactly as it played.
      .from(button, { duration: 2, x: -24, opacity: 0, ease: 'elastic.out(1, 0.3)' }, '-=0.6');
    if (extras.length) tl.from(extras, { duration: 1, opacity: 0, ease: 'power2.out' }, '-=1.4');
  }

  // =========================================================
  // NEWSLETTER — /branding-brilliance-newsletter and /call-is-booked (was Slater 35515)
  // =========================================================
  function rdNewsletter() {
    var intro = byId('INTRO'); // the newsletter page has one, /call-is-booked doesn't
    if (intro) {
      gsap.timeline()
        .from(split(intro).chars, heroCharsIn(0.33), 'pair')
        .from(qs('.project_content'), { duration: 1.6, y: '50vh', ease: 'power2.out' }, 'pair');
    }

    var email = byId('Email_A');
    if (email) {
      gsap.from(email, { delay: 0.5, opacity: 0, filter: 'blur(1rem)', duration: 1.2, y: 50, ease: 'power2.out' });
    }
  }

  // =========================================================
  // RESOURCES — /resources (was Slater 37087 RESOURCES.js)
  // =========================================================
  function rdResources() {
    gsap.timeline()
      .from(split('#HeroTitle').chars, { duration: 0.6, ease: 'expo.out', yPercent: 100, stagger: 0.03 })
      .from(byId('First_content'), { opacity: 0, filter: 'blur(5px)', duration: 0.6 }, '<50%')
      .from(byId('original'), { opacity: 0, filter: 'blur(5px)', duration: 1 });
  }

  // =========================================================
  // QUIZ — /rimbo-quiz (was Slater 35662 QUIZ .js)
  // =========================================================
  function rdQuiz() {
    var questions = [
      {
        text: "Who is this?",
        choices: ["Swimming doggo", "Pool doggo", "Super doggo", "Gangster doggo"],
        answer: "Pool doggo",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baacf801b7bf3d2952b5_swim%20doggo.avif"
      },
      {
        text: "Do dolphins make rainbows?",
        choices: ["Yes", "For sure !!", "HELL YEAAAHH!!", "no"],
        answer: "no",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baabf7941818f9206d11_raredolphin.avif"
      },
      {
        text: "Whaaat?¿",
        choices: ["beans", "ǝɯ ʞɔᴉlʞƆ", "24", "get money"],
        answer: "ǝɯ ʞɔᴉlʞƆ",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baac1c9bea03eb04d9a4_jake%20qute.gif"
      },
      {
        text: "You will never beat my quiz",
        choices: ["run", "do nothing", "be scared", "fight"],
        answer: "fight",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baace5f540f75bcc8a81_batman.gif"
      },
      {
        text: "69 * 420",
        choices: ["28980", "38760", "24840", "18980"],
        answer: "28980",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baaccf0f44a242318fcc_math.gif"
      },
      {
        text: "This froggo is...",
        choices: ["cute", "beautiful", "poisonous", "all answers are correct"],
        answer: "all answers are correct",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baab8336152373ee545b_froggo.avif"
      },
      {
        text: "Oops, you touched the froggo!",
        choices: ["Whoobie doobie", "Dance with shroom", "Get it together", "Trip it out :3"],
        answer: "Get it together",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9cca79bb46fd660bdc4a9_3333.gif"
      },
      {
        text: "Do you think you're going to win?",
        choices: ["I'm doing fine", "Uhhhh...", "I hope so", ":I"],
        answer: "I'm doing fine",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baacd5cd5274f0549189_fine.gif"
      },
      {
        text: "Boss, how do we make this guy lose?",
        choices: ["lose now", "Click here", "Go final question", "call Rimbo"],
        answer: "Go final question",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baae6f86c2474a3b427a_calling.gif"
      },
      {
        text: "Who is Rimbo?",
        choices: ["Cool dude", "God of vibes", "Funny guy", "My man!"],
        answer: "God of vibes",
        img: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9cb9663c31098a3e52ed9_MP4%20to%20GIF%20test.gif"
      }
    ];
    var endImages = {
      low: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baac326fc8390883ba7e_sad.gif",
      mid: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9baacd16a1ddbaa367246_clap.gif",
      top: "https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/67e9d1951ac3a50582bc8e90_Tim%20And%20Eric%20Reaction%20GIF.gif"
    };

    var questionEl = byId('QUESTION');
    var buttons = ['BTN_1', 'BTN_2', 'BTN_3', 'BTN_4'].map(byId).filter(Boolean);
    if (!questionEl || buttons.length < 4) return;

    var index = 0;
    var score = 0;

    function show(el) { // like jQuery's .show(): drop the inline "none", then fall back to block
      el.style.display = '';
      if (getComputedStyle(el).display === 'none') el.style.display = 'block';
    }

    function showQuestion() {
      var q = questions[index];
      questionEl.textContent = q.text;
      buttons.forEach(function (button, i) {
        var label = qs('.btn-animate-chars__text', button) || button;
        label.textContent = q.choices[i];
        staggerChars(label); // new text means new letter spans for the hover effect
      });
      var image = byId('Quiz_IMG');
      if (image) image.src = q.img;
      var progress = byId('progress');
      if (progress) progress.textContent = 'Question ' + (index + 1) + ' of ' + questions.length;
    }

    function showScore() {
      gsap.set('.ending_screen', { display: 'flex' });
      gsap.set('.thequiz', { display: 'none' });
      var image = byId('END_IMG');
      if (image) image.src = score < 5 ? endImages.low : score < 10 ? endImages.mid : endImages.top;
      var scoreEl = byId('SCORE');
      if (scoreEl) scoreEl.textContent = 'Your score: ' + score + ' / ' + questions.length;
    }

    var startButton = byId('start_btn');
    if (startButton) {
      startButton.addEventListener('click', function () {
        var opening = byId('OPENING');
        var quiz = byId('TheQuiz');
        if (opening) opening.style.display = 'none';
        if (quiz) show(quiz);
      });
    }

    buttons.forEach(function (button, i) {
      button.addEventListener('click', function () {
        if (index >= questions.length) return;
        if (questions[index].choices[i] === questions[index].answer) score++;
        index++;
        if (index < questions.length) showQuestion();
        else showScore();
      });
    });

    showQuestion();
  }

  // =========================================================
  // LETTER REVEAL — /audit and /my-story (was anime.js page code in Webflow)
  // Every .tricks heading is split into words and letters; the letters inside
  // .fade-up rise in one after the other on page load.
  // =========================================================
  function rdLetterReveal(timing) {
    // Until the old page code (anime.js + jquery.inview) is deleted in Webflow, let it do this
    if (window.anime) return;

    qsa('.tricks').forEach(function (el) {
      new SplitText(el, { type: 'words,chars', wordsClass: 'tricksword', charsClass: 'letter' });
    });

    var letters = qsa('.fade-up .letter');
    if (!letters.length) return;
    gsap.from(letters, {
      y: 100,
      opacity: 0,
      ease: 'expo.out',
      duration: timing.duration,
      delay: timing.delay,
      stagger: 0.03
    });
  }

  // =========================================================
  // GLASS CAROUSEL — any page with [data-glass-carousel] (new site, 2026-10)
  // Osmo Supply's Liquid Glass Carousel (lens shader and scroll model adapted
  // from Yousuf Soomro's liquid-glass-carousel, MIT). Kept as published, plus
  // an intro: the panels start stacked in the middle and spread out to their
  // places while they grow, the lens opens with them, then caption and
  // counter fade in. Three.js loads only on pages that have the carousel.
  // =========================================================
  async function rdGlassCarousel() {
    var wrappers = document.querySelectorAll('[data-glass-carousel]');
    if (!wrappers.length) return;

    var THREE = await import('https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js');

    var panelHeight = 0.42; // 1 is the full height of the section
    var panelGap = 40; // px between images
    var wheel = 'horizontal'; // "horizontal" | "all" | "off"

    // Oval size
    var lensWidth = 1;
    var lensHeight = 0.6;
    var lensRotation = 90; // degrees
    var lensWidthNarrow = 1; // the same three, below 768px
    var lensHeightNarrow = 0.7;
    var lensRotationNarrow = 90;

    var lensColor = '#ff7373'; // the ring and its aura (Rimbo coral)
    var lensGlow = 4; // brightness of the ring, the outline and the centre, 0 to 17
    var lensRing = 1; // the coloured ring, 0 removes it
    var lensRingRadius = 0.49; // 0.1 sits near the middle, 0.49 on the edge
    var lensRingWidth = 0.01; // higher is softer and wider
    var lensRimLine = 1; // the white outline, 0 removes it
    var lensNova = 0.1; // white bloom in the middle, 0 to 1
    var lensDispersion = 11; // how far red and blue split near the edge
    var lensRimWave = 0.3; // how much the edge ripples
    var lensZoom = 0.4; // how much the glass magnifies, 0 is flat
    var lensVignette = 0; // darkens the corners of the section, 0 to 1
    var lensShimmer = true; // animates the ring

    // Intro: once the text is in, the row pops in from nothing (like the ECHO tornado)
    var introDelay = 1.6; // seconds after the page is ready, so the text comes first
    var introDuration = 1.3; // seconds for the pop
    var introEase = 'back.out(1.4)'; // overshoots a little, then settles (ECHO's tornado used expo.out)
    var introSpread = 0.1; // delay per panel away from the middle, as a share of the intro
    var introCaptionDelay = 0.6; // caption and counter follow after this many seconds

    // Autoplay: the row rolls left on its own and pauses while you touch it
    var autoDrift = 16; // px per second, 0 switches it off
    var driftResume = 2.5; // seconds of quiet after an interaction before it rolls again
    var driftEase = 0.12;

    // Finer shader detail, rarely worth touching
    var lensNovaSize = 12;
    var lensShimmerFreq = 12;
    var lensShimmerSpeed = 3.5;
    var lensShimmerDepth = 0.12;
    var lensRimStart = 0.578;
    var lensRimFreq1 = 2;
    var lensRimFreq2 = 1;
    var lensRimLinePos = 0.488;
    var lensRimLineWidth = 0.003;
    var lensVignetteSize = 0.3;
    var lensSamples = 16;

    var textureDetail = 1.5; // texture resolution over the size it is drawn at
    var panelWidthMax = 0.78; // the widest image never passes this share of the section width
    var narrowBreakpoint = 768;

    var repeats = 4;
    var ease = 0.09;
    var wheelSpeed = 1.4;
    var dragSpeed = 1.6;
    var touchSpeed = 1;
    var touchEase = 0.22;
    var friction = 0.865;
    var snapIdle = 120;
    var snapEase = 0.05;
    var shrinkMax = 60;
    var shrinkAttack = 0.25;
    var shrinkDecay = 0.06;
    var clickSlop = 6;
    var touchClickSlop = 12;
    var flickIdle = 90;

    var vertexShader = [
      'varying vec2 vUv;',
      'void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
    ].join('\n');

    var fragmentShader = [
      '#define PI 3.14159265',
      'precision highp float;',
      'varying vec2 vUv;',
      'uniform sampler2D uTex;',
      'uniform vec2  uRes;',
      'uniform vec2  uCenter;',
      'uniform float uSizeX;',
      'uniform float uSizeY;',
      'uniform float uAspect;',
      'uniform float uZoom;',
      'uniform float uDispersion;',
      'uniform float uGlow;',
      'uniform float uWhiteGlow;',
      'uniform float uNovaSize;',
      'uniform float uBlueRing;',
      'uniform float uRingRadius;',
      'uniform float uRingWidth;',
      'uniform float uShimmer;',
      'uniform float uShimmerFreq;',
      'uniform float uShimmerSpeed;',
      'uniform float uShimmerDepth;',
      'uniform float uTime;',
      'uniform float uRimStart;',
      'uniform float uRimTangential;',
      'uniform float uRimFreq1;',
      'uniform float uRimFreq2;',
      'uniform vec3  uBlueColor;',
      'uniform float uRimLine;',
      'uniform float uRimLinePos;',
      'uniform float uRimLineWidth;',
      'uniform float uVignette;',
      'uniform float uVignetteSize;',
      'uniform float uRotation;',
      'uniform int   uSamples;',
      'const int MAX_SAMPLES = 16;',
      'vec3 discLens(vec2 center, float aspectCorrect, out float outA) {',
      '  vec2 p = (vUv - center);',
      '  p.x *= aspectCorrect;',
      '  float ca = cos(uRotation), sa = sin(uRotation);',
      '  p = mat2(ca, -sa, sa, ca) * p;',
      '  vec2 halfSize = vec2(uSizeX, uSizeY);',
      '  float dist = length(p / halfSize);',
      '  outA = 0.0;',
      '  float maskND = dist;',
      '  if (maskND > 1.0) return vec3(0.0);',
      '  float shapeND = clamp(maskND, 0.0, 1.0);',
      '  float nd = clamp(dist, 0.0, 1.0);',
      '  vec2  offset = vUv - center;',
      '  vec2  radialDir = normalize(offset + 1e-6);',
      '  vec2  tangentDir = vec2(-radialDir.y, radialDir.x);',
      '  float angle = atan(p.y, p.x);',
      '  float pull = uZoom * 0.30 * (nd * nd);',
      '  float rimStrength = smoothstep(uRimStart, 1.0, nd);',
      '  float fluidWave = sin(angle * uRimFreq1) * 0.55 + sin(angle * uRimFreq2) * 0.25;',
      '  float rScreen = (uSizeX + uSizeY) * 0.5;',
      '  vec2  rimOff = tangentDir * fluidWave * rimStrength * rScreen * uRimTangential;',
      '  vec2 baseUV = center + offset * (1.0 - pull) + rimOff;',
      '  float rimMask = smoothstep(0.55, 1.0, nd);',
      '  vec2  dispDir = offset * uDispersion * 0.004 * rimMask;',
      '  int N = uSamples;',
      '  if (N < 2) N = 2;',
      '  if (N > MAX_SAMPLES) N = MAX_SAMPLES;',
      '  vec3 col = vec3(0.0);',
      '  vec3 caW = vec3(0.0);',
      '  for (int i = 0; i < MAX_SAMPLES; i++) {',
      '    if (i >= N) break;',
      '    float t = float(i) / float(N - 1);',
      '    vec2 sUV = baseUV + dispDir * (t - 0.5);',
      '    vec3 s = texture2D(uTex, sUV).rgb;',
      '    vec3 w = vec3(',
      '      exp(-pow((t - 0.00) / 0.38, 2.0)),',
      '      exp(-pow((t - 0.50) / 0.38, 2.0)),',
      '      exp(-pow((t - 1.00) / 0.38, 2.0))',
      '    );',
      '    col += s * w;',
      '    caW += w;',
      '  }',
      '  col /= max(caW, vec3(0.001));',
      '  col *= mix(0.91, 1.0, smoothstep(0.0, 0.38, shapeND));',
      '  float r2 = shapeND * shapeND * 0.25;',
      '  float gs = max(uNovaSize * uGlow * 0.003, 0.004);',
      '  float nova = exp(-r2 / gs) + exp(-r2 / (gs * 7.0)) * 0.18;',
      '  nova *= uWhiteGlow * (uGlow / 17.0) * 1.15;',
      '  col += vec3(nova);',
      '  float dC = shapeND * 0.5;',
      '  float tR = clamp(uRingRadius, 0.1, 0.49);',
      '  float rW = max(uRingWidth, 0.003);',
      '  float ring = exp(-pow((dC - tR) / rW, 2.0));',
      '  ring *= uBlueRing * (uGlow / 17.0) * 1.8;',
      '  if (uShimmer > 0.5) ring *= sin(angle * uShimmerFreq + uTime * uShimmerSpeed) * uShimmerDepth + (1.0 - uShimmerDepth);',
      '  float ringAura = exp(-pow((dC - tR) / (rW * 6.0), 2.0)) * 0.28 * uBlueRing * (uGlow / 17.0);',
      '  col += uBlueColor * (ring + ringAura);',
      '  col += vec3(exp(-pow((dC - uRimLinePos) / max(uRimLineWidth, 0.0001), 2.0)) * uRimLine);',
      '  outA = smoothstep(1.0, 0.93, maskND);',
      '  return col;',
      '}',
      'void main(){',
      '  vec3 base = texture2D(uTex, vUv).rgb;',
      '  vec3 outc = base;',
      '  float a = 0.0;',
      '  vec3 c = discLens(uCenter, uAspect, a);',
      '  outc = mix(outc, c, a);',
      '  if (uVignette > 0.001) {',
      '    vec2 vc = vUv - 0.5;',
      '    vc.x *= uAspect;',
      '    float d = length(vc) / max(uVignetteSize, 0.0001);',
      '    float vig = 1.0 - uVignette * smoothstep(0.5, 1.0, d);',
      '    outc *= clamp(vig, 0.0, 1.0);',
      '  }',
      '  gl_FragColor = vec4(outc, 1.0);',
      '}'
    ].join('\n');

    function backgroundOf(element) {
      var node = element;
      while (node && node !== document.documentElement) {
        var color = getComputedStyle(node).backgroundColor;
        if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return color;
        node = node.parentElement;
      }
      return '#ffffff';
    }

    function setupInstance(wrapper) {
      var mount = wrapper.querySelector('[data-glass-carousel-canvas]');
      var items = Array.from(wrapper.querySelectorAll('[data-glass-carousel-item]'));
      if (!mount || !items.length) return null;
      if (wrapper.getAttribute('data-glass-carousel') === 'canvas') return null;

      var captionEl = wrapper.querySelector('[data-glass-carousel-caption]');
      var counterEl = wrapper.querySelector('[data-glass-carousel-counter]');

      var total = items.length;
      var W = Math.max(1, mount.clientWidth);
      var H = Math.max(1, mount.clientHeight);
      var narrow = W < narrowBreakpoint;
      var panelH = 0;

      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, canvas: mount });
      } catch (err) {
        return null; // no webgl, the authored list stays as it is
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      renderer.setClearColor(new THREE.Color(backgroundOf(wrapper)), 1);

      var scene = new THREE.Scene();
      var camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
      camera.position.z = 10;

      var maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      var sources = items.map(function (item) {
        return {
          tex: null,
          aspect: 1,
          image: item.querySelector('[data-glass-carousel-image]') || item.querySelector('img')
        };
      });

      var loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');

      // Intro state: 0 = nothing there yet, 1 = in place (it passes 1 for a moment: the pop)
      var intro = { value: 0 };
      var introStarted = false;
      var introDone = false;
      var introQueued = false;
      var textureReady = false;
      var readyAt = performance.now();
      if (captionEl) gsap.set(captionEl, { autoAlpha: 0 });
      if (counterEl) gsap.set(counterEl, { autoAlpha: 0 });

      function startIntro() {
        if (introStarted) return;
        introStarted = true;
        gsap.to(intro, {
          value: 1,
          duration: introDuration,
          ease: introEase,
          onComplete: function () {
            intro.value = 1;
            introDone = true;
            lastInput = performance.now(); // the drift starts driftResume seconds after the pop
          }
        });
        gsap.to([captionEl, counterEl].filter(Boolean), {
          autoAlpha: 1, duration: 0.8, ease: 'power2.out', delay: introCaptionDelay, overwrite: true
        });
      }

      // The pop waits for two things: the first texture, and introDelay seconds after the page was ready
      function queueIntro() {
        if (introQueued || !textureReady) return;
        introQueued = true;
        var wait = Math.max(0, introDelay - (performance.now() - readyAt) / 1000);
        gsap.delayedCall(wait, startIntro);
      }

      function fitToPanel(image) {
        var cap = Math.round(panelH * Math.min(window.devicePixelRatio || 1, 2) * textureDetail);
        var height = image.naturalHeight || image.height;
        var width = image.naturalWidth || image.width;
        if (!height || height <= cap) return image;
        var scaled = document.createElement('canvas');
        scaled.width = Math.max(1, Math.round(width * (cap / height)));
        scaled.height = cap;
        scaled.getContext('2d').drawImage(image, 0, 0, scaled.width, scaled.height);
        return scaled;
      }

      function adoptTexture(source) {
        var image = source.image;
        if (!image || !image.naturalWidth || !image.naturalHeight) return;
        source.aspect = image.naturalWidth / image.naturalHeight;
        measurePanel();
        var url = image.currentSrc || image.src;
        loader.load(url, function (tex) {
          source.full = tex.image; // kept, so the texture can be refitted when the section grows
          tex.image = fitToPanel(tex.image);
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = true;
          tex.anisotropy = maxAnisotropy;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          source.tex = tex;
          measurePanel();
          recomputeTotal();
          if (!userInteracted) {
            scroll = centerForIndex(0);
            target = scroll;
          }
          // The first texture is in: the panels have something to show
          textureReady = true;
          queueIntro();
        }, undefined, function () {
          console.warn('Glass Carousel: image failed to load', url);
        });
      }

      function bindTextures() {
        sources.forEach(function (source) {
          if (!source.image) return;
          if (source.image.complete) adoptTexture(source);
          else source.image.addEventListener('load', function () { adoptTexture(source); }, { once: true });
        });
      }

      function measurePanel() {
        var widest = 1;
        for (var i = 0; i < sources.length; i++) widest = Math.max(widest, sources[i].aspect);
        panelH = Math.min(H * panelHeight, (W * panelWidthMax) / widest);
        wrapper.style.setProperty('--glass-carousel-panel', Math.round(panelH) + 'px'); // the CSS puts the caption under the row
      }
      measurePanel();

      function slotWidth(index) {
        return sources[index].aspect * panelH + panelGap;
      }

      var offsets = [];
      var totalWidth = 0;
      function recomputeTotal() {
        offsets = [];
        var acc = 0;
        for (var i = 0; i < sources.length; i++) {
          offsets.push(acc);
          acc += slotWidth(i);
        }
        totalWidth = acc;
      }
      recomputeTotal();

      function slotCenter(index) {
        return offsets[index] + slotWidth(index) / 2 - panelGap / 2;
      }

      function centerForIndex(index) {
        var loop = Math.floor(index / total);
        var s = ((index % total) + total) % total;
        return slotCenter(s) + loop * totalWidth;
      }

      function nearestIndex(value) {
        if (!totalWidth) return 0;
        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i < total; i++) {
          var center = slotCenter(i);
          var k = Math.round((value - center) / totalWidth);
          var dist = Math.abs(center + k * totalWidth - value);
          if (dist < bestDist) {
            bestDist = dist;
            best = i + k * total;
          }
        }
        return best;
      }

      function sourceIndex(value) {
        return ((nearestIndex(value) % total) + total) % total;
      }

      var panelGeometry = new THREE.PlaneGeometry(1, 1);
      var pool = [];
      for (var r = 0; r < repeats; r++) {
        for (var i = 0; i < total; i++) {
          var mat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true });
          var mesh = new THREE.Mesh(panelGeometry, mat);
          mesh.visible = false;
          scene.add(mesh);
          pool.push({ mesh: mesh, mat: mat, srcIndex: i, bound: false });
        }
      }

      var scroll = centerForIndex(0);
      var target = scroll;
      var userInteracted = false;
      var velocity = 0;
      var prevScroll = 0;
      var scrollEnergy = 0;
      var lastInput = performance.now();
      var snapped = false;
      var lastCenter = -1;

      var dpr = renderer.getPixelRatio() || 1;
      var bufferW = function () { return Math.max(1, Math.round(W * dpr)); };
      var bufferH = function () { return Math.max(1, Math.round(H * dpr)); };
      var rt = new THREE.WebGLRenderTarget(bufferW(), bufferH());
      var lensScene = new THREE.Scene();
      var lensCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      var lensUniforms = {
        uTex: { value: rt.texture },
        uRes: { value: new THREE.Vector2(bufferW(), bufferH()) },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uSizeX: { value: (narrow ? lensWidthNarrow : lensWidth) * (W / H) },
        uSizeY: { value: (narrow ? lensHeightNarrow : lensHeight) * (W / H) },
        uRotation: { value: 0 },
        uAspect: { value: W / H },
        uZoom: { value: lensZoom },
        uDispersion: { value: lensDispersion },
        uGlow: { value: lensGlow },
        uWhiteGlow: { value: lensNova },
        uNovaSize: { value: lensNovaSize },
        uBlueRing: { value: lensRing },
        uRingRadius: { value: lensRingRadius },
        uRingWidth: { value: lensRingWidth },
        uShimmer: { value: lensShimmer ? 1 : 0 },
        uShimmerFreq: { value: lensShimmerFreq },
        uShimmerSpeed: { value: lensShimmerSpeed },
        uShimmerDepth: { value: lensShimmerDepth },
        uTime: { value: 0 },
        uRimStart: { value: lensRimStart },
        uRimTangential: { value: lensRimWave },
        uRimFreq1: { value: lensRimFreq1 },
        uRimFreq2: { value: lensRimFreq2 },
        uBlueColor: { value: new THREE.Color(lensColor) },
        uRimLine: { value: lensRimLine },
        uRimLinePos: { value: lensRimLinePos },
        uRimLineWidth: { value: lensRimLineWidth },
        uVignette: { value: lensVignette },
        uVignetteSize: { value: lensVignetteSize },
        uSamples: { value: lensSamples }
      };
      var lensMat = new THREE.ShaderMaterial({ uniforms: lensUniforms, vertexShader: vertexShader, fragmentShader: fragmentShader });
      var lensQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lensMat);
      lensScene.add(lensQuad);

      function lensSize() { // the lens opens with the intro
        var s = 0.05 + 0.95 * Math.min(1, intro.value);
        lensUniforms.uSizeX.value = (narrow ? lensWidthNarrow : lensWidth) * (W / H) * s;
        lensUniforms.uSizeY.value = (narrow ? lensHeightNarrow : lensHeight) * (W / H) * s;
      }

      function refitTextures() { // the section was smaller (even 0 x 0) when the textures were made
        var cap = Math.round(panelH * Math.min(window.devicePixelRatio || 1, 2) * textureDetail);
        sources.forEach(function (source) {
          if (!source.tex || !source.full) return;
          var current = source.tex.image.height || 0;
          if (current >= cap || current >= source.full.height) return;
          source.tex.image = fitToPanel(source.full);
          source.tex.needsUpdate = true;
        });
      }

      function applyLook() {
        renderer.setClearColor(new THREE.Color(backgroundOf(wrapper)), 1);
        var active = sourceIndex(scroll);
        measurePanel();
        refitTextures();
        recomputeTotal();
        scroll = centerForIndex(active);
        target = scroll;
        lensUniforms.uAspect.value = W / H;
        lensSize();
        lensUniforms.uRotation.value = ((narrow ? lensRotationNarrow : lensRotation) * Math.PI) / 180;
      }

      var panelRects = [];
      var centeredPanel = null;

      function layout() {
        panelRects = [];
        centeredPanel = null;
        var centeredDist = Infinity;
        var half = W / 2;
        var buffer = panelH;

        pool.forEach(function (p, poolIdx) {
          var rep = Math.floor(poolIdx / total);
          var i = p.srcIndex;
          var src = sources[i];

          var x = slotCenter(i) - scroll;
          x = ((x % totalWidth) + totalWidth) % totalWidth;
          x += (rep - Math.floor(repeats / 2)) * totalWidth;
          if (x > half + totalWidth) x -= totalWidth * repeats;

          var centerX = x;
          if (centerX < -half - buffer || centerX > half + buffer) {
            p.mesh.visible = false;
            return;
          }

          // Intro: the row pops in from nothing, the middle first and the neighbours just after
          var grow = 1;
          if (!introDone) {
            var ring = Math.round(Math.abs(centerX) / Math.max(1, totalWidth / total));
            var f = (intro.value - ring * introSpread) / Math.max(0.05, 1 - ring * introSpread);
            grow = Math.max(0, f); // passes 1 for a moment: that is the pop
            centerX *= gsap.utils.clamp(0, 1, f);
          }

          var shrink = (1 - 0.25 * scrollEnergy) * grow;
          var h = panelH * shrink;
          var w = src.aspect * panelH * shrink;

          if (src.tex && !p.bound) {
            p.mat.map = src.tex;
            p.mat.color.set(0xffffff);
            p.mat.needsUpdate = true;
            p.bound = true;
          }

          p.mesh.visible = true;
          p.mesh.position.set(centerX, 0, 0);
          p.mesh.scale.set(w, h, 1);

          var sx = centerX + W / 2;
          var sy = H / 2;
          panelRects.push({
            left: sx - w / 2,
            right: sx + w / 2,
            top: sy - h / 2,
            bottom: sy + h / 2,
            poolIdx: poolIdx,
            srcIndex: i,
            centerX: x
          });

          if (Math.abs(centerX) < centeredDist) {
            centeredDist = Math.abs(centerX);
            centeredPanel = { srcIndex: i, poolIdx: poolIdx };
          }
        });
      }

      var el = mount;
      wrapper.setAttribute('data-glass-carousel-wheel', wheel);

      function rectOf(px, py) {
        var bounds = el.getBoundingClientRect();
        var x = px - bounds.left;
        var y = py - bounds.top;
        for (var i = 0; i < panelRects.length; i++) {
          var r = panelRects[i];
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return r;
        }
        return null;
      }

      var dragging = false;
      var dragPointerId = null;
      var dragLastX = 0;
      var dragDist = 0;
      var dragVel = 0;
      var dragMoveT = 0;
      var suppressClick = false;
      var dragPointerType = 'mouse';
      var lastPointerX = NaN;
      var lastPointerY = NaN;
      var pointerInside = false;
      var lastPointerType = 'mouse';
      var pointerState = '';

      function setPointer(v) {
        if (v === pointerState) return;
        pointerState = v;
        wrapper.setAttribute('data-glass-carousel-pointer', v);
      }

      function setHover(on) {
        setPointer(dragging ? 'grabbing' : on ? 'grab' : '');
      }

      function refreshHover() {
        if (!pointerInside || lastPointerType !== 'mouse') return;
        if (!Number.isFinite(lastPointerX)) return;
        setHover(rectOf(lastPointerX, lastPointerY) !== null);
      }

      function onWheel(e) {
        if (wheel === 'off') return;
        var sideways = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        if (wheel === 'horizontal' && !sideways) return;
        e.preventDefault();
        userInteracted = true;
        target += (sideways ? e.deltaX : e.deltaY) * wheelSpeed;
        lastInput = performance.now();
        snapped = false;
      }

      function onPointerDown(e) {
        suppressClick = false;
        if (dragging) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        dragging = true;
        dragPointerId = e.pointerId;
        dragPointerType = e.pointerType || 'mouse';
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
        dragLastX = e.clientX;
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        dragDist = 0;
        dragVel = 0;
        dragMoveT = performance.now();
        setHover(false);
        velocity = 0;
        userInteracted = true;
        snapped = false;
        lastInput = dragMoveT;
      }

      function onPointerMove(e) {
        if (dragging && e.pointerId === dragPointerId) {
          var sens = dragPointerType === 'mouse' ? dragSpeed : touchSpeed;
          var dx = e.clientX - dragLastX;
          dragLastX = e.clientX;
          dragDist += Math.abs(dx);
          target -= dx * sens;
          dragVel = dragVel * 0.6 + -dx * sens * 0.4;
          dragMoveT = performance.now();
          lastInput = dragMoveT;
          snapped = false;
        }
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerType = e.pointerType || 'mouse';
        pointerInside = true;
        if (e.pointerType !== 'mouse') return;
        setHover(rectOf(e.clientX, e.clientY) !== null);
      }

      function onPointerUp(e) {
        if (!dragging) return;
        if (e && dragPointerId !== null && e.pointerId !== dragPointerId) return;
        dragging = false;
        if (dragPointerId !== null) {
          try { el.releasePointerCapture(dragPointerId); } catch (err) {}
          dragPointerId = null;
        }
        velocity = performance.now() - dragMoveT > flickIdle ? 0 : dragVel;
        dragVel = 0;
        lastInput = performance.now();
        snapped = false;
        suppressClick = dragDist > (dragPointerType === 'mouse' ? clickSlop : touchClickSlop);
        if (dragPointerType === 'mouse') setHover(rectOf(lastPointerX, lastPointerY) !== null);
        else setHover(false);
      }

      function onEnter(e) {
        pointerInside = true;
        lastPointerType = e.pointerType || 'mouse';
      }

      function onLeave() {
        pointerInside = false;
        setHover(false);
      }

      function onClick(e) {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        var hit = rectOf(e.clientX, e.clientY);
        if (!hit) return;
        if (centeredPanel && hit.poolIdx === centeredPanel.poolIdx) {
          followLink(hit.srcIndex, e);
          return;
        }
        userInteracted = true;
        velocity = 0;
        target = centerForIndex(nearestIndex(scroll + hit.centerX));
        snapped = true;
        setHover(false);
      }

      function followLink(srcIndex, e) {
        var item = items[srcIndex];
        var link = item && (item.matches('a[href]') ? item : item.querySelector('a[href]'));
        if (!link) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank') {
          window.open(link.href, link.target || '_blank', 'noopener');
          return;
        }
        link.click();
      }

      function showActive(index) {
        if (counterEl) {
          counterEl.textContent = String(index + 1).padStart(2, '0') + '/' + String(total).padStart(2, '0');
        }
        var content = items[index].querySelector('[data-glass-carousel-content]');
        if (captionEl && content) {
          captionEl.replaceChildren(content.cloneNode(true));
          if (introStarted) {
            gsap.fromTo(captionEl, { yPercent: 25, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' });
          }
        }
      }

      el.addEventListener('wheel', onWheel, { passive: false });
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('pointerleave', onLeave);
      el.addEventListener('click', onClick);

      var raf = 0;
      var lastFrame = performance.now();
      var drifting = false;
      function tick() {
        if (!wrapper.isConnected) return destroy();
        var now = performance.now();
        var dt = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;
        var idle = now - lastInput;

        if (!dragging) {
          target += velocity;
          velocity *= friction;
          if (Math.abs(velocity) < 0.05) velocity = 0;

          drifting = autoDrift > 0 && introDone && idle > driftResume * 1000;
          if (drifting) {
            target += autoDrift * dt; // the row rolls left on its own
            snapped = false;
          } else if (!snapped && idle > snapIdle) {
            target = centerForIndex(nearestIndex(scroll));
            snapped = true;
          }
        } else {
          drifting = false;
        }

        var follow = dragging && dragPointerType !== 'mouse'
          ? touchEase
          : drifting
            ? driftEase
            : snapped
              ? snapEase
              : ease;
        scroll += (target - scroll) * follow;

        var ci = sourceIndex(scroll);
        if (ci !== lastCenter) {
          lastCenter = ci;
          showActive(ci);
        }

        var rawSpeed = scroll - prevScroll;
        prevScroll = scroll;
        var norm = Math.min(1, Math.abs(rawSpeed) / Math.max(1, shrinkMax));
        var k = norm > scrollEnergy ? shrinkAttack : shrinkDecay;
        scrollEnergy += (norm - scrollEnergy) * k;

        layout();
        refreshHover();
        if (!introDone) lensSize();

        lensUniforms.uTime.value = performance.now() * 0.001;

        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
        renderer.render(lensScene, lensCam);

        raf = requestAnimationFrame(tick);
      }

      function onResize() {
        var nextW = mount.clientWidth;
        var nextH = mount.clientHeight;
        if (!nextW || !nextH) return;
        W = nextW;
        H = nextH;
        renderer.setSize(W, H, false);
        camera.left = -W / 2;
        camera.right = W / 2;
        camera.top = H / 2;
        camera.bottom = -H / 2;
        camera.updateProjectionMatrix();
        rt.setSize(bufferW(), bufferH());
        lensUniforms.uRes.value.set(bufferW(), bufferH());
        narrow = W < narrowBreakpoint;
        applyLook();
      }

      var resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mount);

      wrapper.setAttribute('data-glass-carousel', 'canvas');
      bindTextures();
      showActive(0);
      lensSize();
      tick();

      function destroy() {
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        el.removeEventListener('wheel', onWheel);
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', onPointerUp);
        el.removeEventListener('pointerenter', onEnter);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('click', onClick);
        renderer.dispose();
        rt.dispose();
        lensQuad.geometry.dispose();
        lensMat.dispose();
        panelGeometry.dispose();
        pool.forEach(function (p) { p.mat.dispose(); });
        sources.forEach(function (s) { if (s.tex) s.tex.dispose(); });
        wrapper.setAttribute('data-glass-carousel', '');
      }

      return { destroy: destroy };
    }

    var instances = [];
    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      wrappers.forEach(function (wrapper) {
        var instance = setupInstance(wrapper);
        if (instance) instances.push(instance);
      });

      return function () {
        instances.forEach(function (instance) { instance.destroy(); });
        instances.length = 0;
      };
    });
  }

  // =========================================================
  // RUN
  // Page sections run straight away, like the old Slater tags did. Each one
  // runs on its own, so a missing element on one page can't stop the rest.
  // =========================================================
  function run(name, fn, arg) {
    try {
      fn(arg);
    } catch (err) {
      console.error('[rimbo-designs] ' + name + ':', err);
    }
  }

  // "/nl/work/anapana/" → "/work/anapana": the Dutch pages run the same code
  var path = location.pathname.replace(/\/+$/, '').replace(/^\/nl(?=\/|$)/, '') || '/';

  run('global', rdGlobal);
  run('form validation', rdFormValidation);
  run('menu', rdMenu);

  if (path === '/') run('home', rdHome);
  else if (path === '/service' || path.indexOf('/locations/') === 0) run('service', rdService);
  else if (path === '/work') run('work', rdWork);
  else if (path.indexOf('/work/') === 0) run('case study', rdWorkItem);
  else if (path === '/branding-brilliance-newsletter' || path === '/call-is-booked') run('newsletter', rdNewsletter);
  else if (path === '/resources') run('resources', rdResources);
  else if (path === '/rimbo-quiz') run('quiz', rdQuiz);

  // These two replace code that still sits in Webflow for now, so they wait for
  // the whole page and check whether that old code has run first.
  onReady(function () {
    run('lenis', rdLenis);
    if (qs('[data-glass-carousel]')) run('glass carousel', rdGlassCarousel);
    if (path === '/audit') run('letter reveal', rdLetterReveal, { duration: 2, delay: 0.4 });
    if (path === '/my-story') run('letter reveal', rdLetterReveal, { duration: 1.4, delay: 0.3 });
  });

})();
