// frontend/js/warnings.js
import { $ } from "./utils.js";
import { api } from "./api.js";
import { openModal } from "./modal.js"; // ← חדש: שימוש במודל

/** מצפה לאובייקט בסגנון:
 * {
 *   "pcA": [ { "2025-09-08": { "18:27": { "חלון": "טקסט" , ... } } }, ... ],
 *   "pcB": [ ... ]
 * }
 * ומרנדר ל-<tbody id="warning-list">
 */
function flattenWarnings(obj) {
  const rows = [];
  if (!obj || typeof obj !== "object") return rows;

  for (const [machine, daysList] of Object.entries(obj)) {
    if (!Array.isArray(daysList)) continue;

    for (const dayEntry of daysList) {
      const [date, timeObj] = Object.entries(dayEntry || {})[0] || [];
      if (!date || !timeObj || typeof timeObj !== "object") continue;

      for (const [time, windowsObj] of Object.entries(timeObj)) {
        if (!windowsObj || typeof windowsObj !== "object") continue;

        for (const [win, text] of Object.entries(windowsObj)) {
          rows.push({
            machine,
            date,
            time,
            window: win,
            text: String(text ?? ""),
          });
        }
      }
    }
  }

  // מיון: תאריך/שעה יורד
  rows.sort((a, b) => {
    const ka = `${a.date} ${a.time}`;
    const kb = `${b.date} ${b.time}`;
    return kb.localeCompare(ka);
  });

  return rows;
}

export function renderWarning(warnObj) {
  const tbody = $("#warning-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  const rows = flattenWarnings(warnObj);
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "cell-empty";
    td.textContent = "אין אזהרות להצגה.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((r) => {
    const tr = document.createElement("tr");

    const tdMachine = document.createElement("td");
    tdMachine.textContent = r.machine || "—";

    const tdDate = document.createElement("td");
    tdDate.textContent = r.date || "—";

    const tdTime = document.createElement("td");
    tdTime.textContent = r.time || "—";

    const tdWin = document.createElement("td");
    tdWin.textContent = r.window || "—";

    const tdText = document.createElement("td");
    tdText.className = "cell-text";               // ← לזיהוי ב-delegate
    tdText.textContent = r.text || "—";
    tdText.dataset.machine = r.machine || "";
    tdText.dataset.date = r.date || "";
    tdText.dataset.time = r.time || "";
    tdText.dataset.win = r.window || "";
    tdText.dataset.full = r.text || "";
    tdText.title = r.text ? "לחץ להצגת מלוא התוכן" : "";

    tr.appendChild(tdMachine);
    tr.appendChild(tdDate);
    tr.appendChild(tdTime);
    tr.appendChild(tdWin);
    tr.appendChild(tdText);

    tbody.appendChild(tr);
  });

  // דיאלוג בלחיצה על תא הטקסט (delegate, פעם אחת בלבד)
  if (!tbody.__boundDialog) {
    tbody.addEventListener("click", (e) => {
      const td = e.target.closest("td.cell-text");
      if (!td) return;
      const title = `${td.dataset.machine} • ${td.dataset.date} ${td.dataset.time} • ${td.dataset.win}`;
      openModal({ title, content: td.dataset.full || "" });
    });
    tbody.__boundDialog = true;
  }
}

/** אופציונלי: טעינה אוטומטית מהשרת אם יש לך endpoint מתאים.
 * מוסיף תמיכה גמישה – ינסה כמה שמות נפוצים אם קיימים ב-api.
 */
export async function loadWarningsFromServer() {
  let data = null;
  try {
    if (typeof api.getAlertsFind === "function") {
      data = await api.getAlertsFind();
    } else if (typeof api.getWarnings === "function") {
      data = await api.getWarnings();
    } else if (typeof api.getAlertsWarnings === "function") {
      data = await api.getAlertsWarnings();
    } else {
      // אין endpoint – פשוט לא נטעין
      return;
    }
    renderWarning(data);
  } catch (e) {
    console.warn("loadWarningsFromServer failed:", e);
    renderWarning({});
  }
}
