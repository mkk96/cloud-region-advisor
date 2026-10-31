/** Display helpers for latency values. */

import { LATENCY_BANDS } from "../core/config.js";

export function latencyClass(ms) {
  if (ms == null) return "none";
  if (ms < LATENCY_BANDS.good) return "good";
  if (ms <= LATENCY_BANDS.mid) return "mid";
  return "bad";
}

export function latencyLabel(row) {
  return row && row.latency ? `${row.latency.ms} ms` : "—";
}

export function sourceNote(row, shared) {
  if (!row.latency) return "";
  if (row.latency.source === "measured") return shared ? "measured (shared)" : "measured";
  if (row.latency.source === "mixed") return "measured + estimated";
  return "estimated from distance";
}
