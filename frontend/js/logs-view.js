
import { showPage } from "./navigation.js";  // ← הוסף שורה זו
import { $, $$, normTime, toast, cssEscape } from "./utils.js";
import { api } from "./api.js";
import { openModal } from "./modal.js";

/** ========== מבנה נתונים ==========
 dayObj = {
   day: "YYYY-MM-DD" | "לא ידוע",
   times: string[],                  // "HH:MM" asc
   windows: string[],                // sorted (volume/alpha)
   cells: Map("win||time" -> string),
   windowTotals: Map("win" -> number)
 }
====================================*/

function detectDateForItem(obj) {
  if (!obj || typeof obj !== "object") return "לא ידוע";
  return obj.date || obj.Date || obj["תאריך"] || obj["date_str"] || obj["day"] || "לא ידוע";
}
function looksHourlyMap(o) {
  if (!o || typeof o !== "object") return false;
  const keys = Object.keys(o);
  return keys.length && keys.every(k => /^\d{1,2}:\d{2}$/.test(k) && typeof o[k] === "object");
}
function extractHoursMap(itemObj) {
  if (!itemObj || typeof itemObj !== "object") return null;
  if (looksHourlyMap(itemObj)) return itemObj;
  const candidates = ["keystrokes", "data", "logs", "entries", "payload", "record"];
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
          const add = val ? val.length : 0;
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

    // click → modal (delegate, once per render)
    tbody.addEventListener("click", (e) => {
      const td = e.target.closest("td");
      if (!td || !td.dataset || !("full" in td.dataset)) return;
      const full = td.dataset.full || "";
      if (!full) return;
      const title = `יום ${td.dataset.day} • שעה ${td.dataset.time} • חלון ${td.dataset.win}`;
      openModal({ title, content: full });
    }, { once: true });
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

function renderChips(dayMatrices, container) {
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
      const card = container.querySelector(`[data-day-card="${cssEscape(d.day)}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
    chips.appendChild(chip);
  });
  return chips;
}

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
    const arr = await api.getKeystrokes({ machine, date, start, end });
    if (!arr || !arr.length) {
      status.textContent = "לא נמצאו נתונים לטווח שבחרת.";
      return;
    }

    const items = arr.map(normalizeRawItem);
    const dayMatrices = buildDayMatrix(items, "volume"); // or "alpha"

    // Chips
    container.appendChild(renderChips(dayMatrices, container));

    // Grid
    const grid = document.createElement("div");
    grid.className = "days-grid";
    container.appendChild(grid);

    dayMatrices.forEach((d) => renderSingleDay(d, grid));

    status.textContent = `נמצאו ${arr.length} קבצים.`;
  } catch (err) {
    console.error(err);
    status.textContent = "שגיאה בשליפת נתונים מהשרת.";
  }
}

// ===== Machines (UI) =====
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
