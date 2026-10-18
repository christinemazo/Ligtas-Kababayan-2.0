import { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Btn, Card, Chip, Note, s } from '../ui';
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
      <ScrollView contentContainerStyle={s.pad}>
        <Card>
          <Text style={s.h2}>SOS not sent</Text>
          <Note>
            {mine.error === 'outside'
              ? 'Your location is outside the barangays covered by this system. '
              : 'The server could not accept this request. '}
            Call 911 or your barangay hotline now.
          </Note>
          <Text style={s.muted}>If the pin was wrong, go back, move it to your real location and send again.</Text>
        </Card>
        <Btn title="Try again" onPress={onTryAgain} />
        <Btn kind="sec" title="Back to home" onPress={onHome} style={s.mt8} />
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
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={s.h2}>{sent ? 'Help request sent' : mine.sending ? 'Sending...' : 'Saved on your phone'}</Text>
          {sent && <Text selectable style={s.code}>{mine.id}</Text>}
          <View style={s.steps}>
            {STEPS.map((t, n) => {
              const done = sent && n <= reached;
              return (
                <View key={t} style={[s.step, done && s.stepDone]}>
                  <Text style={[s.stepText, done && s.stepTextDone]}>{t}</Text>
                </View>
              );
            })}
          </View>
          {waiting && (
            <>
              <Note>Waiting for signal. It sends by itself when the internet returns.</Note>
              <Text style={s.muted}>No data but you have cell signal? Text this to the barangay SMS number:</Text>
              <Note><Text style={s.bold}>{sms}</Text></Note>
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
          <Text style={s.h3}>Add details (optional)</Text>
          <Text style={s.label}>Headcount</Text>
          <View style={s.chips}>
            {HEADS.map((h) => <Chip key={h} label={h} on={head === h} onPress={() => setHead(h)} />)}
          </View>
          <Text style={s.label}>Someone vulnerable is with me</Text>
          <View style={s.chips}>
            {VULS.map((v) => <Chip key={v} label={v} on={vul.includes(v)} onPress={() => toggleVul(v)} />)}
          </View>
          <Text style={s.label}>Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} />
          <Text style={s.label}>Phone number</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={s.label}>Landmark</Text>
          <TextInput style={[s.input, s.textarea]} value={desc} onChangeText={setDesc} multiline textAlignVertical="top" />
          <Btn title="Save details" onPress={save} disabled={saving || !!mine.sending} style={s.mt12} />
        </Card>

        <Btn kind="sec" title="Back to home" onPress={onHome} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
