/** Tests for the pure core modules (recommendation, DR, filters, geo, share links). */

import { test, eq, ok } from "./runner.js";
import { CLOUDS } from "../js/clouds/index.js";
import { recommend } from "../js/core/recommend.js";
import { distanceKm, estimateRtt } from "../js/core/geo.js";
import { exclusionReasons, inResidency } from "../js/core/filters.js";
import { decodeState } from "../js/state/share.js";

const at = (name, lat, lon, extra = {}) => ({ name, lat, lon, share: 100, here: false, ...extra });
const BENGALURU = at("Bengaluru", 12.97, 77.59);
const PARIS = at("Paris", 48.85, 2.35);
const SYDNEY = at("Sydney", -33.8, 151.2);
const TOKYO = at("Tokyo", 35.6, 139.7);
const SAO_PAULO = at("São Paulo", -23.5, -46.6);
const TEL_AVIV = at("Tel Aviv", 32.08, 34.78);

function run(cloudId, overrides = {}) {
  return recommend({
    cloud: CLOUDS[cloudId],
    locations: [],
    measured: {},
    residency: "none",
    services: [],
    weights: { lat: 7, cost: 2, carbon: 1 },
    downtime: "minutes",
    primaryOverride: null,
    ...overrides,
  });
}
const ids = (r) => [r.primary && r.primary.region.id, r.dr && !r.dr.none ? r.dr.row.region.id : null];

// ---------- catalogue ----------
test("every cloud has regions, services and unique region ids", () => {
  Object.values(CLOUDS).forEach((c) => {
    ok(c.regions.length > 20, `${c.id} regions`);
    ok(c.services.length > 50, `${c.id} services`);
    eq(new Set(c.regions.map((r) => r.id)).size, c.regions.length, `${c.id} unique ids`);
    c.regions.forEach((r) => ok(r.probeUrl.startsWith("https://"), `${r.id} probe url`));
  });
});
test("every service belongs to a declared category", () => {
  Object.values(CLOUDS).forEach((c) => c.services.forEach((s) => ok(c.categories.includes(s.cat), `${c.id}/${s.id}`)));
});
test("Azure in-catalogue pairs point both ways or at a restricted region", () => {
  const az = CLOUDS.azure;
  az.regions.filter((r) => r.pair && az.regionById[r.pair]).forEach((r) => ok(az.regionById[r.pair].pair, `${r.id} → ${r.pair}`));
});

// ---------- geo / filters ----------
test("distance Mumbai–Delhi ≈ 1,150 km and RTT estimate ≈ 20 ms", () => {
  const km = distanceKm({ lat: 19.08, lon: 72.88 }, { lat: 28.61, lon: 77.21 });
  ok(km > 1100 && km < 1200, "km");
  eq(estimateRtt(km), 20, "rtt");
});
test("EU residency includes Ireland, excludes UK and Switzerland", () => {
  ok(inResidency({ cc: "IE" }, "EU"), "IE");
  ok(!inResidency({ cc: "GB" }, "EU"), "GB");
  ok(!inResidency({ cc: "CH" }, "EU"), "CH");
});
test("missing services are listed as exclusion reasons", () => {
  const gcp = CLOUDS.gcp;
  const reasons = exclusionReasons(gcp.regionById["asia-south2"], { cloud: gcp, residency: "none", services: ["tpu"] });
  eq(reasons.length, 1);
  ok(reasons[0].includes("Cloud TPU"), "label");
});

