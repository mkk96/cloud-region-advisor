/**
 * Anonymous visit counting via two Supabase RPC functions (supabase/setup.sql).
 *
 * The only thing sent is a random visitor ID kept in this browser's
 * localStorage, once per browser session. Visits from localhost are not
 * logged so development doesn't inflate the numbers.
 */

import { ANALYTICS } from "../analytics.config.js";

const VISITOR_KEY = "cra.visitor";
const SESSION_KEY = "cra.logged";
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", ""];

function safe(fn, fallback = null) {
  try {
    return fn();
  } catch (e) {
    return fallback;
  }
}

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Stable random ID for this browser; a fresh one each time if storage is blocked. */
export function visitorId(storage = globalThis.localStorage) {
  let id = safe(() => storage.getItem(VISITOR_KEY));
  if (!id) {
    id = newId();
    safe(() => storage.setItem(VISITOR_KEY, id));
  }
  return id;
}

export function isConfigured(config = ANALYTICS) {
  return Boolean(config.supabaseUrl && config.supabaseKey);
}

function rpc(name, body, { config = ANALYTICS, fetchFn = globalThis.fetch } = {}) {
  const headers = { "Content-Type": "application/json", apikey: config.supabaseKey };
  // Legacy anon keys are JWTs and go in Authorization too; new sb_publishable_ keys must not.
  if (!config.supabaseKey.startsWith("sb_")) headers.Authorization = `Bearer ${config.supabaseKey}`;
  return fetchFn(`${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
}

/**
 * Log this visit once per browser session. Resolves true when a request was sent.
 * deps are injectable for tests.
 */
export async function logVisit({
  config = ANALYTICS,
  fetchFn = globalThis.fetch,
  storage = globalThis.localStorage,
  session = globalThis.sessionStorage,
  hostname = location.hostname,
} = {}) {
  if (!isConfigured(config) || LOCAL_HOSTS.includes(hostname)) return false;
  if (safe(() => session.getItem(SESSION_KEY))) return false;
  try {
    const res = await rpc("log_visit", { p_visitor: visitorId(storage) }, { config, fetchFn });
    if (res.ok) safe(() => session.setItem(SESSION_KEY, "1"));
    return res.ok;
  } catch (e) {
    return false;
  }
}

/** Resolves to { today, week, month, all: { visits, visitors }, since } or null. */
export async function fetchStats({ config = ANALYTICS, fetchFn = globalThis.fetch } = {}) {
  if (!isConfigured(config)) return null;
  try {
    const res = await rpc("visit_stats", {}, { config, fetchFn });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}
