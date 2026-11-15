// Work page hero (/work-v2): the Osmo Orbit Tiles (Rimbo's Osmo code, changes marked LAB) + the hero script.
// Source: prototype/work-hero (osmo/osmo-orbit.js + hero.js). Loaded by the hero's embed, again after each page transition.
(function () {
// Osmo Supply · Orbit Tiles Infinite Loop, as Rimbo sent it (2026-11-09).
// Every change to Osmo's code is marked LAB. They are all knobs or signals, the orbit itself is untouched:
//   data-orbit-hold    seconds a tile rests in front (pauseDuration, Osmo: 0)
//   data-orbit-wait    seconds the first tile rests before the first step (Osmo: steps at once)
//   data-orbit-rotate  seconds for one full turn of the orbit (linearRotateDuration, Osmo: 24)
//   "orbit:arrive"     fired at the start of every step: which tile lands in front, and in how many seconds
//   "orbit:play" / "orbit:pause"  fired when the orbit starts or stops (it stops while it is off screen)
// The page (hero.js) starts it with initOrbitTiles() and uses the signals to cue the clips.
gsap.registerPlugin(CustomEase, ScrollTrigger);
CustomEase.create("osmo", "M0,0 C0.625,0.05 0,1 1,1");

function initOrbitTiles() {
  document.querySelectorAll("[data-orbit-tiles-init]").forEach((container) => {
    const list = container.querySelector("[data-orbit-tiles-list]");
    const tiles = container.querySelectorAll("[data-orbit-tiles-item]");
    const tileCount = tiles.length;
    if (tileCount < 2) return;

    const radiusXMultiplier = 1;
    const radiusYMultiplier = 0;
    const blurMultiplier = 0.04;
    const minScale = 0.2;
    const minOpacity = 1;
    const minDarkness = 0.3;

    const moveDuration = 2.5;
    const pauseDuration = parseFloat(container.getAttribute("data-orbit-hold")) || 0; // LAB: was 0
    const staggerAmount = moveDuration * 0.03;
    const rotateAttr = parseFloat(container.getAttribute("data-orbit-rotate")); // LAB
    const linearRotateDuration = isNaN(rotateAttr) ? 24 : rotateAttr; // LAB: was 24
    const firstWait = parseFloat(container.getAttribute("data-orbit-wait")) || 0; // LAB
    let hasStepped = false; // LAB

    const tileStates = Array.from(tiles, () => ({ progress: 0 }));

    let isActive = false;
    let stepTimeline;
    let delayedCall;
    let activeTileIndex = -1;

    function getActiveIndex() {
      return tileStates.reduce((closest, state, index) => {
        const current = Math.min(((index - state.progress) % tileCount + tileCount) % tileCount, tileCount - (((index - state.progress) % tileCount + tileCount) % tileCount));
        const previous = Math.min(((closest - tileStates[closest].progress) % tileCount + tileCount) % tileCount, tileCount - (((closest - tileStates[closest].progress) % tileCount + tileCount) % tileCount));
        return current < previous ? index : closest;
      }, 0);
    }

    function updateTileStatus() {
      const currentActiveIndex = getActiveIndex();
      if (currentActiveIndex === activeTileIndex) return;

      activeTileIndex = currentActiveIndex;

      tiles.forEach((tile, index) => {
        tile.setAttribute(
          "data-orbit-tiles-item-status",
          index === activeTileIndex ? "active" : "not-active"
        );
      });
    }

    function renderOrbit() {
      const tileWidth = tiles[0].offsetWidth;
      const radiusX = tileWidth * radiusXMultiplier;
      const radiusY = tileWidth * radiusYMultiplier;
      const maxBlur = tileWidth * blurMultiplier;

      updateTileStatus();

      tiles.forEach((tile, index) => {
        const angle = ((index - tileStates[index].progress) / tileCount) * Math.PI * 2;
        const depth = (Math.cos(angle) + 1) / 2;
        const adjustedDepth = Math.pow(depth, 1.3);

        const scale = gsap.utils.interpolate(minScale, 1, adjustedDepth);
        const opacity = gsap.utils.interpolate(minOpacity, 1, adjustedDepth);
        const blur = gsap.utils.interpolate(maxBlur, 0, adjustedDepth);
        const brightness = gsap.utils.interpolate(minDarkness, 1, adjustedDepth);

        gsap.set(tile, {
          x: Math.sin(angle) * radiusX,
          y: Math.cos(angle) * radiusY,
          scale,
          opacity,
          filter: `blur(${blur}px) brightness(${brightness})`,
          zIndex: Math.round(adjustedDepth * 1000)
        });
      });
    }

    const rotations = !list || linearRotateDuration === 0 ? [] : [
      gsap.to(list, {
        rotate: 360,
        duration: linearRotateDuration,
        ease: "none",
        repeat: -1,
        paused: true
      }),
      gsap.to(tiles, {
        rotate: -360,
        duration: linearRotateDuration,
        ease: "none",
        repeat: -1,
        paused: true
      })
    ];

    function goToNextTile() {
      if (!isActive) return;
      hasStepped = true; // LAB
      const activeIndex = getActiveIndex();
      const orderedStates = tileStates.map((state, index) => ({state, offset: (index - activeIndex + tileCount) % tileCount})).sort((a, b) => a.offset - b.offset);

      stepTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
          if (isActive) delayedCall = gsap.delayedCall(pauseDuration, goToNextTile);
        }
      });

      // LAB: tell the page which tile lands next and when (its tween starts one stagger late)
      container.dispatchEvent(new CustomEvent("orbit:arrive", { detail: { index: (activeIndex + 1) % tileCount, inSeconds: moveDuration + staggerAmount, hold: pauseDuration, period: moveDuration + staggerAmount * (tileCount - 1) + pauseDuration } }));

      orderedStates.forEach(({ state }, index) => {
        stepTimeline.to(state, {
          progress: state.progress + 1,
          duration: moveDuration,
          ease: "osmo",
          onUpdate: renderOrbit
        }, index * staggerAmount);
      });

      stepTimeline.play();
    }

    function pauseOrbit() {
      isActive = false;
      if (stepTimeline) stepTimeline.pause();
      if (delayedCall) delayedCall.pause();
      rotations.forEach((rotation) => rotation.pause());
      container.dispatchEvent(new CustomEvent("orbit:pause")); // LAB
    }

    function playOrbit() {
      isActive = true;
      rotations.forEach((rotation) => rotation.play());
      container.dispatchEvent(new CustomEvent("orbit:play", { detail: { first: !hasStepped } })); // LAB

      if (stepTimeline && stepTimeline.progress() < 1) {
        stepTimeline.play();
      } else if (!hasStepped && firstWait > 0) { // LAB: the first tile rests before the first step
        if (delayedCall) delayedCall.kill();
        delayedCall = gsap.delayedCall(firstWait, goToNextTile);
      } else {
        goToNextTile();
      }
    }

    renderOrbit();

    if (pauseDuration > 0) {
      new ResizeObserver(renderOrbit).observe(container);
    }

    ScrollTrigger.create({
      trigger: container,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => self.isActive ? playOrbit() : pauseOrbit()
    });
  });
}

