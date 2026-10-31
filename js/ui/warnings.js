/** Warning strip under the cards, and the "no recommendation" message. */

import { $, esc } from "./dom.js";
import { state, cloudState } from "../state/store.js";

export function renderWarnings(result) {
  const measured = cloudState().measured;
  const list = [...result.warnings];
  if (result.dr && result.dr.warnings) list.push(...result.dr.warnings);

  const noisy = Object.entries(measured).filter(([, r]) => r.noisy).map(([id]) => id);
  if (noisy.length) {
    list.push(
      `High jitter on ${noisy.length} region${noisy.length > 1 ? "s" : ""} (${noisy.slice(0, 4).join(", ")}${noisy.length > 4 ? "…" : ""}). Wi-Fi or a VPN may be skewing results — try re-running on a wired connection.`
    );
  }
  const p = result.primary;
  if (p && p.latency && p.latency.source === "estimated") {
    list.push(
      state.testMode === "device" && !state.locations.some((l) => l.here)
        ? "No location is marked “I'm here”, so latency is estimated from distance only. Tick “I'm here” and run the test for measured numbers."
        : "Latency is estimated from distance until you run the latency test."
    );
  }
  $("#warnings").innerHTML = list.map((w) => `<div class="warning">${esc(w)}</div>`).join("");

  const msg = $("#message");
  const cs = cloudState();
  msg.hidden = !(result.message && !p && (Object.keys(measured).length || Object.keys(cs.remote).length));
  msg.textContent = result.message || "";
}
