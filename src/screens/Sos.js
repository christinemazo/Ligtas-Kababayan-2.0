import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C, Note, ui } from '../ui';
import { LEVELS } from '../constants';
import MapPicker from '../MapPicker';

// Address search favours results inside this box around Calbayog (left, top, right, bottom)
const VIEWBOX = '124.40,12.30,124.85,11.85';
const UA = { 'User-Agent': 'LigtasKababayan/0.2 (school project)' };
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const shortName = (p) => p.display_name.split(', ').slice(0, 4).join(', ');

// Metres between two points (good enough for "did the pin move?")
const metres = (a, b) =>
  Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180));

// "Capoocan, Calbayog City, Samar" for the bar at the top
async function reverseName(l) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=16&accept-language=en&lat=${l.lat}&lon=${l.lng}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error('reverse failed');
  const a = (await res.json()).address || {};
  const brgy = a.suburb || a.village || a.neighbourhood || a.quarter || a.hamlet || '';
  const city = a.city || a.town || a.municipality || '';
  const area = a.county || a.state_district || a.state || '';
  const name = [brgy, city, area].filter(Boolean).join(', ');
  if (!name) throw new Error('no name');
  return name;
}

// Target icon (ring + dot), drawn with Views so no icon package is needed
const TargetIcon = () => (
  <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 3, borderColor: C.pri,
                 alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.pri }} />
  </View>
);

export default function Sos({ onBack, onSend }) {
  const [loc, setLoc] = useState(null); // { lat, lng, acc?, label?, pan?, src: 'gps' | 'pin' | 'last known' }
  const [level, setLevel] = useState(0);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState(''); // text in the bar: the current place name, or what the user is typing
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState('');
  const pinned = useRef(false); // true once the user placed the pin by hand or by search
  const lastGeo = useRef(null); // where the place name was last looked up
  const watcher = useRef(null);
  const alive = useRef(true);

  // Live GPS: the pin follows the phone until the user places it by hand
  const track = useCallback(async () => {
    watcher.current?.remove();
    watcher.current = null;
    pinned.current = false;
    lastGeo.current = null; // look the place name up again

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

  // Show the name of the current spot in the bar (only when it moved more than 25 m, and never while typing)
  useEffect(() => {
    if (!loc || editing) return;
    if (lastGeo.current && metres(lastGeo.current, loc) < 25) return;
    const timer = setTimeout(async () => {
      lastGeo.current = { lat: loc.lat, lng: loc.lng };
      try {
        const name = await reverseName(loc);
        if (alive.current) setQuery(name);
      } catch {
        // offline or no name: show the coordinates instead
        if (alive.current) setQuery(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [loc?.lat, loc?.lng, editing]);

  // Pin placed by hand (tap / drag)
  const place = (c) => {
    pinned.current = true;
    setLoc({ lat: c.lat, lng: c.lng, src: 'pin' });
  };

  // Type an address or landmark. Needs internet; GPS and tapping the map still work without it.
  const search = async () => {
    const q = query.trim();
    if (q.length < 3 || searching) return;
    Keyboard.dismiss();
    setSearching(true);
    setResults([]);
    setMsg('');
    try {
      const url =
        `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=ph&accept-language=en` +
        `&viewbox=${VIEWBOX}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error('search failed');
      const list = await res.json();
      if (!alive.current) return;
      if (list.length === 0) setMsg('No match. Try a nearby road, barangay or landmark, or tap the map.');
      setResults(list);
    } catch {
      if (alive.current) setMsg('Search needs internet. Tap the map to place your pin instead.');
    } finally {
      if (alive.current) setSearching(false);
    }
  };

  // A search result: move the pin there and keep its name in the bar and in the report's landmark
  const pick = (p) => {
    const label = shortName(p);
    const spot = { lat: Number(p.lat), lng: Number(p.lon) };
    pinned.current = true;
    lastGeo.current = spot; // the bar already shows its name, no new lookup needed
    setResults([]);
    setMsg('');
    setQuery(label);
    setLoc({ ...spot, src: 'pin', label, pan: true });
  };

  // Target button: back to the phone's GPS
  const useGps = () => {
    Keyboard.dismiss();
    setResults([]);
    setMsg('');
    setEditing(false);
    track();
  };

  const text = !loc
    ? 'Finding your location... You can also type your address or tap the map.'
    : `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} · ` +
      (loc.src === 'gps' ? `GPS, accurate to about ${loc.acc} m`
        : loc.src === 'pin' ? 'pin you placed'
        : 'last known location, check the pin');

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingBottom: 8 }}>
        <Btn kind="sec" small title="Back" onPress={onBack} />

        {/* Search bar that shows where you are, like Alerto PH */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 48, backgroundColor: C.card,
                       borderRadius: 24, borderWidth: 1, borderColor: C.bd, paddingLeft: 14, paddingRight: 10 }}>
          <Pressable onPress={search} hitSlop={8}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          </Pressable>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: C.tx, paddingVertical: 0 }}
            placeholder={loc ? 'Search address or landmark' : 'Finding your location...'}
            placeholderTextColor={C.mut}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            selectTextOnFocus
            returnKeyType="search"
            onSubmitEditing={search}
          />
          <Pressable onPress={useGps} hitSlop={8} style={{ marginLeft: 8 }}>
            <TargetIcon />
          </Pressable>
        </View>
      </View>

      {(results.length > 0 || !!msg || searching) && (
        <View style={{ marginHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: C.bd, borderRadius: 10, backgroundColor: C.card }}>
          {searching && <Text style={[ui.muted, { padding: 10 }]}>Searching...</Text>}
          {results.map((p, i) => (
            <Pressable
              key={p.place_id}
              onPress={() => pick(p)}
              style={{ padding: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.bd }}
            >
              <Text style={{ color: C.tx }} numberOfLines={2}>{shortName(p)}</Text>
            </Pressable>
          ))}
          {!!msg && <Text style={[ui.muted, { padding: 10 }]}>{msg}</Text>}
        </View>
      )}

      <View style={{ paddingHorizontal: 14 }}>
        <View style={{ height: 210, borderRadius: 12, overflow: 'hidden' }}>
          <MapPicker loc={loc} onPick={(c) => place(c)} />
        </View>
        {denied && <Note>Location permission is off. Type your address or tap the map to place a pin.</Note>}
        <Text style={[ui.muted, { marginTop: 6 }]}>{text}</Text>
        <Text style={ui.muted}>Not exact? Drag the pin or tap the map.</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 6 }} keyboardShouldPersistTaps="handled">
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
