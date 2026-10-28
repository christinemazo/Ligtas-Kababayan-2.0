// Barangay admin screen
// Loaded by main.js only when the signed-in account is a barangay admin.
import { sb } from "./api.js";
import {
  $,
  renderList,
  byPriority,
  fillAddresses,
  shelterCard,
  bindActions,
  loadStylesheet,
  watch,
} from "./Shared.js";

const LAYOUT = `
  <p>Vulnerable queue first. Each list is sorted by water level. New reports appear instantly.</p>
  <div class="grid">
    <div><h3>Vulnerable queue</h3><div id="v"></div></div>
    <div><h3>Normal queue</h3><div id="n"></div></div>
  </div>
  <h3>Evacuation center occupancy</h3>
  <div id="sh"></div>`;

let myBarangay = null;
let abort = null;
let stopWatching = null;
let styleLink = null;

async function loadReports() {
  let q = sb.from("reports").select("*, barangays(name)").neq("status", "done");
  if (myBarangay) q = q.eq("barangay_id", myBarangay);
  const { data, error } = await q;
  if (error || !$("#v")) return;

  const list = data.sort(byPriority);
  $("#v").innerHTML = renderList(list.filter((r) => r.vul.length));
  $("#n").innerHTML = renderList(list.filter((r) => !r.vul.length));
  fillAddresses(list);
}

async function loadShelters() {
  // Barangay admins see every center, their own first. Only their own can be edited.
  const { data } = await sb.from("shelters").select("*, barangays(name)").order("name");
  if (!$("#sh")) return;

  const list = (data || []).sort(
    (a, b) =>
      (b.barangay_id === myBarangay) - (a.barangay_id === myBarangay) ||
      (a.barangays?.name || "").localeCompare(b.barangays?.name || "") ||
      a.name.localeCompare(b.name),
  );
  $("#sh").innerHTML =
    list
      .map((s) => shelterCard(s, { canEdit: s.barangay_id === myBarangay, showWhere: true }))
      .join("") || "<p>No evacuation centers yet.</p>";
}

const load = () => Promise.all([loadReports(), loadShelters()]);

export async function start(me) {
  myBarangay = me.barangay_id ?? null;
  styleLink = await loadStylesheet("/css/barangay-dashboard.css");
  $("#app").innerHTML = LAYOUT;

  abort = new AbortController();
  bindActions(load, abort.signal);

  await load();
  stopWatching = watch(load);
}

export function stop() {
  abort?.abort();
  stopWatching?.();
  abort = stopWatching = null;
  styleLink?.remove();
  styleLink = null;
  $("#app").innerHTML = "";
}