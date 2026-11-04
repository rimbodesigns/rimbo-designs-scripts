// Copies a blog post from the Webflow staging site into prototype/post/<slug>.html, with the site
// script from this repo (/main.js) instead of the tagged jsDelivr build, so changes to the post
// template's code can be tried before a release.
// Run: node prototype/post/sync.js [slug]   (default: wordpress-vs-webflow)
// Then open http://localhost:8777/prototype/post/<slug>.html (node prototype/server.js)
const fs = require('fs');
const path = require('path');
const slug = process.argv[2] || 'wordpress-vs-webflow';
const SOURCE = 'https://rimbodesigns.webflow.io/post/' + slug;

(async () => {
  const res = await fetch(SOURCE + '?sync=' + Date.now(), { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error('staging answered ' + res.status);
  let html = await res.text();
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/rimbodesigns\/rimbo-designs-scripts@[^"]+\/main\.min\.js"><\/script>/, '<script src="/main.js"></script>');
  // no Google Tag Manager or Webflow's relative scripts from localhost
  html = html.replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g, '');
  html = html.replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/g, '');
  html = html.replace(/<script[^>]+googletagmanager[^>]*><\/script>/g, '');
  html = html.replace(/<script async="" src="\/[^"]*"><\/script>/g, '');
  // page links keep working from localhost
  html = html.replace(/href="\/(?!\/)/g, 'href="https://rimbodesigns.webflow.io/');
  html = `<!-- Copy of ${SOURCE} from ${new Date().toISOString().slice(0, 10)}, with /main.js from this repo. A sync overwrites it. -->\n` + html;
  fs.writeFileSync(path.join(__dirname, slug + '.html'), html);
  console.log('prototype/post/' + slug + '.html from', SOURCE, '(' + Math.round(html.length / 1024) + ' KB)');
})().catch(e => { console.error(e); process.exit(1); });
