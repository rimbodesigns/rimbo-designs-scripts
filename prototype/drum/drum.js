// Drum lab: the home V4 drum (seven cards on a cylinder, 22° apart, the axis behind the front card, as Osmo's
// spatial slider lays them out) and ten things it could do. One scrubber plays the hero's scroll-away (p, 0 to 1)
// for every stage at once; a click enlarges one stage and gives its cards the real clips.
(function () {
  'use strict';
  var CARDS = [
    { name: 'Digital Feng Shui', src: '/media/dfs-home-test.mp4', poster: 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/6aa42d7d36f358a8814102d0_PNG%20to%20AVIF%20Cover%20v2.avif', rate: 2 },
    { name: 'Echo Creative Agency', src: '/media/echo.mp4', poster: '/media/echo/echo-preview-a.jpg', rate: 1.5 },
    { name: 'Meet Tinko', src: '/media/tinko.mp4', poster: '/media/tinko-cover.jpg', rate: 2 },
    { name: "Charlie's Angels", src: '/media/charlies-angels.mp4', poster: 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/6811f08989345b3409601f8b_Charlies_angels.avif', rate: 1.5 },
    { name: 'Digital Feng Shui · course', src: '/media/dfs-home.mp4', poster: '/media/dfs-course-cover.jpg', rate: 1.5 },
    { name: 'Dieronesie', src: '/media/dieronesie.mp4', poster: 'https://cdn.prod.website-files.com/5b9ab5ab7d8a747bcc7b3216/68f63e4c1c1c36bdbb3f83d2_V1_dieronesie.avif', rate: 1.5 },
    { name: 'Echo Creative Agency · in use', src: '/media/echo-tour.mp4', poster: '/media/echo/echo-preview-hover.jpg', rate: 1.5 }
  ];
  var STEP = 22; // degrees per card, as on staging
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (q) { q = clamp(q, 0, 1); return 1 - Math.pow(1 - q, 3); }; // cubic out
  var win = function (p, from, len) { return ease((p - from) / len); }; // 0→1 over a window of p
  var rad = Math.PI / 180;

  // ---- one drum
  function makeDrum(host, opts) {
    opts = opts || {};
    var n = 16, cardW = 0.24, stepDeg = 360 / n; // the full ring: sixteen cards 22.5° apart (staging: 22°), the seven clips repeating, the back row hidden
    var view = document.createElement('div'); view.className = 'view';
    var pivot = document.createElement('div'); pivot.className = 'pivot';
    var drum = document.createElement('div'); drum.className = 'drum';
    view.appendChild(pivot); pivot.appendChild(drum); host.appendChild(view);
    var cards = [];
    for (var i = 0; i < n; i++) {
      var c = CARDS[i % CARDS.length], el = document.createElement('div'); el.className = 'card';
      var img = document.createElement('img'); img.src = c.poster; img.alt = ''; img.draggable = false; el.appendChild(img);
      var gloss = document.createElement('div'); gloss.className = 'card-gloss'; el.appendChild(gloss);
      drum.appendChild(el);
      // a: the card's angle on the cylinder (0 = the front card); the arc centres its seven, the ring goes all the way round
      cards.push({ el: el, img: img, gloss: gloss, data: c, a: (i <= 8 ? i : i - n) * stepDeg, k: i <= 8 ? i : i - n, selfTip: 0, fx: 0, fy: 0, frot: 0, hide: false });
    }
    var d = {
      el: view, pivot: pivot, drum: drum, cards: cards, step: stepDeg,
      R: 0, W: 0, H: 0,
      turn: 0,      // cards turned (the drum rolls like the scroll turn on staging)
      tipFront: 0,  // degrees the drum tips about its front plane (the staging exit)
      tipAxis: 0,   // degrees it tips about its own axis (the roulette)
      scale: 1, zoom: 1, dx: 0, dy: 0, orbitX: 0, orbitY: 0, persp: 1,
      gloss: false, lightAt: 25
    };
    d.measure = function () {
      var r = host.getBoundingClientRect(); d.W = r.width; d.H = r.height;
      var w = d.W * cardW, gap = d.W * 0.025;
      d.R = (w + gap) / (2 * Math.sin(stepDeg / 2 * rad));
      host.style.setProperty('--card-w', w.toFixed(1) + 'px');
    };
    d.render = function () {
      var P = d.W * 0.75 * d.persp;
      view.style.perspective = P.toFixed(0) + 'px';
      pivot.style.transform = 'translate3d(' + d.dx.toFixed(1) + 'px,' + d.dy.toFixed(1) + 'px,0) scale(' + d.zoom.toFixed(3) + ') rotateY(' + d.orbitY.toFixed(2) + 'deg) rotateX(' + (d.tipFront + d.orbitX).toFixed(2) + 'deg)';
      drum.style.transform = 'translateZ(' + (-d.R).toFixed(1) + 'px) scale(' + d.scale.toFixed(3) + ') rotateX(' + d.tipAxis.toFixed(2) + 'deg) rotateY(' + (-d.turn * stepDeg).toFixed(2) + 'deg)';
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        c.el.style.transform = 'rotateY(' + c.a.toFixed(2) + 'deg) translateZ(' + d.R.toFixed(1) + 'px) rotateX(' + (-d.tipAxis + c.selfTip).toFixed(2) + 'deg) translate3d(' + c.fx.toFixed(1) + 'px,' + c.fy.toFixed(1) + 'px,0) rotate(' + c.frot.toFixed(2) + 'deg)';
        c.el.style.visibility = c.hide ? 'hidden' : '';
        if (d.gloss) { var wa = c.a - d.turn * stepDeg, k = Math.cos((wa - d.lightAt) * rad); c.gloss.style.opacity = (Math.pow(Math.max(0, k), 12) * 0.6).toFixed(3); }
      }
    };
    d.reset = function () { d.turn = 0; d.tipFront = 0; d.tipAxis = 0; d.scale = 1; d.zoom = 1; d.dx = 0; d.dy = 0; d.persp = 1; cards.forEach(function (c) { c.selfTip = 0; c.fx = 0; c.fy = 0; c.frot = 0; c.hide = false; }); };
    d.clips = function (on) { // the real clips for the enlarged stage; posters everywhere else (70 videos would be too many)
      cards.forEach(function (c) {
        var v = c.el.querySelector('video');
        if (on && !v) { v = document.createElement('video'); v.src = c.data.src; v.poster = c.data.poster; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.playbackRate = c.data.rate; c.el.insertBefore(v, c.gloss); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!on && v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }
      });
    };
    d.measure(); d.render();
    return d;
  }

  // ---- the ideas. update(stage, p, t, pointer) sets the drum's state for this scroll position (p) and moment (t, s)
  var IDEAS = [
    { id: 'now', name: 'Now: tips 60°', cost: 'on staging', copy: true,
      note: 'What is live: the whole drum tips about its front plane as the hero scrolls away, 60° by the end, while it turns two cards.',
      update: function (s, p) { s.d.turn = 2 * p; s.d.tipFront = 60 * p; s.leave(p); } },
    { id: 'louvres', name: 'Louvres', cost: 'cheap', copy: true,
      note: 'The drum stays put; each card tips on its own axis, the middle one first and the rest following outward, like blind slats closing.',
      update: function (s, p) { s.d.turn = 2 * p; s.d.cards.forEach(function (c, i) { c.selfTip = 84 * win(p, Math.abs(c.k) * 0.08, 0.55); }); s.leave(p * 0.55); } },
    { id: 'deal', name: 'Deal', cost: 'cheap', copy: true,
      note: 'The cards fly off the drum in their own directions, with a stagger from the middle, like a dealer clearing the table.',
      update: function (s, p) { s.d.turn = 2 * p; var W = s.d.W; s.d.cards.forEach(function (c, i) { var q = win(p, Math.abs(c.k) * 0.1, 0.9), ang = c.k * 0.55 - 1.5; c.fx = Math.cos(ang) * W * 0.8 * q; c.fy = Math.sin(ang) * W * 0.7 * q - W * 0.2 * q; c.frot = c.k * 14 * q; }); s.leave(p * 0.35); } },
    { id: 'roulette', name: 'Roulette', cost: 'big', next: 'Work', sub: 'the next section rises in the middle',
      note: 'Your idea: the scroll lifts the camera until you look down on the drum, each card turning face-up, so it becomes a ring of tiles with the next section rising in its middle. The ring keeps turning like a wheel.',
      update: function (s, p, t) { var e = ease(p / 0.7); s.d.tipAxis = 90 * e; s.d.scale = 1 - 0.42 * e; s.d.turn = 2 * p + (p > 0.7 ? (p - 0.7) * 6 : 0); s.nextShow(win(p, 0.55, 0.35)); } },
    { id: 'fly', name: 'Fly-through', cost: 'medium', next: 'Work', sub: 'you came in through the drum',
      note: 'Instead of scrolling up, the camera pushes forward through the gap beside the middle card, the cards pass by the edges, and the next section is already there behind them.',
      update: function (s, p) { var e = ease(p / 0.85), gapX = s.d.W * 0.1325; s.d.zoom = 1 + 4.5 * e; s.d.dx = -gapX * s.d.zoom * e; s.d.dy = s.d.H * 0.04 * e; s.d.turn = 0.3 * p; s.nextShow(win(p, 0.55, 0.35)); } }, // the gap right of the middle card drifts to the centre as the camera comes in
    { id: 'orbit', name: 'Orbit', cost: 'medium', copy: true,
      note: 'The scroll walks the camera round the drum: it turns five cards instead of two while the camera comes in close, so cards sweep past the edges on their way round.',
      update: function (s, p) { s.d.turn = 5 * p; s.d.zoom = 1 + 0.5 * ease(p / 0.6); s.d.dy = s.d.H * 0.1 * ease(p / 0.6); s.leave(p * 0.7); } },
    { id: 'gloss', name: 'Gloss sweep', cost: 'cheap', copy: true, drift: true,
      note: 'A soft highlight sits where the light hits each card and slides across it as the drum turns, so the cards read as glossy tiles, not flat videos. Here the drum turns on its own to show it.',
      update: function (s, p, t) { s.d.gloss = true; s.d.turn = 2 * p + t * 0.08; s.d.tipFront = 60 * p; s.leave(p); } },
    { id: 'counter', name: 'The counter', cost: 'cheap', copy: true, counter: true,
      note: 'The one-two-three made visible: a small counter under the drum ticks with every step and with the scroll turn, so the mechanism is the point.',
      update: function (s, p, t) { var stepT = 2.2, k = Math.floor(t / stepT), f = (t - k * stepT) / stepT, move = clamp(f / 0.45, 0, 1); var auto = k + ease(move); s.d.turn = auto + 2 * p; var idx = ((Math.round(s.d.turn) % 16 + 16) % 16) % 7; s.counter.innerHTML = '<b>0' + (idx + 1) + '</b> / 07'; s.d.tipFront = 60 * p; s.leave(p); } },
    { id: 'pointer', name: 'Pointer orbit', cost: 'cheap', copy: true,
      note: 'The drum leans a few degrees toward the pointer, about its own axis, the spatial version of the old band tilt. Move the mouse over the stage.',
      update: function (s, p, t, ptr) { s.d.turn = 2 * p; s.d.tipFront = 60 * p; s.aimY += ((ptr ? ptr.x * 9 : 0) - s.aimY) * 0.08; s.aimX += ((ptr ? -ptr.y * 6 : 0) - s.aimX) * 0.08; s.d.orbitY = s.aimY; s.d.orbitX = s.aimX; s.leave(p); } },
    { id: 'reflection', name: 'Reflection', cost: 'medium', copy: true, reflect: true,
      note: 'A faint mirrored drum under the real one, fading out, the same trick as the clone canvases turned upside down. It tips and turns with the drum.',
      update: function (s, p) { s.d.turn = 2 * p; s.d.tipFront = 60 * p; if (s.r) { s.r.turn = s.d.turn; s.r.tipFront = -s.d.tipFront; } s.leave(p); } }
  ];

  // ---- build the grid
  var grid = document.getElementById('grid'), stages = [];
  IDEAS.forEach(function (idea, i) {
    var cell = document.createElement('section'); cell.className = 'lab-cell'; cell.dataset.idea = idea.id;
    cell.innerHTML = '<div class="lab-meta"><span class="lab-num">' + (i < 9 ? '0' : '') + (i + 1) + '</span><span class="lab-name">' + idea.name + '</span><span class="lab-cost' + (idea.cost === 'on staging' ? ' is-staging' : '') + '">' + idea.cost + '</span></div><p class="lab-note">' + idea.note + '</p><div class="lab-stage"><div class="scene">' + (idea.copy ? '<div class="scene-copy">Unlock your next level</div>' : '') + '</div>' + (idea.next ? '<div class="scene-next">' + idea.next + '<small>' + idea.sub + '</small></div>' : '') + (idea.counter ? '<div class="counter"><b>01</b> / 07</div>' : '') + '</div>';
    grid.appendChild(cell);
    var stage = cell.querySelector('.lab-stage'), scene = cell.querySelector('.scene');
    var s = { idea: idea, cell: cell, stage: stage, scene: scene, copyEl: cell.querySelector('.scene-copy'), nextEl: cell.querySelector('.scene-next'), counter: cell.querySelector('.counter'), aimX: 0, aimY: 0, ptr: null };
    s.d = makeDrum(scene);
    if (idea.reflect) { var rf = document.createElement('div'); rf.className = 'reflect'; scene.appendChild(rf); s.r = makeDrum(rf); }
    s.leave = function (q) { // the hero scrolls away: the scene moves up, the copy is gone within the first 12%
      scene.style.transform = 'translateY(' + (-q * s.d.H).toFixed(1) + 'px)';
      if (s.copyEl) s.copyEl.style.opacity = (1 - clamp(q / 0.12, 0, 1)).toFixed(2);
    };
    s.nextShow = function (q) { if (s.nextEl) s.nextEl.style.opacity = q.toFixed(2); };
    stage.addEventListener('pointermove', function (e) { var r = stage.getBoundingClientRect(); s.ptr = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 }; });
    stage.addEventListener('pointerleave', function () { s.ptr = null; });
    stage.addEventListener('click', function () { focus(s); });
    stages.push(s);
  });

  var focused = null;
  function focus(s) {
    var on = focused !== s;
    stages.forEach(function (x) { x.cell.classList.toggle('is-on', on && x === s); if (!on || x !== s) x.d.clips(false); });
    grid.classList.toggle('is-focus', on);
    focused = on ? s : null;
    if (on) s.d.clips(true);
    requestAnimationFrame(function () { stages.forEach(function (x) { x.d.measure(); if (x.r) x.r.measure(); }); });
  }
  new ResizeObserver(function () { stages.forEach(function (x) { x.d.measure(); if (x.r) x.r.measure(); }); }).observe(grid);

  // ---- the scrubber and the loop
  var scrub = document.getElementById('scrub'), scrubV = document.getElementById('scrubv'), play = document.getElementById('play');
  var p = 0, playing = false, playT = 0;
  scrub.addEventListener('input', function () { p = scrub.value / 1000; if (playing) stop(); });
  function stop() { playing = false; play.classList.remove('is-on'); play.textContent = 'Play'; }
  play.addEventListener('click', function () { playing = !playing; playT = 0; play.classList.toggle('is-on', playing); play.textContent = playing ? 'Stop' : 'Play'; });
  document.addEventListener('keydown', function (e) { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); play.click(); } });
  var t0 = performance.now(), last = t0;
  (function loop(now) {
    var dt = (now - last) / 1000, t = (now - t0) / 1000; last = now;
    if (playing) { // down over 2.4 s, hold, back up over 1.2 s, hold: the scroll as a visitor would do it
      playT += dt; var c = playT % 5.2;
      p = c < 2.4 ? c / 2.4 : c < 3.2 ? 1 : c < 4.4 ? 1 - (c - 3.2) / 1.2 : 0;
      scrub.value = Math.round(p * 1000);
    }
    scrubV.textContent = Math.round(p * 100) + '%';
    stages.forEach(function (s) {
      if (focused && s !== focused) return;
      s.d.reset(); if (s.r) s.r.reset();
      s.idea.update(s, p, t, s.ptr);
      s.d.render(); if (s.r) s.r.render();
    });
    requestAnimationFrame(loop);
  })(t0);
})();
