
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
import { Btn, C, Note, s } from '../ui';
import { LEVELS } from '../constants';
import MapPicker from '../MapPicker';

const THEME = {
  navy: '#102A43',
  red: '#C62828',
  redSoft: '#FFF0F0',
  blue: '#168AAD',
  blueSoft: '#E4F5FB',
  yellow: '#FFC928',
  white: '#FFFFFF',
  text: '#243B53',
  muted: '#62758A',
  border: '#D6E0E9',
  background: '#F1F5F9',
};

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
    <View style={[s.screen, { backgroundColor: THEME.background }]}>
      {/* Header and address search */}
      <View
        style={{
          backgroundColor: THEME.navy,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 16,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 15,
          }}
        >
          <Btn kind="sec" small title="‹ Back" onPress={onBack} />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                color: THEME.yellow,
                fontSize: 11,
                fontWeight: '900',
                letterSpacing: 1.5,
              }}
            >
              EMERGENCY RESPONSE
            </Text>
            <Text
              style={{
                color: THEME.white,
                fontSize: 21,
                fontWeight: '900',
                marginTop: 3,
              }}
            >
              Request Rescue
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: THEME.white,
            borderRadius: 13,
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
          }}
        >
          <Pressable onPress={search} hitSlop={8} accessibilityLabel="Search address">
            <Text style={{ fontSize: 20, marginRight: 9 }}>⌕</Text>
          </Pressable>

          <TextInput
            style={{
              flex: 1,
              color: THEME.text,
              fontSize: 14,
              paddingVertical: 12,
            }}
            placeholder="Search address or landmark"
            placeholderTextColor={THEME.muted}
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
            style={{
              backgroundColor: THEME.blueSoft,
              padding: 9,
              borderRadius: 10,
              marginLeft: 5,
            }}
            accessibilityRole="button"
            accessibilityLabel="Use current GPS location"
          >
            <TargetIcon />
          </Pressable>
        </View>
      </View>

      {/* Address search results */}
      {(results.length > 0 || !!msg || searching) && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            backgroundColor: THEME.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: THEME.border,
            overflow: 'hidden',
          }}
        >
          {searching && (
            <Text style={{ padding: 12, color: THEME.muted }}>
              Searching for locations...
            </Text>
          )}

          {results.map((p, i) => (
            <Pressable
              key={p.place_id}
              onPress={() => pick(p)}
              style={{
                padding: 13,
                borderBottomWidth:
                  i < results.length - 1 ? 1 : 0,
                borderBottomColor: THEME.border,
              }}
            >
              <Text
                style={{ color: THEME.text, fontSize: 14, lineHeight: 20 }}
                numberOfLines={2}
              >
                {shortName(p)}
              </Text>
            </Pressable>
          ))}

          {!!msg && (
            <Text
              style={{
                color: THEME.muted,
                padding: 12,
                fontSize: 13,
                lineHeight: 19,
              }}
            >
              {msg}
            </Text>
          )}
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location section */}
        <View
          style={{
            backgroundColor: THEME.white,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: THEME.blueSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Text style={{ fontSize: 20 }}>⌖</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: THEME.navy,
                  fontSize: 17,
                  fontWeight: '900',
                }}
              >
                Your location
              </Text>
              <Text
                style={{
                  color: THEME.muted,
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                Verify the pin before sending
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 280,
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#DCECF3',
              borderWidth: 1,
              borderColor: THEME.border,
            }}
          >
            <MapPicker loc={loc} onPick={place} />
          </View>

          <View
            style={{
              backgroundColor: THEME.blueSoft,
              padding: 11,
              borderRadius: 10,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: THEME.navy,
                fontSize: 12,
                fontWeight: '900',
                marginBottom: 5,
              }}
            >
              SELECTED LOCATION
            </Text>
            <Text
              style={{
                color: THEME.text,
                fontSize: 13,
                lineHeight: 20,
              }}
            >
              {locationText}
            </Text>
          </View>

          {denied && (
            <View
              style={{
                backgroundColor: THEME.yellow
                  ? '#FFF8DB'
                  : THEME.white,
                borderRadius: 10,
                padding: 11,
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: THEME.text,
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                Location permission is off. Search for your address or tap
                the map to place a pin manually.
              </Text>
            </View>
          )}

          <Text
            style={{
              color: THEME.muted,
              fontSize: 12,
              lineHeight: 18,
              marginTop: 10,
            }}
          >
            You can tap or drag the map pin to correct your location.
            A last-known location may be outdated.
          </Text>
        </View>

        {/* Water level selection */}
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              color: THEME.navy,
              fontSize: 20,
              fontWeight: '900',
            }}
          >
            How high is the water?
          </Text>

          <Text
            style={{
              color: THEME.muted,
              fontSize: 13,
              lineHeight: 19,
              marginTop: 5,
              marginBottom: 12,
            }}
          >
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
                style={({ pressed }) => ({
                  backgroundColor: selected
                    ? THEME.redSoft
                    : THEME.white,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected
                    ? THEME.red
                    : THEME.border,
                  borderRadius: 14,
                  padding: 15,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: selected
                      ? THEME.red
                      : THEME.blueSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? THEME.white : THEME.navy,
                      fontSize: 15,
                      fontWeight: '900',
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: THEME.navy,
                      fontSize: 15,
                      fontWeight: '900',
                    }}
                  >
                    {item.n}
                  </Text>
                  <Text
                    style={{
                      color: THEME.muted,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {selected ? 'Selected flood level' : 'Tap to select'}
                  </Text>
                </View>

                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: selected
                      ? THEME.red
                      : THEME.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: THEME.red,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Safety reminder */}
        <View
          style={{
            backgroundColor: '#FFF8DB',
            borderLeftWidth: 5,
            borderLeftColor: THEME.yellow,
            borderRadius: 12,
            padding: 14,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: '#755500',
              fontSize: 14,
              fontWeight: '900',
              marginBottom: 5,
            }}
          >
            Flood safety reminder
          </Text>
          <Text
            style={{
              color: THEME.text,
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Stay away from moving floodwater and electrical hazards.
            Follow official evacuation instructions. If you are in
            immediate danger, contact 911 or your local emergency service
            if available.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed SOS action */}
      <View
        style={{
          backgroundColor: THEME.white,
          borderTopWidth: 1,
          borderTopColor: THEME.border,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 14,
        }}
      >
        <Text
          style={{
            color: THEME.muted,
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 9,
          }}
        >
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
          style={({ pressed }) => ({
            minHeight: 58,
            borderRadius: 15,
            backgroundColor:
              !level || !loc ? '#AAB5C0' : THEME.red,
            justifyContent: 'center',
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
            elevation: level && loc ? 3 : 0,
          })}
        >
          <Text
            style={{
              color: THEME.white,
              fontSize: 18,
              fontWeight: '900',
              letterSpacing: 1.2,
            }}
          >
            SEND HELP
          </Text>
          <Text
            style={{
              color: THEME.white,
              fontSize: 11,
              marginTop: 2,
            }}
          >
            Emergency rescue request
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
