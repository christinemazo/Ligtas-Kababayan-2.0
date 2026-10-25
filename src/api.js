// api.js: every call the phone app makes to the Supabase server lives here.

// 'sb' is the shared Supabase client created in supabase.js
import { sb } from './supabase';

// Turns a Supabase error into a normal JavaScript Error and throws it.
// Errors that will never succeed on retry are marked "permanent" so the queue can drop them.
function fail(error) {
  // Use the server's message, or the word 'network' if there is none
  const e = new Error(error.message || 'network');
  e.permanent = /outside_area/.test(error.message || '') || /^2[23]/.test(error.code || '');
  throw e;
}

// A weak signal can hang a request for a minute; give up after 12 s so the SOS goes to the offline queue.
const withTimeout = (p, ms = 12000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

// Sends a new SOS to the database function "submit_report" (see schema.sql).
export async function submitReport(r) {
  const { data, error } = await withTimeout(
    sb.rpc('submit_report', {
      p_client_id: r.clientId, // random ID made on the phone; stops duplicates when retrying
      p_level: r.level,        // water level 1 to 5
      p_lat: r.lat,            // latitude of the pin
      p_lng: r.lng,            // longitude of the pin
      p_name: r.name || '',    // optional fields fall back to empty values
      p_phone: r.phone || '',
      p_head: r.head || '',
      p_vul: r.vul || [],
      p_desc: r.desc || '',
    })
  );
  if (error) fail(error);                    // throws; the caller decides to retry or give up
  if (!data?.[0]) throw new Error('no_result'); // server answered but sent no row back
  return data[0]; // { report_code, report_status }
}

// Updates name, phone, people count, vulnerable groups and landmark on an existing SOS.
export async function updateDetails(clientId, d) {
  const { error } = await withTimeout(
    sb.rpc('update_report_details', {
      p_client_id: clientId, // identifies which report to change
      p_name: d.name,
      p_phone: d.phone,
      p_head: d.head,
      p_vul: d.vul,
      p_desc: d.desc,
    })
  );
  if (error) fail(error);
}

// Asks the server for the current status of the SOS: 'new', 'ack' or 'done'.
export async function getStatus(clientId) {
  const { data, error } = await withTimeout(sb.rpc('get_report_status', { p_client_id: clientId }));
  if (error) fail(error);
  return data;
}

// Loads the list of evacuation centers (everyone is allowed to read these).
export async function getShelters() {
  const { data, error } = await withTimeout(
    // 'barangays(name)' joins the barangay table so we also get the barangay's name
    sb.from('shelters').select('id,name,capacity,occupied,updated_at,barangays(name)').order('name')
  );
  if (error) fail(error);
  // Reshape each row into the simple object the Shelters screen uses
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    barangay: s.barangays?.name || '', // empty text if the shelter has no barangay
    capacity: s.capacity,
    occupied: s.occupied,
    updated: s.updated_at,
  }));
}