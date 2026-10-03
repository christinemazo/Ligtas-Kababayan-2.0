import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Btn, C, Card, Chip, Note, ui } from '../ui';
import { HEADS, STATUS, STEPS, VULS, smsText } from '../constants';

export default function Sent({ mine, onSave, onTryAgain, onHome }) {
  const [head, setHead] = useState(mine.head || '');
  const [vul, setVul] = useState(mine.vul || []);
  const [name, setName] = useState(mine.name || '');
  const [phone, setPhone] = useState(mine.phone || '');
  const [desc, setDesc] = useState(mine.desc || '');
  const [saving, setSaving] = useState(false);

  // The server will never accept this SOS (e.g. location outside every barangay)
  if (mine.error) {
    return (
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Card>
          <Text style={ui.h2}>SOS not sent</Text>
          <Note>
            {mine.error === 'outside'
              ? 'Your location is outside the barangays covered by this system. '
              : 'The server could not accept this request. '}
            Call 911 or your barangay hotline now.
          </Note>
          <Text style={ui.muted}>If the pin was wrong, go back, move it to your real location and send again.</Text>
        </Card>
        <Btn title="Try again" onPress={onTryAgain} />
        <Btn kind="sec" title="Back to home" onPress={onHome} style={{ marginTop: 8 }} />
      </ScrollView>
    );
  }

  const sent = !!mine.id;
  const waiting = !sent && !mine.sending;
  const reached = STATUS.indexOf(mine.status);
  const sms = smsText(mine);
  const toggleVul = (v) => setVul((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const save = async () => {
    setSaving(true);
    await onSave({ name, phone, head, vul, desc });
    setSaving(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 14 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={ui.h2}>{sent ? 'Help request sent' : mine.sending ? 'Sending...' : 'Saved on your phone'}</Text>
          {sent && <Text selectable style={{ fontWeight: '700', color: C.tx, fontSize: 16 }}>{mine.id}</Text>}
          <View style={{ flexDirection: 'row', gap: 6, marginVertical: 10 }}>
            {STEPS.map((t, n) => (
              <View key={t} style={{ flex: 1, borderTopWidth: 8, paddingTop: 4,
                                     borderTopColor: sent && n <= reached ? C.ok : C.bd }}>
                <Text style={{ textAlign: 'center', fontSize: 13, color: sent && n <= reached ? C.tx : C.mut,
                               fontWeight: sent && n <= reached ? '700' : '400' }}>{t}</Text>
              </View>
            ))}
          </View>
          {waiting && (
            <>
              <Note>Waiting for signal. It sends by itself when the internet returns.</Note>
              <Text style={ui.muted}>No data but you have cell signal? Text this to the barangay SMS number:</Text>
              <Note><Text style={{ fontWeight: '700' }}>{sms}</Text></Note>
              <Btn
                kind="sec"
                title="Open SMS"
                onPress={() =>
                  Linking.openURL(
                    Platform.OS === 'ios' ? `sms:&body=${encodeURIComponent(sms)}` : `sms:?body=${encodeURIComponent(sms)}`
                  )
                }
              />
            </>
          )}
        </Card>

        <Card>
          <Text style={ui.h3}>Add details (optional)</Text>
          <Text style={ui.label}>Headcount</Text>
          <View style={ui.chips}>
            {HEADS.map((h) => <Chip key={h} label={h} on={head === h} onPress={() => setHead(h)} />)}
          </View>
          <Text style={ui.label}>Someone vulnerable is with me</Text>
          <View style={ui.chips}>
            {VULS.map((v) => <Chip key={v} label={v} on={vul.includes(v)} onPress={() => toggleVul(v)} />)}
          </View>
          <Text style={ui.label}>Name</Text>
          <TextInput style={ui.input} value={name} onChangeText={setName} />
          <Text style={ui.label}>Phone number</Text>
          <TextInput style={ui.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={ui.label}>Landmark</Text>
          <TextInput style={[ui.input, { height: 70 }]} value={desc} onChangeText={setDesc} multiline textAlignVertical="top" />
          <Btn title="Save details" onPress={save} disabled={saving || !!mine.sending} style={{ marginTop: 12 }} />
        </Card>

        <Btn kind="sec" title="Back to home" onPress={onHome} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
