
import { Pressable, Text, View } from 'react-native';
import { Btn, Card, s } from '../ui';

export default function Home({ onSos, onShelters }) {
  return (
    <View style={s.pad}>
      {/* Emergency header */}
      <View
        style={{
          backgroundColor: '#102A43',
          padding: 20,
          borderRadius: 18,
          marginBottom: 18,
        }}
      >
        <Text
          style={{
            color: '#FFC928',
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 2,
          }}
        >
          EMERGENCY RESPONSE
        </Text>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 25,
            fontWeight: '900',
            marginTop: 8,
          }}
        >
          LigtasKababayan
        </Text>

        <Text
          style={{
            color: '#D9E6F2',
            fontSize: 14,
            marginTop: 6,
            lineHeight: 21,
          }}
        >
          Your safety matters. Request rescue
          or find a nearby evacuation shelter.
        </Text>
      </View>

      {/* SOS section */}
      <Card style={s.cardCenter}>
        <Text style={s.h2}>Need rescue?</Text>

        <Text style={[s.muted, { textAlign: 'center' }]}>
          Request emergency assistance if you
          are affected by flooding.
        </Text>

        <View
          style={{
            backgroundColor: '#FFF0F0',
            borderRadius: 100,
            padding: 12,
            marginTop: 20,
            marginBottom: 16,
          }}
        >
          <Pressable
            onPress={onSos}
            accessibilityRole="button"
            accessibilityLabel="Request emergency rescue"
            style={({ pressed }) => [
              s.sosBtn,
              {
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: '#C62828',
                justifyContent: 'center',
                alignItems: 'center',
                elevation: 5,
                opacity: pressed ? 0.8 : 1,
                transform: [
                  { scale: pressed ? 0.96 : 1 },
                ],
              },
            ]}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 38,
                fontWeight: '900',
                letterSpacing: 2,
              }}
            >
              SOS
            </Text>

            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: '700',
                marginTop: 2,
              }}
            >
              TAP FOR HELP
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            color: '#62758A',
            fontSize: 12,
            textAlign: 'center',
            lineHeight: 18,
          }}
        >
          Use SOS only when emergency assistance
          is needed. Provide accurate details.
        </Text>
      </Card>

      {/* Shelter action */}
      <Pressable
        onPress={onShelters}
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: '#FFFFFF',
          borderColor: '#D6E0E9',
          borderWidth: 1,
          borderRadius: 16,
          padding: 18,
          marginTop: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text
            style={{
              color: '#102A43',
              fontSize: 17,
              fontWeight: '800',
            }}
          >
            Find an evacuation shelter
          </Text>

          <Text
            style={{
              color: '#62758A',
              fontSize: 13,
              marginTop: 5,
              lineHeight: 19,
            }}
          >
            View available shelters and safe locations.
          </Text>
        </View>

        <Text
          style={{
            color: '#168AAD',
            fontSize: 26,
            fontWeight: '800',
          }}
        >
          ›
        </Text>
      </Pressable>

      {/* Safety reminder */}
      <View
        style={{
          backgroundColor: '#FFF8DB',
          borderLeftWidth: 5,
          borderLeftColor: '#FFC928',
          borderRadius: 10,
          padding: 14,
          marginTop: 18,
        }}
      >
        <Text
          style={{
            color: '#755500',
            fontSize: 14,
            fontWeight: '800',
            marginBottom: 5,
          }}
        >
          FLOOD SAFETY REMINDER
        </Text>

        <Text
          style={{
            color: '#594A20',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          Avoid walking or driving through floodwater.
          Follow official evacuation instructions and
          move to higher ground when advised.
        </Text>
      </View>
    </View>
  );
}
