// rdBotsFx: an arcade screen around the 404 game (lab).
// The game keeps drawing on its own canvas. This file hides that canvas and shows two of its own instead:
//   .fx_picture  under the text: the game's picture, bent, glowing, fringed, with trails (WebGL2)
//   .fx_glass    over everything, text too: scanlines, phosphor stripes, dark corners, the round tube edge (multiplied on top)
// The game says what happens through 'rdbots' events on the section (hit, hurt, boom ...): the screen reacts to those.
// Every setting is a number from 0 to 1, 0 = off. Nothing here changes how the game plays.
//
//   var fx = rdBotsFx(section);   fx.set({ curve: .4, scan: .3 });   fx.enable(false);   fx.react('hit');
function rdBotsFx(root) {
  root = root || document.querySelector('[data-bots]');
  var src = root && root.querySelector('[data-bots-canvas]');
  if (!src) return null;
  var pic = document.createElement('canvas'), glass = document.createElement('canvas');
  var gl = pic.getContext('webgl2', { alpha: false, antialias: false });
  var g2 = glass.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl || !g2) return null;
  pic.className = 'fx_picture'; glass.className = 'fx_glass';
  pic.setAttribute('aria-hidden', 'true'); glass.setAttribute('aria-hidden', 'true');
  src.parentNode.insertBefore(pic, src.nextSibling); root.appendChild(glass);

  var VS = '#version 300 es\nout vec2 vUv; void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2. - 1., 0., 1.); }';

  // 1. what the tube remembers: the new frame, or what is left of the old one (light trails)
  var FS_KEEP = '#version 300 es\nprecision highp float;\n' +
    'uniform sampler2D uSrc, uPrev; uniform float uDecay, uDim; in vec2 vUv; out vec4 o;\n' +
    'void main(){ vec4 c = texture(uSrc, vUv) * uDim; vec4 p = max(texture(uPrev, vUv) * uDecay - 1.5 / 255., 0.); o = max(c, p); }';

  // 2. the picture
  var FS_PIC = '#version 300 es\nprecision highp float;\n' +
    'uniform sampler2D uTex; uniform vec2 uRes; uniform float uTime; uniform vec3 uBg;\n' +
    'uniform float uCurve, uFringe, uGlow, uGlowSize, uSoft, uGrain, uWobble, uTear, uFlash, uNeg, uZoom, uSwirl, uDither, uDot, uOpen;\n' +
    'in vec2 vUv; out vec4 o;\n' +
    'const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);\n' +
    'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
    'vec2 bend(vec2 uv){ vec2 c = uv * 2. - 1.; c *= 1. - uZoom; c *= (1. + uCurve * dot(c, c)) / (1. + uCurve); c.y /= max(uOpen, .004); return c * .5 + .5; }\n' +
    'vec4 tap(vec2 uv, float lod){ vec2 k = step(vec2(0.), uv) * step(uv, vec2(1.)); return textureLod(uTex, uv, lod) * k.x * k.y; }\n' +
    // the sky behind the stars: paint that folds into itself, in big pixels, in steel and orange
    'vec3 sky(vec2 uv){\n' +
    '  if (uSwirl <= 0.) return uBg;\n' +
    '  vec2 p = (uv - .5) * vec2(uRes.x / uRes.y, 1.); float cs = uDot * 2. / uRes.y; p = (floor(p / cs) + .5) * cs;\n' +
    '  float l = length(p), a = atan(p.y, p.x) + l * 3.2 - uTime * .06;\n' +
    '  vec2 w = vec2(cos(a), sin(a)) * l * 4.;\n' +
    '  for (int i = 0; i < 4; i++){ float f = float(i); w += .55 * vec2(sin(w.y * 1.4 + uTime * .11 + f * 1.3), cos(w.x * 1.2 - uTime * .09 + f * 2.1)); }\n' +
    '  float v = .5 + .5 * sin(w.x * 1.1 + w.y * .9);\n' +
    '  vec3 c = mix(uBg, mix(uBg, vec3(.294, .471, .533), .3), step(.55, v));\n' +
    '  c = mix(c, mix(uBg, vec3(.894, .267, .11), .34), step(.88, v));\n' +
    '  return mix(uBg, c, uSwirl);\n' +
    '}\n' +
    'vec3 glow(vec2 uv){ vec3 g = vec3(0.); float n = 0.;\n' +
    '  for (int i = 0; i < 4; i++){ float l = 1.5 + float(i) * (1. + uGlowSize * .9), w = 1. / (1. + float(i) * .5); vec2 px = exp2(l) / uRes * .6;\n' +
    '    g += w * .25 * (tap(uv + px, l).rgb + tap(uv - px, l).rgb + tap(uv + px * vec2(1., -1.), l).rgb + tap(uv + px * vec2(-1., 1.), l).rgb); n += w; }\n' +
    '  return g / n; }\n' +
    'void main(){\n' +
    '  vec2 uv = bend(vUv); float t = uTime;\n' +
    '  uv.x += uWobble * (sin(uv.y * 17. + t * 2.3) * .0022 + sin(uv.y * 63. - t * 6.1) * .0009);\n' +
    '  vec2 row = vec2(floor(uv.y * 34.), floor(t * 22.));\n' +
    '  uv.x += uTear * step(.6, hash(row)) * (hash(row + 3.7) - .5) * .09;\n' +
    '  vec2 d = uv - .5; float r2 = dot(d, d) * 4.;\n' +
    '  vec2 off = d * (uFringe * .011 * (.25 + r2)) + vec2(uFringe * .0011 + uTear * .004, 0.);\n' +
    '  float lod = uSoft * 2.2;\n' +
    '  vec4 sr = tap(uv + off, lod), sg = tap(uv, lod), sb = tap(uv - off, lod);\n' +
    '  vec3 col = sky(uv);\n' +
    '  col = vec3(col.r * (1. - sr.a) + sr.r, col.g * (1. - sg.a) + sg.g, col.b * (1. - sb.a) + sb.b);\n' +
    '  if (uGlow > 0.){\n' +
    '    vec3 g = glow(uv); float L = dot(g, vec3(.3, .6, .1));\n' +
    '    vec3 soft = g * uGlow * 5.;\n' +
    '    vec3 dots = g / max(L, .0001) * step(BAYER[int(mod(floor(gl_FragCoord.x / uDot), 4.)) + int(mod(floor(gl_FragCoord.y / uDot), 4.)) * 4] / 16. + .03, clamp(L * uGlow * 14., 0., 1.)) * .3;\n' +
    '    col += mix(soft, dots, uDither);\n' +
    '  }\n' +
    '  col += (hash(gl_FragCoord.xy + fract(t) * 91.7) - .5) * uGrain * .16;\n' +
    '  col *= 1. + uFlash * 1.6 + (1. - uOpen) * 3.; col += uFlash * .05;\n' +
    '  col = mix(col, 1. - col, uNeg);\n' +
    '  vec2 k = step(vec2(0.), uv) * step(uv, vec2(1.));\n' +
    '  o = vec4(clamp(col, 0., 1.) * k.x * k.y, 1.);\n' +
    '}';

  // 3. the glass: only ever darkens what is under it
  var FS_GLASS = '#version 300 es\nprecision highp float;\n' +
    'uniform vec2 uRes; uniform float uTime, uCurve, uScan, uLine, uMask, uVig, uFlicker, uBar, uOpen, uRound;\n' +
    'out vec4 o;\n' +
    'float hash(float n){ return fract(sin(n * 91.345) * 47453.5453); }\n' +
    'void main(){\n' +
    '  vec2 uv = gl_FragCoord.xy / uRes, c0 = uv * 2. - 1., c = c0 * (1. + uCurve * dot(c0, c0)) / (1. + uCurve), b = c * .5 + .5;\n' +
    '  vec3 m = vec3(1.);\n' +
    '  m *= 1. - uScan * .7 * (.5 + .5 * cos(b.y * uRes.y / uLine * 6.2831853));\n' +
    '  float sw = max(1., floor(uLine / 3. + .5)), tri = mod(floor(b.x * uRes.x / sw), 3.);\n' +
    '  m *= mix(vec3(1.), mix(vec3(.5), vec3(1.), vec3(float(tri < .5), float(tri > .5 && tri < 1.5), float(tri > 1.5))), uMask);\n' +
    '  m *= 1. - uVig * .92 * smoothstep(.3, 1.25, dot(c0, c0) * .5 + .15);\n' +
    '  m *= 1. - uFlicker * .07 * hash(floor(uTime * 50.));\n' +
    '  float y = fract(b.y + uTime * .07); m *= 1. - uBar * .2 * smoothstep(0., .1, y) * smoothstep(.34, .1, y);\n' +
    '  if (uRound > 0.){ vec2 q = abs(c) - (1. - uRound); float sd = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRound; m *= 1. - smoothstep(-.012, 0., sd); }\n' +
    '  m *= 1. - smoothstep(.5 * uOpen, .5 * uOpen + .004, abs(b.y - .5)) * step(uOpen, .999);\n' +
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
    return { p: p, set: function (name) { var l = u[name] || (u[name] = g.getUniformLocation(p, name)), a = arguments; if (a.length === 2) g.uniform1f(l, a[1]); else if (a.length === 3) g.uniform2f(l, a[1], a[2]); else g.uniform3f(l, a[1], a[2], a[3]); },
      tex: function (name, unit) { g.uniform1i(u[name] || (u[name] = g.getUniformLocation(p, name)), unit); } };
  }
  var keep, picP, glassP;
  try { keep = program(gl, FS_KEEP); picP = program(gl, FS_PIC); glassP = program(g2, FS_GLASS); }
  catch (e) { console.warn('rdBotsFx:', e.message); pic.remove(); glass.remove(); return null; }

  function texture(mips) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mips ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var tSrc = texture(false), mem = [texture(true), texture(true)], fbo = [gl.createFramebuffer(), gl.createFramebuffer()], cur = 0, PW = 0, PH = 0;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  function size() {
    if (src.width !== PW || src.height !== PH) {
      PW = pic.width = src.width; PH = pic.height = src.height;
      mem.forEach(function (t, i) {
        gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PW, PH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[i]); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      });
      var m = /(\d+)[, ]+(\d+)[, ]+(\d+)/.exec(getComputedStyle(root).backgroundColor); bg = m ? [m[1] / 255, m[2] / 255, m[3] / 255] : [.075, .075, .075];
    }
    var r = root.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (glass.width !== w || glass.height !== h) { glass.width = w; glass.height = h; }
    cssW = r.width || 1; cssH = r.height || 1; gdpr = d;
  }

  // ---- settings and moments ---------------------------------------------------------------------
  var KEYS = ['curve', 'scan', 'line', 'mask', 'vig', 'flicker', 'bar', 'glow', 'glowSize', 'fringe', 'trails', 'soft', 'grain', 'wobble', 'dither', 'swirl', 'text', 'hitstop', 'flash', 'glitch', 'negative', 'punch', 'surge', 'power'];
  var P = {}; KEYS.forEach(function (k) { P[k] = 0; });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var on = true, dead = false, raf = 0, last = 0, t0 = performance.now(), bg = [.075, .075, .075], cssW = 1, cssH = 1, gdpr = 1;
  var env = { flash: 0, tear: 0, neg: 0, zoom: 0, surge: 0 }, hold = 0, dim = 1, open = 1, jumpUntil = 0, leaveAt = 0, fps = 60, wasState = '';

  function quiet() { return !(P.scan || P.mask || P.vig || P.flicker || P.bar || P.curve) && open >= 1; }      // nothing on the glass: take it away
  function show() {
    pic.style.display = on ? '' : 'none'; src.style.visibility = on ? 'hidden' : '';
    if (on) root.setAttribute('data-fx', ''); else root.removeAttribute('data-fx');
    var st = root.style, k = P.curve * .22;
    st.setProperty('--fx-tg', (on ? P.text * 16 : 0).toFixed(1) + 'px'); st.setProperty('--fx-tga', (on ? P.text * .5 : 0).toFixed(3));
    st.setProperty('--fx-tf', (on && P.text ? P.fringe * 1.6 : 0).toFixed(2) + 'px');
    st.setProperty('--fx-safe', Math.round(on ? Math.min(cssW, cssH) * .5 * k / (1 + k) : 0) + 'px');     // the corners of a curved screen fall away: the score and the logo move in
  }
  function stop(ms) { if (ms > 0 && !reduce) hold = Math.max(hold, performance.now() + ms); }
  function up(key, v) { env[key] = Math.max(env[key], v); }
  var MOMENT = {
    start: function () { up('flash', P.flash * .4); },
    hit: function () { stop(P.hitstop * 70); up('flash', P.flash * .5); },
    thud: function () { up('flash', P.flash * .3); },
    ufo: function () { stop(P.hitstop * 90); up('flash', P.flash * .8); up('zoom', P.punch * .012); },
    clear: function () { up('flash', P.flash * .7); up('zoom', P.punch * .015); },
    hurt: function () { stop(P.hitstop * 140); up('tear', P.glitch); if (P.negative) env.neg = 1; up('zoom', P.punch * .02); },
    boom: function () { stop(P.hitstop * 220); up('flash', P.flash * 1.4); up('tear', P.glitch * .7); up('zoom', P.punch * .05); }
  };
  function react(k) { if (on && !reduce && MOMENT[k]) MOMENT[k](); }
  function heard(ev) { react(ev.detail); }
  root.addEventListener('rdbots', heard);

  function frame(now) {
    raf = 0;
    if (dead) return;
    if (!document.documentElement.contains(root)) return kill();
    var dt = Math.min((now - last) / 1000, .05); last = now;
    if (dt > 0) fps += (1 / dt - fps) * .05;
    if (!on) return wake();
    size();
    var state = root.getAttribute('data-bots-state'), t = (now - t0) / 1000, k = P.curve * .22;
    if (state !== wasState) { if (state === 'leave') leaveAt = now; wasState = state; }

    env.flash = Math.max(0, env.flash - dt * 6); env.tear = Math.max(0, env.tear - dt * 2.2); env.neg = Math.max(0, env.neg - dt * 11);
    env.zoom += (0 - env.zoom) * Math.min(1, dt * 9);
    var jumping = root.getAttribute('data-bots-banner') === 'boss' || state === 'leave' || now < jumpUntil;      // the jump to the next sky
    env.surge += ((jumping && !reduce ? P.surge : 0) - env.surge) * Math.min(1, dt * 3);
    dim += ((state === 'over' ? .2 : 1) - dim) * Math.min(1, dt * 6);
    var want = state === 'leave' && P.power && now - leaveAt > 420 ? 0 : 1;                                       // switched off on the way out
    open = want > open ? Math.min(1, open + dt / .5) : Math.max(0, open - dt / .26);
    var o = open * open * (3 - 2 * open);

    gl.viewport(0, 0, PW, PH);
    if (now >= hold && src.width && src.height) {          // a freeze on a hit = the tube holds its last picture for a moment
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tSrc); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, mem[cur]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur]);
      gl.useProgram(keep.p); keep.tex('uSrc', 0); keep.tex('uPrev', 1);
      keep.set('uDecay', P.trails ? Math.pow(.8 + .17 * P.trails, dt * 60) : 0); keep.set('uDim', dim);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = 1 - cur;
      gl.bindTexture(gl.TEXTURE_2D, mem[cur]); gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mem[cur]);
    gl.useProgram(picP.p); picP.tex('uTex', 0);
    picP.set('uRes', PW, PH); picP.set('uTime', reduce ? 0 : t % 600); picP.set('uBg', bg[0], bg[1], bg[2]);
    picP.set('uCurve', k); picP.set('uFringe', P.fringe + env.surge * 1.6 + env.tear * .8);
    picP.set('uGlow', P.glow * (1 + env.surge * 1.2)); picP.set('uGlowSize', P.glowSize);
    picP.set('uSoft', P.soft); picP.set('uGrain', P.grain); picP.set('uWobble', reduce ? 0 : P.wobble + env.surge * .4); picP.set('uTear', env.tear);
    picP.set('uFlash', env.flash); picP.set('uNeg', Math.min(1, env.neg)); picP.set('uZoom', env.zoom + env.surge * .035);
    picP.set('uSwirl', P.swirl); picP.set('uDither', P.dither); picP.set('uDot', Math.max(2, Math.round(3 * PW / cssW))); picP.set('uOpen', o);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    var calm = quiet();
    if (glass.style.display !== (calm ? 'none' : '')) glass.style.display = calm ? 'none' : '';
    if (!calm) {
      g2.viewport(0, 0, glass.width, glass.height); g2.useProgram(glassP.p);
      glassP.set('uRes', glass.width, glass.height); glassP.set('uTime', t % 600); glassP.set('uCurve', k);
      glassP.set('uScan', P.scan); glassP.set('uLine', Math.round((2 + P.line * 4) * gdpr)); glassP.set('uMask', P.mask); glassP.set('uVig', P.vig);
      glassP.set('uFlicker', reduce ? 0 : P.flicker); glassP.set('uBar', reduce ? 0 : P.bar); glassP.set('uOpen', o); glassP.set('uRound', k > 0 ? .02 + k * .5 : 0);
      g2.drawArrays(g2.TRIANGLES, 0, 3);
    }
    wake();
  }
  function wake() { if (!raf && !dead && !document.hidden) { if (!last || performance.now() - last > 200) last = performance.now(); raf = requestAnimationFrame(frame); } }
  function seen() { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else wake(); }
  document.addEventListener('visibilitychange', seen);
  function kill() {
    dead = true; if (raf) cancelAnimationFrame(raf); raf = 0;
    document.removeEventListener('visibilitychange', seen); root.removeEventListener('rdbots', heard);
    pic.remove(); glass.remove(); src.style.visibility = ''; root.removeAttribute('data-fx');
  }

  size(); show(); wake();
  return {
    keys: KEYS,
    set: function (v) { KEYS.forEach(function (k) { if (v[k] != null) P[k] = Math.max(0, Math.min(1, +v[k] || 0)); }); size(); show(); },
    get: function () { var o = {}; KEYS.forEach(function (k) { o[k] = P[k]; }); return o; },
    enable: function (v) { on = !!v; glass.style.display = on && !quiet() ? '' : 'none'; show(); wake(); },
    react: react,
    jump: function (sec) { jumpUntil = performance.now() + (sec || 1.6) * 1000; },
    power: function () { if (P.power && !reduce) open = 0; },      // switch it on again (call once at the start for the opening)
    fps: function () { return Math.round(fps); },
    kill: kill
  };
}
