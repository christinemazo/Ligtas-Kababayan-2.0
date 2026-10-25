import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, s } from '../ui';
import { LEVELS } from '../constants';
import MapPicker from '../MapPicker';

import { T, st } from '../styles';

const VIEWBOX = '124.40,12.30,124.85,11.85';
const UA = {
  'User-Agent': 'LigtasKababayan/0.2 (school project)',
};
const NOMINATIM = 'https://nominatim.openstreetmap.org';

const shortName = (p) =>
  (p.display_name || '').split(', ').slice(0, 4).join(', ');

const metres = (a, b) =>
  Math.hypot(
    (a.lat - b.lat) * 111000,
    (a.lng - b.lng) *
      111000 *
      Math.cos((a.lat * Math.PI) / 180)
  );

async function reverseName(l) {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=16` +
    `&accept-language=en&lat=${l.lat}&lon=${l.lng}`;

  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error('reverse failed');

  const a = (await res.json()).address || {};
  const brgy =
    a.suburb ||
    a.village ||
    a.neighbourhood ||
    a.quarter ||
    a.hamlet ||
    '';
  const city = a.city || a.town || a.municipality || '';
  const area = a.county || a.state_district || a.state || '';
  const name = [brgy, city, area].filter(Boolean).join(', ');

  if (!name) throw new Error('no name');
  return name;
}

const TargetIcon = () => (
  <View style={s.targetRing}>
    <View style={s.targetDot} />
  </View>
);

export default function Sos({ onBack, onSend }) {
  const [loc, setLoc] = useState(null);
  const [level, setLevel] = useState(0);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState('');

  const pinned = useRef(false);
  const lastGeo = useRef(null);
  const watcher = useRef(null);
  const alive = useRef(true);

  const track = useCallback(async () => {
    watcher.current?.remove();
    watcher.current = null;
    pinned.current = false;
    lastGeo.current = null;

    try {
      const saved = await AsyncStorage.getItem('lk_loc');
      if (alive.current) {
        setLoc(
          saved ? { ...JSON.parse(saved), src: 'last known' } : null
        );
      }
    } catch {
      if (alive.current) setLoc(null);
    }

    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (!alive.current) return;

      if (status !== 'granted') {
        setDenied(true);
        return;
      }

      setDenied(false);

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 3,
          timeInterval: 3000,
        },
        (p) => {
          if (pinned.current) return;

          const l = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            acc: Math.round(p.coords.accuracy ?? 0),
            src: 'gps',
          };

          AsyncStorage.setItem('lk_loc', JSON.stringify(l)).catch(
            () => {}
          );
          setLoc(l);
        }
      );

      if (alive.current) watcher.current = sub;
      else sub.remove();
    } catch {
      if (alive.current) {
        setDenied(true);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    track();

    return () => {
      alive.current = false;
      watcher.current?.remove();
    };
  }, [track]);

  useEffect(() => {
    if (!loc || editing) return;
    if (lastGeo.current && metres(lastGeo.current, loc) < 25) return;

    const timer = setTimeout(async () => {
      lastGeo.current = { lat: loc.lat, lng: loc.lng };

      try {
        const name = await reverseName(loc);
        if (alive.current) setQuery(name);
      } catch {
        if (alive.current) {
          setQuery(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [loc?.lat, loc?.lng, editing]);

  const place = (c) => {
    pinned.current = true;
    setLoc({ lat: c.lat, lng: c.lng, src: 'pin' });
  };

  const search = async () => {
    const q = query.trim();
    if (q.length < 3 || searching) return;

    Keyboard.dismiss();
    setSearching(true);
    setResults([]);
    setMsg('');

    try {
      const url =
        `${NOMINATIM}/search?format=jsonv2&limit=5&countrycodes=ph` +
        `&accept-language=en&viewbox=${VIEWBOX}` +
        `&q=${encodeURIComponent(q)}`;

      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error('search failed');

      const list = await res.json();
      if (!alive.current) return;

      if (list.length === 0) {
        setMsg(
          'No match found. Try a barangay, nearby road, or landmark.'
        );
      }

      setResults(list);
    } catch {
      if (alive.current) {
        setMsg(
          'Address search needs internet. You can still tap the map to place a pin.'
        );
      }
    } finally {
      if (alive.current) setSearching(false);
    }
  };

  const pick = (p) => {
    const label = shortName(p);
    const spot = { lat: Number(p.lat), lng: Number(p.lon) };

    pinned.current = true;
    lastGeo.current = spot;
    setResults([]);
    setMsg('');
    setQuery(label);
    setLoc({ ...spot, src: 'pin', label, pan: true });
    Keyboard.dismiss();
    setEditing(false);
  };

  const useGps = () => {
    Keyboard.dismiss();
    setResults([]);
    setMsg('');
    setEditing(false);
    track();
  };

  const locationText = !loc
    ? 'Finding your location. You can also search for an address or place a map pin.'
    : `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} · ${
        loc.src === 'gps'
          ? `GPS accuracy about ${loc.acc} m`
          : loc.src === 'pin'
            ? 'Manually selected pin'
            : 'Last known location — please verify'
      }`;

  return (
    <View style={[s.screen, { backgroundColor: T.background }]}>
      {/* Header and address search */}
      <View style={st.topBar}>
        <View style={st.topRow}>
          <Btn kind="sec" small title="‹ Back" onPress={onBack} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.topEyebrow}>EMERGENCY RESPONSE</Text>
            <Text style={st.topTitle}>Request Rescue</Text>
          </View>
        </View>

        <View style={st.searchBar}>
          <Pressable onPress={search} hitSlop={8} accessibilityLabel="Search address">
            <Text style={{ fontSize: 20, marginRight: 9 }}>⌕</Text>
          </Pressable>

          <TextInput
            style={st.searchInput}
            placeholder="Search address or landmark"
            placeholderTextColor={T.muted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setEditing(true)}
            onBlur={() => setEditing(false)}
            selectTextOnFocus
            returnKeyType="search"
            onSubmitEditing={search}
            accessibilityLabel="Search address or landmark"
          />

          <Pressable
            onPress={useGps}
            hitSlop={10}
            style={st.gpsBtn}
            accessibilityRole="button"
            accessibilityLabel="Use current GPS location"
          >
            <TargetIcon />
          </Pressable>
        </View>
      </View>

      {/* Address search results */}
      {(results.length > 0 || !!msg || searching) && (
        <View style={st.results}>
          {searching && (
            <Text style={{ padding: 12, color: T.muted }}>
              Searching for locations...
            </Text>
          )}

          {results.map((p, i) => (
            <Pressable
              key={p.place_id}
              onPress={() => pick(p)}
              style={[
                st.result,
                { borderBottomWidth: i < results.length - 1 ? 1 : 0 },
              ]}
            >
              <Text style={[st.body, { fontSize: 14 }]} numberOfLines={2}>
                {shortName(p)}
              </Text>
            </Pressable>
          ))}

          {!!msg && (
            <Text style={[st.small, { padding: 12, lineHeight: 19 }]}>{msg}</Text>
          )}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location section */}
        <View style={st.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={st.iconBox}>
              <Text style={{ fontSize: 20 }}>⌖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.h2, { fontSize: 17 }]}>Your location</Text>
              <Text style={[st.tiny, { marginTop: 3 }]}>
                Verify the pin before sending
              </Text>
            </View>
          </View>

          <View style={st.mapBox}>
            <MapPicker loc={loc} onPick={place} />
          </View>

          <View style={st.locationBox}>
            <Text style={{ color: T.navy, fontSize: 12, fontWeight: '900', marginBottom: 5 }}>
              SELECTED LOCATION
            </Text>
            <Text style={st.noteBody}>{locationText}</Text>
          </View>

          {denied && (
            <View style={st.warnBox}>
              <Text style={st.noteBody}>
                Location permission is off. Search for your address or tap the
                map to place a pin manually.
              </Text>
            </View>
          )}

          <Text style={[st.tiny, { lineHeight: 18, marginTop: 10 }]}>
            You can tap or drag the map pin to correct your location. A
            last-known location may be outdated.
          </Text>
        </View>

        {/* Water level selection */}
        <View style={{ marginBottom: 18 }}>
          <Text style={st.h2}>How high is the water?</Text>
          <Text style={[st.small, { marginTop: 5, marginBottom: 12 }]}>
            Select the option that best describes the current floodwater.
          </Text>

          {LEVELS.map((item, index) => {
            const selected = level === item.k;

            return (
              <Pressable
                key={item.k}
                onPress={() => setLevel(item.k)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  st.level,
                  selected && st.levelOn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[st.levelNum, selected && st.levelNumOn]}>
                  <Text
                    style={{
                      color: selected ? T.white : T.navy,
                      fontSize: 15,
                      fontWeight: '900',
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.navy, fontSize: 15, fontWeight: '900' }}>
                    {item.n}
                  </Text>
                  <Text style={[st.tiny, { marginTop: 4 }]}>
                    {selected ? 'Selected flood level' : 'Tap to select'}
                  </Text>
                </View>

                <View style={[st.radio, selected && st.radioOn]}>
                  {selected && <View style={st.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Safety reminder */}
        <View style={[st.note, st.noteYellow, { marginBottom: 8 }]}>
          <Text style={[st.noteTitle, { color: T.yellowText }]}>
            Flood safety reminder
          </Text>
          <Text style={st.noteBody}>
            Stay away from moving floodwater and electrical hazards. Follow
            official evacuation instructions. If you are in immediate danger,
            contact 911 or your local emergency service if available.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed SOS action */}
      <View style={st.footer}>
        <Text style={[st.tiny, { textAlign: 'center', marginBottom: 9 }]}>
          {!loc
            ? 'Waiting for a location'
            : !level
              ? 'Select the water level to continue'
              : 'Review your location before submitting'}
        </Text>

        <Pressable
          disabled={!level || !loc}
          onPress={() => onSend(level, loc)}
          accessibilityRole="button"
          accessibilityLabel="Send emergency rescue request"
          style={({ pressed }) => [
            st.sendBtn,
            (!level || !loc) && st.sendBtnOff,
            { opacity: pressed ? 0.85 : 1, elevation: level && loc ? 3 : 0 },
          ]}
        >
          <Text style={st.sendText}>SEND HELP</Text>
          <Text style={{ color: T.white, fontSize: 11, marginTop: 2 }}>
            Emergency rescue request
          </Text>
        </Pressable>
      </View>
    </View>
  );
}