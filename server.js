const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');

const CONFIG = {
  USERNAME: 'ADMIN',
  PASSWORD: 'IDO',
  META_TOKEN: process.env.META_TOKEN || '',
  PORT: process.env.PORT || 3000
};

const sessions = new Map();
function createSession() {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, { created: Date.now() });
  setTimeout(() => sessions.delete(id), 24*60*60*1000);
  return id;
}
function isValidSession(sid) { return sessions.has(sid); }

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
}

function metaProxy(path, method, body, res) {
  const sep = path.includes('?') ? '&' : '?';
  const options = {
    hostname: 'graph.facebook.com',
    path: '/v19.0/' + path + sep + 'access_token=' + CONFIG.META_TOKEN,
    method: method || 'GET',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  };
  const req = https.request(options, apiRes => {
    let data = '';
    apiRes.on('data', c => data += c);
    apiRes.on('end', () => {
      setCORS(res);
      res.setHeader('Content-Type','application/json');
      res.writeHead(200);
      res.end(data);
    });
  });
  req.on('error', e => {
    setCORS(res);
    res.writeHead(500);
    res.end(JSON.stringify({error:{message:e.message}}));
  });
  if (body) req.write(body);
  req.end();
}

const HTML = "<h1>Meta Ads Pro</h1><p>app.html not found</p>";

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const {username, password} = JSON.parse(body);
        if (username === CONFIG.USERNAME && password === CONFIG.PASSWORD) {
          const session = createSession();
          res.setHeader('Content-Type','application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ok:true,session}));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ok:false}));
        }
      } catch(e) { res.writeHead(400); res.end(JSON.stringify({ok:false})); }
    });
    return;
  }

  if (pathname === '/api/verify') {
    const sid = req.headers['authorization'];
    res.setHeader('Content-Type','application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ok:isValidSession(sid)}));
    return;
  }

  if (pathname.startsWith('/api/meta/')) {
    const sid = req.headers['authorization'];
    if (!isValidSession(sid)) { res.writeHead(401); res.end(JSON.stringify({error:{message:'Not logged in'}})); return; }
    const metaPath = pathname.replace('/api/meta/','') + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        let params = '';
        try { const p = JSON.parse(body); params = new URLSearchParams(p).toString(); } catch(e) { params = body; }
        metaProxy(metaPath.split('?')[0], 'POST', params, res);
      });
    } else {
      metaProxy(metaPath, 'GET', null, res);
    }
    return;
  }

  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.writeHead(200);
  res.end(HTML);
});

server.listen(CONFIG.PORT, () => {
  console.log('Meta Ads Pro running on port ' + CONFIG.PORT);
});