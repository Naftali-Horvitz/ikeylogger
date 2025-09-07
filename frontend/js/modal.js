// ===== Simple Modal (dialog) =====
export function openModal({ title, content }) {
  closeModal(); // ensure single instance

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  const modal = document.createElement("div");
  modal.className = "modal";

  const header = document.createElement("div");
  header.className = "modal-header";

  const h = document.createElement("div");
  h.className = "modal-title";
  h.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.className = "btn-close";
  closeBtn.textContent = "סגור";
  closeBtn.addEventListener("click", closeModal);

  header.appendChild(h);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "modal-body";
  body.textContent = content ?? "";

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "btn-copy";
  copyBtn.textContent = "העתק תוכן";
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(content ?? ""); }
    catch { /* ignore */ }
  });

  actions.appendChild(copyBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(actions);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

export function closeModal() {
  const el = document.querySelector(".modal-overlay");
  if (el) el.remove();
}
