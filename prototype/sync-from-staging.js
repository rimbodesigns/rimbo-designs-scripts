// Rebuilds prototype/index.html from the Webflow staging page, so the prototype starts as an
// exact copy of the baseline. Run: node prototype/sync-from-staging.js
// Changes made on the way: prototype.js + prototype.css are added, the site script comes from
// this repo (/main.js), the black is the darker dark, analytics are left out, and page links
// point at the staging site.
const fs = require('fs');
const path = require('path');
const SOURCE = 'https://rimbodesigns.webflow.io/home-copy';
const DARK = '#0c0c0c';

(async () => {
  const res = await fetch(SOURCE + '?sync=' + Date.now(), { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error('staging answered ' + res.status);
  let html = await res.text();

  // the site script from this repo instead of the tagged jsDelivr build
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/rimbodesigns\/rimbo-designs-scripts@[^"]+\/main\.min\.js"><\/script>/, '<script src="/prototype/prototype.js"></script>\n<script src="/prototype/services.js"></script>\n<script src="/main.js"></script>');
  // no Google Tag Manager from localhost
  html = html.replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g, '');
  html = html.replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/g, '');
  html = html.replace(/<script[^>]+googletagmanager[^>]*><\/script>/g, '');
  // page links keep working from localhost
  html = html.replace(/href="\/(?!\/)/g, 'href="https://rimbodesigns.webflow.io/');
  // the darker dark, and a marker so we can tell the copy from the real thing
  html = html.replace('</head>', `<style id="prototype-overrides">:root{--color--black:${DARK}}</style>\n<link rel="stylesheet" href="/prototype/prototype.css">\n</head>`);
  html = `<!-- Prototype baseline, synced from ${SOURCE} on ${new Date().toISOString().slice(0, 10)}. Edit prototype/prototype.css, not this file: a sync overwrites it. -->\n` + html;

  fs.writeFileSync(path.join(__dirname, 'index.html'), html);
  console.log('prototype/index.html rebuilt from', SOURCE, '(' + Math.round(html.length / 1024) + ' KB)');
})().catch(e => { console.error(e); process.exit(1); });
