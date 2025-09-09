import { showPage } from "./navigation.js";
import { $, $$, normTime, toast, cssEscape } from "./utils.js";
import { api } from "./api.js";
import { openModal } from "./modal.js";

/** ========== מבנה נתונים פנימי (לשימוש ה־UI) ==========
 dayObj = {
   day: "YYYY-MM-DD" | "לא ידוע",
   times: string[],                  // "HH:MM" asc
   windows: string[],                // sorted (volume/alpha)
   cells: Map("win||time" -> string),
   windowTotals: Map("win" -> number)
 }
========================================================*/

/* ---------- זיהוי/נירמול פריטים ---------- */
function detectDateForItem(obj) {
  if (!obj || typeof obj !== "object") return "לא ידוע";
  return obj.date || obj.Date || obj["תאריך"] || obj["date_str"] || obj["day"] || "לא ידוע";
}
function looksHourlyMap(o) {
  if (!o || typeof o !== "object") return false;
  const keys = Object.keys(o);
  return keys.length && keys.every(k => /^\d{1,2}:\d{2}$/.test(k) && typeof o[k] === "object" && !Array.isArray(o[k]));
}
function extractHoursMap(itemObj) {
  if (!itemObj || typeof itemObj !== "object") return null;
  if (looksHourlyMap(itemObj)) return itemObj;
  const candidates = ["keystrokes", "data", "logs", "entries", "payload", "record", "times"];
  for (const k of candidates) if (itemObj[k] && looksHourlyMap(itemObj[k])) return itemObj[k];
  for (const v of Object.values(itemObj)) if (looksHourlyMap(v)) return v;
  return null;
}
function normalizeRawItem(raw) {
  let obj = raw;
  if (typeof raw === "string") { try { obj = JSON.parse(raw); } catch { obj = { value: raw }; } }
  if (!obj || typeof obj !== "object") obj = { value: String(raw) };
  const day = detectDateForItem(obj);
  const hoursMap = extractHoursMap(obj);
  return { day, hoursMap, raw: obj };
}

/* ---------- עוזרים לקליטת מבנה ה־API החדש ---------- */
function isPlainObject(o) { return o && typeof o === "object" && !Array.isArray(o); }
function isHoursMap(o) {
  if (!isPlainObject(o)) return false;
  const ks = Object.keys(o);
  return ks.length > 0 && ks.every(k => /^\d{1,2}:\d{2}$/.test(k) && isPlainObject(o[k]));
}
function parseMaybeTwice(s) {
  try {
    let x = JSON.parse(s);
    if (typeof x === "string") {
      try { x = JSON.parse(x); } catch {}
    }
    return x;
  } catch { return null; }
}
function mergeHoursMaps(target, src) {
  for (const [time, winObj] of Object.entries(src || {})) {
    if (!isPlainObject(winObj)) continue;
    if (!isPlainObject(target[time])) target[time] = {};
    const t = target[time];
    for (const [win, val] of Object.entries(winObj)) {
      if (t[win] === undefined) {
        t[win] = val;
      } else {
        const prev = t[win];
        if (typeof prev === "number" && typeof val === "number") {
          t[win] = prev + val;
        } else {
          const a = typeof prev === "string" ? prev : JSON.stringify(prev ?? "");
          const b = typeof val  === "string" ? val  : JSON.stringify(val  ?? "");
          t[win] = a && b ? a + "\n" + b : (a || b);
        }
      }
    }
  }
  return target;
}

/** ממיר תגובת ה-API לכלל items שה-UI מצפה לו.
 * תומך ב:
 * - מערך פריטים (מבנה ישן)
 * - אובייקט: יום -> (מפת שעות | מערך של מפות/מחרוזות JSON | {times: ...})
 */
function itemsFromApiPayload(payload) {
  if (Array.isArray(payload)) return payload.map(normalizeRawItem);
  if (!isPlainObject(payload)) return [];

  const items = [];
  for (const [day, value] of Object.entries(payload)) {
    let hoursMap = {};

    if (Array.isArray(value)) {
      // מערך של מפות שעות או מחרוזות JSON של מפות שעות
      for (const part of value) {
        let obj = part;
        if (typeof obj === "string") obj = parseMaybeTwice(obj);
        if (isHoursMap(obj)) mergeHoursMaps(hoursMap, obj);
      }
    } else if (isHoursMap(value)) {
      hoursMap = value;
    } else if (isPlainObject(value) && isHoursMap(value.times)) {
      hoursMap = value.times;
    }

    if (isHoursMap(hoursMap)) {
      items.push({ day, hoursMap, raw: { day, times: hoursMap } });
    }
  }
  return items;
}

