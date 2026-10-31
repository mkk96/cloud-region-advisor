/** Hero banner: headline stats and the "Run latency test" call to action. */

import { $ } from "./dom.js";
import { countUpAll } from "./animate.js";
import { CLOUD_LIST } from "../clouds/index.js";

export function initHero() {
  const regions = CLOUD_LIST.reduce((n, c) => n + c.regions.length, 0);
  const services = CLOUD_LIST.reduce((n, c) => n + c.services.length, 0);
  const stats = [
    [regions, "regions"],
    [CLOUD_LIST.length, "clouds"],
    [services, "services tracked"],
  ];
  $("#heroStats").innerHTML = stats
    .map(([n, label]) => `<div class="hero-stat"><b data-count="${n}">0</b><span>${label}</span></div>`)
    .join("");
  countUpAll($("#heroStats"));

  // Start the test and bring the map into view so results can be watched live.
  $("#heroCta").addEventListener("click", () => {
    $("#testBtn").click();
    $("#map").closest(".card").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function renderHeroCta(testing) {
  $("#heroCta").disabled = testing;
}
