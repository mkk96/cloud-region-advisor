/**
 * Live latency test. Each region's probe is fetched once to warm up the
 * connection (DNS + TLS), then timed several times; the median is kept.
 */

export const SAMPLES = 5;
const TIMEOUT_MS = 5000;
const WARMUP_TIMEOUT_MS = 12000;
const CONCURRENCY = 4;
const MAX_SAMPLE_FAILURES = 2;

// `no-cors` gives an opaque response for hosts without CORS headers; the
// body is unreadable but the round-trip time is still real.
async function timedFetch(url, mode, timeout = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const t0 = performance.now();
  try {
    const res = await fetch(url, { mode, cache: "no-store", signal: ctrl.signal });
    await res.text();
    return performance.now() - t0;
  } finally {
    clearTimeout(timer);
  }
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function probeRegion(region, mode) {
  try {
    // The warm-up absorbs DNS + TLS, which can be slow on some networks.
    await timedFetch(region.probeUrl, mode, WARMUP_TIMEOUT_MS);
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "timeout" : "unreachable" };
  }
  const samples = [];
  let failures = 0;
  for (let i = 0; i < SAMPLES && failures < MAX_SAMPLE_FAILURES; i++) {
    try {
      samples.push(await timedFetch(region.probeUrl, mode));
    } catch (e) {
      failures++; // drop the sample; give up on a region that keeps failing
    }
  }
  if (!samples.length) return { ok: false, error: "unreachable" };
  const med = median(samples);
  const jitter = Math.max(...samples) - Math.min(...samples);
  return {
    ok: true,
    median: Math.round(med),
    min: Math.round(Math.min(...samples)),
    jitter: Math.round(jitter),
    samples: samples.length,
    // Flag noisy results (Wi-Fi, VPN, congested link).
    noisy: jitter > 40 && jitter > med * 0.5,
  };
}

/**
 * Probe every region. onResult(regionId, result, doneCount) fires as each
 * region completes. Resolves to { [regionId]: result }.
 */
export async function runLatencyTest(regions, { mode = "cors", onResult } = {}) {
  const queue = [...regions];
  const results = {};
  let done = 0;
  async function worker() {
    while (queue.length) {
      const region = queue.shift();
      const result = await probeRegion(region, mode);
      results[region.id] = result;
      done++;
      if (onResult) onResult(region.id, result, done);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}
