// "Barangay" drop-down used on the Map, Reports and Evacuation centers pages.
import { sb } from "../api.js";
import { esc } from "../shared.js";

let cache = null;

export async function barangayList() {
  if (!cache) {
    const { data } = await sb.from("barangays").select("id,name").order("name");
    cache = data || [];
  }
  return cache;
}

export const clearBarangayCache = () => {
  cache = null;
};

// Draws the drop-down into `el`. `selected` is the current barangay id (or null for all).
export async function filterBar(el, path, selected) {
  const list = await barangayList();
  el.innerHTML = `
    <label class="filter">Barangay
      <select>
        <option value="">All barangays</option>
        ${list.map((b) => `<option value="${b.id}"${b.id === selected ? " selected" : ""}>${esc(b.name)}</option>`).join("")}
      </select>
    </label>`;
  el.querySelector("select").onchange = (e) => {
    location.hash = `#/${path}${e.target.value ? `?b=${e.target.value}` : ""}`;
  };
}
