// The brand ball for the wall: the calculator's shader (prototype/calculator/ball.js), which moves by itself:
// the colours flow and turn inside the ball and orange never takes over. See-through outside the circle.
// Tuned for a ball you only see a quarter of: a stronger sweep that turns faster and finer noise, so every crop keeps the fade.
const toRgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
const s2l = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
function oklab(h) {
  const [r, g, b] = toRgb(h).map(s2l);
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
const rgb01 = h => toRgb(h).map(v => v / 255);

const FRAG = "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 res; uniform vec2 center; uniform float R; uniform float seed; uniform float bias; uniform float heat; uniform float grainScale; uniform float t;\n" +
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
    "  float g1 = hash(gp + seed), g2 = noise(gp * 0.9 + seed * 3.0);\n" +
    "  float grain = (g1 - 0.5) * 0.20 + (g2 - 0.5) * 0.07;\n" +
    "  float h = hash(vec2(seed));\n" +
    "  float ang = h * 6.2831 + t * 0.26;\n" + // the colours turn around inside the ball, wherever it's cropped
    "  float g = 0.5 + 0.34 * dot(l, vec2(cos(ang), sin(ang)));\n" +
    "  vec2 drift = vec2(sin(t * 0.34 + h * 6.2831), cos(t * 0.27 + h * 12.566)) * 0.62;\n" +
    "  vec2 w = vec2(fbm(l * 0.55 + h * 40.0 + drift), fbm(l * 0.55 + h * 70.0 + 5.2 - drift));\n" +
    "  float f = fbm(l * 1.7 + w * 1.3 + h * 90.0);\n" +
    "  float v = g + (f - 0.5) * 1.0 + bias - heat * 0.45;\n" +
    "  float dp = length(p - ptr) / max(ptrR, 1.0);\n" +
    "  v -= ptrAmt * 0.6 * exp(-dp * dp);\n" +
    "  vec3 col = ramp(clamp(v, 0.0, 1.0)) + grain;\n" +
    "  col = mix(col, ramp(clamp(v + (g1 - 0.5) * 0.18, 0.0, 1.0)) + grain, 0.35);\n" +
    "  outColor = vec4(clamp(col, 0.0, 1.0), smoothstep(1.0 + aa, 1.0 - aa, r));\n" +
    "}";

const gl = document.createElement('canvas').getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
const U = {};
if (gl) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
in vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }`));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, 'a'); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  ['res', 'center', 'R', 'seed', 'bias', 'heat', 'grainScale', 't', 'ptr', 'ptrR', 'ptrAmt', 'stops', 'edges'].forEach(k => { U[k] = gl.getUniformLocation(prog, k); });
  gl.uniform3fv(U.stops, new Float32Array([].concat.apply([], ['E4441C', 'E4566A', '4B7888', 'DACCAE'].map(oklab))));
  gl.uniform2fv(U.edges, new Float32Array([.12, .28, .26, .46, .5, .84]));
}

// o: cx, cy, R in the canvas's css pixels; t, seed, bias; px, py, pr, amt for the warm spot under the mouse
function drawBall(cv, o) {
  if (!gl) return;
  const box = cv.getBoundingClientRect();
  if (!box.width) return;
  const dpr = Math.min(devicePixelRatio || 1, 2), W = Math.round(box.width * dpr), H = Math.round(box.height * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (gl.canvas.width !== W || gl.canvas.height !== H) { gl.canvas.width = W; gl.canvas.height = H; }
  gl.viewport(0, 0, W, H);
  gl.uniform2f(U.res, W, H); gl.uniform2f(U.center, o.cx * dpr, o.cy * dpr); gl.uniform1f(U.R, o.R * dpr);
  gl.uniform1f(U.seed, o.seed); gl.uniform1f(U.bias, o.bias); gl.uniform1f(U.heat, 0); gl.uniform1f(U.grainScale, dpr * .75); gl.uniform1f(U.t, o.t);
  gl.uniform2f(U.ptr, o.px * dpr, o.py * dpr); gl.uniform1f(U.ptrR, o.pr * dpr); gl.uniform1f(U.ptrAmt, o.amt);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const c = cv.getContext('2d');
  c.clearRect(0, 0, W, H);
  c.drawImage(gl.canvas, 0, 0);
}
