const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');

// ─── הגדרות (שנה כאן) ───────────────────────────────────
const CONFIG = {
  USERNAME: 'ADMIN',
  PASSWORD: 'IDO',
  META_TOKEN: process.env.META_TOKEN || '',
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  PORT: process.env.PORT || 3000
};

// ─── Sessions ─────────────────────────────────────────────
const sessions = new Map();

function createSession() {
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, { created: Date.now() });
  // expire after 24h
  setTimeout(() => sessions.delete(id), 24 * 60 * 60 * 1000);
  return id;
}

function isValidSession(sid) {
  return sessions.has(sid);
}

// ─── CORS Headers ─────────────────────────────────────────
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Meta API Proxy ───────────────────────────────────────
function metaProxy(path, method, body, res) {
  const sep = path.includes('?') ? '&' : '?';
  const fullPath = `/v19.0/${path}${sep}access_token=${CONFIG.META_TOKEN}`;
  
  const options = {
    hostname: 'graph.facebook.com',
    path: fullPath,
    method: method || 'GET',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  };

  const req = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      setCORS(res);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(data);
    });
  });

  req.on('error', (e) => {
    setCORS(res);
    res.writeHead(500);
    res.end(JSON.stringify({ error: { message: e.message } }));
  });

  if (body) req.write(body);
  req.end();
}

// ─── HTML App ─────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Meta Ads Pro</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
<style>
:root{--bg:#0a0a0f;--surface:#111118;--surface2:#1a1a24;--border:#2a2a3a;--accent:#4f7fff;--accent2:#00e5a0;--warn:#ff6b6b;--orange:#ff9f43;--purple:#a29bfe;--text:#e8e8f0;--muted:#6b6b8a;--mono:'IBM Plex Mono',monospace;--sans:'Heebo',sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;direction:rtl;overflow-x:hidden}

/* LOGIN */
.login-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg)}
.login-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:2.5rem;width:380px;max-width:95vw}
.login-logo{font-family:var(--mono);font-size:1.4rem;font-weight:600;color:var(--accent);margin-bottom:.25rem}.login-logo span{color:var(--accent2)}
.login-sub{color:var(--muted);font-size:.85rem;margin-bottom:2rem}
.form-group{margin-bottom:1.1rem}
.form-label{display:block;font-size:.72rem;font-weight:600;color:var(--muted);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.06em;font-family:var(--mono)}
.form-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:.7rem 1rem;color:var(--text);font-family:var(--sans);font-size:.9rem;outline:none;transition:border-color .2s;direction:ltr;text-align:left}
.form-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,127,255,.1)}
.btn-login{width:100%;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:.8rem;font-size:.95rem;font-weight:700;cursor:pointer;font-family:var(--sans);transition:all .2s;margin-top:.5rem}
.btn-login:hover{background:#3a6aee;transform:translateY(-1px)}
.btn-login:active{transform:translateY(0)}
.login-err{background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.25);border-radius:8px;padding:.7rem 1rem;color:var(--warn);font-size:.83rem;margin-bottom:1rem;display:none}
.login-dots{display:flex;gap:.4rem;justify-content:center;margin-top:1.5rem}
.login-dot{width:8px;height:8px;border-radius:50%;background:var(--border)}
.login-dot.active{background:var(--accent)}

/* HEADER */
.header{background:var(--surface);border-bottom:1px solid var(--border);padding:0 1.25rem;display:flex;align-items:center;justify-content:space-between;height:54px;position:sticky;top:0;z-index:200;gap:.75rem}
.logo{font-family:var(--mono);font-size:.95rem;font-weight:600;color:var(--accent);white-space:nowrap}.logo span{color:var(--accent2)}
.account-switcher{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.35rem .7rem;color:var(--text);font-family:var(--sans);font-size:.8rem;outline:none;cursor:pointer;flex:1;max-width:260px}
.header-right{display:flex;gap:.5rem;align-items:center}
.user-badge{background:rgba(79,127,255,.1);border:1px solid rgba(79,127,255,.2);border-radius:20px;padding:.25rem .75rem;font-size:.75rem;color:var(--accent);font-family:var(--mono)}

/* DATE */
.date-bar{background:var(--surface);border-bottom:1px solid var(--border);padding:.5rem 1rem;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}
.date-btn{padding:.3rem .6rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:.75rem;cursor:pointer;transition:all .15s;font-family:var(--sans)}
.date-btn:hover,.date-btn.active{background:rgba(79,127,255,.15);color:var(--accent);border-color:rgba(79,127,255,.3)}

/* ALERTS */
.alerts-bar{background:rgba(255,107,107,.07);border-bottom:1px solid rgba(255,107,107,.2);padding:.5rem 1rem;display:none}
.alert-top{display:flex;align-items:center;gap:.5rem;font-size:.8rem;color:var(--warn);margin-bottom:3px}

/* LAYOUT */
.layout{display:grid;grid-template-columns:1fr 200px;min-height:calc(100vh - 54px)}
.sidebar{background:var(--surface);border-right:1px solid var(--border);padding:1rem 0;position:sticky;top:54px;height:calc(100vh - 54px);overflow-y:auto;order:2}
.nav-label{font-family:var(--mono);font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;padding:0 1rem;margin-bottom:.35rem;display:block}
.nav-section{margin-bottom:1.1rem}
.nav-item{display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;cursor:pointer;font-size:.82rem;font-weight:500;color:var(--muted);transition:all .15s;border-right:3px solid transparent}
.nav-item:hover{color:var(--text);background:var(--surface2)}
.nav-item.active{color:var(--accent);background:rgba(79,127,255,.08);border-right-color:var(--accent)}
.main{padding:1.25rem;overflow-x:hidden;order:1;min-width:0}

