// -----------------------------
// נתוני דוגמה והמצב הכולל
// -----------------------------
const state = {
  computers: [
    'PC-IL-DB-01','PC-IL-WEB-12','LAPTOP-OPS-7','SRV-BACKUP-02','QA-VM-03','DEV-WS-014','PC-TLV-SEC-01','SRV-MAIL-01','KIOSK-HALL-2','LAB-NUC-11'
  ],
  logs: [
    { time: new Date(Date.now()-3600_000).toISOString(), host: 'PC-IL-DB-01', level: 'INFO', message: 'DB sync completed' },
    { time: new Date(Date.now()-1800_000).toISOString(), host: 'PC-IL-WEB-12', level: 'WARN', message: 'High CPU usage detected' },
    { time: new Date(Date.now()-900_000).toISOString(), host: 'SRV-BACKUP-02', level: 'ERROR', message: 'Backup job failed' },
    { time: new Date(Date.now()-300_000).toISOString(), host: 'QA-VM-03', level: 'INFO', message: 'Agent heartbeat OK' },
  ],
  alerts: [
    { id: crypto.randomUUID(), severity: 'high', host: 'SRV-BACKUP-02', text: 'כשל רציני במשימת גיבוי', resolved: false, time: Date.now()-920_000 },
    { id: crypto.randomUUID(), severity: 'medium', host: 'PC-IL-WEB-12', text: 'צריכת CPU חריגה ב-10 דקות האחרונות', resolved: false, time: Date.now()-520_000 },
    { id: crypto.randomUUID(), severity: 'low', host: 'QA-VM-03', text: 'גרסת סוכן ישנה', resolved: true, time: Date.now()-3_600_000 },
  ],
  agent: { running: true, version: '1.3.2', pendingVersion: null }
};

// כלים קטנים
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const fmtTime = iso => new Date(iso).toLocaleString('he-IL');
const toast = (msg) => {
  const t = document.createElement('div');
  t.className = 'item';
  t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(()=> t.remove(), 3500);
};

// -----------------------------
// ניווט (SPA)  #/home | #/logs | #/alerts | #/agent
// -----------------------------
function setActiveRoute(hash){
  const route = (hash || '#/home').replace('#/','');
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.route===route));
  $$('.tablink').forEach(b => b.setAttribute('aria-current', b.dataset.route === '#/'+route ? 'page' : 'false'));
  document.title = `מרכז ניהול מחשבים · ${routeLabel(route)}`;
  switch(route){
    case 'home': renderHome(); break;
    case 'logs': renderLogs(); break;
    case 'alerts': renderAlerts(); break;
    case 'agent': renderAgent(); break;
  }
}
function routeLabel(route){
  return ({home:'עמוד הבית', logs:'לוגים', alerts:'התראות', agent:'ניהול הסוכן'})[route] || '';
}

window.addEventListener('hashchange', () => setActiveRoute(location.hash));

// כפתורי ניווט
$$('.tablink').forEach(btn => btn.addEventListener('click', () => {
  location.hash = btn.dataset.route;
}));

// -----------------------------
// עיצובים (3 סוגים): מינימליסטי / מודרני / כהה-ניאון
// -----------------------------
const themeSelect = $('#themeSelect');
function applyTheme(theme){
  document.body.classList.remove('theme-minimal','theme-modern','theme-neon');
  document.body.classList.add(theme);
  localStorage.setItem('ui-theme', theme);
}
themeSelect.addEventListener('change', e => applyTheme(e.target.value));

// שחזור ערכת נושא מהאחסון
const savedTheme = localStorage.getItem('ui-theme') || 'theme-modern';
themeSelect.value = savedTheme;
applyTheme(savedTheme);

