// Statický server pro export webu: /cesta -> cesta.html, /history/<id> -> history/[id].html
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const root = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon' };
http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const tries = p === '/' ? ['index.html'] : [p, p + '.html', p.replace(/\/[^/]+$/, '/[id].html')];
  for (const t of tries) {
    try {
      const body = await readFile(join(root, t));
      res.writeHead(200, { 'content-type': types[extname(t)] ?? 'application/octet-stream' });
      return res.end(body);
    } catch {}
  }
  res.writeHead(404); res.end('nf');
}).listen(8090, () => console.log('serving', root, 'on 8090'));