/* BTNS */
.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;border-radius:8px;font-family:var(--sans);font-size:.83rem;font-weight:600;cursor:pointer;border:none;transition:all .2s;white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff;width:100%;justify-content:center}
.btn-primary:hover{background:#3a6aee}
.btn-sm{padding:.32rem .7rem;font-size:.76rem;border-radius:6px}
.btn-success{background:rgba(0,229,160,.12);color:var(--accent2);border:1px solid rgba(0,229,160,.25)}
.btn-danger{background:rgba(255,107,107,.12);color:var(--warn);border:1px solid rgba(255,107,107,.25)}
.btn-ghost{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
.btn-accent{background:var(--accent);color:#fff}
.btn-success:hover{background:rgba(0,229,160,.22)}
.btn-danger:hover{background:rgba(255,107,107,.22)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}

/* STATS */
.stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.25rem}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;right:0;left:0;height:2px;background:var(--accent)}
.stat-card:nth-child(2)::before{background:var(--accent2)}
.stat-card:nth-child(3)::before{background:var(--orange)}
.stat-card:nth-child(4)::before{background:var(--purple)}
.stat-card:nth-child(5)::before{background:#fd79a8}
.stat-card:nth-child(6)::before{background:#55efc4}
.stat-label{font-family:var(--mono);font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.4rem}
.stat-value{font-size:1.45rem;font-weight:900;line-height:1;margin-bottom:.15rem}
.stat-sub{font-size:.7rem;color:var(--muted)}
.stat-change{font-size:.7rem;font-weight:700;padding:2px 5px;border-radius:4px;display:inline-block;margin-top:.3rem}
.stat-change.up{background:rgba(0,229,160,.1);color:var(--accent2)}
.stat-change.down{background:rgba(255,107,107,.1);color:var(--warn)}

/* CHART */
.chart-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.1rem;margin-bottom:1.25rem}
.chart-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem}
.chart-title{font-size:.875rem;font-weight:700}
.chart-toggles{display:flex;gap:.35rem}
.chart-toggle{padding:.22rem .6rem;border-radius:20px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);transition:all .15s;font-family:var(--sans)}
.chart-toggle.active-spend{background:rgba(79,127,255,.15);color:var(--accent);border-color:rgba(79,127,255,.3)}
.chart-toggle.active-clicks{background:rgba(0,229,160,.15);color:var(--accent2);border-color:rgba(0,229,160,.3)}
.chart-toggle.active-ctr{background:rgba(255,159,67,.15);color:var(--orange);border-color:rgba(255,159,67,.3)}
.chart-wrap{position:relative;height:180px}

/* TABLE */
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.65rem;flex-wrap:wrap;gap:.4rem}
.section-title{font-size:.9rem;font-weight:700;display:flex;align-items:center;gap:.4rem}
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow-x:auto;margin-bottom:1.25rem}
table{width:100%;border-collapse:collapse;min-width:580px}
th{font-family:var(--mono);font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);padding:.65rem .9rem;text-align:right;border-bottom:1px solid var(--border);background:var(--surface2);white-space:nowrap;cursor:pointer;user-select:none}
th:hover{color:var(--text)}
td{padding:.65rem .9rem;font-size:.82rem;border-bottom:1px solid rgba(42,42,58,.5);vertical-align:middle;white-space:nowrap}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(79,127,255,.04)}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:20px;font-size:.7rem;font-weight:600}
.badge-active{background:rgba(0,229,160,.12);color:var(--accent2);border:1px solid rgba(0,229,160,.25)}
.badge-paused{background:rgba(255,107,107,.12);color:var(--warn);border:1px solid rgba(255,107,107,.25)}
.dot{width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block}
.actions{display:flex;gap:4px}
.tag{display:inline-block;background:rgba(79,127,255,.12);color:var(--accent);border:1px solid rgba(79,127,255,.2);border-radius:4px;font-size:.66rem;padding:1px 5px;font-family:var(--mono)}

/* MISC */
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem;gap:.75rem;color:var(--muted);font-size:.825rem}
.spinner{width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.error-box{background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.25);border-radius:10px;padding:.8rem 1rem;color:var(--warn);font-size:.82rem;margin-bottom:.9rem;display:flex;gap:.6rem}
.success-box{background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.25);border-radius:10px;padding:.8rem 1rem;color:var(--accent2);font-size:.82rem;margin-bottom:.9rem}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(6px)}
.modal{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem;width:460px;max-width:95vw;max-height:90vh;overflow-y:auto}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem}
.modal-title{font-size:1rem;font-weight:700}
.close-btn{background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.1rem;padding:4px}
.modal-footer{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.1rem}
.info-row{display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid rgba(42,42,58,.5);font-size:.82rem}
.info-row:last-child{border-bottom:none}
.info-key{color:var(--muted)}
.info-val{font-family:var(--mono);font-weight:500;font-size:.78rem}
.page{display:none}.page.active{display:block}
.page-title{font-size:1.3rem;font-weight:900;margin-bottom:.2rem}
.page-sub{color:var(--muted);font-size:.82rem;margin-bottom:1.1rem}
.dot-live{width:6px;height:6px;border-radius:50%;background:var(--accent2);animation:pulse 2s infinite;display:inline-block}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.search-input{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:.35rem .75rem;color:var(--text);font-size:.82rem;outline:none;width:180px;direction:rtl}
.ai-box{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.1rem;margin-bottom:1.25rem}
.ai-header{font-size:.82rem;font-weight:700;margin-bottom:.6rem;color:var(--accent2)}
.ai-input-row{display:flex;gap:.5rem}
.ai-input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:.6rem .85rem;color:var(--text);font-size:.875rem;outline:none;direction:rtl}
.ai-input:focus{border-color:var(--accent2)}
.ai-response{margin-top:.9rem;padding:.9rem;background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);border-radius:8px;font-size:.825rem;line-height:1.7;display:none;white-space:pre-wrap;direction:rtl}
.ai-suggestions{margin-top:.65rem;display:flex;gap:.35rem;flex-wrap:wrap}
.alert-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem 1.1rem;margin-bottom:.65rem;display:flex;align-items:flex-start;gap:.75rem}
.alert-body{flex:1}
.alert-title{font-weight:700;font-size:.83rem;margin-bottom:.15rem}
.alert-desc{color:var(--muted);font-size:.76rem;line-height:1.5}
.alert-sev-high{border-right:3px solid var(--warn)}
.alert-sev-med{border-right:3px solid var(--orange)}
.export-grid{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-bottom:1.25rem}
.export-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.1rem;text-align:center;cursor:pointer;transition:all .2s}
.export-card:hover{border-color:var(--accent);background:rgba(79,127,255,.05)}
.export-icon{font-size:1.75rem;margin-bottom:.4rem}
.export-title{font-weight:700;font-size:.85rem;margin-bottom:.2rem}
.export-desc{color:var(--muted);font-size:.74rem}
@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{height:auto;position:static;border-right:none;border-bottom:1px solid var(--border);order:1;display:flex;overflow-x:auto;padding:.5rem}.main{order:2;padding:1rem}.nav-section{margin-bottom:0;display:flex;gap:.25rem}.nav-label{display:none}.nav-item{white-space:nowrap;border-right:none;border-radius:6px;font-size:.75rem}.nav-item.active{border-right:none;background:rgba(79,127,255,.15)}}
@media(max-width:650px){.stats-grid{grid-template-columns:1fr 1fr}.export-grid{grid-template-columns:1fr}}
</style>
</head>
<body>

