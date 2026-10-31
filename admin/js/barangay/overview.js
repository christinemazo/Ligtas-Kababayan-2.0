// Barangay admin > Overview: numbers for THIS barangay only.
import {
  byPriority,
  barChart,
  donut,
  esc,
  fetchOpenReports,
  fetchShelters,
  levelBars,
  miniRow,
  num,
  pct,
  statCard,
  total,
} from "../shared.js";

export async function mountOverview(el, ctx) {
  const q = (selector) => el.querySelector(selector);
  let alive = true;

  el.innerHTML = `
    <div class="stats" id="stats"></div>
    <div class="panels">
      <div class="card"><h3>Reports by water level</h3><div id="levels"></div></div>
      <div class="card"><h3>Evacuation centers</h3><div id="evac"></div></div>
    </div>
    <div class="card">
      <div class="row"><h3>Most urgent reports</h3><a href="#/reports">Open all reports →</a></div>
      <div id="urgent"></div>
    </div>`;

  async function load() {
    const [reports, shelters] = await Promise.all([
      fetchOpenReports({ barangayId: ctx.barangayId }),
      fetchShelters({ barangayId: ctx.barangayId }),
    ]);
    if (!alive || !reports || !shelters) return;

    const vulnerable = reports.filter((r) => r.vul.length).length;
    const fresh = reports.filter((r) => r.status === "new").length;
    const cap = total(shelters, "capacity");
    const occ = total(shelters, "occupied");

    q("#stats").innerHTML =
      statCard({ icon: "🚨", tone: "blue", value: reports.length, label: "Open reports" }) +
      statCard({ icon: "⚠️", tone: "red", value: vulnerable, label: "With vulnerable people" }) +
      statCard({ icon: "🔔", tone: "amber", value: fresh, label: "Not yet acknowledged" }) +
      statCard({ icon: "✅", tone: "green", value: reports.length - fresh, label: "Acknowledged" });

    const counts = [1, 2, 3, 4, 5].map((l) => reports.filter((r) => r.level === l).length);
    q("#levels").innerHTML = barChart(levelBars(counts));

    q("#evac").innerHTML = shelters.length
      ? donut(
          [
            { label: "Occupied", value: occ, color: "#ef4444" },
            { label: "Free", value: Math.max(0, cap - occ), color: "#22c55e" },
          ],
          { center: `${pct(occ, cap)}%`, caption: "occupied" },
        ) +
        shelters
          .map((s) => `<div class="mini"><b>${esc(s.name)}</b><small>${num(s.occupied)} of ${num(s.capacity)}</small></div>`)
          .join("")
      : '<p class="empty">No evacuation center is assigned to your barangay yet. Ask the city DRRMO to add one.</p>';

    q("#urgent").innerHTML =
      [...reports].sort(byPriority).slice(0, 5).map(miniRow).join("") ||
      '<p class="empty">No open reports in your barangay right now.</p>';
  }

  await load();
  return {
    refresh: load,
    stop() {
      alive = false;
    },
  };
}
