/** Sortable "All regions" table. */

import { $, $$, esc } from "./dom.js";
import { latencyClass } from "./format.js";
import { state, actions, currentCloud, cloudState } from "../state/store.js";

const SWATCH = { good: "var(--good)", mid: "var(--mid)", bad: "var(--bad)", none: "var(--none)" };

function sortValue(row, key) {
  const r = row.region;
  switch (key) {
    case "rank": return row.excluded.length ? 1e6 + (row.latency ? row.latency.ms : 1e5) : row.rank ?? 1e5;
    case "id": return r.id;
    case "latency": return row.latency ? row.latency.ms : 1e9;
    case "price": return r.price;
    case "cfe": return r.cfe;
    case "zones": return r.zones.length;
    case "services": return r.serviceCount;
  }
  return 0;
}

function latencyCell(row, measured, excluded) {
  const m = measured[row.region.id];
  if (row.latency) {
    const badge =
      row.latency.source === "estimated" ? `<span class="badge" title="Estimated from distance">est.</span>`
      : row.latency.source === "mixed" ? `<span class="badge" title="Weighted mix of measured and estimated">mix</span>`
      : "";
    const jit = m && m.ok && m.noisy ? `<span class="badge warn" title="Jitter ${m.jitter} ms">jitter</span>` : "";
    const swatch = SWATCH[excluded ? "none" : latencyClass(row.latency.ms)];
    return `<span class="lat">${badge}${jit}<i class="swatch" style="background:${swatch}"></i>${row.latency.ms} ms</span>`;
  }
  return m && !m.ok ? `<span class="badge" title="Probe ${m.error}">${m.error}</span>` : "—";
}

function servicesCell(region, cloud) {
  const missing = cloud.services.filter((s) => !region.services[s.id]).map((s) => s.label);
  const title = missing.length ? `Not available: ${missing.join(", ")}` : "All catalogued services available";
  return `<span class="svc-count ${missing.length ? "" : "full"}" title="${esc(title)}">${region.serviceCount}/${cloud.services.length}</span>`;
}

export function initRegionTable() {
  $$("#regionTable th[data-sort]").forEach((th) => th.addEventListener("click", () => actions.setSort(th.dataset.sort)));
  $("#regionTable tbody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-primary]");
    if (!b) return;
    actions.setPrimary(b.dataset.primary);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#showExcluded").addEventListener("change", (e) => actions.setShowExcluded(e.target.checked));
}

export function renderRegionTable(result) {
  const cloud = currentCloud();
  const measured = cloudState().measured;
  const { key, dir } = state.sort;

  let rows = [...result.rows];
  if (!state.showExcluded) rows = rows.filter((r) => !r.excluded.length);
  rows.sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    const c = typeof va === "string" ? va.localeCompare(vb) : va - vb;
    return c * dir || a.region.id.localeCompare(b.region.id);
  });

  $$("#regionTable th[data-sort]").forEach((th) => {
    th.classList.toggle("sorted", th.dataset.sort === key);
    th.classList.toggle("desc", th.dataset.sort === key && dir < 0);
  });
  $("#regionTable th[data-sort=price]").title = `Relative on-demand VM price, ${cloud.baseline} = 1.00`;
  $("#regionTable th[data-sort=cfe]").title = cloud.cfeLabel;

  const primaryId = result.primary && result.primary.region.id;
  const drId = result.dr && !result.dr.none ? result.dr.row.region.id : null;

  $("#regionTable tbody").innerHTML = rows
    .map((row) => {
      const r = row.region;
      const excluded = row.excluded.length > 0;
      const cls = [excluded ? "excluded" : "", r.id === primaryId ? "is-primary" : "", r.id === drId ? "is-dr" : ""].join(" ");
      const action =
        !excluded && r.id !== primaryId
          ? `<button class="btn small" data-primary="${r.id}" title="Use ${r.id} as primary">Set primary</button>`
          : "";
      return `<tr class="${cls}">
        <td class="num-col">${excluded ? "" : row.rank ?? ""}</td>
        <td><span class="rid">${r.id}</span><span class="sub">${esc(r.city)}, ${esc(r.country)}</span></td>
        <td class="num-col">${latencyCell(row, measured, excluded)}</td>
        <td class="num-col">${r.price.toFixed(2)}</td>
        <td class="num-col">${r.cfe}%</td>
        <td class="num-col">${r.zones.length || "—"}</td>
        <td class="num-col">${servicesCell(r, cloud)}</td>
        <td class="why">${esc(row.reason || (excluded ? "Excluded: " + row.excluded.join("; ") : ""))}</td>
        <td>${action}</td>
      </tr>`;
    })
    .join("");
}
