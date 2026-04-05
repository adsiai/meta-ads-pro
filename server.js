const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PORT = process.env.PORT || 3000;
const USERS = { ADMIN: 'IDO' };
const APP_ID = process.env.APP_ID || '1301393171858763';
const APP_SECRET = process.env.APP_SECRET || '';
const GH_TOKEN = process.env.GH_TOKEN || '';
const GH_REPO = 'adsiai/meta-ads-pro';
const sessions = {};
let META_TOKEN = process.env.META_TOKEN || '';
let tokenFileSha = null;

function genSession() { return crypto.randomBytes(32).toString('hex'); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
    }).on('error', reject);
  });
}

async function loadTokenFromGitHub() {
  if (!GH_TOKEN) return false;
  try {
    const d = await httpsGet('https://api.github.com/repos/' + GH_REPO + '/contents/token.json');
    if (d.content) {
      const json = JSON.parse(Buffer.from(d.content.replace(/\n/g,''), 'base64').toString('utf-8'));
      if (json.access_token || json.token) {
        META_TOKEN = json.access_token || json.token;
        tokenFileSha = d.sha;
        console.log('[Token] Loaded from GitHub:', json.updated_at);
        return true;
      }
    }
  } catch(e) { console.log('[Token] Load error:', e.message); }
  return false;
}

async function saveToken(t){return saveTokenToGitHub(t);}
async function saveTokenToGitHub(token) {
  if (!GH_TOKEN) return;
  return new Promise((resolve) => {
    const tokenData = JSON.stringify({ access_token: token, updated_at: new Date().toISOString() });
    const b64 = Buffer.from(tokenData).toString('base64');
    const bodyObj = { message: 'Token refresh ' + new Date().toISOString(), content: b64 };
    if (tokenFileSha) bodyObj.sha = tokenFileSha;
    const body = JSON.stringify(bodyObj);
    const opts = {
      hostname: 'api.github.com', path: '/repos/' + GH_REPO + '/contents/token.json',
      method: 'PUT',
      headers: { 'Authorization': 'token ' + GH_TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'node', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { const d = JSON.parse(data); if (d.content && d.content.sha) tokenFileSha = d.content.sha; console.log('[Token] Saved to GitHub'); } catch(e) {}
        resolve();
      });
    });
    req.on('error', e => { console.log('[Token] Save error:', e.message); resolve(); });
    req.write(body); req.end();
  });
}

async function refreshToken() {
  if (!META_TOKEN || !APP_SECRET) return;
  try {
    const url = 'https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=' + APP_ID + '&client_secret=' + APP_SECRET + '&fb_exchange_token=' + META_TOKEN;
    const d = await httpsGet(url);
    if (d.access_token) {
      META_TOKEN = d.access_token;
      console.log('[Token] Refreshed! Valid for', Math.round((d.expires_in||0)/86400), 'days');
      await saveTokenToGitHub(META_TOKEN);
    } else {
      console.log('[Token] Refresh failed:', JSON.stringify(d).slice(0,150));
    }
  } catch(e) { console.log('[Token] Error:', e.message); }
}

async function initToken() {
  const loaded = await loadTokenFromGitHub();
  if (loaded || META_TOKEN) await refreshToken();
  console.log('[Token] Ready. Has token:', !!META_TOKEN);
}

