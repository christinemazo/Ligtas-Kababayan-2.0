// Super admin > Evacuation centers: update any center and ADD new ones.
import { sb } from "../api.js";
import { bindActions, esc, fetchShelters, isEditing, shelterCard } from "../shared.js";
import { barangayList, filterBar } from "./filter.js";

export async function mountCenters(el, params) {
  const scope = Number(params.get("b")) || null;
  const abort = new AbortController();
  let alive = true;
  const q = (s) => el.querySelector(s);

  const list = await barangayList();
  el.innerHTML = `
    <div id="fbar"></div>
    <details class="card">
      <summary><b>Add evacuation center</b></summary>
      <label for="sn">Name</label><input id="sn" type="text" maxlength="80" placeholder="e.g. Tinambacan Elementary School">
      <label for="sb">Barangay</label>
      <select id="sb">${list.map((b) => `<option value="${b.id}"${b.id === scope ? " selected" : ""}>${esc(b.name)}</option>`).join("")}</select>
      <label for="sc">Capacity (people)</label><input id="sc" type="number" min="1">
      <p id="serr" style="color:#e0312b"></p>
      <button class="btn" id="sadd" style="margin-top:8px">Add center</button>
    </details>
    <div id="list"></div>`;
  await filterBar(q("#fbar"), "centers", scope);

  async function load() {
    const data = await fetchShelters({ barangayId: scope });
    if (!alive || !data) return;
    if (isEditing(q("#list"))) return; // do not wipe a number being typed
    const sorted = [...data].sort(
      (a, b) => (a.barangays?.name || "").localeCompare(b.barangays?.name || "") || a.name.localeCompare(b.name),
    );
    q("#list").innerHTML =
      sorted.map((s) => shelterCard(s, { canEdit: true, showWhere: !scope })).join("") ||
      '<p class="empty">No evacuation centers yet.</p>';
  }

  q("#sadd").onclick = async () => {
    const name = q("#sn").value.trim();
    const barangay_id = Number(q("#sb").value);
    const capacity = Number(q("#sc").value);
    if (!name || !barangay_id || !Number.isInteger(capacity) || capacity < 1) {
      q("#serr").textContent = "Enter a name, a barangay and a capacity of at least 1.";
      return;
    }
    const { error } = await sb.from("shelters").insert({ name, barangay_id, capacity });
    q("#serr").textContent = error ? error.message : "";
    if (error) return;
    q("#sn").value = "";
    q("#sc").value = "";
    load();
  };

  bindActions(load, abort.signal);
  await load();
  return { refresh: load, stop() { alive = false; abort.abort(); } };
}
