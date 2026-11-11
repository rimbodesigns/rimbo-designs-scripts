// The arcade lab's panel: every effect is a switch and a slider, on the real game.
// Ready-made mixes on top; anything you change is kept as "Mine" (in this browser), so picking a mix never loses your own.
(function () {
  var root = document.querySelector('[data-bots]'), stage = document.querySelector('.fx_stage'), panel = document.querySelector('.fxp'), tab = document.querySelector('.fxp_tab');
  rdBots(root);
  var fx = rdBotsFx(root);
  if (!fx) { panel.innerHTML = '<div class="fxp_head"><b>Arcade lab</b></div><p class="fxp_note">This browser cannot run the screen effects (they need WebGL 2). The game itself still works.</p>'; return; }

  // key, name, kind: '' = switch + amount, 'sub' = amount only (belongs to the row above), 'sw' = switch only
  var GROUPS = [
    ['The screen', [
      ['curve', 'Curved glass'], ['scan', 'Scanlines'], ['line', 'Line size', 'sub', 'scan'], ['mask', 'Phosphor stripes'],
      ['vig', 'Dark corners'], ['flicker', 'Flicker'], ['bar', 'Rolling bar'], ['bezel', 'Cabinet frame', 'sw']
    ]],
    ['The picture', [
      ['glow', 'Glow'], ['glowSize', 'Glow size', 'sub', 'glow'], ['dither', 'Glow in dots'], ['fringe', 'Colour fringing'], ['trails', 'Light trails'],
      ['soft', 'Soft focus'], ['grain', 'Static'], ['wobble', 'Tape wobble'], ['swirl', 'Swirl in the sky'], ['text', 'Titles join in']
    ]],
    ['The moments', [
      ['hitstop', 'Freeze on a kill'], ['flash', 'Flash on a kill'], ['glitch', 'Glitch when hit'], ['negative', 'Negative when hit', 'sw'],
      ['punch', 'Punch on big hits'], ['surge', 'Surge on the jump'], ['power', 'Switch on and off', 'sw']
    ]]
  ];
  var ROWS = []; GROUPS.forEach(function (g) { g[1].forEach(function (r) { ROWS.push({ k: r[0], name: r[1], kind: r[2] || '', of: r[3] }); }); });
  // where a slider stands while its effect is off
  var REST = { curve: .35, scan: .4, line: .35, mask: .3, vig: .45, flicker: .4, bar: .5, bezel: 1, glow: .5, glowSize: .5, dither: .7, fringe: .35, trails: .45, soft: .35, grain: .3, wobble: .5, swirl: .6, text: .5, hitstop: .4, flash: .5, glitch: .6, negative: 1, punch: .5, surge: .6, power: 1 };
  var MIXES = [
    ['now', 'Now', {}],
    ['arcade', 'Arcade', { curve: .35, scan: .38, line: .35, mask: .22, vig: .45, glow: .55, glowSize: .5, fringe: .3, grain: .2, text: .5, hitstop: .4, flash: .5, glitch: .6, punch: .5, surge: .6, power: 1 }],
    ['tube', 'Soft tube', { curve: .2, scan: .2, line: .5, vig: .3, glow: .7, glowSize: .85, soft: .35, trails: .45, text: .6, flash: .3, punch: .3, surge: .5, power: 1 }],
    ['tape', 'Worn tape', { scan: .3, line: .2, vig: .5, glow: .4, glowSize: .4, fringe: .65, wobble: .6, grain: .55, bar: .6, flicker: .4, soft: .3, text: .4, glitch: .9, negative: 1, flash: .4, surge: .7 }],
    ['all', 'Everything', { curve: .55, scan: .45, line: .45, mask: .45, vig: .55, bar: .3, bezel: 1, glow: .7, glowSize: .6, dither: .8, fringe: .5, trails: .5, grain: .3, swirl: .7, text: .6, hitstop: .6, flash: .7, glitch: .8, negative: 1, punch: .8, surge: .9, power: 1 }],
    ['mine', 'Mine', null]
  ];
  var STORE = 'rd-bots-fx-lab', saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) {}

  function fromMix(m) { var s = {}; ROWS.forEach(function (r) { var v = m && m[r.k]; s[r.k] = { on: r.kind === 'sub' || v > 0, v: v > 0 ? v : REST[r.k] }; }); return s; }
  function clean(s) { var o = fromMix({}); if (s) ROWS.forEach(function (r) { var q = s[r.k]; if (q && typeof q.v === 'number') o[r.k] = { on: r.kind === 'sub' || !!q.on, v: Math.max(.01, Math.min(1, q.v)) }; }); return o; }
  function mix(id) { for (var i = 0; i < MIXES.length; i++) if (MIXES[i][0] === id) return MIXES[i]; return MIXES[1]; }

  var mine = saved.mine ? clean(saved.mine) : null, pick = mix(saved.pick)[0];
  if (pick === 'mine' && !mine) pick = 'arcade';
  var S = pick === 'mine' ? clean(mine) : fromMix(mix(pick)[2]);

  function flat() { var o = {}; ROWS.forEach(function (r) { o[r.k] = S[r.k].on ? S[r.k].v : 0; }); return o; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ pick: pick, mine: mine })); } catch (e) {} }
  function resized() { window.dispatchEvent(new Event('resize')); }
  function apply() {
    var f = flat(), frame = f.bezel > 0;
    if (stage.hasAttribute('data-bezel') !== frame) { stage.toggleAttribute('data-bezel', frame); resized(); }
    fx.set(f);
  }

  // ---- the panel ----------------------------------------------------------------------------------
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var head = el('div', 'fxp_head'), fps = el('span', 'fxp_fps', '60 fps'), hide = el('button', 'fxp_link', 'Hide');
  head.appendChild(el('b', '', 'Arcade lab')); head.appendChild(fps); head.appendChild(hide); hide.type = 'button';
  panel.appendChild(head);

  var set = el('div', 'fxp_set'), mixBtn = {};
  MIXES.forEach(function (m) {
    var b = el('button', '', m[1]); b.type = 'button'; mixBtn[m[0]] = b; set.appendChild(b);
    b.addEventListener('click', function () {
      if (m[0] === 'mine' && !mine) return;
      pick = m[0]; S = pick === 'mine' ? clean(mine) : fromMix(m[2]);
      save(); paint(); apply();
    });
  });
  panel.appendChild(set);
  var holdBtn = el('button', 'fxp_hold', 'Hold to see it as it is now'); holdBtn.type = 'button'; panel.appendChild(holdBtn);
  function compare(off) { fx.enable(!off); if (stage.hasAttribute('data-bezel') && off || !off && flat().bezel > 0 && !stage.hasAttribute('data-bezel')) { stage.toggleAttribute('data-bezel', !off); resized(); } }
  holdBtn.addEventListener('pointerdown', function (ev) { holdBtn.setPointerCapture(ev.pointerId); compare(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) { holdBtn.addEventListener(t, function () { compare(false); }); });

  var ui = {};
  function changed(k) {      // any change by hand becomes "Mine"
    mine = clean(S); pick = 'mine'; save(); paint(); apply();
  }
  GROUPS.forEach(function (g) {
    panel.appendChild(el('div', 'fxp_group', g[0]));
    g[1].forEach(function (r) {
      var k = r[0], kind = r[2] || '', row = el('div', 'fxp_row' + (kind === 'sub' ? ' is-sub' : '')), sw = null, range = null;
      if (kind !== 'sub') {
        sw = el('button', 'fxp_sw'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-label', r[1]);
        sw.addEventListener('click', function () { S[k].on = !S[k].on; changed(k); });
        row.appendChild(sw);
      } else row.appendChild(el('span'));
      row.appendChild(el('span', 'fxp_name', r[1]));
      if (kind !== 'sw') {
        range = el('input'); range.type = 'range'; range.min = 1; range.max = 100; range.step = 1; range.setAttribute('aria-label', r[1] + ' amount');
        range.addEventListener('input', function () { S[k].v = range.value / 100; if (kind !== 'sub') S[k].on = true; changed(k); });
        row.appendChild(range);
      }
      ui[k] = { row: row, sw: sw, range: range, of: r[3] };
      panel.appendChild(row);
    });
    if (g[0] === 'The moments') {
      var tr = el('div', 'fxp_try'); tr.appendChild(el('span', '', 'Try one without playing'));
      [['Kill', function () { fx.react('hit'); }], ['Hit', function () { fx.react('hurt'); }], ['Mothership', function () { fx.react('boom'); }], ['Jump', function () { fx.jump(1.8); }], ['Switch on', function () { fx.power(); }]].forEach(function (t) {
        var b = el('button', '', t[0]); b.type = 'button'; b.addEventListener('click', t[1]); tr.appendChild(b);
      });
      panel.appendChild(tr);
    }
  });

  var foot = el('div', 'fxp_foot'), copy = el('button', 'fxp_copy', 'Copy my mix'); copy.type = 'button';
  foot.appendChild(copy);
  foot.appendChild(el('p', 'fxp_note', 'Whatever you change is kept as Mine, so trying another mix never loses it. Copy my mix puts the numbers on your clipboard: paste them in the chat. P hides this panel.'));
  panel.appendChild(foot);
  copy.addEventListener('click', function () {
    var f = flat(), parts = [];
    ROWS.forEach(function (r) { if (f[r.k] > 0 && (!r.of || f[r.of] > 0)) parts.push(r.kind === 'sw' ? r.k : r.k + ' ' + Math.round(f[r.k] * 100)); });
    var text = '404 arcade mix: ' + (parts.join(', ') || 'everything off');
    function done(ok) { copy.textContent = ok ? 'Copied' : 'Could not copy'; setTimeout(function () { copy.textContent = 'Copy my mix'; }, 1600); }
    function old() { var ta = el('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} ta.remove(); done(ok); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, old); else old();
  });

  function paint() {
    MIXES.forEach(function (m) { var b = mixBtn[m[0]]; b.setAttribute('aria-pressed', String(pick === m[0])); if (m[0] === 'mine') { b.disabled = !mine; b.style.opacity = mine ? '' : '.35'; } });
    ROWS.forEach(function (r) {
      var u = ui[r.k], s = S[r.k], parentOff = r.of && !S[r.of].on;
      if (u.sw) u.sw.setAttribute('aria-checked', String(s.on));
      if (u.range && +u.range.value !== Math.round(s.v * 100)) u.range.value = Math.round(s.v * 100);
      u.row.classList.toggle('is-off', r.kind !== 'sub' && !s.on);
      u.row.classList.toggle('is-idle', !!parentOff);
    });
  }

  // the panel never keeps the keyboard: space and the arrows stay with the game
  function letGo() { setTimeout(function () { var a = document.activeElement; if (a && panel.contains(a)) a.blur(); }, 0); }
  panel.addEventListener('pointerup', letGo); panel.addEventListener('change', letGo);

  function wide(v) { document.body.classList.toggle('is-wide', v); tab.hidden = !v; resized(); }
  hide.addEventListener('click', function () { wide(true); });
  tab.addEventListener('click', function () { wide(false); tab.blur(); });
  window.addEventListener('keydown', function (ev) { if ((ev.key === 'p' || ev.key === 'P') && !ev.metaKey && !ev.ctrlKey && !ev.altKey) wide(!document.body.classList.contains('is-wide')); });
  if (window.matchMedia('(max-width: 800px)').matches) wide(true);

  setInterval(function () { fps.textContent = fx.fps() + ' fps'; }, 500);
  paint(); apply(); fx.power();
  window.rdBotsFxLab = { fx: fx, state: function () { return { pick: pick, flat: flat() }; } };
})();
