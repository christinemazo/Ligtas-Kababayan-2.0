// Super admin screen: barangay overview, live map, barangay filter, add-evacuation-center form.
import { sb } from "./api.js";
import {
  $,
  LEVEL,
  esc,
  coords,
  addrLabel,
  renderList,
  byPriority,
  fillAddresses,
  shelterCard,
  bindActions,
  loadStylesheet,
  watch,
} from "./shared.js";

// ---------- page layout ----------
const LAYOUT = `
  <div id="tabs" class="acts">
    <button class="btn" id="tab-ov">Barangay overview</button>
    <button class="btn sec" id="tab-rp">Reports &amp; evacuation centers</button>
  </div>

  <div id="ov" hidden>
    <details id="addsh" class="card">
      <summary><b>Add evacuation center</b></summary>
      <label for="sn">Name</label><input id="sn" type="text" maxlength="80" placeholder="e.g. Obrero Elementary School">
      <label for="sb">Barangay</label><select id="sb"></select>
      <label for="sc">Capacity (people)</label><input id="sc" type="number" min="1">
      <p id="serr" style="color:#e0312b"></p>
      <button class="btn" id="sadd" style="margin-top:8px">Add center</button>
    </details>
    <p id="ovsum"></p>
    <div id="ovg" class="grid"></div>
  </div>

  <div id="main" hidden>
    <p>Vulnerable queue first. Each list is sorted by water level. New reports appear instantly.</p>
    <select id="bf" aria-label="Filter by barangay"></select>
    <div id="mapwrap">
      <div id="map"></div>
      <p style="font-size:13px"><span class="dot" style="background:#e0312b;margin-left:0"></span>Vulnerable<span class="dot" style="background:#0b3a63"></span>Normal<span class="dot" style="background:#aab7c3"></span>Faded = acknowledged</p>
    </div>
    <div class="grid">
      <div><h3>Vulnerable queue</h3><div id="v"></div></div>
      <div><h3>Normal queue</h3><div id="n"></div></div>
    </div>
    <h3>Evacuation center occupancy</h3>
    <div id="sh"></div>
  </div>`;

// ---------- state ----------
let tab = "ov"; // "ov" = barangay overview, "rp" = reports and evacuation centers
let scope = null; // barangay id being shown; null = all barangays
let map = null;
let layer = null;
let fitted = false;
const pins = new Map(); // report id -> { marker, cls, report }
let abort = null;
let stopWatching = null;
let styleLink = null;

// ---------- map ----------
// Leaflet is loaded here (not in index.html) so only the super admin downloads it.
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

