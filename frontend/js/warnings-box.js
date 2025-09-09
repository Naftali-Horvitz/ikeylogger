import { $ } from "./utils.js";
import { api } from "./api.js";

/* ===== עזרי זמן/טקסט ===== */
function toISOFromDayTime(day, hhmm) {
  const iso = /^\d{2}:\d{2}$/.test(hhmm) ? `${day}T${hhmm}:00` : `${day}T00:00:00`;
  return { iso, ts: Date.parse(iso) || Date.now() };
}

/* ממיר את המבנה:
   { machine: [ { "YYYY-MM-DD": { "HH:MM": { win: text } } }, ... ], ... }
   -> לרשימה אחידה של פריטים: {id,machine,win,text,time}
*/
function parseMaybeTwice(s) {
  try { let x = JSON.parse(s); if (typeof x === "string") { x = JSON.parse(x); } return x; }
  catch { return null; }
}
function flattenWarningsPayload(payload) {
  if (typeof payload === "string") { const p = parseMaybeTwice(payload); if (!p) return []; payload = p; }
  const out = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return out;

  for (const [machine, arr] of Object.entries(payload)) {
    if (!Array.isArray(arr)) continue;
    for (const part of arr) {
      let obj = part;
      if (typeof obj === "string") obj = parseMaybeTwice(obj);
      if (!obj || typeof obj !== "object") continue;

      for (const [day, hoursMap] of Object.entries(obj)) {
        if (!hoursMap || typeof hoursMap !== "object") continue;

        for (const [hhmm, winObj] of Object.entries(hoursMap)) {
          if (!winObj || typeof winObj !== "object") continue;

          for (const [win, val] of Object.entries(winObj)) {
            const text = (val == null) ? "" : (typeof val === "string" ? val : (() => { try { return JSON.stringify(val); } catch { return String(val); } })());
            const { iso, ts } = toISOFromDayTime(day, hhmm);
            out.push({
              id: `${machine}|${day}|${hhmm}|${win}`,
              machine, win, text, time: ts, iso
            });
          }
        }
      }
    }
  }
  return out;
}

function top10Newest(arr) {
  const copy = Array.isArray(arr) ? [...arr] : [];
  copy.sort((a, b) => (b.time || 0) - (a.time || 0));
  return copy.slice(0, 10);
}

/* ===== DOM: מצייר רק בתוך #warnings-box ===== */
function ensureDom() {
  const box = $("#warnings-box");
  if (!box) return null;

  let list = box.querySelector(".warnings-list");
  let status = box.querySelector(".warnings-status");

  if (!list) {
    box.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "wb-wrap";
    wrap.innerHTML = `
      <div class="warnings-status"></div>
      <div class="warnings-list"></div>
    `;
    box.appendChild(wrap);
    list = box.querySelector(".warnings-list");
    status = box.querySelector(".warnings-status");
  }
  return { box, list, status };
}

function renderList(items, listEl) {
  listEl.innerHTML = "";
  if (!items?.length) {
    const empty = document.createElement("div");
    empty.className = "wb-empty";
    empty.textContent = "אין אזהרות חדשות.";
    listEl.appendChild(empty);
    return;
  }

  for (const it of items) {
    const card = document.createElement("section");
    card.className = "wb-card";

    const hdr = document.createElement("div");
    hdr.className = "wb-hdr";

    const machineEl = document.createElement("div");
    machineEl.className = "wb-machine";
    machineEl.textContent = it.machine || "מחשב";

    const winEl = document.createElement("div");
    winEl.className = "wb-win";
    winEl.textContent = it.win || "חלון";

    hdr.appendChild(machineEl);
    hdr.appendChild(winEl);

    const body = document.createElement("pre");
    body.className = "wb-text";
    body.textContent = it.text || "";

    card.appendChild(hdr);
    card.appendChild(body);
    listEl.appendChild(card);
  }
}

/* ===== Polling ===== */
let pollingTimer = null;
let lastSig = "";

async function tickOnce() {
  const dom = ensureDom();
  if (!dom) return; // אין עוגן ב-HTML, לא מציירים כלום
  const { list, status } = dom;
  try {
    status.textContent = "טוען…";
    const raw = await api.getWarnings();
    const flat = flattenWarningsPayload(raw);
    const top = top10Newest(flat);

    // חתימה כדי לא לרנדר אם אין שינוי
    const sig = JSON.stringify(top.map(x => [x.id, x.time]));
    if (sig !== lastSig) {
      renderList(top, list);
      lastSig = sig;
    }
    status.textContent = "";
  } catch (e) {
    console.error(e);
    status.textContent = "שגיאה בטעינת אזהרות.";
  }
}

export function startWarningsPolling(intervalMs = 10000) {
  clearInterval(pollingTimer);
  tickOnce();
  pollingTimer = setInterval(tickOnce, intervalMs);
}
export function stopWarningsPolling() {
  clearInterval(pollingTimer);
  pollingTimer = null;
}

/* ===== CSS מצומצם וסגור לקונטיינר ===== */
const style = document.createElement("style");
style.textContent = `
  #warnings-box .wb-wrap{display:flex;flex-direction:column;gap:10px}
  #warnings-box .warnings-status{color:#6b7280;font-size:.9rem}
  #warnings-box .warnings-list{display:flex;flex-direction:column;gap:10px}
  #warnings-box .wb-empty{padding:16px;text-align:center;color:#6b7280;background:#f9fafb;border:1px solid #eef2f7;border-radius:12px}
  #warnings-box .wb-card{background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
  #warnings-box .wb-hdr{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px}
  #warnings-box .wb-machine{font-weight:700}
  #warnings-box .wb-win{color:#111827}
  #warnings-box .wb-text{margin:0;white-space:pre-wrap;word-break:break-word;color:#374151;font-family:inherit;font-size:0.95rem;line-height:1.4}
`;
document.head.appendChild(style);
