import { $, toast } from "./utils.js";
import { createAlert, renderAlerts, loadAlertsFromServer } from "./alerts.js";
import { initAgent } from "./agent.js";
import { fetchLogsAndRender, refreshMachines } from "./logs-view.js";
import { bindNav, showPage } from "./navigation.js";

/** חיווי מצב הסוכן בפיל העליון */
function setAgentIndicator(isOn) {
  const pill = $("#agent-indicator");
  if (!pill) return;
  pill.textContent = isOn ? "פועל" : "כבוי";
  pill.classList.toggle("off", !isOn);
  pill.classList.toggle("on", isOn);
}

/** גשר: מקשר את כפתורי ה-Header החדשים (buttons.tablink עם data-page)
 *  למנגנון הניווט הקיים שלך (showPage + active/aria-current).
 */
function bindHeaderNavBridge() {
  const links = document.querySelectorAll(".topnav [data-page]");
  if (!links.length) return;

  // ננקה מצבי active/aria-current קיימים
  links.forEach(b => b.removeAttribute("aria-current"));

  links.forEach((el) => {
    // כדי לא להיקשר פעמיים אם הפונקציה תיקרא שוב:
    if (el.__bound) return;
    el.__bound = true;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      const page = el.getAttribute("data-page");
      if (typeof showPage === "function") {
        showPage(page);
      }

      // עדכון מצב פעיל בהדר (aria-current) + תאימות לישן (.active)
      document.querySelectorAll(".topnav [data-page]").forEach((b) => b.removeAttribute("aria-current"));
      el.setAttribute("aria-current", "page");

      document.querySelectorAll(".nav-links [data-page]").forEach((a) => {
        a.classList.toggle("active", a.getAttribute("data-page") === page);
      });

      // טעינת נתונים לפי עמוד (Lazy-ish)
      if (page === "alerts") {
        // נטען מחדש מהשרת כדי לשקף מצב עדכני
        loadAlertsFromServer().catch(() => {/* הטוסט כבר מטופל בפנים */});
      }
    });
  });

  // סימון לשונית התחלתית לפי הדף הפעיל כרגע:
  const currentPageEl = document.querySelector('.page:not(.hidden)') || document.querySelector('#page-home');
  const currentPageId = currentPageEl?.id?.replace(/^page-/, "") || "home";
  const match = Array.from(links).find(b => b.getAttribute("data-page") === currentPageId);
  (match || links[0])?.setAttribute("aria-current", "page");
}

document.addEventListener("DOMContentLoaded", async () => {
  // ניווט ישן (קישורי <a> עם data-page)
  bindNav();

  // מחשבים
  $("#btn-refresh-machines")?.addEventListener("click", refreshMachines);

  // התראות — יצירה
  $("#alert-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#alert-title")?.value.trim();
    const keywords = $("#alert-keywords")?.value.trim();
    if (!title) return;
    await createAlert(title, keywords);
    e.target.reset();
  });

  // סוכן
  await initAgent();
  // אחרי initAgent נוכל לעדכן את החיווי לפי כפתור ההחלפה
  const toggleBtn = $("#btn-toggle-agent");
  if (toggleBtn) {
    setAgentIndicator(toggleBtn.dataset.on === "1");
    // נעדכן גם בלחיצה (אחרי שה-agent.js משנה את המצב)
    toggleBtn.addEventListener("click", () => {
      // הדום מתעדכן מיידית ב-agent.js, כאן רק מסנכרנים את הפיל
      setTimeout(() => setAgentIndicator(toggleBtn.dataset.on === "1"), 0);
    });
  }

  // לוגים
  $("#btn-fetch-logs")?.addEventListener("click", fetchLogsAndRender);

  // init
  try {
    await loadAlertsFromServer(); // טען מהשרת ונקה את הרשימה
  } catch {
    // אם השרת לא זמין, נציג מה-LocalStorage
    renderAlerts();
  }
  refreshMachines();

  // דף ברירת מחדל
  showPage("home");

  // גשר להדר החדש (buttons עם data-page)
  bindHeaderNavBridge();
});
