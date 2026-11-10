// rdLost: the hidden game on the 404 page.
// Tap the scared face and he jumps. Tap him again before he lands to keep him in the air.
// He smiles on the way up and is scared on the way down. The page looks like a plain 404 until you touch him.
//
// Markup (all of it lives in the page, the code only moves things and fills in numbers):
//   [data-lost]            the wrapper, gets data-lost-state = idle | play | over
//   [data-lost-slot]       his seat in the layout
//   [data-lost-face]       the face itself (two images inside: .is-scared and .is-happy)
//   [data-lost-n]          the running count, shown in his seat while he is in the air
//   [data-lost-last]       the count of the last round
//   [data-lost-best]       the best count on this device
// ?lostdebug=1 exposes window.rdLostDebug for tests.
function rdLost(root) {
  root = root || document.querySelector('[data-lost]');
  if (!root || root.rdLost) return;
  var slot = root.querySelector('[data-lost-slot]'), face = root.querySelector('[data-lost-face]');
  if (!slot || !face) return;
  root.rdLost = true;

  var nEl = root.querySelector('[data-lost-n]'), lastEl = root.querySelector('[data-lost-last]'), bestEl = root.querySelector('[data-lost-best]');
  var KEY = 'rd-lost-best';
  var best = 0;
  try { best = +localStorage.getItem(KEY) || 0; } catch (e) {}

  // phase: idle (in his seat) | play (in the air) | drop (hit the floor, still bouncing) | back (walking home)
  var phase = 'idle', n = 0;
  var x = 0, y = 0, vx = 0, vy = 0, a = 0, va = 0, squash = 0;
  var raf = 0, last = 0, timer = 0, from = null;

  function two(v) { return (v < 10 ? '0' : '') + v; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function view() { return { w: document.documentElement.clientWidth, h: window.innerHeight }; }
  function seat() { var r = slot.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 }; }
  function setState(s) { root.setAttribute('data-lost-state', s); }
  function write() {
    if (nEl) nEl.textContent = two(n);
    if (lastEl) lastEl.textContent = two(n);
    if (bestEl) bestEl.textContent = two(best);
  }

  function draw(s) {
    var k = squash, sx = 1 - k * 0.16, sy = 1 + k * 0.2;
    face.style.transform = 'translate3d(' + (x - s.x).toFixed(1) + 'px,' + (y - s.y).toFixed(1) + 'px,0) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ') rotate(' + a.toFixed(3) + 'rad)';
    face.classList.toggle('is-up', phase === 'play' && vy < 140);
  }

  // one tap: up he goes, away from where he was hit
  function kick(px) {
    var s = seat(), v = view(), first = phase === 'idle';
    if (phase !== 'play') {
      if (phase === 'idle') { x = s.x; y = s.y; a = 0; }
      phase = 'play'; n = 0; setState('play');
    }
    n += 1;
    var speed = clamp(v.h * 1.45, 800, 1450);   // one tap lifts him about 40% of the screen
    if (first) speed *= 0.85;                   // softer from his seat, so the first jump stays under the top edge
    var reach = Math.max(s.r * 1.35, 52);
    var off = px == null ? (Math.random() - 0.5) * 0.8 : clamp((x - px) / reach, -1, 1);
    vy = -speed;
    vx = clamp(vx * 0.3 + off * speed * 0.42, -speed * 0.6, speed * 0.6);
    va = vx * 0.012;
    squash = 1;
    write();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function land() {
    phase = 'drop'; timer = 0;
    if (n > best) { best = n; try { localStorage.setItem(KEY, String(best)); } catch (e) {} }
    write(); setState('over');
  }

  function step(dt) {
    var s = seat(), v = view(), r = s.r;
    if (phase === 'play' || phase === 'drop') {
      var g = clamp(v.h * 2.6, 1300, 2500) * (1 + Math.min(n, 30) * 0.02);   // a little heavier with every tap
      vy += g * dt; x += vx * dt; y += vy * dt; a += va * dt;
      if (x < r) { x = r; vx = Math.abs(vx) * 0.8; va = -va * 0.6; }
      if (x > v.w - r) { x = v.w - r; vx = -Math.abs(vx) * 0.8; va = -va * 0.6; }
      if (y < r) { y = r; vy = Math.abs(vy) * 0.45; }
      if (y > v.h - r) {
        y = v.h - r;
        if (phase === 'play') land();
        squash = -clamp(Math.abs(vy) / 1400, 0, 1);
        vy = -Math.abs(vy) * 0.36; vx *= 0.7; va = vx * 0.012;
      }
      if (phase === 'drop') {
        timer += dt;
        if (timer > 0.75) { phase = 'back'; timer = 0; from = { x: x, y: y, a: a }; }
      }
    } else if (phase === 'back') {
      timer += dt;
      var t = clamp(timer / 0.65, 0, 1), e = 1 - Math.pow(1 - t, 3);
      var turn = Math.round(from.a / (Math.PI * 2)) * Math.PI * 2;        // home upright, by the short way round
      x = from.x + (s.x - from.x) * e;
      y = from.y + (s.y - from.y) * e - Math.sin(t * Math.PI) * v.h * 0.12;   // a small hop on the way
      a = from.a + (turn - from.a) * e;
      if (t >= 1) { phase = 'idle'; x = s.x; y = s.y; a = 0; vx = vy = va = 0; squash = 0; }
    }
    squash += (0 - squash) * Math.min(1, dt * 9);
    draw(s);
  }

  function tick(now) {
    var dt = Math.min((now - last) / 1000, 1 / 30); last = now;
    step(dt);
    if (phase === 'idle') { raf = 0; face.style.transform = ''; return; }
    raf = requestAnimationFrame(tick);
  }

  function hit(px, py) {
    if (phase === 'idle') return false;
    var s = seat(), reach = Math.max(s.r * 1.35, 52);
    return Math.hypot(px - x, py - y) <= reach;
  }

  // in his seat only the face itself starts it, so the page stays a normal page;
  // once he is out, a tap close to him counts, wherever he is
  face.addEventListener('pointerdown', function (ev) {
    if (phase !== 'idle') return;
    ev.preventDefault();
    kick(ev.clientX);
  });
  document.addEventListener('pointerdown', function (ev) {
    if (phase === 'idle' || !document.body.contains(root)) return;
    if (!hit(ev.clientX, ev.clientY)) return;
    ev.preventDefault();
    kick(ev.clientX);
  }, true);
  face.addEventListener('keydown', function (ev) {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    ev.preventDefault();
    kick(null);
  });

  write();

  if (/[?&]lostdebug=1/.test(location.search)) {
    window.rdLostDebug = {
      get: function () { return { phase: phase, n: n, best: best, x: x, y: y, vx: vx, vy: vy, a: a }; },
      kick: kick, step: step,
      run: function (seconds) { for (var i = 0, k = Math.round(seconds * 120); i < k; i++) step(1 / 120); return this.get(); }
    };
  }
}
