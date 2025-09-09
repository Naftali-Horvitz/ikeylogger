// frontend/js/alerts.js
import { $, toast } from "./utils.js";
import { api } from "./api.js";

/** ---- עזר: נירמול אלרט בודד (יכול להגיע כמחרוזת JSON, אובייקט, או טקסט חופשי) ---- */
function normalizeAlert(item) {
  try {
    if (typeof item === "string") {
      // נסה JSON
      const maybe = JSON.parse(item);
      if (maybe && typeof maybe === "object") {
        return {
          id: maybe.id ?? null,
          title: maybe.title ?? String(item),
          keywords: Array.isArray(maybe.keywords) ? maybe.keywords : [],
          createdAt: maybe.createdAt ?? null,
        };
      }
      // לא JSON – טקסט חופשי
      return { id: null, title: item, keywords: [], createdAt: null };
    }
    if (item && typeof item === "object") {
      return {
        id: item.id ?? null,
        title: item.title ?? "",
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        createdAt: item.createdAt ?? null,
      };
    }
    return { id: null, title: String(item), keywords: [], createdAt: null };
  } catch {
    return { id: null, title: String(item), keywords: [], createdAt: null };
  }
}

/** ---- רינדור שורת התראה לטבלה ---- */
function renderAlertRow(a) {
  const tr = document.createElement("tr");

  // עמודה: מזהה קצר (אופציונלי)
  const tdId = document.createElement("td");
  tdId.innerHTML = a.id ? `<span class="badge-id">${String(a.id).slice(0, 8)}…</span>` : "";
  tr.appendChild(tdId);

  // עמודה: כותרת
  const tdTitle = document.createElement("td");
  tdTitle.textContent = a.title || "—";
  tr.appendChild(tdTitle);

  // עמודה: מילות מפתח (צ׳יפים קומפקטיים)
  const tdKeywords = document.createElement("td");
  const kws = Array.isArray(a.keywords) ? a.keywords.filter(Boolean) : [];
  if (!kws.length) {
    tdKeywords.innerHTML = `<span class="cell-empty">—</span>`;
  } else {
    const wrap = document.createElement("div");
    wrap.className = "kw-row";
    kws.forEach((k) => {
      const chip = document.createElement("span");
      chip.className = "kw";
      chip.innerHTML = `${k}<span class="x">#</span>`;
      wrap.appendChild(chip);
    });
    tdKeywords.appendChild(wrap);
  }
  tr.appendChild(tdKeywords);
  // עמודה: פעולות (מחיקה)
  const tdActions = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "row-actions";

  const delBtn = document.createElement("button");
  delBtn.className = "btn-danger";
  delBtn.textContent = "מחק";
  delBtn.addEventListener("click", async () => {
    if (!a.id) {
      toast("לא ניתן למחוק התראה ללא מזהה", false);
      return;
    }
    try {
      await api.deleteNotification(a.id);
      toast("התראה נמחקה");
      await loadAlertsFromServer(); // רענון הרשימה
    } catch (e) {
      console.warn(e);
      toast("מחיקה בשרת נכשלה", false);
    }
  });

  actions.appendChild(delBtn);
  tdActions.appendChild(actions);
  tr.appendChild(tdActions);

  return tr;
}

/** ---- רינדור מלא לרשימת ההתראות (לטבלת #alerts-list) ---- */
export function renderAlerts(alertsArr) {
  const tbody = $("#alerts-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  const alerts = (alertsArr || []).map(normalizeAlert);

  if (!alerts.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "cell-empty";
    td.textContent = "אין התראות — צור חדשה למעלה.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  // מיון: אחרון נוצר → ראשון
  alerts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  alerts.forEach((a) => tbody.appendChild(renderAlertRow(a)));
}

/** ---- טעינה מהשרת + רינדור ---- */
export async function loadAlertsFromServer() {
  try {
    const raw = await api.getNotifications(); // מצופה להחזיר מערך מגוון (strings/json/objects)
    renderAlerts(raw);
  } catch (e) {
    console.warn(e);
    toast("שגיאה בטעינת התראות מהשרת", false);
    // עדיין ננקה את הטבלה כדי לא להציג שרידים
    renderAlerts([]);
  }
}

/** ---- יצירת התראה חדשה ---- */
export async function createAlert(title, keywordsCsv) {
  const id = (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now());
  const keywords = (keywordsCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = { id, title, keywords, createdAt: Date.now() };

  try {
    await api.createNotification(payload);
    toast("התראה נוצרה");
    await loadAlertsFromServer(); // רענון הטבלה
  } catch (e) {
    console.warn(e);
    toast("יצירת התראה בשרת נכשלה", false);
  }
}
