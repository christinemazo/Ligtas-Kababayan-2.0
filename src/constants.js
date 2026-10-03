export const LEVELS = [
  { k: 1, n: 'Ankle', d: 'Low risk' },
  { k: 2, n: 'Knee', d: 'Moderate risk' },
  { k: 3, n: 'Waist', d: 'High risk' },
  { k: 4, n: 'Chest / Neck', d: 'Very high risk' },
  { k: 5, n: 'Head / Submerged', d: 'Critical' },
];
export const HEADS = ['1-5', '6-10', '11-20', '20+'];
export const VULS = ['Senior', 'PWD', 'Child/Infant', 'Pregnant', 'Injured'];
export const STATUS = ['new', 'ack', 'done'];
export const STEPS = ['Sent', 'Received', 'Rescued'];

// Only used to centre the map before any location is known (Calbayog)
export const DEFAULT_CENTER = { latitude: 12.0667, longitude: 124.6044 };

// Text the user can send by SMS when there is no data connection
export const smsText = (m) => {
  const level = LEVELS[m.level - 1].n.split(' ')[0].toUpperCase();
  return `LK HELP ${level} ${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
};

// Why the server refused an SOS for good
export const failKind = (e) => (/outside_area/.test(e?.message || '') ? 'outside' : 'rejected');
