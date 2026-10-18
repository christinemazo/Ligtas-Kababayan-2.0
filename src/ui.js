
import { Pressable, StyleSheet, Text, View } from 'react-native';

// ==========================================
// LIGTAS KABABAYAN
// BFP-INSPIRED FLOOD RESCUE THEME
// ==========================================

export const C = {
  // Main colors
  bg: '#F1F5F9',
  card: '#FFFFFF',
  tx: '#102A43',
  mut: '#62758A',
  bd: '#D6E0E9',

  // Emergency service colors
  pri: '#102A43',
  sos: '#C62828',
  sosRing: 'rgba(198,40,40,0.16)',
  sosSoft: '#FFF0F0',
  sosGlow: 'rgba(198,40,40,0.25)',

  // Flood rescue colors
  water: '#168AAD',
  waterSoft: '#E4F5FB',
  mapBg: '#DCECF3',

  // Alerts and status
  chip: '#EAF0F6',
  ok: '#198754',
  warn: '#B77900',
  warning: '#FFC928',

  // Extra colors for screen designs
  navyDark: '#071B2D',
  redDark: '#941B1B',
  white: '#FFFFFF',
};

// ==========================================
// SHARED STYLES
// ==========================================

export const s = StyleSheet.create({
  // ---------- TEXT ----------

  h2: {
    fontSize: 24,
    fontWeight: '800',
    color: C.tx,
    marginVertical: 6,
    letterSpacing: -0.4,
  },

  h3: {
    fontSize: 18,
    fontWeight: '700',
    color: C.tx,
    marginVertical: 7,
  },

  muted: {
    color: C.mut,
    marginVertical: 4,
    fontSize: 14,
    lineHeight: 21,
  },

  label: {
    fontWeight: '700',
    fontSize: 14,
    color: C.tx,
    marginTop: 12,
    marginBottom: 4,
  },

  code: {
    fontWeight: '800',
    color: C.sos,
    fontSize: 17,
  },

  bold: {
    fontWeight: '700',
    color: C.tx,
  },

  // ---------- LAYOUT ----------

  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },

  pad: {
    padding: 18,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },

  mt6: {
    marginTop: 6,
  },

  mt8: {
    marginTop: 8,
  },

  mt12: {
    marginTop: 12,
  },

  mb10: {
    marginBottom: 10,
  },

  // ---------- INPUTS ----------

  input: {
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 5,
    color: C.tx,
    backgroundColor: C.card,
  },

  textarea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // ---------- CARDS ----------

  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,

    // Android shadow
    elevation: 2,

    // iOS shadow
    shadowColor: '#102A43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
  },

  cardCenter: {
    alignItems: 'center',
  },

  // ---------- INFORMATION NOTES ----------

  note: {
    borderLeftWidth: 5,
    borderLeftColor: C.water,
    backgroundColor: C.waterSoft,
    padding: 13,
    borderRadius: 9,
    marginVertical: 9,
  },

  noteText: {
    color: C.tx,
    fontSize: 14,
    lineHeight: 21,
  },

  // ---------- BUTTONS ----------

  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: C.pri,
  },

  btnSmall: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    minHeight: 40,
  },

  btnSos: {
    paddingVertical: 18,
    borderRadius: 14,
    minHeight: 60,
  },

  btnText: {
    fontWeight: '800',
    fontSize: 16,
    color: C.white,
    textAlign: 'center',
  },

  btnTextSmall: {
    fontSize: 14,
  },

  btnTextSos: {
    fontSize: 19,
    letterSpacing: 0.5,
  },

  btnTextSec: {
    color: C.tx,
  },

  disabled: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.82,
  },

  // ---------- CHIPS ----------

  chip: {
    borderWidth: 1.5,
    borderColor: C.bd,
    backgroundColor: C.card,
    borderRadius: 24,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },

  chipOn: {
    borderColor: C.pri,
    backgroundColor: C.chip,
  },

  chipText: {
    color: C.tx,
    fontSize: 14,
  },

  chipTextOn: {
    fontWeight: '800',
    color: C.pri,
  },

  // ---------- APP SHELL ----------

  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  bannerWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: C.bg,
  },

  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: C.navyDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    elevation: 6,
    maxWidth: '92%',
  },

  toastText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ---------- HOME SCREEN ----------

  sosRing: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: C.sosRing,
    borderWidth: 1,
    borderColor: C.sosGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },

  sosBtn: {
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: C.sos,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',

    elevation: 8,

    shadowColor: C.sos,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  sosText: {
    color: C.white,
    fontSize: 43,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ---------- SOS SCREEN HEADER ----------

  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.bd,
  },

  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.bd,
    paddingLeft: 14,
    paddingRight: 10,
  },

  barIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  barInput: {
    flex: 1,
    fontSize: 15,
    color: C.tx,
    paddingVertical: 0,
  },

  barTarget: {
    marginLeft: 8,
  },

  targetRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: C.water,
    alignItems: 'center',
    justifyContent: 'center',
  },

  targetDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.water,
  },

  // ---------- SEARCH RESULTS ----------

  results: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.bd,
    borderRadius: 12,
    backgroundColor: C.card,
    overflow: 'hidden',
  },

  resultRow: {
    padding: 13,
  },

  resultDivider: {
    borderTopWidth: 1,
    borderTopColor: C.bd,
  },

  resultText: {
    color: C.tx,
    fontSize: 14,
  },

  resultMsg: {
    padding: 12,
  },

  // ---------- FLOOD MAP ----------

  mapWrap: {
    paddingHorizontal: 14,
  },

  mapBox: {
    height: 230,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.bd,
    backgroundColor: C.mapBg,
  },

  levelsContent: {
    padding: 16,
    paddingTop: 8,
  },

  // ---------- WATER LEVEL OPTIONS ----------

  level: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.bd,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 9,
  },

  levelOn: {
    borderColor: C.sos,
    backgroundColor: C.sosSoft,
  },

  levelName: {
    fontWeight: '800',
    color: C.tx,
    fontSize: 15,
  },

  sendWrap: {
    padding: 16,
    paddingTop: 6,
  },

  // ---------- SOS CONFIRMATION SCREEN ----------

  steps: {
    flexDirection: 'row',
    gap: 7,
    marginVertical: 14,
  },

  step: {
    flex: 1,
    borderTopWidth: 7,
    borderTopColor: C.bd,
    paddingTop: 7,
  },

  stepDone: {
    borderTopColor: C.ok,
  },

  stepText: {
    textAlign: 'center',
    fontSize: 12,
    color: C.mut,
  },

  stepTextDone: {
    color: C.tx,
    fontWeight: '800',
  },

  // ---------- EVACUATION SHELTERS ----------

  shName: {
    fontWeight: '800',
    color: C.tx,
    flex: 1,
    fontSize: 15,
  },

  shOpen: {
    fontWeight: '800',
    color: C.ok,
  },

  track: {
    height: 11,
    borderRadius: 6,
    backgroundColor: C.bd,
    overflow: 'hidden',
    marginVertical: 6,
  },

  fill: {
    height: '100%',
    backgroundColor: C.ok,
  },

  // ---------- MAP CONTAINER ----------

  mapRoot: {
    flex: 1,
    backgroundColor: C.mapBg,
  },

  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  mapOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: C.mapBg,
  },

  mapOverlayText: {
    textAlign: 'center',
    color: C.tx,
    fontSize: 14,
  },
});

// Keep existing exports for compatibility.
export const ui = s;

// ==========================================
// SHARED COMPONENTS
// ==========================================

const BG = {
  pri: C.pri,
  sec: C.chip,
  sos: C.sos,
};

export function Btn({
  title,
  onPress,
  kind = 'pri',
  disabled,
  small,
  style,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: BG[kind] || C.pri },
        small && s.btnSmall,
        kind === 'sos' && s.btnSos,
        disabled && s.disabled,
        pressed && s.pressed,
        style,
      ]}
    >
      <Text
        style={[
          s.btnText,
          small && s.btnTextSmall,
          kind === 'sos' && s.btnTextSos,
          kind === 'sec' && s.btnTextSec,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export const Card = ({ children, style }) => (
  <View style={[s.card, style]}>
    {children}
  </View>
);

export const Note = ({ children }) => (
  <View style={s.note}>
    <Text style={s.noteText}>
      {children}
    </Text>
  </View>
);

export const Chip = ({ label, on, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: !!on }}
    style={[s.chip, on && s.chipOn]}
  >
    <Text style={[s.chipText, on && s.chipTextOn]}>
      {label}
    </Text>
  </Pressable>
);
