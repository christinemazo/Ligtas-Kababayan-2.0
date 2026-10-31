// Barangay admin > Reports: the Vulnerable and Normal queues of THIS barangay.
import { bindActions, fetchOpenReports, fillAddresses, queuesHtml } from "../shared.js";

export async function mountReports(el, ctx) {
  const abort = new AbortController();
  let alive = true;

  el.innerHTML = `
    <p class="hint">Vulnerable queue first. Each list is sorted by water level. New reports appear instantly.</p>
    <div id="queues"></div>`;

  async function load() {
    const list = await fetchOpenReports({ barangayId: ctx.barangayId });
    if (!alive || !list) return;
    el.querySelector("#queues").innerHTML = queuesHtml(list);
    fillAddresses(list);
  }

  bindActions(load, abort.signal); // Acknowledge / Rescued buttons
  await load();

  return {
    refresh: load,
    stop() {
      alive = false;
      abort.abort();
    },
  };
}
