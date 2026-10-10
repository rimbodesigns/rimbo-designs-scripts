const { chromium } = require('playwright-core') // npm i playwright-core, uses the installed Chrome;
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx0 = null; const page = await browser.newPage({ viewport: { width: 1200, height: 1176 }, deviceScaleFactor: 1 });
  await page.route(/memberstack/i, r => r.abort());
  await page.goto('https://dfs-staging.webflow.io/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.addStyleTag({ content: '[id*="memberstack"],[class*="ms-badge"],[data-ms-badge]{display:none!important}' });
  await page.evaluate(() => { for (const el of document.querySelectorAll('div,a')) { if (el.children.length < 4 && /Test Mode/.test(el.textContent || '') && getComputedStyle(el).position === 'fixed') el.style.display = 'none'; } });
  await page.waitForTimeout(1500);
  const client = await page.context().newCDPSession(page);
  const frames = [];
  client.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, i: frames.length });
    fs.writeFileSync(`frames/f${String(frames.length - 1).padStart(5, '0')}.jpg`, Buffer.from(data, 'base64'));
    client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1200, maxHeight: 1176, everyNthFrame: 1 });
  // keep the page repainting even while still, so the screencast keeps sending frames
  await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none'; document.body.appendChild(d); let n = 0; (function f() { d.style.transform = 'translateX(' + (n++ % 2) + 'px)'; requestAnimationFrame(f); })(); });
  await page.waitForTimeout(3000); // hero still, the logo ticks
  await page.evaluate(() => { const go = y => window.lenis ? window.lenis.scrollTo(y, { duration: 9, easing: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }) : window.scrollTo({ top: y, behavior: 'smooth' }); go(3300); });
  await page.waitForTimeout(9400);
  await page.waitForTimeout(1600); // hold
  await page.evaluate(() => { const go = y => window.lenis ? window.lenis.scrollTo(y, { duration: 9, easing: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 }) : window.scrollTo({ top: y, behavior: 'smooth' }); go(0); });
  await page.waitForTimeout(9400);
  await page.waitForTimeout(1500); // hold at the top so the loop closes
  await client.send('Page.stopScreencast');
  await browser.close();
  // concat list with real durations
  let list = '';
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.max(0.005, frames[i + 1].t - frames[i].t) : 0.033;
    list += `file 'frames/f${String(i).padStart(5, '0')}.jpg'\nduration ${dur.toFixed(4)}\n`;
  }
  list += `file 'frames/f${String(frames.length - 1).padStart(5, '0')}.jpg'\n`;
  fs.writeFileSync('list.txt', list);
  console.log('frames', frames.length, 'seconds', (frames[frames.length - 1].t - frames[0].t).toFixed(1));
})().catch(e => { console.error(e); process.exit(1); });
