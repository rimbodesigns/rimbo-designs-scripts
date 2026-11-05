// A local mirror of the Webflow staging site that runs this repo's main.js, so page transitions can be tried across
// real pages before anything is tagged. Pages come straight from rimbodesigns.webflow.io; only the script tags change.
// Run: node prototype/staging-proxy.js → http://localhost:8799/
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8799;
const STAGING = 'https://rimbodesigns.webflow.io';
const MAIN = path.join(__dirname, '..', 'main.js');
const LIBS = [
  'https://cdn.prod.website-files.com/gsap/3.15.0/CustomEase.min.js',
  'https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.js'
];

function rewrite(html) {
  const tags = LIBS.filter((src) => !html.includes(src + '"') || src.includes('barba'))
    .map((src) => `<script src="${src}"></script>`).join('');
  return html
    .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/rimbodesigns\/rimbo-designs-scripts@[^"]+\/main\.min\.js"[^>]*><\/script>/, `${tags}<script src="/__main.js"></script>`)
    .replace(/<!-- Google Tag Manager -->[\s\S]*?<\/script>/, '')
    .replace(/https:\/\/rimbodesigns\.webflow\.io/g, '');
}

http.createServer(async (req, res) => {
  if (req.url.split('?')[0] === '/__main.js') {
    res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' });
    return res.end(fs.readFileSync(MAIN));
  }
  try {
    const upstream = await fetch(STAGING + req.url, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/130' }, redirect: 'manual' });
    const type = upstream.headers.get('content-type') || '';
    if (upstream.status >= 300 && upstream.status < 400) {
      res.writeHead(upstream.status, { location: (upstream.headers.get('location') || '/').replace(STAGING, '') });
      return res.end();
    }
    if (type.includes('text/html')) {
      res.writeHead(upstream.status, { 'content-type': type, 'cache-control': 'no-store' });
      return res.end(rewrite(await upstream.text()));
    }
    res.writeHead(upstream.status, { 'content-type': type });
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.writeHead(502);
    res.end(String(err));
  }
}).listen(PORT, () => console.log(`staging mirror on http://localhost:${PORT}/`));
