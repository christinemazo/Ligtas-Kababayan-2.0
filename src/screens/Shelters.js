import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Btn, Card, s } from '../ui';
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
    <ScrollView contentContainerStyle={s.pad}>
      <Btn kind="sec" title="Back" onPress={onBack} style={s.mb10} />
      <Text style={s.h2}>Evacuation centers</Text>
      {list.length === 0 && <Text style={s.muted}>No shelter list yet. Connect once to save it on your phone.</Text>}
      {list.map((sh) => {
        const left = sh.capacity - sh.occupied;
        const pct = Math.min(100, Math.round((sh.occupied / sh.capacity) * 100));
        const updated = new Date(sh.updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <Card key={sh.id}>
            <View style={s.row}>
              <Text style={s.shName}>{sh.name}</Text>
              <Text style={s.shOpen}>{left > 0 ? `${left} open` : 'Full'}</Text>
            </View>
            <Text style={s.muted}>{sh.barangay} · updated {updated}</Text>
            <View style={s.track}>
              <View style={[s.fill, { width: `${pct}%` }]} />
            </View>
            <Text style={s.muted}>{sh.occupied} of {sh.capacity} occupied</Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}
