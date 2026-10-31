/** Sortable "All regions" table. */

import { $, $$, esc } from "./dom.js";
import { latencyClass } from "./format.js";
import { paginate, pageList } from "./pagination.js";
import { highlightRegion, focusRegion } from "./map.js";
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

function latencyCell(row, measured, excluded, maxMs) {
  const m = measured[row.region.id];
  if (row.latency) {
    const badge =
      row.latency.source === "estimated" ? `<span class="badge" title="Estimated from distance">est.</span>`
      : row.latency.source === "mixed" ? `<span class="badge" title="Weighted mix of measured and estimated">mix</span>`
      : "";
    const jit = m && m.ok && m.noisy ? `<span class="badge warn" title="Jitter ${m.jitter} ms">jitter</span>` : "";
    const swatch = SWATCH[excluded ? "none" : latencyClass(row.latency.ms)];
    const width = Math.max(4, Math.min(100, (row.latency.ms / maxMs) * 100));
    return `<span class="lat">${badge}${jit}<i class="swatch" style="background:${swatch}"></i>${row.latency.ms} ms</span>` +
      `<span class="latbar"><i style="width:${width.toFixed(0)}%;background:${swatch}"></i></span>`;
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
  const tbody = $("#regionTable tbody");
  tbody.addEventListener("click", (e) => {
    const b = e.target.closest("[data-primary]");
    if (b) {
      actions.setPrimary(b.dataset.primary);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const name = e.target.closest(".rid");
    if (name) focusRegion(name.closest("tr").dataset.id);
  });
  // Hovering a row highlights its marker on the map.
  tbody.addEventListener("mouseover", (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (tr) highlightRegion(tr.dataset.id);
  });
  tbody.addEventListener("mouseleave", () => highlightRegion(null));
  $("#showExcluded").addEventListener("change", (e) => actions.setShowExcluded(e.target.checked));
  $("#regionPager").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    actions.setTablePage(+b.dataset.page);
    // Keep the table header in view when the new page is shorter/longer.
    const card = $("#regionTable").closest(".card");
    if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderPager({ page, pages, from, to, total }) {
  const pager = $("#regionPager");
  if (total <= 0) {
    pager.innerHTML = "";
    return;
  }
  const btn = (p, label, { disabled = false, current = false, aria = "" } = {}) =>
    `<button type="button" class="page-btn${current ? " current" : ""}" data-page="${p}"
       ${disabled ? "disabled" : ""} ${current ? 'aria-current="page"' : ""} ${aria ? `aria-label="${aria}"` : ""}>${label}</button>`;
  pager.innerHTML = `
    <span class="pager-info">Showing <b>${from}–${to}</b> of <b>${total}</b> regions</span>
    ${pages > 1
      ? `<span class="pager-buttons">
          ${btn(page - 1, "‹ Prev", { disabled: page === 1, aria: "Previous page" })}
          ${pageList(page, pages)
            .map((p) => (p === "…" ? `<span class="page-gap">…</span>` : btn(p, p, { current: p === page, aria: `Page ${p}` })))
            .join("")}
          ${btn(page + 1, "Next ›", { disabled: page === pages, aria: "Next page" })}
        </span>`
      : ""}`;
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

  const pageInfo = paginate(rows, state.tablePage);
  state.tablePage = pageInfo.page; // clamp if fewer rows now
  renderPager(pageInfo);
  // Latency bars are scaled against the slowest region in the whole table.
  const maxMs = Math.max(100, ...rows.filter((r) => r.latency).map((r) => r.latency.ms));

  $("#regionTable tbody").innerHTML = pageInfo.items
    .map((row) => {
      const r = row.region;
      const excluded = row.excluded.length > 0;
      const cls = [excluded ? "excluded" : "", r.id === primaryId ? "is-primary" : "", r.id === drId ? "is-dr" : ""].join(" ");
      const action =
        !excluded && r.id !== primaryId
          ? `<button class="btn small" data-primary="${r.id}" title="Use ${r.id} as primary">Set primary</button>`
          : "";
      const rank = excluded || row.rank == null ? "" : `<span class="rank${row.rank <= 3 ? ` r${row.rank}` : ""}">${row.rank}</span>`;
      return `<tr class="${cls}" data-id="${r.id}">
        <td class="num-col">${rank}</td>
        <td><span class="rid" title="Show ${r.id} on the map">${r.id}</span><span class="sub">${esc(r.city)}, ${esc(r.country)}</span></td>
        <td class="num-col">${latencyCell(row, measured, excluded, maxMs)}</td>
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
