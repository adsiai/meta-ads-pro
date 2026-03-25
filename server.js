const http = require('http');
const https = require('https');
const crypto = require('crypto');
const url = require('url');

const CONFIG = { USERNAME:'ADMIN', PASSWORD:'IDO', META_TOKEN:process.env.META_TOKEN||'', PORT:process.env.PORT||3000 };
const sessions = new Map();
function mkSid(){var id=crypto.randomBytes(32).toString('hex');sessions.set(id,Date.now());setTimeout(function(){sessions.delete(id);},86400000);return id;}
function okSid(s){return sessions.has(s);}
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');}
function prx(path,method,body,res){
  var sep=path.includes('?')?'&':'?';
  var req=https.request({hostname:'graph.facebook.com',path:'/v19.0/'+path+sep+'access_token='+CONFIG.META_TOKEN,method:method||'GET',headers:{'Content-Type':'application/x-www-form-urlencoded'}},function(ar){var d='';ar.on('data',function(c){d+=c;});ar.on('end',function(){cors(res);res.setHeader('Content-Type','application/json');res.writeHead(200);res.end(d);});});
  req.on('error',function(e){cors(res);res.writeHead(500);res.end(JSON.stringify({error:{message:e.message}}));});
  if(body)req.write(body);req.end();
}

var PAGE = '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Meta Ads Pro</title>' +
'<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>' +
'<style>' +
'*{box-sizing:border-box;margin:0;padding:0}' +
':root{--bg:#0a0a0f;--s:#111118;--s2:#1a1a24;--b:#2a2a3a;--a:#4f7fff;--a2:#00e5a0;--w:#ff6b6b;--or:#ff9f43;--pu:#a29bfe;--t:#e8e8f0;--m:#6b6b8a}' +
'body{background:var(--bg);color:var(--t);font-family:Heebo,sans-serif;min-height:100vh;direction:rtl}' +
'.ctr{min-height:100vh;display:flex;align-items:center;justify-content:center}' +
'.box{background:var(--s);border:1px solid var(--b);border-radius:20px;padding:2.5rem;width:380px;max-width:95vw}' +
'.logo{font-size:1.5rem;font-weight:900;color:var(--a);margin-bottom:.3rem}.logo span{color:var(--a2)}' +
'.sub{color:var(--m);font-size:.85rem;margin-bottom:2rem}' +
'.lbl{display:block;font-size:.72rem;font-weight:700;color:var(--m);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.06em}' +
'.inp{width:100%;background:var(--bg);border:1px solid var(--b);border-radius:10px;padding:.75rem 1rem;color:var(--t);font-size:.95rem;outline:none;margin-bottom:1.2rem;direction:ltr;text-align:left;font-family:Heebo,sans-serif}' +
'.inp:focus{border-color:var(--a)}' +
'.btn-main{width:100%;background:var(--a);color:#fff;border:none;border-radius:10px;padding:.85rem;font-size:1rem;font-weight:700;cursor:pointer;font-family:Heebo,sans-serif}' +
'.btn-main:hover{background:#3a6aee}' +
'.errbox{background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.3);border-radius:8px;padding:.75rem 1rem;color:var(--w);font-size:.85rem;margin-bottom:1rem;display:none}' +
'</style></head><body>' +
'<div class="ctr"><div class="box">' +
'<div class="logo">META<span>ADS</span> PRO</div>' +
'<div class="sub">Connect to manage your campaigns</div>' +
'<div id="err" class="errbox">Wrong username or password</div>' +
'<label class="lbl">Username</label>' +
'<input type="text" id="u" class="inp" placeholder="Username">' +
'<label class="lbl">Password</label>' +
'<input type="password" id="p" class="inp" placeholder="Password" onkeydown="if(event.key===\'Enter\')go()">' +
'<button class="btn-main" onclick="go()" id="btn">Login</button>' +
'</div></div>' +
'<script>' +
'function go(){' +
'  var u=document.getElementById(\'u\').value.trim();' +
'  var p=document.getElementById(\'p\').value;' +
'  var btn=document.getElementById(\'btn\');' +
'  document.getElementById(\'err\').style.display=\'none\';' +
'  btn.textContent=\'Connecting...\';btn.disabled=true;' +
'  var xhr=new XMLHttpRequest();' +
'  xhr.open(\'POST\',\'/api/login\');' +
'  xhr.setRequestHeader(\'Content-Type\',\'application/json\');' +
'  xhr.onload=function(){' +
'    var d=JSON.parse(xhr.responseText);' +
'    if(d.ok){' +
'      localStorage.setItem(\'sid\',d.session);' +
'      window.location.href=\'/app\';' +
'    } else {' +
'      document.getElementById(\'err\').style.display=\'block\';' +
'      btn.textContent=\'Login\';btn.disabled=false;' +
'    }' +
'  };' +
'  xhr.onerror=function(){document.getElementById(\'err\').style.display=\'block\';btn.textContent=\'Login\';btn.disabled=false;};' +
'  xhr.send(JSON.stringify({username:u,password:p}));' +
'}' +
'<\/script></body></html>';