<!-- LOGIN PAGE -->
<div id="loginPage" class="login-wrap">
  <div class="login-card">
    <div class="login-logo">◈ META<span>ADS</span> <span style="color:var(--muted);font-size:.7rem">PRO</span></div>
    <div class="login-sub">התחבר לניהול הקמפיינים שלך</div>
    <div id="loginErr" class="login-err">⚠️ שם משתמש או סיסמה שגויים</div>
    <div class="form-group">
      <label class="form-label">שם משתמש</label>
      <input type="text" class="form-input" id="loginUser" placeholder="שם משתמש" style="direction:rtl;text-align:right" onkeydown="if(event.key==='Enter')document.getElementById('loginPass').focus()"/>
    </div>
    <div class="form-group">
      <label class="form-label">סיסמה</label>
      <input type="password" class="form-input" id="loginPass" placeholder="••••••••" onkeydown="if(event.key==='Enter')login()"/>
    </div>
    <button class="btn-login" onclick="login()" id="loginBtn">🔐 התחבר</button>
    <div class="login-dots">
      <div class="login-dot active"></div>
      <div class="login-dot"></div>
      <div class="login-dot"></div>
    </div>
  </div>
</div>

<!-- APP -->
<div id="appPage" style="display:none">

<header class="header">
  <div class="logo">◈ META<span>ADS</span></div>
  <select class="account-switcher" id="accountSwitcher" onchange="switchAccount(this.value)"></select>
  <div class="header-right">
    <div class="dot-live"></div>
    <div class="user-badge" id="userBadge">ADMIN</div>
    <button class="btn btn-sm btn-ghost" onclick="refreshAll()">🔄</button>
    <button class="btn btn-sm btn-ghost" onclick="logout()">יציאה</button>
  </div>
</header>

<div class="date-bar">
  <button class="date-btn active" onclick="setDP('today',this)">היום</button>
  <button class="date-btn" onclick="setDP('yesterday',this)">אתמול</button>
  <button class="date-btn" onclick="setDP('last_7d',this)">7 ימים</button>
  <button class="date-btn" onclick="setDP('last_14d',this)">14 ימים</button>
  <button class="date-btn" onclick="setDP('last_30d',this)">30 ימים</button>
  <button class="date-btn" onclick="setDP('last_month',this)">חודש שעבר</button>
  <input type="date" id="dateFrom" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.28rem .55rem;color:var(--text);font-size:.75rem;outline:none;direction:ltr;margin-right:auto">
  <span style="color:var(--muted);font-size:.75rem">—</span>
  <input type="date" id="dateTo" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:.28rem .55rem;color:var(--text);font-size:.75rem;outline:none;direction:ltr">
  <button class="btn btn-sm btn-ghost" onclick="setCustomDate()">הפעל</button>
</div>

<div class="alerts-bar" id="alertsBar"></div>

