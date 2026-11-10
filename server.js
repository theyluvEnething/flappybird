// Run with: node server.js
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const root = __dirname;
const recordings = path.join(root, 'recordings');
const port = Number(process.env.PORT || 8766);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const filenamePattern = /^[0-9T_Z.-]+_[a-f0-9-]{36}\.json$/;

const server = http.createServer(async (req, res) => {
  function json(code, data) {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  }
  // Only this local page can write recordings. No cross-origin requests.
  if (req.headers.host !== `127.0.0.1:${port}` && req.headers.host !== `localhost:${port}`) {
    json(403, { error: 'Local requests only' }); return;
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/recordings') {
      await fs.mkdir(recordings, { recursive: true });
      if (req.method === 'GET') {
        json(200, (await fs.readdir(recordings)).filter(name => filenamePattern.test(name)).sort().reverse());
        return;
      }
      if (req.method !== 'POST') { json(405, { error: 'Method not allowed' }); return; }
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
        json(403, { error: 'Origin rejected' }); return;
      }
      if (!(req.headers['content-type'] || '').startsWith('application/json')) {
        json(415, { error: 'Expected JSON' }); return;
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 32 * 1024 * 1024) {
          json(413, { error: 'Recording too large' }); return;
        }
      }
      let data;
      try { data = JSON.parse(body); } catch { json(400, { error: 'Invalid JSON' }); return; }
      if (data.version !== 1 || data.fps !== 120 || !Array.isArray(data.frames) ||
          !data.frames.length || !data.config || !Number.isFinite(Date.parse(data.startedAt))) {
        json(400, { error: 'Invalid recording' }); return;
      }
      const id = /^[a-f0-9-]{36}$/.test(data.id) ? data.id : randomUUID();
      const name = new Date(data.startedAt).toISOString().replaceAll(':', '-') + '_' + id + '.json';
      // Repeated delivery (for example on page close) never overwrites a saved game.
      try { await fs.writeFile(path.join(recordings, name), JSON.stringify(data), { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
      json(201, { filename: name }); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { json(405, { error: 'Method not allowed' }); return; }
    let file;
    if (['/', '/index.html', '/styles.css', '/script.js'].includes(url.pathname)) {
      file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    } else if (url.pathname.startsWith('/recordings/') && filenamePattern.test(url.pathname.slice(12))) {
      file = path.join(recordings, url.pathname.slice(12));
    } else { json(404, { error: 'Not found' }); return; }
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) {
    json(error.code === 'ENOENT' ? 404 : 500, { error: 'Could not access recording or game file' });
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Flappy Bird: http://127.0.0.1:${port}`));
