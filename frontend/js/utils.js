// ===== Utils, Storage Keys, Config =====
export const LS_KEYS = Object.freeze({
  alerts: "kl_alerts",
  agent: "kl_agent_settings",
  agentOn: "kl_agent_enabled",
});

// BASE של ה-API (ללא UI; שנה אם צריך)
export const API_BASE = "http://127.0.0.1:5000/api";

// ===== DOM helpers =====
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ===== Formatting =====
export const fmtJSON = (obj) => JSON.stringify(obj, null, 2);

export function normTime(t) {
  if (!t) return null;
  const [h, m] = String(t).replace("%3A", ":").split(":");
  return `${String(h ?? "").padStart(2, "0")}:${String(m ?? "0").padStart(2, "0")}`;
}

// ===== Toast =====
let toastTimer = null;
export function toast(msg, ok = true) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  t.style.background = ok ? "#111827" : "#991b1b";
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

// ===== Misc =====
export function parseBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  return s === "true" || s === "1" || s === "on";
}

export function cssEscape(s) {
  return String(s).replace(/["\\[\\].:#]/g, "\\$&");
}
