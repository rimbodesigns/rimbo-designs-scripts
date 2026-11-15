/* Tinko, live in his work tile (work page hero). Not a recording: Tinko himself, drawn and moved by the same code as
   on /meet-tinko (Digital Feng Shui, website/meet/tinko.js: makeTinko + the hero intro), cut down to one tile.
   When his tile lands in front: he arrives alone and big in the middle (his outline drawn block by block, filled
   ring by ring), wakes up, blinks, says hello, then glides into his place while his app window opens around him and
   his first screen appears. After that he lives: blinks, goofs now and then, his eyes follow the mouse, and a click
   on him is his "bwoop". When his tile has gone behind the others he is put back to sleep, ready to arrive again.
   window.TinkoLive.mount(el) -> { play(), wait() }. Only the hero (work-hero.js) calls these. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Tinko, after Tinko.swift (copied from meet/tinko.js) ---------- */
  var BITMAP = ['....######....', '..##########..', '.############.', '.#############', '##############', '##############', '##############', '.############.', '.############.', '..##########..', '....#####.....'];
  var COLS = 14, ROWS = 11, CX = COLS / 2, CY = ROWS / 2;
  var isOn = function (x, y) { return y >= 0 && y < ROWS && x >= 0 && x < COLS && BITMAP[y][x] === '#'; };
  function outline() {
    var next = new Map(), add = function (a, b) { next.set(a.join(','), b); };
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
      if (!isOn(x, y)) continue;
      if (!isOn(x, y - 1)) add([x, y], [x + 1, y]);
      if (!isOn(x + 1, y)) add([x + 1, y], [x + 1, y + 1]);
      if (!isOn(x, y + 1)) add([x + 1, y + 1], [x, y + 1]);
      if (!isOn(x - 1, y)) add([x, y + 1], [x, y]);
    }
    var start = Array.from(next.keys()).sort()[0].split(',').map(Number);
    var loop = [], p = start;
    do { loop.push(p); p = next.get(p.join(',')); } while (p && (p[0] !== start[0] || p[1] !== start[1]) && loop.length < 1000);
    return loop.filter(function (b, i) {
      var a = loop[(i + loop.length - 1) % loop.length], c = loop[(i + 1) % loop.length];
      return !((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]));
    });
  }
  function deformed(corners) {
    var n = corners.length, off = corners.map(function () { return -0.3 + Math.random() * 0.75; });
    return corners.map(function (p, i) {
      var prev = corners[(i + n - 1) % n], nxt = corners[(i + 1) % n], q = p.slice();
      [[prev, p, off[(i + n - 1) % n]], [p, nxt, off[i]]].forEach(function (e) {
        var a = e[0], b = e[1], o = e[2], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.max(Math.abs(dx), Math.abs(dy));
        q[0] += dy / len * o; q[1] += -dx / len * o;
      });
      return q;
    });
  }
  var pathOf = function (c) { return 'M' + c.map(function (p) { return p[0].toFixed(3) + ' ' + p[1].toFixed(3); }).join('L') + 'Z'; };
  var inOut = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var EASES = { inOut: inOut, out: function (t) { return 1 - Math.pow(1 - t, 3); }, in: function (t) { return t * t * t; } };
  var E = function (x, y, w, h) { return { x: x, y: y, w: w == null ? 1 : w, h: h == null ? 2 : h }; };
  var HOME = [E(-1.5, -.5), E(1.5, -.5)];
  var GOOFS = [[E(-4.2, -.3), E(4.2, -.3)], [E(-4.0, .8), E(3.8, -1.6)], [E(-1.8, -.5, 2.2, 2.2), E(1.9, -.3, .9, 1.6)], [E(-3.6, -2.2), E(3.6, -2.2)], [E(-.7, -.5), E(.7, -.5)]];
  var PIX = []; BITMAP.forEach(function (r, y) { r.split('').forEach(function (c, x) { if (c === '#') PIX.push({ x: x, y: y }); }); });
  var RING = (function () {
    var depth = new Map(), key = function (c) { return c.x + ',' + c.y; }, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var layer = PIX.filter(function (c) { return N4.some(function (d) { return !isOn(c.x + d[0], c.y + d[1]); }); }), d = 0;
    var left = new Set(PIX.map(key));
    while (layer.length) {
      layer.forEach(function (c) { depth.set(key(c), d); left.delete(key(c)); }); d++;
      layer = PIX.filter(function (c) { return left.has(key(c)) && N4.some(function (n) { return depth.get((c.x + n[0]) + ',' + (c.y + n[1])) === d - 1; }); });
    }
    var maxD = Math.max.apply(null, Array.from(depth.values()));
    return function (c) { return { d: depth.get(key(c)), maxD: maxD, ang: (Math.atan2(c.y + .5 - CY, c.x + .5 - CX) + Math.PI * 1.5) % (Math.PI * 2) / (Math.PI * 2) }; };
  })();
  // his arrival: the outline drawn block by block, then the inside fills ring by ring (the one /meet-tinko uses)
  var ARRIVE = { dur: 1250, at: function (c) { var r = RING(c); return r.d === 0 ? r.ang * .58 : .6 + r.d / r.maxD * .4; } };
  function wakeTimes(k) { var A = ARRIVE.dur * k, start = 60 * k, end = start + A; return { A: A, start: start, end: end, open: end + 220 * k, blink: end + 640 * k, hello: end + 900 * k, idle: end + 1550 * k }; }

  var ids = 0;
  function makeTinko(host) {
    var mid = 'tl-mask-' + (++ids);
    host.innerHTML = '<div class="tkh-sway"><div class="tkh-jig"><div class="tkh-blob"><svg class="tkh-svg" viewBox="-1 -1 ' + (COLS + 2) + ' ' + (ROWS + 2) + '" aria-hidden="true">' +
      '<defs><mask id="' + mid + '" maskUnits="userSpaceOnUse" x="-2" y="-2" width="' + (COLS + 4) + '" height="' + (ROWS + 4) + '">' +
      BITMAP.map(function (r, y) { return r.split('').map(function (c, x) { return c === '#' ? '<rect fill="#fff" x="' + (x + .5) + '" y="' + (y + .5) + '" width="0" height="0"/>' : ''; }).join(''); }).join('') +
      '</mask></defs><g class="tkh-me"><path class="tkh-body"/><rect class="tkh-eye"/><rect class="tkh-eye"/></g></svg></div></div></div>';
    var svg = host.querySelector('svg'), body = host.querySelector('.tkh-body'), me = host.querySelector('.tkh-me');
    var cells = Array.prototype.map.call(host.querySelectorAll('mask rect'), function (el) { var x = +el.getAttribute('x') - .5, y = +el.getAttribute('y') - .5; return { el: el, x: x, y: y, at: ARRIVE.at({ x: x, y: y }), w: -1 }; });
    var reveal = null, driftFrom = -1e9;
    var sizeCell = function (c, w) { if (Math.abs(w - c.w) < .001) return; c.w = w; c.el.setAttribute('x', (c.x + .5 - w / 2).toFixed(3)); c.el.setAttribute('y', (c.y + .5 - w / 2).toFixed(3)); c.el.setAttribute('width', w.toFixed(3)); c.el.setAttribute('height', w.toFixed(3)); };
    var masked = function (on) { if (on) me.setAttribute('mask', 'url(#' + mid + ')'); else me.removeAttribute('mask'); };
    var eyeEls = Array.prototype.slice.call(host.querySelectorAll('.tkh-eye')), blob = host.querySelector('.tkh-blob'), jig = host.querySelector('.tkh-jig');
    var base = outline(), variants = [deformed(base), deformed(base), deformed(base), deformed(base)]; variants.push(variants[0]);
    var morphAt = function (t) { var leg = Math.min(3, Math.floor(t * 4)), k = inOut(t * 4 - leg), a = variants[leg], b = variants[leg + 1]; return a.map(function (p, i) { return [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]; }); };
    body.setAttribute('d', pathOf(base));
    var eyes = HOME.map(function (e) { return Object.assign({}, e); }), tween = null;
    var drawEyes = function () { eyes.forEach(function (e, i) { var el = eyeEls[i]; el.setAttribute('x', (CX + e.x - e.w / 2).toFixed(3)); el.setAttribute('y', (CY + e.y - e.h / 2).toFixed(3)); el.setAttribute('width', Math.max(0, e.w).toFixed(3)); el.setAttribute('height', Math.max(0, e.h).toFixed(3)); }); };
    function set(l, r, dur, ease) { dur = dur == null ? .45 : dur; if (reduce) dur = Math.min(dur, .12); tween = { from: eyes.map(function (e) { return Object.assign({}, e); }), to: [l, r], t0: performance.now(), dur: dur * 1000, ease: EASES[ease || 'inOut'] }; wake(); }
    drawEyes();
    var raf = 0, visible = false, t0 = performance.now();
    function frame(now) {
      raf = 0;
      if (!host.isConnected) return;
      if (!reduce) {
        var amp = inOut(Math.max(0, Math.min(1, (now - driftFrom) / 1800)));
        if (amp <= 0) body.setAttribute('d', pathOf(base));
        else { var m = morphAt((((now - t0) / 11000) % 1 + 1) % 1); body.setAttribute('d', pathOf(amp >= 1 ? m : base.map(function (p, i) { return [p[0] + (m[i][0] - p[0]) * amp, p[1] + (m[i][1] - p[1]) * amp]; }))); }
      }
      if (reveal) {
        var k = (now - reveal.t0) / reveal.A;
        cells.forEach(function (c) { sizeCell(c, k >= c.at ? 1.04 : 0); });
        if (k >= 1) { masked(false); reveal = null; }
      }
      if (tween) {
        var kk = Math.min(1, (now - tween.t0) / tween.dur), f = tween.ease(kk);
        eyes = tween.from.map(function (a, i) { var b = tween.to[i]; return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: a.w + (b.w - a.w) * f, h: a.h + (b.h - a.h) * f }; });
        drawEyes();
        if (kk >= 1) tween = null;
      }
      if (visible && (!reduce || tween || reveal)) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }
    function show(on) { visible = on; if (on) wake(); }
    var mood = 'asleep', goofing = false, blinking = false, nextBlink = 0, nextGoof = 0, gaze = { x: 0, y: 0 };
    var timers = new Set(), later = function (fn, ms) { var id = setTimeout(function () { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    function blink() {
      if (blinking) return; blinking = true;
      var lr = (tween ? tween.to : eyes).map(function (e) { return Object.assign({}, e); }), l = lr[0], r = lr[1];
      set(Object.assign({}, l, { y: l.y + .8, h: .25 }), Object.assign({}, r, { y: r.y + .8, h: .25 }), .07, 'in');
      later(function () { set(l, r, .16, 'out'); blinking = false; }, 130);
    }
    function goof() {
      goofing = true; var g = GOOFS[Math.floor(Math.random() * GOOFS.length)];
      set(Object.assign({}, g[0]), Object.assign({}, g[1]), .9);
      later(function () { if (mood !== 'idle') { goofing = false; return; } gaze = { x: 0, y: 0 }; set(Object.assign({}, HOME[0]), Object.assign({}, HOME[1]), .7); later(function () { goofing = false; }, 700); }, 1200 + Math.random() * 800);
    }
    // his eyes follow the mouse, wherever it is on the page
    var pointer = null;
    addEventListener('pointermove', function (e) { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
    function follow() {
      var r = svg.getBoundingClientRect(), g;
      if (!pointer) g = { x: 0, y: 0 };
      else { var reach = Math.max(260, r.width * 1.35); g = { x: Math.max(-1, Math.min(1, (pointer.x - (r.left + r.width / 2)) / reach)), y: Math.max(-1, Math.min(1, (pointer.y - (r.top + r.height * .45)) / reach)) }; }
      if (Math.abs(g.x - gaze.x) <= .04 && Math.abs(g.y - gaze.y) <= .04) return;
      gaze = g; var dx = g.x * 1.8, dy = g.y * 1.1;
      set(E(HOME[0].x + dx, HOME[0].y + dy), E(HOME[1].x + dx, HOME[1].y + dy), .25, 'out');
    }
    var tick = setInterval(function () {
      if (!host.isConnected) { clearInterval(tick); return; }
      if (!visible || reduce) return;
      var now = performance.now();
      if (mood === 'idle') {
        if (now >= nextGoof && !goofing && !blinking) { nextGoof = now + 6000 + Math.random() * 8000; goof(); }
        if (!goofing && !blinking) follow();
      }
      if (mood !== 'asleep' && now >= nextBlink && !blinking) { nextBlink = now + 2500 + Math.random() * 3500; blink(); }
    }, 100);
    function bwoop() {
      if (mood === 'asleep') return;
      blob.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: .18 }, { transform: 'scale(.92)', offset: .42 }, { transform: 'scale(1.06)', offset: .62 }, { transform: 'scale(.98)', offset: .82 }, { transform: 'scale(1)' }], { duration: 700, easing: 'ease-in-out' });
      jig.animate([0, 6, -5, 3, -1.5, 0].map(function (d, i) { return { transform: 'rotate(' + d + 'deg)', offset: [0, .18, .42, .62, .82, 1][i] }; }), { duration: 700, easing: 'ease-in-out' });
      goofing = true; var was = mood;
      set(E(-2.1, -.6, 2, 2.2), E(2.1, -.6, 2, 2.2), .12, 'out');
      later(function () { set(E(-3.7, -.9, 1, 2), E(3.5, .2, 1, 1.8), .2, 'out'); }, 280);
      later(function () { if (mood === was) set(Object.assign({}, HOME[0]), Object.assign({}, HOME[1]), .3); gaze = { x: 0, y: 0 }; goofing = false; }, 750);
    }
    function sleep() {
      mood = 'asleep'; timers.forEach(clearTimeout); timers.clear(); goofing = blinking = false;
      host.classList.add('is-asleep'); host.classList.remove('is-awake');
      reveal = null; cells.forEach(function (c) { sizeCell(c, 0); }); masked(true); driftFrom = Infinity;
      eyes = HOME.map(function (e) { return Object.assign({}, e, { y: e.y + .8, h: .25 }); }); tween = null; drawEyes();
    }
    function wakeUp(k) {
      if (reduce) { awakeNow(); return; }
      var W = wakeTimes(k), now = performance.now();
      reveal = { t0: now + W.start, A: W.A }; driftFrom = now + W.end + 350 * k; wake();
      later(function () { host.classList.remove('is-asleep'); host.classList.add('is-awake'); }, W.end);
      later(function () { set(E(-1.5, -.6, 1, 2.1), E(1.5, -.6, 1, 2.1), .26, 'out'); }, W.open);
      later(function () { blinking = false; blink(); }, W.blink);
      later(function () { set(E(-1.5, -.7, 1.4, 2.2), E(1.5, -.7, 1.4, 2.2), .38, 'out'); }, W.hello);
      later(function () { mood = 'idle'; nextGoof = performance.now() + 7000; gaze = { x: 9, y: 9 }; }, W.idle);
    }
    function awakeNow() {
      timers.forEach(clearTimeout); timers.clear(); goofing = blinking = false; driftFrom = -1e9;
      reveal = null; cells.forEach(function (c) { sizeCell(c, 1.04); }); masked(false); host.classList.remove('is-asleep'); host.classList.add('is-awake');
      eyes = HOME.map(function (e) { return Object.assign({}, e); }); tween = null; drawEyes();
      mood = 'idle'; nextGoof = performance.now() + 7000; gaze = { x: 9, y: 9 };
    }
    function home(dur) { if (mood !== 'asleep') set(Object.assign({}, HOME[0]), Object.assign({}, HOME[1]), dur == null ? .3 : dur); }
    svg.addEventListener('click', bwoop);
    return { show: show, sleep: sleep, wakeUp: wakeUp, awakeNow: awakeNow, home: home, bwoop: bwoop };
  }

  /* ---------- his tile: his app window, and the arrival from /meet-tinko's hero intro ---------- */
  var LIGHTS = '<div class="tl-lights" aria-hidden="true"><i></i><i></i><i></i></div>';
  // the intro's beats in ms (meet/tinko.js BEAT, wake at full calm: Rimbo wanted him "a second longer, more elegant")
  var BEAT = { wake: 1, hold: 650, glideDur: 1150, box: 400, boxDur: 1200 };
  var EASE = 'cubic-bezier(.625,.05,0,1)';
  function mount(el) {
    el.classList.add('tl');
    el.innerHTML = '<div class="tl-win">' + LIGHTS + '<div class="tl-dash is-top"></div><div class="tl-dash is-bottom"></div>' +
      '<div class="tl-screen"><span class="tl-tag">Hi there</span><p class="tl-words">I’m Tinko. Let me take a look at what you’re working with.</p>' +
      '<span class="tl-btn"><span class="tl-key">SPACE</span>Take a look</span></div></div>' +
      '<div class="tl-tinko tkh-tinko"></div>';
    var win = el.querySelector('.tl-win'), screen = el.querySelector('.tl-screen'), tEl = el.querySelector('.tl-tinko');
    var tinko = makeTinko(tEl);
    var anims = [], timers = [], BIG = 1.55;
    // from the middle of the tile, big, to his place in the window (layout sizes: the orbit's scaling doesn't count)
    var from = function () { var drop = el.offsetHeight / 2 - (tEl.offsetTop + tEl.offsetHeight / 2); return 'translate(0px, ' + drop.toFixed(1) + 'px) scale(' + BIG + ')'; };
    var hole = function () {   // the window, shut tight around where he will sit
      var pad = el.offsetWidth * .02, t = tEl.offsetTop - win.offsetTop - pad, b = win.offsetTop + win.offsetHeight - (tEl.offsetTop + tEl.offsetHeight) - pad, x = tEl.offsetLeft - tEl.offsetWidth / 2 * 0 - win.offsetLeft - pad;
      var xr = win.offsetLeft + win.offsetWidth - (tEl.offsetLeft + tEl.offsetWidth) - pad;
      return 'inset(' + t.toFixed(1) + 'px ' + xr.toFixed(1) + 'px ' + b.toFixed(1) + 'px ' + x.toFixed(1) + 'px round 8px)';
    };
    function clear() { timers.forEach(clearTimeout); timers = []; anims.forEach(function (a) { a.cancel(); }); anims = []; }
    function wait() {   // back to the start: an empty tile, Tinko not there yet
      clear(); tinko.sleep(); tinko.show(false);
      tEl.style.transform = from(); win.style.opacity = '0'; win.style.clipPath = ''; screen.classList.add('is-hidden');
    }
    function play() {
      clear();
      if (reduce) { win.style.opacity = '1'; tEl.style.transform = ''; screen.classList.remove('is-hidden'); tinko.awakeNow(); tinko.show(true); return; }
      tinko.sleep(); tinko.show(true); var F = from(); tEl.style.transform = F;
      tinko.wakeUp(BEAT.wake);
      var W = wakeTimes(BEAT.wake), glide = W.hello + 380 * BEAT.wake + BEAT.hold;
      var at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
      at(glide, function () {   // he glides down into his place
        tinko.home(.45);
        anims.push(tEl.animate([{ transform: F }, { transform: 'translate(0px, 0px) scale(1)' }], { duration: BEAT.glideDur, easing: EASE, fill: 'forwards' }));
      });
      at(glide + BEAT.box, function () {   // his window opens out from around him
        var shut = hole();
        win.style.opacity = '1';
        anims.push(win.animate([{ clipPath: shut, opacity: 0 }, { clipPath: shut, opacity: 1, offset: .32 }, { clipPath: 'inset(0px 0px 0px 0px round 1.4cqw)', opacity: 1 }], { duration: BEAT.boxDur, easing: EASE, fill: 'forwards' }));
      });
      at(glide + BEAT.box + BEAT.boxDur * .55, function () { screen.classList.remove('is-hidden'); });
    }
    wait();
    return { play: play, wait: wait };
  }
  // his styles, once (the tile is built here, like /meet-tinko builds his window)
  function injectCSS() {
    if (document.getElementById('tl-css')) return;
    var st = document.createElement('style'); st.id = 'tl-css'; st.textContent = '.tl{position:absolute;inset:0;overflow:hidden;container-type:size;background:#f3eee4;--c-card:#fbf7ef;--c-ink:#3d3a36;--c-soft:#7d776f;--c-line:#dfd5ca;--c-calm:#1a97d7;--c-calmsoft:#edf5f9;--tkh-cell:1.3cqw;font-family:Akkuratllsub,Helvetica,Arial,sans-serif;color:var(--c-ink)}\n.tl-win{position:absolute;inset:7cqh 8cqw;background:var(--c-card);border-radius:1.4cqw;box-shadow:0 0 0 1px rgba(61,58,54,.08),0 3cqw 6cqw -3cqw rgba(61,58,54,.35)}\n.tl-lights{position:absolute;left:1.6cqw;top:1.5cqw;display:flex;gap:.9cqw}.tl-lights i{width:1.3cqw;aspect-ratio:1;border-radius:50%;background:#ff5f57}.tl-lights i:nth-child(2){background:#febc2e}.tl-lights i:nth-child(3){background:#28c840}\n.tl-dash{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,var(--c-line) 50%,transparent 0) 0 0/6px 1px}.tl-dash.is-top{top:4.4cqw}.tl-dash.is-bottom{bottom:4.4cqw}\n.tl-screen{position:absolute;left:6%;right:6%;top:51%;display:grid;justify-items:center;text-align:center;transition:opacity .7s cubic-bezier(.33,1,.68,1),transform .8s cubic-bezier(.33,1,.68,1)}\n.tl-screen.is-hidden{opacity:0;transform:translateY(1.2cqw)}\n.tl-tag{font-size:1.35cqw;letter-spacing:.1em;text-transform:uppercase;color:var(--c-calm);background:var(--c-calmsoft);border-radius:2px;padding:.3em .7em;line-height:1.2}\n.tl-words{margin:1.4cqw 0 2.2cqw;font-size:2cqw;line-height:1.6;max-width:26em;text-wrap:balance}\n.tl-btn{display:inline-flex;align-items:center;gap:.7em;padding:.9em 1.3em;border-radius:4px;font-size:1.35cqw;letter-spacing:.06em;text-transform:uppercase;background:var(--c-ink);color:var(--c-card)}\n.tl-key{display:inline-flex;align-items:center;height:1.55em;padding:0 .45em;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(251,247,239,.5);font-size:.85em;letter-spacing:0}\n.tl-tinko{position:absolute;z-index:2;left:50%;top:25.5cqh;margin-left:calc(var(--tkh-cell) * -8);width:calc(var(--tkh-cell) * 16);height:calc(var(--tkh-cell) * 13);transform-origin:50% 50%;cursor:pointer}\n.tl .tkh-sway{position:absolute;inset:0;transform-origin:50% 60%;animation:tlSway 1.85s ease-in-out infinite alternate}\n@keyframes tlSway{from{transform:rotate(-1.2deg)}to{transform:rotate(1.2deg)}}\n.tl .tkh-jig,.tl .tkh-blob{position:absolute;inset:0;transform-origin:50% 60%}\n.tl .tkh-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;display:block}\n.tl .tkh-body{fill:var(--c-ink)}.tl .tkh-eye{fill:var(--c-card)}\n.tl .tkh-tinko.is-asleep .tkh-sway{animation-play-state:paused}\n@media (prefers-reduced-motion:reduce){.tl .tkh-sway{animation:none}}';
    document.head.appendChild(st);
  }
  window.TinkoLive = { mount: function (el) { injectCSS(); return mount(el); } };
})();
