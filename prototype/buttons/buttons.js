/* Button lab: one setup per concept, all motion with GSAP (loaded from the Webflow CDN). Hover
   states are classes set from pointer events, so a screenshot script can enter them without a mouse. */
(function () {
  var gsap = window.gsap;
  if (!gsap) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rnd = gsap.utils.random;

  // One span per character, so each letter can move on its own. Returns the spans.
  function split(el) {
    if (!el || el.dataset.split) return el ? Array.prototype.slice.call(el.querySelectorAll('.lab-ch')) : [];
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
      start: function () { if (running) return; running = true; last = -1; t0 = gsap.ticker.time; gsap.ticker.add(tick); },
      stop: function () { if (!running) return; running = false; gsap.ticker.remove(tick); }
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

  var concepts = {

    // 01 — the letters are re-placed every frame while hovered (10 fps), then settle
    jiggle: function (btn) {
      var chars = split(btn.querySelector('.lab-t'));
      gsap.set(chars, { transformOrigin: '50% 60%' });
      var step = stepper(10, function () {
        chars.forEach(function (c) { gsap.set(c, { x: rnd(-1.2, 1.2), y: rnd(-1.2, 1.2), rotation: rnd(-7, 7) }); });
      });
      wire(btn, {
        scale: 1.04,
        enter: function () {
          if (!reduce) step.start();
          gsap.to(btn, { scale: 1.04, rotation: -1, duration: .55, ease: 'back.out(3)', overwrite: 'auto' });
          nudge(btn, true);
        },
        leave: function () {
          step.stop();
          gsap.to(chars, { x: 0, y: 0, rotation: 0, duration: .35, ease: 'power3.out', overwrite: true });
          gsap.to(btn, { scale: 1, rotation: 0, duration: .55, ease: 'back.out(2)', overwrite: 'auto' });
          nudge(btn, false);
        }
      });
    },

    // 02 — the old stop-motion button: bolts flicker always (9 fps, 4 frames), the hand-drawn back
    //      flickers on hover (3 frames) and the label jiggles instead of rotating
    stop: function (btn) {
      var chars = split(btn.querySelector('.lab-t'));
      var back = btn.querySelector('.lab-sm_back svg');
      var bolts = Array.prototype.slice.call(btn.querySelectorAll('.lab-sm_icon svg'));
      gsap.set(chars, { transformOrigin: '50% 60%' });
      var sprite = stepper(9, function (f) {
        bolts.forEach(function (s, i) { gsap.set(s, { xPercent: -25 * ((f + i * 2) % 4) }); });
      });
      if (bolts.length && !reduce) sprite.start();
      var hover = stepper(9, function (f) {
        gsap.set(back, { xPercent: -100 / 3 * (f % 3) });
        chars.forEach(function (c) { gsap.set(c, { x: rnd(-.8, .8), y: rnd(-1, 1), rotation: rnd(-4, 4) }); });
      });
      var spots = btn.parentNode.querySelector('.lab-spots i');
      if (spots && !reduce) gsap.to(spots, { opacity: .35, duration: .9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      wire(btn, {
        scale: 1.05,
        enter: function () {
          if (!reduce) hover.start();
          gsap.to(btn, { scale: 1.05, rotation: -1, duration: .5, ease: 'back.out(3)', overwrite: 'auto' });
        },
        leave: function () {
          hover.stop();
          gsap.set(back, { xPercent: 0 });
          gsap.to(chars, { x: 0, y: 0, rotation: 0, duration: .3, ease: 'power3.out', overwrite: true });
          gsap.to(btn, { scale: 1, rotation: 0, duration: .5, ease: 'back.out(2)', overwrite: 'auto' });
        }
      });
    },

    // 03 — magnetic: within a reach around the button it follows the pointer; the label a little more
    magnet: function (btn, cell) {
      var inner = btn.querySelector('.lab-in');
      var reach = 56, active = false, cap = gsap.utils.clamp(-9, 9); // never into the neighbour
      function release() {
        if (!active) return;
        active = false;
        btn.classList.remove('is-hover');
        gsap.to(btn, { x: 0, y: 0, scale: 1, duration: 1, ease: 'elastic.out(1, .4)', overwrite: 'auto' });
        gsap.to(inner, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)', overwrite: 'auto' });
        nudge(btn, false);
      }
      cell.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        // the rect moves with the button: take the current offset out again
        var cx = r.left + r.width / 2 - (gsap.getProperty(btn, 'x') || 0);
        var cy = r.top + r.height / 2 - (gsap.getProperty(btn, 'y') || 0);
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var w = btn.offsetWidth / 2 + reach, h = btn.offsetHeight / 2 + reach;
        if (Math.abs(dx) > w || Math.abs(dy) > h) return release();
        if (!active) {
          active = true;
          btn.classList.add('is-hover');
          gsap.to(btn, { scale: 1.05, duration: .6, ease: 'power3.out', overwrite: 'auto' });
          nudge(btn, true);
        }
        gsap.to(btn, { x: cap(dx * .25), y: cap(dy * .25), duration: .6, ease: 'power3.out', overwrite: 'auto' });
        gsap.to(inner, { x: cap(dx * .1), y: cap(dy * .1), duration: .6, ease: 'power3.out', overwrite: 'auto' });
      });
      cell.addEventListener('pointerleave', release);
      // the press only; hover is handled by the reach above
      btn.addEventListener('pointerdown', function () { gsap.to(btn, { scale: 1.0, duration: .15, ease: 'power2.out', overwrite: 'auto' }); });
      btn.addEventListener('pointerup', function () { gsap.to(btn, { scale: 1.05, duration: .5, ease: 'back.out(3)', overwrite: 'auto' }); });
    },

    // 04 — the fill wipes in over five frames (clip-path), and out the other side
    wipe: function (btn) {
      var fill = btn.querySelector('.lab-wipe_fill');
      var frames = reduce ? 1 : 5;
      wire(btn, {
        enter: function () {
          gsap.to(fill, { clipPath: 'inset(0 0% 0 0)', duration: .36, ease: 'steps(' + frames + ')', overwrite: true });
          nudge(btn, true);
        },
        leave: function () {
          gsap.to(fill, { clipPath: 'inset(0 0% 0 100%)', duration: .36, ease: 'steps(' + frames + ')', overwrite: true,
            onComplete: function () { gsap.set(fill, { clipPath: 'inset(0 100% 0 0)' }); } });
          nudge(btn, false);
        }
      });
    },

    // 05 — the label rolls up out of its mask and the second line rolls in from below
    swap: function (btn) {
      var a = split(btn.querySelector('.lab-swap_a .lab-t')).concat([btn.querySelector('.lab-swap_a .lab-arrow')]);
      var b = split(btn.querySelector('.lab-swap_b .lab-t')).concat([btn.querySelector('.lab-swap_b .lab-arrow')]);
      gsap.set(b, { yPercent: 120 });
      wire(btn, {
        enter: function () {
          gsap.to(a, { yPercent: -120, duration: .55, ease: 'expo.out', stagger: .012, overwrite: 'auto' });
          gsap.to(b, { yPercent: 0, duration: .55, ease: 'expo.out', stagger: .012, overwrite: 'auto' });
          nudge(btn, true);
        },
        leave: function () {
          gsap.to(a, { yPercent: 0, duration: .55, ease: 'expo.out', stagger: .012, overwrite: 'auto' });
          gsap.to(b, { yPercent: 120, duration: .55, ease: 'expo.out', stagger: .012, overwrite: 'auto' });
          nudge(btn, false);
        }
      });
    },

    // 06 — a hairline draws in from the left and runs out to the right
    line: function (btn) {
      var line = btn.querySelector('.lab-line');
      wire(btn, {
        enter: function () {
          gsap.set(line, { transformOrigin: 'left center' });
          gsap.to(line, { scaleX: 1, duration: .55, ease: 'expo.out', overwrite: true });
          nudge(btn, true);
        },
        leave: function () {
          gsap.set(line, { transformOrigin: 'right center' });
          gsap.to(line, { scaleX: 0, duration: .45, ease: 'expo.out', overwrite: true });
          nudge(btn, false);
        }
      });
    }
  };

  document.querySelectorAll('[data-concept]').forEach(function (cell) {
    var setup = concepts[cell.dataset.concept];
    if (!setup) return;
    cell.querySelectorAll('.lab-btn').forEach(function (btn) { setup(btn, cell); });
  });
})();
