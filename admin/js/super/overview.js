// Super admin > City overview: city-wide numbers and the barangays that need attention.
import { barChart, donut, esc, levelBars, num, pct, statCard } from "../shared.js";
import { loadBarangayStats } from "./stats.js";

export async function mountOverview(el) {
  let alive = true;
  el.innerHTML = `
    <div class="stats" id="stats"></div>
    <div class="panels">
      <div class="card"><h3>Reports by water level</h3><div id="levels"></div></div>
      <div class="card"><h3>Evacuation capacity (city)</h3><div id="evac"></div></div>
    </div>
    <div class="card">
      <div class="row"><h3>Barangays needing attention</h3><a href="#/barangays">All barangays →</a></div>
      <div id="top"></div>
    </div>`;
  const q = (s) => el.querySelector(s);

  async function load() {
    const d = await loadBarangayStats();
    if (!alive || !d) return;
    const t = d.totals;

    q("#stats").innerHTML =
      statCard({ icon: "🚨", tone: "blue", value: num(t.open), label: "Open reports" }) +
      statCard({ icon: "⚠️", tone: "red", value: num(t.vul), label: "With vulnerable people" }) +
      statCard({ icon: "🔔", tone: "amber", value: num(t.fresh), label: "Not yet acknowledged" }) +
      statCard({ icon: "📍", tone: "purple", value: `${t.withReports} of ${t.barangays}`, label: "Barangays with reports" });

    q("#levels").innerHTML = barChart(levelBars(t.levels));
    q("#evac").innerHTML = t.centers
      ? donut(
          [
            { label: "Occupied", value: t.occ, color: "#ef4444" },
            { label: "Free", value: Math.max(0, t.cap - t.occ), color: "#22c55e" },
          ],
          { center: `${pct(t.occ, t.cap)}%`, caption: `${t.centers} centers` },
        )
      : '<p class="empty">No evacuation centers yet.</p>';

    q("#top").innerHTML =
      d.rows.filter((r) => r.open > 0).slice(0, 6).map((r) => `
        <div class="mini">
          <div><b>${esc(r.name)}</b> ${r.vul ? `<span class="tag v">${r.vul} vulnerable</span>` : ""}</div>
          <small>${r.open} open · ${r.fresh} new · <a href="#/reports?b=${r.id}">View</a></small>
        </div>`).join("") || '<p class="empty">No open reports in any barangay.</p>';
  }

  await load();
  return { refresh: load, stop() { alive = false; } };
}
