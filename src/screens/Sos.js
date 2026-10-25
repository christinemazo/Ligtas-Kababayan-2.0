// Sos.js: the "Request Rescue" screen.
// The user confirms their location (GPS, address search or map pin), picks the water level, and sends the SOS.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location'; // GPS
import AsyncStorage from '@react-native-async-storage/async-storage'; // saves the last known location
import { Btn, s } from '../ui';
import { LEVELS } from '../constants'; // the five water levels
import MapPicker from '../MapPicker';  // the map with a draggable pin

import { T, st } from '../styles';

// Rectangle around Calbayog (west, north, east, south). Search prefers results inside it.
const VIEWBOX = '124.40,12.30,124.85,11.85';
// Nominatim (OpenStreetMap's address search) requires apps to identify themselves
const UA = {
  'User-Agent': 'LigtasKababayan/0.2 (school project)',
};
const NOMINATIM = 'https://nominatim.openstreetmap.org';

// Shorten a long search result name to its first 4 parts
const shortName = (p) =>
  (p.display_name || '').split(', ').slice(0, 4).join(', ');

// Approximate distance in metres between two points.
// 1 degree of latitude is about 111,000 m; longitude shrinks with cos(latitude).
const metres = (a, b) =>
  Math.hypot(
    (a.lat - b.lat) * 111000,
    (a.lng - b.lng) *
      111000 *
      Math.cos((a.lat * Math.PI) / 180)
  );

