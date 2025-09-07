import { $, parseBool, toast } from "./utils.js";
import { api } from "./api.js";

// ===== Agent Toggle UI =====
function setToggleUI(isOn) {
  const btn = $("#btn-toggle-agent");
  btn.textContent = isOn ? "עצור האזנה" : "התחל האזנה";
  btn.classList.toggle("btn-toggle", isOn);
  btn.dataset.on = isOn ? "1" : "0";
}

export async function initAgent() {
  try {
    const s = await api.getSettings();
    $("#agent-url").value = s?.url ?? "";
    $("#agent-key").value = s?.key_encryptor ?? "";
    $("#agent-wait-sec").value = s?.wait_time ?? "";
    setToggleUI(parseBool(s?.status_listen));
  } catch {
    $("#agent-url").value = "";
    $("#agent-key").value = "";
    $("#agent-wait-sec").value = "";
    setToggleUI(false);
  }

  $("#btn-save-url").addEventListener("click", async () => {
    const url = $("#agent-url").value.trim();
    try { await api.updateSettings({ url }); toast("url נשמר"); }
    catch { toast("שגיאה בשמירת url", false); }
  });

  $("#btn-save-key").addEventListener("click", async () => {
    const key_encryptor = $("#agent-key").value;
    try { await api.updateSettings({ key_encryptor }); toast("key_encryptor נשמר"); }
    catch { toast("שגיאה בשמירת key_encryptor", false); }
  });

  $("#btn-save-wait").addEventListener("click", async () => {
    const n = Number($("#agent-wait-sec").value);
    const wait_time = Number.isFinite(n) ? n : null;
    try { await api.updateSettings({ wait_time }); toast("wait_time נשמר"); }
    catch { toast("שגיאה בשמירת wait_time", false); }
  });

  $("#btn-toggle-agent").addEventListener("click", async () => {
    const isOn = $("#btn-toggle-agent").dataset.on === "1";
    const next = !isOn;
    setToggleUI(next);
    try { await api.updateSettings({ status_listen: next }); toast(next ? "האזנה הופעלה" : "האזנה נעצרה"); }
    catch { setToggleUI(isOn); toast("שגיאה בעדכון status_listen", false); }
  });
}
