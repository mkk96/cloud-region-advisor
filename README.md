# Cloud Region Advisor

Pick a **primary region** and a **disaster-recovery (DR) region** on **Google Cloud, AWS or Azure**.
It uses latency measured from your own network, plus data residency, service availability, price and
carbon. Built from the GCP Region Advisor one-page PRD; AWS and Azure (PRD v2) are included.

It is a static site (HTML, CSS and native JavaScript modules; no build step, no backend), so it runs
locally and hosts for free anywhere that serves static files.

## Run locally

The code uses ES modules, which browsers only load over HTTP. Opening `index.html` straight from
disk shows a notice telling you to use one of these instead:

- **With Python (any OS):** `python serve.py` in this folder, then open http://localhost:8000.
  `python -m http.server` also works, unless your machine serves `.js` as `text/plain`;
  `serve.py` always sends the right type.
- **Any other static server** works too (`npx serve`, VS Code Live Server, …).

An internet connection is required (the latency test pings live cloud regions; map tiles and
Leaflet come from CDNs).

## Tests

With the local server running, open http://localhost:8000/tests/. The page runs the core
(recommendation, DR, filters, geo, share-link) tests in the browser and shows pass/fail.
Tests aren't deployed; the Pages workflow only publishes `index.html`, `css/` and `js/`.

## Host for free

| Host | How |
| --- | --- |
| **GitHub Pages** | Push this folder to a GitHub repo → *Settings → Pages → Source: GitHub Actions*. The included workflow `.github/workflows/pages.yml` deploys on every push to `main`. |
| **Netlify** | Drag and drop the folder at https://app.netlify.com/drop |
| **Cloudflare Pages** | *Create project → Direct upload* (or connect the repo; build command: none, output directory: `/`) |
| **Vercel** | `npx vercel` in this folder, or import the repo (framework preset: *Other*, no build) |

All asset paths are relative, so it also works from a sub-path such as
`https://<user>.github.io/<repo>/`.

## Clouds

Pick the cloud with the switch in the header. Locations, residency, priorities and downtime are shared
across clouds. Each cloud keeps its own latency results, service selection and chosen primary, so you
can test one, switch, test another and come back.

