/** Tests for the anonymous visit counter client (fetch and storage are faked). */

import { test, eq, ok } from "./runner.js";
import { logVisit, fetchStats, visitorId, isConfigured } from "../js/services/analytics.js";

const CONFIG = { supabaseUrl: "https://demo.supabase.co/", supabaseKey: "sb_publishable_demo" };
const LEGACY = { supabaseUrl: "https://demo.supabase.co", supabaseKey: "eyJhbGciOiJIUzI1NiJ9.demo.sig" };

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
function fakeFetch(response = { ok: true, json: async () => ({}) }) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return response;
  };
  fn.calls = calls;
  return fn;
}
const deps = (over = {}) => ({
  config: CONFIG,
  fetchFn: fakeFetch(),
  storage: memoryStorage(),
  session: memoryStorage(),
  hostname: "mkk96.github.io",
  ...over,
});

test("analytics is off when not configured", async () => {
  ok(!isConfigured({ supabaseUrl: "", supabaseKey: "" }), "flag");
  const d = deps({ config: { supabaseUrl: "", supabaseKey: "" } });
  eq(await logVisit(d), false);
  eq(d.fetchFn.calls.length, 0, "no request");
  eq(await fetchStats(d), null);
});

test("visits from localhost are not logged", async () => {
  const d = deps({ hostname: "localhost" });
  eq(await logVisit(d), false);
  eq(d.fetchFn.calls.length, 0, "no request");
});

test("logs once per browser session, sending only a visitor id", async () => {
  const d = deps();
  eq(await logVisit(d), true);
  eq(await logVisit(d), false, "second call same session");
  eq(d.fetchFn.calls.length, 1, "one request");
  const call = d.fetchFn.calls[0];
  eq(call.url, "https://demo.supabase.co/rest/v1/rpc/log_visit", "url");
  eq(Object.keys(call.body).join(), "p_visitor", "payload fields");
  ok(/^[0-9a-f-]{36}$/.test(call.body.p_visitor), "uuid");
});

test("the same browser keeps the same anonymous id", () => {
  const s = memoryStorage();
  eq(visitorId(s), visitorId(s));
});

test("a failed request is retried next session (not marked as logged)", async () => {
  const d = deps({ fetchFn: fakeFetch({ ok: false }) });
  eq(await logVisit(d), false);
  eq(d.session.getItem("cra.logged"), null);
});

test("publishable keys go only in apikey; legacy JWT keys also in Authorization", async () => {
  const a = deps();
  await logVisit(a);
  eq(a.fetchFn.calls[0].init.headers.apikey, CONFIG.supabaseKey);
  eq(a.fetchFn.calls[0].init.headers.Authorization, undefined, "no bearer for sb_ key");
  const b = deps({ config: LEGACY });
  await logVisit(b);
  eq(b.fetchFn.calls[0].init.headers.Authorization, `Bearer ${LEGACY.supabaseKey}`);
});

test("fetchStats returns the RPC result, or null on error", async () => {
  const stats = { today: { visits: 3, visitors: 2 } };
  eq((await fetchStats(deps({ fetchFn: fakeFetch({ ok: true, json: async () => stats }) }))).today.visits, 3);
  eq(await fetchStats(deps({ fetchFn: async () => { throw new Error("offline"); } })), null);
});