<div class="layout">
  <nav class="sidebar">
    <div class="nav-section">
      <span class="nav-label">ניתוח</span>
      <div class="nav-item active" onclick="nav('dashboard',this)">📊 דשבורד</div>
      <div class="nav-item" onclick="nav('campaigns',this)">📋 קמפיינים</div>
      <div class="nav-item" onclick="nav('adsets',this)">🎯 Ad Sets</div>
      <div class="nav-item" onclick="nav('ads',this)">🖼️ מודעות</div>
    </div>
    <div class="nav-section">
      <span class="nav-label">כלים</span>
      <div class="nav-item" onclick="nav('create',this)">➕ יצירה</div>
      <div class="nav-item" onclick="nav('alerts',this)">🔔 התראות <span id="alertBadge" style="display:none;background:var(--warn);color:#fff;border-radius:10px;font-size:.62rem;padding:1px 5px;margin-right:4px"></span></div>
      <div class="nav-item" onclick="nav('ai',this)">🤖 AI</div>
      <div class="nav-item" onclick="nav('export',this)">📥 ייצוא</div>
    </div>
  </nav>

  <main class="main">

    <div class="page active" id="page-dashboard">
      <div class="page-title">📊 דשבורד</div>
      <div class="page-sub" id="dashSub">טוען...</div>
      <div class="stats-grid" id="statsGrid"><div class="loading" style="grid-column:1/-1"><div class="spinner"></div></div></div>
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">📈 ביצועים לאורך זמן</div>
          <div class="chart-toggles">
            <button class="chart-toggle active-spend" onclick="toggleMetric('spend',this)">הוצאה</button>
            <button class="chart-toggle" onclick="toggleMetric('clicks',this)">קליקים</button>
            <button class="chart-toggle" onclick="toggleMetric('ctr',this)">CTR</button>
          </div>
        </div>
        <div class="chart-wrap"><canvas id="mainChart"></canvas></div>
      </div>
      <div class="section-header">
        <div class="section-title">🔥 קמפיינים פעילים</div>
        <button class="btn btn-sm btn-accent" onclick="nav('campaigns',document.querySelectorAll('.nav-item')[1])">כולם →</button>
      </div>
      <div class="table-wrap" id="dashCampaigns"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <div class="page" id="page-campaigns">
      <div class="page-title">📋 קמפיינים</div>
      <div class="page-sub">לחץ על כותרת למיון</div>
      <div class="section-header">
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          <button class="btn btn-sm btn-ghost" onclick="loadCampaigns()">🔄 רענן</button>
          <button class="btn btn-sm btn-accent" onclick="nav('create',document.querySelectorAll('.nav-item')[4])">➕ חדש</button>
        </div>
        <input class="search-input" placeholder="🔍 חיפוש..." oninput="filterTbl('campTbl',this.value)"/>
      </div>
      <div class="table-wrap" id="campTbl"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <div class="page" id="page-adsets">
      <div class="page-title">🎯 Ad Sets</div>
      <div class="page-sub">קבוצות מודעות</div>
      <div class="section-header">
        <button class="btn btn-sm btn-ghost" onclick="loadAdsets()">🔄 רענן</button>
        <input class="search-input" placeholder="🔍 חיפוש..." oninput="filterTbl('adsetTbl',this.value)"/>
      </div>
      <div class="table-wrap" id="adsetTbl"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <div class="page" id="page-ads">
      <div class="page-title">🖼️ מודעות</div>
      <div class="page-sub">כל המודעות</div>
      <div class="section-header">
        <button class="btn btn-sm btn-ghost" onclick="loadAds()">🔄 רענן</button>
        <input class="search-input" placeholder="🔍 חיפוש..." oninput="filterTbl('adsTbl',this.value)"/>
      </div>
      <div class="table-wrap" id="adsTbl"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <div class="page" id="page-create">
      <div class="page-title">➕ קמפיין חדש</div>
      <div class="page-sub">הגדר את פרטי הקמפיין</div>
      <div class="table-wrap" style="padding:1.4rem;max-width:540px">
        <div id="createErr" class="error-box" style="display:none">⚠️ <span id="createErrMsg"></span></div>
        <div id="createOk" class="success-box" style="display:none">✅ הקמפיין נוצר בהצלחה!</div>
        <div class="form-group"><label class="form-label">שם</label><input type="text" class="form-input" id="campName" style="direction:rtl;text-align:right" placeholder="שם הקמפיין..."/></div>
        <div class="form-group"><label class="form-label">מטרה</label>
          <select class="form-input" id="campObj">
            <option value="OUTCOME_TRAFFIC">תנועה</option>
            <option value="OUTCOME_ENGAGEMENT">מעורבות</option>
            <option value="OUTCOME_LEADS">לידים</option>
            <option value="OUTCOME_SALES">מכירות</option>
            <option value="OUTCOME_APP_PROMOTION">אפליקציה</option>
            <option value="OUTCOME_AWARENESS">מודעות</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">תקציב יומי (₪)</label><input type="number" class="form-input" id="campBudget" placeholder="100" min="1" style="direction:ltr;text-align:left"/></div>
        <div class="form-group"><label class="form-label">סטטוס</label>
          <select class="form-input" id="campStatus"><option value="PAUSED">עצור (מומלץ)</option><option value="ACTIVE">פעיל</option></select>
        </div>
        <div style="display:flex;gap:.6rem">
          <button class="btn btn-primary" onclick="createCamp()" id="createBtn" style="flex:1">🚀 צור קמפיין</button>
          <button class="btn btn-ghost btn-sm" onclick="nav('campaigns',document.querySelectorAll('.nav-item')[1])">ביטול</button>
        </div>
      </div>
    </div>

    <div class="page" id="page-alerts">
      <div class="page-title">🔔 התראות חכמות</div>
      <div class="page-sub">AI שסורק ומזהה בעיות</div>
      <div class="section-header"><button class="btn btn-sm btn-ghost" onclick="runAlerts()">🔄 סרוק</button></div>
      <div id="alertsList"><div class="loading"><div class="spinner"></div></div></div>
    </div>

    <div class="page" id="page-ai">
      <div class="page-title">🤖 AI Assistant</div>
      <div class="page-sub">שאל שאלות בעברית על הקמפיינים</div>
      <div class="ai-box">
        <div class="ai-header">✨ Claude מנתח את הנתונים שלך</div>
        <div class="ai-input-row">
          <input type="text" class="ai-input" id="aiQ" placeholder="לדוגמה: אילו קמפיינים לעצור?" onkeydown="if(event.key==='Enter')askAI()"/>
          <button class="btn btn-accent btn-sm" onclick="askAI()" id="aiBtn">שלח</button>
        </div>
        <div class="ai-response" id="aiResp"></div>
        <div class="ai-suggestions">
          <button class="btn btn-ghost btn-sm" onclick="setQ('אילו קמפיינים לא מביאים תוצאות?')">קמפיינים חלשים</button>
          <button class="btn btn-ghost btn-sm" onclick="setQ('מה ה-CPA הממוצע שלי?')">CPA ממוצע</button>
          <button class="btn btn-ghost btn-sm" onclick="setQ('איזה קמפיין הכי טוב?')">הקמפיין הטוב</button>
          <button class="btn btn-ghost btn-sm" onclick="setQ('תן לי המלצות לשיפור')">המלצות</button>
        </div>
      </div>
    </div>

    <div class="page" id="page-export">
      <div class="page-title">📥 ייצוא דוחות</div>
      <div class="page-sub">הורד ושתף עם לקוחות</div>
      <div class="export-grid">
        <div class="export-card" onclick="exportCSV()"><div class="export-icon">📊</div><div class="export-title">CSV לאקסל</div><div class="export-desc">כל נתוני הקמפיינים</div></div>
        <div class="export-card" onclick="exportJSON()"><div class="export-icon">🗂️</div><div class="export-title">JSON גולמי</div><div class="export-desc">לעיבוד נוסף</div></div>
        <div class="export-card" onclick="exportPDF()"><div class="export-icon">📄</div><div class="export-title">דוח PDF</div><div class="export-desc">לשליחה ללקוחות</div></div>
        <div class="export-card" onclick="copyShare()"><div class="export-icon">🔗</div><div class="export-title">העתק לשיתוף</div><div class="export-desc">ווטסאפ / מייל</div></div>
      </div>
      <div id="exportMsg" class="success-box" style="display:none"></div>
    </div>

  </main>
</div>
</div>

<!-- EDIT MODAL -->
<div class="modal-overlay" id="editModal" style="display:none">
  <div class="modal">
    <div class="modal-header"><div class="modal-title">✏️ עריכת קמפיין</div><button class="close-btn" onclick="closeModal()">✕</button></div>
    <div id="editContent"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-sm" onclick="closeModal()">ביטול</button>
      <button class="btn btn-accent btn-sm" onclick="saveEdit()">💾 שמור</button>
    </div>
  </div>
</div>

<script>
const BASE = '';
let SESSION = localStorage.getItem('adsSession') || '';
let ACCT = localStorage.getItem('metaAccount') || '';
let allAccounts = [], campsData = [], adsetsData = [], adsData = [], editId = '';
let datePreset = 'today', dateFrom = '', dateTo = '', activeMetric = 'spend', chartInst = null;

