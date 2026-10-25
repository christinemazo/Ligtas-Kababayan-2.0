// Phone storage (survives closing the app)
import AsyncStorage from '@react-native-async-storage/async-storage';
// Tells us when the phone goes online or offline
import NetInfo from '@react-native-community/netinfo';
// The function that actually sends an SOS to the server
import { submitReport } from './api';

// Storage key where the waiting list is kept
const KEY = 'lk_queue';
// Read the saved list (stored as text, so convert it back); empty list if nothing is saved
const getQ = async () => JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
// Save the list back as text
const setQ = (q) => AsyncStorage.setItem(KEY, JSON.stringify(q));

// Add an SOS to the end of the waiting list
export const enqueue = async (r) => setQ([...(await getQ()), r]);
// Change details (name, phone, ...) of a waiting SOS so they travel with it when it is sent
export const updateQueued = async (clientId, patch) =>
  setQ((await getQ()).map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));

// A lock: true while a flush is running, so two flushes never run at the same time
let busy = false;

// onSent(report, result): a saved SOS finally went through.
export async function flush(onSent, onDrop) {
  if (busy) return; // already running, do nothing
  busy = true;
  try {
    // Try each waiting SOS in order
    for (const r of await getQ()) {
      try {
        const res = await submitReport(r);
        // Success: remove it from the waiting list, then tell the app
        await setQ((await getQ()).filter((x) => x.clientId !== r.clientId));
        onSent?.(r, res);
      } catch (e) {
        if (e.permanent) {
          // Will never work (e.g. outside the area): remove it and tell the app
          await setQ((await getQ()).filter((x) => x.clientId !== r.clientId));
          onDrop?.(r, e);
        } else break; // network problem: stop and try again later
      }
    }
  } finally {
    busy = false; // always release the lock, even after an error
  }
}

// Retries every 15 s and as soon as the phone reports it is online. Returns a cleanup function.
export function startAutoFlush(onSent, onDrop) {
  // Whenever the connection changes and the phone is online, try to send
  const unsub = NetInfo.addEventListener((s) => {
    if (s.isConnected) flush(onSent, onDrop);
  });
  // Also try every 15 seconds in case the network event was missed
  const timer = setInterval(() => flush(onSent, onDrop), 15000);
  // And try once right now (for example when the app is opened)
  flush(onSent, onDrop);
  // Cleanup: stop listening and stop the timer
  return () => {
    unsub();
    clearInterval(timer);
  };
}