initToken();
setInterval(refreshToken, 45 * 24 * 60 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (pathname === '/' || pathname === '/index.html') {
    try { const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'); res.writeHead(200, {'Content-Type':'text/html;charset=utf-8'}); res.end(html); }
    catch(e) { res.writeHead(500); res.end('Error'); }
    return;
  }

  if (pathname === '/api/token-status') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({hasToken:!!META_TOKEN,autoRefresh:true,githubPersistence:!!GH_TOKEN}));
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const {username,password} = JSON.parse(body);
        if (USERS[username] && USERS[username] === password) {
          const session = genSession();
          sessions[session] = {username, created: Date.now()};
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify({ok:true,session}));
        } else { res.writeHead(401); res.end(JSON.stringify({ok:false})); }
      } catch(e) { res.writeHead(400); res.end('Bad request'); }
    });
    return;
  }

  if (pathname === '/api/verify') {
    const session = req.headers.authorization;
    const valid = session && sessions[session] && (Date.now()-sessions[session].created < 30*24*60*60*1000);
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:!!valid}));
    return;
  }

  if (pathname.startsWith('/api/meta/')) {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) { res.writeHead(401); res.end(JSON.stringify({error:{message:'Unauthorized'}})); return; }
    const metaPath = pathname.replace('/api/meta/','');
    const qs = url.searchParams.toString();
    const metaUrl = 'https://graph.facebook.com/v19.0/'+metaPath+'?'+(qs?qs+'&':'')+'access_token='+META_TOKEN;
    if (req.method === 'GET') {
      try { const r = await fetch(metaUrl); const data = await r.text(); res.writeHead(r.status,{'Content-Type':'application/json'}); res.end(data); }
      catch(e) { res.writeHead(500); res.end(JSON.stringify({error:{message:e.message}})); }
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const params = new URLSearchParams({...parsed, access_token: META_TOKEN});
          const r = await fetch('https://graph.facebook.com/v19.0/'+metaPath, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});
          const data = await r.text();
          res.writeHead(r.status,{'Content-Type':'application/json'}); res.end(data);
        } catch(e) { res.writeHead(500); res.end(JSON.stringify({error:{message:e.message}})); }
      });
    }
    return;
  }
  if (pathname === '/api/ai' && req.method === 'POST') {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) {
      res.writeHead(401, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error:'Unauthorized'}));
      return;
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01'
          },
          body: body
        });
        const data = await r.text();
        res.writeHead(r.status, {'Content-Type':'application/json'});
        res.end(data);
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({error:{message:e.message}}));
      }
    });
    return;
  }

  // POST /api/meta/:id — pause or resume campaign
  if (pathname.startsWith('/api/meta/') && req.method === 'POST') {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) {
      res.writeHead(401, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error:'Unauthorized'}));
      return;
    }
    const metaId = pathname.replace('/api/meta/', '').split('?')[0];
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const params = JSON.parse(body);
        const token = await getToken();
        const form = new URLSearchParams();
        if (params.status) form.append('status', params.status);
        if (params.daily_budget) form.append('daily_budget', params.daily_budget);
        form.append('access_token', token);
        const r = await fetch('https://graph.facebook.com/v19.0/' + metaId, {method:'POST', body: form});
        const data = await r.json();
        if (data.error) {
          res.writeHead(400, {'Content-Type':'application/json'});
          res.end(JSON.stringify({error: data.error}));
        } else {
          res.writeHead(200, {'Content-Type':'application/json'});
          res.end(JSON.stringify({success: true}));
        }
      } catch(e) {
        res.writeHead(500, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:{message:e.message}}));
      }
    });
    return;
  }

  // POST /api/token — update Meta token
  if (pathname === '/api/token' && req.method === 'POST') {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) {
      res.writeHead(401, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error:'Unauthorized'}));
      return;
    }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { token } = JSON.parse(body);
        if (!token || token.length < 10) {
          res.writeHead(400, {'Content-Type':'application/json'});
          res.end(JSON.stringify({error:'Invalid token'}));
          return;
        }
        // Validate token with Meta first
        const check = await fetch('https://graph.facebook.com/v19.0/me?access_token=' + token);
        const data = await check.json();
        if (data.error) {
          res.writeHead(400, {'Content-Type':'application/json'});
          res.end(JSON.stringify({error: data.error.message}));
          return;
        }
        // Save token to GitHub
        currentToken = token;
        await saveTokenToGitHub(token);
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify({success: true, user: data.name}));
      } catch(e) {
        res.writeHead(500, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error: e.message}));
      }
    });
    return;
  }

  // GET /api/token — get current token status
  if (pathname === '/api/token' && req.method === 'GET') {
    const session = req.headers.authorization;
    if (!session || !sessions[session]) {
      res.writeHead(401, {'Content-Type':'application/json'});
      res.end(JSON.stringify({error:'Unauthorized'}));
      return;
    }
    const hasToken = !!currentToken;
    const preview = hasToken ? currentToken.slice(0,10)+'...' : 'none';
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({hasToken, preview}));
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log('[Server] Port', PORT, '| GitHub persistence:', !!GH_TOKEN));
