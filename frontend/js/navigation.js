import { $, $$ } from "./utils.js";

export function showPage(id) {
  $$(".page").forEach((p) => p.classList.add("hidden"));
  $(`#page-${id}`).classList.remove("hidden");
  $$(".nav-links a").forEach((a) => a.classList.toggle("active", a.dataset.page === id));
}

export function bindNav() {
  $$(".nav-links a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(a.dataset.page);
    });
  });
}
