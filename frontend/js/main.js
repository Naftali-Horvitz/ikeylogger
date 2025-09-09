import { $, toast } from "./utils.js";
import { createAlert, loadAlertsFromServer } from "./alerts.js";
import { fetchAndRenderWarnings } from "./warnings.js";
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

/** גשר: מקשר את כפתורי ה־Header החדשים */
function bindHeaderNavBridge() {
  const links = document.querySelectorAll(".topnav [data-page]");
  if (!links.length) return;

  links.forEach(b => b.removeAttribute("aria-current"));

  links.forEach((el) => {
    if (el.__bound) return;
    el.__bound = true;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      const page = el.getAttribute("data-page");
      if (typeof showPage === "function") {
        showPage(page);
      }

      document.querySelectorAll(".topnav [data-page]").forEach((b) => b.removeAttribute("aria-current"));
      el.setAttribute("aria-current", "page");

      document.querySelectorAll(".nav-links [data-page]").forEach((a) => {
        a.classList.toggle("active", a.getAttribute("data-page") === page);
      });

      // טעינת נתונים לפי עמוד
      if (page === "alerts") {
        // טען גם התראות וגם אזהרות
        Promise.all([loadAlertsFromServer(), fetchAndRenderWarnings()]).catch(() => {
          toast("שגיאה בטעינת נתונים", "error");
        });
      }
    });
  });

  const currentPageEl = document.querySelector('.page:not(.hidden)') || document.querySelector('#page-home');
  const currentPageId = currentPageEl?.id?.replace(/^page-/, "") || "home";
  const match = Array.from(links).find(b => b.getAttribute("data-page") === currentPageId);
  (match || links[0])?.setAttribute("aria-current", "page");
}

document.addEventListener("DOMContentLoaded", async () => {
  // ניווט ישן
  bindNav();

  // מחשבים
  $("#btn-refresh-machines")?.addEventListener("click", refreshMachines);

  // יצירת התראה חדשה
  $("#alert-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#alert-title")?.value.trim();
    const keywords = $("#alert-keywords")?.value.trim();
    if (!title) return;
    await createAlert(title, keywords);
    e.target.reset();

    // אחרי יצירה – רענון רשימות
    await loadAlertsFromServer();
    await fetchAndRenderWarnings();
  });

  // סוכן
  await initAgent();
  const toggleBtn = $("#btn-toggle-agent");
  if (toggleBtn) {
    setAgentIndicator(toggleBtn.dataset.on === "1");
    toggleBtn.addEventListener("click", () => {
      setTimeout(() => setAgentIndicator(toggleBtn.dataset.on === "1"), 0);
    });
  }

  // לוגים
  $("#btn-fetch-logs")?.addEventListener("click", fetchLogsAndRender);

  // init
  try {
    await loadAlertsFromServer();
    await fetchAndRenderWarnings();
  } catch {
    // fallback
  }
  refreshMachines();

  // דף ברירת מחדל
  showPage("home");

  // גשר להדר
  bindHeaderNavBridge();
});
