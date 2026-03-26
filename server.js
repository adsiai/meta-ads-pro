const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');

const U = 'ADMIN', P = 'IDO';
const TOKEN = process.env.META_TOKEN || '';
const PORT = process.env.PORT || 3000;
const sessions = new Map();

function mkSession() {
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

function metaCall(path, method, body, res) {
  const sep = path.includes('?') ? '&' : '?';
  const req = https.request({
    hostname: 'graph.facebook.com',
    path: '/v19.0/' + path + sep + 'access_token=' + TOKEN,
    method: method || 'GET',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
  }, r => {
    let d = '';
    r.on('data', c => d += c);
    r.on('end', () => { cors(res); res.setHeader('Content-Type','application/json'); res.writeHead(200); res.end(d); });
  });
  req.on('error', e => { cors(res); res.writeHead(500); res.end('{"error":{"message":"' + e.message + '"}}'); });
  if (body) req.write(body);
  req.end();
}

const PAGE = '<!DOCTYPE html>' +
'<html lang="he" dir="rtl"><head><meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
'<title>Meta Ads Pro</title>' +
'<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>' +
'<style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
'body{background:#0a0a0f;color:#e8e8f0;font-family:Heebo,sans-serif;min-height:100vh;direction:rtl}' +
'.wrap{min-height:100vh;display:flex;align-items:center;justify-content:center}' +
'.card{background:#111118;border:1px solid #2a2a3a;border-radius:20px;padding:2.5rem;width:380px;max-width:95vw}' +
'.logo{font-size:1.4rem;font-weight:900;color:#4f7fff;margin-bottom:.3rem}.logo span{color:#00e5a0}' +
'.sub{color:#6b6b8a;font-size:.85rem;margin-bottom:2rem}' +
'.lbl{display:block;font-size:.72rem;font-weight:700;color:#6b6b8a;margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.06em}' +
'.inp{width:100%;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:10px;padding:.7rem 1rem;color:#e8e8f0;font-size:.9rem;outline:none;margin-bottom:1rem;direction:ltr;text-align:left}' +
'.inp:focus{border-color:#4f7fff}' +
'.btn-lo{width:100%;background:#4f7fff;color:#fff;border:none;border-radius:10px;padding:.85rem;font-size:1rem;font-weight:700;cursor:pointer;font-family:Heebo,sans-serif}' +
'.btn-lo:hover{background:#3a6aee}' +
'.err{background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.3);border-radius:8px;padding:.7rem 1rem;color:#ff6b6b;font-size:.83rem;margin-bottom:1rem;display:none}' +
'.hdr{background:#111118;border-bottom:1px solid #2a2a3a;padding:0 1.25rem;display:flex;align-items:center;justify-content:space-between;height:54px;position:sticky;top:0;z-index:200;gap:.75rem}' +
'.logo2{font-size:.95rem;font-weight:900;color:#4f7fff}.logo2 span{color:#00e5a0}' +
'.sw{background:#1a1a24;border:1px solid #2a2a3a;border-radius:8px;padding:.35rem .7rem;color:#e8e8f0;font-size:.8rem;outline:none;cursor:pointer;flex:1;max-width:260px}' +
'.dbar{background:#111118;border-bottom:1px solid #2a2a3a;padding:.5rem 1rem;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}' +
'.dp{padding:.3rem .6rem;border-radius:6px;border:1px solid #2a2a3a;background:transparent;color:#6b6b8a;font-size:.75rem;cursor:pointer;font-family:Heebo,sans-serif}' +
'.dp:hover,.dp.on{background:rgba(79,127,255,.15);color:#4f7fff;border-color:rgba(79,127,255,.3)}' +
'.di{background:#1a1a24;border:1px solid #2a2a3a;border-radius:6px;padding:.28rem .55rem;color:#e8e8f0;font-size:.75rem;outline:none;direction:ltr}' +
'.layout{display:grid;grid-template-columns:1fr 200px;min-height:calc(100vh - 54px)}' +
'.side{background:#111118;border-right:1px solid #2a2a3a;padding:1rem 0;position:sticky;top:54px;height:calc(100vh - 54px);overflow-y:auto;order:2}' +
'.nlb{font-size:.6rem;color:#6b6b8a;text-transform:uppercase;letter-spacing:.1em;padding:0 1rem;margin-bottom:.35rem;display:block}' +
'.ns{margin-bottom:1.1rem}' +
'.ni{display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;cursor:pointer;font-size:.82rem;font-weight:500;color:#6b6b8a;transition:all .15s;border-right:3px solid transparent}' +
'.ni:hover{color:#e8e8f0;background:#1a1a24}.ni.on{color:#4f7fff;background:rgba(79,127,255,.08);border-right-color:#4f7fff}' +
'.main{padding:1.25rem;overflow-x:hidden;order:1;min-width:0}' +
'.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;border-radius:8px;font-size:.83rem;font-weight:600;cursor:pointer;border:none;transition:all .2s;white-space:nowrap;font-family:Heebo,sans-serif}' +
'.sm{padding:.32rem .7rem;font-size:.76rem;border-radius:6px}' +
'.bg{background:#1a1a24;color:#e8e8f0;border:1px solid #2a2a3a}.bg:hover{border-color:#4f7fff;color:#4f7fff}' +
'.ba{background:#4f7fff;color:#fff}' +
'.bsuc{background:rgba(0,229,160,.12);color:#00e5a0;border:1px solid rgba(0,229,160,.25)}.bsuc:hover{background:rgba(0,229,160,.22)}' +
'.bdan{background:rgba(255,107,107,.12);color:#ff6b6b;border:1px solid rgba(255,107,107,.25)}.bdan:hover{background:rgba(255,107,107,.22)}' +
'.bp{background:#4f7fff;color:#fff;width:100%;justify-content:center}' +
'.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.25rem}' +
'.sc{background:#111118;border:1px solid #2a2a3a;border-radius:12px;padding:1rem;position:relative;overflow:hidden}' +
'.sc::before{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:#4f7fff}' +
'.sc:nth-child(2)::before{background:#00e5a0}.sc:nth-child(3)::before{background:#ff9f43}' +
'.sc:nth-child(4)::before{background:#a29bfe}.sc:nth-child(5)::before{background:#fd79a8}.sc:nth-child(6)::before{background:#55efc4}' +
'.sl{font-size:.65rem;color:#6b6b8a;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.4rem}' +
'.sv{font-size:1.45rem;font-weight:900;line-height:1;margin-bottom:.15rem}.sm2{font-size:.7rem;color:#6b6b8a}' +
'.cc{background:#111118;border:1px solid #2a2a3a;border-radius:12px;padding:1.1rem;margin-bottom:1.25rem}' +
'.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.5rem}' +
'.ct{font-size:.875rem;font-weight:700}.ctg{display:flex;gap:.35rem}' +
'.ctb{padding:.22rem .6rem;border-radius:20px;font-size:.72rem;font-weight:600;cursor:pointer;border:1px solid #2a2a3a;background:transparent;color:#6b6b8a;font-family:Heebo,sans-serif}' +
'.cs{position:relative;height:180px}' +
'.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:.65rem;flex-wrap:wrap;gap:.4rem}' +
'.st{font-size:.9rem;font-weight:700}' +
'.tw{background:#111118;border:1px solid #2a2a3a;border-radius:12px;overflow-x:auto;margin-bottom:1.25rem}' +
'table{width:100%;border-collapse:collapse;min-width:600px}' +
'th{font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;color:#6b6b8a;padding:.65rem .9rem;text-align:right;border-bottom:1px solid #2a2a3a;background:#1a1a24;white-space:nowrap}' +
'td{padding:.65rem .9rem;font-size:.82rem;border-bottom:1px solid rgba(42,42,58,.5);vertical-align:middle;white-space:nowrap}' +
'tr:last-child td{border-bottom:none}tr:hover td{background:rgba(79,127,255,.04)}' +
'.bdc{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:20px;font-size:.7rem;font-weight:600}' +
'.bac{background:rgba(0,229,160,.12);color:#00e5a0;border:1px solid rgba(0,229,160,.25)}' +
'.bpc{background:rgba(255,107,107,.12);color:#ff6b6b;border:1px solid rgba(255,107,107,.25)}' +
'.dot{width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block}' +
'.ac{display:flex;gap:4px}' +
'.ld{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem;gap:.75rem;color:#6b6b8a;font-size:.825rem}' +
'.sp{width:28px;height:28px;border:2px solid #2a2a3a;border-top-color:#4f7fff;border-radius:50%;animation:spin .7s linear infinite}' +
'@keyframes spin{to{transform:rotate(360deg)}}' +
'.eb{background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.25);border-radius:10px;padding:.8rem 1rem;color:#ff6b6b;font-size:.82rem;margin-bottom:.9rem}' +
'.ok{background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.25);border-radius:10px;padding:.8rem 1rem;color:#00e5a0;font-size:.82rem;margin-bottom:.9rem}' +
'.mo{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(6px)}' +
'.mc{background:#111118;border:1px solid #2a2a3a;border-radius:16px;padding:1.5rem;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto}' +
'.mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem}' +
'.mt{font-size:1rem;font-weight:700}.xb{background:none;border:none;color:#6b6b8a;cursor:pointer;font-size:1.1rem;padding:4px}' +
'.mf{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.1rem}' +
'.pg{display:none}.pg.on{display:block}' +
'.pt{font-size:1.3rem;font-weight:900;margin-bottom:.2rem}.ps{color:#6b6b8a;font-size:.82rem;margin-bottom:1.1rem}' +
'.tg{display:inline-block;background:rgba(79,127,255,.12);color:#4f7fff;border:1px solid rgba(79,127,255,.2);border-radius:4px;font-size:.66rem;padding:1px 5px}' +
'.ai{background:#111118;border:1px solid #2a2a3a;border-radius:12px;padding:1.1rem;margin-bottom:1.25rem}' +
'.aih{font-size:.82rem;font-weight:700;margin-bottom:.6rem;color:#00e5a0}' +
'.air{display:flex;gap:.5rem}' +
'.aii{flex:1;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:8px;padding:.6rem .85rem;color:#e8e8f0;font-size:.875rem;outline:none;direction:rtl}' +
'.aii:focus{border-color:#00e5a0}' +
'.airsp{margin-top:.9rem;padding:.9rem;background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);border-radius:8px;font-size:.825rem;line-height:1.7;display:none;white-space:pre-wrap;direction:rtl}' +
'.aisug{margin-top:.65rem;display:flex;gap:.35rem;flex-wrap:wrap}' +
'.alc{background:#111118;border:1px solid #2a2a3a;border-radius:12px;padding:1rem 1.1rem;margin-bottom:.65rem;display:flex;align-items:flex-start;gap:.75rem}' +
'.alb{flex:1}.alt{font-weight:700;font-size:.83rem;margin-bottom:.15rem}.ald{color:#6b6b8a;font-size:.76rem;line-height:1.5}' +
'.ah{border-right:3px solid #ff6b6b}.am{border-right:3px solid #ff9f43}' +
'.eg{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-bottom:1.25rem}' +
'.ec{background:#111118;border:1px solid #2a2a3a;border-radius:12px;padding:1.1rem;text-align:center;cursor:pointer;transition:all .2s}' +
'.ec:hover{border-color:#4f7fff;background:rgba(79,127,255,.05)}' +
'.ei{font-size:1.75rem;margin-bottom:.4rem}.et{font-weight:700;font-size:.85rem;margin-bottom:.2rem}.ed{color:#6b6b8a;font-size:.74rem}' +
'.si{background:#1a1a24;border:1px solid #2a2a3a;border-radius:8px;padding:.35rem .75rem;color:#e8e8f0;font-size:.82rem;outline:none;width:180px;direction:rtl}' +
'.dl{width:6px;height:6px;border-radius:50%;background:#00e5a0;animation:pulse 2s infinite;display:inline-block}' +
'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}' +
'@media(max-width:900px){.layout{grid-template-columns:1fr}.side{height:auto;position:static;border-right:none;border-bottom:1px solid #2a2a3a;order:1;display:flex;overflow-x:auto;padding:.5rem}.main{order:2;padding:1rem}.ns{margin-bottom:0;display:flex;gap:.25rem}.nlb{display:none}.ni{white-space:nowrap;border-right:none;border-radius:6px;font-size:.75rem}.ni.on{border-right:none;background:rgba(79,127,255,.15)}}' +
'@media(max-width:650px){.sg{grid-template-columns:1fr 1fr}.eg{grid-template-columns:1fr}}' +
'</style></head><body>' +
'<div id="p0" class="wrap"><div class="card">' +
'<div class="logo">META<span>ADS</span> PRO</div>' +
'<div class="sub">Connect to manage your campaigns</div>' +
'<div id="lerr" class="err">Wrong username or password</div>' +
'<label class="lbl">Username</label><input type="text" class="inp" id="lu" placeholder="Username">' +
'<label class="lbl">Password</label><input type="password" class="inp" id="lp" placeholder="Password" onkeydown="if(event.key===\'Enter\')doLogin()">' +
'<button class="btn-lo" id="lbtn" onclick="doLogin()">Login</button>' +
'</div></div>' +
'<div id="p1" style="display:none">' +
'<div class="hdr"><div class="logo2">META<span>ADS</span></div>' +
'<select class="sw" id="sw" onchange="switchAcc(this.value)"></select>' +
'<div style="display:flex;gap:.5rem;align-items:center"><div class="dl"></div><button class="btn bg sm" onclick="doLogout()">Logout</button></div></div>' +
'<div class="dbar">' +
'<button class="dp on" onclick="setDP(\'today\',this)">Today</button>' +
'<button class="dp" onclick="setDP(\'yesterday\',this)">Yesterday</button>' +
'<button class="dp" onclick="setDP(\'last_7d\',this)">7 days</button>' +
'<button class="dp" onclick="setDP(\'last_14d\',this)">14 days</button>' +
'<button class="dp" onclick="setDP(\'last_30d\',this)">30 days</button>' +
'<button class="dp" onclick="setDP(\'last_month\',this)">Last month</button>' +
'<input type="date" class="di" id="df" style="margin-right:auto">' +
'<span style="color:#6b6b8a;font-size:.75rem">-</span>' +
'<input type="date" class="di" id="dt">' +
'<button class="btn bg sm" onclick="setCustomDate()">Apply</button></div>' +
'<div class="layout"><nav class="side">' +
'<div class="ns"><span class="nlb">Analytics</span>' +
'<div class="ni on" onclick="goPage(\'dash\',this)">Dashboard</div>' +
'<div class="ni" onclick="goPage(\'camps\',this)">Campaigns</div>' +
'<div class="ni" onclick="goPage(\'adsets\',this)">Ad Sets</div>' +
'<div class="ni" onclick="goPage(\'ads\',this)">Ads</div></div>' +
'<div class="ns"><span class="nlb">Tools</span>' +
'<div class="ni" onclick="goPage(\'create\',this)">+ New Campaign</div>' +
'<div class="ni" onclick="goPage(\'alerts\',this)">Alerts <span id="alb" style="display:none;background:#ff6b6b;color:#fff;border-radius:10px;font-size:.62rem;padding:1px 5px;margin-right:4px"></span></div>' +
'<div class="ni" onclick="goPage(\'ai\',this)">AI Assistant</div>' +
'<div class="ni" onclick="goPage(\'export\',this)">Export</div></div></nav>' +
'<main class="main">' +
'<div class="pg on" id="pg-dash"><div class="pt">Dashboard</div><div class="ps" id="dsub">Loading...</div>' +
'<div class="sg" id="sg"><div class="ld" style="grid-column:1/-1"><div class="sp"></div></div></div>' +
'<div class="cc"><div class="ch"><div class="ct">Performance</div><div class="ctg">' +
'<button class="ctb" onclick="setMetric(\'spend\',this)" style="background:rgba(79,127,255,.15);color:#4f7fff;border-color:rgba(79,127,255,.3)">Spend</button>' +
'<button class="ctb" onclick="setMetric(\'clicks\',this)">Clicks</button>' +
'<button class="ctb" onclick="setMetric(\'ctr\',this)">CTR</button>' +
'</div></div><div class="cs"><canvas id="ch"></canvas></div></div>' +
'<div class="sh"><div class="st">Active Campaigns</div><button class="btn ba sm" onclick="goPage(\'camps\',document.querySelectorAll(\'.ni\')[1])">All</button></div>' +
'<div class="tw" id="dc"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-camps"><div class="pt">Campaigns</div><div class="ps">Click headers to sort</div>' +
'<div class="sh"><div style="display:flex;gap:.4rem"><button class="btn bg sm" onclick="loadCamps()">Refresh</button><button class="btn ba sm" onclick="goPage(\'create\',document.querySelectorAll(\'.ni\')[4])">+ New</button></div>' +
'<input class="si" placeholder="Search..." oninput="filterTbl(\'ct\',this.value)"></div>' +
'<div class="tw" id="ct"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-adsets"><div class="pt">Ad Sets</div><div class="ps">Ad groups</div>' +
'<div class="sh"><button class="btn bg sm" onclick="loadAdsets()">Refresh</button><input class="si" placeholder="Search..." oninput="filterTbl(\'at\',this.value)"></div>' +
'<div class="tw" id="at"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-ads"><div class="pt">Ads</div><div class="ps">All ads</div>' +
'<div class="sh"><button class="btn bg sm" onclick="loadAds()">Refresh</button><input class="si" placeholder="Search..." oninput="filterTbl(\'adt\',this.value)"></div>' +
'<div class="tw" id="adt"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-create"><div class="pt">New Campaign</div><div class="ps">Set up your campaign</div>' +
'<div class="tw" style="padding:1.4rem;max-width:540px">' +
'<div id="cerr" class="eb" style="display:none"><span id="cerrm"></span></div>' +
'<div id="cok" class="ok" style="display:none">Campaign created!</div>' +
'<label class="lbl">Name</label><input type="text" class="inp" id="cn" style="direction:rtl;text-align:right">' +
'<label class="lbl">Objective</label>' +
'<select class="inp" id="co" style="direction:rtl;text-align:right">' +
'<option value="OUTCOME_TRAFFIC">Traffic</option><option value="OUTCOME_ENGAGEMENT">Engagement</option>' +
'<option value="OUTCOME_LEADS">Leads</option><option value="OUTCOME_SALES">Sales</option>' +
'<option value="OUTCOME_APP_PROMOTION">App Promotion</option><option value="OUTCOME_AWARENESS">Awareness</option>' +
'</select><label class="lbl">Daily Budget (ILS)</label><input type="number" class="inp" id="cb" placeholder="100" min="1">' +
'<label class="lbl">Status</label><select class="inp" id="cs2" style="direction:rtl;text-align:right"><option value="PAUSED">Paused</option><option value="ACTIVE">Active</option></select>' +
'<div style="display:flex;gap:.6rem"><button class="btn bp" onclick="createCamp()" id="cbtn" style="flex:1">Create Campaign</button>' +
'<button class="btn bg sm" onclick="goPage(\'camps\',document.querySelectorAll(\'.ni\')[1])">Cancel</button></div></div></div>' +
'<div class="pg" id="pg-alerts"><div class="pt">Smart Alerts</div><div class="ps">AI scans for issues</div>' +
'<div class="sh"><button class="btn bg sm" onclick="runAlerts()">Scan Now</button></div>' +
'<div id="al"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-ai"><div class="pt">AI Assistant</div><div class="ps">Ask about your campaigns</div>' +
'<div class="ai"><div class="aih">Claude analyzes your data</div>' +
'<div class="air"><input type="text" class="aii" id="aiq" placeholder="Which campaigns should I pause?" onkeydown="if(event.key===\'Enter\')askAI()"><button class="btn ba sm" onclick="askAI()" id="aibtn">Send</button></div>' +
'<div class="airsp" id="air"></div>' +
'<div class="aisug">' +
'<button class="btn bg sm" onclick="setQ(\'Which campaigns are underperforming?\')">Weak campaigns</button>' +
'<button class="btn bg sm" onclick="setQ(\'What is my average CPA?\')">Avg CPA</button>' +
'<button class="btn bg sm" onclick="setQ(\'Which campaign performs best?\')">Best campaign</button>' +
'<button class="btn bg sm" onclick="setQ(\'Recommendations to improve performance\')">Tips</button>' +
'</div></div></div>' +
'<div class="pg" id="pg-export"><div class="pt">Export</div><div class="ps">Download and share</div>' +
'<div class="eg">' +
'<div class="ec" onclick="expCSV()"><div class="ei">CSV</div><div class="et">Excel</div><div class="ed">All campaign data</div></div>' +
'<div class="ec" onclick="expJSON()"><div class="ei">JSON</div><div class="et">Raw Data</div><div class="ed">For processing</div></div>' +
'<div class="ec" onclick="window.print()"><div class="ei">PDF</div><div class="et">Print</div><div class="ed">Send to clients</div></div>' +
'<div class="ec" onclick="copySum()"><div class="ei">Share</div><div class="et">Copy Summary</div><div class="ed">WhatsApp/Email</div></div>' +
'</div><div id="exmsg" class="ok" style="display:none"></div></div>' +
'</main></div></div>' +
'<div class="mo" id="em" style="display:none"><div class="mc">' +
'<div class="mh"><div class="mt">Edit Campaign</div><button class="xb" onclick="closeMo()">X</button></div>' +
'<div id="ec2"></div>' +
'<div class="mf"><button class="btn bg sm" onclick="closeMo()">Cancel</button><button class="btn ba sm" onclick="saveEdit()">Save</button></div>' +
'</div></div>' +
'<script>' +
'var SID=localStorage.getItem("sid")||"",ACCT=localStorage.getItem("acct")||"",' +
'ACCTS=[],CAMPS=[],ADSETS=[],ADS=[],EID="",' +
'DP="today",DF="",DT="",METRIC="spend",CHART=null;' +
'function fmt(n){if(!n)return"0";var x=parseFloat(n);if(x>=1e6)return(x/1e6).toFixed(1)+"M";if(x>=1e3)return(x/1e3).toFixed(1)+"K";return x.toFixed(0);}' +
'function fmtM(n){return"ILS "+parseFloat(n||0).toFixed(2);}' +
'function fmtP(n){return parseFloat(n||0).toFixed(2)+"%";}' +
'function tod(){return new Date().toISOString().split("T")[0];}' +
'function ago(n){return new Date(Date.now()-n*86400000).toISOString().split("T")[0];}' +
'function gdp(){return DF&&DT?"time_range={\'since\':\'"+DF+"\',\'until\':\'"+DT+"\'}":"date_preset="+DP;}' +
'function apiGet(p){return fetch("/api/meta/"+p,{headers:{Authorization:SID}}).then(function(r){return r.json();}).then(function(d){if(d.error)throw new Error(d.error.message);return d;});}' +
'function apiPost(p,b){return fetch("/api/meta/"+p,{method:"POST",headers:{Authorization:SID,"Content-Type":"application/json"},body:JSON.stringify(b)}).then(function(r){return r.json();}).then(function(d){if(d.error)throw new Error(d.error.message);return d;});}' +
'function doLogin(){' +
'var u=document.getElementById("lu").value.trim(),p=document.getElementById("lp").value,btn=document.getElementById("lbtn");' +
'if(!u||!p){return;}' +
'btn.textContent="Connecting...";btn.disabled=true;' +
'document.getElementById("lerr").style.display="none";' +
'fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})})' +
'.then(function(r){return r.json();})' +
'.then(function(d){if(!d.ok)throw new Error("bad");SID=d.session;localStorage.setItem("sid",SID);startApp();})' +
'.catch(function(){document.getElementById("lerr").style.display="block";btn.textContent="Login";btn.disabled=false;});}' +
'function doLogout(){SID="";ACCT="";localStorage.removeItem("sid");localStorage.removeItem("acct");location.reload();}' +
'function startApp(){document.getElementById("p0").style.display="none";document.getElementById("p1").style.display="block";document.getElementById("df").value=ago(7);document.getElementById("dt").value=tod();apiGet("me/adaccounts?fields=name,account_id,currency,account_status&limit=50").then(function(d){ACCTS=(d.data||[]).filter(function(a){return a.account_status===1;});if(!ACCT&&ACCTS.length)ACCT=ACCTS[0].account_id;buildSW();}).catch(function(){});loadDash();}' +
'function buildSW(){var sw=document.getElementById("sw");sw.innerHTML=ACCTS.map(function(a){return \'<option value="\'+a.account_id+\'"\'+( a.account_id===ACCT?" selected":"")+\'>\'+a.name+\" (\"+a.currency+\")</option>\";}).join("");}' +
'function switchAcc(id){ACCT=id;localStorage.setItem("acct",id);CAMPS=[];loadDash();}' +
'function setDP(p,b){DP=p;DF="";DT="";document.querySelectorAll(".dp").forEach(function(x){x.classList.remove("on");});b.classList.add("on");refresh();}' +
'function setCustomDate(){DF=document.getElementById("df").value;DT=document.getElementById("dt").value;if(!DF||!DT)return;document.querySelectorAll(".dp").forEach(function(x){x.classList.remove("on");});refresh();}' +
'function refresh(){var p=document.querySelector(".pg.on");if(!p)return;var id=p.id.replace("pg-","");if(id==="dash")loadDash();else if(id==="camps")loadCamps();else if(id==="adsets")loadAdsets();else if(id==="ads")loadAds();}' +
'function goPage(n,el){document.querySelectorAll(".pg").forEach(function(p){p.classList.remove("on");});document.querySelectorAll(".ni").forEach(function(x){x.classList.remove("on");});document.getElementById("pg-"+n).classList.add("on");if(el)el.classList.add("on");if(n==="camps")loadCamps();else if(n==="adsets")loadAdsets();else if(n==="ads")loadAds();else if(n==="alerts")runAlerts();else if(n==="ai")prepAI();}' +
'function sc(l,c,v,s){return\'<div class="sc"><div class="sl">\'+l+\'</div><div class="sv" style="\'+c+\'">\'+v+\'</div><div class="sm2">\'+s+"</div></div>";}' +
'function loadDash(){document.getElementById("dsub").textContent="Loading...";apiGet("act_"+ACCT+"/insights?"+gdp()+"&fields=spend,impressions,clicks,ctr,actions,cost_per_action_type&level=account").then(function(ins){var d=ins.data&&ins.data[0]?ins.data[0]:{};var pv=(d.actions||[]).find(function(a){return a.action_type==="purchase";});var pvc=pv?pv.value:0;var ca=(d.cost_per_action_type||[]).find(function(a){return a.action_type==="purchase";});var cpa=ca?ca.value:0;var roas=pvc>0&&d.spend>0?(pvc/parseFloat(d.spend)*100).toFixed(2):0;document.getElementById("sg").innerHTML=sc("Spend","color:#4f7fff",fmtM(d.spend),"Selected period")+sc("Impressions","color:#ff9f43",fmt(d.impressions),fmt(d.clicks)+" clicks")+sc("CTR","color:#a29bfe",fmtP(d.ctr),"Click-through rate")+sc("Purchases","color:#00e5a0",fmt(pvc),"purchase events")+sc("CPA","color:#fd79a8",cpa?fmtM(cpa):"-","Cost per purchase")+sc("ROAS","color:#55efc4",roas?roas+"x":"-","Return on ad spend");document.getElementById("dsub").textContent="Updated: "+new Date().toLocaleTimeString();}).catch(function(e){document.getElementById("sg").innerHTML=\'<div class="eb" style="grid-column:1/-1">Error: \'+e.message+"</div>";});apiGet("act_"+ACCT+"/insights?time_increment=1&"+gdp()+"&fields=spend,clicks,ctr,date_start").then(function(ins){drawChart(ins.data||[]);}).catch(function(){});apiGet("act_"+ACCT+"/campaigns?fields=name,status,daily_budget,insights{spend,impressions,ctr}&limit=8&effective_status=[\"ACTIVE\"]").then(function(r){renderCT("dc",r.data||[],true);}).catch(function(e){document.getElementById("dc").innerHTML=\'<div class="eb" style="margin:1rem">\'+e.message+"</div>";});}' +
'function drawChart(data){if(CHART)CHART.destroy();var labels=data.map(function(d){var dt=new Date(d.date_start);return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit"});});var ds={spend:{label:"Spend",data:data.map(function(d){return parseFloat(d.spend||0);}),borderColor:"#4f7fff",backgroundColor:"rgba(79,127,255,.1)",tension:.4,fill:true},clicks:{label:"Clicks",data:data.map(function(d){return parseFloat(d.clicks||0);}),borderColor:"#00e5a0",backgroundColor:"rgba(0,229,160,.1)",tension:.4,fill:true},ctr:{label:"CTR",data:data.map(function(d){return parseFloat(d.ctr||0);}),borderColor:"#ff9f43",backgroundColor:"rgba(255,159,67,.1)",tension:.4,fill:true}};CHART=new Chart(document.getElementById("ch").getContext("2d"),{type:"line",data:{labels:labels,datasets:[ds[METRIC]]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:"index",intersect:false,backgroundColor:"#1a1a24",borderColor:"#2a2a3a",borderWidth:1,titleColor:"#e8e8f0",bodyColor:"#6b6b8a"}},scales:{x:{grid:{color:"rgba(42,42,58,.5)"},ticks:{color:"#6b6b8a",font:{size:10}}},y:{grid:{color:"rgba(42,42,58,.5)"},ticks:{color:"#6b6b8a",font:{size:10}}}}}});}' +
'function setMetric(m,btn){METRIC=m;document.querySelectorAll(".ctb").forEach(function(b){b.style.cssText="";});btn.style.cssText="background:rgba(79,127,255,.15);color:#4f7fff;border-color:rgba(79,127,255,.3)";refresh();}' +
'function loadCamps(){document.getElementById("ct").innerHTML=\'<div class="ld"><div class="sp"></div></div>\';apiGet("act_"+ACCT+"/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,insights{spend,impressions,clicks,ctr,actions}&limit=100&"+gdp()).then(function(r){CAMPS=r.data||[];renderCT("ct",CAMPS,false);}).catch(function(e){document.getElementById("ct").innerHTML=\'<div class="eb" style="margin:1rem">\'+e.message+"</div>";});}' +
'function renderCT(el,data,mini){if(!data.length){document.getElementById(el).innerHTML=\'<div class="ld">No campaigns</div>\';return;}var rows=data.map(function(c){var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};var pv=(ins.actions||[]).find(function(a){return a.action_type==="purchase";});var pvc=pv?pv.value:0;var bdc=c.status==="ACTIVE"?"bac":"bpc";var acts=mini?"":"<td>"+(pvc||"-")+"</td><td><div class=\"ac\">"+(c.status==="ACTIVE"?"<button class=\"btn bdan sm\" onclick=\"tog(\'"+c.id+"\',\'PAUSED\',\'c\')\" >Pause</button>":"<button class=\"btn bsuc sm\" onclick=\"tog(\'"+c.id+"\',\'ACTIVE\',\'c\')\" >Resume</button>")+"<button class=\"btn bg sm\" onclick=\"openEdit(\'"+c.id+"\')\" >Edit</button></div></td>";return "<tr><td style=\"font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis\">"+c.name+"</td><td><span class=\"bdc "+bdc+"\"><span class=\"dot\"></span>"+(c.status==="ACTIVE"?"Active":"Paused")+"</span></td><td><span class=\"tg\">"+(c.objective||"").replace("OUTCOME_","")+"</span></td><td>"+(c.daily_budget?fmtM(c.daily_budget/100)+"/d":"-")+"</td><td>"+fmtM(ins.spend)+"</td><td>"+fmt(ins.impressions)+"</td><td>"+fmtP(ins.ctr)+"</td>"+acts+"</tr>";});var hx=mini?"":"<th>Purchases</th><th>Actions</th>";document.getElementById(el).innerHTML="<table><thead><tr><th>Name</th><th>Status</th><th>Objective</th><th>Budget</th><th>Spend</th><th>Impressions</th><th>CTR</th>"+hx+"</tr></thead><tbody>"+rows.join("")+"</tbody></table>";}' +
'function loadAdsets(){document.getElementById("at").innerHTML=\'<div class="ld"><div class="sp"></div></div>\';apiGet("act_"+ACCT+"/adsets?fields=name,status,daily_budget,insights{spend,impressions,clicks,ctr}&limit=100&"+gdp()).then(function(r){ADSETS=r.data||[];if(!ADSETS.length){document.getElementById("at").innerHTML=\'<div class="ld">No ad sets</div>\';return;}var rows=ADSETS.map(function(a){var ins=a.insights&&a.insights.data&&a.insights.data[0]?a.insights.data[0]:{};var bdc=a.status==="ACTIVE"?"bac":"bpc";return"<tr><td style=\"font-weight:600\">"+a.name+"</td><td><span class=\"bdc "+bdc+"\"><span class=\"dot\"></span>"+(a.status==="ACTIVE"?"Active":"Paused")+"</span></td><td>"+(a.daily_budget?fmtM(a.daily_budget/100)+"/d":"-")+"</td><td>"+fmtM(ins.spend)+"</td><td>"+fmt(ins.impressions)+"</td><td>"+fmtP(ins.ctr)+"</td><td><div class=\"ac\">"+(a.status==="ACTIVE"?"<button class=\"btn bdan sm\" onclick=\"tog(\'"+a.id+"\',\'PAUSED\',\'a\')\" >Pause</button>":"<button class=\"btn bsuc sm\" onclick=\"tog(\'"+a.id+"\',\'ACTIVE\',\'a\')\" >Resume</button>")+"</div></td></tr>";});document.getElementById("at").innerHTML="<table><thead><tr><th>Name</th><th>Status</th><th>Budget</th><th>Spend</th><th>Impressions</th><th>CTR</th><th>Actions</th></tr></thead><tbody>"+rows.join("")+"</tbody></table>";}).catch(function(e){document.getElementById("at").innerHTML=\'<div class="eb" style="margin:1rem">\'+e.message+"</div>";});}' +
'function loadAds(){document.getElementById("adt").innerHTML=\'<div class="ld"><div class="sp"></div></div>\';apiGet("act_"+ACCT+"/ads?fields=name,status,insights{spend,impressions,clicks,ctr}&limit=100&"+gdp()).then(function(r){ADS=r.data||[];if(!ADS.length){document.getElementById("adt").innerHTML=\'<div class="ld">No ads</div>\';return;}var rows=ADS.map(function(a){var ins=a.insights&&a.insights.data&&a.insights.data[0]?a.insights.data[0]:{};var bdc=a.status==="ACTIVE"?"bac":"bpc";return"<tr><td style=\"font-weight:600\">"+a.name+"</td><td><span class=\"bdc "+bdc+"\"><span class=\"dot\"></span>"+(a.status==="ACTIVE"?"Active":"Paused")+"</span></td><td>"+fmtM(ins.spend)+"</td><td>"+fmt(ins.impressions)+"</td><td>"+fmt(ins.clicks)+"</td><td>"+fmtP(ins.ctr)+"</td><td><div class=\"ac\">"+(a.status==="ACTIVE"?"<button class=\"btn bdan sm\" onclick=\"tog(\'"+a.id+"\',\'PAUSED\',\'d\')\" >Pause</button>":"<button class=\"btn bsuc sm\" onclick=\"tog(\'"+a.id+"\',\'ACTIVE\',\'d\')\" >Resume</button>")+"</div></td></tr>";});document.getElementById("adt").innerHTML="<table><thead><tr><th>Name</th><th>Status</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Actions</th></tr></thead><tbody>"+rows.join("")+"</tbody></table>";}).catch(function(e){document.getElementById("adt").innerHTML=\'<div class="eb" style="margin:1rem">\'+e.message+"</div>";});}' +
'function tog(id,status,type){apiPost(id,{status:status}).then(function(){if(type==="c")loadCamps();else if(type==="a")loadAdsets();else loadAds();}).catch(function(e){alert("Error: "+e.message);});}' +
'function openEdit(id){var c=CAMPS.find(function(x){return x.id===id;});if(!c)return;EID=id;document.getElementById("ec2").innerHTML=\'<label class="lbl">Name</label><input type="text" class="inp" id="en" value="\'+c.name+\'"><label class="lbl">Daily Budget (ILS)</label><input type="number" class="inp" id="eb" value="\'+( c.daily_budget?c.daily_budget/100:"")+\'"><label class="lbl">Status</label><select class="inp" id="es"><option value="ACTIVE"\'+( c.status==="ACTIVE"?" selected":"")+\'>Active</option><option value="PAUSED"\'+( c.status==="PAUSED"?" selected":"")+\'>Paused</option></select>\';document.getElementById("em").style.display="flex";}' +
'function saveEdit(){var b={name:document.getElementById("en").value.trim(),status:document.getElementById("es").value};var bv=document.getElementById("eb").value;if(bv)b.daily_budget=Math.round(parseFloat(bv)*100);apiPost(EID,b).then(function(){closeMo();loadCamps();}).catch(function(e){alert("Error: "+e.message);});}' +
'function closeMo(){document.getElementById("em").style.display="none";}' +
'function createCamp(){var name=document.getElementById("cn").value.trim(),budget=document.getElementById("cb").value,btn=document.getElementById("cbtn");document.getElementById("cerr").style.display="none";document.getElementById("cok").style.display="none";if(!name||!budget){document.getElementById("cerr").style.display="block";document.getElementById("cerrm").textContent="Please fill name and budget";return;}btn.textContent="Creating...";btn.disabled=true;apiPost("act_"+ACCT+"/campaigns",{name:name,objective:document.getElementById("co").value,status:document.getElementById("cs2").value,daily_budget:Math.round(parseFloat(budget)*100),special_ad_categories:"[]"}).then(function(){document.getElementById("cok").style.display="block";document.getElementById("cn").value="";document.getElementById("cb").value="";}).catch(function(e){document.getElementById("cerr").style.display="block";document.getElementById("cerrm").textContent=e.message;}).finally(function(){btn.textContent="Create Campaign";btn.disabled=false;});}' +
'function runAlerts(){document.getElementById("al").innerHTML=\'<div class="ld"><div class="sp"></div><span>Scanning...</span></div>\';apiGet("act_"+ACCT+"/campaigns?fields=name,status,daily_budget,insights{spend,ctr,actions,cost_per_action_type}&limit=50&date_preset=last_7d").then(function(r){var alerts=[];(r.data||[]).forEach(function(c){if(c.status!=="ACTIVE")return;var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};var spend=parseFloat(ins.spend||0),ctr=parseFloat(ins.ctr||0);var pv=(ins.actions||[]).find(function(a){return a.action_type==="purchase";});var pvc=pv?pv.value:0;var ca=(ins.cost_per_action_type||[]).find(function(a){return a.action_type==="purchase";});var cpa=ca?ca.value:0;if(spend>50&&pvc==0)alerts.push({cls:"ah",title:c.name+" - Spend with no conversions",desc:"Spent ILS "+spend.toFixed(0)+" with zero purchases.",id:c.id});if(ctr>0&&ctr<0.3)alerts.push({cls:"am",title:c.name+" - Low CTR ("+ctr.toFixed(2)+"%)",desc:"CTR below 0.3%.",id:c.id});if(cpa>200)alerts.push({cls:"am",title:c.name+" - High CPA (ILS "+parseFloat(cpa).toFixed(0)+")",desc:"High cost per purchase.",id:c.id});});var badge=document.getElementById("alb");if(alerts.length){badge.style.display="inline";badge.textContent=alerts.length;}else{badge.style.display="none";}if(!alerts.length){document.getElementById("al").innerHTML=\'<div class="ok">All campaigns look good!</div>\';return;}document.getElementById("al").innerHTML=alerts.map(function(a){return\'<div class="alc \'+a.cls+\'"><div class="alb"><div class="alt">\'+a.title+\'</div><div class="ald">\'+a.desc+"</div></div></div>";}).join("");}).catch(function(e){document.getElementById("al").innerHTML=\'<div class="eb">Error: \'+e.message+"</div>";});}' +
'var aiCtx="";function prepAI(){apiGet("act_"+ACCT+"/campaigns?fields=name,status,objective,daily_budget,insights{spend,impressions,clicks,ctr,actions}&limit=30&date_preset=last_7d").then(function(r){aiCtx=JSON.stringify(r.data||[]);}).catch(function(){});}' +
'function askAI(){var q=document.getElementById("aiq").value.trim();if(!q)return;var btn=document.getElementById("aibtn"),el=document.getElementById("air");el.style.display="block";el.textContent="Analyzing...";btn.disabled=true;if(!aiCtx)prepAI();fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"You are a Meta Ads expert. Data: "+aiCtx+". Answer concisely.",messages:[{role:"user",content:q}]})}).then(function(r){return r.json();}).then(function(d){el.textContent=d.content&&d.content[0]?d.content[0].text:"No response";}).catch(function(e){el.textContent="Error: "+e.message;}).finally(function(){btn.disabled=false;});}' +
'function setQ(q){document.getElementById("aiq").value=q;}' +
'function expCSV(){if(!CAMPS.length){alert("Load campaigns first");return;}var h=["Name","Status","Objective","Budget","Spend","Impressions","Clicks","CTR"];var rows=CAMPS.map(function(c){var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};return[c.name,c.status,c.objective,c.daily_budget?c.daily_budget/100:"",ins.spend||0,ins.impressions||0,ins.clicks||0,ins.ctr||0].join(",");});var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["﻿"+[h.join(",")].concat(rows).join("\n")],{type:"text/csv;charset=utf-8"}));a.download="meta-ads-"+tod()+".csv";a.click();showEx("CSV downloaded!");}' +
'function expJSON(){if(!CAMPS.length){alert("Load campaigns first");return;}var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({account:ACCT,date:tod(),campaigns:CAMPS},null,2)],{type:"application/json"}));a.download="meta-ads-"+tod()+".json";a.click();showEx("JSON downloaded!");}' +
'function copySum(){if(!CAMPS.length){alert("Load campaigns first");return;}var txt="Meta Ads Report - "+tod()+"\n"+CAMPS.slice(0,5).map(function(c){var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};return c.name+": ILS"+parseFloat(ins.spend||0).toFixed(0)+" spend, "+parseFloat(ins.ctr||0).toFixed(2)+"% CTR";}).join("\n");navigator.clipboard.writeText(txt).then(function(){showEx("Copied!");});}' +
'function showEx(m){var el=document.getElementById("exmsg");el.textContent=m;el.style.display="block";setTimeout(function(){el.style.display="none";},3000);}' +
'function filterTbl(id,q){var t=document.querySelector("#"+id+" table");if(!t)return;t.querySelectorAll("tbody tr").forEach(function(tr){tr.style.display=tr.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}' +
'window.onload=function(){if(SID){fetch("/api/verify",{headers:{Authorization:SID}}).then(function(r){return r.json();}).then(function(d){if(d.ok)startApp();}).catch(function(){});}};' +
'<\/script></body></html>';

const server = http.createServer(function(req, res) {
  const p = url.parse(req.url, true);
  const pathname = p.pathname;
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (d.username === U && d.password === P) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ok: true, session: mkSession()}));
        } else { res.writeHead(401); res.end(JSON.stringify({ok: false})); }
      } catch(e) { res.writeHead(400); res.end(JSON.stringify({ok: false})); }
    });
    return;
  }
  if (pathname === '/api/verify') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ok: sessions.has(req.headers['authorization'])}));
    return;
  }
  if (pathname.startsWith('/api/meta/')) {
    if (!sessions.has(req.headers['authorization'])) { res.writeHead(401); res.end('{"error":{"message":"Not logged in"}}'); return; }
    const metaPath = pathname.replace('/api/meta/', '') + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => { let params=''; try{const parsed=JSON.parse(body);params=new URLSearchParams(parsed).toString();}catch(e){params=body;} metaCall(metaPath.split('?')[0],'POST',params,res); });
    } else { metaCall(metaPath,'GET',null,res); }
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(PAGE);
});

server.listen(PORT, function() { console.log('Running on port ' + PORT); });