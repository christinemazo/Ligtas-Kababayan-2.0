import { Pressable, ScrollView, Text, View } from 'react-native'; // NEW: added ScrollView
// Card and s = shared components and styles from ui.js
import { Card, s } from '../ui';
import { STATUS, STEPS } from '../constants'; // NEW
// T = theme colours, st = styles used by the four screens (styles.js)
import { T, st } from './Styles';

// NEW: the status card, shown only after an SOS was sent
function StatusCard({ mine, onPress }) {
  const failed = !!mine.error;                              // server refused it
  const sent = !!mine.id;                                   // server gave a reference code
  const reached = Math.max(0, STATUS.indexOf(mine.status)); // 0 = new, 1 = ack, 2 = done

  const title = failed
    ? 'SOS NOT SENT'
    : sent
      ? `Status: ${STEPS[reached]}`
      : mine.sending
        ? 'Sending your request...'
        : 'Saved on this device';

  const sub = failed
    ? 'Tap to see what went wrong.'
    : sent
      ? `Reference ID: ${mine.id}`
      : 'Will send automatically when signal returns.';

  const bg = failed ? T.redSoft : sent ? T.greenSoft : T.yellowSoft;
  const color = failed ? T.red : sent ? T.green : T.yellowText;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="View SOS request status"
      style={({ pressed }) => [
        st.statusBox,
        { backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[st.statusTag, { color }]}>YOUR SOS REQUEST</Text>
      <Text style={st.statusTitle}>{title}</Text>
      <Text style={[st.body, { marginTop: 6 }]}>{sub}</Text>

      {/* Three progress bars: Sent, Received, Rescued */}
      {sent && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {STEPS.map((step, i) => (
            <View key={step} style={{ flex: 1 }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i <= reached ? T.green : T.border,
                }}
              />
              <Text style={[st.tiny, { marginTop: 4, textAlign: 'center' }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[st.small, { marginTop: 10, color, fontWeight: '800' }]}>
        Tap to view details ›
      </Text>
    </Pressable>
  );
}

// mine = the SOS sent from this phone (null before any SOS)
// onSos / onShelters / onStatus = open the SOS, shelters, or status screen (from App.js)
export default function Home({ mine, onSos, onShelters, onStatus }) { // NEW: mine, onStatus
  return (
    <ScrollView contentContainerStyle={s.pad}>
      <View style={st.homeHeader}>
        <Text style={st.eyebrow}>EMERGENCY RESPONSE</Text>
        <Text style={st.title}>LigtasKababayan</Text>
        <Text style={st.subtitle}>
          Your safety matters. Request rescue or find a nearby evacuation
          shelter.
        </Text>
      </View>

      {/* NEW: status card, only exists after an SOS was sent */}
      {mine && <StatusCard mine={mine} onPress={onStatus} />}

      {/* Card holding the SOS button */}
      <Card style={s.cardCenter}>
        <Text style={s.h2}>Need rescue?</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          Request emergency assistance if you are affected by flooding.
        </Text>

        {/* Pale red circle around the button */}
        <View style={st.sosHalo}>
          <Pressable
            onPress={onSos}
            accessibilityRole="button"
            accessibilityLabel="Request emergency rescue"
            // "pressed" is true while the finger is down: the button fades and shrinks slightly
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

        {/* Warning against misuse */}
        <Text style={[st.tiny, { textAlign: 'center', lineHeight: 18 }]}>
          Use SOS only when emergency assistance is needed. Provide accurate
          details.
        </Text>
      </Card>

      {/* Tappable row that opens the shelters screen */}
      <Pressable
        onPress={onShelters}
        accessibilityRole="button"
        style={({ pressed }) => [st.linkRow, { opacity: pressed ? 0.75 : 1 }]}
      >
        {/* flex: 1 lets the text take all space except the arrow */}
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={st.linkTitle}>Find an evacuation shelter</Text>
          <Text style={[st.small, { marginTop: 5 }]}>
            View available shelters and safe locations.
          </Text>
        </View>
        {/* Arrow on the right */}
        <Text style={st.chevron}>›</Text>
      </Pressable>

      {/* Yellow reminder box */}
      <View style={[st.note, st.noteYellow, { marginTop: 18 }]}>
        <Text style={[st.noteTitle, { color: T.yellowText }]}>
          FLOOD SAFETY REMINDER
        </Text>
        <Text style={st.noteBody}>
          Avoid walking or driving through floodwater. Follow official
          evacuation instructions and move to higher ground when advised.
        </Text>
      </View>
    </ScrollView> // NEW: was </View>
  );
}

/*
UPDATE NI TL
Goal of update: Butangan Status card sa home screen ONLY AFTER sending a help request.
--------What changed-------
1. Import line 1: added ScrollView (Para scrollable for smaller devices).
2. New import: STATUS and STEPS from ../constants.
3. New StatusCard component above Home.
4. Home's first line: now receives mine and onStatus.
5. Outer wrapper: <View style={s.pad}> became <ScrollView contentContainerStyle={s.pad}>, and the last </View> became </ScrollView>.
6. One new line between the navy header and the "Need rescue?" card: {mine && <StatusCard mine={mine} onPress={onStatus} />}.
*/