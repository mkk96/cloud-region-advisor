/** Tests for the region-table paging helpers. */

import { test, eq } from "./runner.js";
import { paginate, pageList, PAGE_SIZE } from "../js/ui/pagination.js";

const rows = (n) => Array.from({ length: n }, (_, i) => i + 1);

test("10 rows per page: 43 regions → 5 pages, last page has 3", () => {
  eq(PAGE_SIZE, 10);
  const first = paginate(rows(43), 1);
  eq(first.items.length, 10);
  eq(first.pages, 5);
  eq(`${first.from}-${first.to}`, "1-10");
  const last = paginate(rows(43), 5);
  eq(last.items.join(), "41,42,43");
  eq(`${last.from}-${last.to}`, "41-43");
});

test("page is clamped when rows shrink (e.g. excluded rows hidden)", () => {
  const p = paginate(rows(12), 5);
  eq(p.page, 2);
  eq(p.items.join(), "11,12");
  eq(paginate(rows(12), 0).page, 1, "below range");
});

test("no rows gives one empty page", () => {
  const p = paginate([], 3);
  eq(p.page, 1);
  eq(p.pages, 1);
  eq(p.from, 0);
  eq(p.items.length, 0);
});

test("page buttons collapse long ranges with gaps", () => {
  eq(pageList(1, 5).join(), "1,2,3,4,5");
  eq(pageList(5, 10).join(), "1,…,4,5,6,…,10");
  eq(pageList(1, 10).join(), "1,2,…,10");
  eq(pageList(10, 10).join(), "1,…,9,10");
});
