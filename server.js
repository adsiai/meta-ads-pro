const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PORT = process.env.PORT || 3000;
const USERS = { ADMIN: 'IDO' };
const APP_ID = '1301393171858763';
const APP_SECRET = 'e9bafaa07a6efc8ca1da2f3cab739129';
const sessions = {};
let META_TOKEN = process.env.META_TOKEN || 'EAASfnDW4xUsBREoro7V4Jc5OjoaMMf9ObURPTPUCxOxLaPtAgNqrQ4NDn5w8l6v1gWQAEfMoHieZBTvVlYr5vdlYaYhy0gy5AONOvxY6k7UWp4E22bB15sYZBnanpZBg17FtWdaywfZCgTCocnWu0wYjyG3B5oMjZBtaBPJFb6jKUB5ZCooK6YLVjrdKH8UWgXFWGZBRykRGLix';

function genSession() { return crypto.randomBytes(32).toString('hex'); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
    }).on('error', reject);
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Refresh token on every startup - keeps it fresh
async function refreshToken() {
  if (!META_TOKEN) { console.log('[Token] No token set'); return; }
  try {
    const url = 'https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=' + APP_ID + '&client_secret=' + APP_SECRET + '&fb_exchange_token=' + META_TOKEN;
    const d = await httpsGet(url);
    if (d.access_token) {
      META_TOKEN = d.access_token;
      const days = Math.round((d.expires_in || 0) / 86400);
      console.log('[Token] Refreshed on startup! Valid for', days, 'days. Len:', META_TOKEN.length);
    } else {
      console.log('[Token] Refresh failed:', JSON.stringify(d).slice(0, 100));
    }
  } catch(e) { console.log('[Token] Refresh error:', e.message); }
}

// Refresh immediately on every startup
refreshToken();
// Also refresh every 45 days as backup
setInterval(refreshToken, 45 * 24 * 60 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (pathname === '/' || pathname === '/index.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch(e) { res.writeHead(500); res.end('Error'); }
    return;
  }

  if (pathname === '/api/token-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ hasToken: !!META_TOKEN, tokenLen: META_TOKEN.length, autoRefresh: true, refreshedAt: new Date().toISOString() }));
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (USERS[username] && USERS[username] === password) {
          const session = genSession();
          sessions[session] = { username, created: Date.now() };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, session }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false }));
        }
      } catch(e) { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  if (pathname === '/api/verify') {
    const session = req.headers.authorization;
    const valid = session && sessions[session] && (Date.now() - sessions[session].created < 30 * 24 * 60 * 60 * 1000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: !!valid }));
    return;
  }

  if (pathname.startsWith('/api/meta/')) {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Unauthorized' } }));
      return;
    }
    const metaPath = pathname.replace('/api/meta/', '');
    const qs = url.searchParams.toString();
    const metaUrl = 'https://graph.facebook.com/v19.0/' + metaPath + '?' + (qs ? qs + '&' : '') + 'access_token=' + META_TOKEN;

    if (req.method === 'GET') {
      try {
        const r = await fetch(metaUrl);
        const data = await r.text();
        res.writeHead(r.status, { 'Content-Type': 'application/json' });
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
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
          });
          const data = await r.text();
          res.writeHead(r.status, { 'Content-Type': 'application/json' });
          res.end(data);
        } catch(e) { res.writeHead(500); res.end(JSON.stringify({ error: { message: e.message } })); }
      });
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log('[Server] Port', PORT, '| Token:', META_TOKEN ? META_TOKEN.length + ' chars' : 'MISSING', '| AutoRefresh: ON'));
