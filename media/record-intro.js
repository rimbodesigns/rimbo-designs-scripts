// Records any page FROM ITS FIRST FRAME: the page-load animation plays into the clip, then a short
// scroll, then a hold; the clip fades in and out so its loop reads as a reset. Same recipe as
// record-echo-home.js (fake clock for rAF, performance.now, Date.now, setTimeout, setInterval;
// one 1/30 s step per frame; a screenshot per frame), with the URL as an argument.
//   node media/record-intro.js <url> <out.mp4> [intro=7] [scrollTo=1500] [scrollSeconds=8] [--hide=<css selector>]
//   PROBE=1 node media/record-intro.js <url> <dir>   -> a shot every 0.5 s into <dir> instead of a clip
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const args = process.argv.slice(2);
const hideSel = (args.find(a => a.startsWith('--hide=')) || '').slice(7);
const WIDTH = +((args.find(a => a.startsWith('--width=')) || '').slice(8)) || 1200;
const [URL, out, introArg, toArg, scrollArg] = args.filter(a => !a.startsWith('--hide=') && !a.startsWith('--width='));
if (!URL || !out) { console.log('usage: node media/record-intro.js <url> <out.mp4> [intro] [scrollTo] [scrollSeconds] [--hide=<selector>]'); process.exit(1); }
const PROBE = !!process.env.PROBE;
const FPS = 30, STEP = 1000 / FPS;
const INTRO = +introArg || 7;        // seconds of page-load animation before the scroll starts
const SCROLL_TO = +toArg || 1500;    // px, a little way down
const SCROLL_SECONDS = +scrollArg || 8;
const TAIL = 1.2;                    // still at the end
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const frames = PROBE ? out : fs.mkdtempSync('/tmp/clip-');
fs.mkdirSync(frames, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: Math.round(WIDTH * 0.98) }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    const base = Date.now();
    const vt = { now: 0, q: [], id: 0, timers: [], tid: 0 };
    window.__vt = vt;
    performance.now = () => vt.now;
    Date.now = () => base + vt.now;
    window.requestAnimationFrame = cb => { const id = ++vt.id; vt.q.push({ id, cb }); return id; };
    window.cancelAnimationFrame = id => { vt.q = vt.q.filter(x => x.id !== id); };
    window.setTimeout = (cb, ms, ...args) => { const id = ++vt.tid; vt.timers.push({ id, at: vt.now + Math.max(0, +ms || 0), cb, args }); return id; };
    window.setInterval = (cb, ms, ...args) => { const id = ++vt.tid; vt.timers.push({ id, at: vt.now + Math.max(1, +ms || 1), every: Math.max(1, +ms || 1), cb, args }); return id; };
    window.clearTimeout = window.clearInterval = id => { vt.timers = vt.timers.filter(t => t.id !== id); };
    window.__step = ms => {
      vt.now += ms;
      const q = vt.q; vt.q = [];
      for (const { cb } of q) { try { cb(vt.now); } catch (e) {} }
      let due;
      while ((due = vt.timers.filter(t => t.at <= vt.now).sort((a, b) => a.at - b.at)).length) {
        for (const t of due) {
          vt.timers = vt.timers.filter(x => x !== t);
          if (t.every) { t.at += t.every; vt.timers.push(t); }
          try { typeof t.cb === 'function' ? t.cb(...t.args) : (0, eval)(String(t.cb)); } catch (e) {}
        }
      }
    };
  });
  const page = await context.newPage();
  await page.route(/googletagmanager|google-analytics|hotjar|clarity|facebook/i, r => r.abort());
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  if (hideSel) await page.addStyleTag({ content: hideSel + ' { display: none !important; }' });
  // every image fetched before the first frame, so nothing pops in while recording
  const info = await page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach(i => { if (i.loading === 'lazy') i.loading = 'eager'; });
    await Promise.all(imgs.map(i => i.decode().catch(() => {})));
    return { imgs: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth).length };
  });
  console.log('images', info.loaded + '/' + info.imgs);
  const client = await context.newCDPSession(page);
  await client.send('Animation.enable'); await client.send('Animation.setPlaybackRate', { playbackRate: 0.45 });

  const shotEvery = PROBE ? 15 : 1;
  const total = Math.round((INTRO + SCROLL_SECONDS + TAIL) * FPS);
  const scrollFrames = Math.round(SCROLL_SECONDS * FPS);
  const t0 = Date.now();
  let n = 0;
  for (let f = 0; f < total; f++) {
    const k = Math.min(1, Math.max(0, (f - INTRO * FPS) / scrollFrames));
    const y = Math.round(ease(k) * SCROLL_TO);
    if (f % shotEvery === 0) {
      await page.screenshot({ path: path.join(frames, `f${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
    }
    await page.evaluate(([y, ms]) => {
      if (y > 0) { if (typeof lenis !== 'undefined' && lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }
      window.__step(ms);
    }, [y, STEP]);
    if (f % 150 === 0) console.log('frame', f, 'of', total, Math.round((Date.now() - t0) / 1000) + 's',
      'height:', await page.evaluate(() => document.documentElement.scrollHeight),
      'scrollY:', await page.evaluate(() => Math.round(window.scrollY)));
  }
  console.log('final height', await page.evaluate(() => document.documentElement.scrollHeight), 'scrollY', await page.evaluate(() => Math.round(window.scrollY)));
  await browser.close();
  if (PROBE) { console.log('probe shots in', frames); return; }
  const dur = total / FPS;
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${frames}/f%05d.jpg -vf "scale=900:-2,fade=t=in:st=0:d=0.5,fade=t=out:st=${(dur - 0.6).toFixed(2)}:d=0.6" -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -movflags +faststart "${out}"`);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
})().catch(e => { console.error(e); process.exit(1); });
