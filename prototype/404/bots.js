// rdBots: the 404 page as a small arcade.
// 48 pixel aliens stand in a formation that spells 404. A twin-cannon fighter at the bottom shoots them.
// They march, step down, shoot back, and now and then one dives at you. UFOs cross the top for bonus points.
// Clear the 404 and the mothership comes in: a big saucer with a brand ball for a dome. Beat it and the next wave is faster.
//
// One canvas, no libraries, no images, no sound files: drawings are rows of text, sounds are made on the spot.
// It only runs on the page that has a [data-bots] element, and it stops by itself when that page leaves.
//
// Markup (text and buttons live in the page, this file only draws the game and fills in numbers):
//   [data-bots]           the section. It gets data-bots-state = idle | play | over | leave,
//                         data-bots-banner = clear | boss between rounds, data-bots-muted when the sound is off
//   [data-bots-canvas]    the canvas, behind the text. Its CSS `color` is the accent colour,
//                         the section's CSS `color` is the colour of the aliens and the fighter.
//   [data-bots-start]     starts a round     [data-bots-quit]  back to the plain 404     [data-bots-sound]  sound on/off
//   [data-bots-score] [data-bots-best] [data-bots-wave]   numbers       [data-bots-life]  one element per life (gets .is-off)
//   --lost-mid            set on the section: the middle of the gap between the formation and the fighter, in px
//   data-bots-out         optional, seconds: how long leaving by a link takes before the page transition starts (0.75)
// Every moment (hit, hurt, boom, clear, ufo, start, launch, over ...) is also a 'rdbots' event on the section: screen.js listens to it.
// Keys: arrows or A/D, space to shoot, M sound, Esc to quit. Mouse: the fighter follows it, hold to shoot. Touch: drag, it shoots by itself.
// Leaving the page by a link: everything fades, the fighter launches off the top, then the site's page transition takes over.
// ?botsdebug=1 exposes window.rdBotsDebug for tests.
function rdBots(root) {
  root = root || document.querySelector('[data-bots]');
  if (!root || root.rdBots) return;
  var canvas = root.querySelector('[data-bots-canvas]');
  var ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  root.rdBots = true;

  // ---- the drawings -------------------------------------------------------------------------
  // Each row is the LEFT half of the drawing, its last character is the middle column; the right half is the mirror.
  var GLYPHS = {
    '4': ['X...X', 'X...X', 'X...X', 'XXXXX', '....X', '....X', '....X'],
    '0': ['XXXXX', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXXX']
  };
  var WORD = '404';
  var AW = 11, AH = 9;     // aliens: 11 x 9, two poses each
  var ALIENS = [
    // the watcher: one big eye, two claws
    [['X.X...', 'X.X...', '.X..XX', '.XXXXX', 'XXXX..', 'XXXX.X', 'XXXX..', '.XXXXX', '..X.X.'],
     ['XX....', 'X.X...', '.X..XX', '.XXXXX', 'XXXX..', 'XXXX.X', 'XXXX..', '.XXXXX', '.X.X..']],
    // the stinger: swept wings and a tail
    [['X....X', 'X...XX', 'XX.XXX', '.XXX.X', '.XXXXX', '..XXXX', '...XX.', '....X.', '.....X'],
     ['.....X', 'X...XX', 'XX.XXX', 'XXXX.X', 'X.XXXX', '..XXXX', '...XX.', '...X..', '......']],
    // the mask: horns and a jaw
    [['X.....', 'XX....', '.XX.XX', '..XXXX', '.XX..X', '.XXXXX', '..XX.X', '..X.X.', '......'],
     ['......', 'XX....', 'XXX.XX', '..XXXX', '.XX..X', '.XXXXX', '..XX.X', '..XXXX', '..X.X.']]
  ];
  var POINTS = [10, 20, 30];
  var SW = 15, SH = 14;    // the fighter: two cannons, a cockpit between them, swept wings
  var SHIP = ['...X....', '...X....', '...X...X', '..XXX..X', '..XXX.XX', '..XXXXXX', '.XXXXXX.', '.XXXXX..', 'XXXXXXX.', 'XXXXXXXX', 'XXX.XXXX', 'XX...XXX', 'X....XX.', 'X.....X.'];
  // the UFOs, two poses each (their lights run): w = width, v = speed, pts = what one is worth
  var UFOS = [
    { w: 15, v: 0.15, pts: [100, 150], rows: [['.....XXX', '....XX.X', '..XXXXXX', 'XXXXXXXX', 'XX.XX.XX', '..XXXXXX', '....X...'], ['.....XXX', '....XX.X', '..XXXXXX', 'XXXXXXXX', 'X.XX.XX.', '..XXXXXX', '...X....']] },   // the saucer
    { w: 11, v: 0.25, pts: [200, 300], rows: [['....XX', '..XXXX', 'XXX.X.', '.XXXXX', '..X...'], ['....XX', '..XXXX', 'XX.X.X', '.XXXXX', '...X..']] },                                                          // the scout: small and quick
    { w: 17, v: 0.1, pts: [50], rows: [['......XXX', '....XXX.X', '..XXXXXXX', 'XXXXXXXXX', 'X.XX.XX.X', 'XXXXXXXXX', '..XX...XX'], ['......XXX', '....XXX.X', '..XXXXXXX', 'XXXXXXXXX', 'XX.XX.XX.', 'XXXXXXXXX', '.XX...XX.']] }     // the carrier: big and slow
  ];
  var DIGITS = ['XXXX.XX.XX.XXXX', '.X.XX..X..X.XXX', 'XXX..XXXXX..XXX', 'XXX..XXXX..XXXX', 'X.XX.XXXX..X..X', 'XXXX..XXX..XXXX', 'XXXX..XXXX.XXXX', 'XXX..X..X..X..X', 'XXXX.XXXXX.XXXX', 'XXXX.XXXX..XXXX'];
  // the brand ball: orange through steel to beige (docs/brand.md), as fourteen steps
  var BALL = ['#E4441C', '#E4441C', '#E4462A', '#E4535C', '#D1606F', '#867380', '#4B7888', '#507B89', '#728E93', '#A0AAA0', '#CAC2AA', '#DACCAE', '#DACCAE', '#DACCAE'];

  function mir(h) { return h + h.slice(0, -1).split('').reverse().join(''); }
  function cells(rows) {
    var out = [];
    rows.forEach(function (row, y) { row = mir(row); for (var x = 0; x < row.length; x++) if (row.charAt(x) === 'X') out.push([x, y]); });
    return out;
  }
  var ALIENC = ALIENS.map(function (poses) { return poses.map(cells); });
  var SHIPC = cells(SHIP);
  UFOS.forEach(function (u) { u.c = u.rows.map(cells); u.h = u.rows[0].length; });
  var DIGITC = DIGITS.map(function (d) { var out = []; for (var i = 0; i < 15; i++) if (d.charAt(i) === 'X') out.push([i % 3, Math.floor(i / 3)]); return out; });

  // the mothership: a disc, three feet, and a ball for a dome. HULL = the solid pixels, CORE = the ball's pixels.
  var BW = 33, BH = 17, HULL = [], CORE = [];
  (function () {
    for (var y = 0; y < BH; y++) for (var x = 0; x < BW; x++) {
      var dx = (x - 16) / 16.5, dy = (y - 11) / 3.6, lx = (x - 16) / 7, ly = (y - 7) / 7;
      if (dx * dx + dy * dy <= 1) HULL.push([x, y]);
      else if (lx * lx + ly * ly <= 1 && y < 11) { var rnd = Math.random(); CORE.push([x, y, lx, ly, rnd, rnd]); }
      else if (y === 15 && (x === 8 || x === 16 || x === 24)) HULL.push([x, y]);
    }
  })();
  function ballStep(lx, ly, rnd, t, heat) {     // which of the fourteen colours a ball pixel gets
    var v = 0.5 + 0.36 * (lx - ly) + 0.16 * Math.sin(lx * 3.1 + t * 0.7 + 1.7) * Math.cos(ly * 2.7 - t * 0.5) + (rnd - 0.5) * 0.26 - heat * 0.8;
    return Math.max(0, Math.min(13, Math.round(v * 13)));
  }

  var COLS = WORD.length * 6 - 1, ROWS = 7;
  var plan = [];   // every X of the word is one alien
  WORD.split('').forEach(function (ch, gi) {
    GLYPHS[ch].forEach(function (row, r) { for (var c = 0; c < 5; c++) if (row.charAt(c) === 'X') plan.push({ c: gi * 6 + c, r: r, t: gi % ALIENC.length }); });
  });
  var TOTAL = plan.length;

  // ---- state --------------------------------------------------------------------------------
  var KEY = 'rd-bots-score', MUTE = 'rd-bots-mute';
  var best = 0, muted = false;
  try { best = +localStorage.getItem(KEY) || 0; muted = localStorage.getItem(MUTE) === '1'; } catch (e) {}

  var S = 'idle', phase = 'wave';      // phase: wave | toBoss | boss | toWave
  var W = 0, H = 0, dpr = 1, cell = 0, px = 1, shipPx = 1, bp = 2, fieldL = 0, fieldR = 0, topY = 0;
  var fg = '#F8F5EE', accent = '#E4441C', alienImg = [], shipImg = null, ufoImg = [], hullImg = [], planets = [];
  var bots = [], alive = 0, fx = 0, fy = 0, dir = 1, pose = 0, beatT = 0;
  var ship = { x: 0, y: 0, w: 0, h: 0 }, lives = 3, safe = 0;
  var shots = [], bombs = [], bits = [], pops = [], stars = [], ufo = null, boss = null;
  var keys = { left: false, right: false, fire: false }, held = false, targetX = null;
  var fireT = 0, bombT = 0, diveT = 0, ufoT = 5, gap = 0, time = 0, clock = 0, shake = 0, intro = 0, warp = 0, boilT = 0;
  var score = 0, wave = 1, why = '';
  var in0 = performance.now();      // when the page opened: the opening sequence runs off this
  var tilt = 0, lift = 0, fade = 1, leaveT = 0, leaveTo = '', gone = false, leaveTimer = 0, outT = 0.75;
  var raf = 0, last = 0, lastFrame = 0, ticker = 0, born = performance.now(), navEl = null, dead = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel) { return root.querySelectorAll(sel); }
  function text(sel, v) { for (var l = $(sel), i = 0; i < l.length; i++) if (l[i].textContent !== v) l[i].textContent = v; }
  function flag(name, v) { if (v === false || v == null) root.removeAttribute(name); else root.setAttribute(name, v === true ? '' : v); }
  function setState(s) { S = s; flag('data-bots-state', s); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function pad(n, len) { n = String(n); while (n.length < len) n = '0' + n; return n; }
  function speed() { return 1 + 0.18 * (wave - 1); }      // every wave is a level: all of it gets quicker
  function navOpen() { navEl = navEl || document.querySelector('[data-navigation-status]'); return !!navEl && navEl.getAttribute('data-navigation-status') === 'active'; }

  // ---- sound: a few beeps and a bit of noise, made on the spot ------------------------------
  var AC = null, out = null;
  function audio() {
    if (AC || muted) return;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    AC = new C(); out = AC.createGain(); out.gain.value = 0.11; out.connect(AC.destination);
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function crash(dur, vol) {
    var n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = AC.createBufferSource(), g = AC.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(out); s.start();
  }
  var SFX = {
    start: function () { tone(330, 660, 0.12, 'square', 0.3); tone(660, 1320, 0.16, 'square', 0.3, 0.1); },
    shot: function () { tone(900, 260, 0.09, 'square', 0.2); },
    hit: function () { tone(240, 70, 0.12, 'square', 0.3); crash(0.1, 0.25); },
    step: function () { tone(pose ? 82 : 62, 50, 0.07, 'square', 0.3); },
    dive: function () { tone(700, 180, 0.35, 'triangle', 0.3); },
    ufo: function () { tone(520, 1040, 0.12, 'square', 0.3); tone(780, 1560, 0.14, 'square', 0.3, 0.1); tone(1040, 2080, 0.2, 'square', 0.3, 0.22); },
    hurt: function () { tone(220, 40, 0.5, 'sawtooth', 0.5); crash(0.4, 0.5); },
    thud: function () { tone(160, 90, 0.06, 'square', 0.4); },
    launch: function () { tone(140, 1700, 0.7, 'sawtooth', 0.3); crash(0.6, 0.3); },
    boom: function () { tone(180, 30, 0.9, 'sawtooth', 0.6); crash(0.9, 0.7); tone(110, 1500, 1.5, 'sawtooth', 0.16, 0.8); },     // the blast, then the jump
    clear: function () { [523, 659, 784].forEach(function (f, i) { tone(f, f, 0.1, 'square', 0.3, i * 0.1); }); tone(1047, 1047, 0.25, 'square', 0.3, 0.3); },
    over: function () { tone(392, 392, 0.16, 'square', 0.3); tone(311, 311, 0.16, 'square', 0.3, 0.16); tone(233, 233, 0.4, 'square', 0.3, 0.32); }
  };
  function sfx(k) {
    try { root.dispatchEvent(new CustomEvent('rdbots', { detail: k })); } catch (e) {}     // the moment, for anything that wants to react to it (also with the sound off)
    if (AC && !muted) { try { SFX[k](); } catch (e) {} }
  }
  function sound(on) {
    muted = !on; flag('data-bots-muted', muted);
    try { localStorage.setItem(MUTE, muted ? '1' : '0'); } catch (e) {}
    if (on && S === 'play') { audio(); if (AC && AC.state === 'suspended') AC.resume(); }
  }

  // ---- sizes --------------------------------------------------------------------------------
  function stamp(list, w, h, p, colour) {   // one drawing, drawn once at its real size
    var c = document.createElement('canvas'); c.width = w * p; c.height = h * p;
    var k = c.getContext('2d'); k.fillStyle = colour;
    list.forEach(function (q) { k.fillRect(q[0] * p, q[1] * p, p, p); });
    return c;
  }
  // The sky. Every wave has its own planets, and always the same ones for that wave: wave 1 is home, the rest is further out.
  function seeded(n) {      // the same numbers every time for the same wave
    return function () { n = n + 0x6D2B79F5 | 0; var t = Math.imul(n ^ n >>> 15, 1 | n); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // one planet: r = size, ang = which way its orange side faces, heat = how orange it is, kind 1 = with a ring, 2 = with bands
  function planet(q, rnd) {
    var r = q.r, R = q.kind === 1 ? Math.ceil(r * 1.9) : r, n = R * 2 + 1, c = document.createElement('canvas'), k = c.getContext('2d');
    var ca = Math.cos(q.ang), sa = Math.sin(q.ang);
    c.width = c.height = n * bp; k = c.getContext('2d');
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var lx = (x - R) / r, ly = (y - R) / r, inside = lx * lx + ly * ly <= 1, e = lx * lx / 3.1 + ly * ly / 0.17;
      if (q.kind === 1 && e <= 1 && e >= 0.6 && (ly >= 0 || !inside)) k.fillStyle = BALL[9 + Math.floor(rnd() * 3)];      // the ring: in front below, behind above
      else if (inside) k.fillStyle = BALL[ballStep(lx * ca - ly * sa, lx * sa + ly * ca, rnd(), q.seed, q.heat + (q.kind === 2 ? 0.16 * Math.sin(ly * 7) : 0))];
      else continue;
      k.fillRect(x * bp, y * bp, bp, bp);
    }
    return c;
  }
  function setSky(above) {  // above: the new planets start over the top edge and glide in
    var rnd = seeded(wave * 7919), list = [], n, i, kind;
    if (wave === 1) list = [{ r: 13, ax: 0.05, ay: 0.74, ang: 0, heat: 0, kind: 0, seed: 3 }, { r: 5, ax: 0.9, ay: 0.66, ang: 2.6, heat: -0.1, kind: 0, seed: 9 }];
    else for (n = 1 + Math.floor(rnd() * 3), i = 0; i < n; i++) {
      kind = rnd();
      list.push({ r: 4 + Math.floor(rnd() * 11), ax: (i + wave) % 2 ? rnd() * 0.06 : 0.94 + rnd() * 0.06, ay: 0.12 + (i + rnd() * 0.8) / n * 0.7, ang: rnd() * 6.28, heat: rnd() * 0.6 - 0.3, kind: kind < 0.3 ? 1 : kind < 0.5 ? 2 : 0, seed: rnd() * 50 });
    }
    planets = list.map(function (q) { var ty = Math.round(H * q.ay); return { img: planet(q, rnd), x: Math.round(W * q.ax), ty: ty, y: above ? ty - H * 1.1 : ty }; });
  }

  function layout() {
    var r = root.getBoundingClientRect();
    var had = W > 0, relX = fieldR > fieldL ? (fx - fieldL) / (fieldR - fieldL) : 0, relY = H ? fy / H : 0, relS = W ? ship.x / W : 0.5;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = canvas.width = Math.max(1, Math.round(r.width * dpr));
    H = canvas.height = Math.max(1, Math.round(r.height * dpr));
    topY = Math.round(Math.max(H * 0.17, 112 * dpr));
    var shipTop = H - Math.round(140 * dpr);
    cell = Math.floor(Math.min(W * 0.8 / COLS, H * 0.4 / ROWS, 54 * dpr, (shipTop - topY - 200 * dpr) / ROWS));
    cell = Math.max(AW + 1, cell);
    px = Math.max(1, Math.floor(cell * 0.86 / AW));
    shipPx = Math.max(px + 1, Math.round(2.2 * dpr));
    bp = px * 2;
    var fieldW = Math.min(W, (COLS + 8) * cell);
    fieldL = Math.round((W - fieldW) / 2); fieldR = fieldL + fieldW;
    ship.w = SW * shipPx; ship.h = SH * shipPx; ship.y = H - Math.round(84 * dpr);
    fg = getComputedStyle(root).color; accent = getComputedStyle(canvas).color;
    alienImg = ALIENC.map(function (poses) { return poses.map(function (list) { return stamp(list, AW, AH, px, fg); }); });
    shipImg = stamp(SHIPC, SW, SH, shipPx, fg);
    ufoImg = UFOS.map(function (u) { return u.c.map(function (list) { return stamp(list, u.w, u.h, px, accent); }); });
    hullImg = [stamp(HULL, BW, BH, bp, fg), stamp(HULL, BW, BH, bp, accent)];
    setSky(false);
    root.style.setProperty('--lost-mid', Math.round((topY + ROWS * cell + ship.y - ship.h) / 2 / dpr) + 'px');
    if (S === 'play' && had) {       // keep the round going after a resize or a turned phone
      fx = fieldL + relX * (fieldR - fieldL); fy = relY * H; ship.x = relS * W; shots = []; bombs = []; ufo = null;
      bots.forEach(function (b) { b.dive = null; });
    } else home();
    var n = Math.max(30, Math.min(120, Math.round(W * H / (dpr * dpr) / 8000)));
    stars = [];
    for (var i = 0; i < n; i++) { var z = Math.random(); stars.push({ x: Math.random() * W, y: Math.random() * H, z: z, s: Math.max(1, Math.round(dpr * (0.8 + z * 1.4))), p: Math.random() * 6.28 }); }
  }

  function home() { fx = Math.round((W - COLS * cell) / 2); fy = topY; ship.x = W / 2; }

  function formation() {
    bots = plan.map(function (p) { return { c: p.c, r: p.r, t: p.t, on: true, dive: null }; });
    alive = TOTAL; dir = 1; phase = 'wave'; home();
    fy += Math.min(wave - 1, 4) * Math.round(cell * 0.3);     // and they start a step closer
  }

  function reset() {
    var far = wave !== 1;
    wave = 1; formation(); setSky(far);      // a new game starts at home again
    pose = 0; lives = 3; safe = 0; time = 0; shake = 0; score = 0; gap = 0; why = ''; warp = 0;
    shots = []; bombs = []; bits = []; pops = []; ufo = null; boss = null; targetX = null; held = false;
    keys.left = keys.right = keys.fire = false; tilt = 0; lift = 0; fade = 1;
    flag('data-bots-banner', null); hud();
  }

  function hud() {
    text('[data-bots-score]', pad(score, 4));
    text('[data-bots-best]', pad(best, 4));
    text('[data-bots-wave]', pad(wave, 2));
    text('[data-bots-next]', pad(wave + 1, 2));
    for (var l = $('[data-bots-life]'), i = 0; i < l.length; i++) l[i].classList.toggle('is-off', i >= lives);
  }

  function slotX(b) { return Math.round(fx + b.c * cell + (cell - AW * px) / 2); }
  function slotY(b) { return Math.round(fy + b.r * cell + (cell - AH * px) / 2); }
  function botX(b) { return b.dive ? Math.round(b.dive.x) : slotX(b); }
  function botY(b) { return b.dive ? Math.round(b.dive.y) : slotY(b); }
  function beat() { return (0.08 + 0.42 * Math.pow(alive / TOTAL, 1.2)) / speed(); }   // the fewer are left, the faster they march
  function ufoY() { return Math.round(topY - cell * 1.15); }

  // ---- the round ----------------------------------------------------------------------------
  function start() {
    if (S === 'play') return;
    reset(); setState('play');
    audio(); if (AC && AC.state === 'suspended') AC.resume();
    sfx('start');
    born = -1e6; intro = 1; in0 = -1e9; fireT = 0.25; bombT = 1.4; diveT = 4; ufoT = rand(4, 8); beatT = beat();
    wake();
  }

  function quit() {
    if (S === 'idle') return;
    reset(); setState('idle'); draw();
  }

  function burst(list, x, y, p, power, w, h) {   // a drawing falls apart into its own pixels, in the ball's colours
    var cx = x + w / 2 * p, cy = y + h / 2 * p;
    list.forEach(function (q) {
      var bx = x + q[0] * p, by = y + q[1] * p, a = Math.atan2(by - cy, bx - cx) + rand(-0.5, 0.5), v = rand(0.3, 1) * power;
      bits.push({ x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.3, s: p, t: 0, life: rand(0.35, 0.8), c: pick(BALL) });
    });
  }

  function gain(n, x, y, show) {
    score += n;
    if (show) pops.push({ x: x, y: y, n: n, t: 0 });
    hud();
  }

  function down(b) {
    var x = botX(b), y = botY(b), n = POINTS[b.t] * (b.dive ? 2 : 1);
    burst(ALIENC[b.t][pose], x, y, px, H * 0.32, AW, AH);
    gain(n, x + AW * px / 2, y, !!b.dive);
    b.on = false; b.dive = null; alive -= 1; sfx('hit');
    if (!alive) { phase = 'toBoss'; gap = 1.8; bombs = []; flag('data-bots-banner', 'clear'); sfx('clear'); }   // the 404 is gone: here comes the big one
  }

  function hurt() {
    lives -= 1; safe = 1.6; bombs = []; if (!reduce) shake = 0.3;
    burst(SHIPC, ship.x - ship.w / 2, ship.y - ship.h, shipPx, H * 0.3, SW, SH);
    hud(); sfx('hurt');
    if (lives <= 0) { why = 'shot'; over(); }
  }

  function over() {
    if (score > best) { best = score; try { localStorage.setItem(KEY, String(best)); } catch (e) {} }
    hud(); flag('data-bots-banner', null); setState('over'); sfx('over');
  }

  function nextWave() {
    wave += 1; formation(); setSky(true); flag('data-bots-banner', null); hud();
    born = performance.now(); intro = 0; beatT = beat(); bombT = 1.2; diveT = 3;
  }

  function bossIn() {
    var hp = 30 + 10 * (wave - 1);
    boss = { x: (W - BW * bp) / 2, y: -BH * bp, hp: hp, max: hp, t: 0, flash: 0, fire: 2 };
    phase = 'boss'; flag('data-bots-banner', null);
  }

  function bossHit(sx, sy) {
    boss.hp -= 1; boss.flash = 0.08; gain(10, 0, 0, false);
    bits.push({ x: sx, y: sy, vx: rand(-1, 1) * H * 0.2, vy: -H * 0.25, s: bp, t: 0, life: 0.4, c: pick(BALL) });
    if (boss.hp > 0) return sfx('thud');
    burst(HULL.concat(CORE), boss.x, boss.y, bp, H * 0.5, BW, BH);
    gain(500 * wave, boss.x + BW * bp / 2, boss.y + BH * bp / 2, true);
    if (!reduce) shake = 0.5;
    boss = null; bombs = []; phase = 'toWave'; gap = 2.6; flag('data-bots-banner', 'boss'); sfx('boom');
  }

  function march() {
    var minC = COLS, maxC = -1, maxR = 0;
    bots.forEach(function (b) { if (b.on && !b.dive) { if (b.c < minC) minC = b.c; if (b.c > maxC) maxC = b.c; if (b.r > maxR) maxR = b.r; } });
    pose ^= 1; sfx('step');
    if (maxC < 0) return;                    // everyone left is diving
    var step = Math.max(px, Math.round(cell / 4)), pad = Math.round(cell / 4);
    var left = fx + minC * cell, right = fx + (maxC + 1) * cell;
    if ((dir > 0 && right + step > fieldR - pad) || (dir < 0 && left - step < fieldL + pad)) { fy += Math.round(cell * 0.3); dir = -dir; }
    else fx += dir * step;
    if (fy + (maxR + 1) * cell >= ship.y - ship.h) { lives = 0; why = 'landed'; over(); }   // they reached the fighter
  }

  function lowest() {     // the aliens with a clear view down: one per column
    var low = {};
    bots.forEach(function (b) { if (b.on && !b.dive && (!low[b.c] || b.r > low[b.c].r)) low[b.c] = b; });
    return Object.keys(low).map(function (k) { return low[k]; });
  }

  function bomb(b) {
    if (!b) { var l = lowest(); if (!l.length) return; b = pick(l); }
    bombs.push({ x: botX(b) + AW * px / 2, y: botY(b) + AH * px });
  }

  function dive() {
    var l = lowest();
    if (!l.length || alive < 2) return;
    var b = pick(l);
    b.dive = { x: slotX(b), y: slotY(b), t: 0, back: false, shot: false, side: Math.random() < 0.5 ? -1 : 1 };
    sfx('dive');
  }

  // stars, sparks, the UFOs: these also run before and after a round
  function ambient(dt) {
    var i, s;
    clock += dt;
    if (shake > 0) shake = Math.max(0, shake - dt);
    if (!reduce) {
      // a level is done: the stars stretch and you jump to the next part of the sky. Otherwise they barely drift.
      warp += ((S === 'leave' || S === 'play' && phase === 'toWave' ? 1 : 0) - warp) * Math.min(1, dt * 2.5);
      for (i = 0; i < stars.length; i++) { s = stars[i]; s.y += H * (0.012 + 0.05 * s.z) * (1 + warp * 26) * dt; if (s.y > H) { s.y = -s.s; s.x = Math.random() * W; } }
      for (i = 0; i < planets.length; i++) {
        s = planets[i];
        if (S === 'leave' || S === 'play' && phase === 'toWave') s.y += H * 0.6 * warp * dt;     // left behind
        else s.y += (s.ty - s.y) * Math.min(1, dt * 1.8);                                          // the next sky settles in
      }
      boilT -= dt;
      if (boilT <= 0) { boilT = 0.12; for (i = 0; i < CORE.length; i++) CORE[i][5] = CORE[i][4] * 0.7 + Math.random() * 0.3; }   // the mothership's dome keeps its jitter
    }
    for (i = bits.length - 1; i >= 0; i--) {
      s = bits[i]; s.t += dt;
      if (s.t >= s.life) { bits.splice(i, 1); continue; }
      s.vy += H * 0.9 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    }
    for (i = pops.length - 1; i >= 0; i--) { s = pops[i]; s.t += dt; s.y -= H * 0.05 * dt; if (s.t > 0.9) pops.splice(i, 1); }
    if (S === 'over' || boss || reduce && S !== 'play') { ufo = null; return; }
    if (ufo) {
      ufo.x += ufo.dir * Math.max(W, H) * UFOS[ufo.k].v * dt;
      if (ufo.x < -UFOS[ufo.k].w * px * 2 || ufo.x > W + px) ufo = null;
    } else {
      ufoT -= dt;
      if (ufoT <= 0) { var d = Math.random() < 0.5 ? 1 : -1, k = Math.floor(Math.random() * UFOS.length); ufo = { x: d > 0 ? -UFOS[k].w * px : W, dir: d, k: k }; ufoT = S === 'play' ? rand(7, 13) : rand(5, 10); }
    }
  }

  function update(dt) {
    var i, j, s, b, x, y, u;
    ambient(dt);
    if (S === 'leave') {          // on the way out: the rest fades, the fighter goes up faster and faster
      leaveT += dt; fade = Math.max(0, 1 - leaveT / 0.35); tilt *= 0.8;
      var ls = outT > 1 ? 0.625 : 1, lt = leaveT * ls;      // a longer way out (the screen switches off after it): the launch takes its time too
      lift += H * (0.4 + 5 * lt) * lt * dt * 4 * ls;
      if (leaveT > outT) depart();
      return;
    }
    if (S !== 'play') return;

    time += dt;
    if (safe > 0) safe -= dt;

    // the fighter
    var move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), was = ship.x;
    if (move) { ship.x += move * (fieldR - fieldL) / 1.5 * dt; targetX = null; }
    else if (targetX != null) ship.x += (targetX - ship.x) * Math.min(1, dt * 16);
    ship.x = Math.max(fieldL + ship.w / 2, Math.min(fieldR - ship.w / 2, ship.x));
    // it banks into the move: -1 full left, 1 full right
    var lean = reduce || dt <= 0 ? 0 : Math.max(-1, Math.min(1, (ship.x - was) / dt / ((fieldR - fieldL) / 1.5)));
    tilt += (lean - tilt) * Math.min(1, dt * 9);

    fireT -= dt;
    if ((keys.fire || held) && fireT <= 0 && shots.length < 6) {     // both cannons at once
      shots.push({ x: ship.x - 4 * shipPx, y: ship.y - ship.h }, { x: ship.x + 4 * shipPx, y: ship.y - ship.h });
      fireT = 0.3; sfx('shot');
    }

    // its shots
    var sw = Math.max(1, Math.round(shipPx * 0.8));
    for (i = shots.length - 1; i >= 0; i--) {
      s = shots[i]; s.y -= H * 1.15 * dt;
      if (s.y < -4 * sw) { shots.splice(i, 1); continue; }
      if (boss && s.x >= boss.x && s.x <= boss.x + BW * bp && s.y <= boss.y + (BH - 2) * bp && s.y + 3 * sw >= boss.y) { shots.splice(i, 1); bossHit(s.x, s.y); continue; }
      u = ufo && UFOS[ufo.k];
      if (u && s.x >= ufo.x - px && s.x <= ufo.x + (u.w + 1) * px && s.y <= ufoY() + u.h * px && s.y + 3 * sw >= ufoY()) {
        burst(u.c[0], ufo.x, ufoY(), px, H * 0.36, u.w, u.h);
        gain(pick(u.pts), ufo.x + u.w * px / 2, ufoY(), true); sfx('ufo');
        ufo = null; shots.splice(i, 1); continue;
      }
      for (j = 0; j < bots.length; j++) {
        b = bots[j];
        if (!b.on) continue;
        x = botX(b); y = botY(b);
        if (s.x + sw / 2 >= x - px && s.x - sw / 2 <= x + (AW + 1) * px && s.y <= y + AH * px && s.y + 3 * sw >= y) { shots.splice(i, 1); down(b); break; }
      }
    }

    // a breath between the 404, the mothership and the next wave
    if (gap > 0) { gap -= dt; if (gap <= 0) { if (phase === 'toBoss') bossIn(); else nextWave(); } return; }

    // the mothership: glides in, sways, drops three at a time
    if (boss) {
      var bw = BW * bp;
      boss.t += dt; if (boss.flash > 0) boss.flash -= dt;
      boss.y += (topY - boss.y) * Math.min(1, dt * 2.2);
      boss.x = W / 2 - bw / 2 + Math.sin(boss.t * (0.8 + 0.12 * Math.min(wave - 1, 5))) * Math.max(0, (fieldR - fieldL - bw) / 2 - cell / 4);
      boss.fire -= dt;
      if (boss.fire <= 0) { var fan = wave > 1 ? 2 : 1; for (i = -fan; i <= fan; i++) bombs.push({ x: boss.x + bw / 2 + i * bw * 0.36 / fan, y: boss.y + (BH - 1) * bp }); boss.fire = 1.5 / speed(); }   // three at a time, five from wave 2
    }

    // what they drop
    bombT -= dt;
    if (bombT <= 0) { if (alive && bombs.length < 2 + Math.min(wave, 4)) bomb(); bombT = (0.5 + rand(0, 1) * (0.5 + 0.5 * alive / TOTAL)) / speed(); }
    for (i = bombs.length - 1; i >= 0; i--) {
      s = bombs[i]; s.y += H * 0.36 * Math.min(1.6, 1 + 0.08 * (wave - 1)) * dt;
      if (s.y > H) { bombs.splice(i, 1); continue; }
      if (safe <= 0 && Math.abs(s.x - ship.x) < ship.w * 0.38 && s.y + 3 * px >= ship.y - ship.h * 0.7 && s.y <= ship.y) { hurt(); break; }
    }
    if (S !== 'play' || boss) return;

    // the ones that leave the formation and come for you
    diveT -= dt;
    if (diveT <= 0) { for (i = Math.min(3, 1 + (wave >> 1)); i > 0; i--) dive(); diveT = rand(2.6, 5.5) / speed(); }   // later waves: two, then three at a time
    for (j = 0; j < bots.length; j++) {
      b = bots[j];
      if (!b.on || !b.dive) continue;
      var d = b.dive; d.t += dt;
      if (!d.back) {
        d.y += H * 0.3 * speed() * dt;
        d.x += ((ship.x - AW * px / 2) - d.x) * 0.9 * dt + Math.cos(d.t * 4.2) * d.side * cell * 3.4 * dt;
        if (!d.shot && d.y > fy + (ROWS + 1.5) * cell) { d.shot = true; bomb(b); }
        if (d.y > H) { d.y = -AH * px; d.x = slotX(b); d.back = true; }
        else if (safe <= 0 && Math.abs(d.x + AW * px / 2 - ship.x) < (AW * px + ship.w) * 0.34 && d.y + AH * px > ship.y - ship.h * 0.75 && d.y < ship.y) { down(b); hurt(); if (S !== 'play') return; }
      } else {
        var tx = slotX(b), ty = slotY(b), dx = tx - d.x, dy = ty - d.y, dist = Math.sqrt(dx * dx + dy * dy), go = H * 0.55 * dt;
        if (dist <= go) b.dive = null; else { d.x += dx / dist * go; d.y += dy / dist * go; }
      }
    }
    if (gap > 0) return;

    beatT -= dt;
    while (beatT <= 0 && S === 'play') { march(); beatT += beat(); }
  }

  function number(n, cx, y, p) {    // a small pixel number, centred on cx
    var str = String(n), w = (str.length * 4 - 1) * p, x0 = Math.round(cx - w / 2);
    for (var i = 0; i < str.length; i++) DIGITC[+str.charAt(i)].forEach(function (q) { ctx.fillRect(x0 + (i * 4 + q[0]) * p, Math.round(y) + q[1] * p, p, p); });
  }

  function draw() {
    var i, b, s, q;
    if (intro < 1) intro = Math.max(0, Math.min(1, (performance.now() - born) / 900));   // on the real clock: a slow or sleeping tab still ends up with all 48
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (shake > 0) ctx.translate(Math.round(rand(-2, 2) * px), Math.round(rand(-2, 2) * px));

    // The opening: the sky fades in, the aliens follow column by column, the fighter rises from below
    var ip = (performance.now() - in0) / 1000, sky = Math.max(0, Math.min(1, ip / 0.8)), up = Math.max(0, Math.min(1, (ip - 0.45) / 1.1));
    var rise = ip < 1.6 ? Math.round(Math.pow(1 - up, 3) * (H - ship.y + ship.h * 2)) : 0;
    ctx.globalAlpha = 0.5 * sky;
    for (i = 0; i < planets.length; i++) { s = planets[i]; ctx.drawImage(s.img, Math.round(s.x - s.img.width / 2), Math.round(s.y - s.img.height / 2)); }
    ctx.fillStyle = fg;
    for (i = 0; i < stars.length; i++) {     // each one twinkles at its own pace
      s = stars[i]; ctx.globalAlpha = sky * (0.12 + 0.45 * s.z) * (reduce ? 1 : 0.7 + 0.3 * Math.sin(clock * (1 + s.z * 2.5) + s.p));
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, Math.round(s.s * (1 + warp * 14 * (0.3 + s.z))));
    }
    ctx.globalAlpha = 1;

    ctx.globalAlpha = fade;
    if (ufo) ctx.drawImage(ufoImg[ufo.k][Math.floor(clock * 8) % 2], Math.round(ufo.x), ufoY());

    if (boss) {
      var bx = Math.round(boss.x), by = Math.round(boss.y), heat = 1 - boss.hp / boss.max;
      for (i = 0; i < CORE.length; i++) { q = CORE[i]; ctx.fillStyle = BALL[ballStep(q[2], q[3], q[5], clock, heat)]; ctx.fillRect(bx + q[0] * bp, by + q[1] * bp, bp, bp); }   // the ball heats up as it is hit
      ctx.drawImage(hullImg[boss.flash > 0 ? 1 : 0], bx, by);
      ctx.fillStyle = accent;
      for (i = 2; i < BW - 2; i++) if ((i + Math.floor(clock * 7)) % 4 === 0) ctx.fillRect(bx + i * bp, by + 11 * bp, bp, bp);                                       // running lights
      ctx.fillRect(bx, by + (BH + 1) * bp, Math.round(BW * bp * boss.hp / boss.max), Math.max(1, bp >> 1));                                                         // what it has left
    }

    for (i = 0; i < bots.length; i++) {
      b = bots[i];
      if (!b.on) continue;
      var seen = Math.min(1, (intro * (COLS + 5) - b.c) / 5);       // they fade in column by column
      if (seen <= 0) continue;
      ctx.globalAlpha = fade * seen;
      ctx.drawImage(alienImg[b.t][b.dive ? Math.floor(b.dive.t * 9) % 2 : pose], botX(b), botY(b));
    }

    ctx.globalAlpha = 1;
    if ((S !== 'over' || lift) && !(safe > 0 && Math.floor(safe * 10) % 2)) {
      // The fighter, drawn as two halves: the wing on the side it moves to gets shorter, so it banks without losing its pixels
      var a = Math.abs(tilt), near = 1 - 0.07 * a, far = 1 - 0.34 * a, sl = tilt < 0 ? far : near, sr = tilt < 0 ? near : far;
      var cx = Math.round(ship.x), sy = Math.round(ship.y - ship.h - lift) + rise, half = ship.w / 2;
      var wl = Math.round(half * sl), wr = Math.round(half * sr);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(shipImg, 0, 0, half, ship.h, cx - wl, sy, wl, ship.h);
      ctx.drawImage(shipImg, half, 0, half, ship.h, cx, sy, wr, ship.h);
      ctx.fillStyle = accent;                            // the engines: longer when it launches
      var f = reduce ? 1 : 1 + Math.floor(clock * 14) % 2, f2 = reduce ? 1 : 1 + Math.floor(clock * 14 + 1) % 2, boost = S === 'leave' ? 4 : rise > shipPx ? 2 : 0;
      ctx.fillRect(cx - Math.round(1.5 * shipPx * sl), sy + ship.h, Math.max(1, Math.round(shipPx * sl)), (f + boost) * shipPx);
      ctx.fillRect(cx + Math.round(0.5 * shipPx * sr), sy + ship.h, Math.max(1, Math.round(shipPx * sr)), (f2 + boost) * shipPx);
    }

    var sw = Math.max(1, Math.round(shipPx * 0.8));
    ctx.fillStyle = fg;
    for (i = 0; i < shots.length; i++) { s = shots[i]; ctx.fillRect(Math.round(s.x - sw / 2), Math.round(s.y), sw, 3 * sw); }
    ctx.fillStyle = accent; ctx.globalAlpha = fade;
    for (i = 0; i < bombs.length; i++) { s = bombs[i]; ctx.fillRect(Math.round(s.x - px / 2), Math.round(s.y), px, 3 * px); }
    for (i = 0; i < bits.length; i++) { s = bits[i]; ctx.globalAlpha = (1 - s.t / s.life) * fade; ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s); }
    ctx.fillStyle = accent;
    for (i = 0; i < pops.length; i++) { s = pops[i]; ctx.globalAlpha = Math.min(1, (0.9 - s.t) * 4); number(s.n, s.x, s.y - 6 * px, Math.max(1, Math.round(px * 0.75))); }
    ctx.globalAlpha = 1;
  }

  // ---- the clock ----------------------------------------------------------------------------
  function loop(now) {
    raf = 0;
    if (dead) return;
    var dt = Math.min((now - last) / 1000, 1 / 30); last = now; lastFrame = now;
    if (!navOpen()) update(dt);          // the menu is open: everything waits
    draw();
    wake();
  }
  function wake() { if (!raf && !dead && !document.hidden) { if (!last || performance.now() - last > 200) last = performance.now(); raf = requestAnimationFrame(loop); } }

  // ---- input --------------------------------------------------------------------------------
  var offs = [];
  function on(el, type, fn, opt) { el.addEventListener(type, fn, opt); offs.push(function () { el.removeEventListener(type, fn, opt); }); }
  function pointX(ev) { var r = canvas.getBoundingClientRect(); return (ev.clientX - r.left) * (W / (r.width || 1)); }
  function typing(el) { return el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName); }
  var CTL = '[data-bots-start], [data-bots-quit], [data-bots-sound]';
  function press(el) {
    if (el.hasAttribute('data-bots-quit')) quit();
    else if (el.hasAttribute('data-bots-sound')) sound(muted);
    else start();
  }

  on(window, 'keydown', function (ev) {
    if (typing(ev.target) || ev.metaKey || ev.ctrlKey || ev.altKey || navOpen()) return;
    var k = ev.key;
    if (k === 'Enter') {                       // a control that is not a real button (a div in Webflow)
      var ctl = ev.target.closest && ev.target.closest(CTL);
      if (ctl && !/^(A|BUTTON)$/.test(ctl.tagName)) { ev.preventDefault(); press(ctl); }
      return;
    }
    if (k === 'm' || k === 'M') return sound(muted);
    if (S !== 'play') {
      if (k === ' ' || k === 'Spacebar') { if (ev.target && ev.target.closest && ev.target.closest('a')) return; ev.preventDefault(); start(); }
      return;
    }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; ev.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; ev.preventDefault(); }
    else if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp') { keys.fire = true; ev.preventDefault(); }
    else if (k === 'Escape') quit();
  });
  on(window, 'keyup', function (ev) {
    var k = ev.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    else if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp') keys.fire = false;
  });
  on(window, 'blur', function () { keys.left = keys.right = keys.fire = false; held = false; });

  on(root, 'pointerdown', function (ev) {
    if (ev.target.closest('a, button, ' + CTL)) return;     // links and buttons do their own thing
    if (S === 'idle') { ev.preventDefault(); start(); targetX = pointX(ev); held = ev.pointerType !== 'mouse'; return; }
    if (S !== 'play') return;
    ev.preventDefault(); held = true; targetX = pointX(ev);
  });
  on(root, 'pointermove', function (ev) { if (S === 'play' && (ev.pointerType === 'mouse' || held)) targetX = pointX(ev); });
  on(window, 'pointerup', function () { held = false; });
  on(window, 'pointercancel', function () { held = false; });
  on(root, 'click', function (ev) { var ctl = ev.target.closest(CTL); if (ctl) { ev.preventDefault(); press(ctl); } });
  on(document, 'visibilitychange', function () { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else wake(); });
  on(window, 'resize', function () { layout(); draw(); });

  // ---- leaving by a link: fade, launch, then hand over to the site's page transition -------------
  function depart() {
    if (gone) return;
    gone = true; clearTimeout(leaveTimer);
    if (window.barba && typeof barba.go === 'function') barba.go(leaveTo); else location.href = leaveTo;
  }
  function leave(href) {
    leaveTo = href; leaveT = 0; gone = false; shots = []; held = false; keys.left = keys.right = keys.fire = false;
    outT = +root.getAttribute('data-bots-out') || 0.75;      // seconds until the page transition takes over (screen.js asks for more)
    flag('data-bots-banner', null); setState('leave'); sfx('launch');
    leaveTimer = setTimeout(depart, outT * 1000 + 450);          // a sleeping tab still gets where it was going
    if (window.barba && barba.prefetch) { try { barba.prefetch(href); } catch (e) {} }     // the next page loads while the fighter launches
    wake();
  }
  on(document, 'click', function (ev) {
    if (S === 'leave') { if (!gone) { ev.preventDefault(); ev.stopPropagation(); } return; }       // already on the way
    if (reduce || ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || navOpen()) return;
    var a = ev.target.closest && ev.target.closest('a[href]'), url;
    if (!a || !root.isConnected || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('hreflang')) return;
    try { url = new URL(a.href, location.href); } catch (e) { return; }
    if (url.origin !== location.origin || url.pathname === location.pathname && url.search === location.search) return;   // another site, or a link on this page (the menu button)
    ev.preventDefault(); ev.stopPropagation();
    leave(url.href);
  }, true);
  on(window, 'pageshow', function (ev) { if (ev.persisted && S === 'leave') { gone = false; reset(); setState('idle'); draw(); wake(); } });   // back from the browser's page cache

  // stop everything: called when the page leaves (and by itself, once the section is gone from the document)
  function kill() { dead = true; offs.forEach(function (f) { f(); }); clearInterval(ticker); if (raf) cancelAnimationFrame(raf); raf = 0; if (AC) { try { AC.close(); } catch (e) {} } root.rdBots = false; }
  root.rdBotsKill = kill;

  flag('data-bots-muted', muted);
  layout(); reset();
  intro = reduce ? 1 : 0;
  if (reduce) { born = -1e6; in0 = -1e9; } else { born = performance.now() + 250; ufoT = 0.9; }     // the aliens a beat after the sky, and a UFO straight away
  // a slow heartbeat: the aliens shuffle while nobody plays, and the picture stays right in a tab that gets no frames
  ticker = setInterval(function () {
    if (!document.documentElement.contains(root)) return kill();
    if (document.hidden) return;
    if (S !== 'play') pose ^= 1;
    if (performance.now() - lastFrame > 400) draw();
    wake();
  }, 520);
  draw(); wake();

  if (/[?&]botsdebug=1/.test(location.search)) {
    window.rdBotsDebug = {
      get: function () { return { state: S, phase: phase, planets: planets.map(function (p) { return [p.x, Math.round(p.y), p.ty, p.img.width]; }), tilt: tilt, lift: lift, fade: fade, gone: gone, warp: warp, fy: fy, topY: topY, why: why, alive: alive, lives: lives, score: score, wave: wave, gap: gap, time: time, ship: { x: ship.x, y: ship.y, w: ship.w, h: ship.h }, shots: shots.length, bombs: bombs.length, bits: bits.length, divers: bots.filter(function (b) { return b.on && b.dive; }).length, ufo: ufo ? { x: ufo.x, y: ufoY(), k: ufo.k, w: UFOS[ufo.k].w } : null, boss: boss ? { x: boss.x, y: boss.y, hp: boss.hp, w: BW * bp } : null, W: W, H: H, dpr: dpr, cell: cell, px: px, shipPx: shipPx, field: [fieldL, fieldR], best: best, muted: muted, audio: AC ? AC.state : null }; },
      bots: function () { return bots.filter(function (b) { return b.on; }).map(function (b) { return { x: botX(b), y: botY(b), c: b.c, r: b.r, dive: !!b.dive }; }); },
      bombs: function () { return bombs.map(function (b) { return { x: b.x, y: b.y }; }); },
      keys: keys, start: start, quit: quit, step: update, draw: draw, dive: dive,
      clear: function () { bots.forEach(function (b) { if (b.on) down(b); }); },
      ufo: function (k) { ufoT = 0; ufo = null; if (k != null) { ufo = { x: W * 0.3, dir: 1, k: k }; } }, aim: function (x) { targetX = x; }, hold: function (v) { held = v; },
      show: function () { born = -1e6; intro = 1; in0 = -1e9; },
      open: function (sec) { in0 = performance.now() - sec * 1000; born = in0 + 250; intro = 0; }
    };
  }
}
