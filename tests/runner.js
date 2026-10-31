/** Minimal in-browser test runner (sync or async tests). */

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function eq(actual, expected, label = "") {
  if (actual !== expected) throw new Error(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

export function ok(value, label = "") {
  if (!value) throw new Error(`${label} expected truthy`);
}

/** Runs every registered test and renders results; sets body[data-result]. */
export async function report() {
  const results = [];
  for (const t of tests) {
    try {
      await t.fn();
      results.push({ name: t.name, ok: true });
    } catch (e) {
      results.push({ name: t.name, ok: false, error: e.message });
    }
  }
  const failed = results.filter((r) => !r.ok);
  const summary = document.getElementById("summary");
  summary.textContent = `${results.length - failed.length} / ${results.length} passed`;
  summary.className = failed.length ? "fail" : "pass";
  document.getElementById("results").innerHTML = results
    .map((r) => `<div class="${r.ok ? "pass" : "fail"}">${r.ok ? "✓" : "✗"} ${r.name}</div>${r.ok ? "" : `<pre>${r.error}</pre>`}`)
    .join("");
  document.body.dataset.result = failed.length ? "fail" : "pass";
}
