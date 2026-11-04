// Records a tour of echocreativeagency.nl being USED, as a clip for the band: the Ons Verhaal page
// comes in, the pointer hovers the photo collage of the story section, sweeps the team cards so
// they spin on their momentum hover, opens the menu and wanders over its items, picks Projects,
// steps the cascading slider and clicks into a project (the site's page transition), scrolls the
// case page a bit and drags its photo strip. Same recipe as record-echo-home.js: fake clock, one
// 1/30 s step per frame, screenshot per frame, timers on the fake clock, a drawn cursor (the
// headless screenshot has none) that takes the hand where the page asks for one.
//   node media/record-echo-tour.js <out.mp4> [--project=1]
//     --project=N  how many times the Projects slider is stepped before the active card is clicked
//   PROBE=1 node media/record-echo-tour.js <dir>   -> a shot every 0.5 s into <dir> instead of a clip
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--'));
if (!out) { console.log('usage: node media/record-echo-tour.js <out.mp4> [--project=1]'); process.exit(1); }
const PROJECT_STEPS = +((args.find(a => a.startsWith('--project=')) || '').slice(10) || 1);
const PROBE = !!process.env.PROBE;
const SITE = 'https://echocreativeagency.nl';
const FPS = 30, STEP = 1000 / FPS;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const frames = PROBE ? out : fs.mkdtempSync('/tmp/clip-');
fs.mkdirSync(frames, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1176 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    const base = Date.now();
    const vt = { now: 0, q: [], id: 0, timers: [], tid: 0 };
    window.__vt = vt;
    performance.now = () => vt.now;
    Date.now = () => base + vt.now;
    window.requestAnimationFrame = cb => { const id = ++vt.id; vt.q.push({ id, cb }); return id; };
    window.cancelAnimationFrame = id => { vt.q = vt.q.filter(x => x.id !== id); };
    window.setTimeout = (cb, ms, ...a) => { const id = ++vt.tid; vt.timers.push({ id, at: vt.now + Math.max(0, +ms || 0), cb, a }); return id; };
    window.setInterval = (cb, ms, ...a) => { const id = ++vt.tid; vt.timers.push({ id, at: vt.now + Math.max(1, +ms || 1), every: Math.max(1, +ms || 1), cb, a }); return id; };
    window.clearTimeout = window.clearInterval = id => { vt.timers = vt.timers.filter(t => t.id !== id); };
    // The drawn cursor: an arrow, or the open / closed hand where the page sets cursor grab / grabbing
    const ICON = {
      arrow: '<svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 1.5v18.6l4.6-4.1 3.1 7.1 3.5-1.5-3.1-7h6.3z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      grab: '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M8 13V6.5a1.6 1.6 0 0 1 3.2 0V12m0-7a1.6 1.6 0 0 1 3.2 0v7m0-5.5a1.6 1.6 0 0 1 3.2 0V13m0-3a1.6 1.6 0 0 1 3.2 0v7.5c0 4-2.8 6.5-6.6 6.5h-1.2c-2.5 0-4.3-1.1-5.6-3L4.3 16.4a1.7 1.7 0 0 1 2.6-2.1L8 16" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>',
      grabbing: '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M8.5 14v-3.5a1.5 1.5 0 0 1 3 0V13m0-3a1.5 1.5 0 0 1 3 0v3m0-2.5a1.5 1.5 0 0 1 3 0V13m0-1a1.5 1.5 0 0 1 3 0v5.5c0 4-2.8 6.5-6.6 6.5h-1.2c-2.5 0-4.3-1.1-5.6-3L5.3 18a1.6 1.6 0 0 1 2.5-2L8.5 17" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>'
    };
    let cur = null, icon = '';
    window.__cursor = (x, y, down) => {
      if (!cur) {
        cur = document.createElement('div');
        cur.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;will-change:transform;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35))';
        document.documentElement.appendChild(cur);
      }
      const el = document.elementFromPoint(x, y);
      const c = el ? getComputedStyle(el).cursor : 'default';
      const want = down ? (c === 'grab' || c === 'grabbing' ? 'grabbing' : 'arrow') : (c === 'grab' ? 'grab' : 'arrow');
      if (want !== icon) { icon = want; cur.innerHTML = ICON[want]; cur.style.marginLeft = want === 'arrow' ? '-2px' : '-13px'; cur.style.marginTop = want === 'arrow' ? '-1px' : '-13px'; }
      cur.style.transform = `translate(${x}px,${y}px)`;
    };
    window.__step = ms => {
      vt.now += ms;
      const q = vt.q; vt.q = [];
      for (const { cb } of q) { try { cb(vt.now); } catch (e) {} }
      let due;
      while ((due = vt.timers.filter(t => t.at <= vt.now).sort((a, b) => a.at - b.at)).length) {
        for (const t of due) {
          vt.timers = vt.timers.filter(x => x !== t);
          if (t.every) { t.at += t.every; vt.timers.push(t); }
          try { typeof t.cb === 'function' ? t.cb(...t.a) : (0, eval)(String(t.cb)); } catch (e) {}
        }
      }
    };
  });
  const page = await context.newPage();
  await page.route(/googletagmanager|google-analytics|hotjar|clarity|facebook/i, r => r.abort());
  const eagerImages = () => page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach(i => { if (i.loading === 'lazy') i.loading = 'eager'; });
    await Promise.all(imgs.map(i => i.decode().catch(() => {})));
    return imgs.filter(i => i.complete && i.naturalWidth).length + '/' + imgs.length;
  });
  // Warm the cache with the pages the tour transitions to, so nothing pops in mid-clip
  for (const p of ['/projects', '/projects/club-caddie', '/projects/hotel-miss-blanche']) {
    await page.goto(SITE + p, { waitUntil: 'networkidle', timeout: 90000 });
    console.log('warmed', p, await eagerImages());
  }
  await page.goto(SITE + '/ons-verhaal', { waitUntil: 'networkidle', timeout: 90000 });
  console.log('images', await eagerImages(), 'fine pointer:', await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches));
  const client = await context.newCDPSession(page);
  await client.send('Animation.enable'); await client.send('Animation.setPlaybackRate', { playbackRate: 0.45 });

  // ---- the frame loop: input for the frame, one clock step, one screenshot
  const shotEvery = PROBE ? 15 : 1;
  const mouse = { x: 980, y: 1000, down: false };
  let f = 0, n = 0, capturing = false;
  const t0 = Date.now();
  const marks = [];
  const mark = label => { marks.push([(f / FPS).toFixed(1) + 's', label]); console.log('  ' + (f / FPS).toFixed(1) + 's', label); };
  async function frame() {
    await page.evaluate(([ms, m]) => { window.__step(ms); window.__cursor(m.x, m.y, m.down); }, [STEP, mouse]);
    if (capturing) {
      if (f % shotEvery === 0) await page.screenshot({ path: path.join(frames, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
      f++;
      if (f % 150 === 0) console.log('frame', f, Math.round((Date.now() - t0) / 1000) + 's real');
    }
  }
  const hold = async sec => { for (let i = 0; i < Math.round(sec * FPS); i++) await frame(); };
  const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
  const setScroll = y => page.evaluate(y => { if (typeof lenis !== 'undefined' && lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, y);
  async function scrollTo(y, sec) {
    const from = await scrollY(); const k = Math.round(sec * FPS);
    for (let i = 1; i <= k; i++) { await setScroll(Math.round(from + (y - from) * ease(i / k))); await frame(); }
  }
  // Eased pointer move with a slight bow, one mouse event per frame (the site samples velocity per frame)
  async function moveTo(x, y, sec, bow = 0.12) {
    const sx = mouse.x, sy = mouse.y, k = Math.max(1, Math.round(sec * FPS));
    const dx = x - sx, dy = y - sy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 1; i <= k; i++) {
      const p = ease(i / k), b = Math.sin(Math.PI * p) * bow * len;
      mouse.x = sx + dx * p + nx * b; mouse.y = sy + dy * p + ny * b;
      await page.mouse.move(mouse.x, mouse.y); await frame();
    }
  }
  // Straight move at a steady pace (for the sweeps that give the team cards their spin)
  async function sweepTo(x, y, sec) {
    const sx = mouse.x, sy = mouse.y, k = Math.max(1, Math.round(sec * FPS));
    for (let i = 1; i <= k; i++) { mouse.x = sx + (x - sx) * i / k; mouse.y = sy + (y - sy) * i / k; await page.mouse.move(mouse.x, mouse.y); await frame(); }
  }
  async function click() { await page.mouse.down(); mouse.down = true; await hold(4 / FPS); await page.mouse.up(); mouse.down = false; await hold(2 / FPS); }
  async function drag(x, y, sec) { await page.mouse.down(); mouse.down = true; await hold(3 / FPS); await moveTo(x, y, sec, 0.02); await page.mouse.up(); mouse.down = false; }
  const rect = (sel, i = 0) => page.evaluate(([sel, i]) => { const el = document.querySelectorAll(sel)[i]; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }, [sel, i]);
  const rects = sel => page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30) }; }), sel);
  const docY = async sel => { const r = await rect(sel); return r ? Math.round(r.y + await scrollY()) : 0; };
  const isLoaded = () => page.evaluate(() => document.documentElement.classList.contains('is-loaded'));

  // ---- 1. the page loader: step the clock until the panel starts lifting, then record
  for (let i = 0; i < 12 * FPS && !(await isLoaded()); i++) await frame();
  capturing = true; mark('Ons Verhaal: panel lifts');
  await hold(3.0); // the hero's photos open up and the title slides in (settled at ~2.6 s)

  // ---- 2. the story gallery: scroll it into view and hover three of the photos
  const galleryTop = await docY('[data-interactive-collage-init]');
  const galleryH = (await rect('[data-interactive-collage-init]')).h;
  mark('scroll to the gallery'); await scrollTo(Math.round(galleryTop - (1176 - galleryH) / 2), 1.1);
  let items = (await rects('[data-interactive-collage-item]')).sort((a, b) => a.cx - b.cx);
  console.log('  gallery items', items.length);
  mark('hover the gallery');
  await moveTo(items[0].cx, items[0].cy, 0.4); await hold(0.35);
  for (const i of [3, 6].filter(i => i < items.length)) {
    items = (await rects('[data-interactive-collage-item]')).sort((a, b) => a.cx - b.cx);
    await moveTo(items[i].cx, items[i].cy + (i % 2 ? 20 : -20), 0.4); await hold(0.35);
  }
  await moveTo(mouse.x + 60, mouse.y + 260, 0.3); // off the gallery, it settles

  // ---- 3. the team: two quick sweeps so the cards spin, on to the menu while they settle
  const teamTop = await docY('[data-momentum-hover-init]');
  const teamH = (await rect('[data-momentum-hover-init]')).h;
  mark('scroll to the team'); await scrollTo(Math.round(teamTop - (1176 - teamH) / 2), 1.0);
  const cards = (await rects('[data-momentum-hover-element]')).sort((a, b) => a.cx - b.cx);
  console.log('  team cards', cards.length, cards.map(c => c.text).join(' | '));
  const first = cards[0], last = cards[cards.length - 1];
  mark('sweep the team');
  await moveTo(first.x - 70, first.cy + 40, 0.3);
  await sweepTo(last.x + last.w + 70, last.cy - 50, 1.0);
  await hold(0.25);
  await sweepTo(first.x - 70, first.cy + 60, 1.0);
  await hold(0.5);

  // ---- 4. the menu: open it, a quick look at two items, pick Projects
  const toggle = await rect('[data-underlay-nav-toggle]');
  mark('open the menu'); await moveTo(toggle.cx, toggle.cy, 0.6); await click();
  await hold(0.8);
  const links = await rects('[data-underlay-nav-menu] [data-reveal-l] a, [data-underlay-nav-menu] a[data-reveal-l]');
  console.log('  menu links', links.map(l => l.text + '@' + Math.round(l.cx) + ',' + Math.round(l.cy)).join(' '));
  const byText = t => links.find(l => l.text.toLowerCase().startsWith(t));
  for (const t of ['services', 'collective']) { const l = byText(t); if (l) { await moveTo(l.x + 40, l.cy, 0.35); await hold(0.2); } }
  const projects = byText('projects') || links[1];
  mark('click Projects'); await moveTo(projects.x + 40, projects.cy, 0.35); await hold(0.15); await click();
  await hold(2.5); // leave + enter of the page transition

  // ---- 5. Projects: step the slider, click into the active project, pointer off the card so
  //         its cursor marquee leaves before the transition panel comes up
  console.log('  url', page.url());
  await eagerImages();
  const next = await rect('[data-cascading-slider-next]');
  mark('step the slider'); await moveTo(next.cx, next.cy, 0.5);
  for (let i = 0; i < PROJECT_STEPS; i++) { await click(); await hold(0.7); }
  const active = await rect('[data-cascading-slide][data-status="active"]');
  console.log('  active slide', await page.evaluate(() => document.querySelector('[data-cascading-slide][data-status="active"]')?.getAttribute('href')));
  mark('click the project'); await moveTo(active.cx - 60, active.cy - 40, 0.5); await hold(0.2); await click();
  await moveTo(active.cx + 180, active.cy + 330, 0.5);
  await hold(2.1);

  // ---- 6. the case page: scroll down a bit, drag the photo strip
  console.log('  url', page.url());
  await eagerImages();
  mark('case page'); await hold(0.4);
  const stripTop = await docY('[data-drag-gallery]');
  mark('scroll the case'); await scrollTo(Math.max(0, stripTop - 150), 0.9);
  const strip = await rect('[data-drag-gallery]');
  mark('drag the strip'); await moveTo(strip.x + strip.w * 0.72, strip.cy + 20, 0.5); await hold(0.15);
  await drag(strip.x + strip.w * 0.18, strip.cy - 10, 0.8);
  await hold(2.4);
  mark('end');

  console.log('frames', f, 'seconds', (f / FPS).toFixed(1), 'real', Math.round((Date.now() - t0) / 1000) + 's');
  await browser.close();
  if (PROBE) { console.log('probe shots in', frames); return; }
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${frames}/f%05d.jpg -vf "scale=900:-2" -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -movflags +faststart "${out}"`);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
  console.log(marks.map(m => m.join(' ')).join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
