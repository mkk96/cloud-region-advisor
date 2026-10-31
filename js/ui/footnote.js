/** Page footer: how latency is measured and where the reference data comes from. */

import { $, esc } from "./dom.js";
import { DATA_AS_OF } from "../core/config.js";
import { SAMPLES } from "../core/latency.js";
import { currentCloud } from "../state/store.js";

export function renderFootnote() {
  const c = currentCloud();
  const links = c.sources.map(([label, url]) => `<a href="${url}" target="_blank" rel="noopener">${esc(label)}</a>`).join(", ");
  $("#footnote").innerHTML = `
    <p><b>How latency is measured (${esc(c.name)}):</b> your browser times HTTPS requests to ${c.probe.describe},
    discards a warm-up request and keeps the median of ${SAMPLES}. Primary ↔ DR latency is estimated from distance.</p>
    <p><b>Reference data as of ${DATA_AS_OF}</b> and indicative only — price index (${esc(c.baseline)} = 1.00) and
    ${esc(c.cfeLabel)} are approximate; service availability (${c.services.length} products) is a curated snapshot.
    Confirm on ${links}. Not an official Google, Amazon or Microsoft tool.</p>`;
}
