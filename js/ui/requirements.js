/** Step 3: data residency, priority sliders and acceptable downtime. */

import { $, esc } from "./dom.js";
import { DOWNTIME_OPTIONS } from "../core/config.js";
import { state, actions, currentCloud } from "../state/store.js";

const SLIDERS = [
  ["wLat", "lat"],
  ["wCost", "cost"],
  ["wCarbon", "carbon"],
];

export function initRequirements() {
  $("#residency").addEventListener("change", (e) => actions.setResidency(e.target.value));

  SLIDERS.forEach(([el, key]) => {
    const input = $("#" + el);
    input.value = state.weights[key];
    $("#" + el + "Out").textContent = input.value;
    input.addEventListener("input", () => {
      $("#" + el + "Out").textContent = input.value;
      actions.setWeight(key, input.value);
    });
  });

  const downtime = $("#downtime");
  downtime.innerHTML = DOWNTIME_OPTIONS.map((d) => `<option value="${d.id}">${esc(d.label)}</option>`).join("");
  downtime.value = state.downtime;
  downtime.addEventListener("change", (e) => actions.setDowntime(e.target.value));
}

/** Residency options depend on which countries the cloud has regions in. */
export function renderResidency() {
  const sel = $("#residency");
  sel.innerHTML =
    `<option value="none">No requirement</option><option value="EU">European Union</option>` +
    currentCloud()
      .residencyOptions.map((o) => `<option value="${o.cc}">${esc(o.name)} (${o.count} region${o.count > 1 ? "s" : ""})</option>`)
      .join("");
  sel.value = state.residency;
}
