/*
 * Google Cloud.
 * Probes: the open-source GCPing project (https://gcping.com) runs a tiny
 * Cloud Run service in every region with `Access-Control-Allow-Origin: *`.
 * Price index: on-demand general-purpose VM cost, us-central1 = 1.00.
 * CFE: Google-published hourly carbon-free energy % (approx.).
 */
import { EU_COUNTRIES } from "../core/config.js";
import { defineCloud } from "../core/registry.js";

const NEWEST = ["northamerica-south1", "asia-southeast3", "europe-north2"];
const US_EU = (r) => r.cc === "US" || EU_COUNTRIES.includes(r.cc);

const GPU_REGIONS = [
  "us-central1", "us-east1", "us-east4", "us-east5", "us-south1", "us-west1",
  "us-west2", "us-west3", "us-west4", "northamerica-northeast1",
  "southamerica-east1", "europe-west1", "europe-west2", "europe-west3",
  "europe-west4", "europe-west6", "europe-west9", "europe-central2",
  "europe-southwest1", "me-west1", "asia-east1", "asia-northeast1",
  "asia-northeast3", "asia-south1", "asia-southeast1", "australia-southeast1",
];
const TPU_REGIONS = [
  "us-central1", "us-east1", "us-east5", "us-south1", "us-west1", "us-west4",
  "europe-west4", "asia-east1", "asia-northeast1", "asia-southeast1",
];
const GEMINI_REGIONS = [
  "us-central1", "us-east1", "us-east4", "us-east5", "us-south1", "us-west1",
  "us-west4", "northamerica-northeast1", "southamerica-east1", "europe-west1",
  "europe-west2", "europe-west3", "europe-west4", "europe-west6",
  "europe-west8", "europe-west9", "europe-north1", "europe-central2",
  "europe-southwest1", "me-central1", "me-central2", "me-west1", "asia-east1",
  "asia-east2", "asia-northeast1", "asia-northeast3", "asia-south1",
  "asia-southeast1", "australia-southeast1",
];
const APP_ENGINE_REGIONS = [
  "northamerica-northeast1", "us-central1", "us-east1", "us-east4", "us-west1",
  "us-west2", "us-west3", "us-west4", "southamerica-east1", "europe-west1",
  "europe-central2", "europe-west2", "europe-west3", "europe-west6",
  "asia-northeast1", "asia-northeast2", "asia-northeast3", "asia-east1",
  "asia-east2", "asia-south1", "asia-southeast1", "asia-southeast2",
  "australia-southeast1",
];
const API_GATEWAY_REGIONS = [
  "asia-east1", "asia-northeast1", "australia-southeast1", "europe-west1",
  "europe-west2", "us-central1", "us-east1", "us-east4", "us-west2", "us-west3",
  "us-west4",
];
const VMWARE_REGIONS = [
  "us-central1", "us-east4", "us-south1", "us-west2", "northamerica-northeast1",
  "northamerica-northeast2", "southamerica-east1", "southamerica-west1",
  "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west6",
  "europe-west8", "europe-west9", "europe-southwest1", "me-west1", "me-central2",
  "asia-east2", "asia-northeast1", "asia-northeast2", "asia-south1",
  "asia-south2", "asia-southeast1", "asia-southeast2", "australia-southeast1",
  "australia-southeast2",
];
const BARE_METAL_REGIONS = [
  "us-central1", "us-east4", "us-west2", "northamerica-northeast1",
  "southamerica-east1", "europe-west2", "europe-west3", "europe-west4",
  "asia-northeast1", "asia-south1", "asia-southeast1", "australia-southeast1",
];
const LOOKER_REGIONS = [
  "us-central1", "us-east1", "us-east4", "us-west1", "us-west4",
  "northamerica-northeast1", "northamerica-northeast2", "southamerica-east1",
  "europe-west1", "europe-west2", "europe-west3", "europe-west4", "europe-west9",
  "me-central2", "me-west1", "asia-northeast1", "asia-south1",
  "asia-southeast1", "asia-southeast2", "australia-southeast1",
];
const DIALOGFLOW_REGIONS = [
  "us-central1", "us-east1", "us-west1", "northamerica-northeast1",
  "europe-west1", "europe-west2", "europe-west3", "australia-southeast1",
  "asia-northeast1", "asia-south1", "asia-southeast1", "me-west1",
];
const SPEECH_REGIONS = [
  "asia-southeast1", "asia-northeast1", "asia-south1", "australia-southeast1",
  "northamerica-northeast1", "europe-west2",
];