const fmt=n=>{if(!n)return'0';const x=parseFloat(n);if(x>=1e6)return(x/1e6).toFixed(1)+'M';if(x>=1e3)return(x/1e3).toFixed(1)+'K';return x.toFixed(0)};
const fmtM=n=>'₪'+parseFloat(n||0).toFixed(2);
const fmtP=n=>parseFloat(n||0).toFixed(2)+'%';
const today=()=>new Date().toISOString().split('T')[0];
const daysAgo=n=>new Date(Date.now()-n*86400000).toISOString().split('T')[0];
const getDP=()=>dateFrom&&dateTo?\`time_range={'since':'${dateFrom}','until':'${dateTo}'}\`:\`date_preset=${datePreset}\`;

// ─── AUTH ─────────────────────────────────────────────────
async function login() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');
  btn.textContent = '⏳ מתחבר...'; btn.disabled = true;
  document.getElementById('loginErr').style.display = 'none';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const d = await res.json();
    if (!d.ok) throw new Error('שגיאה');
    SESSION = d.session;
    localStorage.setItem('adsSession', SESSION);
    await initApp();
  } catch(e) {
    document.getElementById('loginErr').style.display = 'block';
    btn.textContent = '🔐 התחבר'; btn.disabled = false;
  }
}

function logout() {
  SESSION = ''; ACCT = '';
  localStorage.removeItem('adsSession');
  localStorage.removeItem('metaAccount');
  document.getElementById('appPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

async function initApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'block';
  document.getElementById('dateFrom').value = daysAgo(7);
  document.getElementById('dateTo').value = today();
  // Load accounts
  try {
    const d = await apiGet('me/adaccounts?fields=name,account_id,currency,account_status&limit=50');
    allAccounts = (d.data||[]).filter(a=>a.account_status===1);
    if (!ACCT && allAccounts.length) ACCT = allAccounts[0].account_id;
    buildSwitcher();
  } catch(e) {}
  nav('dashboard', document.querySelector('.nav-item'));
  loadDashboard();
}

function buildSwitcher() {
  const sw = document.getElementById('accountSwitcher');
  sw.innerHTML = allAccounts.map(a=>\`<option value="\${a.account_id}" \${a.account_id===ACCT?'selected':''}>\${a.name} (\${a.currency})</option>\`).join('');
}
function switchAccount(id) { ACCT=id; localStorage.setItem('metaAccount',id); campsData=[]; loadDashboard(); }

// ─── API via Server Proxy ─────────────────────────────────
async function apiGet(path) {
  const res = await fetch(\`/api/meta/\${path}\`, {
    headers: { 'Authorization': SESSION }
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}
async function apiPost(path, body) {
  const res = await fetch(\`/api/meta/\${path}\`, {
    method: 'POST',
    headers: { 'Authorization': SESSION, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

// ─── DATE ─────────────────────────────────────────────────
function setDP(preset,btn){datePreset=preset;dateFrom='';dateTo='';document.querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');refreshAll();}
function setCustomDate(){dateFrom=document.getElementById('dateFrom').value;dateTo=document.getElementById('dateTo').value;if(!dateFrom||!dateTo)return;document.querySelectorAll('.date-btn').forEach(b=>b.classList.remove('active'));refreshAll();}
function refreshAll(){const p=document.querySelector('.page.active');if(!p)return;const id=p.id.replace('page-','');if(id==='dashboard')loadDashboard();else if(id==='campaigns')loadCampaigns();else if(id==='adsets')loadAdsets();else if(id==='ads')loadAds();}

// ─── NAV ──────────────────────────────────────────────────
function nav(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el)el.classList.add('active');
  if(name==='campaigns')loadCampaigns();
  else if(name==='adsets')loadAdsets();
  else if(name==='ads')loadAds();
  else if(name==='alerts')runAlerts();
  else if(name==='ai')prepAI();
}

// ─── DASHBOARD ────────────────────────────────────────────
async function loadDashboard(){
  document.getElementById('dashSub').textContent='טוען...';
  try{
    const dp = getDP();
    const ins=await apiGet(\`act_\${ACCT}/insights?\${dp}&fields=spend,impressions,clicks,ctr,actions,cost_per_action_type&level=account\`);
    const d=ins.data?.[0]||{};
    const purchases=(d.actions||[]).find(a=>a.action_type==='purchase')?.value||0;
    const cpa=(d.cost_per_action_type||[]).find(a=>a.action_type==='purchase')?.value||0;
    const roas=purchases>0&&d.spend>0?(purchases/parseFloat(d.spend)*100).toFixed(2):0;
    let p={};try{const pi=await apiGet(\`act_\${ACCT}/insights?date_preset=last_month&fields=spend,impressions,ctr&level=account\`);p=pi.data?.[0]||{};}catch(e){}
    const chg=(cur,prev)=>{if(!prev||prev==0)return'';const pct=((cur-prev)/prev*100).toFixed(1);return\`<span class="stat-change \${pct>=0?'up':'down'}">\${pct>=0?'↑':'↓'}\${Math.abs(pct)}%</span>\`;};
    document.getElementById('statsGrid').innerHTML=\`
      <div class="stat-card"><div class="stat-label">הוצאה</div><div class="stat-value" style="color:var(--accent)">\${fmtM(d.spend)}</div><div class="stat-sub">תקופה נבחרת</div>\${chg(parseFloat(d.spend),parseFloat(p.spend))}</div>
      <div class="stat-card"><div class="stat-label">הופעות</div><div class="stat-value" style="color:var(--orange)">\${fmt(d.impressions)}</div><div class="stat-sub">\${fmt(d.clicks)} קליקים</div>\${chg(parseFloat(d.impressions),parseFloat(p.impressions))}</div>
      <div class="stat-card"><div class="stat-label">CTR</div><div class="stat-value" style="color:var(--purple)">\${fmtP(d.ctr)}</div><div class="stat-sub">שיעור הקלקה</div>\${chg(parseFloat(d.ctr),parseFloat(p.ctr))}</div>
      <div class="stat-card"><div class="stat-label">רכישות</div><div class="stat-value" style="color:var(--accent2)">\${fmt(purchases)}</div><div class="stat-sub">purchase events</div></div>
      <div class="stat-card"><div class="stat-label">CPA</div><div class="stat-value" style="color:#fd79a8">\${cpa?fmtM(cpa):'-'}</div><div class="stat-sub">עלות לרכישה</div></div>
      <div class="stat-card"><div class="stat-label">ROAS</div><div class="stat-value" style="color:#55efc4">\${roas?roas+'x':'-'}</div><div class="stat-sub">תשואה על הוצאה</div></div>\`;
    document.getElementById('dashSub').textContent=\`עדכון: \${new Date().toLocaleTimeString('he-IL')}\`;
  }catch(e){document.getElementById('statsGrid').innerHTML=\`<div class="error-box" style="grid-column:1/-1">⚠️ \${e.message}</div>\`;}
  try{const ins=await apiGet(\`act_\${ACCT}/insights?time_increment=1&\${getDP()}&fields=spend,clicks,ctr,date_start\`);renderChart(ins.data||[]);}catch(e){}
  try{const camps=await apiGet(\`act_\${ACCT}/campaigns?fields=name,status,daily_budget,insights{spend,impressions,ctr}&limit=8&effective_status=["ACTIVE"]\`);renderCampTable('dashCampaigns',camps.data||[],true);}
  catch(e){document.getElementById('dashCampaigns').innerHTML=\`<div class="error-box" style="margin:1rem">⚠️ \${e.message}</div>\`;}
}

function renderChart(data){
  if(chartInst)chartInst.destroy();
  const labels=data.map(d=>{const dt=new Date(d.date_start);return dt.toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit'});});
  const ds={spend:{label:'הוצאה',data:data.map(d=>parseFloat(d.spend||0)),borderColor:'#4f7fff',backgroundColor:'rgba(79,127,255,.1)',tension:.4,fill:true},clicks:{label:'קליקים',data:data.map(d=>parseFloat(d.clicks||0)),borderColor:'#00e5a0',backgroundColor:'rgba(0,229,160,.1)',tension:.4,fill:true},ctr:{label:'CTR',data:data.map(d=>parseFloat(d.ctr||0)),borderColor:'#ff9f43',backgroundColor:'rgba(255,159,67,.1)',tension:.4,fill:true}};
  chartInst=new Chart(document.getElementById('mainChart').getContext('2d'),{type:'line',data:{labels,datasets:[ds[activeMetric]]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'#1a1a24',borderColor:'#2a2a3a',borderWidth:1,titleColor:'#e8e8f0',bodyColor:'#6b6b8a'}},scales:{x:{grid:{color:'rgba(42,42,58,.5)'},ticks:{color:'#6b6b8a',font:{size:10}}},y:{grid:{color:'rgba(42,42,58,.5)'},ticks:{color:'#6b6b8a',font:{size:10}}}}}});
}
function toggleMetric(m,btn){activeMetric=m;document.querySelectorAll('.chart-toggle').forEach(b=>b.className='chart-toggle');btn.classList.add('active-'+m);refreshAll();}

// ─── CAMPAIGNS ────────────────────────────────────────────
async function loadCampaigns(){
  document.getElementById('campTbl').innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try{const r=await apiGet(\`act_\${ACCT}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,insights{spend,impressions,clicks,ctr,actions}&limit=100&\${getDP()}\`);campsData=r.data||[];renderCampTable('campTbl',campsData,false);}
  catch(e){document.getElementById('campTbl').innerHTML=\`<div class="error-box" style="margin:1rem">⚠️ \${e.message}</div>\`;}
}
function renderCampTable(el,data,mini){
  if(!data.length){document.getElementById(el).innerHTML='<div class="loading">אין קמפיינים</div>';return;}
  const rows=data.map(c=>{
    const ins=c.insights?.data?.[0]||{};
    const badge=c.status==='ACTIVE'?'badge-active':'badge-paused';
    const label=c.status==='ACTIVE'?'פעיל':'עצור';
    const budget=c.daily_budget?fmtM(c.daily_budget/100)+'/י':'-';
    const purchases=(ins.actions||[]).find(a=>a.action_type==='purchase')?.value||0;
    const acts=mini?'':\`<td>\${purchases||'-'}</td><td><div class="actions">
      \${c.status==='ACTIVE'?\`<button class="btn btn-sm btn-danger" onclick="toggle('\${c.id}','PAUSED','camp')">⏸</button>\`:\`<button class="btn btn-sm btn-success" onclick="toggle('\${c.id}','ACTIVE','camp')">▶</button>\`}
      <button class="btn btn-sm btn-ghost" onclick="openEdit('\${c.id}')">✏️</button>
    </div></td>\`;
    return \`<tr><td style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis">\${c.name}</td><td><span class="badge \${badge}"><span class="dot"></span>\${label}</span></td><td><span class="tag">\${(c.objective||'').replace('OUTCOME_','')}</span></td><td>\${budget}</td><td>\${fmtM(ins.spend)}</td><td>\${fmt(ins.impressions)}</td><td>\${fmtP(ins.ctr)}</td>\${acts}</tr>\`;
  });
  const h=mini?'':\`<th>רכישות</th><th>פעולות</th>\`;
  document.getElementById(el).innerHTML=\`<table><thead><tr><th>שם</th><th>סטטוס</th><th>מטרה</th><th>תקציב</th><th>הוצאה</th><th>הופעות</th><th>CTR</th>\${h}</tr></thead><tbody>\${rows.join('')}</tbody></table>\`;
}

async function loadAdsets(){
  document.getElementById('adsetTbl').innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try{const r=await apiGet(\`act_\${ACCT}/adsets?fields=name,status,daily_budget,insights{spend,impressions,clicks,ctr}&limit=100&\${getDP()}\`);adsetsData=r.data||[];
  if(!adsetsData.length){document.getElementById('adsetTbl').innerHTML='<div class="loading">אין Ad Sets</div>';return;}
  const rows=adsetsData.map(a=>{const ins=a.insights?.data?.[0]||{};const badge=a.status==='ACTIVE'?'badge-active':'badge-paused';
    return \`<tr><td style="font-weight:600">\${a.name}</td><td><span class="badge \${badge}"><span class="dot"></span>\${a.status==='ACTIVE'?'פעיל':'עצור'}</span></td><td>\${a.daily_budget?fmtM(a.daily_budget/100)+'/י':'-'}</td><td>\${fmtM(ins.spend)}</td><td>\${fmt(ins.impressions)}</td><td>\${fmtP(ins.ctr)}</td><td><div class="actions">\${a.status==='ACTIVE'?\`<button class="btn btn-sm btn-danger" onclick="toggle('\${a.id}','PAUSED','adset')">⏸</button>\`:\`<button class="btn btn-sm btn-success" onclick="toggle('\${a.id}','ACTIVE','adset')">▶</button>\`}</div></td></tr>\`;
  });
  document.getElementById('adsetTbl').innerHTML=\`<table><thead><tr><th>שם</th><th>סטטוס</th><th>תקציב</th><th>הוצאה</th><th>הופעות</th><th>CTR</th><th>פעולות</th></tr></thead><tbody>\${rows.join('')}</tbody></table>\`;}
  catch(e){document.getElementById('adsetTbl').innerHTML=\`<div class="error-box" style="margin:1rem">⚠️ \${e.message}</div>\`;}
}

async function loadAds(){
  document.getElementById('adsTbl').innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try{const r=await apiGet(\`act_\${ACCT}/ads?fields=name,status,insights{spend,impressions,clicks,ctr}&limit=100&\${getDP()}\`);adsData=r.data||[];
  if(!adsData.length){document.getElementById('adsTbl').innerHTML='<div class="loading">אין מודעות</div>';return;}
  const rows=adsData.map(a=>{const ins=a.insights?.data?.[0]||{};const badge=a.status==='ACTIVE'?'badge-active':'badge-paused';
    return \`<tr><td style="font-weight:600">\${a.name}</td><td><span class="badge \${badge}"><span class="dot"></span>\${a.status==='ACTIVE'?'פעיל':'עצור'}</span></td><td>\${fmtM(ins.spend)}</td><td>\${fmt(ins.impressions)}</td><td>\${fmt(ins.clicks)}</td><td>\${fmtP(ins.ctr)}</td><td><div class="actions">\${a.status==='ACTIVE'?\`<button class="btn btn-sm btn-danger" onclick="toggle('\${a.id}','PAUSED','ad')">⏸</button>\`:\`<button class="btn btn-sm btn-success" onclick="toggle('\${a.id}','ACTIVE','ad')">▶</button>\`}</div></td></tr>\`;
  });
  document.getElementById('adsTbl').innerHTML=\`<table><thead><tr><th>שם</th><th>סטטוס</th><th>הוצאה</th><th>הופעות</th><th>קליקים</th><th>CTR</th><th>פעולות</th></tr></thead><tbody>\${rows.join('')}</tbody></table>\`;}
  catch(e){document.getElementById('adsTbl').innerHTML=\`<div class="error-box" style="margin:1rem">⚠️ \${e.message}</div>\`;}
}

async function toggle(id,status,type){
  try{await apiPost(id,{status});if(type==='camp')loadCampaigns();else if(type==='adset')loadAdsets();else loadAds();}
  catch(e){alert('שגיאה: '+e.message);}
}

function openEdit(id){
  const c=campsData.find(x=>x.id===id);if(!c)return;editId=id;
  document.getElementById('editContent').innerHTML=\`<div class="form-group"><label class="form-label">שם</label><input type="text" class="form-input" id="editName" value="\${c.name}" style="direction:rtl;text-align:right"/></div><div class="form-group"><label class="form-label">תקציב יומי (₪)</label><input type="number" class="form-input" id="editBudget" value="\${c.daily_budget?c.daily_budget/100:''}" min="1" style="direction:ltr;text-align:left"/></div><div class="form-group"><label class="form-label">סטטוס</label><select class="form-input" id="editStatus"><option value="ACTIVE" \${c.status==='ACTIVE'?'selected':''}>פעיל</option><option value="PAUSED" \${c.status==='PAUSED'?'selected':''}>עצור</option></select></div><div class="info-row"><span class="info-key">ID</span><span class="info-val">\${c.id}</span></div>\`;
  document.getElementById('editModal').style.display='flex';
}
async function saveEdit(){
  try{const b={name:document.getElementById('editName').value.trim(),status:document.getElementById('editStatus').value};const bv=document.getElementById('editBudget').value;if(bv)b.daily_budget=Math.round(parseFloat(bv)*100);await apiPost(editId,b);closeModal();loadCampaigns();}
  catch(e){alert('שגיאה: '+e.message);}
}
function closeModal(){document.getElementById('editModal').style.display='none';}

async function createCamp(){
  const name=document.getElementById('campName').value.trim(),budget=document.getElementById('campBudget').value,btn=document.getElementById('createBtn');
  document.getElementById('createErr').style.display='none';document.getElementById('createOk').style.display='none';
  if(!name||!budget){document.getElementById('createErr').style.display='flex';document.getElementById('createErrMsg').textContent='יש למלא שם ותקציב';return;}
  btn.textContent='⏳...';btn.disabled=true;
  try{await apiPost(\`act_\${ACCT}/campaigns\`,{name,objective:document.getElementById('campObj').value,status:document.getElementById('campStatus').value,daily_budget:Math.round(parseFloat(budget)*100),special_ad_categories:'[]'});document.getElementById('createOk').style.display='block';document.getElementById('campName').value='';document.getElementById('campBudget').value='';}
  catch(e){document.getElementById('createErr').style.display='flex';document.getElementById('createErrMsg').textContent=e.message;}
  finally{btn.textContent='🚀 צור קמפיין';btn.disabled=false;}
}

async function runAlerts(){
  document.getElementById('alertsList').innerHTML='<div class="loading"><div class="spinner"></div><span>סורק...</span></div>';
  try{
    const r=await apiGet(\`act_\${ACCT}/campaigns?fields=name,status,daily_budget,insights{spend,ctr,actions,cost_per_action_type}&limit=50&date_preset=last_7d\`);
    const alerts=[];
    (r.data||[]).forEach(c=>{
      if(c.status!=='ACTIVE')return;
      const ins=c.insights?.data?.[0]||{};
      const spend=parseFloat(ins.spend||0),ctr=parseFloat(ins.ctr||0);
      const purchases=(ins.actions||[]).find(a=>a.action_type==='purchase')?.value||0;
      const cpa=(ins.cost_per_action_type||[]).find(a=>a.action_type==='purchase')?.value||0;
      if(spend>50&&purchases==0)alerts.push({sev:'high',icon:'🔴',title:\`\${c.name} — הוצאה ללא המרות\`,desc:\`₪\${spend.toFixed(0)} הוצאה ללא רכישות. שקול לעצור.\`,id:c.id});
      if(ctr>0&&ctr<0.3)alerts.push({sev:'med',icon:'🟡',title:\`\${c.name} — CTR נמוך (\${ctr.toFixed(2)}%)\`,desc:'CTR מתחת ל-0.3%. מומלץ לחדש קריאייטיב.',id:c.id});
      if(cpa>200)alerts.push({sev:'med',icon:'🟡',title:\`\${c.name} — CPA גבוה (₪\${parseFloat(cpa).toFixed(0)})\`,desc:'עלות רכישה גבוהה.',id:c.id});
    });
    const badge=document.getElementById('alertBadge');
    alerts.length?(badge.style.display='inline',badge.textContent=alerts.length):badge.style.display='none';
    const hi=alerts.filter(a=>a.sev==='high');
    const bar=document.getElementById('alertsBar');
    hi.length?(bar.style.display='block',bar.innerHTML=hi.map(a=>\`<div class="alert-top">🔴 \${a.title}</div>\`).join('')):bar.style.display='none';
    if(!alerts.length){document.getElementById('alertsList').innerHTML='<div class="success-box">✅ הקמפיינים נראים טוב!</div>';return;}
    document.getElementById('alertsList').innerHTML=alerts.map(a=>\`<div class="alert-card alert-sev-\${a.sev}"><div style="font-size:1.2rem;flex-shrink:0">\${a.icon}</div><div class="alert-body"><div class="alert-title">\${a.title}</div><div class="alert-desc">\${a.desc}</div></div>\${a.id?\`<button class="btn btn-sm btn-danger" onclick="toggle('\${a.id}','PAUSED','camp');setTimeout(runAlerts,1500)">⏸</button>\":''}</div>\`).join('');
  }catch(e){document.getElementById('alertsList').innerHTML=\`<div class="error-box">⚠️ \${e.message}</div>\`;}
}

let aiCtx='';
async function prepAI(){try{const r=await apiGet(\`act_\${ACCT}/campaigns?fields=name,status,objective,daily_budget,insights{spend,impressions,clicks,ctr,actions}&limit=30&date_preset=last_7d\`);aiCtx=JSON.stringify(r.data||[]);}catch(e){}}
async function askAI(){
  const q=document.getElementById('aiQ').value.trim();if(!q)return;
  const btn=document.getElementById('aiBtn'),el=document.getElementById('aiResp');
  el.style.display='block';el.textContent='⏳ מנתח...';btn.disabled=true;
  try{
    if(!aiCtx)await prepAI();
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:\`אתה מנהל קמפיינים מנוסה ב-Meta Ads. נתוני הקמפיינים: \${aiCtx}. ענה בעברית עם המלצות מעשיות.\`,messages:[{role:'user',content:q}]})});
    const d=await r.json();el.textContent=d.content?.[0]?.text||'אין תשובה';
  }catch(e){el.textContent='⚠️ '+e.message;}
  btn.disabled=false;
}
function setQ(q){document.getElementById('aiQ').value=q;}

function exportCSV(){if(!campsData.length){alert('טען קמפיינים קודם');return;}const h=['שם','סטטוס','מטרה','תקציב','הוצאה','הופעות','קליקים','CTR'];const rows=campsData.map(c=>{const ins=c.insights?.data?.[0]||{};return[c.name,c.status,c.objective,c.daily_budget?c.daily_budget/100:'',ins.spend||0,ins.impressions||0,ins.clicks||0,ins.ctr||0].join(',');});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+[h.join(','),...rows].join('\n')],{type:'text/csv;charset=utf-8'}));a.download=\`meta-ads-\${today()}.csv\`;a.click();showExport('✅ CSV הורד!');}
function exportJSON(){if(!campsData.length){alert('טען קמפיינים קודם');return;}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({account:ACCT,date:today(),campaigns:campsData},null,2)],{type:'application/json'}));a.download=\`meta-ads-\${today()}.json\`;a.click();showExport('✅ JSON הורד!');}
function exportPDF(){window.print();showExport('✅ פתח הדפסה');}
async function copyShare(){if(!campsData.length){alert('טען קמפיינים קודם');return;}const txt=\`דוח Meta Ads - \${today()}\n\`+campsData.slice(0,5).map(c=>{const ins=c.insights?.data?.[0]||{};return\`\${c.name}: ₪\${parseFloat(ins.spend||0).toFixed(0)} הוצאה, \${parseFloat(ins.ctr||0).toFixed(2)}% CTR\`;}).join('\n');await navigator.clipboard.writeText(txt);showExport('✅ הועתק — הדבק בווטסאפ!');}
function showExport(msg){const el=document.getElementById('exportMsg');el.textContent=msg;el.style.display='block';setTimeout(()=>el.style.display='none',3000);}
function filterTbl(id,q){const t=document.querySelector(\`#\${id} table\`);if(!t)return;t.querySelectorAll('tbody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q.toLowerCase())?'':'none');}

// AUTO LOGIN
window.addEventListener('load',()=>{
  if(SESSION){
    fetch('/api/verify',{headers:{'Authorization':SESSION}}).then(r=>r.json()).then(d=>{if(d.ok)initApp();else{SESSION='';localStorage.removeItem('adsSession');}}).catch(()=>{});
  }
});
</script>
</body>
</html>`;

