/**
 * Step 2: run the latency test — from Globalping probes near each user
 * location ("remote"), or from this browser ("device"). Also owns the
 * "shared result" banner.
 */

import { $, $$, esc } from "./dom.js";
import { state, actions, currentCloud, cloudState } from "../state/store.js";
import { runLatencyTest, SAMPLES } from "../core/latency.js";
import { runRemoteTest, remainingBudget } from "../core/remote-latency.js";
import { locationKey } from "../core/geo.js";

const minutes = (secs) => Math.max(1, Math.ceil(secs / 60));

async function runDeviceTest(cloud) {
  actions.startTest(cloud.regions.length);
  const t0 = performance.now();
  const results = await runLatencyTest(cloud.regions, {
    mode: cloud.probe.mode,
    onResult: (id, result) => actions.recordLatency(id, result),
  });

  const all = Object.values(results);
  const ok = all.filter((r) => r.ok).length;
  const noisy = all.filter((r) => r.noisy).length;
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  let summary = `${cloud.name}: measured from this device in ${secs}s — ${ok} of ${all.length} regions reachable.`;
  if (noisy) summary += ` ${noisy} had high jitter (Wi-Fi/VPN?) — consider re-running.`;
  actions.finishTest(summary);
}

/**
 * Each region × location costs one of the ~250 probe requests Globalping
 * allows per hour, so the busiest locations go first and any that don't fit
 * stay estimated.
 */
async function runRemote(cloud) {
  const n = cloud.regions.length;
  let budget;
  try {
    budget = await remainingBudget();
  } catch (e) {
    $("#testStatus").textContent = "Couldn't reach the Globalping probe network. Check your connection, or measure from this device.";
    return;
  }
  const byTraffic = [...state.locations].sort((a, b) => (Number(b.share) || 0) - (Number(a.share) || 0));
  const fits = Math.min(byTraffic.length, Math.floor(budget.remaining / n));
  if (!fits) {
    $("#testStatus").textContent =
      `The free probe network's hourly limit is used up for your network (${budget.remaining} requests left, ${n} needed). ` +
      `Try again in ${minutes(budget.resetSecs)} min, or measure from this device.`;
    return;
  }
  const planned = byTraffic.slice(0, fits);

  actions.startTest(n * planned.length);
  const t0 = performance.now();
  const notes = [];
  let ok = 0;
  for (const loc of planned) {
    try {
      const { results } = await runRemoteTest(loc, cloud.regions, {
        onProbe: (probe) => actions.recordRemoteProbe(loc, probe),
        onResult: (id, result) => actions.recordRemoteLatency(loc, id, result),
      });
      ok += Object.values(results).filter((r) => r.ok).length;
    } catch (e) {
      if (e.code === "rate-limit") {
        notes.push(`Stopped at the free probe network's hourly limit — try again in ${minutes(e.resetSecs)} min.`);
        break;
      }
      notes.push(`${loc.name}: ${e.message}.`);
    }
  }
  const skipped = byTraffic.length - planned.length;
  if (skipped) notes.push(`${skipped} lower-traffic location${skipped > 1 ? "s" : ""} not measured (hourly probe limit) — estimated from distance.`);
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  const where = planned.length > 1 ? `${planned.length} locations` : planned[0].name;
  actions.finishTest([`${cloud.name}: measured from ${where} in ${secs}s — ${ok} of ${n * planned.length} results reachable.`, ...notes].join(" "));
}

async function runTest() {
  if (state.testing) return;
  const cloud = currentCloud();
  if (state.testMode === "remote" && state.locations.length) await runRemote(cloud);
  else await runDeviceTest(cloud);
}

export function initLatencyTest() {
  $("#testBtn").addEventListener("click", runTest);
  $("#sharedRerun").addEventListener("click", runTest);
  $("#testMode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (b) actions.setTestMode(b.dataset.mode);
  });
}

function renderProbeList(cloud, cs) {
  const remote = state.testMode === "remote";
  $("#probeList").innerHTML = !remote ? "" : state.locations
    .map((l) => {
      const r = cs.remote[locationKey(l)];
      if (!r) return `<li><b>${esc(l.name)}</b><span class="via">— not measured yet</span></li>`;
      const results = Object.values(r.results);
      const ok = results.filter((x) => x.ok).length;
      const done = results.length >= cloud.regions.length;
      const via = `via probe in ${esc(r.probe.label)}${r.probe.km ? ` · ${r.probe.km.toLocaleString()} km away` : ""}${r.probe.network ? ` · ${esc(r.probe.network)}` : ""}`;
      const stateCls = done ? (ok ? "ok" : "err") : "";
      const stateText = done ? `${ok}/${results.length} reachable` : `${results.length}/${cloud.regions.length}`;
      return `<li><b>${esc(l.name)}</b><span class="via">${via}</span><span class="state ${stateCls}">${stateText}</span></li>`;
    })
    .join("");
}

export function renderLatencyTest() {
  const cloud = currentCloud();
  const cs = cloudState();
  const total = cloud.regions.length;
  const remote = state.testMode === "remote";
  const btn = $("#testBtn");
  const status = $("#testStatus");

  $$("#testMode [data-mode]").forEach((b) => {
    const on = b.dataset.mode === state.testMode;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", on);
    b.disabled = state.testing;
  });
  $("#sharedBanner").hidden = !cs.measuredShared;
  btn.disabled = state.testing || (remote && !state.locations.length);
  // Lets CSS pause decorative animations so they don't compete with the probes.
  document.body.classList.toggle("is-testing", state.testing);
  renderProbeList(cloud, cs);

  if (state.testing) {
    const { done, total: all } = state.testProgress;
    btn.textContent = "Testing…";
    $("#progressBar").style.width = `${all ? (done / all) * 100 : 0}%`;
    status.textContent = done
      ? `Measured ${done} of ${all}…`
      : remote ? `Finding a probe near each location…` : `Pinging ${total} ${cloud.name} regions…`;
    return;
  }

  const ran = remote
    ? state.locations.some((l) => cs.remote[locationKey(l)])
    : Object.keys(cs.measured).length > 0;
  const fresh = ran && !cs.measuredShared;
  btn.textContent = fresh ? "Run test again" : `Run ${cloud.name} latency test`;
  $("#progressBar").style.width = fresh ? "100%" : "0%";
  if (cs.testSummary) status.textContent = cs.testSummary;
  else if (remote && !state.locations.length) status.textContent = "Add a user location in step 1 first.";
  else if (remote)
    status.innerHTML = `A probe near each user location (from the free <a href="https://globalping.io" target="_blank" rel="noopener">Globalping</a> network) times an HTTPS connection to every ${cloud.name} region — ${total} regions per location.`;
  else
    status.innerHTML = `Pings ${cloud.probe.describe} from your browser — ${total} regions, 1 warm-up + ${SAMPLES} samples each, median kept.`;
}
