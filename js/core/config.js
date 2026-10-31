/** Constants shared by every cloud. */

export const DATA_AS_OF = "2026-10-31";

export const CONTINENTS = {
  NA: "North America",
  SA: "South America",
  EU: "Europe",
  ME: "Middle East",
  AF: "Africa",
  AS: "Asia",
  OC: "Oceania",
};

/** Countries in the European Union, used by the "EU" residency option. */
export const EU_COUNTRIES = ["AT", "BE", "DE", "DK", "ES", "FI", "FR", "IE", "IT", "NL", "PL", "SE"];

/** Acceptable downtime -> replication mode and primary-to-DR latency limit. */
export const DOWNTIME_OPTIONS = [
  { id: "zero", label: "Near zero — synchronous replication", mode: "synchronous", maxRtt: 25 },
  { id: "minutes", label: "Minutes — asynchronous replication", mode: "asynchronous", maxRtt: 120 },
  { id: "hours", label: "Hours — backup & restore", mode: "backup & restore", maxRtt: Infinity },
];

/** A DR region closer than this is treated as the same metro area. */
export const MIN_DR_DISTANCE_KM = 100;

/** Map / table colour bands for latency, in ms. */
export const LATENCY_BANDS = { good: 80, mid: 160 };