// -----------------------------
// רינדור עמוד הבית
// -----------------------------
function renderHome(){
  $('#year').textContent = new Date().getFullYear();
  const list = $('#computerList');
  const term = ($('#searchComputers').value || '').toLowerCase().trim();
  const rows = state.computers
    .filter(n => !term || n.toLowerCase().includes(term))
    .sort((a,b)=> a.localeCompare(b,'he'));
  list.innerHTML = '';
  rows.forEach(name => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${name}</h3>
      <div class="muted">מצב: ${randomStatusBadge()}</div>`;
    list.appendChild(card);
  });
  $('#computerCount').textContent = `${rows.length} מחשבים מוצגים`;

  // סטטיסטיקות קצרות
  const stats = $('#quickStats');
  const online = Math.floor(rows.length * 0.86);
  const updates = Math.max(0, Math.floor(rows.length * 0.12) - 1);
  stats.innerHTML = `
    <li>מחוברים: <strong>${online}</strong></li>
    <li>נדרשת התקנת עדכונים: <strong>${updates}</strong></li>
    <li>שגיאות יומיות אחרונות: <strong>${state.logs.filter(l=>l.level==='ERROR').length}</strong></li>
  `;

  // התראה אחרונה
  const latest = [...state.alerts].sort((a,b)=> b.time - a.time)[0];
  $('#latestAlert').innerHTML = latest
    ? `<div class="badge ${sevClass(latest.severity)}">חומרה: ${sevLabel(latest.severity)}</div>
       <p style="margin:.5rem 0 0 0"><strong>${latest.host}</strong>: ${latest.text}</p>
       <div class="muted">לפני ${(Math.round((Date.now()-latest.time)/60000))} דק׳</div>`
    : '<span class="muted">אין התראות</span>';
}

function randomStatusBadge(){
  const statuses = [
    ['זמין','success'], ['תחזוקה','warn'], ['מנותק','danger'], ['פעיל','info']
  ];
  const [label, cls] = statuses[Math.floor(Math.random()*statuses.length)];
  return `<span class="badge ${cls}">${label}</span>`;
}

// -----------------------------
// רינדור לוגים
// -----------------------------
function renderLogs(){
  const q = ($('#searchLogs').value||'').toLowerCase().trim();
  const lvl = $('#levelFilter').value;
  const rows = state.logs.filter(l => (!lvl || l.level===lvl) && (!q || l.host.toLowerCase().includes(q) || l.message.toLowerCase().includes(q)) )
                         .sort((a,b)=> new Date(b.time)-new Date(a.time));
  const tbody = $('#logsTable');
  tbody.innerHTML = '';
  rows.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="muted">${fmtTime(l.time)}</td>
                    <td><strong>${l.host}</strong></td>
                    <td><span class="badge ${levelClass(l.level)}">${l.level}</span></td>
                    <td>${escapeHtml(l.message)}</td>`;
    tbody.appendChild(tr);
  });
}

function levelClass(level){
  return level==='ERROR' ? 'danger' : level==='WARN' ? 'warn' : 'info';
}