// ─── HTTP SERVER ──────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // LOGIN
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        if (username === CONFIG.USERNAME && password === CONFIG.PASSWORD) {
          const session = createSession();
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, session }));
        } else {
          res.writeHead(401);
          res.end(JSON.stringify({ ok: false }));
        }
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  // VERIFY SESSION
  if (pathname === '/api/verify') {
    const sid = req.headers['authorization'];
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ ok: isValidSession(sid) }));
    return;
  }

  // META PROXY
  if (pathname.startsWith('/api/meta/')) {
    const sid = req.headers['authorization'];
    if (!isValidSession(sid)) { res.writeHead(401); res.end(JSON.stringify({error:{message:'לא מחובר'}})); return; }
    const metaPath = pathname.replace('/api/meta/', '') + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        let params = '';
        try { const parsed = JSON.parse(body); params = new URLSearchParams(parsed).toString(); } catch(e) { params = body; }
        metaProxy(metaPath.split('?')[0], 'POST', params, res);
      });
    } else {
      metaProxy(metaPath, 'GET', null, res);
    }
    return;
  }

  // SERVE HTML
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(HTML);
});

server.listen(CONFIG.PORT, () => {
  console.log(`✅ Meta Ads Pro Server running on port ${CONFIG.PORT}`);
  console.log(`👤 Username: ${CONFIG.USERNAME}`);
  console.log(`🔑 Password: ${CONFIG.PASSWORD}`);
  console.log(`🔗 Open: http://localhost:${CONFIG.PORT}`);
});
