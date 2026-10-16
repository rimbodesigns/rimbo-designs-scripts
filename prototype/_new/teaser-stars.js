// Service teaser, WebGL take. The live home has a big tilted card with the stars animation,
// "MY SERVICE // PROCESS" on it and "discover the possibilities" running across it as text.
// Here the card is a plane in three.js: the stars play as a video texture through a shader that
// flows on its own, ripples under the pointer, splits colour at the rim, and comes to life on
// hover (grey and soft at rest, like the original). The plane tilts toward the pointer and
// rotates in on scroll. The text rows are DOM, driven by the site's own marquee code.
(function () {
  'use strict';

  var opening = document.querySelector('[data-glass-carousel]');
  var space = document.querySelector('.proto-space');
  if (!opening || !space || document.querySelector('.proto-teaser')) return;

  var CDN = 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/';
  var phrase = 'discover the possibilities ***';
  function row(outline, direction, speed) {
    var text = '';
    for (var i = 0; i < 8; i++) text += '<span class="proto-teaser_word' + (outline ? ' is-outline' : '') + '">' + phrase + '</span>';
    return '<div class="proto-teaser_row" data-marquee-scroll-direction-target data-marquee-speed="' + speed + '" data-marquee-direction="' + direction + '" data-marquee-duplicate="2" data-marquee-scroll-speed="8">' +
      '<div class="proto-teaser_scroll" data-marquee-scroll-target><div class="proto-teaser_list" data-marquee-collection-target>' + text + '</div></div></div>';
  }

  var section = document.createElement('section');
  section.className = 'proto-teaser';
  section.innerHTML =
    '<div class="proto-teaser_stage">' +
      '<canvas class="proto-teaser_canvas" aria-hidden="true"></canvas>' +
      '<div class="proto-teaser_rows is-top">' + row(false, 'left', 28) + row(true, 'right', 36) + '</div>' +
      '<div class="proto-teaser_rows is-bottom">' + row(true, 'left', 34) + row(false, 'right', 30) + '</div>' +
      '<a class="proto-teaser_link" href="https://www.rimbodesigns.com/service" aria-label="My service and process">' +
        '<img class="proto-teaser_label" src="' + CDN + '63447343781f79d2cf33b9e7_buttonS.svg" alt="My service // process">' +
        '<span class="proto-teaser_arrows"><img src="' + CDN + '6422055625c22112355b4de4_whiteA1.svg" alt=""><img src="' + CDN + '6422055625c22112355b4de4_whiteA1.svg" alt=""></span>' +
      '</a>' +
    '</div>';
  space.insertAdjacentElement('beforebegin', section);

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // the DOM version is enough: rows and label on black

  // ---- the plane
  var VERT = [
    'varying vec2 vUv;',
    'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform float uTime;',
    'uniform float uHover;',
    'uniform vec2 uMouse;',
    'uniform float uRipple;',
    'uniform float uAspect;',
    // small, cheap noise
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float noise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main() {',
    // the stars are square; cover the wide plane with the middle band, like background-size: cover
    '  vec2 uv = vec2(vUv.x, 0.5 + (vUv.y - 0.5) / uAspect);',
    // slow liquid flow, stronger when awake
    '  float t = uTime * 0.12;',
    '  vec2 flow = vec2(noise(uv * 3.0 + t), noise(uv * 3.0 - t + 7.0)) - 0.5;',
    '  uv += flow * (0.012 + 0.025 * uHover);',
    // ripple around the pointer
    '  vec2 d = (uv - uMouse) * vec2(uAspect, 1.0);',
    '  float dist = length(d);',
    '  float wave = sin(dist * 28.0 - uTime * 5.0) * exp(-dist * 4.5);',
    '  uv += normalize(d + 1e-6) * wave * 0.012 * uRipple;',
    // colour split toward the edges, like the glass in the opening
    '  vec2 c = uv - 0.5;',
    '  float rim = smoothstep(0.25, 0.75, length(c));',
    '  vec2 shift = c * 0.012 * rim * (0.4 + uHover);',
    '  float r = texture2D(uTex, uv + shift).r;',
    '  float g = texture2D(uTex, uv).g;',
    '  float b = texture2D(uTex, uv - shift).b;',
    '  vec3 col = vec3(r, g, b);',
    // at rest: darker, greyer, a touch soft. awake: full colour
    '  float grey = dot(col, vec3(0.299, 0.587, 0.114));',
    '  col = mix(mix(vec3(grey), col, 0.45) * 0.55, col, uHover);',
    // vignette
    '  float vig = 1.0 - smoothstep(0.55, 1.05, length(c) * 1.3);',
    '  col *= 0.75 + 0.25 * vig;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var canvas = section.querySelector('.proto-teaser_canvas');
  var stage = section.querySelector('.proto-teaser_stage');
  var link = section.querySelector('.proto-teaser_link');

  import('https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js').then(function (THREE) {
    var W = stage.clientWidth || 1;
    var H = stage.clientHeight || 1;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true }); }
    catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    camera.position.z = 10;

    var video = document.createElement('video');
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
    video.src = '/media/stars.mp4';
    var play = video.play(); if (play && play.catch) play.catch(function () {});
    var tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    tex.colorSpace = THREE.NoColorSpace;

    var uniforms = {
      uTex: { value: tex },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRipple: { value: 0 },
      uAspect: { value: 1.43 }
    };
    var mat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), mat);
    scene.add(mesh);

    // the plane: as wide as the stage allows, aspect of the original card (62.5 x 43.75 rem)
    var ASPECT = 62.5 / 43.75;
    var planePx = { w: 1, h: 1 };
    function fit() {
      W = stage.clientWidth || 1; H = stage.clientHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
      var viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      var viewW = viewH * camera.aspect;
      var w = Math.min(viewW * 0.78, viewH * 0.86 * ASPECT);
      var h = w / ASPECT;
      mesh.scale.set(w, h, 1);
      uniforms.uAspect.value = ASPECT;
      planePx.w = w / viewH * H; planePx.h = h / viewH * H; // the plane's size on screen, for the pointer
    }
    fit();
    new ResizeObserver(fit).observe(stage);

    // pointer: tilt target + ripple centre + hover
    var tilt = { x: 0, y: 0 }, tiltTo = { x: 0, y: 0 };
    var hover = { v: 0 };
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      tiltTo.y = nx * 0.35; tiltTo.x = -ny * 0.3;
      // pointer in plane uv (the plane sits in the middle of the stage)
      uniforms.uMouse.value.set(0.5 + nx * r.width / planePx.w, 0.5 - ny * r.height / planePx.h);
    });
    stage.addEventListener('pointerleave', function () { tiltTo.x = 0; tiltTo.y = 0; });
    link.addEventListener('pointerenter', function () { gsap.to(hover, { v: 1, duration: 0.8, ease: 'power2.out' }); gsap.to(uniforms.uRipple, { value: 1, duration: 0.6 }); });
    link.addEventListener('pointerleave', function () { gsap.to(hover, { v: 0, duration: 1.0, ease: 'power2.out' }); gsap.to(uniforms.uRipple, { value: 0, duration: 0.8 }); });

    // scroll: the card rotates in as the section arrives, and drifts a little on the way through
    var scrollRot = { x: 0.5 };
    if (window.ScrollTrigger) {
      gsap.to(scrollRot, { x: 0, ease: 'none', scrollTrigger: { trigger: section, start: 'top 90%', end: 'top 25%', scrub: 0.6 } });
    } else scrollRot.x = 0;

    var t0 = performance.now();
    var raf = 0;
    function tick() {
      if (!section.isConnected) { cancelAnimationFrame(raf); renderer.dispose(); return; }
      var now = performance.now();
      uniforms.uTime.value = (now - t0) / 1000;
      uniforms.uHover.value = hover.v;
      tilt.x += (tiltTo.x - tilt.x) * 0.06;
      tilt.y += (tiltTo.y - tilt.y) * 0.06;
      mesh.rotation.x = tilt.x + scrollRot.x;
      mesh.rotation.y = tilt.y;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    tick();
  }).catch(function (e) { console.warn('teaser: three failed to load', e); });
})();
