// ALL DESIGN LIVES IN THIS FILE: colors, text sizes, spacing, buttons, cards,

import { Pressable, StyleSheet, Text, View } from 'react-native';

// ---------- colors ----------
export const C = {
  bg: '#eef3f7',        // screen background
  card: '#ffffff',      // cards, bars, inputs
  tx: '#0d2238',        // main text
  mut: '#5b6f82',       // secondary text
  bd: '#d3dde6',        // borders
  pri: '#0b3a63',       // main buttons
  sos: '#e0312b',       // SOS red
  sosRing: 'rgba(224,49,43,0.25)',
  sosSoft: 'rgba(224,49,43,0.1)',
  sosGlow: 'rgba(224,49,43,.35)',
  chip: '#e3edf5',      // light buttons, chips, notes
  ok: '#1b8a5a',        // green (progress, shelter bar)
  warn: '#c77700',      // note stripe
  mapBg: '#dfe7ee',     // map while it loads
};

// ---------- styles ----------
export const s = StyleSheet.create({
  // text
  h2: { fontSize: 22, fontWeight: '700', color: C.tx, marginVertical: 4 },
  h3: { fontSize: 17, fontWeight: '700', color: C.tx, marginVertical: 6 },
  muted: { color: C.mut, marginVertical: 3, fontSize: 15 },
  label: { fontWeight: '700', fontSize: 14, color: C.tx, marginTop: 10 },
  code: { fontWeight: '700', color: C.tx, fontSize: 16 },
  bold: { fontWeight: '700' },

  // layout helpers
  screen: { flex: 1 },
  pad: { padding: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' 
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  mt6: { marginTop: 6 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mb10: { marginBottom: 10 },

  // inputs
  input: {
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 10,
    padding: 11,
    fontSize: 16,
    marginTop: 4,
    color: C.tx 
  },
  textarea: { height: 70 },

  // cards and notes
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12
  },
  cardCenter: {
    alignItems: 'center'
  },
  note: {
    borderLeftWidth: 4,
    borderLeftColor: C.warn,
    backgroundColor: C.chip,
    padding: 10, borderRadius: 6,
    marginVertical: 8
  },
  noteText: {
    color: C.tx,
    fontSize: 15
  },

  // buttons
  btn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  btnSmall: { padding: 10, paddingHorizontal: 16 },
  btnSos: { padding: 18 },
  btnText: { fontWeight: '700', fontSize: 16, color: '#fff' },
  btnTextSmall: { fontSize: 15 },
  btnTextSos: { fontSize: 20 },
  btnTextSec: { color: C.tx },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },

  // chips (headcount, vulnerable)
  chip: {
    borderWidth: 2,
    borderColor: C.bd,
    backgroundColor: C.card,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13
  },
  chipOn: { borderColor: C.pri, backgroundColor: C.chip },
  chipText: { color: C.tx },
  chipTextOn: { fontWeight: '700' },

  // app shell
  root: { flex: 1, backgroundColor: C.bg },
  bannerWrap: { paddingHorizontal: 14 },
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: C.tx,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24
  },
  toastText: { color: '#fff' },

  // home screen
  sosRing: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: C.sosRing,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14
  },
  sosBtn: { width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: C.sos,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sosText: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '700'
  },

  // SOS screen: top bar
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, padding: 14,
    paddingBottom: 8
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.bd,
    paddingLeft: 14,
    paddingRight: 10
  },
  barIcon: { fontSize: 16, marginRight: 8 },
  barInput: { flex: 1, fontSize: 15, color: C.tx, paddingVertical: 0 },
  barTarget: { marginLeft: 8 },
  targetRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: C.pri,
    alignItems: 'center',
    justifyContent: 'center'
  },
  targetDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.pri
  },

  // SOS screen: search results
  results: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 10,
    backgroundColor: C.card
  },
  resultRow: { padding: 10 },
  resultDivider: { borderTopWidth: 1, borderTopColor: C.bd },
  resultText: { color: C.tx },
  resultMsg: { padding: 10 },

  // SOS screen: map and water level
  mapWrap: { paddingHorizontal: 14 },
  mapBox: { height: 210, borderRadius: 12, overflow: 'hidden' },
  levelsContent: { padding: 14, paddingTop: 6 },
  level: {
    flexDirection: 'row', 
  justifyContent: 'space-between',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: C.bd,
  backgroundColor: C.card,
  borderRadius: 12,
  paddingVertical: 11,
  paddingHorizontal: 12,
  marginBottom: 7
},
  levelOn: { borderColor: C.sos, backgroundColor: C.sosSoft },
  levelName: { fontWeight: '700', color: C.tx, fontSize: 16 },
  sendWrap: { padding: 14, paddingTop: 4 },

  // sent screen
  steps: { flexDirection: 'row', gap: 6, marginVertical: 10 },
  step: {
    flex: 1,
    borderTopWidth: 8,
    borderTopColor: C.bd,
    paddingTop: 4
  },
  stepDone: { borderTopColor: C.ok },
  stepText: { textAlign: 'center', fontSize: 13, color: C.mut },
  stepTextDone: { color: C.tx, fontWeight: '700' },

  // shelters screen
  shName: { fontWeight: '700', color: C.tx, flex: 1 },
  shOpen: { fontWeight: '700', color: C.tx },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: C.bd,
    overflow: 'hidden',
    marginVertical: 4
  },
  fill: { height: '100%', backgroundColor: C.ok },

  // map
  mapRoot: { flex: 1, backgroundColor: C.mapBg },
  web: { flex: 1, backgroundColor: 'transparent' },
  mapOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: C.mapBg
  },
  mapOverlayText: { textAlign: 'center', color: C.tx },
});

// Old name, kept so any file that still says `ui.h2` keeps working
export const ui = s;

// ---------- shared components ----------
const BG = { pri: C.pri, sec: C.chip, sos: C.sos };

export function Btn({ title, onPress, kind = 'pri', disabled, small, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: BG[kind] },
        small && s.btnSmall,
        kind === 'sos' && s.btnSos,
        disabled && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      <Text style={[s.btnText, small && s.btnTextSmall, kind === 'sos' && s.btnTextSos, kind === 'sec' && s.btnTextSec]}>
        {title}
      </Text>
    </Pressable>
  );
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export const Note = ({ children }) => (
  <View style={s.note}>
    <Text style={s.noteText}>{children}</Text>
  </View>
);

export const Chip = ({ label, on, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
    <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
  </Pressable>
);
