// Super admin > Reports: every barangay, or one chosen in the drop-down (#/reports?b=<id>).
import { bindActions, fetchOpenReports, fillAddresses, queuesHtml } from "../shared.js";
import { filterBar } from "./filter.js";

export async function mountReports(el, params) {
  const scope = Number(params.get("b")) || null;
  const abort = new AbortController();
  let alive = true;

  el.innerHTML = `<div id="fbar"></div><div id="queues"></div>`;
  await filterBar(el.querySelector("#fbar"), "reports", scope);

  async function load() {
    const list = await fetchOpenReports({ barangayId: scope });
    if (!alive || !list) return;
    el.querySelector("#queues").innerHTML = queuesHtml(list, { mapLink: true });
    fillAddresses(list);
  }

  bindActions(load, abort.signal);
  await load();
  return { refresh: load, stop() { alive = false; abort.abort(); } };
}
