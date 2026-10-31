// BARANGAY ADMIN: works the queue of one barangay.
import { loadStylesheet } from "../shared.js";
import { startShell } from "../shell.js";
import { mountHistory } from "../history.js";
import { mountOverview } from "./overview.js";
import { mountReports } from "./reports.js";
import { mountCenters } from "./centers.js";

let styleLink = null;
let shell = null;

export async function start({ me, user, signOut }) {
  styleLink = await loadStylesheet("/css/barangay.css");
  const ctx = { barangayId: me.barangay_id, barangayName: me.barangays?.name ?? "Unknown barangay" };

  shell = await startShell({
    role: "barangay",
    roleLabel: "Barangay admin",
    scope: ctx.barangayName,
    person: me.full_name || user.email,
    signOut,
    menu: [
      { title: "Respond", items: [
        { path: "overview", label: "Overview", icon: "📊" },
        { path: "reports", label: "Reports", icon: "🚨" },
        { path: "history", label: "Rescued history", icon: "✅" },
      ] },
      { title: "Resources", items: [{ path: "centers", label: "Evacuation centers", icon: "🏫" }] },
    ],
    pages: {
      overview: { title: "Overview", mount: (el) => mountOverview(el, ctx) },
      reports: { title: "Reports", mount: (el) => mountReports(el, ctx) },
      history: { title: "Rescued history", mount: (el) => mountHistory(el, ctx) },
      centers: { title: "Evacuation centers", mount: (el) => mountCenters(el, ctx) },
    },
  });
}

export async function stop() {
  await shell?.stop();
  shell = null;
  styleLink?.remove();
  styleLink = null;
}
