// Barangay admin > Evacuation centers.
import { bindActions, esc, fetchShelters, isEditing, shelterCard } from "../shared.js";

export async function mountCenters(el, ctx) {
  const abort = new AbortController();
  let alive = true;

  el.innerHTML = `
    <h3>${esc(ctx.barangayName)}</h3>
    <div id="mine"></div>
    <h3 style="margin-top:22px">Other barangays <span class="count">view only</span></h3>
    <div id="others"></div>`;

  async function load() {
    const all = await fetchShelters();
    if (!alive || !all) return;
    if (isEditing(el)) return; // do not wipe a number the admin is typing

    const byName = (a, b) =>
      (a.barangays?.name || "").localeCompare(b.barangays?.name || "") || a.name.localeCompare(b.name);
    const mine = all.filter((s) => s.barangay_id === ctx.barangayId);
    const others = all.filter((s) => s.barangay_id !== ctx.barangayId).sort(byName);

    el.querySelector("#mine").innerHTML =
      mine.map((s) => shelterCard(s, { canEdit: true, showWhere: false })).join("") ||
      '<p class="empty">No evacuation center is assigned to your barangay yet. Ask the city DRRMO to add one.</p>';
    el.querySelector("#others").innerHTML =
      others.map((s) => shelterCard(s, { canEdit: false, showWhere: true })).join("") ||
      '<p class="empty">No other evacuation centers yet.</p>';
  }

  bindActions(load, abort.signal); // the Update buttons
  await load();

  return {
    refresh: load,
    stop() {
      alive = false;
      abort.abort();
    },
  };
}
