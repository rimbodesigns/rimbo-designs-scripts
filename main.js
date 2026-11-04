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

    // The phone browser's bottom bar sliding away on the first scroll changes the viewport height;
    // ScrollTrigger must not treat that as a resize (it recalculates and the page jumps)
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.config({ ignoreMobileResize: true });

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
    // the new header (.rs-title / .rs-tools) or the old one (#HeroTitle / #First_content)
    var title = qs('.rs-title') || byId('HeroTitle');
    var tools = qs('.rs-tools') || byId('First_content');
    var tl = gsap.timeline();
    if (title) tl.from(split(title).chars, { duration: 0.6, ease: 'expo.out', yPercent: 100, stagger: 0.03 });
    if (tools) tl.from(tools, { opacity: 0, filter: 'blur(5px)', duration: 0.6 }, title ? '<50%' : 0);
    run('resources filter', rdMultiFilter);
    run('queued reveal', rdQueuedReveal);
    run('language toggle', rdLangToggle);
  }

  // Language toggle, after Osmo's Toggle Switch: a pill slides under the current language. Here the buttons
  // are the Webflow locale links (they know the right URL for every page), so picking the other language
  // slides the pill, fades the page out softly and then opens that locale. Works on [data-lang-toggle] or
  // .rs-lang; the track is the locale list inside it (or the element itself), the pill is added here.
  function rdLangToggle() {
    var ease = 'cubic-bezier(0.625, 0.05, 0, 1)';
    qsa('[data-lang-toggle], .rs-lang').forEach(function (root) {
      if (root.hasAttribute('data-toggle-ready')) return;
      var links = qsa('a[hreflang]', root);
      if (links.length < 2) return;
      var track = qs('.w-locales-items', root) || root;
      var pill = document.createElement('span');
      pill.className = 'rs-lang__pill';
      pill.setAttribute('aria-hidden', 'true');
      track.insertBefore(pill, track.firstChild);
      track.style.setProperty('--toggle-count', links.length);

      var current = links.findIndex(function (a) { return a.classList.contains('w--current') || a.getAttribute('aria-current') === 'page'; });
      if (current < 0) current = 0;
      function setActive(i) {
        track.style.setProperty('--toggle-active', i);
        links.forEach(function (a, j) { a.toggleAttribute('data-toggle-active', i === j); });
      }
      setActive(current);
      root.setAttribute('data-toggle-ready', '');

      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      links.forEach(function (a, i) {
        a.addEventListener('click', function (e) {
          if (i === current) { e.preventDefault(); return; }
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return; // new tab etc.: let the browser do it
          if (reduce) return;
          e.preventDefault();
          setActive(i);
          var page = qs('.main-wrapper') || document.body;
          // the pill slides (0.5s); the page starts fading halfway, then the other language loads
          setTimeout(function () {
            page.style.transition = 'opacity 0.3s ' + ease + ', transform 0.3s ' + ease;
            page.style.opacity = '0';
            page.style.transform = 'translateY(-0.5rem)';
          }, 200);
          setTimeout(function () { window.location.href = a.href; }, 520);
        });
        // Osmo's keyboard: left/right moves between the languages
        a.addEventListener('keydown', function (e) {
          var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          links[(i + dir + links.length) % links.length].focus();
        });
      });

      // back/forward cache: coming back must show the page and the pill as they were
      window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        var page = qs('.main-wrapper') || document.body;
        page.style.transition = page.style.opacity = page.style.transform = '';
        setActive(current);
      });
    });
  }

  // Queued scroll reveal, from Osmo Supply as it came: cards that enter the screen wait their turn and
  // rise in one after the other. Needs [data-queued-reveal-group] with [data-queued-reveal-item]s (or
  // [data-queued-reveal-children]). On /resources the item is the card's link, not the filtered .post,
  // so the filter's own scale/fade and this reveal never fight over one transform.
  function rdQueuedReveal() {
    if (!window.ScrollTrigger || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    var queue = [];
    var isRunning = false;
    var waiting = []; // ours: items not revealed yet, with their trigger

    document.querySelectorAll('[data-queued-reveal-group]').forEach(function (group) {
      var items = group.hasAttribute('data-queued-reveal-children') ? [].slice.call(group.children) : [].slice.call(group.querySelectorAll('[data-queued-reveal-item]'));
      if (!items.length) return;
      items.forEach(function (item) {
        if (item.getBoundingClientRect().bottom <= 0) return;
        gsap.set(item, { autoAlpha: 0, y: '4em', transition: 'none' }); // hidden state on load (ours: no CSS transition fighting the tween)
        var entry = { item: item, st: null };
        waiting.push(entry);
        entry.st = ScrollTrigger.create({
          trigger: item,
          start: 'top 100%', // reveal offset
          once: true,
          onEnter: function () { enqueue(entry); }
        });
      });
    });

    function enqueue(entry) {
      var i = waiting.indexOf(entry);
      if (i < 0) return; // already queued
      waiting.splice(i, 1);
      queue.push(entry.item);
      if (queue.length > 12) reveal(queue.shift()); // max queue length
      if (!isRunning) { isRunning = true; gsap.delayedCall(0.1, revealNext); } // delay
    }

    // Ours: the filter moved cards around (rdMultiFilter sends rd:filtered). ScrollTrigger re-measures, and any
    // card that is now on screen joins the queue, since refresh() doesn't fire onEnter for those.
    document.addEventListener('rd:filtered', function () {
      ScrollTrigger.refresh();
      waiting.slice().forEach(function (entry) {
        var r = entry.item.getBoundingClientRect();
        if (r.width && r.top < window.innerHeight && r.bottom > 0 && !filteredOut(entry.item)) {
          if (entry.st) entry.st.kill();
          enqueue(entry);
        }
      });
    });

    // ours: a card the filter has hidden stays hidden; it just drops the reveal's inline styles
    function filteredOut(item) {
      return !!item.closest('[data-filter-status="not-active"], [data-filter-status="transition-out"]');
    }
    function reveal(item) {
      if (filteredOut(item)) { gsap.set(item, { clearProps: 'opacity,visibility,transform,transition' }); return; }
      gsap.to(item, { autoAlpha: 1, duration: 1.2, ease: 'power1.out' });
      gsap.to(item, { y: '0em', duration: 1.2, ease: 'expo.out', onComplete: function () {
        // one clear at the very end, so the card's own CSS transition never catches a half-done value
        gsap.set(item, { clearProps: 'opacity,visibility,transform,transition' });
      } });
    }
    function revealNext() {
      var item = queue.shift();
      if (!item) { isRunning = false; return; }
      reveal(item);
      gsap.delayedCall(0.075, revealNext); // stagger
    }
  }

  // Multi filter (multi match), from Osmo Supply. Needs [data-filter-group] on the page, so the old
  // Finsweet filter on /resources keeps working until the Designer is rebuilt with the new attributes.
  // The filter logic is Osmo's as it came; the count at the bottom is ours ([data-filter-count="shown|total"]).
  function rdMultiFilter() {
    var transitionDelay = 300;
    var groups = [].slice.call(document.querySelectorAll('[data-filter-group]'));
    groups.forEach(function (group) {
      var targetMatch = (group.getAttribute('data-filter-target-match') || 'multi').trim().toLowerCase(); // 'single' | 'multi'
      var nameMatch = (group.getAttribute('data-filter-name-match') || 'multi').trim().toLowerCase();     // 'single' | 'multi'
      var buttons = [].slice.call(group.querySelectorAll('[data-filter-target]'));
      var items = [].slice.call(group.querySelectorAll('[data-filter-name]'));

      // Collect tokens from children if present
      items.forEach(function (item) {
        var collectors = item.querySelectorAll('[data-filter-name-collect]');
        if (!collectors.length) return;
        var seen = new Set(), tokens = [];
        collectors.forEach(function (c) {
          // ours: an empty attribute takes the element's text as a slug ("UI/UX Design" → "ui-ux-design"),
          // because Webflow can't bind an Option field to an attribute
          var v = (c.getAttribute('data-filter-name-collect') || '').trim().toLowerCase();
          if (!v) v = (c.textContent || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          if (v && !seen.has(v)) { seen.add(v); tokens.push(v); }
        });
        if (tokens.length) item.setAttribute('data-filter-name', tokens.join(' '));
      });

      // Cache item tokens
      var itemTokens = new Map();
      items.forEach(function (el) {
        var raw = (el.getAttribute('data-filter-name') || '').trim().toLowerCase();
        itemTokens.set(el, new Set(raw ? raw.split(/\s+/).filter(Boolean) : []));
      });

      // Ours: a topic no card on this page has (Branding on the Dutch page) gets no button, instead of an empty grid
      buttons = buttons.filter(function (btn) {
        var t = (btn.getAttribute('data-filter-target') || '').trim().toLowerCase();
        if (t === 'all' || t === 'reset') return true;
        var used = items.some(function (el) { return itemTokens.get(el).has(t); });
        if (!used) btn.hidden = true;
        return used;
      });

      function setItemState(el, on) {
        var next = on ? 'active' : 'not-active';
        if (el.getAttribute('data-filter-status') !== next) {
          el.setAttribute('data-filter-status', next);
          el.setAttribute('aria-hidden', on ? 'false' : 'true');
        }
      }
      function setButtonState(btn, on) {
        var next = on ? 'active' : 'not-active';
        if (btn.getAttribute('data-filter-status') !== next) {
          btn.setAttribute('data-filter-status', next);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      }

      // Active tags model
      var activeTags = targetMatch === 'single' ? null : new Set(['all']);
      function hasRealActive() {
        if (targetMatch === 'single') return activeTags !== null;
        return activeTags.size > 0 && !activeTags.has('all');
      }
      function resetAll() {
        if (targetMatch === 'single') activeTags = null;
        else { activeTags.clear(); activeTags.add('all'); }
      }

      // Matching logic
      function itemMatches(el) {
        if (!hasRealActive()) return true;
        var tokens = itemTokens.get(el);
        if (targetMatch === 'single') return tokens.has(activeTags);
        var selected = Array.from(activeTags);
        if (nameMatch === 'single') { // AND: must contain all selected
          for (var i = 0; i < selected.length; i++) if (!tokens.has(selected[i])) return false;
          return true;
        }
        for (var j = 0; j < selected.length; j++) if (tokens.has(selected[j])) return true; // OR: any selected
        return false;
      }

      function paint(rawTarget) {
        var target = (rawTarget || '').trim().toLowerCase();
        if ((target === 'all' || target === 'reset') && !hasRealActive()) return;

        if (target === 'all' || target === 'reset') resetAll();
        else if (targetMatch === 'single') activeTags = target;
        else {
          if (activeTags.has('all')) activeTags.delete('all');
          if (activeTags.has(target)) activeTags.delete(target);
          else activeTags.add(target);
          if (activeTags.size === 0) resetAll();
        }

        // Update items
        items.forEach(function (el) {
          if (el._ft) clearTimeout(el._ft);
          var next = itemMatches(el);
          var cur = el.getAttribute('data-filter-status');
          if (cur === 'active' && transitionDelay > 0) {
            el.setAttribute('data-filter-status', 'transition-out');
            el._ft = setTimeout(function () { setItemState(el, next); el._ft = null; }, transitionDelay);
          } else if (transitionDelay > 0) {
            el._ft = setTimeout(function () { setItemState(el, next); el._ft = null; }, transitionDelay);
          } else {
            setItemState(el, next);
          }
        });

        // Update buttons
        buttons.forEach(function (btn) {
          var t = (btn.getAttribute('data-filter-target') || '').trim().toLowerCase();
          var on = false;
          if (t === 'all') on = !hasRealActive();
          else if (t === 'reset') on = hasRealActive();
          else on = targetMatch === 'single' ? activeTags === t : activeTags.has(t);
          setButtonState(btn, on);
        });
        showCount();

        // Ours: Reset hides itself, so keyboard focus moves to All instead of getting lost
        if (target === 'reset' && document.activeElement && document.activeElement.getAttribute('data-filter-target') === 'reset') {
          var allBtn = group.querySelector('[data-filter-target="all"]');
          if (allBtn) allBtn.focus();
        }
        // Ours: the cards moved, so the queued reveal (rdQueuedReveal) measures again and shows cards now in view
        clearTimeout(group._st);
        group._st = setTimeout(function () { document.dispatchEvent(new CustomEvent('rd:filtered')); }, transitionDelay + 50);
      }

      // Ours: "3 of 10", counted on what the filter has settled on, not on the fade-out in between
      var shown = group.querySelectorAll('[data-filter-count="shown"]');
      var total = group.querySelectorAll('[data-filter-count="total"]');
      function showCount() {
        var n = items.filter(function (el) { return itemMatches(el); }).length;
        shown.forEach(function (s) { s.textContent = n; });
        total.forEach(function (s) { s.textContent = items.length; });
        shown.forEach(function (s) { if (s.parentNode) s.parentNode.setAttribute('data-filter-count-ready', ''); }); // the CSS shows the count once it's right
      }

      group.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter-target]');
        if (btn && group.contains(btn)) paint(btn.getAttribute('data-filter-target'));
      });

      paint('all');
      showCount();
    });
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

    var panelHeight = 0.55; // 1 is the full height of the section (78svh on the test page, so this is about 43svh)
    var panelGap = 40; // px between images
    var panelHeightNarrow = 0.86; // below 768px the centre panel takes most of the screen
    var panelGapNarrow = 14;
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
    var lensNova = 0; // white bloom in the middle, 0 to 1 (off: its falloff is wider than the canvas and lifted the black by ~5 levels)
    var lensDispersion = 11; // how far red and blue split near the edge
    var lensRimWave = 0.3; // how much the edge ripples
    var lensZoom = 0.4; // how much the glass magnifies, 0 is flat
    var lensVignette = 0; // darkens the corners of the section, 0 to 1
    var lensShimmer = true; // animates the ring

    // Intro: once the text is in, every image grows from nothing to fill its own place in the
    // row, like the photos on the ECHO site: the middle one first, the neighbours just after
    var introDelay = 1.6; // seconds after the page is ready, so the text comes first
    var introDuration = 1.1; // seconds for one image to grow
    var introEase = 'expo.out';
    var introSpread = 0.06; // delay per panel away from the middle, as a share of the intro
    var introCaptionDelay = 0.6; // the caption follows after this many seconds

    // Autoplay: the row rolls left on its own and pauses while you touch it
    var autoDrift = 26; // px per second, 0 switches it off
    var driftResume = 1.2; // seconds of quiet after a drag or wheel before it rolls again
    var clickHold = 3.5; // seconds a clicked panel stays in the middle before the row rolls on
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
    var panelWidthMaxNarrow = 0.94;
    var narrowBreakpoint = 768;

    var repeats = 4;
    var ease = 0.09;
    var wheelSpeed = 1.4;
    var dragSpeed = 1.6;
    var touchSpeed = 1;
    var touchEase = 0.22;
    var friction = 0.865;
    var snapIdle = 120;
    var snapEase = 0.14; // quick enough to actually arrive before anything else moves the row
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

    // The lens pass copies the render target straight to the screen, so everything that goes
    // into that render target must already be in screen colour: the clear colour, the
    // textures and the ring colour are all kept as-is instead of being converted to linear.
    // That is what makes the canvas black the same black as the page.
    function screenColor(css) {
      return new THREE.Color().setStyle(css, THREE.LinearSRGBColorSpace);
    }

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
      // Per-section overrides, set as attributes on the wrapper:
      // data-glass-carousel-height="0.46" (share of the section) and data-glass-carousel-intro-delay="0.4" (s)
      var panelShare = parseFloat(wrapper.getAttribute('data-glass-carousel-height')) || panelHeight;
      var introWait = parseFloat(wrapper.getAttribute('data-glass-carousel-intro-delay'));
      if (isNaN(introWait)) introWait = introDelay;
      // data-glass-carousel-intro-event="name": the intro also waits for that window event (a page loader, say).
      // The section itself fires "glass-carousel:ready" on window once its first texture is in.
      // data-glass-carousel-start="right": the first item begins at the right edge instead of the
      // middle, so with the row rolling left it crosses the whole screen before it leaves
      var startEdge = wrapper.getAttribute('data-glass-carousel-start') || 'center';
      var introEvent = wrapper.getAttribute('data-glass-carousel-intro-event');
      var introEventFired = !introEvent;
      if (introEvent) {
        window.addEventListener(introEvent, function () { introEventFired = true; queueIntro(); }, { once: true });
      }

      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, canvas: mount });
      } catch (err) {
        return null; // no webgl, the authored list stays as it is
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(W, H, false);
      renderer.setClearColor(screenColor(backgroundOf(wrapper)), 1);

      var scene = new THREE.Scene();
      var camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -100, 100);
      camera.position.z = 10;

      var maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

      // An item's picture is an <img>, or a muted looping <video> for a moving panel
      var sources = items.map(function (item) {
        var media = item.querySelector('[data-glass-carousel-image]') || item.querySelector('video, img');
        return {
          tex: null,
          aspect: 1,
          image: media,
          video: media && media.tagName === 'VIDEO'
        };
      });

      var loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');

      // Intro state: 0 = nothing there yet, 1 = every image at full size
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
            lensStrength();
            window.dispatchEvent(new CustomEvent('glass-carousel:intro-done', { detail: { wrapper: wrapper } }));
          }
        });
        gsap.to([captionEl, counterEl].filter(Boolean), {
          autoAlpha: 1, duration: 0.8, ease: 'power2.out', delay: introCaptionDelay, overwrite: true
        });
      }

      // The pop waits for two things: the first texture, and introDelay seconds after the page was ready
      function queueIntro() {
        if (introQueued || !textureReady || !introEventFired) return;
        introQueued = true;
        var wait = Math.max(0, introWait - (performance.now() - readyAt) / 1000);
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

      function adoptVideo(source) {
        var video = source.image;
        if (!video.videoWidth || !video.videoHeight || source.tex) return;
        source.aspect = video.videoWidth / video.videoHeight;
        measurePanel();
        var tex = new THREE.VideoTexture(video);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.anisotropy = maxAnisotropy;
        tex.colorSpace = THREE.NoColorSpace; // screen colour in, screen colour out
        source.tex = tex;
        recomputeTotal();
        if (!userInteracted && !introStarted) {
          scroll = startScroll();
          target = scroll;
        }
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        var playing = video.play();
        if (playing && playing.catch) playing.catch(function () {});
        markReady();
      }

      function markReady() {
        if (!textureReady) {
          textureReady = true;
          window.dispatchEvent(new CustomEvent('glass-carousel:ready', { detail: { wrapper: wrapper } }));
        }
        queueIntro();
      }

      function adoptTexture(source) {
        if (source.video) return adoptVideo(source);
        var image = source.image;
        if (!image || source.adopted) return;
        if (!image.naturalWidth || !image.naturalHeight) { // not decoded yet: come back when it is
          if (!source.waiting) {
            source.waiting = true;
            waitForImage(image, function () { source.waiting = false; adoptTexture(source); });
          }
          return;
        }
        source.adopted = true;
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
          tex.colorSpace = THREE.NoColorSpace; // screen colour in, screen colour out
          tex.needsUpdate = true;
          source.tex = tex;
          measurePanel();
          recomputeTotal();
          if (!userInteracted && !introStarted) { // before anything is visible; never yank a moving row back
            scroll = startScroll();
            target = scroll;
          }
          // The first texture is in: the panels have something to show
          markReady();
        }, undefined, function () {
          console.warn('Glass Carousel: image failed to load', url);
        });
      }

      // "load" alone is not enough: an <img> can report complete while its size is still 0,
      // and a cached one may never fire load again. decode() settles both cases.
      function waitForImage(image, done) {
        var called = false;
        var once = function () { if (!called) { called = true; done(); } };
        image.addEventListener('load', once, { once: true });
        if (image.decode) image.decode().then(once, function () {}); // a failed decode leaves it to the load/error path
      }

      function bindTextures() {
        sources.forEach(function (source) {
          if (!source.image) return;
          if (source.video) {
            var video = source.image;
            video.muted = true; // a muted video may start on its own, and play() makes the browser load it
            video.loop = true;
            video.playsInline = true;
            if (video.readyState >= 2) adoptVideo(source);
            else video.addEventListener('loadeddata', function () { adoptVideo(source); }, { once: true });
            video.addEventListener('error', function () { console.warn('Glass Carousel: video failed to load', video.currentSrc); }, { once: true });
            var kick = video.play();
            if (kick && kick.catch) kick.catch(function () {});
            return;
          }
          if (source.image.complete && source.image.naturalWidth) adoptTexture(source);
          else waitForImage(source.image, function () { adoptTexture(source); });
        });
      }

      function measurePanel() {
        var widest = 1;
        for (var i = 0; i < sources.length; i++) widest = Math.max(widest, sources[i].aspect);
        var phone = W < narrowBreakpoint;
        panelGap = phone ? panelGapNarrow : 40;
        panelH = Math.min(H * (phone ? Math.max(panelShare, panelHeightNarrow) : panelShare), (W * (phone ? panelWidthMaxNarrow : panelWidthMax)) / widest);
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

      // where the row starts: the first item in the middle, or just inside the right/left edge
      function startScroll() {
        var w = sources[0].aspect * panelH;
        if (startEdge === 'right') return centerForIndex(0) - (W / 2 - w / 2 - panelGap);
        if (startEdge === 'left') return centerForIndex(0) + (W / 2 - w / 2 - panelGap);
        return centerForIndex(0);
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

      var scroll = startScroll();
      var target = scroll;
      var userInteracted = false;
      var velocity = 0;
      var prevScroll = 0;
      var scrollEnergy = 0;
      var lastInput = performance.now();
      var holdUntil = 0; // after a click, the drift waits until this time
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
        uBlueColor: { value: screenColor(lensColor) },
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

      function lensSize() {
        lensUniforms.uSizeX.value = (narrow ? lensWidthNarrow : lensWidth) * (W / H);
        lensUniforms.uSizeY.value = (narrow ? lensHeightNarrow : lensHeight) * (W / H);
      }

      // The lens is already in its place, but invisible on the empty canvas: its ring, glow,
      // refraction and colour split come up together with the images
      function lensStrength() {
        var f = introDone ? 1 : gsap.utils.clamp(0, 1, intro.value);
        lensUniforms.uBlueRing.value = lensRing * f;
        lensUniforms.uRimLine.value = lensRimLine * f;
        lensUniforms.uWhiteGlow.value = lensNova * f;
        lensUniforms.uDispersion.value = lensDispersion * f;
        lensUniforms.uZoom.value = lensZoom * f;
        lensUniforms.uRimTangential.value = lensRimWave * f;
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
        renderer.setClearColor(screenColor(backgroundOf(wrapper)), 1);
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

          // Intro: each image grows in place, from nothing to its full size, the middle one first
          var grow = 1;
          if (!introDone) {
            var ring = Math.round(Math.abs(centerX) / Math.max(1, totalWidth / total));
            grow = gsap.utils.clamp(0, 1, (intro.value - ring * introSpread) / Math.max(0.05, 1 - ring * introSpread));
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

      var focusState = false;
      function setFocus(on) { // the pointer rests on the centred panel
        on = !!on;
        if (on === focusState) return;
        focusState = on;
        if (on) wrapper.setAttribute('data-glass-carousel-focus', 'center');
        else wrapper.removeAttribute('data-glass-carousel-focus');
      }

      function hoverAt(x, y) {
        var hit = rectOf(x, y);
        setHover(hit !== null);
        setFocus(hit && centeredPanel && hit.poolIdx === centeredPanel.poolIdx);
      }

      function refreshHover() {
        if (!pointerInside || lastPointerType !== 'mouse') return;
        if (!Number.isFinite(lastPointerX)) return;
        hoverAt(lastPointerX, lastPointerY);
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
        hoverAt(e.clientX, e.clientY);
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
        if (dragPointerType === 'mouse') hoverAt(lastPointerX, lastPointerY);
        else { setHover(false); setFocus(false); }
      }

      function onEnter(e) {
        pointerInside = true;
        lastPointerType = e.pointerType || 'mouse';
      }

      function onLeave() {
        pointerInside = false;
        setHover(false);
        setFocus(false);
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
        holdUntil = performance.now() + clickHold * 1000; // you asked for this one: let it sit
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

          drifting = autoDrift > 0 && idle > driftResume * 1000 && now > holdUntil; // also during the intro: it moves from the start
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
        // the eases are "per frame at 60fps"; scale them by the real frame time so a slow
        // machine or a phone settles in the same half second as a fast one
        scroll += (target - scroll) * (1 - Math.pow(1 - follow, dt * 60));

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
        if (!introDone) lensStrength();

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
      // read-only peek for tooling: positions and state of the row (no behaviour depends on it)
      wrapper.glassCarousel = {
        get rects() { return panelRects.slice(); },
        get centered() { return centeredPanel; },
        get scroll() { return scroll; },
        get target() { return target; },
        get width() { return W; },
        get panel() { return panelH; },
        get aspects() { return sources.map(function (s) { return s.aspect; }); },
        get intro() { return { value: intro.value, done: introDone, started: introStarted }; }
      };
      bindTextures();
      showActive(0);
      lensSize();
      lensStrength();
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
  // BUTTONS — every page: the global button (.btn), the button lab's winner (06 "All three")
  // Webflow markup: a.btn[data-btn-alt="45 min · free"] > span.btn_in > span.btn_swap > span.btn_line > span.btn_t + span.btn_arrow
  // (.btn.is-secondary for the ghost one). Editors type one label; the second line is built here
  // from data-btn-alt. Hover is a class (.is-hover) set from pointer events, not CSS :hover, so it
  // stays scriptable (the Webflow class carries the glow and the border change).
  //   1. Magnetic: within 56px the button takes the pointer: scale 1.05, follows the pointer at .25
  //      of the offset (never more than 9px), the label at .1; it springs back on leaving. Only the
  //      nearest button on the page takes the pointer, so two never lean at once. Fine pointers only.
  //   2. Label swap: the label rolls up out of its mask, letter by letter, while the alt line rolls
  //      in from below; both roll back on release.
  //   3. The boil, .4s after activation, on the alt line only: every letter has three hand-placed
  //      poses and cycles through them at 9 fps, like a line traced three times. Off under
  //      prefers-reduced-motion.
  // =========================================================

  // =========================================================
  // BAND — the home opening on /home-copy: a single band of work sliding by in perspective.
  // Everything visible lives in the Designer: the fixed section [data-band] (the stage with the
  // band [data-band-rows]: a names row and a panel row, both Osmo marquees with real <video>
  // elements; the copy; the scroll line; the loader) and the spacer [data-band-spacer] that keeps
  // the page's scroll room, like the old hero. Styles, breakpoints and hover states are Webflow
  // styles. This adds the behaviour: clip tuning, one decoder per clip (the marquee clones every
  // panel), the pointer tilt, dragging, the loader, the opening sequence, and the fade-behind on scroll.
  // =========================================================
  function rdBand() {
    var hero = qs('[data-band]');
    var band = hero && qs('[data-band-rows]', hero);
    var stage = hero && qs('.band_stage', hero);
    if (!hero || !band) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var narrow = function () { return window.innerWidth < 992; };
    var copy = qs('.band_copy', hero), title = qs('.band_title', hero), eyebrow = qs('.band_eyebrow', hero);
    var curve = 0; // set below (the curve experiment)
    var buttons = qsa('.btn', copy || hero), scrollLine = qs('.band_scroll', hero), loader = qs('.band_loader', hero);
    var nav = [byId('FIXED_NAV'), qs('.burgermenu')].filter(Boolean);
    var hidden = false;

    // ---- clips: play every video once (the marquee clones the row after this; re-touching a running video makes it hiccup)
    function tune() {
      qsa('video', hero).forEach(function (v) {
        if (v.__tuned) return;
        v.__tuned = true;
        var rate = parseFloat(v.getAttribute('data-rate')) || 1.5;
        v.muted = true; v.loop = true; v.playsInline = true;
        var apply = function () { if (v.playbackRate !== rate) v.playbackRate = rate; };
        if (v.readyState >= 1) apply(); else v.addEventListener('loadedmetadata', apply, { once: true });
        if (v.paused && !hidden && !v.__off) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }
    tune(); setTimeout(tune, 0); setTimeout(tune, 1500); setTimeout(tune, 4000);

    // ---- one download and one decoder per clip: the clones' videos become canvases painted from the master video
    function dedupeClips() {
      var masters = {};
      qsa('video', hero).forEach(function (v) {
        var src = v.getAttribute('src');
        if (!masters[src]) { masters[src] = v; return; }
        var c = document.createElement('canvas');
        c.className = v.className; c.setAttribute('aria-hidden', 'true');
        c.width = 640; c.height = 627;
        v.parentNode.replaceChild(c, v);
        c.__master = masters[src];
        (masters[src].__canvases = masters[src].__canvases || []).push(c);
      });
      var all = Object.keys(masters).map(function (k) { return masters[k]; });
      var paintClones = function (m) {
        if (m.readyState < 2 || !m.__canvases) return;
        m.__canvases.forEach(function (c) {
          if (c.__vis === false) return; // off-screen clone: nothing to show
          if (c.width !== m.videoWidth) { c.width = m.videoWidth; c.height = m.videoHeight; }
          c.getContext('2d').drawImage(m, 0, 0);
        });
      };
      // ---- only what is on screen costs anything: a clip decodes while one of its panels (master or clone)
      // is near the viewport, and a clone is repainted only while it is on screen and only when the master
      // presents a new frame (requestVideoFrameCallback), not on every display refresh
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          var touched = [];
          entries.forEach(function (en) {
            var media = qs('.band_panel-media', en.target);
            if (!media) return;
            media.__vis = en.isIntersecting;
            var m = media.__master || media;
            if (touched.indexOf(m) < 0) touched.push(m);
          });
          touched.forEach(function (m) {
            var shown = (m.__vis !== false ? 1 : 0) + (m.__canvases || []).filter(function (c) { return c.__vis !== false; }).length;
            m.__off = shown === 0;
            if (m.__off) { if (!m.paused) m.pause(); }
            else if (m.paused && !hidden && m.__tuned) { paintClones(m); var p = m.play(); if (p && p.catch) p.catch(function () {}); }
          });
        }, { rootMargin: '5% 10%', threshold: 0 }); // a panel resumes ~150 px before its edge enters: 1.5 s of lead at the band's pace
        qsa('.band_panel', hero).forEach(function (p) { io.observe(p); });
      }
      var painters = all.filter(function (m) { return m.__canvases; });
      if (!painters.length) return;
      var rafOnes = [];
      painters.forEach(function (m) {
        if (!m.requestVideoFrameCallback) { rafOnes.push(m); return; }
        var arm = function () { m.requestVideoFrameCallback(function () { if (!hidden) paintClones(m); arm(); }); };
        arm(); // stays armed across pauses: it only fires when a frame is presented
        m.addEventListener('seeked', function () { if (!hidden) paintClones(m); }); // the restart at the reveal shows frame 0 on the clones too
      });
      if (rafOnes.length) (function paint() { if (!hidden) rafOnes.forEach(paintClones); requestAnimationFrame(paint); })();
    }
    setTimeout(dedupeClips, 0); // after initMarquees (rdGlobal, right after this) has cloned the rows

    // ---- focus: while the pointer rests on a panel its name chip shows and every other panel dims
    // (.is-dim, a Designer combo class), so the eye lands on one project; nothing lifts or moves.
    // Delegated, so the marquee's clones get it too.
    var dimOthers = function (p) { qsa('.band_panel', hero).forEach(function (q) { q.classList.toggle('is-dim', !!p && q !== p); }); };
    hero.addEventListener('mouseover', function (e) { var p = e.target.closest && e.target.closest('.band_panel'); if (p) { var l = qs('.band_panel-label', p); if (l) l.classList.add('is-on'); dimOthers(p); } });
    hero.addEventListener('mouseout', function (e) { var p = e.target.closest && e.target.closest('.band_panel'); if (p && !p.contains(e.relatedTarget)) { var l = qs('.band_panel-label', p); if (l) l.classList.remove('is-on'); dimOthers(null); } });

    // ---- the band tilts with the pointer: the Designer's transform is the resting pose; the script finds
    // its two angles in the stylesheet and adds a few degrees (±5° around x, ±3.5° around z). Fine pointers, wide screens.
    if (!reduced && window.matchMedia('(pointer: fine)').matches) {
      var base = null, tx = 0, tz = 0, gx = 0, gz = 0, raf = null;
      var rest = function () {
        var rules = [].slice.call(document.styleSheets).reduce(function (acc, sh) { try { return acc.concat([].slice.call(sh.cssRules || [])); } catch (e) { return acc; } }, []);
        var found = null;
        rules.forEach(function (r) {
          if (!r.selectorText || !/\.band_band(?![\w-])/.test(r.selectorText) || !r.style || !r.style.transform) return;
          if (r.parentRule && r.parentRule.conditionText && !window.matchMedia(r.parentRule.conditionText).matches) return;
          found = r.style.transform;
        });
        return found && /rotateX\(([-\d.]+)deg\)/.test(found) ? { str: found, x: +RegExp.$1, z: /rotateZ\(([-\d.]+)deg\)/.test(found) ? +RegExp.$1 : 0 } : null;
      };
      var settle = function () {
        tx += (gx - tx) * 0.05; tz += (gz - tz) * 0.05;
        if (base) band.style.transform = base.str.replace(/rotateX\([-\d.]+deg\)/, 'rotateX(' + (base.x + tx).toFixed(3) + 'deg)').replace(/rotateZ\([-\d.]+deg\)/, 'rotateZ(' + (base.z + tz).toFixed(3) + 'deg)');
        raf = (Math.abs(gx - tx) > 0.002 || Math.abs(gz - tz) > 0.002) ? requestAnimationFrame(settle) : null;
      };
      hero.addEventListener('mousemove', function (e) {
        if (narrow()) return;
        if (!base) base = rest();
        var r = hero.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        gx = -ny * 10; gz = nx * 7;
        if (!raf) raf = requestAnimationFrame(settle);
      });
      hero.addEventListener('mouseleave', function () { gx = 0; gz = 0; if (!raf) raf = requestAnimationFrame(settle); });
      window.addEventListener('resize', function () { base = null; band.style.transform = ''; });
    }

    // ---- drag the band: a grab hand, the rows follow the pointer along the band, a flick keeps going
    // and dies out; while held the rows' own motion eases to a stop and picks up after.
    if (stage) {
      var dragRows = null, axis = null, lastX = 0, lastY = 0, lastT = 0, vel = 0, inertia = null, dragging = false;
      var rowsOf = function () {
        return qsa('.band_row:not(.is-names)', hero).map(function (r) { // the names strip keeps its own pace
          var list = qs('[data-marquee-collection-target]', r);
          var tween = (window.gsap && list) ? gsap.getTweensOf(list).filter(function (t) { return t.duration() > 0; })[0] : null;
          if (tween && r.__base == null) r.__base = tween.timeScale() || 1;
          return { el: r, tween: tween, width: list ? list.offsetWidth : 0 };
        });
      };
      var rowAxis = function (px, py) {
        var list = qs('.band_row:not(.is-names) .band_row-list', hero);
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
      var shift = function (px) {
        dragRows.forEach(function (r) {
          if (!r.tween || !r.width) return;
          var p = r.tween.progress() - px / r.width;
          r.tween.progress(p - Math.floor(p));
        });
      };
      var hold = function (on) { // no lift under a moving hand (the curve writes its own transforms)
        if (!curve) qsa('.band_panel', hero).forEach(function (p) { p.style.transform = on ? 'none' : ''; });
        hero.classList.toggle('is-dragging', on);
      };
      var stop = function () {
        if (!dragging) return;
        dragging = false; hold(false);
        var v = Math.max(-3, Math.min(3, vel)), prev = performance.now();
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
        dragging = true; hold(true);
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

    // ---- where the band opens: the first panel a third in from the left, the second beside it.
    // The marquee is a looping tween on the row's list; its progress is scanned for that spot.
    var startAt = function () {
      var list = qs('.band_row:not(.is-names) [data-marquee-collection-target]', hero);
      var tween = (window.gsap && list) ? gsap.getTweensOf(list).filter(function (t) { return t.duration() > 0; })[0] : null;
      if (!tween) return false;
      var first = qs('.band_panel', list), want = first && first.getAttribute('data-band-name');
      if (!want) return true;
      var tx = window.innerWidth * 0.38, ty = window.innerHeight * 0.55, best = null;
      var panels = qsa('.band_panel', list.parentNode).filter(function (p) { return p.getAttribute('data-band-name') === want; });
      for (var p = 0; p < 1; p += 0.02) {
        tween.progress(p);
        panels.forEach(function (el) { var r = el.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - tx, r.top + r.height / 2 - ty); if (!best || d < best.d) best = { d: d, p: p }; });
      }
      tween.progress(best ? best.p : 0.5);
      return true;
    };

    // ---- the old home's move: the section scrolls away with the page (the Designer keeps it in flow, not fixed),
    // and the moment the visitor scrolls the copy fades and blurs away in place, the scroll prompt even sooner.
    // A page that still pairs a fixed hero with a [data-band-spacer] gets the same, measured on the spacer.
    // Off-screen, the hero hides and its clips pause until the visitor comes back.
    var spacer = qs('[data-band-spacer]'), scrollRef = spacer || hero;
    // "See the work" points at #work: the section after the hero answers to it, and the hero's in-page
    // links scroll with Lenis (the Webflow jQuery scroller would fight it)
    var next = qs('[data-band-next]');
    if (next && !next.id && !byId('work')) next.id = 'work';
    hero.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var target = byId(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault(); e.stopPropagation();
      if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(target, { duration: 1.4 });
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    var fadeBehind = function () {
      if (!window.ScrollTrigger) return;
      var quick = function () { return '+=' + Math.round(window.innerHeight * 0.18); }; // gone within the first fifth of a screen
      if (copy) gsap.to(copy, { opacity: 0, filter: 'blur(10px)', y: -18, ease: 'power1.out', scrollTrigger: { trigger: scrollRef, start: 'top top', end: quick, scrub: true, invalidateOnRefresh: true } });
      // the scroll line is still fading in (its CSS entrance runs 1.6-2.8 s after the opening), so its
      // scrub waits for that to end, then takes over without the transition fighting every scroll step
      if (scrollLine) setTimeout(function () {
        scrollLine.style.transition = 'none';
        gsap.fromTo(scrollLine, { opacity: 1 }, { opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: scrollRef, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 0.07); }, scrub: true, invalidateOnRefresh: true } }); // the scroll prompt is gone well before the copy
      }, 1100);
      ScrollTrigger.create({
        trigger: scrollRef, start: 'top top', end: 'bottom top',
        onLeave: function () { hidden = true; hero.style.visibility = 'hidden'; qsa('video', hero).forEach(function (v) { v.pause(); }); },
        onEnterBack: function () { hidden = false; hero.style.visibility = ''; qsa('video', hero).forEach(function (v) { if (v.paused && !v.__off) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }); }
      });
    };

    // ---- the curve (experiment): with ?curve=N (or data-band-curve="N" on the section) the panels
    // leave the straight line by N degrees per panel of distance from the band's centre, each with its own
    // perspective(), so the band stays one flat layer. ?flat=F keeps the middle F panels either side of the
    // centre straight, so only the ends bend. ?bend= picks the shape (or data-band-bend):
    //   cyl   (default) the ends turn and go back, like a band over a drum
    //   flare the ends turn and come forward, towards the camera (capped well short of it)
    //   s     one end goes back and the other comes forward: an S in depth
    //   plane the band bends within its own plane, like an S drawn on the table
    // A negative N flips the direction of whichever shape.
    curve = parseFloat((/[?&]curve=(-?[\d.]+)/.exec(location.search) || [])[1]);
    if (isNaN(curve)) curve = parseFloat(hero.getAttribute('data-band-curve')) || 0;
    var flat = parseFloat((/[?&]flat=([\d.]+)/.exec(location.search) || [])[1]);
    if (isNaN(flat)) flat = parseFloat(hero.getAttribute('data-band-flat')) || 0;
    var bendMode = (/[?&]bend=(\w+)/.exec(location.search) || [])[1] || hero.getAttribute('data-band-bend') || 'cyl';
    // ?p3d=1 (or data-band-3d): the band keeps its children in 3D (transform-style: preserve-3d on the band in
    // the Designer), so the panels really leave the band's plane under the stage's own perspective; the
    // per-panel perspective() is then left out
    var p3d = /[?&]p3d=1/.test(location.search) || hero.hasAttribute('data-band-3d');
    if (p3d && curve) band.style.transformStyle = 'preserve-3d';
    if (curve && !reduced) {
      var crow = qs('.band_row:not(.is-names)', hero), cscroll = crow && qs('[data-marquee-scroll-target]', crow);
      var persp = 1400, sign = curve < 0 ? -1 : 1, step = Math.abs(curve), zCap = persp * 0.35;
      var bend = function () {
        if (cscroll && !hidden && !narrow()) {
          var center = band.offsetWidth / 2, sx = parseFloat(gsap.getProperty(cscroll, 'x')) || 0;
          qsa('[data-marquee-collection-target]', crow).forEach(function (list) {
            var lx = list.offsetLeft + (parseFloat(gsap.getProperty(list, 'xPercent')) || 0) / 100 * list.offsetWidth + sx;
            qsa('.band_panel', list).forEach(function (pnl) {
              var pitch = pnl.offsetWidth * 1.0625;
              var d = (lx + pnl.offsetLeft + pnl.offsetWidth / 2 - center) / pitch, dir = d < 0 ? -1 : 1;
              var u = dir * Math.max(0, Math.abs(d) - flat);
              var theta = Math.max(-70, Math.min(70, u * step)), rad = theta * Math.PI / 180;
              var R = pitch / Math.sin(step * Math.PI / 180), arc = R * (1 - Math.cos(rad)), tf;
              if (bendMode === 'flare') tf = 'translateZ(' + Math.min(arc, zCap).toFixed(1) + 'px) rotateY(' + (sign * theta).toFixed(2) + 'deg)';
              else if (bendMode === 's') tf = 'translateZ(' + (dir * sign * Math.min(arc, zCap)).toFixed(1) + 'px) rotateY(' + (-theta).toFixed(2) + 'deg)';
              else if (bendMode === 'plane') tf = 'translateY(' + (-dir * sign * arc).toFixed(1) + 'px) rotateZ(' + (-sign * theta * 0.5).toFixed(2) + 'deg)';
              else tf = 'translateZ(' + (-arc).toFixed(1) + 'px) rotateY(' + (-sign * theta).toFixed(2) + 'deg)';
              pnl.style.transition = 'box-shadow .6s';
              pnl.style.transform = (p3d ? '' : 'perspective(' + persp + 'px) ') + tf;
            });
          });
        }
        requestAnimationFrame(bend);
      };
      requestAnimationFrame(bend);
    }

    // ---- the opening, in order: the band rises, the title letters come up like the old hero,
    // the eyebrow and the buttons follow, the scroll line, and last the logo and the burger.
    nav.forEach(function (el) { gsap.set(el, { opacity: 0 }); });
    var opened = false;
    var open = function () {
      if (opened) return; opened = true;
      // every clip starts from its first frame as the band reveals, so the visitor sees each opening
      // (Echo's own loader, say) instead of whatever was playing behind the black
      qsa('video', hero).forEach(function (v) { try { v.currentTime = 0; } catch (e) {} if (v.paused && !hidden && !v.__off) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
      [stage, copy, loader].forEach(function (el) { if (el) el.classList.add('is-ready'); });
      if (loader) setTimeout(function () { loader.remove(); }, 1200);
      var done = function () {
        if (scrollLine) scrollLine.classList.add('is-ready');
        nav.forEach(function (el) { gsap.to(el, { opacity: 1, duration: 0.9, ease: 'power2.out', clearProps: 'opacity' }); });
        // the reveal transitions have run; hand the elements to the scroll fade
        setTimeout(function () { if (copy) copy.style.transition = 'none'; fadeBehind(); }, 1900);
      };
      if (reduced || !window.gsap || typeof SplitText === 'undefined') return done();
      var chars = title ? split(title).chars : [];
      gsap.timeline({ delay: 0.3, onComplete: done })
        .from(chars, heroCharsIn(), 0)
        .from(eyebrow, { opacity: 0, y: 8, duration: 0.8, ease: 'expo.out' }, 0.35)
        .from(buttons, { opacity: 0, y: 14, duration: 0.9, ease: 'expo.out', stagger: 0.08, clearProps: 'opacity,transform' }, 0.55);
    };
    var ready = function () {
      var tries = 0;
      (function go() { if (!startAt() && tries++ < 90) return requestAnimationFrame(go); open(); })();
    };
    if (!loader) { ready(); return; }
    var num = qs('.band_loader-n', loader), bar = qs('.band_loader-fill', loader);
    var t0 = performance.now(), shown = 0;
    var readiness = function () {
      var seen = {}, total = 0, done = 0;
      qsa('.band_panel-media', hero).forEach(function (m) {
        if (m.tagName === 'CANVAS') return;
        var key = m.currentSrc || m.getAttribute('src');
        var ok = (m.tagName === 'VIDEO') ? m.readyState >= 3 : (m.complete && m.naturalWidth > 0);
        if (!seen[key]) seen[key] = { ok: ok }; else if (ok) seen[key].ok = true;
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

  function rdButtons() {
    var buttons = qsa('.btn');
    if (!buttons.length) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var rnd = gsap.utils.random;
    var cap = gsap.utils.clamp(-9, 9); // never into the neighbour
    var REACH = 56;
    var FPS = 9; // the old stop-motion button ran 4 frames in .45 s

    function em(el, n) { return n * parseFloat(getComputedStyle(el).fontSize); }

    // One span per character, so each letter can move on its own. Returns the spans.
    function splitChars(el) {
      var frag = document.createDocumentFragment();
      var chars = Array.from(el.textContent).map(function (ch) {
        var s = document.createElement('span');
        s.className = 'btn_ch';
        s.style.display = 'inline-block';
        s.textContent = ch === ' ' ? ' ' : ch; // a plain space in its own span would collapse to nothing
        frag.appendChild(s);
        return s;
      });
      el.textContent = '';
      el.appendChild(frag);
      return chars;
    }

    // Calls fn(frame) at a fixed frame rate off the GSAP ticker: the stop-motion clock
    function stepper(fps, fn) {
      var running = false, last = -1, t0 = 0;
      function tick() {
        var f = Math.floor((gsap.ticker.time - t0) * fps);
        if (f !== last) { last = f; fn(f); }
      }
      return {
        start: function () { if (running || reduce) return; running = true; last = -1; t0 = gsap.ticker.time; gsap.ticker.add(tick); },
        stop: function () { if (!running) return false; running = false; gsap.ticker.remove(tick); return true; }
      };
    }

    // The boil: every letter has three poses and cycles through them. Small moves, so it breathes
    // instead of shaking. Nothing tweens between frames: each one is set, like a drawn frame.
    function boil(chars) {
      var poses = chars.map(function () {
        return [0, 1, 2].map(function () { return { x: rnd(-0.6, 0.6), y: rnd(-0.7, 0.7), rotation: rnd(-3, 3) }; });
      });
      gsap.set(chars, { transformOrigin: '50% 55%' });
      var step = stepper(FPS, function (f) {
        chars.forEach(function (c, i) { gsap.set(c, poses[i][(f + i) % 3]); });
      });
      return {
        start: step.start,
        stop: function () {
          if (step.stop()) gsap.to(chars, { x: 0, y: 0, rotation: 0, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
        }
      };
    }

    // The swap: line A rolls up out of the mask, line B rolls in from below (and back).
    // Line B is a copy of line A with the alt label; both get one span per character.
    function swap(lineA, alt) {
      var lineB = lineA.cloneNode(true);
      lineB.classList.add('is-alt');
      lineB.setAttribute('aria-hidden', 'true');
      qs('.btn_t', lineB).textContent = alt;
      lineA.parentNode.appendChild(lineB);
      var a = splitChars(qs('.btn_t', lineA)).concat(qsa('.btn_arrow', lineA));
      var bChars = splitChars(qs('.btn_t', lineB));
      var b = bChars.concat(qsa('.btn_arrow', lineB));
      gsap.set(b, { yPercent: 120 });
      return {
        chars: bChars,
        to: function (showAlt) {
          gsap.to(a, { yPercent: showAlt ? -120 : 0, duration: 0.55, ease: 'expo.out', stagger: 0.012, overwrite: 'auto' });
          gsap.to(b, { yPercent: showAlt ? 0 : 120, duration: 0.55, ease: 'expo.out', stagger: 0.012, overwrite: 'auto' });
        }
      };
    }

    // The magnet: within the reach the button follows the pointer, the label a little more.
    // activate / release fire when the button takes and loses the pointer.
    var magnets = [];

    function magnet(btn, o) {
      var inner = qs('.btn_in', btn);
      var active = false;
      var m = {
        el: btn,
        visible: true,
        measure: function (e) {
          var r = btn.getBoundingClientRect();
          // the rect moves with the button: take the current offset out again
          var cx = r.left + r.width / 2 - (gsap.getProperty(btn, 'x') || 0);
          var cy = r.top + r.height / 2 - (gsap.getProperty(btn, 'y') || 0);
          var dx = e.clientX - cx, dy = e.clientY - cy;
          var w = btn.offsetWidth / 2 + REACH, h = btn.offsetHeight / 2 + REACH;
          return { inside: Math.abs(dx) <= w && Math.abs(dy) <= h, dist: Math.max(Math.abs(dx) / w, Math.abs(dy) / h), dx: dx, dy: dy };
        },
        pull: function (d) {
          if (!active) {
            active = true;
            btn.classList.add('is-hover');
            gsap.to(btn, { scale: 1.05, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
            o.activate();
          }
          gsap.to(btn, { x: cap(d.dx * 0.25), y: cap(d.dy * 0.25), duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
          if (inner) gsap.to(inner, { x: cap(d.dx * 0.1), y: cap(d.dy * 0.1), duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
        },
        release: function () {
          if (!active) return;
          active = false;
          btn.classList.remove('is-hover');
          gsap.to(btn, { x: 0, y: 0, scale: 1, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
          if (inner) gsap.to(inner, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
          o.release();
        },
        isActive: function () { return active; }
      };
      magnets.push(m);
      return m;
    }

    // The press: down to 1 (from the hover 1.05), then a bounce back up
    function press(btn, m) {
      var down = false;
      btn.addEventListener('pointerdown', function () {
        down = true;
        gsap.to(btn, { scale: m.isActive() ? 1 : 0.97, duration: 0.15, ease: 'power2.out', overwrite: 'auto' });
      });
      function up() {
        if (!down) return;
        down = false;
        gsap.to(btn, { scale: m.isActive() ? 1.05 : 1, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' });
      }
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }

    buttons.forEach(function (btn) {
      var lineA = qs('.btn_line', btn);
      var alt = btn.getAttribute('data-btn-alt');
      var s = lineA && alt && qs('.btn_t', lineA) ? swap(lineA, alt) : null;
      var b = s ? boil(s.chars) : null;
      var arrows = qsa('.btn_arrow', btn); // after the swap built line B, so both arrows nudge
      var downs = arrows.filter(function (a) { return /\u2193/.test(a.textContent); }); // a down arrow nudges down, not right
      var sides = arrows.filter(function (a) { return downs.indexOf(a) < 0; });
      var timer = null;
      var m = magnet(btn, {
        activate: function () {
          if (sides.length) gsap.to(sides, { x: em(btn, 0.35), duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
          if (downs.length) gsap.to(downs, { y: em(btn, 0.3), duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
          if (s) s.to(true);
          if (b) timer = gsap.delayedCall(0.4, b.start);
        },
        release: function () {
          if (timer) timer.kill();
          if (b) b.stop();
          if (s) s.to(false);
          if (arrows.length) gsap.to(arrows, { x: 0, y: 0, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
        }
      });
      press(btn, m);
    });

    if (!finePointer) return; // touch: the press only; the magnet needs a pointer that hovers

    // One listener for the page: the nearest button within reach takes the pointer, the rest let go
    document.addEventListener('pointermove', function (e) {
      var nearest = null, best = Infinity;
      magnets.forEach(function (m) {
        m.d = m.visible ? m.measure(e) : null;
        if (m.d && m.d.inside && m.d.dist < best) { best = m.d.dist; nearest = m; }
      });
      magnets.forEach(function (m) { m === nearest ? m.pull(m.d) : m.release(); });
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () {
      magnets.forEach(function (m) { m.release(); });
    });

    // Buttons off screen are not measured on every move
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          magnets.forEach(function (m) {
            if (m.el !== entry.target) return;
            m.visible = entry.isIntersecting;
            if (!m.visible) m.release();
          });
        });
      }, { rootMargin: REACH + 'px' });
      magnets.forEach(function (m) { io.observe(m.el); });
    }
  }

  // =========================================================
  // SCROLL RULER — blog posts (/post/…): Osmo Supply "Scroll Ruler" (docs/osmo/scroll-ruler.md)
  // A fixed ruler on the left that shows how far you are through the article. Its parts are
  // the rich text's H2s, its labels a short version of their text.
  // initScrollRuler() below is Osmo's code as Osmo wrote it; ours is the rest of this section:
  // the markup and theme, naming the H2s, hiding the labels where they would cover the text,
  // and fading the ruler out before and after the article.
  // =========================================================

  // Osmo's markup, unchanged. If the Blog posts template ever gets it as an embed, that one is used.
  var SCROLL_RULER_HTML =
    '<nav data-scroll-ruler-init data-scroll-ruler-parts="[data-scroll-ruler-name]" aria-label="Page progress" class="scroll-ruler">' +
      '<div data-scroll-ruler-list aria-hidden="true" class="scroll-ruler__list">' +
        '<div data-scroll-ruler-tick class="scroll-ruler__tick"></div>' +
      '</div>' +
      '<div data-scroll-ruler-labels class="scroll-ruler__labels">' +
        '<button data-scroll-ruler-label type="button" class="scroll-ruler__label">Label</button>' +
      '</div>' +
    '</nav>';

  // Osmo's CSS, with RM Mono in place of Haffer Mono. The site's theme comes after it.
  var SCROLL_RULER_CSS = [
    '.scroll-ruler { --scroll-ruler-color: #f2f2f2; --scroll-ruler-accent: #ff5a36; z-index: 50; color: var(--scroll-ruler-color); padding-left: 1.25em; padding-right: 2.5em; position: fixed; top: 20svh; bottom: 20svh; left: 0; cursor: pointer; touch-action: manipulation; user-select: none; transition: opacity 0.6s ease; }',
    '.scroll-ruler[data-scroll-ruler-status="idle"] { opacity: 0.4; }',
    '.scroll-ruler__list { flex-direction: column; justify-content: space-between; align-items: flex-start; height: 100%; display: flex; }',
    '.scroll-ruler__tick { opacity: 0.3; transform-origin: 0%; background-color: currentColor; width: 0.75em; height: 1px; }',
    '.scroll-ruler__tick[data-scroll-ruler-size="mid"] { width: 1.125em; }',
    '.scroll-ruler__tick[data-scroll-ruler-size="major"] { width: 1.5em; }',
    '.scroll-ruler__tick[data-scroll-ruler-status="passed"] { opacity: 0.9; }',
    '.scroll-ruler__tick[data-scroll-ruler-status="current"] { opacity: 1; background-color: var(--scroll-ruler-accent); }',
    '.scroll-ruler__labels { pointer-events: none; position: absolute; inset: 0%; }',
    '.scroll-ruler__label { pointer-events: auto; opacity: 0.45; color: inherit; white-space: nowrap; background-color: transparent; border-style: none; padding: 0.375em 0.5em; font-family: var(--font--rm-mono, "Rm Mono", monospace); font-size: 0.6875em; line-height: 1; letter-spacing: 0.04em; text-transform: uppercase; position: absolute; top: 0; left: 4.25em; cursor: pointer; }',
    '.scroll-ruler__label:hover { opacity: 1; }',
    '.scroll-ruler__label:focus-visible { opacity: 1; outline: 1px solid currentColor; outline-offset: 0.125em; }',
    '.scroll-ruler__label[data-scroll-ruler-status="active"] { opacity: 1; color: var(--scroll-ruler-accent); }',
    '@media (max-width: 767px) { .scroll-ruler__labels { display: none; } }',

    // ---- the site's theme
    // Like the fixed nav (.mix_blend), the ruler is white with mix-blend-mode: difference, so it reads
    // dark on the beige page and light over a dark screenshot. Difference also turns the accent around:
    // #00a19a over the beige (#f8f5ee) comes out as the link red (#ff5454); over black it shows as itself.
    '.scroll-ruler { --scroll-ruler-color: #fff; --scroll-ruler-accent: #00a19a; mix-blend-mode: difference; }',
    // a bit taller and tighter labels, so short sections (a list under an H2) still get their label:
    // Osmo hides a label that would touch the one above it
    '.scroll-ruler { top: 15svh; bottom: 15svh; }',
    '.scroll-ruler__label { padding-top: 0.25em; padding-bottom: 0.25em; }',
    // labels: only the section you're in shows; the others appear while the mouse is on the ruler or
    // its labels (or a label has keyboard focus). A hidden label still answers the mouse, so moving from
    // the ticks to a label never drops the reveal on the way.
    '.scroll-ruler__label { opacity: 0; transition: opacity 0.35s ease, color 0.35s ease; }',
    // a label on its way out waits a moment, so a diagonal move from the ticks to a label doesn't flicker
    '.scroll-ruler__label:not([data-scroll-ruler-status="active"]) { transition-delay: 0.2s, 0s; }',
    '.scroll-ruler:hover .scroll-ruler__label, .scroll-ruler:has(.scroll-ruler__label:focus-visible) .scroll-ruler__label { transition-delay: 0s; }',
    '.scroll-ruler:hover .scroll-ruler__label:not([data-scroll-ruler-status="active"]):not(:hover):not(:focus-visible),' +
    '.scroll-ruler:has(.scroll-ruler__label:focus-visible) .scroll-ruler__label:not([data-scroll-ruler-status="active"]):not(:hover):not(:focus-visible) { opacity: 0.45; }',
    // a label Osmo left out because its section is short still shows (fading in) while you're in that
    // section, and a neighbour it would touch fades aside. Not during a reveal: then Osmo's own tidy
    // layout shows, so a label never vanishes from under the mouse or the keyboard focus.
    '.scroll-ruler:not(:hover):not(:has(.scroll-ruler__label:focus)) .scroll-ruler__label[hidden][data-scroll-ruler-status="active"] { display: block; }',
    '@starting-style { .scroll-ruler__label[hidden][data-scroll-ruler-status="active"] { opacity: 0; } }',
    '.scroll-ruler:not(:hover):not(:has(.scroll-ruler__label:focus)) .scroll-ruler__label.is-yielding { opacity: 0 !important; pointer-events: none; }',
    // the end mark's label: the mark only gives the last section its length on the ruler
    '.scroll-ruler__label:last-child { display: none !important; }',
    // too narrow for the labels next to the text: ticks only (they stay in the layout, so Osmo can still measure them)
    '.scroll-ruler.is-compact .scroll-ruler__labels { visibility: hidden; }',
    // phones: the text starts 5vw (about 19px) from the edge, so the ticks get small enough to stay in
    // that gutter, also when the wave stretches them (Osmo sizes everything in em)
    '@media (max-width: 767px) { .scroll-ruler { font-size: 4.5px; padding-left: 4px; padding-right: 0; } }',
    // on touch screens and narrow windows the ruler sits over the text, so it only shows, it doesn't take taps
    '@media (hover: none), (max-width: 991px) { .scroll-ruler, .scroll-ruler__label { pointer-events: none; } }',
    // before and after the article (the intro, the newsletter, the footer) it is gone, also for the
    // keyboard (rdScrollRuler makes it inert meanwhile)
    '.scroll-ruler.is-out { opacity: 0; pointer-events: none; }',
    '.scroll-ruler.is-out .scroll-ruler__label { pointer-events: none; }',
    // the ruler takes over from the old red progress bar along the top
    '.scroll_progress_indicatror { display: none; }'
  ].join('\n');

  // Short labels from the H2s: "Webflow vs WordPress: the comparison" → "Webflow vs WordPress",
  // "Which one should you choose?" → "Which one", "So, is Webflow good for SEO?" → "Is Webflow good for SEO"
  var LABEL_MAX = 26; // characters, about what fits in the margin next to the text
  function scrollRulerLabel(text) {
    var STOP = /^(a|an|the|to|of|for|and|or|in|on|at|by|with|from|your|you|is|are|should|can|de|het|een|van|voor|en|op|met|je|jouw|zijn)$/i;
    var t = text.replace(/\s+/g, ' ').trim();
    t = t.replace(/^\S+,\s+/, function (lead) { return /\s/.test(lead.trim()) ? lead : ''; }); // a lone "So," in front goes
    // only what comes before a colon, question mark, comma, dash or bracket, or a full stop that ends
    // a sentence (not the one in "vs." or "2.0")
    var head = t.split(/[:?!,—–(]|(?<!\bvs)\.(?=\s|$)/i)[0].trim() || t;
    var words = head.split(' '), out = [];
    for (var i = 0; i < words.length; i++) {
      if (out.length && (out.join(' ') + ' ' + words[i]).length > LABEL_MAX) break;
      out.push(words[i]);
    }
    if (out.length < words.length) {
      while (out.length > 1 && STOP.test(out[out.length - 1])) out.pop(); // no "Which one should you"
    }
    var label = out.join(' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function rdScrollRuler() {
    // Only on staging and localhost until Rimbo gives the go: live and staging share the footer
    // tag, so a live publish must not bring it along by accident. Remove this line to go live.
    if (!/\.webflow\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) return;
    if (window.Webflow && Webflow.env && Webflow.env('editor') !== undefined) return;

    var article = qs('.richtextstyling');
    // "{skip}" typed in an H2 keeps it off the ruler (the marker itself is taken out of the heading).
    // Same marker as Osmo's Table of Contents; such a heading also gets data-toc-ignore, so a TOC skips it too.
    var headings = article ? qsa('h2', article).filter(function (h) {
      if (h.textContent.indexOf('{skip}') !== -1) {
        h.normalize();
        var walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT), node, found = false;
        while ((node = walker.nextNode())) {
          if (node.textContent.indexOf('{skip}') === -1) continue; // other words keep their spaces
          node.textContent = node.textContent.replace(/\s*\{skip\}/, '');
          found = true;
        }
        if (!found) h.textContent = h.textContent.replace(/\s*\{skip\}/, ''); // marker split over bold or a link
        h.setAttribute('data-toc-ignore', '');
        return false;
      }
      return h.textContent.trim();
    }) : [];
    if (headings.length < 2) return; // nothing to divide

    // Rich text can't get attributes in the Designer, so the H2s get their names here
    headings.forEach(function (h) {
      if (!h.hasAttribute('data-scroll-ruler-name')) h.setAttribute('data-scroll-ruler-name', scrollRulerLabel(h.innerText || h.textContent));
    });

    // Osmo's ruler ends where the last part starts, so the last section never got its turn. An empty
    // end mark right after the article is one more part (its label is hidden), so the ruler runs to the
    // end of the article
    var box = article.closest('.richtextbox') || article;
    var endMark = document.createElement('div');
    endMark.setAttribute('data-scroll-ruler-name', '');
    endMark.setAttribute('aria-hidden', 'true');
    endMark.style.cssText = 'display: block; height: 0;';
    box.parentNode.insertBefore(endMark, box.nextSibling);
    var parts = headings.concat(endMark);

    if (!qs('#rd-scroll-ruler-css')) {
      var style = document.createElement('style');
      style.id = 'rd-scroll-ruler-css';
      style.textContent = SCROLL_RULER_CSS;
      document.head.appendChild(style);
    }
    var root = qs('[data-scroll-ruler-init]');
    if (!root) {
      document.body.insertAdjacentHTML('beforeend', SCROLL_RULER_HTML);
      root = qs('[data-scroll-ruler-init]');
    }
    root.classList.add('is-out'); // fades in when the article comes on screen
    root.inert = true;

    initScrollRuler();

    // Labels only where they fit between the screen edge and the text (with room for the wave
    // that pushes them right); otherwise just the ticks
    var labelWrap = qs('[data-scroll-ruler-labels]', root);
    function fitLabels() {
      root.classList.remove('is-compact');
      var right = 0;
      qsa('[data-scroll-ruler-label]', labelWrap).forEach(function (l) {
        if (!l.hidden) right = Math.max(right, l.offsetLeft + l.offsetWidth);
      });
      var room = headings[0].getBoundingClientRect().left;
      if (!right || right + 64 > room) root.classList.add('is-compact');
    }
    fitLabels();
    var fitTimer;
    window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitLabels, 150); });

    // Osmo leaves out a label that would touch the one above it and never places it. Those get
    // their place here (same sums as Osmo's measure()), so the section you're in always has its label.
    var ticks = qsa('[data-scroll-ruler-tick]', root);
    var labels = qsa('[data-scroll-ruler-label]', labelWrap).slice(0, headings.length); // without the end mark's
    function partStarts() { // where each part starts along the ruler, 0 to 1 (Osmo's measure() sums)
      var sy = window.scrollY, last = parts.length - 1;
      var tops = parts.map(function (h) { return h.getBoundingClientRect().top + sy; });
      var end = parts[last].getBoundingClientRect().bottom + sy;
      var start = Math.max(tops[0], window.innerHeight / 2);
      var length = Math.max(Math.min(end, document.documentElement.scrollHeight - window.innerHeight / 2) - start, 1);
      return tops.map(function (top) { return gsap.utils.clamp(0, 1, (top - start) / length); });
    }
    function placeLeftOut() {
      var starts = partStarts();
      labels.forEach(function (l, i) {
        if (!l.hidden) return;
        var tick = ticks[Math.round(starts[i] * (ticks.length - 1))];
        if (tick) gsap.set(l, { y: tick.offsetTop + tick.offsetHeight / 2, yPercent: -50 });
      });
      makeRoom();
    }
    // while a left-out label is the active one, the labels it would touch are hidden
    function makeRoom() {
      var active = labels.filter(function (l) { return l.getAttribute('data-scroll-ruler-status') === 'active'; })[0];
      var shown = labels.filter(function (l) { return !l.hidden; })[0];
      var reach = (shown ? shown.offsetHeight : 16) * 1.1;
      var y = active && active.hidden ? gsap.getProperty(active, 'y') : null;
      labels.forEach(function (l) {
        l.classList.toggle('is-yielding', y !== null && l !== active && !l.hidden && Math.abs(gsap.getProperty(l, 'y') - y) < reach);
      });
    }
    placeLeftOut();
    // Clicks on the ruler, seen before Osmo's own handlers (its labels stop the click from bubbling):
    // - a mouse click leaves the label focused, which keeps the ruler awake (Osmo counts focus as
    //   activity), so a clicked label lets go of focus; keyboard users keep theirs
    // - lazy images above the target can still load while the page glides there and push the heading
    //   down, so once the scroll has settled, a jump that came up short goes the rest of the way
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var list = qs('[data-scroll-ruler-list]', root);
    root.addEventListener('click', function (e) {
      var label = e.target.closest ? e.target.closest('[data-scroll-ruler-label]') : null;
      if (label && e.detail) label.blur();
      var index = label ? labels.indexOf(label) : partAt((e.clientY - list.getBoundingClientRect().top) / list.getBoundingClientRect().height);
      if (index >= 0 && parts[index]) settleOn(parts[index], 2);
    }, true);
    function partAt(position) { // the part Osmo's findPart() picks for a click on the ticks
      var starts = partStarts(), found = 0;
      starts.forEach(function (start, i) { if (start <= gsap.utils.clamp(0, 1, position)) found = i; });
      return found;
    }
    function settleOn(heading, corrections) {
      var last = -1, still = 0, frames = 0, cancelled = false;
      function cancel() { cancelled = true; }
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, cancel, { once: true, passive: true }); });
      requestAnimationFrame(function check() {
        if (cancelled) return;
        var y = window.scrollY;
        still = y === last ? still + 1 : 0; last = y;
        if (still < 8 && ++frames < 600) return requestAnimationFrame(check); // until it has stood still for ~8 frames
        ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.removeEventListener(t, cancel); });
        var off = heading.getBoundingClientRect().top;
        if (Math.abs(off) > 2 && corrections > 0) {
          window.scrollTo({ top: y + off, behavior: reduce.matches ? 'auto' : 'smooth' });
          settleOn(heading, corrections - 1);
        }
      });
    }
    new MutationObserver(makeRoom).observe(labelWrap, { subtree: true, attributes: true, attributeFilter: ['data-scroll-ruler-status'] });

    // On screen only while the article is: in once its top is in view, out once its end has passed
    // 60% down, as the ruler reaches its end, so it never stays over the newsletter or footer
    var st = null;
    function setOut(out) { root.classList.toggle('is-out', out); root.inert = out; }
    if (typeof ScrollTrigger !== 'undefined') {
      st = ScrollTrigger.create({
        trigger: box,
        start: 'top bottom',
        end: 'bottom 60%',
        onToggle: function (self) { setOut(!self.isActive); }
      });
    } else {
      setOut(false);
    }

    // After the layout changes (lazy images loading, a window resize, also one that only changes the
    // height): re-place the left-out labels once Osmo has re-measured (it waits 100 ms) and move the
    // fade-out to where the article now ends
    var placeTimer;
    var relayout = new ResizeObserver(function () {
      clearTimeout(placeTimer);
      placeTimer = setTimeout(function () { placeLeftOut(); if (st) st.refresh(); }, 250);
    });
    relayout.observe(document.body);
    relayout.observe(root);

    // Osmo's code, as it came (only its DOMContentLoaded line is left out: rdScrollRuler calls it,
    // after the H2s have their names)
    function initScrollRuler() {
      document.querySelectorAll("[data-scroll-ruler-init]").forEach((root) => {
        const tickCount = 65;
        const waveSize = 0.6;
        const waveWidth = 0.035;
        const speedBoost = 1;
        const cursorSize = 1.2;
        const cursorWidth = 0.06;
        const idleDelay = 1.2;
        const list = root.querySelector("[data-scroll-ruler-list]");
        const tickBlueprint = list.querySelector("[data-scroll-ruler-tick]");
        const labelWrap = root.querySelector("[data-scroll-ruler-labels]");
        const labelBlueprint = labelWrap ? labelWrap.querySelector("[data-scroll-ruler-label]") : null;
        const partSelector = root.getAttribute("data-scroll-ruler-parts");
        const parts = partSelector ? [...document.querySelectorAll(partSelector)] : [];
        const usingParts = parts.length > 0;
        if (!usingParts) root.setAttribute("aria-hidden", "true");
        tickBlueprint.remove();
        if (labelBlueprint) labelBlueprint.remove();
        const ticks = [];
        for (let i = 0; i < tickCount; i++) { const tick = tickBlueprint.cloneNode(true); list.appendChild(tick); ticks.push(tick); }
        const tickSetters = ticks.map((tick) => gsap.quickSetter(tick, "scaleX"));
        const tickPositions = ticks.map((tick, index) => index / (tickCount - 1));
        const tickStatus = ticks.map(() => "");
        const values = ticks.map(() => 0);
        const labels = [];
        if (usingParts && labelBlueprint) {
          parts.forEach((part, partIndex) => {
            const label = labelBlueprint.cloneNode(true);
            label.textContent = part.getAttribute("data-scroll-ruler-name") || String(partIndex + 1).padStart(2, "0");
            label.addEventListener("click", (event) => { event.stopPropagation(); scrollToPart(partIndex); });
            labelWrap.appendChild(label);
            labels.push({ element: label, partIndex: partIndex, tickIndex: 0, tickWidth: 0, setX: gsap.quickSetter(label, "x", "px") });
          });
        }
        let rangeStart = 0; let rangeLength = 1; let partStarts = []; let lastScroll = window.scrollY; let speed = 0; let currentIndex = null; let activePart = null; let pointerPosition = 0.5; let cursorTarget = 0; let cursorStrength = 0; let lastActive = 0; let rootStatus = ""; let reduceMotion = false;
        function gaussian(distance, width) { return Math.exp(-(distance * distance) / (2 * width * width)); }
        function measure() {
          const scrollY = window.scrollY;
          if (usingParts) {
            const tops = parts.map((part) => part.getBoundingClientRect().top + scrollY);
            const end = parts[parts.length - 1].getBoundingClientRect().bottom + scrollY;
            rangeStart = Math.max(tops[0], window.innerHeight / 2);
            rangeLength = Math.max(Math.min(end, document.documentElement.scrollHeight - window.innerHeight / 2) - rangeStart, 1);
            partStarts = tops.map((top) => gsap.utils.clamp(0, 1, (top - rangeStart) / rangeLength));
          } else { rangeStart = 0; rangeLength = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1); }
          const partTicks = partStarts.map((start) => Math.round(start * (tickCount - 1)));
          ticks.forEach((tick, index) => { let size = index % 5 === 0 ? "mid" : "minor"; if (usingParts ? partTicks.includes(index) : index % 10 === 0) size = "major"; tick.setAttribute("data-scroll-ruler-size", size); });
          let lastLabelY = -Infinity;
          labels.forEach((label) => {
            const tick = ticks[partTicks[label.partIndex]];
            const y = tick.offsetTop + tick.offsetHeight / 2;
            label.element.hidden = false; label.tickIndex = partTicks[label.partIndex]; label.tickWidth = tick.offsetWidth;
            if (y - lastLabelY < label.element.offsetHeight * 1.1) { label.element.hidden = true; return; }
            lastLabelY = y;
            gsap.set(label.element, { y: y, yPercent: -50 });
          });
          currentIndex = null;
        }
        function scrollToPosition(top) { window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" }); }
        function scrollToPart(partIndex) { scrollToPosition(parts[partIndex].getBoundingClientRect().top + window.scrollY); }
        function findPart(position) { let partIndex = 0; partStarts.forEach((start, index) => { if (start <= position) partIndex = index; }); return partIndex; }
        function update(time) {
          const frame = Math.min(gsap.ticker.deltaRatio(60), 3);
          const scrollY = window.scrollY; const scrollDelta = scrollY - lastScroll; lastScroll = scrollY;
          const speedNow = reduceMotion ? 0 : Math.min(Math.abs(scrollDelta) / window.innerHeight / frame / 0.04, 1);
          const speedEase = speedNow > speed ? 0.3 : 0.05;
          speed += (speedNow - speed) * Math.min(speedEase * frame, 1);
          const rawMarker = usingParts ? (scrollY + window.innerHeight / 2 - rangeStart) / rangeLength : scrollY / rangeLength;
          const marker = gsap.utils.clamp(0, 1, rawMarker);
          const insideRange = rawMarker >= 0 && rawMarker <= 1;
          cursorStrength += (cursorTarget - cursorStrength) * Math.min(0.15 * frame, 1);
          const waveAmount = waveSize * (1 + speedBoost * speed);
          const waveSpread = waveWidth * (1 + speedBoost * 0.8 * speed);
          const follow = reduceMotion ? 1 : Math.min(0.2 * frame, 1);
          for (let i = 0; i < tickCount; i++) {
            let target = waveAmount * gaussian(tickPositions[i] - marker, waveSpread);
            if (cursorSize > 0) target += cursorSize * cursorStrength * gaussian(tickPositions[i] - pointerPosition, cursorWidth);
            values[i] += (target - values[i]) * follow;
            tickSetters[i](1 + values[i]);
          }
          const nextIndex = insideRange ? Math.round(marker * (tickCount - 1)) : -1;
          if (nextIndex !== currentIndex) {
            currentIndex = nextIndex;
            ticks.forEach((tick, index) => { let status = "upcoming"; if (index === currentIndex) status = "current"; else if (rawMarker > 0 && tickPositions[index] <= marker) status = "passed"; if (tickStatus[index] === status) return; tickStatus[index] = status; tick.setAttribute("data-scroll-ruler-status", status); });
          }
          const nextPart = usingParts && insideRange ? findPart(marker) : -1;
          if (nextPart !== activePart) { activePart = nextPart; labels.forEach((label) => { label.element.setAttribute("data-scroll-ruler-status", label.partIndex === activePart ? "active" : "inactive"); }); }
          labels.forEach((label) => label.setX(values[label.tickIndex] * label.tickWidth));
          if (speed > 0.02 || cursorStrength > 0.1 || root.matches(":focus-within")) lastActive = time;
          const nextStatus = time - lastActive < idleDelay ? "active" : "idle";
          if (nextStatus !== rootStatus) { rootStatus = nextStatus; root.setAttribute("data-scroll-ruler-status", rootStatus); }
        }
        window.addEventListener("pointermove", (event) => { if (event.pointerType !== "mouse") return; const rect = list.getBoundingClientRect(); const reach = rect.height * 0.25; const distance = Math.max(event.clientX - rect.left - root.offsetWidth * 0.5, 0); cursorTarget = gsap.utils.clamp(0, 1, 1 - distance / reach); pointerPosition = (event.clientY - rect.top) / rect.height; });
        document.documentElement.addEventListener("pointerleave", () => { cursorTarget = 0; });
        root.addEventListener("click", (event) => { const rect = list.getBoundingClientRect(); const position = gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height); if (usingParts) scrollToPart(findPart(position)); else scrollToPosition(position * rangeLength); });
        gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => { reduceMotion = true; return () => { reduceMotion = false; }; });
        let resizeTimer;
        const resizeObserver = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 100); });
        resizeObserver.observe(document.body); resizeObserver.observe(root);
        measure();
        gsap.ticker.add(update);
      });
    }
  }

  // =========================================================
  // COVER HUE DRIFT — blog posts whose CMS switch "Cover hue drift" is on
  // The Blog posts template has an empty div [data-cover-hue-drift], shown only when the switch is set.
  // Webflow keeps a hidden conditional element in the page (class w-condition-invisible, display none),
  // so the drift is added here, and only when that div is really shown: a <style> inside a hidden embed
  // would still apply to every post.
  // =========================================================
  function rdCoverHueDrift() {
    // Only on staging and localhost until Rimbo gives the go for live (same gate as the scroll ruler)
    if (!/\.webflow\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) return;
    var on = qsa('[data-cover-hue-drift]').some(function (m) {
      return !m.classList.contains('w-condition-invisible') && getComputedStyle(m).display !== 'none';
    });
    var cover = qs('.cover_image');
    if (!on || !cover) return;
    if (!qs('#rd-hue-drift-css')) {
      var style = document.createElement('style');
      style.id = 'rd-hue-drift-css';
      style.textContent =
        '@keyframes rdHueDrift { 0%, 100% { filter: hue-rotate(0deg); } 25% { filter: hue-rotate(45deg); } 75% { filter: hue-rotate(-45deg); } }\n' +
        '.cover_image.is-hue-drift { animation: rdHueDrift 8s ease-in-out infinite; }\n' +
        '@media (prefers-reduced-motion: reduce) { .cover_image.is-hue-drift { animation: none; } }';
      document.head.appendChild(style);
    }
    cover.classList.add('is-hue-drift');
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

  run('band', rdBand);   // builds the home-opening rows before the marquees start
  run('global', rdGlobal);
  run('buttons', rdButtons);
  run('form validation', rdFormValidation);
  run('menu', rdMenu);

  if (qs('[data-band]')) {} // the band page has its own opening (rdBand above), no old hero to animate
  else if (path === '/' || path === '/home-copy') run('home', rdHome); // Home Copy is the redesign test page, a copy of the home
  else if (path === '/service' || path.indexOf('/locations/') === 0) run('service', rdService);
  else if (path === '/work') run('work', rdWork);
  else if (path.indexOf('/work/') === 0) run('case study', rdWorkItem);
  else if (path === '/branding-brilliance-newsletter' || path === '/call-is-booked') run('newsletter', rdNewsletter);
  else if (path === '/resources') run('resources', rdResources);
  else if (path === '/rimbo-quiz') run('quiz', rdQuiz);
  else if (path.indexOf('/post/') === 0) {
    run('scroll ruler', rdScrollRuler);
    run('cover hue drift', rdCoverHueDrift);
  }

  // These two replace code that still sits in Webflow for now, so they wait for
  // the whole page and check whether that old code has run first.
  onReady(function () {
    run('lenis', rdLenis);
    if (qs('[data-glass-carousel]')) run('glass carousel', rdGlassCarousel);
    if (path === '/audit') run('letter reveal', rdLetterReveal, { duration: 2, delay: 0.4 });
    if (path === '/my-story') run('letter reveal', rdLetterReveal, { duration: 1.4, delay: 0.3 });
  });

})();
