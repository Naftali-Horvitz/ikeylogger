// js/warnings.js
import { api } from "./api.js";

// עזר לאסקפינג
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// מנסה לפרש מחרוזת ל-JSON ומחזיר null אם נכשל
function parseMaybeJSON(x) {
  if (typeof x === "string") { try { return JSON.parse(x); } catch { return null; } }
  return (x && typeof x === "object") ? x : null;
}

/** ממיר אובייקט nested לשורות שטוחות [{machine,date,time,window,text}] */
function flattenRows(data) {
  const rows = [];
  if (!data || typeof data !== "object") return rows;

  for (const [machine, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const obj = parseMaybeJSON(item) ?? item;
      if (!obj || typeof obj !== "object") continue;

      for (const [date, timesObj0] of Object.entries(obj)) {
        const timesObj = parseMaybeJSON(timesObj0) ?? timesObj0;
        if (!timesObj || typeof timesObj !== "object") continue;

        for (const [time, windowsObj0] of Object.entries(timesObj)) {
          const windowsObj = parseMaybeJSON(windowsObj0) ?? windowsObj0;
          if (!windowsObj || typeof windowsObj !== "object") continue;

          for (const [win, text] of Object.entries(windowsObj)) {
            rows.push({ machine, date, time, window: win, text: String(text ?? "") });
          }
        }
      }
    }
  }

  // מיון: חדש→ישן לפי תאריך, זמן עולה, ואז לפי מכונה/חלון
  rows.sort((a, b) => {
    const d = String(b.date).localeCompare(String(a.date));
    if (d) return d;
    const [ah, am] = String(a.time).split(":").map(Number);
    const [bh, bm] = String(b.time).split(":").map(Number);
    return (ah - bh) || (am - bm) ||
           String(a.machine).localeCompare(String(b.machine), "he") ||
           String(a.window).localeCompare(String(b.window), "he");
  });

  return rows;
}

// מודאל פשוט
function ensureModal() {
  let modal = document.getElementById("log-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "log-modal";
  modal.innerHTML = `
    <div class="wm-overlay" role="button" aria-label="סגור"></div>
    <div class="wm-card" role="dialog" aria-modal="true" aria-labelledby="wm-title">
      <div class="wm-header">
        <div id="wm-title" class="wm-title">תוכן</div>
        <button class="wm-close" type="button">סגור</button>
      </div>
      <div class="wm-body"><pre id="wm-text"></pre></div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => modal.classList.remove("show");
  modal.querySelector(".wm-overlay").addEventListener("click", close);
  modal.querySelector(".wm-close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  return modal;
}

function openModal(text, title = "תוכן") {
  const modal = ensureModal();
  modal.querySelector("#wm-text").textContent = text ?? "";
  modal.querySelector("#wm-title").textContent = title;
  modal.classList.add("show");
}

/** מציג טבלה ב־#warning-list */
export function renderWarningsTable(serverData) {
  const container = document.getElementById("warning-list");
  if (!container) return;

  container.classList.remove("alerts-list"); // למקרה שיש גריד כרטיסים
  container.innerHTML = "";

  const rows = flattenRows(serverData);
  if (!rows.length) {
    container.innerHTML = '<div class="muted">אין נתונים להצגה.</div>';
    return;
  }

  const table = document.createElement("table");
  table.className = "logs-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>מחשב</th>
        <th>תאריך</th>
        <th>שעה</th>
        <th>חלון</th>
        <th>טקסט</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${esc(r.machine)}</td>
      <td>${esc(r.date)}</td>
      <td>${esc(r.time)}</td>
      <td>${esc(r.window)}</td>
      <td class="wm-cell" style="cursor:pointer;white-space:pre-wrap">${esc(r.text)}</td>
    `;
    tr.querySelector(".wm-cell").addEventListener("click", () => {
      openModal(r.text, `מחשב: ${r.machine} • ${r.date} ${r.time} • חלון: ${r.window}`);
    });
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

/** שליפה מהשרת ואז רינדור */
export async function fetchAndRenderWarnings() {
  try {
    const data = await api.getWarnings(); // ראה סעיף 2
    renderWarningsTable(data);
  } catch (e) {
    console.error(e);
    const container = document.getElementById("warning-list");
    if (container) container.innerHTML = '<div class="muted">שגיאה בטעינת נתונים.</div>';
  }
}
