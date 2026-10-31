# Cloud Region Advisor

**Live app:** https://mkk96.github.io/cloud-region-advisor/

Cloud Region Advisor helps you decide **where to run your servers** on **Google Cloud, AWS or Azure**.
Tell it where your users are and what you need. In about a minute you get:

- a **primary region**: where your app should run
- a **disaster-recovery (DR) region**: where a backup copy should live if the primary goes down
- a **ranked list of every region**, each with a one-line reason

Unlike distance-based pickers, it **measures real latency from where your users are**: a probe
near each location you enter times a connection to every region. If you sit in Delhi but your users
or company are in Texas, add Texas and the numbers come from Texas, not from your laptop, Wi-Fi or VPN.

---

## What it takes into account

| Factor | What it means for you |
| --- | --- |
| **Latency** | How fast each region responds to your users, measured live from a probe near each user location (or from your own device) |
| **User locations** | One or several places (e.g. India 70% + UK 30%), weighted by traffic share |
| **Data residency** | Keep data inside one country, or inside the EU |
| **Services needed** | 70–85 services per cloud (Kubernetes, databases, GPUs, AI models, …). Regions missing any are excluded |
| **Priorities** | Sliders to trade off speed vs cost vs carbon |
| **Acceptable downtime** | Decides how close the DR region must be (synchronous, asynchronous, or backup & restore) |

Regions covered: **Google Cloud 43 · AWS 34 · Azure 45**.

---

## How to use it to find your server location

