// Admin dashboard: Supabase Auth login, Row Level Security limits data to the
// admin's barangay, Realtime pushes new SOS, and the sender's street address is
// looked up from their GPS point (OpenStreetMap Nominatim) and saved on the report.
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
// Nominatim is free but allows at most 1 request per second, so lookups run one at a time.
// An address is saved on the report (reports.address) so it is only looked up once.
const addrCache = new Map(); // report id -> address text found in this session
const addrFailed = new Map(); // report id -> time of the last failed lookup
const addrPending = new Set(); // report ids being looked up right now
let geoChain = Promise.resolve();

const RETRY_AFTER_MS = 5 * 60 * 1000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const coords = (r) => `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`;

// "Capoocan Old Road, Brgy. Capoocan, Calbayog City"
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

// ---------- templates ----------
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
    <div class="card">
      <div class="row">
        <b>${esc(r.code)}</b>
        <span class="tag ${r.level >= 4 ? "v" : ""}">${LEVEL[r.level]}</span>
      </div>
      <p>${esc(r.barangays?.name)} · ${time}${head}</p>
      <p style="color:var(--tx)"><b>Address:</b> <span id="ad${r.id}">${esc(addrLabel(r))}</span></p>
      ${vulnerable}
      <p>${esc(r.name)} ${esc(r.phone)} ${esc(r.descr)}</p>
      <p><a target="_blank" rel="noopener" href="${mapUrl}">Open in Google Maps</a> · ${coords(r)}</p>
      <div class="acts">
        ${ackButton}
        <button class="btn" data-id="${r.id}" data-s="done">Rescued</button>
      </div>
    </div>`;
}

function shelterCard(s) {
  return `
    <div class="card row sh">
      <b>${esc(s.name)}</b>
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
// Vulnerable first, then highest water level, then oldest first.
const byPriority = (a, b) =>
  (b.vul.length > 0) - (a.vul.length > 0) ||
  b.level - a.level ||
  a.created_at.localeCompare(b.created_at);

async function loadReports() {
  const { data, error } = await sb
    .from("reports")
    .select("*, barangays(name)")
    .neq("status", "done");
  if (error) return;

  const list = data.sort(byPriority);
  $("#v").innerHTML = renderList(list.filter((r) => r.vul.length));
  $("#n").innerHTML = renderList(list.filter((r) => !r.vul.length));
  fillAddresses(list);
}

async function loadShelters() {
  const { data } = await sb.from("shelters").select("*").order("name");
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
async function show() {
  const {
    data: { session },
  } = await sb.auth.getSession();

  $("#login").hidden = !!session;
  $("#dash").hidden = !session;
  if (!session) return;

  const { data: me } = await sb.from("admins").select("barangays(name)").maybeSingle();
  $("#who").textContent = me ? `${me.barangays?.name} dashboard` : "Not set up as an admin yet";

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

// ---------- events ----------
$("#go").onclick = signIn;
$("#out").onclick = signOut;

document.addEventListener("click", (e) => {
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
