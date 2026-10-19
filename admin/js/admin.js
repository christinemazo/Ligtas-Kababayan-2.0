import { sb } from "./api.js";

// ---------- helpers ----------
const $ = (selector) => document.querySelector(selector);

const LEVEL = ["", "Ankle", "Knee", "Waist", "Chest / Neck", "Head / Submerged"];

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ESCAPES[c]);

// TODO: use a louder alarm sound file
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio blocked until the user interacts with the page; ignore
  }
}

// ---------- address lookup ----------
// An address is saved on the report (reports.address) so it is only looked up once.
const addrCache = new Map(); // report id -> address text found in this session
const addrFailed = new Map(); // report id -> time of the last failed lookup
const addrPending = new Set(); // report ids being looked up right now
let geoChain = Promise.resolve();

const RETRY_AFTER_MS = 5 * 60 * 1000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const coords = (r) => `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`;

function formatAddress(place) {
  const a = place.address || {};
  const road = a.road || a.pedestrian || a.path || a.residential || a.footway || "";
  const brgy = a.suburb || a.village || a.neighbourhood || a.quarter || a.hamlet || "";
  const city = a.city || a.town || a.municipality || a.county || "";
  const parts = [
    road,
    brgy && `Brgy. ${brgy.replace(/^(brgy\.?|barangay)\s+/i, "")}`,
    city,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : place.display_name || "";
}

async function lookupAddress(r) {
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18" +
    `&accept-language=en&lat=${r.lat}&lon=${r.lng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("lookup failed");
  const text = formatAddress(await res.json());
  if (!text) throw new Error("no address");
  return text;
}

function addrLabel(r) {
  const known = r.address || addrCache.get(r.id);
  if (known) return known;
  const failedAt = addrFailed.get(r.id);
  if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return "Address not found. Use the map link.";
  return "Looking up address...";
}

function setAddrText(id, text) {
  const el = document.getElementById(`ad${id}`);
  if (el) el.textContent = text;
}

// Looks up every report that has no address yet, one per second, and saves each result.
function fillAddresses(reports) {
  for (const r of reports) {
    if (r.address || addrPending.has(r.id)) continue;
    const failedAt = addrFailed.get(r.id);
    if (failedAt && Date.now() - failedAt < RETRY_AFTER_MS) continue;

    addrPending.add(r.id);
    geoChain = geoChain.then(async () => {
      try {
        const text = await lookupAddress(r);
        addrCache.set(r.id, text);
        setAddrText(r.id, text);
        await sb.from("reports").update({ address: text }).eq("id", r.id);
      } catch {
        addrFailed.set(r.id, Date.now());
        setAddrText(r.id, "Address not found. Use the map link.");
      } finally {
        addrPending.delete(r.id);
        await pause(1100);
      }
    });
  }
}

// ---------- map ----------
// One pin per open report: red = vulnerable, blue = normal, faded = acknowledged.
let map, layer, fitted = false;
const pins = new Map(); // report id -> { marker, cls, report }

function ensureMap() {
  if (typeof L === "undefined") {
    // Leaflet could not load (no internet): the cards and address lines still work
    $("#map").hidden = true;
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
  map.invalidateSize(); // the map was hidden until the admin signed in
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

function reportCard(r) {
  const time = new Date(r.created_at).toLocaleTimeString();
  const head = r.head ? ` · ${esc(r.head)} people` : "";
  const vulnerable = r.vul.map((v) => `<span class="tag v">${esc(v)}</span>`).join("");
  const mapUrl = `https://www.google.com/maps?q=${r.lat},${r.lng}`;
  const ackButton =
    r.status === "new"
      ? `<button class="btn sec" data-id="${r.id}" data-s="ack">Acknowledge</button>`
      : `<span class="tag">Acknowledged</span>`;

  return `
    <div class="card" id="rc${r.id}">
      <div class="row">
        <b>${esc(r.code)}</b>
        <span class="tag ${r.level >= 4 ? "v" : ""}">${LEVEL[r.level]}</span>
      </div>
      <p>${esc(r.barangays?.name)} · ${time}${head}</p>
      <p style="color:var(--tx)"><b>Address:</b> <span id="ad${r.id}">${esc(addrLabel(r))}</span></p>
      ${vulnerable}
      <p>${esc(r.name)} ${esc(r.phone)} ${esc(r.descr)}</p>
      <p><a href="#" data-focus="${r.id}">Show on map</a> · <a target="_blank" rel="noopener" href="${mapUrl}">Open in Google Maps</a> · ${coords(r)}</p>
      <div class="acts">
        ${ackButton}
        <button class="btn" data-id="${r.id}" data-s="done">Rescued</button>
      </div>
    </div>`;
}

function shelterCard(s) {
  return `
    <div class="card row sh">
      <div>
        <b>${esc(s.name)}</b>
        ${isSuper && !scope ? `<p style="margin:0;font-size:13px">${esc(s.barangays?.name)}</p>` : ""}
      </div>
      <span>
        Occupied
        <input type="number" min="0" max="${s.capacity}" value="${s.occupied}" id="oc${s.id}">
        of ${s.capacity}
        <button class="btn sec" style="width:auto;padding:8px 12px" data-shelter="${s.id}">Update</button>
      </span>
    </div>`;
}

const renderList = (reports) => reports.map(reportCard).join("") || "<p>No reports.</p>";

// ---------- data ----------
let isSuper = false; // true for the city-wide (super admin) account
let scope = null; // barangay id being shown; null = all barangays (super admin only)

// Vulnerable first, then highest water level, then oldest first.
const byPriority = (a, b) =>
  (b.vul.length > 0) - (a.vul.length > 0) ||
  b.level - a.level ||
  a.created_at.localeCompare(b.created_at);

async function loadReports() {
  let q = sb.from("reports").select("*, barangays(name)").neq("status", "done");
  if (scope) q = q.eq("barangay_id", scope);
  const { data, error } = await q;
  if (error) return;

  const list = data.sort(byPriority);
  $("#v").innerHTML = renderList(list.filter((r) => r.vul.length));
  $("#n").innerHTML = renderList(list.filter((r) => !r.vul.length));
  drawMap(list);
  fillAddresses(list);
}

async function loadShelters() {
  let q = sb.from("shelters").select("*, barangays(name)").order("name");
  if (scope) q = q.eq("barangay_id", scope);
  const { data } = await q;
  $("#sh").innerHTML = (data || []).map(shelterCard).join("");
}

const load = () => Promise.all([loadReports(), loadShelters()]);

// ---------- realtime ----------
let channel;

function subscribeRealtime() {
  channel?.unsubscribe();
  channel = sb
    .channel("reports")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
      beep();
      load();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, load)
    .subscribe();
}

