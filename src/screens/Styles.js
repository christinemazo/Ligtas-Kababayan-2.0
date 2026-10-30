import { StyleSheet } from 'react-native';

// style used by Home, Sos, Sent and Shelters.
export const T = {
  navy: '#102A43',
  red: '#C62828',
  redSoft: '#FFF0F0',
  blue: '#168AAD',
  blueSoft: '#E4F5FB',
  yellow: '#FFC928',
  yellowSoft: '#FFF8DB',
  yellowText: '#755500',
  green: '#198754',
  greenSoft: '#E4F5EB',
  white: '#FFFFFF',
  text: '#243B53',
  muted: '#62758A',
  border: '#D6E0E9',
  track: '#EAF0F6',
  background: '#F1F5F9',
  disabled: '#AAB5C0',
  headerText: '#D9E6F2',
};

export const st = StyleSheet.create({
  // ---------- Header banner (all screens) ----------
  header: {
    backgroundColor: T.navy,
    padding: 22,
    borderRadius: 18,
    marginBottom: 16,
  },
  eyebrow: {
    color: T.yellow,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: { color: T.white, fontSize: 25, fontWeight: '900', marginTop: 8 },
  subtitle: {
    color: T.headerText,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },

  // ---------- Typography ----------
  h2: { color: T.navy, fontSize: 20, fontWeight: '900' },
  h3: { color: T.navy, fontSize: 18, fontWeight: '900', lineHeight: 24 },
  body: { color: T.text, fontSize: 14, lineHeight: 21 },
  small: { color: T.muted, fontSize: 13, lineHeight: 20 },
  tiny: { color: T.muted, fontSize: 12 },
  label: { color: T.muted, fontSize: 12, fontWeight: '700' },

  // ---------- Callout boxes ----------
  note: { borderLeftWidth: 5, borderRadius: 12, padding: 15, marginBottom: 16 },
  noteYellow: { backgroundColor: T.yellowSoft, borderLeftColor: T.yellow },
  noteRed: { backgroundColor: T.redSoft, borderLeftColor: T.red },
  noteBlue: { backgroundColor: T.blueSoft, borderLeftColor: T.blue },
  noteTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  noteBody: { color: T.text, fontSize: 13, lineHeight: 20 },

  // ---------- Status box + reference ----------
  statusBox: { borderRadius: 14, padding: 16, marginBottom: 16 },
  statusTag: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  statusTitle: { color: T.navy, fontSize: 21, fontWeight: '900', marginTop: 8 },
  refBox: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  refId: { color: T.navy, fontSize: 17, fontWeight: '900', marginTop: 6 },

  // ---------- Progress steps ----------
  step: { flexDirection: 'row', alignItems: 'flex-start' },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.track,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepDotDone: { backgroundColor: T.green },
  stepText: { flex: 1, paddingTop: 5, fontSize: 14 },

  // ---------- Home ----------
  homeHeader: {
    backgroundColor: T.navy,
    padding: 20,
    borderRadius: 18,
    marginBottom: 18,
  },
  sosHalo: {
    backgroundColor: T.redSoft,
    borderRadius: 100,
    padding: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: T.red,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  sosText: { color: T.white, fontSize: 38, fontWeight: '900', letterSpacing: 2 },
  sosHint: { color: T.white, fontSize: 11, fontWeight: '700', marginTop: 2 },
  linkRow: {
    backgroundColor: T.white,
    borderColor: T.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkTitle: { color: T.navy, fontSize: 17, fontWeight: '800' },
  chevron: { color: T.blue, fontSize: 26, fontWeight: '800' },

  // ---------- Request Rescue (Sos) ----------

  // New {
    topBar: {
    backgroundColor: T.navy,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  // }
  
  topEyebrow: {
    color: T.yellow,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  topTitle: { color: T.white, fontSize: 18, fontWeight: '900' }, // New

  // New {
    searchBar: {
    backgroundColor: T.white,
    borderRadius: 12,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, color: T.text, fontSize: 14, paddingVertical: 8 },
  gpsBtn: {
    backgroundColor: T.blueSoft,
    padding: 5,
    borderRadius: 9,
    marginLeft: 5,
  },
  // }
  
  results: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  result: { padding: 13, borderBottomColor: T.border },
  sectionCard: {
    backgroundColor: T.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 18,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: T.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mapBox: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#DCECF3',
    borderWidth: 1,
    borderColor: T.border,
  },
  locationBox: {
    backgroundColor: T.blueSoft,
    padding: 11,
    borderRadius: 10,
    marginTop: 12,
  },
  warnBox: {
    backgroundColor: T.yellowSoft,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },
  level: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelOn: { backgroundColor: T.redSoft, borderWidth: 2, borderColor: T.red },
  levelNum: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  levelNumOn: { backgroundColor: T.red },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: T.red },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.red },

  // New {
    footer: {
    backgroundColor: T.white,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sendBtn: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: T.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // }
  sendBtnOff: { backgroundColor: T.disabled },
  
  sendText: { color: T.white, fontSize: 16, fontWeight: '900', letterSpacing: 1.2 }, // New
  // ---------- Sent form ----------
  smsBox: {
    backgroundColor: T.blueSoft,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  // ---------- Shelters ----------
  statRow: { flexDirection: 'row', marginTop: 18, gap: 10 },
  statBox: { flex: 1, backgroundColor: T.white, borderRadius: 12, padding: 12 },
  statNum: { fontSize: 25, fontWeight: '900', marginTop: 4 },
  pill: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  pillText: { fontSize: 12, fontWeight: '900' },
  bar: {
    height: 9,
    backgroundColor: T.track,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
});