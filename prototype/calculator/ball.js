/* The ball: the brand's grainy circle (docs/brand.md), standing for the project.
   Fade and shader come from prototype/brand/src.html: Deep Orange through Hot Edge and steel into beige,
   mixed in OKLab so nothing goes grey. What's new here is what it does:
   - its area follows the price: that's its link to the project, so it starts small and grows with every pick
   - it lives on its own: the colours flow and turn around inside it, and the ball floats and breathes.
     Orange is one colour among the others at any size, it never takes over
   - a pick stirs the colours and warms them a little, the pointer warms the spot under it
   Also makes the page's grain. Without WebGL2 there's no ball and nothing else changes.
   calculator.js starts it with calcBallMount(root) and stops it with destroy() when the page leaves. */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The page grain: a fine stipple, light and dark specks, drawn once into a tile (once per visit: every start reuses it)
  var grainTile = null;
  function grain(root) {
    if (!grainTile) {
      var size = 256, c = document.createElement("canvas"); c.width = c.height = size;
      var x = c.getContext("2d"), img = x.createImageData(size, size), d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var n = Math.random(), light = n > .5, a = light ? (n - .5) * .2 : (n < .22 ? (.22 - n) * .75 : 0);
        d[i] = light ? 248 : 12; d[i + 1] = light ? 245 : 12; d[i + 2] = light ? 238 : 12; d[i + 3] = a * 255;
      }
      x.putImageData(img, 0, 0);
      grainTile = { url: "url(" + c.toDataURL("image/png") + ")", size: Math.round(size / Math.min(devicePixelRatio || 1, 2)) + "px" }; // one tile pixel per screen pixel: a clean stipple
    }
    root.style.setProperty("--grain", grainTile.url);
    root.style.setProperty("--grain-size", grainTile.size);
  }

  function oklab(hex) {
    var c = [0, 2, 4].map(function (i) {
      var v = parseInt(hex.substr(i, 2), 16) / 255;
      return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
    });
    var l = Math.cbrt(.4122214708 * c[0] + .5363325363 * c[1] + .0514459929 * c[2]);
    var m = Math.cbrt(.2119034982 * c[0] + .6806995451 * c[1] + .1073969566 * c[2]);
    var s = Math.cbrt(.0883024619 * c[0] + .2817188376 * c[1] + .6299787005 * c[2]);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  }

  // The brand's shader for one ball, with a see-through outside so the page and its grain show around it
  var FRAG = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 res; uniform vec2 center; uniform float R; uniform float seed; uniform float bias; uniform float heat; uniform float grainScale; uniform float grainT; uniform float t;\n" +
    "uniform vec2 ptr; uniform float ptrR; uniform float ptrAmt; uniform vec3 stops[4]; uniform vec2 edges[3];\n" +
    "out vec4 outColor;\n" +
    "float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n" +
    "float noise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);\n" +
    "  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }\n" +
    "float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }\n" +
    "float s2(float x) { return x <= 0.0031308 ? x * 12.92 : 1.055 * pow(max(x, 0.0), 1.0 / 2.4) - 0.055; }\n" +
    "vec3 fromLab(vec3 c) {\n" +
    "  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z, m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z, s = c.x - 0.0894841775 * c.y - 1.291485548 * c.z;\n" +
    "  l = l * l * l; m = m * m * m; s = s * s * s;\n" +
    "  return vec3(s2(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), s2(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), s2(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s));\n" +
    "}\n" +
    "vec3 ramp(float v) { vec3 c = stops[0]; for (int i = 0; i < 3; i++) c = mix(c, stops[i + 1], smoothstep(edges[i].x, edges[i].y, v)); return fromLab(c); }\n" +
    "void main() {\n" +
    "  vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);\n" +
    "  vec2 l = (p - center) / R;\n" +
    "  float r = length(l), aa = 1.2 / R;\n" +
    "  if (r > 1.0 + aa) { outColor = vec4(0.0); return; }\n" +
    "  vec2 gp = floor(p / grainScale);\n" +
    "  float g1 = hash(gp + seed + grainT), g2 = noise(gp * 0.9 + seed * 3.0 + grainT);\n" +
    "  float grain = (g1 - 0.5) * 0.20 + (g2 - 0.5) * 0.07;\n" +
    "  float h = hash(vec2(seed));\n" +
    "  float ang = h * 6.2831 + t * 0.16;\n" + // the colours turn around inside the ball, wherever it's cropped
    "  float g = 0.53 + 0.14 * dot(l, vec2(cos(ang), sin(ang)));\n" +
    "  vec2 drift = vec2(sin(t * 0.34 + h * 6.2831), cos(t * 0.27 + h * 12.566)) * 0.62;\n" +
    "  vec2 w = vec2(fbm(l * 0.55 + h * 40.0 + drift), fbm(l * 0.55 + h * 70.0 + 5.2 - drift));\n" +
    "  float f = fbm(l * 1.0 + w * 1.3 + h * 90.0);\n" +
    "  float v = g + (f - 0.5) * 1.5 + bias - heat * 0.45;\n" +
    "  float dp = length(p - ptr) / max(ptrR, 1.0);\n" +
    "  v -= ptrAmt * 0.6 * exp(-dp * dp);\n" +
    "  vec3 col = ramp(clamp(v, 0.0, 1.0)) + grain;\n" +
    "  col = mix(col, ramp(clamp(v + (g1 - 0.5) * 0.18, 0.0, 1.0)) + grain, 0.35);\n" +
    "  outColor = vec4(clamp(col, 0.0, 1.0), smoothstep(1.0 + aa, 1.0 - aa, r));\n" +
    "}";

  // The shader on a canvas. Returns its context and uniforms, or null if it can't run
  function setup(gl) {
    function shader(type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; }
    var prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, "#version 300 es\nin vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }"));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, "a"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ["res", "center", "R", "seed", "bias", "heat", "grainScale", "grainT", "t", "ptr", "ptrR", "ptrAmt", "stops", "edges"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    gl.uniform3fv(U.stops, new Float32Array([].concat.apply([], ["E4441C", "E4566A", "4B7888", "DACCAE"].map(oklab))));
    gl.uniform2fv(U.edges, new Float32Array([.12, .28, .26, .46, .5, .84]));
    gl.uniform1f(U.seed, 14);
    return U;
  }

  var MAX = 30000; // the price at which the ball is full size
  var FLOW = +new URLSearchParams(location.search).get("flow") || 1; // ?flow=2: the colours move twice as fast

  // Starts the grain and the ball inside root (the calculator). Returns { set, pop, destroy }, or null without WebGL2:
  // then there is no ball and nothing else changes. destroy() stops all of it, for a page that leaves without a reload.
  window.calcBallMount = function (root) {
    grain(root);
    var cv = root.querySelector(".calc_ball");
    var gl = cv && cv.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
    var U = gl && setup(gl);
    if (!U) { if (cv) cv.hidden = true; return null; }
    var alive = true, offs = [];
    function on(target, type, fn, options) { target.addEventListener(type, fn, options); offs.push(function () { target.removeEventListener(type, fn, options); }); }
    var B = { R: 0, tR: 0, bias: .12, tBias: .12, heat: 0, kick: 0, stir: 0, cx: 0, cy: 0, min: 0, max: 0, value: 0, minimum: 1, seen: false };
    var P = { x: 0, y: 0, tx: 0, ty: 0, amt: 0, target: 0 };
    var dpr = 1, time = 0, float = 0, last = 0, lastDraw = 0, onScreen = true;

    function targets() {
      B.tR = B.min + (B.max - B.min) * Math.sqrt(Math.min(B.value, MAX) / MAX); // area follows the price
      B.tBias = .12 - .06 * Math.min(1, B.value / B.minimum); // a touch cooler while it's small
    }

    // Wide: fixed, in the empty corner under the price card. Phone: at the top of the page, behind the title.
    function layout() {
      var wide = innerWidth > 860, side = root.querySelector(".calc_side");
      cv.classList.toggle("is-top", !wide);
      var w = wide ? innerWidth : document.documentElement.clientWidth, h = wide ? innerHeight : 420;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      gl.viewport(0, 0, cv.width, cv.height);
      if (wide) {
        var r = side.getBoundingClientRect();
        B.cx = r.width ? Math.min(r.right + 40, w - 10) : w * .82; // no price card (a page without a link): the right-hand corner
        B.cy = h * .92; B.min = Math.max(96, h * .17); B.max = h * .54;
      } else {
        // by the title: on the site the section's top spacing keeps the title (and the ball) clear of the nav
        B.cx = w * .98; B.cy = 30 + (parseFloat(getComputedStyle(root).paddingTop) || 0); B.min = 62; B.max = 165;
      }
      targets();
      if (reduce) { B.R = B.tR; B.bias = B.tBias; }
    }

    function draw() {
      // It floats and breathes on its own (still with reduced motion)
      var fx = reduce ? 0 : Math.sin(float * .31) * 16 + Math.sin(float * .13) * 10, fy = reduce ? 0 : Math.cos(float * .23) * 14;
      var breath = reduce ? 1 : 1 + Math.sin(float * .37) * .022;
      gl.uniform2f(U.res, cv.width, cv.height); gl.uniform2f(U.center, (B.cx + fx) * dpr, (B.cy + fy) * dpr);
      gl.uniform1f(U.R, Math.max(B.R * breath, 1) * dpr); gl.uniform1f(U.bias, B.bias); gl.uniform1f(U.heat, B.heat);
      gl.uniform1f(U.grainScale, dpr * .75); gl.uniform1f(U.t, time);
      gl.uniform1f(U.grainT, reduce ? 0 : Math.floor(float * 11) % 64 * 1.7); // the grain flickers like film, 11 frames a second
      gl.uniform2f(U.ptr, P.x * dpr, P.y * dpr); gl.uniform1f(U.ptrR, Math.min(Math.max(B.R * .4, 80), 200) * dpr); gl.uniform1f(U.ptrAmt, P.amt);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function ease(a, b, k, dt) { return a + (b - a) * (1 - Math.pow(1 - k, dt * 60)); }

    function frame(now) {
      if (!alive) return;
      requestAnimationFrame(frame);
      if (document.hidden || !onScreen) { last = now; return; }
      var dt = Math.min((now - last) / 1000, .05); last = now;
      time += dt * FLOW * (1 + B.stir * 7); // a pick stirs the colours, then they settle back to their own pace
      float += dt;
      B.stir *= Math.pow(.955, dt * 60);
      B.R = ease(B.R, B.tR, .07, dt);
      B.bias = ease(B.bias, B.tBias, .05, dt);
      B.heat = ease(B.heat, B.kick, .16, dt);
      B.kick *= Math.pow(.962, dt * 60);
      P.x = ease(P.x, P.tx, .12, dt); P.y = ease(P.y, P.ty, .12, dt); P.amt = ease(P.amt, P.target, .06, dt);
      var moving = Math.abs(B.tR - B.R) > .4 || B.heat > .004 || B.kick > .004 || B.stir > .01 || Math.abs(P.target - P.amt) > .004 || P.target;
      if (!moving && now - lastDraw < 33) return; // on its own: 30 frames a second is plenty for slow colours
      lastDraw = now;
      draw();
    }

    if (matchMedia("(pointer: fine)").matches && !reduce) {
      on(window, "pointermove", function (e) {
        if (cv.classList.contains("is-top")) return;
        var d = Math.hypot(e.clientX - B.cx, e.clientY - B.cy);
        if (d < B.R * 1.05) { if (!P.target) { P.x = e.clientX; P.y = e.clientY; } P.tx = e.clientX; P.ty = e.clientY; P.target = 1; }
        else P.target = 0;
      }, { passive: true });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; });
      io.observe(cv);
      offs.push(function () { io.disconnect(); });
    }
    var rt = 0;
    on(window, "resize", function () { clearTimeout(rt); rt = setTimeout(function () { layout(); draw(); }, 120); });

    layout();
    if (!reduce) requestAnimationFrame(function (t) { last = t; frame(t); });

    // The pop-up's own little ball: it runs off the card's edge, floods orange as it arrives and settles (brand blocks).
    // Only runs while the pop-up is open. calm = no flood, for "not yet" messages.
    var mini = null;
    function popBall(c, calm) {
      if (!mini) {
        var g = c.getContext("webgl2", { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
        var u = g && setup(g);
        if (!u) return function () {};
        mini = { gl: g, U: u, run: 0, t: 40 };
      }
      var m = mini, g2 = m.gl, u2 = m.U, box = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      c.width = Math.round(box.width * d); c.height = Math.round(box.height * d);
      g2.viewport(0, 0, c.width, c.height);
      var heat = calm || reduce ? 0 : 1, id = ++m.run, prev = performance.now(), clock = 0;
      function paint() {
        g2.uniform2f(u2.res, c.width, c.height); g2.uniform2f(u2.center, c.width * .94, c.height * .5);
        g2.uniform1f(u2.R, c.height * .86); g2.uniform1f(u2.bias, calm ? .3 : .02); g2.uniform1f(u2.heat, heat);
        g2.uniform1f(u2.grainScale, d * .75); g2.uniform1f(u2.t, m.t);
        g2.uniform1f(u2.grainT, reduce ? 0 : Math.floor(clock * 11) % 64 * 1.7); g2.uniform1f(u2.ptrAmt, 0); g2.uniform1f(u2.ptrR, 1);
        g2.clearColor(0, 0, 0, 0); g2.clear(g2.COLOR_BUFFER_BIT);
        g2.drawArrays(g2.TRIANGLES, 0, 3);
      }
      paint();
      if (reduce) return function () {};
      (function loop(now) {
        if (id !== m.run || !alive) return;
        var dt = Math.min((now - prev) / 1000, .25); prev = now; clock += dt; // real time: it only lives for a few seconds
        m.t += dt * 1.6;
        heat *= Math.pow(.965, dt * 60);
        paint();
        requestAnimationFrame(loop);
      })(prev);
      return function () { if (id === m.run) m.run++; };
    }

    // set() is called on every change of the scope. value = the big number, minimum = the project minimum.
    return {
      pop: popBall,
      set: function (value, minimum) {
        var d = value - B.value, first = !B.seen, crossed = B.value < minimum && value >= minimum;
        B.value = value; B.minimum = minimum; B.seen = true;
        targets();
        if (reduce) { B.R = B.tR; B.bias = B.tBias; draw(); return; }
        if (first) return;
        var size = Math.min(1, Math.abs(d) / 2000);
        if (d) B.stir = Math.min(1, B.stir + .35 + .4 * size);
        if (crossed) B.kick = .4;
        else if (d > 0) B.kick = Math.max(B.kick, .12 + .14 * size);
      },
      // The page leaves: stop the clock and the listeners, and hand the WebGL contexts back to the browser
      destroy: function () {
        if (!alive) return;
        alive = false; clearTimeout(rt);
        offs.forEach(function (off) { off(); });
        [gl, mini && mini.gl].forEach(function (g) { var x = g && g.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); });
      }
    };
  };
})();
