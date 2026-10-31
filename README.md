# Cloud Region Advisor

**Live app:** https://mkk96.github.io/cloud-region-advisor/

Cloud Region Advisor helps you decide **where to run your servers** on **Google Cloud, AWS or Azure**.
Tell it where your users are and what you need. In about a minute you get:

- a **primary region**: where your app should run
- a **disaster-recovery (DR) region**: where a backup copy should live if the primary goes down
- a **ranked list of every region**, each with a one-line reason

Unlike distance-based pickers, it **measures real latency from your own browser** to every region.
The numbers reflect your actual network, not a guess from a map.

---

## What it takes into account

| Factor | What it means for you |
| --- | --- |
| **Latency** | How fast each region responds to your users, measured live, median of 5 pings |
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
- **Use my location** if you're where your users are, or
- **Search a city** (e.g. *Bengaluru*, *Toronto*) and pick it from the list. You can also type
  coordinates like `12.97, 77.59`.
- Add more cities if your users are spread out, and set a **Traffic %** for each.
- Tick **I'm here** on the location you're sitting in. That location gets real measured latency;
  the others are estimated from distance.

### 3. Run the latency test
Click **Run latency test**. Your browser pings every region of the selected cloud (about 20–40
seconds). Results fill in live on the map and in the table.

> For accurate numbers, use a normal wired or Wi-Fi connection without a VPN. A VPN makes every
> region look like it's next to the VPN server. If the app warns about **high jitter**, run the test again.

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
  excluded or not measured.
- **All regions table**: sort by latency, price, carbon, zones or services. Hover the *Services*
  count to see what a region lacks. Click **Set primary** to override the pick and see the matching DR.

### 6. Use or share the result
- **Export**: copy a ready-made CLI or Terraform snippet with the chosen regions filled in
  (`gcloud`, AWS CLI, Azure CLI, Terraform for each cloud).
- **Copy share link**: sends your inputs and measured latencies to a teammate. They see the same
  recommendation and can re-run the test from their own network.

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
Your browser calls a tiny public endpoint inside each region: Google Cloud uses the open-source
[GCPing](https://gcping.com) probes, AWS uses each region's DynamoDB health check, and Azure uses
each region's public service endpoint. It sends one warm-up request, then 5 timed requests, and keeps
the median. Latency for the other user locations, and between primary and DR, is estimated from
distance and marked **est.**

---

## How accurate is it?

- **Latency** is real, but only from the network you test on. Test from where your users are, or
  ask a colleague there to open your share link and re-run the test.
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
supabase/setup.sql    database setup for visitor stats
tests/                tests for the recommendation logic and visit counter
```

To correct a region, price or service, edit the matching file in `js/clouds/`.
