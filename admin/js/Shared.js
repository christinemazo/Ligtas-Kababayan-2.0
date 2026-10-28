// Code that BOTH roles use: helpers, address lookup, report/shelter cards, status actions, realtime.
// Nothing in here may know which role is running. Role differences are passed in as options.
import { sb } from "./api.js";

// ---------- helpers ----------
export const $ = (selector) => document.querySelector(selector);

export const LEVEL = ["", "Ankle", "Knee", "Waist", "Chest / Neck", "Head / Submerged"];

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ESCAPES[c]);

export const coords = (r) => `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`;

// Adds a <link> for a role's stylesheet and resolves once it has loaded (or failed), so the
// screen never flashes unstyled. The caller removes the returned element on stop().
export function loadStylesheet(href) {
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = link.onerror = () => resolve(link);
    document.head.append(link);
  });
}

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

export function addrLabel(r) {
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
export function fillAddresses(reports) {
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

// ---------- report cards ----------
// Vulnerable first, then highest water level, then oldest first.
export const byPriority = (a, b) =>
  (b.vul.length > 0) - (a.vul.length > 0) ||
  b.level - a.level ||
  a.created_at.localeCompare(b.created_at);

// options.mapLink: show the "Show on map" link (only the super admin screen has a map)
export function reportCard(r, { mapLink = false } = {}) {
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
      <p>${mapLink ? `<a href="#" data-focus="${r.id}">Show on map</a> · ` : ""}<a target="_blank" rel="noopener" href="${mapUrl}">Open in Google Maps</a> · ${coords(r)}</p>
      <div class="acts">
        ${ackButton}
        <button class="btn" data-id="${r.id}" data-s="done">Rescued</button>
      </div>
    </div>`;
}

export const renderList = (reports, options) =>
  reports.map((r) => reportCard(r, options)).join("") || "<p>No reports.</p>";

// ---------- shelter cards ----------
// options.canEdit:   show the occupancy input + Update button
// options.showWhere: show the barangay name under the center name
export function shelterCard(s, { canEdit, showWhere }) {
  const where = showWhere
    ? `<p style="margin:0;font-size:13px">${esc(s.barangays?.name)}${canEdit ? "" : " · view only"}</p>`
    : "";
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

// ---------- actions both roles have ----------
async function setReportStatus(id, status) {
  await sb.from("reports").update({ status }).eq("id", id);
}

async function updateShelter(id) {
  await sb
    .from("shelters")
    .update({
      occupied: +$(`#oc${id}`).value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

// Handles the Acknowledge / Rescued / Update buttons, then calls reload().
// Pass an AbortSignal so the listener is removed when the role screen is closed.
export function bindActions(reload, signal) {
  document.addEventListener(
    "click",
    async (e) => {
      const reportBtn = e.target.closest("[data-id]");
      if (reportBtn) {
        await setReportStatus(reportBtn.dataset.id, reportBtn.dataset.s);
        return reload();
      }

      const shelterBtn = e.target.closest("[data-shelter]");
      if (shelterBtn) {
        await updateShelter(shelterBtn.dataset.shelter);
        return reload();
      }
    },
    { signal },
  );
}

// ---------- realtime ----------
// Reloads on new/changed reports, beeps on new ones, and refreshes every 30 s in case realtime drops.
// Returns a function that stops everything.
export function watch(reload) {
  const channel = sb
    .channel("reports")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, () => {
      beep();
      reload();
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reports" }, () => reload())
    .subscribe();
  const timer = setInterval(reload, 30000);

  return () => {
    sb.removeChannel(channel);
    clearInterval(timer);
  };
}