/* ---------- עזרי תצוגה ---------- */
function stringifyCell(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}
function cellPreview(text, maxChars = 240) {
  if (!text) return "";
  const s = String(text);
  return s.length <= maxChars ? s : s.slice(0, maxChars).trimEnd() + "…";
}

/* ---------- בניית מטריצה יומית ---------- */
function buildDayMatrix(items, windowSortMode = "volume") {
  const byDay = new Map();

  items.forEach(({ day, hoursMap }) => {
    if (!hoursMap) return;
    if (!byDay.has(day)) {
      byDay.set(day, { times: new Set(), windows: new Set(), cells: new Map(), windowTotals: new Map() });
    }
    const bucket = byDay.get(day);

    for (const [timeRaw, winObj] of Object.entries(hoursMap)) {
      const time = normTime(timeRaw) || timeRaw;
      bucket.times.add(time);
      if (winObj && typeof winObj === "object") {
        for (const [win, text] of Object.entries(winObj)) {
          bucket.windows.add(win);
          const key = `${win}||${time}`;
          const val = stringifyCell(text);
          const prev = bucket.cells.get(key);
          bucket.cells.set(key, prev ? `${prev}\n${val}` : val);

          // אם הערך הוא מספר – זה נפח מהשרת; אחרת fallback לאורך הטקסט
          const add = (typeof text === "number") ? text : (val ? val.length : 0);
          bucket.windowTotals.set(win, (bucket.windowTotals.get(win) || 0) + add);
        }
      }
    }
  });

  const result = [];
  for (const [day, { times, windows, cells, windowTotals }] of byDay.entries()) {
    const timesSorted = Array.from(times).sort((a, b) => {
      const [ah, am] = String(a).split(":").map(Number);
      const [bh, bm] = String(b).split(":").map(Number);
      return (ah - bh) || (am - bm);
    });

    let windowsSorted = Array.from(windows);
    if (windowSortMode === "alpha") {
      windowsSorted.sort((a, b) => a.localeCompare(b, "he"));
    } else {
      windowsSorted.sort((a, b) => {
        const da = windowTotals.get(a) || 0;
        const db = windowTotals.get(b) || 0;
        return db - da || a.localeCompare(b, "he");
      });
    }

    result.push({ day, times: timesSorted, windows: windowsSorted, cells, windowTotals });
  }

  result.sort((a, b) => {
    const ax = a.day === "לא ידוע" ? "0000-00-00" : a.day;
    const bx = b.day === "לא ידוע" ? "0000-00-00" : b.day;
    return bx.localeCompare(ax);
  });

  return result;
}

