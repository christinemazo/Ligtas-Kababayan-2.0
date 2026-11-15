// Loads barangay boundaries from a GeoJSON file into Supabase (through the import_barangays function).

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const municipality = flag('municipality');
const nameKey = flag('name') || 'name';
const codeKey = flag('code') || null;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!file || !municipality) {
  console.error('Usage: node scripts/import-barangays.mjs <file.geojson> --municipality "Name" [--name KEY] [--code KEY]');
  process.exit(1);
}
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first (see the top of this file).');
  process.exit(1);
}

let geojson;
try {
  geojson = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`Could not read ${file}: ${e.message}`);
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await sb.rpc('import_barangays', {
  p_geojson: geojson,
  p_municipality: municipality,
  p_name_key: nameKey,
  p_code_key: codeKey,
});

if (error) {
  console.error('Import failed:', error.message);
  process.exit(1);
}
console.log(`Loaded ${data} barangays from ${file}`);
