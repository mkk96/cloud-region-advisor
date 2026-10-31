/** Tests for the remote (Globalping) latency client; fetch is faked. */

import { test, eq, ok } from "./runner.js";
import { runRemoteTest, RemoteError } from "../js/core/remote-latency.js";
import { CLOUDS } from "../js/clouds/index.js";

const PROBES = [
  { location: { city: "Dallas", state: "TX", country: "US", latitude: 32.78, longitude: -96.8, network: "A" } },
  { location: { city: "Mumbai", state: null, country: "IN", latitude: 19.07, longitude: 72.88, network: "B" } },
];
const reply = (body, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k] ?? null },
  json: async () => body,
});

/** Fake Globalping: records POST bodies; `limitAfter` posts then answers 429. */
function fakeGlobalping({ limitAfter = Infinity } = {}) {
  const posts = [];
  const fn = async (url, init = {}) => {
    if (url.endsWith("/probes")) return reply(PROBES);
    if (init.method === "POST") {
      if (posts.length >= limitAfter) return reply({}, 429, { "X-RateLimit-Reset": "1200" });
      const body = JSON.parse(init.body);
      posts.push(body);
      return reply({ id: `m${posts.length}` }, 202);
    }
    const n = +url.split("/m").pop();
    const host = posts[n - 1].target;
    const failed = host.includes("me-south-1");
    return reply({
      status: "finished",
      results: [{
        probe: { city: "Dallas", state: "TX", country: "US", network: "A", latitude: 32.78, longitude: -96.8 },
        result: failed ? { status: "failed", timings: {} } : { status: "finished", timings: { tcp: 40 + n, firstByte: 400 } },
      }],
    });
  };
  fn.posts = posts;
  return fn;
}

async function withFetch(fake, body) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await body();
  } finally {
    globalThis.fetch = real;
  }
}

const AUSTIN = { name: "Austin", lat: 30.27, lon: -97.74 };
const regions = ["us-east-1", "eu-west-1", "me-south-1"].map((id) => CLOUDS.aws.regionById[id]);

test("remote test pins the nearest probe and reuses it for every region", async () => {
  const fake = fakeGlobalping();
  let probe = null;
  const seen = [];
  const out = await withFetch(fake, () =>
    runRemoteTest(AUSTIN, regions, { onProbe: (p) => (probe = p), onResult: (id) => seen.push(id) })
  );
  eq(JSON.stringify(fake.posts[0].locations), JSON.stringify([{ country: "US", city: "Dallas", state: "TX", limit: 1 }]), "nearest probe");
  ok(fake.posts.slice(1).every((b) => b.locations === "m1"), "later measurements reuse the first probe");
  eq(fake.posts[0].target, "dynamodb.us-east-1.amazonaws.com");
  eq(fake.posts[0].measurementOptions.request.path, "/ping");
  eq(probe.label, "Dallas, TX, US");
  ok(probe.km > 250 && probe.km < 330, "Austin–Dallas distance");
  eq(out.results["us-east-1"].median, 41, "TCP handshake time kept");
  eq(out.results["me-south-1"].ok, false, "failed measurement");
  eq(seen.length, 3);
});

test("remote test stops at the hourly limit and keeps partial results", async () => {
  const fake = fakeGlobalping({ limitAfter: 2 });
  let err = null;
  await withFetch(fake, () => runRemoteTest(AUSTIN, regions).catch((e) => (err = e)));
  ok(err instanceof RemoteError, "RemoteError");
  eq(err.code, "rate-limit");
  eq(err.resetSecs, 1200);
  eq(Object.keys(err.partial.results).length, 2, "partial results");
});
