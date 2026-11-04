/* Button lab, round 2: one setup per concept, all motion with GSAP (loaded from the Webflow CDN).
   Hover states are classes set from pointer events, so a screenshot script can enter them without a mouse. */
(function () {
  var gsap = window.gsap;
  if (!gsap) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rnd = gsap.utils.random;
  var FPS = 9; // the old Osmo sprite ran 4 frames in .45 s

  // One span per character, so each letter can move on its own. Returns the spans.
  function split(el) {
    if (!el) return [];
    if (el.dataset.split) return Array.prototype.slice.call(el.querySelectorAll('.lab-ch'));
    var text = el.textContent, frag = document.createDocumentFragment(), chars = [];
    for (var i = 0; i < text.length; i++) {
      var s = document.createElement('span');
      s.className = 'lab-ch';
      s.textContent = text[i] === ' ' ? ' ' : text[i];
      frag.appendChild(s); chars.push(s);
    }
    el.textContent = ''; el.appendChild(frag); el.dataset.split = '1';
    return chars;
  }

  // Calls fn(frame) at a fixed frame rate off the GSAP ticker: the stop-motion clock.
  function stepper(fps, fn) {
    var running = false, last = -1, t0 = 0;
    function tick() {
      var f = Math.floor((gsap.ticker.time - t0) * fps);
      if (f !== last) { last = f; fn(f); }
    }
    return {
      start: function () { if (running || reduce) return; running = true; last = -1; t0 = gsap.ticker.time; gsap.ticker.add(tick); },
      stop: function () { if (!running) return; running = false; gsap.ticker.remove(tick); },
      running: function () { return running; }
    };
  }

  // The boil: every letter has three hand-placed poses and cycles through them, like a drawn line
  // that was traced three times. Small moves, so it breathes instead of shaking.
  function boil(chars, amp) {
    amp = amp || 1;
    var poses = chars.map(function () {
      return [0, 1, 2].map(function () { return { x: rnd(-.6, .6) * amp, y: rnd(-.7, .7) * amp, rotation: rnd(-3, 3) * amp }; });
    });
    gsap.set(chars, { transformOrigin: '50% 55%' });
    var step = stepper(FPS, function (f) {
      chars.forEach(function (c, i) { gsap.set(c, poses[i][(f + i) % 3]); });
    });
    return {
      start: step.start,
      stop: function () { step.stop(); gsap.to(chars, { x: 0, y: 0, rotation: 0, duration: .35, ease: 'power3.out', overwrite: true }); }
    };
  }

  function em(el, n) { return n * parseFloat(getComputedStyle(el).fontSize); }

  // Hover in/out as events on the button, plus the press (scale down, spring back)
  function wire(btn, o) {
    var hoverScale = o.scale || 1;
    btn.addEventListener('pointerenter', function () { btn.classList.add('is-hover'); o.enter && o.enter(); });
    btn.addEventListener('pointerleave', function () { btn.classList.remove('is-hover', 'is-down'); o.leave && o.leave(); });
    btn.addEventListener('pointerdown', function () {
      btn.classList.add('is-down');
      gsap.to(btn, { scale: hoverScale * .96, duration: .15, ease: 'power2.out', overwrite: 'auto' });
    });
    var up = function () {
      if (!btn.classList.contains('is-down')) return;
      btn.classList.remove('is-down');
      gsap.to(btn, { scale: btn.classList.contains('is-hover') ? hoverScale : 1, duration: .5, ease: 'back.out(3)', overwrite: 'auto' });
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
  }

  function nudge(btn, on) {
    var a = btn.querySelectorAll('.lab-arrow');
    if (a.length) gsap.to(a, { x: on ? em(btn, .35) : 0, duration: .5, ease: 'expo.out', overwrite: 'auto' });
  }

  // The lift the old button had: a touch bigger and a degree off, with a bounce
  function lift(btn, on) {
    gsap.to(btn, { scale: on ? 1.04 : 1, rotation: on ? -1 : 0, duration: .55, ease: on ? 'back.out(3)' : 'back.out(2)', overwrite: 'auto' });
  }

  // The swap: line a rolls up out of the mask, line b rolls in from below (and back)
  function swap(btn) {
    var a = split(btn.querySelector('.lab-swap_a .lab-t')).concat([btn.querySelector('.lab-swap_a .lab-arrow')]);
    var b = split(btn.querySelector('.lab-swap_b .lab-t')).concat([btn.querySelector('.lab-swap_b .lab-arrow')]);
    gsap.set(b, { yPercent: 120 });
    return {
      a: a, b: b,
      to: function (second) {
        gsap.to(a, { yPercent: second ? -120 : 0, duration: .55, ease: 'expo.out', stagger: .012, overwrite: 'auto' });
        gsap.to(b, { yPercent: second ? 0 : 120, duration: .55, ease: 'expo.out', stagger: .012, overwrite: 'auto' });
      }
    };
  }

  // The magnet: within a reach around the button it follows the pointer; the label a little more.
  // Only the nearest button in a cell takes the pointer, so two never lean at once.
  // onActivate / onRelease fire when the button takes and loses the pointer.
  function magnet(btn, cell, o) {
    var inner = btn.querySelector('.lab-in');
    var reach = 56, active = false, cap = gsap.utils.clamp(-9, 9); // never into the neighbour
    var m = {
      measure: function (e) {
        var r = btn.getBoundingClientRect();
        // the rect moves with the button: take the current offset out again
        var cx = r.left + r.width / 2 - (gsap.getProperty(btn, 'x') || 0);
        var cy = r.top + r.height / 2 - (gsap.getProperty(btn, 'y') || 0);
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var w = btn.offsetWidth / 2 + reach, h = btn.offsetHeight / 2 + reach;
        var inside = Math.abs(dx) <= w && Math.abs(dy) <= h;
        return { inside: inside, dist: Math.max(Math.abs(dx) / w, Math.abs(dy) / h), dx: dx, dy: dy };
      },
      pull: function (d) {
        if (!active) {
          active = true;
          btn.classList.add('is-hover');
          gsap.to(btn, { scale: 1.05, duration: .6, ease: 'power3.out', overwrite: 'auto' });
          nudge(btn, true);
          o.onActivate && o.onActivate();
        }
        gsap.to(btn, { x: cap(d.dx * .25), y: cap(d.dy * .25), duration: .6, ease: 'power3.out', overwrite: 'auto' });
        gsap.to(inner, { x: cap(d.dx * .1), y: cap(d.dy * .1), duration: .6, ease: 'power3.out', overwrite: 'auto' });
      },
      release: function () {
        if (!active) return;
        active = false;
        btn.classList.remove('is-hover');
        gsap.to(btn, { x: 0, y: 0, scale: 1, duration: 1, ease: 'elastic.out(1, .4)', overwrite: 'auto' });
        gsap.to(inner, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)', overwrite: 'auto' });
        nudge(btn, false);
        o.onRelease && o.onRelease();
      }
    };
    if (!cell._magnets) {
      cell._magnets = [];
      cell.addEventListener('pointermove', function (e) {
        var nearest = null, best = Infinity;
        cell._magnets.forEach(function (x) { x.d = x.measure(e); if (x.d.inside && x.d.dist < best) { best = x.d.dist; nearest = x; } });
        cell._magnets.forEach(function (x) { x === nearest ? x.pull(x.d) : x.release(); });
      });
      cell.addEventListener('pointerleave', function () { cell._magnets.forEach(function (x) { x.release(); }); });
    }
    cell._magnets.push(m);
    // the press only; hover is the reach above
    btn.addEventListener('pointerdown', function () { gsap.to(btn, { scale: 1.0, duration: .15, ease: 'power2.out', overwrite: 'auto' }); });
    btn.addEventListener('pointerup', function () { gsap.to(btn, { scale: 1.05, duration: .5, ease: 'back.out(3)', overwrite: 'auto' }); });
  }

  var concepts = {

    // 01 — the boil on the mono label while hovered, with the old lift
    jiggle: function (btn) {
      var b = boil(split(btn.querySelector('.lab-t')));
      wire(btn, {
        scale: 1.04,
        enter: function () { b.start(); lift(btn, true); nudge(btn, true); },
        leave: function () { b.stop(); lift(btn, false); nudge(btn, false); }
      });
    },

    // 02 — the old stop-motion button, mono caps: bolts flicker always (4 frames), the hand-drawn
    //      back flickers on hover (3 drawings) and the label boils on the same clock
    stop: function (btn) {
      var b = boil(split(btn.querySelector('.lab-t')));
      var back = btn.querySelector('.lab-sm_back svg');
      var bolts = Array.prototype.slice.call(btn.querySelectorAll('.lab-sm_icon svg'));
      var sprite = stepper(FPS, function (f) {
        bolts.forEach(function (s, i) { gsap.set(s, { xPercent: -25 * ((f + i * 2) % 4) }); });
      });
      if (bolts.length) sprite.start();
      var flicker = stepper(FPS, function (f) { gsap.set(back, { xPercent: -100 / 3 * (f % 3) }); });
      var spots = btn.parentNode.querySelector('.lab-spots i');
      if (spots && !reduce) gsap.to(spots, { opacity: .35, duration: .9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      wire(btn, {
        scale: 1.04,
        enter: function () { flicker.start(); b.start(); lift(btn, true); },
        leave: function () { flicker.stop(); gsap.set(back, { xPercent: 0 }); b.stop(); lift(btn, false); }
      });
    },

    // 03 — magnetic
    magnet: function (btn, cell) { magnet(btn, cell, {}); },

    // 04 — the label rolls up and the second line rolls in
    swap: function (btn) {
      var s = swap(btn);
      wire(btn, {
        enter: function () { s.to(true); nudge(btn, true); },
        leave: function () { s.to(false); nudge(btn, false); }
      });
    },

    // 05 — magnetic + swap: the lean brings the second line with it
    magnetswap: function (btn, cell) {
      var s = swap(btn);
      magnet(btn, cell, { onActivate: function () { s.to(true); }, onRelease: function () { s.to(false); } });
    },

    // 06 — all three: lean in, the line rolls, the new line settles into the boil
    all: function (btn, cell) {
      var s = swap(btn), b = boil(s.b.slice(0, -1)), timer;
      magnet(btn, cell, {
        onActivate: function () { s.to(true); timer = gsap.delayedCall(.4, b.start); },
        onRelease: function () { timer && timer.kill(); b.stop(); s.to(false); }
      });
    }
  };

  document.querySelectorAll('[data-concept]').forEach(function (cell) {
    var setup = concepts[cell.dataset.concept];
    if (!setup) return;
    cell.querySelectorAll('.lab-btn').forEach(function (btn) { setup(btn, cell); });
  });
})();