// ---------- primary + DR ----------
test("GCP: Bengaluru with India residency → asia-south1 / asia-south2", () => {
  const [p, d] = ids(run("gcp", { locations: [BENGALURU], residency: "IN" }));
  eq(p, "asia-south1");
  eq(d, "asia-south2");
});
test("GCP: Tokyo → asia-northeast1 (log-scale latency beats carbon weight)", () => {
  eq(ids(run("gcp", { locations: [TOKYO] }))[0], "asia-northeast1");
});
test("GCP: Singapore residency has no in-country DR", () => {
  const r = run("gcp", { locations: [at("SG", 1.3, 103.8)], residency: "SG" });
  eq(r.primary.region.id, "asia-southeast1");
  ok(r.dr.none, "dr.none");
});
test("GCP: impossible requirements give no primary", () => {
  const r = run("gcp", { locations: [BENGALURU], residency: "DE", services: ["tpu"] });
  eq(r.primary, null);
  ok(r.message, "message");
});
test("AWS: Sydney → ap-southeast-2 / ap-southeast-4", () => {
  const [p, d] = ids(run("aws", { locations: [SYDNEY] }));
  eq(p, "ap-southeast-2");
  eq(d, "ap-southeast-4");
});
test("AWS: Paris, EU residency + Bedrock stays in the EU", () => {
  const r = run("aws", { locations: [PARIS], residency: "EU", services: ["bedrock"] });
  eq(r.primary.region.id, "eu-west-3");
  ok(["SE", "DE", "IE", "IT", "ES"].includes(r.dr.row.region.cc), "DR inside EU");
});
test("Azure: official pair is used (southindia → centralindia)", () => {
  const r = run("azure", { locations: [BENGALURU] });
  eq(ids(r).join(">"), "southindia>centralindia");
  ok(r.dr.isPair, "isPair");
});
test("Azure: restricted pair falls back to tool rules (francecentral)", () => {
  const r = run("azure", { locations: [PARIS] });
  eq(r.primary.region.id, "francecentral");
  ok(!r.dr.isPair, "not pair");
  ok(r.dr.rules[0].includes("restricted-access"), "explains why");
});
test("Azure: cross-continent pair is honoured (brazilsouth → southcentralus)", () => {
  eq(ids(run("azure", { locations: [SAO_PAULO] })).join(">"), "brazilsouth>southcentralus");
});
test("Azure: region without pair says so (israelcentral)", () => {
  const r = run("azure", { locations: [TEL_AVIV] });
  eq(r.primary.region.id, "israelcentral");
  ok(r.dr.rules[0].includes("no official pair"), "rule");
});
test("DR is never in the same metro (eastus ↛ eastus2)", () => {
  const r = run("azure", { locations: [at("Richmond", 37.5, -77.4)], primaryOverride: "eastus" });
  ok(r.dr.row.region.id !== "eastus2", "different metro");
});
test("synchronous replication over the limit raises a warning", () => {
  const r = run("gcp", { locations: [at("Santiago", -33.4, -70.6)], downtime: "zero" });
  ok(r.dr.warnings.length > 0, "warning");
});

// ---------- measured latency ----------
test("measured latency beats distance; failed probe makes region unreachable", () => {
  const gcp = CLOUDS.gcp;
  const measured = Object.fromEntries(gcp.regions.map((reg) => [reg.id, { ok: true, median: 200 }]));
  measured["europe-west1"] = { ok: true, median: 5 };
  measured["asia-south1"] = { ok: false, error: "timeout" };
  const r = run("gcp", { locations: [{ ...BENGALURU, here: true }], measured });
  eq(r.primary.region.id, "europe-west1");
  eq(r.rows.find((x) => x.region.id === "asia-south1").latency, null, "unreachable");
});

// ---------- share links ----------
test("v1 (GCP-only) share links still decode", () => {
  const v1 = btoa(JSON.stringify({ v: 1, l: [["X", "IN", 12.9, 77.5, 100, 1]], m: { "asia-south1": 30 }, r: "IN", s: ["gke"], w: [7, 2, 1], d: "minutes", p: null }));
  const snap = decodeState(v1);
  eq(snap.cloud, "gcp");
  eq(snap.measured["asia-south1"].median, 30);
  eq(snap.services[0], "gke");
});
test("unknown services and regions are dropped from share links", () => {
  const v2 = btoa(JSON.stringify({ v: 2, c: "aws", l: [], m: { "us-east-1": 9, "asia-south1": 30 }, s: ["ec2", "gke"], w: [1, 1, 1], d: "hours" }));
  const snap = decodeState(v2);
  eq(snap.cloud, "aws");
  eq(Object.keys(snap.measured).join(), "us-east-1");
  eq(snap.services.join(), "ec2");
});
test("garbage hash decodes to null", () => {
  eq(decodeState("not-base64!!"), null);
});
