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
  var barbaOn = typeof barba !== 'undefined' && typeof CustomEase !== 'undefined' &&
    /\.webflow\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) &&
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
      runPageScripts(doc.body);
      restartWebflow();
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
  var tearStyle = null;

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

  function tearCss() {
    if (tearStyle) return;
    tearStyle = document.createElement('style');
    tearStyle.textContent =
      '.tear_layer{position:fixed;inset:0;overflow:hidden}' +
      '.tear_stage{position:fixed;inset:0;z-index:999;overflow:hidden;perspective:1600px}' +
      '.tear_part{position:absolute;will-change:transform}' +
      '.tear_shadow{position:absolute;opacity:0;box-shadow:0 1.5rem 3rem rgba(19,19,19,.3),0 .25rem .75rem rgba(19,19,19,.2)}' +
      '.tear_clone{position:absolute!important;left:0;top:0;margin:0!important;pointer-events:none}' +
      '.tear_clone .pass_stub{transition:none!important}' +
      '.tear_clone.is-main .pass_stub,.tear_clone.is-stub .pass_main{visibility:hidden}' +
      '.tear_shade{position:absolute;inset:0;z-index:50;opacity:0;pointer-events:none;background:linear-gradient(180deg,rgba(19,19,19,.55),rgba(19,19,19,.15))}' +
      '.tear_fibre{position:absolute;z-index:60;overflow:visible;pointer-events:none}' +
      '.tear_fleck{position:absolute;left:0;top:0;z-index:70;background:' + TEAR_PAPER + ';opacity:0;pointer-events:none}';
    document.head.appendChild(tearStyle);
  }

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
          tearCss();
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
              var foil0 = parseFloat((copies[0] || pass).style.getPropertyValue('--hi')) || 0; // the strength the copies were made with
              tl.eventCallback('onUpdate', function () {
                var t = tl.time(), a = lean.exec(pass.style.transform), k = t >= 0.3 ? 0 : 1 - t / 0.3;
                k = k * k * (3 - 2 * k);
                if (a && t < 0.3) gsap.set(copies, { rotationX: +a[1] * k, rotationY: +a[2] * k });
                var foil = parseFloat(pass.style.getPropertyValue('--hi'));
                copies.forEach(function (copy, i) {
                  copy.style.setProperty('--hx', pass.style.getPropertyValue('--hx'));
                  copy.style.setProperty('--hy', pass.style.getPropertyValue('--hy'));
                  if (!isNaN(foil)) copy.style.setProperty('--hi', (foil0 + (foil - foil0) * k).toFixed(3));
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
        name: 'cube',
        sync: true,
        custom: function (data) { return data.trigger !== 'back' && data.trigger !== 'forward' && data.trigger !== 'popstate' && !linkHash && !reducedMotion && !tearRule(data); },
        leave: function (data) { return runPageLeaveAnimation(data.current.container, data.next.container, data); },
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
    var details = 'meta[name="description"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"]';
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
  function restartWebflow() {
    if (!window.Webflow) return;
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
      // (GSAP's lag smoothing stays on: after a stall, animations continue instead of jumping)
      instance.on('scroll', ScrollTrigger.update);
      rdTick(function (time) { instance.raf(time * 1000); });
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
    run('chip boil', rdChipBoil);
  }

  // The filter chips borrow button 06's stop-motion boil (rdButtons): while the mouse is on a chip, every
  // letter cycles through three hand-placed poses at 9 fps, set frame by frame like drawn frames; on leave
  // they settle back. No label swap, no magnet. Mouse only (a tap would leave it boiling), off for reduced motion.
  function rdChipBoil() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var rnd = gsap.utils.random;
    var FPS = 9;
    qsa('.rs-chip, .rs-reset, [data-boil]').forEach(function (btn) {
      if (btn.hasAttribute('data-boil-ready')) return;
      var label = qs('span', btn) || btn;
      var chars = Array.from(label.textContent).map(function (ch) {
        var c = document.createElement('span');
        c.className = 'rs-ch';
        c.style.display = 'inline-block';
        c.textContent = ch === ' ' ? '\u00a0' : ch;
        return c;
      });
      btn.setAttribute('aria-label', label.textContent.trim());
      label.textContent = '';
      chars.forEach(function (c) { c.setAttribute('aria-hidden', 'true'); label.appendChild(c); });
      btn.setAttribute('data-boil-ready', '');
      var poses = chars.map(function () {
        return [0, 1, 2].map(function () { return { x: rnd(-0.6, 0.6), y: rnd(-0.7, 0.7), rotation: rnd(-3, 3) }; });
      });
      gsap.set(chars, { transformOrigin: '50% 55%' });
      var running = false, last = -1, t0 = 0;
      function tick() {
        var f = Math.floor((gsap.ticker.time - t0) * FPS);
        if (f === last) return;
        last = f;
        chars.forEach(function (c, i) { gsap.set(c, poses[i][(f + i) % 3]); });
      }
      rdUndo(function () { gsap.ticker.remove(tick); }); // noted once: one note per hover would pile up for as long as the page stays
      btn.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || running) return;
        running = true; last = -1; t0 = gsap.ticker.time;
        gsap.ticker.add(tick);
      });
      btn.addEventListener('pointerleave', function () {
        if (!running) return;
        running = false;
        gsap.ticker.remove(tick);
        gsap.to(chars, { x: 0, y: 0, rotation: 0, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      });
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
    function fetchImage(file) {
      if (!loaded[file]) {
        var image = new Image();
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
        gsap.to(el, { opacity: 1, duration: reduce ? 0 : 0.25, ease: 'power1.out' });
      });
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

    function fillQuestion() {
      var q = questions[index];
      questionEl.textContent = q.text;
      answers.forEach(function (answer, i) {
        labels[i].textContent = q.choices[i];
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
      index++;
      var last = index >= questions.length;
      // hold the pressed answer for a beat, and give the next picture that time (and a little more) to arrive
      Promise.all([wait(reduce ? 120 : 300), imageOrWait(last ? endImage() : questions[index].img, 1200)]).then(function () {
        return leave('play');
      }).then(function () {
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
      rdOn(answer, 'pointerenter', function (e) { if (e.pointerType === 'mouse' && !busy) answer.classList.add('is-hover'); });
      rdOn(answer, 'pointerleave', function () { answer.classList.remove('is-hover'); });
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
      var items = qsa('.spatial-gsap-slider__item', list).map(function (el, i) { var panel = qs('[data-band-name]', el) || el; return { el: el, k: i <= mid ? i : i - N, name: panel.getAttribute('data-band-name') || '', fly: 0, tan: 0, gone: 0 }; }); // 0 = the first card, in front at rest; the last ones sit to its left; the line is what the dial says in its middle (data-ring-line on the panel, the name if there is none)
      var label = qs('.band_ring-name', hero); // Designer: band_ring-name, the script only writes in it
      if (!label) { label = document.createElement('div'); label.className = 'band_ring-name'; label.setAttribute('aria-hidden', 'true'); hero.appendChild(label); }
      var bottomFade = qs('.band_fade.is-bottom', hero); // covers the clip edge at rest; it lifts while the dial lies flat, so the lower cards stay bright
      var st = { steps: 0, scroll: 0, tip: 0, open: 0, scale: 1, y: 0, dx: 0, fade: 1, pitch: 0, w: 0, h: 0, fit: 0.45, tween: null, front: -1, dir: 1, closing: false, text: '', blurOn: false };
      var persp = parseFloat(getComputedStyle(ring).perspective) || 2400; // the ring root is the camera
      var clamp01 = function (v) { return Math.max(0, Math.min(1, v)); };
      var arcR = function () { return st.pitch / (2 * Math.sin(REST / 2 * rad)); }; // the drum's cylinder: the cards a pitch apart along it
      var dialR = function () { return Math.max(arcR() * ringGrow, st.w / (2 * Math.sin(Math.PI / N)) + st.h * 0.3); }; // the flat dial: the drum grown a little, and never so tight that the cards pile up in the middle
      var measure = function () { var w = originals[0].offsetWidth || window.innerWidth * 0.285, gap = window.innerWidth * 0.025; st.pitch = w + gap; st.w = w; st.h = originals[0].offsetHeight || w / 1.02; st.fit = Math.min(0.6, window.innerHeight * 1.2 / (2 * (dialR() + st.h / 2))) || 0.45; st.top = ring.offsetTop; }; // the flat dial stands 1.2 screens tall, bleeding a little top and bottom like the first ring, whatever the count; top: read here once, not in render, where reading it right after the transforms made the browser lay the page out again every frame
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
      measure(); render();
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
          var e = ease3(q / 0.35), x = clamp01((q - 0.75) / 0.25); // e: the tip-over; x: the way out (a quarter of the hold: Rimbo found it too fast)
          st.closing = x > 0;
          st.tip = 90 * e; st.open = e; st.y = -window.innerHeight * 0.08 * e;
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
      if (!url || m.readyState >= 2 || c.__frame || c.__face === false) return;
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
      });
    }
    function paintClones(m) {
      if (m.readyState < 2 || !m.__canvases) return;
      m.__canvases.forEach(function (c) {
        if (c.__vis === false || c.__face === false) return; // off screen, or a ring card facing away: nothing to show
        paintOne(m, c);
      });
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
      if ('IntersectionObserver' in window) {
        if (!clipIO) clipIO = new IntersectionObserver(function (entries) {
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
            else if (m.paused && !hidden && m.__tuned && !m.__wait) { paintClones(m); var p = m.play(); if (p && p.catch) p.catch(function () {}); }
          });
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
        trigger: hero, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * pinScreens); }, pin: true, pinSpacing: true, invalidateOnRefresh: true,
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
    nav.forEach(function (el) { el.style.opacity = '0'; }); // a plain style, not gsap.set: the page's revert on leaving would clear it again after the next page's opening had hidden the logo
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
    var t0 = performance.now(), shown = 0;
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
      shown += (target - shown) * 0.09;
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
      rdUndo(function () { gsap.ticker.remove(tick); }); // noted once, here, for this page: start() runs later, from a hover or a timer, when "the page on screen" can already be the next one
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

  // Osmo's CSS, with RM Mono in place of Haffer Mono. The site's theme comes after it.
  var SCROLL_RULER_CSS = [
    '.scroll-ruler { --scroll-ruler-color: #f2f2f2; --scroll-ruler-accent: #e4441c; z-index: 50; color: var(--scroll-ruler-color); padding-left: 1.25em; padding-right: 2.5em; position: fixed; top: 20svh; bottom: 20svh; left: 0; cursor: pointer; touch-action: manipulation; user-select: none; transition: opacity 0.6s ease; }',
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
    // #2cb9d6 over the beige (#f8f5ee) comes out as the link orange (#cc3c18); over black it shows as itself.
    '.scroll-ruler { --scroll-ruler-color: #fff; --scroll-ruler-accent: #2cb9d6; mix-blend-mode: difference; }',
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
    '.scroll_progress_indicatror { display: none; }',
    // one language for the tick lengths: long = an H2 (Osmo), medium = an H3 (.is-sub, set by rdScrollRuler),
    // short = the rest (Osmo's every-5th medium tick meant nothing in an article); the current tick is 2px
    '.scroll-ruler__tick[data-scroll-ruler-size="mid"] { width: .75em; }',
    '.scroll-ruler__tick.is-sub:not([data-scroll-ruler-size="major"]) { width: 1.125em; }',
    '.scroll-ruler__tick[data-scroll-ruler-status="current"] { height: 2px; }',
    // where the labels don't fit next to the text, and on tablets and phones, no ruler (the hero has the sections list)
    '.scroll-ruler.is-compact { display: none; }',
    '@media (max-width: 991px) { .scroll-ruler { display: none; } }'
  ].join('\n');

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
      rdHead(style);
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
        const rulerNarrow = window.matchMedia("(max-width: 991px)"); let asleep = false; // the ruler is display: none on narrow screens and when the article leaves it no room: no frames spent on it then
        function update(time) {
          if (rulerNarrow.matches || root.classList.contains("is-compact")) { asleep = true; return; }
          const frame = Math.min(gsap.ticker.deltaRatio(60), 3);
          const scrollY = window.scrollY; if (asleep) { asleep = false; lastScroll = scrollY; } const scrollDelta = scrollY - lastScroll; lastScroll = scrollY;
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
  var POST_REFRESH_CSS = [
    '.rf { --rf-ink: #131313; --rf-ink-60: rgba(19, 19, 19, .6); --rf-red: #e4441c; --rf-red-text: #cc3c18; --rf-coral: #e4441c; --rf-dark: #0c0c0c; --rf-col: 40rem; --rf-mono: var(--font--rm-mono, "Rm Mono", monospace); }',

    // grain: the site's own GRAIN_EFFECT style, under the content, half the home's strength
    '.rf .rf-grain { opacity: .03; z-index: -1; }',

    // hero: two columns, a little narrower than the cover so the cover is the widest thing on screen
    '.rf .blog_intro { margin-top: 0; padding-top: 168px; }',
    '.rf .blog_intro .container-20 { display: block; width: min(58rem, 100vw - 20rem); max-width: none; }',
    '.rf .blog_catagory, .rf .blog_intro .divider { display: none !important; }',
    '.rf-hero { display: grid; grid-template-columns: minmax(0, 1fr) 21rem; column-gap: 3rem; align-items: start; }',
    '.rf-hero__main { min-width: 0; }',
    '.rf-eyebrow { display: flex; align-items: center; gap: 10px; font-family: var(--rf-mono); font-size: 12px; line-height: 1; letter-spacing: .08em; text-transform: uppercase; color: var(--rf-ink-60); }',
    '.rf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rf-coral); flex: none; }',
    '.rf .h1_small { text-align: left; max-width: 32rem; width: auto; margin: 28px 0 0; font-size: 2.75rem; line-height: 1.04; color: var(--rf-ink); text-wrap: balance; }',
    '.rf .summary.padding-section-medium.custom { padding: 0; margin: 32px 0 0; max-width: 36rem; width: 100%; line-height: normal; display: block; }',
    '.rf .sumary { font-family: var(--font--body-font); font-weight: 400; font-size: 1.3125rem; line-height: 1.5; color: var(--rf-ink); text-align: left; width: 100%; margin: 0; }',

    // right column: the author on one row (square photo, name and date, LinkedIn and X on the right), then the sections
    '.rf-hero__side { padding-top: 2px; }',
    '.rf .rl_blogpost1_content-top { max-width: none; width: 100%; margin: 0; flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }',
    '.rf .rl_blogpost1_content-top .author-wrapper { margin: 0; gap: 14px; }',
    '.rf .rl_blogpost1_date-wrapper, .rf .rl_blogpost1_date-wrapper > *, .rf .rl_blogpost1_author-text { white-space: nowrap; }',
    '.rf .rl_blogpost1_share { display: flex; align-items: center; gap: 12px; margin: 0; }',
    '.rf .rl_blogpost1_social-link { display: flex; }',
    '.rf .rl_blogpost1_social-icon { margin: 0; width: 20px; height: 20px; }',
    '.rf .rl_blogpost1_social-icon svg { width: 20px; height: 20px; display: block; }',
    '.rf-toc { margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(19, 19, 19, .12); }',
    '.rf-toc summary { display: flex; list-style: none; cursor: pointer; margin-bottom: 14px; }',
    '.rf-toc summary::-webkit-details-marker { display: none; }',
    '.rf-toc ol { list-style: none; margin: 0; padding: 0; counter-reset: rftoc; }',
    '.rf-toc li { counter-increment: rftoc; margin: 0; }',
    '.rf-toc a { display: flex; gap: 12px; padding: 5px 0; font-size: 15px; line-height: 1.35; color: var(--rf-ink); text-decoration: none; }',
    '.rf-toc a::before { content: counter(rftoc, decimal-leading-zero); flex: none; padding-top: 2px; font-family: var(--rf-mono); font-size: 12px; color: var(--rf-red-text); }',
    '.rf-toc a:hover span { text-decoration: underline; text-decoration-color: var(--rf-red); text-underline-offset: .2em; }',
    '@media (min-width: 1200px) { .rf-toc summary { cursor: default; } }',

    '.rf .cover_holder { margin-top: 64px; }',
    '.rf .cover_image { width: min(64rem, 100vw - 16rem); height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: .25rem; }',
    '.rf .richtextbox { margin-top: 72px; }',

    '@media (max-width: 1199px) {' +
      ' .rf-hero { grid-template-columns: 1fr; }' +
      ' .rf-hero__side { margin-top: 32px; max-width: 28rem; }' +
      ' .rf .h1_small { max-width: 40rem; }' +
      // below 1200px the sections fold away under one line; the whole row is the tap target
      ' .rf-toc { margin-top: 20px; padding: 0; border-bottom: 1px solid rgba(19, 19, 19, .12); }' +
      ' .rf-toc summary { margin: 0; padding: 14px 0; justify-content: space-between; }' +
      ' .rf-toc summary::after { content: "+"; font-size: 16px; color: var(--rf-ink); }' +
      ' .rf-toc[open] summary::after { content: "–"; }' +
      ' .rf-toc[open] ol { margin: -2px 0 14px; }' +
    ' }',
    '@media (max-width: 991px) {' +
      ' .rf .blog_intro .container-20 { width: 90vw; }' +
      ' .rf .cover_image { width: 90vw; }' +
    ' }',
    '@media (max-width: 767px) {' +
      ' .rf .blog_intro { padding-top: 104px; }' +
      ' .rf .h1_small { font-size: 2rem; line-height: 1.05; margin-top: 20px; }' +
      ' .rf .summary.padding-section-medium.custom { margin-top: 24px; }' +
      ' .rf .sumary { font-size: 1.125rem; line-height: 1.5; }' +
      ' .rf-hero__side { margin-top: 28px; max-width: none; }' +
      ' .rf .cover_holder { margin-top: 32px; }' +
      ' .rf .cover_image { width: 100vw; border-radius: 0; }' +
      ' .rf .richtextbox { margin-top: 48px; }' +
    ' }',

    // reading: dark links with a red underline, a calmer type scale
    '.rf .richtextstyling a { color: var(--rf-ink); text-decoration: underline; text-decoration-color: var(--rf-red); text-decoration-thickness: 1px; text-underline-offset: .2em; }',
    '.rf .richtextstyling a:hover { color: var(--rf-ink); text-decoration-thickness: 2px; }',
    '.rf .richtextstyling h2, .rf .richtextstyling h3 { color: var(--rf-ink); text-wrap: balance; }',
    '.rf .richtextstyling h2 { font-size: 2.25rem; line-height: 1.15; margin-top: 4rem; margin-bottom: 1rem; }',
    '.rf .richtextstyling h3 { font-size: 1.5rem; line-height: 1.2; margin-top: 2.5rem; margin-bottom: .5rem; }',
    '.rf .richtextstyling h4 { font-family: var(--rf-mono); font-size: .8125rem; letter-spacing: .06em; text-transform: uppercase; font-weight: 400; color: var(--rf-ink); margin-top: 2rem; margin-bottom: .5rem; display: flex; align-items: center; gap: 10px; }',
    '.rf .richtextstyling h4::before { content: ""; width: 6px; height: 6px; background: var(--rf-coral); flex: none; }',
    '.rf .richtextstyling p { line-height: 1.6; }',
    '.rf .richtextstyling li { line-height: 1.6; margin-bottom: .5rem; }',
    '.rf .richtextstyling ul, .rf .richtextstyling ol { padding-left: 1.5rem; }',
    '.rf .richtextstyling ul li::marker { color: var(--rf-red); }',
    '.rf .richtextstyling ol { list-style: decimal-leading-zero; padding-left: 2.25rem; overflow: visible; }',
    '.rf .richtextstyling ol li::marker { font-family: var(--rf-mono); color: var(--rf-red-text); font-size: .9em; }',
    '.rf .richtextstyling figure img { outline: 1px solid rgba(19, 19, 19, .08); outline-offset: -1px; }',
    '.rf .richtextstyling figcaption { text-align: left; font-size: .875rem; line-height: 1.45; color: #6b6b6b; margin-top: .75rem; }',
    '.rf .richtextstyling figcaption a { color: inherit; }',
    '@media (min-width: 1280px) { .rf .richtextstyling img { max-width: 52rem; } }',
    '@media (min-width: 992px) and (max-width: 1279px) { .rf .richtextstyling img { max-width: var(--rf-col); } }',
    '@media (max-width: 767px) {' +
      ' .rf .richtextstyling p, .rf .richtextstyling li { font-size: 1.125rem; }' +
      ' .rf .richtextstyling h2 { font-size: 1.625rem; margin-top: 3.5rem; margin-bottom: .75rem; }' +
      ' .rf .richtextstyling h3 { font-size: 1.25rem; line-height: 1.25; margin-top: 2.5rem; }' +
      ' .rf .richtextstyling img { max-width: 100vw; }' +
      ' .rf .richtextstyling figcaption { padding: 0 5vw; }' +
    ' }',

    // no back-to-top button
    '.rf .back-to-top { display: none !important; }',
    '.rf .richtextstyling h2[tabindex="-1"]:focus { outline: none; }',

    // end of the page: one project block, then keep reading (the dark post cards from rdPostCards)
    '.rf .lead_mag { display: none; }',
    '.rf [data-component]:has(> .cta_container) { display: none; }',
    // the closing CTA (CTA_explore, on the Blog posts template)
    '.rf .duo_section { margin-top: 6rem; }',
    '@media (max-width: 767px) { .rf .duo_section { margin-top: 4rem; } }',
    // the page lifts off the new footer like a card: it needs its own background (the grain sits on it)
    '.rf .main-wrapper { background-color: var(--color--rimbobage, #f8f5ee); }',
    '.rf .blog_section .padding-section-large { padding-top: 8rem; }',
    '.rf .blog_section .padding-global { padding-left: 0; padding-right: 0; }',
    '.rf .blog_section .container-large { width: 90vw; max-width: none; }',
    '.rf .blog_section .blog_wrapper { display: block; }',
    '.rf .blog_section .blog_list { width: 100%; }',
    '.rf .blog_section .blog_highlight { align-items: stretch; }',
    '.rf .blog_section .blog_text { display: block; margin-bottom: 2rem; }',
    '.rf-kr-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }',
    '.rf-kr-title { font-family: var(--font--display-font); font-size: 2.25rem; line-height: 1.15; margin: .75rem 0 0; color: var(--rf-ink); }',
    '.rf .btn.rf-kr-all { flex: none; background-color: var(--rf-ink); border-color: var(--rf-ink); color: #f8f5ee; box-shadow: none; }',
    '.rf .btn.rf-kr-all:hover { color: #f8f5ee; }',
    '.rf .btn.rf-kr-all.is-hover { box-shadow: 0 .5rem 1.4rem rgba(19, 19, 19, .28); }',
    '.rf .rf-hide { display: none !important; }',
    '.rf .blog_section .blog_list.rf-two .blog_container { width: 100%; }',
    '@media (min-width: 992px) { .rf .blog_section .blog_list.rf-two { grid-template-columns: repeat(2, minmax(0, 1fr)); } }',
    '.rf .blog_section .btn-animate-chars { display: none; }', // "See All Resources": the header row has "All articles"
    '@media (max-width: 767px) {' +
      ' .rf .blog_section .padding-section-large { padding-top: 5rem; }' +
      ' .rf-kr-head { flex-direction: column; align-items: flex-start; }' +
      ' .rf-kr-title { font-size: 1.625rem; }' +
    ' }'
  ].join('\n');

  // Scrolls to a section heading from the "In this article" list
  function postJumpTo(h) {
    var off = window.matchMedia('(max-width: 1199px)').matches ? 80 : 32; // narrow: clear of the logo and burger (they end at 58px)
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    qsa('.richtextstyling img[loading="lazy"]').forEach(function (img) { img.loading = 'eager'; }); // so they stop moving the target
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
    // Only on staging and localhost until Rimbo gives the go for live (same gate as the scroll ruler)
    if (!/\.webflow\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) return;
    if (window.Webflow && Webflow.env && Webflow.env('editor') !== undefined) return;
    var container = qs('.blog_intro .container-20');
    var h1 = qs('.blog_intro .h1_small');
    if (!container || !h1 || document.documentElement.classList.contains('rf')) return;
    document.documentElement.classList.add('rf');

    var style = document.createElement('style');
    style.id = 'rd-post-refresh-css';
    style.textContent = POST_REFRESH_CSS;
    rdHead(style);

    var grain = document.createElement('div');
    grain.className = 'grain rf-grain';
    grain.setAttribute('aria-hidden', 'true');
    var page = qs('.main-wrapper');
    (page || document.body).insertBefore(grain, (page || document.body).firstChild);

    // ---- hero
    var cat = qs('.blog_catagory .blogcatagory');
    var category = cat ? cat.textContent.trim() : '';
    var eyebrow = document.createElement('div');
    eyebrow.className = 'rf-eyebrow rf-hero-eyebrow';
    eyebrow.innerHTML = '<span class="rf-dot"></span>';
    eyebrow.appendChild(document.createTextNode('Article' + (category ? ' · ' + category : '')));

    // the summary is a lead paragraph, not a second heading above the article (one H1, then the article's H2s)
    var summary = qs('.blog_intro .summary');
    var summaryHeading = summary && qs('h2.sumary', summary);
    if (summaryHeading) {
      var lead = document.createElement('p');
      Array.prototype.slice.call(summaryHeading.attributes).forEach(function (a) { lead.setAttribute(a.name, a.value); }); // keeps the Webflow entrance (data-w-id)
      while (summaryHeading.firstChild) lead.appendChild(summaryHeading.firstChild);
      summaryHeading.parentNode.replaceChild(lead, summaryHeading);
    }

    var author = qs('.rl_blogpost1_content-top');
    var hero = document.createElement('div'); hero.className = 'rf-hero';
    var main = document.createElement('div'); main.className = 'rf-hero__main';
    var side = document.createElement('aside'); side.className = 'rf-hero__side'; side.setAttribute('aria-label', 'About this article');
    main.appendChild(eyebrow); main.appendChild(h1); if (summary) main.appendChild(summary);
    if (author) side.appendChild(author);

    // the sections, with the ruler's short names; open next to the title, folded below 992px
    var article = qs('.richtextstyling');
    var sections = article ? qsa('h2', article).filter(function (h) { return h.textContent.trim() && h.textContent.indexOf('{skip}') === -1; }) : [];

    // the closing "Questions? Let's talk" section makes way for the project block below the article
    var last = sections[sections.length - 1];
    if (last && /^questions\?/i.test(last.textContent.trim())) {
      while (last.nextSibling) last.parentNode.removeChild(last.nextSibling);
      last.parentNode.removeChild(last);
      sections.pop();
    }
    if (sections.length > 1) {
      var toc = document.createElement('details');
      toc.className = 'rf-toc';
      toc.innerHTML = '<summary class="rf-eyebrow">In this article</summary><ol></ol>';
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
        a.href = '#' + h.id;
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

    // ---- end of the page: the closing CTA is Rimbo's CTA_explore on the Blog posts template, then keep reading
    // keep reading: these are the highlighted posts, not this post's category, so the heading stays general
    var text = qs('.blog_section .blog_text');
    if (text) text.innerHTML =
      '<div class="rf-kr-head"><div><div class="rf-eyebrow">Keep reading</div><h2 class="rf-kr-title">More articles</h2></div>' +
      '<a href="/resources" data-btn-alt="Browse them all" class="btn rf-kr-all w-inline-block"><div class="btn_in"><div class="btn_swap"><div class="btn_line"><div class="btn_t">All articles</div><div class="btn_arrow">→</div></div></div></div></a></div>';
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
    qsa('.scroll_wrap, .back-to-top').forEach(function (el) { el.parentNode.removeChild(el); });
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
  var POST_CARDS_CSS = (function () {
    function rules(x) {
      return [
        x + ' .blog_list { align-items: stretch; }',
        x + ' .post { height: auto; }',
        x + ' .image-318 { filter: none !important; }', // Rimbo: no hue shift on hover (the Webflow interaction still writes it)
        x + ' .blog_container { height: 100%; }',
        // centred, so a card next to a longer title keeps as much space above as below
        x + ' .blog_content { position: relative; top: auto; height: auto; flex: 1 1 auto; justify-content: center; padding: 1.25rem; transform: none !important; transition: transform .5s cubic-bezier(.2, .7, .2, 1); }',
        x + ' .blog_title { height: auto; margin-bottom: 0; }',
        x + ' .paragraph-46 { position: absolute; left: 1.25rem; right: 1.25rem; top: var(--rd-sub-top, calc(100% - .75rem)); margin: 0; opacity: 0; transition: opacity .35s ease; pointer-events: none; }',
        x + ' .post:hover .blog_content, ' + x + ' .blog_container:focus-visible .blog_content { transform: translateY(calc(-1 * var(--rd-sub, 0px))) !important; }',
        x + ' .post:hover .paragraph-46, ' + x + ' .blog_container:focus-visible .paragraph-46 { opacity: 1; transition: opacity .35s ease .1s; }',
        '@media (hover: none) { ' + x + ' .post:hover .blog_content { transform: none !important; } ' + x + ' .post:hover .paragraph-46 { opacity: 0; } }',
        '@media (prefers-reduced-motion: reduce) { ' + x + ' .blog_content { transition: none; } }'
      ];
    }
    return POST_CARD_SCOPES.map(rules).reduce(function (all, r) { return all.concat(r); }, [])
      .concat(['@media (max-width: 479px) { .blog_highlight .blog_list { row-gap: 1.5rem; } }']).join('\n');
  })();

  function rdPostCards() {
    // Only on staging and localhost until Rimbo gives the go for live (same gate as the scroll ruler)
    if (!/\.webflow\.io$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) return;
    var selector = POST_CARD_SCOPES.map(function (x) { return x + ' .post'; }).join(', ');
    if (!qs(selector)) return;
    if (!qs('#rd-post-cards-css')) {
      var style = document.createElement('style');
      style.id = 'rd-post-cards-css';
      style.textContent = POST_CARDS_CSS;
      rdHead(style);
    }
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
      rdHead(style);
    }
    cover.classList.add('is-hue-drift');
  }


  // =========================================================
  // FULL SCREEN NAV — every page, after Osmo Supply's "Bold Full Screen Navigation" (markup, class names, toggle logic):
  // - the bar is the logo + burger in their own fixed difference-blend layer, visible the whole time
  // - the links come from the Webflow menu (.pop-up_nav_menu, hidden; so Dutch follows along), in Integral capitals,
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
      var source = qsa('.pop-up_nav_menu .nav_link');
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
    var ease = 'cubic-bezier(.65, 0, .35, 1)';
    // The look is in the Designer: the component Nav_full, classes bold-nav*. Here only what a class can't hold: the old
    // navigation stepping aside, and everything that moves or switches
    var css = [
      '#FIXED_NAV, #Top_Nav, .burgermenu, .nav { display: none !important; }',
      '.bold-nav-full__hamburger:focus { outline: none; } .bold-nav-full__hamburger:focus-visible, .bold-nav-full__logo:focus-visible { outline: 1px solid #fff; outline-offset: 4px; border-radius: 2px; }',
      '.bold-nav-full__hamburger-bar { transition: transform .7s ' + ease + '; }',
      '.bold-nav-full__hamburger-bar:nth-child(1) { transform: translate(0, -.45em) scale(1, 1) rotate(0.001deg); }',
      '.bold-nav-full__hamburger-bar:nth-child(3) { transform: translate(0, .45em) scale(1, 1) rotate(0.001deg); }',
      '.bold-nav-full__hamburger:hover .bold-nav-full__hamburger-bar:nth-child(1) { transform: translate(0, -.45em) scale(.5, 1) rotate(0.001deg); }',
      '.bold-nav-full__hamburger:hover .bold-nav-full__hamburger-bar:nth-child(3) { transform: translate(0, .45em) scale(.5, 1) rotate(0.001deg); }',
      '[data-navigation-status="active"] .bold-nav-full__hamburger-bar:nth-child(1) { transform: translate(0, 0) rotate(45deg) scale(1, 1); }',
      '[data-navigation-status="active"] .bold-nav-full__hamburger-bar:nth-child(2) { transform: translate(-200%, 0) rotate(0.001deg) scale(1, 1); }',
      '[data-navigation-status="active"] .bold-nav-full__hamburger-bar:nth-child(3) { transform: translate(0, 0) rotate(-45deg) scale(1, 1); }',
      '[data-navigation-status="active"] .bold-nav-full__hamburger:hover .bold-nav-full__hamburger-bar:nth-child(1) { transform: translate(0, 0) rotate(45deg) scale(.7, 1); }',
      '[data-navigation-status="active"] .bold-nav-full__hamburger:hover .bold-nav-full__hamburger-bar:nth-child(3) { transform: translate(0, 0) rotate(-45deg) scale(.7, 1); }',
      // the tile's edge (clip-path) and the letters are driven by the timeline below
      '.bold-nav-full__tile { -webkit-backdrop-filter: blur(10px); will-change: clip-path; }',
      '.bold-nav-full__li { transition: opacity .5s ' + ease + '; }',
      '.bold-nav-full__link { will-change: transform; }',
      '.bold-nav-full__link:focus, .bold-nav-full__link:focus-visible { color: #f8f5ee; outline: none; }', // the site's global link hover would turn it coral
      // hover: the other links fade back, the hovered one stays as it is (no colour change, no roll)
      '.bold-nav-full__ul:has(.bold-nav-full__link:hover, .bold-nav-full__link:focus-visible) .bold-nav-full__li { opacity: .25; }',
      '.bold-nav-full__ul .bold-nav-full__li:has(.bold-nav-full__link:hover, .bold-nav-full__link:focus-visible) { opacity: 1; }',
      '.bold-nav__time { font-variant-numeric: tabular-nums; }',
      '.bold-nav__mail { transition: color .3s; }',
      // the language toggle, the same pill as on Resources (rdLangToggle drives it)
      '.bold-nav__lang .rs-lang__pill { position: absolute; top: .1875rem; bottom: .1875rem; left: .1875rem; width: calc((100% - .375rem) / var(--toggle-count, 2)); transform: translateX(calc(var(--toggle-active, 0) * 100%)); border-radius: .25rem; background-color: #f8f5ee; transition: transform .5s cubic-bezier(.625, .05, 0, 1); }',
      '.bold-nav__lang-link { transition: color .3s; }',
      '.bold-nav__lang-link[data-toggle-active] { color: #131313; }',
      '.bold-nav__lang-link:focus-visible { outline: 1px solid #f8f5ee; outline-offset: 2px; }'
    ].join('\n');
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
  // runs, so it gets the same hover as every other .btn (the FAQ script in the template then moves the line under the list)
  function rdLocFaqBtn() {
    var rich = qs('.loc_faq .w-richtext'), line = rich && rich.lastElementChild;
    var a = line && line.tagName === 'P' && line.children.length === 1 && line.firstElementChild;
    if (!a || a.tagName !== 'A' || line.textContent.trim() !== a.textContent.trim()) return;
    var label = a.textContent.trim();
    a.className = 'btn is-ink w-inline-block';
    a.setAttribute('data-btn-alt', 'Home');
    a.innerHTML = '<div class="btn_in"><div class="btn_swap"><div class="btn_line"><div class="btn_t"></div></div></div></div>';
    qs('.btn_t', a).textContent = label;
  }

  // A button's swap line is an attribute, which Webflow doesn't translate: on /nl the Dutch line comes from data-btn-alt-nl
  function rdLocBtnAlt() {
    if (!/^\/nl(\/|$)/.test(location.pathname)) return;
    qsa('[data-btn-alt-nl]').forEach(function (b) { b.setAttribute('data-btn-alt', b.getAttribute('data-btn-alt-nl')); });
  }

  // City pages, Zo werken we: one living ball per plain beige card, running off the edge, calm at step 1 and alive at 3.
  // Shader and motion come from the calculator (prototype/calculator/ball.js, the brand's ball with a see-through
  // outside): the colours flow and turn inside it and it floats and breathes on its own; the pointer only warms the
  // spot under it. One shared WebGL2 context, copied to a 2D canvas per card; runs only while the cards are on screen.
  function rdLocBalls() {
    var cards = qsa('.loc_steps .loc_step');
    if (!cards.length) return;
    var gl = rdGl(document.createElement('canvas').getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true }));
    if (!gl) return;
    var FRAG = "#version 300 es\n" +
      "precision highp float;\n" +
      "uniform vec2 res; uniform vec2 center; uniform float R; uniform float seed; uniform float bias; uniform float heat; uniform float grainScale; uniform float t;\n" +
      "uniform vec2 ptr; uniform float ptrR; uniform float ptrAmt; uniform vec3 stops[4]; uniform vec2 edges[3];\n" +
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
      "  float ang = h * 6.2831 + t * 0.16;\n" +
      "  float g = 0.53 + 0.14 * dot(l, vec2(cos(ang), sin(ang)));\n" +
      "  vec2 drift = vec2(sin(t * 0.34 + h * 6.2831), cos(t * 0.27 + h * 12.566)) * 0.62;\n" +
      "  vec2 w = vec2(fbm(l * 0.55 + h * 40.0 + drift), fbm(l * 0.55 + h * 70.0 + 5.2 - drift));\n" +
      "  float f = fbm(l * 1.0 + w * 1.3 + h * 90.0);\n" +
      "  float v = g + (f - 0.5) * 1.5 + bias - heat * 0.45;\n" +
      "  float dp = length(p - ptr) / max(ptrR, 1.0);\n" +
      "  v -= ptrAmt * 0.6 * exp(-dp * dp);\n" +
      "  vec3 col = ramp(clamp(v, 0.0, 1.0)) + grain;\n" +
      "  col = mix(col, ramp(clamp(v + (g1 - 0.5) * 0.18, 0.0, 1.0)) + grain, 0.35);\n" +
      "  outColor = vec4(clamp(col, 0.0, 1.0), smoothstep(1.0 + aa, 1.0 - aa, r));\n" +
      "}";
    function sh(type, code) { var o = gl.createShader(type); gl.shaderSource(o, code); gl.compileShader(o); return o; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['res', 'center', 'R', 'seed', 'bias', 'heat', 'grainScale', 't', 'ptr', 'ptrR', 'ptrAmt', 'stops', 'edges'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
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

    var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // One size. The steps go from calm to alive: bias walks the ball along the fade (high = beige and steel, low = red),
    // flow is how fast the colours move. Meet is beige and blue, Design more blue with a little pink and orange, Build red
    var SPEC = [{ seed: 14, bias: 0.5, flow: 0.6 }, { seed: 23, bias: -0.04, flow: 1 }, { seed: 37, bias: -0.44, flow: 1.5 }];
    var time = 0, last = 0, lastDraw = 0, onScreen = false, running = false;
    function draw(b) {
      var box = { width: b.card.offsetWidth, height: b.card.offsetHeight }; // its own size: on the page transition's cube the size on screen changes every frame
      if (!box.width || !box.height) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = Math.round(box.width * dpr), H = Math.round(box.height * dpr);
      if (b.cv.width !== W || b.cv.height !== H) { b.cv.width = W; b.cv.height = H; }
      if (gl.canvas.width !== W || gl.canvas.height !== H) { gl.canvas.width = W; gl.canvas.height = H; }
      gl.viewport(0, 0, W, H);
      var f = time * b.s.flow + b.off; // it floats and breathes on its own
      var fx = calm ? 0 : Math.sin(f * 0.31) * 16 + Math.sin(f * 0.13) * 10, fy = calm ? 0 : Math.cos(f * 0.23) * 14;
      var R = 0.36 * box.height * (calm ? 1 : 1 + Math.sin(f * 0.37) * 0.022);
      gl.uniform2f(U.res, W, H); gl.uniform2f(U.center, (box.width - R * 0.2 + fx) * dpr, (0.26 * box.height + fy) * dpr);
      gl.uniform1f(U.R, R * dpr); gl.uniform1f(U.seed, b.s.seed); gl.uniform1f(U.bias, b.s.bias); gl.uniform1f(U.grainScale, dpr * 0.75); gl.uniform1f(U.t, f);
      gl.uniform2f(U.ptr, b.x * dpr, b.y * dpr); gl.uniform1f(U.ptrR, Math.min(Math.max(R * 0.4, 80), 200) * dpr); gl.uniform1f(U.ptrAmt, b.amt);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      var c2 = b.cv.getContext('2d');
      c2.clearRect(0, 0, W, H); c2.drawImage(gl.canvas, 0, 0);
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
            var src = v.getAttribute('data-src'); // a clip only downloads once its card is on screen
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
  // F Brush, Rimbo's refined logo (5 Nov): it ships next to main.min.js (same tag); on localhost it comes from /media/
  // the Webflow footer still points at the old logo file
  function rdLogoSwap() {
    var logoSrc = brushLogoSrc();
    qsa('img[src*="SVGLOGO2"]').forEach(function (img) { img.removeAttribute('srcset'); img.src = logoSrc; });
  }

  function brushLogoSrc() {
    return /\/main(\.min)?\.js/.test(FOOTER_SCRIPT) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(FOOTER_SCRIPT)
      ? FOOTER_SCRIPT.replace(/\/main(\.min)?\.js.*$/, '/media/logo-f-brush.svg') : '/media/logo-f-brush.svg';
  }
  function rdFooter() {
    // the footer is the component Footer_rdf in the Designer (rdf-* classes: all of its look and text); this only animates it
    var foot = qs('.rdf');
    if (!foot || foot.hasAttribute('data-rdf-on')) return;
    var nl = /^\/nl(\/|$)/.test(location.pathname), prefix = nl ? '/nl' : '';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var logoSrc = brushLogoSrc();
    // two grounds. Dark is the default everywhere: the page's own dark (--color--black), so the classic #131313 and whatever a
    // page sets itself. Beige is an experiment for pages that come from a light section (Rimbo: keep it dark most places, the
    // light one stays experimental), so it only runs on the Groningen page. data-footer="light" or "dark" on any element of a
    // page picks one, ?ftheme= tries it out
    var themeEl = qs('[data-footer]');
    var theme = (/[?&]ftheme=(light|dark)/.exec(location.search) || [])[1] || (themeEl && themeEl.getAttribute('data-footer')) || (/-groningen\/?$/.test(location.pathname) ? 'light' : 'dark');
    var light = theme === 'light';
    var ACCENT = light ? [75, 120, 136] : [228, 68, 28], LOGO_FILL = light ? [19, 19, 19] : [248, 245, 238];
    var clamp = function (x) { return Math.max(0, Math.min(1, x)); };
    var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    var cut = function (k) { return ((1 - k) * 100).toFixed(2) + '%'; };
    var rgba = function (c, a) { return 'rgba(' + c.join(',') + ',' + clamp(a).toFixed(3) + ')'; };

    var ease = 'cubic-bezier(.625, .05, 0, 1)';
    // only what the Designer can't hold: what the script makes or switches (build, guides, hover states, the light experiment)
    var css = [
      '.rdf { --rdf-fg: #f8f5ee; --rdf-grey: #a4a4a4; --rdf-brand: #e4441c; --rdf-hair: rgba(248, 245, 238, .12); --rdf-dash: rgba(248, 245, 238, .22); --rdf-lift: rgba(248, 245, 238, .035); --rdf-key: #8fb3ff; --rdf-str: #e4441c; -webkit-font-smoothing: antialiased; }',
      '.rdf a { text-decoration: none; font-size: inherit; line-height: inherit; font-weight: inherit; letter-spacing: inherit; }', // the site's own link styles stay out
      '.rdf-prev { position: relative; z-index: 2 !important; }',
      // a notched section above (a clip-path on it, e.g. is-notched): the footer starts 6rem higher, under the page, so its cut
      // corners show the footer coming up, in the page's shade; the edge line goes, it would close the corners
      '.rdf.is-under { margin-top: -6rem; height: calc(100svh + 6rem); }',
      '.rdf.is-under .rdf-in { top: 6rem; }',
      '.rdf.is-under .rdf-drop { border-top-color: transparent; height: calc(clamp(9rem, 34vh, 18rem) + 6rem); background-image: linear-gradient(to bottom, rgba(0, 0, 0, .62) 6rem, rgba(0, 0, 0, .384) calc(6rem + (100% - 6rem) * .16), rgba(0, 0, 0, .223) calc(6rem + (100% - 6rem) * .36), rgba(0, 0, 0, .099) calc(6rem + (100% - 6rem) * .58), rgba(0, 0, 0, .031) calc(6rem + (100% - 6rem) * .8), rgba(0, 0, 0, 0)); }',
      '@media (max-width: 767px) { .rdf.is-under { height: auto; padding-top: 6rem; min-height: calc(100svh + 6rem); } .rdf.is-under .rdf-in { top: auto; } }',
      '.rdf .rdf-grain.grain { position: absolute; inset: 0; z-index: 7; pointer-events: none; }',
      '.rdf-in { will-change: transform; }',
      '.rdf-lines { position: absolute; inset: 0; pointer-events: none; }',
      '.rdf-v { position: absolute; border-left: 1px dashed var(--rdf-dash); }',
      '.rdf-h { position: absolute; border-top: 1px dashed var(--rdf-dash); }',
      '.rdf-ruler svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; shape-rendering: crispEdges; }',
      '.rdf-ruler path { fill: none; stroke-width: 1; stroke: var(--rdf-hair); } .rdf-ruler path + path { stroke: var(--rdf-dash); }',
      '.rdf-logo-art canvas { display: block; }',
      // hover
      '.rdf-cell { transition: background-color .4s ' + ease + '; }',
      '.rdf-cell.is-drawn { background-color: var(--rdf-lift); }',
      '.rdf-pt-a, .rdf-pt-b, .rdf-swap-a, .rdf-swap-b { transition: transform .55s ' + ease + '; }',
      '.rdf-cell.is-drawn .rdf-swap-a, .rdf-cell.is-drawn .rdf-pt-a { transform: translateY(-110%); } .rdf-cell.is-drawn .rdf-swap-b, .rdf-cell.is-drawn .rdf-pt-b { transform: none; }',
      '.rdf-arrow { transition: transform .45s ' + ease + ', opacity .3s, color .3s; }',
      '.rdf-cell.is-drawn .rdf-arrow { transform: none; opacity: 1; color: var(--rdf-fg); }',
      '.rdf-soc { transition: color .3s, background-color .4s ' + ease + '; }',
      '.rdf-soc-arrow { transition: opacity .3s, transform .45s ' + ease + '; }',
      '@media (hover: hover) { .rdf-soc:hover .rdf-soc-arrow { opacity: 1; transform: none; } }',
      '.rdf-lang-link { transition: opacity .3s; } .rdf-lang-link.is-on { color: var(--rdf-fg); opacity: 1; }',
      // the build: an outline per box, the HTML it types, the caret
      '.rdf-frame { position: absolute; inset: 0; z-index: 6; width: 100%; height: 100%; overflow: visible; pointer-events: none; }', // above the shade: the orange line starts at its full colour
      '.rdf-frame rect { fill: none; stroke: rgba(228, 68, 28, .8); stroke-width: 1; vector-effect: non-scaling-stroke; }',
      '.rdf-rev { position: relative; z-index: 1; will-change: clip-path; }',
      '.rdf-ch { transition: opacity .7s; }',
      '.rdf-caret { position: absolute; width: 2px; background: var(--rdf-brand); pointer-events: none; opacity: 0; z-index: 6; }',
      '.rdf-code { position: absolute; left: 1.6rem; top: 1.3rem; right: 1rem; z-index: 2; pointer-events: none; font-size: .64rem; line-height: 1.6; letter-spacing: .04em; white-space: pre-wrap; word-break: break-all; text-transform: none; color: var(--rdf-grey); transition: opacity .25s; }',
      '.rdf-code .t { color: var(--rdf-fg); } .rdf-code .k { color: var(--rdf-key); } .rdf-code .s { color: var(--rdf-str); }',
      '.rdf-code .cur { display: inline-block; width: .55em; height: 1.05em; margin-left: .1em; vertical-align: -.15em; background: var(--rdf-brand); animation: rdf-blink 1s steps(1) infinite; }',
      '@keyframes rdf-blink { 50% { opacity: 0; } }',
      // hover: two strokes from the top-left corner, meeting bottom right
      '.rdf-draw { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; z-index: 2; }',
      '.rdf-draw path { fill: none; stroke: var(--rdf-brand); stroke-width: 1; stroke-dasharray: 1 1; stroke-dashoffset: 1; transition: stroke-dashoffset .45s cubic-bezier(.4, 0, .6, 1); }',
      '.rdf-cell.is-drawn .rdf-draw path { stroke-dashoffset: 0; transition: stroke-dashoffset .8s cubic-bezier(.45, 0, .25, 1); }',
      '@media (max-width: 767px) { .rdf-code { left: 1rem; top: 1.1rem; font-size: .58rem; } }',
      '@media (prefers-reduced-motion: reduce) { .rdf-code .cur { animation: none; } }',
      // the light ground: an experiment on one page, so it stays out of the Designer until it is decided
      '.rdf.is-light { --rdf-fg: #131313; --rdf-grey: #5e574b; --rdf-brand: #4b7888; --rdf-hair: rgba(19, 19, 19, .14); --rdf-dash: rgba(19, 19, 19, .26); --rdf-lift: rgba(255, 255, 255, .45); --rdf-key: #5e574b; --rdf-str: #3c6473; background-color: var(--color--rimbobage, #f8f5ee); color: #131313; }',
      '.rdf.is-light .rdf-shade { background-color: var(--color--rimbobage, #f8f5ee); }',
      '.rdf.is-light .rdf-drop { border-top-color: rgba(118, 84, 36, .16); background-image: linear-gradient(to bottom, rgba(118, 84, 36, .34), rgba(118, 84, 36, .21) 16%, rgba(118, 84, 36, .122) 36%, rgba(118, 84, 36, .054) 58%, rgba(118, 84, 36, .017) 80%, rgba(118, 84, 36, 0)); }',
      '.rdf.is-light .rdf-cell, .rdf.is-light .rdf-cell:hover, .rdf.is-light .rdf-soc:hover { color: #131313; }',
      '.rdf.is-light .rdf-width, .rdf.is-light .rdf-label, .rdf.is-light .rdf-base, .rdf.is-light .rdf-arrow, .rdf.is-light .rdf-soc, .rdf.is-light .rdf-lang-link, .rdf.is-light .rdf-lang-sep { color: #5e574b; }'
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    rdHead(style);

    // the language links: the old menu's Webflow locale links know the right URL for this page
    function localeHref(lang) {
      var a = qs('a[hreflang="' + lang + '"]:not(.rdf-lang-link)');
      if (a) return a.getAttribute('href');
      var bare = location.pathname.replace(/^\/nl(?=\/|$)/, '') || '/';
      return lang === 'nl' ? '/nl' + (bare === '/' ? '' : bare) : bare;
    }
    foot.setAttribute('data-rdf-on', '');
    if (light) foot.classList.add('is-light');
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
    if (prev) prev.classList.add('rdf-prev');
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
    var boxes = qsa('[data-code]', foot).map(function (box) {
      var kids = Array.prototype.slice.call(box.children).filter(function (el) { return !el.hasAttribute('data-own'); });
      kids.forEach(function (k) { k.classList.add('rdf-rev'); });
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'rdf-frame'); svg.setAttribute('aria-hidden', 'true');
      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', '0'); rect.setAttribute('y', '0'); rect.setAttribute('width', '100%'); rect.setAttribute('height', '100%');
      rect.setAttribute('pathLength', '1'); rect.style.strokeDasharray = '1 1';
      svg.appendChild(rect); box.appendChild(svg);
      var add = function (cls) { var e = document.createElement('span'); e.className = cls; e.setAttribute('aria-hidden', 'true'); box.appendChild(e); return e; };
      return { el: box, kids: kids, rect: rect, code: add('rdf-code'), chars: classify(box.getAttribute('data-code')), caret: add('rdf-caret'), at: [] };
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
    function layout() {
      var xs = [], ys = [];
      var addU = function (arr, val) { val = Math.round(val); if (!arr.some(function (a) { return Math.abs(a - val) < 3; })) arr.push(val); };
      qsa('.rdf-cell, .rdf-base, .rdf-base-l, .rdf-soc', foot).forEach(function (el) {
        var r = boxIn(el, inner);
        addU(xs, r.l); addU(xs, r.r - 1); addU(ys, r.t); addU(ys, r.b - 1);
      });
      guideWrap.textContent = ''; vs = []; hs = [];
      var W = inner.clientWidth, H = inner.clientHeight;
      var rects = qsa('.rdf-cell, .rdf-base-l, .rdf-soc', foot).map(function (el) { return boxIn(el, inner); });
      var segs = function (from, to, blocks) {
        var out = [[from, to]];
        blocks.forEach(function (bl) {
          out = out.reduce(function (acc, sg) {
            if (bl[1] <= sg[0] || bl[0] >= sg[1]) acc.push(sg);
            else { if (bl[0] - sg[0] > 2) acc.push([sg[0], bl[0]]); if (sg[1] - bl[1] > 2) acc.push([bl[1], sg[1]]); }
            return acc;
          }, []);
        });
        return blocks.length ? out.filter(function (sg) { return sg[1] - sg[0] > 48; }) : out; // no little stubs where a line is cut
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
    var on = false, raf = 0;
    function tick() {
      var r = foot.getBoundingClientRect();
      var p = clamp((window.innerHeight - r.top) / r.height);
      if (Math.abs(p - last) > 0.0005) { last = p; curtain(p); draw(p); }
      raf = on ? requestAnimationFrame(tick) : 0;
    }
    new IntersectionObserver(function (es) {
      on = es[0].isIntersecting;
      if (on && !raf) raf = requestAnimationFrame(tick);
      if (!on) { last = -1; tick(); } // one last frame, so it rests in its scrolled-away state
    }, { rootMargin: '0px 0px 10% 0px' }).observe(foot);
    rdOn(window, 'resize', function () { last = -1; if (!raf) tick(); });
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

    // only what the Designer can't hold: the moving parts
    var style = document.createElement('style');
    style.textContent = `
      .wall_col { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; clip-path: circle(0% at 50% 50%); }
      .wall_ball canvas { display: block; width: 100%; height: 100%; }
      .wall_cc { opacity: var(--k, 0); --out: calc((1 - var(--k, 0)) * 16px); }
      .wall_cc-c.is--tl { transform: translate(calc(var(--out) * -1), calc(var(--out) * -1)); }
      .wall_cc-c.is--tr { transform: translate(var(--out), calc(var(--out) * -1)); }
      .wall_cc-c.is--bl { transform: translate(calc(var(--out) * -1), var(--out)); }
      .wall_cc-c.is--br { transform: translate(var(--out), var(--out)); }
      .centered-slider-bullet.active .wall_face-open { color: var(--_wall-of-love---wall-text); }
      .centered-slider-bullet:focus-visible, .centered-slider-button:focus-visible { outline: 1px solid var(--color--brand); outline-offset: 2px; }
    `;
    rdHead(style); // through rdHead: it goes again when the page leaves, so a Barba return does not stack another copy

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

    /* ---------- the brand ball: the calculator's shader, tuned for a ball you only see a quarter of ---------- */
    const toRgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    const s2l = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
    function oklab(h) {
      const [r, g, b] = toRgb(h).map(s2l);
      const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
      const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
      const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
      return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
    }
    const rgb01 = h => toRgb(h).map(v => v / 255);

    const FRAG = "#version 300 es\n" +
        "precision highp float;\n" +
        "uniform vec2 res; uniform vec2 center; uniform float R; uniform float seed; uniform float bias; uniform float heat; uniform float grainScale; uniform float t;\n" +
        "uniform vec2 ptr; uniform float ptrR; uniform float ptrAmt; uniform vec3 stops[4]; uniform vec2 edges[3];\n" +
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
        "  float ang = h * 6.2831 + t * 0.26;\n" + // the colours turn around inside the ball, wherever it's cropped
        "  float g = 0.5 + 0.34 * dot(l, vec2(cos(ang), sin(ang)));\n" +
        "  vec2 drift = vec2(sin(t * 0.34 + h * 6.2831), cos(t * 0.27 + h * 12.566)) * 0.62;\n" +
        "  vec2 w = vec2(fbm(l * 0.55 + h * 40.0 + drift), fbm(l * 0.55 + h * 70.0 + 5.2 - drift));\n" +
        "  float f = fbm(l * 1.7 + w * 1.3 + h * 90.0);\n" +
        "  float v = g + (f - 0.5) * 1.0 + bias - heat * 0.45;\n" +
        "  float dp = length(p - ptr) / max(ptrR, 1.0);\n" +
        "  v -= ptrAmt * 0.6 * exp(-dp * dp);\n" +
        "  vec3 col = ramp(clamp(v, 0.0, 1.0)) + grain;\n" +
        "  col = mix(col, ramp(clamp(v + (g1 - 0.5) * 0.18, 0.0, 1.0)) + grain, 0.35);\n" +
        "  outColor = vec4(clamp(col, 0.0, 1.0), smoothstep(1.0 + aa, 1.0 - aa, r));\n" +
        "}";

    const gl = rdGl(document.createElement('canvas').getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true }));
    const U = {};
    if (gl) {
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
    in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog); gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      ['res', 'center', 'R', 'seed', 'bias', 'heat', 'grainScale', 't', 'ptr', 'ptrR', 'ptrAmt', 'stops', 'edges'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
      gl.uniform3fv(U.stops, new Float32Array([].concat.apply([], ['E4441C', 'E4566A', '4B7888', 'DACCAE'].map(oklab))));
      gl.uniform2fv(U.edges, new Float32Array([.12, .28, .26, .46, .5, .84]));
    }

    // o: cx, cy, R in the canvas's css pixels; t, seed, bias; px, py, pr, amt for the warm spot under the mouse
    function drawBall(cv, o) {
      if (!gl) return;
      const boxW = cv.clientWidth, boxH = cv.clientHeight; // its own size: on the page transition's cube the size on screen shrinks to nothing
      if (!boxW || !boxH) return;
      const dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(boxW * dpr), H = Math.round(boxH * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      if (gl.canvas.width !== W || gl.canvas.height !== H) { gl.canvas.width = W; gl.canvas.height = H; }
      gl.viewport(0, 0, W, H);
      gl.uniform2f(U.res, W, H); gl.uniform2f(U.center, o.cx * dpr, o.cy * dpr); gl.uniform1f(U.R, o.R * dpr);
      gl.uniform1f(U.seed, o.seed); gl.uniform1f(U.bias, o.bias); gl.uniform1f(U.heat, 0); gl.uniform1f(U.grainScale, dpr * .75); gl.uniform1f(U.t, o.t);
      gl.uniform2f(U.ptr, o.px * dpr, o.py * dpr); gl.uniform1f(U.ptrR, o.pr * dpr); gl.uniform1f(U.ptrAmt, o.amt);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const c = cv.getContext('2d');
      c.clearRect(0, 0, W, H);
      c.drawImage(gl.canvas, 0, 0);
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
    }
    function paint(b) {
      // it floats and breathes a little, never far enough to reach the text
      var fx = calm ? 0 : Math.sin(b.float * .47) * 4 + Math.sin(b.float * .19) * 2, fy = calm ? 0 : Math.cos(b.float * .37) * 5;
      var breath = calm ? 1 : 1 + Math.sin(b.float * .55) * .025;
      drawBall(b.canvas, { cx: b.cx + fx, cy: b.cy + fy, R: b.r * breath, t: b.t, seed: b.seed, bias: b.bias, px: b.px, py: b.py, pr: b.r * .45, amt: b.amt });
    }
    balls.forEach(function (b) { measure(b); paint(b); });
    new ResizeObserver(function () { balls.forEach(function (b) { measure(b); paint(b); }); }).observe(balls[0].canvas);

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
    function loop(now) {
      var dt = Math.min((now - last) / 1000, .05); last = now;
      if (!seen) { running = false; return; }
      requestAnimationFrame(loop);
      if (document.hidden) return;
      var mid = row.getBoundingClientRect().left + row.clientWidth / 2;
      balls.forEach(function (b) {
        var box = b.card.getBoundingClientRect(), off = Math.abs(box.left + box.width / 2 - mid) / box.width;
        b.card.style.setProperty('--k', smooth(1 - off / .45).toFixed(3));     // corners: only in the last stretch of the landing
        b.slide.style.opacity = (.45 + .55 * smooth(1 - off / .9)).toFixed(3);  // the card itself: over the whole way
        if (calm) return;
        b.stir *= Math.pow(.97, dt * 60);
        b.t += dt * FLOW * (1 + b.stir * 5);
        b.float += dt;
        b.amt += (b.want - b.amt) * (1 - Math.exp(-dt * 3.5));
        b.px += (b.tx - b.px) * (1 - Math.exp(-dt * 7)); b.py += (b.ty - b.py) * (1 - Math.exp(-dt * 7));
        if (box.right > 0 && box.left < innerWidth) paint(b);
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
  // STAGING LINKS — on webflow.io only: the menu, the buttons and every other internal link to the OLD
  // service and work pages open the new ones (Service V2, Work V2), so Rimbo can click through the new
  // experience without falling back to the old pages. The Webflow links stay as they are (the live site keeps working
  // untouched); this only rewrites the href here, until the URL structure is cleared up. Dutch (/nl) links go to the Dutch copies.
  // =========================================================
  function rdStagingLinks() {
    if (!/\.webflow\.io$/.test(location.hostname)) return;
    var MAP = { '/service': '/service-v2', '/work': '/work-v2', '/nl/service': '/nl/service-v2', '/nl/work': '/nl/work-v2' }; // Dutch too: Rimbo tests the whole flow from the Dutch city pages
    function fix(a) {
      if (!a || !a.getAttribute) return;
      var h = a.getAttribute('href');
      if (!h || h.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(h)) return;
      var u; try { u = new URL(a.href, location.href); } catch (e) { return; }
      if (u.origin !== location.origin) return;
      var to = MAP[u.pathname.replace(/\/+$/, '') || '/'];
      if (to) a.setAttribute('href', to + u.search + u.hash);
    }
    qsa('a[href]').forEach(fix);
    ['pointerdown', 'mouseover', 'focusin', 'click'].forEach(function (type) {
      rdOn(document, type, function (e) { fix(e.target && e.target.closest && e.target.closest('a')); }, true); // capture: before Barba reads the href
    });
  }

  // What runs on which page. Runs on every page, first load or swap
  function initPageFunctions() {
    var path = pagePath();
    run('logo', rdLogoSwap);
    if (path.indexOf('/post/') === 0 && !/^\/nl(\/|$)/.test(location.pathname)) run('post refresh', rdPostRefresh); // builds the new post page first: the buttons and the ruler pick it up (English posts; the Dutch ones keep the current layout until there are Dutch texts)
    run('band', rdBand);   // builds the home-opening rows before the marquees start
    run('global', rdGlobal);
    run('staging links', rdStagingLinks);
    run('location faq button', rdLocFaqBtn);
    run('location button lines', rdLocBtnAlt);
    run('buttons', rdButtons);
    run('form validation', rdFormValidation);
    run('post cards', rdPostCards);
    // the new Blueprint footer, page by page until Rimbo's go (home-v4: Rimbo, 5 Nov); ?footer=new tries it on any staging page
    var stagingHost = /(\.webflow\.io|localhost|127\.0\.0\.1)$/.test(location.hostname);
    // pages that keep the old footer for now: posts the refresh didn't touch (Dutch, live) and Resources on live
    var oldFooter = (path.indexOf('/post/') === 0 && !document.documentElement.classList.contains('rf')) || (path === '/resources' && !stagingHost);
    if (oldFooter) qsa('.rdf').forEach(function (el) { el.parentNode.removeChild(el); });
    else if (path === '/resources') run('old footer out', rdOldFooterOut);
    run('footer', rdFooter);
    run('location showcase', rdLocShow);
    // city pages: the balls and the wall are far down the page, so their WebGL and slider start when they come near
    var later = function (sel, name, fn) {
      var el = qs(sel);
      if (!el) return;
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); inContext(function () { run(name, fn); }); } }, { rootMargin: '100% 0px' });
      io.observe(el);
    };
    later('.loc_steps', 'location balls', rdLocBalls);
    if (qs('.loc_page')) later('.wall_section', 'wall of love', rdWall); else run('wall of love', rdWall);
    run('faq', rdFaq);

    if (qs('[data-band]')) {} // the band page has its own opening (rdBand above), no old hero to animate
    else if (path === '/') run('home', rdHome);
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