var APP_PAGE = '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Meta Ads Pro - Dashboard</title>' +
'<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;900&display=swap" rel="stylesheet">' +
'<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>' +
'<style>*{box-sizing:border-box;margin:0;padding:0}:root{--bg:#0a0a0f;--s:#111118;--s2:#1a1a24;--b:#2a2a3a;--a:#4f7fff;--a2:#00e5a0;--w:#ff6b6b;--or:#ff9f43;--pu:#a29bfe;--t:#e8e8f0;--m:#6b6b8a}' +
'body{background:var(--bg);color:var(--t);font-family:Heebo,sans-serif;direction:rtl}' +
'.hdr{background:var(--s);border-bottom:1px solid var(--b);padding:0 1.5rem;display:flex;align-items:center;justify-content:space-between;height:56px;position:sticky;top:0;z-index:100}' +
'.logo{font-size:1rem;font-weight:900;color:var(--a)}.logo span{color:var(--a2)}' +
'.sw{background:var(--s2);border:1px solid var(--b);border-radius:8px;padding:.35rem .7rem;color:var(--t);font-size:.8rem;outline:none;cursor:pointer;flex:1;max-width:280px}' +
'.hr{display:flex;gap:.5rem;align-items:center}' +
'.btn{padding:.35rem .9rem;border-radius:6px;border:1px solid var(--b);background:var(--s2);color:var(--t);font-size:.8rem;cursor:pointer;font-family:Heebo,sans-serif}' +
'.btn:hover{border-color:var(--a);color:var(--a)}' +
'.dbr{background:var(--s);border-bottom:1px solid var(--b);padding:.5rem 1.5rem;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}' +
'.dp{padding:.3rem .65rem;border-radius:6px;border:1px solid var(--b);background:transparent;color:var(--m);font-size:.78rem;cursor:pointer;font-family:Heebo,sans-serif}' +
'.dp:hover,.dp.on{background:rgba(79,127,255,.15);color:var(--a);border-color:rgba(79,127,255,.3)}' +
'.layout{display:grid;grid-template-columns:1fr 200px;min-height:calc(100vh - 56px)}' +
'.side{background:var(--s);border-right:1px solid var(--b);padding:1rem 0;position:sticky;top:56px;height:calc(100vh - 56px);overflow-y:auto;order:2}' +
'.ni{padding:.55rem 1rem;cursor:pointer;font-size:.85rem;color:var(--m);border-right:3px solid transparent;display:block}' +
'.ni:hover{color:var(--t);background:var(--s2)}.ni.on{color:var(--a);background:rgba(79,127,255,.08);border-right-color:var(--a)}' +
'.nlbl{font-size:.6rem;color:var(--m);text-transform:uppercase;letter-spacing:.08em;padding:.75rem 1rem .3rem;display:block}' +
'.main{padding:1.5rem;min-width:0;order:1}' +
'.pg{display:none}.pg.on{display:block}' +
'.pt{font-size:1.4rem;font-weight:900;margin-bottom:.25rem}.ps{color:var(--m);font-size:.85rem;margin-bottom:1.5rem}' +
'.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.5rem}' +
'.sc{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1.1rem;position:relative;overflow:hidden}' +
'.sc::before{content:"";position:absolute;top:0;right:0;left:0;height:2px;background:var(--a)}' +
'.sc:nth-child(2)::before{background:var(--a2)}.sc:nth-child(3)::before{background:var(--or)}.sc:nth-child(4)::before{background:var(--pu)}.sc:nth-child(5)::before{background:#fd79a8}.sc:nth-child(6)::before{background:#55efc4}' +
'.sl{font-size:.68rem;color:var(--m);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem}' +
'.sv{font-size:1.5rem;font-weight:900;line-height:1;margin-bottom:.2rem}.sm{font-size:.72rem;color:var(--m)}' +
'.cc{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1.1rem;margin-bottom:1.5rem}' +
'.ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem}' +
'.ctg{display:flex;gap:.35rem}' +
'.ctb{padding:.25rem .65rem;border-radius:20px;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid var(--b);background:transparent;color:var(--m);font-family:Heebo,sans-serif}' +
'.cw{position:relative;height:190px}' +
'.sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;flex-wrap:wrap;gap:.4rem}' +
'.tw{background:var(--s);border:1px solid var(--b);border-radius:12px;overflow-x:auto;margin-bottom:1.5rem}' +
'table{width:100%;border-collapse:collapse;min-width:580px}' +
'th{font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;color:var(--m);padding:.7rem 1rem;text-align:right;border-bottom:1px solid var(--b);background:var(--s2);white-space:nowrap;cursor:pointer}' +
'td{padding:.7rem 1rem;font-size:.85rem;border-bottom:1px solid rgba(42,42,58,.5);white-space:nowrap;vertical-align:middle}' +
'tr:last-child td{border-bottom:none}tr:hover td{background:rgba(79,127,255,.04)}' +
'.bac{background:rgba(0,229,160,.12);color:var(--a2);border:1px solid rgba(0,229,160,.25);display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:600}' +
'.bpc{background:rgba(255,107,107,.12);color:var(--w);border:1px solid rgba(255,107,107,.25);display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:600}' +
'.dot{width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block}' +
'.ac{display:flex;gap:4px}' +
'.tg{background:rgba(79,127,255,.12);color:var(--a);border:1px solid rgba(79,127,255,.2);border-radius:4px;font-size:.7rem;padding:1px 6px}' +
'.ld{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem;gap:1rem;color:var(--m)}' +
'.sp{width:30px;height:30px;border:2px solid var(--b);border-top-color:var(--a);border-radius:50%;animation:spin .7s linear infinite}' +
'@keyframes spin{to{transform:rotate(360deg)}}' +
'.eb{background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.25);border-radius:10px;padding:.85rem 1rem;color:var(--w);font-size:.85rem;margin-bottom:1rem}' +
'.ok{background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.25);border-radius:10px;padding:.85rem 1rem;color:var(--a2);font-size:.85rem;margin-bottom:1rem}' +
'.mo{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(4px)}' +
'.mc{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:1.5rem;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto}' +
'.mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}' +
'.mt{font-size:1rem;font-weight:700}.xb{background:none;border:none;color:var(--m);cursor:pointer;font-size:1.1rem}' +
'.mf{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem}' +
'.lbl2{display:block;font-size:.72rem;font-weight:700;color:var(--m);margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.05em}' +
'.inp2{width:100%;background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:.65rem .9rem;color:var(--t);font-size:.875rem;outline:none;margin-bottom:1rem;direction:ltr;text-align:left;font-family:Heebo,sans-serif}' +
'.inp2:focus{border-color:var(--a)}' +
'.ba{background:var(--a);color:#fff;border:none}.ba:hover{background:#3a6aee}' +
'.bdan{background:rgba(255,107,107,.12);color:var(--w);border:1px solid rgba(255,107,107,.25)}' +
'.bsuc{background:rgba(0,229,160,.12);color:var(--a2);border:1px solid rgba(0,229,160,.25)}' +
'.bdan:hover{background:rgba(255,107,107,.22)}.bsuc:hover{background:rgba(0,229,160,.22)}' +
'.si{background:var(--s2);border:1px solid var(--b);border-radius:8px;padding:.35rem .75rem;color:var(--t);font-size:.82rem;outline:none;width:180px;direction:rtl}' +
'.dl{width:7px;height:7px;border-radius:50%;background:var(--a2);animation:pulse 2s infinite;display:inline-block}' +
'@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}' +
'.aib{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1.1rem;margin-bottom:1.5rem}' +
'.aih{font-size:.85rem;font-weight:700;margin-bottom:.6rem;color:var(--a2)}' +
'.air{display:flex;gap:.5rem}' +
'.aii{flex:1;background:var(--bg);border:1px solid var(--b);border-radius:8px;padding:.65rem .85rem;color:var(--t);font-size:.875rem;outline:none;direction:rtl;font-family:Heebo,sans-serif}' +
'.aii:focus{border-color:var(--a2)}' +
'.aiR{margin-top:.9rem;padding:.9rem;background:rgba(0,229,160,.05);border:1px solid rgba(0,229,160,.15);border-radius:8px;font-size:.85rem;line-height:1.7;display:none;white-space:pre-wrap;direction:rtl}' +
'.aisug{margin-top:.65rem;display:flex;gap:.35rem;flex-wrap:wrap}' +
'.eg{display:grid;grid-template-columns:1fr 1fr;gap:.9rem;margin-bottom:1.5rem}' +
'.ec{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1.1rem;text-align:center;cursor:pointer;transition:all .2s}' +
'.ec:hover{border-color:var(--a);background:rgba(79,127,255,.05)}' +
'.ei{font-size:1.75rem;margin-bottom:.4rem}.et{font-weight:700;font-size:.85rem;margin-bottom:.2rem}.ed{color:var(--m);font-size:.74rem}' +
'.alc{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1rem 1.1rem;margin-bottom:.65rem;display:flex;align-items:flex-start;gap:.75rem}' +
'.alb2{flex:1}.alt{font-weight:700;font-size:.85rem;margin-bottom:.15rem}.ald{color:var(--m);font-size:.78rem;line-height:1.5}' +
'.ah{border-right:3px solid var(--w)}.am{border-right:3px solid var(--or)}' +
'@media(max-width:900px){.layout{grid-template-columns:1fr}.side{height:auto;position:static;border-right:none;border-bottom:1px solid var(--b);order:1;display:flex;overflow-x:auto;padding:.5rem}.main{order:2;padding:1rem}.nlbl{display:none}.ni{white-space:nowrap;border-right:none;border-radius:6px;font-size:.78rem}.ni.on{border-right:none;background:rgba(79,127,255,.15)}.sg{grid-template-columns:1fr 1fr}}' +
'</style></head><body>' +
'<div class="hdr">' +
'<div class="logo">META<span>ADS</span></div>' +
'<select class="sw" id="sw" onchange="swAcc(this.value)"></select>' +
'<div class="hr"><div class="dl"></div><button class="btn" onclick="doOut()">Logout</button></div>' +
'</div>' +
'<div class="dbr">' +
'<button class="dp on" onclick="setDP(\'today\',this)">Today</button>' +
'<button class="dp" onclick="setDP(\'yesterday\',this)">Yesterday</button>' +
'<button class="dp" onclick="setDP(\'last_7d\',this)">7 days</button>' +
'<button class="dp" onclick="setDP(\'last_14d\',this)">14 days</button>' +
'<button class="dp" onclick="setDP(\'last_30d\',this)">30 days</button>' +
'<button class="dp" onclick="setDP(\'last_month\',this)">Last month</button>' +
'<input type="date" id="df" style="background:var(--s2);border:1px solid var(--b);border-radius:6px;padding:.28rem .55rem;color:var(--t);font-size:.75rem;outline:none;direction:ltr;margin-right:auto">' +
'<span style="color:var(--m);font-size:.75rem">-</span>' +
'<input type="date" id="dt" style="background:var(--s2);border:1px solid var(--b);border-radius:6px;padding:.28rem .55rem;color:var(--t);font-size:.75rem;outline:none;direction:ltr">' +
'<button class="btn" onclick="setCust()">Apply</button>' +
'</div>' +
'<div class="layout">' +
'<nav class="side">' +
'<span class="nlbl">Analytics</span>' +
'<div class="ni on" onclick="goP(\'dash\',this)">Dashboard</div>' +
'<div class="ni" onclick="goP(\'camps\',this)">Campaigns</div>' +
'<div class="ni" onclick="goP(\'adsets\',this)">Ad Sets</div>' +
'<div class="ni" onclick="goP(\'ads\',this)">Ads</div>' +
'<span class="nlbl">Tools</span>' +
'<div class="ni" onclick="goP(\'create\',this)">+ New Campaign</div>' +
'<div class="ni" onclick="goP(\'alerts\',this)">Alerts<span id="alb" style="display:none;background:var(--w);color:#fff;border-radius:10px;font-size:.62rem;padding:1px 5px;margin-right:5px"></span></div>' +
'<div class="ni" onclick="goP(\'ai\',this)">AI Assistant</div>' +
'<div class="ni" onclick="goP(\'export\',this)">Export</div>' +
'</nav>' +
'<main class="main">' +
'<div class="pg on" id="pg-dash"><div class="pt">Dashboard</div><div class="ps" id="dsb">Loading...</div><div class="sg" id="sg"><div class="ld" style="grid-column:1/-1"><div class="sp"></div></div></div><div class="cc"><div class="ch"><span style="font-size:.9rem;font-weight:700">Performance</span><div class="ctg"><button class="ctb" style="background:rgba(79,127,255,.15);color:var(--a);border-color:rgba(79,127,255,.3)" onclick="setM(\'spend\',this)">Spend</button><button class="ctb" onclick="setM(\'clicks\',this)">Clicks</button><button class="ctb" onclick="setM(\'ctr\',this)">CTR</button></div></div><div class="cw"><canvas id="ch"></canvas></div></div><div class="sh"><span style="font-size:.9rem;font-weight:700">Active Campaigns</span><button class="btn ba" onclick="goP(\'camps\',document.querySelectorAll(\'.ni\')[1])">All</button></div><div class="tw" id="dc"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-camps"><div class="pt">Campaigns</div><div class="ps">Manage all campaigns</div><div class="sh"><div style="display:flex;gap:.4rem"><button class="btn" onclick="ldC()">Refresh</button><button class="btn ba" onclick="goP(\'create\',document.querySelectorAll(\'.ni\')[4])">+ New</button></div><input class="si" placeholder="Search..." oninput="filt(\'ct\',this.value)"></div><div class="tw" id="ct"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-adsets"><div class="pt">Ad Sets</div><div class="ps">Ad groups</div><div class="sh"><button class="btn" onclick="ldA()">Refresh</button><input class="si" placeholder="Search..." oninput="filt(\'at\',this.value)"></div><div class="tw" id="at"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-ads"><div class="pt">Ads</div><div class="ps">All ads</div><div class="sh"><button class="btn" onclick="ldAd()">Refresh</button><input class="si" placeholder="Search..." oninput="filt(\'adt\',this.value)"></div><div class="tw" id="adt"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-create"><div class="pt">New Campaign</div><div class="ps">Set up campaign details</div><div class="tw" style="padding:1.5rem;max-width:540px"><div id="cerr" class="eb" style="display:none"><span id="cerrm"></span></div><div id="cok" class="ok" style="display:none">Campaign created!</div><label class="lbl2">Campaign Name</label><input type="text" class="inp2" id="cn" style="direction:rtl;text-align:right"><label class="lbl2">Objective</label><select class="inp2" id="co" style="direction:rtl;text-align:right"><option value="OUTCOME_TRAFFIC">Traffic</option><option value="OUTCOME_ENGAGEMENT">Engagement</option><option value="OUTCOME_LEADS">Leads</option><option value="OUTCOME_SALES">Sales</option><option value="OUTCOME_APP_PROMOTION">App Promotion</option><option value="OUTCOME_AWARENESS">Awareness</option></select><label class="lbl2">Daily Budget (ILS)</label><input type="number" class="inp2" id="cb" placeholder="100" min="1"><label class="lbl2">Status</label><select class="inp2" id="cs2" style="direction:rtl;text-align:right"><option value="PAUSED">Paused (recommended)</option><option value="ACTIVE">Active</option></select><div style="display:flex;gap:.6rem"><button class="btn ba" onclick="mkCamp()" id="cbtn" style="flex:1;padding:.7rem">Create Campaign</button><button class="btn" onclick="goP(\'camps\',document.querySelectorAll(\'.ni\')[1])">Cancel</button></div></div></div>' +
'<div class="pg" id="pg-alerts"><div class="pt">Smart Alerts</div><div class="ps">AI scans for issues</div><div class="sh"><button class="btn" onclick="doAlerts()">Scan Now</button></div><div id="al"><div class="ld"><div class="sp"></div></div></div></div>' +
'<div class="pg" id="pg-ai"><div class="pt">AI Assistant</div><div class="ps">Ask about your campaigns</div><div class="aib"><div class="aih">Claude analyzes your data</div><div class="air"><input type="text" class="aii" id="aiq" placeholder="Which campaigns should I pause?" onkeydown="if(event.key===\'Enter\')doAI()"><button class="btn ba" onclick="doAI()" id="aibtn">Send</button></div><div class="aiR" id="air"></div><div class="aisug"><button class="btn" onclick="setQ(\'Which campaigns are underperforming?\')">Weak campaigns</button><button class="btn" onclick="setQ(\'What is my average CPA?\')">Avg CPA</button><button class="btn" onclick="setQ(\'Which campaign performs best?\')">Best campaign</button><button class="btn" onclick="setQ(\'Recommendations to improve\')">Recommendations</button></div></div></div>' +
'<div class="pg" id="pg-export"><div class="pt">Export</div><div class="ps">Download and share</div><div class="eg"><div class="ec" onclick="exCSV()"><div class="ei">CSV</div><div class="et">Excel</div><div class="ed">All campaign data</div></div><div class="ec" onclick="exJSON()"><div class="ei">JSON</div><div class="et">Raw Data</div><div class="ed">For processing</div></div><div class="ec" onclick="window.print()"><div class="ei">PDF</div><div class="et">Print Report</div><div class="ed">Send to clients</div></div><div class="ec" onclick="cpSum()"><div class="ei">Share</div><div class="et">Copy Summary</div><div class="ed">WhatsApp / Email</div></div></div><div id="exm" class="ok" style="display:none"></div></div>' +
'</main></div>' +
'<div class="mo" id="em" style="display:none"><div class="mc"><div class="mh"><div class="mt">Edit Campaign</div><button class="xb" onclick="closeMo()">X</button></div><div id="ec2"></div><div class="mf"><button class="btn" onclick="closeMo()">Cancel</button><button class="btn ba" onclick="svEdit()">Save</button></div></div></div>' +
'<script>' +
'var SID=localStorage.getItem(\'sid\')||"",ACCT=localStorage.getItem(\'acct\')||"",ACCTS=[],CAMPS=[],ADS2=[],ADSETS=[],EID="",DP="today",DF="",DT="",MET="spend",CHART=null;' +
'if(!SID){location.href="/";} ' +
'function fmt(n){if(!n)return"0";var x=parseFloat(n);if(x>=1e6)return(x/1e6).toFixed(1)+"M";if(x>=1e3)return(x/1e3).toFixed(1)+"K";return x.toFixed(0);}' +
'function fmtM(n){return"ILS "+parseFloat(n||0).toFixed(2);}' +
'function fmtP(n){return parseFloat(n||0).toFixed(2)+"%";}' +
'function tod(){return new Date().toISOString().split("T")[0];}' +
'function ago(n){return new Date(Date.now()-n*86400000).toISOString().split("T")[0];}' +
'function gdp(){return DF&&DT?"time_range={\'since\':\'"+DF+"\',\'until\':\'"+DT+"\'}"  :"date_preset="+DP;}' +
'function api(path,cb){var x=new XMLHttpRequest();x.open("GET","/api/meta/"+path);x.setRequestHeader("Authorization",SID);x.onload=function(){var d=JSON.parse(x.responseText);if(d.error){cb(null,d.error.message);}else{cb(d,null);}};x.onerror=function(){cb(null,"Network error");};x.send();}' +
'function apiP(path,body,cb){var x=new XMLHttpRequest();x.open("POST","/api/meta/"+path);x.setRequestHeader("Authorization",SID);x.setRequestHeader("Content-Type","application/json");x.onload=function(){var d=JSON.parse(x.responseText);if(d.error){cb(null,d.error.message);}else{cb(d,null);}};x.onerror=function(){cb(null,"Network error");};x.send(JSON.stringify(body));}' +
'function doOut(){localStorage.removeItem("sid");localStorage.removeItem("acct");location.href="/";}' +
'function setDP(p,b){DP=p;DF="";DT="";document.querySelectorAll(".dp").forEach(function(x){x.classList.remove("on");});b.classList.add("on");rfr();}' +
'function setCust(){DF=document.getElementById("df").value;DT=document.getElementById("dt").value;if(!DF||!DT)return;document.querySelectorAll(".dp").forEach(function(x){x.classList.remove("on");});rfr();}' +
'function rfr(){var p=document.querySelector(".pg.on");if(!p)return;var id=p.id.replace("pg-","");if(id==="dash")ldDash();else if(id==="camps")ldC();else if(id==="adsets")ldA();else if(id==="ads")ldAd();}' +
'function goP(n,el){document.querySelectorAll(".pg").forEach(function(p){p.classList.remove("on");});document.querySelectorAll(".ni").forEach(function(x){x.classList.remove("on");});document.getElementById("pg-"+n).classList.add("on");if(el)el.classList.add("on");if(n==="camps")ldC();else if(n==="adsets")ldA();else if(n==="ads")ldAd();else if(n==="alerts")doAlerts();else if(n==="ai")prepAI();}' +
'function swAcc(id){ACCT=id;localStorage.setItem("acct",id);CAMPS=[];ldDash();}' +
'function ldDash(){' +
'  document.getElementById("dsb").textContent="Loading...";' +
'  api("act_"+ACCT+"/insights?"+gdp()+"&fields=spend,impressions,clicks,ctr,actions,cost_per_action_type&level=account",function(ins,err){' +
'    if(err){document.getElementById("sg").innerHTML=\'<div class="eb" style="grid-column:1/-1">\'+err+\'</div>\';return;}' +
'    var d=ins.data&&ins.data[0]?ins.data[0]:{};' +
'    var pv=(d.actions||[]).find(function(a){return a.action_type==="purchase";});var pvc=pv?pv.value:0;' +
'    var ca=(d.cost_per_action_type||[]).find(function(a){return a.action_type==="purchase";});var cpa=ca?ca.value:0;' +
'    var roas=pvc>0&&d.spend>0?(pvc/parseFloat(d.spend)*100).toFixed(2):0;' +
'    document.getElementById("sg").innerHTML=' +
'      sc("Spend","color:var(--a)",fmtM(d.spend),"Selected period")+' +
'      sc("Impressions","color:var(--or)",fmt(d.impressions),fmt(d.clicks)+" clicks")+' +
'      sc("CTR","color:var(--pu)",fmtP(d.ctr),"Click-through rate")+' +
'      sc("Purchases","color:var(--a2)",fmt(pvc),"purchase events")+' +
'      sc("CPA","color:#fd79a8",cpa?fmtM(cpa):"-","Cost per purchase")+' +
'      sc("ROAS","color:#55efc4",roas?roas+"x":"-","Return on ad spend");' +
'    document.getElementById("dsb").textContent="Updated: "+new Date().toLocaleTimeString();' +
'  });' +
'  api("act_"+ACCT+"/insights?time_increment=1&"+gdp()+"&fields=spend,clicks,ctr,date_start",function(ins,e){if(!e)drwC(ins.data||[]);});' +
'  api("act_"+ACCT+"/campaigns?fields=name,status,daily_budget,insights{spend,impressions,ctr}&limit=8&effective_status=[\"ACTIVE\"]",function(r,e){if(e){document.getElementById("dc").innerHTML=\'<div class="eb" style="margin:1rem">\'+e+\'</div>\';return;}rndrCT("dc",r.data||[],true);});' +
'}' +
'function sc(l,c,v,s){return \'<div class="sc"><div class="sl">\'+l+\'</div><div class="sv" style="\'+c+\'">\'+v+\'</div><div class="sm">\'+s+\'</div></div>\';}' +
'function drwC(data){' +
'  if(CHART)CHART.destroy();' +
'  var lbs=data.map(function(d){var dt=new Date(d.date_start);return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit"});});' +
'  var ds={spend:{data:data.map(function(d){return parseFloat(d.spend||0);}),borderColor:"#4f7fff",backgroundColor:"rgba(79,127,255,.1)"},clicks:{data:data.map(function(d){return parseFloat(d.clicks||0);}),borderColor:"#00e5a0",backgroundColor:"rgba(0,229,160,.1)"},ctr:{data:data.map(function(d){return parseFloat(d.ctr||0);}),borderColor:"#ff9f43",backgroundColor:"rgba(255,159,67,.1)"}};' +
'  var d=ds[MET];d.tension=.4;d.fill=true;' +
'  CHART=new Chart(document.getElementById("ch").getContext("2d"),{type:"line",data:{labels:lbs,datasets:[d]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:"rgba(42,42,58,.5)"},ticks:{color:"#6b6b8a",font:{size:10}}},y:{grid:{color:"rgba(42,42,58,.5)"},ticks:{color:"#6b6b8a",font:{size:10}}}}}});' +
'}' +
'function setM(m,btn){MET=m;document.querySelectorAll(".ctb").forEach(function(b){b.style.cssText="";});btn.style.cssText="background:rgba(79,127,255,.15);color:var(--a);border-color:rgba(79,127,255,.3)";rfr();}' +
'function ldC(){document.getElementById("ct").innerHTML=\'<div class="ld"><div class="sp"></div></div>\';api("act_"+ACCT+"/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,insights{spend,impressions,clicks,ctr,actions}&limit=100&"+gdp(),function(r,e){if(e){document.getElementById("ct").innerHTML=\'<div class="eb" style="margin:1rem">\'+e+\'</div>\';return;}CAMPS=r.data||[];rndrCT("ct",CAMPS,false);});}' +
'function rndrCT(el,data,mini){' +
'  if(!data.length){document.getElementById(el).innerHTML=\'<div class="ld">No campaigns</div>\';return;}' +
'  var rows=data.map(function(c){' +
'    var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};' +
'    var pv=(ins.actions||[]).find(function(a){return a.action_type==="purchase";});var pvc=pv?pv.value:0;' +
'    var bc=c.status==="ACTIVE"?\'bac\':\'bpc\';' +
'    var acts=mini?"":"<td>"+(pvc||"-")+"</td><td><div class=\"ac\">"+(c.status==="ACTIVE"?\'<button class="btn bdan" style="font-size:.75rem;padding:.3rem .7rem" onclick="tog(\\\'"+c.id+"\\\',\\\'PAUSED\\\')"  >Pause</button>\':\'<button class="btn bsuc" style="font-size:.75rem;padding:.3rem .7rem" onclick="tog(\\\'"+c.id+"\\\',\\\'ACTIVE\\\')">Resume</button>\')+\'<button class="btn" style="font-size:.75rem;padding:.3rem .7rem" onclick="opEd(\\\'"+c.id+"\\\'  )">Edit</button></div></td>\";' +
'    return "<tr><td style=\"font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis\">"+c.name+"</td><td><span class=\""+bc+"\"><span class=\"dot\"></span>"+(c.status==="ACTIVE"?"Active":"Paused")+"</span></td><td><span class=\"tg\">"+(c.objective||"").replace("OUTCOME_","")+"</span></td><td>"+(c.daily_budget?fmtM(c.daily_budget/100)+"/d":"-")+"</td><td>"+fmtM(ins.spend)+"</td><td>"+fmt(ins.impressions)+"</td><td>"+fmtP(ins.ctr)+"</td>"+acts+"</tr>";' +
'  });' +
'  var hx=mini?"":"<th>Purchases</th><th>Actions</th>";' +
'  document.getElementById(el).innerHTML="<table><thead><tr><th>Name</th><th>Status</th><th>Objective</th><th>Budget</th><th>Spend</th><th>Impressions</th><th>CTR</th>"+hx+"</tr></thead><tbody>"+rows.join("")+"</tbody></table>";' +
'}' +
'function ldA(){document.getElementById("at").innerHTML=\'<div class="ld"><div class="sp"></div></div>\';api("act_"+ACCT+"/adsets?fields=name,status,daily_budget,insights{spend,impressions,clicks,ctr}&limit=100&"+gdp(),function(r,e){if(e){document.getElementById("at").innerHTML=\'<div class="eb" style="margin:1rem">\'+e+\'</div>\';return;}ADSETS=r.data||[];if(!ADSETS.length){document.getElementById("at").innerHTML=\'<div class="ld">No ad sets</div>\';return;}var rows=ADSETS.map(function(a){var ins=a.insights&&a.insights.data&&a.insights.data[0]?a.insights.data[0]:{};var bc=a.status==="ACTIVE"?\'bac\':\'bpc\';return "<tr><td style=\"font-weight:600\">"+a.name+"</td><td><span class=\""+bc+"\"><span class=\"dot\"></span>"+(a.status==="ACTIVE"?"Active":"Paused")+"</span></td><td>"+(a.daily_budget?fmtM(a.daily_budget/100)+"/d":"-")+"</td><td>"+fmtM(ins.spend)+"</td><td>"+fmt(ins.impressions)+"</td><td>"+fmtP(ins.ctr)+"</td><td><div class=\"ac\">"+(a.status==="ACTIVE"?\'<button class="btn bdan" style="font-size:.75rem;padding:.3rem .7rem" onclick="togA(\\\'\'+a.id+\'\\\')">Pause</button>\':\'<button class="btn bsuc" style="font-size:.75rem;padding:.3rem .7rem" onclick="togA(\\\'\'+a.id+\'\\\'  ,\\\'ACTIVE\\\')">Resume</button>\')+"</div></td></tr>";});document.getElementById("at").innerHTML="<table><thead><tr><th>Name</th><th>Status</th><th>Budget</th><th>Spend</th><th>Impressions</th><th>CTR</th><th>Actions</th></tr></thead><tbody>"+rows.join("")+"</tbody></table>";});}' +
'function ldAd(){document.getElementById("adt").innerHTML=\'<div class="ld"><div class="sp"></div></div>\';api("act_"+ACCT+"/ads?fields=name,status,insights{spend,impressions,clicks,ctr}&limit=100&"+gdp(),function(r,e){if(e){document.getElementById("adt").innerHTML=\'<div class="eb" style="margin:1rem">\'+e+\'</div>\';return;}ADS2=r.data||[];if(!ADS2.length){document.getElementById("adt").innerHTML=\'<div class="ld">No ads</div>\';return;}var rows=ADS2.map(function(a){var ins=a.insights&&a.insights.data&&a.insights.data[0]?a.insights.data[0]:{};var bc=a.status==="ACTIVE"?\'bac\':\'bpc\';return "<tr><td style=\"font-weight:600\">"+a.name+"</td><td><span class=\""+bc+"\"><span class=\"dot\"></span>"+(a.status==="ACTIVE"?"Active":"Paused")+"</span></td><td>"+fmtM(ins.spend)+"</td><td>"+fmt(ins.impressions)+"</td><td>"+fmt(ins.clicks)+"</td><td>"+fmtP(ins.ctr)+"</td><td><div class=\"ac\">"+(a.status==="ACTIVE"?\'<button class="btn bdan" style="font-size:.75rem;padding:.3rem .7rem" onclick="togD(\\\'\'+a.id+\'\\\')">Pause</button>\':\'<button class="btn bsuc" style="font-size:.75rem;padding:.3rem .7rem" onclick="togD(\\\'\'+a.id+\'\\\'  )">Resume</button>\')+"</div></td></tr>";});document.getElementById("adt").innerHTML="<table><thead><tr><th>Name</th><th>Status</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>Actions</th></tr></thead><tbody>"+rows.join("")+"</tbody></table>";});}' +
'function tog(id,s){apiP(id,{status:s},function(r,e){if(e){alert("Error: "+e);return;}ldC();});}' +
'function togA(id,s){apiP(id,{status:s||"PAUSED"},function(r,e){if(e){alert("Error: "+e);return;}ldA();});}' +
'function togD(id,s){apiP(id,{status:s||"PAUSED"},function(r,e){if(e){alert("Error: "+e);return;}ldAd();});}' +
'function opEd(id){var c=CAMPS.find(function(x){return x.id===id;});if(!c)return;EID=id;document.getElementById("ec2").innerHTML=\'<label class="lbl2">Name</label><input type="text" class="inp2" id="en" value="\'+c.name+\'" style="direction:rtl;text-align:right"><label class="lbl2">Daily Budget (ILS)</label><input type="number" class="inp2" id="eb" value="\'+( c.daily_budget?c.daily_budget/100:"")+\'"><label class="lbl2">Status</label><select class="inp2" id="es" style="direction:rtl;text-align:right"><option value="ACTIVE"\'+( c.status==="ACTIVE"?" selected":"")+\'>Active</option><option value="PAUSED"\'+( c.status==="PAUSED"?" selected":"")+\'>Paused</option></select>\';document.getElementById("em").style.display="flex";}' +
'function svEdit(){var b={name:document.getElementById("en").value.trim(),status:document.getElementById("es").value};var bv=document.getElementById("eb").value;if(bv)b.daily_budget=Math.round(parseFloat(bv)*100);apiP(EID,b,function(r,e){if(e){alert("Error: "+e);return;}closeMo();ldC();});}' +
'function closeMo(){document.getElementById("em").style.display="none";}' +
'function mkCamp(){var nm=document.getElementById("cn").value.trim(),bg=document.getElementById("cb").value,btn=document.getElementById("cbtn");document.getElementById("cerr").style.display="none";document.getElementById("cok").style.display="none";if(!nm||!bg){document.getElementById("cerr").style.display="block";document.getElementById("cerrm").textContent="Please fill name and budget";return;}btn.textContent="Creating...";btn.disabled=true;apiP("act_"+ACCT+"/campaigns",{name:nm,objective:document.getElementById("co").value,status:document.getElementById("cs2").value,daily_budget:Math.round(parseFloat(bg)*100),special_ad_categories:"[]"},function(r,e){if(e){document.getElementById("cerr").style.display="block";document.getElementById("cerrm").textContent=e;}else{document.getElementById("cok").style.display="block";document.getElementById("cn").value="";document.getElementById("cb").value="";}btn.textContent="Create Campaign";btn.disabled=false;});}' +
'function doAlerts(){document.getElementById("al").innerHTML=\'<div class="ld"><div class="sp"></div><span>Scanning...</span></div>\';api("act_"+ACCT+"/campaigns?fields=name,status,daily_budget,insights{spend,ctr,actions,cost_per_action_type}&limit=50&date_preset=last_7d",function(r,e){if(e){document.getElementById("al").innerHTML=\'<div class="eb">\'+e+\'</div>\';return;}var al=[];(r.data||[]).forEach(function(c){if(c.status!=="ACTIVE")return;var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};var sp=parseFloat(ins.spend||0),ct=parseFloat(ins.ctr||0);var pv=(ins.actions||[]).find(function(a){return a.action_type==="purchase";});var pvc=pv?pv.value:0;var ca=(ins.cost_per_action_type||[]).find(function(a){return a.action_type==="purchase";});var cpa=ca?ca.value:0;if(sp>50&&pvc===0)al.push({cls:"ah",t:c.name+" - Spend with no conversions",d:"Spent ILS "+sp.toFixed(0)+" with zero purchases.",id:c.id});if(ct>0&&ct<0.3)al.push({cls:"am",t:c.name+" - Low CTR ("+ct.toFixed(2)+"%)",d:"CTR below 0.3%.",id:c.id});if(cpa>200)al.push({cls:"am",t:c.name+" - High CPA (ILS "+parseFloat(cpa).toFixed(0)+")",d:"High cost per purchase.",id:c.id});});var badge=document.getElementById("alb");if(al.length){badge.style.display="inline";badge.textContent=al.length;}else{badge.style.display="none";}if(!al.length){document.getElementById("al").innerHTML=\'<div class="ok">All campaigns look good!</div>\';return;}document.getElementById("al").innerHTML=al.map(function(a){return \'<div class="alc \'+a.cls+\'"><div style="font-size:.75rem;font-weight:700;flex-shrink:0">!!</div><div class="alb2"><div class="alt">\'+a.t+\'</div><div class="ald">\'+a.d+\'</div></div>\'+( a.id?\'<button class="btn bdan" style="font-size:.75rem;padding:.3rem .7rem" onclick="tog(\\\'\'+a.id+\'\\\',\\\'PAUSED\\\')">Pause</button>\':\'')+\'</div>\';}).join("");});}' +
'var aiCtx="";' +
'function prepAI(){api("act_"+ACCT+"/campaigns?fields=name,status,objective,daily_budget,insights{spend,impressions,clicks,ctr,actions}&limit=30&date_preset=last_7d",function(r,e){if(!e)aiCtx=JSON.stringify(r.data||[]);});}' +
'function doAI(){var q=document.getElementById("aiq").value.trim();if(!q)return;var btn=document.getElementById("aibtn"),el=document.getElementById("air");el.style.display="block";el.textContent="Analyzing...";btn.disabled=true;if(!aiCtx)prepAI();var x=new XMLHttpRequest();x.open("POST","https://api.anthropic.com/v1/messages");x.setRequestHeader("Content-Type","application/json");x.onload=function(){var d=JSON.parse(x.responseText);el.textContent=d.content&&d.content[0]?d.content[0].text:"No response";btn.disabled=false;};x.onerror=function(){el.textContent="Error";btn.disabled=false;};x.send(JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"You are an expert Meta Ads manager. Campaign data: "+aiCtx+". Answer concisely with practical recommendations.",messages:[{role:"user",content:q}]}));}' +
'function setQ(q){document.getElementById("aiq").value=q;}' +
'function exCSV(){if(!CAMPS.length){alert("Load campaigns first");return;}var h=["Name","Status","Objective","Budget","Spend","Impressions","Clicks","CTR"];var rows=CAMPS.map(function(c){var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};return[c.name,c.status,c.objective,c.daily_budget?c.daily_budget/100:"",ins.spend||0,ins.impressions||0,ins.clicks||0,ins.ctr||0].join(",");});var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+[h.join(",")].concat(rows).join("\n")],{type:"text/csv;charset=utf-8"}));a.download="meta-ads-"+tod()+".csv";a.click();}' +
'function exJSON(){if(!CAMPS.length){alert("Load campaigns first");return;}var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({account:ACCT,date:tod(),campaigns:CAMPS},null,2)],{type:"application/json"}));a.download="meta-ads-"+tod()+".json";a.click();}' +
'function cpSum(){if(!CAMPS.length){alert("Load campaigns first");return;}var txt="Meta Ads Report - "+tod()+"\n"+CAMPS.slice(0,5).map(function(c){var ins=c.insights&&c.insights.data&&c.insights.data[0]?c.insights.data[0]:{};return c.name+": ILS"+parseFloat(ins.spend||0).toFixed(0)+" spend, "+parseFloat(ins.ctr||0).toFixed(2)+"% CTR";}).join("\n");navigator.clipboard.writeText(txt).then(function(){var el=document.getElementById("exm");el.textContent="Copied!";el.style.display="block";setTimeout(function(){el.style.display="none";},2000);});}' +
'function filt(id,q){var t=document.querySelector("#"+id+" table");if(!t)return;t.querySelectorAll("tbody tr").forEach(function(tr){tr.style.display=tr.textContent.toLowerCase().includes(q.toLowerCase())?"":"none";});}' +
'window.onload=function(){' +
'  document.getElementById("df").value=ago(7);' +
'  document.getElementById("dt").value=tod();' +
'  api("me/adaccounts?fields=name,account_id,currency,account_status&limit=50",function(d,e){' +
'    if(e)return;' +
'    ACCTS=(d.data||[]).filter(function(a){return a.account_status===1;});' +
'    if(!ACCT&&ACCTS.length)ACCT=ACCTS[0].account_id;' +
'    localStorage.setItem("acct",ACCT);' +
'    var sw=document.getElementById("sw");' +
'    sw.innerHTML=ACCTS.map(function(a){return \'<option value="\'+a.account_id+\'"\'+( a.account_id===ACCT?" selected":"")+\">\'+a.name+\" (\"+a.currency+\")</option>\";}).join("");' +
'    ldDash();' +
'  });' +
'};' +
'<\/script></body></html>';

