// device.js: a random id made once per phone and kept in phone storage.
// The server uses it to limit how many SOS one phone can send. It is not a login and holds no personal data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'lk_device';
let cached = null;

export async function getDeviceId() {
  if (cached) return cached;
  let id = null;
  try {
    id = await AsyncStorage.getItem(KEY);
  } catch {
    // storage unavailable: fall through and make a temporary id
  }
  if (!id) {
    id = Crypto.randomUUID();
    try {
      await AsyncStorage.setItem(KEY, id);
    } catch {
      // not saved; a new id is made next time the app opens
    }
  }
  cached = id;
  return id;
}
