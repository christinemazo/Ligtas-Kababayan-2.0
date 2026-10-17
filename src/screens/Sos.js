import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C, Note, ui } from '../ui';
import { LEVELS } from '../constants';
import MapPicker from '../MapPicker';

export default function Sos({ onBack, onSend }) {
  const [loc, setLoc] = useState(null); // { lat, lng, acc?, src: 'gps' | 'pin' | 'last known' }
  const [level, setLevel] = useState(0);
  const [denied, setDenied] = useState(false);
  const pinned = useRef(false); // true once the user placed the pin by hand
  const watcher = useRef(null);
  const alive = useRef(true);

  // Live GPS: the pin follows the phone until the user places it by hand
  const track = useCallback(async () => {
    watcher.current?.remove();
    watcher.current = null;
    pinned.current = false;

    const saved = await AsyncStorage.getItem('lk_loc');
    if (alive.current) setLoc(saved ? { ...JSON.parse(saved), src: 'last known' } : null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (!alive.current) return;
    if (status !== 'granted') {
      setDenied(true);
      return;
    }
    setDenied(false);

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 3000 },
      (p) => {
        if (pinned.current) return;
        const l = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy ?? 0), src: 'gps' };
        AsyncStorage.setItem('lk_loc', JSON.stringify(l));
        setLoc(l);
      }
    );
    if (alive.current) watcher.current = sub;
    else sub.remove();
  }, []);

  useEffect(() => {
    alive.current = true;
    track();
    return () => {
      alive.current = false;
      watcher.current?.remove();
    };
  }, [track]);

  const place = (c) => {
    pinned.current = true;
    setLoc({ lat: c.lat, lng: c.lng, src: 'pin' });
  };

  const text = !loc
    ? 'Finding your location... You can also tap the map to place a pin.'
    : `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} · ` +
      (loc.src === 'gps' ? `GPS, accurate to about ${loc.acc} m`
        : loc.src === 'pin' ? 'pin you placed'
        : 'last known location, check the pin');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingBottom: 8 }}>
        <Btn kind="sec" small title="Back" onPress={onBack} />
        <Text style={[ui.h3, { flex: 1, textAlign: 'center' }]}>Your location</Text>
        <Btn kind="sec" small title="Use my GPS" onPress={track} />
      </View>

      <View style={{ paddingHorizontal: 14 }}>
        <View style={{ height: 230, borderRadius: 12, overflow: 'hidden' }}>
          <MapPicker loc={loc} onPick={place} />
        </View>
        {denied && <Note>Location permission is off. Tap the map to place a pin where you are, or allow location in Settings.</Note>}
        <Text style={[ui.muted, { marginTop: 6 }]}>{text}</Text>
        <Text style={ui.muted}>Not exact? Drag the pin or tap the map.</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 6 }}>
        <Text style={ui.h3}>How high is the water?</Text>
        {LEVELS.map((l) => (
          <Pressable
            key={l.k}
            onPress={() => setLevel(l.k)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     borderWidth: 2, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 7,
                     borderColor: level === l.k ? C.sos : C.bd,
                     backgroundColor: level === l.k ? 'rgba(224,49,43,0.1)' : C.card }}
          >
            <Text style={{ fontWeight: '700', color: C.tx, fontSize: 16 }}>{l.n}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ padding: 14, paddingTop: 4 }}>
        <Btn kind="sos" title="SEND HELP" disabled={!level || !loc} onPress={() => onSend(level, loc)} />
      </View>
    </View>
  );
}