/* ---------- CSV ---------- */
function dayToCSV(dayObj) {
  const esc = (s) => {
    const v = (s ?? "").toString().replace(/\r?\n/g, " ");
    return /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const header = ["חלון", ...dayObj.times].map(esc).join(",");
  const lines = [header];
  dayObj.windows.forEach(win => {
    const row = [esc(win)];
    dayObj.times.forEach(t => row.push(esc(dayObj.cells.get(`${win}||${t}`) || "")));
    lines.push(row.join(","));
  });
  return lines.join("\n");
}

/* ---------- רינדור כרטיס יום יחיד ---------- */
function renderSingleDay(dayObj, gridEl) {
  const card = document.createElement("section");
  card.className = "day-card";
  card.setAttribute("data-day-card", dayObj.day);

  // title
  const title = document.createElement("h3");
  title.textContent = `יום: ${dayObj.day}`;
  card.appendChild(title);

  // toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "day-toolbar";

  const search = document.createElement("input");
  search.className = "input";
  search.placeholder = "חיפוש בחלונות/תוכן...";
  toolbar.appendChild(search);

  const sortSel = document.createElement("select");
  sortSel.className = "select";
  sortSel.innerHTML = `
    <option value="volume">מיון חלונות: נפח הקלדה</option>
    <option value="alpha">מיון חלונות: אלפביתי</option>`;
  toolbar.appendChild(sortSel);

  const csvBtn = document.createElement("button");
  csvBtn.type = "button";
  csvBtn.className = "btn";
  csvBtn.textContent = "יצוא CSV";
  toolbar.appendChild(csvBtn);

  card.appendChild(toolbar);

  // table
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  const table = document.createElement("table");
  table.className = "day-table";
  wrap.appendChild(table);
  card.appendChild(wrap);
  gridEl.appendChild(card);

  const renderTable = () => {
    const q = search.value.trim().toLowerCase();
    const times = dayObj.times;
    const windows = (sortSel.value === "alpha")
      ? [...dayObj.windows].sort((a, b) => a.localeCompare(b, "he"))
      : [...dayObj.windows].sort((a, b) => {
          const da = dayObj.windowTotals.get(a) || 0;
          const db = dayObj.windowTotals.get(b) || 0;
          return db - da || a.localeCompare(b, "he");
        });

    table.innerHTML = "";

    // colgroup: fixed widths via CSS
    const colgroup = document.createElement("colgroup");
    const colWin = document.createElement("col"); colWin.className = "col-win"; colgroup.appendChild(colWin);
    times.forEach(() => { const c = document.createElement("col"); c.className = "col-time"; colgroup.appendChild(c); });
    table.appendChild(colgroup);

    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    const th0 = document.createElement("th"); th0.textContent = "חלון"; htr.appendChild(th0);
    times.forEach(t => { const th = document.createElement("th"); th.textContent = t; htr.appendChild(th); });
    thead.appendChild(htr);

    const tbody = document.createElement("tbody");
    let visibleRows = 0;

    windows.forEach(win => {
      if (q) {
        let hit = win.toLowerCase().includes(q);
        if (!hit) {
          for (const t of times) {
            const v = dayObj.cells.get(`${win}||${t}`) || "";
            if (v.toLowerCase().includes(q)) { hit = true; break; }
          }
        }
        if (!hit) return;
      }

      const tr = document.createElement("tr");
      const tdWin = document.createElement("td");
      tdWin.innerHTML = `<div>${win}</div><div class="muted">${(dayObj.windowTotals.get(win)||0).toLocaleString()} תווים</div>`;
      tr.appendChild(tdWin);

      times.forEach(t => {
        const full = dayObj.cells.get(`${win}||${t}`) || "";
        const td = document.createElement("td");
        td.dataset.full = full;
        td.dataset.day = dayObj.day;
        td.dataset.time = t;
        td.dataset.win = win;

        const span = document.createElement("div");
        span.className = "cell-preview";
        span.title = full ? "לחץ להצגת מלוא התוכן" : "";
        span.textContent = cellPreview(full);

        td.appendChild(span);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
      visibleRows++;
    });

    table.appendChild(thead);
    table.appendChild(tbody);

    if (visibleRows === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = times.length + 1;
      td.className = "muted";
      td.textContent = "אין תוצאות לחיפוש.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    // click → modal (delegate)
    function onCellClick(e) {
      const td = e.target.closest("td[data-full]");
      if (!td) return;
      const full = td.dataset.full || "";
      if (!full) return;
      const title = `יום ${td.dataset.day} • שעה ${td.dataset.time} • חלון ${td.dataset.win}`;
      openModal({ title, content: full });
    }
    if (!tbody.__bound) {
      tbody.addEventListener("click", onCellClick);
      tbody.__bound = true;
    }
  };

  csvBtn.addEventListener("click", () => {
    const csv = dayToCSV(dayObj);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keystrokes_${dayObj.day}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  search.addEventListener("input", renderTable);
  sortSel.addEventListener("change", renderTable);

  renderTable();
}

/* ---------- איחוד כל הימים לטבלה אחת ---------- */
function mergeAllDays(dayMatrices, windowSortMode = "volume") {
  const times = new Set();
  const windows = new Set();
  const cells = new Map();
  const windowTotals = new Map();

  for (const d of dayMatrices) {
    d.times.forEach(t => times.add(t));
    d.windows.forEach(w => windows.add(w));

    d.windows.forEach(w => {
      const add = d.windowTotals.get(w) || 0;
      windowTotals.set(w, (windowTotals.get(w) || 0) + add);
    });

    d.cells.forEach((val, key) => {
      const annotated = val ? `(${d.day}) ${val}` : `(${d.day})`;
      const prev = cells.get(key);
      cells.set(key, prev ? `${prev}\n${annotated}` : annotated);
    });
  }

  const timesSorted = Array.from(times).sort((a, b) => {
    const [ah, am] = String(a).split(":").map(Number);
    const [bh, bm] = String(b).split(":").map(Number);
    return (ah - bh) || (am - bm);
  });

  let windowsSorted = Array.from(windows);
  if (windowSortMode === "alpha") {
    windowsSorted.sort((a, b) => a.localeCompare(b, "he"));
  } else {
    windowsSorted.sort((a, b) => {
      const da = windowTotals.get(a) || 0;
      const db = windowTotals.get(b) || 0;
      return db - da || a.localeCompare(b, "he");
    });
  }

  return { day: "כל הימים", times: timesSorted, windows: windowsSorted, cells, windowTotals };
}

/* ---------- פס הימים (צ'יפים) עם קולבק בחירה ---------- */
function renderChips(dayMatrices, onSelectIndex) {
  const chips = document.createElement("div");
  chips.className = "days-chips";
  dayMatrices.forEach((d, idx) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "day-chip" + (idx === 0 ? " active" : "");
    chip.textContent = d.day;
    chip.addEventListener("click", () => {
      chips.querySelectorAll(".day-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      onSelectIndex(idx);
    });
    chips.appendChild(chip);
  });
  return chips;
}

/* ---------- זרימת הטעינה והתצוגה ---------- */
export async function fetchLogsAndRender() {
  const status = $("#logs-status");
  const container = $("#logs-results");
  status.textContent = "טוען...";
  container.innerHTML = "";

  const machine = $("#logs-machine").value;
  const date = $("#logs-date").value;
  const start = $("#logs-start").value;
  const end = $("#logs-end").value;

  try {
    const payload = await api.getKeystrokes({ machine, date, start, end });
    const items = itemsFromApiPayload(payload);
    if (!items || items.length === 0) {
      status.textContent = "לא נמצאו נתונים לטווח שבחרת.";
      return;
    }

    const dayMatrices = buildDayMatrix(items, "volume");
    status.textContent = "";

    // ברירת מחדל: טבלה אחת של היום הראשון
    let mode = "single";     // "single" | "all"
    let selectedIndex = 0;   // היום שנבחר

    // טופ־בר: צ'יפים + כפתור "הצג הכל"
    const topbar = document.createElement("div");
    topbar.className = "days-topbar";
    container.appendChild(topbar);

    const chips = renderChips(dayMatrices, (idx) => {
      selectedIndex = idx;
      if (mode === "single") renderView();
    });
    topbar.appendChild(chips);

    const showAllBtn = document.createElement("button");
    showAllBtn.type = "button";
    showAllBtn.className = "day-chip";
    showAllBtn.textContent = "הצג הכל";
    showAllBtn.style.marginInlineStart = "8px";
    topbar.appendChild(showAllBtn);

    const grid = document.createElement("div");
    grid.className = "days-grid";
    container.appendChild(grid);

    const renderView = () => {
      grid.innerHTML = "";
      if (mode === "all") {
        const merged = mergeAllDays(dayMatrices, "volume");
        renderSingleDay(merged, grid);
      } else {
        renderSingleDay(dayMatrices[selectedIndex], grid);
      }
    };

    showAllBtn.addEventListener("click", () => {
      mode = (mode === "single") ? "all" : "single";
      showAllBtn.className = "day-chip" + (mode !== "single"? " active" : "")
      showAllBtn.textContent = (mode === "single") ? "הצג הכל" : "חזור ליום הנבחר";
      renderView();
    });

    // רינדור ראשון
    renderView();

  } catch (err) {
    console.error(err);
    status.textContent = "שגיאה בשליפת נתונים מהשרת.";
  }
}

/* ---------- Machines (UI) ---------- */
export async function refreshMachines() {
  const strip = $("#machines-strip");
  const ddl = $("#logs-machine");
  strip.innerHTML = '<span class="muted">טוען...</span>';
  $("#machines-status").textContent = "";

  try {
    const list = await api.getMachines();
    strip.innerHTML = "";
    ddl.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
      strip.innerHTML = '<span class="muted">לא נמצאו מחשבים</span>';
      $("#machines-status").textContent = "אין מחשבים זמינים בתיקיית הלוגים.";
      return;
    }
    list.forEach((name) => {
      const btn = document.createElement("button");
      btn.className = "machine-chip";
      btn.textContent = name;
      btn.onclick = () => {
        $$(".machine-chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $("#logs-machine").value = name;
        showPage("logs");
        fetchLogsAndRender();
      };
      strip.appendChild(btn);

      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      ddl.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    strip.innerHTML = '<span class="muted">שגיאה בטעינת המחשבים</span>';
    $("#machines-status").textContent = "שגיאה בתקשורת לשרת.";
  }
}
