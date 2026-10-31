/** Step 2: run the live latency test; also owns the "shared result" banner. */

import { $ } from "./dom.js";
import { state, actions, currentCloud, cloudState } from "../state/store.js";
import { runLatencyTest, SAMPLES } from "../core/latency.js";

async function runTest() {
  if (state.testing) return;
  const cloud = currentCloud();
  actions.startTest();
  const t0 = performance.now();
  const results = await runLatencyTest(cloud.regions, {
    mode: cloud.probe.mode,
    onResult: (id, result) => actions.recordLatency(id, result),
  });

  const all = Object.values(results);
  const ok = all.filter((r) => r.ok).length;
  const noisy = all.filter((r) => r.noisy).length;
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  let summary = `${cloud.name}: done in ${secs}s — ${ok} of ${all.length} regions reachable.`;
  if (noisy) summary += ` ${noisy} had high jitter (Wi-Fi/VPN?) — consider re-running.`;
  actions.finishTest(summary);
}

export function initLatencyTest() {
  $("#testBtn").addEventListener("click", runTest);
  $("#sharedRerun").addEventListener("click", runTest);
}

export function renderLatencyTest() {
  const cloud = currentCloud();
  const cs = cloudState();
  const total = cloud.regions.length;
  const done = Object.keys(cs.measured).length;
  const btn = $("#testBtn");
  const status = $("#testStatus");

  $("#sharedBanner").hidden = !cs.measuredShared;
  btn.disabled = state.testing;

  if (state.testing) {
    btn.textContent = "Testing…";
    $("#progressBar").style.width = `${(done / total) * 100}%`;
    status.textContent = done ? `Measured ${done} of ${total} ${cloud.name} regions…` : `Pinging ${total} ${cloud.name} regions…`;
    return;
  }

  const ran = done > 0 && !cs.measuredShared;
  btn.textContent = ran ? "Run test again" : `Run ${cloud.name} latency test`;
  $("#progressBar").style.width = ran ? "100%" : "0%";
  if (cs.testSummary) status.textContent = cs.testSummary;
  else
    status.innerHTML = `Pings ${cloud.probe.describe} from your browser — ${total} regions, 1 warm-up + ${SAMPLES} samples each, median kept.`;
}
