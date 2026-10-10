// Deterministic recording with a fake clock: the page's requestAnimationFrame, performance.now
// and Date.now are driven from here, one 1/30 s step per frame, then a screenshot per frame.
const { chromium } = require('playwright-core'); // npm i playwright-core; it drives the installed Chrome
// Then: ffmpeg -framerate 30 -i vframes/f%05d.jpg -vf scale=900:-2 -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -movflags +faststart dfs-home.mp4
const fs = require('fs');
const FPS = 30;
const STEP = 1000 / FPS;
const ease = 't => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1176 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    const base = Date.now();
    const vt = { now: 0, q: [], id: 0 };
    window.__vt = vt;
    performance.now = () => vt.now;
    Date.now = () => base + vt.now;
    window.requestAnimationFrame = cb => { const id = ++vt.id; vt.q.push({ id, cb }); return id; };
    window.cancelAnimationFrame = id => { vt.q = vt.q.filter(x => x.id !== id); };
    window.__step = ms => { vt.now += ms; const q = vt.q; vt.q = []; for (const { cb } of q) { try { cb(vt.now); } catch (e) {} } };
  });
  const page = await context.newPage();
  await page.route(/memberstack/i, r => r.abort());
  await page.goto('https://dfs-staging.webflow.io/', { waitUntil: 'networkidle', timeout: 60000 });
  // warm up: let the page's load animations run, load every image, come back to the top
  await page.evaluate(() => { for (let i = 0; i < 240; i++) window.__step(1000 / 30); });
  await page.evaluate(() => window.lenis.scrollTo(3600, { immediate: true }));
  await page.evaluate(() => { for (let i = 0; i < 60; i++) window.__step(1000 / 30); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.lenis.scrollTo(0, { immediate: true }));
  await page.evaluate(() => { for (let i = 0; i < 90; i++) window.__step(1000 / 30); });
  await page.waitForTimeout(800);
  const client = await page.context().newCDPSession(page);
  // CSS transitions (the night shift) run on the real clock; slow them to match the frame pace
  await client.send('Animation.enable');
  await client.send('Animation.setPlaybackRate', { playbackRate: 0.45 });
  const at = s => Math.round(s * FPS);
  const script = {
    [at(2.2)]: () => page.evaluate(() => document.querySelector('.dfs-night-toggle').click()),
    [at(4.8)]: () => page.evaluate(`window.lenis.scrollTo(1800, { duration: 8, easing: ${ease} })`),
    [at(13.3)]: () => page.evaluate(`window.lenis.scrollTo(0, { duration: 8, easing: ${ease} })`),
    [at(22.0)]: () => page.evaluate(() => document.querySelector('.dfs-night-toggle').click()),
  };
  const total = at(24.4);
  const t0 = Date.now();
  for (let frame = 0; frame < total; frame++) {
    if (script[frame]) await script[frame]();
    await page.evaluate(ms => window.__step(ms), STEP);
    await page.screenshot({ path: `vframes/f${String(frame).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 88 });
    if (frame % 120 === 0) console.log('frame', frame, 'of', total, Math.round((Date.now() - t0) / 1000) + 's');
  }
  await browser.close();
  console.log('done', total, 'frames in', Math.round((Date.now() - t0) / 1000) + 's');
})().catch(e => { console.error(e); process.exit(1); });
