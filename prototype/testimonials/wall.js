// Wall of love: everything on top of Osmo's slider (slider.js).
//   Balls: they move by themselves, like the calculator's. The mouse only warms the spot under it, and a card arriving stirs its colours.
//   Faces: the colour and the corners swoon out of the old face and into the new one.
//   Cards: fade and corners aren't timed, they read where the card is, every frame. So they can't run ahead of it or behind it.
document.addEventListener('DOMContentLoaded', function () {
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'osmo-ease';
  var balls = [];

  /* ---------- corners ---------- */
  function Corners(host) {
    var els = ['tl', 'tr', 'bl', 'br'].map(function (k) {
      var c = document.createElement('div'), i = document.createElement('i');
      c.className = 'ts_c is--' + k; c.setAttribute('aria-hidden', 'true'); c.appendChild(i); host.appendChild(c);
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
  var list = document.querySelector('.centered-slider-bullet__list');
  var row = document.querySelector('.centered-slider-row');
  var bullets = Array.prototype.slice.call(list.querySelectorAll('[data-centered-slider="bullet"]'));
  var cols = bullets.map(function (b) {
    var img = b.querySelector('img');
    if (!img) return null;
    var c = img.cloneNode(); c.alt = ''; c.className = 'ts_col'; b.appendChild(c);
    return c;
  });
  var LIFT = 1.16;
  var marker = new Corners(list);

  function faceBox(i) {
    var li = bullets[i].parentNode, w = bullets[i].offsetWidth, pad = w * .12, half = w * LIFT / 2 + pad;
    var x = li.offsetLeft + w / 2, y = li.offsetTop + bullets[i].offsetHeight / 2 - w * .07;
    return { l: x - half, t: y - half, r: x + half, b: y + half };
  }

  var current = -1, ready = performance.now() + 400, lockUntil = 0;
  function go(i, instant) {
    if (i === current) return;
    var from = current, dir = i > from ? 1 : -1;
    current = i;
    var up = { scale: LIFT, y: -bullets[i].offsetWidth * .07 }, wide = 'circle(150% at 50% 50%)';
    if (instant || calm) {
      if (from > -1) { gsap.set(bullets[from], { scale: 1, y: 0 }); if (cols[from]) gsap.set(cols[from], { clipPath: 'circle(0% at 50% 50%)' }); }
      gsap.set(bullets[i], up); if (cols[i]) gsap.set(cols[i], { clipPath: wide });
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
  if (new URLSearchParams(location.search).get('corners') === 'off') document.documentElement.classList.add('no-corners');
  var FLOW = 1;   // the calculator's pace
  // [px past the right edge, px past the bottom edge, seed, colour bias]: each ball its own crop and mix
  var SPOTS = [[6, 10, 14, -.08], [2, 14, 5, -.06], [0, 8, 23, -.1], [8, 6, 2, -.08], [4, 12, 31, -.06], [10, 10, 6, -.1], [2, 6, 19, -.08], [6, 14, 41, -.06], [0, 12, 7, -.1]];
  balls = Array.prototype.map.call(document.querySelectorAll('.centered-slider-slide__inner'), function (card, i) {
    var w = document.createElement('div'), c = document.createElement('canvas'), s = SPOTS[i % SPOTS.length];
    w.className = 'ts_ball'; w.setAttribute('aria-hidden', 'true'); w.appendChild(c); card.insertBefore(w, card.firstChild);
    var cc = document.createElement('div');
    cc.className = 'ts_cc'; cc.setAttribute('aria-hidden', 'true'); cc.innerHTML = '<b></b><b></b><b></b><b></b>'; card.appendChild(cc);
    return { canvas: c, card: card, slide: card.parentNode, dx: s[0], dy: s[1], seed: s[2], bias: s[3], t: i * 11, float: i * 2.3, stir: 0, amt: 0, want: 0, px: 0, py: 0, tx: 0, ty: 0, s: 0, r: 0 };
  });
  function measure(b) {
    b.s = b.canvas.getBoundingClientRect().width;
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
    if (e.pointerType !== 'mouse') return;
    balls.forEach(function (b) {
      var box = b.canvas.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
      var on = Math.hypot(x - b.cx, y - b.cy) < b.r * 1.05 && x < b.s && y < b.s;
      if (on) { if (!b.want) { b.px = x; b.py = y; } b.tx = x; b.ty = y; b.want = 1; } else b.want = 0;
    });
  }, { passive: true });

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  var seen = true, last = 0;
  new IntersectionObserver(function (e) { seen = e[0].isIntersecting; }).observe(document.querySelector('.ts_section'));
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min((now - last) / 1000, .05); last = now;
    if (!seen || document.hidden) return;
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
  requestAnimationFrame(loop);
});