// ---------- screens ----------
// Super admin only: dropdown to look at one barangay or all of them
async function setupFilter() {
  const sel = $("#bf");
  sel.hidden = !isSuper;
  $("#addsh").hidden = !isSuper; // only the super admin can add evacuation centers
  if (!isSuper) return;
  const { data } = await sb.from("barangays").select("id,name").order("name");
  const options = (data || []).map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
  sel.innerHTML = `<option value="">All barangays</option>` + options;
  sel.value = "";
  $("#sb").innerHTML = options;
}

async function show() {
  const {
    data: { session },
  } = await sb.auth.getSession();

  $("#login").hidden = !!session;
  $("#dash").hidden = !session;
  if (!session) {
    channel?.unsubscribe();
    return;
  }
  ensureMap();
  fitted = false;

  // Read only this account's own row: admins can also read their teammates' rows,
  // so without the user_id filter maybeSingle() would fail for a barangay with 2+ admins.
  const { data: me } = await sb
    .from("admins")
    .select("role, barangay_id, barangays(name)")
    .eq("user_id", session.user.id)
    .maybeSingle();

  isSuper = me?.role === "super_admin";
  scope = isSuper ? null : (me?.barangay_id ?? null);
  $("#who").textContent = !me
    ? "Not set up as an admin yet"
    : isSuper
      ? "All barangays dashboard"
      : `${me.barangays?.name} dashboard`;
  await setupFilter();

  await load();
  subscribeRealtime();
}

// ---------- actions ----------
async function signIn() {
  const { error } = await sb.auth.signInWithPassword({
    email: $("#em").value,
    password: $("#pw").value,
  });
  $("#err").textContent = error ? error.message : "";
  if (!error) show();
}

async function signOut() {
  await sb.auth.signOut();
  show();
}

async function setReportStatus(id, status) {
  await sb.from("reports").update({ status }).eq("id", id);
  load();
}

async function updateShelter(id) {
  await sb
    .from("shelters")
    .update({
      occupied: +$(`#oc${id}`).value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  load();
}

// Super admin only. The database also refuses this insert for anyone else.
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

// ---------- events ----------
$("#go").onclick = signIn;
$("#sadd").onclick = addShelter;
$("#out").onclick = signOut;

$("#bf").onchange = (e) => {
  scope = e.target.value ? Number(e.target.value) : null;
  fitted = false; // re-fit the map to the chosen barangay's reports
  load();
};

document.addEventListener("click", (e) => {
  const focusLink = e.target.closest("[data-focus]");
  if (focusLink) {
    e.preventDefault();
    return focusReport(focusLink.dataset.focus);
  }

  const reportBtn = e.target.closest("[data-id]");
  if (reportBtn) return setReportStatus(reportBtn.dataset.id, reportBtn.dataset.s);

  const shelterBtn = e.target.closest("[data-shelter]");
  if (shelterBtn) return updateShelter(shelterBtn.dataset.shelter);
});

// ---------- start ----------
show();

// Safety refresh in case realtime drops
setInterval(() => {
  if (!$("#dash").hidden) load();
}, 30000);