Open the [live app](https://mkk96.github.io/cloud-region-advisor/), then:

### 1. Pick a cloud
Use the **Google Cloud / AWS / Azure** switch in the top bar. Your inputs carry over when you switch,
so you can compare clouds.

### 2. Tell it where your users are
- **Search a city** (e.g. *Dallas*, *Bengaluru*, *Toronto*) and pick it from the list. You can also
  type coordinates like `12.97, 77.59`, or click **Use my location**.
- Add more cities if your users are spread out, and set a **Traffic %** for each.
- Enter where your **users** are, not where you are. Working from Delhi for a company in Texas?
  Add Texas.

### 3. Run the latency test
Under **Measure from**, choose:

- **User locations** (default): for each location, the nearest probe of the free
  [Globalping](https://globalping.io) network opens a connection to every region of the selected
  cloud. Takes about 10 seconds per location. Step 2 shows which probe was used and how far it is
  from your location (e.g. *Austin, Texas → probe in New Braunfels, TX · 72 km away*). Your own
  network, Wi-Fi or VPN has no effect on these numbers.
- **This device**: your browser pings every region itself (about 20–40 seconds). Tick
  **I'm here** on the location you're sitting in; that location gets your device's numbers and the
  others are estimated from distance. Use a normal connection without a VPN, which makes every
  region look like it's next to the VPN server.

Click **Run latency test**. Results fill in live on the map and in the table.

> The probe network allows about **250 measurements per hour** from your network, and each region ×
> location uses one (e.g. 3 locations × 43 Google Cloud regions = 129). If you add more locations
> than fit, the busiest ones are measured and the rest are estimated from distance. When the limit
> is used up, the app says when to try again; meanwhile you can measure from this device.

### 4. Set your requirements
- **Data must stay in**: choose a country or the EU if regulations require it.
- **Services needed**: search and tick what your app uses (e.g. *GKE*, *Cloud SQL*, *Bedrock*,
  *Azure OpenAI*, *GPUs*).
- **Priorities**: move the sliders. *Speed* favours low latency, *Cost* favours cheaper regions,
  *Carbon* favours cleaner energy.
- **Acceptable downtime**:
  - *Near zero*: DR must be close enough for synchronous replication (≤ 25 ms)
  - *Minutes*: asynchronous replication (≤ 120 ms), the usual choice
  - *Hours*: backup & restore, any distance

The recommendation updates instantly as you change anything.

### 5. Read the result
- **Primary region card**: the region to deploy to, its latency, relative price, carbon, number of
  availability zones, and a plain-English reason (e.g. *"Lowest latency from your location (16 ms),
  data stays in India"*).
- **Disaster-recovery card**: the backup region, how far it is from the primary, the estimated
  primary ↔ DR latency, and the rules it passed.
- **Latency map**: every region coloured 🟢 < 80 ms · 🟠 80–160 ms · 🔴 > 160 ms. Grey means
  excluded or not measured. Country boundaries follow India's official map (all of Jammu & Kashmir
  and Ladakh, including Aksai Chin, and Arunachal Pradesh are shown within India), using Natural
  Earth's India-view data.
- **All regions table**: shows 10 regions per page; use the page buttons below it to see the rest.
  Sort by latency, price, carbon, zones or services. Hover a row to highlight that region on the
  map, or click its name to fly the map to it. Hover the *Services* count to see what a region
  lacks. Click **Set primary** to override the pick and see the matching DR.

Use the ☀ / ☾ button in the top bar to switch between light and dark mode.

### 6. Use or share the result
- **Export**: copy a ready-made CLI or Terraform snippet with the chosen regions filled in
  (`gcloud`, AWS CLI, Azure CLI, Terraform for each cloud).
- **Copy share link**: sends your inputs and measured latencies to a teammate. They see the same
  recommendation, including which probe measured each location, and can re-run the test.

---

## Examples

| Situation | Settings | Typical result |
| --- | --- | --- |
| Indian users, data must stay in India | Bengaluru · India residency | GCP: Mumbai or Delhi (whichever is faster for you), the other as DR · AWS: Mumbai and Hyderabad · Azure: Central India and South India (official pair) |
| European SaaS under GDPR | Paris · European Union · Bedrock | AWS: Paris primary, DR elsewhere in the EU (e.g. Stockholm) |
| Global startup watching cost | Several cities with traffic % · Cost slider high | Cheapest region that is still reasonably fast for the weighted users |
| Needs GPUs or a specific AI model | Tick *GPUs* / *Vertex AI* / *Azure OpenAI* | Only regions offering it are ranked; the rest show why they're excluded |
| Low-downtime database | *Near zero* downtime | DR must be ≤ 25 ms from primary; the app warns if no region qualifies |

---

## How it decides

1. **Filter**: drop regions outside your data-residency choice or missing a required service.
2. **Score** the rest on latency, price and carbon, weighted by your sliders. Latency is compared on
   a log scale, so 5 vs 15 ms matters more than 205 vs 215 ms. With several user locations, latency
   is the traffic-weighted average.
3. **Primary**: the best score.
4. **DR region** must also pass the filters, be at least 100 km away (a different metro area, so one
   local disaster can't hit both), and be within the latency limit for your downtime choice. It then
   prefers the same country, then the same continent, then the lower price.
   - **Azure:** Microsoft publishes official region pairs, and the app uses the pair whenever it meets
     your requirements.
   - **Google Cloud and AWS** publish no official pairs. These rules are this tool's own, and the DR
     card says so.

### How latency is measured
- **From user locations:** the nearest online [Globalping](https://globalping.io) probe to each
  location is picked and reused for every region, so all numbers for a location come from the same
  machine. It opens an HTTPS connection to a public endpoint inside each region and keeps the
  connection (TCP handshake) time, which is one network round trip. The endpoints are: Google Cloud's
  regional Cloud Storage endpoints (GCPing for the one region without one), each AWS region's
  DynamoDB endpoint, and each Azure region's public service endpoint.
- **From this device:** your browser calls the same kind of endpoint in each region (GCPing for
  Google Cloud). It sends one warm-up request, then 5 timed requests, and keeps the median.

Locations that weren't measured, and the latency between primary and DR, are estimated from distance
and marked **est.**

---

## How accurate is it?

- **Latency** is real, measured from a probe near each user location. The probe is usually in the
  same city or region but can be farther away where probes are scarce; step 2 shows the distance.
  Probes mostly sit on data-centre and ISP networks, so a user on a mobile or home connection may see
  a few milliseconds more.
- **Price index** (cheapest region of that cloud = 1.00) and **carbon** are indicative snapshots,
  not quotes. AWS and Azure don't publish per-region carbon data, so theirs is an estimate of the
  local grid.
- **Service availability** is a curated snapshot. Confirm critical services on the provider's
  "products by region" page; the links are in the app's footer.
- A region whose probe endpoint is down shows as **unreachable**.
- This is not an official Google, Amazon or Microsoft tool.

---

## Visitor statistics

The bottom of the page shows **unique visitors and visits** for today, the last 7 days, the last
30 days and all time.

- **What is collected:** only a random anonymous ID created in the visitor's browser, plus the time
  of the visit. No IP address, name, location, cookies or test results. Repeat visits by the same
  browser within 30 minutes count once.
- **Where it's stored:** a free [Supabase](https://supabase.com) Postgres database owned by the site
  owner. The website can only add a visit and read the totals; it can't read individual records.
- **Where to see it:** on the website footer, or in the Supabase dashboard (*Table Editor →
  visits*). Ready-made daily, weekly and monthly queries are at the bottom of
  [`supabase/setup.sql`](supabase/setup.sql).
- **Setup:** run `supabase/setup.sql` in the Supabase SQL Editor, then put the project URL and
  publishable key in [`js/analytics.config.js`](js/analytics.config.js). While those are empty,
  nothing is sent and the stats are hidden.

---

## Project structure

```
index.html            the page
css/                  styles (light and dark)
js/core/              recommendation logic: filters, scoring, DR choice, latency test
js/clouds/            region and service data, one file per cloud (gcp, aws, azure)
js/state/             app state and share links
js/ui/                one file per panel (map, table, cards, visitor stats, …)
js/services/          city search and anonymous visit counting
js/analytics.config.js  Supabase URL + publishable key for visitor stats
data/                 world map boundaries (Natural Earth, India view)
supabase/setup.sql    database setup for visitor stats
tests/                tests for the recommendation logic and visit counter
```

To correct a region, price or service, edit the matching file in `js/clouds/`.