// Work page, the opening. Starts the Osmo Orbit Tiles and does four things around it:
//   1. cues every clip so its moment (data-wh-at) starts a beat after its tile has settled in front
//   2. swaps the name in negative and the ticks with the tile in front
//   3. the entrance when the page loads
//   4. the hand-over on scroll: the hero sinks back, the next section's edge bows like a membrane
// Nothing visible is made here except the letters of the names (split so they can rise one by one).
(function () {
  var hero = document.querySelector('[data-work-hero]');
  if (!hero || !window.gsap) return;
  var orbit = hero.querySelector('[data-orbit-tiles-init]');
  var stage = hero.querySelector('.wh_stage');
  var items = [].slice.call(orbit.querySelectorAll('[data-orbit-tiles-item]'));
  var N = items.length;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the rhythm. Osmo's own numbers: a step takes 2.5 s, each tile starts 3% later than the one before.
  var HOLD = parseFloat(orbit.getAttribute('data-orbit-hold')) || 2.4;   // the rest in front (the knob, on the element)
  var MOVE = 2.5, STAGGER = MOVE * 0.03;
  var STEP = MOVE + STAGGER * (N - 1);        // one whole step, all tiles
  var PERIOD = STEP + HOLD;                   // step + rest
  var FIRST_WAIT = HOLD + 1.6;                // the first tile rests longer: it has just eased in
  var FIRST_MOMENT = 1.7;                     // seconds after the opening starts that the first clip's moment starts
  var BEAT = -0.35;                          // Rimbo 2026-11-15: the moment starts a little BEFORE the tile has settled (more fluent)

  // When has a tile "settled"? Osmo's ease creeps for the last second; the eye reads it as landed once the
  // tile is within about 5% of its width of the centre. The clip's moment starts BEAT seconds after that point.
  var ease = gsap.parseEase('osmo'), settled = 1, near = 1 - 0.047 * N / (2 * Math.PI);
  for (var k = 1000; k >= 0; k--) { if (ease(k / 1000) >= near) settled = k / 1000; }

  // No slow spin of the whole orbit (Osmo's linearRotateDuration, set to 0): the tiles always move along one level
  // line, so the side tiles wait left and right and never run under the front tile, where the name sits.
  // Every swap looks the same.
  var TILT = 0;
  orbit.setAttribute('data-orbit-wait', FIRST_WAIT);
  orbit.setAttribute('data-orbit-rotate', '0');
  var phase = TILT;
  orbit.style.setProperty('--phase', phase + 'deg');
  var SETTLE = STAGGER + settled * MOVE;      // from the start of a step to the landing tile having settled
  var clock = function () { return gsap.globalTimeline.time(); };

  // ---- 1. the clips
  // Added for this site: a tile can hold a live app instead of a clip ([data-wh-live], Tinko via tinko-live.js).
  // It gets a stand-in with the few things of a video the clock below uses: "play" starts his arrival, going back to
  // the start ("currentTime = from", out of sight) puts him back to sleep.
  function appClip(el) {
    var api = window.TinkoLive.mount(el), t = 0, playing = false, started = false, from = +el.dataset.whFrom || 0;
    return { isApp: true, dataset: el.dataset, readyState: 4, seeking: false, ended: false, duration: 1e9, playbackRate: 1,
      get paused() { return !playing; },
      get currentTime() { return t; },
      set currentTime(x) { t = x; if (x <= from + 0.01 && started) { started = false; api.wait(); } },
      play: function () { playing = true; if (!started) { started = true; api.play(); } return Promise.resolve(); },
      pause: function () { playing = false; },
      addEventListener: function () {} };
  }
  var clips = items.map(function (el) {
    var app = el.querySelector('[data-wh-live]');
    var v = el.querySelector('video') || (app && window.TinkoLive ? appClip(app) : null);
    // Added for this site: data-wh-slow-for / data-wh-slow-rate = the first seconds of the moment play slowed down (Tinko's quick draw)
    var sf = +v.dataset.whSlowFor || 0, sr = +v.dataset.whSlowRate || 1;
    return { v: v, at: +v.dataset.whAt, from: +v.dataset.whFrom || 0, slowFor: sf, slowRate: sr, due: null, card: el.querySelector('.wh_card'), project: +el.querySelector('.wh_card').dataset.whProject };
  });
  var running = false, pausedAt = null, wasPlaying = [];
  var LEAVE = 1.8;   // seconds the leaving clip plays on into the swap before it freezes (Rimbo: pause a little later)
  // One thing moves at a time: only the "live" clip (the tile landing or in front) plays. The others hold a still
  // (their data-wh-from frame), and a waiting clip is only set back to that still while its tile passes behind
  // the front one, out of sight.
  var wrap = function (i) { return (i % N + N) % N; };
  function park(c) { c.v.pause(); var go = function () { try { c.v.currentTime = c.from; } catch (e) {} }; if (c.v.readyState >= 1) go(); else c.v.addEventListener('loadedmetadata', go, { once: true }); }
  // "this clip must be at its moment at time `due`". The ticker below does the rest.
  function cue(i, due) { clips[wrap(i)].due = due; }
  function setLive(i) {
    var now = clock();
    clips.forEach(function (c, k) {
      if (k === wrap(i)) { c.live = true; c.until = null; }
      else if (c.live && c.until == null) c.until = now + LEAVE;   // the one leaving: plays on a moment, then freezes
    });
  }
  // a tile is out of sight when it is small and straight behind the front one
  var tileOf = function (c) { return items[clips.indexOf(c)]; };
  function hidden(c) { var el = tileOf(c); return +gsap.getProperty(el, 'scale') < 0.3 && Math.abs(+gsap.getProperty(el, 'x')) < el.offsetWidth * 0.3; }
  // Ready = the clip is loaded and shows its still. Cueing needs clips you can jump around in: a host that can't
  // send a file in parts (a plain local server) makes them unseekable, then the whole clip is fetched once and
  // played from memory. Webflow's hosting is fine.
  function prepare(c) {
    if (c.v.isApp) return Promise.resolve();
    return new Promise(function (done) {
      var v = c.v;
      var onStill = function () { if (v.readyState >= 2) done(); else v.addEventListener('loadeddata', done, { once: true }); };
      var toStill = function () { v.pause(); v.addEventListener('seeked', onStill, { once: true }); v.currentTime = c.from + 0.001; };
      var meta = function () {
        var end = v.seekable.length ? v.seekable.end(v.seekable.length - 1) : 0;
        if (end > 0) return toStill();
        fetch(v.currentSrc).then(function (r) { return r.blob(); }).then(function (b) {
          v.addEventListener('loadedmetadata', toStill, { once: true }); v.src = URL.createObjectURL(b);
        }).catch(done);
      };
      if (v.readyState >= 1) meta(); else v.addEventListener('loadedmetadata', meta, { once: true });
      v.addEventListener('error', done, { once: true });
    });
  }
  function follow() {
    if (gone(follow)) return;
    if (!running) return;
    var now = clock();
    clips.forEach(function (c) {
      var v = c.v;
      if (c.live && c.until != null && now >= c.until) { c.live = false; c.until = null; c.dirty = true; }
      if (!c.live) {                                         // waiting: a still
        if (!v.paused) v.pause();
        if (c.dirty && hidden(c)) { c.dirty = false; park(c); } // back to its still, out of sight
        return;
      }
      if (c.until != null) { if (v.paused && !v.ended) v.play().catch(function () {}); return; } // leaving: just plays on
      if (c.due == null || v.readyState < 1) return;
      var el = now - c.due, slowReal = c.slowFor / c.slowRate; // slowed start: slowFor clip seconds take slowReal seconds
      var base = el >= 0 && el < slowReal ? c.slowRate : 1;
      var want = c.at + (el < slowReal ? Math.max(el, 0) * c.slowRate + Math.min(el, 0) : c.slowFor + (el - slowReal)); // where the clip should be right now
      if (want < c.from) {                                  // too early: wait on its first allowed frame
        if (!v.paused) v.pause();
        if (!v.seeking && Math.abs(v.currentTime - c.from) > 0.04) v.currentTime = c.from;
        return;
      }
      if (want > v.duration - 0.1) { c.due = null; return; } // ran out: it stays on its last frame
      if (v.paused || v.ended) { v.currentTime = want; v.playbackRate = base; v.play().catch(function () {}); return; }
      if (v.seeking) return;
      var off = want - v.currentTime;
      if (Math.abs(off) > 0.4) v.currentTime = want;        // far off (the tab was away): jump
      else v.playbackRate = base * (Math.abs(off) < 0.02 ? 1 : Math.max(0.75, Math.min(1.35, 1 + off * 1.5))); // close: glide into step
      if (now > c.due + 2.5) { c.due = null; v.playbackRate = 1; } // the moment has passed, let it run on
    });
  }
  var gone = function (fn) { if (hero.isConnected) return false; gsap.ticker.remove(fn); return true; };
  gsap.ticker.add(follow);

  // ---- 2. the name in negative, the sub line, the ticks
  var names = [].slice.call(hero.querySelectorAll('[data-wh-name]'));
  var links = [].slice.call(hero.querySelectorAll('[data-wh-link]'));
  function linkIs(p) { links.forEach(function (a, k) { a.classList.toggle('is-shown', k === p); a.tabIndex = k === p ? 0 : -1; a.setAttribute('aria-hidden', k === p ? 'false' : 'true'); }); }
  var subs = [].slice.call(hero.querySelectorAll('[data-wh-sub]'));
  var ticks = [].slice.call(hero.querySelectorAll('.wh_tick'));
  names.forEach(function (el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="wh_word">' + w.split('').map(function (ch) { return '<span class="wh_char">' + ch + '</span>'; }).join('') + '</span>';
    }).join(' ');
  });
  var chars = function (p) { return names[p].querySelectorAll('.wh_char'); };
  var shown = clips[0].project;
  names.forEach(function (el, p) { gsap.set(chars(p), { yPercent: p === shown ? 0 : 115 }); });
  subs.forEach(function (el, p) { gsap.set(el, { autoAlpha: p === shown ? 1 : 0 }); });
  linkIs(shown);
  function showProject(p, landsIn) {
    if (p === shown) return;
    var old = shown; shown = p;
    linkIs(-1); gsap.delayedCall(reduce ? 0 : Math.max(0.6, landsIn - 0.15), function () { if (shown === p) linkIs(p); });
    if (reduce) { gsap.set(chars(old), { yPercent: 115 }); gsap.set(chars(p), { yPercent: 0 }); gsap.set(subs[old], { autoAlpha: 0 }); gsap.set(subs[p], { autoAlpha: 1 }); return; }
    // the old name leaves as its tile starts to go, the new one rises once its tile has landed: during the
    // swap there is no name, so a passing tile never runs through one
    var out = 0, into = Math.max(0.6, landsIn - 0.15);
    gsap.to(chars(old), { yPercent: -115, duration: 0.42, ease: 'power3.in', stagger: { each: 0.008, from: 'start' }, delay: out, overwrite: true });
    gsap.to(subs[old], { autoAlpha: 0, duration: 0.25, ease: 'power1.out', delay: out, overwrite: true });
    gsap.fromTo(chars(p), { yPercent: 115 }, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.016, from: 'start' }, delay: into, overwrite: true });
    gsap.to(subs[p], { autoAlpha: 1, duration: 0.6, ease: 'power1.out', delay: into + 0.45, overwrite: true });
  }
  function tick(i, fillSeconds) {
    ticks.forEach(function (t, k) { gsap.killTweensOf(t); gsap.set(t, { '--fill': k < i ? 1 : 0 }); });
    if (ticks[i]) gsap.to(ticks[i], { '--fill': 1, duration: fillSeconds, ease: 'none' });
  }
  function frontIs(i) { clips.forEach(function (c, k) { c.card.tabIndex = k === i ? 0 : -1; }); }
  frontIs(0);

  // ---- the orbit's signals
  orbit.addEventListener('orbit:play', function (e) {
    running = true;
    var now = clock();
    if (e.detail && e.detail.first) {
      // the page has arrived: the first clip's moment comes soon, the others are lined up behind it
      cue(0, now + FIRST_MOMENT); setLive(0);
      for (var k = 1; k < N; k++) cue(k, now + FIRST_WAIT + SETTLE + BEAT + PERIOD * (k - 1));
      tick(0, FIRST_WAIT + SETTLE);
    } else if (pausedAt != null) {
      // back on screen: everything is exactly as late as the pause was long
      clips.forEach(function (c) { if (c.due != null) c.due += now - pausedAt; });
      wasPlaying.forEach(function (c) { if (c.live && c.due == null) c.v.play().catch(function () {}); });
    }
    pausedAt = null;
  });
  orbit.addEventListener('orbit:pause', function () {
    running = false; pausedAt = clock();
    wasPlaying = clips.filter(function (c) { return !c.v.paused; });
    clips.forEach(function (c) { c.v.pause(); });
  });
  orbit.addEventListener('orbit:arrive', function (e) {
    var i = e.detail.index, now = clock();
    var due = now + SETTLE + BEAT;                 // this tile's moment
    cue(i, due);
    setLive(i);                                    // the landing tile plays; the leaving one plays on a moment, then freezes
    for (var k = 1; k < N; k++) cue(i + k, due + PERIOD * k);
    showProject(clips[i].project, SETTLE);
    gsap.delayedCall(SETTLE * 0.75, function () { frontIs(i); tick(i, PERIOD + SETTLE * 0.25); });
  });
  document.addEventListener('visibilitychange', function () {
    // a hidden tab stops the orbit's clock but not the clips: hold them, so they are still in step afterwards
    if (document.hidden) { wasPlaying = clips.filter(function (c) { return !c.v.paused; }); clips.forEach(function (c) { c.v.pause(); }); }
    else if (running) wasPlaying.forEach(function (c) { if (c.live) c.v.play().catch(function () {}); });
  });

  // hover: the front tile and its name are one link, pointing at either lights up both
  // Added for this site: the marquee cursor of the project pages (a small card with words running through it)
  // follows the pointer while it is on the front tile or its name. Computers only.
  var cur = hero.querySelector('[data-wh-cursor]');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (cur && fine) {
    var cx = gsap.quickTo(cur, 'x', { duration: 0.4, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: 0.4, ease: 'power3' });
    hero.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });
    hero.addEventListener('pointerdown', function () { if (hero.classList.contains('is-hover')) cur.setAttribute('data-press', ''); });
    window.addEventListener('pointerup', function () { cur.removeAttribute('data-press'); });
  }
  var hoverOn = function (e) {
    hero.classList.add('is-hover');
    if (!cur || !fine) return;
    if (e && e.clientX != null) { gsap.set(cur, { x: e.clientX, y: e.clientY }); }
    var word = (links[shown] && links[shown].getAttribute('data-wh-cursor-text')) || 'Visit site';
    [].forEach.call(cur.querySelectorAll('.wh_cursor_text'), function (t) { t.textContent = word + ' \u00b7 '; });
    cur.setAttribute('data-state', 'on');
  };
  var hoverOff = function () { hero.classList.remove('is-hover'); if (cur) cur.setAttribute('data-state', 'off'); };
  clips.forEach(function (c) { c.card.addEventListener('pointerenter', hoverOn); c.card.addEventListener('pointerleave', hoverOff); });
  links.forEach(function (a) { a.addEventListener('pointerenter', hoverOn); a.addEventListener('pointerleave', hoverOff); });
  hero.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // ---- 3. the opening. The screen starts empty (just the page's dark and grain) until every clip is loaded and
  // shows its still, so nothing pops or jumps; then it eases in, slowly and in one go: the front tile rises into
  // place, the others follow, then the name and the label. The orbit starts with it.
  var head = hero.querySelector('.wh_head'), hint = hero.querySelector('.wh_scroll');
  var cards = clips.map(function (c) { return c.card; });
  if (!reduce) {
    gsap.set(cards, { autoAlpha: 0 });
    gsap.set(chars(shown), { yPercent: 115 });
    gsap.set([subs[shown], head, hint], { autoAlpha: 0 });
  }
  var started = false;
  function open() {
    if (started) return; started = true;
    if (!reduce) {
      gsap.fromTo(cards[0], { autoAlpha: 0, scale: 0.9, y: 28 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.8, ease: 'power3.out' });
      gsap.fromTo(cards.slice(1), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6, ease: 'power2.out', stagger: 0.2, delay: 0.6 });
      gsap.to(chars(shown), { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.02, delay: 0.9 });
      gsap.to([subs[shown], head, hint], { autoAlpha: 1, duration: 1, ease: 'power1.out', stagger: 0.12, delay: 1.3 });
    }
    initOrbitTiles(); // Osmo
  }
  Promise.all(clips.map(prepare)).then(open);
  setTimeout(open, 4000);                          // a slow connection never keeps the page empty for long

  // ---- 4. the hand-over. While the hero scrolls away it sinks back (moves at about two thirds of the scroll,
  // shrinks a little, dims), so the next section reads as sliding over it.
  var title = hero.querySelector('.wh_title');
  if (!reduce) {
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }, defaults: { ease: 'none' } })
      .to(stage, { yPercent: 32 }, 0)
      .to(orbit, { scale: 0.86 }, 0)
      .to(hero.querySelector('.wh_dim'), { opacity: 0.72 }, 0)
      .to([title, head], { opacity: 0, duration: 0.4 }, 0)
      .to(hint, { opacity: 0, duration: 0.12 }, 0);
  }

  // The next section's top edge. Same spring as the Wavy Accordion's edges (stiffness 300, damping 40):
  // the middle lags behind the scroll and springs straight when the page stops.
  var edge = document.querySelector('.wh_edge');
  if (edge && !reduce) {
    var fill = edge.querySelector('.wh_edge_fill'), line = edge.querySelector('.wh_edge_line');
    var STIFF = 300, DAMP = 40, BEND = 0.085, lastY = window.scrollY, vel = 0, bow = 0, bowVel = 0, drawn = null, edgeH = 0;
    var measure = function () { edgeH = edge.getBoundingClientRect().height; };
    measure(); window.addEventListener('resize', measure);
    // Added for this site: time comes from the FRAME (document.timeline), the clock main.js drives Lenis with.
    // GSAP's own delta wobbles a few ms per frame; dividing the scroll step by it made the edge shiver.
    var lastFrame = null;
    gsap.ticker.add(function edgeTick(time, deltaMs) {
      if (gone(edgeTick)) return;
      var frame = document.timeline && typeof document.timeline.currentTime === 'number' ? document.timeline.currentTime : time * 1000;
      var dt = lastFrame == null ? deltaMs / 1000 : (frame - lastFrame) / 1000;
      lastFrame = frame;
      if (!(dt > 0)) return;                                          // same frame twice: nothing moved
      dt = Math.min(0.05, Math.max(0.004, dt));
      var y = window.scrollY;
      vel += ((y - lastY) / dt - vel) * Math.min(1, dt * 10);   // scroll speed, smoothed
      lastY = y;
      if (edgeH < 1) { measure(); return; }                             // not laid out (a hidden tab)
      if (y > window.innerHeight * 1.3 && Math.abs(bow) < 0.05) return; // the edge is long gone
      var max = edgeH * 0.46;
      var target = Math.max(-max, Math.min(max, vel * BEND));
      bowVel += (STIFF * (target - bow) - DAMP * bowVel) * dt;
      bow += bowVel * dt;
      // the curve's control point sits twice as far as the bow itself; in the svg's 0-100 box
      var c = (50 + (bow / edgeH) * 200).toFixed(2);
      if (c === drawn) return;
      drawn = c;
      fill.setAttribute('d', 'M0,50 Q50,' + c + ' 100,50 V100 H0 Z');
      line.setAttribute('d', 'M0,50 Q50,' + c + ' 100,50');
    });
  }

  // Added for this site: the nav is light over the dark hero, dark again once the hero has scrolled away
  var nav = document.querySelector('[data-theme-nav]');
  if (nav) ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom 4rem', onToggle: function (st) { nav.dataset.themeNav = st.isActive ? 'light' : 'dark'; } });

  // for checking the timing from the console: WH.info()
  window.WH = { clips: clips, info: function () { return { hold: HOLD, step: STEP, period: PERIOD, loop: PERIOD * N, settle: SETTLE, beat: BEAT, phase: phase, settledAt: settled }; } };
})();

})();
