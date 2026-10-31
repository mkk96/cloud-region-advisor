/** Small motion helpers (skipped when the user prefers reduced motion). */

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts an element's number up from 0 to `to` (formatted with locale separators). */
export function countUp(el, to, duration = 900) {
  const target = Number(to) || 0;
  if (reduced() || target === 0) {
    el.textContent = target.toLocaleString();
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Runs countUp on every [data-count] element inside root. */
export function countUpAll(root) {
  root.querySelectorAll("[data-count]").forEach((el) => countUp(el, el.dataset.count));
}
