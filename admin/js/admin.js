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
      <p>${isSuper ? `<a href="#" data-focus="${r.id}">Show on map</a> · ` : ""}<a target="_blank" rel="noopener" href="${mapUrl}">Open in Google Maps</a> · ${coords(r)}</p>
      <div class="acts">
        ${ackButton}
        <button class="btn" data-id="${r.id}" data-s="done">Rescued</button>
      </div>
    </div>`;
}

function shelterCard(s) {
  // Everyone can see every center; only that barangay's admins (and the super admin) can edit.
  const canEdit = isSuper || s.barangay_id === myBarangay;
  const where =
    isSuper && scope
      ? ""
      : `<p style="margin:0;font-size:13px">${esc(s.barangays?.name)}${canEdit ? "" : " · view only"}</p>`;
  const right = canEdit
    ? `<span>
        Occupied
        <input type="number" min="0" max="${s.capacity}" value="${s.occupied}" id="oc${s.id}">
        of ${s.capacity}
        <button class="btn sec" style="width:auto;padding:8px 12px" data-shelter="${s.id}">Update</button>
      </span>`
    : `<span>Occupied <b>${s.occupied}</b> of ${s.capacity}</span>`;
  return `
    <div class="card row sh">
      <div><b>${esc(s.name)}</b>${where}</div>
      ${right}
    </div>`;
}

const renderList = (reports) => reports.map(reportCard).join("") || "<p>No reports.</p>";

// ---------- data ----------
let isSuper = false; // true for the city-wide (super admin) account
let myBarangay = null; // barangay of a barangay admin (null for the super admin)
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
  if (isSuper && scope) q = q.eq("barangay_id", scope); // barangay admins see every center
  const { data } = await q;
  const list = (data || []).sort(
    (a, b) =>
      (b.barangay_id === myBarangay) - (a.barangay_id === myBarangay) || // own barangay first
      (a.barangays?.name || "").localeCompare(b.barangays?.name || "") ||
      a.name.localeCompare(b.name),
  );
  $("#sh").innerHTML = list.map(shelterCard).join("") || "<p>No evacuation centers yet.</p>";
}

// ---------- super admin overview (one card per barangay) ----------
let tab = "rp"; // "ov" = barangay overview (super admin), "rp" = reports and evacuation centers

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

const load = () =>
  isSuper && tab === "ov" ? loadOverview() : Promise.all([loadReports(), loadShelters()]);

function setTab(name) {
  tab = name;
  $("#tabs").hidden = !isSuper;
  $("#ov").hidden = !(isSuper && name === "ov");
  $("#main").hidden = isSuper && name === "ov";
  $("#tab-ov").className = name === "ov" ? "btn" : "btn sec";
  $("#tab-rp").className = name === "rp" ? "btn" : "btn sec";
  if (name === "rp") {
    map?.invalidateSize();
    fitted = false; // re-fit to the reports once it is visible again
  }
  return load();
}

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
async function setupFilter() {
  const sel = $("#bf");
  sel.hidden = !isSuper;
  $("#addsh").hidden = !isSuper; 
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
  fitted = false;

  const { data: me } = await sb
    .from("admins")
    .select("role, barangay_id, barangays(name)")
    .eq("user_id", session.user.id)
    .maybeSingle();

  isSuper = me?.role === "super_admin";
  myBarangay = me?.barangay_id ?? null;
  $("#mapwrap").hidden = !isSuper; 
  if (isSuper) ensureMap();
  scope = isSuper ? null : (me?.barangay_id ?? null);
  $("#who").textContent = !me
    ? "Not set up as an admin yet"
    : isSuper
      ? "All barangays dashboard"
      : `${me.barangays?.name} dashboard`;
  await setupFilter();

  await setTab(isSuper ? "ov" : "rp");
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

// Super admin only. 
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
$("#tab-ov").onclick = () => setTab("ov");
$("#tab-rp").onclick = () => setTab("rp");
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

  // "View reports" on a barangay card in the overview
  const viewBtn = e.target.closest("[data-view]");
  if (viewBtn) {
    scope = Number(viewBtn.dataset.view);
    $("#bf").value = String(scope);
    return setTab("rp");
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