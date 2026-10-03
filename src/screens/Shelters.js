import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, C, Card, ui } from '../ui';
import { getShelters } from '../api';

export default function Shelters({ onBack }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cached = await AsyncStorage.getItem('lk_shelters'); // shown first so it works offline
      if (cached && alive) setList(JSON.parse(cached));
      try {
        const fresh = await getShelters();
        if (alive) setList(fresh);
        await AsyncStorage.setItem('lk_shelters', JSON.stringify(fresh));
      } catch {
        // offline: keep showing the saved list
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      <Btn kind="sec" title="Back" onPress={onBack} style={{ marginBottom: 10 }} />
      <Text style={ui.h2}>Evacuation centers</Text>
      {list.length === 0 && <Text style={ui.muted}>No shelter list yet. Connect once to save it on your phone.</Text>}
      {list.map((s) => {
        const left = s.capacity - s.occupied;
        const pct = Math.min(100, Math.round((s.occupied / s.capacity) * 100));
        const updated = new Date(s.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <Card key={s.id}>
            <View style={ui.row}>
              <Text style={{ fontWeight: '700', color: C.tx, flex: 1 }}>{s.name}</Text>
              <Text style={{ fontWeight: '700', color: C.tx }}>{left > 0 ? `${left} open` : 'Full'}</Text>
            </View>
            <Text style={ui.muted}>{s.barangay} · updated {updated}</Text>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: C.bd, overflow: 'hidden', marginVertical: 4 }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.ok }} />
            </View>
            <Text style={ui.muted}>{s.occupied} of {s.capacity} occupied</Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}
