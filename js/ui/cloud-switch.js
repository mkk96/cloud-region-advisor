/** Header switch between Google Cloud / AWS / Azure. */

import { $, esc, toast } from "./dom.js";
import { CLOUD_LIST } from "../clouds/index.js";
import { state, actions, currentCloud } from "../state/store.js";

export function initCloudSwitch() {
  $("#cloudSwitch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cloud]");
    if (!b) return;
    if (state.testing) return toast("Wait for the latency test to finish first");
    if (actions.setCloud(b.dataset.cloud)) {
      toast(`${currentCloud().name} has no region in that country — data residency reset`);
    }
  });
}

export function renderCloudSwitch() {
  const el = $("#cloudSwitch");
  el.classList.toggle("locked", state.testing);
  el.innerHTML = CLOUD_LIST.map((c) => {
    const on = c.id === state.cloud;
    return `<button type="button" role="radio" aria-checked="${on}" class="${on ? "active" : ""}" data-cloud="${c.id}">
      ${esc(c.name)}<span class="n">${c.regions.length}</span></button>`;
  }).join("");
}
