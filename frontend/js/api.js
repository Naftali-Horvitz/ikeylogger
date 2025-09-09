// ==============================
// API client
// ==============================
import { normTime } from "./utils.js";

// בסיס API (עדכן לפי הצורך)
export const API_BASE = "http://127.0.0.1:3000/api";

// --- עזר: timeout ל-fetch ---
function withTimeout(ms = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(id) };
}

// --- עזר: טיפול תגובה אחיד ---
async function handleResponse(res) {
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { }
    throw new Error(`HTTP ${res.status}${detail ? ` – ${detail}` : ""}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function apiGET(path, { timeoutMs = 15000 } = {}) {
  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { mode: "cors", signal: t.signal });
    return await handleResponse(res);
  } finally { t.done(); }
}

async function apiPOST(path, body, { timeoutMs = 15000 } = {}) {
  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body == null ? null : JSON.stringify(body),
      mode: "cors",
      signal: t.signal,
    });
    return await handleResponse(res);
  } finally { t.done(); }
}

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.append(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ==============================
// Public API
// ==============================
export const api = {
  // מחשבים / לוגים
  getMachines: () => apiGET(`/get_target_machines_list`),
  getKeystrokes: ({ machine, date, start, end }) => {
    if (!machine) throw new Error("חסר פרמטר machine");
    const qs = buildQuery({
      machine,
      date,
      start: normTime(start),
      end: normTime(end),
    });
    return apiGET(`/get_keystrokes${qs}`);
  },

  // ===== התראות =====
  getNotifications: () => apiGET(`/get_notifications`),

  getWarnings: () => apiGET(`/get_warnings`),

  getNewWarnings: () => apiGET(`/new_warning`),

  createNotification: (payload) => apiPOST(`/notifications`, payload),

// מחיקת התראה: שולח אובייקט { id } בגוף ל-POST /api/deletenotifications
deleteNotification: (id) => {
  if (!id) throw new Error("חסר id למחיקה");
  return apiPOST(`/delete_notification`, id);
},

  // ===== הגדרות סוכן =====
  getSettings: () => apiGET(`/get_settings`),
  updateSettings: (data) => apiPOST(`/update_settings`, data),
};
