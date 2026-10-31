// City-wide numbers, one row per barangay. Used by the Overview and Barangays pages.
import { sb } from "../api.js";

export async function loadBarangayStats() {
  const [b, r, s, a] = await Promise.all([
    sb.from("barangays").select("id,name").order("name"),
    sb.from("reports").select("barangay_id,status,vul,level").neq("status", "done"),
    sb.from("shelters").select("barangay_id,capacity,occupied"),
    sb.from("admins").select("barangay_id,full_name,role"),
  ]);
  if (b.error) return null;

  const stats = new Map(
    (b.data || []).map((x) => [
      x.id,
      { id: x.id, name: x.name, open: 0, fresh: 0, vul: 0, cap: 0, occ: 0, centers: 0, admins: [] },
    ]),
  );
  for (const x of r.data || []) {
    const t = stats.get(x.barangay_id);
    if (!t) continue;
    t.open++;
    if (x.status === "new") t.fresh++;
    if (x.vul.length) t.vul++;
  }
  for (const x of s.data || []) {
    const t = stats.get(x.barangay_id);
    if (!t) continue;
    t.centers++;
    t.cap += x.capacity;
    t.occ += x.occupied;
  }
  for (const x of a.data || []) {
    if (x.role === "barangay_admin") stats.get(x.barangay_id)?.admins.push(x.full_name || "Unnamed admin");
  }

  // Barangays that need attention first: most vulnerable open reports, then most open reports
  const rows = [...stats.values()].sort(
    (p, q) => q.vul - p.vul || q.open - p.open || p.name.localeCompare(q.name),
  );
  const sum = (key) => rows.reduce((n, t) => n + t[key], 0);

  return {
    rows,
    totals: {
      barangays: rows.length,
      withReports: rows.filter((t) => t.open > 0).length,
      open: sum("open"),
      vul: sum("vul"),
      fresh: sum("fresh"),
      cap: sum("cap"),
      occ: sum("occ"),
      centers: sum("centers"),
      levels: [1, 2, 3, 4, 5].map((l) => (r.data || []).filter((x) => x.level === l).length),
    },
  };
}
