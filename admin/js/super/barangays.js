// Super admin > Barangays: one card per barangay with its numbers, admins and shortcuts.
import { esc, num, pct } from "../shared.js";
import { loadBarangayStats } from "./stats.js";

function barangayCard(t) {
  const used = pct(t.occ, t.cap);
  const barColor = used >= 90 ? "#e0312b" : used >= 70 ? "#c77700" : "#1b8a5a";
  const evac = t.centers
    ? `<p>Evacuation: ${num(t.occ)} of ${num(t.cap)} (${used}%) · ${t.centers} center${t.centers > 1 ? "s" : ""}</p>
       <div class="bar"><i style="width:${used}%;background:${barColor}"></i></div>`
    : "<p>No evacuation center yet</p>";
  return `
    <div class="card">
      <div class="row"><b>${esc(t.name)}</b><span class="tag ${t.vul ? "v" : ""}">${t.open} open</span></div>
      <p>${t.vul} vulnerable · ${t.fresh} new · ${t.open - t.fresh} acknowledged</p>
      ${evac}
      <p>Admins: ${t.admins.length ? esc(t.admins.join(", ")) : "none yet"}</p>
      <div class="acts">
        <a class="btn sec" href="#/reports?b=${t.id}">Reports</a>
        <a class="btn sec" href="#/centers?b=${t.id}">Centers</a>
      </div>
    </div>`;
}

export async function mountBarangays(el) {
  const q = (selector) => el.querySelector(selector);
  let alive = true;
  let data = null;

  el.innerHTML = `
    <div class="toolbar">
      <input id="search" type="search" placeholder="Search barangay…">
      <span class="hint" id="sum" style="margin:0"></span>
    </div>
    <div class="grid3" id="cards"></div>`;

  function draw() {
    if (!data) return;
    const term = q("#search").value.trim().toLowerCase();
    const rows = data.rows.filter((t) => t.name.toLowerCase().includes(term));
    q("#cards").innerHTML = rows.map(barangayCard).join("") || '<p class="empty">No barangay matches.</p>';
  }

  async function load() {
    data = await loadBarangayStats();
    if (!alive || !data) return;
    const t = data.totals;
    q("#sum").textContent = `${num(t.barangays)} barangays · ${num(t.open)} open reports · ${num(t.vul)} vulnerable`;
    draw();
  }

  q("#search").oninput = draw;
  await load();

  return {
    refresh: load, // the search box is outside #cards, so a refresh never wipes what was typed
    stop() {
      alive = false;
    },
  };
}
