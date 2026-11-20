/* =========================================================
   Rimbo Designs — site JavaScript (rimbodesigns.com)
   Loaded once, site-wide, from Site settings → Footer, below GSAP,
   ScrollTrigger, SplitText, Lenis, CustomEase and Barba (no defer):
   <script src="https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@vX.Y.Z/main.min.js"></script>
   (jsDelivr builds main.min.js from this file automatically)

   Built on Osmo's page transition boilerplate (Barba): see PAGE TRANSITIONS below for what runs when.
   One section per page or feature, each in its own function so names
   can't clash. initPageFunctions() at the bottom decides what runs where.
   ========================================================= */

(function () {
  'use strict';

  // =========================================================
  // PAGE SCOPE
  // With Barba the page swaps without a reload, so nothing clears the old page's listeners, clocks and loops any more.
  // Everything a page starts is written down here and stopped when it leaves. In this file that is automatic for
  // setTimeout, setInterval, requestAnimationFrame and the observers (the names below replace the browser's, inside
  // this file only). For the rest use: rdOn(window, 'resize', fn) instead of window.addEventListener('resize', fn),
  // rdTick(fn) instead of gsap.ticker.add(fn), rdHead(style) instead of document.head.appendChild(style), rdDrag(draggable)
  // around a new Draggable and rdGl(gl) around a new WebGL context.
  // Anything that moves every frame goes through rdLoop(el, fn) (next to nearScreen below): it only runs while el is
  // near the screen and the tab is visible, and it sleeps when fn says nothing moves any more.
  // Code that runs later without a known page (an animation's onComplete, a click) belongs to the page on screen. What has
  // to stay for the whole visit (the menu, Lenis) is started outside a page or inside stay(). Without Barba all of this
  // passes straight through.
  // =========================================================
  var zone = null;
  var pageScope = null;   // the page on screen
  var staying = false;
  function scopeNow() { return zone || (staying ? null : pageScope); }
  function stay(fn) {
    staying = true;
    try { fn(); } finally { staying = false; }
  }
  function inZone(fn) {
    var scope = scopeNow();
    if (!scope) return fn;
    return function () {
      if (scope.dead) return;
      var before = zone;
      zone = scope;
      try { return fn.apply(this, arguments); } finally { zone = before; }
    };
  }
  function rdUndo(fn) {
    var scope = scopeNow();
    if (scope) scope.undo.push(fn);
  }
  function rdOn(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    rdUndo(function () { target.removeEventListener(type, fn, options); });
  }
  function addEventListener(type, fn, options) { rdOn(window, type, fn, options); } // the short way of writing window.addEventListener
  function rdTick(fn) {
    gsap.ticker.add(fn);
    rdUndo(function () { gsap.ticker.remove(fn); });
  }
  function rdHead(el) {
    document.head.appendChild(el);
    var scope = scopeNow();
    if (scope) scope.styles.push(el);
    rdUndo(function () { el.remove(); });
  }
  // A Draggable stays in GSAP's own list until it is killed, and with it the page it was made on; a WebGL context stays
  // until the browser clears up, and it only allows about sixteen. Both leave with their page
  function rdDrag(draggable) {
    rdUndo(function () { draggable.kill(); });
    return draggable;
  }
  function rdGl(gl) {
    if (gl) rdUndo(function () { var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); });
    return gl;
  }
  // What starts late (a section that waits until it comes near) still builds inside its page's GSAP context, so its
  // timelines and ScrollTriggers are reverted with the page
  function inContext(fn) {
    var scope = scopeNow();
    return scope && scope.gsap ? scope.gsap.add(fn) : fn();
  }
  // GSAP plugins are registered once per visit, not once per page: every gsap.registerPlugin(Draggable) puts one more
  // listener on the document for good
  var pluginsOn = [];
  function rdPlugins() {
    Array.prototype.forEach.call(arguments, function (plugin) {
      if (!plugin || pluginsOn.indexOf(plugin) > -1) return;
      pluginsOn.push(plugin);
      gsap.registerPlugin(plugin);
    });
  }
  // FIRST LOAD, one thing at a time. Everything used to start in a single block of work when this file ran: on a phone
  // that was well over half a second in which the page could neither paint its opening nor answer a touch. Now only what
  // the first screen needs starts at once (the menu, the hero, the scroll reveals); soon() queues the rest (buttons, forms,
  // footer, FAQ...) and the browser takes one piece at a time whenever it has a moment, each inside its own page's scope and
  // GSAP context. After a page transition nothing waits: the screen is covered then, and it all has to stand before it lifts.
  var firstLoad = true, idleJobs = [], idleBusy = false;
  function soon(name, fn) {
    if (!firstLoad) return run(name, fn);
    var scope = scopeNow();
    idleJobs.push(inZone(function () {
      if (scope && scope.left) return; // the visitor has already gone on to another page
      inContext(function () { run(name, fn); });
    }));
    if (!idleBusy) { idleBusy = true; idleNext(); }
  }
  function idleNext() {
    var step = function () {
      var job = idleJobs.shift();
      if (job) job();
      if (idleJobs.length) idleNext(); else idleBusy = false;
    };
    if (window.requestIdleCallback) window.requestIdleCallback(step, { timeout: 1200 }); // never later than this, also in a tab that stays busy
    else browserTimeout(step, 60); // Safari
  }
  function scopedObserver(Native) {
    return function (fn, options) {
      var observer = new Native(inZone(fn), options);
      rdUndo(function () { observer.disconnect(); });
      return observer;
    };
  }
  var browserTimeout = window.setTimeout.bind(window), browserInterval = window.setInterval.bind(window);
  var setTimeout = function (fn, ms) { return browserTimeout(inZone(fn), ms); };
  var requestAnimationFrame = function (fn) { return window.requestAnimationFrame(inZone(fn)); };
  var setInterval = function (fn, ms) {
    var id = browserInterval(inZone(fn), ms);
    rdUndo(function () { clearInterval(id); });
    return id;
  };
  var IntersectionObserver = scopedObserver(window.IntersectionObserver);
  var ResizeObserver = scopedObserver(window.ResizeObserver);
  var MutationObserver = scopedObserver(window.MutationObserver);

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

  // NEAR THE SCREEN — fn(true) once el comes within `margin` of the screen (default 300 px, so it is already running
  // when you scroll into it), fn(false) when it leaves or the tab is hidden. Animations use it to rest off screen.
  function nearScreen(el, fn, margin) {
    if (!el) return;
    var inView = false, now = null;
    var tell = function () { var on = inView && document.visibilityState !== 'hidden'; if (on !== now) { now = on; fn(on); } };
    if (!('IntersectionObserver' in window)) { inView = true; tell(); return; }
    new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; tell(); }, { rootMargin: (margin || 300) + 'px 0px' }).observe(el);
    rdOn(document, 'visibilitychange', tell);
  }

  // CSS LOOPS REST OFF SCREEN — Webflow's endless CSS animations (the ticker bands, the card shadows) keep the browser busy
  // every frame even when you can't see them. Each animated element pauses while it is off screen and plays again 300 px
  // before it comes back. Only endless loops: a one-off entrance animation is left alone.
  function rdRestCssLoops() {
    if (!document.getAnimations || !window.CSSAnimation) return;
    var done = [];
    var look = function () {
      document.getAnimations().forEach(function (a) {
        var t = a.effect && a.effect.target;
        if (!(a instanceof CSSAnimation) || !t || !t.isConnected || done.indexOf(t) > -1) return;
        if (a.effect.getTiming().iterations !== Infinity) return;
        done.push(t);
        nearScreen(t, function (on) { t.style.animationPlayState = on ? '' : 'paused'; });
      });
    };
    setTimeout(look, 1200); setTimeout(look, 5000); // after the page has started its own animations
  }

  // LOOPS — the one way to animate every frame. rdLoop(el, fn, margin) runs fn(time, deltaMs) on GSAP's ticker (one
  // loop for the whole site) only while el is within margin px of the screen (default 300, so it is already moving
  // when you scroll to it) and the tab is visible. fn returns false when nothing moves any more: the loop sleeps until
  // .wake(), which the event that moves it again calls (a pointermove, a scroll, a click). It stops by itself when the
  // page leaves or el is gone. Returns { wake, sleep }.
  function rdLoop(el, fn, margin) {
    var near = false, awake = true, on = false;
    var tick = function (t, dt) {
      if (!el.isConnected) { awake = false; set(); return; }
      if (fn(t, dt) === false) { awake = false; set(); }
    };
    var set = function () {
      var want = near && awake;
      if (want === on) return;
      on = want;
      if (on) gsap.ticker.add(tick); else gsap.ticker.remove(tick);
    };
    rdUndo(function () { gsap.ticker.remove(tick); on = false; });
    nearScreen(el, function (n) { near = n; set(); }, margin);
    return {
      wake: function () { if (!awake) { awake = true; set(); } },
      sleep: function () { awake = false; set(); }
    };
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
  // OSMO PAGE TRANSITION BOILERPLATE
  // Barba swaps .page-wrapper without a reload. On the live site (or with ?barba=0 on staging) none of this starts:
  // every page simply loads and runs initOnceFunctions(), as before.
  // Differences from Osmo's file, on purpose:
  // - no gsap.defaults(): it would change the ease and duration of every animation on the site. Use ease: 'osmo' by hand
  // - Lenis keeps our settings and GSAP's lag smoothing stays on
  // - page code runs in swapPage(), at the moment the old page is gone, not in Barba's beforeEnter. A transition must call
  //   swapPage() while the screen is covered or empty: the page functions look in the whole document and do heavy work
  // =========================================================
  var barbaOn = typeof barba !== 'undefined' && typeof CustomEase !== 'undefined' && // on live too since Rimbo's go, 19 Nov 2026
    !/[?&]barba=0/.test(location.search) &&
    !(window.Webflow && Webflow.env('editor') !== undefined);

  var nextPage = document;
  var onceFunctionsInitialized = false;
  var pageStyles = [];         // the <style> tags from that page's head and footer code, which live outside .page-wrapper
  var scrollMemory = {};       // where you were on each address, for the back button
  var linkHash = '';           // the #anchor of the link being followed
  var PAGE_HTML_CLASSES = ['rf', 'loc-in']; // classes on <html> that belong to one page

  var hasScrollTrigger = typeof window.ScrollTrigger !== 'undefined';
  var rmMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = rmMQ.matches;
  if (rmMQ.addEventListener) rmMQ.addEventListener('change', function (e) { reducedMotion = e.matches; });

  function has(selector) { return !!nextPage.querySelector(selector); }

  // -----------------------------------------
  // FUNCTION REGISTRY
  // -----------------------------------------

  // First load only. What runs here stays for the whole visit
  function initOnceFunctions() {
    if (onceFunctionsInitialized) return;
    onceFunctionsInitialized = true;
    pageStyles = qsa('head style');
    run('full screen nav', rdNavFull); // before the band, so its opening can fade the logo + burger in last
    openPage();
    inPage(initPageFunctions);
    firstLoad = false; // from here on (page transitions) soon() runs things at once
    // the scripts that came from Webflow: when the page is read, where their Webflow copies started (before Lenis)
    onReady(function () { inPage(function () { fromWebflow(document); }); });
    // These wait for the whole page, like the old code they replaced
    onReady(function () {
      pageStyles = pageStyles.concat(qsa('body > style')); // a page's footer code comes after this file, so only now
      stay(function () { run('lenis', rdLenis); });
      inPage(initLateFunctions);
    });
  }

  // Every new page after the first, while the screen is covered: the old page is gone, the new one is in place
  function initBeforeEnterFunctions(next, doc) {
    nextPage = next || document;
    inPage(function () {
      runPageScripts(doc.head);   // the order of a real page load: head code, this file, footer code, then Webflow
      initPageFunctions();
      run('lenis buttons', rdLenisButtons);
      fromWebflow(doc); // the scripts that came from Webflow, where their copies in the page used to run
      runPageScripts(doc.body);
      restartWebflow(doc);
      initLateFunctions();
    });
  }

  // After the enter animation is done
  function initAfterEnterFunctions(next) {
    nextPage = next || document;
    // Finsweet's slider dots build once, on load. Here, because they search the whole document a moment after being asked
    if (window.fsAttributes && fsAttributes.sliderdots && fsAttributes.sliderdots.init) run('slider dots', function () { fsAttributes.sliderdots.init(); });
    if (window.lenis) window.lenis.resize();
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }

  // -----------------------------------------
  // PAGE TRANSITIONS
  // -----------------------------------------

  function runPageOnceAnimation(next) {
    var tl = gsap.timeline();
    tl.call(function () { resetPage(next); }, null, 0);
    return tl;
  }

  // Osmo's 3D cube: the two pages are two faces of one cube, it backs away from the camera and rolls over.
  // The moves are Osmo's. Added for this site: the new page starts inside startCube() first, the faces get the page
  // colour (ours sits on the body, not on the page), the cube stays below the menu, and the old page's pins hold their place
  var flipCubeDirection = false;
  var cubeX = flipCubeDirection ? 1 : -1;
  // The void around the cube: grainy beige, a step below the page (the balls' own beige, docs/brand.md), so the cube keeps its edge on light pages too
  var CUBE_VOID = '#DACCAE';
  var CUBE_GRAIN = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'240\' height=\'240\'%3E%3Cfilter id=\'g\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3CfeColorMatrix values=\'0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1.6 -.55\'/%3E%3C/filter%3E%3Crect width=\'240\' height=\'240\' filter=\'url(%23g)\'/%3E%3C/svg%3E")';

  function runPageLeaveAnimation(current, next, data) {
    return new Promise(function (resolve) {
      // Webflow.destroy() ran in beforeEnter; its engine needs a frame to notice before it can start again (see restartWebflow)
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          var started = startCube(data);
          var parent = current.parentElement || document.body;
          var scene = prepareForTransition(parent, current, next, started.scrollY);
          var cube = scene.cube, stage = scene.stage;
          // an open menu stops being a menu here: it is the old page's face now and folds away with it. The swoosh is for closing it by hand
          if (rdNavFull.handOver) rdNavFull.handOver(scene.wrapper);
          if (window.lenis) window.lenis.stop();

          var tl = gsap.timeline({
            onComplete: function () {
              parent.insertBefore(next, stage);
              stage.remove();
              gsap.set(next, { clearProps: 'all' });
              playVideos(started.nextVideos);
              finishCube(started);
              resolve();
            }
          });

          tl.to(cube, { z: -window.innerHeight * 0.8, duration: 0.8, ease: 'power2.inOut' }, 0);
          tl.to(cube, { rotateX: 90 * cubeX, duration: 1.2, ease: 'osmo' }, '<0.1');
          tl.to(cube, { z: -window.innerHeight * 0.5, duration: 1.2, ease: 'osmo', overwrite: 'auto' }, '<0.7');
        });
      });
    });
  }

  function runPageEnterAnimation() {
    return Promise.resolve(); // on the cube the new page arrives with the leave
  }

  function prepareForTransition(parent, current, next, scrollY) {
    var stage = document.createElement('div');
    var cube = document.createElement('div');
    var wrapper = document.createElement('div');
    var viewportHeight = window.innerHeight;
    var cubeDepth = viewportHeight * 0.5;
    var face = getComputedStyle(document.body).backgroundColor;

    var grain = document.createElement('div');
    stage.className = 'page-transition__stage';
    cube.className = 'page-transition__cube';
    wrapper.className = 'page-transition__wrapper';

    parent.insertBefore(stage, current);
    stage.appendChild(grain);
    stage.appendChild(cube);
    cube.appendChild(wrapper);
    wrapper.appendChild(current);
    cube.appendChild(next);

    window.scrollTo(0, 0);

    gsap.set(stage, {
      position: 'fixed', inset: 0, width: '100%', height: viewportHeight,
      perspective: '100vw', perspectiveOrigin: '50% ' + cubeDepth + 'px',
      overflow: 'hidden', zIndex: 999, backgroundColor: CUBE_VOID
    });
    grain.style.backgroundImage = CUBE_GRAIN;
    gsap.set(grain, { position: 'absolute', inset: 0, opacity: 0.22 });
    gsap.set(cube, {
      position: 'absolute', inset: 0, width: '100%', height: viewportHeight,
      transformStyle: 'preserve-3d', transformOrigin: '50% 50%', willChange: 'transform',
      z: -cubeDepth, force3D: true
    });
    gsap.set(wrapper, {
      position: 'absolute', inset: 0, width: '100%', height: viewportHeight, overflow: 'hidden',
      transformStyle: 'preserve-3d', transform: 'rotateX(0deg) translate3d(0, 0, ' + cubeDepth + 'px)',
      willChange: 'transform', backgroundColor: face
    });
    gsap.set(current, {
      position: 'absolute', top: -scrollY, left: 0, width: '100%', minHeight: viewportHeight,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', willChange: 'transform', force3D: true
    });
    gsap.set(next, {
      position: 'absolute', inset: 0, width: '100%', height: viewportHeight, overflow: 'hidden',
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transformOrigin: '50% 50%',
      transform: 'rotateX(' + (-90 * cubeX) + 'deg) translate3d(0, 0, ' + (cubeDepth + 0.5) + 'px)',
      autoAlpha: 1, willChange: 'transform', force3D: true, backgroundColor: face
    });

    stage.offsetHeight;
    return { stage: stage, cube: cube, wrapper: wrapper };
  }

  // Starts the new page before the cube is built, all in one go so nothing paints in between. For that moment the old
  // page is out of the document: the page functions search the whole document, and they measure the new page in its
  // real place in the flow. Then it comes straight back, with its own CSS still on, for its last two seconds on screen.
  // alone(next), if given, runs while the new page is the only one in the document (the ticket tear measures it there)
  function startCube(data, alone) {
    var current = data.current.container, next = data.next.container;
    var parent = current.parentNode, sibling = current.nextSibling;
    var root = document.documentElement;
    var doc = barba.dom.toDocument(data.next.html);
    var scrollY = window.scrollY;
    var oldVideos = playingVideos(current);
    var old = leavePage();
    holdPins(old, scrollY);
    var stale = syncHead(doc);
    current.remove();
    resetPage(next);
    openPage();
    initBeforeEnterFunctions(next, doc);
    if (window.lenis) window.lenis.resize();
    if (hasScrollTrigger) ScrollTrigger.refresh();
    if (alone) alone(next);
    // while both pages are on screen each keeps its classes on its own face: on <html> the post CSS would reach the other page too
    var nextClasses = PAGE_HTML_CLASSES.filter(function (name) { return root.classList.contains(name); });
    root.classList.remove.apply(root.classList, PAGE_HTML_CLASSES);
    nextClasses.forEach(function (name) { next.classList.add(name); });
    if (old) old.htmlClasses.forEach(function (name) { current.classList.add(name); });
    parent.insertBefore(current, sibling);
    playVideos(oldVideos);
    return { old: old, stale: stale, next: next, nextClasses: nextClasses, nextVideos: playingVideos(next), scrollY: scrollY };
  }

  // The cube has landed: the old page and its CSS go
  function finishCube(started) {
    started.stale.forEach(function (el) { el.remove(); });
    closePage(started.old);
    var root = document.documentElement;
    PAGE_HTML_CLASSES.forEach(function (name) {
      started.next.classList.remove(name);
      root.classList.toggle(name, started.nextClasses.indexOf(name) > -1);
    });
  }

  // A pinned section is fixed to the screen. On a cube face "the screen" becomes the page, so it moves down by the scroll
  function holdPins(scope, scrollY) {
    if (!scope) return;
    scope.triggers.forEach(function (trigger) {
      if (trigger.pin && scope.pinned.indexOf(trigger) > -1) gsap.set(trigger.pin, { top: (parseFloat(getComputedStyle(trigger.pin).top) || 0) + scrollY });
    });
  }

  // Moving a video in the document pauses it
  function playingVideos(root) {
    return qsa('video', root).filter(function (video) { return !video.paused; });
  }
  function playVideos(videos) {
    videos.forEach(function (video) {
      var playing = video.play();
      if (playing && playing.catch) playing.catch(function () {});
    });
  }

  // -----------------------------------------
  // IMPACT: Rimbo's pick from the Cube Lab (prototype/cube-lab-rd, private page claude.ai/artifact/WMKkoiZHHRGnQ7wDY5Cirp)
  // The page breaks into solid blocks from the spot you clicked: the nearest blocks go first and are pushed furthest,
  // tumble back into the void, turn over and land as the new page. The blocks show copies of what both pages have on
  // screen (snapshot()); the real new page waits underneath, its own animations held, and takes over once they land.
  // The numbers are the lab's. ?cube=1 on staging shows the cube it replaced
  // -----------------------------------------
  var IMPACT = { stagger: 0.035, dur: 1.4, far: [300, 1300], spinZ: 80, spinY: 60, drift: 0.1, burst: 260, hang: 0.1 };
  // the cut, at the click, is a sword stroke (Rimbo's pick from the cut lab, "Swoosh, cut stays"): along every seam a
  // fine orange stroke flies past (stroke = seconds one takes, strokeLen = its length as a part of the seam, lineSpread =
  // how far the furthest seam starts behind the nearest) and leaves a pale hairline. From partAt every block shrinks a
  // little about its own middle (part, spread per block away from the click), so the hairlines open. minHold = how long
  // the cut page stands before it bursts, however fast the next page is: the whole cut has to fit in it. Seconds
  // trail = the hairline then fades away from the end the stroke came in: how far the fade travels (a part of the seam)
  // and trailDur = in how many seconds (his picks from round 8 of the lab: "Thinner" and "Trails out")
  var IMPACT_CUT = { scale: 0.955, stroke: 0.36, strokeLen: 0.42, lineSpread: 0.4, partAt: 0.7, part: 0.28, spread: 0.018, minHold: 1.1, trail: 0.9, trailDur: 0.9 };
  var impactPending = null; // the cut page, between the click and the moment the next page is ready
  // Phones and tablets take the cube, not Impact. Impact holds 36 copies of the page in over a hundred layers, and the
  // browser on Rimbo's iPhone 13 mini gave up on it (in Arc: "clicking a link still crashes the site", also after
  // v1.7.198 made the copies lighter). The cube is two faces and ran on that phone before Impact came. Not reproduced
  // in the iPhone Simulator, which has a Mac's memory. ?cube=1 shows the cube on a computer, ?impact=1 forces Impact
  // on a touch device (for trying a lighter Impact on a real phone later). Asked at every move: a hybrid laptop can
  // change its answer
  var cubeAsked = /[?&]cube=1/.test(location.search), impactAsked = /[?&]impact=1/.test(location.search);
  var touchDevice = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)') : { matches: false };
  function useCube() { return cubeAsked || (touchDevice.matches && !impactAsked); }
  var pageVisits = 0; // 1 on the page you arrived on, more after every page transition

  // The Impact transition: its CSS lives in Webflow since 2026-11-19 (site head code), main.js only builds and moves it


  // The copies live in a shadow tree, so nothing on the page can find them: page code looks for its elements in the
  // whole document, and a copy of the home hero once got the hero's code run on it, which hid the menu bar for an
  // opening that never came (Rimbo: "now I lost my menu again"). The site's CSS is handed to the tree as copies of the
  // document's style sheets, made once per sheet. A browser without this keeps the copies in the page, as before
  var impactShadow = !!(document.body.attachShadow && typeof CSSStyleSheet === 'function' && 'adoptedStyleSheets' in Document.prototype && typeof WeakMap === 'function');
  var sheetCopies = impactShadow ? new WeakMap() : null;

  function shadowSheets() {
    var out = [];
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules;
      try { rules = sheet.cssRules; } catch (err) { return; } // a sheet from another site that we may not read
      if (sheet.disabled || !rules) return;
      var copy = sheetCopies.get(sheet);
      if (!copy || copy.n !== rules.length) {
        var css = '';
        for (var i = 0; i < rules.length; i++) css += rules[i].cssText + '\n';
        var made = sheet.href ? new CSSStyleSheet({ baseURL: sheet.href }) : new CSSStyleSheet();
        made.replaceSync(css);
        copy = { n: rules.length, sheet: made };
        sheetCopies.set(sheet, copy);
      }
      out.push(copy.sheet);
    });
    // the transition's own rules (.rd-impact, .rd-snap) are in the site head code, so they are among the copies above
    return out;
  }

  // the layer the copies stand in: { host } goes on the page, { root } takes the copies. restyle() hands the tree the
  // style sheets that came after it was made: the layer is made at the click, and the arriving page brings its own CSS
  // later (its embeds, what its code adds). Without them its copy flew in half styled: the post's hero is hidden until
  // its opening, and the copy showed the bare eyebrow and section list on an empty page (Rimbo's screenshot)
  function impactStage() {
    var host = document.createElement('div');
    host.className = 'rd-impact';
    if (impactShadow) {
      try {
        var sheets = shadowSheets();
        var shadow = host.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = sheets;
        var root = document.createElement('div');
        root.className = 'rd-impact__root';
        shadow.appendChild(root);
        return {
          host: host, root: root,
          restyle: function () {
            try {
              var have = shadow.adoptedStyleSheets;
              var more = shadowSheets().filter(function (sheet) { return Array.prototype.indexOf.call(have, sheet) < 0; });
              if (more.length) shadow.adoptedStyleSheets = Array.prototype.concat.call([], Array.prototype.slice.call(have), more); // the old page's stay: its copy still stands
            } catch (err) {}
          }
        };
      } catch (err) {
        impactShadow = false;
        host = document.createElement('div');
        host.className = 'rd-impact';
      }
    }
    return { host: host, root: host, restyle: function () {} };
  }

  // where the click landed: the middle of the link, or the bottom middle of the screen for a click we can't see
  function impactPoint(data) {
    var t = data.trigger;
    if (t && t.nodeType === 1 && t.isConnected) {
      var r = t.getBoundingClientRect();
      if (r.width || r.height) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight };
  }

  // A copy of what a page shows on screen right now, made from the live page. Boxes that run far past the screen are
  // opened and only their visible children copied; the rest is copied whole. Every copied box is placed where it was
  // measured, so the copy doesn't depend on the page's own layout. Videos and canvases become still pictures
  function snapshot(container, W, H, hot) {
    var root = document.createElement('div');
    // the classes <html> has at this moment go on the copy: rules that hang on them (.rf …, the Service hero's
    // .svh-pre that hides its title until it builds) then reach this copy, and only this one
    root.className = 'rd-snap ' + document.documentElement.className.replace(/\blenis\S*/g, '');
    root.style.cssText = 'width:' + W + 'px;height:' + H + 'px;background:' + getComputedStyle(document.body).backgroundColor;
    var onScreen = function (r) { return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.right > 0 && r.left < W; };

    function place(clone, el, r, base, cs) {
      var s = clone.style, t = cs.transform;
      if (t === 'none' || /^matrix\(1, 0, 0, 1,/.test(t)) { // nothing or a plain move: the measured box is the box
        s.transform = 'none';
        s.left = (r.left - base.x) + 'px'; s.top = (r.top - base.y) + 'px'; s.width = r.width + 'px'; s.height = r.height + 'px';
      } else { // turned or scaled: keep its own transform around the same middle
        var w = el.offsetWidth, h = el.offsetHeight;
        s.left = (r.left + r.width / 2 - w / 2 - base.x) + 'px'; s.top = (r.top + r.height / 2 - h / 2 - base.y) + 'px';
        s.width = w + 'px'; s.height = h + 'px';
      }
      s.position = 'absolute'; s.right = 'auto'; s.bottom = 'auto'; s.margin = '0'; s.boxSizing = 'border-box';
      s.minWidth = '0'; s.maxWidth = 'none'; s.minHeight = '0'; s.maxHeight = 'none'; s.translate = 'none';
    }

    // videos and canvases in a copy are blank (or start decoding again): freezeInside() turns them into stills of the original
    // A copy is not under the pointer, so it would fall back to its look without hover: the article card you click
    // showed its extra lines, and its copy flashed without them (Rimbo). The look is read from the real elements and
    // written on the copies. hotTop = the clicked link, or the box around it if that is hovered too
    var hotTop = null;
    if (hot && hot.nodeType === 1 && hot.matches(':hover')) {
      hotTop = hot;
      for (var up = 0; up < 2; up++) if (hotTop.parentElement && hotTop.parentElement !== container && hotTop.parentElement.matches(':hover')) hotTop = hotTop.parentElement;
    }
    var LOOK = ['opacity', 'visibility', 'color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'clipPath', 'filter', 'boxShadow', 'outlineColor'];
    var SHAPE = ['transform', 'translate', 'rotate', 'scale', 'width', 'height', 'maxHeight', 'top', 'left', 'right', 'bottom', 'display', 'zIndex'];
    function wear(orig, copy, shapeToo) {
      var cs = getComputedStyle(orig);
      LOOK.concat(shapeToo ? SHAPE : []).forEach(function (k) { copy.style[k] = cs[k]; });
    }
    function hoverLook(el, clone, whole) {
      if (!hotTop) return;
      if (hotTop.contains(el)) { // the copied box is the hovered one, or inside it
        wear(el, clone, false); // its place was measured already
        if (whole) { var a = el.querySelectorAll('*'), b = clone.querySelectorAll('*'); for (var i = 0; i < a.length && i < b.length; i++) wear(a[i], b[i], true); }
      } else if (whole && el.contains(hotTop)) { // the hovered box sits somewhere inside this copy: find its twin by position
        var path = [], n = hotTop;
        while (n !== el) { path.unshift(Array.prototype.indexOf.call(n.parentNode.children, n)); n = n.parentNode; }
        var twin = clone;
        for (var j = 0; j < path.length && twin; j++) twin = twin.children[path[j]];
        if (!twin) return;
        wear(hotTop, twin, true);
        var x = hotTop.querySelectorAll('*'), y = twin.querySelectorAll('*');
        for (var k = 0; k < x.length && k < y.length; k++) wear(x[k], y[k], true);
      }
    }

    // Pictures in a copy must be there in the very first frame. A copied <img> starts again as a new picture: a lazy one
    // waits to be looked at, and a browser may draw the block first and the picture a moment later, so a dark card
    // showed through where its cover belongs (Rimbo: "the cover images flicker black" on the blog section's cards).
    // So every copy loads at once, is decoded before it is drawn, and uses the very file the original is showing
    function pinPictures(el, clone) {
      var a = el.tagName === 'IMG' ? [el] : qsa('img', el), b = clone.tagName === 'IMG' ? [clone] : qsa('img', clone);
      a.forEach(function (img, i) {
        var c = b[i];
        if (!c) return;
        if (img.currentSrc) {
          if (c.parentNode && c.parentNode.tagName === 'PICTURE') qsa('source', c.parentNode).forEach(function (so) { so.remove(); });
          c.removeAttribute('srcset'); c.removeAttribute('sizes');
          c.src = img.currentSrc;
        }
        c.loading = 'eager'; c.decoding = 'sync';
      });
    }

    // What a browser gives a layer of its own (a 3D-turned element and what sits in it, a canvas, a video still), with
    // its place on screen. Every block gets a whole copy of the page but shows only its own piece of it, and these
    // layers came along in every copy: on a phone the home page's fifteen dial cards made over 1100 layers during the
    // cut, where the page itself has 120 (Rimbo, on his iPhone: "it breaks the site... like it's too much or it
    // crashes"). snapCopy() switches off the ones a block doesn't show
    function markHeavy(el, clone) {
      var a = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*'))), b = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
      if (a.length !== b.length) return;
      var styles = a.map(function (n) { return window.getComputedStyle(n); }), where = new Map(), ext = [], i;
      // the room an element takes on screen, together with everything inside it: a 3D wrapper often has no size of its
      // own, and hiding it hides its cards too (the home dial lost them all in the first try)
      for (i = 0; i < a.length; i++) {
        where.set(a[i], i);
        var q = a[i].getBoundingClientRect();
        ext.push(q.width || q.height ? [q.left, q.top, q.right, q.bottom] : null);
      }
      for (i = a.length - 1; i > 0; i--) {
        var p = where.get(a[i].parentElement), e = ext[i];
        if (p === undefined || !e) continue;
        ext[p] = ext[p] ? [Math.min(ext[p][0], e[0]), Math.min(ext[p][1], e[1]), Math.max(ext[p][2], e[2]), Math.max(ext[p][3], e[3])] : e.slice();
      }
      for (i = 0; i < a.length; i++) {
        var n = a[i], cs = styles[i], up = where.get(n.parentElement);
        if (!ext[i] || cs.visibility !== 'visible') continue;
        var heavy = /^(CANVAS|VIDEO|IFRAME)$/.test(n.tagName) || cs.transform.indexOf('matrix3d') === 0 || cs.backfaceVisibility === 'hidden' ||
          (up !== undefined && styles[up].transformStyle === 'preserve-3d');
        if (heavy) b[i].setAttribute('data-rd-in', Math.floor(ext[i][0]) + ' ' + Math.floor(ext[i][1]) + ' ' + Math.ceil(ext[i][2]) + ' ' + Math.ceil(ext[i][3]));
      }
    }

    function walk(el, parent, base) {
      if (el.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META)$/.test(el.tagName)) return;
      var cs = getComputedStyle(el);
      if (cs.display === 'none') return;
      if (cs.display === 'contents') { Array.prototype.forEach.call(el.children, function (k) { walk(k, parent, base); }); return; }
      var r = el.getBoundingClientRect();
      if (!onScreen(r)) return;
      var open = r.height > H * 1.2 && el.children.length > 0 && cs.transform === 'none' && !/^(VIDEO|CANVAS|IMG|IFRAME|PICTURE|svg)$/i.test(el.tagName);
      var clone = el.cloneNode(!open);
      if (!open) { markHeavy(el, clone); pinPictures(el, clone); } // markHeavy first: it pairs the copy's elements with the page's by their order
      place(clone, el, r, base, cs);
      hoverLook(el, clone, !open);
      parent.appendChild(clone);
      if (open) {
        var inner = { x: r.left + el.clientLeft, y: r.top + el.clientTop };
        Array.prototype.forEach.call(el.children, function (k) { walk(k, clone, inner); });
      } else {
        var wrap = document.createElement('div'); // freezeInside() looks at descendants, so the copy gets a parent for the moment
        parent.replaceChild(wrap, clone); wrap.appendChild(clone);
        freezeInside(el, wrap);
        parent.replaceChild(wrap.firstChild, wrap);
      }
    }
    function freezeInside(el, wrap) {
      var sel = 'video, canvas, iframe';
      var a = (el.matches(sel) ? [el] : []).concat(qsa(sel, el));
      var b = qsa(sel, wrap);
      a.forEach(function (m, i) {
        var c = b[i];
        if (!c) return;
        var w = m.offsetWidth, h = m.offsetHeight;
        var still = document.createElement(m.tagName === 'IFRAME' ? 'div' : 'canvas');
        // its place and size, not its class: page code looks videos up by class and must not find a still
        var ms = getComputedStyle(m);
        ['position', 'top', 'left', 'right', 'bottom', 'display', 'transform', 'borderRadius', 'zIndex', 'opacity', 'margin'].forEach(function (k) { still.style[k] = ms[k]; });
        still.style.width = w + 'px'; still.style.height = h + 'px';
        if (m.tagName === 'IFRAME') still.style.background = 'var(--color--black, #131313)';
        else {
          var k = Math.min(window.devicePixelRatio || 1, 1.5);
          still.width = Math.max(1, Math.round(w * k)); still.height = Math.max(1, Math.round(h * k));
          var g = still.getContext('2d');
          try {
            if (m.tagName === 'VIDEO') {
              if (m.readyState >= 2 && m.videoWidth) { // like object-fit: cover
                var f = Math.max(still.width / m.videoWidth, still.height / m.videoHeight), vw = m.videoWidth * f, vh = m.videoHeight * f;
                g.drawImage(m, (still.width - vw) / 2, (still.height - vh) / 2, vw, vh);
              }
            } else g.drawImage(m, 0, 0, still.width, still.height);
          } catch (err) {}
          try { // a picture instead of a canvas: every block would otherwise get a canvas layer of its own
            var pic = document.createElement('img');
            pic.src = still.toDataURL(m.tagName === 'VIDEO' ? 'image/jpeg' : 'image/png', 0.85);
            pic.style.cssText = still.style.cssText; pic.alt = ''; pic.decoding = 'sync';
            pic.style.objectFit = 'fill';
            still = pic;
          } catch (err) {} // a video from another site without permission: it stays a canvas
        }
        if (c.hasAttribute('data-rd-in')) still.setAttribute('data-rd-in', c.getAttribute('data-rd-in'));
        c.parentNode.replaceChild(still, c);
      });
    }

    walk(container, root, { x: 0, y: 0 });
    var top = root.firstElementChild;
    if (top) { top.style.visibility = 'visible'; top.style.opacity = '1'; } // the arriving page is hidden while it waits
    if (!impactShadow) qsa('[id]', root).forEach(function (el) { if (!el.closest('svg')) el.removeAttribute('id'); }); // in the page, code must never find a copy by its id
    qsa('[data-barba], [data-barba-namespace]', root).forEach(function (el) { el.removeAttribute('data-barba'); el.removeAttribute('data-barba-namespace'); }); // nor Barba
    return root;
  }

  // a copy of a snapshot for one block (canvases are copied empty, so they get their picture again)
  // view = the block's piece of the screen [left, top, right, bottom]: the heavy pieces outside it (markHeavy) are
  // switched off in this copy. Hidden, not removed, so nothing else in the copy moves
  function snapCopy(snap, view) {
    var c = snap.cloneNode(true), from = snap.querySelectorAll('canvas'), to = c.querySelectorAll('canvas');
    if (view) Array.prototype.forEach.call(c.querySelectorAll('[data-rd-in]'), function (n) {
      var p = n.getAttribute('data-rd-in').split(' ');
      if (+p[2] >= view[0] && +p[0] <= view[2] && +p[3] >= view[1] && +p[1] <= view[3]) return;
      n.style.setProperty('visibility', 'hidden', 'important');
      n.setAttribute('data-rd-off', '');
    });
    for (var i = 0; i < to.length; i++) {
      if (to[i].hasAttribute('data-rd-off')) { to[i].width = to[i].height = 1; continue; } // no picture to keep in memory either
      try { to[i].getContext('2d').drawImage(from[i], 0, 0); } catch (err) {}
    }
    return c;
  }

  // While the blocks fly, everything the new page animates with GSAP waits: a hero's opening would otherwise play, or
  // half play, where nobody sees it (Rimbo on the Service page: "does it block the whole animation?"). Whole animations
  // are paused, never a tween inside a timeline: a paused child is left behind when its timeline ends, and that once
  // left the menu bar invisible. Looked at every frame, because page code starts its opening late: after the fonts,
  // after a script of its own arrives; and looked at before GSAP moves anything in that frame, because making the blocks
  // takes one long frame and a short delay (the Service hero's 0.15 s) would run out inside it. The blocks' own
  // animations carry data: 'rd-impact' and run on
  function holdNewPage() {
    var held = [], on = true;
    function sweep() {
      if (!on) return;
      gsap.globalTimeline.getChildren(false, true, true).forEach(function (a) {
        if (a.data === 'rd-impact' || a.scrollTrigger || a.paused() || a.progress() >= 1) return;
        a.pause();
        held.push(a);
      });
    }
    sweep();
    gsap.ticker.add(sweep, false, true); // true: ahead of GSAP's own update
    return {
      release: function () {
        on = false;
        gsap.ticker.remove(sweep);
        held.forEach(function (a) { if (a.paused()) a.resume(); });
      }
    };
  }

  // Scripts the arriving page adds for itself (the Work hero's file comes from a CDN). The copy waits for them, with a
  // limit, so the blocks show the page the way its code set it up and not a moment before
  function watchScripts() {
    var waits = [];
    var note = function (records) {
      records.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.tagName !== 'SCRIPT' || !n.src) return;
          waits.push(new Promise(function (done) { n.addEventListener('load', done, { once: true }); n.addEventListener('error', done, { once: true }); }));
        });
      });
    };
    var mo = new window.MutationObserver(note);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return function (ms) {
      note(mo.takeRecords());
      mo.disconnect();
      return Promise.race([Promise.all(waits), new Promise(function (done) { setTimeout(done, ms); })]);
    };
  }

  // the arriving page's pictures on screen get a moment to load, so its blocks aren't empty
  function picturesReady(container, H, ms) {
    var waits = qsa('img', container).filter(function (img) {
      if (img.complete) return false;
      var r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < H;
    }).map(function (img) { return new Promise(function (done) { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }); });
    return Promise.race([Promise.all(waits), new Promise(function (done) { setTimeout(done, ms); })]);
  }

  // The blocks, made from the page you are on. The cut starts by itself; fill(copy) puts the next page on the faces that
  // turn up; burst() = the burst and the landing (tl)
  function impactBlocks(oldSnap, W, H, point) {
    var cols = W < 600 ? 3 : W < 1000 ? 5 : 7, rows = Math.max(2, Math.round(cols * H / W));
    var w = W / cols, h = H / rows, depth = h / 2;
    var layer = impactStage(), stage = layer.host;
    var grain = document.createElement('div'), scene = document.createElement('div');
    grain.className = 'rd-impact__grain'; scene.className = 'rd-impact__scene';
    stage.style.background = CUBE_VOID; layer.root.style.perspective = W + 'px';
    grain.style.backgroundImage = CUBE_GRAIN;
    layer.root.appendChild(grain); layer.root.appendChild(scene);
    var show = function (f, snap, c, r) { var copy = snapCopy(snap, [c * w - 8, r * h - 8, (c + 1) * w + 8, (r + 1) * h + 8]); copy.style.left = (-c * w) + 'px'; copy.style.top = (-r * h) + 'px'; f.appendChild(copy); };
    var face = function (box, css, side) {
      var f = document.createElement('div');
      f.className = 'rd-impact__face' + (side ? ' rd-impact__side' : '');
      f.style.cssText = css;
      box.appendChild(f);
      return f;
    };
    var blocks = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var piece = document.createElement('div'), box = document.createElement('div');
      piece.className = 'rd-impact__piece'; box.className = 'rd-impact__box';
      piece.style.cssText = 'left:' + c * w + 'px;top:' + r * h + 'px;width:' + w + 'px;height:' + h + 'px';
      show(face(box, 'transform:rotateX(0deg) translateZ(' + depth + 'px)'), oldSnap, c, r);              // the page you leave
      var up = face(box, 'transform:rotateX(90deg) translateZ(' + (depth + 0.5) + 'px)');                 // where you go: filled later
      face(box, 'transform:rotateX(-90deg) translateZ(' + depth + 'px)', true);
      face(box, 'transform:rotateX(180deg) translateZ(' + depth + 'px)', true);
      [90, -90].forEach(function (deg) { face(box, 'left:' + (w / 2 - depth) + 'px;width:' + depth * 2 + 'px;transform:rotateY(' + deg + 'deg) translateZ(' + w / 2 + 'px)', true); });
      piece.appendChild(box); scene.appendChild(piece);
      gsap.set(box, { z: -depth, transformOrigin: '50% 50%', force3D: true });
      var vx = (c + 0.5) * w - point.x, vy = (r + 0.5) * h - point.y;
      blocks.push({ piece: piece, box: box, up: up, r: r, c: c, vx: vx, vy: vy, dist: Math.hypot(vx, vy) || 1 });
    }

    // Safari takes a shadow tree's style sheets into use a moment after they are handed over, and may paint a frame
    // before that: every block then shows its piece of the page without any of the site's CSS, plain text on white, which
    // on a phone reads as the site breaking (Rimbo, on his iPhone: "it breaks the site... like it's too much or it
    // crashes"; seen in the iPhone Simulator, not on every run). Asking for a computed style inside the tree makes the
    // browser take the sheets into use now. Called once the layer is on the page, and again when the next page's copy
    // has gone on the blocks
    function settle() {
      var probe = scene.querySelector('.rd-snap') || scene;
      try { void window.getComputedStyle(probe).position; } catch (err) {}
    }

    // The cut. The lines appearing all at once read as the site breaking (Rimbo: "the first fraction of a second feels a
    // bit like the website is breaking"), so the page is cut by strokes: up from the bottom and in from the left and the
    // right in turn, the seams nearest the click first, and only then do the pieces part. A stroke is orange and gone
    // again ("it doesn't stay red, so it's like a swoosh"); what it leaves is a hairline in the void's colour, half a
    // pixel, that "kind of stays but slowly trails out"; no glow, no white core, no point (his notes on the lab). It all
    // runs on the browser's own animation track
    // (element.animate, transform and opacity only), so it stays smooth while the next page is set up behind it.
    // Stroke and hairline share one set of steps, so the hairline ends exactly under the stroke's tip
    var k = IMPACT_CUT, moves = [], drawn = typeof scene.animate === 'function';
    var cuts = document.createElement('div');
    cuts.className = 'rd-impact__cuts';
    var seams = [], n;
    for (n = 1; n < cols; n++) seams.push({ x: Math.round(n * w), y: H, turn: -90, len: H, far: Math.abs(n * w - point.x) / W });
    for (n = 1; n < rows; n++) seams.push({ x: n % 2 ? 0 : W, y: Math.round(n * h), turn: n % 2 ? 0 : 180, len: W, far: Math.abs(n * h - point.y) / H });
    var STEPS = 24, tip = []; // where the stroke's tip is at each step, 0 = the seam's start, 1 = its end (power2.inOut)
    for (n = 0; n <= STEPS; n++) { var t = n / STEPS; tip.push((1 + k.strokeLen) * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)); }
    if (drawn) seams.forEach(function (m) {
      var seam = document.createElement('div'), scar = document.createElement('div'), stroke = document.createElement('div');
      var trail = document.createElement('div'), line = document.createElement('div');
      seam.className = 'rd-impact__seam'; scar.className = 'rd-impact__scar'; stroke.className = 'rd-impact__stroke';
      trail.className = 'rd-impact__trail'; line.className = 'rd-impact__line';
      line.style.transform = 'translateX(' + (-2 * m.len) + 'px)';
      trail.appendChild(line); scar.appendChild(trail);
      seam.style.width = m.len + 'px';
      seam.style.transform = 'translate(' + m.x + 'px,' + m.y + 'px) rotate(' + m.turn + 'deg)';
      stroke.style.width = (k.strokeLen * m.len) + 'px';
      stroke.style.transform = 'translateX(' + (-k.strokeLen * m.len) + 'px)';
      seam.appendChild(scar); seam.appendChild(stroke); cuts.appendChild(seam);
      var timing = { duration: k.stroke * 1000, delay: m.far * k.lineSpread * 1000, easing: 'linear', fill: 'both' };
      moves.push(stroke.animate(tip.map(function (p) { return { transform: 'translateX(' + ((p - k.strokeLen) * m.len).toFixed(1) + 'px)' }; }), timing));
      moves.push(line.animate(tip.map(function (p) { return { transform: 'translateX(' + ((Math.min(1, p) - 2) * m.len).toFixed(1) + 'px)' }; }), timing));
      moves.push(trail.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + (k.trail * m.len).toFixed(1) + 'px)' }],
        { duration: k.trailDur * 1000, delay: timing.delay + k.stroke * 800, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'both' }));
    });
    layer.root.appendChild(cuts);
    blocks.forEach(function (b) {
      if (!drawn) return gsap.set(b.box, { scale: k.scale }); // no animation track: the page is simply cut
      moves.push(b.piece.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + k.scale + ')' }], { duration: k.part * 1000, delay: (k.partAt + b.dist / w * k.spread) * 1000, easing: 'cubic-bezier(.33,1,.68,1)', fill: 'both' }));
    });
    // the drawn lines make way for the real gaps as these open
    if (drawn) moves.push(cuts.animate([{ opacity: 1 }, { opacity: 0 }], { duration: k.part * 1000, delay: (k.partAt + k.part * 0.4) * 1000, easing: 'linear', fill: 'both' }));

    var o = IMPACT, tl = gsap.timeline({ paused: true, data: 'rd-impact' });
    var rand = function (a, b) { return a + Math.random() * (b - a); };
    blocks.forEach(function (b) {
      var at = b.dist / w * o.stagger, d = o.dur;
      var push = o.burst * (1 - Math.min(b.dist / Math.hypot(W, H), 1) * 0.6); // the nearest blocks are pushed furthest
      var dx = rand(-0.5, 0.5) * W * o.drift + b.vx / b.dist * push, dy = b.vy / b.dist * push;
      tl.to(b.box, { z: -depth - rand(o.far[0], o.far[1]), x: dx, y: dy, rotateZ: rand(-0.5, 0.5) * o.spinZ, rotateY: rand(-0.5, 0.5) * o.spinY, duration: d * 0.45, ease: 'power3.out' }, at);
      tl.to(b.box, { rotateX: -90, duration: d * 0.6, ease: 'power2.inOut' }, at + d * 0.2);
      tl.to(b.box, { z: -depth, x: 0, y: 0, rotateZ: 0, rotateY: 0, scale: 1, duration: d * 0.55, ease: 'power3.inOut' }, at + d * 0.45 + o.hang);
    });
    return {
      stage: stage, tl: tl,
      fill: function (newSnap) { layer.restyle(); blocks.forEach(function (b) { show(b.up, newSnap, b.c, b.r); }); settle(); },
      settle: settle,
      // the cut's own animations hand the parted blocks to the timeline, in one frame
      burst: function () {
        moves.forEach(function (m) { m.cancel(); });
        if (drawn) blocks.forEach(function (b) { gsap.set(b.box, { scale: k.scale }); });
        cuts.remove();
        tl.play();
      }
    };
  }

  // The click: the page is copied and cut at once, before the next page has even been asked for, so the click answers
  // straight away (Rimbo: "the screen first gets cut, for a fraction of a second, and then…"). Called from barba.go
  function impactCut(href, trigger) {
    if (useCube() || reducedMotion || impactPending || !trigger || trigger.nodeType !== 1 || !trigger.isConnected) return;
    var url = new URL(href, location.href);
    if (url.hash || (url.pathname === location.pathname && url.search === location.search) || tearRule({ trigger: trigger })) return;
    var current = qs('[data-barba="container"]');
    if (!current) return;
    var W = document.documentElement.clientWidth, H = window.innerHeight;
    var point = impactPoint({ trigger: trigger }); // before anything moves
    var oldSnap = snapshot(current, W, H, trigger);
    PAGE_HTML_CLASSES.forEach(function (name) { if (document.documentElement.classList.contains(name) && oldSnap.firstElementChild) oldSnap.firstElementChild.classList.add(name); });
    if (rdNavFull.handOver) rdNavFull.handOver(oldSnap); // an open menu is cut up with the page
    var blocks = impactBlocks(oldSnap, W, H, point);
    document.body.appendChild(blocks.stage);
    blocks.settle();
    if (window.lenis) window.lenis.stop();
    impactPending = { blocks: blocks, W: W, H: H, at: performance.now() };
    // the next page never came (Barba then loads it the plain way, or the visitor is offline): don't leave the cut standing
    var mine = impactPending;
    window.setTimeout(function () {
      if (impactPending !== mine) return;
      impactPending = null;
      mine.blocks.stage.remove();
      if (window.lenis) window.lenis.start();
    }, 9000);
  }

  function runImpactLeave(current, next, data) {
    return new Promise(function (resolve) {
      if (!impactPending) impactCut(data.next.url.href, data.trigger && data.trigger.nodeType === 1 ? data.trigger : document.body); // a move that didn't start with a click on a link
      var pending = impactPending;
      impactPending = null;
      if (!pending) { // no cut could be made: the plain swap
        return runFadeLeave(current).then(function () { return runFadeEnter(next, data); }).then(resolve);
      }
      var blocks = pending.blocks, W = pending.W, H = pending.H;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () { // Webflow.destroy() needs a frame before it can start again (restartWebflow)
          var scripts = watchScripts();
          var started = startCube(data);
          var scriptsReady = scripts(900);
          current.remove(); // its copy on the blocks stands in for it
          if (window.lenis) window.lenis.stop();
          var hold = holdNewPage();
          Promise.all([picturesReady(next, H, 350), scriptsReady]).then(function () {
            return new Promise(function (frame) { window.requestAnimationFrame(frame); }); // what a late script just set up is on the page
          }).then(function () {
            blocks.fill(snapshot(next, W, H));
            blocks.tl.eventCallback('onComplete', function () {
              gsap.set(next, { clearProps: 'opacity,visibility' });
              blocks.stage.remove();
              hold.release();
              playVideos(started.nextVideos);
              finishCube(started);
              resolve();
            });
            // the cut stands for a moment however fast the page came, and two frames pass after the new faces went on:
            // they are drawn before anything moves, so that heavy frame doesn't stutter the flight
            var wait = Math.max(0, IMPACT_CUT.minHold * 1000 - (performance.now() - pending.at));
            window.setTimeout(function () {
              window.requestAnimationFrame(function () { window.requestAnimationFrame(blocks.burst); });
            }, wait);
          });
        });
      });
    });
  }

  // -----------------------------------------
  // TICKET TEAR
  // The Journey pass's button (any link inside .pass) rips the ticket along its perforation: the main part goes up, the
  // stub goes down, and the next page (/apply) was behind it all along. On that page X ([data-tear-close]) and the Back
  // button play it backwards, to the same spot on the page you came from. Opened any other way, X is a plain link home.
  // The two halves are copies of the ticket, so its look stays in Webflow. Rimbo picked "1 Ticket" with the sound from the
  // lab in prototype/ticket-tear. A tear keeps the arriving page in the flow, at the scroll it needs, and lifts the
  // leaving page into a fixed layer: forward /apply starts at its top, backwards the old page lands where you were
  // -----------------------------------------
  var TEAR_PRESS = 0.14, TEAR_RIP = 0.56, TEAR_FLY = 1.0, TEAR_PAPER = '#F8F5EE';
  var tearReturn = null; // { from, to, y, ground } while you are on the page the ticket tore open

  function tearRule(data) {
    var t = data.trigger;
    return !reducedMotion && !!(t && t.nodeType === 1 && t.closest('.pass'));
  }
  function tearBackRule(data) {
    return !reducedMotion && !!tearReturn && (data.trigger === 'back' || data.trigger === 'forward' || data.trigger === 'popstate') &&
      samePage(data.current.url.href, tearReturn.to) && samePage(data.next.url.href, tearReturn.from);
  }
  function samePage(a, b) {
    var x = new URL(a, location.href), y = new URL(b, location.href);
    return x.pathname.replace(/\/$/, '') === y.pathname.replace(/\/$/, '') && x.search === y.search;
  }

  // The ticket tear: its CSS lives in Webflow since 2026-11-19 (site head code), main.js only builds and moves it

  function tearRand(a, b) { return a + Math.random() * (b - a); }
  function tearEl(cls, parent) {
    var el = document.createElement('div');
    el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }

  // Where the ticket really is: flat, without the mouse tilt and the stub's hover lift (both are carried over)
  function tearMeasure(pass) {
    var main = qs('.pass_main', pass), stub = qs('.pass_stub', pass);
    if (!main || !stub) return null;
    var tilt = pass.style.transform, lift = getComputedStyle(stub).transform, stubStyle = stub.style.cssText;
    pass.style.transform = 'none';
    stub.style.transition = 'none';
    stub.style.transform = 'none';
    var P = pass.getBoundingClientRect(), M = main.getBoundingClientRect(), S = stub.getBoundingClientRect();
    var cs = getComputedStyle(pass);
    var angle = /rotateX\(([-\d.]+)deg\) rotateY\(([-\d.]+)deg\)/.exec(tilt);
    stub.style.cssText = stubStyle;
    pass.style.transform = tilt;
    return {
      P: P, M: M, S: S, width: cs.width, height: cs.height, zoom: parseFloat(cs.zoom) || 1,
      lift: lift === 'none' ? '' : lift, tiltX: angle ? +angle[1] : 0, tiltY: angle ? +angle[2] : 0,
      stacked: S.top >= M.bottom - 3 // on phones the stub sits under the main part and the tear runs across
    };
  }

  // One copy of the ticket per half, each showing only its own half, in the spot of the real one
  function tearPart(pass, m, kind, parent) {
    var part = tearEl('tear_part is-' + kind, parent);
    part.style.cssText = 'left:' + m.P.left + 'px;top:' + m.P.top + 'px;width:' + m.P.width + 'px;height:' + m.P.height + 'px';
    var half = kind === 'main' ? m.M : m.S;
    var shadow = tearEl('tear_shadow', part);
    shadow.style.cssText = 'left:' + (half.left - m.P.left) + 'px;top:' + (half.top - m.P.top) + 'px;width:' + half.width + 'px;height:' + half.height + 'px';
    var clone = pass.cloneNode(true);
    clone.classList.add('tear_clone', 'is-' + kind);
    clone.removeAttribute('id');
    clone.style.width = m.width;
    clone.style.height = m.height;
    clone.style.transform = 'none';
    clone.style.visibility = ''; // the real ticket hides while its copies are out
    var inner = qs(kind === 'main' ? '.pass_main' : '.pass_stub', clone);
    if (kind === 'stub' && m.lift) inner.style.transform = m.lift;
    var shade = tearEl('tear_shade', inner);
    part.appendChild(clone);
    return { part: part, clone: clone, shade: shade, shadow: shadow };
  }

  // The white core of the paper: little fibres on every tab between two holes, revealed as the tip runs past
  function tearFibre(part, m, dir) {
    var NS = 'http://www.w3.org/2000/svg';
    var length = m.stacked ? m.P.width : m.P.height, pitch = 14 * m.zoom, at = 14 * m.zoom + pitch * 0.5, d = '';
    while (at < length - 14 * m.zoom) {
      var a = at - pitch * 0.32, b = at + pitch * 0.32, s = a, line = [[0, a]];
      while (s < b) {
        s = Math.min(b, s + tearRand(0.8, 2));
        line.push([dir * tearRand(0.5, Math.random() < 0.12 ? 4.5 : 2.4), s]);
      }
      line.push([0, b]);
      d += 'M' + line.map(function (p) { return m.stacked ? p[1] + ' ' + p[0] : p[0] + ' ' + p[1]; }).join('L') + 'Z';
      at += pitch;
    }
    var svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
    svg.setAttribute('class', 'tear_fibre');
    svg.setAttribute('aria-hidden', 'true');
    path.setAttribute('d', d);
    path.setAttribute('fill', TEAR_PAPER);
    svg.appendChild(path);
    if (m.stacked) {
      svg.style.cssText = 'left:0;top:' + (m.S.top - m.P.top) + 'px;width:' + length + 'px;height:1px';
      svg.setAttribute('viewBox', '0 0 ' + length + ' 1');
    } else {
      svg.style.cssText = 'left:' + (m.S.left - m.P.left) + 'px;top:0;width:1px;height:' + length + 'px';
      svg.setAttribute('viewBox', '0 0 1 ' + length);
    }
    part.appendChild(svg);
    return svg;
  }
  function tearFibreShow(svg, tip, stacked) {
    svg.style.clipPath = stacked // the clip reaches past the 1 px box the fibres stick out of
      ? 'inset(-8px ' + ((1 - tip) * 100) + '% -8px 0)'
      : 'inset(0 -8px ' + ((1 - tip) * 100) + '% -8px)';
  }

  // Square bits of paper that come off at the tip
  function tearFlecks(tl, parent, m, startAt) {
    var length = m.stacked ? m.P.width : m.P.height, count = Math.round(length / 22);
    for (var i = 0; i < count; i++) {
      var p = (i + tearRand(0.1, 0.9)) / count, size = tearRand(1.5, Math.random() < 0.15 ? 7 : 4);
      var fleck = tearEl('tear_fleck', parent);
      fleck.style.width = size + 'px';
      fleck.style.height = tearRand(1.5, size) + 'px';
      if (Math.random() < 0.3) fleck.style.background = '#ECE5D6';
      var x = m.stacked ? m.P.left + p * length : m.S.left, y = m.stacked ? m.S.top : m.P.top + p * length;
      var at = startAt + TEAR_RIP * Math.sqrt(p); // when the tip passes: it speeds up (power1.in)
      var side = Math.random() < 0.5 ? -1 : 1, life = tearRand(0.35, 0.85);
      tl.fromTo(fleck, { x: x, y: y, rotation: tearRand(0, 90), opacity: 0 }, { opacity: 1, duration: 0.03, ease: 'none' }, at);
      tl.to(fleck, {
        x: x + (m.stacked ? tearRand(-50, 50) : side * tearRand(12, 170)),
        y: y + (m.stacked ? side * tearRand(12, 110) : tearRand(-50, 40)),
        rotation: tearRand(-420, 420), duration: life, ease: 'power2.out'
      }, at);
      tl.to(fleck, { y: '+=' + tearRand(50, 200), duration: life, ease: 'power2.in' }, at);
      tl.to(fleck, { opacity: 0, duration: life * 0.4, ease: 'power1.in' }, at + life * 0.6);
    }
  }

  // The rip you hear: made here, no file to host. Rough noise that speeds up with the tip, a click on every tab, the last
  // tab letting go and a soft whoosh; backwards it plays reversed
  // Off since 2026-11-10: nothing else on the site makes a sound, so with the volume up the rip came as a shock (Rimbo)
  var TEAR_SOUND = false;
  var tearAudio = null, tearBuffers = null, tearPlaying = null;
  function tearSound(back, speed, offset) {
    if (!TEAR_SOUND) return;
    try {
      if (!tearAudio) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        tearAudio = new Ctx();
        tearBuffers = tearRipBuffers(tearAudio);
      }
      if (tearAudio.state === 'suspended') tearAudio.resume();
      if (tearPlaying) { try { tearPlaying.stop(); } catch (err) {} }
      var src = tearAudio.createBufferSource(), gain = tearAudio.createGain();
      src.buffer = back ? tearBuffers.back : tearBuffers.rip;
      src.playbackRate.value = speed;
      gain.gain.value = 0.32;
      src.connect(gain);
      gain.connect(tearAudio.destination);
      src.start(0, offset || 0);
      tearPlaying = src;
    } catch (err) { /* no sound is fine */ }
  }
  function tearRipBuffers(ctx) {
    var rate = ctx.sampleRate, n = Math.floor((TEAR_PRESS + TEAR_RIP + TEAR_FLY + 0.2) * rate);
    var data = new Float32Array(n), ripEnd = TEAR_PRESS + TEAR_RIP, prev = 0, low = 0, i, j;
    for (i = 0; i < n; i++) {
      var t = i / rate, white = Math.random() * 2 - 1, high = white - prev;
      prev = white;
      var rip = t > TEAR_PRESS && t < ripEnd ? Math.pow((t - TEAR_PRESS) / TEAR_RIP, 0.7) : 0;
      var fall = t >= ripEnd ? Math.exp(-(t - ripEnd) * 26) : 0;
      low += (white - low) * 0.05;
      var flutter = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 58 + Math.sin(t * 90) * 2);
      var whoosh = t > ripEnd ? Math.sin(Math.min(1, (t - ripEnd) / (TEAR_FLY * 0.8)) * Math.PI) : 0;
      data[i] = high * (rip * flutter + fall) * 0.24 + low * whoosh * 0.5;
    }
    for (var k = 0; k < 42; k++) {
      var start = Math.floor((TEAR_PRESS + TEAR_RIP * Math.sqrt((k + tearRand(0.1, 0.9)) / 42)) * rate);
      var amp = tearRand(0.25, 0.75) * (0.5 + k / 42 * 0.6), len = Math.floor(rate * tearRand(0.003, 0.008));
      for (j = 0; j < len && start + j < n; j++) data[start + j] += (Math.random() * 2 - 1) * amp * Math.pow(1 - j / len, 2);
    }
    var snap = Math.floor(ripEnd * rate);
    for (j = 0; j < rate * 0.05 && snap + j < n; j++) {
      data[snap + j] += (Math.sin(j / rate * 2 * Math.PI * 170) * 0.5 + (Math.random() * 2 - 1) * 0.45) * Math.exp(-j / (rate * 0.012));
    }
    var rip = ctx.createBuffer(1, n, rate), back = ctx.createBuffer(1, n, rate);
    rip.copyToChannel(data, 0);
    back.copyToChannel(data.slice().reverse(), 0);
    return { rip: rip, back: back };
  }

  // The ground the ticket rips on is always dark, as in the lab Rimbo picked: the dark the ticket lies on (the home's own
  // black), or the site's black when it lies on something light. On a light ground the paper and its shadow went muddy
  var TEAR_DARK = 'var(--color--black, #131313)';
  function tearTable(pass) {
    for (var el = pass.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      var c = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(getComputedStyle(el).backgroundColor);
      if (!c || (c[4] !== undefined && +c[4] < 0.9)) continue;
      return (0.2126 * c[1] + 0.7152 * c[2] + 0.0722 * c[3]) / 255 < 0.25 ? 'rgb(' + c[1] + ',' + c[2] + ',' + c[3] + ')' : TEAR_DARK;
    }
    return TEAR_DARK;
  }

  // The tear itself, forwards: the lab's version 1 ("1 Ticket"), Rimbo's pick. Only the ticket rips, never the page around
  // it (he turned the whole page cut down twice). Backwards it is the same timeline in reverse. form = the page behind the ticket
  function tearTimeline(pass, m, ground, form, stage) {
    var H = window.innerHeight, tl = gsap.timeline({ paused: true });
    var seamX = m.S.left - m.P.left, seamY = m.S.top - m.P.top;
    var flecks = tearEl('', stage);
    var main = tearPart(pass, m, 'main', stage), stub = tearPart(pass, m, 'stub', stage);
    stage.appendChild(flecks);
    var fibres = [tearFibre(main.part, m, 1), tearFibre(stub.part, m, -1)];
    fibres.forEach(function (svg) { tearFibreShow(svg, 0, m.stacked); });
    gsap.set([main.part, stub.part], { transformOrigin: m.stacked ? (m.P.width + 'px ' + seamY + 'px') : (seamX + 'px ' + m.P.height + 'px') }); // the tear runs towards this point
    gsap.set([main.clone, stub.clone], { transformPerspective: 1600, rotationX: m.tiltX, rotationY: m.tiltY });

    var ripAt = TEAR_PRESS, flyAt = ripAt + TEAR_RIP - 0.02, tip = { p: 0 };
    tl.to([main.clone, stub.clone], { rotationX: 0, rotationY: 0, duration: 0.3, ease: 'power2.out' }, 0);
    tl.to(ground, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 0.02);
    // pulled tight
    tl.to(main.part, { y: -2.5, duration: TEAR_PRESS, ease: 'power2.out' }, 0);
    tl.to(stub.part, { y: 2.5, duration: TEAR_PRESS, ease: 'power2.out' }, 0);
    // the tip runs along the perforation, speeding up
    tl.to(tip, {
      p: 1, duration: TEAR_RIP, ease: 'power1.in',
      onUpdate: function () { fibres.forEach(function (svg) { tearFibreShow(svg, tip.p, m.stacked); }); }
    }, ripAt);
    tl.to(main.part, m.stacked ? { rotation: 1.1, y: -7, duration: TEAR_RIP, ease: 'power1.in' } : { rotation: -0.9, y: -8, x: -2, duration: TEAR_RIP, ease: 'power1.in' }, ripAt);
    tl.to(stub.part, m.stacked ? { rotation: -1.6, y: 7, duration: TEAR_RIP, ease: 'power1.in' } : { rotation: 2.1, y: 8, x: 4, duration: TEAR_RIP, ease: 'power1.in' }, ripAt);
    tl.to([main.shadow, stub.shadow], { opacity: 1, duration: TEAR_RIP, ease: 'power1.in' }, ripAt);
    tearFlecks(tl, flecks, m, ripAt);
    // the last tab lets go: the main part up, the stub down
    var up = (m.stacked ? m.M.bottom : m.P.bottom) + 90 + (m.stacked ? 0 : m.P.width * 0.1);
    var down = H - (m.stacked ? m.S.top : m.P.top) + 90 + (m.stacked ? 0 : m.S.width * 0.2);
    tl.to(main.part, { y: -up, x: m.stacked ? 0 : -14, rotation: m.stacked ? 3 : -5, rotationX: 22, duration: TEAR_FLY, ease: 'osmo' }, flyAt);
    tl.to(stub.part, { y: down, x: m.stacked ? 0 : 26, rotation: m.stacked ? -4 : 11, rotationX: -22, duration: TEAR_FLY * 0.96, ease: 'osmo' }, flyAt);
    tl.to([main.shade, stub.shade], { opacity: 1, duration: TEAR_FLY * 0.6, ease: 'power1.in' }, flyAt);
    // the form page was there all along
    tl.fromTo(form, { autoAlpha: 0, y: 26, scale: 0.975 }, { autoAlpha: 1, y: 0, scale: 1, duration: TEAR_FLY * 0.85, ease: 'osmo', immediateRender: false }, flyAt + 0.08);
    return tl;
  }

  function runTear(data, back) {
    var current = data.current.container, next = data.next.container;
    var memory = tearReturn;
    return new Promise(function (resolve) {
      // Webflow.destroy() ran in beforeEnter; its engine needs a frame to notice before it can start again (see restartWebflow)
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (rdNavFull.close) rdNavFull.close(true);
          if (window.lenis) window.lenis.stop();
          var pass = back ? null : data.trigger.closest('.pass');
          var m = pass ? tearMeasure(pass) : null;
          var y = back ? memory.y : window.scrollY;
          var ground = back ? memory.ground : (pass ? tearTable(pass) : TEAR_DARK);
          var parent = current.parentElement || document.body;
          var passTop = pass ? pass.getBoundingClientRect().top : 0;

          var started = startCube(data, function () {
            if (!back) return;
            gsap.set(next, { autoAlpha: 1 });
            // the home's band hides the logo and the burger for its opening and brings them in last. You land far below
            // that opening, so they stay, as on the way there (Rimbo: "why do they disappear at all?")
            qsa('.bold-nav-full__bar').forEach(function (el) { gsap.killTweensOf(el); gsap.set(el, { clearProps: 'opacity' }); });
            window.scrollTo(0, y); // the page you came from, back at your spot
            if (hasScrollTrigger) ScrollTrigger.update();
            pass = qs('.pass', next);
            // its route line was drawn when you left; the card code would only draw it again after landing, and the copies would come back without it
            if (pass) qsa('.pass_fill, .pass_dot', pass).forEach(function (el) { el.classList.add('is-in'); });
            m = pass ? tearMeasure(pass) : null;
            if (!ground) ground = pass ? tearTable(pass) : TEAR_DARK;
          });
          var leftAt = started.scrollY;

          // The layers, bottom to top: the ticket's page, the ground, the form page, the ticket's halves
          var under = tearEl('tear_layer', null), groundEl = tearEl('', null), over = null;
          under.style.zIndex = 997;
          groundEl.style.cssText = 'position:absolute;inset:0;opacity:0;background:' + ground;
          var face = getComputedStyle(document.body).backgroundColor;
          parent.insertBefore(under, current);
          var form;
          if (back) {
            // the form page leaves: lifted out of the flow, above the ground. The page you came from waits in the flow below
            over = tearEl('tear_layer', null);
            over.style.zIndex = 998;
            parent.insertBefore(over, current);
            over.appendChild(current);
            under.appendChild(groundEl);
            gsap.set(current, { position: 'absolute', top: -leftAt, left: 0, width: '100%', backgroundColor: face, transformOrigin: '50% ' + (leftAt + window.innerHeight / 2) + 'px' });
            form = current;
          } else {
            // the ticket's page leaves into the bottom layer; the form page waits in the flow above it, at its top
            under.style.background = face;
            under.appendChild(current);
            under.appendChild(groundEl);
            gsap.set(current, { position: 'absolute', top: -leftAt, left: 0, width: '100%' });
            // a page that pinned something higher up (the home's dial) is shorter now that its scroll effects are off:
            // without this the page jumped up under the ticket, by two screens on the home
            if (pass) gsap.set(current, { top: -leftAt + passTop - pass.getBoundingClientRect().top });
            gsap.set(next, { position: 'relative', zIndex: 998, backgroundColor: face, transformOrigin: '50% ' + window.innerHeight / 2 + 'px' });
            form = next;
          }
          window.scrollTo(0, back ? y : 0);

          var stage = tearEl('tear_stage', parent);

          // The site's grain lies over each page as a fixed layer. Under the flat dark it dropped out and came back with
          // the next page, so the dark changed tone twice (Rimbo: "some background color alteration"). One copy lies over
          // the whole tear instead, and the pages' own layers wait until it is done
          var grains = qsa('.grain', current).concat(qsa('.grain', next)), grain = null;
          if (grains.length) {
            grain = grains[0].cloneNode(false);
            grain.removeAttribute('id');
            grain.style.zIndex = 999;
            grain.style.pointerEvents = 'none';
            parent.appendChild(grain);
            grains.forEach(function (el) { el.style.visibility = 'hidden'; });
          }

          function done() {
            if (grain) grain.remove();
            grains.forEach(function (el) { el.style.visibility = ''; });
            stage.remove();
            under.remove();
            if (over) over.remove();
            if (pass) pass.style.visibility = '';
            gsap.set(next, { clearProps: 'all' });
            if (back) {
              if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
              tearReturn = null;
            } else if (tearReturn) {
              tearReturn.ground = ground;
            }
            playVideos(started.nextVideos);
            finishCube(started);
            resolve();
          }

          if (!pass || !m) { // no ticket to tear (it is gone from that page): the form page simply fades
            if (back) {
              gsap.timeline({ onComplete: done })
                .set(groundEl, { opacity: 1 })
                .to(form, { autoAlpha: 0, duration: 0.5, ease: 'osmo' })
                .to(groundEl, { opacity: 0, duration: 0.4, ease: 'power1.inOut' }, '-=0.2');
            } else {
              gsap.timeline({ onComplete: done }).fromTo(form, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'osmo' });
            }
            return;
          }
          // Backwards the form page has to end up gone. Played backwards, GSAP puts a page back the way it was before the
          // animation first ran, and /apply was on screen: it stayed visible behind the closing ticket, then vanished at once
          if (back) gsap.set(form, { autoAlpha: 0, y: 26, scale: 0.975 });
          var tl = tearTimeline(pass, m, groundEl, form, stage);
          if (back) { tl.progress(1); pass.style.visibility = 'hidden'; } // the halves wait off screen, the ticket under the dark
          tearReady(stage, function () {
            pass.style.visibility = 'hidden';
            if (back) {
              // the real ticket leans towards the mouse the whole time (card code): over the last 0.3 s the copies lean in
              // with it, so they hand over without a jump (Rimbo: "once it finishes it flickers to the mouse position")
              // The foil in the photo and the layers that shift with the lean do the same: the real ticket is new on this
              // page and its card code moves them to the mouse, while the copies were made at rest. They follow the real
              // one's foil spot all the way and take on its strength and shift over that last 0.3 s (Rimbo: "it's the
              // hologram effect on my image that kind of loads in")
              var copies = qsa('.tear_clone', stage), lean = /rotateX\(([-\d.]+)deg\) rotateY\(([-\d.]+)deg\)/;
              var layers = '.pass_rose, .pass_earth, .pass_stamp, .pass_img, .pass_tex, .pass_holo', shift = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/;
              var real = qsa(layers, pass), twins = copies.map(function (copy) { return qsa(layers, copy); });
              // the foil's values live on the foil layer (.pass_holo) since 2026-11-18, not on the ticket itself (see rdPass)
              var foilOf = function (el) { return qs('.pass_holo', el) || el; }, passFoil = foilOf(pass), copyFoils = copies.map(foilOf);
              var foil0 = parseFloat((copyFoils[0] || passFoil).style.getPropertyValue('--hi')) || 0; // the strength the copies were made with
              tl.eventCallback('onUpdate', function () {
                var t = tl.time(), a = lean.exec(pass.style.transform), k = t >= 0.3 ? 0 : 1 - t / 0.3;
                k = k * k * (3 - 2 * k);
                if (a && t < 0.3) gsap.set(copies, { rotationX: +a[1] * k, rotationY: +a[2] * k });
                var foil = parseFloat(passFoil.style.getPropertyValue('--hi'));
                copies.forEach(function (copy, i) {
                  copyFoils[i].style.setProperty('--hx', passFoil.style.getPropertyValue('--hx'));
                  copyFoils[i].style.setProperty('--hy', passFoil.style.getPropertyValue('--hy'));
                  if (!isNaN(foil)) copyFoils[i].style.setProperty('--hi', (foil0 + (foil - foil0) * k).toFixed(3));
                  twins[i].forEach(function (el, j) {
                    var tf = real[j] && real[j].style.transform;
                    if (tf) el.style.transform = tf.replace(shift, function (all, x, y) { return 'translate(' + (x * k).toFixed(2) + 'px,' + (y * k).toFixed(2) + 'px)'; });
                  });
                });
              });
              tl.timeScale(1.12).eventCallback('onReverseComplete', done).reverse();
              tearSound(true, 1.12, Math.max(0, (TEAR_PRESS + TEAR_RIP + TEAR_FLY + 0.2) - tl.duration()));
            } else {
              tl.eventCallback('onComplete', done).play(0);
              tearSound(false, 1);
            }
          });
        });
      });
    });
  }

  // The tear starts only once its copies of the ticket are drawn (photo, barcode, logo) and the new page's start is
  // painted. Before, the ticket blinked empty for a frame and the fade to dark jumped ahead by that heavy frame (Rimbo:
  // "it flickers to black"). Until then the copies lie exactly on the real ticket
  function tearReady(stage, go) {
    var started = false;
    function start() {
      if (started) return;
      started = true;
      window.requestAnimationFrame(function () { window.requestAnimationFrame(go); });
    }
    Promise.all(qsa('img', stage).map(function (img) { return img.decode ? img.decode().catch(function () {}) : null; })).then(start);
    browserTimeout(start, 400); // never longer than this
  }

  // The plain fade: for the back and forward buttons, anchors and reduced motion, where the page has to land somewhere else than its top
  function runFadeLeave(current) {
    if (rdNavFull.close) rdNavFull.close(true);
    if (window.lenis) window.lenis.stop();
    var tl = gsap.timeline({ onComplete: function () { current.remove(); } });
    if (reducedMotion) return tl.set(current, { autoAlpha: 0 }); // immediate swap
    tl.to(current, { autoAlpha: 0, duration: 0.4, ease: 'osmo' });
    return tl;
  }

  function runFadeEnter(next, data) {
    var tl = gsap.timeline();

    if (reducedMotion) { // immediate swap
      tl.call(swapPage, [data], 0.05);
      tl.set(next, { autoAlpha: 1 });
      return new Promise(function (resolve) { tl.call(resolve); });
    }

    tl.add('startEnter', 0.6);
    tl.call(swapPage, [data], 'startEnter');
    tl.fromTo(next, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'osmo' }, 'startEnter');
    tl.add('pageReady');

    return new Promise(function (resolve) { tl.call(resolve, null, 'pageReady'); });
  }

  // The fade's moment between two pages: old page out, new page in place and running
  function swapPage(data) {
    var next = data.next.container;
    var doc = barba.dom.toDocument(data.next.html);
    if (linkHash && !location.hash) history.replaceState(history.state, '', location.href + linkHash); // Barba drops the anchor from the address
    if (data.current.container) data.current.container.remove();
    closePage(leavePage());
    syncHead(doc).forEach(function (el) { el.remove(); });
    resetPage(next);
    openPage();
    initBeforeEnterFunctions(next, doc);
    restoreScroll(data);
    if (window.lenis) window.lenis.resize();
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }

  // -----------------------------------------
  // BARBA HOOKS + INIT
  // -----------------------------------------

  function startBarba() {
    gsap.registerPlugin(CustomEase);
    CustomEase.create('osmo', '0.625, 0.05, 0, 1');
    history.scrollRestoration = 'manual';
    if (hasScrollTrigger) ScrollTrigger.clearScrollMemory('manual'); // or ScrollTrigger puts 'auto' back, and Back snaps the old page before it fades

    // Barba finds a page by attributes. Our pages don't carry them (40 pages to edit by hand, and every new one to
    // remember), so they are set here: on the page on screen now, and on every page Barba fetches
    document.body.setAttribute('data-barba', 'wrapper');
    pageContainer(document.body).setAttribute('data-barba', 'container');
    var toElement = barba.dom.toElement;
    barba.dom.toElement = function (html) {
      var root = toElement.call(barba.dom, html);
      qsa('.bold-nav-wrap', root).forEach(function (el) { el.parentNode.removeChild(el); }); // the nav is already on screen: see rdNavFull
      pageContainer(root).setAttribute('data-barba', 'container');
      return root;
    };

    barba.hooks.beforeLeave(function (data) {
      scrollMemory[data.current.url.href] = window.scrollY;
    });

    // beforeEnter and afterEnter also fire on the first load, where there is nothing to swap: that is the check on current
    barba.hooks.beforeEnter(function (data) {
      if (!data.current.container) return;
      // The new page waits on top, out of the flow, until swapPage() puts it in place
      gsap.set(data.next.container, { position: 'fixed', top: 0, left: 0, right: 0, autoAlpha: 0 });
      if (window.lenis) window.lenis.stop();
      if (window.Webflow) Webflow.destroy(); // stopped here, started again in swapPage(): see restartWebflow()
      applyThemeFrom(data.next.container);
      return loadPageLibraries(barba.dom.toDocument(data.next.html)); // a page's own plugins (Draggable on the drum pages)
    });

    barba.hooks.enter(function (data) { initBarbaNavUpdate(data); });

    barba.hooks.afterEnter(function (data) {
      if (!data.current.container) return;
      initAfterEnterFunctions(data.next.container);
      if (window.lenis) window.lenis.start();
    });

    // The ticket tear's way back. X on the page the ticket tore open is Back, so the history stays as it was and the Back
    // button does the same. Anywhere else (opened directly, the thank-you page) X stays a plain link
    document.addEventListener('click', function (e) {
      var x = e.target.closest && e.target.closest('[data-tear-close]');
      if (!x || !tearReturn || !samePage(location.href, tearReturn.to)) return;
      e.preventDefault();
      e.stopPropagation();
      if (!barba.transitions.isRunning) history.back();
    }, true);
    // The ticket's page is fetched as soon as a pointer is on the ticket, so the tear starts on the click (the stub isn't a link)
    ['pointerover', 'touchstart'].forEach(function (type) {
      document.addEventListener(type, function (e) {
        var pass = e.target.closest && e.target.closest('.pass'), link = pass && qs('a[href]', pass);
        if (link && !reducedMotion) barba.prefetch(link.href);
      }, { passive: true });
    });
    barba.hooks.before(function (data) { // noted for every click on the ticket, so X is "back" with reduced motion too (then it fades)
      var t = data.trigger;
      if (t && t.nodeType === 1 && t.closest('.pass')) tearReturn = { from: data.current.url.href, to: data.next.url.href, y: window.scrollY, ground: '' };
    });
    barba.hooks.after(function () {
      if (tearReturn && !samePage(location.href, tearReturn.to)) tearReturn = null; // left that page some other way
    });

    // A Webflow form that sends you on after it's done (the apply form to /thank-you) goes through Barba, so the cube plays
    if (window.Webflow && typeof Webflow.location === 'function') {
      var webflowLocation = Webflow.location;
      Webflow.location = function (url) {
        var to = new URL(url, location.href);
        if (to.origin === location.origin && !barbaSkips({ el: document.body, href: to.href })) barba.go(to.href);
        else webflowLocation.call(Webflow, url);
      };
    }

    // One navigation at a time. preventRunning only starts once the page has been fetched, which leaves a gap for a second click
    var navigating = false, go = barba.go;
    barba.go = function (href, trigger, e) {
      if (navigating && trigger && trigger.nodeType) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        return Promise.resolve();
      }
      navigating = true;
      linkHash = new URL(href, location.href).hash;
      try { impactCut(href, trigger); } catch (err) { console.error('[rimbo-designs] impact cut:', err); } // a click on a link: the page is cut before the next one is fetched
      return Promise.resolve(go.call(barba, href, trigger, e)).finally(function () { navigating = false; });
    };

    barba.init({
      debug: false,
      timeout: 7000,
      preventRunning: true,
      prevent: barbaSkips,
      transitions: [{
        name: 'default',
        sync: true,
        once: function (data) {
          initOnceFunctions();
          return runPageOnceAnimation(data.next.container);
        },
        leave: function (data) { return runFadeLeave(data.current.container); },
        enter: function (data) { return runFadeEnter(data.next.container, data); }
      }, {
        name: 'impact',
        sync: true,
        custom: function (data) { return data.trigger !== 'back' && data.trigger !== 'forward' && data.trigger !== 'popstate' && !linkHash && !reducedMotion && !tearRule(data); },
        leave: function (data) { return useCube() ? runPageLeaveAnimation(data.current.container, data.next.container, data) : runImpactLeave(data.current.container, data.next.container, data); },
        enter: function () { return runPageEnterAnimation(); }
      }, {
        name: 'tear',
        sync: true,
        custom: tearRule,
        leave: function (data) { return runTear(data, false); },
        enter: function () { return Promise.resolve(); }
      }, {
        name: 'tear-back',
        sync: true,
        custom: tearBackRule,
        leave: function (data) { return runTear(data, true); },
        enter: function () { return Promise.resolve(); }
      }]
    });
  }

  // Links Barba leaves to the browser
  function barbaSkips(link) {
    var el = link.el, url = new URL(link.href, location.href);
    var isNl = function (p) { return /^\/nl(\/|$)/.test(p); };
    if (el.hasAttribute('hreflang')) return true;                                    // the language switch has its own leave
    if (isNl(url.pathname) !== isNl(location.pathname)) return true;                 // so does every other way into the other language
    if (url.pathname === location.pathname && url.hash) return true;                 // an anchor on this page
    if (/\.(pdf|zip|png|jpe?g|webp|svg|mp4)$/i.test(url.pathname)) return true;      // files
    return false;
  }

  // -----------------------------------------
  // GENERIC + HELPERS
  // -----------------------------------------

  // The one element that holds a whole page: .page-wrapper, or .main-wrapper on the oldest case studies. Some pages keep
  // their footer next to it (Contact, the newsletter), and those get a plain wrapper around the two, so it all swaps as one
  function pageContainer(root) {
    var kids = Array.prototype.filter.call(root.children, function (el) {
      return !/^(SCRIPT|STYLE|NOSCRIPT|LINK|META|TITLE|BASE)$/.test(el.tagName) && !/bold-nav|w-webflow-badge|scroll-ruler/.test(el.className);
    });
    if (kids.length === 1) return kids[0];
    var wrapper = document.createElement('div');
    root.insertBefore(wrapper, kids[0]);
    kids.forEach(function (el) { wrapper.appendChild(el); });
    return wrapper;
  }

  function openPage() {
    pageVisits++;
    if (!barbaOn) return;
    pageScope = { dead: false, undo: [], styles: [], gsap: gsap.context(function () {}) };
  }

  // Runs code as part of the page on screen, so it can be cleaned up when the page leaves
  function inPage(fn) {
    if (!pageScope) return fn();
    var before = zone;
    zone = pageScope;
    try { return pageScope.gsap.add(fn); } finally { zone = before; }
  }

  // Closing a page has two halves, because on the cube the old page stays on screen while the new one starts.
  // leavePage(): the new page can start now. The old page's scroll animations hold still and what it left outside itself goes
  function leavePage() {
    var scope = pageScope;
    if (!scope) return null;
    pageScope = null;
    scope.left = true;
    scope.triggers = hasScrollTrigger ? ScrollTrigger.getAll() : [];
    scope.pinned = scope.triggers.filter(function (trigger) { return trigger.pin && trigger.isActive; }); // noted now, while they still say so: holdPins() needs to know which pins were holding
    // kill(false), not disable(false): both leave the page exactly as it stands, but a disabled trigger stays on
    // ScrollTrigger's list, and the refresh for the new page then takes its pin out of place (the dial jumped up on the cube)
    scope.triggers.forEach(function (trigger) { trigger.kill(false); });
    scope.htmlClasses = PAGE_HTML_CLASSES.filter(function (name) { return document.documentElement.classList.contains(name); });
    document.documentElement.classList.remove.apply(document.documentElement.classList, PAGE_HTML_CLASSES);
    scope.styles.forEach(function (el) { el.removeAttribute('id'); }); // a new page checks by id whether its CSS is there: this copy is on its way out
    // the ruler fades off (its own is-out), out of the new page's way now and gone with the old page in closePage()
    scope.rulers = qsa('[data-scroll-ruler-init]');
    scope.rulers.forEach(function (el) { el.removeAttribute('data-scroll-ruler-init'); el.classList.add('is-out'); });
    qsa('.bold-nav-full__bar').forEach(function (el) { gsap.killTweensOf(el); gsap.set(el, { clearProps: 'opacity' }); }); // the band hides it during its opening
    return scope;
  }

  // closePage(): the old page is gone. Stops everything it started
  function closePage(scope) {
    if (!scope) return;
    scope.dead = true;
    scope.rulers.forEach(function (el) { el.remove(); });
    scope.undo.forEach(function (fn) { try { fn(); } catch (err) { console.error('[rimbo-designs] cleanup:', err); } });
    scope.gsap.revert(); // also lets go of SplitText: its autoSplit would otherwise rebuild the old page's reveals on the next resize
    scope.triggers.forEach(function (trigger) { trigger.kill(); });
    // animations started later, from a click or a timer: gsap.context only knows the first round. Whatever only moves
    // elements that are gone goes too, timelines with their callbacks included
    gsap.globalTimeline.getChildren(false, true, true).forEach(function (animation) {
      var tweens = animation.getChildren ? animation.getChildren(true, true, false) : [animation];
      var nodes = [].concat.apply([], tweens.map(function (t) { return t.targets(); })).filter(function (t) { return t.nodeType; });
      if (nodes.length && nodes.every(function (t) { return !t.isConnected; })) animation.kill();
    });
  }

  // Everything of the new page outside .page-wrapper: address details, language, the CSS from its head and footer code
  function syncHead(doc) {
    var root = document.documentElement;
    ['lang', 'data-wf-page', 'data-wf-collection', 'data-wf-item-slug'].forEach(function (name) {
      var value = doc.documentElement.getAttribute(name);
      if (value === null) root.removeAttribute(name); else root.setAttribute(name, value);
    });
    // the structured data too: a page's own code adds its FAQ or breadcrumb to the head, and those stayed behind, one more per visit
    // meta[name^="rd-"] is a page's own data for this file (the city's name on a city page, see rdLocCity)
    var details = 'meta[name="description"], meta[name^="rd-"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"]';
    qsa(details, document.head).forEach(function (el) { el.remove(); });
    qsa(details, doc.head).forEach(function (el) { document.head.appendChild(document.importNode(el, true)); });

    var wanted = qsa('head style, body > style', doc).map(function (el) { return el.textContent; });
    var stale = [];
    pageStyles = pageStyles.filter(function (el) {
      var i = wanted.indexOf(el.textContent);
      if (i < 0) { stale.push(el); return false; }
      wanted.splice(i, 1);
      return true;
    });
    wanted.forEach(function (css) {
      var style = document.createElement('style');
      style.textContent = css;
      rdHead(style);
      pageStyles.push(style);
    });
    return stale; // the old page's own CSS: the caller removes it once that page has left the screen
  }

  // Plugins a page loads for itself. Webflow's own files stay out: one copy runs the whole site
  function loadPageLibraries(doc) {
    var loaded = qsa('script[src]').map(function (el) { return el.getAttribute('src'); });
    var missing = qsa('script[src]', doc).map(function (el) { return el.getAttribute('src'); }).filter(function (src) {
      return loaded.indexOf(src) < 0 && !/\/js\/webflow\.|\/main\.(min\.)?js|__main/.test(src);
    });
    return Promise.all(missing.map(function (src) {
      return new Promise(function (done) {
        var script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.onload = script.onerror = done;
        document.head.appendChild(script);
      });
    }));
  }

  // Code typed into a page's settings in Webflow. A swapped page never runs its scripts, so they run here. The site-wide
  // ones are skipped. For the length of the run, listeners and clocks are caught so they can leave with the page, and
  // "wait for the page" (DOMContentLoaded, load) means now: the page is there
  var SITE_SCRIPTS = /gtm\.start|w-mod-|gtag\(|google_tags_first_party|registerPlugin\(ScrollTrigger,SplitText\)/;
  function runPageScripts(root) {
    var code = qsa('script:not([src])', root).filter(function (el) {
      return (!el.type || el.type === 'text/javascript') && !SITE_SCRIPTS.test(el.textContent);
    }).map(function (el) { return el.textContent; });
    if (!code.length) return;

    var waiting = [], pageInterval = window.setInterval, pageTimeout = window.setTimeout;
    [window, document].forEach(function (target) {
      target.addEventListener = function (type, fn, options) {
        if (type === 'DOMContentLoaded' || type === 'load') { waiting.push(fn); return; }
        EventTarget.prototype.addEventListener.call(target, type, fn, options);
        rdUndo(function () { EventTarget.prototype.removeEventListener.call(target, type, fn, options); });
      };
    });
    window.setInterval = setInterval;
    window.setTimeout = setTimeout;
    try {
      code.forEach(function (text) {
        var script = document.createElement('script');
        script.textContent = '(function () {' + text + '\n})();'; // a function around it: a second visit may not declare the same const twice
        document.body.appendChild(script).remove();
      });
      waiting.forEach(function (fn) { run('page script', fn, new Event('DOMContentLoaded')); });
    } finally {
      delete window.addEventListener;
      delete document.addEventListener;
      window.setInterval = pageInterval;
      window.setTimeout = pageTimeout;
    }
  }

  // Webflow's forms, sliders and interactions only know the page they started on. Webflow.destroy() runs earlier, in
  // beforeEnter: its interaction engine checks once per frame whether it was stopped, so stopping and starting in the
  // same frame leaves the old loop running next to the new one, one more for every page visited
  // Webflow gives pages their own bundle: /apply's carries the forms module, the other pages' don't. Restarting the
  // bundle of the page you came from left /apply without a form handler, so Apply did a plain browser submit and the
  // page reloaded with the answers in the address bar (Thomas, 2026-11-20). So when the next page's bundle is another
  // one, that bundle runs: loaded the first time (it starts itself on the page that is there now), and the stopped
  // Webflow of each bundle is kept and started again later, so no second submit handler ever joins the first
  var WF_BUNDLE = /\/js\/webflow\.[0-9a-f]{8}\.[0-9a-f]+\.js$/, wfRuntimes = {}, wfBundle = null;
  function webflowBundle(root) {
    var el = qsa('script[src]', root).filter(function (s) { return WF_BUNDLE.test(s.getAttribute('src')); })[0];
    return el ? el.getAttribute('src') : '';
  }
  function restartWebflow(doc) {
    if (!window.Webflow) return;
    if (wfBundle === null) { wfBundle = webflowBundle(document); wfRuntimes[wfBundle] = window.Webflow; }
    var want = (doc && webflowBundle(doc)) || wfBundle;
    if (want !== wfBundle) {
      wfRuntimes[wfBundle] = window.Webflow;
      var prev = wfBundle;
      wfBundle = want;
      if (wfRuntimes[want]) window.Webflow = wfRuntimes[want];
      else {
        var before = window.Webflow, script = document.createElement('script');
        window.Webflow = undefined; // as on a real load: a bundle that finds a Webflow takes it for its start-up queue
        script.src = want;
        script.onload = function () {
          wfRuntimes[want] = window.Webflow;
          run('webflow', function () { document.dispatchEvent(new Event('readystatechange')); });
        };
        script.onerror = function () { window.Webflow = before; wfBundle = prev; run('webflow', function () { Webflow.ready(); }); };
        document.body.appendChild(script);
        return;
      }
    }
    run('webflow', function () {
      Webflow.ready();
      var ix2 = Webflow.require('ix2');
      if (ix2) ix2.init();
      document.dispatchEvent(new Event('readystatechange')); // Webflow's "page load" interactions wait for this one
    });
  }

  function resetPage(container) {
    if (!location.hash) window.scrollTo(0, 0);
    gsap.set(container, { clearProps: 'position,top,left,right' });
    if (window.lenis) window.lenis.resize();
  }

  // Back and forward return to where you were; a link with an anchor goes to the anchor
  function restoreScroll(data) {
    var back = data.trigger === 'back' || data.trigger === 'forward' || data.trigger === 'popstate';
    var target = location.hash.length > 1 ? byId(decodeURIComponent(location.hash.slice(1))) : null;
    var y = back ? scrollMemory[data.next.url.href] || 0 : target ? target.getBoundingClientRect().top + window.scrollY : 0;
    if (!y) return;
    if (hasScrollTrigger) ScrollTrigger.refresh();
    if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  }

  var themeConfig = {
    light: { nav: 'dark', transition: 'light' },
    dark: { nav: 'light', transition: 'dark' }
  };

  function applyThemeFrom(container) {
    var pageTheme = (container && container.dataset && container.dataset.pageTheme) || 'light';
    var config = themeConfig[pageTheme] || themeConfig.light;
    document.body.dataset.pageTheme = pageTheme;
    var transitionEl = qs('[data-theme-transition]');
    if (transitionEl) transitionEl.dataset.themeTransition = config.transition;
    var nav = qs('[data-theme-nav]');
    if (nav) nav.dataset.themeNav = config.nav;
  }

  function initBarbaNavUpdate(data) {
    var tpl = document.createElement('template');
    tpl.innerHTML = data.next.html.trim();
    var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
    qsa('nav [data-barba-update]').forEach(function (curr, index) {
      var next = nextNodes[index];
      if (!next) return;
      var newStatus = next.getAttribute('aria-current');
      if (newStatus !== null) curr.setAttribute('aria-current', newStatus);
      else curr.removeAttribute('aria-current');
      curr.setAttribute('class', next.getAttribute('class') || '');
    });
  }

  // -----------------------------------------
  // YOUR FUNCTIONS GO BELOW HERE
  // -----------------------------------------

  // =========================================================
  // GLOBAL — every page (was Slater 35206 GLOBAL.js)
  // =========================================================
  function rdGlobal() {
    qsa('[data-button-animate-chars]').forEach(staggerChars);
    initScrollReveals();
    initMarquees();
    initCursor();
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

    var cursorWidth = -1; // read once per label: asking on every mouse move made the browser lay the page out each time
    rdOn(window, 'resize', function () { cursorWidth = -1; }, { passive: true });
    rdOn(window, 'mousemove', function (e) {
      // Flip to the left near the right edge, and above the pointer near the bottom
      if (cursorWidth < 0) cursorWidth = cursor.offsetWidth;
      var edge = cursorWidth + 16;
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
        cursorWidth = -1;
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
        if (event.target.closest && event.target.closest('a, button, summary, [role="button"]')) return; // Enter on a link or a button inside the form (a privacy link, say) is that link's own
        event.preventDefault();
        trySubmit();
      });
    });
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
      // (GSAP's lag smoothing stays on: after a stall, animations continue instead of jumping).
      // Two things make the scroll even (measured 2026-11-14 with a perfectly steady wheel: the page's travel per frame
      // wobbled 4% around its mean, up to 6 px in one frame; now 0.3%, under a fifth of a pixel):
      // - Lenis gets the time of the FRAME (document.timeline.currentTime, the same number requestAnimationFrame hands
      //   out), not GSAP's clock. GSAP reads the clock at the moment its code runs, a millisecond earlier or later every
      //   frame depending on what else was busy, and Lenis moves the page by "speed x time since the last call", so that
      //   unevenness went straight into the scroll. Frames are shown at even intervals, so the frame's time is the one to use
      // - it runs first in the tick (the third argument), before GSAP renders: the scroll position is set, ScrollTrigger
      //   hears it, and everything that follows the scroll is drawn in this same frame instead of the next
      instance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) {
        var frame = document.timeline ? document.timeline.currentTime : null;
        instance.raf(typeof frame === 'number' ? frame : time * 1000);
      }, false, true);
    }
    window.lenis = instance;
    if (ownInstance) rdLenisButtons();
  }

  // Buttons that stop and start the page scroll (menus, popups). They sit on the page, so every new page wires its own.
  function rdLenisButtons() {
    var instance = window.lenis;
    if (!instance) return;
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
  // SERVICE — /service and every /locations/… page (was Slater 35312 SERVICE.js)
  // =========================================================
  function rdService() {
    // the new /locations/… template: the hero card comes in by CSS alone (keyframes in the template head), so it never
    // waits for this script: on a phone that wait was most of the 10 s to the first real content
    if (qs('.loc_hero') && !byId('DARK_section')) return;
    // each step only when its element is on the page: the new /locations/… template is one hero panel
    // (#HeroTitle + #text_local) without the dark section, so its text comes in right after the title
    var dark = byId('DARK_section'), first = byId('First_content'), special = byId('Special_text');
    var tl = gsap.timeline().from(split('#HeroTitle').chars, heroCharsIn(0.33), 'pair');
    if (dark) tl.from(dark, { duration: 1.4, y: '50vh', ease: 'power2.out' }, 'pair');
    if (first) tl.from(first, { y: 50, opacity: 0, scale: 0.95, filter: 'blur(5px)', duration: 1, ease: 'expo.out' });
    if (special) tl.from(split(special).chars, heroCharsIn(), 'pair2');

    var local = byId('text_local'); // only the /locations/… pages have this line
    if (local) tl.from(local, { duration: 0.8, opacity: 0, ease: 'expo.out' }, dark ? 'pair2' : 0.5);

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
          onComplete: function () {
            container.style.height = 'auto';
            if (window.lenis) window.lenis.resize();
            ScrollTrigger.refresh(); // the page is longer now: what sits below measures its scroll positions again
          }
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
    var extras = [qs('.work_intro-data'), qs('.work_video')].filter(Boolean);

    var tl = gsap.timeline()
      .from(split(intro).chars, heroCharsIn(0.33), 'pair')
      .from(qs('.work_content'), { duration: 1.6, y: '50vh', ease: 'power2.out' }, 'pair')
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
        .from(qs('.work_content'), { duration: 1.6, y: '50vh', ease: 'power2.out' }, 'pair');
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
    run('chip boil', rdChipBoil);
  }

  // =========================================================
  // TEXT KIT: letter boxes and the stop-motion boil
  // One copy of the letter split and of button 06's boil, so every boil runs on the same clock. Used by rdButtons
  // (button labels), rdChipBoil (/resources chips), rdQuiz (answers) and rdCaseDrum (the drum's cursor label); each
  // passes its own numbers. Not here, because they work differently: the footer's glyph settle and ruler scramble
  // (rdFooter), the end card's own little script (rdPostEnd) and the thank-you name stamp (rdApplyName).
  // =========================================================

  // One inline-block span per letter, so each letter can move on its own; returns the spans. A space becomes a
  // no-break space (a plain space in its own span would collapse to nothing). o.cls: the letters' class; o.text: the
  // text (default: the element's own); o.word: a class for a nowrap box around each word, so a line breaks between words
  function rdSplitChars(el, o) {
    var frag = document.createDocumentFragment(), chars = [];
    function letter(ch, box) {
      var s = document.createElement('span');
      s.className = o.cls;
      s.style.display = 'inline-block';
      s.textContent = ch === ' ' ? '\u00a0' : ch;
      box.appendChild(s);
      chars.push(s);
    }
    var text = o.text != null ? o.text : el.textContent;
    if (o.word) text.split(/\s+/).forEach(function (word, w) {
      if (w) frag.appendChild(document.createTextNode(' '));
      var box = document.createElement('span');
      box.className = o.word;
      box.style.cssText = 'display:inline-block;white-space:nowrap';
      box.setAttribute('aria-hidden', 'true');
      Array.from(word).forEach(function (ch) { letter(ch, box); });
      frag.appendChild(box);
    });
    else Array.from(text).forEach(function (ch) { letter(ch, frag); });
    el.textContent = '';
    el.appendChild(frag);
    return chars;
  }

  // Calls fn(frame) at a fixed frame rate off the GSAP ticker while started: the stop-motion clock. stop() says whether
  // it was running. Noted once, for the page it is made on: start() runs later, from a hover or a timer, when "the page
  // on screen" can already be the next one, and one note per hover would pile up for as long as the page stays
  function rdStepper(fps, fn) {
    var running = false, last = -1, t0 = 0;
    function tick() {
      var f = Math.floor((gsap.ticker.time - t0) * fps);
      if (f !== last) { last = f; fn(f); }
    }
    rdUndo(function () { gsap.ticker.remove(tick); });
    return {
      start: function () { if (running) return; running = true; last = -1; t0 = gsap.ticker.time; gsap.ticker.add(tick); },
      stop: function () { if (!running) return false; running = false; gsap.ticker.remove(tick); return true; }
    };
  }
  // Three poses per letter, a small random x, y and rotation within +-o.x, +-o.y, +-o.rotation. Small moves, so it
  // breathes instead of shaking
  function rdBoilPoses(chars, o) {
    var rnd = gsap.utils.random;
    return chars.map(function () {
      return [0, 1, 2].map(function () { return { x: rnd(-o.x, o.x), y: rnd(-o.y, o.y), rotation: rnd(-o.rotation, o.rotation) }; });
    });
  }
  // Frame f: every letter is set to its next pose, each one a pose ahead of the letter before. Nothing tweens between
  // frames: each one is set, like a drawn frame
  function rdBoilFrame(chars, poses, f) { chars.forEach(function (c, i) { gsap.set(c, poses[i][(f + i) % 3]); }); }
  // After the boil the letters ease back to where they stand
  function rdBoilHome(els, duration) { gsap.to(els, { x: 0, y: 0, rotation: 0, duration: duration, ease: 'power3.out', overwrite: 'auto' }); }
  // The boil on a set of letters, as {start, stop}. o: x, y, rotation (how far a pose reaches), fps (9), back (seconds
  // to ease home, .35), frame(f) (runs after each frame), home (more elements that ease home with the letters)
  function rdBoil(chars, o) {
    var poses = rdBoilPoses(chars, o);
    chars.forEach(function (c) { c.style.transformOrigin = '50% 55%'; }); // a plain style: GSAP reads every element's transform the first time it touches it, and at start-up that was the whole cost of the buttons
    var step = rdStepper(o.fps || 9, function (f) { rdBoilFrame(chars, poses, f); if (o.frame) o.frame(f); });
    return {
      start: step.start,
      stop: function () { if (step.stop()) rdBoilHome(o.home ? chars.concat(o.home) : chars, o.back || 0.35); }
    };
  }

  // The filter chips borrow button 06's stop-motion boil (rdButtons): while the mouse is on a chip, every
  // letter cycles through three hand-placed poses at 9 fps, set frame by frame like drawn frames; on leave
  // they settle back. No label swap, no magnet. Mouse only (a tap would leave it boiling), off for reduced motion.
  function rdChipBoil() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    qsa('.rs-chip, .rs-reset, [data-boil]').forEach(function (btn) {
      if (btn.hasAttribute('data-boil-ready')) return;
      var label = qs('span', btn) || btn;
      // every letter its own box, and every word a box around its letters: a row of loose letter boxes may wrap between
      // any two of them, which on a phone gave "ONLINE MARKETIN / G". Words stay whole, the line breaks at the space
      var text = label.textContent.trim();
      btn.setAttribute('aria-label', text);
      var chars = rdSplitChars(label, { text: text, cls: 'rs-ch', word: 'rs-word' });
      btn.setAttribute('data-boil-ready', '');
      var boil = rdBoil(chars, { x: 0.6, y: 0.7, rotation: 3 });
      btn.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') boil.start(); });
      btn.addEventListener('pointerleave', boil.stop);
    });
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
          rdLeave(a.href, 200); // the pill slides (0.5s); the page fade starts partway through it
        });
        // Osmo's keyboard: left/right moves between the languages
        a.addEventListener('keydown', function (e) {
          var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          links[(i + dir + links.length) % links.length].focus();
        });
      });

      // back/forward cache: coming back must show the pill as it was (the leave below restores the page)
      rdOn(window, 'pageshow', function (e) { if (e.persisted) setActive(current); });
    });
  }

  // Language-switch leave (used by rdLangToggle only): fades the page content (and an open menu) out and up
  // a little, then opens the other locale. Not a site-wide page transition; that is a separate task.
  var LEAVE_MS = 320;
  var leaving = false;
  var faded = []; // [element, its inline styles before the fade]
  function leaveTargets() {
    return [qs('.main-wrapper') || document.body]
      .concat(qsa('.bold-nav-full[data-navigation-status="active"] .bold-nav-full__tile')); // the open full-screen menu fades with the page
  }
  function rdLeave(href, delay) {
    if (leaving) return;
    leaving = true;
    var ease = 'cubic-bezier(0.625, 0.05, 0, 1)';
    setTimeout(function () {
      leaveTargets().forEach(function (el) {
        faded.push([el, { transition: el.style.transition, opacity: el.style.opacity, transform: el.style.transform, pointerEvents: el.style.pointerEvents }]);
        el.style.transition = 'opacity ' + LEAVE_MS + 'ms ' + ease + ', transform ' + LEAVE_MS + 'ms ' + ease;
        el.style.opacity = '0';
        el.style.transform = 'translateY(-0.5rem)';
        el.style.pointerEvents = 'none';
      });
      setTimeout(function () { window.location.href = href; }, LEAVE_MS + 20);
    }, delay || 0);
  }
  // back/forward cache: a page we left by fading must come back visible
  rdOn(window, 'pageshow', function (e) {
    if (!e.persisted) return;
    leaving = false;
    faded.forEach(function (f) { Object.keys(f[1]).forEach(function (k) { f[0].style[k] = f[1][k]; }); });
    faded = [];
  });

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
    rdOn(document, 'rd:filtered', function () {
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
  // QUIZ — /rimbo-quiz. The questions, answers and pictures are Rimbo's, from the old quiz, untouched.
  // Markup and look are in the Designer (classes qz_*): section [data-quiz] with three screens,
  // [data-quiz-screen="intro" | "play" | "end"]. This fills in the question, moves from one to the next, keeps the score,
  // and sets the state classes is-picked / is-off / is-hover on the answers and is-done / is-now on the progress steps.
  // Under the mouse, and for a beat when picked, an answer's letters boil like the site's buttons (the look of rdButtons).
  // Pictures are fetched two questions ahead and a question only comes in once its picture is there (or after a short
  // wait), so a GIF never shows up one question late. Keys: A to D or 1 to 4 answer, Enter starts and restarts.
  // =========================================================
  function rdQuiz() {
    var root = qs('[data-quiz]');
    if (!root) return;

    var CDN = 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/';
    var questions = [
      { text: 'Who is this?', choices: ['Swimming doggo', 'Pool doggo', 'Super doggo', 'Gangster doggo'], answer: 'Pool doggo', img: '67e9baacf801b7bf3d2952b5_swim%20doggo.avif' },
      { text: 'Do dolphins make rainbows?', choices: ['Yes', 'For sure !!', 'HELL YEAAAHH!!', 'no'], answer: 'no', img: '67e9baabf7941818f9206d11_raredolphin.avif' },
      { text: 'Whaaat?¿', choices: ['beans', 'ǝɯ ʞɔᴉlʞƆ', '24', 'get money'], answer: 'ǝɯ ʞɔᴉlʞƆ', img: '67e9baac1c9bea03eb04d9a4_jake%20qute.gif' },
      { text: 'You will never beat my quiz', choices: ['run', 'do nothing', 'be scared', 'fight'], answer: 'fight', img: '67e9baace5f540f75bcc8a81_batman.gif' },
      { text: '69 * 420', choices: ['28980', '38760', '24840', '18980'], answer: '28980', img: '67e9baaccf0f44a242318fcc_math.gif' },
      { text: 'This froggo is...', choices: ['cute', 'beautiful', 'poisonous', 'all answers are correct'], answer: 'all answers are correct', img: '67e9baab8336152373ee545b_froggo.avif' },
      { text: 'Oops, you touched the froggo!', choices: ['Whoobie doobie', 'Dance with shroom', 'Get it together', 'Trip it out :3'], answer: 'Get it together', img: '67e9cca79bb46fd660bdc4a9_3333.gif' },
      { text: "Do you think you're going to win?", choices: ["I'm doing fine", 'Uhhhh...', 'I hope so', ':I'], answer: "I'm doing fine", img: '67e9baacd5cd5274f0549189_fine.gif' },
      { text: 'Boss, how do we make this guy lose?', choices: ['lose now', 'Click here', 'Go final question', 'call Rimbo'], answer: 'Go final question', img: '67e9baae6f86c2474a3b427a_calling.gif' },
      { text: 'Who is Rimbo?', choices: ['Cool dude', 'God of vibes', 'Funny guy', 'My man!'], answer: 'God of vibes', img: '67e9cb9663c31098a3e52ed9_MP4%20to%20GIF%20test.gif' }
    ];
    var endImages = {
      low: '67e9baac326fc8390883ba7e_sad.gif',
      mid: '67e9baacd16a1ddbaa367246_clap.gif',
      top: '67e9d1951ac3a50582bc8e90_Tim%20And%20Eric%20Reaction%20GIF.gif'
    };
    function endImage() { return score < 5 ? endImages.low : score < questions.length ? endImages.mid : endImages.top; }

    var screens = { intro: qs('[data-quiz-screen="intro"]', root), play: qs('[data-quiz-screen="play"]', root), end: qs('[data-quiz-screen="end"]', root) };
    var questionEl = qs('[data-quiz-question]', root);
    var imageEl = qs('[data-quiz-img]', root);
    var endImageEl = qs('[data-quiz-end-img]', root);
    var answers = qsa('[data-quiz-answer]', root);
    var labels = answers.map(function (a) { return qs('[data-quiz-label]', a) || a; });
    var steps = qsa('[data-quiz-step]', root);
    var countEl = qs('[data-quiz-count]', root);
    var scoreEl = qs('[data-quiz-score]', root);
    if (!screens.intro || !screens.play || !screens.end || !questionEl || answers.length < 4) return;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state = 'intro';
    var index = 0;
    var score = 0;
    var busy = false;

    // ---- pictures: each file is fetched once, ahead of its question ----
    var loaded = {};
    var images = {};
    function fetchImage(file) {
      if (!loaded[file]) {
        var image = images[file] = new Image();
        loaded[file] = new Promise(function (resolve) {
          image.onload = image.onerror = function () { resolve(); };
        });
        image.src = CDN + file;
      }
      return loaded[file];
    }
    function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
    // the picture, or `ms` at most: a slow connection must not hold the quiz up
    function imageOrWait(file, ms) { return Promise.race([fetchImage(file), wait(ms)]); }
    // Puts a picture in its frame. Until the file is there the frame stays empty, it never shows the previous one
    function showImage(el, file) {
      if (!el) return;
      el.setAttribute('data-quiz-file', file);
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 0 });
      fetchImage(file).then(function () {
        if (el.getAttribute('data-quiz-file') !== file) return; // the quiz moved on meanwhile
        el.removeAttribute('srcset'); // Webflow's own responsive list would win over the new src
        el.removeAttribute('sizes');
        el.src = CDN + file;
        if (el === endImageEl) fitEndFrame(images[file]);
        gsap.to(el, { opacity: 1, duration: reduce ? 0 : 0.25, ease: 'power1.out' });
      });
    }
    // The three ending GIFs have three shapes (wide, nearly square, square): the frame takes the shape of the one shown,
    // as tall as the Designer allows the picture to be (its max-height) and never wider than the frame's own width there
    function fitEndFrame(image) {
      var frame = endImageEl.parentElement;
      if (!frame || !image || !image.naturalWidth) return;
      var ratio = (image.naturalWidth / image.naturalHeight).toFixed(4);
      frame.style.width = '';
      var widest = getComputedStyle(frame).width;
      var tallest = getComputedStyle(endImageEl).maxHeight;
      if (!parseFloat(tallest)) return;
      frame.style.aspectRatio = ratio;
      frame.style.maxWidth = '100%'; // the widths below are pixels: a phone turned on its side must still fit
      frame.style.width = 'min(' + widest + ', calc(' + tallest + ' * ' + ratio + '))';
    }

    // ---- moving a screen's parts in and out ----
    function parts(name) { return qsa('[data-quiz-move]', screens[name]); }
    function leave(name) {
      if (reduce) return Promise.resolve();
      return new Promise(function (resolve) {
        gsap.to(parts(name), { opacity: 0, y: -6, duration: 0.18, ease: 'power2.in', stagger: 0.015, overwrite: true, onComplete: resolve });
      });
    }
    function enter(name) {
      if (reduce) { gsap.set(parts(name), { clearProps: 'opacity,transform' }); return Promise.resolve(); }
      return new Promise(function (resolve) {
        gsap.fromTo(parts(name), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.04, overwrite: true, clearProps: 'opacity,transform', onComplete: resolve });
      });
    }
    function showScreen(name) {
      Object.keys(screens).forEach(function (key) { screens[key].style.display = key === name ? 'flex' : 'none'; });
      state = name;
    }

    function two(n) { return n < 10 ? '0' + n : String(n); }

    // ---- the boil: the stop-motion of the site's buttons (rdButtons), on an answer's letters. Every letter has three
    // poses and steps through them nine times a second; nothing tweens between frames, each one is set like a drawn frame ----
    // The pieces come from the text kit (rdBoil and friends): the letters change with every question, so one clock for
    // the page and fresh poses for every boil
    var boiling = null;
    var boilClock = rdStepper(9, function (f) { if (boiling) rdBoilFrame(boiling.chars, boiling.poses, f); });
    function boilStop() {
      boilClock.stop(); // also when the letters were made again (boiling cleared), so the next boil starts on its first frame
      if (!boiling) return;
      rdBoilHome(boiling.chars, 0.35);
      boiling = null;
    }
    function boilStart(i) {
      boilStop();
      if (reduce) return;
      var chars = qsa('.qz_ch', labels[i]);
      if (!chars.length) return;
      chars.forEach(function (c) { c.style.transformOrigin = '50% 55%'; });
      boiling = { chars: chars, poses: rdBoilPoses(chars, { x: 0.6, y: 0.7, rotation: 3 }) };
      boilClock.start();
    }

    function fillQuestion() {
      var q = questions[index];
      boiling = null; // the letters are made again below
      questionEl.textContent = q.text;
      answers.forEach(function (answer, i) {
        rdSplitChars(labels[i], { text: q.choices[i], cls: 'qz_ch' }); // one span per letter, so each can move on its own
        answer.setAttribute('aria-label', q.choices[i]); // read as one answer, not letter by letter
        answer.classList.remove('is-picked', 'is-off', 'is-hover');
      });
      steps.forEach(function (step, i) {
        step.classList.toggle('is-done', i < index);
        step.classList.toggle('is-now', i === index);
      });
      if (countEl) countEl.textContent = two(index + 1);
      showImage(imageEl, q.img);
      // the next two pictures, and near the end the three possible endings
      [index + 1, index + 2].forEach(function (i) { if (questions[i]) fetchImage(questions[i].img); });
      if (index >= questions.length - 2) Object.keys(endImages).forEach(function (key) { fetchImage(endImages[key]); });
    }

    function fillEnd() {
      showImage(endImageEl, endImage());
      if (!scoreEl) return;
      if (reduce) { scoreEl.textContent = score; return; }
      var counter = { n: 0 };
      scoreEl.textContent = '0';
      gsap.to(counter, { n: score, duration: 0.3 + score * 0.08, delay: 0.3, ease: 'power1.out', onUpdate: function () { scoreEl.textContent = Math.round(counter.n); } });
    }

    function start() {
      if (busy || state === 'play') return;
      busy = true;
      var from = state;
      index = 0;
      score = 0;
      var gone = reduce ? Promise.resolve() : new Promise(function (resolve) {
        gsap.to(from === 'intro' ? screens.intro : parts('end'), { opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true, onComplete: resolve });
      });
      Promise.all([gone, imageOrWait(questions[0].img, 900)]).then(function () {
        fillQuestion();
        showScreen('play');
        busy = false; // the answers can be clicked while they come in
        enter('play');
      });
    }

    function pick(i) {
      if (busy || state !== 'play') return;
      busy = true;
      if (questions[index].choices[i] === questions[index].answer) score++;
      answers.forEach(function (answer, n) {
        answer.classList.remove('is-hover');
        answer.classList.add(n === i ? 'is-picked' : 'is-off');
      });
      boilStart(i); // the picked answer boils while it is held, on a phone too
      index++;
      var last = index >= questions.length;
      // hold the pressed answer for a beat, and give the next picture that time (and a little more) to arrive
      Promise.all([wait(reduce ? 120 : 300), imageOrWait(last ? endImage() : questions[index].img, 1200)]).then(function () {
        return leave('play');
      }).then(function () {
        boiling = null; // the picked answer is out of sight
        if (last) {
          fillEnd();
          showScreen('end');
        } else {
          fillQuestion();
        }
        busy = false; // the next answers can be clicked while they come in
        enter(state);
      });
    }

    // ---- input ----
    var startButton = qs('[data-quiz-start]', root);
    var againButton = qs('[data-quiz-again]', root);
    // In Webflow the buttons are link blocks: for the keyboard and a screen reader they are buttons
    function asButton(el) {
      if (!el || el.tagName === 'BUTTON') return;
      el.setAttribute('role', 'button');
      if (!el.hasAttribute('href')) el.setAttribute('tabindex', '0');
      rdOn(el, 'keydown', function (e) {
        if (e.key === ' ' || (e.key === 'Enter' && !el.hasAttribute('href'))) { e.preventDefault(); el.click(); }
      });
    }
    [startButton, againButton].concat(answers).forEach(asButton);
    if (startButton) rdOn(startButton, 'click', function (e) { e.preventDefault(); start(); });
    if (againButton) rdOn(againButton, 'click', function (e) { e.preventDefault(); start(); });
    answers.forEach(function (answer, i) {
      rdOn(answer, 'click', function (e) { e.preventDefault(); pick(i); });
      // hover is a class from the mouse only, so a tapped answer never keeps the hover look on a phone
      rdOn(answer, 'pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || busy) return;
        answer.classList.add('is-hover');
        boilStart(i);
      });
      rdOn(answer, 'pointerleave', function () {
        answer.classList.remove('is-hover');
        if (!busy) boilStop(); // a picked answer keeps boiling until the question leaves
      });
    });

    var nav = null;
    function menuOpen() {
      nav = nav || qs('[data-navigation-status]');
      return !!nav && nav.getAttribute('data-navigation-status') === 'active';
    }
    rdOn(document, 'keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || menuOpen() || !root.isConnected) return;
      var target = e.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (state === 'play') {
        var i = 'abcd'.indexOf(e.key.toLowerCase());
        if (i < 0) i = '1234'.indexOf(e.key);
        if (i > -1 && e.key.length === 1) { e.preventDefault(); pick(i); }
      } else if (e.key === 'Enter' && (!target || !target.closest || target === document.body || target === document.documentElement)) { // nothing focused: Enter is the button on screen
        e.preventDefault();
        start();
      }
    });

    // ---- first paint ----
    showScreen('intro');
    fetchImage(questions[0].img);
    fetchImage(questions[1].img);
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
  // OSMO SLIDER — Osmo Supply's Spatial Cards Slider (osmo.supply) as shipped, only their DOMContentLoaded auto-init is
  // left out: the city pages' showcase (rdLocShow) and a hero that carries [data-spatial-slider-init] (home V4) call it.
  // Needs Draggable, InertiaPlugin and CustomEase (site footer).
  // =========================================================
  function initSpatialCardsSlider() {
    rdPlugins(Draggable, InertiaPlugin, CustomEase);
    CustomEase.create("spatial", "0.25, 0.1, 0, 1");
    const slideDuration = 1;
    const clickEase = 'spatial';

    qsa('[data-spatial-slider-init]', nextPage).forEach(container => { // the page coming in only: on the cube the old page is still in the document
      if (container._spatialSliderDraggable) container._spatialSliderDraggable.kill();
      if (container._spatialSliderImageObserver) container._spatialSliderImageObserver.disconnect();
      if (container._spatialSliderProxy) {
        gsap.killTweensOf(container._spatialSliderProxy);
        container._spatialSliderProxy.remove();
      }

      const collection = container.querySelector('[data-spatial-slider-collection]');
      const track = container.querySelector('[data-spatial-slider-list]');
      if (!collection || !track) return;

      gsap.set(track, { clearProps: 'transform' });
      container.querySelectorAll('[data-spatial-slider-item]').forEach(item => { gsap.set(item, { clearProps: 'transform' }); });
      container.querySelectorAll('[data-spatial-slider-clone]').forEach(el => el.remove());

      const originalItems = Array.from(track.querySelectorAll(':scope > [data-spatial-slider-item]:not([data-spatial-slider-clone])'));
      if (!originalItems.length) return;

      container.setAttribute('role', 'region');
      container.setAttribute('aria-roledescription', 'carousel');
      container.setAttribute('aria-label', container.getAttribute('aria-label') || 'Spatial Cards Slider');
      track.setAttribute('role', 'group');
      track.setAttribute('aria-label', 'Slides');

      const dotsWrap = container.querySelector('[data-spatial-slider-generate-dots]');
      if (dotsWrap) {
        const dots = Array.from(dotsWrap.querySelectorAll('[data-spatial-slider-control]'));
        if (dots.length) {
          const template = dots[0];
          dots.slice(1).forEach(dot => dot.remove());
          for (let i = 1; i <= originalItems.length; i++) {
            const dot = i === 1 ? template : template.cloneNode(true);
            dot.setAttribute('data-spatial-slider-control', String(i));
            dot.setAttribute('data-spatial-slider-control-status', 'not-active');
            if (i > 1) dotsWrap.appendChild(dot);
          }
        }
      }

      const controls = Array.from(container.querySelectorAll('[data-spatial-slider-control]'));
      const totalEl = container.querySelector('[data-spatial-slider-total-slide]');
      const indicators = Array.from(container.querySelectorAll('[data-spatial-slider-active-slide]'));
      const mod = (value, total) => ((value % total) + total) % total;
      const formatNumber = value => value < 10 ? '0' + value : String(value);

      if (totalEl) totalEl.textContent = formatNumber(originalItems.length);

      originalItems.forEach((item, index) => {
        item.removeAttribute('data-spatial-slider-item-status');
        item.removeAttribute('aria-hidden');
        item.setAttribute('role', 'group');
        item.setAttribute('aria-label', `Slide ${index + 1} of ${originalItems.length}`);
      });

      controls.forEach(btn => {
        const value = btn.getAttribute('data-spatial-slider-control');
        if (value === 'prev') btn.setAttribute('aria-label', 'Previous slide');
        if (value === 'next') btn.setAttribute('aria-label', 'Next slide');
        if (/^\d+$/.test(value)) {
          btn.setAttribute('aria-label', `Go to slide ${value}`);
          btn.setAttribute('aria-current', 'false');
        }
      });

      const containerStyles = getComputedStyle(container);
      const trackStyles = getComputedStyle(track);
      const curve = Math.abs(parseFloat(containerStyles.getPropertyValue('--slider-curve'))) || 12;
      const directionValue = parseFloat(containerStyles.getPropertyValue('--slider-direction'));
      const direction = directionValue < 0 ? -1 : 1;
      const gap = parseFloat(trackStyles.columnGap) || 0;
      const curveRadians = curve * Math.PI / 180;

      const firstRect = originalItems[0].getBoundingClientRect();
      // Arriving by the page transition, the page is still small and turned in the cube when the drum builds:
      // the screen sizes are then a fraction of the real ones and the drum came out squashed over the hero
      let pageScale = originalItems[0].offsetWidth ? firstRect.width / originalItems[0].offsetWidth : 1;
      if (!(pageScale > 0) || Math.abs(pageScale - 1) < 0.02) pageScale = 1;
      const itemWidth = pageScale === 1 ? firstRect.width : originalItems[0].offsetWidth;
      const itemHeight = pageScale === 1 ? firstRect.height : originalItems[0].offsetHeight;

      const perspectiveValue = parseFloat(getComputedStyle(track).perspective);
      const perspective = Number.isFinite(perspectiveValue) ? perspectiveValue : 1200;

      const getProjectedEdgeX = (radius, angle, side) => {
        const radians = angle * Math.PI / 180;
        const rotation = -direction * radians;
        const localX = side * itemWidth / 2;
        const centerX = Math.sin(radians) * radius;
        const centerZ = direction * radius * (1 - Math.cos(radians));
        const x = centerX + localX * Math.cos(rotation);
        const z = centerZ - localX * Math.sin(rotation);
        return x * perspective / (perspective - z);
      };

      let spatialRadius = itemWidth / Math.sin(curveRadians);
      for (let i = 0; i < 8; i++) {
        const nextLeft = getProjectedEdgeX(spatialRadius, curve, -1);
        const currentRight = itemWidth / 2;
        const currentGap = nextLeft - currentRight;
        const correction = gap - currentGap;
        spatialRadius += correction / Math.sin(curveRadians);
      }

      const stepDistance = Math.sin(curveRadians) * spatialRadius;
      const tangentRatio = (-direction * spatialRadius) / (perspective - direction * spatialRadius);
      const edgeAngle = Math.acos(gsap.utils.clamp(-1, 1, tangentRatio)) * 180 / Math.PI;
      const maxSideItems = Math.ceil(edgeAngle / curve);
      const maxLoopItems = maxSideItems * 2;

      const getSpatialPosition = offset => {
        const angle = gsap.utils.clamp(-edgeAngle, edgeAngle, offset * curve);
        const radians = angle * Math.PI / 180;
        return {
          x: Math.sin(radians) * spatialRadius,
          z: direction * spatialRadius * (1 - Math.cos(radians)),
          rotationY: -direction * angle
        };
      };

      const containerRect = container.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const originX = trackRect.left + trackRect.width / 2;
      const leftLimit = (containerRect.left - originX) / pageScale;
      const rightLimit = (containerRect.right - originX) / pageScale;

      const isOffsetInside = offset => {
        if (Math.abs(offset * curve) >= edgeAngle) return false;
        const position = getSpatialPosition(offset);
        const scale = perspective / (perspective - position.z);
        const radians = Math.abs(position.rotationY) * Math.PI / 180;
        const halfWidth = Math.abs(Math.cos(radians)) * itemWidth * scale / 2;
        const x = position.x * scale;
        return x + halfWidth >= leftLimit && x - halfWidth <= rightLimit;
      };

      const getVisibleCount = () => {
        let left = 0;
        let right = 0;
        for (let i = 1; i < maxSideItems && isOffsetInside(i); i++) right = i;
        for (let i = 1; i < maxSideItems && isOffsetInside(-i); i++) left = i;
        return Math.min(maxLoopItems, 1 + left + right + 2);
      };

      const minItemsNeeded = getVisibleCount();
      const neededItems = originalItems.length >= minItemsNeeded
        ? originalItems.length
        : Math.ceil(minItemsNeeded / originalItems.length) * originalItems.length;

      for (let i = originalItems.length; i < neededItems; i++) {
        const clone = originalItems[i % originalItems.length].cloneNode(true);
        clone.setAttribute('data-spatial-slider-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
      }

      const items = Array.from(track.querySelectorAll(':scope > [data-spatial-slider-item]'));
      const totalItems = items.length;

      track.style.height = itemHeight + 'px';
      container.setAttribute('data-spatial-slider-drag-status', 'grab');

      items.forEach(item => item.setAttribute('data-spatial-slider-item-status', 'not-active'));

      const proxy = document.createElement('div');
      proxy.setAttribute('data-spatial-slider-proxy', '');
      Object.assign(proxy.style, { position: 'absolute', width: '1px', height: '1px', pointerEvents: 'none', opacity: '0' });
      container.appendChild(proxy);
      container._spatialSliderProxy = proxy;

      gsap.set(proxy, { x: 0 });

      const setX = items.map(item => gsap.quickSetter(item, 'x', 'px'));
      const setZ = items.map(item => gsap.quickSetter(item, 'z', 'px'));
      const setRotationY = items.map(item => gsap.quickSetter(item, 'rotationY', 'deg'));

      const getIndex = () => -gsap.getProperty(proxy, 'x') / stepDistance;

      const nearestDelta = (index, realIndex) => {
        const loop = Math.round((realIndex - index) / totalItems);
        return index - (realIndex - loop * totalItems);
      };

      const getSlideDelta = (target, realIndex) => {
        let bestDelta = 0;
        let bestDistance = Infinity;
        items.forEach((item, index) => {
          if (index % originalItems.length !== target) return;
          const delta = nearestDelta(index, realIndex);
          const distance = Math.abs(delta);
          if (distance < bestDistance) {
            bestDelta = delta;
            bestDistance = distance;
          }
        });
        return bestDelta;
      };

      let lastActiveIndex = null;

      const updateActiveUI = (activeIndex, activeSlideIndex) => {
        if (activeIndex === lastActiveIndex) return;
        items.forEach((item, index) => {
          item.setAttribute('data-spatial-slider-item-status', index === activeIndex ? 'active' : 'inview');
        });
        indicators.forEach(el => el.textContent = formatNumber(activeSlideIndex + 1));
        controls.forEach(btn => {
          const value = btn.getAttribute('data-spatial-slider-control');
          if (!/^\d+$/.test(value)) return;
          const isActive = parseInt(value, 10) - 1 === activeSlideIndex;
          btn.setAttribute('data-spatial-slider-control-status', isActive ? 'active' : 'not-active');
          btn.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
        lastActiveIndex = activeIndex;
      };

      const render = () => {
        const realIndex = getIndex();
        const activeIndex = mod(Math.round(realIndex), totalItems);
        const activeSlideIndex = activeIndex % originalItems.length;
        items.forEach((item, index) => {
          const position = getSpatialPosition(nearestDelta(index, realIndex));
          setX[index](position.x);
          setZ[index](position.z);
          setRotationY[index](position.rotationY);
        });
        updateActiveUI(activeIndex, activeSlideIndex);
      };

      controls.forEach(btn => {
        const value = btn.getAttribute('data-spatial-slider-control');
        btn.disabled = false;
        btn.onclick = () => {
          gsap.killTweensOf(proxy);
          const currentIndex = getIndex();
          let targetIndex;
          if (value === 'next' || value === 'prev') {
            targetIndex = Math.round(currentIndex) + (value === 'next' ? 1 : -1);
          } else if (/^\d+$/.test(value)) {
            const targetSlide = Math.max(0, Math.min(originalItems.length - 1, parseInt(value, 10) - 1));
            targetIndex = currentIndex + getSlideDelta(targetSlide, currentIndex);
          } else {
            return;
          }
          gsap.to(proxy, { x: -targetIndex * stepDistance, duration: slideDuration, ease: clickEase, onUpdate: render });
        };
      });

      container._spatialSliderDraggable = Draggable.create(proxy, {
        type: 'x',
        trigger: collection,
        inertia: true,
        throwResistance: 2000,
        dragResistance: 0.05,
        maxDuration: 1,
        minDuration: 0.5,
        edgeResistance: 0.75,
        overshootTolerance: 0,
        snap: value => Math.round(value / stepDistance) * stepDistance,
        onDrag: render,
        onThrowUpdate: render,
        onThrowComplete: () => {
          container.setAttribute('data-spatial-slider-drag-status', 'grab');
          render();
        },
        onPress: () => container.setAttribute('data-spatial-slider-drag-status', 'grabbing'),
        onDragStart: () => container.setAttribute('data-spatial-slider-drag-status', 'grabbing'),
        onRelease: () => container.setAttribute('data-spatial-slider-drag-status', 'grab')
      })[0];
      rdDrag(container._spatialSliderDraggable);

      render();

      // Fix for Lazy Loading images on Safari
      container._spatialSliderImageObserver = new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        container.querySelectorAll('[data-spatial-slider-item] img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
        observer.disconnect();
      });
      container._spatialSliderImageObserver.observe(container);
    });

    if (initSpatialCardsSlider._resize) window.removeEventListener('resize', initSpatialCardsSlider._resize);
    initSpatialCardsSlider._resize = debounceOnWidthChange(initSpatialCardsSlider, 200);
    rdOn(window, 'resize', initSpatialCardsSlider._resize);
  }

  function debounceOnWidthChange(fn, ms) {
    let lastWidth = window.innerWidth;
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        fn.apply(this, args);
      }, ms);
    };
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
  // CLIPS — which file a band clip is served as: AV1 or H.264, 640 or 480 wide. The one place that knows the address.
  // A video names its clip in the Designer (data-clip="echo", or the file name at the end of its data-src). A clip that
  // is not in CLIPS, and every clip under ?clips=0 on staging, keeps the address in its data-src.
  // =========================================================
  var CLIP_BASE = 'https://rimbo-designs-clips.b-cdn.net/'; // Bunny (storage zone rimbo-designs-clips, files in its root). jsDelivr only serves the repo under 50 MB, so clips never go in git
  var CLIPS = { 'dfs-home-test': 1, 'echo': 1, 'tinko': 1, 'charlies-angels': 1, 'dfs-home': 1, 'dieronesie': 1, 'echo-tour': 1, // clip: the version of its files (a new encode = new files with the next number)
    // the Work page (rdWorkClips): v = version, tag = the git tag that holds the files, pc / phone = their width when not 640 / 480.
    // A clip is known by its FILE NAME: a new recording needs a new file name in data-src (or new files here with the next v)
    'work-echo-open': { v: 1, tag: 'clips-v2' }, 'work-list-echo-wide': { v: 1, tag: 'clips-v2', pc: 1000, phone: 800 },
    'work-list-charlies': { v: 1, tag: 'clips-v2' }, 'work-list-dieronesie': { v: 1, tag: 'clips-v2' },
    // the DFS spin (top of /work, list row 1, the DFS project page): one 1000 px file for every screen, 24 fps (Rimbo's pick A, 2026-11-20)
    'work-dfs-dive': { v: 1, pc: 1000, phone: 1000 },
    // the project detail pages (rdCasePage): named by their Webflow file (the part after the asset id)
    'echo-opening': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'echo-collective-r2': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'echo-collage': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'dfs-tinko-intro': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'dfs-fundamentals': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'dfs-dino': { v: 1, tag: 'clips-v3', pc: 1440, phone: 720 }, 'ca-home': { v: 1, tag: 'clips-v3', pc: 1440, phone: 720 }, 'ca-adopt': { v: 1, tag: 'clips-v3', pc: 1440, phone: 720 }, 'ozo-opening-v2': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'ozo-story': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'ozo-cards': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'ozo-map-v2': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'ozo-nav': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'dieronesie-opening': { v: 1, tag: 'clips-v3', pc: 1440, phone: 720 }, 'dieronesie-13': { v: 1, tag: 'clips-v3', pc: 1440, phone: 720 }, 'ig-open': { v: 1, tag: 'clips-v3', pc: 1280, phone: 720 }, 'ig-scroll': { v: 2, tag: 'clips-v3', pc: 1120, phone: 720 } };
  var CLIP_AV1 = 'video/mp4; codecs="av01.0.04M.08"';
  var clipLab = /(\.webflow\.io|localhost|127\.0\.0\.1)$/.test(location.hostname); // staging and local only: ?clips=0 the old files, ?av1=0 the H.264 ones
  var clipOff = clipLab && /[?&]clips=0\b/.test(location.search), clipNoAv1 = clipLab && /[?&]av1=0\b/.test(location.search);
  var clipPick = null; // '640-av1', '480-h264'…: decided once per visit, so a clip never comes in two sizes or formats
  function clipChoice() {
    if (clipPick) return clipPick;
    var c = navigator.connection, s = window.screen || {}, can = false, chip = null;
    var phone = Math.min(s.width || 9999, s.height || 9999) < 600; // the screen, not the window: a narrow window on a computer keeps the 640 files
    var hand = phone || !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches); // tablets too
    var lean = phone || !!(c && c.saveData); // the 480 files: a phone, or a visitor who asked for less data
    try { can = !clipNoAv1 && document.createElement('video').canPlayType(CLIP_AV1) === 'probably'; } catch (e) {}
    try { chip = localStorage.getItem('rdClipChip'); } catch (e) {}
    // a computer: AV1 whenever the browser plays it. A phone or tablet: only when its chip decodes it (the answer of an
    // earlier page, below), so five software decoders never land on a phone. Safari only says yes when the chip is there
    var av1 = can && (!hand || chip === '1' || /Apple/.test(navigator.vendor || ''));
    return (clipPick = (lean ? '480' : '640') + '-' + (av1 ? 'av1' : 'h264'));
  }
  function clipFile(name) {
    if (clipOff || !CLIPS.hasOwnProperty(name)) return '';
    var c = CLIPS[name], pick = clipChoice().split('-'), size = pick[0]; // ['640' | '480', 'av1' | 'h264']
    if (typeof c === 'object') size = String(c[size === '480' ? 'phone' : 'pc'] || size); // a clip with its own widths
    var base = c.tag ? CLIP_BASE.replace('@clips-v1/', '@' + c.tag + '/') : CLIP_BASE;
    return base + name + '-' + size + '-' + pick[1] + '-v' + (c.v || c) + '.mp4';
  }
  function clipUrl(v) {
    var given = v.getAttribute('data-src') || '';
    // the name: data-clip, else the file name at the end of the address (…/media/<name>.mp4, Bunny's …/<name>.mp4, or
    // Webflow's …/<24-character asset id>_<name>.mp4); a name CLIPS doesn't know keeps its own address
    return clipFile(v.getAttribute('data-clip') || (/\/(?:[0-9a-f]{24}_)?([\w-]+)\.mp4$/.exec(given) || [])[1] || '') || given;
  }
  // an AV1 file that will not play (a decoder that gives up, a missing file): the H.264 one in its place, once, and H.264 for the clips still to come
  function clipGuard(v) {
    if (v.__guard) return;
    v.__guard = true;
    v.addEventListener('error', function () {
      var at = v.getAttribute('src') || '', rate = v.playbackRate, going = !v.paused;
      if (at.indexOf('-av1-') < 0) return;
      clipPick = clipChoice().replace('av1', 'h264');
      console.warn('[rimbo-designs] clips: AV1 failed, H.264 instead: ' + at);
      if (rate !== 1) v.addEventListener('loadedmetadata', function () { v.playbackRate = rate; }, { once: true });
      v.setAttribute('src', at.replace('-av1-', '-h264-'));
      if (going) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
  }
  // does the chip decode AV1? Asked on every page; the answer is for the next page and the next visit
  (function () {
    var mc = navigator.mediaCapabilities;
    try {
      if (!mc || !mc.decodingInfo) return;
      mc.decodingInfo({ type: 'file', video: { contentType: CLIP_AV1, width: 480, height: 472, bitrate: 200000, framerate: 30 } }).then(function (r) {
        try { localStorage.setItem('rdClipChip', r && r.supported && r.powerEfficient ? '1' : '0'); } catch (e) {}
      }, function () {});
    } catch (e) {}
  })();
  window.rdClipUrl = clipFile; // for the end-of-page embed: rdClipUrl('echo'), '' = keep your own address

  // WORK CLIPS — the Work page: the hero ([data-work-hero]) and the Selected list (.ws_wrap). A clip that should come
  // from CLIPS or load late keeps its address in data-src in the Designer (no src), so it loads nothing by itself.
  // Every video there is muted (the published page loses the attribute, and a browser only starts a muted clip by itself).
  // The hero's clips get their file at once (the opening waits for their stills). The list's rows 1 and 2 get theirs
  // when the list comes near (row 1 plays the hero's DFS file, already loaded); the other rows once the hero's clips can
  // also play through, or the moment the list's own script (rdWorkSplit) asks for one. A video with a src is left as it is.
  function rdWorkClips() {
    var hero = qsa('[data-work-hero] video'), list = qs('.ws_wrap'), rows = list ? qsa('video', list) : [];
    hero.concat(rows).forEach(function (v) { v.muted = true; });
    var give = function (v) {
      if (v.getAttribute('src') || !v.getAttribute('data-src')) return;
      var url = clipUrl(v);
      if (url) { v.setAttribute('src', url); clipGuard(v); }
    };
    hero.forEach(give);
    // A phone that only lets a video start inside a touch (an app browser like Arc Search, iOS "Auto-Play Video Previews"
    // off, Low Power Mode): once a video has started inside a touch it may start by itself from then on. The list starts
    // its clips right after a scroll, the hero on its own clock while nobody touches, so only the hero stayed still
    // (Rimbo's iPhone in Arc Search, 2026-11-19). The first touch wakes every Work video once (play + pause at once); the
    // hero's clock and the list play them from there. A tap that brought you here (the menu) counts too.
    if (window.matchMedia('(pointer: coarse)').matches) { // touch screens only: computers have no such gate
      var wake = function () {
        hero.concat(rows).forEach(function (v) {
          if (v.__woke || !v.paused || !v.getAttribute('src')) return;
          var p = v.play(); v.pause();
          if (p && p.then) p.then(function () { v.__woke = true; }, function (e) { if (!e || e.name !== 'NotAllowedError') v.__woke = true; });
        });
      };
      rdOn(document, 'touchend', wake, { capture: true, passive: true });
      rdOn(document, 'click', wake, true);
      if (navigator.userActivation && navigator.userActivation.isActive) wake();
    }
    var wait = rows.filter(function (v) { return !v.getAttribute('src') && v.getAttribute('data-src'); });
    if (!wait.length) return;
    var near = false, heroIn = false, io = null, mo = null;
    var step = function () {
      if (!near) return;
      wait.slice(0, 2).forEach(give);
      if (heroIn) { wait.forEach(give); io.disconnect(); mo.disconnect(); }
    };
    var come = function () { if (!near) { near = true; step(); } };
    io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) come(); }, { rootMargin: '100px 0px' });
    io.observe(list);
    rdOn(window, 'scroll', function () { if (window.scrollY > 0) come(); }, { passive: true }); // a real scroll, not the jump to the top of a page transition
    mo = new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.target.preload === 'auto') give(m.target); }); });
    wait.slice(2).forEach(function (v) { mo.observe(v, { attributes: true, attributeFilter: ['preload'] }); }); // rdWorkSplit sets preload=auto on the row it shows and the next
    var loading = hero.filter(function (v) { return v.readyState < 4; }), left = loading.length;
    var one = function () { if (--left === 0) { heroIn = true; step(); } };
    if (!left) heroIn = true;
    loading.forEach(function (v) {
      var fired = false, once = function () { if (!fired) { fired = true; one(); } };
      rdOn(v, 'canplaythrough', once); rdOn(v, 'error', once);
    });
  }

  // =========================================================
  // BAND — the home's hero, section [data-band]: the dial ([data-ring], the home since 9 Nov) or home V4's drum
  // (Osmo's spatial slider). Everything visible lives in the Designer: the stage with the cards and their real
  // <video> elements, the copy, the scroll line, the loader. Styles, breakpoints and hover states are Webflow
  // styles. This adds the behaviour: clip tuning, one decoder per clip (the copies are canvases), the loader, the
  // opening sequence, the pinned dial and the fade-behind on scroll.
  // The earlier heroes are gone since v1.7.156 (Rimbo, 10 Nov): the single band of /home-copy (V2), the radial wheel
  // of /home-v3 and the glass carousel of /home-v5. Their code is in the git history up to tag v1.7.155.
  // =========================================================
  function rdBand() {
    var hero = qs('[data-band]');
    var stage = hero && qs('.band_stage', hero);
    if (!hero) return;
    qsa('video.band_panel-media', hero).forEach(function (v) { if (v.getAttribute('src')) return; var url = clipUrl(v); if (url) { v.setAttribute('src', url); clipGuard(v); } }); // CLIPS: every clip has its file before a card is copied or a clip is asked to load
    // Home V4's hero carries Osmo's spatial slider: it lays the cards out and clones them; everything else here (clips,
    // loader, opening, fades) is shared with the dial.
    var osmoInit = function () {
      if (!window.Draggable || !window.InertiaPlugin || !window.CustomEase) { console.warn('[rimbo-designs] band: GSAP plugins for the slider are missing'); return; }
      if (qs('[data-spatial-slider-init]', hero)) initSpatialCardsSlider();
    };
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var lab = /(\.webflow\.io|localhost|127\.0\.0\.1)$/.test(location.hostname); // the ?knobs in the address are for trying things out: staging and local only, the live site reads the Designer's attributes alone
    var query = lab ? location.search : '';
    var myScope = scopeNow(); // this page: the opening must not finish on a page that is already leaving
    // ---- the stepped auto-advance on the Osmo slider (home-v4's spatial arc; Rimbo: "a 1, 2, 3, 4, 5 switch"): every
    // few seconds the slider moves one card on, as if Next were pressed on a timer. It goes through the slider's own
    // Next control: a hidden button added before Osmo's init, which wires it like any other control (and again after a
    // width change), so each step is the slider's own click tween. ?step=N (or data-band-step="N" on the section) sets
    // the seconds per step, 0 switches it off; off under prefers-reduced-motion. Clock: autoStep below.
    var slider = qs('[data-spatial-slider-init]', hero);
    var ring = slider ? null : qs('[data-ring]', hero); // home-extreme: Rimbo's roulette, built below (buildRing), no Osmo code involved
    var param = function (name, attr, fallback) { // ?name=N on the URL, else data-band-attr="N" on the section, else the default
      var v = parseFloat((new RegExp('[?&]' + name + '=(-?[\\d.]+)').exec(query) || [])[1]);
      if (isNaN(v)) v = parseFloat(hero.getAttribute('data-band-' + attr));
      return isNaN(v) ? fallback : v;
    };
    var stepEvery = param('step', 'step', 3.5);
    var pinScreens = ring && !reduced ? param('pin', 'pin', 2) : 0; // home-extreme: screens of scroll the hero stays pinned while the dial tips over, turns and closes
    var pinPhone = ring && !reduced ? param('pinphone', 'pin-phone', 2.6) : 0; // on a phone the hold is 30% longer (Rimbo 2026-11-19: "it jumps up a bit fast", a little more scroll work for the hero)
    var pinWide = pinScreens, pinNow = function () { return window.innerWidth < 768 && !/[?&]m=0\b/.test(query) ? pinPhone : pinWide; }; // read again on every refresh, so a turned phone or a resized window gets its own length
    if (pinScreens > 0) pinScreens = pinNow();
    var ringSlots = ring ? param('slots', 'slots', 15) : 0; // home-extreme: cards on the dial; the works repeat to fill it (fifteen = the five works three times, 24° apart: a whole cylinder, so at rest it keeps going round like home-v4; ten = twice, each opposite itself, a part-cylinder that slides open)
    var ringGrow = ring ? param('grow', 'grow', 1.15) : 1; // home-extreme: how much wider the flat dial is than the drum, so the cards slide outward as it tips
    var ringOut = ring ? ((/[?&]out=(\w+)/.exec(query) || [])[1] || hero.getAttribute('data-band-out') || 'roll') : ''; // home-extreme: how the dial leaves: roll (off to the left, still spinning), shoot (the cards fly out one by one) or fade
    var ringBlur = ring && !reduced ? param('blur', 'blur', 4) : 0; // home-extreme: motion blur on the cards while the drum turns fast, in screen px at full speed (0 = off)
    var ringFull = ring && 360 / Math.max(1, ringSlots) <= 26; // fourteen or more: the spacing stretches to close the cylinder (15 → 24°, 16 → 22.5°), so at rest it loops like home-v4 and the clock may run; fewer stay a part-cylinder at 22.5°
    if (ring && !ringFull && !/[?&]step=/.test(query)) stepEvery = 0; // a part-cylinder cannot loop at rest, so the clock stays off there unless asked for
    var fadeFrac = param('fade', 'fade', 0.18); // the copy is gone within this fraction of a screen of scroll (home-v4 sets 0.12 on its section: "slightly too slow" at 0.18)
    var drumTurn = param('turn', 'turn', 2); // home-v4: cards the drum turns over the first screen of scroll, back again on the way up (0 = still)
    var exitTilt = param('exit', 'exit', 60); // home-v4: degrees the drum tips over about its centre as the hero leaves, the 3D exit (0 = flat; negative tips the top towards you)
    var exitDepth = param('exitdepth', 'exit-depth', 2400); // home-v4: the perspective of that tip in px; lower = the near half swells more
    // ---- home-v4-landing (Rimbo, 5 Nov: "reverse the scroll-up experience as the loading"): the opening is the exit played
    // backwards. The drum comes in from the top tipped over as it is at the end of the exit, descends and untips into its
    // resting pose while it turns back onto its card (the landing), and only then the title comes in. On the way back up
    // the copy does not un-blur along the scroll: it simply appears (fadeBehind). Keyed by data-band-opening="land" on the
    // section (?opening=land tries it on any staging drum page); home-v4 itself is untouched.
    var opening = (/[?&]opening=(\w+)/.exec(query) || [])[1] || hero.getAttribute('data-band-opening') || '';
    var landing = opening === 'land' && !!slider && !reduced && !!window.gsap;
    var landDur = param('land', 'land', 2.4); // seconds the landing takes (expo.out: quick in, a long settle)
    var landDelay = param('landdelay', 'land-delay', 0.25); // seconds the drum hangs at the top first, so it is seen setting off once the loader has gone
    var landFrom = param('landfrom', 'land-from', 1.25); // screens above its resting place the drum sets off from (over 1 = fully out of view, no flash)
    var landTilt = param('landtilt', 'land-tilt', 80); // degrees it is tipped over as it sets off (nearly edge-on; the exit ends at 60)
    var landScale = param('landscale', 'land-scale', 0.7); // how small it starts, far away, before it swells into place (1 = no approach)
    var landSettle = param('landsettle', 'land-settle', 1.3); // the touchdown: the descent overshoots its spot and settles back (back.out strength; 0 = none)
    var landTurn = param('landturn', 'land-turn', 2); // cards it turns back while it lands (negative: the other way, 0: none)
    var scrolled = false; // the hero has started to scroll away: the auto-step clock holds, the drum belongs to the scroll
    var stepNext = null;
    if (slider && stepEvery > 0 && !reduced) {
      stepNext = document.createElement('button');
      stepNext.type = 'button'; stepNext.tabIndex = -1;
      stepNext.setAttribute('data-spatial-slider-control', 'next'); stepNext.setAttribute('aria-hidden', 'true');
      stepNext.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;border:0;opacity:0;overflow:hidden;pointer-events:none';
      slider.appendChild(stepNext);
    }
    osmoInit();
    var copy = qs('.band_copy', hero), title = qs('.band_title', hero), eyebrow = qs('.band_eyebrow', hero);
    var buttons = qsa('.btn', copy || hero), scrollLine = qs('.band_scroll', hero), loader = qs('.band_loader', hero);
    var nav = [qs('.bold-nav-full__bar')].filter(Boolean); // the logo + burger (rdNavFull)
    var hidden = false;

    // ---- the auto-advance clock (started by the opening, once the copy is in): a step every stepEvery seconds.
    // It holds while the pointer is over the cards, while a drag or its throw runs, while the page is hidden
    // (background tab) or the hero has scrolled away; every hold restarts the wait, so a step never lands right
    // after a hand has let go or the pointer has left.
    var autoStep = function () {
      if (reduced || (!stepNext && !(ringApi && stepEvery > 0))) return; // with reduced motion nothing turns by itself, the dial included
      var zone = ring || qs('[data-spatial-slider-collection]', slider) || slider, over = false;
      zone.addEventListener('pointerenter', function () { over = true; });
      zone.addEventListener('pointerleave', function () { over = false; });
      var wait = stepEvery * 1000, due = performance.now() + wait;
      setInterval(function () {
        var d = slider && slider._spatialSliderDraggable, now = performance.now();
        var held = over || hidden || document.hidden || scrolled || (d && (d.isPressed || d.isDragging || d.isThrowing)) || (ringApi && ringApi.busy());
        if (held) { due = now + wait; return; }
        if (now < due) return;
        due = now + wait;
        if (ringApi) ringApi.step(1); else stepNext.click();
      }, 200);
    };

    // ---- home-v4: moving the drum from outside a drag, through the slider's own proxy and Draggable (Osmo's code untouched:
    // its render is the Draggable's onDrag, its step distance is read off its snap)
    var drumStep = function () { // the slider's step in px: the smallest value its snap rounds up to a step
      var d = slider && slider._spatialSliderDraggable, snap = d && d.vars && d.vars.snap;
      if (typeof snap !== 'function') return 0;
      var lo = 0, hi = 4000;
      for (var i = 0; i < 40 && hi - lo > 0.05; i++) { var mid = (lo + hi) / 2; if (snap(mid) > 0) hi = mid; else lo = mid; }
      return snap(hi);
    };
    var turnDrum = function (cards) { // turn the drum by a number of cards: the proxy moves, the Draggable syncs to it, the cards follow
      var d = slider && slider._spatialSliderDraggable, proxy = slider && slider._spatialSliderProxy, render = d && d.vars && d.vars.onDrag, step = drumStep();
      if (!d || !proxy || !render || !step || !cards) return;
      gsap.getTweensOf(proxy).forEach(function (t) { t.progress(1); }); // a step under way lands first, so the turn adds to whole cards
      gsap.set(proxy, { x: (parseFloat(gsap.getProperty(proxy, 'x')) || 0) - cards * step });
      d.update(); render();
    };
    var settleDrum = function () { // back at the top of the page: the drum eases onto the nearest card
      var d = slider && slider._spatialSliderDraggable, proxy = slider && slider._spatialSliderProxy, render = d && d.vars && d.vars.onDrag, snap = d && d.vars && d.vars.snap;
      if (!d || !proxy || !render || typeof snap !== 'function' || d.isPressed || d.isDragging || d.isThrowing) return;
      var x = parseFloat(gsap.getProperty(proxy, 'x')) || 0, to = snap(x);
      if (Math.abs(to - x) < 0.5) return;
      gsap.to(proxy, { x: to, duration: 0.6, ease: 'power2.out', onUpdate: render, onComplete: function () { d.update(); render(); } });
    };

    // ---- home-extreme, the dial (Rimbo's roulette from the drum lab; round 3: ringSlots cards, the works on the page
    // repeating to fill them, "5 is a bit little"): the slider root carries [data-ring] instead of Osmo's init
    // attribute. The cards sit on a cylinder, the axis behind the front card. At rest they are 22.5° apart and read as
    // the arc of home-v4, the first card in front (a part-cylinder keeps its gap at the back, out of sight). The hero stays pinned for pinScreens screens of scroll: over the first 35% the ring tips about
    // its axis until you look down on it, every card turning face-up, the spacing opening to a full 360/N so the
    // five fill the circle as a dial (the radius tightens with it), the name of the card at the bottom fading in at
    // the centre; the next 50% turns it one full round, one name per notch; the last 15% closes it, the dial drawing
    // into its middle and fading, so the next section is there when the pin lets go. Drags turn it: at rest the
    // five cannot loop, so the drag is held to the five (a rubber band past the ends); once flat it goes round. The
    // step clock is off here unless ?step=N asks for it (at rest it walks 1-2-3-4-5 and back). ?pin=N sets the screens.
    var ringApi = null, ringFront = [], ringWait = []; // ringFront: the media on the card in front at the opening; ringWait: clips asleep until the reveal
    // a copied card must not fetch its clips: the copy's video only keeps its address in data-src, for dedupeClips to find the master by
    var stripClips = function (el) { qsa('video', el).forEach(function (v) { var src = v.getAttribute('src'); if (src) { v.setAttribute('data-src', src); v.removeAttribute('src'); } v.setAttribute('preload', 'none'); }); };
    // wake a sleeping clip (preload="none" in the Designer): load it now and play it like the others
    var wake = function (v) {
      if (!v.__wait) return;
      v.__wait = false;
      ringWait = ringWait.filter(function (w) { return w !== v; });
      v.preload = 'auto'; // enough on its own: the browser picks the download up from here (a load() on top would start it twice)
      if (!hidden && !v.__off && v.__tuned) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    };
    // Who waits for the reveal: a phone, or a slow or metered connection. There the clip in front has the line to itself,
    // so the loader is not kept waiting by four clips nobody can see yet (together 3.5 MB next to its own 1.4). On a wide
    // screen with a good connection the sleeping clips are woken at once, which comes to the same as preload="auto"
    var slowStart = function () {
      var c = navigator.connection;
      if (c && (c.saveData || /(^|-)(2g|3g)$/.test(c.effectiveType || '') || (c.downlink && c.downlink < 5))) return true;
      return window.innerWidth < 768;
    };
    var buildRing = function () {
      var drum = qs('.spatial-gsap-slider__collection', ring) || ring.firstElementChild;
      var list = qs('.spatial-gsap-slider__list', ring) || drum;
      var originals = qsa('.spatial-gsap-slider__item', list);
      if (!drum || originals.length < 2) return null;
      var N = Math.max(originals.length, Math.min(60, Math.round(ringSlots))), FULL = 360 / N, REST = ringFull ? FULL : 22.5, mid = Math.floor(N / 2), rad = Math.PI / 180;
      var works = originals.length, closeLine = hero.getAttribute('data-band-close') || 'Create'; // the word the dial closes on
      // what the dial says on the way round: data-band-lines on the section ("one|two|three"), general lines about the work,
      // not captions of the cards (Rimbo); the panels' data-ring-line or names only if the section has none
      var lines = (hero.getAttribute('data-band-lines') || '').split('|').map(function (t) { return t.trim(); }).filter(Boolean);
      if (!lines.length) lines = originals.map(function (el) { var pn = qs('[data-band-name]', el) || el; return pn.getAttribute('data-ring-line') || pn.getAttribute('data-band-name') || ''; });
      for (var ci = originals.length; ci < N; ci++) { var cl = originals[ci % originals.length].cloneNode(true); cl.setAttribute('data-ring-clone', ''); cl.setAttribute('aria-hidden', 'true'); stripClips(cl); list.appendChild(cl); } // the works repeat round the dial; dedupeClips turns the copies into canvases
      // the card that faces you at the opening (k = 0, the first card): the loader only waits for its clip, the others load behind it
      ringFront = qsa('.band_panel-media', originals[0]);
      originals.slice(1).forEach(function (el) { qsa('video', el).forEach(function (v) { if (ringFront.indexOf(v) < 0 && (v.getAttribute('preload') || '') !== 'auto') { v.__wait = true; ringWait.push(v); } }); }); // preload="none" in the Designer: it stays asleep until the reveal or until its card turns to the front (wake)
      if (ringWait.length && !slowStart()) ringWait.slice().forEach(wake); // a good connection: no reason to wait (tune, just below, plays them like the one in front)
      var items = qsa('.spatial-gsap-slider__item', list).map(function (el, i) { var panel = qs('[data-band-name]', el) || el; return { el: el, k: i <= mid ? i : i - N, name: panel.getAttribute('data-band-name') || '', fly: 0, tan: 0, gone: 0 }; }); // 0 = the first card, in front at rest; the last ones sit to its left; the line is what the dial says in its middle (data-ring-line on the panel, the name if there is none)
      var label = qs('.band_ring-name', hero); // Designer: band_ring-name, the script only writes in it
      if (!label) { label = document.createElement('div'); label.className = 'band_ring-name'; label.setAttribute('aria-hidden', 'true'); hero.appendChild(label); }
      var bottomFade = qs('.band_fade.is-bottom', hero); // covers the clip edge at rest; it lifts while the dial lies flat, so the lower cards stay bright
      var st = { steps: 0, scroll: 0, tip: 0, open: 0, scale: 1, y: 0, dx: 0, fade: 1, pitch: 0, w: 0, h: 0, fit: 0.45, tween: null, front: -1, dir: 1, closing: false, text: '', blurOn: false };
      var persp = parseFloat(getComputedStyle(ring).perspective) || 2400; // the ring root is the camera
      var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
      var arcR = function () { return st.pitch / (2 * Math.sin(REST / 2 * rad)); }; // the drum's cylinder: the cards a pitch apart along it
      var dialR = function () { return Math.max(arcR() * ringGrow, st.w / (2 * Math.sin(Math.PI / N)) + st.h * 0.3); }; // the flat dial: the drum grown a little, and never so tight that the cards pile up in the middle
      var measure = function () { var w = originals[0].offsetWidth || window.innerWidth * 0.285, gap = window.innerWidth * 0.025; st.pitch = w + gap; st.w = w; st.h = originals[0].offsetHeight || w / 1.02; st.fit = Math.min(0.6, window.innerHeight * 1.2 / (2 * (dialR() + st.h / 2))) || 0.45; st.top = ring.offsetTop;
        if (phoneLab()) { // ON A PHONE (Rimbo 2026-11-17): the whole dial on the screen, centred, the title clear of the cards
          st.fit = Math.min(0.9, window.innerWidth * 1.15 / (2 * (dialR() + st.h / 2)) * (persp + dialR()) / persp); // 1.15 screen widths: the sides bleed off a little and the cards stay big enough to read (Rimbo's screenshot, 2026-11-17) // the dial lies at depth -R, so it shows smaller by persp / (persp + R): grown back by that
          st.yFlat = (window.innerHeight / 2 - st.top) * (persp + dialR()) / persp; // the hole's centre (the label) lands on the middle of the screen
          var tb = title ? title.getBoundingClientRect().bottom - hero.getBoundingClientRect().top - (st.copyY || 0) : 0; // the title's foot, in the hero (without the centring below)
          st.yRest = Math.max(0, Math.round(tb + 20 - (st.top - st.h / 2))); // the front card starts under it
          // the copy and the front card as one block, centred on the screen (Rimbo: so much space at the bottom); the copy
          // moves with the CSS translate property, which its own opening and fade (opacity, filter) leave alone
          if (copy) {
            var hTop = hero.getBoundingClientRect().top, shift = st.copyY || 0;
            var cTop = copy.getBoundingClientRect().top - hTop - shift, cBot = st.top + st.h / 2 + st.yRest;
            st.shift = Math.max(0, Math.round((window.innerHeight - (cBot - cTop)) / 2 - cTop));
            // the copy a little higher than the block's centring puts it, the card stays where it is (Rimbo's phone test, 2026-11-18:
            // "the work is nicely in the centre, the texts need to move up a little"); never up into the menu bar
            st.copyY = st.shift - Math.max(0, Math.min(Math.round(window.innerHeight * 0.03), cTop + st.shift - 88));
            copy.style.translate = '0 ' + st.copyY + 'px';
            st.yRest += st.shift;
          }
          if (bottomFade) bottomFade.style.translate = '0 ' + st.yRest + 'px'; // the shade over the cards' foot moves down with them (else it drew a faded line across the front card)
        } else { st.yFlat = null; st.yRest = 0; }
      }; // the flat dial stands 1.2 screens tall, bleeding a little top and bottom like the first ring, whatever the count; top: read here once, not in render, where reading it right after the transforms made the browser lay the page out again every frame
      function phoneLab() { return window.innerWidth < 768 && !/[?&]m=0\b/.test(query); } // the phone dial is how a phone gets the hero (Rimbo, 2026-11-17); ?m=0 on staging shows the old, desktop-sized dial for comparison
      var spacing = function () { return REST + (FULL - REST) * st.open; };
      var render = function () {
        var sp = spacing(), turn = st.steps + st.scroll, s = st.scale.toFixed(4);
        var ang = (((-turn * sp) % 360) + 540) % 360 - 180; // wrapped to a half-turn either way, so a long turn never hands the browser a huge angle
        var Rarc = arcR(), Rdial = dialR(); // the drum's cylinder, then the dial
        var R = Rarc + (Rdial - Rarc) * st.open;
        // written as strings: the order matters (a card turns about the axis first, then moves out to the cylinder), and GSAP would translate first
        drum.style.transform = 'translate3d(' + st.dx.toFixed(1) + 'px,' + st.y.toFixed(1) + 'px,' + (-R).toFixed(1) + 'px) rotateX(' + st.tip.toFixed(3) + 'deg) rotateY(' + ang.toFixed(3) + 'deg) scale3d(' + s + ',' + s + ',' + s + ')';
        // the fade sits on the cards, never on the drum: opacity below 1 flattens a preserve-3d element's children into its
        // own plane, and the drum's plane is edge-on when the dial lies flat, so a faded drum painted nothing at all
        items.forEach(function (it) { it.el.style.transform = 'rotateY(' + (it.k * sp).toFixed(3) + 'deg) translate3d(' + (-it.tan).toFixed(1) + 'px,0,' + (R + it.fly).toFixed(1) + 'px) rotateX(' + (-st.tip).toFixed(3) + 'deg)'; it.el.style.opacity = Math.min(st.fade, 1 - it.gone).toFixed(3); }); // a card's own x is the tangent of its travel, so a fling (tan) rides the spin
        // which cards face away: their backs are hidden, so a copy there need not be repainted. How much a card faces you is
        // the depth part of its normal: sin²(tip) + cos²(tip) × cos(its angle round the drum) (1 = straight at you; flat, every card faces up at you)
        var t = st.tip * rad, s2 = Math.sin(t) * Math.sin(t), c2 = 1 - s2, moved = !!(st.steps || st.scroll);
        items.forEach(function (it) {
          if (!it.media || !it.media.parentNode) it.media = qs('.band_panel-media', it.el); // dedupeClips swaps the copies' videos for canvases after the first render
          var m = it.media; if (!m) return;
          var on = s2 + c2 * Math.cos((ang + it.k * sp) * rad) > 0.1, was = m.__face;
          if (was !== on) { m.__face = on; if (on && was === false && m.__master && !hidden && m.__vis !== false) { if (m.__master.readyState >= 2) paintOne(m.__master, m); else posterInto(m.__master, m); } } // back in front: the latest frame at once, not on the next one (the poster while the clip has none)
          var mm = m.__master || m;
          if (on && moved && mm.__wait) wake(mm); // a sleeping clip whose card turns to the front before the reveal has woken it
        });
        var front = ((Math.round(turn) % N) + N) % N; st.front = front;
        // what the middle says: on the way round the lines take turns, each for an equal share of the round (five changes),
        // counted from the scroll alone so the first line is always first; as the dial closes, one word
        var L = lines.length, text = st.closing ? closeLine : lines[((Math.floor(st.scroll / (N / L) + 1e-6) % L) + L) % L];
        if (text !== st.text) { st.text = text; label.textContent = text; }
        // the text sits at the hole's centre: the flat ring lies at one depth (z = -R), so its centre is the drum's centre
        // projected towards the camera, and nothing about the turn moves it
        label.style.top = (st.top + (st.y + 0) * persp / (persp + R)).toFixed(1) + 'px';
      };
      measure(); if (st.yRest) st.y = st.yRest; render();
      var rt = null; rdOn(window, 'resize', function () { clearTimeout(rt); rt = setTimeout(function () { measure(); render(); }, 250); });
      // ---- motion blur (Rimbo: "some effects have motion blur on movement… on the spinning it could be nice"): one SVG
      // filter, a horizontal blur in each card's own frame, which on the ring is the tangent of its travel; its width
      // follows the drum's speed in cards a second, smoothed, and the filter only sits on the cards while there is
      // something to see (a filter also flattens a card's 3D subtree, which is fine: a card is one flat tile)
      if (ringBlur > 0 && window.gsap) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
        svg.innerHTML = '<filter id="band-mblur" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0" edgeMode="duplicate"/></filter>';
        hero.appendChild(svg);
        var feBlur = svg.querySelector('feGaussianBlur'), lastTurn = st.steps + st.scroll, blurNow = 0;
        rdTick(function (t, dt) {
          if (hidden) return;
          var turn = st.steps + st.scroll, speed = Math.abs(turn - lastTurn) / Math.max(1, dt) * 1000; lastTurn = turn; // cards a second
          var want = Math.min(ringBlur, speed * ringBlur / 6); // the full width at six cards a second
          blurNow += (want - blurNow) * (want > blurNow ? 0.5 : 0.2); // quick to come, slower to go
          var on = blurNow > 0.15;
          if (on || st.blurOn) items.forEach(function (it) { // only the cards that face you: a card seen from behind paints nothing, a filter on it would still cost a layer
            var want = on && !(it.media && it.media.__face === false);
            if (want !== !!it.blur) { it.blur = want; it.el.style.filter = want ? 'url(#band-mblur)' : ''; }
          });
          st.blurOn = on;
          if (on) feBlur.setAttribute('stdDeviation', (blurNow / Math.max(0.2, st.scale)).toFixed(2) + ' 0'); // in the card's own px: the dial's cards are scaled down
        });
      }
      var lim = ringFull ? Infinity : Math.max(0, Math.floor((N - 1) / 2 - 2)), lo = -lim, hi = lim, flat = function () { return st.open >= 0.5 || ringFull; }; // a part-cylinder may only turn until its gap would show; a whole one is free
      var held = function (v) { if (flat()) return v; return v < lo ? lo + (v - lo) * 0.25 : v > hi ? hi + (v - hi) * 0.25 : v; }; // the rubber band at rest
      // drags: a pitch of pointer travel is one card; on release it settles on the nearest card, a flick carries on a little
      var down = null;
      ring.addEventListener('pointerdown', function (e) { if (e.button) return; if (st.tween) st.tween.kill(); down = { x: e.clientX, steps: st.steps, t: performance.now(), v: 0, last: e.clientX }; ring.setPointerCapture(e.pointerId); });
      ring.addEventListener('pointermove', function (e) { if (!down) return; var now = performance.now(); down.v = (e.clientX - down.last) / Math.max(1, now - down.t); down.last = e.clientX; down.t = now; st.steps = held(down.steps - (e.clientX - down.x) / st.pitch); render(); }); // v: px per ms
      var up = function () { if (!down) return; var v = down.v; down = null; settle(-v * 150 / st.pitch); };
      ring.addEventListener('pointerup', up); ring.addEventListener('pointercancel', up);
      var settle = function (extra) { var to = Math.round(st.steps + (extra || 0)); if (!flat()) to = Math.max(lo, Math.min(hi, to)); st.tween = gsap.to(st, { steps: to, duration: 0.8, ease: 'power3.out', onUpdate: render }); };
      var ease3 = function (q) { q = clamp01(q); return 1 - Math.pow(1 - q, 3); };
      var easeTip = function (q) { q = clamp01(q); return phoneLab() ? q * q * (3 - 2 * q) : ease3(q); }; // on a phone the dial tips over in and out softly: ease3 gave a quarter of the tip in the first 50 px of a thumb flick
      return {
        busy: function () { return !!down; },
        refresh: render, // dedupeClips: once the copies are canvases, mark the ones facing away straight away
        state: function () { return { steps: st.steps, scroll: st.scroll, tip: st.tip, open: st.open, scale: st.scale, fade: st.fade, front: st.front, cards: N, works: works, fit: st.fit, text: st.text, labelTop: label.style.top }; },
        step: function (n) {
          var cur = Math.round(st.steps), next = cur + n * st.dir;
          if (!flat() && (next > hi || next < lo)) { st.dir = -st.dir; next = cur + n * st.dir; } // 1-2-3-4-5 and back
          if (st.tween) st.tween.kill();
          st.tween = gsap.to(st, { steps: next, duration: 1, ease: 'power3.inOut', onUpdate: render });
        },
        scroll: function (q) { // q: 0..1 over the pinned distance
          var screens = q * pinScreens, gone = clamp01(screens / fadeFrac); // the copy goes within fadeFrac of a screen, as on home-v4
          if (copy && gone !== st.copyGone) { st.copyGone = gone; copy.style.transition = 'none'; gsap.set(copy, { opacity: 1 - gone, filter: gone ? 'blur(' + (10 * gone).toFixed(1) + 'px)' : 'none' }); } // only when it changes; a blur(0) left on the copy would keep it on its own layer for nothing
          if (scrollLine) { scrollLine.style.transition = 'none'; gsap.set(scrollLine, { opacity: 1 - clamp01(screens / 0.07) }); }
          var e = easeTip(q / 0.35), x = clamp01((q - 0.75) / 0.25); // e: the tip-over; x: the way out (a quarter of the hold: Rimbo found it too fast)
          st.closing = x > 0;
          st.tip = 90 * e; st.open = e; st.y = st.yFlat != null ? (st.yRest || 0) * (1 - e) + st.yFlat * e : -window.innerHeight * 0.08 * e;
          st.scroll = (q > 0.35 ? Math.min(1, (q - 0.35) / 0.4) * N : 0); // one full round
          st.scale = 1 - (1 - st.fit) * e; st.fade = 1; st.dx = 0;
          // the way out (Rimbo: a fade-out after that is a let-down): the dial rolls off to the left still spinning, or the
          // cards shoot out one by one, or (the old way) it draws in and fades
          var W = window.innerWidth, xo = ease3(x);
          if (ringOut === 'shoot') { // flung by the spin (Rimbo: "it has so much momentum, do something with that"): the drum keeps turning and each card, when its turn comes, accelerates out along its tangent
            st.scroll += x * N * 0.35;
            items.forEach(function (it, i) { var d = ((i * 7) % N) / N * 0.55, g = clamp01((x - d) / (1 - d)); g = g * g; it.fly = W * 0.9 * g; it.tan = W * 1.3 * g; it.gone = clamp01(g * 1.5); });
          } else if (ringOut === 'fade') {
            st.scale *= 1 - 0.5 * x; st.fade = 1 - x; st.scroll += x * 0.6;
          } else { // roll
            st.dx = -W * 1.15 * xo; st.scroll += x * N * 0.5; // half a round more on the way out
          }
          if (bottomFade) gsap.set(bottomFade, { opacity: 1 - e });
          gsap.set(label, { opacity: clamp01((q - 0.3) / 0.08) * (1 - clamp01((x - 0.7) / 0.3)) }); // the closing word sticks (Rimbo) and only goes with the last of the hold
          render();
        }
      };
    };
    if (ring && window.gsap) { ringApi = buildRing(); hero._ring = ringApi; } // _ring: for the headless checks

    // ---- clips: play every video once (the marquee clones the row after this; re-touching a running video makes it hiccup)
    function tune() {
      qsa('video', hero).forEach(function (v) {
        if (v.__tuned || !v.getAttribute('src')) return; // a ring copy has no address: it becomes a canvas
        v.__tuned = true;
        var rate = parseFloat(v.getAttribute('data-rate')) || 1.5;
        v.muted = true; v.loop = true; v.playsInline = true;
        var apply = function () { if (v.playbackRate !== rate) v.playbackRate = rate; };
        if (v.readyState >= 1) apply(); else v.addEventListener('loadedmetadata', apply, { once: true });
        if (v.paused && !hidden && !v.__off && !v.__wait) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } // play() would load a sleeping clip too
      });
    }
    tune(); setTimeout(tune, 0); setTimeout(tune, 1500); setTimeout(tune, 4000);

    // ---- one download and one decoder per clip: the clones' videos become canvases painted from the master video.
    // It runs again after every width change (the Osmo sliders re-clone), so the observer, the frame callbacks and the
    // listeners are made once: a second run only picks up new copies.
    var clipIO = null, rafOnes = [], rafRunning = false;
    function paintOne(m, c) {
      if (c.width !== m.videoWidth) { c.width = m.videoWidth; c.height = m.videoHeight; }
      c.getContext('2d').drawImage(m, 0, 0);
      c.__frame = true;
    }
    // the loader no longer waits for every clip, so a copy can be on screen before its master has a frame: it gets the
    // master's poster drawn in, at the poster's own size so the panel's cover fit crops it like the master's poster.
    // Drawn, not a CSS background: a canvas drawing never counts as the page's largest paint the way a background does.
    // Only where it is needed: a copy facing you whose master is asleep (preload="none") or still has no frame at the
    // reveal. With every clip on preload="auto" they all have frames long before the reveal, so nothing is drawn at all
    function posterInto(m, c) {
      var url = m.getAttribute('poster');
      if (!url || m.readyState >= 2 || c.__frame || c.__face === false || c.__postered) return;
      if (!m.__poster) {
        // the same address as the master's poster, so it comes from the cache, not a second download; turned into a bitmap
        // once, off the main thread, so drawing it after that is a plain copy
        var img = new Image(); img.decoding = 'async'; img.src = url;
        m.__poster = window.createImageBitmap && img.decode
          ? img.decode().then(function () { return createImageBitmap(img); }).catch(function () { return null; })
          : Promise.resolve(null);
      }
      m.__poster.then(function (img) {
        if (!img || c.__frame || m.readyState >= 2 || !c.isConnected) return; // the clip got there first: its frames take over
        if (c.width !== img.width || c.height !== img.height) { c.width = img.width; c.height = img.height; }
        c.getContext('2d').drawImage(img, 0, 0);
        c.__postered = true;
      });
    }
    function paintClones(m) {
      if (m.readyState < 2 || !m.__canvases) return;
      m.__canvases.forEach(function (c) {
        if (c.__vis === false || c.__face === false) return; // off screen, or a ring card facing away: nothing to show
        paintOne(m, c);
      });
    }
    // a clip decodes while one of its panels (its own or a copy) is to be seen, and rests when none is
    function showOrRest(m) {
      var shown = (m.__vis !== false ? 1 : 0) + (m.__canvases || []).filter(function (c) { return c.__vis !== false; }).length;
      m.__off = shown === 0;
      if (m.__off) { if (!m.paused) m.pause(); }
      else if (m.paused && !hidden && m.__tuned && !m.__wait) { paintClones(m); var p = m.play(); if (p && p.catch) p.catch(function () {}); }
      // no frame yet (a browser that refuses play() until a touch, Low Power Mode: iOS then loads nothing): a copy that
      // turns to the front gets the poster, like its master, instead of an empty card
      if (!m.__off && m.readyState < 2 && m.__canvases) m.__canvases.forEach(function (c) { if (c.__vis !== false) posterInto(m, c); });
    }
    var ringLooking = false;
    function ringLook() {
      if (hidden || document.hidden) return;
      var W = window.innerWidth, H = window.innerHeight, pad = W * 0.6, seen = [];
      qsa('.band_panel-media', hero).forEach(function (media) {
        var r = media.getBoundingClientRect();
        media.__vis = media.__face !== false && r.right > -pad && r.left < W + pad && r.bottom > 0 && r.top < H;
        var m = media.__master || media;
        if (seen.indexOf(m) < 0) seen.push(m);
      });
      seen.forEach(showOrRest);
    }
    function dedupeClips() {
      var masters = {};
      qsa('video', hero).forEach(function (v) {
        var src = v.getAttribute('src') || v.getAttribute('data-src'); // a ring copy keeps its address in data-src
        if (!src) return;
        if (!masters[src]) { masters[src] = v; return; }
        var c = document.createElement('canvas');
        c.className = v.className; c.setAttribute('aria-hidden', 'true');
        c.width = 640; c.height = 627;
        v.parentNode.replaceChild(c, v);
        c.__master = masters[src];
        (masters[src].__canvases = masters[src].__canvases || []).push(c);
      });
      var all = Object.keys(masters).map(function (k) { return masters[k]; });
      all.forEach(function (m) { if (m.__canvases) m.__canvases = m.__canvases.filter(function (c) { return c.isConnected; }); }); // a re-clone throws the old copies away
      // ---- only what is on screen costs anything: a clip decodes while one of its panels (master or clone)
      // is near the viewport, and a clone is repainted only while it is on screen and only when the master
      // presents a new frame (requestVideoFrameCallback), not on every display refresh
      if (ringApi) {
        // the dial looks for itself. Safari's IntersectionObserver gets cards on a 3D drum wrong: after the first turn it
        // called the cards in front "off screen", so their clips were paused and never started again, and iOS draws a
        // paused clip as an empty card (Rimbo's phone test, 2026-11-18: "not all fields in the spinning wheel are loaded").
        // So: a few times a second, each card's real box against the screen; a card counts while it faces you and its box
        // is on the screen or within 0.6 of a screen width beside it (the next one in is already running)
        if (!ringLooking) { ringLooking = true; setInterval(ringLook, 300); }
        ringLook();
      } else if ('IntersectionObserver' in window) {
        if (!clipIO) clipIO = new IntersectionObserver(function (entries) {
          var touched = [];
          entries.forEach(function (en) {
            var media = qs('.band_panel-media', en.target);
            if (!media) return;
            media.__vis = en.isIntersecting;
            var m = media.__master || media;
            if (touched.indexOf(m) < 0) touched.push(m);
          });
          touched.forEach(showOrRest);
        }, { rootMargin: '5% 10%', threshold: 0 }); // a panel resumes ~150 px before its edge enters: 1.5 s of lead at the band's pace
        qsa('.band_panel', hero).forEach(function (p) { if (p.__clipIO) return; p.__clipIO = true; clipIO.observe(p); });
      }
      all.filter(function (m) { return m.__canvases && m.__canvases.length; }).forEach(function (m) {
        if (m.__painting) return;
        m.__painting = true;
        if (!m.requestVideoFrameCallback) { rafOnes.push(m); return; }
        var arm = function () { m.requestVideoFrameCallback(function () { if (!hidden) paintClones(m); arm(); }); };
        arm(); // stays armed across pauses: it only fires when a frame is presented
        m.addEventListener('seeked', function () { if (!hidden) paintClones(m); }); // the restart at the reveal shows frame 0 on the clones too
      });
      if (rafOnes.length && !rafRunning) { rafRunning = true; (function paint() { if (!hidden) rafOnes.forEach(paintClones); requestAnimationFrame(paint); })(); }
      if (ringApi) ringApi.refresh(); // sets which copies face you
      all.forEach(function (m) { if (m.__wait && m.__canvases) m.__canvases.forEach(function (c) { posterInto(m, c); }); }); // a sleeping clip has no frame until after the reveal
    }
    setTimeout(dedupeClips, 0); // once this run is done: the slider or the dial has made its copies by then
    var rt = null; rdOn(window, 'resize', function () { clearTimeout(rt); rt = setTimeout(function () { tune(); dedupeClips(); }, 450); }); // the Osmo slider re-clones on a width change (200 ms debounce); the clones become canvases again after

    // ---- a hidden tab costs nothing: every clip pauses the moment the page is hidden (a background tab,
    // a minimised window) and the on-screen ones resume when it is shown again. Animation frames already
    // sleep in a hidden tab, so the marquee, the clone canvases and the tilt stop by themselves.
    rdOn(document, 'visibilitychange', function () {
      if (document.hidden) qsa('video', hero).forEach(function (v) { v.pause(); });
      else if (!hidden) qsa('video', hero).forEach(function (v) { if (v.paused && !v.__off && !v.__wait) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
    });

    // ---- the name chip shows while the pointer rests on a panel; nothing lifts, nothing dims (Rimbo tried
    // both: the lift was not needed, the dimming flashed while switching panels and dragging).
    // Delegated, so the marquee's clones get it too.
    hero.addEventListener('mouseover', function (e) { var p = e.target.closest && e.target.closest('.band_panel'); if (p) { var l = qs('.band_panel-label', p); if (l) l.classList.add('is-on'); } });
    hero.addEventListener('mouseout', function (e) { var p = e.target.closest && e.target.closest('.band_panel'); if (p && !p.contains(e.relatedTarget)) { var l = qs('.band_panel-label', p); if (l) l.classList.remove('is-on'); } });



    // ---- the old home's move: the section scrolls away with the page (the Designer keeps it in flow, not fixed),
    // and the moment the visitor scrolls the copy fades and blurs away in place, the scroll prompt even sooner.
    // Off-screen, the hero hides and its clips pause until the visitor comes back.
    var scrollRef = hero;
    // ---- home-v4, the scroll pieces that must exist before anyone scrolls. Not in fadeBehind, which waits for the
    // opening: a trigger made mid-scroll snaps the drum to the current progress, the "straight, then clips to 3D"
    // Rimbo saw. The 3D exit: as the hero leaves, the whole drum tips over about its centre (no recede, it keeps its
    // size), on a 3D layer from the first frame so nothing re-rasterizes when the tip starts. And the scroll turn:
    // drumTurn cards over the first screen, back on the way up, settling on a card at the top.
    if (window.ScrollTrigger && ringApi && pinScreens > 0) { // home-extreme: the hero holds while the ring tips over and turns, then the page goes on
      ScrollTrigger.create({
        trigger: hero, start: 'top top', end: function () { pinScreens = pinNow(); return '+=' + Math.round(window.innerHeight * pinScreens); }, pin: true, pinSpacing: true, invalidateOnRefresh: true,
        onUpdate: function (st) { scrolled = st.progress > 0.02; ringApi.scroll(st.progress); }
      });
    }
    if (window.ScrollTrigger && !reduced && slider) {
      if (exitTilt) {
        gsap.set(slider, { rotationX: 0, transformPerspective: exitDepth, transformOrigin: '50% 50%', force3D: true });
        gsap.to(slider, { rotationX: exitTilt, transformPerspective: exitDepth, transformOrigin: '50% 50%', force3D: true, ease: 'none', scrollTrigger: { trigger: scrollRef, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      }
      if (drumTurn) {
        var turned = 0;
        ScrollTrigger.create({
          trigger: scrollRef, start: 'top top', end: 'bottom top',
          onUpdate: function (st) {
            scrolled = st.progress > 0.02;
            var d = slider._spatialSliderDraggable, want = drumTurn * st.progress;
            if (d && (d.isPressed || d.isDragging || d.isThrowing)) { turned = want; return; } // a hand on the drum wins; the scroll picks up from wherever it lands
            turnDrum(want - turned); turned = want;
            if (st.progress <= 0) settleDrum();
          }
        });
      }
    }
    // home-v4-landing: the start pose, on 3D layers from the first frame like the exit's hooks. The descent is the stage's
    // (the bottom fade inside it is held in place, it is structural) and the tilt the collection's: the slider root keeps
    // the exit's own rotationX hooks untouched, so a ScrollTrigger refresh mid-landing can never record the tipped pose as
    // the exit's starting point. The opening (open below) plays it all back to rest.
    var landCol = landing ? qs('[data-spatial-slider-collection]', slider) : null, landFade = landing && stage ? qs('.band_fade.is-bottom', stage) : null;
    if (landing && stage) {
      stage.style.transition = 'none'; // no rise and no fade for the stage: the landing is the entrance
      gsap.set(stage, { y: -landFrom * window.innerHeight, force3D: true });
      if (landFade) gsap.set(landFade, { y: landFrom * window.innerHeight });
      if (landCol) gsap.set(landCol, { rotationX: landTilt, scale: landScale, transformPerspective: exitDepth, transformOrigin: '50% 50%', force3D: true });
    }
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
      var quick = function () { return '+=' + Math.round(window.innerHeight * fadeFrac); }; // gone within the first fifth of a screen (fadeFrac)
      if (copy && !ring) {
        if (landing) {
          // home-v4-landing (Rimbo): scrolling down the copy blurs out with the scroll as on home-v4 (a short catch-up tween
          // instead of a scrub, so a change of direction never pops it); scrolling up it does not un-blur along the way, it
          // simply appears, in a beat, as soon as the page is back inside the fade zone at the top.
          var gone = gsap.to(copy, { opacity: 0, filter: 'blur(10px)', ease: 'power1.out', paused: true });
          var aim = function (p, dur) { gsap.to(gone, { progress: p, duration: dur, ease: 'power1.out', overwrite: true }); };
          ScrollTrigger.create({
            trigger: scrollRef, start: 'top top', end: quick, invalidateOnRefresh: true,
            onUpdate: function (st) { if (st.direction < 0 && st.progress < 1) aim(0, 0.25); else aim(st.progress, 0.15); }
          });
        } else gsap.to(copy, { opacity: 0, filter: 'blur(10px)', ease: 'power1.out', scrollTrigger: { trigger: scrollRef, start: 'top top', end: quick, scrub: true, invalidateOnRefresh: true } });
        // pinned while it blurs (Rimbo, 4 Nov): the copy rides the scroll back exactly as the hero moves up, so it
        // stays put on screen and the band slides away underneath it. Only for the in-flow hero; a fixed one is pinned already.
        gsap.to(copy, { y: function () { return hero.offsetHeight; }, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }); // (a pinned hero keeps it in place by itself)
      }
      // the scroll line is still fading in (its CSS entrance runs 1.6-2.8 s after the opening), so its
      // scrub waits for that to end, then takes over without the transition fighting every scroll step
      if (scrollLine && !ring) setTimeout(function () {
        scrollLine.style.transition = 'none';
        gsap.fromTo(scrollLine, { opacity: 1 }, { opacity: 0, ease: 'none', immediateRender: false, scrollTrigger: { trigger: scrollRef, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 0.07); }, scrub: true, invalidateOnRefresh: true } }); // the scroll prompt is gone well before the copy
      }, 1100);
      ScrollTrigger.create({
        trigger: scrollRef, start: 'top top', end: 'bottom top',
        onLeave: function () { hidden = true; hero.style.visibility = 'hidden'; qsa('video', hero).forEach(function (v) { v.pause(); }); },
        onEnterBack: function () { hidden = false; hero.style.visibility = ''; qsa('video', hero).forEach(function (v) { if (v.paused && !v.__off && !v.__wait) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }); }
      });
    };


    // ---- the opening, in order: the band rises, the title letters come up like the old hero,
    // the eyebrow and the buttons follow, the scroll line, and last the logo and the burger.
    // Only on the page you arrive on: after a page transition the logo and burger are already on screen, and hiding them
    // until the end of the opening took the menu away for nine seconds (Rimbo: "now I lost my menu again")
    if (pageVisits <= 1) nav.forEach(function (el) { el.style.opacity = '0'; }); // a plain style, not gsap.set: the page's revert on leaving would clear it again after the next page's opening had hidden the logo
    var opened = false;
    var open = function () {
      if (opened) return; opened = true;
      // every clip starts from its first frame as the band reveals, so the visitor sees each opening
      // (Echo's own loader, say) instead of whatever was playing behind the black
      ringWait.slice().forEach(wake); // the sleeping clips load now, behind the one in front that the loader waited for
      if (ringApi) qsa('canvas.band_panel-media', hero).forEach(function (c) { if (c.__master) posterInto(c.__master, c); }); // a slow clip the loader did not wait for: its copies show the poster until it has a frame
      qsa('video', hero).forEach(function (v) { if (!v.getAttribute('src')) return; try { v.currentTime = 0; } catch (e) {} if (v.paused && !hidden && !v.__off) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } });
      // home-v4 (Rimbo): the copy first, then the cards. No rise and no fade for the stage (Rimbo: not needed);
      // once the title is nearly in, each whole card (frame, shadow and clip as one) grows from one pixel at its
      // centre to full size, the middle card first and the rest following outward.
      var cardsAfter = (!!slider || !!ringApi) && !landing && !reduced && !!window.gsap && typeof SplitText !== 'undefined';
      var stageNow = !cardsAfter;
      if (loader && landing) loader.style.transition = 'opacity .5s ease-out'; // the landing starts under the loader: a quicker fade, so the drum is seen setting off
      [stageNow ? stage : null, landing ? null : copy, loader].forEach(function (el) { if (el) el.classList.add('is-ready'); }); // the landing shows the copy only when the title comes in (its halo would veil the drum passing behind it)
      if (loader) setTimeout(function () { loader.remove(); }, 1200);
      var done = function () {
        if (myScope && myScope.left) return; // a link was followed mid-opening: the clock, the drift and the scroll fades are not for a page on its way out
        if (scrollLine) scrollLine.classList.add('is-ready');
        autoStep();
        nav.forEach(function (el) { gsap.to(el, { opacity: 1, duration: 0.9, ease: 'power2.out', clearProps: 'opacity' }); });
        // the reveal transitions have run; hand the elements to the scroll fade
        setTimeout(function () { if (copy) copy.style.transition = 'none'; fadeBehind(); }, 1900);
      };
      if (reduced || !window.gsap || typeof SplitText === 'undefined') return done();
      // home-v4-landing: the drum lands first. The stage (with the bottom fade held in place) comes down from landFrom screens
      // up while the collection untips from landTilt and the drum turns back landTurn cards, all in landDur with one ease, so
      // it arrives quick and settles slow like the exit run backwards. A scroll during the landing ends it at once: from the
      // first scrolled pixel the drum belongs to the exit. The title starts once the drum is nearly down (at 70% of the landing).
      var titleAt = 0;
      if (landing) {
        var ld = slider._spatialSliderDraggable, lproxy = slider._spatialSliderProxy, lrender = ld && ld.vars && ld.vars.onDrag, lstep = drumStep();
        var land = gsap.timeline({ onUpdate: function () { if (land.progress() < 1 && (window.scrollY || document.documentElement.scrollTop) > 2) { land.progress(1); if (window.ScrollTrigger) ScrollTrigger.update(); } } });
        var landEase = landSettle > 0 ? 'back.out(' + landSettle + ')' : 'expo.out'; // the descent overshoots and settles: the touchdown
        if (stage) land.to(stage, { y: 0, duration: landDur, ease: landEase, clearProps: 'transform' }, landDelay);
        if (landFade) land.to(landFade, { y: 0, duration: landDur, ease: landEase, clearProps: 'transform' }, landDelay);
        if (landCol) land.to(landCol, { rotationX: 0, scale: 1, duration: landDur, ease: 'expo.out', clearProps: 'transform' }, landDelay);
        if (lproxy && lrender && lstep && landTurn) {
          var lx = parseFloat(gsap.getProperty(lproxy, 'x')) || 0;
          gsap.set(lproxy, { x: lx - landTurn * lstep }); lrender(); // as the exit leaves it: landTurn cards on; the landing turns them back
          land.to(lproxy, { x: lx, duration: landDur, ease: 'expo.out', onUpdate: lrender, onComplete: function () { ld.update(); lrender(); } }, landDelay);
        }
        titleAt = Math.max(0, landDelay + landDur * 0.7 - 0.3);
      }
      var chars = title ? split(title).chars : [];
      var t0 = landing ? 0.3 : 0; // the landing shows the copy from the timeline's start and the letters follow a beat later, as home-v4's delay does
      var tl = gsap.timeline({ delay: landing ? titleAt : 0.3, onComplete: inZone(done) }); // inZone: what done() starts (clock, tickers, timers) belongs to this page, whenever it runs
      if (landing && copy) tl.call(function () { copy.classList.add('is-ready'); }, null, 0);
      tl.from(chars, heroCharsIn(), t0)
        .from(eyebrow, { opacity: 0, y: 8, duration: 0.8, ease: 'expo.out' }, t0 + 0.35)
        .from(buttons, { opacity: 0, y: 14, duration: 0.9, ease: 'expo.out', stagger: 0.08, clearProps: 'opacity,transform' }, t0 + 0.55);
      if (cardsAfter) {
        var cx = window.innerWidth / 2;
        var panels = qsa('.band_panel', hero).map(function (p) { var r = p.getBoundingClientRect(); return { el: p, d: Math.abs(r.left + r.width / 2 - cx) }; })
          .sort(function (a, b) { return a.d - b.d; }).map(function (x) { return x.el; }); // nearest the middle first
        gsap.set(panels, { scale: 0.002, transformOrigin: '50% 50%' }); // one pixel, where the card's centre will be
        if (stage) { stage.style.transition = 'none'; gsap.set(stage, { y: 0 }); } // the Designer's rise + fade are off: the cards are the entrance
        tl.call(function () { if (stage) stage.classList.add('is-ready'); }, null, 0.98)
          .to(panels, { scale: 1, duration: 1.1, ease: 'expo.out', stagger: 0.1, clearProps: 'transform' }, 1);
      }
    };
    var ready = open;
    if (!loader) { ready(); return; }
    var num = qs('.band_loader-n', loader), bar = qs('.band_loader-fill', loader);
    var t0 = performance.now(), shown = 0, lastTick = t0;
    var readiness = function () {
      var seen = {}, total = 0, done = 0;
      qsa('.band_panel-media', hero).forEach(function (m) {
        if (m.tagName === 'CANVAS') return;
        if (ringFront.length && ringFront.indexOf(m) < 0) return; // the dial: only the card in front at the opening; the rest load behind it (open wakes the sleeping ones)
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
      // the counter closes 9% of its gap per frame at 60 a second, and the same per second on a phone that only manages
      // ten: counted per frame it took a slow phone seconds longer to reach 100, exactly where the wait is longest already
      var nowTick = t0 + elapsed;
      shown += (target - shown) * (1 - Math.pow(0.91, Math.min(500, nowTick - lastTick) / 16.67));
      lastTick = nowTick;
      if (target >= 100 && shown > 99.3) shown = 100;
      if (num) num.textContent = (shown < 9.5 ? '0' : '') + Math.round(shown);
      if (bar) bar.style.transform = 'scaleX(' + (shown / 100).toFixed(3) + ')';
      if (shown >= 100) { setTimeout(ready, 350); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // rdButtons(root): the buttons inside root (the whole page without one) that aren't wired yet. Each button once:
  // the calculator on /proposal builds its buttons after this page's run and calls it again through window.rdButtons
  function rdButtons(root) {
    var buttons = qsa('.btn', root).filter(function (b) { return !b.hasAttribute('data-btn-on'); });
    if (!buttons.length) return;
    buttons.forEach(function (b) { b.setAttribute('data-btn-on', ''); });

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var cap = gsap.utils.clamp(-9, 9); // never into the neighbour
    var REACH = 56;
    var FPS = 9; // the old stop-motion button ran 4 frames in .45 s

    function em(el, n) { return n * parseFloat(getComputedStyle(el).fontSize); }

    // The letters (one span each) and the boil come from the text kit: rdSplitChars and rdBoil

    // The swap: line A rolls up out of the mask, line B rolls in from below (and back).
    // Line B is a copy of line A with the alt label; both get one span per character.
    function swap(lineA, alt) {
      var lineB = lineA.cloneNode(true);
      lineB.classList.add('is-alt');
      lineB.setAttribute('aria-hidden', 'true');
      qs('.btn_t', lineB).textContent = alt;
      lineA.parentNode.appendChild(lineB);
      var a = rdSplitChars(qs('.btn_t', lineA), { cls: 'btn_ch' }).concat(qsa('.btn_arrow', lineA));
      var bChars = rdSplitChars(qs('.btn_t', lineB), { cls: 'btn_ch' });
      var b = bChars.concat(qsa('.btn_arrow', lineB));
      // line B waits below the mask. As a plain style until the first hover: handing every letter to GSAP at start-up
      // made the browser work out its styles again for each one (most of the buttons' start-up time on a phone, where
      // the line is never shown). The first hover swaps the style for GSAP's own yPercent, in one go, nothing to see
      b.forEach(function (el) { el.style.transform = 'translate(0, 120%)'; });
      var primed = false;
      var prime = function () {
        if (primed) return;
        primed = true;
        b.forEach(function (el) { el.style.transform = ''; });
        gsap.set(b, { yPercent: 120 });
      };
      return {
        chars: bChars,
        to: function (showAlt) {
          prime();
          gsap.to(a, { yPercent: showAlt ? -120 : 0, duration: 0.55, ease: 'expo.out', stagger: 0.012, overwrite: 'auto' });
          gsap.to(b, { yPercent: showAlt ? 0 : 120, duration: 0.55, ease: 'expo.out', stagger: 0.012, overwrite: 'auto' });
        }
      };
    }

    // The magnet: within the reach the button follows the pointer, the label a little more.
    // activate / release fire when the button takes and loses the pointer.
    var magnets = [], layoutStamp = 0; // layoutStamp: goes up when the page has moved under the buttons

    function magnet(btn, o) {
      var inner = qs('.btn_in', btn);
      var active = false;
      var box = null, boxStamp = -1, boxAt = 0;
      var m = {
        el: btn,
        visible: true,
        measure: function (e) {
          // where the button rests is read from the page at most every 120 ms, and again after a scroll or a resize: asking
          // the browser on every pointer move made it lay the page out again each time, in the middle of whatever was animating
          var now = performance.now();
          if (!box || boxStamp !== layoutStamp || now - boxAt > 120) {
            var r = btn.getBoundingClientRect();
            // the rect moves with the button: take the current offset out again
            box = { cx: r.left + r.width / 2 - (gsap.getProperty(btn, 'x') || 0), cy: r.top + r.height / 2 - (gsap.getProperty(btn, 'y') || 0), w: btn.offsetWidth / 2 + REACH, h: btn.offsetHeight / 2 + REACH };
            boxStamp = layoutStamp; boxAt = now;
          }
          var dx = e.clientX - box.cx, dy = e.clientY - box.cy;
          return { inside: Math.abs(dx) <= box.w && Math.abs(dy) <= box.h, dist: Math.max(Math.abs(dx) / box.w, Math.abs(dy) / box.h), dx: dx, dy: dy };
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
      var b = s ? rdBoil(s.chars, { x: 0.6, y: 0.7, rotation: 3, fps: FPS }) : null;
      var arrows = qsa('.btn_arrow', btn); // after the swap built line B, so both arrows nudge
      var downs = arrows.filter(function (a) { return /\u2193/.test(a.textContent); }); // a down arrow nudges down, not right
      var sides = arrows.filter(function (a) { return downs.indexOf(a) < 0; });
      var timer = null;
      var m = magnet(btn, {
        activate: function () {
          if (sides.length) gsap.to(sides, { x: em(btn, 0.35), duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
          if (downs.length) gsap.to(downs, { y: em(btn, 0.3), duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
          if (s) s.to(true);
          if (b && !reduce) timer = gsap.delayedCall(0.4, b.start);
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
    rdOn(window, 'scroll', function () { layoutStamp++; }, { passive: true });
    rdOn(window, 'resize', function () { layoutStamp++; }, { passive: true });
    rdOn(document, 'pointermove', function (e) {
      if (e.pointerType === 'touch') return; // a finger on a touch-screen laptop: it would pull a button and leave it hovered
      var nearest = null, best = Infinity;
      magnets.forEach(function (m) {
        m.d = m.visible ? m.measure(e) : null;
        if (m.d && m.d.inside && m.d.dist < best) { best = m.d.dist; nearest = m; }
      });
      magnets.forEach(function (m) { m === nearest ? m.pull(m.d) : m.release(); });
    }, { passive: true });
    rdOn(document.documentElement, 'pointerleave', function () {
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
  window.rdButtons = rdButtons; // for page code that builds buttons later (the calculator on /proposal: prototype/calculator)

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

  // The scroll ruler: its CSS lives in Webflow since 2026-11-19 (the Blog posts template head code), main.js only builds and moves it

  // Short labels from the H2s: "Webflow vs WordPress: the comparison" → "Webflow vs WordPress",
  // "Which one should you choose?" → "Which one", "So, is Webflow good for SEO?" → "Is Webflow good for SEO"
  var LABEL_MAX = 26; // characters, about what fits in the margin next to the text
  function scrollRulerLabel(text) {
    var STOP = /^(a|an|the|to|of|for|and|or|in|on|at|by|with|from|your|you|is|are|should|can|de|het|een|van|voor|en|op|met|je|jouw|zijn)$/i;
    var t = text.replace(/\s+/g, ' ').trim().replace(/^\d+[:.)]\s+/, '');
    t = t.replace(/^\S+,\s+/, function (lead) { return /\s/.test(lead.trim()) ? lead : ''; }); // a lone "So," in front goes
    // only what comes before a colon, question mark, comma, dash or bracket, or a full stop that ends
    // a sentence (not the one in "vs." or "2.0")
    // (found by hand, not with a look-behind: Safari before 16.4 cannot read one, and then none of this file runs)
    var cut = -1, stop = /[:?!,—–(]|\.(?=\s|$)/g, hit;
    while ((hit = stop.exec(t))) {
      if (hit[0] === '.' && /\bvs$/i.test(t.slice(0, hit.index))) continue;
      cut = hit.index;
      break;
    }
    var head = (cut < 0 ? t : t.slice(0, cut)).trim() || t;
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
    if (window.Webflow && Webflow.env && Webflow.env('editor') !== undefined) return;

    var article = qs('.post_richtext');
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
    var box = article.closest('.post_richtext-box') || article;
    var endMark = document.createElement('div');
    endMark.setAttribute('data-scroll-ruler-name', '');
    endMark.setAttribute('aria-hidden', 'true');
    endMark.style.cssText = 'display: block; height: 0;';
    box.parentNode.insertBefore(endMark, box.nextSibling);
    var parts = headings.concat(endMark);

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
    rdOn(window, 'resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fitLabels, 150); });

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
    // H3s get a medium tick, at the same place along the ruler as Osmo puts the parts
    var subHeads = qsa('h3', article);
    function markSubs() {
      var sy = window.scrollY, lastPart = parts.length - 1;
      var start = Math.max(parts[0].getBoundingClientRect().top + sy, window.innerHeight / 2);
      var end = parts[lastPart].getBoundingClientRect().bottom + sy;
      var length = Math.max(Math.min(end, document.documentElement.scrollHeight - window.innerHeight / 2) - start, 1);
      ticks.forEach(function (t) { t.classList.remove('is-sub'); });
      subHeads.forEach(function (h) {
        var at = (h.getBoundingClientRect().top + sy - start) / length;
        if (at < 0 || at > 1) return;
        var t = ticks[Math.round(at * (ticks.length - 1))];
        if (t) t.classList.add('is-sub');
      });
    }
    markSubs();
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
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { rdOn(window, t, cancel, { once: true, passive: true }); });
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
    // 78% down, just before the last label (about 81% down) would reach the CTA card under the article
    var st = null;
    function setOut(out) { root.classList.toggle('is-out', out); root.inert = out; }
    if (typeof ScrollTrigger !== 'undefined') {
      st = ScrollTrigger.create({
        trigger: box,
        start: 'top bottom',
        end: 'bottom 78%',
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
      placeTimer = setTimeout(function () { placeLeftOut(); markSubs(); if (st) st.refresh(); }, 250);
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
        let rangeStart = 0; let rangeLength = 1; let partStarts = []; let lastScroll = window.scrollY; let speed = 0; let currentIndex = null; let activePart = null; let pointerPosition = 0.5; let cursorTarget = 0; let cursorStrength = 0; let lastActive = 0; let rootStatus = ""; let reduceMotion = false; let settled = false; let lastPointer = -1;
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
          currentIndex = null; settled = false;
        }
        function scrollToPosition(top) { window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" }); }
        function scrollToPart(partIndex) { scrollToPosition(parts[partIndex].getBoundingClientRect().top + window.scrollY); }
        function findPart(position) { let partIndex = 0; partStarts.forEach((start, index) => { if (start <= position) partIndex = index; }); return partIndex; }
        const rulerNarrow = window.matchMedia("(max-width: 991px)"); let asleep = false; let narrowNow = rulerNarrow.matches; rdOn(rulerNarrow, "change", (e) => { narrowNow = e.matches; });
        let scrollNow = window.scrollY; rdOn(window, "scroll", () => { scrollNow = window.scrollY; }, { passive: true }); // kept from the scroll event: reading scrollY every frame forces a layout pass // read once: .matches every frame forces a style pass // the ruler is display: none on narrow screens and when the article leaves it no room: no frames spent on it then
        function update(time) {
          if (narrowNow || root.classList.contains("is-compact")) { asleep = true; return; }
          const frame = Math.min(gsap.ticker.deltaRatio(60), 3);
          const scrollY = scrollNow; if (asleep) { asleep = false; lastScroll = scrollY; } const scrollDelta = scrollY - lastScroll; lastScroll = scrollY;
          // At rest (no scroll, the wave and the cursor glow settled, status already idle) there is nothing to draw
          if (settled && scrollDelta === 0 && pointerPosition === lastPointer && Math.abs(cursorTarget - cursorStrength) < 0.001 && rootStatus === "idle") return;
          lastPointer = pointerPosition;
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
          let moved = 0;
          for (let i = 0; i < tickCount; i++) {
            let target = waveAmount * gaussian(tickPositions[i] - marker, waveSpread);
            if (cursorSize > 0) target += cursorSize * cursorStrength * gaussian(tickPositions[i] - pointerPosition, cursorWidth);
            moved = Math.max(moved, Math.abs(target - values[i]));
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
          settled = moved < 0.0005 && speed < 0.001;
          if (speed > 0.02 || cursorStrength > 0.1 || root.matches(":focus-within")) lastActive = time;
          const nextStatus = time - lastActive < idleDelay ? "active" : "idle";
          if (nextStatus !== rootStatus) { rootStatus = nextStatus; root.setAttribute("data-scroll-ruler-status", rootStatus); }
        }
        rdOn(window, "pointermove", (event) => { if (event.pointerType !== "mouse" || asleep) return; const rect = list.getBoundingClientRect(); const reach = rect.height * 0.25; const distance = Math.max(event.clientX - rect.left - root.offsetWidth * 0.5, 0); cursorTarget = gsap.utils.clamp(0, 1, 1 - distance / reach); pointerPosition = (event.clientY - rect.top) / rect.height; });
        rdOn(document.documentElement, "pointerleave", () => { cursorTarget = 0; });
        root.addEventListener("click", (event) => { const rect = list.getBoundingClientRect(); const position = gsap.utils.clamp(0, 1, (event.clientY - rect.top) / rect.height); if (usingParts) scrollToPart(findPart(position)); else scrollToPosition(position * rangeLength); });
        gsap.matchMedia().add("(prefers-reduced-motion: reduce)", () => { reduceMotion = true; return () => { reduceMotion = false; }; });
        let resizeTimer;
        const resizeObserver = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 100); });
        resizeObserver.observe(document.body); resizeObserver.observe(root);
        measure();
        rdTick(update);
      });
    }
  }

  // =========================================================
  // POST REFRESH — the new blog post page (/post/…), staging and localhost only until Rimbo's go
  // Built from the sketch Rimbo approved (prototype/post-refresh, docs/blog-post-layout-proposal.md):
  // no boxed menu, a left-aligned hero with the author block and the sections on the right, calmer
  // reading styles, one "start a project" block instead of the newsletter, then "Keep reading".
  // It lives here, not in the Designer, so a live publish can't take it along before he says go;
  // once approved, the structure moves into the Blog posts template.
  // Runs before the buttons and the ruler: they pick up what it builds.
  // =========================================================
  // The new post page: its CSS lives in Webflow since 2026-11-19 (the Blog posts template head code), main.js only builds and moves it

  // Scrolls to a section heading from the "In this article" list
  function postJumpTo(h) {
    var off = window.matchMedia('(max-width: 1199px)').matches ? 80 : 32; // narrow: clear of the logo and burger (they end at 58px)
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    qsa('.post_richtext img[loading="lazy"]').forEach(function (img) { img.loading = 'eager'; }); // so they stop moving the target
    var tries = 0;
    function done() {
      if (Math.abs(h.getBoundingClientRect().top - off) > 2 && tries++ < 3) { setTimeout(function () { go(false); }, 80); return; }
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }
    function go(first) {
      if (window.lenis && window.lenis.scrollTo) {
        if (reduce) { window.lenis.scrollTo(h, { offset: -off, immediate: true }); setTimeout(done, 120); }
        else window.lenis.scrollTo(h, { offset: -off, duration: first ? 1.4 : 0.6, onComplete: done });
      } else {
        window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - off, behavior: reduce ? 'auto' : 'smooth' });
        setTimeout(done, reduce ? 120 : 900);
      }
    }
    go(true);
  }

  function rdPostRefresh() {
    if (window.Webflow && Webflow.env && Webflow.env('editor') !== undefined) return;
    var container = qs('.post_intro .post_intro-container');
    var h1 = qs('.post_intro .post_title');
    if (!container || !h1 || document.documentElement.classList.contains('rf')) return;
    document.documentElement.classList.add('rf');
    var nl = /^\/nl(\/|$)/.test(location.pathname); // Dutch posts: the reading words in Dutch, the rest of the design the same


    var grain = document.createElement('div');
    grain.className = 'grain rf-grain';
    grain.setAttribute('aria-hidden', 'true');
    var page = qs('.main-wrapper');
    (page || document.body).insertBefore(grain, (page || document.body).firstChild);

    // ---- hero
    var cat = qs('.post_categories .post_category');
    var category = cat ? cat.textContent.trim() : '';
    var eyebrow = document.createElement('div');
    eyebrow.className = 'rf-eyebrow rf-hero-eyebrow';
    eyebrow.innerHTML = '<span class="rf-dot"></span>';
    var eyebrowText = document.createElement('span');
    eyebrowText.className = 'rf-eb';
    eyebrowText.textContent = (nl ? 'Artikel' : 'Article') + (category ? ' · ' + category : '');
    eyebrow.appendChild(eyebrowText);

    // the summary is a lead paragraph, not a second heading above the article (one H1, then the article's H2s)
    var summary = qs('.post_intro .summary');
    var summaryHeading = summary && qs('h2.post_summary-heading', summary);
    if (summaryHeading) {
      var lead = document.createElement('p');
      Array.prototype.slice.call(summaryHeading.attributes).forEach(function (a) { lead.setAttribute(a.name, a.value); }); // keeps the Webflow entrance (data-w-id)
      while (summaryHeading.firstChild) lead.appendChild(summaryHeading.firstChild);
      summaryHeading.parentNode.replaceChild(lead, summaryHeading);
    }

    var author = qs('.rl_blogpost1_content-top');
    var hero = document.createElement('div'); hero.className = 'rf-hero';
    var main = document.createElement('div'); main.className = 'rf-hero__main';
    var side = document.createElement('aside'); side.className = 'rf-hero__side'; side.setAttribute('aria-label', nl ? 'Over dit artikel' : 'About this article');
    main.appendChild(eyebrow); main.appendChild(h1); if (summary) main.appendChild(summary);
    if (author) side.appendChild(author);

    // the sections, with the ruler's short names; open next to the title, folded below 992px
    var article = qs('.post_richtext');
    var sections = article ? qsa('h2', article).filter(function (h) { return h.textContent.trim() && h.textContent.indexOf('{skip}') === -1; }) : [];

    // the closing "Questions? Let's talk" section makes way for the project block below the article
    var last = sections[sections.length - 1];
    if (last && /^(questions|vragen)\?/i.test(last.textContent.trim())) {
      while (last.nextSibling) last.parentNode.removeChild(last.nextSibling);
      last.parentNode.removeChild(last);
      sections.pop();
    }
    if (sections.length > 1) {
      var toc = document.createElement('details');
      toc.className = 'rf-toc';
      toc.innerHTML = '<summary class="rf-eyebrow">' + (nl ? 'In dit artikel' : 'In this article') + '</summary><ol></ol>';
      var ol = qs('ol', toc);
      var used = {};
      sections.forEach(function (h) {
        var text = (h.innerText || h.textContent).replace(/\s*\{skip\}/, '').replace(/\s+/g, ' ').trim();
        // a shareable address per section (#what-is-webflow), kept if the heading already has one
        if (!h.id) {
          var slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'section';
          var id = slug, n = 2;
          while (used[id] || document.getElementById(id)) id = slug + '-' + n++;
          h.id = id;
        }
        used[h.id] = true;
        var a = document.createElement('a');
        // the full address of this page + #section (what a bare "#section" resolves to anyway): Webflow's links script
        // skips links with a colon in them. A bare "#section" it measures on every scroll frame (jQuery offset, height and
        // :visible for every section, a sixth of the scrolling work in a profile) only to toggle w--current, which nothing styles
        a.href = location.href.split('#')[0] + '#' + h.id;
        var label = document.createElement('span');
        label.textContent = text.replace(/^\d+[:.)]\s+/, '').split(/:\s/)[0]; // the whole heading, up to a colon: there is room for it here
        a.appendChild(label);
        a.addEventListener('click', function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return; // new tab / window keeps the plain link
          e.preventDefault();
          if (history.replaceState) history.replaceState(history.state, '', '#' + h.id);
          postJumpTo(h);
        });
        var li = document.createElement('li');
        li.style.setProperty('--n', ol.children.length);
        li.appendChild(a);
        ol.appendChild(li);
      });
      // open next to the title from 1200px and it stays open there; folded below, and in step when the
      // window is resized or a tablet is turned
      var wide = window.matchMedia('(min-width: 1200px)');
      toc.open = wide.matches;
      var follow = function () { toc.open = wide.matches; };
      if (wide.addEventListener) rdOn(wide, 'change', follow); // rdOn: a media query with a listener is kept by the browser, and with it this whole post, after the page has gone
      else if (wide.addListener) { wide.addListener(follow); rdUndo(function () { wide.removeListener(follow); }); }
      qs('summary', toc).addEventListener('click', function (e) { if (wide.matches) e.preventDefault(); });
      side.appendChild(toc);
      // arriving with a section address (#what-is-webflow): go there once the page has settled
      if (location.hash.length > 1) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target && article.contains(target)) {
          var jump = function () { setTimeout(function () { postJumpTo(target); }, 300); };
          if (document.readyState === 'complete') jump(); else rdOn(window, 'load', jump); // after a page transition the window's load is long past
        }
      }
    }
    hero.appendChild(main); hero.appendChild(side);
    container.appendChild(hero);

    // ---- the opening: the title in words (each rises out of its own line), then html.rf-go starts the CSS sequence.
    // After a page transition it waits until the transition has landed, so it plays on screen, not under the blocks
    var words = h1.textContent.trim().split(/\s+/);
    if (words.length && words[0] && !qs('.rf-w', h1)) {
      h1.setAttribute('aria-label', h1.textContent.trim());
      h1.textContent = '';
      words.forEach(function (t, i) {
        var outer = document.createElement('span'), inner = document.createElement('span');
        outer.className = 'rf-w';
        outer.setAttribute('aria-hidden', 'true');
        inner.textContent = t;
        inner.style.setProperty('--i', i);
        outer.appendChild(inner);
        h1.appendChild(outer);
        if (i < words.length - 1) h1.appendChild(document.createTextNode(' '));
      });
    }
    var root = document.documentElement, waited = 0;
    rdUndo(function () { root.classList.remove('rf-go'); });
    var startOpening = function () {
      var landing = barbaOn && barba.transitions && barba.transitions.isRunning;
      if (landing && waited++ < 600) return; // about ten seconds at most
      gsap.ticker.remove(startOpening);
      root.classList.add('rf-go');
    };
    rdTick(startOpening);

    // ---- end of the page: the closing CTA is Rimbo's CTA_explore on the Blog posts template, then keep reading
    // keep reading: these are the highlighted posts, not this post's category, so the heading stays general
    var text = qs('.blog_section .blog_text');
    if (text) text.innerHTML =
      '<div class="rf-kr-head"><div><div class="rf-eyebrow">' + (nl ? 'Verder lezen' : 'Keep reading') + '</div><h2 class="rf-kr-title">' + (nl ? 'Meer artikelen' : 'More articles') + '</h2></div>' +
      '<a href="' + (nl ? '/nl' : '') + '/resources" data-btn-alt="' + (nl ? 'Bekijk ze allemaal' : 'Browse them all') + '" class="btn rf-kr-all w-inline-block"><div class="btn_in"><div class="btn_swap"><div class="btn_line"><div class="btn_t">' + (nl ? 'Alle artikelen' : 'All articles') + '</div><div class="btn_arrow">→</div></div></div></div></a></div>';
    var current = qs('.blog_section .w--current');
    if (current && current.closest('.post')) current.closest('.post').classList.add('rf-hide');
    // two recommendations read cleaner than three, whichever post you're on
    var list = qs('.blog_section .blog_list');
    if (list) {
      qsa('.post:not(.rf-hide)', list).forEach(function (card, i) { if (i > 1) card.classList.add('rf-hide'); });
      list.classList.add('rf-two');
    }

    rdOldFooterOut();
  }

  // The new footer (rdFooter) goes after the page; the old footer and back-to-top leave it
  function rdOldFooterOut() {
    var pageWrap = qs('.main-wrapper');
    if (pageWrap && !byId('MainWrap')) pageWrap.id = 'MainWrap';
    qsa('.scroll_wrap, .post_back-to-top').forEach(function (el) { el.parentNode.removeChild(el); });
  }

  // =========================================================
  // POST CARDS — the highlighted posts (home, under every post: .blog_highlight) and Resources (.is-resources)
  // At rest the dark panel has the same space above the date as below the title, and the title only the
  // height it needs. The subtext waits just under the title, invisible, so no sliver of it can ever show
  // however the spacing works out. On hover the panel slides up by exactly the subtext's height
  // (--rd-sub, measured below) while the subtext fades in close under the title; the card keeps its size.
  // This replaces the Webflow hover that slid the panel by a fixed amount.
  // =========================================================
  var POST_CARD_SCOPES = ['.blog_highlight', '.is-resources'];
  // The blog cards: its CSS lives in Webflow since 2026-11-19 (site head code), main.js only builds and moves it

  function rdPostCards() {
    var selector = POST_CARD_SCOPES.map(function (x) { return x + ' .post'; }).join(', ');
    if (!qs(selector)) return;
    // Per card: the subtext starts 8px under its own title (--rd-sub-top), and on hover the panel slides up
    // just far enough to leave 20px under the subtext (--rd-sub). Measured, because a card next to a longer
    // title has its text centred, not at the bottom.
    function measure() {
      qsa(selector).forEach(function (post) {
        var panel = qs('.blog_content', post), title = qs('.blog_title', post), sub = qs('.paragraph-46', post);
        if (!panel || !title || !sub || !sub.offsetHeight) { post.style.setProperty('--rd-sub', '0px'); return; }
        var top = title.offsetTop + title.offsetHeight + 8;
        post.style.setProperty('--rd-sub-top', top + 'px');
        post.style.setProperty('--rd-sub', Math.max(0, top + sub.offsetHeight + 20 - panel.offsetHeight) + 'px');
      });
    }
    measure();
    var timer;
    rdOn(window, 'resize', function () { clearTimeout(timer); timer = setTimeout(measure, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure); // the subtext rewraps once the font is in
  }

  // =========================================================
  // COVER HUE DRIFT — blog posts whose CMS switch "Cover hue drift" is on
  // The Blog posts template has an empty div [data-cover-hue-drift], shown only when the switch is set.
  // Webflow keeps a hidden conditional element in the page (class w-condition-invisible, display none),
  // so the drift is added here, and only when that div is really shown: a <style> inside a hidden embed
  // would still apply to every post.
  // =========================================================
  function rdCoverHueDrift() {
    var on = qsa('[data-cover-hue-drift]').some(function (m) {
      return !m.classList.contains('w-condition-invisible') && getComputedStyle(m).display !== 'none';
    });
    var cover = qs('.post_cover');
    if (!on || !cover) return;
    cover.classList.add('is-hue-drift');
  }


  // =========================================================
  // FULL SCREEN NAV — every page, after Osmo Supply's "Bold Full Screen Navigation" (markup, class names, toggle logic):
  // - the bar is the logo + burger in their own fixed difference-blend layer, visible the whole time
  // - the links come from the Webflow menu (.nav_popup-menu, hidden; so Dutch follows along), in Integral capitals,
  //   minus Home (the logo goes home), Contact (the email is here) and the page you are on
  // - the tile is the footer's black, a little see-through and blurred
  // - bottom row: the language pill left, Amsterdam's time in the middle, the email right
  // - one GSAP timeline, so opening and closing can interrupt each other; the tile comes in as a rounded swipe
  // Lenis stops while the menu is open.
  // =========================================================
  function rdNavFull() {
    var wrapEl = qs('.bold-nav-wrap');
    if (!wrapEl || qs('body > .bold-nav-full')) return; // a page without the component keeps its old nav
    // every part this needs, checked before anything is touched: a part renamed or deleted in the Designer then leaves the
    // old navigation in place, instead of hiding it and failing halfway with no menu at all
    var nav = qs('.bold-nav-full', wrapEl), bar = qs('.bold-nav-full__bar', wrapEl);
    if (!nav || !bar || !qs('.bold-nav-full__logo', bar) || !qs('.bold-nav-full__ul', nav) || !qs('.bold-nav-full__tile', nav) || !qs('[data-navigation-toggle="toggle"]', bar)) {
      console.warn('[rimbo-designs] full screen nav: a part of the Nav_full component is missing, the old navigation stays');
      return;
    }
    var nl = /^\/nl(\/|$)/.test(location.pathname);
    var prefix = nl ? '/nl' : '';
    function clean(href) {
      return (href || '').replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '').replace(/\/+$/, '') || '/';
    }
    // the links, minus the page you are on; read from the page, so with Barba it runs again every time the menu opens
    function menuLinks() {
      var skip = [prefix || '/', prefix + '/contact', clean(location.pathname)];
      var source = qsa('.nav_popup-menu .nav_link');
      return (source.length ? source.map(function (a) {
        return { href: clean(a.getAttribute('href')), text: a.textContent.trim() };
      }) : [
        { href: prefix + '/work', text: 'Work' }, { href: prefix + '/service', text: 'Service' },
        { href: prefix + '/resources', text: 'Resources' }
      ]).filter(function (it) { return skip.indexOf(it.href) < 0; }).map(function (it) {
        return '<li class="bold-nav-full__li"><a href="' + it.href + '" class="bold-nav-full__link">' + it.text + '</a></li>';
      }).join('');
    }
    var locales = qsa('.nav a[hreflang]'); // the old menu's Webflow locale links know the right URL for every page
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // what is behind the menu right now: the first real background at the left edge, high, middle and low on the screen
    // (a cream hero can sit above a dark section, and the body is cream even under a dark hero). Any light part counts.
    function lightAt(y) {
      for (var el = document.elementFromPoint(4, y); el; el = el.parentElement) {
        var c = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number);
        if (c.length > 2 && c[3] !== 0) return (c[0] + c[1] + c[2]) / 3 > 128;
      }
      return true;
    }
    function pageIsLight() {
      return [0.12, 0.5, 0.88].some(function (k) { return lightAt(window.innerHeight * k); });
    }
    // The look is in the Designer: the component Nav_full (bold-nav* classes, colours as variables) and its embed "Menu CSS"
    // (burger hover and cross, links fading back, focus rings, the language pill). Moved there from this file in v1.7.184.
    // Only the switch stays here: the old navigation steps aside once this menu is known to work
    var css = '#FIXED_NAV, #Top_Nav, .burgermenu, .nav { display: none !important; }';
    var style = document.createElement('style');
    style.textContent = css;
    rdHead(style);

    // The nav is the component Nav_full, nested in Fixed___NAV so it is on every page. It stays on screen while pages change, so
    // it can't live in a page: it moves out here, and Barba drops the copy in every page it fetches. The links and the
    // language are filled in here: they differ per page
    var lis = menuLinks();
    // first in the page, logo and burger before the menu: the keyboard reaches the burger first and the menu's links right
    // after it, not after the whole page and its footer (both are fixed with their own z-index, so nothing moves on screen)
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.insertBefore(nav, bar.nextSibling);
    qsa('.bold-nav-wrap').forEach(function (el) { el.parentNode.removeChild(el); });
    nav.setAttribute('data-navigation-status', 'not-active');
    nav.setAttribute('aria-label', 'Main');
    bar.setAttribute('data-navigation-status', 'not-active');
    qs('.bold-nav-full__logo', bar).setAttribute('href', prefix || '/');
    qs('.bold-nav-full__ul', nav).innerHTML = lis;
    var country = qs('[data-nav-country]', nav);
    if (nl && country) country.textContent = 'Nederland';
    var langEl = qs('.bold-nav__lang', nav);
    if (!langEl) {} // no language pill in the component: nothing to fill
    else if (locales.length > 1) {
      langEl.innerHTML = locales.map(function (a) {
        return '<a class="bold-nav__lang-link" hreflang="' + a.getAttribute('hreflang') + '" href="' + a.getAttribute('href') + '"' +
          (a.classList.contains('w--current') ? ' aria-current="page"' : '') + '>' + a.textContent.trim() + '</a>';
      }).join('');
      rdLangToggle();
      // on phones the pill sits between the links and the time, on wider screens bottom-left in the row
      var mid = qs('.bold-nav__mid', nav), row = qs('.bold-nav__bottom', nav);
      var phone = window.matchMedia('(max-width: 767px)');
      var placeLang = function () { if (phone.matches) mid.appendChild(langEl); else row.insertBefore(langEl, row.firstChild); };
      placeLang();
      if (phone.addEventListener) phone.addEventListener('change', placeLang); else phone.addListener(placeLang);
    } else langEl.parentNode.removeChild(langEl);

    var tile = qs('.bold-nav-full__tile', nav);
    var links = qsa('.bold-nav-full__link', nav);
    var bottom = qsa('.bold-nav__mid > *, .bold-nav__bottom > *', nav); // the pill (in the middle slot on phones), time, email
    var btn = qs('[data-navigation-toggle="toggle"]', bar);
    gsap.set(links, { yPercent: 110, rotate: 4 });
    gsap.set(bottom, { opacity: 0 });

    // The tile's edge. p = how far down it has come (0 to 1). The rounded swipe bows its middle ahead of the
    // sides while it moves (down when opening, up when closing) and is straight again when it settles.
    var edge = { p: 0, dir: 1 };
    function draw() {
      var w = window.innerWidth, h = window.innerHeight, y = edge.p * h;
      var bow = Math.sin(edge.p * Math.PI) * h * 0.22 * edge.dir;
      tile.style.clipPath = 'path("M0 0 H' + w + ' V' + y.toFixed(1) + ' Q' + (w / 2) + ' ' + (y + bow * 2).toFixed(1) + ' 0 ' + y.toFixed(1) + ' Z")';
    }

    var tl;
    var isOpen = false;
    var behind = []; // what the open menu covers: out of reach of the keyboard and screen readers until it closes
    function set(active) {
      if (active === isOpen) return;
      isOpen = active;
      [nav, bar].forEach(function (el) { el.setAttribute('data-navigation-status', active ? 'active' : 'not-active'); });
      btn.setAttribute('aria-expanded', active ? 'true' : 'false');
      tile.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) {
        behind = Array.prototype.filter.call(document.body.children, function (el) { return el !== nav && el !== bar && !el.inert && !/^(SCRIPT|STYLE|NOSCRIPT|LINK)$/.test(el.tagName); });
        behind.forEach(function (el) { el.inert = true; });
      } else {
        behind.forEach(function (el) { el.inert = false; });
        behind = [];
        if (nav.contains(document.activeElement)) btn.focus({ preventScroll: true }); // Escape on a menu link: focus goes back to the burger, not nowhere
      }
      if (window.lenis) { if (active) window.lenis.stop(); else window.lenis.start(); }
      if (tl) tl.kill();
      if (active) { tile.style.backgroundColor = 'rgba(12, 12, 12, ' + (pageIsLight() ? '.97' : '.9') + ')'; readPage(); }

      if (reduce) {
        gsap.set(tile, { visibility: active ? 'visible' : 'hidden', clipPath: 'none' });
        gsap.set(links, { yPercent: active ? 0 : 110, rotate: 0 });
        gsap.set(bottom, { opacity: active ? 1 : 0, y: 0 });
        return;
      }

      if (active) {
        edge.dir = 1;
        tl = gsap.timeline({ onComplete: function () { tile.style.clipPath = 'none'; } }); // open: no clip, so a resize can't cut it
        tl.set(tile, { visibility: 'visible' })
          .to(edge, { p: 1, duration: 1, ease: 'power3.inOut', onUpdate: draw }, 0)
          .to(links, { yPercent: 0, rotate: 0, duration: 1.2, ease: 'expo.out', stagger: 0.07 }, 0.45)
          .to(bottom, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.06, startAt: { y: 8 } }, 0.7);
      } else {
        edge.dir = -1;
        tl = gsap.timeline({ onComplete: function () {
          gsap.set(tile, { visibility: 'hidden' });
          gsap.set(links, { rotate: 4 }); // ready to rise from below next time
        } });
        // the words sink back into their masks, bottom word first; the tile only lifts once they are nearly gone, so its edge never cuts through them
        tl.to(links, { yPercent: 110, rotate: 0, duration: 0.5, ease: 'power2.in', stagger: { each: 0.04, from: 'end' } }, 0)
          .to(bottom, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 0)
          .add(draw, 0.35)
          .to(edge, { p: 0, duration: 0.85, ease: 'power3.inOut', onUpdate: draw }, 0.35);
      }
    }

    btn.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); btn.click(); } }); // in the Designer it's a link, so Space needs help
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      // mid-transition both pages are in the document: the menu would read two sets of links, and the landing restarts the scroll behind it
      if (!isOpen && window.barba && barba.transitions && barba.transitions.isRunning) return;
      set(!isOpen);
    });
    // A link in the menu was clicked: the page changes underneath, so it goes at once, without the swoosh
    rdNavFull.close = function () {
      if (!isOpen) return;
      var calm = reduce;
      reduce = true;
      set(false);
      reduce = calm;
      edge.p = 0; draw();              // ready to swoosh open from the top next time
      gsap.set(links, { rotate: 4 });
    };
    // The cube's old face takes a copy of the open menu, so the menu rolls away as part of the page
    rdNavFull.handOver = function (face) {
      if (!isOpen) return;
      var copy = nav.cloneNode(true);
      copy.removeAttribute('aria-label');
      copy.setAttribute('aria-hidden', 'true');
      copy.style.position = 'absolute';
      qs('.bold-nav-full__tile', copy).style.backgroundColor = '#0c0c0c'; // solid: a blurred glass can't turn in 3D
      qs('.bold-nav-full__tile', copy).style.backdropFilter = 'none';
      qs('.bold-nav-full__tile', copy).style.webkitBackdropFilter = 'none';
      face.appendChild(copy);
      rdNavFull.close();
    };

    // Barba: the page under the menu may have changed since it last opened
    function readPage() {
      qsa('.nav a[hreflang]').forEach(function (a) { // each page knows its own address in the other language
        var mine = qs('.bold-nav__lang a[hreflang="' + a.getAttribute('hreflang') + '"]', nav);
        if (mine) mine.setAttribute('href', a.getAttribute('href'));
      });
      var fresh = menuLinks();
      if (fresh === lis) return;
      lis = fresh;
      qs('.bold-nav-full__ul', nav).innerHTML = lis;
      links = qsa('.bold-nav-full__link', nav);
      gsap.set(links, { yPercent: 110, rotate: 4 });
    }

    rdOn(document, 'keydown', function (e) { if (e.key === 'Escape' && isOpen) set(false); });
    // coming back with the browser's back button shows the page, not a menu left open
    rdOn(window, 'pageshow', function (e) {
      if (!e.persisted || !isOpen) return;
      reduce = true; set(false); reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    var clock = qs('[data-nav-clock]', nav);
    if (!clock) return;
    function tick() { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }); }
    tick(); setInterval(tick, 15000);
  }

  // =========================================================
  // CITY PAGES — the showcase under the hero (Rimbo, 6 Nov): the home V4 drum as a plain section you scroll past, on
  // the beige page: every dark version (scroll fade, hard edge, grainy wave) was dropped, and the tops of the cards
  // peeking into the first screen are the cue to scroll. Not rdBand: that one belongs to a hero at the top of the page.
  // Here Osmo's slider starts when the section comes near, posters load then too, each clip only loads and plays
  // once its card is on screen, and a hidden Next button steps the drum every 5 s while it is in view.
  // =========================================================
  // City pages: the FAQ's closing line in the CMS is a plain link. It becomes the site's button here, before rdButtons
  // runs, so it gets the same hover as every other .btn. rdLocFaq runs first and has already moved the line under the list
  // (.loc_faq-tail), so the line is looked for there; the rich text is the fallback for a page where rdLocFaq did nothing.
  function rdLocFaqBtn() {
    var rich = qs('.loc_faq .loc_faq-tail') || qs('.loc_faq .w-richtext'), line = rich && rich.lastElementChild;
    var a = line && line.tagName === 'P' && line.children.length === 1 && line.firstElementChild;
    if (!a || a.tagName !== 'A' || line.textContent.trim() !== a.textContent.trim()) return;
    var label = a.textContent.trim();
    a.className = 'btn is-ink w-inline-block';
    a.setAttribute('data-btn-alt', 'Home');
    a.innerHTML = '<div class="btn_in"><div class="btn_swap"><div class="btn_line"><div class="btn_t"></div></div></div></div>';
    qs('.btn_t', a).textContent = label;
  }

  // Dutch lines Webflow's locale can't hold: attributes (a button's swap line, placeholders, aria-labels, a form's
  // waiting text) and a few text spans the localization skips. On /nl each comes from its own attribute on the element,
  // set in the Designer (element settings, custom attributes): data-btn-alt-nl, data-nl-placeholder, data-nl-aria-label,
  // data-nl-wait, and data-nl for the text itself (only the element's own text, a nested span like "Optional" keeps its
  // own data-nl). Runs before the buttons and the apply form read them.
  var RD_NL = /^\/nl(\/|$)/;
  function rdLocNl() {
    if (!RD_NL.test(location.pathname)) return;
    [['data-btn-alt-nl', 'data-btn-alt'], ['data-nl-placeholder', 'placeholder'], ['data-nl-aria-label', 'aria-label'], ['data-nl-wait', 'data-wait']].forEach(function (p) {
      qsa('[' + p[0] + ']').forEach(function (el) { el.setAttribute(p[1], el.getAttribute(p[0])); });
    });
    qsa('[data-nl]').forEach(function (el) {
      var nl = el.getAttribute('data-nl'), own = [].filter.call(el.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); })[0];
      if (!el.children.length) el.textContent = nl;
      else if (own) own.nodeValue = nl + (/\s$/.test(own.nodeValue) ? ' ' : '');
    });
  }

  // =========================================================
  // THE BRAND BALL: one renderer for the grainy ball, shared by rdLocBalls (city steps), rdWall (Wall of love cards) and
  // rdSvcBall (the /service hero), so its grain and colours are tuned in one place. Each caller gets its own WebGL2 context
  // (given back when the page leaves, rdGl) and copies each ball onto its own 2D canvas. look 'wall' turns faster with finer
  // clouds, for a ball you only see a quarter of; any other look is the calm city/service ball. bloom adds the /service
  // entrance: the colour grows in from the middle as o.reveal goes 0 to 1. (The IMAGINE ball on home is its own shader.)
  // =========================================================
  function rdBallGL(look, bloom) {
    var gl = rdGl(document.createElement('canvas').getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true }));
    if (!gl) return null;
    var k = look === 'wall' ? ['0.26', '0.5 + 0.34', '1.7', '1.0'] : ['0.16', '0.53 + 0.14', '1.0', '1.5'];
    var FRAG = "#version 300 es\n" +
      "precision highp float;\n" +
      "uniform vec2 res; uniform vec2 center; uniform float R; uniform float seed; uniform float bias; uniform float heat; uniform float grainScale; uniform float t;\n" +
      "uniform vec2 ptr; uniform float ptrR; uniform float ptrAmt; uniform vec3 stops[4]; uniform vec2 edges[3]; uniform float reveal;\n" +
      "out vec4 outColor;\n" +
      "float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
      "float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);\n" +
      "  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }\n" +
      "float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }\n" +
      "float s2(float x) { return x <= 0.0031308 ? x * 12.92 : 1.055 * pow(max(x, 0.0), 1.0 / 2.4) - 0.055; }\n" +
      "vec3 fromLab(vec3 c) {\n" +
      "  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.291485548 * c.z;\n" +
      "  l = l * l * l; m = m * m * m; s = s * s * s;\n" +
      "  return vec3(s2(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), s2(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), s2(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));\n" +
      "}\n" +
      "vec3 ramp(float v) { vec3 c = stops[0]; for (int i = 0; i < 3; i++) c = mix(c, stops[i + 1], smoothstep(edges[i].x, edges[i].y, v)); return fromLab(c); }\n" +
      "void main() {\n" +
      "  vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);\n" +
      "  vec2 l = (p - center) / R;\n" +
      "  float r = length(l), aa = 1.2 / R;\n" +
      "  if (r > 1.0 + aa) { outColor = vec4(0.0); return; }\n" +
      "  vec2 gp = floor(p / grainScale);\n" +
      "  float g1 = hash(gp + seed), g2 = noise(gp * 0.9 + seed * 3.0);\n" +
      "  float grain = (g1 - 0.5) * 0.20 + (g2 - 0.5) * 0.07;\n" +
      "  float h = hash(vec2(seed));\n" +
      "  float ang = h * 6.2831 + t * " + k[0] + ";\n" + // the colours turn around inside the ball
      "  float g = " + k[1] + " * dot(l, vec2(cos(ang), sin(ang)));\n" +
      "  vec2 drift = vec2(sin(t * 0.34 + h * 6.2831), cos(t * 0.27 + h * 12.566)) * 0.62;\n" +
      "  vec2 w = vec2(fbm(l * 0.55 + h * 40.0 + drift), fbm(l * 0.55 + h * 70.0 + 5.2 - drift));\n" +
      "  float f = fbm(l * " + k[2] + " + w * 1.3 + h * 90.0);\n" +
      "  float v = g + (f - 0.5) * " + k[3] + " + bias - heat * 0.45;\n" +
      "  float dp = length(p - ptr) / max(ptrR, 1.0);\n" +
      "  v -= ptrAmt * 0.6 * exp(-dp * dp);\n" +
      "  vec3 col = ramp(clamp(v, 0.0, 1.0)) + grain;\n" +
      "  col = mix(col, ramp(clamp(v + (g1 - 0.5) * 0.18, 0.0, 1.0)) + grain, 0.35);\n" +
      // bloom: an organic edge that grows from the middle and settles
      (bloom ? "  float e = reveal * 1.35, wob = (fbm(l * 2.2 + h * 30.0 + t * 0.15) - 0.5) * 0.55 * (1.0 - reveal * 0.6);\n" +
        "  float m = smoothstep(e, e - 0.18, r + wob) * smoothstep(0.0, 0.06, reveal);\n" : "") +
      "  outColor = vec4(clamp(col, 0.0, 1.0), smoothstep(1.0 + aa, 1.0 - aa, r)" + (bloom ? " * m" : "") + ");\n" +
      "}";
    function sh(type, code) { var o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); return o; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['res', 'center', 'R', 'seed', 'bias', 'heat', 'grainScale', 't', 'ptr', 'ptrR', 'ptrAmt', 'stops', 'edges', 'reveal'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    function oklab(hex) {
      var c = [0, 2, 4].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      var l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
      var m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
      var s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
      return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
    }
    gl.uniform3fv(U.stops, new Float32Array([].concat.apply([], ['E4441C', 'E4566A', '4B7888', 'DACCAE'].map(oklab))));
    gl.uniform2fv(U.edges, new Float32Array([0.12, 0.28, 0.26, 0.46, 0.5, 0.84]));
    gl.uniform1f(U.heat, 0);
    // draw one ball onto cv, w x h css pixels at dpr. o, in css pixels: cx, cy, R; t, seed, bias; px, py, pr, amt for the warm
    // spot under the mouse; reveal for the bloom
    return function (cv, w, h, dpr, o) {
      var W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      if (gl.canvas.width !== W || gl.canvas.height !== H) { gl.canvas.width = W; gl.canvas.height = H; }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(U.res, W, H); gl.uniform2f(U.center, o.cx * dpr, o.cy * dpr); gl.uniform1f(U.R, o.R * dpr);
      gl.uniform1f(U.seed, o.seed); gl.uniform1f(U.bias, o.bias); gl.uniform1f(U.grainScale, dpr * 0.75); gl.uniform1f(U.t, o.t);
      gl.uniform2f(U.ptr, o.px * dpr, o.py * dpr); gl.uniform1f(U.ptrR, o.pr * dpr); gl.uniform1f(U.ptrAmt, o.amt);
      if (bloom) gl.uniform1f(U.reveal, o.reveal);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      var c2 = cv.getContext('2d');
      c2.clearRect(0, 0, W, H); c2.drawImage(gl.canvas, 0, 0);
    };
  }

  // City pages, Zo werken we: one living ball per plain beige card, running off the edge, calm at step 1 and alive at 3.
  // Shader and motion come from the calculator (prototype/calculator/ball.js, the brand's ball with a see-through
  // outside): the colours flow and turn inside it and it floats and breathes on its own; the pointer only warms the
  // spot under it. One shared WebGL2 context, copied to a 2D canvas per card; runs only while the cards are on screen.
  function rdLocBalls() {
    var cards = qsa('.loc_steps .loc_step');
    if (!cards.length) return;
    var ballGL = rdBallGL('loc'); // THE BRAND BALL, above
    if (!ballGL) return;

    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // One size. The steps go from calm to alive: bias walks the ball along the fade (high = beige and steel, low = red),
    // flow is how fast the colours move. Meet is beige and blue, Design more blue with a little pink and orange, Build red
    var SPEC = [{ seed: 14, bias: 0.5, flow: 0.6 }, { seed: 23, bias: -0.04, flow: 1 }, { seed: 37, bias: -0.44, flow: 1.5 }];
    var time = 0, last = 0, lastDraw = 0, onScreen = false, running = false;
    function draw(b) {
      var box = { width: b.card.offsetWidth, height: b.card.offsetHeight }; // its own size: on the page transition's cube the size on screen changes every frame
      if (!box.width || !box.height) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var f = time * b.s.flow + b.off; // it floats and breathes on its own
      var fx = calm ? 0 : Math.sin(f * 0.31) * 16 + Math.sin(f * 0.13) * 10, fy = calm ? 0 : Math.cos(f * 0.23) * 14;
      var R = 0.36 * box.height * (calm ? 1 : 1 + Math.sin(f * 0.37) * 0.022);
      ballGL(b.cv, box.width, box.height, dpr, { cx: box.width - R * 0.2 + fx, cy: 0.26 * box.height + fy, R: R, seed: b.s.seed, bias: b.s.bias, t: f,
        px: b.x, py: b.y, pr: Math.min(Math.max(R * 0.4, 80), 200), amt: b.amt });
    }
    var balls = cards.slice(0, SPEC.length).map(function (card, i) {
      var cv = document.createElement('canvas');
      cv.className = 'loc_step-ball'; cv.setAttribute('aria-hidden', 'true');
      card.insertBefore(cv, card.firstChild);
      var b = { card: card, cv: cv, s: SPEC[i], off: i * 7, x: 0, y: 0, tx: 0, ty: 0, amt: 0, target: 0 };
      if (!calm) {
        card.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var r = card.getBoundingClientRect(); b.tx = e.clientX - r.left; b.ty = e.clientY - r.top;
          if (!b.target) { b.x = b.tx; b.y = b.ty; }
          b.target = 1;
        });
        card.addEventListener('pointerleave', function () { b.target = 0; });
      }
      return b;
    });
    function frame(now) {
      if (!onScreen || document.hidden) { running = false; return; }
      requestAnimationFrame(frame);
      var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
      time += dt;
      balls.forEach(function (b) { b.x += (b.tx - b.x) * 0.12; b.y += (b.ty - b.y) * 0.12; b.amt += (b.target - b.amt) * 0.06; });
      if (now - lastDraw < 33) return; // 30 frames a second is plenty for slow colours
      lastDraw = now;
      balls.forEach(draw);
    }
    function go() { if (running || calm) return; running = true; last = 0; requestAnimationFrame(frame); }
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      balls.forEach(draw);
      if (onScreen) go();
    }, { rootMargin: '20% 0px' }).observe(qs('.loc_steps'));
    rdOn(document, 'visibilitychange', function () { if (onScreen && !document.hidden) go(); });
    var rt = null;
    rdOn(window, 'resize', function () { clearTimeout(rt); rt = setTimeout(function () { balls.forEach(draw); }, 150); });
  }

  function rdLocShow() {
    var sec = qs('.loc_show'), slider = sec && qs('[data-spatial-slider-init]', sec);
    if (!slider) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function watchClips() {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting && !reduced && (awake || v === lead)) {
            var src = clipUrl(v); clipGuard(v); // a clip only downloads once its card is on screen; CLIPS picks its file
            if (src && v.getAttribute('src') !== src) v.setAttribute('src', src);
            v.playbackRate = parseFloat(v.getAttribute('data-rate')) || 1;
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else v.pause();
        });
      }, { rootMargin: '10% 0px' }); // a clip plays as soon as any of its card shows, the peek in the first screen too (Rimbo), and pauses once it's gone
      qsa('video', sec).forEach(function (v) { v.muted = true; v.loop = true; v.setAttribute('playsinline', ''); io.observe(v); });
      return io;
    }

    // The drum stands still with its first card in the middle until it is really in view; only then the clock runs,
    // so the first step comes a full 5 s after the visitor arrives. Leaving stops the clock
    var started = false, onScreen = false, clips = null, next = null, clock = null, lead = null, awake = false;
    function step() {
      if (!document.hidden && slider.getAttribute('data-spatial-slider-drag-status') !== 'grabbing') next.click();
    }
    function setClock() {
      if (onScreen && started && !reduced && !clock) clock = setInterval(step, 5000);
      else if (!onScreen && clock) { clearInterval(clock); clock = null; }
    }
    function start() {
      lead = qs('video', sec);
      if (started || !window.Draggable || !window.InertiaPlugin || !window.CustomEase) return;
      started = true;
      var wake = function () { if (awake) return; awake = true; if (clips) { clips.disconnect(); clips = watchClips(); } };
      rdOn(window, 'scroll', wake, { passive: true, once: true });
      rdOn(sec, 'pointerdown', wake, { once: true });
      qsa('video[data-poster]', sec).forEach(function (v) { v.setAttribute('poster', v.getAttribute('data-poster')); });
      next = document.createElement('button'); // Osmo wires every control it finds, so a timer can press Next like a visitor
      next.type = 'button'; next.tabIndex = -1;
      next.setAttribute('data-spatial-slider-control', 'next'); next.setAttribute('aria-hidden', 'true');
      next.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;border:0;opacity:0;overflow:hidden;pointer-events:none';
      slider.appendChild(next);
      initSpatialCardsSlider();
      var seen = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { seen.disconnect(); reveal(); } }, { threshold: 0.1 });
      seen.observe(sec);
      var watch = function () { clips = watchClips(); }; // after the page has loaded, so the clips don't compete with the hero photo
      if (document.readyState === 'complete') watch(); else rdOn(window, 'load', watch, { once: true });
      var rt = null; // Osmo re-clones the cards after a width change: watch the new clips too
      rdOn(window, 'resize', function () {
        clearTimeout(rt);
        rt = setTimeout(function () { if (clips) clips.disconnect(); clips = watchClips(); }, 450);
      });
      setClock();
    }
    // The entrance (Rimbo, 2026-11-09: "the recent work can load in like it loads in on the homepage, and then the text drops
    // in with recent work"): the hero card comes in by CSS, then the label drops in and each card grows from one pixel at its
    // centre, the middle one first, as on home-v4. The template head hides both until .is-in (and shows them by itself after
    // 4 s should this never run). It plays once the section is really on screen, and never before the hero card has landed.
    var shown = false, bornAt = performance.now();
    function reveal() {
      if (shown) return; shown = true;
      var label = qs('.loc_show-t', sec);
      if (reduced || !window.gsap) { sec.classList.add('is-in'); return; }
      var cx = window.innerWidth / 2;
      var panels = qsa('.band_panel', sec).map(function (p) { var r = p.getBoundingClientRect(); return { el: p, d: Math.abs(r.left + r.width / 2 - cx) }; })
        .sort(function (a, b) { return a.d - b.d; }).map(function (x) { return x.el; }); // nearest the middle first
      gsap.set(panels, { scale: 0.002, transformOrigin: '50% 50%' });
      if (label) gsap.set(label, { opacity: 0, y: -28 });
      sec.classList.add('is-in');
      var delay = Math.max(0.35, 0.9 - (performance.now() - bornAt) / 1000);
      if (label) gsap.to(label, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: delay, clearProps: 'opacity,transform' });
      gsap.to(panels, { scale: 1, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: delay + 0.1, clearProps: 'transform' });
    }
    new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) start(); }, { rootMargin: '60% 0px' }).observe(sec);
    new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; setClock(); }, { threshold: 0.6 }).observe(sec);

    sec.addEventListener('mouseover', function (e) { var p = e.target.closest && e.target.closest('.band_panel'); if (p) { var l = qs('.band_panel-label', p); if (l) l.classList.add('is-on'); } });
    sec.addEventListener('mouseout', function (e) { var p = e.target.closest && e.target.closest('.band_panel'); if (p && !p.contains(e.relatedTarget)) { var l = qs('.band_panel-label', p); if (l) l.classList.remove('is-on'); } });
  }

  // =========================================================
  // FOOTER — the Blueprint footer from the footer lab (prototype/footer, version D, Rimbo's pick on 5 Nov):
  // as it scrolls in, every cell types its own HTML in orange, then its content types (big text) or
  // scrambles (small text) in, the F Brush logo draws itself, and the dashed guide lines stay behind.
  // Hover (mouse only): the HTML types back in, an orange outline draws, the page links swap to a
  // second line. One number p drives it all: 0 when the footer's top meets the bottom of the screen,
  // 1 when it fills the screen; scrolling back plays it in reverse. Page by page until Rimbo's go.
  // =========================================================
  var FOOTER_SCRIPT = (document.currentScript && document.currentScript.src) || '';
  // F Brush, Rimbo's refined logo (5 Nov): served from Bunny; on localhost it comes from /media/
  // the Webflow footer still points at the old logo file
  function rdLogoSwap() {
    var logoSrc = brushLogoSrc();
    qsa('img[src*="SVGLOGO2"]').forEach(function (img) { img.removeAttribute('srcset'); img.src = logoSrc; });
  }

  function brushLogoSrc() { // on Bunny with the clips (media no longer ships in the repo); /media/ on localhost
    return /^https?:\/\/(localhost|127\.0\.0\.1)/.test(FOOTER_SCRIPT) ? '/media/logo-f-brush.svg' : 'https://rimbo-designs-clips.b-cdn.net/logo-f-brush.svg';
  }
  function rdFooter() {
    // the footer is the component Footer_rdf in the Designer (rdf-* classes: all of its look and text); this only animates it
    var foot = qs('.rdf');
    if (!foot || foot.hasAttribute('data-rdf-on')) return;
    var nl = /^\/nl(\/|$)/.test(location.pathname), prefix = nl ? '/nl' : '';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var logoSrc = brushLogoSrc();
    // one ground: the site's black (the beige experiment is gone, Rimbo 15 Nov: every footer ends black)
    var ACCENT = [228, 68, 28], LOGO_FILL = [248, 245, 238];
    var clamp = function (x) { return Math.max(0, Math.min(1, x)); };
    var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    var cut = function (k) { return ((1 - k) * 100).toFixed(2) + '%'; };
    var rgba = function (c, a) { return 'rgba(' + c.join(',') + ',' + clamp(a).toFixed(3) + ')'; };

    // its CSS lives in Webflow too: the rdf-* classes (look at rest, colours as variables, transitions) and the embed
    // "Footer CSS" inside Footer_rdf (the states this switches on: is-drawn, is-on, is-under, rdf-prev/rdf-notch, and the
    // parts drawn here: grid lines, ruler, build outline, typed code, caret). Was a style block in this file until v1.7.183.

    // the language links: the old menu's Webflow locale links know the right URL for this page
    function localeHref(lang) {
      var a = qs('a[hreflang="' + lang + '"]:not(.rdf-lang-link)');
      if (a) return a.getAttribute('href');
      var bare = location.pathname.replace(/^\/nl(?=\/|$)/, '') || '/';
      return lang === 'nl' ? '/nl' + (bare === '/' ? '' : bare) : bare;
    }
    foot.setAttribute('data-rdf-on', '');
    // what depends on the page you're on: the language, the year
    if (nl) qsa('.rdf-cell[href^="/"]', foot).forEach(function (a) { var h = a.getAttribute('href'); a.setAttribute('href', prefix + (h === '/' ? '' : h)); });
    qsa('.rdf-lang-link', foot).forEach(function (a) {
      var lang = a.getAttribute('hreflang');
      a.setAttribute('href', localeHref(lang));
      a.classList.toggle('is-on', (lang === 'nl') === nl);
    });
    var year = qs('[data-rdf-year]', foot);
    if (year) year.textContent = year.textContent.replace(/\d{4}/, new Date().getFullYear());
    // the last section with its own background lifts off the footer
    // (skipping what isn't page: scripts and the fixed menu, which sit right before the footer on city pages)
    var top = foot.previousElementSibling;
    while (top && (/^(SCRIPT|STYLE|LINK)$/.test(top.tagName) || getComputedStyle(top).position === 'fixed' || getComputedStyle(top).display === 'none')) top = top.previousElementSibling;
    var prev = top;
    while (prev && prev.lastElementChild && getComputedStyle(prev).backgroundColor === 'rgba(0, 0, 0, 0)') prev = prev.lastElementChild;
    if (prev && prev.offsetWidth < foot.offsetWidth * .9) prev = top; // a small element at the end of the page (a language pill) is not a section
    if (prev) {
      prev.classList.add('rdf-prev');
      if (getComputedStyle(prev).clipPath === 'none') prev.classList.add('rdf-notch');
    }
    if (prev && getComputedStyle(prev).clipPath !== 'none') foot.classList.add('is-under'); // see .rdf.is-under
    // the same grain as the page: where it sits behind the page (city pages) the footer would cover it and look flat next to it
    var pageGrain = qs('.grain');
    if (pageGrain && !pageGrain.closest('.rdf-prev') && parseInt(getComputedStyle(pageGrain).zIndex, 10) < 0) {
      var ftGrain = pageGrain.cloneNode(false);
      ftGrain.classList.add('rdf-grain');
      foot.appendChild(ftGrain);
    }
    var inner = qs('.rdf-in', foot), shade = qs('.rdf-shade', foot), drop = qs('.rdf-drop', foot);

    // the clock in Based in
    var clock = qs('[data-rdf-clock]', foot);
    function tickClock() { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }); }
    tickClock(); setInterval(tickClock, 15000);

    // the logo goes home, or back to the top on a home page
    var logoCell = qs('.rdf-logo', foot);
    var bare = location.pathname.replace(/\/+$/, '').replace(/^\/nl(?=\/|$)/, '') || '/';
    if (bare === '/' || /^\/home-(copy|v\d+)$/.test(bare)) logoCell.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(0, { duration: 1.8 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ---- Osmo's Text Scramble for the ruler's width label; the plugin comes from Webflow's GSAP CDN when it isn't there ----
    var scrambleOK = false;
    function scrambleReady() {
      if (!window.gsap || !window.ScrambleTextPlugin || reduce) return;
      gsap.registerPlugin(ScrambleTextPlugin); scrambleOK = true;
    }
    scrambleReady();
    if (!scrambleOK && window.gsap && !reduce) {
      var sc = document.createElement('script');
      sc.src = 'https://cdn.prod.website-files.com/gsap/3.15.0/ScrambleTextPlugin.min.js';
      sc.onload = scrambleReady;
      document.head.appendChild(sc);
    }
    // ---- the small text comes in like a film title: one slow move and a beat between the lines (Rimbo, 5 Nov: fading,
    // typing and scrambling at once felt busy and quick). Every letter stands in its place from the start, a dim loose
    // glyph that fades up and settles into the real letter in its own time; scrolling back it fades out.
    // ?ftext=focus adds a soft focus pull, ?ftext=fade is a plain fade without the glyphs ----
    var textMode = (/[?&]ftext=(fade|focus)/.exec(location.search) || [])[1] || '';
    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', TITLE_FADE = 1.7, TITLE_SETTLE = 2.2, TITLE_BEAT = 0.2;
    var writeState = new Map(), nextTitle = 0;
    function glyph() { return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }
    function splitChars(s, kid) {
      if (s.units) return;
      s.root = kid.classList.contains('rdf-swap') ? kid.firstElementChild : kid; // the swap's second line stays out of sight anyway
      s.units = [];
      var walk = document.createTreeWalker(s.root, NodeFilter.SHOW_TEXT), nodes = [], n;
      while ((n = walk.nextNode())) if (n.nodeValue.trim() && !n.parentNode.hasAttribute('data-rdf-clock')) nodes.push(n); // the clock rewrites itself
      nodes.forEach(function (node) {
        var frag = document.createDocumentFragment();
        Array.from(node.nodeValue).forEach(function (ch) {
          if (!/[a-z0-9]/i.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
          var el = document.createElement('span'); el.className = 'rdf-ch'; el.textContent = glyph(); el.style.opacity = 0.45;
          frag.appendChild(el); s.units.push({ el: el, ch: ch });
        });
        node.parentNode.replaceChild(frag, node);
      });
      s.units.forEach(function (u, i) { u.at = 0.2 + Math.random() * 0.55 + 0.2 * i / s.units.length; }); // a loose order, drifting left to right
    }
    function joinChars(s) {
      if (!s.units) return;
      s.units.forEach(function (u) { u.el.replaceWith(u.ch); });
      s.root.normalize(); s.units = null;
    }
    function paintChars(s) {
      var now = performance.now(), roll = now - (s.rolled || 0) > 130;
      if (roll) s.rolled = now;
      s.units.forEach(function (u) {
        if (u.done) return;
        if (s.k >= u.at) { u.done = true; u.el.textContent = u.ch; u.el.style.opacity = ''; }
        else if (roll && Math.random() < 0.4) u.el.textContent = glyph();
      });
    }
    function writeSet(kid, on) {
      var s = writeState.get(kid) || { on: null, k: 0 };
      if (s.on === on) return;
      var first = s.on === null;
      s.on = on; writeState.set(kid, s);
      kid.style.clipPath = 'none';
      if (s.fade) s.fade.kill();
      if (s.write) s.write.kill();
      if (first || !window.gsap) { s.k = on ? 1 : 0; kid.style.opacity = s.k; return; }
      if (!on) {
        s.fade = gsap.to(kid, { opacity: 0, duration: 0.7, ease: 'sine.inOut', onComplete: function () { s.k = 0; joinChars(s); } });
        return;
      }
      var t = performance.now() / 1000, delay = Math.max(0, nextTitle - t); // however fast the scroll, the lines come one after the other
      nextTitle = t + delay + TITLE_BEAT;
      s.fade = gsap.to(kid, { opacity: 1, duration: TITLE_FADE, delay: delay, ease: 'sine.inOut' });
      if (textMode === 'focus') gsap.fromTo(kid, { filter: 'blur(3px)' }, { filter: 'blur(0px)', duration: TITLE_FADE, delay: delay, ease: 'sine.out', clearProps: 'filter' });
      if (textMode === 'fade' || s.k >= 1) { s.k = 1; return; }
      splitChars(s, kid);
      s.write = gsap.to(s, {
        k: 1, duration: TITLE_SETTLE, delay: delay, ease: 'none',
        onUpdate: function () { paintChars(s); }, onComplete: function () { joinChars(s); }
      });
    }

    // ---- the typed HTML, with a tiny highlighter ----
    function classify(src) {
      var out = [], inTag = false, inName = false, inStr = false, q = '';
      Array.from(src).forEach(function (ch) {
        var c = '';
        if (inStr) { c = 's'; if (ch === q) inStr = false; }
        else if (ch === '<') { inTag = true; inName = true; c = 't'; }
        else if (inTag && (ch === '"' || ch === "'")) { inStr = true; q = ch; c = 's'; }
        else if (inTag && ch === '>') { inTag = false; inName = false; c = 't'; }
        else if (inTag && ch === ' ') { inName = false; }
        else if (inTag && (inName || ch === '=' || ch === '/')) { c = 't'; }
        else if (inTag) { c = 'k'; }
        out.push({ ch: ch, c: c });
      });
      return out;
    }
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function renderCode(el, chars, n, cursor) {
      var h = '', run = '', cls = null;
      for (var i = 0; i < n; i++) {
        var c = chars[i];
        if (c.c !== cls) { if (run) h += cls ? '<span class="' + cls + '">' + esc(run) + '</span>' : esc(run); run = ''; cls = c.c; }
        run += c.ch;
      }
      if (run) h += cls ? '<span class="' + cls + '">' + esc(run) + '</span>' : esc(run);
      if (cursor) h += '<span class="cur"></span>';
      if (el.__h !== h) { el.innerHTML = h; el.__h = h; }
    }

    // ---- the logo, drawn like a drawing: each letter outlined, then filled (the guides and the size label around it are gone: Rimbo, 5 Nov) ----
    var logo = (function () {
      var cv = qs('canvas', logoCell), ctx = cv.getContext('2d'); // Designer: rdf-logo-art holds the canvas
      var VB = { w: 72, h: 25.1 }, M = 30, T = { outline: 0.44, fill: 0.6 };
      var letters = [], dpr = 1, S = 1, W = 0, H = 0, ready = false, pNow = 0;
      fetch(logoSrc).then(function (r) { return r.text(); }).then(function (txt) {
        var doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
        var NS = 'http://www.w3.org/2000/svg';
        var probe = document.createElementNS(NS, 'svg');
        probe.setAttribute('viewBox', '0 0 72 26');
        probe.style.cssText = 'position:absolute;width:72px;height:26px;visibility:hidden;left:-999px;top:0';
        document.body.appendChild(probe);
        qsa('path', doc).forEach(function (src) {
          var d = src.getAttribute('d');
          var el = document.createElementNS(NS, 'path'); el.setAttribute('d', d); probe.appendChild(el);
          var b = el.getBBox();
          if (b.width * b.height < 0.01) return;
          letters.push({ path: new Path2D(d), len: el.getTotalLength(), x: b.x, y: b.y, w: b.width, h: b.height });
        });
        probe.remove();
        letters.sort(function (a, b) { return (a.y > 12) - (b.y > 12) || a.x - b.x; }); // RIMBO first, left to right
        ready = true; layout();
      }).catch(function (err) { console.error('[rimbo-designs] footer logo:', err); });

      function layout() {
        var cs = getComputedStyle(logoCell);
        var cw = logoCell.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var ch = logoCell.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - M * 1.6;
        S = Math.max(1, Math.min(cw / VB.w, (window.innerWidth > 767 ? ch : 9e9) / VB.h, 820 / VB.w)); // 820 px at most: on a big screen it got far too large
        if (window.innerWidth > 767) S *= 0.65; // it doesn't have to fill its cell (Rimbo: 30 to 40% smaller)
        W = Math.round(VB.w * S) + M * 2; H = Math.round(VB.h * S) + M * 2;
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
        paint(pNow);
      }
      function paint(p) {
        pNow = p;
        if (!ready || !W) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
        var settle = smooth(0.74, 0.88, p);
        letters.forEach(function (L, i) {
          var ko = smooth(T.outline + i * 0.022, T.outline + 0.26 + i * 0.022, p);
          var kf = smooth(T.fill + i * 0.016, T.fill + 0.16 + i * 0.016, p);
          ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * M, dpr * M);
          if (kf > 0) { ctx.fillStyle = rgba(LOGO_FILL, kf); ctx.fill(L.path); }
          if (ko > 0 && settle < 1) {
            ctx.lineWidth = 1 / S; ctx.strokeStyle = rgba(ACCENT, 1 - settle);
            ctx.setLineDash([L.len * ko, L.len]); ctx.stroke(L.path); ctx.setLineDash([]);
          }
        });
      }
      return { paint: paint, layout: layout };
    })();

    // ---- the boxes: an orange outline, the HTML it types, a caret ----
    var NS = 'http://www.w3.org/2000/svg';
    // data-code may be written without the brackets and quotes (a class=ft_link href=/apply): easier in the Designer, and
    // Webflow's API won't save < > or " in an attribute. They are put back here
    function tagOf(v) {
      v = (v || '').trim();
      if (v.charAt(0) === '<') return v;
      return '<' + v.replace(/([\w-]+)=([^\s"]+)/g, '$1="$2"') + '>';
    }
    var boxes = qsa('[data-code]', foot).map(function (box) {
      var kids = Array.prototype.slice.call(box.children).filter(function (el) { return !el.hasAttribute('data-own'); });
      kids.forEach(function (k) { k.classList.add('rdf-rev'); });
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'rdf-frame'); svg.setAttribute('aria-hidden', 'true');
      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', '0'); rect.setAttribute('y', '0'); rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%');
      rect.setAttribute('pathLength', '1'); rect.style.strokeDasharray = '1 1';
      svg.appendChild(rect); box.appendChild(svg);
      var add = function (cls) { var e = document.createElement('span'); e.className = cls; e.setAttribute('aria-hidden', 'true'); box.appendChild(e); return e; };
      return { el: box, kids: kids, rect: rect, code: add('rdf-code'), chars: classify(tagOf(box.getAttribute('data-code'))), caret: add('rdf-caret'), at: [] };
    });

    // ---- the dashed guide lines on every cell edge, cut where they would run through a cell ----
    var guideWrap = document.createElement('div'); guideWrap.className = 'rdf-lines'; guideWrap.setAttribute('aria-hidden', 'true');
    inner.insertBefore(guideWrap, inner.firstChild);
    var vs = [], hs = [], last = -1;
    var ruler = qs('.rdf-ruler', foot), rulerLabel = qs('[data-rdf-width]', foot), rulerOn = false, rulerTimer = 0;
    // where an element sits inside root, read from the page's layout and not from the screen: on the cube the footer gets its
    // first measure while the page is turned on its side, which put every guide line tens of thousands of pixels off the
    // screen, and nothing measured again (Rimbo: the outlines were gone)
    function boxIn(el, root) {
      var x = 0, y = 0, n = el;
      while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight, w: el.offsetWidth, h: el.offsetHeight };
    }
    // the ruler reads the grid: a long tick on every column, so every guide line stands on one at any screen width
    function drawRuler(xs) {
      var left = boxIn(ruler, inner).l, h = ruler.offsetHeight, col = (ruler.offsetWidth - 1) / 12, per = Math.max(2, Math.round(col / 10));
      var tick = function (x, len) { return 'M' + (x + 0.5) + ' ' + h + 'v-' + len; }, small = '', big = '';
      for (var c = 0; c <= 12; c++) {
        var at = Math.round(c * col), guide = xs.filter(function (x) { return Math.abs(x - left - at) < 3; })[0];
        big += tick(guide === undefined ? at : guide - left, 12);
        for (var m = 1; c < 12 && m < per; m++) small += tick(Math.round((c + m / per) * col), 6);
      }
      var paths = qsa('path', ruler);
      if (!paths.length) {
        var svg = document.createElementNS(NS, 'svg');
        paths = [document.createElementNS(NS, 'path'), document.createElementNS(NS, 'path')];
        svg.appendChild(paths[0]); svg.appendChild(paths[1]); ruler.insertBefore(svg, ruler.firstChild);
      }
      paths[0].setAttribute('d', small); paths[1].setAttribute('d', big);
    }
    // the boxes the grid lines run along. On a phone the Designer lays rdf-base-l out as a little grid of its own (display: grid
    // at the phone breakpoint: the e-mail row, the two rdf-egg links as cells like the socials, the © line; Rimbo, 2026-11-19):
    // then each of its full-width rows is a box and the two links are cells, instead of rdf-base-l as one box
    function lineBoxes() {
      var els = qsa('.rdf-cell, .rdf-soc', foot), bl = qs('.rdf-base-l', foot);
      if (!bl) return els;
      if (getComputedStyle(bl).display !== 'grid') { els.push(bl); return els; }
      var full = bl.getBoundingClientRect().width * 0.9;
      Array.prototype.forEach.call(bl.children, function (k) {
        if (k.classList.contains('rdf-egg')) qsa('a', k).forEach(function (a) { if (a.getBoundingClientRect().width > 2) els.push(a); });
        else if (k.getBoundingClientRect().width >= full) els.push(k); // the language switch sits inside the e-mail row: not a box
      });
      return els;
    }
    function layout() {
      var xs = [], ys = [];
      var addU = function (arr, val) { val = Math.round(val); if (!arr.some(function (a) { return Math.abs(a - val) < 3; })) arr.push(val); };
      var lined = lineBoxes();
      qsa('.rdf-base', foot).concat(lined).forEach(function (el) {
        var r = boxIn(el, inner);
        addU(xs, r.l); addU(xs, r.r - 1); addU(ys, r.t); addU(ys, r.b - 1);
      });
      guideWrap.textContent = ''; vs = []; hs = [];
      var W = inner.clientWidth, H = inner.clientHeight;
      var rects = lined.map(function (el) { return boxIn(el, inner); });
      var segs = function (from, to, blocks) {
        var out = [[from, to]];
        blocks.forEach(function (bl) {
          out = out.reduce(function (acc, sg) {
            if (bl[1] <= sg[0] || bl[0] >= sg[1]) acc.push(sg);
            else { if (bl[0] - sg[0] > 2) acc.push([sg[0], bl[0]]); if (sg[1] - bl[1] > 2) acc.push([bl[1], sg[1]]); }
            return acc;
          }, []);
        });
        return blocks.length ? out.filter(function (sg) { return sg[1] - sg[0] > 40; }) : out; // no little stubs where a line is cut (40: a one-row cell is 43 px high on a phone, its divider is a line, not a stub)
      };
      xs.sort(function (a, b) { return a - b; }).forEach(function (x) {
        segs(0, H, rects.filter(function (c) { return x > c.l + 2 && x < c.r - 3; }).map(function (c) { return [c.t, c.b]; })).forEach(function (sg) {
          var l = document.createElement('i'); l.className = 'rdf-v';
          l.style.left = x + 'px'; l.style.top = sg[0] + 'px'; l.style.height = (sg[1] - sg[0]) + 'px';
          guideWrap.appendChild(l); vs.push(l);
        });
      });
      ys.sort(function (a, b) { return a - b; }).forEach(function (y) {
        segs(0, W, rects.filter(function (c) { return y > c.t + 2 && y < c.b - 3; }).map(function (c) { return [c.l, c.r]; })).forEach(function (sg) {
          var l = document.createElement('i'); l.className = 'rdf-h';
          l.style.top = y + 'px'; l.style.left = sg[0] + 'px'; l.style.width = (sg[1] - sg[0]) + 'px';
          guideWrap.appendChild(l); hs.push(l);
        });
      });
      boxes.forEach(function (b) {
        b.at = b.kids.map(function (k) { var r = boxIn(k, b.el); return { x: r.l, y: r.t, w: r.w, h: r.h }; });
      });
      drawRuler(xs);
      last = -1;
    }
    var relayT = 0;
    function relayout() { cancelAnimationFrame(relayT); relayT = requestAnimationFrame(function () { logo.layout(); layout(); }); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    rdOn(window, 'resize', relayout);
    // and whenever a cell changes size (on phones the logo cell only gets its height once the logo has loaded)
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { layout(); }); // straight away: the lines must match the cells before the next frame
      qsa('.rdf-cell, .rdf-base', foot).forEach(function (el) { ro.observe(el); });
    }
    layout();

    // ---- the ruler: the screen width scrambles in (digits only) once it has drawn, and again on a resize ----
    function sizeLabel(animate) {
      var t = window.innerWidth + ' PX';
      if (animate && scrambleOK) gsap.to(rulerLabel, { duration: 0.9, overwrite: true, scrambleText: { text: t, chars: '0123456789', speed: 0.6 } });
      else rulerLabel.textContent = t;
    }
    rulerLabel.style.opacity = 0;
    rdOn(window, 'resize', function () { if (!rulerOn) return; clearTimeout(rulerTimer); rulerTimer = setTimeout(function () { sizeLabel(true); }, 120); });

    // ---- hover (mouse only): the HTML types back in (not on the email and Based in, they swap) + an orange outline ----
    // one hover state for the whole cell. Each cell takes it as soon as it is built, not when the whole footer has landed
    // (Rimbo: someone who scrolls 60% in would never see a hover). It goes again a little below that point, so a small scroll
    // back and forth can't flicker it. A pointer already resting on a cell gets it the moment the cell is done.
    // The HTML is typed by the build only, not on hover
    var over = null;
    if (canHover) {
      qsa('.rdf-cell', foot).forEach(function (cell) {
        var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'rdf-draw'); svg.setAttribute('aria-hidden', 'true');
        var p1 = document.createElementNS(NS, 'path'), p2 = document.createElementNS(NS, 'path');
        [p1, p2].forEach(function (pth) { pth.setAttribute('pathLength', '1'); svg.appendChild(pth); });
        cell.appendChild(svg);
        cell.rdfOn = function () {
          var w = cell.offsetWidth, h = cell.offsetHeight;
          svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
          p1.setAttribute('d', 'M.5 .5H' + (w - 0.5) + 'V' + (h - 0.5));
          p2.setAttribute('d', 'M.5 .5V' + (h - 0.5) + 'H' + (w - 0.5));
          cell.classList.add('is-drawn');
        };
        cell.rdfOff = function () { cell.classList.remove('is-drawn'); };
        cell.addEventListener('mouseenter', function () { over = cell; if (cell.rdfReady) cell.rdfOn(); });
        cell.addEventListener('mouseleave', function () { over = null; cell.rdfOff(); });
      });
    }

    var isBig = function (k) { return k.classList.contains('rdf-pt') || k.classList.contains('rdf-arrow'); };
    var reveal = function (el, k) { el.style.clipPath = k >= 1 ? 'none' : 'inset(-20% ' + cut(k) + ' -20% 0)'; };
    function draw(p) {
      logo.paint(p);
      vs.forEach(function (l, i) { l.style.clipPath = 'inset(0 0 ' + cut(smooth(0.02 + i * 0.03, 0.36 + i * 0.03, p)) + ' 0)'; });
      hs.forEach(function (l, i) { l.style.clipPath = 'inset(0 ' + cut(smooth(0.04 + i * 0.025, 0.38 + i * 0.025, p)) + ' 0 0)'; });
      ruler.style.clipPath = 'inset(-5rem ' + cut(smooth(0.04, 0.3, p)) + ' 0 0)'; // -5rem: room for the width label above the ticks
      if (p > 0.2 && !rulerOn) { rulerOn = true; rulerLabel.style.opacity = 1; sizeLabel(true); }
      else if (p < 0.05 && rulerOn) { rulerOn = false; rulerLabel.style.opacity = 0; if (window.gsap) gsap.killTweensOf(rulerLabel); rulerLabel.textContent = ''; }
      var settle = smooth(0.74, 0.88, p);
      boxes.forEach(function (b, i) {
        var o = i * 0.035;
        b.rect.style.strokeDashoffset = (1 - smooth(0.08 + o, 0.32 + o, p)).toFixed(4);
        b.rect.style.stroke = rgba(ACCENT, (1 - settle) * 0.8);
        var kc = smooth(0.12 + o, 0.36 + o, p), kf = smooth(0.44 + o, 0.54 + o, p);
        renderCode(b.code, b.chars, Math.round(b.chars.length * kc), kc > 0 && kf < 1);
        b.code.style.opacity = (1 - kf).toFixed(3);
        b.code.style.transform = 'translate3d(0,' + (-kf * 8).toFixed(1) + 'px,0)';
        var typed = null;
        b.kids.forEach(function (k, j) {
          var t0 = 0.5 + o + j * 0.03;
          if (isBig(k)) {
            var kr = smooth(t0, t0 + 0.14, p);
            reveal(k, kr);
            if (kr > 0 && kr < 1 && !typed) typed = { a: b.at[j], k: kr };
          } else { // the small text starts as the typed HTML has gone, so the cell never sits empty; it leaves a little lower, so a resting scroll can't flicker it
            var w = writeState.get(k);
            writeSet(k, p > t0 + (w && w.on ? -0.02 : 0.04));
          }
        });
        if (typed && typed.a) {
          b.caret.style.opacity = 1;
          b.caret.style.left = (typed.a.x + typed.a.w * typed.k) + 'px';
          b.caret.style.top = typed.a.y + 'px'; b.caret.style.height = typed.a.h + 'px';
        } else b.caret.style.opacity = 0;
        // built: its last line has written in (the logo cell has none of its own: once the letters are filled in)
        var ready = b.kids.length ? 0.5 + o + (b.kids.length - 1) * 0.03 + 0.14 : 0.8;
        var isReady = p > (b.el.rdfReady ? ready - 0.05 : ready);
        if (isReady !== !!b.el.rdfReady) {
          b.el.rdfReady = isReady;
          if (over === b.el) b.el[isReady ? 'rdfOn' : 'rdfOff']();
        }
      });
    }

    // ---- the engine: the footer rises at half the scroll speed, so the page seems to slide off it ----
    function curtain(p) {
      inner.style.transform = 'translate3d(0,' + (-(1 - p) * foot.offsetHeight * 0.5).toFixed(1) + 'px,0)';
      shade.style.opacity = ((1 - p) * 0.8).toFixed(3);
      drop.style.opacity = (1 - smooth(0.6, 1, p)).toFixed(3); // the page's shade goes with the page
    }
    if (reduce) { curtain(1); draw(1); return; }
    curtain(0); draw(0);
    // the loop only runs while the footer is (nearly) on screen, so the rest of the page pays nothing for it
    // and it stops once the footer has stood still for a few frames; a scroll starts it again (at rest it measured the
    // footer every frame, which cost a layout pass per frame)
    var on = false, raf = 0, still = 0;
    function tick() {
      var r = foot.getBoundingClientRect();
      var p = clamp((window.innerHeight - r.top) / r.height);
      if (Math.abs(p - last) > 0.0005) { last = p; curtain(p); draw(p); still = 0; } else still++;
      raf = on && still < 12 ? requestAnimationFrame(tick) : 0;
    }
    rdOn(window, 'scroll', function () { still = 0; if (on && !raf) raf = requestAnimationFrame(tick); }, { passive: true });
    new IntersectionObserver(function (es) {
      on = es[0].isIntersecting;
      if (on && !raf) { still = 0; raf = requestAnimationFrame(tick); }
      if (!on) { last = -1; tick(); } // one last frame, so it rests in its scrolled-away state
    }, { rootMargin: '0px 0px 10% 0px' }).observe(foot);
    rdOn(window, 'resize', function () { last = -1; still = 0; if (!raf) tick(); });
  }

  // Wall of love (testimonials; lab: prototype/testimonials). Osmo's Centered Looping Slider with three things on top: the brand
  // balls move by themselves (the calculator's shader), the colour and corners swoon from face to face, and each card's fade and
  // corners read where the card really is, every frame, so they can't run ahead of it (Rimbo: the timed version "crashed").
  // Everything you can see lives in the Designer: section.wall_section, the faces (.wall_faces, classes wall_face, wall_c), the
  // cards, each card's .wall_fx (.wall_ball sets the ball's size, wall_cc-c are the corners) and the arrows. Corner rule: outer
  // radius = the object's radius + the gap, so 4px photo + 4px gap = 8px corner. Knobs on the wrapper: data-wall-lift (how much the
  // active face grows) and data-wall-gap (px between face and corners). A slide or face with data-wall-open is a quote still to
  // come: it shows on webflow.io only, never on the live site. Pages whose copy has no faces or arrows yet get them built here, from
  // the slides, with the same classes. What stays in code is only what moves.
  function rdWall() {
    var wrapper = qs('[data-centered-slider="wrapper"]');
    if (!wrapper) return;
    if (!window.Draggable || !window.InertiaPlugin || !window.CustomEase || !window.ScrollTrigger) { console.warn('[rimbo-designs] wall of love: GSAP plugins missing'); return; }
    rdPlugins(CustomEase, ScrollTrigger, Draggable, InertiaPlugin);
    CustomEase.create('osmo-ease', '0.625, 0.05, 0, 1');
    CustomEase.create('wall-glide', '0.45, 0, 0.15, 1'); // Osmo's ease over .725 s moved half the distance in 85 ms

    if (location.hostname.indexOf('webflow.io') === -1) qsa('[data-wall-open]', wrapper).forEach(function (s) { s.parentNode.removeChild(s); });

    // the moving parts' CSS (colour circle, ball canvas, closing corners) lives in the site head code since 2026-11-19

    function el(cls, html) { var d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; return d; }
    // a copy of the wall without faces or arrows in the Designer: built from its slides, with the Designer's classes
    if (!qs('.wall_faces', wrapper)) {
      var faces = el('wall_faces'), facesIn = el('wall_faces-in'), ul = document.createElement('ul');
      ul.className = 'centered-slider-bullet__list'; ul.setAttribute('role', 'tablist');
      qsa('[data-centered-slider="slide"]', wrapper).forEach(function (slide) {
        var li = document.createElement('li'), btn = el('centered-slider-bullet'), photo = qs('img', slide), who = qs('.slide-demo__eyebrow', slide), name = who ? who.textContent.trim() : '';
        li.className = 'centered-slider-bullet__item';
        btn.setAttribute('role', 'tab'); btn.setAttribute('tabindex', '0'); btn.setAttribute('aria-label', name); btn.setAttribute('data-centered-slider', 'bullet');
        if (photo) {
          var img = document.createElement('img');
          img.className = 'wall_face'; img.src = photo.currentSrc || photo.src; img.alt = ''; img.draggable = false;
          btn.appendChild(img);
        } else btn.appendChild(el('wall_face-open', name.charAt(0)));
        li.appendChild(btn); ul.appendChild(li);
      });
      facesIn.appendChild(ul); faces.appendChild(facesIn);
      wrapper.insertBefore(faces, wrapper.firstChild);
    }
    if (!qs('.wall_arrows', wrapper)) {
      var arrow = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="slider-button-arrow"><path d="M14 19L21 12L14 5" stroke="currentColor" stroke-miterlimit="10"></path><path d="M21 12H2" stroke="currentColor" stroke-miterlimit="10"></path></svg>';
      wrapper.appendChild(el('wall_arrows', '<div class="centered-slider-buttons"><div role="button" tabindex="0" aria-label="previous slide" data-centered-slider="prev-button" class="centered-slider-button is--prev">' + arrow + '</div><div role="button" tabindex="0" aria-label="next slide" data-centered-slider="next-button" class="centered-slider-button">' + arrow + '</div></div>'));
    }
    qsa('.centered-slider-slide__inner', wrapper).forEach(function (card) {
      if (!qs('.wall_fx', card)) card.appendChild(el('wall_fx', '<div class="wall_ball"></div><div class="wall_cc"><div class="wall_cc-c is--tl"></div><div class="wall_cc-c is--tr"></div><div class="wall_cc-c is--bl"></div><div class="wall_cc-c is--br"></div></div>'));
    });
    // the bullets and arrows are plain blocks in the Designer: they answer the keyboard here
    qsa('[data-centered-slider="bullet"], [data-centered-slider="prev-button"], [data-centered-slider="next-button"]', wrapper).forEach(function (b) {
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
    });

    /* ---------- Osmo's slider, as it comes, but for the card ease ---------- */
    function initSliders() {
      const sliderWrappers = gsap.utils.toArray(document.querySelectorAll('[data-centered-slider="wrapper"]'));

      sliderWrappers.forEach((sliderWrapper) => {
        const slides = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="slide"]'));
        const bullets = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="bullet"]'));
        const prevButton = sliderWrapper.querySelector('[data-centered-slider="prev-button"]');
        const nextButton = sliderWrapper.querySelector('[data-centered-slider="next-button"]');

        let activeElement;
        let activeBullet;
        let currentIndex = 0;
        let autoplay;

        // Autoplay is now enabled/disabled via a boolean attribute.
        const autoplayEnabled = sliderWrapper.getAttribute('data-slider-autoplay') === 'true';

        // If enabled, get the autoplay duration (in seconds) from the separate attribute.
        const autoplayDuration = autoplayEnabled ? parseFloat(sliderWrapper.getAttribute('data-slider-autoplay-duration')) || 0 : 0;

        // Dynamically assign unique IDs to slides
        slides.forEach((slide, i) => {
          slide.setAttribute("id", `slide-${i}`);
        });

        // Set ARIA attributes on bullets if they exist
        if (bullets && bullets.length > 0) {
          bullets.forEach((bullet, i) => {
            bullet.setAttribute("aria-controls", `slide-${i}`);
            bullet.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
          });
        }

        const loop = horizontalLoop(slides, {
          paused: true,
          draggable: true,
          center: true,
          onChange: (element, index) => {
            currentIndex = index;

            if (activeElement) activeElement.classList.remove("active");
            element.classList.add("active");
            activeElement = element;

            if (bullets && bullets.length > 0) {
              if (activeBullet) activeBullet.classList.remove("active");
              if (bullets[index]) {
                bullets[index].classList.add("active");
                activeBullet = bullets[index];
              }
              bullets.forEach((bullet, i) => {
                bullet.setAttribute("aria-selected", i === index ? "true" : "false");
              });
            }

          }
        });

        // On initialization, center the slider
        loop.toIndex(2, { duration: 0.01 });

        function startAutoplay() {
          if (autoplayDuration > 0 && !autoplay) {
            const repeat = () => {
              loop.next({ ease: "wall-glide", duration: 1.1 });
              autoplay = gsap.delayedCall(autoplayDuration, repeat);
            };
            autoplay = gsap.delayedCall(autoplayDuration, repeat);
          }
        }

        function stopAutoplay() {
          if (autoplay) {
            autoplay.kill();
            autoplay = null;
          }
        }

        rdUndo(stopAutoplay); // the page leaves: the chain of delayed calls would keep turning a slider that is gone
        // Start/stop autoplay based on viewport visibility via ScrollTrigger
        ScrollTrigger.create({
          trigger: sliderWrapper,
          start: "top bottom",
          end: "bottom top",
          onEnter: startAutoplay,
          onLeave: stopAutoplay,
          onEnterBack: startAutoplay,
          onLeaveBack: stopAutoplay
        });

        // Pause autoplay on mouse hover over the slider
        sliderWrapper.addEventListener("mouseenter", stopAutoplay);
        sliderWrapper.addEventListener("mouseleave", () => {
          if (ScrollTrigger.isInViewport(sliderWrapper)) startAutoplay();
        });

        // Slide click event for direct navigation
        slides.forEach((slide, i) => {
          slide.addEventListener("click", () => {
            loop.toIndex(i, { ease: "wall-glide", duration: 1.1 });
          });
        });

        // Bullets click event for direct navigation (if available)
        if (bullets && bullets.length > 0) {
          bullets.forEach((bullet, i) => {
            bullet.addEventListener("click", () => {
              loop.toIndex(i, { ease: "wall-glide", duration: 1.1 });
              if (activeBullet) activeBullet.classList.remove("active");
              bullet.classList.add("active");
              activeBullet = bullet;
              bullets.forEach((b, j) => {
                b.setAttribute("aria-selected", j === i ? "true" : "false");
              });
            });
          });
        }

        // Prev/Next button listeners (if the buttons exist)
        if (prevButton) {
          prevButton.addEventListener("click", () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = slides.length - 1;
            loop.toIndex(newIndex, { ease: "wall-glide", duration: 1.1 });
          });
        }

        if (nextButton) {
          nextButton.addEventListener("click", () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= slides.length) newIndex = 0;
            loop.toIndex(newIndex, { ease: "wall-glide", duration: 1.1 });
          });
        }

      });
    }

    // GSAP Helper function to create a looping slider
    // Read more: https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop
    function horizontalLoop(items, config) {
      let timeline;
      items = gsap.utils.toArray(items);
      config = config || {};
      gsap.context(() => {
        let onChange = config.onChange,
          lastIndex = 0,
          tl = gsap.timeline({repeat: config.repeat, onUpdate: onChange && function() {
              let i = tl.closestIndex();
              if (lastIndex !== i) {
                lastIndex = i;
                onChange(items[i], i);
              }
            }, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
          length = items.length,
          startX = items[0].offsetLeft,
          times = [],
          widths = [],
          spaceBefore = [],
          xPercents = [],
          curIndex = 0,
          indexIsDirty = false,
          center = config.center,
          pixelsPerSecond = (config.speed || 1) * 100,
          snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
          timeOffset = 0,
          container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
          totalWidth,
          getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
          populateWidths = () => {
            let b1 = container.getBoundingClientRect(), b2;
            items.forEach((el, i) => {
              widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
              xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
              b2 = el.getBoundingClientRect();
              spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
              b1 = b2;
            });
            gsap.set(items, {
              xPercent: i => xPercents[i]
            });
            totalWidth = getTotalWidth();
          },
          timeWrap,
          populateOffsets = () => {
            timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
            center && times.forEach((t, i) => {
              times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
            });
          },
          getClosest = (values, value, wrap) => {
            let i = values.length,
              closest = 1e10,
              index = 0, d;
            while (i--) {
              d = Math.abs(values[i] - value);
              if (d > wrap / 2) {
                d = wrap - d;
              }
              if (d < closest) {
                closest = d;
                index = i;
              }
            }
            return index;
          },
          populateTimeline = () => {
            let i, item, curX, distanceToStart, distanceToLoop;
            tl.clear();
            for (i = 0; i < length; i++) {
              item = items[i];
              curX = xPercents[i] / 100 * widths[i];
              distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
              distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
              tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
                .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
                .add("label" + i, distanceToStart / pixelsPerSecond);
              times[i] = distanceToStart / pixelsPerSecond;
            }
            timeWrap = gsap.utils.wrap(0, tl.duration());
          },
          refresh = (deep) => {
            let progress = tl.progress();
            tl.progress(0, true);
            populateWidths();
            deep && populateTimeline();
            populateOffsets();
            deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
          },
          lastWidth = window.innerWidth, lastItemWidth = items[0] ? items[0].offsetWidth : 0,
          onResize = () => { // a phone's address bar sliding away is a resize too: the loop is only rebuilt when a width really changed
            const itemWidth = items[0] ? items[0].offsetWidth : 0;
            if (window.innerWidth === lastWidth && itemWidth === lastItemWidth) return;
            lastWidth = window.innerWidth; lastItemWidth = itemWidth;
            refresh(true);
          },
          proxy;
        gsap.set(items, {x: 0});
        populateWidths();
        populateTimeline();
        populateOffsets();
        rdOn(window, "resize", onResize);
        function toIndex(index, vars) {
          vars = vars || {};
          (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
          let newIndex = gsap.utils.wrap(0, length, index),
            time = times[newIndex];
          if (time > tl.time() !== index > curIndex && index !== curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
            time += tl.duration() * (index > curIndex ? 1 : -1);
          }
          if (time < 0 || time > tl.duration()) {
            vars.modifiers = {time: timeWrap};
          }
          curIndex = newIndex;
          vars.overwrite = true;
          gsap.killTweensOf(proxy);
          return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
        }
        tl.toIndex = (index, vars) => toIndex(index, vars);
        tl.closestIndex = setCurrent => {
          let index = getClosest(times, tl.time(), tl.duration());
          if (setCurrent) {
            curIndex = index;
            indexIsDirty = false;
          }
          return index;
        };
        tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
        tl.next = vars => toIndex(tl.current()+1, vars);
        tl.previous = vars => toIndex(tl.current()-1, vars);
        tl.times = times;
        tl.progress(1, true).progress(0, true); // pre-render for performance
        if (config.reversed) {
          tl.vars.onReverseComplete();
          tl.reverse();
        }
        if (config.draggable && typeof(Draggable) === "function") {
          proxy = document.createElement("div")
          let wrap = gsap.utils.wrap(0, 1),
            ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
            align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
            syncIndex = () => tl.closestIndex(true);
          typeof(InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
          draggable = Draggable.create(proxy, {
            trigger: items[0].parentNode,
            type: "x",
            onPressInit() {
              let x = this.x;
              gsap.killTweensOf(tl);
              wasPlaying = !tl.paused();
              tl.pause();
              startProgress = tl.progress();
              refresh();
              ratio = 1 / totalWidth;
              initChangeX = (startProgress / -ratio) - x;
              gsap.set(proxy, {x: startProgress / -ratio});
            },
            onDrag: align,
            onThrowUpdate: align,
            overshootTolerance: 0,
            inertia: true,
            snap(value) {
              if (Math.abs(startProgress / -ratio - this.x) < 10) {
                return lastSnap + initChangeX
              }
              let time = -(value * ratio) * tl.duration(),
                wrappedTime = timeWrap(time),
                snapTime = times[getClosest(times, wrappedTime, tl.duration())],
                dif = snapTime - wrappedTime;
              Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
              lastSnap = (time + dif) / tl.duration() / -ratio;
              return lastSnap;
            },
            onRelease() {
              syncIndex();
              draggable.isThrowing && (indexIsDirty = true);
            },
            onThrowComplete: () => {
              syncIndex();
              wasPlaying && tl.play();
            }
          })[0];
          tl.draggable = rdDrag(draggable);
        }
        tl.closestIndex(true);
        lastIndex = curIndex;
        onChange && onChange(items[curIndex], curIndex);
        timeline = tl;
        return () => window.removeEventListener("resize", onResize);
      });
      return timeline;

    }

    /* ---------- the brand ball (THE BRAND BALL, rdBallGL), tuned for a ball you only see a quarter of ---------- */
    const ballGL = rdBallGL('wall');
    // o: w, h, cx, cy, R in the canvas's css pixels; t, seed, bias; px, py, pr, amt for the warm spot under the mouse
    function drawBall(cv, o) {
      // its own size (measured on resize): on the page transition's cube the size on screen shrinks to nothing
      if (ballGL && o.w && o.h) ballGL(cv, o.w, o.h, Math.min(devicePixelRatio || 1, 2), o);
    }

    initSliders();

    /* ---------- faces, corners and balls ---------- */
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EASE = 'osmo-ease';
    var balls = [];

    /* ---------- corners ---------- */
    function Corners(host) {
      var els = qsa('.wall_c', host);
      if (els.length !== 4) els = ['tl', 'tr', 'bl', 'br'].map(function (k) {
        var c = el('wall_c is--' + k); c.setAttribute('aria-hidden', 'true'); host.appendChild(c);
        return c;
      });
      function spots(r) {   // where each corner sits for a box {l, t, r, b}
        var s = els[0].offsetWidth;
        return [[r.l, r.t], [r.r - s, r.t], [r.l, r.b - s], [r.r - s, r.b - s]];
      }
      return {
        set: function (r) { spots(r).forEach(function (p, i) { gsap.killTweensOf(els[i]); gsap.set(els[i], { x: p[0], y: p[1] }); }); },
        // travel to a new box: the corners on the leading side go first, the others catch up, so the frame stretches on its way
        travel: function (r, dir) {
          var order = dir > 0 ? [1, 3, 0, 2] : [0, 2, 1, 3], p = spots(r);
          order.forEach(function (i, n) { gsap.to(els[i], { x: p[i][0], y: p[i][1], duration: .75, delay: n * .045, ease: EASE, overwrite: true }); });
        }
      };
    }

    /* ---------- faces ---------- */
    var list = qs('.centered-slider-bullet__list', wrapper), host = qs('.wall_faces-in', wrapper);
    // the faces list is a tablist, so its <li> wrappers step aside for screen readers (role none): each tab then sits
    // straight in its tablist, as the accessibility checks require (Lighthouse flagged the list items and the tabs' parent)
    if (list) qsa('.centered-slider-bullet__item', list).forEach(function (li) { li.setAttribute('role', 'none'); });
    var row = qs('.centered-slider-row', wrapper);
    var bullets = qsa('[data-centered-slider="bullet"]', wrapper);
    var LIFT = parseFloat(wrapper.getAttribute('data-wall-lift')) || 1.15, GAP = parseFloat(wrapper.getAttribute('data-wall-gap'));
    if (isNaN(GAP)) GAP = 4;
    var photos = bullets.map(function (b) { return qs('.wall_face', b); });
    var round = photos.filter(Boolean).length ? parseFloat(getComputedStyle(photos.filter(Boolean)[0]).borderTopLeftRadius) || 0 : 0;
    var cols = photos.map(function (img) {
      if (!img) return null;
      var c = img.cloneNode(); c.alt = ''; c.className = 'wall_col'; c.removeAttribute('srcset'); c.src = img.currentSrc || img.src; c.style.borderRadius = round + 'px';
      img.parentNode.appendChild(c);
      return c;
    });
    // the active face grows, so its rounding is drawn smaller: on screen it stays exactly the Designer's value
    function setRound(i, r) { [photos[i], cols[i]].forEach(function (e) { if (e) e.style.borderRadius = r; }); }
    var marker = new Corners(host);

    function lift(i) { return -Math.round(bullets[i].offsetWidth * .07); }
    function faceBox(i) {
      var li = bullets[i].parentNode, w = bullets[i].offsetWidth, h = bullets[i].offsetHeight, size = Math.round(w * LIFT + GAP * 2);
      var l = Math.round(li.offsetLeft + w / 2 - size / 2), t = Math.round(li.offsetTop + h / 2 + lift(i) - size / 2);
      return { l: l, t: t, r: l + size, b: t + size };
    }

    var current = -1, ready = performance.now() + 400, lockUntil = 0;
    function go(i, instant) {
      if (i === current) return;
      var from = current, dir = i > from ? 1 : -1;
      current = i;
      var up = { scale: LIFT, y: lift(i) }, wide = 'circle(150% at 50% 50%)', small = round / LIFT + 'px', full = round + 'px';
      if (instant || calm) {
        if (from > -1) { gsap.set(bullets[from], { scale: 1, y: 0 }); if (cols[from]) gsap.set(cols[from], { clipPath: 'circle(0% at 50% 50%)' }); setRound(from, full); }
        gsap.set(bullets[i], up); if (cols[i]) gsap.set(cols[i], { clipPath: wide }); setRound(i, small);
        marker.set(faceBox(i));
        return;
      }
      var exit = dir > 0 ? '100%' : '0%', enter = dir > 0 ? '0%' : '100%';
      // out: the colour drains off towards the new face, the photo sinks back
      gsap.to(bullets[from], { scale: 1, y: 0, duration: .7, ease: EASE, overwrite: true });
      if (cols[from]) gsap.fromTo(cols[from], { clipPath: 'circle(150% at ' + exit + ' 50%)' }, { clipPath: 'circle(0% at ' + exit + ' 50%)', duration: .6, ease: 'power2.inOut', overwrite: true });
      // in: it arrives from the old face's side, a beat later, the photo rises to meet it
      gsap.fromTo(bullets[i], { scale: .92 }, { scale: LIFT, y: up.y, duration: .85, delay: .1, ease: 'back.out(2.2)', overwrite: true });
      if (cols[i]) gsap.fromTo(cols[i], { clipPath: 'circle(0% at ' + enter + ' 50%)' }, { clipPath: 'circle(150% at ' + enter + ' 50%)', duration: .8, delay: .16, ease: 'power2.out', overwrite: true });
      if (from > -1) setRound(from, full);
      setRound(i, small);
      marker.travel(faceBox(i), dir);
      if (balls[i]) balls[i].stir = 1;
    }
    function sync() {
      if (performance.now() < lockUntil) return;
      var i = bullets.findIndex(function (b) { return b.classList.contains('active'); });
      if (i > -1) go(i, performance.now() < ready);
    }
    // a click jumps over the faces in between; the slider still passes them, so hold the corners on the target
    bullets.forEach(function (b, i) {
      b.addEventListener('click', function () { go(i); lockUntil = performance.now() + 800; }, true);
    });
    new MutationObserver(sync).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
    sync();
    addEventListener('resize', function () { if (current > -1) marker.set(faceBox(current)); });

    /* ---------- balls and cards ---------- */
    var FLOW = 1;   // the calculator's pace
    // [px past the right edge, px past the bottom edge, seed, colour bias]: each ball its own crop and mix
    var SPOTS = [[6, 10, 14, -.08], [2, 14, 5, -.06], [0, 8, 23, -.1], [8, 6, 2, -.08], [4, 12, 31, -.06], [10, 10, 6, -.1], [2, 6, 19, -.08], [6, 14, 41, -.06], [0, 12, 7, -.1]];
    balls = Array.prototype.map.call(qsa('.centered-slider-slide__inner', wrapper), function (card, i) {
      var c = document.createElement('canvas'), s = SPOTS[i % SPOTS.length];
      qs('.wall_ball', card).appendChild(c);
      return { canvas: c, card: card, slide: card.parentNode, dx: s[0], dy: s[1], seed: s[2], bias: s[3], t: i * 11, float: i * 2.3, stir: 0, amt: 0, want: 0, px: 0, py: 0, tx: 0, ty: 0, s: 0, r: 0 };
    });
    function measure(b) {
      b.s = b.canvas.getBoundingClientRect().width;  // .wall_ball's size in the Designer sets the ball
      b.r = b.s - 12;     // the box leaves room for the ball to float
      b.cx = b.s + b.dx; b.cy = b.s + b.dy;
      b.w = b.canvas.clientWidth; b.h = b.canvas.clientHeight; // the canvas's own size, read here once instead of on every paint
    }
    function paint(b) {
      // it floats and breathes a little, never far enough to reach the text
      var fx = calm ? 0 : Math.sin(b.float * .47) * 4 + Math.sin(b.float * .19) * 2, fy = calm ? 0 : Math.cos(b.float * .37) * 5;
      var breath = calm ? 1 : 1 + Math.sin(b.float * .55) * .025;
      drawBall(b.canvas, { w: b.w, h: b.h, cx: b.cx + fx, cy: b.cy + fy, R: b.r * breath, t: b.t, seed: b.seed, bias: b.bias, px: b.px, py: b.py, pr: b.r * .45, amt: b.amt });
    }
    balls.forEach(function (b) { measure(b); paint(b); });
    var sized = new ResizeObserver(function () { balls.forEach(function (b) { measure(b); paint(b); }); });
    balls.forEach(function (b) { sized.observe(b.canvas); });

    // hover: only straight on the ball, the spot under the mouse warms up
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !seen) return; // the wall off screen: no ball to touch, so nothing to measure
      balls.forEach(function (b) {
        var box = b.canvas.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
        var on = Math.hypot(x - b.cx, y - b.cy) < b.r * 1.05 && x < b.s && y < b.s;
        if (on) { if (!b.want) { b.px = x; b.py = y; } b.tx = x; b.ty = y; b.want = 1; } else b.want = 0;
      });
    }, { passive: true });

    function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
    // the loop only runs while the wall is on screen: off screen it stops asking for frames, and the observer starts it again
    var seen = true, last = 0, running = false;
    function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
    new IntersectionObserver(function (e) { seen = e[0].isIntersecting; if (seen) start(); }).observe(document.querySelector('.wall_section'));
    // each card's fade and corners read where the card really is, but a card only moves when the slider writes its slide's
    // transform (drag, throw, arrows, autoplay) or the page changes size: so it is measured on those frames, and at rest the
    // loop only paints the balls. Once a second it looks anyway, for whatever else could shift the wall (a page transition)
    var moved = true, lastPos = '', sinceLook = 0;
    function shifted() { moved = true; }
    addEventListener('resize', shifted);
    var shifts = new ResizeObserver(shifted);
    shifts.observe(row); balls.forEach(function (b) { shifts.observe(b.card); });
    function loop(now) {
      var dt = Math.min((now - last) / 1000, .05); last = now;
      if (!seen) { running = false; return; }
      requestAnimationFrame(loop);
      if (document.hidden) return;
      var pos = '';
      balls.forEach(function (b) { pos += b.slide.style.transform; }); // GSAP's own inline style: reading it costs no layout
      sinceLook += dt;
      var look = moved || pos !== lastPos || sinceLook > 1;
      if (look) {
        moved = false; lastPos = pos; sinceLook = 0;
        var mid = row.getBoundingClientRect().left + row.clientWidth / 2;
      }
      balls.forEach(function (b) {
        if (look) {
          var box = b.card.getBoundingClientRect(), off = Math.abs(box.left + box.width / 2 - mid) / box.width;
          b.left = box.left; b.right = box.right;
          var k = smooth(1 - off / .45).toFixed(3), op = (.45 + .55 * smooth(1 - off / .9)).toFixed(3);
          if (k !== b.k) { b.k = k; b.card.style.setProperty('--k', k); }   // corners: only in the last stretch of the landing
          if (op !== b.op) { b.op = op; b.slide.style.opacity = op; }        // the card itself: over the whole way
        }
        if (calm) return;
        b.stir *= Math.pow(.97, dt * 60);
        b.t += dt * FLOW * (1 + b.stir * 5);
        b.float += dt;
        b.amt += (b.want - b.amt) * (1 - Math.exp(-dt * 3.5));
        b.px += (b.tx - b.px) * (1 - Math.exp(-dt * 7)); b.py += (b.ty - b.py) * (1 - Math.exp(-dt * 7));
        if (b.right > 0 && b.left < innerWidth) paint(b);
      });
    }
    start();
  }

  // =========================================================
  // RUN
  // Each section runs on its own, so a missing element on one page can't stop the rest.
  // =========================================================
  function run(name, fn, arg) {
    try {
      fn(arg);
    } catch (err) {
      console.error('[rimbo-designs] ' + name + ':', err);
    }
  }

  // "/nl/work/anapana/" → "/work/anapana": the Dutch pages run the same code
  function pagePath() {
    return location.pathname.replace(/\/+$/, '').replace(/^\/nl(?=\/|$)/, '') || '/';
  }

  // =========================================================
  // FAQ — the accordion on the dark pages (Home V4, Extreme): Designer classes faq_* (section [data-faq] > ul.faq_list >
  // li.faq_item > .faq_top (question + icon) + .faq_bottom (answers)). The questions and answers stay in the HTML, so search
  // engines read them; this opens one item at a time (click, Enter or Space; the other items close), rotates the icon by the
  // data-accordion-status attribute (the open-state rules sit in the page head), and adds FAQPage structured data from the
  // DOM. The same design as the city pages' FAQ, which keeps its rich-text version in the template code.
  // =========================================================
  function rdFaq() {
    var sec = qs('[data-faq]');
    if (!sec) return;
    var items = qsa('.faq_item', sec);
    if (!items.length) return;
    var set = function (li, open) {
      li.setAttribute('data-accordion-status', open ? 'active' : 'not-active');
      var top = qs('.faq_top', li);
      if (top) top.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    var toggle = function (li) {
      var open = li.getAttribute('data-accordion-status') === 'active';
      items.forEach(function (o) { set(o, false); });
      if (!open) set(li, true);
    };
    rdOn(sec, 'click', function (e) {
      var top = e.target.closest && e.target.closest('.faq_top');
      if (top && !e.target.closest('a')) toggle(top.parentNode);
    });
    rdOn(sec, 'keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('faq_top')) { e.preventDefault(); toggle(e.target.parentNode); }
    });
    var ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(function (li) {
      var q = qs('.faq_q', li);
      return { '@type': 'Question', name: q ? q.textContent.trim() : '', acceptedAnswer: { '@type': 'Answer', text: qsa('.faq_p', li).map(function (p) { return p.textContent.trim(); }).join(' ') } };
    }) };
    var s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); rdHead(s);
  }

  // =========================================================
  // DFS LOGO TURN — the Digital Feng Shui logo on the closing cards (.duo_svg, .duo_svg_day, .dfc_svg), as on that site
  // itself: every 4.4 s the ring (.m-ring) turns +45 and the star (.m-inner) -45, in .6 s. Each logo keeps its own count
  // (rdA on the svg), so on a new page it starts at 0 again. The logo and the rule that keeps CSS transitions off its
  // paths (they would fight the turn) live in Webflow. Was a script in the site head until 2026-11-14.
  // =========================================================
  var logoTurnEase = null;
  function rdLogoTurn() {
    var LOGOS = '.duo_svg, .duo_svg_day, .dfc_svg';
    if (reducedMotion || !qs(LOGOS)) return;
    setInterval(function () {
      if (document.hidden) return;
      if (!logoTurnEase) logoTurnEase = window.CustomEase ? CustomEase.create('rdDfsTurn', '0.625,0.05,0,1') : 'power2.inOut';
      qsa(LOGOS).forEach(function (logo) {
        var ring = qs('.m-ring', logo), inner = qs('.m-inner', logo);
        if (!ring || !inner) return;
        logo.rdA = (logo.rdA || 0) + 45;
        gsap.to(ring, { rotation: logo.rdA, duration: 0.6, ease: logoTurnEase, transformOrigin: '50% 50%', overwrite: 'auto' });
        gsap.to(inner, { rotation: -logo.rdA, duration: 0.6, ease: logoTurnEase, transformOrigin: '50% 50%', overwrite: 'auto' });
      });
    }, 4400);
  }

  // =========================================================
  // DFS CARD — the Digital Feng Shui card (component CTA_dfs, classes dfc_*; lab prototype/dfs-card): what a class can't
  // hold. The outline 8 px in with the ticket's cut corners, redrawn when the card changes size; is-in while the card is on
  // screen (the logo unfolds on it, in the site head CSS); the same lean as the Journey pass (one pointer across the window,
  // TILT = degrees, DEPTH = how far the [data-depth] layers shift, eased .07); the Digital Feng Shui site's blue zips on
  // the grid lines (one every .3-1 s, 56-176 px tall, 140-440 px of travel, 1.4-2.6 s, at most 7). The lean's loop only
  // runs while a card is on screen and the lean is still easing. Where the pointer was is remembered from page to page, so
  // a card on the next page leans the right way before the mouse moves again. The look lives in Webflow (dfc_ classes and
  // the site head CSS). Was a script in the site head until 2026-11-14.
  // =========================================================
  var dfcLean = { tx: 0, ty: 0, x: 0, y: 0 };
  function rdDfc() {
    var cards = qsa('.dfc:not([data-on])');
    if (!cards.length) return;
    var NS = 'http://www.w3.org/2000/svg', TILT = 5, DEPTH = 10, D = 8, C = 14 - D * 0.586;
    var reduce = reducedMotion, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var L = dfcLean, items = [], raf = 0;

    function anyOn() { return items.some(function (it) { return it.on && it.c.isConnected; }); }
    function loop() {
      raf = 0;
      if (!anyOn() || document.hidden) return;
      L.x += (L.tx - L.x) * 0.07;
      L.y += (L.ty - L.y) * 0.07;
      items.forEach(function (it) {
        if (!it.on || !it.c.isConnected) return;
        it.c.style.transform = 'perspective(1600px) rotateX(' + (-L.y * TILT).toFixed(3) + 'deg) rotateY(' + (L.x * TILT).toFixed(3) + 'deg)';
        var dx = L.x * DEPTH, dy = L.y * DEPTH;
        it.layers.forEach(function (l) { l.e.style.transform = 'translate(' + (dx * l.k).toFixed(2) + 'px,' + (dy * l.k).toFixed(2) + 'px)'; });
      });
      if (Math.abs(L.tx - L.x) > 0.0004 || Math.abs(L.ty - L.y) > 0.0004) raf = requestAnimationFrame(loop);
    }
    var leaning = !reduce && fine;
    function wake() { if (!raf && leaning && anyOn() && !document.hidden) raf = requestAnimationFrame(loop); }

    cards.forEach(function (c) {
      c.dataset.on = '1';
      var svg = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path');
      svg.setAttribute('class', 'dfc_frame');
      svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(p);
      c.appendChild(svg);
      function draw() {
        var w = c.clientWidth, h = c.clientHeight;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        p.setAttribute('d', 'M' + (D + C) + ' ' + D + 'H' + (w - D - C) + 'L' + (w - D) + ' ' + (D + C) + 'V' + (h - D - C) + 'L' + (w - D - C) + ' ' + (h - D) + 'H' + (D + C) + 'L' + D + ' ' + (h - D - C) + 'V' + (D + C) + 'Z');
      }
      draw();
      new ResizeObserver(draw).observe(c);
      var it = {
        c: c, on: false, zips: 0, grids: qsa('.dfc_gridbg', c),
        layers: qsa('[data-depth]', c).map(function (e) { return { e: e, k: +e.getAttribute('data-depth') || 0 }; })
      };
      new IntersectionObserver(function (es) {
        var e = es[0], vh = e.rootBounds ? e.rootBounds.height : innerHeight;
        var f = e.intersectionRect.height / Math.min(e.boundingClientRect.height, vh);
        if (f >= 0.6) {
          it.on = true;
          c.classList.add('is-in');
          wake();
        } else if (f < 0.12) {
          it.on = false;
          c.classList.remove('is-in');
          c.style.transform = '';
          it.layers.forEach(function (l) { l.e.style.transform = ''; });
        }
      }, { threshold: [0, 0.12, 0.6, 1] }).observe(c);
      items.push(it);
      if (!reduce) setTimeout(function zip() {
        if (!it.c.isConnected) return;
        setTimeout(zip, 300 + 700 * Math.random());
        if (!it.on || document.hidden || it.zips > 6 || !it.grids.length) return;
        var g = it.grids[Math.floor(Math.random() * it.grids.length)], r = g.getBoundingClientRect();
        var cols = Math.floor(r.width / 32), s = Math.max(0, -r.top), l = Math.min(r.height, innerHeight - r.top);
        var h = 56 + 120 * Math.random(), d = 140 + 300 * Math.random();
        // a low band (on a phone the grid sits in two strips of about 85 px): shorter zips that fit it
        if (r.height < 200) { h = Math.min(h, r.height * 0.4); d = Math.min(d, r.height * 0.45); }
        if (cols < 2 || l - s < h + d) return;
        var z = document.createElement('span');
        z.className = 'dfc_zip';
        z.style.left = 32 * (1 + Math.floor(Math.random() * (cols - 1))) + 'px';
        z.style.top = s + Math.random() * (l - s - h - d) + 'px';
        z.style.height = h + 'px';
        g.appendChild(z);
        it.zips++;
        gsap.fromTo(z, { y: 0, autoAlpha: 0 }, {
          y: d, duration: 1.4 + 1.2 * Math.random(), ease: 'power1.inOut', keyframes: { autoAlpha: [0, 1, 1, 0] },
          onComplete: function () { z.remove(); it.zips--; }
        });
      }, 400);
    });

    if (!leaning) return;
    rdOn(window, 'pointermove', function (e) {
      if (e.passFake) return; // the Journey pass's own made-up pointer, meant for its button only
      L.tx = e.clientX / innerWidth * 2 - 1;
      L.ty = e.clientY / innerHeight * 2 - 1;
      wake();
    }, { passive: true, capture: true });
    rdOn(document.documentElement, 'pointerleave', function () { L.tx = L.ty = 0; wake(); });
  }

  // =========================================================
  // JOURNEY PASS — the ticket (component Journey_pass, classes pass_*; lab prototype/true-guide): what a class can't hold,
  // for every page that has the card. The ticket leans towards the mouse (TILT = degrees, DEPTH = how far the layers
  // shift); the foil in the photo lines (pass_holo, --hx --hy --hi) and in the globe stamp follows that lean and is near
  // nothing when the ticket lies flat (FLAT = at rest, PEAK = most). The route line and its dot run once when the ticket
  // comes into view (is-in), the globes turn slowly, the clock ([data-pass-clock]) runs on Amsterdam time, and the whole
  // stub acts as its button, which also feels the mouse from anywhere on the stub. On a phone the lean follows the scroll
  // instead of a mouse. The loop only runs while a ticket is on screen; while the mouse is still and the lean has settled,
  // only the globes keep turning, drawn 30 times a second. The look lives in Webflow (pass_ classes; the stub's hover scan
  // and plus marks in the site head CSS). The tear into /apply is TICKET TEAR, further up. Was a script in the site head
  // until 2026-11-14.
  // =========================================================
  function rdPass() {
    var passes = qsa('.pass');
    if (!passes.length || passes[0].dataset.on) return;
    var TILT = 5, DEPTH = 10, FLAT = 0.08, PEAK = 0.8, NS = 'http://www.w3.org/2000/svg';
    var reduce = reducedMotion, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    var clocks = qsa('[data-pass-clock]'), a = 0, tx = 0, ty = 0, x = 0, y = 0, raf = 0, lastDraw = 0;

    function tick() {
      var t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date());
      clocks.forEach(function (c) { c.textContent = t; });
    }
    setInterval(tick, 20000);
    tick();

    function limit(v, m) { return Math.max(-m, Math.min(m, v)); }
    // The globe stamp's lines take a gradient of their own, so the foil can slide through them
    function foilStamp(svg, i) {
      if (!svg) return null;
      var g = document.createElementNS(NS, 'linearGradient'), d = document.createElementNS(NS, 'defs'), u = 'url(#passFoil' + i + ')';
      g.id = 'passFoil' + i;
      g.setAttribute('gradientUnits', 'userSpaceOnUse');
      [['0', '#CC3C18'], ['.3', '#E4566A'], ['.5', '#4B7888'], ['.7', '#E4566A'], ['1', '#CC3C18']].forEach(function (c) {
        var s = document.createElementNS(NS, 'stop');
        s.setAttribute('offset', c[0]);
        s.setAttribute('stop-color', c[1]);
        g.appendChild(s);
      });
      d.appendChild(g);
      svg.insertBefore(d, svg.firstChild);
      qsa('[stroke="currentColor"]', svg).forEach(function (e) { e.setAttribute('stroke', u); });
      qsa('[fill="currentColor"]', svg).forEach(function (e) { e.setAttribute('fill', u); });
      return g;
    }
    function light(it) {
      // SPEED (2026-11-18): these go on the foil layer that reads them (.pass_holo), not on the ticket. A changing CSS
      // variable on the ticket made the browser restyle every element inside it, on every frame.
      var hi = (FLAT + (PEAK - FLAT) * Math.pow(Math.min(1, Math.hypot(x, y)), 1.4)).toFixed(3);
      var hx = (50 + x * 50).toFixed(2) + '%', hy = (50 + y * 50).toFixed(2) + '%';
      it.holo.forEach(function (e) {
        var st = e.style;
        st.setProperty('--hx', hx);
        st.setProperty('--hy', hy);
        st.setProperty('--hi', hi);
      });
      if (it.g) {
        var s = x * 90, t = y * 60;
        it.g.setAttribute('x1', (-40 + s).toFixed(1));
        it.g.setAttribute('y1', t.toFixed(1));
        it.g.setAttribute('x2', (160 + s).toFixed(1));
        it.g.setAttribute('y2', (120 + t).toFixed(1));
      }
    }
    function anyOn() { return items.some(function (it) { return it.on; }); }
    function wake() { if (!raf && !reduce && !document.hidden && passes[0].isConnected && anyOn()) raf = requestAnimationFrame(loop); }

    var phone = matchMedia('(max-width: 767px)');
    var items = passes.map(function (p, i) {
      p.dataset.on = '1';
      var it = {
        p: p, on: false, main: qs('.pass_main', p), m: qsa('[data-m]', p), rose: qs('.pass_rose', p), earth: qs('.pass_earth', p), stamp: qs('.pass_stamp', p),
        imgs: qsa('.pass_img,.pass_tex,.pass_holo', p), g: foilStamp(qs('.pass_stamp svg', p), i),
        holo: qsa('.pass_holo', p), rt: qsa('.pass_fill,.pass_dot', p), near: false
      };
      if (!it.holo.length) it.holo = [p];
      if (!it.rt.length) it.rt = [p];
      new IntersectionObserver(function (es) {
        it.on = es[0].isIntersecting;
        if (!it.on) return;
        if (!phone.matches) { // on a phone the route follows the scroll instead (route, below)
          qs('.pass_fill', p).classList.add('is-in');
          qs('.pass_dot', p).classList.add('is-in');
        }
        wake();
      }, { threshold: 0.2 }).observe(p);
      var stub = qs('.pass_stub', p), btn = stub && qs('.btn', stub);
      if (btn) {
        rdOn(stub, 'click', function (e) { if (!btn.contains(e.target)) btn.click(); });
        // the button's own pull towards the mouse, fed from anywhere on the stub with a made-up pointer near the button
        if (fine) rdOn(stub, 'pointermove', function (e) {
          e.stopPropagation();
          var r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var ev = new PointerEvent('pointermove', { clientX: cx + limit((e.clientX - cx) * 0.15, r.width / 3), clientY: cy + limit((e.clientY - cy) * 0.15, r.height / 3) });
          ev.passFake = true;
          document.dispatchEvent(ev);
        });
      }
      light(it);
      return it;
    });

    // THE ROUTE ON A PHONE (Rimbo, 2026-11-17, from the ticket phone lab): it stands down the ticket's side without its
    // words and follows the scroll, not a timer. --p on the ticket goes 0 to 1: 0 when the top of the ticket's main part
    // comes up to 85% of the screen, 1 when the tear line passes the middle. The Designer's phone styles of pass_fill and
    // pass_dot read it (and show the route full where the script never ran).
    function route() {
      if (!phone.matches) return;
      var vh = window.innerHeight;
      items.forEach(function (it) {
        if (!it.main) return;
        if (!it.near) return;
        var r = it.main.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        var v = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.35 + r.height)));
        if (v !== it.rp) { it.rp = v; var s = v.toFixed(3); it.rt.forEach(function (e) { e.style.setProperty('--p', s); }); }
      });
    }
    // SPEED (2026-11-18): --p goes on the two route parts that read it (pass_fill, pass_dot), not on the ticket (a changing
    // variable there restyled the whole ticket on every scroll). The ticket is only measured while it is within a screen
    // of the viewport (near), and once per frame at most.
    var routeQueued = false;
    function routeSoon() {
      if (routeQueued || !phone.matches) return;
      if (!items.some(function (it) { return it.near; })) return;
      routeQueued = true;
      requestAnimationFrame(function () { routeQueued = false; route(); });
    }
    items.forEach(function (it) {
      if (!it.main) return;
      new IntersectionObserver(function (es) { it.near = es[0].isIntersecting; if (it.near) route(); }, { rootMargin: '100% 0px 100% 0px' }).observe(it.main);
    });
    rdOn(window, 'scroll', routeSoon, { passive: true });
    rdOn(window, 'resize', route);

    if (reduce) return;
    if (fine) {
      rdOn(window, 'pointermove', function (e) {
        if (e.passFake) return;
        tx = e.clientX / innerWidth * 2 - 1;
        ty = e.clientY / innerHeight * 2 - 1;
        wake();
      }, { passive: true, capture: true });
      rdOn(document.documentElement, 'pointerleave', function () { tx = ty = 0; wake(); });
    }
    rdOn(document, 'visibilitychange', wake);

    function loop(now) {
      raf = 0;
      if (!passes[0].isConnected || document.hidden || !anyOn()) return;
      raf = requestAnimationFrame(loop);
      if (!fine) {
        var sc = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight);
        tx = Math.sin(sc * 12) * 0.7;
        ty = 0;
      }
      a += 0.0016;
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      var moving = Math.abs(tx - x) > 0.0004 || Math.abs(ty - y) > 0.0004;
      if (!moving && now - lastDraw < 33) return;
      lastDraw = now;
      items.forEach(function (it) {
        if (!it.on) return;
        it.m.forEach(function (e, i) { e.setAttribute('rx', Math.abs(e.getAttribute('ry') * Math.cos(a + (i % 6) * Math.PI / 6)).toFixed(2)); });
        light(it);
        if (!fine) return;
        it.p.style.transform = 'perspective(1600px) rotateX(' + (-y * TILT).toFixed(3) + 'deg) rotateY(' + (x * TILT).toFixed(3) + 'deg)';
        var dx = (x * DEPTH).toFixed(2), dy = (y * DEPTH).toFixed(2);
        if (it.rose) it.rose.style.transform = 'translate(' + (-dx) + 'px,' + (-dy) + 'px)';
        if (it.earth) it.earth.style.transform = 'translate(' + (-dx * 0.6) + 'px,' + (-dy * 0.6) + 'px)';
        if (it.stamp) it.stamp.style.transform = 'translate(' + (dx * 0.4) + 'px,' + (dy * 0.4) + 'px)';
        it.imgs.forEach(function (im) { im.style.transform = 'scale(1.05) translate(' + (-dx * 0.5) + 'px,' + (-dy * 0.5) + 'px)'; });
      });
    }
    wake();
  }

  // =========================================================
  // LOCATION PAGES, the small parts — what the city template and the overview (/locations) kept in their Webflow page
  // code until 2026-11-14. The look lives in Webflow: the loc_ and accordion-css classes and the CSS in those pages' own
  // head and footer code. (The showcase drum, the balls and the button helpers of these pages are further up: rdLocShow,
  // rdLocBalls, rdLocFaqBtn, rdLocNl.)
  // =========================================================

  // City FAQ: the CMS rich text (h2, then h3 + answer pairs, then a closing link line) becomes the accordion, and the page
  // gets FAQPage structured data. The questions and answers stay in the HTML, so search engines read them; this only
  // regroups them. Click or Enter/Space opens an item, the others close. (The dark pages' own FAQ is rdFaq.)
  function rdLocFaq() {
    var faq = qs('.loc_faq'), rich = faq && qs('.w-richtext', faq);
    if (!rich || rich.classList.contains('w-dyn-bind-empty')) return;
    var title = null, items = [], tail = [];
    Array.prototype.slice.call(rich.children).forEach(function (el) {
      if (el.tagName === 'H2' && !title) { title = el; return; }
      if (el.tagName === 'H3') { items.push({ q: el, a: [] }); return; }
      var cur = items[items.length - 1];
      if (cur && (cur.a.length === 0 || el.nextElementSibling)) cur.a.push(el); else tail.push(el);
    });
    var last = items[items.length - 1]; // the last item keeps only its first paragraph; anything after it is the closing link line
    if (last && last.a.length > 1) tail = last.a.splice(1).concat(tail);
    if (!items.length) return;

    var make = function (tag, cls, parent) {
      var node = document.createElement(tag);
      node.className = cls;
      if (parent) parent.appendChild(node);
      return node;
    };
    var head = make('div', 'loc_faq-head');
    if (title) head.appendChild(title);
    var acc = make('div', 'accordion-css');
    acc.setAttribute('data-accordion-css-init', '');
    var list = make('ul', 'accordion-css__list', acc);
    var icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M28.5 22.5L18 12L7.5 22.5" stroke="currentColor" stroke-width="3" stroke-miterlimit="10"></path></svg>';
    var ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] };
    items.forEach(function (it) {
      ld.mainEntity.push({ '@type': 'Question', name: it.q.textContent.trim(), acceptedAnswer: { '@type': 'Answer', text: it.a.map(function (p) { return p.textContent.trim(); }).join(' ') } });
      var li = make('li', 'accordion-css__item', list);
      li.setAttribute('data-accordion-status', 'not-active');
      var top = make('div', 'accordion-css__item-top', li);
      top.setAttribute('role', 'button');
      top.setAttribute('tabindex', '0');
      top.setAttribute('aria-expanded', 'false');
      it.q.className = 'accordion-css__item-h3';
      top.appendChild(it.q);
      make('div', 'accordion-css__item-icon', top).innerHTML = icon;
      var content = make('div', 'accordion-css__item-bottom-content', make('div', 'accordion-css__item-bottom-inner', make('div', 'accordion-css__item-bottom', li)));
      it.a.forEach(function (p) { content.appendChild(p); });
    });
    if (tail.length) {
      var t = make('div', 'loc_faq-tail', acc);
      tail.forEach(function (p) { t.appendChild(p); });
    }
    rich.innerHTML = '';
    rich.style.display = 'none';
    faq.insertBefore(acc, rich);
    faq.insertBefore(head, acc);
    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    rdHead(s);

    function toggle(li) {
      var open = li.getAttribute('data-accordion-status') === 'active';
      qsa('.accordion-css__item', list).forEach(function (o) {
        o.setAttribute('data-accordion-status', 'not-active');
        o.firstChild.setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        li.setAttribute('data-accordion-status', 'active');
        li.firstChild.setAttribute('aria-expanded', 'true');
      }
    }
    rdOn(list, 'click', function (e) {
      var top = e.target.closest('.accordion-css__item-top');
      if (top && !e.target.closest('a')) toggle(top.parentNode);
    });
    rdOn(list, 'keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('accordion-css__item-top')) { e.preventDefault(); toggle(e.target.parentNode); }
    });
  }

  // The city's name comes from the CMS as <meta name="rd-city"> in the template's head code (the one line of data that
  // stays in Webflow; syncHead() carries it along on a page swap). The postcard's postmark carries it: curved text can't
  // be bound in the Designer, so [data-loc-city] is filled here.
  function locCity() {
    var meta = qs('meta[name="rd-city"]', document.head);
    return meta ? meta.getAttribute('content') || '' : null; // null: not a city page
  }
  function rdLocCity() {
    var city = locCity();
    if (!city) return;
    qsa('[data-loc-city]').forEach(function (t) { t.textContent = city.toUpperCase(); });
  }

  // City breadcrumbs: no script any more. Since 2026-11-19 the Locations template's Schema markup (one per language)
  // carries WebPage + Service + BreadcrumbList from the CMS, so the old rdLocCrumbs is retired.

  // Osmo's Accelerating Globe on Scroll ([data-accelerating-globe] with eight [data-accelerating-globe-circle]): the
  // meridians keep turning, and turn faster while you scroll.
  function rdGlobe() {
    qsa('[data-accelerating-globe]').forEach(function (globe) {
      var circles = qsa('[data-accelerating-globe-circle]', globe);
      if (circles.length < 8) return;
      var tl = gsap.timeline({ repeat: -1, defaults: { duration: 1, ease: 'none' } });
      var widths = [
        ['50%', '37.5%'], ['37.5%', '25%'], ['25%', '12.5%'], ['calc(12.5% + 1px)', 'calc(0% + 1px)'],
        ['calc(0% + 1px)', 'calc(12.5% + 1px)'], ['12.5%', '25%'], ['25%', '37.5%'], ['37.5%', '50%']
      ];
      circles.slice(0, 8).forEach(function (circle, i) {
        tl.fromTo(circle, { width: widths[i][0] }, { width: widths[i][1] }, i === 0 ? 0 : '<');
      });
      // it changes the circles' width, which costs a layout pass every frame: off screen (and in a hidden tab) it waits
      nearScreen(globe, function (on) { if (on) tl.play(); else tl.pause(); });
      var lastY = window.scrollY, lastT = performance.now(), stopTimeout;
      rdOn(window, 'scroll', function () {
        var now = performance.now(), dy = window.scrollY - lastY, dt = now - lastT;
        lastY = window.scrollY;
        lastT = now;
        var velocity = dt > 0 ? (dy / dt) * 1000 : 0; // px/s
        tl.timeScale(Math.abs(velocity * 0.005) + 1);
        clearTimeout(stopTimeout);
        stopTimeout = setTimeout(function () {
          gsap.to(tl, { timeScale: 1, duration: 0.6, ease: 'power2.out', overwrite: true });
        }, 100);
      }, { passive: true });
    });
  }

  // The overview's hero card (.loc_hero.is-card on /locations) leans with the mouse: the Journey pass's and the DFS
  // card's own numbers (TILT 5, DEPTH 10, perspective 1600, eased .07, the pointer across the whole window). data-depth
  // on the globe and the postcards sets how far each shifts.
  function rdLocLean() {
    var card = qs('.loc_hero.is-card');
    if (!card || reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var TILT = 5, DEPTH = 10, tx = 0, ty = 0, x = 0, y = 0;
    var layers = qsa('[data-depth]', card).map(function (e) { return { e: e, k: +e.getAttribute('data-depth') || 0 }; });
    // rests once it has caught up with the mouse, and off screen (it redrew every frame before, also standing still)
    var lean = rdLoop(card, function () {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      card.style.transform = 'perspective(1600px) rotateX(' + (-y * TILT).toFixed(3) + 'deg) rotateY(' + (x * TILT).toFixed(3) + 'deg)';
      var dx = x * DEPTH, dy = y * DEPTH;
      layers.forEach(function (l) { l.e.style.transform = 'translate(' + (dx * l.k).toFixed(2) + 'px,' + (dy * l.k).toFixed(2) + 'px)'; });
      return Math.abs(tx - x) > 0.0004 || Math.abs(ty - y) > 0.0004;
    });
    rdOn(window, 'pointermove', function (e) {
      tx = e.clientX / innerWidth * 2 - 1;
      ty = e.clientY / innerHeight * 2 - 1;
      lean.wake();
    }, { passive: true });
  }

  // /locations sets its og:url to the address it was opened on (an old snippet from the page's head code)
  function rdOgUrl() {
    var tag = qs('meta[property="og:url"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', 'og:url');
      rdHead(tag);
    }
    tag.setAttribute('content', window.location.href);
  }

  // =========================================================
  // APPLY — /apply, the application form ([data-apply-form]): what moves. The look lives in the Designer (apf_ classes);
  // this only switches classes and moves things. Was the page's own footer and head code in Webflow until 2026-11-14.
  // - steps open one by one (is-later off), the open one gets is-current, a finished one its Done mark (is-on),
  //   the progress line bottom left fills a sixth per step
  // - the picks (Website, Branding, Marketing) open their follow-ups; every answer goes into a hidden field for the email.
  //   A hidden field with data-required (Found by, step 02) must have a pick before its step counts as done; a pick with
  //   data-alone (Not sure yet, Not much yet) clears the others in its group
  // - budget: dashes lit up to the handle, the amount counts smoothly, a bubble while dragging
  // - date: Start or Deadline, a two-month calendar that opens below
  // - sending: an incomplete form never reaches Webflow (every step opens, the missing field gets focus); a complete
  //   one swooshes away while Webflow sends, then the thank-you plays: the paper plane (below), then the form's own
  //   success message fades up. On an error it all comes back
  // (The ticket's tear into this page and its X are TICKET TEAR, further up.)
  // =========================================================
  function rdApply() {
    var form = qs('[data-apply-form]');
    if (!form || form.dataset.applyReady) return;
    form.dataset.applyReady = '1';
    var reduce = reducedMotion, G = gsap;
    var nl = RD_NL.test(location.pathname), lang = nl ? 'nl-NL' : 'en-GB'; // /nl: €5.000, 3 december 2026, Dutch months
    var block = form.parentElement;
    var head = document.querySelector('.apf_head');
    var steps = [].slice.call(form.querySelectorAll('[data-step]'));
    var sendRow = form.querySelector('[data-send-row]');
    var sendBtn = form.querySelector('[data-send]');
    var fill = document.querySelector('[data-progress-fill]');
    var count = document.querySelector('[data-progress-count]');
    function on(el, cls, yes) { if (el) el.classList.toggle(cls, !!yes); }
    function shown(el) { return el && !el.classList.contains('is-later'); }

    function show(el) {
      if (!el || shown(el)) return;
      el.classList.remove('is-later');
      if (reduce || !G) return;
      G.fromTo(el, { height: 0, opacity: 0, y: 12, overflow: 'hidden' }, { height: 'auto', opacity: 1, y: 0, duration: .65, ease: 'power2.out', clearProps: 'height,overflow,transform,opacity' });
    }
    function isOpen(el) { return getComputedStyle(el).display !== 'none'; }
    function slideOpen(el, display) {
      if (isOpen(el)) return;
      el.style.display = display;
      if (reduce || !G) return;
      G.fromTo(el, { height: 0, opacity: 0, overflow: 'hidden' }, { height: 'auto', opacity: 1, duration: .5, ease: 'power3.out', clearProps: 'height,overflow,opacity' });
    }
    function slideShut(el, then) {
      if (!isOpen(el)) return;
      function end() { el.style.display = ''; if (G) G.set(el, { clearProps: 'height,opacity,overflow' }); if (then) then(); }
      if (reduce || !G) { end(); return; }
      G.to(el, { height: 0, opacity: 0, overflow: 'hidden', duration: .35, ease: 'power2.inOut', onComplete: end });
    }

    function needed(step) { return [].slice.call(step.querySelectorAll('[required], [data-needs-field], [data-required]')); }
    function filled(f) { return f.value.trim() !== '' && (f.type === 'hidden' || f.checkValidity()); }
    function valid(step) { return needed(step).every(filled); }
    function update() {
      var done = 0;
      steps.forEach(function (s) {
        var ok = shown(s) && valid(s);
        on(s.querySelector('.apf_num'), 'is-on', ok);
        on(s.querySelector('.apf_check'), 'is-on', ok);
        if (ok) done++;
      });
      var last = steps.filter(shown).pop();
      steps.forEach(function (s) { on(s, 'is-current', s === last); });
      if (fill) fill.style.height = (done / steps.length * 100) + '%';
      if (count) count.textContent = done + '/' + steps.length;
      on(sendBtn, 'is-secondary', !steps.every(valid));
    }
    function open(step) {
      show(step);
      if (step === steps[steps.length - 1]) setTimeout(function () { show(sendRow); }, reduce ? 0 : 260);
    }
    // The next step opens by itself: once a step is complete and the hand pauses, or leaves the field. A step that needs
    // nothing (budget and timing) opens together with the one after it
    var PAUSE = 900, pauseTimer;
    function openAfter(step) {
      if (!valid(step)) return;
      var i = steps.indexOf(step), next = steps[i + 1];
      if (!next || shown(next)) return;
      open(next);
      if (!needed(next).length && steps[i + 2]) setTimeout(function () { open(steps[i + 2]); update(); }, reduce ? 0 : 180);
      update();
    }
    form.addEventListener('input', function (e) {
      update();
      var s = e.target.closest('[data-step]');
      clearTimeout(pauseTimer);
      if (s) pauseTimer = setTimeout(function () { openAfter(s); }, PAUSE);
    });
    form.addEventListener('change', update);
    form.addEventListener('focusout', function (e) { var s = e.target.closest('[data-step]'); if (s) openAfter(s); });
    // The picks, chips and calendar are role=button blocks: Enter and Space press them
    form.addEventListener('keydown', function (e) {
      var b = e.target.closest('[role="button"]');
      if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); b.click(); }
    });

    // What you need
    function pressed(b) { return b.getAttribute('aria-pressed') === 'true'; }
    function press(b, yes) { b.setAttribute('aria-pressed', yes ? 'true' : 'false'); on(b, 'is-on', yes); on(b.querySelector('.apf_pick_box'), 'is-on', yes); }
    function tell(el) { el.dispatchEvent(new Event('input', { bubbles: true })); }
    var needsBox = form.querySelector('[data-needs]');
    if (needsBox) {
      var needsField = form.querySelector('[data-needs-field]');
      var needs = [].slice.call(needsBox.querySelectorAll('[data-need]'));
      needsBox.addEventListener('click', function (e) {
        var b = e.target.closest('[data-need]');
        if (!b) return;
        var yes = !pressed(b);
        if (yes) needs.forEach(function (x) { if (x !== b && (b.hasAttribute('data-alone') || x.hasAttribute('data-alone'))) press(x, false); });
        press(b, yes);
        var chosen = needs.filter(pressed).map(function (x) { return x.dataset.need; });
        needsField.value = chosen.join(', ');
        form.querySelectorAll('[data-more]').forEach(function (more) {
          if (chosen.indexOf(more.dataset.more) >= 0) slideOpen(more, 'flex');
          else slideShut(more, function () {
            more.querySelectorAll('[data-val]').forEach(function (x) { press(x, false); });
            more.querySelectorAll('[data-pick-field]').forEach(function (f) { f.value = ''; });
          });
        });
        tell(b);
      });
    }
    form.querySelectorAll('[data-one], [data-many]').forEach(function (group) {
      var single = group.hasAttribute('data-one');
      var field = group.parentNode.querySelector('[data-pick-field]');
      group.addEventListener('click', function (e) {
        var b = e.target.closest('[data-val]');
        if (!b) return;
        var yes = !pressed(b);
        if (single) group.querySelectorAll('[data-val]').forEach(function (x) { press(x, false); });
        else if (yes) group.querySelectorAll('[data-val]').forEach(function (x) { if (x !== b && (b.hasAttribute('data-alone') || x.hasAttribute('data-alone'))) press(x, false); });
        press(b, yes);
        if (field) field.value = [].slice.call(group.querySelectorAll('[aria-pressed="true"]')).map(function (x) { return x.dataset.val; }).join(', ');
        tell(b);
      });
    });

    // Budget
    var bw = form.querySelector('[data-budget]');
    if (bw) {
      var range = bw.querySelector('[data-budget-range]'), amount = bw.querySelector('[data-budget-amount]');
      var bubble = bw.querySelector('[data-budget-bubble]'), bfield = bw.querySelector('[data-budget-field]');
      var bfill = bw.querySelector('[data-budget-fill]'), thumb = bw.querySelector('[data-budget-thumb]');
      var ticks = [].slice.call(bw.querySelectorAll('.apf_tick'));
      var min = +range.min, max = +range.max;
      function pct(v) { return (v - min) / (max - min) * 100; }
      ticks.forEach(function (t, i) {
        var first = i === 0, last = i === ticks.length - 1;
        t.style.left = pct(+t.dataset.v) + '%';
        t.style.transform = first ? 'none' : last ? 'translateX(-100%)' : 'translateX(-50%)';
        t.style.alignItems = first ? 'flex-start' : last ? 'flex-end' : 'center';
      });
      function eur(n) { return '€' + Number(n).toLocaleString(lang); }
      function label(v) { return eur(v) + (v >= max ? '+' : ''); }
      var shownV = { v: +range.value };
      function draw() { var v = +range.value, top = v >= max && Math.abs(shownV.v - v) < 1; amount.textContent = eur(Math.round(shownV.v / 50) * 50) + (top ? '+' : ''); }
      function paint() {
        var v = +range.value, p = pct(v) + '%';
        bfill.style.width = p; thumb.style.left = p; bubble.style.left = p;
        bubble.textContent = label(v); bfield.value = label(v);
      }
      // The amount glides to where the handle is and lands without a bump
      function glide() {
        if (reduce || !G) { shownV.v = +range.value; draw(); return; }
        G.to(shownV, { v: +range.value, duration: .55, ease: 'expo.out', overwrite: true, onUpdate: draw, onComplete: draw });
      }
      range.addEventListener('input', function () { paint(); glide(); });
      function drag(yes) { on(thumb, 'is-drag', yes); on(bubble, 'is-drag', yes); }
      range.addEventListener('pointerdown', function () { drag(true); });
      rdOn(window, 'pointerup', function () { drag(false); });
      rdOn(window, 'pointercancel', function () { drag(false); });
      paint(); draw();
    }

    // Date
    var dw = form.querySelector('[data-date]');
    if (dw) {
      var trig = dw.querySelector('[data-date-trigger]'), panel = dw.querySelector('[data-date-panel]');
      var valEl = dw.querySelector('[data-date-value]'), dfield = dw.querySelector('[data-date-field]');
      var monthsEl = dw.querySelector('[data-cal-months]'), prev = dw.querySelector('[data-cal-prev]'), next = dw.querySelector('[data-cal-next]');
      var clr = dw.querySelector('[data-date-clear]');
      var chips = [].slice.call(dw.querySelectorAll('[data-quick]')), modes = [].slice.call(dw.querySelectorAll('[data-mode]'));
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var view = new Date(today.getFullYear(), today.getMonth(), 1), mode = 'Start', picked = null, txt = '', quick = '';
      var empty = valEl.textContent.trim() || 'Pick a date'; // the Designer's own line ("Kies een datum" on /nl, via data-nl)
      function long(d) { return d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }); }
      function write() {
        valEl.textContent = txt || empty;
        on(valEl, 'is-set', !!txt);
        clr.style.display = txt ? 'flex' : '';
        dfield.value = txt ? mode + ': ' + txt : '';
        chips.forEach(function (c) { on(c, 'is-on', !!quick && c.dataset.quick === quick); });
        update();
      }
      function month(first, second) {
        var box = document.createElement('div'); box.className = 'apf_month' + (second ? ' is-second' : '');
        var name = document.createElement('p'); name.className = 'apf_month_label';
        name.textContent = first.toLocaleDateString(lang, { month: 'long', year: 'numeric' }); box.appendChild(name);
        var week = document.createElement('div'); week.className = 'apf_cal_week'; week.setAttribute('aria-hidden', 'true');
        (nl ? 'MDWDVZZ' : 'MTWTFSS').split('').forEach(function (l) { var s = document.createElement('span'); s.className = 'apf_wd'; s.textContent = l; week.appendChild(s); });
        box.appendChild(week);
        var grid = document.createElement('div'); grid.className = 'apf_cal_grid';
        var lead = (first.getDay() + 6) % 7; // Monday first
        for (var i = 0; i < lead; i++) grid.appendChild(document.createElement('span'));
        var days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        for (var d = 1; d <= days; d++) {
          var date = new Date(first.getFullYear(), first.getMonth(), d), b = document.createElement('div');
          b.className = 'apf_day'; b.textContent = d; b.setAttribute('role', 'button'); b.setAttribute('aria-label', long(date)); b.dataset.time = +date;
          if (date < today) { b.classList.add('is-off'); b.setAttribute('aria-disabled', 'true'); } else b.tabIndex = 0;
          if (+date === +today) b.classList.add('is-today');
          if (picked && +date === +picked) b.classList.add('is-on');
          grid.appendChild(b);
        }
        box.appendChild(grid);
        return box;
      }
      function render() {
        on(prev, 'is-off', view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth());
        monthsEl.innerHTML = '';
        monthsEl.appendChild(month(view));
        monthsEl.appendChild(month(new Date(view.getFullYear(), view.getMonth() + 1, 1), true));
      }
      function calOpen() { return panel.style.display === 'block'; }
      // Opening: the panel unfolds to full width, then the days settle in, row by row
      function openCal() {
        if (calOpen()) return;
        if (picked) view = new Date(picked.getFullYear(), picked.getMonth(), 1);
        render();
        panel.style.display = 'block';
        on(trig, 'is-open', true); trig.setAttribute('aria-expanded', 'true');
        if (reduce || !G) return;
        G.fromTo(panel, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .55, ease: 'power3.out', clearProps: 'height' });
        G.fromTo(panel.querySelectorAll('.apf_cal_top, .apf_month_label, .apf_cal_week, .apf_day'), { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: .45, ease: 'power2.out', stagger: { each: .006 }, delay: .12, clearProps: 'opacity,transform' });
      }
      function closeCal() {
        if (!calOpen()) return;
        on(trig, 'is-open', false); trig.setAttribute('aria-expanded', 'false');
        if (reduce || !G) { panel.style.display = ''; return; }
        G.to(panel, { height: 0, opacity: 0, duration: .35, ease: 'power2.inOut', onComplete: function () { panel.style.display = ''; G.set(panel, { clearProps: 'height,opacity' }); } });
      }
      trig.addEventListener('click', function () { if (calOpen()) closeCal(); else openCal(); });
      prev.addEventListener('click', function () { if (prev.classList.contains('is-off')) return; view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
      next.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
      monthsEl.addEventListener('click', function (e) {
        var b = e.target.closest('.apf_day');
        if (!b || b.classList.contains('is-off')) return;
        picked = new Date(+b.dataset.time); txt = long(picked); quick = '';
        render(); write();
        setTimeout(closeCal, reduce ? 0 : 220); // let the pick be seen
      });
      chips.forEach(function (c) { c.addEventListener('click', function () { picked = null; quick = c.dataset.quick; txt = c.textContent.trim() || quick; render(); write(); setTimeout(closeCal, reduce ? 0 : 220); }); });
      modes.forEach(function (m) { m.addEventListener('click', function () { mode = m.dataset.mode; modes.forEach(function (x) { on(x, 'is-on', x === m); }); write(); }); });
      clr.addEventListener('click', function () { picked = null; txt = ''; quick = ''; write(); closeCal(); });
      rdOn(document, 'pointerdown', function (e) { if (!dw.contains(e.target)) closeCal(); });
      rdOn(document, 'keydown', function (e) { if (e.key === 'Escape') closeCal(); });
    }

    // Sending. This listener runs before Webflow's own (Webflow listens on the document)
    var done = block.querySelector('.w-form-done'), fail = block.querySelector('.w-form-fail');
    var gone = [], swooshEnd = 0;
    form.addEventListener('submit', function (e) {
      // No Webflow form handler (its bundle still loading): never the browser's own submit, that reloads the page and
      // puts every answer in the address bar
      var wf = window.Webflow && Webflow.require && Webflow.require('forms');
      if (!wf) { e.preventDefault(); e.stopPropagation(); return; }
      var missing = steps.filter(function (s) { return !valid(s); })[0];
      if (missing) {
        e.preventDefault(); e.stopPropagation();
        steps.forEach(open);
        update();
        var f = needed(missing).filter(function (x) { return !filled(x); })[0];
        window.scrollTo({ top: missing.getBoundingClientRect().top + window.scrollY - 120, behavior: reduce ? 'auto' : 'smooth' });
        if (f && f.type !== 'hidden') f.focus({ preventScroll: true });
        return;
      }
      if (fill) fill.style.height = '100%';
      if (count) count.textContent = steps.length + '/' + steps.length;
      gone = [head].concat(steps, [sendRow]).filter(Boolean);
      if (reduce || !G) return;
      swooshEnd = Date.now() + 700 + 70 * gone.length;
      G.to(gone, { y: -64, opacity: 0, filter: 'blur(6px)', duration: .7, ease: 'power3.in', stagger: .07 });
    });
    // The thank-you: the paper plane (Rimbo's pick, 2026-11-10; lab prototype/apply/thanks.js). The drawing is the
    // apf_fx element in the success message (an SVG: a sheet, two folds, the plane, the whoosh, the trail). A sheet pops in
    // where the title will be, folds into the plane, which loops once and flies off the top right on a dotted trail that
    // wipes itself; then the words fade up. Stop-motion: moves are set 12 times a second, the lines boil 9 times a
    // second (the noise seed changes), like button 06
    function words() { return done.querySelectorAll('.apf_done_in > *'); }
    function fadeWords() { G.fromTo(words(), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .09 }); }
    function plane() {
      var fx = done.querySelector('[data-fx-plane]'), title = done.querySelector('.apf_title'), svg = fx && fx.querySelector('svg');
      if (!svg || !title) { fadeWords(); return; }
      var pl = svg.querySelector('[data-plane]'), trail = svg.querySelector('[data-trail]'), mask = svg.querySelector('[data-trail-mask]');
      var maskBox = svg.querySelector('mask'), noise = svg.querySelector('[data-boil-noise]'), puff = svg.querySelector('[data-puff]'), frames = {};
      [].forEach.call(svg.querySelectorAll('[data-frame]'), function (f) { frames[f.getAttribute('data-frame')] = f; });
      G.set(words(), { opacity: 0 });
      fx.style.display = 'block';
      var box = svg.getBoundingClientRect(), w = box.width, h = box.height, r = title.getBoundingClientRect();
      var cx = r.left - box.left + r.width / 2, cy = r.top - box.top + r.height / 2;
      var U = Math.min(w * .5, 460), S = Math.max(1, Math.min(1.6, w / 800));
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      maskBox.setAttribute('x', 0); maskBox.setAttribute('y', 0); maskBox.setAttribute('width', w); maskBox.setAttribute('height', h);
      function P(x, y) { return (cx + x * U).toFixed(1) + ' ' + (cy + y * U).toFixed(1); }
      // Forward with a little dip, up and back over the top, down through and forward again, then off the top right
      var d = 'M' + P(0, 0) + ' C' + P(.25, .14) + ' ' + P(.55, .14) + ' ' + P(.68, -.08) + ' C' + P(.78, -.38) + ' ' + P(.38, -.5) + ' ' + P(.36, -.24) +
        ' C' + P(.34, -.02) + ' ' + P(.62, .06) + ' ' + P(.8, -.14) + ' C' + P(.95, -.32) + ' ' + P(1.05, -.62) + ' ' + (w + 140) + ' -140';
      trail.setAttribute('d', d); mask.setAttribute('d', d);
      var L = trail.getTotalLength();
      function at(p) {
        var l = Math.max(0, Math.min(L, p * L)), a = trail.getPointAtLength(Math.max(0, l - 2)), b = trail.getPointAtLength(Math.min(L, l + 2)), c = trail.getPointAtLength(l);
        return { x: c.x, y: c.y, r: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
      }
      var H = at(0).r, hx = Math.cos(H * Math.PI / 180), hy = Math.sin(H * Math.PI / 180);
      pl.setAttribute('stroke-width', (1.5 / S).toFixed(3)); // the lines stay 1.5px at any size
      puff.setAttribute('stroke-width', (1.5 / S).toFixed(3));
      puff.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') rotate(' + H + ') scale(' + S + ')');
      function frame(name) { for (var k in frames) frames[k].setAttribute('display', k === name ? 'inline' : 'none'); }
      function put(x, y, rot, s) { pl.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(1) + ') scale(' + (s * S).toFixed(3) + ')'); }
      function trailFrom(a, b) { a = Math.max(0, a) * L; b = Math.max(a, Math.min(1, b) * L); mask.setAttribute('stroke-dasharray', '0 ' + a.toFixed(1) + ' ' + (b - a).toFixed(1) + ' ' + (L + 20).toFixed(1)); }
      trailFrom(0, 0);
      var POP = [.45, 1.14, .94, 1], FLY = 1.25, DUR = 1.75, TAIL = .3, wordsIn = false, seed = 0, start = null, last = -1;
      function ease(x) { return x * .55 + x * x * .45; } // thrown: off at once, a little faster as it goes
      function step(t) {
        puff.setAttribute('display', t >= FLY && t < FLY + .25 ? 'inline' : 'none');
        if (t < .5) { frame('sheet'); put(cx, cy, 0, t < .34 ? POP[Math.min(3, Math.floor(t * 12))] : 1); } // pops in, sits a beat
        else if (t < .67) { frame('fold1'); put(cx, cy, 0, t < .58 ? 1.06 : 1); }                          // every fold lands with a bounce
        else if (t < .84) { frame('fold2'); put(cx, cy, 0, t < .75 ? 1.06 : 1); }
        else if (t < .92) { frame('fold2'); put(cx, cy, (H + 90) * .5, 1); }                                // turns to where it'll fly
        else if (t < FLY) {                                                                                  // nose up, pulls back, and...
          frame('plane');
          if (t < 1) put(cx, cy, H, 1); else if (t < 1.08) put(cx, cy, H - 12, 1); else put(cx - hx * 9, cy - hy * 9, H - 5, 1);
        } else if (t < FLY + DUR) {                                                                          // ...goes
          var p = ease((t - FLY) / DUR), a = at(p);
          frame('plane'); put(a.x, a.y, a.r, 1); trailFrom(p - TAIL, p);
          if (p > .72 && !wordsIn) { wordsIn = true; fadeWords(); }
        } else {                                                                                             // gone: the trail's tail catches up
          frame(null);
          if (!wordsIn) { wordsIn = true; fadeWords(); }
          var k = (t - FLY - DUR) / .35;
          if (k >= 1) { trailFrom(0, 0); fx.style.display = ''; return false; }
          trailFrom(1 - TAIL + TAIL * k, 1);
        }
      }
      requestAnimationFrame(function loop(now) {
        if (start === null) start = now;
        var raw = (now - start) / 1000, f = Math.floor(raw * 12), s = 1 + Math.floor(raw * 9) % 3;
        if (s !== seed) { seed = s; noise.setAttribute('seed', s); }                                       // the boil
        if (f !== last) { last = f; if (step(f / 12) === false) return; }
        requestAnimationFrame(loop);
      });
    }

    // Webflow shows its success message straight away; it waits here until the swoosh is through, then fades up
    if (done) new MutationObserver(function () {
      if (done.style.display !== 'block' || done.dataset.shown) return;
      done.dataset.shown = '1';
      if (!reduce && G) G.set(words(), { opacity: 0 }); // never seen before the plane has flown
      var wait = Math.max(0, swooshEnd - Date.now());
      if (wait) { done.style.display = 'none'; form.style.display = 'flex'; }
      setTimeout(function () {
        form.style.display = 'none';
        if (head) head.style.display = 'none';
        done.style.display = 'block';
        window.scrollTo(0, 0);
        if (!reduce && G) plane();
      }, wait + 150);
    }).observe(done, { attributes: true, attributeFilter: ['style'] });
    // An error: everything comes back as it was
    if (fail) new MutationObserver(function () {
      if (fail.style.display !== 'block') return;
      if (G) G.to(gone, { y: 0, opacity: 1, filter: 'blur(0px)', duration: .5, ease: 'power2.out', clearProps: 'transform,opacity,filter' });
      update();
    }).observe(fail, { attributes: true, attributeFilter: ['style'] });

    update();
  }

  // The thank-you says their first name, on its own line under "Thank you": the name element (apf_name inside the
  // success title, shown by its combo is-on) gets the first word of the Name field when the form is sent. Once the title
  // has faded up, the letters stamp in one by one in stop-motion (12 a second, a little pop and tilt each), boil a
  // moment like button 06, and settle. A name too wide for the screen at the title's size is left out.
  function rdApplyName() {
    var form = document.querySelector('[data-apply-form]'), title = document.querySelector('.w-form-done .apf_title');
    var nameEl = title && title.querySelector('.apf_name');
    if (!form || !nameEl) return;
    var reduce = reducedMotion;
    var base = [].filter.call(title.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join('').trim();
    var letters = [], started = false;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function fits(word) {
      var probe = document.createElement('span');
      probe.className = 'apf_title';
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;display:inline-block';
      probe.textContent = word;
      document.body.appendChild(probe);
      var ok = probe.offsetWidth <= form.parentElement.clientWidth;
      probe.remove();
      return ok;
    }
    form.addEventListener('submit', function () {
      var f = form.querySelector('[name="Name"]'), first = f ? f.value.trim().split(/\s+/)[0] : '';
      if (first && first === first.toLowerCase()) first = first.charAt(0).toUpperCase() + first.slice(1);
      if (first && !fits(first)) first = '';
      var still = reduce; // without the fade-up there's nothing to wait for: the name just stands there
      nameEl.classList.toggle('is-on', !!first);
      nameEl.setAttribute('aria-hidden', 'true');
      title.setAttribute('aria-label', first ? base + ', ' + first : base);
      nameEl.textContent = '';
      started = still;
      letters = first.split('').map(function (ch) {
        var s = document.createElement('span');
        s.textContent = ch;
        s.style.cssText = 'display:inline-block;transform-origin:50% 60%;' + (still ? '' : 'visibility:hidden');
        nameEl.appendChild(s);
        return s;
      });
    });
    // The title fades up (rdApply's thank-you); when it's nearly in, the letters stamp in
    new MutationObserver(function () {
      if (started || !letters.length || parseFloat(title.style.opacity || '0') < .85) return;
      started = true;
      stamp(letters);
    }).observe(title, { attributes: true, attributeFilter: ['style'] });
    function stamp(ls) {
      var poses = ls.map(function () { return [0, 1, 2].map(function () { return [rnd(-1.2, 1.2), rnd(-1.4, 1.4), rnd(-3.5, 3.5)]; }); });
      var tilt = ls.map(function () { return rnd(5, 10) * (Math.random() < .5 ? -1 : 1); });
      var t0 = null, last = -1, END = ls.length + 16; // one letter per frame, then about 1.2 s of boil
      function set(el, x, y, r, s) { el.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + r.toFixed(2) + 'deg) scale(' + s + ')'; }
      requestAnimationFrame(function loop(now) {
        if (t0 === null) t0 = now;
        var ms = now - t0, f = Math.floor(ms / 1000 * 12), b = Math.floor(ms / 1000 * 9);
        if (f !== last) {
          last = f;
          if (f >= END) { ls.forEach(function (el) { el.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; }); return; }
          ls.forEach(function (el, i) {
            var age = f - i;
            if (age < 0) return;
            el.style.visibility = '';
            if (age === 0) set(el, 0, -6, tilt[i], 1.3);          // it lands: big, tilted
            else if (age === 1) set(el, 0, 1, -tilt[i] * .4, .94); // a squash the other way
            else { var p = poses[i][(b + i) % 3]; set(el, p[0], p[1], p[2], 1); } // then it boils
          });
        }
        requestAnimationFrame(loop);
      });
    }
  }

  // Demo link, staging only: /apply?demo (or ?thanks) plays a send and the thank-you without sending anything.
  // It fills the form with a sample (name: Rimbo), lets the page's own submit run (the swoosh), stops the event before
  // Webflow's handler (so nothing is sent), then shows the success message the way Webflow does. Reload to see it again.
  // Never runs on rimbodesigns.com.
  function rdApplyDemo() {
    if (!/[?&](demo|thanks)\b/.test(location.search) || !/\.webflow\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) return;
    var form = document.querySelector('[data-apply-form]'), done = document.querySelector('.w-form-done');
    if (!form || !done || !form.requestSubmit) return;
    form.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); });
    setTimeout(function () {
      form.querySelectorAll('[required]').forEach(function (f) { f.value = f.type === 'email' ? 'sample@example.com' : f.name === 'Name' ? 'Rimbo' : 'Sample'; });
      var needs = form.querySelector('[data-needs-field]'); if (needs) needs.value = 'Website';
      form.querySelectorAll('[data-required]').forEach(function (f) { if (!f.value) f.value = 'Sample'; });
      form.querySelectorAll('[data-step], [data-send-row]').forEach(function (s) { s.classList.remove('is-later'); });
      form.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(function () {
        form.requestSubmit();
        setTimeout(function () { form.style.display = 'none'; done.style.display = 'block'; }, 400);
      }, 900);
    }, 800);
  }

  // WORK WALL (home, section .wh_sec; lab prototype/work-highlights, Rimbo's settings of 2026-11-17). The look is the
  // Designer's wh_* classes: lanes of work covers on a tilted wall, a veil over it, a dashed ring, the site's button in the
  // middle. This only moves things: every lane drifts up or down at its own pace (its covers are copied until the lane can
  // never run out), a clear circle in the veil follows the pointer (and wanders by itself without one), and the button
  // leans towards the pointer. The numbers sit on the section: data-wh-speed (px a second), data-wh-spread (how far the
  // lanes' paces lie apart, 0 to 100), data-wh-lens (the circle's radius in px). It runs only while the section is on screen.
  // No work twice on screen (tidy): a cover that is out of sight and about to come in takes a work that is not on the wall
  // at that moment, so the works in the Designer's lanes are a pool, not a fixed order. Add works by adding covers.
  function rdWorkWall() {
    qsa('.wh_sec').forEach(function (sec) {
      if (!sec.getClientRects().length) return;
      var ring = qs('.wh_ring', sec), cta = qs('.wh_cta', sec);
      var speed = parseFloat(sec.getAttribute('data-wh-speed')), spread = parseFloat(sec.getAttribute('data-wh-spread')), lensR = parseFloat(sec.getAttribute('data-wh-lens'));
      if (isNaN(speed)) speed = 8; if (isNaN(spread)) spread = 66; if (isNaN(lensR)) lensR = 295;
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      function pic(c) { return c.tagName === 'IMG' ? c : qs('img', c); }
      var lanes = qsa('.wh_lane', sec).map(function (lane, i) {
        var track = qs('.wh_track', lane);
        if (!track) return null;
        var set = [].slice.call(track.children);
        return { lane: lane, track: track, set: set, n: set.length, work: set.map(function (c) { var m = pic(c); return m ? m.getAttribute('src') : ''; }), copies: 1, pos: i * 173 % 600, dir: i % 2 ? -1 : 1, f: ((i * 0.618034 + 0.31) % 1) - 0.5, len: 0 };
      }).filter(Boolean);
      var pool = [], used = {};
      lanes.forEach(function (o) { o.work.forEach(function (w) { if (w && pool.indexOf(w) < 0) pool.push(w); }); });
      var W = 1, H = 1;
      function measure() {
        W = sec.offsetWidth || 1; H = sec.offsetHeight || 1;
        lanes.forEach(function (o) {
          o.len = 0;
          if (!o.lane.offsetHeight || !o.set.length) return; // a lane the layout hides (the outer two on a phone)
          var gap = parseFloat(getComputedStyle(o.track).rowGap) || 0, one = (o.track.scrollHeight + gap) / o.copies;
          if (!(one > 0)) return;
          var need = Math.min(8, Math.ceil(o.lane.offsetHeight / one) + 1);
          for (; o.copies < need; o.copies++) o.set.forEach(function (c) { var k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); o.track.appendChild(k); });
          o.len = one;
        });
      }
      function place(o) {
        var p = ((o.pos % o.len) + o.len) % o.len;
        o.track.style.transform = 'translate3d(0,' + (o.dir > 0 ? -p : p - o.len).toFixed(2) + 'px,0)';
      }
      // tidy(free): free = the wall itself is out of sight, so the covers on it may change too (the start)
      function tidy(free) {
        if (pool.length < 2) return;
        var sr = sec.getBoundingClientRect(), near = sr.height * 0.7, seen = {}, cand = [];
        lanes.forEach(function (o) {
          if (!o.len) return;
          for (var j = 0; j < o.n; j++) {
            if (!o.work[j]) continue;
            var vis = false, d = 1e9, at = null;
            for (var c = 0; c < o.copies; c++) {
              var el = o.track.children[j + c * o.n]; if (!el) continue;
              var r = el.getBoundingClientRect(), mid = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
              if (r.bottom > sr.top && r.top < sr.bottom && r.right > sr.left && r.left < sr.right) { vis = true; at = mid; }
              else { var g = Math.max(sr.top - r.bottom, r.top - sr.bottom, sr.left - r.right, r.left - sr.right); if (g < d && !vis) { d = g; at = mid; } }
            }
            if (vis && !free) (seen[o.work[j]] = seen[o.work[j]] || []).push(at);
            else if (vis || d < near) cand.push({ o: o, j: j, d: vis ? -1 : d, at: at });
          }
        });
        function far(w, at) { var m = 1e9; (seen[w] || []).forEach(function (q) { m = Math.min(m, Math.abs(q.x - at.x) + Math.abs(q.y - at.y)); }); return m; }
        cand.sort(function (a, b) { return a.d - b.d; });
        cand.forEach(function (k) {
          var w = k.o.work[k.j], pick = null, best = Infinity, mine = far(w, k.at);
          if (mine < 1e9) {
            pool.forEach(function (q) { if (!seen[q] && (used[q] || 0) < best) { best = used[q] || 0; pick = q; } }); // a work that is not on the wall: the one shown longest ago
            if (!pick) { best = mine * 1.5; pool.forEach(function (q) { var f = far(q, k.at); if (f > best) { best = f; pick = q; } }); } // more covers than works: the one whose twin is clearly further away
            if (pick) {
              for (var c = 0; c < k.o.copies; c++) { var m = pic(k.o.track.children[k.j + c * k.o.n]); if (m) { m.removeAttribute('srcset'); m.removeAttribute('sizes'); m.setAttribute('src', pick); } }
              k.o.work[k.j] = w = pick; used[pick] = performance.now();
            }
          }
          (seen[w] = seen[w] || []).push(k.at);
        });
      }
      measure();
      lanes.forEach(function (o) { if (o.len) place(o); });
      tidy(true);
      new ResizeObserver(measure).observe(sec);

      var px = 0.5, py = 0.5, has = false, lx = 0.5, ly = 0.5, mx = 0, my = 0, tx = 0, ty = 0, t0 = performance.now();
      function move(e) {
        var r = sec.getBoundingClientRect(); px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height; has = true;
        if (cta && fine) {
          var b = cta.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2 - mx), dy = e.clientY - (b.top + b.height / 2 - my);
          if (Math.sqrt(dx * dx + dy * dy) < Math.max(200, b.width * 1.2)) { tx = dx * 0.3; ty = dy * 0.3; } else { tx = ty = 0; }
        }
        wake();
      }
      function leave() { has = false; tx = ty = 0; }
      rdOn(sec, 'pointermove', move); rdOn(sec, 'pointerleave', leave); rdOn(sec, 'pointerup', function (e) { if (e.pointerType === 'touch') leave(); }); rdOn(sec, 'pointercancel', leave);

      // the notch tabs on its edges drift only while they are near the screen (as on the ball's sheet)
      var edges = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-on', e.isIntersecting); }); }, { rootMargin: '-1px 0px' });
      qsa('.nt_edge', sec).forEach(function (e) { edges.observe(e); });

      var on = false, raf = 0, last = 0, tidied = 0;
      function wake() { if (!raf && on && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
      new IntersectionObserver(function (es) { on = es[0].isIntersecting; wake(); }).observe(sec);
      rdOn(document, 'visibilitychange', wake);
      function frame(now) {
        raf = 0;
        if (!sec.isConnected || !on || document.hidden) return;
        raf = requestAnimationFrame(frame);
        var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now;
        if (!reducedMotion) lanes.forEach(function (o) {
          if (!o.len) return;
          o.pos += speed * (1 + o.f * spread / 50) * dt;
          place(o);
        });
        if (now - tidied > 600) { tidied = now; tidy(false); }
        var gx = px, gy = py;
        if (!has) { var s = (now - t0) / 1000; gx = reducedMotion ? 0.5 : 0.5 + Math.sin(s * 0.45) * 0.3; gy = reducedMotion ? 0.5 : 0.5 + Math.sin(s * 0.7) * 0.2; }
        lx += (gx - lx) * 0.1; ly += (gy - ly) * 0.1;
        sec.style.setProperty('--r', Math.min(lensR, W * 0.45).toFixed(0) + 'px');
        sec.style.setProperty('--lx', (lx * 100).toFixed(2) + '%'); sec.style.setProperty('--ly', (ly * 100).toFixed(2) + '%');
        if (ring) ring.style.transform = 'translate3d(' + (lx * W).toFixed(1) + 'px,' + (ly * H).toFixed(1) + 'px,0)';
        if (cta) { mx += (tx - mx) * 0.12; my += (ty - my) * 0.12; cta.style.translate = mx.toFixed(2) + 'px ' + my.toFixed(2) + 'px'; }
      }
    });
  }

  // =========================================================
  // IMAGINE — the big ball and the word on the home (section.im_sheet [data-im="sheet"], classes im_*; the approved lab is
  // prototype/service-imagine/ball.*, round 2 "magic", default path only; it came over from the service page 2026-11-15).
  // Everything you see is Designer elements + classes; the states and the build are in the section's own embed. This only
  // paints and moves:
  // 1. THE LIVING WORD. ONE canvas, ONE WebGL context paints the ball AND the letters of IMAGINE (the site's ball shader, same
  //    grain, same four colours). The letters come from a text mask: the real <h2> is measured letter by letter and drawn on
  //    a 2D canvas the shader reads; the <h2> stays in the page, see-through (search, screen readers). The letters show the
  //    ball mixed with a second, livelier view of it, deeper in light, so the word always reads.
  // 2. THE BUILD = the service hero ball's (its order and curves, mirrored because this ball stands on its line): cross
  //    > radius out, the number counting > the dashed ring sweeps round > the colour BLOOMS from the middle > cross and
  //    radius fade > tick. The word draws its outline, fills, the outline goes; last beat: one light passes through it.
  // 3. THE POINTER = the hero ball's heat spot on the ball; the letters stay deep under it (home ball lab 2026-11-15). A box
  //    001-004 under the ruler ([data-im="part"], Rimbo's row of boxes) lights its share of the word (warm rose, never white,
  //    no outline: 001 = I+M, 002 = A, 003 = G+I, 004 = N+E) and gets is-hot. Touch: a tap is a light for a moment.
  //    Scrolling makes the colours move a little faster.
  // 4. The section's notch tabs drift only while they are near the screen.
  // 5. THE STORY under the boxes: its words light up on scroll and stay read (imStory, at the end).
  // Weight: the canvas is made the first time the poster is near and draws ONLY while it is on screen (30 draws a second;
  // every frame only during the 3 s bloom), listeners only while on screen, and the page leaving gives the WebGL context back.
  // A hidden copy starts nothing: display none is skipped, and no WebGL is made while the section is visibility hidden (also
  // the moment a page transition still fades the page in). Reduced motion: the still image and solid ink, no build.
  // =========================================================
  function rdImagine() {
    var sheet = qsa('[data-im="sheet"]').filter(function (el) { return el.getClientRects().length; })[0]; // a copy set to display none is skipped
    if (!sheet || sheet.dataset.on) return;
    sheet.dataset.on = '1';
    imStory();
    var NS = 'http://www.w3.org/2000/svg';
    var FRAG = "#version 300 es\nprecision highp float;\n" +
      "uniform vec2 res; uniform vec2 center; uniform float R; uniform float seed; uniform float bias; uniform float grainScale; uniform float t;\n" +
      "uniform vec3 stops[4]; uniform vec2 edges[3]; uniform sampler2D mask; uniform vec2 word;\n" +
      "uniform float reveal; uniform float disc; uniform float fill;\n" +
      "uniform vec2 ptr; uniform float ptrR; uniform float lit[8]; uniform float ptrAmt; uniform float push; uniform float pull; uniform float ptrTo;\n" +
      "uniform float lMix; uniform float lInk; uniform float lBias; uniform float lSpan; uniform float swirl; uniform float glow; uniform float lSharp;\n" +
      "out vec4 outColor;\nconst vec3 INK = vec3(0.0745);\n" +
      "float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
      "float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);\n" +
      "  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }\n" +
      "float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }\n" +
      "float s2(float x) { return x <= 0.0031308 ? x * 12.92 : 1.055 * pow(max(x, 0.0), 1.0 / 2.4) - 0.055; }\n" +
      "vec3 fromLab(vec3 c) {\n" +
      "  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.291485548 * c.z;\n" +
      "  l = l * l * l; m = m * m * m; s = s * s * s;\n" +
      "  return vec3(s2(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), s2(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), s2(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));\n}\n" +
      // d = how deep: the same four colours with less light (in OKLab, so they stay colours and do not turn to mud)
      "vec3 ramp(float v, float d) { vec3 c = stops[0]; for (int i = 0; i < 3; i++) c = mix(c, stops[i + 1], smoothstep(edges[i].x, edges[i].y, v)); c.x *= 1.0 - d; return fromLab(c); }\n" +
      // the ball's colour field (the site's ball shader, unchanged), as a function so the letters can look at it from elsewhere
      "float field(vec2 l, float h, float tt) {\n" +
      "  float ang = h * 6.2831 + tt * 0.16;\n  float g = 0.53 + 0.14 * dot(l, vec2(cos(ang), sin(ang)));\n" +
      "  vec2 drift = vec2(sin(tt * 0.34 + h * 6.2831), cos(tt * 0.27 + h * 12.566)) * 0.62;\n" +
      "  vec2 w = vec2(fbm(l * 0.55 + h * 40.0 + drift), fbm(l * 0.55 + h * 70.0 + 5.2 - drift));\n" +
      "  return g + (fbm(l * 1.0 + w * 1.3 + h * 90.0) - 0.5) * 1.5;\n}\n" +
      "vec3 shade(float v, float g1, float grain, float d) { vec3 c = ramp(clamp(v, 0.0, 1.0), d) + grain; return clamp(mix(c, ramp(clamp(v + (g1 - 0.5) * 0.18, 0.0, 1.0), d) + grain, 0.35), 0.0, 1.0); }\n" +
      "void main() {\n  vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);\n  vec2 l = (p - center) / R;\n" +
      "  float r = length(l), aa = 1.2 / R;\n" +
      // the letters: coverage from the text mask (its red says which letter this is), filled left to right
      "  vec4 mk = texture(mask, p / res); float cov = mk.a;\n" +
      "  float xn = clamp((p.x - word.x) / max(word.y, 1.0), 0.0, 1.0);\n" +
      "  float la = cov * smoothstep(0.0, 1.0, (fill - xn * 0.375) / 0.625);\n" +
      "  float edge = smoothstep(1.0 + aa, 1.0 - aa, r), da = disc * edge;\n" +
      "  if (da <= 0.0 && la <= 0.0) { outColor = vec4(0.0); return; }\n" +
      "  vec2 gp = floor(p / grainScale);\n  float g1 = hash(gp + seed), g2 = noise(gp * 0.9 + seed * 3.0);\n" +
      "  float grain = (g1 - 0.5) * 0.20 + (g2 - 0.5) * 0.07;\n  float h = hash(vec2(seed));\n" +
      // the pointer: the hero ball's heat spot (push)
      "  float dp = length(p - ptr) / max(ptrR, 1.0), k = ptrAmt * exp(-dp * dp);\n" +
      "  float fb = field(l, h, t);\n  float v = fb + bias + push * k;\n" +
      // how the colour comes in: the hero ball's bloom (an organic edge that grows from the middle and settles)
      "  float e = reveal * 1.35, wob = (fbm(l * 2.2 + h * 30.0 + t * 0.15) - 0.5) * 0.55 * (1.0 - reveal * 0.6);\n" +
      "  float m = smoothstep(e, e - 0.18, r + wob) * smoothstep(0.0, 0.06, reveal);\n" +
      "  da *= m;\n  vec3 o = shade(v, g1, grain, 0.0) * da; float a = da;\n" +
      "  if (la > 0.0) {\n" +
      // the ball itself seen through the letters, mixed (lMix) with a second, livelier view of the same field that twists a
      // little around the pointer, and deeper (lInk) so the word always reads. The light goes letter by letter (lit[], set
      // below): a whole letter is deep or lit, never half. A lit letter takes the warm end of the four colours, no outline
      // (home ball lab, 2026-11-15: Rimbo found the ink hairline round a lit letter corny)
      "    float vl = fb, kl = mix(k, lit[int(clamp(floor(mk.r * 8.0), 0.0, 7.0))] * edge, lSharp);\n" +
      "    if (lMix > 0.0) { vec2 d = (p - ptr) / R; float th = swirl * k, cs = cos(th), sn = sin(th);\n" +
      "      vl = mix(fb, field((l + vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs) - d) * 1.7, fract(h + 0.37), t * 1.9 + 11.0), lMix); }\n" +
      "    vl = mix((vl - 0.5) * lSpan + 0.5 + lBias, ptrTo, pull * kl);\n" +
      // the letters never go red: they keep to the steel and sand half of the four colours (Rimbo 2026-11-17: no red text)
      "    vl = max(vl, 0.45);\n" +
      "    vec3 lc = shade(vl, g1, grain * (1.0 - 0.5 * lInk), lInk * (1.0 - glow * kl) - 0.08 * kl * lSharp);\n" +
      "    lc = mix(INK, lc, m);\n" +
      "    o = lc * la + o * (1.0 - la); a = la + a * (1.0 - la);\n  }\n" +
      "  outColor = vec4(o, a);\n}";
    function oklab(hex) {
      var c = [0, 2, 4].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      var l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]);
      var m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]);
      var s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
      return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
    }
    // the hero's curves: a CSS cubic-bezier as a function (its CustomEase "0.625, 0.05, 0, 1" and the bloom "0.32, 0, 0.12, 1")
    function bez(a, b, c, d) {
      return function (x) {
        if (x <= 0) return 0; if (x >= 1) return 1;
        var lo = 0, hi = 1, t = x, i, u;
        for (i = 0; i < 22; i++) { t = (lo + hi) / 2; u = 1 - t; if (3 * a * u * u * t + 3 * c * u * t * t + t * t * t < x) lo = t; else hi = t; }
        u = 1 - t; return 3 * b * u * u * t + 3 * d * u * t * t + t * t * t;
      };
    }
    var OSMO = bez(0.625, 0.05, 0, 1), BLOOM = bez(0.32, 0, 0.12, 1);
    function inOut3(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; } // GSAP power2.inOut
    function seg(T, at, dur) { return Math.min(1, Math.max(0, (T - at) / dur)); }
    // the build's beats in seconds (the hero's order): the embed's CSS carries the same numbers for the cross, the radius,
    // the label and the tick
    var NUM = 0.35, RING = 0.75, BLOOM_AT = 1.25, LIGHT = 2.65, FAST = 3.55, END = 4.3;

    // the painter: a half canvas (the part above the horizon), the ball's centre on its bottom edge
    function makeBall(cv) {
      var gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) return null;
      function sh(type, code) { var o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); return o; }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); return null; }
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      var U = {}; ['res', 'center', 'R', 'seed', 'bias', 'grainScale', 't', 'stops', 'edges', 'mask', 'word', 'reveal', 'disc', 'fill', 'ptr', 'ptrR', 'lit', 'ptrAmt', 'push', 'pull', 'ptrTo',
        'lMix', 'lInk', 'lBias', 'lSpan', 'swirl', 'glow', 'lSharp'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
      gl.uniform3fv(U.stops, new Float32Array([].concat.apply([], ['E4441C', 'E4566A', '4B7888', 'DACCAE'].map(oklab))));
      gl.uniform2fv(U.edges, new Float32Array([0.12, 0.28, 0.26, 0.46, 0.5, 0.84]));
      gl.uniform1f(U.seed, +(cv.dataset.seed || 23)); gl.uniform1f(U.bias, +(cv.dataset.bias || -0.12));
      // the text mask: empty until the word has been measured
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      gl.uniform1i(U.mask, 0); gl.clearColor(0, 0, 0, 0);
      var W = 0, H = 0, K = 1, CW = 0;
      return {
        gl: gl,
        size: function (cssW, scale) {
          var w = Math.round(cssW * scale); if (w === W) return false; W = w; K = scale; CW = cssW;
          H = Math.round(w / 2); cv.width = w; cv.height = H; gl.viewport(0, 0, w, H);
          gl.uniform2f(U.res, w, H); gl.uniform1f(U.grainScale, Math.max(1, scale * 0.75));
          return true;
        },
        mask: function (c2) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2); },
        draw: function (S) {
          gl.uniform1f(U.t, S.t); gl.uniform2f(U.center, W / 2, H * (1 + S.rise)); gl.uniform1f(U.R, CW * 0.4875 * K * S.grow);
          gl.uniform1f(U.reveal, S.reveal); gl.uniform1f(U.disc, S.disc); gl.uniform1f(U.fill, S.fill);
          gl.uniform2f(U.word, S.wx * K, S.ww * K);
          gl.uniform2f(U.ptr, S.px * K, S.py * K); gl.uniform1f(U.ptrR, S.pr * K); gl.uniform1fv(U.lit, S.lit); gl.uniform1f(U.ptrAmt, S.amt);
          gl.uniform1f(U.push, S.push); gl.uniform1f(U.pull, S.pull); gl.uniform1f(U.ptrTo, S.to);
          gl.uniform1f(U.lMix, S.lMix); gl.uniform1f(U.lInk, S.lInk); gl.uniform1f(U.lBias, S.lBias); gl.uniform1f(U.lSpan, S.lSpan);
          gl.uniform1f(U.swirl, S.swirl); gl.uniform1f(U.glow, S.glow); gl.uniform1f(U.lSharp, S.lSharp);
          gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      };
    }

    // where the letters of the <h2> really are (each engine places this font differently): x per letter, the baseline
    function measure(word, box) {
      var node = word.firstChild; if (!node || node.nodeType !== 3) return null;
      var txt = node.textContent, cs = getComputedStyle(word), br = box.getBoundingClientRect(), k = box.offsetWidth ? br.width / box.offsetWidth : 1;
      if (!(k > 0.2)) k = 1;
      var probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      word.appendChild(probe); var base = (probe.getBoundingClientRect().bottom - br.top) / k; probe.remove();
      var range = document.createRange(), out = { base: base, fs: parseFloat(cs.fontSize), font: cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily, letters: [] };
      for (var i = 0; i < txt.length; i++) {
        if (txt[i] === ' ') continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        var r = range.getBoundingClientRect();
        out.letters.push({ ch: cs.textTransform === 'uppercase' ? txt[i].toUpperCase() : txt[i], x: (r.left - br.left) / k, r: (r.right - br.left) / k });
      }
      if (!out.letters.length) return null;
      out.left = out.letters[0].x; out.width = out.letters[out.letters.length - 1].r - out.left;
      return out;
    }
    // the word's outline draws itself letter by letter (as the hero's title), then the fill takes over and the outline goes
    function drawWord(word, hero) {
      var m = measure(word, word); if (!m) { word.classList.add('is-drawn'); return; }
      var D = Math.round(m.fs * 14), svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'im_word_svg'); svg.setAttribute('aria-hidden', 'true');
      var letters = m.letters.map(function (L, i) {
        var t = document.createElementNS(NS, 'text'); t.textContent = L.ch;
        t.setAttribute('x', L.x.toFixed(2)); t.setAttribute('y', m.base.toFixed(2));
        t.style.strokeDasharray = D + ' ' + D; t.style.strokeDashoffset = D; t.style.transitionDelay = (hero ? 0.05 + i * 0.05 : i * 0.07) + 's';
        svg.appendChild(t); return t;
      });
      word.appendChild(svg);
      svg.getBoundingClientRect();
      letters.forEach(function (t) { t.style.strokeDashoffset = 0; });
      setTimeout(function () { word.classList.add('is-drawn'); svg.classList.add('is-settled'); setTimeout(function () { svg.remove(); }, 800); }, hero ? 1550 : 1300 + letters.length * 70);
    }

    var stage = qs('[data-im="stage"]', sheet), sky = qs('.im_sky', sheet), sun = qs('[data-im="sun"]', sheet), cv = qs('[data-im="ball"]', sheet),
        word = qs('[data-im="word"]', sheet), dia = qs('[data-im="dia"]', sheet), ring = qs('.im_ring', sheet), parts = qsa('[data-im="part"]', sheet);
    if (!parts.length) parts = qsa('.im_part', sheet); // the old row of parts A-D (a copy that still has it)
    var calm = reducedMotion;
    // how the letters look and answer (the lab's composition A, Rimbo's pick). glow 0.5 (was 1, home ball lab 2026-11-15):
    // without the outline a lit letter (a part's share) stays a deeper rose, so it still reads on the ball
    var LOOK = { lMix: 0.45, lInk: 0.6, lBias: 0, lSpan: 1, swirl: 1.1, glow: 0.5, disc: 1, sharp: 1, pull: 0.9, to: 0.3 };
    var S = { t: 0, rise: 0, grow: 1, reveal: 0, fill: 0, wx: 0, ww: 1, px: 0, py: 0, pr: 100, lit: new Float32Array(8), amt: 0, push: 0, pull: LOOK.pull, to: LOOK.to,
      disc: LOOK.disc, lMix: LOOK.lMix, lInk: LOOK.lInk, lBias: LOOK.lBias, lSpan: LOOK.lSpan, swirl: LOOK.swirl, glow: LOOK.glow, lSharp: LOOK.sharp };
    var label = function () { if (dia && sun) dia.textContent = 'Ø ' + Math.round(sun.clientWidth) + ' PX'; };
    label();
    if (!('IntersectionObserver' in window)) return;
    var obs = [], raf = 0, on = false, ball = null, last = 0, lastT = 0, dead = false, time = 0, inAt = 0, want = false, built = false, builtAt = 0, wordM = null, dirty = true, sweep = -1, diaT = '',
        c2 = null, near = null, waitT = 0, P = { x: 0, y: 0, tx: 0, ty: 0, target: 0, push: 0, pull: LOOK.pull, to: LOOK.to, share: -1 }, stir = 0, stirTo = 0, sy = 0, st = 0, tapT = 0, heard = false, hot = null, at = null, td = null;
    var gl = !calm && !!cv && !!sun && !!window.WebGL2RenderingContext;
    if (gl) sheet.classList.add('is-gl');

    // 4. the notch tabs of this section drift only while they are near the screen
    var edges = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-on', e.isIntersecting); }); }, { rootMargin: '-1px 0px' });
    qsa('.nt_edge', sheet).forEach(function (el) { edges.observe(el); });
    obs.push(edges);
    if ('ResizeObserver' in window && sun) { var ro = new ResizeObserver(function () { if (built || !inAt || !gl) label(); dirty = true; }); ro.observe(sun); obs.push(ro); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(inZone(function () { dirty = true; }));

    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    // no painter (no WebGL, or the context was lost): the still image and a solid ink word, at once
    function noGl() { gl = false; ball = null; stop(); hear(false); if (cv) cv.style.display = 'none'; sheet.classList.remove('is-gl'); if (sun) sun.classList.remove('is-live'); label(); if (want) { want = false; go(); } }
    // the page left (page transition, see PAGE SCOPE at the top): stop everything and give the WebGL context back
    function quit() {
      if (dead) return; dead = true; stop(); hear(false); clearTimeout(tapT); clearTimeout(waitT);
      if (ball) { var x = ball.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); cv.width = cv.height = 1; ball = null; }
      obs.forEach(function (o) { o.disconnect(); }); document.removeEventListener('visibilitychange', vis);
    }
    rdUndo(quit);

    // the text mask: the letters where the <h2> has them, in the canvas' own pixels
    function paintMask(scale) {
      var m = measure(word, sun); if (!m) return;
      c2 = c2 || document.createElement('canvas');
      if (c2.width !== cv.width || c2.height !== cv.height) { c2.width = cv.width; c2.height = cv.height; }
      var x = c2.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c2.width, c2.height); x.setTransform(scale, 0, 0, scale, 0, 0);
      x.font = m.font; x.textBaseline = 'alphabetic';
      m.letters.forEach(function (L, i) { // red = which letter
        x.fillStyle = 'rgb(' + (Math.min(i, 7) * 32 + 16) + ',255,255)'; x.fillText(L.ch, L.x, m.base);
      });
      ball.mask(c2); wordM = m; S.wx = m.left; S.ww = m.width;
    }

    // 3. the pointer
    function mark(part) { if (hot === part) return; if (hot) hot.classList.remove('is-hot'); hot = part; if (hot) hot.classList.add('is-hot'); }
    function spot(x, y) { var r = sun.getBoundingClientRect(), k = sun.offsetWidth ? r.width / sun.offsetWidth : 1; P.tx = (x - r.left) / (k || 1); P.ty = (y - r.top) / (k || 1); }
    // a light the visitor did not point: in the word only, the ball stays as it is (orange belongs to a real pointer)
    function own(x) { P.tx = x; P.ty = wordM.base - wordM.fs * 0.36; P.push = 0; P.pull = LOOK.pull; P.to = LOOK.to; P.share = -1; P.mine = true; }
    // which letters are lit: the one the light is on (and its neighbour when the light is near their gap), or a part's
    // share. Only a light of the section's own lights a letter (the build's last beat, a box 001-004): the visitor's pointer on
    // the word lights none (home ball lab, 2026-11-15: the word stays calm, the ball around it still answers)
    function lamps() {
      var n = wordM.letters.length, reach = wordM.fs * 0.27, top = wordM.base - wordM.fs * 0.74, i, L, dx, dy, hit;
      for (i = 0; i < n && i < 8; i++) {
        L = wordM.letters[i];
        if (P.share >= 0) { dx = ((L.x + L.r) / 2 - wordM.left) / wordM.width * parts.length; hit = dx >= P.share && dx < P.share + 1; }
        else if (P.mine) { dx = Math.max(L.x - P.x, 0, P.x - L.r); dy = Math.max(top - P.y, 0, P.y - wordM.base); hit = dx * dx + dy * dy < reach * reach; }
        else hit = false;
        S.lit[i] += ((hit && S.amt > 0.34 ? 1 : 0) - S.lit[i]) * 0.7;
      }
    }
    function aim(e) {
      var was = P.mine; // the build's own light was the last one
      var part = e.target.closest && e.target.closest('[data-im="part"], .im_part');
      if (part && parts.indexOf(part) < 0) part = null;
      if (part) { at = null; P.target = 0; mark(part); return; } // a box only marks itself; the word stays as it is (Rimbo 2026-11-15: lighting letters from a box felt corny)
      else { spot(e.clientX, e.clientY); P.push = -0.6; P.pull = LOOK.pull; P.to = LOOK.to; P.share = -1; P.mine = false; } // the hero ball's heat spot
      at = part ? null : { x: e.clientX, y: e.clientY };
      // the first pointer after the build: the build's own light (in the word) may still be fading out at the word's end; the
      // pointer takes over from where it is instead of gliding across the ball from there (Rimbo saw that as a glitch)
      if (P.target < 0.5 && (S.amt < 0.02 || was)) { if (was) S.amt = 0; P.x = P.tx; P.y = P.ty; S.push = P.push; S.pull = P.pull; S.to = P.to; }
      P.target = 1; mark(part || null);
    }
    function move(e) { if (e.pointerType !== 'touch') aim(e); }
    function leave() { P.target = 0; mark(null); }
    function left(e) { if (e.pointerType !== 'touch') leave(); }
    // touch: a tap is a light for a moment. It waits for the finger to lift without having moved, so a thumb that lands on
    // the poster to scroll lights nothing
    function down(e) { td = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null; }
    function up(e) {
      if (e.pointerType !== 'touch' || !td) return;
      var d = Math.abs(e.clientX - td.x) + Math.abs(e.clientY - td.y); td = null;
      if (d < 10) { aim(e); clearTimeout(tapT); tapT = setTimeout(leave, 1500); }
    }
    // scrolling makes the colours move a little faster, nothing else; a resting pointer stays where it is on the screen
    function scrolled() {
      var y = window.scrollY, n = performance.now(), v = Math.abs(y - sy) / Math.max(n - st, 8); sy = y; st = n;
      if (v < 20) stirTo = Math.max(stirTo, Math.min(1, v / 2.2));
      if (!wordM || !built) return;
      if (P.target && at) spot(at.x, at.y);
    }
    function hear(yes) {
      if (!stage || yes === heard) return; heard = yes;
      var f = yes ? 'addEventListener' : 'removeEventListener';
      stage[f]('pointermove', move); stage[f]('pointerleave', left); stage[f]('pointerdown', down); stage[f]('pointerup', up);
      window[f]('scroll', scrolled, { passive: true });
      if (yes) { sy = window.scrollY; st = performance.now(); } else { td = null; leave(); }
    }

    function frame(now) {
      raf = 0;
      if (!sheet.isConnected) { quit(); return; }
      if (!on || document.hidden || !ball) return;
      raf = requestAnimationFrame(frame);
      var dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016; lastT = now;
      stir += (stirTo - stir) * 0.1; stirTo *= 0.93;
      time += dt * (1 + stir * 2.4);
      P.x += (P.tx - P.x) * 0.12; P.y += (P.ty - P.y) * 0.12; S.amt += (P.target - S.amt) * 0.06; // the hero ball's eases
      S.push += (P.push - S.push) * 0.1; S.pull += (P.pull - S.pull) * 0.1; S.to += (P.to - S.to) * 0.1;
      var T = inAt ? (now - inAt) / 1000 : -1;
      // 30 draws a second for slow colours; every frame only while the letters fill and the colour blooms (as the hero's ball)
      if (!(inAt && !built && T > 0.7 && T < FAST) && now - last < 32) return;
      last = now;
      var w = sun.clientWidth; if (!w) return;
      var scale = Math.min(window.devicePixelRatio || 1, 1.5);
      if (ball.size(w, scale) || dirty) { dirty = false; paintMask(scale); }
      S.t = time; S.px = P.x; S.py = P.y; S.fill = 1; S.pr = Math.min(Math.max(w * 0.4875 * 0.4, 60), 160);
      // 2. the build
      if (built) { S.reveal = 1; S.rise = 0; S.grow = 1 + Math.sin((time - builtAt) * 0.37) * 0.015; } // the hero ball's slow breath, starting from the size the build ended on (it used to jump by up to 1.5% there)
      else {
        S.fill = seg(T, 0.75, 0.72); S.reveal = BLOOM(seg(T, BLOOM_AT, 1.9)); S.grow = 0.88 + 0.12 * BLOOM(seg(T, BLOOM_AT, 2.3));
        // (the build used to end with a light passing through the word; gone: Rimbo wants no highlight on the letters at all)
        var sw = inOut3(seg(T, RING, 1.4));
        if (ring && sw !== sweep) { sweep = sw; ring.style.setProperty('--im-sweep', sw.toFixed(4)); }
        var d = 'Ø ' + Math.round(w * OSMO(seg(T, NUM, 0.9))) + ' PX';
        if (dia && T >= 0 && d !== diaT) dia.textContent = diaT = d;
        if (T > END) done();
      }
      if (wordM) lamps();
      ball.draw(S);
      if (!sun.classList.contains('is-live')) sun.classList.add('is-live');
    }
    function done() { built = true; builtAt = time; sheet.classList.add('is-built'); if (ring) ring.style.removeProperty('--im-sweep'); label(); }
    function wake() { if (!raf && on && !document.hidden && ball && !dead && inAt) { lastT = 0; raf = requestAnimationFrame(frame); } } // nothing to paint before the build
    function vis() { if (!sheet.isConnected) { quit(); return; } wake(); }

    // 1. the painter: made the first time the poster is on screen and really shown, lives while it is on screen (not while
    // it only looks in at the bottom)
    function shown() { return sheet.getClientRects().length > 0 && getComputedStyle(sheet).visibility !== 'hidden'; }
    function light() {
      waitT = 0;
      if (!on || dead || !gl) return;
      if (!ball) {
        if (!shown()) { waitT = setTimeout(light, 300); return; } // hidden, or the page is still fading in: look again soon
        ball = makeBall(cv);
        if (!ball) { near.disconnect(); noGl(); return; }
        cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); if (dead) return; near.disconnect(); noGl(); });
      }
      hear(true); wake();
      if (want) { want = false; go(); } // the build waited for the painter (see ask)
    }
    if (gl) {
      near = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          on = e.isIntersecting;
          if (on) { if (!waitT) light(); } else { clearTimeout(waitT); waitT = 0; stop(); hear(false); }
        });
      }, { rootMargin: '0px 0px -24% 0px' });
      near.observe(stage); obs.push(near);
      document.addEventListener('visibilitychange', vis);
    }

    // 2. the build, once. is-go = the ball and the word start (with the painter: as soon as a third of the sky is on screen,
    // so a visitor who scrolls on still gets the colour); is-in = the ruler is on screen: the ruler and the boxes
    if (calm || !stage) return;
    sheet.classList.add('is-armed');
    // with the painter, the build never starts before the painter draws (its observer starts lower on the screen than these),
    // or a visitor who stops just there sees the build play without the ball and then the finished ball pop in
    function ask() { if (gl && !ball && !dead) { want = true; return; } go(); }
    function go() {
      if (inAt) return; inAt = performance.now(); sheet.classList.add('is-go'); if (!gl) label(); wake();
      if (word) (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(inZone(function () { if (!dead) drawWord(word, gl); }));
    }
    var io = new IntersectionObserver(function (es) {
      // also when the ruler is already above the screen (Back or a reload to a spot below it), and the boxes are watched too
      // (a jump from above the ruler straight past it never makes the ruler intersect): the boxes must never stay hidden
      es.forEach(function (e) { if (!e.isIntersecting && e.boundingClientRect.top >= 0) return; io.disconnect(); ask(); sheet.classList.add('is-in'); });
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(qs('.im_ruler', sheet) || stage); var boxes = qs('.im_boxes', sheet); if (boxes) io.observe(boxes); obs.push(io);
    if (gl && sky) {
      var early = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio >= 0.34) { early.disconnect(); ask(); } });
      }, { threshold: 0.35 });
      early.observe(sky); obs.push(early);
    }

    // 5. THE STORY under the boxes (home ball lab 2026-11-15; the service lab's lit paragraph r2-para, calm: no measures,
    // no pointer light). The words of [data-im="story"] go from faint (20% ink) to full ink as the paragraph scrolls up
    // through the screen, line by line and left to right, and stay read. The faint state exists only once this has armed
    // the sheet (is-reading), so without it, under reduced motion and in print every word is ink. The scroll listener
    // lives only while the paragraph is on screen and goes for good once every word is read.
    // LINE = the reading line, as a share of the screen's height: low (0.93), so the last word is read by the time the
    // paragraph's bottom is that far down, and a visitor who stops with the whole poster in view reads it all.
    function imStory() {
      var para = qs('[data-im="story"]', sheet);
      if (!para || reducedMotion || !('IntersectionObserver' in window)) return;
      var units = [], DIM = 0.2, LINE = 0.93, SOFT = 0.7, lh = 0, sraf = 0, over = false, follow = false, tries = 0, seen, sizes;
      try {
        (function walk(node) { // every word becomes span.im_w; the underlined phrase (wall_mark) lights as one piece
          [].slice.call(node.childNodes).forEach(function (n) {
            if (n.nodeType === 1) { if (n.classList.contains('wall_mark')) units.push({ el: n }); else walk(n); return; }
            if (n.nodeType !== 3 || !/[^ \t\r\n]/.test(n.nodeValue)) return;
            var frag = document.createDocumentFragment();
            n.nodeValue.split(/([ \t\r\n]+)/).forEach(function (part) { // a hard space keeps its two words together
              if (!part) return;
              if (/^[ \t\r\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'im_w'; w.textContent = part; frag.appendChild(w); units.push({ el: w });
            });
            n.parentNode.replaceChild(frag, n);
          });
        })(para);
      } catch (err) { return; }
      if (!units.length) return;
      // where every word sits inside the paragraph, in layout numbers (a page still scaling in a transition cannot bend them)
      function place() {
        var w = para.offsetWidth, x0 = para.offsetLeft, y0 = para.offsetTop; if (!w) return;
        lh = parseFloat(getComputedStyle(para).lineHeight) || parseFloat(getComputedStyle(para).fontSize) * 1.25;
        units.forEach(function (u) { u.cy = u.el.offsetTop - y0 + u.el.offsetHeight / 2; u.x = (u.el.offsetLeft - x0) / w; });
      }
      function paint() {
        sraf = 0;
        if (over || !para.isConnected) return;
        if (!lh) place();
        var r = para.getBoundingClientRect(), R = window.innerHeight * LINE - r.top, all = true;
        if (Math.abs(r.width - para.offsetWidth) > 1 && tries++ < 180) { tick(); return; } // still turning in a page transition
        units.forEach(function (u) {
          // a word is read once the reading line has gone down past its place: line by line, left to right in a line
          var v = (R - (u.cy - lh / 2) - u.x * lh) / (lh * SOFT);
          v = v < 0 ? 0 : v > 1 ? 1 : v;
          if (u.v > v) v = u.v; // once read, it stays read
          if (v < 1) all = false;
          if (v !== u.v) { u.v = v; u.el.style.opacity = v >= 1 ? '' : (DIM + (1 - DIM) * v).toFixed(3); }
        });
        if (all) end();
      }
      function tick() { if (!sraf && !over) sraf = requestAnimationFrame(paint); }
      function hearScroll(yes) { if (yes === follow) return; follow = yes; window[yes ? 'addEventListener' : 'removeEventListener']('scroll', tick, { passive: true }); }
      function end() { // read to the end (or the page left): nothing follows the scroll any more
        if (over) return; over = true; hearScroll(false); if (sraf) cancelAnimationFrame(sraf); sraf = 0;
        if (seen) seen.disconnect(); if (sizes) sizes.disconnect();
        units.forEach(function (u) { u.el.style.opacity = ''; }); sheet.classList.remove('is-reading');
      }
      rdUndo(end);
      units.forEach(function (u) { u.el.style.opacity = DIM; }); // armed in one go, the fades start with the first paint
      sheet.classList.add('is-reading');
      seen = new IntersectionObserver(function (es) { es.forEach(function (e) { hearScroll(e.isIntersecting); if (e.isIntersecting) tick(); }); });
      seen.observe(para);
      if ('ResizeObserver' in window) { sizes = new ResizeObserver(function () { lh = 0; tick(); }); sizes.observe(para); }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(inZone(function () { lh = 0; tick(); }));
    }
  }

  // =========================================================
  // FROM WEBFLOW — the scripts that sat in Webflow (Code Embeds, page code, the site footer), moved here 2026-11-18
  // (Rimbo: "make sure everything is in the main.js": one file, in Git, where a later clean-up can see all of it).
  // Each function below is its Webflow script word for word, only indented: nothing in what they do has changed (one fix:
  // the /contact copy button). Their CSS stays in the embeds. Tidying them into the rest of this file is a later step.
  // fromWebflow() starts them the way the site ran the Webflow copies: in the order they stood in the page, every
  // "wait for the page" (DOMContentLoaded, load) at once after the others have started, window/document listeners
  // leaving with the page. A page that still carries a Webflow copy runs that copy instead (stillInWebflow), so nothing
  // runs twice while Webflow is being updated, or if an old copy comes back.
  // New behaviour does not go in Webflow any more: write an rd* function in this file.
  // =========================================================

  // rdSvcPlaces — was: /service, embed in .svh_hold
  function rdSvcPlaces() {
    /* SERVICE HERO: THE FIRST BAND'S PLACES. Everything in the band is placed from measured lines, in band px:
       --svh-ex = the E's line, --svh-fl / --svh-fr = the left / right frame line, --svh-rt = the ruler's bottom line.
       Sub-pixel, from screen positions minus the guide's own build move (GSAP x) and divided by any page scale (the cube).
       New since the hero shrinks (2026-11-12): the places follow the hero's height, so the ruler numbers and the top pluses
       stay on the ruler while the hero eases to 80svh. Lets go when the hero leaves the page. */
    (function () {
      var hero = document.querySelector('.sv_hero'), band = document.querySelector('[data-svh="band"]');
      var guide = hero && hero.querySelector('.svh_gv.is-right'), ruler = hero && hero.querySelector('.sv_ruler');
      var nums = band && band.querySelectorAll('[data-svh="nums"] > *');
      if (!band || !guide || band.dataset.placed) return; band.dataset.placed = '1';
      var ro = null, io = null;
      function place() {
        if (!hero.isConnected) { window.removeEventListener('resize', place); if (ro) ro.disconnect(); if (io) io.disconnect(); return; }
        var br = band.getBoundingClientRect(), k = band.offsetWidth ? br.width / band.offsetWidth : 1;
        if (k < 0.2) k = 1;
        var moved = window.gsap ? (parseFloat(gsap.getProperty(guide, 'x')) || 0) : 0, hr = hero.getBoundingClientRect();
        var fl = (hr.left - br.left) / k - 0.5, fr = (hr.right - br.left) / k;
        band.style.setProperty('--svh-ex', ((guide.getBoundingClientRect().left - br.left) / k - moved).toFixed(2) + 'px');
        band.style.setProperty('--svh-fl', fl.toFixed(2) + 'px');
        band.style.setProperty('--svh-fr', fr.toFixed(2) + 'px');
        if (ruler) band.style.setProperty('--svh-rt', ((ruler.getBoundingClientRect().bottom - br.top) / k - 0.5).toFixed(2) + 'px');
        // the numbers: the distance of each major tick from the left frame line, in px
        if (nums) for (var i = 1; i < nums.length; i++) { var t = String(Math.round(i * (fr - fl) / nums.length)); if (nums[i].textContent !== t) nums[i].textContent = t; }
      }
      place();
      hero.addEventListener('svh:play', function () { place(); setTimeout(place, 900); });
      window.addEventListener('resize', place);
      if (window.ResizeObserver) { ro = new ResizeObserver(place); ro.observe(hero); }
      if (window.IntersectionObserver) { io = new IntersectionObserver(function (es) { band.classList.toggle('is-off', !es[0].isIntersecting); }); io.observe(band); }
    })();
  }

  // rdSvcPin — was: /service, embed in .svh_hold
  function rdSvcPin() {
    /* SERVICE HERO: PINNED + SHRINK. It only changes --svh-p, the hero's height (100svh, down to 80svh).
       - Nobody scrolls: 4.9 s after the hero's 'svh:play' (half a second after the ball has filled, 2026-11-18) the hero eases down in 1.3 s.
       - Somebody scrolls first: the scroll itself takes the hero down, 1 svh for every svh scrolled, until it is at 80svh.
         Nothing moves that the visitor did not move (before 2026-11-14 a scroll started a timed 0.9 s shrink: a 50 px
         scroll threw the next section 26svh up, Rimbo's "it jumps there"). It never grows back: scrolling up again
         leaves the hero where it got to, and back at the very top after the wait the timed ease finishes the rest.
       - Touch screens (2026-11-18): a finger moves the page 1 to 1, so the hero never shrinks under it (it made the
         next section run 2.5 times as fast as the finger on an iPhone, Rimbo's "awkward first scroll"). There only the
         timed ease runs, at the very top, and a scroll that starts during it stops it where it is. No scroll correction
         either: that breaks the swipe's momentum.
       - Reduced motion, or a load deep in the page: 80svh at once, with the scroll corrected so nothing moves on screen.
       Follows the build after a page transition too (it waits for 'svh:play', and ignores scrolls while the cube rolls).
       Stops when the hero leaves the page. */
    (function () {
      var hero = document.querySelector('.sv_hero'), wrap = hero && hero.closest('.sv_wrap'), hold = hero && hero.closest('.svh_hold'), pin = hero && hero.closest('.svh_pin');
      if (!hero || !wrap || !hold || !pin || hero.dataset.pin) return; hero.dataset.pin = '1';

      var FULL = 100, GIVE = 20, WAIT = 4.9;
      var given = 0, waited = false, tween = null, idle = 0, onLenis = null;
      var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
      function settle() { if (window.lenis && window.lenis.resize) window.lenis.resize(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }
      function stop() {
        window.removeEventListener('scroll', follow);
        if (onLenis && window.lenis && window.lenis.off) window.lenis.off('scroll', onLenis);
        onLenis = null;
      }
      // the hero gives way by v svh; it only ever goes down. The page is measured again once it rests
      function give(v) {
        v = Math.min(GIVE, v); if (v <= given) return;
        given = v; wrap.style.setProperty('--svh-p', (FULL - given) + 'svh');
        clearTimeout(idle); idle = setTimeout(settle, given >= GIVE ? 120 : 300);
        if (given >= GIVE) stop();
      }
      // out of sight, or no motion wanted: be small at once and keep what the visitor is looking at where it is
      function jump() {
        var next = hold.nextElementSibling, covered = hold.getBoundingClientRect().bottom <= 0;
        var before = next ? next.getBoundingClientRect().top : 0; give(GIVE);
        var d = next ? next.getBoundingClientRect().top - before : 0;
        if (covered && d) { var y = window.scrollY + d; if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); }
      }
      function ease() {
        if (given >= GIVE || tween) return;
        if (!window.gsap) { give(GIVE); return; }
        var o = { v: given }, curve = window.CustomEase ? CustomEase.create('svhShrink', '0.625, 0.05, 0, 1') : 'expo.inOut';
        tween = gsap.to(o, { v: GIVE, duration: 1.3, ease: curve, onUpdate: function () { give(o.v); } });
      }
      function follow() {
        if (!hero.isConnected || given >= GIVE) { stop(); return; }
        if (document.querySelector('.page-transition__stage')) return; // not while the cube is rolling
        if (touch) {
          if (window.scrollY > 4) { if (tween) { tween.kill(); tween = null; clearTimeout(idle); idle = setTimeout(settle, 300); } }
          else if (waited) ease();
          return;
        }
        if (hold.getBoundingClientRect().bottom <= 0) { jump(); return; }
        var y = window.scrollY, svh = pin.offsetHeight / (FULL - given); // one svh in px
        if (y > 4) give(y / svh);
        else if (waited) ease();
      }
      if (calm) { give(GIVE); return; }
      window.addEventListener('scroll', follow, { passive: true });
      // with the smooth scroll, in the same frame as the scroll itself (the window's own event comes a frame later)
      if (window.lenis && window.lenis.on) { onLenis = follow; window.lenis.on('scroll', onLenis); }
      follow(); // a reload that comes back scrolled
      function after() { if (waited) return; waited = true; if (hero.isConnected && window.scrollY <= 4) ease(); }
      hero.addEventListener('svh:play', function () { setTimeout(after, WAIT * 1000); });
      setTimeout(after, 12000); // the build never started: do not stay full for ever
    })();
  }

  // rdSvcMap — was: /service, embed in #map
  function rdSvcMap() {
    /* THE MAP: the one effect. The orange dashed route draws itself down the map with the scroll,
       a small square runs at its head, and each place it passes turns orange. The look is all classes (mp_*); this only
       moves the line. Light: a scroll listener that exists only while the section is on screen, and a frame loop that
       stops as soon as the line has caught up. Reduced motion or no script: the whole route is simply drawn. */
    (function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); })(function () {
      var sec = document.querySelector('[data-mp="map"]');
      if (!sec || sec.dataset.on) return;
      sec.dataset.on = '1';
      // the notch tabs: every edge on the page drifts only while it is on screen
      var edges = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-on', e.isIntersecting); }); }, { rootMargin: '-1px 0px' }) : null;
      if (edges) [].forEach.call(document.querySelectorAll('.nt_edge'), function (el) { edges.observe(el); });
      // the page left (page transition): let everything go
      window.__mpQuit = function () { if (!sec.isConnected) { if (edges) edges.disconnect(); if (typeof stop === 'function') stop(); window.__mpQuit = null; } };
      if (window.barba && window.barba.hooks && !window.__mpHook) { window.__mpHook = 1; window.barba.hooks.after(function () { if (window.__mpQuit) window.__mpQuit(); }); }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var HEAD = 0.72;                         // the line's head sits at 72% of the screen height
      var mq = window.matchMedia('(max-width: 991px)');
      var pins = [].slice.call(sec.querySelectorAll('[data-mp-pin]')), runner = sec.querySelector('[data-mp="runner"]');
      var S = null, cur = 0, tgt = 0, raf = 0, live = false, t = 0;

      function centre(el, box) { var r = el.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; }

      function setup() {
        var svg = sec.querySelector('.mp_routes.' + (mq.matches ? 'is-phone' : 'is-desk')), box = svg.getBoundingClientRect(), k = 1, sx = 1;
        if (mq.matches) {
          // one line down the left rail, then a turn into the summit; measured off the pins so it always meets them
          var a = centre(pins[0], box), z = centre(pins[pins.length - 1], box);
          var turn = Math.max(a[1], pins[pins.length - 1].closest('.mp_peak').getBoundingClientRect().top - box.top + 8);   // the turn starts where the summit's own block starts
          var d = 'M' + a[0] + ' ' + a[1] + 'V' + turn + 'C' + a[0] + ' ' + (turn + (z[1] - turn) * .92) + ' ' + (a[0] + (z[0] - a[0]) * .4) + ' ' + z[1] + ' ' + z[0] + ' ' + z[1];
          svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
          [].forEach.call(svg.querySelectorAll('[data-mp-d]'), function (p) { p.setAttribute('d', d); });
        } else { k = svg.viewBox.baseVal.height / box.height; sx = box.width / svg.viewBox.baseVal.width; }
        var route = svg.querySelector('[data-mp="route"]'), len = route.getTotalLength(), N = 260, ys = [], i;
        for (i = 0; i <= N; i++) ys.push(route.getPointAtLength(len * i / N).y);
        function at(y) {                       // route length at a height (the route only ever goes down)
          if (y <= ys[0]) return 0; if (y >= ys[N]) return len;
          var lo = 0, hi = N; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ys[m] <= y) lo = m; else hi = m; }
          return len * (lo + (y - ys[lo]) / ((ys[hi] - ys[lo]) || 1)) / N;
        }
        var mask = svg.querySelector('[data-mp="mask"]');
        mask.style.strokeDasharray = len + ' ' + len;
        S = { svg: svg, k: k, sx: sx, len: len, at: at, route: route, mask: mask,
              stops: pins.map(function (p) { return at(centre(p, box)[1] * k) - 1; }) };
        draw(cur = Math.min(cur, len));
      }

      function draw(l) {
        S.mask.style.strokeDashoffset = S.len - l;
        var p = S.route.getPointAtLength(l);
        runner.style.transform = 'translate(' + (p.x * S.sx).toFixed(1) + 'px,' + (p.y / S.k).toFixed(1) + 'px)';
        for (var i = 0; i < pins.length; i++) pins[i].classList.toggle('is-on', l >= S.stops[i]);
      }
      function frame() {
        raf = 0;
        cur += (tgt - cur) * .16; if (Math.abs(tgt - cur) < .6) cur = tgt;
        draw(cur);
        if (cur !== tgt && live) raf = requestAnimationFrame(frame);
      }
      function goal() { return S.at((window.innerHeight * HEAD - S.svg.getBoundingClientRect().top) * S.k); }
      function onScroll() {
        if (!sec.isConnected) return stop();   // the page was swapped (page transition): let go
        tgt = goal();
        if (!raf) raf = requestAnimationFrame(frame);
      }
      function onResize() { clearTimeout(t); t = setTimeout(function () { if (!sec.isConnected) return stop(); setup(); onScroll(); }, 150); }
      function stop() { live = false; window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); if (io) io.disconnect(); }

      sec.classList.add('is-live');
      setup();
      var io = new IntersectionObserver(function (e) {
        live = e[0].isIntersecting;
        if (live) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }
        else { window.removeEventListener('scroll', onScroll); cur = tgt = goal(); draw(cur); }   // off screen: settle at once, nothing left running
      }, { rootMargin: '10% 0px' });
      io.observe(sec);
      window.addEventListener('resize', onResize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (sec.isConnected) { setup(); onScroll(); } });
    });
  }

  // rdSvcMapLive — was: /service, embed in #map
  function rdSvcMapLive() {
    /* THE MAP: contour lines that move. One WebGL canvas under the map draws the terrain as contour lines of a slow
       noise field; the summit is a hill of firmer lines (no colour fill since 2026-11-16), and the red echo runs out
       through the lines when the route arrives. Light: draws about 30 times a second and only while the map is on screen, only the rows near the screen, and gives
       its context back when the page leaves. Reduced motion: one still frame. No WebGL: the still images stay. */
    (function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); })(function () {
      var sec = document.querySelector('[data-mp="map"]'), cv = sec && sec.querySelector('[data-mp="live"]');
      if (!sec || !cv || cv.dataset.on) return; cv.dataset.on = '1';
      var map = cv.parentNode, peakPin = sec.querySelector('.mp_pin.is-peak');
      var SPEED = 0.6, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
      if (!gl) return;
      var FRAG = "#version 300 es\nprecision highp float;\n" +
        "uniform vec2 res; uniform float unit; uniform vec2 peak; uniform float t; uniform float px; uniform float front; uniform float amt; uniform float notch; uniform float cut;\nout vec4 outColor;\n" +
        "float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
        "vec2 grad(vec2 i) { float a = hash(i) * 6.2831853; return vec2(cos(a), sin(a)); }\n" +
        "float gn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);\n" +
        "  return mix(mix(dot(grad(i), f), dot(grad(i + vec2(1, 0)), f - vec2(1, 0)), u.x), mix(dot(grad(i + vec2(0, 1)), f - vec2(0, 1)), dot(grad(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y); }\n" +
        "float fbm(vec2 p) { return gn(p) + 0.42 * gn(p * 2.07 + 17.1) + 0.16 * gn(p * 4.3 + 5.7); }\n" +
        "const vec3 INK = vec3(0.0745); const vec3 PAPER = vec3(0.973, 0.961, 0.933); const vec3 ORANGE = vec3(0.894, 0.267, 0.110);\n" +
        "vec3 band(float i) {\n" +
        "  if (i < 1.0) return vec3(0.855, 0.800, 0.682); if (i < 2.0) return vec3(0.690, 0.702, 0.643); if (i < 3.0) return vec3(0.522, 0.604, 0.596);\n" +
        "  if (i < 4.0) return vec3(0.294, 0.471, 0.533); if (i < 5.0) return vec3(0.569, 0.447, 0.494); if (i < 6.0) return vec3(0.843, 0.365, 0.431);\n" +
        "  return vec3(0.894, 0.267, 0.110); }\n" +
        // one notch of the top edge: 1 inside the cut (a trapezoid, a..b wide at the top, 22px slanted sides), soft over a pixel
        "float tab(float u, float y, float a, float b) { return clamp(min(u - a - y, b - y - u) * 0.7071 + 0.5, 0.0, 1.0); }\n" +
        "void main() {\n" +
        "  vec2 c = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / px;          // css px, y down\n" +
        "  vec2 p = c / unit, d = (c - peak) / unit;\n" +
        "  vec2 q = p * 2.1;\n" +
        "  vec2 w = vec2(gn(q * 0.55 + vec2(3.1, t * 0.021)), gn(q * 0.55 + vec2(t * 0.017, 8.4)));\n" +
        "  float n = fbm(q + w * 0.9 + vec2(t * 0.008, -t * 0.006));             // about -1..1\n" +
        // the hill is a living shape, not a drawn ellipse: it flows like the lines around it, more the further from the top,
        // and stays put under the square at the end of the route
        "  float cs = 0.951, sn = -0.309; vec2 e0 = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs) / vec2(0.138, 0.096);\n" +
        "  d += w * 0.085 * smoothstep(0.0, 1.6, length(e0));\n" +
        "  vec2 e = vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs) / vec2(0.138, 0.096);\n" +
        "  float hill = exp(-dot(e, e) * 0.9) + 0.22 * exp(-dot(e, e) * 0.07);   // the top, and a wide low skirt so the lines around it ring the top too\n" +
        "  float h = 0.26 + 0.20 * n + 0.80 * hill;\n" +
        "  float L = h * 40.0, fw = max(fwidth(L), 1e-4);                         // fw = levels per device pixel (how steep it is here)\n" +
        // three weights of line, as on a drawn map: every third line is an index line, the two between are lighter, and a
        // hairline runs along the uphill side of each index line. d* = distance to that line in device pixels.
        "  float s3 = (fract(L / 3.0 - 0.5) - 0.5) * 3.0;                        // signed levels from the nearest index line\n" +
        "  float dI = abs(s3) / fw, dM = abs(fract(L - 0.5) - 0.5) / fw, dH = abs(s3 - 0.34) / fw;\n" +
        "  float cI = 1.0 - smoothstep(0.50 * px - 0.6, 0.50 * px + 0.6, dI);    // about 1 css px\n" +
        "  float cM = 1.0 - smoothstep(0.28 * px - 0.6, 0.28 * px + 0.6, dM);    // about half that\n" +
        "  float cH = 1.0 - smoothstep(0.16 * px - 0.55, 0.16 * px + 0.55, dH);  // a hair\n" +
        "  float calm = 1.0 - smoothstep(0.10, 0.30, fw * px);                    // where it gets steep the fine lines step back, so nothing clots\n" +
        "  float air = 0.72 + 0.28 * gn(p * 1.7 + vec2(9.3, t * 0.01));          // ink that is not the same strength everywhere\n" +
        "  float bi = floor((L - 27.0) / 3.0);\n" +
        "  vec4 o = vec4(0.0);\n" +
        // the echo: a front that runs out from the end. Sharp at its leading edge, a soft tail behind, fading with distance
        // (front = a height level that runs downhill, so it lights the map's own lines one after another)
        "  float sd = L - front;\n" +
        "  float wv = amt * smoothstep(-0.5, 0.0, sd) * (1.0 - smoothstep(0.0, 4.5, sd)) * (1.0 - smoothstep(5.5, 9.5, length(e)));\n" +
        // 2026-11-16: no colour fill (his pick, lab map-plain.html): the hill is only its lines, firmer on every step up
        "  float on = bi >= 0.0 ? min(1.2 + bi * 0.32, 3.4) : 1.0;\n" +
        "  float la = max(cI * 0.25, max(cM * 0.125 * calm, cH * 0.085 * calm)) * air * on;\n" +
        "  float cW = 1.0 - smoothstep(0.62 * px - 0.6, 0.62 * px + 0.6, dM);     // the echo draws every line a little firmer\n" +
        "  vec3 lc = mix(INK, ORANGE, clamp(wv * 1.7, 0.0, 1.0)); float a = min(1.0, max(la, cW * wv * 0.9));\n" +
        // under the pinned hero the top 22px is a row of cut notches. The canvas draws those paper teeth itself (the
        // Designer band steps back), so the contour lines run on into the teeth instead of stopping in a straight line
        "  float teeth = cut * step(c.y, 22.0);\n" +
        "  if (teeth > 0.5) o = vec4(PAPER, 1.0);\n" +
        "  o = vec4(o.rgb * o.a * (1.0 - a) + lc * a, o.a + a * (1.0 - o.a));\n" +
        "  if (teeth > 0.5) { float u = mod(c.x - notch, 2220.0); o *= 1.0 - max(max(tab(u, c.y, 0.0, 430.0), tab(u, c.y, 640.0, 890.0)), max(tab(u, c.y, 1100.0, 1620.0), tab(u, c.y, 1830.0, 2010.0))); }\n" +
        "  outColor = o;\n}";
      function sh(type, code) { var o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn('map contours:', gl.getShaderInfoLog(o)); return o; }
      var prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      var U = {}; ['res', 'unit', 'peak', 't', 'px', 'front', 'amt', 'notch', 'cut'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
      gl.clearColor(0, 0, 0, 0); gl.enable(gl.SCISSOR_TEST);
      // right under the pinned hero the top edge is a real cut (the hero shows through): the canvas draws that edge
      var cut = !!(sec.previousElementSibling && sec.previousElementSibling.classList.contains('svh_hold'));
      gl.uniform1f(U.cut, cut ? 1 : 0);

      var W = 0, H = 0, K = 1, raf = 0, on = false, dead = false, last = 0, t0 = performance.now(), first = true;
      function size() {
        var w = map.clientWidth, h = map.clientHeight; if (!w || !h) return false;
        var k = Math.min(window.devicePixelRatio || 1, 2); if (w * h * k * k > 6e6) k = Math.sqrt(6e6 / (w * h));   // sharp enough for fine lines, capped
        if (w === W && h === H && k === K) return true;
        W = w; H = h; K = k; cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U.res, cv.width, cv.height); gl.uniform1f(U.px, k);
        gl.uniform1f(U.unit, Math.min(Math.max(w, 700), 1600));
        var m = map.getBoundingClientRect(), pk = peakPin.getBoundingClientRect();
        gl.uniform2f(U.peak, pk.left + pk.width / 2 - m.left, pk.top + pk.height / 2 - m.top);
        first = true; return true;
      }
      function draw(time) {
        if (!size()) return;
        // only the rows on or near the screen (the rest keeps its last frame)
        var r = map.getBoundingClientRect(), top = first ? 0 : Math.max(0, -r.top - 260), bot = first ? H : Math.min(H, innerHeight - r.top + 260);
        if (bot <= top) return;
        gl.scissor(0, Math.round((H - bot) * K), cv.width, Math.round((bot - top) * K));
        gl.uniform1f(U.t, time); gl.uniform1f(U.notch, calm ? 0 : performance.now() / 1000 * 18.5 % 2220); gl.uniform1f(U.front, echo.front); gl.uniform1f(U.amt, echo.amt); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (first) { first = false; sec.classList.add('is-contour'); }
      }
      // the echo starts the moment the route reaches the end (map.js turns the end's pin on), and is ready again once the
      // visitor has scrolled back before it
      var ECHO = 3400, echo = { front: 0, amt: 0, t0: -1, there: false };
      function echoStep(now) {
        var there = peakPin.classList.contains('is-on');
        if (there && !echo.there) echo.t0 = now;
        echo.there = there;
        if (echo.t0 < 0) { echo.amt = 0; return; }
        var k = (now - echo.t0) / ECHO;
        if (k >= 1) { echo.t0 = -1; echo.amt = 0; return; }
        echo.front = 53 - 44 * (1 - Math.pow(1 - k, 1.35)); echo.amt = Math.min(1, (1 - k) * 3);
      }
      function frame(now) {
        raf = 0;
        if (!sec.isConnected) { quit(); return; }
        if (!on || document.hidden) return;
        raf = requestAnimationFrame(frame);
        if (now - last < 32) return; last = now;
        echoStep(now);
        draw((now - t0) / 1000 * SPEED);
      }
      function wake() { if (!raf && on && !document.hidden && !dead && !calm) raf = requestAnimationFrame(frame); }
      function still() { first = true; draw(0); }
      function quit() {
        if (dead) return; dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; io.disconnect();
        window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', wake);
        var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); cv.width = cv.height = 1;
      }
      var rt = 0;
      function onResize() { clearTimeout(rt); rt = setTimeout(function () { if (!sec.isConnected) return quit(); W = 0; if (calm) still(); else { first = true; wake(); } }, 150); }
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); sec.classList.remove('is-contour'); dead = true; });
      var io = new IntersectionObserver(function (es) { on = es[0].isIntersecting; if (on) { if (calm) still(); else wake(); } }, { rootMargin: '15% 0px' });
      io.observe(sec);
      window.addEventListener('resize', onResize); document.addEventListener('visibilitychange', wake);
      window.__mpLiveQuit = function () { if (!sec.isConnected) { quit(); window.__mpLiveQuit = null; } };
      if (window.barba && window.barba.hooks && !window.__mpLiveHook) { window.__mpLiveHook = 1; window.barba.hooks.after(function () { if (window.__mpLiveQuit) window.__mpLiveQuit(); }); }
    });
  }

  // rdSvcMapHold — was: /service, embed in #map
  function rdSvcMapHold() {
    /* THE MAP holds still while the next section slides in over it (SERVICE PAGE chat 2026-11-17, his ask).
       Once the map's bottom edge reaches the bottom of the screen, the map's content (mp_map) is moved down exactly as far
       as the page scrolls, so it stands still; the section itself keeps scrolling and clips it, so How it goes and the
       notched edge travel up over a map that doesn't move. data-mp-hold on the section sets how still: 1 = stands still
       (default), 0.5 = moves at half speed, 0 = off. Laptop and up only (touch scrolling can't keep it steady), not with
       reduced motion. It follows Lenis's own scroll so the map never trembles; without Lenis it follows the page scroll. */
    (function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); })(function () {
      var sec = document.querySelector('[data-mp="map"]'), map = sec && sec.querySelector('.mp_map');
      if (!sec || !map || sec.dataset.hold) return; sec.dataset.hold = '1';
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var mq = window.matchMedia('(min-width: 992px)'), k = parseFloat(sec.getAttribute('data-mp-hold')), last = 0, L = null, io;
      if (isNaN(k)) k = 1;
      function set() {
        if (!sec.isConnected) return stop();
        if (window.lenis !== L) hook();
        var d = mq.matches ? Math.min(Math.max(window.innerHeight - sec.getBoundingClientRect().bottom, 0), window.innerHeight) * k : 0;
        if (d === last) return; last = d;
        map.style.transform = d ? 'translate3d(0,' + d.toFixed(2) + 'px,0)' : '';
      }
      function hook() { if (window.lenis && window.lenis !== L && window.lenis.on) { if (L && L.off) L.off('scroll', set); L = window.lenis; L.on('scroll', set); } }
      function stop() { window.removeEventListener('scroll', set); window.removeEventListener('resize', set); if (L && L.off) L.off('scroll', set); if (io) io.disconnect(); }
      io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { hook(); set(); } }, { rootMargin: '10% 0px' });
      io.observe(sec);
      window.addEventListener('scroll', set, { passive: true });
      window.addEventListener('resize', set);
      set();
    });
  }

  // rdHowItGoes — was: /service, embed in #how
  function rdHowItGoes() {
    /* 03 HOW IT GOES (How it goes chat, lab prototype/service-process, Rimbo's pick: orange dashed + zoom, 2026-11-10).
       Lives in this embed, inside its own section, so the page code other chats edit can't drop it.
       The look is the Designer's hw_* classes; this only moves it. p = 0..1 over the pinned hold: the words travel in from
       the right, an orange dashed line draws each letter, they fill on the logo edge, then we fly into the last word (SCALE's C since 2026-11-16).
       2026-11-15 (SERVICE PAGE chat): Strategy, Identity, Build, Launch with their deliverables as boxes (option A, lab how-a.html);
       each word draws by where it is on screen, the first from nothing as the section arrives.
       F0 = where the travel starts: -0.6 puts BRAND on screen, already drawing, when the section arrives (was -1.25, an empty first screen; SERVICE PAGE chat 2026-11-11).
       Light: SVG letters built once; one frame loop that runs only while the section is on screen and catching up. */
    (function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); })(function () {
      var sec = document.querySelector('[data-hw="section"]');
      if (!sec || sec.dataset.on) return;
      sec.dataset.on = '1';
      var NS = 'http://www.w3.org/2000/svg', CREAM = '248,245,238', LINE = '228,68,28', LINE_A = .9, F0 = -0.6, id = 0, tag = Math.random().toString(36).slice(2, 7); // tag: mask ids stay unique while two pages share the cube
      var strip = sec.querySelector('.hw_strip'), next = sec.querySelector('.hw_next');
      var fill = sec.querySelector('.hw_fill'), dot = sec.querySelector('.hw_dot'), ticks = sec.querySelector('.hw_ticks');
      var ones = [].slice.call(sec.querySelectorAll('.hw_one')), words = [], majors = [], ps = 0;
      ones.forEach(function (one) { [].forEach.call(one.querySelectorAll('.hw_part'), function (b, i) { b.style.setProperty('--i', i); }); });   // A: the stagger order
      function clamp(v, a, b) { a = a || 0; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); }
      function sm(a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); }

      function build(h3) {
        var text = h3.textContent.trim().toUpperCase(), ctx = document.createElement('canvas').getContext('2d');
        ctx.font = '900 100px IntegralNEW';
        var m = ctx.measureText(text), asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent, pad = 4, x = 0;
        var svg = document.createElementNS(NS, 'svg'), defs = document.createElementNS(NS, 'defs');
        svg.appendChild(defs);
        function mk(ch) { var t = document.createElementNS(NS, 'text'); t.setAttribute('y', 0); t.setAttribute('font-family', 'IntegralNEW'); t.setAttribute('font-weight', 900); t.setAttribute('font-size', 100); t.textContent = ch; return t; }
        var letters = text.split('').map(function (ch) {
          var adv = ctx.measureText(ch).width, t = mk(ch), ln = mk(ch), mt = mk(ch), mask = document.createElementNS(NS, 'mask'), mid = 'hwm' + tag + (++id);
          [t, ln, mt].forEach(function (e) { e.setAttribute('x', x); });
          mask.setAttribute('id', mid); mask.setAttribute('maskUnits', 'userSpaceOnUse');
          // the mask covers only its own letter (it was 2000 x 400 units per letter: 26 word-wide masks redrawn every frame)
          mask.setAttribute('x', x - 12); mask.setAttribute('y', -asc - pad - 12); mask.setAttribute('width', adv + 24); mask.setAttribute('height', asc + desc + pad * 2 + 24);
          mt.setAttribute('fill', 'none'); mt.setAttribute('stroke', '#fff'); mask.appendChild(mt); defs.appendChild(mask);
          ln.setAttribute('fill', 'none'); ln.setAttribute('stroke', 'rgb(' + LINE + ')'); ln.setAttribute('mask', 'url(#' + mid + ')');
          t.setAttribute('stroke', 'none');
          var l = { ch: ch, t: t, ln: ln, mt: mt, x: x, adv: adv, L: 2.8 * (adv + asc) }; x += adv; return l;
        });
        svg.setAttribute('viewBox', (-pad) + ' ' + (-asc - pad) + ' ' + (x + pad * 2) + ' ' + (asc + desc + pad * 2));
        svg.setAttribute('aria-hidden', 'true');
        svg.style.height = (asc + desc + pad * 2) / 100 + 'em';
        letters.forEach(function (l) { svg.appendChild(l.ln); svg.appendChild(l.t); });
        h3.setAttribute('aria-label', h3.textContent.trim());
        h3.textContent = ''; h3.appendChild(svg);
        words.push({ h3: h3, letters: letters, pad: pad, asc: asc });
      }
      function unit(w) { return w.u || (w.u = 100 / (parseFloat(getComputedStyle(w.h3).fontSize) || 100)); }   // measured once (and on resize)
      var M = null;                                          // the strip's offsets, measured once (and on resize), not in every frame
      function measure() {
        var hs = words.map(function (w) { return w.h3; });
        words.forEach(function (w) { w.u = 0; w.k100 = parseFloat(getComputedStyle(w.h3).fontSize) / 100; });
        var off = hs.map(function (h) { return h.offsetLeft - hs[0].offsetLeft; });
        M = { off: off, step: off[1] - off[0], avail: strip.parentNode.clientWidth || innerWidth };
      }
      // ko = how much of the line is drawn, kf = fill
      function paint(w, l, ko, kf, u) {
        // only what changed is written: a letter that is done (drawn + filled, or not started) costs nothing per frame
        ko = Math.round(ko * 1000) / 1000; kf = Math.round(kf * 1000) / 1000;
        if (l.ko === ko && l.kf === kf && l.u === u) return;
        l.ko = ko; l.kf = kf; l.u = u;
        var hide = ko <= 0 || kf >= 1;                       // the dashed outline is invisible: take it (and its mask) out of painting
        if (l.hid !== hide) { l.hid = hide; l.ln.style.display = hide ? 'none' : ''; }
        var d = 4 * u;
        l.t.setAttribute('fill', 'rgba(' + CREAM + ',' + kf.toFixed(3) + ')');
        l.ln.setAttribute('stroke-width', u.toFixed(3));
        l.ln.setAttribute('stroke-dasharray', d.toFixed(2) + ' ' + d.toFixed(2));
        l.mt.setAttribute('stroke-width', (u * 4).toFixed(3));
        l.mt.setAttribute('stroke-dasharray', (l.L * ko).toFixed(1) + ' ' + l.L);
        l.ln.setAttribute('stroke-opacity', (ko > 0 ? LINE_A * (1 - kf) : 0).toFixed(3));
      }

      function render(p) {
        fill.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)';
        dot.style.left = (p * 100).toFixed(2) + '%';
        majors.forEach(function (m) { m.el.classList.toggle('is-on', p >= m.at - .001); });
        var hs = words.map(function (w) { return w.h3; });
        var f = F0 + clamp(p / .8) * (3 - F0);
        if (!M) measure();
        var off = M.off, step = M.step;
        var i = Math.min(2, Math.floor(Math.max(0, f)));
        var x = f < 0 ? f * step : f >= 3 ? off[3] : off[i] + (off[i + 1] - off[i]) * (f - i);
        strip.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
        var e = sm(.8, 1, p);
        var avail = M.avail, pA = (-.15 - F0) / (3 - F0) * .8;   // pA: where the first word is fully drawn
        words.forEach(function (w, k) {
          var d = f - k, u = unit(w);
          w.letters.forEach(function (l, j) {
            var s = j * .05;
            // the outline draws by where the word is on screen (nothing at the right edge, done when it reaches its place),
            // so long and short words draw the same; the first word also starts from nothing on arrival
            var ko = 1;
            if (d < 0) {
              var q = 1 - (off[k] - x) / avail;
              ko = clamp(sm(0, .8, q) * 1.15 - s);
              if (k === 0) ko = Math.min(ko, clamp(sm(0, pA, p) * 1.15 - s));
            }
            var kf = d < 0 ? 1 - sm(0, .22, -d) : 1 - sm(.3, .95, d);
            paint(w, l, ko, kf, u);
          });
          if (k === 3) {
            // fly into the last word: scale about a point in an open counter until its dark fills the screen
            // (a U: the middle of its top opening; a C, as in SCALE: in the middle of its bowl, half way up)
            var h = w.h3, k100 = w.k100, g = Math.pow(e, 2.6), Z = null, zx = 0, zy = 0;
            w.letters.forEach(function (l) { if (!Z && (l.ch === 'U' || l.ch === 'C')) Z = l; });
            if (Z && Z.ch === 'U') { zx = Z.x + Z.adv / 2; zy = w.asc * .3; } else if (Z) { zx = Z.x + Z.adv * .6; zy = w.asc * .5; }
            h.style.transformOrigin = ((w.pad + zx) * k100).toFixed(1) + 'px ' + ((w.pad + zy) * k100).toFixed(1) + 'px';
            h.style.transform = g > 0 ? 'scale(' + (1 + g * (Z && Z.ch === 'C' ? 170 : 60)).toFixed(3) + ')' : '';   // a C's mouth is a narrow slot: it needs to grow further
          }
        });
        ones.forEach(function (one, k) { one.style.opacity = ((1 - sm(.18, .42, Math.abs(f - k))) * (1 - sm(.8, .85, p))).toFixed(3); });
        ones.forEach(function (one, k) { one.classList.toggle('is-on', Math.abs(f - k) < .32 && p < .82); });   // A: a stage's boxes come in while its word is current
        var ne = sm(.88, .97, p);
        if (next) {                                          // the end word is optional (hidden in the Designer = gone)
          next.style.opacity = ne.toFixed(3);
          next.style.letterSpacing = (.3 + (1 - ne) * .4).toFixed(3) + 'em';
          next.style.transform = 'translate(-50%, -50%)';
        }
      }

      function target() { var r = sec.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight)); }
      // light: one frame loop that only runs while the section is on screen and still catching up with the scroll
      var raf = 0, seen = false;
      function loop() {
        raf = 0;
        if (!sec.isConnected) return;                      // the page left (page transition): stop
        var t = target(), d = t - ps;
        if (Math.abs(d) > .0004) { ps += d * .14; render(ps); raf = requestAnimationFrame(loop); }
        else if (ps !== t) { ps = t; render(ps); }
      }
      function wake() { if (!raf && seen && sec.isConnected) raf = requestAnimationFrame(loop); }
      function start() {
        if (!sec.isConnected) return;
        [].slice.call(sec.querySelectorAll('.hw_word')).forEach(build);
        [0, 1, 2, 3].forEach(function (k) {
          var at = (k - F0) / (3 - F0) * .8, el = document.createElement('span');
          el.className = 'hw_major'; el.style.left = at * 100 + '%'; ticks.insertBefore(el, dot); majors.push({ el: el, at: at });
        });
        sec.classList.add('is-ready');
        ps = target(); render(ps);
        new IntersectionObserver(function (es) { seen = es[0].isIntersecting; wake(); }).observe(sec);
        window.addEventListener('scroll', wake, { passive: true });
      }
      window.addEventListener('resize', function () { if (words.length) { measure(); render(ps); } });
      if (document.fonts && document.fonts.load) document.fonts.load('900 100px IntegralNEW').then(start, start); else start();
    });
  }

  // rdSvcLayers — was: /service, embed in .hx_pass
  function rdSvcLayers() {
    /* 1. How it goes holds still at its end (SCALE blown up) while the light wall slides in over it: once the section's
          bottom reaches the bottom of the screen, its pinned stage is moved down as far as the page scrolls. Laptop and up,
          follows Lenis's own scroll so it never trembles. data-hw-hold on the section: 1 = still (default), 0 = off.
       2. The ticket comes out from under the wall: it starts 40% higher and in shade, and settles as its section reaches
          the middle of the screen. Then it sinks back (24% down, into shade) under Explore the work as that slides over it.
          Same numbers as /work; the two ways are added up so they never fight. Needs GSAP + ScrollTrigger; without them
          the ticket simply stands there.
          NOT ON PHONES (2026-11-18, Rimbo on his phone: "the scroll is just confused on the ticket section"): there the
          ticket is as tall as the screen, so it never came to rest and ran at about two thirds of the finger's speed the
          whole way. On phones it now scrolls with the page; its own route still follows the scroll. */
    (function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); })(function () {
      var wall = document.querySelector('.sv_page + .wall_section'), pass = document.querySelector('.wall_section + .hx_pass');
      if (!wall || !pass || pass.dataset.lay) return; pass.dataset.lay = '1';
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      var sec = document.querySelector('[data-hw="section"]'), stage = sec && sec.querySelector('.hw_stage');
      if (sec && stage) {
        var mq = window.matchMedia('(min-width: 992px)'), k = parseFloat(sec.getAttribute('data-hw-hold')), last = 0, L = null;
        if (isNaN(k)) k = 1;
        var set = function () {
          if (!sec.isConnected) return stop();
          if (window.lenis !== L) hook();
          var d = mq.matches ? Math.min(Math.max(window.innerHeight - sec.getBoundingClientRect().bottom, 0), window.innerHeight) * k : 0;
          if (d === last) return; last = d;
          stage.style.transform = d ? 'translate3d(0,' + d.toFixed(2) + 'px,0)' : '';
        };
        var hook = function () { if (window.lenis && window.lenis !== L && window.lenis.on) { if (L && L.off) L.off('scroll', set); L = window.lenis; L.on('scroll', set); } };
        var stop = function () { window.removeEventListener('scroll', set); window.removeEventListener('resize', set); if (L && L.off) L.off('scroll', set); };
        window.addEventListener('scroll', set, { passive: true });
        window.addEventListener('resize', set);
        set();
      }

      var inner = pass.firstElementChild;
      if (inner && window.gsap && window.ScrollTrigger && !window.matchMedia('(max-width: 767px)').matches) {
        var shade = document.createElement('div'); shade.className = 'wk_shade'; shade.setAttribute('aria-hidden', 'true'); pass.appendChild(shade);
        var a = { y: -40, dim: 0.55 }, b = { y: 0, dim: 0 }, setY = gsap.quickSetter(inner, 'yPercent'), setDim = gsap.quickSetter(shade, 'opacity');
        var over = document.querySelector('.hx_pass + .wh_sec');
        var draw = function () { setY(a.y + b.y); setDim(a.dim + b.dim); };
        gsap.to(a, { y: 0, dim: 0, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: pass, start: 'top bottom', end: 'center center', scrub: true } });
        if (over) gsap.to(b, { y: 24, dim: 0.55, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: over, start: 'top bottom', end: 'top 10%', scrub: true } });
        draw();
      }
    });
  }

  // rdFoldFaq — was: home + /service, embed in the FAQ list ([data-fold="faq"])
  function rdFoldFaq() {
    /* all questions start closed; one open at a time (opening one closes the other), Rimbo 2026-11-17. A click anywhere in the
       field toggles it, except while text is being selected or a link in the answer is clicked. */
    (function (fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); })(function () {
      [].forEach.call(document.querySelectorAll('[data-fold="faq"]'), function (sec) {
        if (sec.dataset.on) return; sec.dataset.on = '1';
        var all = [].slice.call(sec.querySelectorAll('.sv_qa.is-fold'));
        function set(qa, open) { qa.classList.toggle('is-open', open); var row = qa.querySelector('.sv_q_row'); if (row) row.setAttribute('aria-expanded', open ? 'true' : 'false'); }
        function flip(qa) { var open = !qa.classList.contains('is-open'); all.forEach(function (o) { if (o !== qa) set(o, false); }); set(qa, open); }
        all.forEach(function (qa) {
          var row = qa.querySelector('.sv_q_row');
          set(qa, false);
          qa.addEventListener('click', function (e) { if (e.target.closest('a')) return; var s = window.getSelection && String(window.getSelection()); if (s) return; flip(qa); });
          if (row) row.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(qa); } });
        });
      });
    });
  }

  // rdPostEnd — was: component Post_end (.ex_section [data-ex]): posts, /resources, city pages
  function rdPostEnd() {
    (function(){
      function init(){
        [].forEach.call(document.querySelectorAll('[data-ex]:not([data-ex-on])'),function(root){
          root.setAttribute('data-ex-on','');
          var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,NB=String.fromCharCode(160);
          var clips=['https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.7.2/media/echo.mp4','https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.7.2/media/dfs-home-test.mp4','https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.7.2/media/dieronesie.mp4','https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.7.21/media/tinko.mp4'];
          clips=clips.map(function(u){return clipFile((/\/media\/([\w-]+)\.mp4$/.exec(u)||[])[1]||'')||u;}); // CLIPS: the light file for this device
          var names=['Echo','Digital Feng Shui','Dieronesie','Tinko'],hold={dieronesie:3.2},i=0;
          var v=root.querySelector('.ex_clip'),seen=false;
          if(v){ // the card's clip only downloads and plays while it is on (or near) the screen
            v.muted=true;v.removeAttribute('autoplay');v.removeAttribute('src');v.removeAttribute('data-src');v.load();clipGuard(v);
            if('IntersectionObserver' in window)new IntersectionObserver(function(es){seen=es[es.length-1].isIntersecting;
              if(seen){if(!v.getAttribute('src'))v.setAttribute('src',clips[i]);var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});}else v.pause();},{rootMargin:'200px 0px'}).observe(v);
            else{seen=true;v.setAttribute('src',clips[i]);}
          }
          function limit(){var k=Object.keys(hold).filter(function(n){return (v.getAttribute('src')||'').indexOf(n)>-1;})[0];v.dataset.limit=k?hold[k]:'';}
          if(v){v.addEventListener('timeupdate',function(){if(v.dataset.limit&&v.currentTime>+v.dataset.limit)v.pause();});limit();}
          function scramble(el,to){if(!el||el.textContent===to)return;clearInterval(el._sc);var len=Math.max(el.textContent.length,to.length),f=0,F=16,G='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+';
            el._sc=setInterval(function(){f++;var out='';for(var c=0;c<len;c++){out+=f>=F*(c+1)/len?(to[c]||''):(to[c]===' '?' ':G[Math.floor(Math.random()*G.length)]);}el.textContent=out;if(f>=F){clearInterval(el._sc);el.textContent=to;}},40);}
          function light(){
            [].forEach.call(root.querySelectorAll('[data-ex-site]'),function(e){e.classList.toggle('is-on',+e.getAttribute('data-ex-site')===i);});
            [].forEach.call(root.querySelectorAll('[data-ex-now]'),function(e){e.textContent=names[i];});
            [].forEach.call(root.querySelectorAll('[data-ex-idx]'),function(e){e.textContent='0'+(i+1);});
            scramble(root.querySelector('[data-ex-name]'),names[i]);
          }
          light();
          if(v&&!reduce)setInterval(function(){if(!seen)return;i=(i+1)%clips.length;v.classList.add('is-swap');
            setTimeout(function(){v.src=clips[i];limit();var go=function(){v.removeEventListener('loadeddata',go);v.play&&v.play().catch(function(){});requestAnimationFrame(function(){v.classList.remove('is-swap');});};v.addEventListener('loadeddata',go);light();},450);},6000);
          var t0=Date.now();setInterval(function(){if(!near)return;var t=Math.floor((Date.now()-t0)/1000),m=Math.floor(t/60),s=t%60;[].forEach.call(root.querySelectorAll('[data-ex-tc]'),function(e){e.textContent=(m<10?'0':'')+m+':'+(s<10?'0':'')+s;});},500);
          function clk(){var d=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Amsterdam'}));var t=(d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes()+' CET';[].forEach.call(root.querySelectorAll('[data-ex-clock]'),function(e){e.textContent=t;});}clk();setInterval(function(){if(near)clk();},15000);
          [].forEach.call(root.querySelectorAll('[data-ex-boil]'),function(t){
            var panel=t.closest('.ex_panel'),chars=[].map.call(t.textContent,function(ch){var c=document.createElement('span');c.style.display='inline-block';c.textContent=ch===' '?NB:ch;return c;});
            t.setAttribute('aria-label',t.textContent);t.textContent='';chars.forEach(function(c){c.setAttribute('aria-hidden','true');t.appendChild(c);});
            var R=function(a){return(Math.random()*2-1)*a;},poses=chars.map(function(){return[0,1,2].map(function(){return'translate('+R(.6)+'px,'+R(.7)+'px) rotate('+R(3)+'deg)';});}),timer=null,f=0;
            function frame(){f++;chars.forEach(function(c,n){c.style.transform=poses[n][(f+n)%3];});}
            panel.addEventListener('pointerenter',function(e){if(e.pointerType!=='mouse'||timer||reduce)return;frame();timer=setInterval(frame,1000/9);});
            panel.addEventListener('pointerleave',function(){clearInterval(timer);timer=null;chars.forEach(function(c){c.style.transition='transform .35s cubic-bezier(.2,.8,.2,1)';c.style.transform='';setTimeout(function(){c.style.transition='';},360);});});
          });
          /* the globes turn: the big one on My work and the small one inside the stamp */
          var globes=[].map.call(root.querySelectorAll('.ex_globe,.ex_stamp'),function(g){var es=[].slice.call(g.querySelectorAll('[data-m]'));return{es:es,R:es.length?+es[0].getAttribute('ry'):0};}).filter(function(o){return o.es.length;});
          var near=false,spinning=false,spin=function(t){if(!near){spinning=false;return;}var ph=t/2600;globes.forEach(function(o){var N=o.es.length;o.es.forEach(function(e,k){e.setAttribute('rx',(o.R*Math.abs(Math.cos(ph+k*Math.PI/N))).toFixed(2));});});requestAnimationFrame(spin);};
          nearScreen(root,function(on){near=on;if(on&&globes.length&&!reduce&&!spinning){spinning=true;requestAnimationFrame(spin);}}); // globes, map, clocks and tilt rest off screen
          var m=root.querySelector('.ex_map');
          if(m){var p=m.querySelector('.r10_prog'),pins=[].slice.call(m.querySelectorAll('.r10_pin'));
            if(p&&pins.length){var L=p.getTotalLength(),at=null,where=function(){ // where each pin sits on the route: the path is read once (coarse), then each pin is refined close by
                var pts=[];for(var l=0;l<=L;l+=6){var q=p.getPointAtLength(l);pts.push([l,q.x,q.y]);}
                return pins.map(function(g){var mm=g.getAttribute('transform').match(/([\d.]+)[ ,]+([\d.]+)/),x=+mm[1],y=+mm[2],best=0,bd=1e9;
                  pts.forEach(function(o){var dd=(o[1]-x)*(o[1]-x)+(o[2]-y)*(o[2]-y);if(dd<bd){bd=dd;best=o[0];}});
                  for(var l2=Math.max(0,best-6);l2<=Math.min(L,best+6);l2+=1.5){var q2=p.getPointAtLength(l2),d2=(q2.x-x)*(q2.x-x)+(q2.y-y)*(q2.y-y);if(d2<bd){bd=d2;best=l2;}}return best;});};
              p.style.strokeDasharray=L;p.style.strokeDashoffset=L;var k=-1,N=pins.length-1,ease='cubic-bezier(.625,.05,0,1)',boom='cubic-bezier(.75,0,.25,1)';
              var go=function(){if(!near){setTimeout(go,600);return;}if(!at)at=where();k++;
                if(k>N){m.classList.add('is-reset');setTimeout(function(){p.style.transition='none';p.style.strokeDashoffset=L;p.getBoundingClientRect();p.style.transition='';k=-1;m.classList.remove('is-reset','is-top');pins.forEach(function(e){e.classList.remove('is-on','is-done');});},1100);setTimeout(go,1900);return;}
                p.style.transition='stroke-dashoffset '+(k===N?'.85s '+boom:(k===N-1?'.7s '+ease:'1.4s '+ease));p.style.strokeDashoffset=L-at[k];
                pins.forEach(function(e){var n=+e.getAttribute('data-k');e.classList.toggle('is-on',n===k);e.classList.toggle('is-done',n<k);});
                if(k===N)setTimeout(function(){m.classList.add('is-top');},700);
                setTimeout(go,k===0?800:(k===N?4200:(k===N-1?900:(k===N-2?1000:1700))));};
              if(reduce){at=where();p.style.strokeDashoffset=0;pins.forEach(function(e){e.classList.add('is-done');});}
              else{var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();setTimeout(go,500);}},{threshold:.35});io.observe(m);}}}
          if(matchMedia('(hover: hover) and (pointer: fine)').matches&&!reduce){
            var T={tx:0,ty:0,x:0,y:0,raf:0},cards=[].map.call(root.querySelectorAll('.ex_panel'),function(c){return{c:c,layers:[].map.call(c.querySelectorAll('[data-depth]'),function(e){return{e:e,k:+e.getAttribute('data-depth')};}),holo:c.querySelector('.ex_holo')};});
            var tl=function(){T.raf=0;T.x+=(T.tx-T.x)*.07;T.y+=(T.ty-T.y)*.07;
              cards.forEach(function(o){o.c.style.transform='perspective(1600px) rotateX('+(-T.y*5).toFixed(3)+'deg) rotateY('+(T.x*5).toFixed(3)+'deg)';o.layers.forEach(function(l){l.e.style.translate=(T.x*10*l.k).toFixed(2)+'px '+(T.y*10*l.k).toFixed(2)+'px';});if(o.holo)o.holo.style.backgroundPosition=(50+T.x*40)+'% '+(50+T.y*40)+'%';});
              if(Math.abs(T.tx-T.x)>.0004||Math.abs(T.ty-T.y)>.0004)T.raf=requestAnimationFrame(tl);};
            addEventListener('pointermove',function(e){if(!near)return;T.tx=e.clientX/innerWidth*2-1;T.ty=e.clientY/innerHeight*2-1;if(!T.raf)T.raf=requestAnimationFrame(tl);},{passive:true});
          }
        });
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
      window.rdExInit=init;
    })();
  }

  // rdWorkHeroLoad — was: /work, embed in #featured (its CSS stays there)
  function rdWorkHeroLoad() {
    (function () {
      // the site loads GSAP at the end of the page: load Tinko, then the hero, once it is there (straight away after a page transition)
      var BASE = 'https://cdn.jsdelivr.net/gh/rimbodesigns/rimbo-designs-scripts@v1.7.225/'; // work-hero.js + tinko-live.js from this release (the edge's spring in small steps, so it no longer flaps on a 30 fps phone, 2026-11-19)
      function load() {
        ['tinko-live.js', 'work-hero.js'].forEach(function (f) {
          var s = document.createElement('script'); s.src = BASE + f; s.async = false; document.body.appendChild(s);
        });
      }
      if (window.gsap && window.CustomEase && window.ScrollTrigger) load();
      else document.addEventListener('DOMContentLoaded', load);
    })();
  }

  // rdWorkSplit — was: /work, embed in .ws_wrap
  function rdWorkSplit() {
    (function () {
      var wrap = document.querySelector('.ws_wrap'); if (!wrap) return;
      var rows = [].slice.call(wrap.querySelectorAll('[data-ws-row]')), track = wrap.querySelector('[data-ws-track]'), shots = [].slice.call(wrap.querySelectorAll('.ws_shot')), tag = wrap.querySelector('.ws_tag'), pane = wrap.querySelector('.ws_pane');
      var clips = shots.map(function (s) { return s.querySelector('video'); });
      var on = -1, hovering = false;
      function show(i) {
        if (i === on || !shots[i]) return;
        track.style.transform = 'translateY(' + (-100 * i) + '%)';
        shots.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
        rows.forEach(function (r, k) { r.classList.toggle('is-on', k === i); });
        // the clip sliding in plays from its start; the one sliding out keeps playing until it is out of the frame
        var was = clips[on];
        var v = clips[i]; if (v) { v.preload = 'auto'; try { v.currentTime = 0; } catch (e) {} v.play().catch(function () {}); }
        if (clips[i + 1]) clips[i + 1].preload = 'auto';
        if (was && was !== v) setTimeout(function () { if (clips[on] !== was) was.pause(); }, 1200);
        if (tag) tag.textContent = ('0' + (i + 1)).slice(-2) + ' · ' + rows[i].querySelector('.ws_name').textContent;
        on = i;
      }
      // the work nearest the middle of the screen is the one shown (the first, before you scroll into the list).
      // On a phone the preview lies across the top of the list (stacked), so the point to measure from is a third of the
      // way down the room that is left under it: the lit name is the one just below the preview, never one hidden under it.
      // SPEED (2026-11-19): the rows, the preview and the screen height are measured once and kept (G); a scroll frame
      // then only does sums with the scroll position, so scrolling makes no layout reads here (it was ~600 a second).
      // G is thrown away whenever something could have moved them (see stale() below) and the next pick measures again.
      var G = null;
      function measure() {
        var y = window.scrollY, g = { vh: innerHeight, tops: [], hs: [], stacked: false, pane: null };
        rows.forEach(function (r) { var b = r.getBoundingClientRect(); g.tops.push(b.top + y); g.hs.push(b.height); });
        if (pane) { var p = pane.getBoundingClientRect(); g.stacked = p.width > wrap.clientWidth * .9; if (g.stacked) g.pane = stickyPane(p, y); }
        return g;
      }
      // On a phone the preview is sticky (the Designer's ws_pane). Where it is follows from that rule alone: in its own place
      // until its top reaches the sticky top, held there, then pushed up once its bottom (plus its bottom margin) meets the
      // bottom of the box it sits in (.ws_split). Any other kind of sticky: it is simply measured each time, as before.
      function stickyPane(p, y) {
        var cs = getComputedStyle(pane), box = pane.parentElement, T = parseFloat(cs.top);
        if (cs.position !== 'sticky' || isNaN(T) || cs.bottom !== 'auto' || !box) return { live: true };
        // its own place = where it would be without the rule; same spot in the flow, and put back before anything is drawn
        var pos = pane.style.position, top = pane.style.top;
        pane.style.position = 'relative'; pane.style.top = '0px';
        var top0 = pane.getBoundingClientRect().top + y;
        pane.style.position = pos; pane.style.top = top;
        var bs = getComputedStyle(box), bottom = box.getBoundingClientRect().bottom + y - parseFloat(bs.paddingBottom) - parseFloat(bs.borderBottomWidth);
        return { top0: top0, T: T, h: p.height, last: bottom - parseFloat(cs.marginBottom) - p.height };
      }
      function paneBottom(s, y) {
        if (s.live) return pane.getBoundingClientRect().bottom;
        return Math.max(s.top0 - y, Math.min(s.T, s.last - y)) + s.h;
      }
      // Lenis's own number: asking the page for its scroll position can make the browser lay the page out
      function scrollPos() { var L = window.lenis; return L && typeof L.scroll === 'number' ? L.scroll : window.scrollY; }
      function pick() {
        if (hovering || !wrap.isConnected) return;
        var g = G || (G = measure()), y = scrollPos(), vh = g.vh, mid = vh * .5, best = 0, bestD = 1e9;
        if (g.stacked) { var pb = paneBottom(g.pane, y); if (pb < vh) mid = pb + (vh - pb) * .35; }
        if (!g.stacked && g.tops[0] - y > vh * .2) { show(0); return; }
        rows.forEach(function (r, k) { var d = Math.abs(g.tops[k] - y + g.hs[k] / 2 - mid); if (d < bestD) { bestD = d; best = k; } });
        show(best);
      }
      // SPEED (2026-11-18): measuring the rows makes the browser lay the page out on the spot. It used to happen on every
      // scroll event anywhere on the page (so also in the middle of the ticket's and the wall's frames). Now it happens only
      // while this section is on or near the screen, and once per frame at most.
      var near = false, queued = false;
      function onScroll() { if (!near || queued) return; queued = true; requestAnimationFrame(function () { queued = false; pick(); }); }
      // measure again after: a window resize, the page or the list changing size (images, fonts, sections opening) and
      // ScrollTrigger's refresh (pins rebuilt; also the end of a page transition, when the page stops being moved)
      function stale() { G = null; onScroll(); }
      rdOn(window, 'scroll', onScroll, { passive: true }); rdOn(window, 'resize', stale);
      var ro = new ResizeObserver(stale); ro.observe(document.body); ro.observe(wrap);
      if (window.ScrollTrigger) { ScrollTrigger.addEventListener('refresh', stale); rdUndo(function () { ScrollTrigger.removeEventListener('refresh', stale); }); }
      if (window.matchMedia('(hover: hover)').matches) rows.forEach(function (r, k) {
        r.addEventListener('pointerenter', function () { hovering = true; show(k); });
        r.addEventListener('pointerleave', function () { hovering = false; });
      });
      // near = the list is on or close to the screen; clips only play while it is on screen
      new IntersectionObserver(function (es) { near = es[0].isIntersecting; if (near) pick(); }, { rootMargin: '30% 0px' }).observe(wrap);
      new IntersectionObserver(function (es) { var v = clips[on]; if (!v) return; if (es[0].isIntersecting) v.play().catch(function () {}); else v.pause(); }).observe(wrap);
      show(0); pick();
    })();
  }

  // rdWorkLayers — was: /work, transitions embed in #archive
  function rdWorkLayers() {
    (function () {
      function init() {
        var pass = document.querySelector('.hx_pass'), arch = document.getElementById('archive');
        if (!pass || !arch || !window.gsap || !window.ScrollTrigger) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var phone = window.matchMedia('(max-width: 767px)').matches;
        // A dark section on the lower layer: it comes out from under the section above it (way in) and sinks back under the
        // section that slides over it (way out). Each way keeps its own numbers and they are added up, so they never fight
        // where they overlap. inner = what moves, host = the section; its shadow is its own layer (wk_shade), so a frame of
        // scrolling only moves one layer and fades another, and never restyles what is inside the section.
        function layer(host, inner, fromY, inEnd, over, toY) {
          var shade = host.querySelector(':scope > .wk_shade');
          if (!shade) { shade = document.createElement('div'); shade.className = 'wk_shade'; shade.setAttribute('aria-hidden', 'true'); host.appendChild(shade); }
          var a = { y: fromY, dim: 0.55 }, b = { y: 0, dim: 0 };
          var setY = gsap.quickSetter(inner, 'yPercent'), setDim = gsap.quickSetter(shade, 'opacity');
          function draw() { setY(a.y + b.y); setDim(a.dim + b.dim); }
          gsap.to(a, { y: 0, dim: 0, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: host, start: 'top bottom', end: inEnd, scrub: true } });
          if (over) gsap.to(b, { y: toY, dim: 0.55, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: over, start: 'top bottom', end: 'top 10%', scrub: true } });
          draw();
        }
        // the ticket: in from under Selected work (down to the middle), out under the archive. Not on phones: there the
        // ticket is as tall as the screen and would never come to rest (see PHONES at the top)
        if (!phone) layer(pass, pass.firstElementChild, -40, 'center center', arch, 24);
        // the Wall of love: in from under the archive, out under the service sheet. It sinks at most 16%, and never so far
        // that its arrows go under the sheet: the room under the arrows (wk_wall's bottom padding in the Designer) sets
        // how far. On phones the wall ends right under its arrows and 16% of it was 130px, so they were cut (2026-11-19)
        var wall = document.querySelector('.wk_wall'), wallIn = wall && wall.querySelector('.wall_section');
        var sheet = document.querySelector('.wk_wall ~ .im_sheet');
        var sinkRoom = function (most) { // measured before layer() moves anything
          var arrows = wallIn.querySelector('.wall_arrows');
          if (!arrows || !sheet || !wallIn.offsetHeight) return most;
          var room = sheet.getBoundingClientRect().top - arrows.getBoundingClientRect().bottom - 12;
          return Math.max(0, Math.min(most, room / wallIn.offsetHeight * 100));
        };
        if (wallIn) layer(wall, wallIn, -16, 'top top', sheet, sinkRoom(16));
        // the Digital Feng Shui card (hidden on this page since 2026-11-17; this still works if it is shown again): drifts in from a little higher, out of the shadow
        var dfs = document.querySelector('.wk_wall ~ .hx_dfs_sec'), card = dfs && dfs.querySelector('.hx_dfs_root');
        if (card) layer(dfs, card, -30, 'clamp(center center)', null, 0);
      }
      if (window.gsap && window.ScrollTrigger) init(); else document.addEventListener('DOMContentLoaded', init);
    })();
  }

  // rdWorkFollower — was: /work, follower embed in #archive (Osmo Image Preview Cursor Follower)
  function rdWorkFollower() {
    function initPreviewFollower() {
      // Find every follower wrap
      const wrappers = document.querySelectorAll('[data-follower-wrap]');

      wrappers.forEach(wrap => {
        const collection = wrap.querySelector('[data-follower-collection]');
        const items = wrap.querySelectorAll('[data-follower-item]');
        const follower = wrap.querySelector('[data-follower-cursor]');
        const followerInner = wrap.querySelector('[data-follower-cursor-inner]');

        const offset = 100; // The animation distance in %
        const duration = 0.5; // The animation duration of all visual transforms
        const ease = 'power2.inOut';

        // Initialize follower position
        gsap.set(follower, { xPercent: -50, yPercent: -50 });

        // Quick setters for x/y
        const xTo = gsap.quickTo(follower, 'x', { duration: 0.6, ease: 'power3' });
        const yTo = gsap.quickTo(follower, 'y', { duration: 0.6, ease: 'power3' });

        // Move all followers on mousemove
        window.addEventListener('mousemove', e => {
          xTo(e.clientX);
          yTo(e.clientY);
        });

        // Changed for this site (Rimbo 2026-11-17): one slide at a time. Osmo starts a new slide for every row the mouse
        // crosses, so a fast move or a scroll over the list ran four slides at once. Now a slide always finishes first;
        // the rows crossed meanwhile are skipped and the preview then goes straight to the row the mouse is on.
        let shownIndex = null; // the row whose picture is in the preview
        let wantedIndex = null; // the row the mouse is on
        let current = null; // that picture (a copy inside the follower)
        let busy = false; // a slide is running

        function slide() {
          if (busy || wantedIndex === null || wantedIndex === shownIndex) return;
          const index = wantedIndex;
          const visual = items[index].querySelector('[data-follower-visual]');
          if (!visual) return;
          const forward = shownIndex === null || index > shownIndex;
          const old = current;
          const clone = visual.cloneNode(true);
          followerInner.appendChild(clone);
          shownIndex = index;
          current = clone;
          if (!old) return; // the first row you enter: no slide, the preview itself grows in
          busy = true;
          gsap.to(old, { yPercent: forward ? -offset : offset, duration, ease, onComplete: () => old.remove() });
          gsap.fromTo(clone,
            { yPercent: forward ? offset : -offset },
            { yPercent: 0, duration, ease, onComplete: () => { busy = false; slide(); } }
          );
        }

        items.forEach((item, index) => {
          item.addEventListener('mouseenter', () => { wantedIndex = index; slide(); });
        });

        // If pointer leaves the collection, clear any visuals
        collection.addEventListener('mouseleave', () => {
          follower.querySelectorAll('[data-follower-visual]').forEach(el => {
            gsap.killTweensOf(el);
            gsap.delayedCall(duration, () => el.remove());
          });
          shownIndex = null;
          wantedIndex = null;
          current = null;
          busy = false;
        });
      });
    }

    // Initialize Image Preview Cursor Follower
    document.addEventListener("DOMContentLoaded", () =>{
      initPreviewFollower();
    })

    // Added for this site (not Osmo): the previews sit in hidden boxes and Webflow marks them lazy, so each one would only
    // start loading on its first hover. On screens that show the follower they load when the archive comes near.
    document.addEventListener("DOMContentLoaded", () => {
      const wrap = document.querySelector('[data-follower-wrap]');
      if (!wrap || !window.matchMedia('(hover: hover) and (min-width: 992px)').matches) return;
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        wrap.querySelectorAll('[data-follower-visual] img').forEach(img => { img.loading = 'eager'; });
      }, { rootMargin: '100% 0px' });
      io.observe(wrap);
    });

    // Added for this site (not Osmo; after dennissnellenberg.com): the round View follows the mouse a little faster than
    // the preview, so the two move in layers.
    document.addEventListener("DOMContentLoaded", () => {
      const view = document.querySelector('[data-follower-wrap] [data-follower-view]');
      if (!view || !window.matchMedia('(hover: hover) and (min-width: 992px)').matches) return;
      gsap.set(view, { xPercent: -50, yPercent: -50 });
      const vx = gsap.quickTo(view, 'x', { duration: 0.3, ease: 'power3' });
      const vy = gsap.quickTo(view, 'y', { duration: 0.3, ease: 'power3' });
      window.addEventListener('mousemove', e => { vx(e.clientX); vy(e.clientY); });
    });
  }

  // rdWorkArchiveView — was: /work, List/Grid embed in #archive
  function rdWorkArchiveView() {
    (function () {
      function init() {
        var sec = document.getElementById('archive'); if (!sec) return;
        var btns = [].slice.call(sec.querySelectorAll('[data-wa-view]'));
        function set(view, byHand) {
          sec.setAttribute('data-view', view);
          btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-wa-view') === view ? 'true' : 'false'); });
          if (view === 'grid') [].forEach.call(sec.querySelectorAll('[data-wa-cards] img'), function (img) { img.loading = 'eager'; });
          // the section changes height: tell the scroll (Lenis) and the scroll animations
          if (byHand) { if (window.lenis && window.lenis.resize) window.lenis.resize(); if (window.ScrollTrigger) window.ScrollTrigger.refresh(); }
        }
        btns.forEach(function (b) {
          b.setAttribute('role', 'button'); b.setAttribute('data-barba-prevent', 'self');
          // Webflow publishes these as "#" links: a click must only switch the view, never jump or start a page transition
          b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); set(b.getAttribute('data-wa-view'), true); }, true);
        });
        // phones open on the grid (their only view), everything else on the list
        set(window.matchMedia('(max-width: 767px)').matches ? 'grid' : 'list', false);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    })();
  }

  // rdCasePage — was: embed in .cs_page: the new project pages (Echo, DFS, Charlie's, Anapana, Dieronesie, InnerGym, OZO)
  function rdCasePage() {
    document.addEventListener('DOMContentLoaded', function () {
      var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      var hasIO = 'IntersectionObserver' in window;
      var ready = window.gsap && window.Draggable;
      if (ready) { gsap.registerPlugin(Draggable); if (window.InertiaPlugin) gsap.registerPlugin(InertiaPlugin); }
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var all = function (sel, root) { return [].slice.call(root.querySelectorAll(sel)); };

      all('[data-pp-page]', document).forEach(function (page) {
        if (page.__pp) return;
        page.__pp = true;
        page.setAttribute('data-pp-on', '');

        // reveal blocks as they come into view
        var blocks = all('[data-pp-reveal]', page);
        if (!hasIO) blocks.forEach(function (b) { b.classList.add('is-in'); });
        else {
          var show = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); show.unobserve(e.target); } });
          }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
          blocks.forEach(function (b) { show.observe(b); });
        }

        // clips play only while on screen. data-pp-from = the second a clip opens on the first time
        var clips = all('[data-pp-clip]', page);
        var giveClip = function (c) { // its light file, once
          if (c.getAttribute('src') || !c.getAttribute('data-src')) return;
          c.setAttribute('src', clipUrl(c)); clipGuard(c); c.preload = 'auto';
          chainRow(c);
        };
        // the clips in a drag row start off to the right, where no scroll brings them near: once one can play, the next
        // one in its row loads, so the row is ready before anyone drags it
        var chainRow = function (c) {
          var row = c.closest('[data-pp-gallery]');
          if (!row) return;
          var next = function () { var n = clips.filter(function (x) { return row.contains(x) && !x.getAttribute('src') && x.getAttribute('data-src'); })[0]; if (n) giveClip(n); };
          if (c.readyState >= 4) next(); else rdOn(c, 'canplaythrough', next, { once: true });
        };
        clips.forEach(function (c) { if (c.getAttribute('src')) chainRow(c); }); // a clip that keeps its own address (the shared Work dive) starts its row too
        clips.forEach(function (c) {
          c.muted = true;
          // a clip with its address in data-src (no src) loads nothing by itself: it gets the light file for this device
          // from CLIPS about 600 px before it comes on screen
          if (!c.getAttribute('src') && c.getAttribute('data-src')) nearScreen(c, function (on) { if (on) giveClip(c); }, 600);
          var from = parseFloat(c.getAttribute('data-pp-from'));
          if (!from) return;
          var set = function () { try { c.currentTime = from; } catch (e) {} };
          if (c.readyState >= 1) set(); else c.addEventListener('loadedmetadata', set, { once: true });
        });
        if (!still && hasIO) {
          var run = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) { giveClip(e.target); var p = e.target.play(); if (p && p.catch) p.catch(function () {}); }
              else e.target.pause();
            });
          }, { threshold: 0.15 });
          clips.forEach(function (c) { run.observe(c); });
        }

        // the rows you drag: drag or throw, snap to the item on the page gutter, sideways trackpad swipe,
        // counter next to the row. A row that fits the screen does not move.
        all('[data-pp-gallery]', page).forEach(function (gallery) {
          var track = gallery.querySelector('[data-pp-track]');
          var items = all('[data-pp-item]', gallery);
          if (!track || !items.length) return;
          // Webflow marks the screens lazy; off to the right they would only load mid-drag and pop in
          all('img', gallery).forEach(function (img) { img.loading = 'eager'; });
          if (!ready) { gallery.classList.add('is-native'); return; }
          var counter = gallery.parentElement.querySelector('[data-pp-count]');
          var snapDuration = 0.8, snapEase = 'expo.out';
          var minX = 0, snapPoints = [0], draggable;
          var closestSnap = function (x) { return gsap.utils.snap(snapPoints, x); };
          function updateActive() {
            var x = gsap.getProperty(track, 'x'), index = 0, best = Infinity;
            items.forEach(function (item, i) { var d = Math.abs(snapPoints[i] - x); if (d < best - 0.5) { best = d; index = i; } });
            if (minX < 0 && x <= minX + 1) index = items.length - 1;
            items.forEach(function (item, i) { item.classList.toggle('is-active', i === index); });
            if (counter) counter.textContent = pad(index + 1) + ' / ' + pad(items.length);
          }
          function measure() {
            if (!gallery.isConnected) return;
            var padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
            minX = Math.min(0, gallery.clientWidth - track.offsetWidth);
            snapPoints = items.map(function (item) { return gsap.utils.clamp(minX, 0, -(item.offsetLeft - padLeft)); });
            snapPoints.push(minX);
            draggable.applyBounds({ minX: minX, maxX: 0 });
            gsap.set(track, { x: gsap.utils.clamp(minX, 0, gsap.getProperty(track, 'x')) });
            draggable.update();
            updateActive();
          }
          draggable = Draggable.create(track, {
            type: 'x', trigger: gallery, inertia: !!window.InertiaPlugin, edgeResistance: 0.85,
            cursor: 'grab', activeCursor: 'grabbing', snap: { x: closestSnap },
            onDrag: updateActive, onThrowUpdate: updateActive, onDragEnd: updateActive, onThrowComplete: updateActive
          })[0];
          var wheelTimer;
          gallery.addEventListener('wheel', function (e) {
            if (minX >= 0 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
            e.preventDefault();
            gsap.killTweensOf(track);
            gsap.set(track, { x: gsap.utils.clamp(minX, 0, gsap.getProperty(track, 'x') - e.deltaX) });
            draggable.update(); updateActive();
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(function () {
              gsap.to(track, { x: closestSnap(gsap.getProperty(track, 'x')), duration: snapDuration, ease: snapEase, onUpdate: function () { draggable.update(); updateActive(); } });
            }, 150);
          }, { passive: false });
          measure();
          window.addEventListener('resize', measure);
          window.addEventListener('load', measure);
        });

        // the cursor over the row: a small card with the row's word running through it, like the Echo site.
        // Computers only; the pointer itself stays visible.
        var cursor = page.querySelector('[data-pp-cursor]');
        if (cursor && fine && window.gsap) {
          var texts = all('[data-pp-cursor-target]', cursor);
          var xTo = gsap.quickTo(cursor, 'x', { duration: 0.4, ease: 'power3' });
          var yTo = gsap.quickTo(cursor, 'y', { duration: 0.4, ease: 'power3' });
          var lastX = -100, lastY = -100, current = null;
          var check = function () {
            if (!cursor.isConnected) return;
            var el = document.elementFromPoint(lastX, lastY);
            var hit = el && el.closest('[data-pp-cursor-text]');
            if (hit === current) return;
            current = hit;
            if (hit) {
              var word = hit.getAttribute('data-pp-cursor-text') + ' · ';
              texts.forEach(function (t) { t.textContent = word; });
              cursor.setAttribute('data-state', 'on');
            } else cursor.setAttribute('data-state', 'off');
          };
          window.addEventListener('pointermove', function (e) { lastX = e.clientX; lastY = e.clientY; xTo(lastX); yTo(lastY); check(); }, { passive: true });
          window.addEventListener('scroll', check, { passive: true });
          window.addEventListener('pointerdown', function () { if (current) cursor.setAttribute('data-press', ''); });
          window.addEventListener('pointerup', function () { cursor.removeAttribute('data-press'); });
        }
      });

      if (!window.gsap || !window.ScrollTrigger || still) return;
      gsap.registerPlugin(ScrollTrigger);

      // the light sheet slides up over the row: while it comes up, the row sinks back a little and fades.
      // It starts where the sheet first shows (the bottom of the screen, or where it already sits when the page
      // opens, as on phones), so the row never starts out pushed down.
      (function () {
        var row = document.querySelector('.cs_rowwrap'), sheet = document.querySelector('.cs_sheet');
        if (!row || !sheet || row.__pp) return;
        row.__pp = true;
        var sheetTop0 = sheet.getBoundingClientRect().top + window.scrollY;
        gsap.fromTo(row, { yPercent: 0, opacity: 1 }, { yPercent: 18, opacity: 0.45, ease: 'none', scrollTrigger: {
          trigger: sheet, scrub: true, end: 'top 25%',
          start: function () { return 'top ' + Math.round(Math.min(window.innerHeight, sheetTop0 - 1)) + 'px'; }
        } });
      })();

      // the ticket: out from under the dark part, from above down to the middle and out of the shadow; then, while
      // More work slides up over it, it sinks back a little and darkens. Same numbers as on /work.
      (function () {
        var pass = document.querySelector('.hx_pass'), arch = document.querySelector('.cs_more');
        if (!pass || !arch || pass.__pp) return;
        pass.__pp = true;
        var inner = [].filter.call(pass.children, function (c) { return !c.classList.contains('grain') && !c.classList.contains('hx_dim'); })[0];
        if (!inner) return;
        var dim = pass.querySelector(':scope > .hx_dim');
        if (!dim) { dim = document.createElement('div'); dim.className = 'hx_dim'; dim.setAttribute('aria-hidden', 'true'); pass.appendChild(dim); }
        var a = { y: -40, dim: 0.55 }, b = { y: 0, dim: 0 };
        var setY = gsap.quickSetter(inner, 'yPercent'), setDim = gsap.quickSetter(dim, 'opacity');
        function draw() { setY(a.y + b.y); setDim(a.dim + b.dim); }
        gsap.to(a, { y: 0, dim: 0, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: pass, start: 'top bottom', end: 'center center', scrub: true } });
        gsap.to(b, { y: 24, dim: 0.55, ease: 'none', onUpdate: draw, scrollTrigger: { trigger: arch, start: 'top bottom', end: 'top 10%', scrub: true } });
        draw();
      })();
    });
  }

  // rdCaseDrum — was: embed in .loc_show: the drum on the old project pages
  function rdCaseDrum() {
    document.addEventListener('DOMContentLoaded', function () {
      if (!window.gsap) return;
      var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var rnd = gsap.utils.random;
      [].slice.call(document.querySelectorAll('.loc_show')).forEach(function (sec) {
        var cursor = sec.querySelector('[data-rw-cursor]');
        var zone = sec.querySelector('.loc_show-stage') || sec.querySelector('[data-spatial-slider-init]');
        var link = sec.querySelector('[data-rw-link]');
        if (!cursor || !zone || cursor.__rw) return;
        cursor.__rw = true;

        // a click on the drum (not a drag) opens /work
        var down = null;
        zone.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; if (fine) cursor.setAttribute('data-press', ''); }, true);
        window.addEventListener('pointerup', function (e) {
          cursor.removeAttribute('data-press');
          if (!down) return;
          var moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 450;
          var onDrum = zone.contains(document.elementFromPoint(e.clientX, e.clientY));
          down = null;
          if (moved < 6 && quick && onDrum && link && link.getAttribute('href')) link.click();
        });
        if (!fine) return;

        // a transformed parent would carry a fixed card along with it: then the card goes to the body while the drum is on the page
        for (var p = cursor.parentElement; p && p !== document.body; p = p.parentElement) {
          var cs = getComputedStyle(p);
          if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none') { document.body.appendChild(cursor); break; }
        }

        // the letters, each its own box with three hand-placed poses (the boil)
        var text = cursor.querySelector('[data-rw-text]');
        var word = text.textContent; text.textContent = '';
        var chars = Array.from(word).map(function (ch) { var s = document.createElement('span'); s.className = 'rw_ch'; s.textContent = ch; text.appendChild(s); return s; });
        // the text kit's boil, a little wider, and the whole word tilts with every frame
        var boiler = rdBoil(chars, { x: 0.6, y: 0.8, rotation: 4, back: 0.3, home: [text], frame: function (f) { gsap.set(text, { rotation: tilt[f % 3] }); } });
        var tilt = [rnd(-1.6, -0.6), rnd(-0.3, 0.3), rnd(0.6, 1.6)]; // after the poses, as before
        var running = false;
        function boil(on) {
          if (still || on === running) return;
          running = on;
          if (on) boiler.start(); else boiler.stop();
        }

        var xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
        var yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
        var lastX = -200, lastY = -200, on = false;
        function check() {
          if (!sec.isConnected) { if (cursor.parentNode) cursor.parentNode.removeChild(cursor); boil(false); return; }
          var el = document.elementFromPoint(lastX, lastY);
          var hit = !!(el && zone.contains(el));
          if (hit === on) return;
          on = hit;
          cursor.setAttribute('data-state', on ? 'on' : 'off');
          boil(on);
        }
        window.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; lastX = e.clientX; lastY = e.clientY; xTo(lastX); yTo(lastY); check(); }, { passive: true });
        window.addEventListener('scroll', check, { passive: true });
        document.documentElement.addEventListener('pointerleave', function () { lastX = lastY = -200; check(); });
      });
    });
  }

  // rdBlogCardLinks — was: site footer code ("BLOG CARDS" stopgap): links + dates of the article cards
  function rdBlogCardLinks() {
    (function(){
      var map=null,queued=false;
      function load(){
        if(map) return map;
        var nl=/^\/nl(\/|$)/.test(location.pathname);
        map=fetch((nl?'/nl':'')+'/resources',{credentials:'same-origin'}).then(function(r){return r.text();}).then(function(t){
          var d=new DOMParser().parseFromString(t,'text/html'),m={},list=[];
          d.querySelectorAll('.ac_card').forEach(function(a){var ti=a.querySelector('.ac_title'),da=a.querySelector('.ac_date');if(!ti)return;var e={title:ti.textContent.trim(),href:a.getAttribute('href'),date:da?da.textContent.trim():'',node:a};m[e.title]=e;list.push(e);});
          return {m:m,list:list};
        }).catch(function(){map=null;return {m:{},list:[]};});
        return map;
      }
      function norm(p){return (p||'').replace(/[?#].*$/,'').replace(/\/$/,'');}
      function fix(){
        queued=false;
        var cards=[].slice.call(document.querySelectorAll('.tk_section .ac_card:not([data-ac-done])'));
        if(!cards.length) return;
        load().then(function(r){
          var here=norm(location.pathname),shown={};
          cards.forEach(function(a){var ti=a.querySelector('.ac_title'),e=ti&&r.m[ti.textContent.trim()];
            if(e&&a.getAttribute('href')==='#'){a.setAttribute('href',e.href);var da=a.querySelector('.ac_date');if(da&&e.date)da.textContent=e.date;}
            a.setAttribute('data-ac-done','');});
          if(!/\/post\//.test(here))return;
          var live=[].slice.call(document.querySelectorAll('.tk_section .ac_card'));
          live.forEach(function(a){shown[norm(a.getAttribute('href'))]=1;});
          live.forEach(function(a){
            if(!a.parentNode||norm(a.getAttribute('href'))!==here)return;
            var pick=r.list.filter(function(e){var h=norm(e.href);return h!==here&&!shown[h];})[0];
            if(!pick)return;
            var c=document.importNode(pick.node,true);c.setAttribute('data-ac-done','');shown[norm(pick.href)]=1;
            a.parentNode.replaceChild(c,a);
          });
        });
      }
      function soon(){if(!queued){queued=true;requestAnimationFrame(fix);}}
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',soon);else soon();
      new MutationObserver(soon).observe(document.body,{childList:true,subtree:true});
    })();
  }

  // rdSvcHero — was: /service, page footer code
  function rdSvcHero() {
    /* SERVICE HERO (hero chat, lab prototype/service-hero-2, Rimbo's pick: Frame + Track + outline build).
       The look is in the Designer (svh_title, svh_g, svh_gv, svh_dim, svh_lab); this code only moves it:
       the letters come in from wide, drawn as white outlines and filled (the footer logo's build), the guides and measure lines
       draw in, and the labels show the title's real width and cap height.
       - The letters slide with transforms, one SVG letter each, not with letter-spacing: letter-spacing snaps them to whole
         pixels and they clicked into place in the slow end (Rimbo, 2026-11-10).
       - The drawn SVG letters STAY as the visible title; the HTML title stays in the page for search and screen readers but is
         see-through. Any swap back to the HTML text flickered (SVG and HTML text are smoothed differently); Rimbo is fine with
         a title that isn't selectable text. On resize the letters are placed again.
       - Browsers put this font's baseline in different places (Firefox/Safari ~23 px higher than Chrome), so the baseline is
         measured here and handed to the classes as --svh-base and --svh-cap (their em values are only the Designer fallback).
       - After a page transition it starts when the cube has rolled over. */
    (function () {
      var root = document.documentElement;
      var hero = document.querySelector('.sv_hero'), box = hero && hero.querySelector('[data-svh="title"]');
      if (!box || !window.gsap) { root.classList.remove('svh-pre'); return; }
      var text = box.querySelector('[data-svh="text"]'), dims = box.querySelector('[data-svh="dims"]');
      var labW = box.querySelector('[data-svh="w"]'), labH = box.querySelector('[data-svh="h"]');
      var kicker = hero.querySelector('.sv_kicker'), ruler = hero.querySelector('.sv_ruler');
      var ctx = document.createElement('canvas').getContext('2d');
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var ease = window.CustomEase ? CustomEase.create('svhOsmo', '0.625, 0.05, 0, 1') : 'expo.inOut';
      var STROKE = '#f8f5ee', BEIGE = '248, 245, 238', NS = 'http://www.w3.org/2000/svg', WIDE = 0.14; // em between the letters at the start
      var running = false, kept = null;
      // the SVG letters on the HTML title's places: x from the advance (incl. kerning with the letter before), y on the baseline
      function layoutLetters(m) {
        if (!kept) return;
        ctx.letterSpacing = '0px';
        kept.letters.forEach(function (L) {
          var ch = kept.txt[L.i], x = ctx.measureText(kept.txt.slice(0, L.i + 1)).width - ctx.measureText(ch).width;
          L.el.setAttribute('x', x.toFixed(2)); L.el.setAttribute('y', m.base.toFixed(2));
          L.el.style.font = m.cs.fontWeight + ' ' + m.fs + 'px ' + m.cs.fontFamily;
        });
      }

      // the title's ink width and cap height, measured with the real font (cap height = H to the baseline)
      function metrics() {
        var cs = getComputedStyle(text);
        ctx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        ctx.letterSpacing = '0px';
        var m = ctx.measureText(text.textContent.toUpperCase());
        return { cs: cs, fs: parseFloat(cs.fontSize), w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, cap: ctx.measureText('H').actualBoundingBoxAscent };
      }
      // where this browser really draws the baseline: a 0 x 0 box sitting on it (screen distance divided by the scale, so a cube
      // still settling can't skew it, and no rounding to whole pixels)
      function place() {
        var m = metrics(), pr = document.createElement('span');
        pr.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        text.appendChild(pr);
        var br = box.getBoundingClientRect(), k = box.offsetHeight ? br.height / box.offsetHeight : 1;
        m.base = k > 0.2 ? (pr.getBoundingClientRect().top - br.top) / k : pr.offsetTop;
        pr.remove();
        box.style.setProperty('--svh-base', m.base.toFixed(2) + 'px');
        box.style.setProperty('--svh-cap', (m.base - m.cap).toFixed(2) + 'px');
        return m;
      }
      function labels() { var m = metrics(); labW.textContent = Math.round(m.w) + ' PX'; labH.textContent = Math.round(m.cap) + ' PX'; return m; }

      function play() {
        root.classList.remove('svh-pre');
        var m = place();
        labels();
        hero.dispatchEvent(new CustomEvent('svh:play')); // the ball (script below) starts with the title
        if (reduce) return;
        running = true;

        // one SVG letter per glyph, placed where the HTML title has it (advance incl. kerning with the letter before)
        var txt = text.textContent.toUpperCase(), D = Math.round(m.fs * 8), letters = [], o = { settle: 0 }, sp = { s: WIDE * m.fs };
        var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'svh_out'); svg.setAttribute('aria-hidden', 'true');
        txt.split('').forEach(function (ch, i) {
          if (ch === ' ') return;
          var t = document.createElementNS(NS, 'text'); t.textContent = ch;
          t.style.stroke = STROKE; t.style.strokeWidth = '1px'; t.style.fill = 'rgba(' + BEIGE + ',0)'; t.style.strokeDasharray = '0 ' + D;
          svg.appendChild(t); letters.push({ el: t, i: i, o: 0, f: 0 });
        });
        kept = { svg: svg, letters: letters, txt: txt };
        layoutLetters(m);
        box.appendChild(svg);
        text.style.color = 'transparent';

        var g = dims.querySelectorAll('.svh_g'), gv = dims.querySelectorAll('.svh_gv'), gvR = dims.querySelector('.svh_gv.is-right');
        var dw = dims.querySelector('.svh_dim.is-w'), dh = dims.querySelector('.svh_dim.is-h');
        var n = txt.length - 1;
        function paint() {
          letters.forEach(function (L) {
            L.el.style.strokeDasharray = (L.o * D).toFixed(1) + ' ' + D;
            L.el.style.fill = 'rgba(' + BEIGE + ',' + L.f.toFixed(3) + ')';
            L.el.style.strokeOpacity = (1 - o.settle).toFixed(3);
          });
        }
        // the spread: letters, right guide, height line and the width line's right end all move by transforms, smoothly
        function spread() {
          var extra = n * sp.s;
          letters.forEach(function (L) { L.el.setAttribute('transform', 'translate(' + (L.i * sp.s).toFixed(3) + ' 0)'); });
          // through GSAP, so the move adds up with the guide's own draw-in (scaleY); a hand-set transform was overwritten by it
          // every frame and the guide sat still while the E moved (Rimbo, 2026-11-10)
          gsap.set([gvR, dh], { x: extra });
          dw.style.right = 'calc(0.015em - ' + extra.toFixed(3) + 'px)';
          labW.textContent = Math.round(m.w + extra) + ' PX';
        }
        function done() {
          // the drawn letters stay: no stroke left, full fill, no transform
          letters.forEach(function (L) { L.el.style.stroke = 'none'; L.el.style.strokeDasharray = ''; L.el.style.fill = 'rgb(' + BEIGE + ')'; L.el.removeAttribute('transform'); });
          gsap.set([dw, dh, gvR], { clearProps: 'clipPath,transform,right' });
          labels(); running = false;
        }

        // the guides draw from the frame line on the left, the side guides from under the ruler
        var under = ruler ? ruler.offsetTop + ruler.offsetHeight : 12;
        gsap.set(g, { transformOrigin: (-g[0].offsetLeft - box.offsetLeft) + 'px 50%' });
        gsap.set(gv, { transformOrigin: '50% ' + (-gv[0].offsetTop - box.offsetTop + under) + 'px' });
        spread(); paint();

        var tl = gsap.timeline({ onComplete: done });
        tl.from(kicker, { autoAlpha: 0, y: 8, duration: 0.9, ease: ease }, 0);
        tl.to(sp, { s: 0, duration: 2, ease: ease, onUpdate: spread }, 0);
        letters.forEach(function (L, i) {
          tl.to(L, { o: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: paint }, 0.05 + i * 0.05);
          tl.to(L, { f: 1, duration: 0.45, ease: 'power1.inOut', onUpdate: paint }, 0.75 + i * 0.045);
        });
        tl.to(o, { settle: 1, duration: 0.5, ease: 'power1.inOut', onUpdate: paint }, 1.55);
        g.forEach(function (el, i) { tl.from(el, { scaleX: 0, duration: 1.4, ease: ease }, -0.05 + i * 0.08); });
        gv.forEach(function (el, i) { tl.from(el, { scaleY: 0, duration: 1.2, ease: ease }, 0.05 + i * 0.08); });
        // the measure lines are revealed (clipped), not scaled, so their labels keep their shape
        tl.fromTo(dw, { clipPath: 'inset(-12px 100% -12px 0px)' }, { clipPath: 'inset(-12px 0% -12px 0px)', duration: 1.1, ease: ease }, 0.05);
        tl.from(labW, { autoAlpha: 0, duration: 0.3 }, 0.15);
        var hc = { v: 0 };
        tl.fromTo(dh, { clipPath: 'inset(100% -300px 0% -12px)' }, { clipPath: 'inset(0% -300px 0% -12px)', duration: 0.9, ease: ease }, 0.35);
        tl.from(labH, { autoAlpha: 0, duration: 0.25 }, 0.5);
        tl.to(hc, { v: m.cap, duration: 0.8, ease: ease, onUpdate: function () { labH.textContent = Math.round(hc.v) + ' PX'; } }, 0.5);
      }

      function start() {
        place();
        // on a page transition the page is on the cube's face by the next frame: wait until it has rolled over
        requestAnimationFrame(function () {
          if (document.querySelector('.page-transition__stage')) gsap.delayedCall(1.25, play);
          else gsap.delayedCall(0.15, play);
        });
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
      window.addEventListener('resize', function () { if (!running) { var m = place(); labels(); layoutLetters(m); } });
    })();
  }

  // rdSvcBall — was: /service, page footer code
  function rdSvcBall() {
    /* SERVICE HERO BALL (hero chat, lab prototype/service-hero-2 ball.js, Rimbo's pick 2026-11-10: "E x ruler", Bloom, L).
       The brand's living ball (rdBallGL, the calm look of rdLocBalls) centred where the E's guide line meets the ruler,
       so the ruler cuts off its top half (Designer: svh_ball_clip starts under the ruler, svh_ball holds the canvas, size is
       the class's width). It arrives as a measured drawing: a cross on the ruler line, the radius out down-left with the
       number counting (svh_lab is-ball), the dashed ring sweeping round from there with ticks at the quarters, then the colour
       blooms in from the middle. After that only the number fades; ring and ticks stay. The pointer warms the colour. */
    (function () {
      var hero = document.querySelector('.sv_hero');
      var clip = hero && hero.querySelector('[data-svh="ball-clip"]'), ball = hero && hero.querySelector('[data-svh="ball"]');
      var cv = hero && hero.querySelector('[data-svh="ball-cv"]'), marks = hero && hero.querySelector('[data-svh="ball-marks"]');
      var label = hero && hero.querySelector('[data-svh="ball-lab"]'), ruler = hero && hero.querySelector('.sv_ruler');
      var guide = hero && hero.querySelector('.svh_gv.is-right'), title = hero && hero.querySelector('[data-svh="title"]');
      if (!ball || !cv || !marks || !label || !guide || !title || !window.gsap) return;
      var NS = 'http://www.w3.org/2000/svg', DEG = 135, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      var bloom = window.CustomEase ? CustomEase.create('svhBloom', '0.32, 0, 0.12, 1') : 'power3.out';
      var ease = window.CustomEase ? CustomEase.create('svhOsmo2', '0.625, 0.05, 0, 1') : 'expo.inOut';
      var fx = { reveal: 0, grow: 1 }, b = { x: 0, y: 0, tx: 0, ty: 0, amt: 0, target: 0 }, time = 0, last = 0, lastDraw = 0, raf = 0, on = false, D = 0, parts = null;
      var ballGL = rdBallGL('loc', true); // THE BRAND BALL, with the bloom
      if (!ballGL) { clip.style.display = marks.style.display = 'none'; return; }

      function draw() {
        if (!D) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5), mid = Math.round(D * dpr) / 2 / dpr; // the middle of the canvas's own pixels
        var R = (D / 2 - 9) * fx.grow * (calm ? 1 : 1 + Math.sin(time * 0.37) * 0.015);
        ballGL(cv, D, D, dpr, { cx: mid, cy: mid, R: R, seed: 23, bias: -0.12, t: time, px: b.x, py: b.y, pr: Math.min(Math.max(R * 0.4, 60), 160), amt: b.amt, reveal: fx.reveal });
      }
      // runs only while the hero is on screen, and stops for good once the page has been left (page transitions)
      function frame(now) {
        if (!hero.isConnected) return;
        if (!on || document.hidden) { raf = 0; return; }
        raf = requestAnimationFrame(frame);
        var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016; last = now; time += dt;
        b.x += (b.tx - b.x) * 0.12; b.y += (b.ty - b.y) * 0.12; b.amt += (b.target - b.amt) * 0.06;
        if (fx.reveal >= 1 && fx.grow >= 1 && now - lastDraw < 33) return; // 30 frames a second for slow colours, every frame while it blooms
        lastDraw = now; draw();
      }
      function run() { if (!raf && !calm && on) { last = 0; raf = requestAnimationFrame(frame); } }
      new IntersectionObserver(function (es) { on = es[0].isIntersecting; if (on) run(); }).observe(hero);
      document.addEventListener('visibilitychange', run);

      // place it: centre on the E's line (the guide's resting place) where it meets the ruler; draw the ring, ticks and marks
      function layout() {
        D = ball.offsetWidth;
        var under = ruler ? ruler.offsetTop + ruler.offsetHeight : 92, ex = title.offsetLeft + guide.offsetLeft;
        clip.style.top = under + 'px';
        ball.style.left = marks.style.left = (ex - D / 2).toFixed(1) + 'px';
        ball.style.top = (-D / 2) + 'px'; marks.style.top = (under - D / 2) + 'px';
        var c = D / 2, r = c - 0.5, C = 2 * Math.PI * r, k = 5, ra = DEG * Math.PI / 180, ticks = '';
        [0, 90, 180, 270].forEach(function (d) {
          var t = d * Math.PI / 180;
          ticks += '<line data-deg="' + d + '" x1="' + (c + Math.cos(t) * (r + 3)).toFixed(1) + '" y1="' + (c + Math.sin(t) * (r + 3)).toFixed(1) +
            '" x2="' + (c + Math.cos(t) * (r + 10)).toFixed(1) + '" y2="' + (c + Math.sin(t) * (r + 10)).toFixed(1) + '"/>';
        });
        var old = ball.querySelector('svg'); if (old) old.remove();
        var oldM = marks.querySelector('svg'); if (oldM) oldM.remove();
        var st = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none';
        ball.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 ' + D + ' ' + D + '" style="' + st + '">' +
          '<defs><mask id="svhBallMask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="' + (D + 40) + '" height="' + (D + 40) + '"><circle cx="' + c + '" cy="' + c + '" r="' + r +
          '" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" transform="rotate(' + DEG + ' ' + c + ' ' + c + ')"/></mask></defs>' +
          '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="rgba(248,245,238,.35)" stroke-width="1" stroke-dasharray="4 4" mask="url(#svhBallMask)"/>' +
          '<g stroke="rgba(248,245,238,.45)" stroke-width="1">' + ticks + '</g></svg>');
        var ex2 = c + Math.cos(ra) * r, ey2 = c + Math.sin(ra) * r;
        marks.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 ' + D + ' ' + D + '" style="' + st + '"><g stroke="rgba(248,245,238,.45)" stroke-width="1">' +
          '<line data-rad x1="' + c + '" y1="' + c + '" x2="' + ex2.toFixed(1) + '" y2="' + ey2.toFixed(1) + '" pathLength="1" stroke-dasharray="1 1"/>' +
          '<g data-cross><line x1="' + (c - k) + '" y1="' + c + '" x2="' + (c + k) + '" y2="' + c + '"/><line x1="' + c + '" y1="' + (c - k) + '" x2="' + c + '" y2="' + (c + k) + '"/></g></g></svg>');
        label.style.left = (c + Math.cos(ra) * (r + 16)).toFixed(1) + 'px'; label.style.top = (c + Math.sin(ra) * (r + 16)).toFixed(1) + 'px';
        label.style.transform = 'translate(-100%, 0)';
        parts = { mask: ball.querySelector('mask circle'), C: C, rad: marks.querySelector('[data-rad]'), cross: marks.querySelector('[data-cross]'),
          ticks: [0, 90, 180, 270].sort(function (p, q) { return ((p - DEG + 360) % 360) - ((q - DEG + 360) % 360); })
            .map(function (d) { return ball.querySelector('line[data-deg="' + d + '"]'); }) };
      }

      if (!calm) {
        ball.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var rr = ball.getBoundingClientRect(), kk = rr.width / D; b.tx = (e.clientX - rr.left) / kk; b.ty = (e.clientY - rr.top) / kk;
          if (!b.target) { b.x = b.tx; b.y = b.ty; }
          b.target = 1;
        });
        ball.addEventListener('pointerleave', function () { b.target = 0; });
      }

      var played = false;
      hero.addEventListener('svh:play', function () {
        layout(); played = true;
        if (calm) { fx.reveal = 1; parts.mask.setAttribute('stroke-dashoffset', 0); gsap.set([parts.rad, parts.cross, label], { autoAlpha: 0 }); draw(); return; }
        var bc = { v: 0 }, at = 0.5;
        var tl = gsap.timeline();
        tl.fromTo(parts.cross, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(2)' }, at);
        tl.fromTo(parts.rad, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: 0.7, ease: ease }, at + 0.25);
        tl.fromTo(label, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at + 0.35);
        tl.fromTo(bc, { v: 0 }, { v: D, duration: 0.9, ease: ease, onUpdate: function () { label.textContent = 'Ø ' + Math.round(bc.v) + ' PX'; } }, at + 0.3);
        tl.fromTo(parts.mask, { attr: { 'stroke-dashoffset': parts.C } }, { attr: { 'stroke-dashoffset': 0 }, duration: 1.4, ease: 'power2.inOut' }, at + 0.8);
        parts.ticks.forEach(function (t, i) { tl.fromTo(t, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, at + 0.8 + i * 0.33); });
        tl.fromTo(fx, { reveal: 0 }, { reveal: 1, duration: 1.9, ease: bloom }, at + 2);
        tl.fromTo(fx, { grow: 0.88 }, { grow: 1, duration: 2.3, ease: bloom }, at + 2);
        tl.to([parts.cross, parts.rad], { autoAlpha: 0, duration: 0.6 }, at + 2.3);
        tl.to(label, { autoAlpha: 0, duration: 0.9, ease: 'power1.inOut' }, at + 3.9); // only the number goes; ring and ticks stay
        run();
      });
      window.addEventListener('resize', function () {
        if (!played) return;
        var keepTicks = parts && parts.ticks.map(function (t) { return t && getComputedStyle(t).opacity; });
        layout();
        // after a resize everything is in its end state: ring whole, ticks shown, marks gone
        parts.mask.setAttribute('stroke-dashoffset', 0); gsap.set([parts.rad, parts.cross, label], { autoAlpha: 0 });
        draw();
      });
    })();
  }

  // rdContactCopy — was: /contact, page footer code
  function rdContactCopy() {
    (function () {
      document.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('[data-ct-copy]') : null;
        if (!a || !navigator.clipboard || !navigator.clipboard.writeText) return;
        e.preventDefault();
        navigator.clipboard.writeText(a.getAttribute('data-ct-copy')).then(function () {
          var t = a.parentElement ? a.parentElement.querySelector('[data-ct-toast]') : null;
          if (!t) return;
          clearTimeout(t.rdCtT);
          if (window.gsap) {
            gsap.killTweensOf(t);
            gsap.fromTo(t, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'expo.out' });
            t.rdCtT = setTimeout(function () { gsap.to(t, { autoAlpha: 0, y: -4, duration: 0.4, ease: 'power2.in' }); }, 1800);
          } else {
            t.style.opacity = 1;
            t.rdCtT = setTimeout(function () { t.style.opacity = 0; }, 1800);
          }
        }, function () { window.location.href = a.href; });
      });
    })();
  }

  // The 404 game and the /proposal calculator are their own files, loaded by their pages after this one: their start
  // waits for them (on a first load they only arrive after this file; after a page transition they are already there)
  function rdBotsStart() { if(window.rdBotsScreen)rdBotsScreen();if(window.rdBots)rdBots(); }
  function rdCalcMount() { window.rdCalc && rdCalc.mount(); }
  function afterPageFiles(name, fn) {
    var go = inZone(function () { run(name, fn); });
    if (document.readyState === 'loading') EventTarget.prototype.addEventListener.call(document, 'DOMContentLoaded', go);
    else go();
  }

  // Is this script still in the page's own HTML (Webflow not cleaned yet)? Then that copy runs, not ours
  function stillInWebflow(source, signs) {
    return qsa('script:not([src])', source).some(function (el) {
      return signs.some(function (s) { return el.textContent.indexOf(s) >= 0; });
    });
  }

  // source = the page's HTML: the document on a first load, the fetched page after a transition
  function fromWebflow(source) {
    var path = pagePath();
    var list = [
      [path === '/service' && has('.svh_hold'), 'rdSvcPlaces', rdSvcPlaces, ['SERVICE HERO: THE FIRST BAND']],
      [path === '/service' && has('.svh_hold'), 'rdSvcPin', rdSvcPin, ['SERVICE HERO: PINNED + SHRINK']],
      [path === '/service' && has('#map'), 'rdSvcMap', rdSvcMap, ['THE MAP: the one effect']],
      [path === '/service' && has('#map'), 'rdSvcMapLive', rdSvcMapLive, ['THE MAP: contour lines that move']],
      [path === '/service' && has('#map'), 'rdSvcMapHold', rdSvcMapHold, ['THE MAP holds still while the next section']],
      [path === '/service' && has('#how'), 'rdHowItGoes', rdHowItGoes, ['03 HOW IT GOES']],
      [path === '/service', 'rdSvcLayers', rdSvcLayers, ['How it goes holds still at its end']],
      [has('[data-fold="faq"]'), 'rdFoldFaq', rdFoldFaq, ['all questions start closed; one open at a time', 'all questions start closed and only one is open']],
      [has('[data-ex]'), 'rdPostEnd', rdPostEnd, ["querySelectorAll('[data-ex]:not([data-ex-on])')"]],
      [path === '/work' && has('.wh'), 'rdWorkHeroLoad', rdWorkHeroLoad, ['load Tinko, then the hero']],
      [path === '/work' && has('.ws_wrap'), 'rdWorkSplit', rdWorkSplit, ["var wrap = document.querySelector('.ws_wrap'); if (!wrap) return;"]],
      [path === '/work', 'rdWorkLayers', rdWorkLayers, ["var pass = document.querySelector('.hx_pass'), arch = document.getElementById('archive');"]],
      [path === '/work' && has('[data-follower-wrap]'), 'rdWorkFollower', rdWorkFollower, ['function initPreviewFollower()']],
      [path === '/work', 'rdWorkArchiveView', rdWorkArchiveView, ["var sec = document.getElementById('archive'); if (!sec) return;"]],
      [has('.cs_page'), 'rdCasePage', rdCasePage, ['var ready = window.gsap && window.Draggable;']],
      [has('.loc_show [data-rw-cursor]'), 'rdCaseDrum', rdCaseDrum, ["var cursor = sec.querySelector('[data-rw-cursor]');"]],
      [true, 'rdBlogCardLinks', rdBlogCardLinks, ["querySelectorAll('.tk_section .ac_card:not([data-ac-done])')"]],
      [path === '/service', 'rdSvcHero', rdSvcHero, ['SERVICE HERO (hero chat']],
      [path === '/service', 'rdSvcBall', rdSvcBall, ['SERVICE HERO BALL']],
      [path === '/contact', 'rdContactCopy', rdContactCopy, ['window.rdCtCopy = true;']]
    ];
    var waiting = [];
    [window, document].forEach(function (target) {
      target.addEventListener = function (type, fn, options) {
        if (type === 'DOMContentLoaded' || type === 'load') { waiting.push(fn); return; }
        EventTarget.prototype.addEventListener.call(target, type, fn, options);
        rdUndo(function () { EventTarget.prototype.removeEventListener.call(target, type, fn, options); });
      };
    });
    try {
      list.forEach(function (row) {
        if (row[0] && !stillInWebflow(source, row[3])) run(row[1], row[2]);
      });
      waiting.forEach(function (fn) { run('from webflow', fn, new Event('DOMContentLoaded')); });
    } finally {
      delete window.addEventListener;
      delete document.addEventListener;
    }
    // the open graph address: the same as the old snippet in the head of /resources and the old project pages
    if ((path === '/resources' || /^\/work\/(catherine-hamilton|grow-guide-tripsitters|henry-byrne-artist-portfolio-website|nathan-rajac|muzammil-hussain|pooh-balance|psychedelic-passage|mushroomtao)$/.test(path)) && !stillInWebflow(source, ['Find or create the Open Graph URL meta tag'])) run('og url', rdOgUrl);
    if (qs('script[src*="/prototype/404/bots"]', source) && !stillInWebflow(source, ['if(window.rdBotsScreen)rdBotsScreen();'])) afterPageFiles('404 game', rdBotsStart);
    if (qs('script[src*="/prototype/calculator/"]', source) && !stillInWebflow(source, ['window.rdCalc && rdCalc.mount();'])) afterPageFiles('calculator', rdCalcMount);
  }

  // What runs on which page. Runs on every page, first load or swap
  function initPageFunctions() {
    var path = pagePath();
    run('logo', rdLogoSwap);
    run('dutch lines', rdLocNl); // before the buttons and the apply form read their lines
    run('css loops rest', rdRestCssLoops);
    run('work clips', rdWorkClips); // before rdWorkHeroLoad / work-hero.js and rdWorkSplit read the Work page's videos
    if (path.indexOf('/post/') === 0) run('post refresh', rdPostRefresh); // builds the new post page first: the buttons and the ruler pick it up (English posts; the Dutch ones keep the current layout until there are Dutch texts)
    run('band', rdBand);   // builds the home-opening rows before the marquees start
    run('global', rdGlobal);
    // from here: not needed to show the first screen, so on a first load these take their turn (soon, at the top of this file)
    soon('location faq button', rdLocFaqBtn);
    soon('buttons', rdButtons);
    soon('form validation', rdFormValidation);
    soon('post cards', rdPostCards);
    // the new Blueprint footer, page by page until Rimbo's go (home-v4: Rimbo, 5 Nov); ?footer=new tries it on any staging page
    // a post the refresh didn't touch keeps its old footer
    var oldFooter = path.indexOf('/post/') === 0 && !document.documentElement.classList.contains('rf');
    if (oldFooter) qsa('.rdf').forEach(function (el) { el.parentNode.removeChild(el); });
    else if (path === '/resources') run('old footer out', rdOldFooterOut);
    soon('footer', rdFooter);
    run('location showcase', rdLocShow);
    // the balls and the wall are far down the page, so their WebGL and slider start when they come near (on every page:
    // on the home the wall cost a sixth of the start-up, two screens and a pinned dial before anyone can see it)
    var later = function (sel, name, fn) {
      var el = qs(sel);
      if (!el) return;
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); inContext(function () { run(name, fn); }); } }, { rootMargin: '100% 0px' });
      io.observe(el);
    };
    later('.loc_steps', 'location balls', rdLocBalls);
    if (qs('.wall_section')) later('.wall_section', 'wall of love', rdWall); else soon('wall of love', rdWall); // a wall outside a .wall_section has nothing to watch for
    soon('imagine', rdImagine); // the big ball + IMAGINE (home): light to start, its WebGL waits until the section is on screen
    later('.wh_sec', 'work wall', rdWorkWall); // the wall of work covers before the questions (home): starts when it comes near
    soon('faq', rdFaq);
    soon('journey pass', rdPass);
    soon('dfs card', rdDfc);
    soon('dfs logo turn', rdLogoTurn);

    if (qs('[data-band]')) {} // the band page has its own opening (rdBand above), no old hero to animate
    else if (path === '/service' || path.indexOf('/locations/') === 0) run('service', rdService);
    else if (path === '/work') run('work', rdWork);
    else if (path.indexOf('/work/') === 0) run('case study', rdWorkItem);
    else if (path === '/branding-brilliance-newsletter' || path === '/call-is-booked') run('newsletter', rdNewsletter);
    else if (path === '/resources') run('resources', rdResources);
    else if (path === '/rimbo-quiz') run('quiz', rdQuiz);
    else if (path.indexOf('/post/') === 0) {
      soon('scroll ruler', rdScrollRuler);
      soon('cover hue drift', rdCoverHueDrift);
    }

    // the location pages' small parts, last: where their Webflow page code used to run (after everything above on a page
    // swap, before the queued ones on a first load)
    run('location faq', rdLocFaq);
    run('location city', rdLocCity);
    run('globe', rdGlobe);
    if (path === '/locations') {
      soon('location card lean', rdLocLean);
      soon('og url', rdOgUrl);
    }

    // /apply, last for the same reason: the form itself at once (it is the first screen), the thank-you's parts in turn
    run('apply', rdApply);
    soon('apply name', rdApplyName);
    soon('apply demo', rdApplyDemo);
  }

  // The ones that need the whole page in place first
  function initLateFunctions() {
    var path = pagePath();
    if (path === '/audit') run('letter reveal', rdLetterReveal, { duration: 2, delay: 0.4 });
    if (path === '/my-story') run('letter reveal', rdLetterReveal, { duration: 1.4, delay: 0.3 });
  }

  if (barbaOn) startBarba();
  else initOnceFunctions();

})();
