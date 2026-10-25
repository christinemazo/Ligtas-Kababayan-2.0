import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // phone storage for the saved copy
import { Btn, Card, s } from '../ui';
import { getShelters } from '../api'; // loads shelters from the server
import { T, st } from '../styles';

// onBack = return to the home screen
export default function Shelters({ onBack }) {
  const [list, setList] = useState([]);          // the shelters to show
  const [loading, setLoading] = useState(true);  // true until loading finishes
  const [offline, setOffline] = useState(false); // true if fresh data could not be loaded

  // Runs once when the screen opens
  useEffect(() => {
    let alive = true; // becomes false when the screen closes, so we stop updating it

    // An async function that runs immediately (useEffect itself cannot be async)
    (async () => {
      // Step 1: show the saved copy right away (works with no internet)
      try {
        const cached = await AsyncStorage.getItem('lk_shelters');
        if (cached && alive) setList(JSON.parse(cached));
      } catch {
        // Ignore cache errors and try fetching fresh data.
      }

      // Step 2: ask the server for fresh data
      try {
        const fresh = await getShelters();
        if (alive) {
          setList(fresh);
          setOffline(false);
        }
        // Save it for next time
        await AsyncStorage.setItem('lk_shelters', JSON.stringify(fresh));
      } catch {
        // Could not reach the server: keep the saved copy and show the offline note
        if (alive) setOffline(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // Cleanup when the screen closes
    return () => {
      alive = false;
    };
  }, []);

  // How many shelters still have free space (capacity minus occupied is above 0)
  const availableCount = list.filter(
    (sh) => Number(sh.capacity) - Number(sh.occupied) > 0
  ).length;

  return (
    <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 30 }]}>
      {/* Header banner with two number boxes */}
      <View style={st.header}>
        <Text style={st.eyebrow}>LIGTAS KABABAYAN</Text>
        <Text style={st.title}>Evacuation Centers</Text>
        <Text style={st.subtitle}>
          Find a listed evacuation center and check its recorded occupancy
          information.
        </Text>

        <View style={st.statRow}>
          <View style={st.statBox}>
            <Text style={st.label}>TOTAL CENTERS</Text>
            <Text style={[st.statNum, { color: T.navy }]}>{list.length}</Text>
          </View>
          <View style={st.statBox}>
            <Text style={st.label}>WITH SPACE LEFT</Text>
            <Text style={[st.statNum, { color: T.green }]}>
              {availableCount}
            </Text>
          </View>
        </View>
      </View>

      <Btn kind="sec" title="‹  Back to home" onPress={onBack} style={s.mb10} />

      {/* Yellow note when the data could not be refreshed */}
      {offline && (
        <View style={[st.note, st.noteYellow]}>
          <Text style={[st.noteTitle, { color: T.yellowText }]}>
            Offline mode
          </Text>
          <Text style={st.noteBody}>
            {/* Different message depending on whether a saved copy exists */}
            {list.length > 0
              ? 'Showing the last saved shelter information. Occupancy may have changed.'
              : 'Could not load shelter information. Connect to the internet and reopen this page.'}
          </Text>
        </View>
      )}

      <View style={[st.between, { alignItems: 'center', marginBottom: 12 }]}>
        <Text style={st.h2}>Available centers</Text>
        <Text style={st.tiny}>{list.length} listed</Text>
      </View>

      {/* Loading message: only while loading and nothing is shown yet */}
      {loading && list.length === 0 && (
        <Card>
          <Text style={[st.h3, { fontSize: 15 }]}>
            Loading shelter information...
          </Text>
          <Text style={[s.muted, { marginTop: 6 }]}>
            Checking saved and current shelter data.
          </Text>
        </Card>
      )}

      {/* Empty message: finished loading but there is nothing to show */}
      {!loading && list.length === 0 && (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Text style={{ fontSize: 38 }}>⌂</Text>
            <Text style={[st.h3, { marginTop: 10, textAlign: 'center' }]}>
              No shelters listed yet
            </Text>
            <Text
              style={[st.body, { color: T.muted, textAlign: 'center', marginTop: 8 }]}
            >
              Connect to the internet to load evacuation center information. If
              you need help now, contact your local emergency service.
            </Text>
          </View>
        </Card>
      )}

      {/* One card per shelter */}
      {list.map((sh) => {
        // Turn values into safe numbers (never negative, 0 if missing)
        const capacity = Math.max(0, Number(sh.capacity) || 0);
        const occupied = Math.max(0, Number(sh.occupied) || 0);
        const left = Math.max(0, capacity - occupied); // free spaces
        // Percent full, capped at 100; 0 if capacity is 0 (avoids dividing by zero)
        const pct =
          capacity > 0
            ? Math.min(100, Math.round((occupied / capacity) * 100))
            : 0;
        const full = left <= 0;
        const color = full ? T.red : T.green;

        // Time of the last update, shown as hours:minutes ("Unknown" if the date is invalid)
        const d = sh.updated ? new Date(sh.updated) : null;
        const updated =
          d && !Number.isNaN(d.getTime())
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Unknown';

        return (
          <Card key={sh.id} style={{ marginBottom: 14 }}>
            {/* Top row: name and barangay on the left, FULL / SPACE LEFT tag on the right */}
            <View style={[st.between, { alignItems: 'flex-start', gap: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={st.h3}>{sh.name}</Text>
                <Text style={[st.small, { marginTop: 5 }]}>{sh.barangay}</Text>
              </View>
              <View
                style={[
                  st.pill,
                  { backgroundColor: full ? T.redSoft : T.greenSoft },
                ]}
              >
                <Text style={[st.pillText, { color }]}>
                  {full ? 'FULL' : 'SPACE LEFT'}
                </Text>
              </View>
            </View>

            {/* Middle row: "occupied / capacity" and the number of spaces remaining */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.label}>RECORDED OCCUPANCY</Text>
                <Text style={[st.h2, { fontSize: 22, marginTop: 4 }]}>
                  {occupied}
                  <Text style={{ color: T.muted, fontSize: 14, fontWeight: '500' }}>
                    {' '}/ {capacity}
                  </Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color, fontSize: 20, fontWeight: '900' }}>
                  {left}
                </Text>
                <Text style={{ color: T.muted, fontSize: 11 }}>
                  spaces remaining*
                </Text>
              </View>
            </View>

            {/* Progress bar. Colour: red at 90%+, amber at 70%+, otherwise blue */}
            <View style={st.bar}>
              <View
                style={[
                  st.barFill,
                  {
                    width: `${pct}%`,
                    backgroundColor:
                      pct >= 90 ? T.red : pct >= 70 ? '#D99A00' : T.blue,
                  },
                ]}
              />
            </View>

            {/* Bottom row: percent and last update time */}
            <View style={[st.between, { marginTop: 8 }]}>
              <Text style={st.tiny}>{pct}% occupied</Text>
              <Text style={st.tiny}>Updated {updated}</Text>
            </View>
          </Card>
        );
      })}

      {/* Advice before travelling */}
      <View style={[st.note, st.noteBlue, { marginTop: 4 }]}>
        <Text style={[st.noteTitle, { color: T.navy }]}>
          Before going to a shelter
        </Text>
        <Text style={st.noteBody}>
          Follow official evacuation instructions and verify the shelter's
          availability with local authorities when possible. Occupancy
          information may change.
        </Text>
      </View>

      {/* Explains the * next to "spaces remaining" */}
      <Text style={[st.tiny, { fontSize: 11, lineHeight: 17, textAlign: 'center', marginBottom: 10 }]}>
        *Remaining spaces are estimated from the recorded capacity and
        occupancy data. Confirm current availability with shelter staff.
      </Text>
    </ScrollView>
  );
}