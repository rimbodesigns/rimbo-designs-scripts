// Records the Meet Tinko clip for the band under Chrome's virtual time (CDP Emulation.setVirtualTimePolicy):
// timers, rAF, Web Animations and the smooth scroll all advance exactly 1/30 s per frame, so nothing is
// dropped however long a screenshot takes. The take: the page-load intro (Tinko wakes and glides into his
// box), the press on "Take a look" (his cheer, then the page scrolls itself to Years of Clutter), a steady
// ride through the pinned clutter sequence (the files go into the Bin, the counter climbs) and a hold on the
// victory screen.   node media/record-tinko.js <out.mp4> [--width=1200] [--ride=7] [--night]
//   needs: playwright-core (uses the installed Chrome) and ffmpeg on the PATH
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const args = process.argv.slice(2);
const opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
const out = args.find(a => !a.startsWith('--'));
if (!out) { console.log('usage: node media/record-tinko.js <out.mp4> [--width=1200] [--ride=7] [--night]'); process.exit(1); }
const WIDTH = +opt('width') || 1200, HEIGHT = Math.round(WIDTH * 0.98), RIDE = +opt('ride') || 7, NIGHT = args.includes('--night');
const FPS = 30, STEP = 1000 / FPS;
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'tinko-'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.route(/memberstack|googletagmanager|google-analytics|hotjar|clarity|facebook/i, r => r.abort());
  const cdp = await context.newCDPSession(page);
  let expired = null;
  cdp.on('Emulation.virtualTimeBudgetExpired', () => { if (expired) { const r = expired; expired = null; r(); } });
  const advance = ms => new Promise(res => { expired = res; cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }); });
  // the clock is ours from before the first script runs: the page loads while we step it 1/30 s at a time
  // (plain screenshots through CDP: Playwright's own waits need animation frames, which only we hand out)
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  page.goto('https://dfs-staging.webflow.io/meet-tinko', { waitUntil: 'commit', timeout: 90000 }).catch(() => {});
  let n = 0;
  const shot = async () => { const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }); fs.writeFileSync(`${frames}/f${String(n++).padStart(5, '0')}.jpg`, Buffer.from(r.data, 'base64')); };
  const run = async (seconds, label) => { const k = Math.round(seconds * FPS); for (let i = 0; i < k; i++) { await advance(STEP); await shot(); } if (label) console.log(label, 'frames so far', n); };
  const has = async sel => { try { return !!(await page.$(sel)); } catch (e) { return false; } };
  // step until the page has painted and the intro overlay is there (the fetches run on real time meanwhile)
  let steps = 0; while (steps++ < 40 * FPS && !(await has('.tkh-intro'))) await advance(STEP);
  console.log('intro overlay after', steps, 'steps');
  if (NIGHT) await page.evaluate(() => { const t = document.querySelector('.dfs-night-toggle'); if (t) t.click(); });
  // the intro, frame by frame, until its overlay has gone (cap 8 s)
  for (let i = 0; i < 8 * FPS; i++) { await advance(STEP); await shot(); if (!(await has('.tkh-intro'))) break; }
  console.log('intro done, frames', n);
  await run(0.9);
  // "Take a look": his cheer, then the page scrolls itself to Years of Clutter (1.6 s)
  const b = await page.evaluate(() => { const r = document.querySelector('[data-tkh="look"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.click(b[0], b[1]);
  await run(2.7, 'pressed Take a look and arrived');
  const end = await page.evaluate(() => { const m = document.querySelector('#mess'); return m.getBoundingClientRect().bottom + scrollY - innerHeight; });
  console.log('scrollY', Math.round(await page.evaluate(() => scrollY)), 'ride to', Math.round(end));
  await page.evaluate(([to, dur]) => { if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(to, { duration: dur, easing: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, force: true }); else window.scrollTo(0, to); }, [end, RIDE]);
  await run(RIDE + 0.3, 'ride done');
  console.log('scrollY', Math.round(await page.evaluate(() => scrollY)));
  await run(1.8, 'held the victory window');
  await browser.close();
  execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i ${frames}/f%05d.jpg -vf "scale=640:-2" -c:v libx264 -pix_fmt yuv420p -crf 27 -preset slow -movflags +faststart "${out}"`);
  fs.rmSync(frames, { recursive: true, force: true });
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim();
  console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB', (+dur).toFixed(1) + ' s');
})().catch(e => { console.error(e); process.exit(1); });
