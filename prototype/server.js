// Serves the prototype at / with main.js and media/ from the repo root.  node prototype/server.js
// Starts on 8777, or the next free port if that one is taken, and says which.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.avif': 'image/avif', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '/index.html') p = '/prototype/index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not here'); }
    const stat = fs.statSync(file), type = types[path.extname(file)] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = m && m[1] !== '' ? +m[1] : 0;
      let end = m && m[2] !== '' ? Math.min(+m[2], stat.size - 1) : stat.size - 1;
      if (!m || start > end || start >= stat.size) { // a range from an old version of the file, or nonsense
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end();
      }
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
      return fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch (err) {
    console.error('request failed:', req.url, err.message);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

// The port: 8777 by default (nothing else here uses it). A port counts as taken when anything
// answers on it over IPv4 or IPv6, so a server on the other stack can't share it by accident.
const net = require('net');
function taken(port, host) {
  return new Promise(resolve => {
    const s = net.connect({ port, host });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.setTimeout(300, () => { s.destroy(); resolve(false); });
  });
}
(async () => {
  let port = +process.env.PORT || 8777;
  if (!process.env.PORT) {
    while (await taken(port, '127.0.0.1') || await taken(port, '::1')) { console.log(`port ${port} is taken, trying ${port + 1}`); port += 1; }
  }
  server.on('error', err => { console.error(err.message); process.exit(1); });
  server.on('listening', () => console.log(`prototype at http://localhost:${port}`));
  server.listen(port);
})();
