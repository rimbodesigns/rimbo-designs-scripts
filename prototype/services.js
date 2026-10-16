// Services, new idea. No card, no image, no feature list: the three words, huge, and the same
// liquid glass as the opening, following your pointer across them. Outside the lens the words
// sit back in the dark; inside it they are sharp, magnified, split into colour at the rim.
// Hover a word and it comes forward with one line about it; the whole thing opens the Service page.
(function () {
  'use strict';

  var space = document.querySelector('.proto-space');
  if (!space || document.querySelector('.proto-services2')) return;

  var lines = [
    { word: 'Branding', about: 'Strategy, identity and a toolkit that keeps everyone on brand.' },
    { word: 'Design', about: 'How it should feel to use, then how it looks. UX first.' },
    { word: 'Development', about: 'Webflow, Shopify, and code where it earns its place. Fast and yours.' }
  ];

  var section = document.createElement('section');
  section.className = 'proto-services2';
  section.innerHTML =
    '<canvas class="proto-services2_canvas" aria-hidden="true"></canvas>' +
    '<ul class="proto-services2_sr">' + lines.map(function (l) { return '<li>' + l.word + ': ' + l.about + '</li>'; }).join('') + '</ul>' +
    '<a class="proto-services2_link" href="https://www.rimbodesigns.com/service" aria-label="See how I work on the Service page"></a>' +
    '<div class="proto-services2_foot"><span class="proto-services2_label">What I do</span><span class="proto-services2_about"></span><span class="proto-services2_more">See how I work \u2192</span></div>';
  space.insertAdjacentElement('beforebegin', section);

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = section.querySelector('.proto-services2_canvas');
  var about = section.querySelector('.proto-services2_about');

  // ---- the words, drawn to a texture in the site's display face
  var text = document.createElement('canvas');
  var tctx = text.getContext('2d');
  var bands = [];               // y range of each word in uv (0 = top)
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  function drawText(W, H) {
    text.width = Math.round(W * dpr); text.height = Math.round(H * dpr);
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tctx.clearRect(0, 0, W, H);
    var pad = Math.max(24, W * 0.06);
    var size = Math.min(H * 0.26, W * 0.16);
    tctx.font = '700 ' + size + 'px "GRIFTER BOLD"';
    var widest = Math.max.apply(null, lines.map(function (l) { return tctx.measureText(l.word.toUpperCase()).width; }));
    size = size * Math.min(1, (W - pad * 2 - 90) / widest);
    tctx.font = '700 ' + size + 'px "GRIFTER BOLD"';
    var lh = size * 0.98;
    var top = (H - lh * lines.length) / 2;
    bands = [];
    lines.forEach(function (l, i) {
      var y = top + lh * i;
      tctx.fillStyle = '#ff7373';
      tctx.font = '400 ' + Math.max(11, size * 0.11) + 'px "RM MONO"';
      tctx.textBaseline = 'alphabetic';
      tctx.fillText('0' + (i + 1), pad, y + lh * 0.42);
      tctx.fillStyle = '#f8f5ee';
      tctx.font = '700 ' + size + 'px "GRIFTER BOLD"';
      tctx.textBaseline = 'middle';
      tctx.fillText(l.word.toUpperCase(), pad + 56, y + lh * 0.52);
      bands.push([y / H, (y + lh) / H]);
    });
  }

  var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2 uMouse;',
    'uniform float uTime;',
    'uniform float uAspect;',
    'uniform float uRadius;',
    'uniform float uDim;',
    'uniform vec4 uBand;',     // active word: top, bottom, weight, unused
    'uniform vec3 uRing;',
    'void main(){',
    '  vec2 uv = vUv;',
    '  vec2 p = (uv - uMouse) * vec2(uAspect, 1.0);',
    '  float d = length(p) / uRadius;',
    '  vec3 col = texture2D(uTex, uv).rgb;',
    // outside the lens the words sit back; the hovered word comes forward
    '  float inBand = step(uBand.x, 1.0 - uv.y) * step(1.0 - uv.y, uBand.y);',
    '  float lift = mix(uDim, 1.0, inBand * uBand.z);',
    '  col *= lift;',
    '  if (d < 1.0) {',
    '    float k = 1.0 - d * d;',
    '    vec2 zuv = uMouse + (uv - uMouse) * (1.0 - 0.32 * k);',               // magnify
    '    float wob = sin(d * 18.0 - uTime * 2.2) * 0.0025 * (1.0 - d);',        // a little liquid
    '    zuv += normalize(p + 1e-6) * wob;',
    '    float rim = smoothstep(0.45, 1.0, d);',
    '    vec2 shift = normalize(p + 1e-6) * 0.006 * rim;',
    '    vec3 lensCol = vec3(texture2D(uTex, zuv + shift).r, texture2D(uTex, zuv).g, texture2D(uTex, zuv - shift).b);',
    '    lensCol *= mix(1.0, 0.92, k * 0.5);',                                   // the glass darkens the centre a touch
    '    float ring = exp(-pow((d - 0.965) / 0.018, 2.0));',
    '    float aura = exp(-pow((d - 0.965) / 0.09, 2.0)) * 0.22;',
    '    lensCol += uRing * (ring * 0.9 + aura);',
    '    lensCol += vec3(exp(-pow((d - 0.985) / 0.006, 2.0)) * 0.6);',           // white rim line
    '    col = mix(col, lensCol, smoothstep(1.0, 0.985, d));',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var ready = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 100px "GRIFTER BOLD"'), document.fonts.load('400 20px "RM MONO"')]).catch(function () {}) : Promise.resolve();

  if (reduceMotion) { // no canvas: the words as plain text
    ready.then(function () { section.classList.add('is-static'); section.querySelector('.proto-services2_sr').classList.add('is-visible'); });
    return;
  }

  Promise.all([ready, import('https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js')]).then(function (r) {
    var THREE = r[1];
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false }); } catch (e) { return; }
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x0c0c0c, 1);
    var W = section.clientWidth || 1, H = section.clientHeight || 1;
    drawText(W, H);
    var tex = new THREE.CanvasTexture(text);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.NoColorSpace;
    var uniforms = {
      uTex: { value: tex },
      uMouse: { value: new THREE.Vector2(0.3, 0.5) },
      uTime: { value: 0 },
      uAspect: { value: W / H },
      uRadius: { value: 0.22 },
      uDim: { value: 0.42 },
      uBand: { value: new THREE.Vector4(0, 0, 0, 0) },
      uRing: { value: new THREE.Color().setStyle('#ff7373', THREE.LinearSRGBColorSpace) }
    };
    var scene = new THREE.Scene();
    var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG })));

    function size() {
      W = section.clientWidth || 1; H = section.clientHeight || 1;
      renderer.setSize(W, H, false);
      drawText(W, H); tex.needsUpdate = true;
      uniforms.uAspect.value = W / H;
      uniforms.uRadius.value = Math.min(0.26, 0.22 * Math.max(1, 1200 / W) ) ;
    }
    size();
    new ResizeObserver(size).observe(section);

    // pointer: the lens follows it; without a pointer it wanders over the words on its own
    var mouse = { x: 0.3, y: 0.5 }, target = { x: 0.3, y: 0.5 }, hasPointer = false, idleSince = 0;
    var active = -1, band = { w: 0 };
    section.addEventListener('pointermove', function (e) {
      var r = section.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width; target.y = 1 - (e.clientY - r.top) / r.height;
      hasPointer = true; idleSince = performance.now();
      var yTop = 1 - target.y; // 0 = top
      var hit = -1;
      bands.forEach(function (b, i) { if (yTop >= b[0] && yTop <= b[1]) hit = i; });
      if (hit !== active) {
        active = hit;
        if (hit >= 0) { about.textContent = lines[hit].about; about.classList.add('is-on'); gsap.to(band, { w: 1, duration: 0.5, ease: 'power2.out' }); }
        else { about.classList.remove('is-on'); gsap.to(band, { w: 0, duration: 0.5 }); }
      }
    });
    section.addEventListener('pointerleave', function () { hasPointer = false; active = -1; about.classList.remove('is-on'); gsap.to(band, { w: 0, duration: 0.5 }); });

    var t0 = performance.now(), raf = 0;
    function tick() {
      if (!section.isConnected) { cancelAnimationFrame(raf); renderer.dispose(); return; }
      var now = performance.now(), t = (now - t0) / 1000;
      if (!hasPointer || now - idleSince > 4000) { // the wander
        target.x = 0.5 + Math.sin(t * 0.21) * 0.36;
        target.y = 0.5 + Math.sin(t * 0.33 + 1.2) * 0.3;
      }
      mouse.x += (target.x - mouse.x) * 0.08; mouse.y += (target.y - mouse.y) * 0.08;
      uniforms.uMouse.value.set(mouse.x, mouse.y);
      uniforms.uTime.value = t;
      if (active >= 0) uniforms.uBand.value.set(bands[active][0], bands[active][1], band.w, 0);
      else uniforms.uBand.value.z = band.w;
      renderer.render(scene, cam);
      raf = requestAnimationFrame(tick);
    }
    tick();
  }).catch(function (e) { console.warn('services: three failed to load', e); });
})();
