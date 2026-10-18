import { Pressable, Text, View } from 'react-native';
import { Btn, Card, s } from '../ui';

export default function Home({ onSos, onShelters }) {
  return (
    <View style={s.pad}>
      <Card style={s.cardCenter}>
        <Text style={s.h2}>Need rescue?</Text>
        <Text style={s.muted}>No sign-up. Press SOS and choose the water level.</Text>
        <View style={s.sosRing}>
          <Pressable onPress={onSos} style={({ pressed }) => [s.sosBtn, pressed && s.pressed]}>
            <Text style={s.sosText}>SOS</Text>
          </Pressable>
        </View>
      </Card>
      <Btn kind="sec" title="Find shelter" onPress={onShelters} />
    </View>
  );
}