// Turns coordinates into a place name like "Barangay, City, Province" (reverse geocoding)
async function reverseName(l) {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=16` +
    `&accept-language=en&lat=${l.lat}&lon=${l.lng}`;

  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error('reverse failed');

  const a = (await res.json()).address || {};
  // OpenStreetMap uses different field names in different places, so try several
  const brgy =
    a.suburb ||
    a.village ||
    a.neighbourhood ||
    a.quarter ||
    a.hamlet ||
    '';
  const city = a.city || a.town || a.municipality || '';
  const area = a.county || a.state_district || a.state || '';
  // Join the parts that exist, separated by commas
  const name = [brgy, city, area].filter(Boolean).join(', ');

  if (!name) throw new Error('no name');
  return name;
}

// Small icon (ring with a dot) for the "use my GPS" button
const TargetIcon = () => (
  <View style={s.targetRing}>
    <View style={s.targetDot} />
  </View>
);

// onBack = go back home, onSend = send the SOS (level, location) through App.js
export default function Sos({ onBack, onSend }) {
  const [loc, setLoc] = useState(null);             // chosen location {lat, lng, acc, src, ...}
  const [level, setLevel] = useState(0);            // chosen water level (0 = none yet)
  const [denied, setDenied] = useState(false);      // true if GPS permission was refused
  const [query, setQuery] = useState('');           // text in the search box
  const [editing, setEditing] = useState(false);    // true while the user is typing in the search box
  const [results, setResults] = useState([]);       // address search results
  const [searching, setSearching] = useState(false);// true while a search is running
  const [msg, setMsg] = useState('');               // message under the search bar

  // Refs keep values between renders WITHOUT causing a redraw
  const pinned = useRef(false);   // true once the user placed a pin (stop following GPS)
  const lastGeo = useRef(null);   // last point we looked up an address for
  const watcher = useRef(null);   // the running GPS subscription
  const alive = useRef(true);     // false once the screen is closed

  // Start (or restart) GPS tracking
  const track = useCallback(async () => {
    // Reset everything from before
    watcher.current?.remove();
    watcher.current = null;
    pinned.current = false;
    lastGeo.current = null;

    // First show the last known location so the map is not empty while GPS starts
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
      // Ask the user for permission to use location
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (!alive.current) return; // screen closed while waiting

      if (status !== 'granted') {
        setDenied(true);
        return;
      }

      setDenied(false);

      // Get a new position at most every 3 metres or 3 seconds
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 3,
          timeInterval: 3000,
        },
        (p) => {
          if (pinned.current) return; // the user chose a spot manually; ignore GPS

          const l = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            acc: Math.round(p.coords.accuracy ?? 0), // accuracy in metres
            src: 'gps',
          };

          // Remember it for next time (ignore storage errors)
          AsyncStorage.setItem('lk_loc', JSON.stringify(l)).catch(
            () => {}
          );
          setLoc(l);
        }
      );

      // Keep the subscription so it can be stopped later
      if (alive.current) watcher.current = sub;
      else sub.remove(); // screen already closed: stop it right away
    } catch {
      if (alive.current) {
        setDenied(true);
      }
    }
  }, []);

  // Start GPS when the screen opens, stop it when the screen closes
  useEffect(() => {
    alive.current = true;
    track();

    return () => {
      alive.current = false;
      watcher.current?.remove();
    };
  }, [track]);

  // Automatically fill the search box with the address of the current location
  useEffect(() => {
    if (!loc || editing) return; // do nothing while the user is typing
    // Skip if we moved less than 25 m since the last lookup
    if (lastGeo.current && metres(lastGeo.current, loc) < 25) return;

    // Wait 700 ms first (debounce) so we do not call the server for every GPS update
    const timer = setTimeout(async () => {
      lastGeo.current = { lat: loc.lat, lng: loc.lng };

      try {
        const name = await reverseName(loc);
        if (alive.current) setQuery(name);
      } catch {
        // No address found or no internet: show the raw coordinates instead
        if (alive.current) {
          setQuery(`${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
        }
      }
    }, 700);

    return () => clearTimeout(timer); // cancel if the location changes again quickly
  }, [loc?.lat, loc?.lng, editing]);

  // The user tapped or dragged the map pin: use that spot and stop following GPS
  const place = (c) => {
    pinned.current = true;
    setLoc({ lat: c.lat, lng: c.lng, src: 'pin' });
  };

  // Search for an address or landmark
  const search = async () => {
    const q = query.trim();
    if (q.length < 3 || searching) return; // too short, or already searching

    Keyboard.dismiss();
    setSearching(true);
    setResults([]);
    setMsg('');

    try {
      // Philippines only (countrycodes=ph), up to 5 results, prefer the Calbayog area
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

  // The user chose one of the search results
  const pick = (p) => {
    const label = shortName(p);
    const spot = { lat: Number(p.lat), lng: Number(p.lon) };

    pinned.current = true;     // stop GPS from overriding this choice
    lastGeo.current = spot;    // no need to look up this address again
    setResults([]);
    setMsg('');
    setQuery(label);
    // pan: true tells the map to move to this spot; the label becomes the SOS landmark
    setLoc({ ...spot, src: 'pin', label, pan: true });
    Keyboard.dismiss();
    setEditing(false);
  };

  // The "target" button: go back to live GPS
  const useGps = () => {
    Keyboard.dismiss();
    setResults([]);
    setMsg('');
    setEditing(false);
    track();
  };

  // The sentence shown under the map describing the selected location
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
          {/* Magnifier: tap to search */}
          <Pressable onPress={search} hitSlop={8} accessibilityLabel="Search address">
            <Text style={{ fontSize: 20, marginRight: 9 }}>⌕</Text>
          </Pressable>

          <TextInput
            style={st.searchInput}
            placeholder="Search address or landmark"
            placeholderTextColor={T.muted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setEditing(true)}   // pause automatic address filling while typing
            onBlur={() => setEditing(false)}
            selectTextOnFocus                  // select all text when tapped, easy to replace
            returnKeyType="search"             // keyboard shows a "search" key
            onSubmitEditing={search}           // pressing that key runs the search
            accessibilityLabel="Search address or landmark"
          />

          {/* Target button: use live GPS again */}
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
      {/* Shown while searching, when there are results, or when there is a message */}
      {(results.length > 0 || !!msg || searching) && (
        <View style={st.results}>
          {searching && (
            <Text style={{ padding: 12, color: T.muted }}>
              Searching for locations...
            </Text>
          )}

          {/* Each result is tappable; the last one has no bottom line */}
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
        keyboardShouldPersistTaps="handled" // taps on buttons work while the keyboard is open
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

          {/* The map. onPick runs when the user taps or drags the pin. */}
          <View style={st.mapBox}>
            <MapPicker loc={loc} onPick={place} />
          </View>

          {/* Text version of the selected location */}
          <View style={st.locationBox}>
            <Text style={{ color: T.navy, fontSize: 12, fontWeight: '900', marginBottom: 5 }}>
              SELECTED LOCATION
            </Text>
            <Text style={st.noteBody}>{locationText}</Text>
          </View>

          {/* Shown if the user refused location permission */}
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

          {/* One option per water level */}
          {LEVELS.map((item, index) => {
            const selected = level === item.k; // is this the chosen level?

            return (
              <Pressable
                key={item.k}
                onPress={() => setLevel(item.k)}
                accessibilityRole="radio"         // behaves like a radio button
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  st.level,
                  selected && st.levelOn,         // red outline when selected
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                {/* Number box (1 to 5) */}
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

                {/* Level name and hint */}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: T.navy, fontSize: 15, fontWeight: '900' }}>
                    {item.n}
                  </Text>
                  <Text style={[st.tiny, { marginTop: 4 }]}>
                    {selected ? 'Selected flood level' : 'Tap to select'}
                  </Text>
                </View>

                {/* Radio circle on the right, with a dot when selected */}
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
      {/* Stays at the bottom while the content above scrolls */}
      <View style={st.footer}>
        {/* Tells the user what is still missing */}
        <Text style={[st.tiny, { textAlign: 'center', marginBottom: 9 }]}>
          {!loc
            ? 'Waiting for a location'
            : !level
              ? 'Select the water level to continue'
              : 'Review your location before submitting'}
        </Text>

        {/* Disabled (grey) until both a location and a water level exist */}
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