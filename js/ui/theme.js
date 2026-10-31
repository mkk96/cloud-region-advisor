/**
 * Light / dark theme. Follows the OS until the user picks one with the
 * header toggle; the choice is remembered in localStorage (per browser).
 * index.html applies the saved choice before first paint.
 */

import { $ } from "./dom.js";

const KEY = "cra.theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

export function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : media.matches;
}

/** onChange() runs whenever the effective theme changes (to redraw the map). */
export function initTheme(onChange) {
  $("#themeToggle").addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {
      /* storage blocked: the choice lasts for this page only */
    }
    onChange();
  });
  media.addEventListener("change", () => {
    if (!document.documentElement.dataset.theme) onChange();
  });
}
