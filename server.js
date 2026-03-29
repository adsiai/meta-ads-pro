const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const USERS = { ADMIN: 'IDO' };
const sessions = {};
let META_TOKEN = process.env.META_TOKEN || '';
let tokenExpiresAt = null;

function genSession() { return crypto.randomBytes(32).toString('hex'); }

// Check token expiry via Graph API debug endpoint
async function checkTokenExpiry(token) {
  try {
    const appId = '1301393171858763';
    const url = 'https://graph.facebook.com/v19.0/debug_token?input_token=' + token + '&access_token=' + appId + '|' + (process.env.APP_SECRET || '');
    // Simpler: just hit /me to see if token works
    const res = await fetch('https://graph.facebook.com/v19.0/me?fields=id&access_token=' + token);
    const data = await res.json();
    if (data.error) {
      console.log('[Token] Error:', data.error.message);
      return false;
    }
    return true;
  } catch(e) { return false; }
}

// Token health check every 6 hours
async function tokenHealthCheck() {
  if (!META_TOKEN) return;
  const valid = await checkTokenExpiry(META_TOKEN);
  if (!valid) {
    console.log('[Token] Token expired or invalid! Please update META_TOKEN in Render env.');
  } else {
    console.log('[Token] Token OK at', new Date().toISOString());
  }
}

// Run health check on startup and every 6 hours
tokenHealthCheck();
setInterval(tokenHealthCheck, 6 * 60 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Serve index.html
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
      res.end(html);
    } catch(e) { res.writeHead(500); res.end('Error loading index.html'); }
    return;
  }

  // Token status endpoint
  if (pathname === '/api/token-status') {
    const valid = await checkTokenExpiry(META_TOKEN);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ valid, hasToken: !!META_TOKEN, checkedAt: new Date().toISOString() }));
    return;
  }

  // Login
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (USERS[username] && USERS[username] === password) {
          const session = genSession();
          sessions[session] = { username, created: Date.now() };
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ ok: true, session }));
        } else {
          res.writeHead(401, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ ok: false }));
        }
      } catch(e) { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  // Verify session
  if (pathname === '/api/verify') {
    const session = req.headers.authorization;
    const valid = session && sessions[session] && (Date.now() - sessions[session].created < 7 * 24 * 60 * 60 * 1000);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ ok: !!valid }));
    return;
  }

  // Meta API proxy
  if (pathname.startsWith('/api/meta/')) {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) {
      res.writeHead(401, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
      return;
    }

    const metaPath = pathname.replace('/api/meta/', '');
    const metaUrl = 'https://graph.facebook.com/v19.0/' + metaPath + '?' + url.searchParams.toString() + (url.searchParams.toString() ? '&' : '') + 'access_token=' + META_TOKEN;

    if (req.method === 'GET') {
      try {
        const r = await fetch(metaUrl);
        const data = await r.text();
        res.writeHead(r.status, {'Content-Type': 'application/json'});
        res.end(data);
      } catch(e) { res.writeHead(500); res.end(JSON.stringify({ error: { message: e.message } })); }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const params = new URLSearchParams({ ...parsed, access_token: META_TOKEN });
          const r = await fetch('https://graph.facebook.com/v19.0/' + metaPath, {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          });
          const data = await r.text();
          res.writeHead(r.status, {'Content-Type': 'application/json'});
          res.end(data);
        } catch(e) { res.writeHead(500); res.end(JSON.stringify({ error: { message: e.message } })); }
      });
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log('[Server] Running on port', PORT, '| Token:', META_TOKEN ? 'SET' : 'MISSING'));
