/** Step 1: browser location, city search and the user-location list. */

import { $, esc, toast } from "./dom.js";
import { state, actions } from "../state/store.js";
import { searchPlaces, reverseGeocode, parseCoordinates } from "../services/geocode.js";

export function renderLocations() {
  $("#locationList").innerHTML = state.locations
    .map(
      (l, i) => `
    <li>
      <span class="name" title="${esc(l.name)}">${esc(l.name)}</span>
      <span></span>
      <button class="icon-btn" data-remove="${i}" aria-label="Remove ${esc(l.name)}">×</button>
      <div class="meta">
        <label>Traffic <input type="number" min="0" max="100" value="${l.share}" data-share="${i}" aria-label="Traffic share for ${esc(l.name)}" />%</label>
        <label><input type="checkbox" data-here="${i}" ${l.here ? "checked" : ""}/> I'm here</label>
      </div>
    </li>`
    )
    .join("");
}

function useBrowserLocation() {
  if (!navigator.geolocation) return toast("Browser location is not available here");
  const btn = $("#geoBtn");
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async ({ coords: { latitude: lat, longitude: lon } }) => {
      const place = await reverseGeocode(lat, lon);
      const name = place.city
        ? `My location — ${place.city}${place.country ? ", " + place.country : ""}`
        : `My location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
      btn.disabled = false;
      actions.addLocation({ name, cc: place.cc, lat, lon, here: true });
    },
    (err) => {
      btn.disabled = false;
      toast(err.code === 1 ? "Location permission denied — search a city instead" : "Could not get your location");
    },
    { timeout: 10000, maximumAge: 600000 }
  );
}

async function search(e) {
  e.preventDefault();
  const input = $("#cityInput");
  const out = $("#searchResults");
  const q = input.value.trim();
  if (!q) return;

  const coords = parseCoordinates(q);
  if (coords) {
    actions.addLocation({ name: `${coords.lat}, ${coords.lon}`, ...coords });
    input.value = "";
    return;
  }

  out.innerHTML = `<li class="hint">Searching…</li>`;
  const results = await searchPlaces(q);
  if (!results.length) {
    out.innerHTML = `<li class="hint">No match. Try another spelling, or type coordinates like “12.97, 77.59”.</li>`;
    return;
  }
  out.innerHTML = results.map((r, i) => `<li><button type="button" data-pick="${i}">${esc(r.name)}</button></li>`).join("");
  out.onclick = (ev) => {
    const b = ev.target.closest("[data-pick]");
    if (!b) return;
    actions.addLocation(results[+b.dataset.pick]);
    out.innerHTML = "";
    input.value = "";
  };
}

export function initLocations() {
  $("#geoBtn").addEventListener("click", useBrowserLocation);
  $("#searchForm").addEventListener("submit", search);

  const list = $("#locationList");
  list.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-remove]");
    if (rm) actions.removeLocation(+rm.dataset.remove);
  });
  list.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.share != null) actions.setShare(+t.dataset.share, t.value);
    else if (t.dataset.here != null) actions.setHere(+t.dataset.here, t.checked);
  });
}
