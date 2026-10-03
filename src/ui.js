import { Pressable, StyleSheet, Text, View } from 'react-native';

export const C = {
  bg: '#eef3f7', card: '#ffffff', tx: '#0d2238', mut: '#5b6f82', bd: '#d3dde6',
  pri: '#0b3a63', sos: '#e0312b', chip: '#e3edf5', ok: '#1b8a5a', warn: '#c77700',
};

export const ui = StyleSheet.create({
  h2: { fontSize: 22, fontWeight: '700', color: C.tx, marginVertical: 4 },
  h3: { fontSize: 17, fontWeight: '700', color: C.tx, marginVertical: 6 },
  muted: { color: C.mut, marginVertical: 3, fontSize: 15 },
  label: { fontWeight: '700', fontSize: 14, color: C.tx, marginTop: 10 },
  input: { borderWidth: 1, borderColor: C.bd, borderRadius: 10, padding: 11, fontSize: 16, marginTop: 4, color: C.tx },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.bd, borderRadius: 14, padding: 14, marginBottom: 12 },
  note: { borderLeftWidth: 4, borderLeftColor: C.warn, backgroundColor: C.chip, padding: 10, borderRadius: 6, marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});

export function Btn({ title, onPress, kind = 'pri', disabled, small, style }) {
  const bg = kind === 'sec' ? C.chip : kind === 'sos' ? C.sos : C.pri;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: 12, alignItems: 'center',
          padding: small ? 10 : kind === 'sos' ? 18 : 14,
          ...(small ? { paddingHorizontal: 16 } : {}),
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={{ fontWeight: '700', fontSize: kind === 'sos' ? 20 : small ? 15 : 16, color: kind === 'sec' ? C.tx : '#fff' }}>
        {title}
      </Text>
    </Pressable>
  );
}

export const Card = ({ children, style }) => <View style={[ui.card, style]}>{children}</View>;

export const Note = ({ children }) => (
  <View style={ui.note}>
    <Text style={{ color: C.tx, fontSize: 15 }}>{children}</Text>
  </View>
);

export const Chip = ({ label, on, onPress }) => (
  <Pressable
    onPress={onPress}
    style={{
      borderWidth: 2, borderColor: on ? C.pri : C.bd, backgroundColor: on ? C.chip : C.card,
      borderRadius: 20, paddingVertical: 7, paddingHorizontal: 13,
    }}
  >
    <Text style={{ color: C.tx, fontWeight: on ? '700' : '400' }}>{label}</Text>
  </Pressable>
);