// -----------------------------
// רינדור התראות
// -----------------------------
function renderAlerts(){
  const sev = $('#severityFilter').value;
  const list = $('#alertsList');
  const rows = state.alerts.filter(a => (!sev || a.severity===sev))
                           .sort((a,b)=> Number(a.resolved)-Number(b.resolved) || b.time - a.time);
  list.innerHTML = '';
  if(rows.length===0){
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'אין התראות תואמות.';
    list.appendChild(empty);
    return;
  }
  rows.forEach(a => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="toolbar" style="justify-content: space-between; align-items: start; gap: 8px;">
        <div>
          <div class="badge ${sevClass(a.severity)}">${sevLabel(a.severity)}</div>
          <h3 style="margin-top:6px">${a.host}</h3>
          <div class="muted">${new Date(a.time).toLocaleString('he-IL')}</div>
        </div>
        <div class="toolbar" style="gap:8px">
          <button class="button ${a.resolved ? 'ghost' : 'primary'}" data-action="resolve" data-id="${a.id}" ${a.resolved ? 'disabled' : ''}>סמן כטופל</button>
          <button class="button ghost" data-action="remove" data-id="${a.id}">הסר</button>
        </div>
      </div>
      <p style="margin: 8px 0 0 0">${escapeHtml(a.text)}</p>
    `;
    list.appendChild(card);
  });
}

function sevLabel(s){ return s==='high'?'גבוהה': s==='medium'?'בינונית':'נמוכה'; }
function sevClass(s){ return s==='high'?'danger': s==='medium'?'warn':'info'; }

// -----------------------------
// רינדור ניהול הסוכן
// -----------------------------
function renderAgent(){
  $('#agentVersion').textContent = state.agent.version;
  const on = state.agent.running;
  const sw = $('#agentSwitch');
  sw.classList.toggle('on', on);
  sw.setAttribute('aria-checked', String(on));
  $('#agentStateLabel').textContent = on ? 'מופעל' : 'כבוי';
}

// -----------------------------
// אירועים וטפסים
// -----------------------------
$('#searchComputers').addEventListener('input', renderHome);
$('#btnRefreshHome').addEventListener('click', () => { toast('הרשימה עודכנה'); renderHome(); });

$('#searchLogs').addEventListener('input', renderLogs);
$('#levelFilter').addEventListener('change', renderLogs);
$('#btnAddLog').addEventListener('click', () => {
  const sample = { time: new Date().toISOString(), host: sampleFrom(state.computers), level: sampleFrom(['INFO','WARN','ERROR']), message: sampleFrom([
    'User logged in','Service restarted','Disk nearing capacity','Backup job completed','High memory usage','Package updated']) };
  state.logs.unshift(sample);
  renderLogs();
  toast('לוג חדש נוסף');
});

$('#btnExportCsv').addEventListener('click', () => {
  const rows = [['time','host','level','message'], ...state.logs.map(l=>[l.time,l.host,l.level,l.message.replaceAll('\n',' ')])];
  const csv = rows.map(r=> r.map(x => '"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'logs.csv'; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 0);
});

$('#severityFilter').addEventListener('change', renderAlerts);
$('#btnAddAlert').addEventListener('click', () => {
  const a = { id: crypto.randomUUID(), severity: sampleFrom(['low','medium','high']), host: sampleFrom(state.computers), text: sampleFrom([
    'כשל אימות','ניסיון חיבור לא מורשה','עדכון נדרש','שירות הפסיק לפעול','קובץ לוג חסר']), resolved: false, time: Date.now() };
  state.alerts.unshift(a); renderAlerts(); toast('התראה חדשה נוצרה');
});

$('#btnResolveAll').addEventListener('click', () => {
  state.alerts.forEach(a => a.resolved = true); renderAlerts(); toast('כל ההתראות סומנו כטופלו');
});

$('#alertsList').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]'); if(!btn) return;
  const id = btn.dataset.id; const action = btn.dataset.action;
  const idx = state.alerts.findIndex(a => a.id===id); if(idx<0) return;
  if(action==='resolve'){ state.alerts[idx].resolved = true; toast('התראה סומנה כטופלה'); }
  if(action==='remove'){ state.alerts.splice(idx,1); toast('התראה הוסרה'); }
  renderAlerts();
});

$('#agentSwitch').addEventListener('click', toggleAgent);
$('#agentSwitch').addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggleAgent(); } });

function toggleAgent(){
  state.agent.running = !state.agent.running; renderAgent();
  toast(state.agent.running?'הסוכן הופעל':'הסוכן כובה');
}

let latestFoundVersion = null;
$('#btnCheckUpdates').addEventListener('click', () => {
  // סימולציה למציאת גרסה חדשה לעיתים
  if(Math.random() > 0.4){
    latestFoundVersion = bumpMinor(state.agent.version);
    state.agent.pendingVersion = latestFoundVersion;
    $('#btnInstallUpdate').disabled = false;
    toast(`נמצאה גרסה חדשה ${latestFoundVersion}`);
  } else {
    $('#btnInstallUpdate').disabled = true; state.agent.pendingVersion = null;
    toast('לא נמצאו עדכונים');
  }
});

$('#btnInstallUpdate').addEventListener('click', () => {
  if(!state.agent.pendingVersion) return;
  state.agent.version = state.agent.pendingVersion;
  state.agent.pendingVersion = null;
  $('#btnInstallUpdate').disabled = true;
  renderAgent(); toast('העדכון הותקן');
});

$('#btnPing').addEventListener('click', () => {
  toast('תקשורת תקינה (pong)');
});

$('#agentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  if(!/^https?:\/\//.test(data.endpoint)){ toast('כתובת שרת אינה תקינה'); return; }
  const interval = Number(data.interval);
  if(!Number.isFinite(interval) || interval < 1){ toast('מרווח ניטור אינו תקין'); return; }
  toast('הגדרות נשמרו');
});

$('#addComputerForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = ($('#newComputerName').value||'').trim();
  if(!name){ toast('יש להזין שם מחשב'); return; }
  if(state.computers.includes(name)){ toast('שם זה כבר קיים'); return; }
  state.computers.push(name); $('#newComputerName').value='';
  toast('המחשב נוסף'); renderHome();
});

// -----------------------------
// עזר
// -----------------------------
function sampleFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function bumpMinor(v){ const [maj, min, patch] = v.split('.').map(n=>+n); return `${maj}.${min+1}.${patch}`; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])); }

// -----------------------------
// אתחול
// -----------------------------
setActiveRoute(location.hash || '#/home');
