import { LS_KEYS, $, toast } from "./utils.js";
import { api } from "./api.js";

// ===== Local Storage =====
function loadAlerts() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.alerts) || "[]"); }
  catch { return []; }
}
function saveAlerts(arr) {
  localStorage.setItem(LS_KEYS.alerts, JSON.stringify(arr));
}

// ===== Normalize helper =====
function normalizeAlert(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); }
    catch { obj = { id: crypto.randomUUID(), title: raw, keywords: [] }; }
  }
  if (typeof obj !== "object") return null;
  if (!obj.id) obj.id = crypto.randomUUID();
  if (!obj.title) obj.title = "(ללא כותרת)";
  if (!Array.isArray(obj.keywords)) obj.keywords = [];
  return obj;
}

// ===== UI Render =====
export function renderAlerts() {
  const wrap = $("#alerts-list");
  const alerts = loadAlerts();
  wrap.innerHTML = alerts.length ? "" : '<div class="muted">אין התראות. צור התראה חדשה.</div>';

  alerts.forEach((a) => {
    const card = document.createElement("div");
    card.className = "alert-card";
    card.innerHTML = `
      <h3>${a.title}</h3>
      <div class="muted">מילות מפתח:</div>
      <div>${(a.keywords || []).map((k) => `<span class="alert-chip">${k}</span>`).join(" ") || "-"}</div>
      <div style="margin-top:8px;">
        <button class="btn" data-del="${a.id}">מחק</button>
      </div>`;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const next = loadAlerts().filter((x) => x.id !== id);
      saveAlerts(next);
      renderAlerts();
      try {
        await api.deleteNotification(id);
        toast("התראה נמחקה");
      }
      catch { toast("מחיקה בשרת נכשלה", false); }
    });
  });
}

// ===== יצירת התראה חדשה =====
export async function createAlert(title, keywordsCsv) {
  const id = crypto.randomUUID();
  const keywords = (keywordsCsv || "").split(",").map((s) => s.trim()).filter(Boolean);
  const payload = { id, title, keywords, createdAt: Date.now() };
  const alerts = loadAlerts();
  alerts.push(payload);
  saveAlerts(alerts);
  renderAlerts();
  try { await api.createNotification(payload); toast("התראה נוצרה"); }
  catch { toast("יצירה בשרת נכשלה", false); }
}

// ===== טעינה מהשרת =====
export async function loadAlertsFromServer() {
  try {
    const rawList = await api.getNotifications();
    if (!Array.isArray(rawList)) throw new Error("Invalid response");
    const alerts = rawList.map(normalizeAlert).filter(Boolean);
    saveAlerts(alerts);
    renderAlerts();
    toast("התראות נטענו מהשרת");
  } catch (e) {
    console.error(e);
    toast("טעינת התראות מהשרת נכשלה", false);
  }
}