const server = http.createServer(function(req,res){
  var parsed=url.parse(req.url,true),pathname=parsed.pathname;
  cors(res);
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}
  if(pathname==="/api/login"&&req.method==="POST"){
    var b="";req.on("data",function(c){b+=c;});
    req.on("end",function(){
      try{var d=JSON.parse(b);if(d.username===CONFIG.USERNAME&&d.password===CONFIG.PASSWORD){res.setHeader("Content-Type","application/json");res.writeHead(200);res.end(JSON.stringify({ok:true,session:mkSid()}));}else{res.writeHead(401);res.end(JSON.stringify({ok:false}));}}
      catch(e){res.writeHead(400);res.end(JSON.stringify({ok:false}));}
    });return;
  }
  if(pathname==="/api/verify"){res.setHeader("Content-Type","application/json");res.writeHead(200);res.end(JSON.stringify({ok:okSid(req.headers["authorization"])}));return;}
  if(pathname==="/app"){if(!okSid(req.headers["authorization"]||"")){res.setHeader("Content-Type","text/html;charset=utf-8");res.writeHead(200);res.end(APP_PAGE);}else{res.setHeader("Content-Type","text/html;charset=utf-8");res.writeHead(200);res.end(APP_PAGE);}return;}
  if(pathname.startsWith("/api/meta/")){
    if(!okSid(req.headers["authorization"])){res.writeHead(401);res.end(JSON.stringify({error:{message:"Not logged in"}}));return;}
    var metaPath=pathname.replace("/api/meta/","")+( req.url.includes("?")?req.url.slice(req.url.indexOf("?")):"");
    if(req.method==="POST"){var b2="";req.on("data",function(c){b2+=c;});req.on("end",function(){var params="";try{var p=JSON.parse(b2);params=new URLSearchParams(p).toString();}catch(e){params=b2;}prx(metaPath.split("?")[0],"POST",params,res);});}
    else{prx(metaPath,"GET",null,res);}return;
  }
  res.setHeader("Content-Type","text/html;charset=utf-8");res.writeHead(200);res.end(PAGE);
});
server.listen(CONFIG.PORT,function(){console.log("Running on port "+CONFIG.PORT);});
