// Super admin > Live map: one pin per open report across the city (or one barangay).
import { LEVEL, addrLabel, coords, esc, fetchOpenReports, fillAddresses } from "../shared.js";
import { filterBar } from "./filter.js";

let leafletLoading = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(true);
  leafletLoading ??= new Promise((resolve) => {
    if (!document.getElementById("leaflet-css")) {
      const css = document.createElement("link");
      css.id = "leaflet-css";
      css.rel = "stylesheet";
      css.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
      document.head.append(css);
    }
    const js = document.createElement("script");
    js.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve(true);
    js.onerror = () => {
      leafletLoading = null; // allow a retry next time
      resolve(false);
    };
    document.head.append(js);
  });
  return leafletLoading;
}

const popupHtml = (r) =>
  `<b>${esc(r.code)}</b><br>${LEVEL[r.level]}${r.vul.length ? " · vulnerable" : ""}` +
  `<br>${esc(r.barangays?.name ?? "")}<br>${esc(addrLabel(r))}<br>${coords(r)}`;

export async function mountMap(el, ctx, params) {
  const q = (selector) => el.querySelector(selector);
  const scope = Number(params.get("b")) || null; // ?b=<barangay id>
  const focusId = Number(params.get("focus")) || null; // ?focus=<report id>

  let alive = true;
  let map = null;
  let layer = null;
  let fitted = false;
  let focused = false;
  const pins = new Map(); // report id -> { marker, cls, report }

  el.innerHTML = `
    <div id="fbar"></div>
    <div class="card map-card">
      <div id="map"></div>
      <p class="legend-line">
        <span class="dot" style="background:#e0312b;margin-left:0"></span>Vulnerable
        <span class="dot" style="background:#2f7cf6"></span>Normal
        <span class="dot" style="background:#aab7c3"></span>Faded = acknowledged
      </p>
    </div>`;

  await filterBar(q("#fbar"), "map", scope);

  const ok = await loadLeaflet();
  if (!ok) {
    q("#map").replaceWith(
      Object.assign(document.createElement("p"), {
        className: "empty",
        textContent: "The map could not load (no internet). Use the Reports page instead.",
      }),
    );
    return { stop() {} };
  }

  map = L.map(q("#map")).setView([12.0667, 124.6044], 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  layer = L.layerGroup().addTo(map);
  setTimeout(() => map?.invalidateSize(), 0);

  // One pin per open report: red = vulnerable, blue = normal, faded = acknowledged.
  function draw(list) {
    const seen = new Set();

    for (const r of list) {
      seen.add(r.id);
      const cls = `rp ${r.vul.length ? "v" : "n"}${r.status === "ack" ? " ack" : ""}`;
      const pin = pins.get(r.id);

      if (!pin) {
        const marker = L.marker([r.lat, r.lng], { icon: L.divIcon({ className: cls, iconSize: [22, 22] }) })
          .addTo(layer)
          .bindPopup(() => popupHtml(pins.get(r.id).report));
        pins.set(r.id, { marker, cls, report: r });
      } else {
        pin.report = r;
        if (pin.cls !== cls) {
          pin.marker.setIcon(L.divIcon({ className: cls, iconSize: [22, 22] }));
          pin.cls = cls;
        }
      }
    }

    // Reports marked Rescued disappear from the map
    for (const [id, pin] of pins) {
      if (!seen.has(id)) {
        layer.removeLayer(pin.marker);
        pins.delete(id);
      }
    }

    if (!fitted && list.length && !focusId) {
      map.fitBounds(list.map((r) => [r.lat, r.lng]), { padding: [40, 40], maxZoom: 17 });
      fitted = true;
    }
  }

  // "Show on map" from a report card opens its pin
  function focusPin(id) {
    const pin = pins.get(id);
    if (!pin) return false;
    map.setView([pin.report.lat, pin.report.lng], 18);
    pin.marker.openPopup();
    return true;
  }

  async function load() {
    const list = await fetchOpenReports({ barangayId: scope });
    if (!alive || !list) return;
    draw(list);
    fillAddresses(list);
    if (focusId && !focused) focused = focusPin(focusId);
  }

  await load();

  return {
    refresh: load,
    stop() {
      alive = false;
      map?.remove();
      map = layer = null;
      pins.clear();
    },
  };
}
