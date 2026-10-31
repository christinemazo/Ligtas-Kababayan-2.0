// Rescued history, shared by both roles. barangayId = null shows every barangay (super admin).
import { sb } from "./api.js";
import { LEVEL, esc } from "./shared.js";

const took = (r) => {
  if (!r.status_at) return "";
  const m = Math.max(0, Math.round((new Date(r.status_at) - new Date(r.created_at)) / 60000));
  return ` · took ${m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`}`;
};

export async function mountHistory(el, { barangayId = null } = {}) {
  let alive = true;
  el.innerHTML = `<p class="hint">Reports marked Rescued, newest first (last 200).</p>
    <div class="card" id="rows"></div>`;

  async function load() {
    let q = sb.from("reports").select("*, barangays(name)").eq("status", "done")
      .order("status_at", { ascending: false, nullsFirst: false }).limit(200);
    if (barangayId) q = q.eq("barangay_id", barangayId);
    const { data, error } = await q;
    if (!alive || error) return;
    el.querySelector("#rows").innerHTML =
      data.map((r) => `
        <div class="mini">
          <div><b>${esc(r.code)}</b> <span class="tag ${r.level >= 4 ? "v" : ""}">${LEVEL[r.level]}</span>
            ${r.vul.length ? '<span class="tag v">Vulnerable</span>' : ""}
            <br><small style="text-align:left">${esc(r.barangays?.name)} · ${esc(r.address || "")}</small></div>
          <small>${new Date(r.status_at || r.created_at).toLocaleString()}${took(r)}</small>
        </div>`).join("") || '<p class="empty">No rescued reports yet.</p>';
  }

  await load();
  return { refresh: load, stop() { alive = false; } };
}
