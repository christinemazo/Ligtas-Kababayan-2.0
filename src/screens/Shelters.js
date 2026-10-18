
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Card, s } from '../ui';
import { getShelters } from '../api';

const C = {
  navy: '#102A43',
  red: '#C62828',
  redSoft: '#FFF0F0',
  blue: '#168AAD',
  blueSoft: '#E4F5FB',
  yellow: '#FFC928',
  yellowSoft: '#FFF8DB',
  green: '#198754',
  greenSoft: '#E4F5EB',
  white: '#FFFFFF',
  text: '#243B53',
  muted: '#62758A',
  border: '#D6E0E9',
  track: '#EAF0F6',
};

export default function Shelters({ onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const cached = await AsyncStorage.getItem('lk_shelters');

        if (cached && alive) {
          setList(JSON.parse(cached));
        }
      } catch {
        // Ignore cache errors and try fetching fresh data.
      }

      try {
        const fresh = await getShelters();

        if (alive) {
          setList(fresh);
          setOffline(false);
        }

        await AsyncStorage.setItem(
          'lk_shelters',
          JSON.stringify(fresh)
        );
      } catch {
        if (alive) setOffline(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const availableCount = list.filter(
    (sh) => Number(sh.capacity) - Number(sh.occupied) > 0
  ).length;

  return (
    <ScrollView
      contentContainerStyle={[s.pad, { paddingBottom: 30 }]}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: C.navy,
          padding: 22,
          borderRadius: 18,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: C.yellow,
            fontSize: 12,
            fontWeight: '900',
            letterSpacing: 2,
          }}
        >
          LIGTAS KABABAYAN
        </Text>

        <Text
          style={{
            color: C.white,
            fontSize: 25,
            fontWeight: '900',
            marginTop: 8,
          }}
        >
          Evacuation Centers
        </Text>

        <Text
          style={{
            color: '#D9E6F2',
            fontSize: 14,
            lineHeight: 21,
            marginTop: 6,
          }}
        >
          Find a listed evacuation center and check its
          recorded occupancy information.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            marginTop: 18,
            gap: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: C.muted,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              TOTAL CENTERS
            </Text>
            <Text
              style={{
                color: C.navy,
                fontSize: 25,
                fontWeight: '900',
                marginTop: 4,
              }}
            >
              {list.length}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: C.muted,
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              WITH SPACE LEFT
            </Text>
            <Text
              style={{
                color: C.green,
                fontSize: 25,
                fontWeight: '900',
                marginTop: 4,
              }}
            >
              {availableCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Back button */}
      <Btn
        kind="sec"
        title="‹  Back to home"
        onPress={onBack}
        style={s.mb10}
      />

      {/* Connection notice */}
      {offline && (
        <View
          style={{
            backgroundColor: C.yellowSoft,
            borderLeftWidth: 5,
            borderLeftColor: C.yellow,
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: '#755500',
              fontWeight: '900',
              fontSize: 14,
            }}
          >
            Offline mode
          </Text>
          <Text
            style={{
              color: C.text,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 5,
            }}
          >
            {list.length > 0
              ? 'Showing the last saved shelter information. Occupancy may have changed.'
              : 'Could not load shelter information. Connect to the internet and reopen this page.'}
          </Text>
        </View>
      )}

      {/* Shelter list title */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            color: C.navy,
            fontSize: 20,
            fontWeight: '900',
          }}
        >
          Available centers
        </Text>

        <Text
          style={{
            color: C.muted,
            fontSize: 12,
          }}
        >
          {list.length} listed
        </Text>
      </View>

      {/* Loading / empty states */}
      {loading && list.length === 0 && (
        <Card>
          <Text
            style={{
              color: C.navy,
              fontWeight: '700',
              fontSize: 15,
            }}
          >
            Loading shelter information...
          </Text>
          <Text style={[s.muted, { marginTop: 6 }]}>
            Checking saved and current shelter data.
          </Text>
        </Card>
      )}

      {!loading && list.length === 0 && (
        <Card>
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Text style={{ fontSize: 38 }}>⌂</Text>
            <Text
              style={{
                color: C.navy,
                fontSize: 18,
                fontWeight: '900',
                marginTop: 10,
                textAlign: 'center',
              }}
            >
              No shelters listed yet
            </Text>
            <Text
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 21,
                marginTop: 8,
              }}
            >
              Connect to the internet to load evacuation center
              information. If you need help now, contact your local
              emergency service.
            </Text>
          </View>
        </Card>
      )}

      {/* Shelter cards */}
      {list.map((sh) => {
        const capacity = Math.max(0, Number(sh.capacity) || 0);
        const occupied = Math.max(0, Number(sh.occupied) || 0);
        const left = Math.max(0, capacity - occupied);
        const pct =
          capacity > 0
            ? Math.min(100, Math.round((occupied / capacity) * 100))
            : 0;

        const full = left <= 0;
        const statusColor = full ? C.red : C.green;
        const statusBg = full ? C.redSoft : C.greenSoft;

        const updatedDate = sh.updated
          ? new Date(sh.updated)
          : null;

        const updated =
          updatedDate && !Number.isNaN(updatedDate.getTime())
            ? updatedDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Unknown';

        return (
          <Card key={sh.id} style={{ marginBottom: 14 }}>
            {/* Name and status */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: C.navy,
                    fontSize: 18,
                    fontWeight: '900',
                    lineHeight: 24,
                  }}
                >
                  {sh.name}
                </Text>

                <Text
                  style={{
                    color: C.muted,
                    fontSize: 13,
                    marginTop: 5,
                  }}
                >
                  {sh.barangay}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: statusBg,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 20,
                }}
              >
                <Text
                  style={{
                    color: statusColor,
                    fontSize: 12,
                    fontWeight: '900',
                  }}
                >
                  {full ? 'FULL' : 'SPACE LEFT'}
                </Text>
              </View>
            </View>

            {/* Availability */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 18,
                marginBottom: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: C.muted,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  RECORDED OCCUPANCY
                </Text>
                <Text
                  style={{
                    color: C.navy,
                    fontSize: 22,
                    fontWeight: '900',
                    marginTop: 4,
                  }}
                >
                  {occupied}
                  <Text
                    style={{
                      color: C.muted,
                      fontSize: 14,
                      fontWeight: '500',
                    }}
                  >
                    {' '}/ {capacity}
                  </Text>
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    color: statusColor,
                    fontSize: 20,
                    fontWeight: '900',
                  }}
                >
                  {left}
                </Text>
                <Text style={{ color: C.muted, fontSize: 11 }}>
                  spaces remaining*
                </Text>
              </View>
            </View>

            {/* Occupancy bar */}
            <View
              style={{
                height: 9,
                backgroundColor: C.track,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor:
                    pct >= 90 ? C.red : pct >= 70 ? '#D99A00' : C.blue,
                  borderRadius: 10,
                }}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <Text style={{ color: C.muted, fontSize: 12 }}>
                {pct}% occupied
              </Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>
                Updated {updated}
              </Text>
            </View>
          </Card>
        );
      })}

      {/* Safety note */}
      <View
        style={{
          backgroundColor: C.blueSoft,
          borderLeftWidth: 5,
          borderLeftColor: C.blue,
          borderRadius: 12,
          padding: 15,
          marginTop: 4,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: C.navy,
            fontSize: 14,
            fontWeight: '900',
            marginBottom: 6,
          }}
        >
          Before going to a shelter
        </Text>

        <Text
          style={{
            color: C.text,
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          Follow official evacuation instructions and verify the shelter's
          availability with local authorities when possible. Occupancy
          information may change.
        </Text>
      </View>

      <Text
        style={{
          color: C.muted,
          fontSize: 11,
          lineHeight: 17,
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        *Remaining spaces are estimated from the recorded capacity and
        occupancy data. Confirm current availability with shelter staff.
      </Text>
    </ScrollView>
  );
}
