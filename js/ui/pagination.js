/** Pure paging helpers for the region table. */

export const PAGE_SIZE = 10;

/**
 * Returns { items, page, pages, from, to, total } for a 1-based page,
 * clamping the page into range (e.g. after rows were filtered away).
 */
export function paginate(rows, page, size = PAGE_SIZE) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page || 1), pages);
  const start = (current - 1) * size;
  const items = rows.slice(start, start + size);
  return { items, page: current, pages, from: total ? start + 1 : 0, to: start + items.length, total };
}

/**
 * Page numbers to show, with "…" gaps for long ranges:
 * pageList(5, 10) → [1, "…", 4, 5, 6, "…", 10]
 */
export function pageList(current, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = new Set([1, pages, current - 1, current, current + 1]);
  const list = [];
  for (let p = 1; p <= pages; p++) {
    if (keep.has(p)) list.push(p);
    else if (list[list.length - 1] !== "…") list.push("…");
  }
  return list;
}