async function ensureMap() {
  const ok = await loadLeaflet();
  const el = $("#map");
  if (!el) return; // signed out while Leaflet was loading
  if (!ok) {
    // Leaflet could not load (no internet): the cards and address lines still work
    el.hidden = true;
    return;
  }
  if (!map) {
    map = L.map("map").setView([12.0667, 124.6044], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }
  map.invalidateSize(); // the map container was hidden until this tab opened
}

const popupHtml = (r) =>
  `<b>${esc(r.code)}</b><br>${LEVEL[r.level]}${r.vul.length ? " · vulnerable" : ""}` +
  `<br>${esc(addrLabel(r))}<br>${coords(r)}`;

function highlightCard(id) {
  const el = document.getElementById(`rc${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("hl");
  setTimeout(() => el.classList.remove("hl"), 2500);
}

// One pin per open report: red = vulnerable, blue = normal, faded = acknowledged.
function drawMap(list) {
  if (!map) return;
  const seen = new Set();

  for (const r of list) {
    seen.add(r.id);
    const cls = `rp ${r.vul.length ? "v" : "n"}${r.status === "ack" ? " ack" : ""}`;
    const pin = pins.get(r.id);

    if (!pin) {
      const marker = L.marker([r.lat, r.lng], { icon: L.divIcon({ className: cls, iconSize: [22, 22] }) })
        .addTo(layer)
        .bindPopup(() => popupHtml(pins.get(r.id).report));
      marker.on("click", () => highlightCard(r.id));
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

  if (!fitted && list.length) {
    map.fitBounds(list.map((r) => [r.lat, r.lng]), { padding: [40, 40], maxZoom: 17 });
    fitted = true;
  }
}

// "Show on map" link on a card
function focusReport(id) {
  const pin = pins.get(Number(id));
  if (!pin || !map) return;
  $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
  map.setView([pin.report.lat, pin.report.lng], 18);
  pin.marker.openPopup();
}

// ---------- reports + evacuation centers tab ----------
async function loadReports() {
  let q = sb.from("reports").select("*, barangays(name)").neq("status", "done");
  if (scope) q = q.eq("barangay_id", scope);
  const { data, error } = await q;
  if (error || !$("#v")) return;

  const list = data.sort(byPriority);
  $("#v").innerHTML = renderList(list.filter((r) => r.vul.length), { mapLink: true });
  $("#n").innerHTML = renderList(list.filter((r) => !r.vul.length), { mapLink: true });
  drawMap(list);
  fillAddresses(list);
}

async function loadShelters() {
  let q = sb.from("shelters").select("*, barangays(name)").order("name");
  if (scope) q = q.eq("barangay_id", scope);
  const { data } = await q;
  if (!$("#sh")) return;

  const list = (data || []).sort(
    (a, b) =>
      (a.barangays?.name || "").localeCompare(b.barangays?.name || "") || a.name.localeCompare(b.name),
  );
  // Super admin can edit every center. The barangay name is hidden when one barangay is selected.
  $("#sh").innerHTML =
    list.map((s) => shelterCard(s, { canEdit: true, showWhere: !scope })).join("") ||
    "<p>No evacuation centers yet.</p>";
}

// ---------- overview tab (one card per barangay) ----------
function overviewCard(t) {
  const pct = t.cap ? Math.min(100, Math.round((t.occ / t.cap) * 100)) : 0;
  const barColor = pct >= 90 ? "#e0312b" : pct >= 70 ? "#c77700" : "#1b8a5a";
  const evac = t.centers
    ? `<p>Evacuation: ${t.occ} of ${t.cap} (${pct}%) · ${t.centers} center${t.centers > 1 ? "s" : ""}</p>
       <div class="bar"><i style="width:${pct}%;background:${barColor}"></i></div>`
    : `<p>No evacuation center yet</p>`;
  return `
    <div class="card">
      <div class="row"><b>${esc(t.name)}</b><span class="tag ${t.vul ? "v" : ""}">${t.open} open</span></div>
      <p>${t.vul} vulnerable · ${t.fresh} new · ${t.open - t.fresh} acknowledged</p>
      ${evac}
      <p>Admins: ${t.admins.length ? esc(t.admins.join(", ")) : "none yet"}</p>
      <div class="acts"><button class="btn sec" data-view="${t.id}">View reports</button></div>
    </div>`;
}

async function loadOverview() {
  const [b, r, s, a] = await Promise.all([
    sb.from("barangays").select("id,name").order("name"),
    sb.from("reports").select("barangay_id,status,vul").neq("status", "done"),
    sb.from("shelters").select("barangay_id,capacity,occupied"),
    sb.from("admins").select("barangay_id,full_name,role"),
  ]);
  if (!$("#ovg")) return;

  const stats = new Map(
    (b.data || []).map((x) => [
      x.id,
      { id: x.id, name: x.name, open: 0, fresh: 0, vul: 0, cap: 0, occ: 0, centers: 0, admins: [] },
    ]),
  );
  for (const x of r.data || []) {
    const t = stats.get(x.barangay_id);
    if (!t) continue;
    t.open++;
    if (x.status === "new") t.fresh++;
    if (x.vul.length) t.vul++;
  }
  for (const x of s.data || []) {
    const t = stats.get(x.barangay_id);
    if (!t) continue;
    t.centers++;
    t.cap += x.capacity;
    t.occ += x.occupied;
  }
  for (const x of a.data || []) {
    if (x.role === "barangay_admin") stats.get(x.barangay_id)?.admins.push(x.full_name || "Unnamed admin");
  }

  // Barangays that need attention first: most vulnerable open reports, then most open reports
  const rows = [...stats.values()].sort(
    (p, q) => q.vul - p.vul || q.open - p.open || p.name.localeCompare(q.name),
  );
  const sum = (key) => rows.reduce((n, t) => n + t[key], 0);
  $("#ovsum").textContent =
    `${rows.length} barangays · ${sum("open")} open reports (${sum("vul")} vulnerable) · ` +
    `evacuation centers: ${sum("occ")} of ${sum("cap")} occupied`;
  $("#ovg").innerHTML = rows.map(overviewCard).join("");
}

// ---------- tabs ----------
const load = () => (tab === "ov" ? loadOverview() : Promise.all([loadReports(), loadShelters()]));

async function setTab(name) {
  tab = name;
  $("#ov").hidden = name !== "ov";
  $("#main").hidden = name === "ov";
  $("#tab-ov").className = name === "ov" ? "btn" : "btn sec";
  $("#tab-rp").className = name === "rp" ? "btn" : "btn sec";
  if (name === "rp") {
    fitted = false; // re-fit to the reports once the map is visible again
    await ensureMap();
  }
  return load();
}

// ---------- actions ----------
async function fillBarangayLists() {
  const { data } = await sb.from("barangays").select("id,name").order("name");
  const options = (data || []).map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
  $("#bf").innerHTML = `<option value="">All barangays</option>` + options;
  $("#bf").value = "";
  $("#sb").innerHTML = options;
}

async function addShelter() {
  const name = $("#sn").value.trim();
  const barangay_id = Number($("#sb").value);
  const capacity = Number($("#sc").value);

  if (!name || !barangay_id || !Number.isInteger(capacity) || capacity < 1) {
    $("#serr").textContent = "Enter a name, a barangay and a capacity of at least 1.";
    return;
  }

  const { error } = await sb.from("shelters").insert({ name, barangay_id, capacity });
  $("#serr").textContent = error ? error.message : "";
  if (error) return;

  $("#sn").value = "";
  $("#sc").value = "";
  load();
}

// ---------- start / stop ----------
export async function start() {
  styleLink = await loadStylesheet("/css/super-admin-dashboard.css");

  $("#app").innerHTML = LAYOUT;
  tab = "ov";
  scope = null;
  fitted = false;

  abort = new AbortController();
  const { signal } = abort;

  $("#tab-ov").onclick = () => setTab("ov");
  $("#tab-rp").onclick = () => setTab("rp");
  $("#sadd").onclick = addShelter;
  $("#bf").onchange = (e) => {
    scope = e.target.value ? Number(e.target.value) : null;
    fitted = false; // re-fit the map to the chosen barangay's reports
    load();
  };

  // Acknowledge / Rescued / Update buttons (shared with the barangay screen)
  bindActions(load, signal);

  // Buttons that only exist on this screen
  document.addEventListener(
    "click",
    (e) => {
      const focusLink = e.target.closest("[data-focus]");
      if (focusLink) {
        e.preventDefault();
        return focusReport(focusLink.dataset.focus);
      }

      // "View reports" on a barangay card in the overview
      const viewBtn = e.target.closest("[data-view]");
      if (viewBtn) {
        scope = Number(viewBtn.dataset.view);
        $("#bf").value = String(scope);
        return setTab("rp");
      }
    },
    { signal },
  );

  await fillBarangayLists();
  await setTab("ov");
  stopWatching = watch(load);
}

export function stop() {
  abort?.abort();
  stopWatching?.();
  abort = stopWatching = null;

  map?.remove();
  map = layer = null;
  pins.clear();

  styleLink?.remove();
  styleLink = null;
  $("#app").innerHTML = "";
}