const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');
const fs = require('fs');
const path = require('path');

const U = 'ADMIN', P = 'IDO';
const TOKEN = process.env.META_TOKEN || '';
const PORT = process.env.PORT || 3000;
const sessions = new Map();
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'));

function mkSid() {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, 1);
  setTimeout(() => sessions.delete(id), 86400000);
  return id;
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
function proxy(p, method, body, res) {
  const sep = p.includes('?') ? '&' : '?';
  const req = https.request({
    hostname: 'graph.facebook.com',
    path: '/v19.0/' + p + sep + 'access_token=' + TOKEN,
    method: method || 'GET',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => { cors(res); res.setHeader('Content-Type', 'application/json'); res.writeHead(200); res.end(d); });
  });
  req.on('error', e => { cors(res); res.writeHead(500); res.end('{"error":{"message":"' + e.message + '"}}'); });
  if (body) req.write(body);
  req.end();
}

http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (pathname === '/api/login' && req.method === 'POST') {
    let b = ''; req.on('data', c => b += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(b);
        if (d.username === U && d.password === P) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, session: mkSid() }));
        } else { res.writeHead(401); res.end('{"ok":false}'); }
      } catch(e) { res.writeHead(400); res.end('{"ok":false}'); }
    });
    return;
  }

  if (pathname === '/api/verify') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ ok: sessions.has(req.headers['authorization']) }));
    return;
  }

  if (pathname.startsWith('/api/meta/')) {
    if (!sessions.has(req.headers['authorization'])) { res.writeHead(401); res.end('{"error":{"message":"Not logged in"}}'); return; }
    const mp = pathname.replace('/api/meta/', '') + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    if (req.method === 'POST') {
      let b = ''; req.on('data', c => b += c);
      req.on('end', () => {
        let params = '';
        try { params = new URLSearchParams(JSON.parse(b)).toString(); } catch(e) { params = b; }
        proxy(mp.split('?')[0], 'POST', params, res);
      });
    } else { proxy(mp, 'GET', null, res); }
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(HTML);
}).listen(PORT, () => console.log('Running on port ' + PORT));
