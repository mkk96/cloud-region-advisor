/** Footer visitor statistics (hidden until analytics is configured and responds). */

import { $ } from "./dom.js";
import { countUpAll } from "./animate.js";

const PERIODS = [
  ["today", "Today"],
  ["week", "Last 7 days"],
  ["month", "Last 30 days"],
  ["all", "All time"],
];

const fmt = (n) => Number(n || 0).toLocaleString();

export function renderVisitStats(stats) {
  const el = $("#visitStats");
  if (!stats) {
    el.hidden = true;
    return;
  }
  const since = stats.since ? new Date(stats.since).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
  el.innerHTML = `
    <div class="visit-head">
      <h2>Visitors</h2>
      <span class="hint">Anonymous counts${since ? ` since ${since}` : ""} · days in UTC</span>
    </div>
    <div class="visit-grid">
      ${PERIODS.map(
        ([key, label]) => `
        <div class="visit-tile">
          <span class="visit-label">${label}</span>
          <b data-count="${Number((stats[key] && stats[key].visitors) || 0)}">0</b><small>unique visitors</small>
          <span class="visit-sub">${fmt(stats[key] && stats[key].visits)} visits</span>
        </div>`
      ).join("")}
    </div>`;
  el.hidden = false;
  countUpAll(el);
}
