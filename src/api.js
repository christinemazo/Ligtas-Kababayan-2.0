import { sb } from './supabase';

// Errors that will never succeed on retry are marked permanent so the queue can drop them.
function fail(error) {
  const e = new Error(error.message || 'network');
  e.permanent = /outside_area/.test(error.message || '') || /^2[23]/.test(error.code || '');
  throw e;
}

// A weak signal can hang a request for a minute; give up after 12 s so the SOS goes to the offline queue.
const withTimeout = (p, ms = 12000) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

export async function submitReport(r) {
  const { data, error } = await withTimeout(
    sb.rpc('submit_report', {
      p_client_id: r.clientId,
      p_level: r.level,
      p_lat: r.lat,
      p_lng: r.lng,
      p_name: r.name || '',
      p_phone: r.phone || '',
      p_head: r.head || '',
      p_vul: r.vul || [],
      p_desc: r.desc || '',
    })
  );
  if (error) fail(error);
  if (!data?.[0]) throw new Error('no_result');
  return data[0]; // { report_code, report_status }
}

export async function updateDetails(clientId, d) {
  const { error } = await withTimeout(
    sb.rpc('update_report_details', {
      p_client_id: clientId,
      p_name: d.name,
      p_phone: d.phone,
      p_head: d.head,
      p_vul: d.vul,
      p_desc: d.desc,
    })
  );
  if (error) fail(error);
}

export async function getStatus(clientId) {
  const { data, error } = await withTimeout(sb.rpc('get_report_status', { p_client_id: clientId }));
  if (error) fail(error);
  return data;
}

export async function getShelters() {
  const { data, error } = await withTimeout(
    sb.from('shelters').select('id,name,capacity,occupied,updated_at,barangays(name)').order('name')
  );
  if (error) fail(error);
  return data.map((s) => ({
    id: s.id,
    name: s.name,
    barangay: s.barangays?.name || '',
    capacity: s.capacity,
    occupied: s.occupied,
    updated: s.updated_at,
  }));
}