const ALL_EXCEPT_NEW = { except: NEWEST };

export default defineCloud({
  id: "gcp",
  name: "Google Cloud",
  short: "GCP",
  baseline: "us-central1",
  cfeLabel: "Google-published carbon-free energy %",
  zoneName: (id, z) => `${id}-${z}`,
  probe: {
    mode: "cors",
    url: (r, x) => `https://${x.host}.a.run.app/api/ping`,
    describe: `a tiny Cloud Run endpoint in each region (the open-source <a href="https://gcping.com" target="_blank" rel="noopener">GCPing</a> probes)`,
  },
  dr: {
    note: `GCP publishes no official region pairs (apart from Cloud Storage dual-regions). These DR rules are this tool's own — see <a href="https://cloud.google.com/architecture/dr-scenarios-planning-guide" target="_blank" rel="noopener">Google's DR planning guide</a>.`,
  },
  sources: [
    ["products available by location", "https://cloud.google.com/about/locations#products-available-by-location"],
    ["VM pricing", "https://cloud.google.com/compute/vm-instance-pricing"],
    ["region carbon data", "https://cloud.google.com/sustainability/region-carbon"],
    ["GPU locations", "https://cloud.google.com/compute/docs/gpus/gpu-regions-zones"],
    ["Vertex AI locations", "https://cloud.google.com/vertex-ai/docs/general/locations"],
    ["status page", "https://status.cloud.google.com/"],
  ],

  categories: [
    "Compute", "Containers & serverless", "Databases", "Storage",
    "Data & analytics", "AI & ML", "Networking", "Security & identity",
    "Integration & operations",
  ],
  services: [
    // Compute
    { id: "gce", label: "Compute Engine", cat: "Compute", where: "all" },
    { id: "gpu", label: "GPUs (NVIDIA)", cat: "Compute", where: GPU_REGIONS },
    { id: "tpu", label: "Cloud TPU", cat: "Compute", where: TPU_REGIONS },
    { id: "confidential", label: "Confidential VMs", cat: "Compute", where: ALL_EXCEPT_NEW },
    { id: "sole-tenant", label: "Sole-tenant nodes", cat: "Compute", where: ALL_EXCEPT_NEW },
    { id: "batch", label: "Batch", cat: "Compute", where: ALL_EXCEPT_NEW },
    { id: "vmware", label: "VMware Engine", cat: "Compute", where: VMWARE_REGIONS },
    { id: "bare-metal", label: "Bare Metal Solution", cat: "Compute", where: BARE_METAL_REGIONS },

    // Containers & serverless
    { id: "gke", label: "GKE", cat: "Containers & serverless", where: "all" },
    { id: "run", label: "Cloud Run", cat: "Containers & serverless", where: "all" },
    { id: "functions", label: "Cloud Run functions", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },
    { id: "app-engine", label: "App Engine", cat: "Containers & serverless", where: APP_ENGINE_REGIONS },
    { id: "artifact-registry", label: "Artifact Registry", cat: "Containers & serverless", where: "all" },
    { id: "cloud-build", label: "Cloud Build", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },
    { id: "cloud-deploy", label: "Cloud Deploy", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },
    { id: "workflows", label: "Workflows", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },
    { id: "eventarc", label: "Eventarc", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },
    { id: "scheduler", label: "Cloud Scheduler", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },
    { id: "tasks", label: "Cloud Tasks", cat: "Containers & serverless", where: ALL_EXCEPT_NEW },

    // Databases
    { id: "sql", label: "Cloud SQL", cat: "Databases", where: "all" },
    { id: "alloydb", label: "AlloyDB for PostgreSQL", cat: "Databases", where: ALL_EXCEPT_NEW },
    { id: "spanner", label: "Spanner", cat: "Databases", where: "all" },
    { id: "bigtable", label: "Bigtable", cat: "Databases", where: ALL_EXCEPT_NEW },
    { id: "firestore", label: "Firestore", cat: "Databases", where: ALL_EXCEPT_NEW },
    { id: "memorystore-redis", label: "Memorystore for Redis", cat: "Databases", where: ALL_EXCEPT_NEW },
    { id: "memorystore-valkey", label: "Memorystore for Valkey", cat: "Databases", where: ALL_EXCEPT_NEW },
    { id: "dms", label: "Database Migration Service", cat: "Databases", where: ALL_EXCEPT_NEW },

    // Storage
    { id: "gcs", label: "Cloud Storage", cat: "Storage", where: "all" },
    { id: "persistent-disk", label: "Persistent Disk", cat: "Storage", where: "all" },
    { id: "hyperdisk", label: "Hyperdisk", cat: "Storage", where: ALL_EXCEPT_NEW },
    { id: "filestore", label: "Filestore", cat: "Storage", where: ALL_EXCEPT_NEW },
    { id: "netapp", label: "NetApp Volumes", cat: "Storage", where: { except: [...NEWEST, "africa-south1"] } },
    { id: "backup-dr", label: "Backup and DR Service", cat: "Storage", where: ALL_EXCEPT_NEW },
    { id: "storage-transfer", label: "Storage Transfer Service", cat: "Storage", where: "global" },

    // Data & analytics
    { id: "bigquery", label: "BigQuery", cat: "Data & analytics", where: "all" },
    { id: "pubsub", label: "Pub/Sub", cat: "Data & analytics", where: "global" },
    { id: "dataflow", label: "Dataflow", cat: "Data & analytics", where: ALL_EXCEPT_NEW },
    { id: "dataproc", label: "Dataproc", cat: "Data & analytics", where: ALL_EXCEPT_NEW },
    { id: "composer", label: "Cloud Composer", cat: "Data & analytics", where: ALL_EXCEPT_NEW },
    { id: "datastream", label: "Datastream", cat: "Data & analytics", where: ALL_EXCEPT_NEW },
    { id: "dataplex", label: "Dataplex", cat: "Data & analytics", where: ALL_EXCEPT_NEW },
    { id: "data-fusion", label: "Cloud Data Fusion", cat: "Data & analytics", where: { except: [...NEWEST, "africa-south1", "me-central2"] } },
    { id: "looker", label: "Looker (Google Cloud core)", cat: "Data & analytics", where: LOOKER_REGIONS },

    // AI & ML
    { id: "vertex", label: "Vertex AI (Gemini)", cat: "AI & ML", where: GEMINI_REGIONS },
    { id: "vertex-ml", label: "Vertex AI training & prediction", cat: "AI & ML", where: ALL_EXCEPT_NEW },
    { id: "vertex-search", label: "Vertex AI Search", cat: "AI & ML", where: US_EU, note: "US / EU multi-regions" },
    { id: "document-ai", label: "Document AI", cat: "AI & ML", where: US_EU, note: "US / EU multi-regions" },
    { id: "speech", label: "Speech-to-Text", cat: "AI & ML", where: (r) => US_EU(r) || SPEECH_REGIONS.includes(r.id) },
    { id: "dialogflow", label: "Dialogflow CX", cat: "AI & ML", where: DIALOGFLOW_REGIONS },
    { id: "translation", label: "Cloud Translation", cat: "AI & ML", where: "global" },
    { id: "vision", label: "Vision AI", cat: "AI & ML", where: "global" },

    // Networking
    { id: "vpc", label: "VPC", cat: "Networking", where: "global" },
    { id: "load-balancing", label: "Cloud Load Balancing", cat: "Networking", where: "global" },
    { id: "cdn", label: "Cloud CDN", cat: "Networking", where: "global" },
    { id: "dns", label: "Cloud DNS", cat: "Networking", where: "global" },
    { id: "armor", label: "Cloud Armor", cat: "Networking", where: "global" },
    { id: "nat", label: "Cloud NAT", cat: "Networking", where: "all" },
    { id: "vpn", label: "Cloud VPN", cat: "Networking", where: "all" },
    { id: "interconnect", label: "Cloud Interconnect", cat: "Networking", where: "all" },
    { id: "psc", label: "Private Service Connect", cat: "Networking", where: "all" },

    // Security & identity
    { id: "iam", label: "IAM", cat: "Security & identity", where: "global" },
    { id: "kms", label: "Cloud KMS", cat: "Security & identity", where: "all" },
    { id: "hsm", label: "Cloud HSM", cat: "Security & identity", where: ALL_EXCEPT_NEW },
    { id: "secret-manager", label: "Secret Manager", cat: "Security & identity", where: "global" },
    { id: "cas", label: "Certificate Authority Service", cat: "Security & identity", where: ALL_EXCEPT_NEW },
    { id: "scc", label: "Security Command Center", cat: "Security & identity", where: "global" },

    // Integration & operations
    { id: "apigee", label: "Apigee", cat: "Integration & operations", where: ALL_EXCEPT_NEW },
    { id: "api-gateway", label: "API Gateway", cat: "Integration & operations", where: API_GATEWAY_REGIONS },
    { id: "app-integration", label: "Application Integration", cat: "Integration & operations", where: ALL_EXCEPT_NEW },
    { id: "logging", label: "Cloud Logging", cat: "Integration & operations", where: "global" },
    { id: "monitoring", label: "Cloud Monitoring", cat: "Integration & operations", where: "global" },
  ],

  // [id, city, cc, country, continent, lat, lon, zones, price, cfe, { host }]
  regions: [
    ["us-central1", "Council Bluffs, Iowa", "US", "United States", "NA", 41.26, -95.86, "a,b,c,f", 1.0, 93, { host: "us-central1-5tkroniexa-uc" }],
    ["us-east1", "Moncks Corner, South Carolina", "US", "United States", "NA", 33.19, -80.01, "b,c,d", 1.0, 31, { host: "us-east1-5tkroniexa-ue" }],
    ["us-east4", "Ashburn, Virginia", "US", "United States", "NA", 39.04, -77.49, "a,b,c", 1.13, 61, { host: "us-east4-5tkroniexa-uk" }],
    ["us-east5", "Columbus, Ohio", "US", "United States", "NA", 39.96, -83.0, "a,b,c", 1.0, 47, { host: "us-east5-5tkroniexa-ul" }],
    ["us-south1", "Dallas, Texas", "US", "United States", "NA", 32.78, -96.8, "a,b,c", 1.18, 40, { host: "us-south1-5tkroniexa-vp" }],
    ["us-west1", "The Dalles, Oregon", "US", "United States", "NA", 45.59, -121.18, "a,b,c", 1.0, 89, { host: "us-west1-5tkroniexa-uw" }],
    ["us-west2", "Los Angeles, California", "US", "United States", "NA", 34.05, -118.24, "a,b,c", 1.2, 54, { host: "us-west2-5tkroniexa-wl" }],
    ["us-west3", "Salt Lake City, Utah", "US", "United States", "NA", 40.76, -111.89, "a,b,c", 1.2, 30, { host: "us-west3-5tkroniexa-wm" }],
    ["us-west4", "Las Vegas, Nevada", "US", "United States", "NA", 36.17, -115.14, "a,b,c", 1.13, 61, { host: "us-west4-5tkroniexa-wn" }],
    ["northamerica-northeast1", "Montréal, Québec", "CA", "Canada", "NA", 45.5, -73.57, "a,b,c", 1.1, 99, { host: "northamerica-northeast1-5tkroniexa-nn" }],
    ["northamerica-northeast2", "Toronto, Ontario", "CA", "Canada", "NA", 43.65, -79.38, "a,b,c", 1.1, 84, { host: "northamerica-northeast2-5tkroniexa-pd" }],
    ["northamerica-south1", "Querétaro", "MX", "Mexico", "NA", 20.59, -100.39, "a,b,c", 1.2, 45, { host: "northamerica-south1-5tkroniexa-pv" }],
    ["southamerica-east1", "São Paulo", "BR", "Brazil", "SA", -23.55, -46.63, "a,b,c", 1.59, 88, { host: "southamerica-east1-5tkroniexa-rj" }],
    ["southamerica-west1", "Santiago", "CL", "Chile", "SA", -33.45, -70.67, "a,b,c", 1.43, 92, { host: "southamerica-west1-5tkroniexa-tl" }],
    ["europe-west1", "St. Ghislain", "BE", "Belgium", "EU", 50.45, 3.82, "b,c,d", 1.1, 79, { host: "europe-west1-5tkroniexa-ew" }],
    ["europe-west2", "London", "GB", "United Kingdom", "EU", 51.51, -0.13, "a,b,c", 1.29, 82, { host: "europe-west2-5tkroniexa-nw" }],
    ["europe-west3", "Frankfurt", "DE", "Germany", "EU", 50.11, 8.68, "a,b,c", 1.29, 64, { host: "europe-west3-5tkroniexa-ey" }],
    ["europe-west4", "Eemshaven", "NL", "Netherlands", "EU", 53.44, 6.83, "a,b,c", 1.1, 72, { host: "europe-west4-5tkroniexa-ez" }],
    ["europe-west6", "Zürich", "CH", "Switzerland", "EU", 47.38, 8.54, "a,b,c", 1.4, 98, { host: "europe-west6-5tkroniexa-oa" }],
    ["europe-west8", "Milan", "IT", "Italy", "EU", 45.46, 9.19, "a,b,c", 1.21, 38, { host: "europe-west8-5tkroniexa-oc" }],
    ["europe-west9", "Paris", "FR", "France", "EU", 48.86, 2.35, "a,b,c", 1.16, 96, { host: "europe-west9-5tkroniexa-od" }],
    ["europe-west10", "Berlin", "DE", "Germany", "EU", 52.52, 13.4, "a,b,c", 1.29, 60, { host: "europe-west10-5tkroniexa-oe" }],
    ["europe-west12", "Turin", "IT", "Italy", "EU", 45.07, 7.69, "a,b,c", 1.21, 38, { host: "europe-west12-5tkroniexa-og" }],
    ["europe-north1", "Hamina", "FI", "Finland", "EU", 60.57, 27.2, "a,b,c", 1.1, 98, { host: "europe-north1-5tkroniexa-lz" }],
    ["europe-north2", "Stockholm", "SE", "Sweden", "EU", 59.33, 18.07, "a,b,c", 1.15, 99, { host: "europe-north2-5tkroniexa-ma" }],
    ["europe-central2", "Warsaw", "PL", "Poland", "EU", 52.23, 21.01, "a,b,c", 1.29, 30, { host: "europe-central2-5tkroniexa-lm" }],
    ["europe-southwest1", "Madrid", "ES", "Spain", "EU", 40.42, -3.7, "a,b,c", 1.18, 87, { host: "europe-southwest1-5tkroniexa-no" }],
    ["me-west1", "Tel Aviv", "IL", "Israel", "ME", 32.09, 34.78, "a,b,c", 1.17, 5, { host: "me-west1-5tkroniexa-zf" }],
    ["me-central1", "Doha", "QA", "Qatar", "ME", 25.29, 51.53, "a,b,c", 1.19, 3, { host: "me-central1-5tkroniexa-ww" }],
    ["me-central2", "Dammam", "SA", "Saudi Arabia", "ME", 26.43, 50.1, "a,b,c", 1.4, 3, { host: "me-central2-5tkroniexa-wx" }],
    ["africa-south1", "Johannesburg", "ZA", "South Africa", "AF", -26.2, 28.05, "a,b,c", 1.27, 15, { host: "africa-south1-5tkroniexa-bq" }],
    ["asia-east1", "Changhua County", "TW", "Taiwan", "AS", 24.05, 120.52, "a,b,c", 1.16, 17, { host: "asia-east1-5tkroniexa-de" }],
    ["asia-east2", "Hong Kong", "HK", "Hong Kong", "AS", 22.32, 114.17, "a,b,c", 1.4, 28, { host: "asia-east2-5tkroniexa-df" }],
    ["asia-northeast1", "Tokyo", "JP", "Japan", "AS", 35.68, 139.69, "a,b,c", 1.29, 17, { host: "asia-northeast1-5tkroniexa-an" }],
    ["asia-northeast2", "Osaka", "JP", "Japan", "AS", 34.69, 135.5, "a,b,c", 1.29, 47, { host: "asia-northeast2-5tkroniexa-dt" }],
    ["asia-northeast3", "Seoul", "KR", "South Korea", "AS", 37.57, 126.98, "a,b,c", 1.29, 32, { host: "asia-northeast3-5tkroniexa-du" }],
    ["asia-south1", "Mumbai", "IN", "India", "AS", 19.08, 72.88, "a,b,c", 1.2, 13, { host: "asia-south1-5tkroniexa-el" }],
    ["asia-south2", "Delhi", "IN", "India", "AS", 28.61, 77.21, "a,b,c", 1.2, 22, { host: "asia-south2-5tkroniexa-em" }],
    ["asia-southeast1", "Jurong West", "SG", "Singapore", "AS", 1.34, 103.71, "a,b,c", 1.23, 4, { host: "asia-southeast1-5tkroniexa-as" }],
    ["asia-southeast2", "Jakarta", "ID", "Indonesia", "AS", -6.21, 106.85, "a,b,c", 1.37, 16, { host: "asia-southeast2-5tkroniexa-et" }],
    ["asia-southeast3", "Bangkok", "TH", "Thailand", "AS", 13.75, 100.5, "a,b,c", 1.3, 20, { host: "asia-southeast3-5tkroniexa-eu" }],
    ["australia-southeast1", "Sydney", "AU", "Australia", "OC", -33.87, 151.21, "a,b,c", 1.42, 27, { host: "australia-southeast1-5tkroniexa-ts" }],
    ["australia-southeast2", "Melbourne", "AU", "Australia", "OC", -37.81, 144.96, "a,b,c", 1.42, 37, { host: "australia-southeast2-5tkroniexa-km" }],
  ],

  exports: [
    {
      id: "cli",
      label: "gcloud",
      render: (p, d) =>
        `# Set defaults for this project\n` +
        `gcloud config set compute/region ${p.id}\n` +
        `gcloud config set compute/zone ${p.zones[0]}\n` +
        `gcloud config set run/region ${p.id}\n` +
        `\n# Example: Autopilot GKE cluster in each region\n` +
        `gcloud container clusters create-auto app-primary --region=${p.id}\n` +
        (d ? `gcloud container clusters create-auto app-dr --region=${d.id}\n` : "") +
        (d ? `\n# Example: bucket for backups in the DR region\ngcloud storage buckets create gs://YOUR_BUCKET-dr --location=${d.id}\n` : ""),
    },
    {
      id: "terraform",
      label: "Terraform",
      render: (p, d) =>
        `variable "project_id" {\n  type = string\n}\n\n` +
        `variable "primary_region" {\n  type    = string\n  default = "${p.id}"\n}\n\n` +
        `variable "dr_region" {\n  type    = string\n  default = "${d ? d.id : "NO_DR_REGION_AVAILABLE"}"\n}\n\n` +
        `provider "google" {\n  project = var.project_id\n  region  = var.primary_region\n  zone    = "${p.zones[0]}"\n}\n\n` +
        `provider "google" {\n  alias   = "dr"\n  project = var.project_id\n  region  = var.dr_region\n}\n\n` +
        `# Example: backup bucket in the DR region\n` +
        `resource "google_storage_bucket" "dr_backups" {\n  provider                    = google.dr\n  name                        = "\${var.project_id}-dr-backups"\n  location                    = upper(var.dr_region)\n  uniform_bucket_level_access = true\n}\n`,
    },
  ],
});
