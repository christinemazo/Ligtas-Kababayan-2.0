// SUPER ADMIN (city DRRMO): monitors every barangay and manages centers.
import { loadStylesheet } from "../shared.js";
import { startShell } from "../shell.js";
import { mountHistory } from "../history.js";
import { mountOverview } from "./overview.js";
import { mountMap } from "./map.js";
import { mountReports } from "./reports.js";
import { mountCenters } from "./centers.js";
import { mountBarangays } from "./barangays.js";

let styleLink = null;
let shell = null;

export async function start({ me, user, signOut }) {
  styleLink = await loadStylesheet("/css/super.css");

  shell = await startShell({
    role: "super",
    roleLabel: "City DRRMO",
    scope: "All barangays",
    person: me.full_name || user.email,
    signOut,
    menu: [
      { title: "Monitor", items: [
        { path: "overview", label: "City overview", icon: "📊" },
        { path: "map", label: "Live map", icon: "🗺️" },
        { path: "reports", label: "Reports", icon: "🚨" },
        { path: "history", label: "Rescued history", icon: "✅" },
      ] },
      { title: "Manage", items: [
        { path: "centers", label: "Evacuation centers", icon: "🏫" },
        { path: "barangays", label: "Barangays", icon: "📍" },
      ] },
    ],
    pages: {
      overview: { title: "City overview", mount: (el) => mountOverview(el) },
      map: { title: "Live map", mount: (el, params) => mountMap(el, null, params) },
      reports: { title: "Reports", mount: (el, params) => mountReports(el, params) },
      history: { title: "Rescued history", mount: (el) => mountHistory(el) },
      centers: { title: "Evacuation centers", mount: (el, params) => mountCenters(el, params) },
      barangays: { title: "Barangays", mount: (el) => mountBarangays(el) },
    },
  });
}

export async function stop() {
  await shell?.stop();
  shell = null;
  styleLink?.remove();
  styleLink = null;
}
