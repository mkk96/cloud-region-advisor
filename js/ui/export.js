/** Export card (CLI / Terraform snippet) and the header "Copy share link" button. */

import { $, esc, toast, copyText } from "./dom.js";
import { actions, currentCloud, cloudState } from "../state/store.js";
import { writeHash } from "../state/share.js";

export function initExport() {
  $("#exportTabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) actions.setExportTab(t.dataset.tab);
  });
  $("#copySnippet").addEventListener("click", async () => {
    await copyText($("#snippet").textContent);
    toast("Snippet copied");
  });
  $("#shareBtn").addEventListener("click", async () => {
    writeHash();
    await copyText(location.href);
    toast("Share link copied");
  });
}

export function renderExportTabs() {
  const tab = cloudState().tab;
  $("#exportTabs").innerHTML = currentCloud()
    .exports.map((x) => `<button class="tab ${x.id === tab ? "active" : ""}" data-tab="${x.id}" role="tab">${esc(x.label)}</button>`)
    .join("");
}

export function renderSnippet(result) {
  const cloud = currentCloud();
  const p = result.primary && result.primary.region;
  const d = result.dr && !result.dr.none ? result.dr.row.region : null;
  if (!p) {
    $("#snippet").textContent = "# Run the latency test or add a location to generate a snippet.";
    return;
  }
  const exp = cloud.exports.find((x) => x.id === cloudState().tab) || cloud.exports[0];
  const head =
    `# Cloud Region Advisor — ${cloud.name} — ${new Date().toISOString().slice(0, 10)}\n` +
    `# Primary: ${p.id} (${p.city})   DR: ${d ? `${d.id} (${d.city})` : "none found"}\n\n`;
  $("#snippet").textContent = head + exp.render(p, d);
}
