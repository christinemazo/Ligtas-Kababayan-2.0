// Offline queue: an SOS that could not be sent is saved on the phone and retried.
// The same clientId is never duplicated by the server, so retrying is always safe.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { submitReport } from './api';

const KEY = 'lk_queue';
const getQ = async () => JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
const setQ = (q) => AsyncStorage.setItem(KEY, JSON.stringify(q));

export const enqueue = async (r) => setQ([...(await getQ()), r]);
export const updateQueued = async (clientId, patch) =>
  setQ((await getQ()).map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));

let busy = false;

// onSent(report, result): a saved SOS finally went through.
// onDrop(report, error): the server permanently rejected it (e.g. outside_area).
export async function flush(onSent, onDrop) {
  if (busy) return;
  busy = true;
  try {
    for (const r of await getQ()) {
      try {
        const res = await submitReport(r);
        await setQ((await getQ()).filter((x) => x.clientId !== r.clientId));
        onSent?.(r, res);
      } catch (e) {
        if (e.permanent) {
          await setQ((await getQ()).filter((x) => x.clientId !== r.clientId));
          onDrop?.(r, e);
        } else break;
      }
    }
  } finally {
    busy = false;
  }
}

// Retries every 15 s and as soon as the phone reports it is online. Returns a cleanup function.
export function startAutoFlush(onSent, onDrop) {
  const unsub = NetInfo.addEventListener((s) => {
    if (s.isConnected) flush(onSent, onDrop);
  });
  const timer = setInterval(() => flush(onSent, onDrop), 15000);
  flush(onSent, onDrop);
  return () => {
    unsub();
    clearInterval(timer);
  };
}
