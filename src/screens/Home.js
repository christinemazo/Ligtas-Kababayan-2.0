import { Pressable, Text, View } from 'react-native';
import { Btn, Card, ui } from '../ui';

export default function Home({ onSos, onShelters }) {
  return (
    <View style={{ padding: 14 }}>
      <Card style={{ alignItems: 'center' }}>
        <Text style={ui.h2}>Need rescue?</Text>
        <Text style={ui.muted}>No sign-up. Press SOS and choose the water level.</Text>
        <View style={{ width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(224,49,43,0.25)',
                       alignItems: 'center', justifyContent: 'center', marginVertical: 14 }}>
          <Pressable
            onPress={onSos}
            style={({ pressed }) => ({ width: 210, height: 210, borderRadius: 105, backgroundColor: '#e0312b',
                                       alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ color: '#fff', fontSize: 44, fontWeight: '700' }}>SOS</Text>
          </Pressable>
        </View>
      </Card>
      <Btn kind="sec" title="Find shelter" onPress={onShelters} />
    </View>
  );
}
