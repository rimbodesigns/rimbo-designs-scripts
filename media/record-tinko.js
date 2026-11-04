// Records the Meet Tinko clip for the band, in real time (the page mixes timers, Web Animations and rAF, so a
// fake clock would pull them apart): the page-load intro (Tinko wakes and glides into his box), the press on
// "Take a look" (his cheer, then the page scrolls itself to Years of Clutter), a steady ride through the
// pinned clutter sequence (the files go into the Bin, the counter climbs) and a hold on the victory screen.
//   node media/record-tinko.js <out.mp4> [--width=1200] [--ride=7] [--night]
//   needs: playwright-core (uses the installed Chrome) and ffmpeg on the PATH
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), os = require('os');
const { execSync } = require('child_process');
const args = process.argv.slice(2);
const opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1];
const out = args.find(a => !a.startsWith('--'));
if (!out) { console.log('usage: node media/record-tinko.js <out.mp4> [--width=1200] [--ride=7] [--night]'); process.exit(1); }
const WIDTH = +opt('width') || 1200, HEIGHT = Math.round(WIDTH * 0.98), RIDE = +opt('ride') || 7, NIGHT = args.includes('--night');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tinko-'));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1, recordVideo: { dir, size: { width: WIDTH, height: HEIGHT } } });
  const tVideo = Date.now(); // the screencast starts with the page
  const page = await context.newPage();
  await page.route(/memberstack|googletagmanager|google-analytics|hotjar|clarity|facebook/i, r => r.abort());
  const t0 = Date.now(), log = m => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);
  await page.goto('https://dfs-staging.webflow.io/meet-tinko', { waitUntil: 'networkidle', timeout: 90000 });
  if (NIGHT) await page.evaluate(() => { const t = document.querySelector('.dfs-night-toggle'); if (t) t.click(); });
  log('loaded, intro running');
  // the intro: wait for its overlay to come and go
  await page.waitForSelector('.tkh-intro', { timeout: 8000 }).catch(() => log('no intro overlay seen'));
  // cut the blank before the page's first paint (the browser's own first-contentful-paint mark, on the same clock as the screencast)
  const paint = await page.evaluate(() => { const p = performance.getEntriesByName('first-contentful-paint')[0]; return performance.timeOrigin + (p ? p.startTime : 0); });
  const trim = Math.max(0, (paint - tVideo) / 1000 - 0.08);
  await page.waitForSelector('.tkh-intro', { state: 'detached', timeout: 15000 }).catch(() => log('intro overlay still there'));
  log('intro done');
  await page.waitForTimeout(900);
  // "Take a look": his cheer, then the page scrolls to Years of Clutter (1.6 s)
  await page.locator('[data-tkh="look"]').first().click();
  log('pressed Take a look');
  await page.waitForTimeout(2700);
  const messTop = await page.evaluate(() => document.querySelector('#mess').getBoundingClientRect().top + scrollY);
  log('at the clutter section, scrollY ' + Math.round(await page.evaluate(() => scrollY)) + ', section top ' + Math.round(messTop));
  // ride the pin: the files into the Bin, the counter, the victory window at the end
  const end = await page.evaluate(() => { const m = document.querySelector('#mess'); return m.getBoundingClientRect().bottom + scrollY - innerHeight; });
  await page.evaluate(([to, dur]) => { if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(to, { duration: dur, easing: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, force: true }); else window.scrollTo(0, to); }, [end, RIDE]);
  await page.waitForTimeout(RIDE * 1000 + 300);
  log('ride done, scrollY ' + Math.round(await page.evaluate(() => scrollY)) + ' of ' + Math.round(end));
  await page.waitForTimeout(1800);
  const video = page.video();
  await context.close();
  const webm = await video.path();
  await browser.close();
  log('screencast ' + Math.round(fs.statSync(webm).size / 1024) + ' KB');
  // trim the blank before the first paint, then the band's diet format at 30 fps (a steady cadence at 60 and 120 Hz)
  log('trim ' + trim.toFixed(2) + ' s');
  execSync(`ffmpeg -y -loglevel error -ss ${trim.toFixed(2)} -i "${webm}" -vf "scale=640:-2,fps=30" -c:v libx264 -pix_fmt yuv420p -crf 27 -preset slow -movflags +faststart "${out}"`);
  fs.rmSync(dir, { recursive: true, force: true });
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim();
  console.log('wrote', out, Math.round(fs.statSync(out).size / 1024) + ' KB', (+dur).toFixed(1) + ' s');
})().catch(e => { console.error(e); process.exit(1); });