| | Google Cloud | AWS | Azure |
| --- | --- | --- | --- |
| Regions | 43 | 34 | 45 |
| Services catalogued | 71 | 85 | 73 |
| Latency probe | [GCPing](https://gcping.com) Cloud Run endpoints (CORS) | `dynamodb.<region>.amazonaws.com/ping` (CORS) | `<region>.api.cognitive.microsoft.com`, or a regional Azure Monitor host where AI services aren't offered (timed with `no-cors`) |
| Price index baseline | us-central1 = 1.00 | us-east-1 = 1.00 | eastus = 1.00 |
| Carbon column | Google-published CFE % | local-grid estimate | local-grid estimate |
| DR pairing | this tool's rules | this tool's rules | Microsoft's **official region pair** when it meets your requirements, else this tool's rules |
| Export | `gcloud` / Terraform | AWS CLI + eksctl / Terraform | Azure CLI / Terraform (azurerm) |

Every probe host was checked to be served from its own region: TCP handshake times follow geography.
Azure's hosts don't send CORS headers, so the browser uses an opaque `no-cors` request. It can't read
the response, but the round-trip time is real.

## What it does (PRD mapping)

| PRD feature | Where |
| --- | --- |
| Location input (browser location, city search, several locations with traffic share) | Step 1 |
| Live latency test (median of 5 pings after a warm-up, jitter warning) | Step 2, `js/core/latency.js` |
| Latency map (green / amber / red) | Leaflet map |
| Primary pick with plain-English reason | Primary card, `js/core/recommend.js` |
| DR pick (distance, primary↔DR latency, rules shown) | DR card |
| Ranked, sortable region table (latency, price, CFE, zones, services) with a reason per row | All regions |
| Service availability: 70–85 products per cloud in 9 categories, searchable | Step 3 + *Services* column (hover shows what's missing) |
| Data residency filter (any country with a region, or the EU) | Step 3 |
| Relative price, carbon score (v1.1) | Table + scoring |
| Export CLI / Terraform snippet (v1.1) | Export card |
| Shareable result link (v1.1) | *Copy share link*. Cloud, inputs and measured latencies are in the URL hash. Older GCP-only links still open. |
| Multi-cloud (v2) | Cloud switch in the header |

### How latency is measured

Each region gets one warm-up request (DNS + TLS, allowed up to 12 s), then 5 timed requests; the
median is kept. Regions are probed 4 at a time.

Only the location marked **I'm here** gets measured latency. Other user locations, and
primary↔DR latency, are estimated from great-circle distance (`4 ms + distance × 1.4 route
factor ÷ 200 km/ms × 2`) and labelled `est.`

### Recommendation logic

1. **Filter** out regions that fail data residency or lack a required service.
2. **Score** the rest (lower is better):
   `score = w_lat·latency + w_cost·price + w_carbon·(1 − CFE)`. Each factor is min-max
   normalised to 0–1, and latency is compared on a log scale so 5 vs 15 ms counts more than
   205 vs 215 ms. Weights come from the priority sliders. With several locations, latency is
   the traffic-weighted average.
3. **DR region:**
   - must pass the same filters, be ≥ 100 km away (a different metro area), and differ from the primary
   - **Azure:** the official pair is used when it passes those rules. If the pair is restricted-access
     (e.g. France South) or fails a requirement, the card says so and the rules below apply.
   - prefers the same country, then the same continent, then elsewhere
   - must be within the primary↔DR latency limit for the chosen downtime: synchronous ≤ 25 ms, asynchronous ≤ 120 ms, backup & restore unlimited
   - ties are broken on lower price, then on lower latency.

### Reference data

Each cloud lives in its own file under `js/clouds/` (regions, coordinates, zones, price index,
carbon %, services, probe hosts, export snippets). **Price, carbon and service availability are
indicative snapshots** dated by `DATA_AS_OF` in `js/core/config.js`. Refresh them from the links in
each cloud's `sources` list, which the page footer also shows.

- **Add a region:** append a row to that cloud's `regions` list.
- **Add a service:** append an entry to `services` with a `where` rule (`"all"`, `"global"`, a list
  of region ids, `{ except: [...] }`, or a function).
- **Add a cloud:** create `js/clouds/<id>.js` exporting `defineCloud({...})` and add it to
  `CLOUD_LIST` in `js/clouds/index.js`.

## Project layout

```
index.html                  page shell; loads js/main.js as a module
css/styles.css              styles (light + dark)
serve.py                    local server (correct JS MIME type)
tests/                      in-browser tests for the core modules

js/main.js                  entry: restore share link, init views, batched re-render on state change

js/core/                    pure logic — no DOM, no globals; every function takes the cloud explicitly
  config.js                 shared constants (continents, EU, downtime options, bands)
  geo.js                    great-circle distance, distance → RTT estimate
  registry.js               defineCloud(): indexes a cloud definition (regions, services, residency)
  latency.js                browser latency test (warm-up + median of 5)
  filters.js                residency + required-service filters
  scoring.js                per-region latency and weighted score
  dr.js                     DR selection (official pairs, tiers, latency limit, price)
  explain.js                plain-English reasons
  recommend.js              pipeline: filter → score → primary → DR → explain

js/clouds/                  one data module per cloud
  index.js                  CLOUD_LIST / CLOUDS — register clouds here
  gcp.js  aws.js  azure.js  regions, services, probes, pairs, export snippets

js/state/
  store.js                  app state + named actions; emits topics for re-rendering
  share.js                  share-link encode / decode (#s=…)

js/services/
  geocode.js                OpenStreetMap Nominatim search / reverse geocoding

js/ui/                      one module per panel: init() binds events → actions, render() draws
  dom.js  format.js         DOM + formatting helpers
  cloud-switch.js           header cloud switch
  locations.js              step 1
  latency-test.js           step 2 (+ shared-result banner)
  requirements.js           step 3: residency, priorities, downtime
  service-picker.js         step 3: services
  cards.js  warnings.js     primary / DR cards, warning strip
  map.js                    Leaflet map
  region-table.js           all-regions table
  export.js                 CLI / Terraform snippet + share button
  footnote.js               sources footer

.github/workflows/pages.yml GitHub Pages deploy
```

Data flows one way: **UI event → `actions.*` in the store → topic emitted → `main.js` re-renders**
(cloud-specific controls only when the cloud changes; results every time).

## Known limits

- The latency test relies on public endpoints this project doesn't own (GCPing, DynamoDB, Azure AI
  services / Monitor). If one is down, that region shows *unreachable*. In testing, AWS me-south-1
  (Bahrain) did not respond.
- AWS and Azure don't publish per-region carbon-free energy, so their carbon column is an estimate
  of the local grid.
- Incident history (v1.1) is a link to each cloud's status page. The status feeds don't allow
  cross-origin browser reads, so live incidents would need a small backend.
- No side-by-side comparison of clouds yet. Switch clouds to compare.
