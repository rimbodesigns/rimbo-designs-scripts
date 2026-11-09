/* The site's global button (.btn): magnetic + label swap + boil. For the hosted preview only: on rimbodesigns.com the
   calculator uses the site's own window.rdButtons from main.js. This is a copy of it, so keep the two the same.
   rdButtons(root) wires the buttons inside root that aren't wired yet. Needs GSAP. */
(function () {
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return Array.from((r || document).querySelectorAll(s)); }

  function rdButtons(root) {
    // Each button once: the calculator builds its buttons after the page's own run, so it may call this again
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

  window.rdButtons = rdButtons;
})();
