// Local preview of the calculator: this folder only, and only on this Mac (127.0.0.1).
// Your view: http://localhost:8765/?make
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/prototype\/calculator/, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p), type = types[path.extname(file)];
  if (!file.startsWith(root + path.sep) || !type || !fs.existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(8765, '127.0.0.1', () => console.log('Calculator on http://localhost:8765/?make'));
