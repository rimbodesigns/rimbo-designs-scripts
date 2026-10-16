// Records a scroll-through of any page as a square clip for the carousel, with a fake clock so
// every frame is exactly 1/30 s.  node media/record-site.js <url> <out.mp4> [scrollTo=4500] [seconds=25] [--night]
//   needs: npm i playwright-core (uses the installed Chrome) and ffmpeg on the PATH
const { chromium } = require('playwright-core');
const fs = require('fs');
const { execSync } = require('child_process');
const [url, out, toArg, secArg, flag] = process.argv.slice(2);
if (!url || !out) { console.log('usage: node media/record-site.js <url> <out.mp4> [scrollTo] [seconds] [--night]'); process.exit(1); }
const SCROLL_TO = +toArg || 4500, SECONDS = +secArg || 25, FPS = 30, STEP = 1000 / FPS;
const LEAD = 1.0, TAIL = 1.5; // still at the top, still at the end
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const frames = fs.mkdtempSync('/tmp/clip-');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1176 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    const base = Date.now(); const vt = { now: 0, q: [], id: 0 }; window.__vt = vt;
    performance.now = () => vt.now; Date.now = () => base + vt.now;
    window.requestAnimationFrame = cb => { const id = ++vt.id; vt.q.push({ id, cb }); return id; };
    window.cancelAnimationFrame = id => { vt.q = vt.q.filter(x => x.id !== id); };
    window.__step = ms => { vt.now += ms; const q = vt.q; vt.q = []; for (const { cb } of q) { try { cb(vt.now); } catch (e) {} } };
  });
  const page = await context.newPage();
  await page.route(/memberstack|googletagmanager|google-analytics|hotjar|clarity|facebook/i, r => r.abort());
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  // warm up: load animations done, every image on the path fetched, back to the top
  await page.evaluate(() => { for (let i = 0; i < 240; i++) window.__step(1000 / 30); });
  await page.evaluate(y => { if (window.lenis) window.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, SCROLL_TO + 1200);
  await page.evaluate(() => { for (let i = 0; i < 90; i++) window.__step(1000 / 30); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { if (window.lenis) window.lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); });
  await page.evaluate(() => { for (let i = 0; i < 90; i++) window.__step(1000 / 30); });
  if (flag === '--night') { await page.evaluate(() => { const t = document.querySelector('.dfs-night-toggle'); if (t) t.click(); }); await page.evaluate(() => { for (let i = 0; i < 90; i++) window.__step(1000 / 30); }); }
  await page.waitForTimeout(1500);
  const client = await context.newCDPSession(page);
  await client.send('Animation.enable'); await client.send('Animation.setPlaybackRate', { playbackRate: 0.45 });

  const total = Math.round(SECONDS * FPS);
  const scrollFrames = Math.round((SECONDS - LEAD - TAIL) * FPS);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const k = Math.min(1, Math.max(0, (f - LEAD * FPS) / scrollFrames));
    const y = Math.round(ease(k) * SCROLL_TO);
    await page.evaluate(([y, ms]) => { if (window.lenis) window.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); window.__step(ms); }, [y, STEP]);
    await page.screenshot({ path: `${frames}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 });
    if (f % 150 === 0) console.log('frame', f, 'of', total, Math.round((Date.now() - t0) / 1000) + 's');
  }
  await browser.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${frames}/f%05d.jpg -vf "scale=900:-2" -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -movflags +faststart "${out}"`);
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB');
})().catch(e => { console.error(e); process.exit(1); });
