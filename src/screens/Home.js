import { Pressable, Text, View } from 'react-native';
import { Card, s } from '../ui';
import { T, st } from '../styles';

export default function Home({ onSos, onShelters }) {
  return (
    <View style={s.pad}>
      <View style={st.homeHeader}>
        <Text style={st.eyebrow}>EMERGENCY RESPONSE</Text>
        <Text style={st.title}>LigtasKababayan</Text>
        <Text style={st.subtitle}>
          Your safety matters. Request rescue or find a nearby evacuation
          shelter.
        </Text>
      </View>

      <Card style={s.cardCenter}>
        <Text style={s.h2}>Need rescue?</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          Request emergency assistance if you are affected by flooding.
        </Text>

        <View style={st.sosHalo}>
          <Pressable
            onPress={onSos}
            accessibilityRole="button"
            accessibilityLabel="Request emergency rescue"
            style={({ pressed }) => [
              st.sosButton,
              {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <Text style={st.sosText}>SOS</Text>
            <Text style={st.sosHint}>TAP FOR HELP</Text>
          </Pressable>
        </View>

        <Text style={[st.tiny, { textAlign: 'center', lineHeight: 18 }]}>
          Use SOS only when emergency assistance is needed. Provide accurate
          details.
        </Text>
      </Card>

      <Pressable
        onPress={onShelters}
        accessibilityRole="button"
        style={({ pressed }) => [st.linkRow, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={st.linkTitle}>Find an evacuation shelter</Text>
          <Text style={[st.small, { marginTop: 5 }]}>
            View available shelters and safe locations.
          </Text>
        </View>
        <Text style={st.chevron}>›</Text>
      </Pressable>

      <View style={[st.note, st.noteYellow, { marginTop: 18 }]}>
        <Text style={[st.noteTitle, { color: T.yellowText }]}>
          FLOOD SAFETY REMINDER
        </Text>
        <Text style={st.noteBody}>
          Avoid walking or driving through floodwater. Follow official
          evacuation instructions and move to higher ground when advised.
        </Text>
      </View>
    </View>
  );
}