// rdBotsScreen: the 404 game on an arcade tube.
// The game (bots.js) keeps drawing on its own canvas. This file hides that canvas and shows two of its own:
//   the picture  under the text: the game, on curved glass, a little soft, with red and blue edges (WebGL2)
//   the glass    over everything in the section, text too: scanlines, phosphor stripes, the round edge of the tube
// It listens to the game's 'rdbots' events (hit, hurt, boom ...) for the moments: a short freeze on a kill,
// a glitch and a negative flash when you are hit, a punch on big hits, a surge on the jump to the next wave.
// The page opens like a TV switching on. Leaving by a link: the fighter flies out, the TV goes out, then the site's page transition.
//
// The mix is one line, the same line the lab (prototype/404/arcade) copies. To change it without a new release,
// put another line in data-bots-screen on the section; data-bots-screen="off" leaves the game as it was.
// Words this file knows (0 to 100, a word alone = on): curve, scan, line, mask, bezel, fringe, soft, hitstop, glitch, negative, punch, surge, power.
// Without WebGL2, or when the frame rate drops too far, it steps aside and the plain game shows.
function rdBotsScreen(root) {
  root = root || document.querySelector('[data-bots]');
  if (!root || root.rdBotsScreen) return;
  var src = root.querySelector('[data-bots-canvas]');
  var MIX = 'curve 37, scan 61, line 34, mask 24, bezel, fringe 31, soft 35, hitstop 40, glitch 60, negative, punch 100, surge 60, power';
  var line = root.getAttribute('data-bots-screen') || MIX;
  if (!src || /^\s*off\s*$/i.test(line)) return;

  var P = { curve: 0, scan: 0, line: 0, mask: 0, bezel: 0, fringe: 0, soft: 0, hitstop: 0, glitch: 0, negative: 0, punch: 0, surge: 0, power: 0 };
  line.replace(/^[^:]*:/, '').split(',').forEach(function (part) {
    var m = /([a-z]+)\s*(\d+)?/i.exec(part);
    if (m && m[1] in P) P[m[1]] = m[2] == null ? 1 : Math.min(100, +m[2]) / 100;
  });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;      // a phone: no cabinet, the screen is small enough
  if (reduce) P.hitstop = P.glitch = P.negative = P.punch = P.surge = P.power = 0;

  var pic = document.createElement('canvas'), glass = document.createElement('canvas');
  var gl = pic.getContext('webgl2', { alpha: false, antialias: false });
  var g2 = glass.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl || !g2) return;

  var VS = '#version 300 es\nout vec2 vUv; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }';
  var FS_PIC = '#version 300 es\nprecision highp float;\n' +
    'uniform sampler2D uTex; uniform vec3 uBg;\n' +
    'uniform float uTime, uCurve, uFringe, uSoft, uWobble, uTear, uNeg, uZoom, uOpen, uDim;\n' +
    'in vec2 vUv; out vec4 o;\n' +
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
    'vec4 tap(vec2 uv){ vec2 k = step(vec2(0.), uv) * step(uv, vec2(1.)); return textureLod(uTex, uv, uSoft * 2.2) * k.x * k.y * uDim; }\n' +
    'void main(){\n' +
    '  vec2 c = vUv * 2. - 1.; c *= 1. - uZoom; c *= (1. + uCurve * dot(c, c)) / (1. + uCurve); c.y /= max(uOpen, .004);\n' +
    '  vec2 uv = c * .5 + .5;\n' +
    '  uv.x += uWobble * (sin(uv.y * 17. + uTime * 2.3) * .0022 + sin(uv.y * 63. - uTime * 6.1) * .0009);\n' +
    '  vec2 row = vec2(floor(uv.y * 34.), floor(uTime * 22.));\n' +
    '  uv.x += uTear * step(.6, hash(row)) * (hash(row + 3.7) - .5) * .09;\n' +
    '  vec2 d = uv - .5;\n' +
    '  vec2 off = d * (uFringe * .011 * (.25 + dot(d, d) * 4.)) + vec2(uFringe * .0011 + uTear * .004, 0.);\n' +
    '  vec4 sr = tap(uv + off), sg = tap(uv), sb = tap(uv - off);\n' +
    '  vec3 col = vec3(uBg.r * (1. - sr.a) + sr.r, uBg.g * (1. - sg.a) + sg.g, uBg.b * (1. - sb.a) + sb.b);\n' +
    '  col *= 1. + (1. - uOpen) * 3.;\n' +
    '  col = mix(col, 1. - col, uNeg);\n' +
    '  vec2 k = step(vec2(0.), uv) * step(uv, vec2(1.));\n' +
    '  o = vec4(clamp(col, 0., 1.) * k.x * k.y, 1.);\n' +
    '}';
  var FS_GLASS = '#version 300 es\nprecision highp float;\n' +
    'uniform vec2 uRes; uniform float uCurve, uScan, uLine, uMask, uOpen, uOpenX, uRound;\n' +
    'out vec4 o;\n' +
    'void main(){\n' +
    '  vec2 c0 = gl_FragCoord.xy / uRes * 2. - 1., c = c0 * (1. + uCurve * dot(c0, c0)) / (1. + uCurve), b = c * .5 + .5;\n' +
    '  vec3 m = vec3(1.);\n' +
    '  m *= 1. - uScan * .7 * (.5 + .5 * cos(b.y * uRes.y / uLine * 6.2831853));\n' +
    '  float sw = max(1., floor(uLine / 3. + .5)), tri = mod(floor(b.x * uRes.x / sw), 3.);\n' +
    '  m *= mix(vec3(1.), mix(vec3(.5), vec3(1.), vec3(float(tri < .5), float(tri > .5 && tri < 1.5), float(tri > 1.5))), uMask);\n' +
    '  if (uRound > 0.){ vec2 q = abs(c) - (1. - uRound); m *= 1. - smoothstep(-.012, 0., length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRound); }\n' +
    '  if (uOpen < .999) m *= 1. - smoothstep(.5 * uOpen, .5 * uOpen + .004, abs(b.y - .5));\n' +
    '  if (uOpenX < .999) m *= 1. - smoothstep(.5 * uOpenX, .5 * uOpenX + .004, abs(b.x - .5) + .004 * (1. - uOpenX));\n' +
    '  o = vec4(m, 1.);\n' +
    '}';

  function program(g, fs) {
    var p = g.createProgram(), u = {};
    [[g.VERTEX_SHADER, VS], [g.FRAGMENT_SHADER, fs]].forEach(function (s) {
      var sh = g.createShader(s[0]); g.shaderSource(sh, s[1]); g.compileShader(sh);
      if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(sh));
      g.attachShader(p, sh);
    });
    g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
    g.useProgram(p);
    return function (name, a, b, c) {
      var l = name in u ? u[name] : (u[name] = g.getUniformLocation(p, name));
      if (b == null) g.uniform1f(l, a); else if (c == null) g.uniform2f(l, a, b); else g.uniform3f(l, a, b, c);
    };
  }
  var set, setG;
  try { set = program(gl, FS_PIC); setG = program(g2, FS_GLASS); } catch (e) { return; }

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  var layer = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  pic.style.cssText = layer; glass.style.cssText = layer + 'z-index:6;pointer-events:none;mix-blend-mode:multiply;';
  pic.setAttribute('aria-hidden', 'true'); glass.setAttribute('aria-hidden', 'true');
  src.parentNode.insertBefore(pic, src.nextSibling); root.appendChild(glass);
  src.style.visibility = 'hidden';
  root.rdBotsScreen = true;
  root.setAttribute('data-fx', '');
  if (P.bezel && !small) root.setAttribute('data-fx-frame', '');
  var OUT = 1.3, OFF_AT = 800, OFF = 0.45;      // leaving: the fighter gets 0.8 s to fly out, the TV 0.45 s to go out, then the page transition
  if (P.power) root.setAttribute('data-bots-out', OUT);
  if (root.rdBots) window.dispatchEvent(new Event('resize'));      // the game was already laid out: the cabinet changed its room

  var doc = document.documentElement, k = P.curve * .22;
  var dead = false, raf = 0, last = 0, t0 = performance.now(), bg = [.075, .075, .075], safeWas = '';
  var env = { tear: 0, neg: 0, zoom: 0, surge: 0 }, hold = 0, dim = 1, open = P.power ? 0 : 1, leaveAt = 0, wasState = '', slow = 0, slowN = 0;

  function size() {
    if (pic.width !== src.width || pic.height !== src.height) {
      pic.width = src.width; pic.height = src.height;
      var m = /(\d+)[, ]+(\d+)[, ]+(\d+)/.exec(getComputedStyle(root).backgroundColor); if (m) bg = [m[1] / 255, m[2] / 255, m[3] / 255];
    }
    var w = root.clientWidth || 1, h = root.clientHeight || 1, d = Math.min(window.devicePixelRatio || 1, 2);
    if (glass.width !== Math.round(w * d) || glass.height !== Math.round(h * d)) { glass.width = Math.round(w * d); glass.height = Math.round(h * d); }
    // a curved screen has no corners: what sits in them moves in (the score bar inside the section, the site's logo and menu button outside it)
    var r = root.getBoundingClientRect(), safe = Math.round(Math.min(w, h) * .5 * k / (1 + k)), key = safe + ' ' + Math.round(r.left) + ' ' + Math.round(r.top);
    if (key !== safeWas) {
      safeWas = key;
      root.style.setProperty('--fx-safe', safe + 'px');
      doc.style.setProperty('--bots-safe-x', Math.round(r.left + safe) + 'px'); doc.style.setProperty('--bots-safe-y', Math.round(r.top + safe * .6) + 'px');
    }
    return d;
  }

  function stop(ms) { if (ms > 0) hold = Math.max(hold, performance.now() + ms); }
  function up(key, v) { env[key] = Math.max(env[key], v); }
  var MOMENT = {
    hit: function () { stop(P.hitstop * 70); },
    ufo: function () { stop(P.hitstop * 90); up('zoom', P.punch * .012); },
    clear: function () { up('zoom', P.punch * .015); },
    hurt: function () { stop(P.hitstop * 140); up('tear', P.glitch); if (P.negative) env.neg = 1; up('zoom', P.punch * .02); },
    boom: function () { stop(P.hitstop * 220); up('tear', P.glitch * .7); up('zoom', P.punch * .05); }
  };
  function heard(ev) { if (MOMENT[ev.detail]) MOMENT[ev.detail](); }
  root.addEventListener('rdbots', heard);
  function ease(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }

  function frame(now) {
    raf = 0;
    if (dead) return;
    if (!doc.contains(root)) return kill();
    var gap = now - last, dt = Math.min(gap / 1000, .05); last = now;
    // too heavy for this device: step aside, the plain game takes over
    if (now - t0 > 2500 && gap < 250) { slow += gap; slowN += 1; if (slowN >= 120) { if (slow / slowN > 1000 / 24) return kill(); slow = slowN = 0; } }
    var d = size(), state = root.getAttribute('data-bots-state'), t = (now - t0) / 1000;
    if (state !== wasState) { if (state === 'leave') leaveAt = now; wasState = state; }

    env.tear = Math.max(0, env.tear - dt * 2.2); env.neg = Math.max(0, env.neg - dt * 11); env.zoom += (0 - env.zoom) * Math.min(1, dt * 9);
    var jump = root.getAttribute('data-bots-banner') === 'boss' || state === 'leave';      // the jump to the next sky, and the launch
    env.surge += ((jump ? P.surge : 0) - env.surge) * Math.min(1, dt * 3);
    dim += ((state === 'over' ? .2 : 1) - dim) * Math.min(1, dt * 6);
    // on: the picture unfolds from a line. off: it folds to a line, then the line to a dot.
    var off = state === 'leave' && P.power && now - leaveAt > OFF_AT, oy, ox = 1;
    if (off) { open = Math.max(0, open - dt / OFF); oy = ease((open - .3) / .7); ox = ease(open / .3); }
    else { open = Math.min(1, open + dt / .5); oy = ease(open); }

    gl.viewport(0, 0, pic.width, pic.height);
    if (now >= hold && src.width && src.height) {      // a freeze on a hit = the tube holds its last picture for a moment
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
    }
    set('uBg', bg[0], bg[1], bg[2]); set('uTime', t % 600); set('uCurve', k); set('uSoft', P.soft); set('uDim', dim);
    set('uFringe', P.fringe + env.surge * 1.6 + env.tear * .8); set('uWobble', env.surge * .4); set('uTear', env.tear);
    set('uNeg', Math.min(1, env.neg)); set('uZoom', env.zoom + env.surge * .035); set('uOpen', oy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    g2.viewport(0, 0, glass.width, glass.height);
    setG('uRes', glass.width, glass.height); setG('uCurve', k); setG('uScan', P.scan); setG('uLine', Math.round((2 + P.line * 4) * d)); setG('uMask', P.mask);
    setG('uOpen', oy); setG('uOpenX', ox); setG('uRound', k > 0 ? .02 + k * .5 : 0);
    g2.drawArrays(g2.TRIANGLES, 0, 3);
    wake();
  }
  function wake() { if (!raf && !dead && !document.hidden) { if (!last || performance.now() - last > 200) last = performance.now(); raf = requestAnimationFrame(frame); } }
  function seen() { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else wake(); }
  document.addEventListener('visibilitychange', seen);

  // stop everything and give the graphics memory back: when the page leaves, or when it is too heavy
  function kill() {
    if (dead) return;
    dead = true; if (raf) cancelAnimationFrame(raf); raf = 0;
    document.removeEventListener('visibilitychange', seen); root.removeEventListener('rdbots', heard);
    [gl, g2].forEach(function (g) { var x = g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); });
    pic.remove(); glass.remove(); src.style.visibility = '';
    ['data-fx', 'data-fx-frame', 'data-bots-out'].forEach(function (a) { root.removeAttribute(a); });
    root.style.removeProperty('--fx-safe'); doc.style.removeProperty('--bots-safe-x'); doc.style.removeProperty('--bots-safe-y');
    root.rdBotsScreen = false;
    if (doc.contains(root)) window.dispatchEvent(new Event('resize'));
  }
  root.rdBotsScreenKill = kill;
  size(); wake();
}
