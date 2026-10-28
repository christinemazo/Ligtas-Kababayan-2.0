import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Btn, Card, Chip, Note, s } from '../ui';
// HEADS, VULS = choice lists; STATUS = ['new','ack','done']; STEPS = labels; smsText = builds the SMS text
import { HEADS, STATUS, STEPS, VULS, smsText } from '../constants';
import { T, st } from './Styles';

// mine = the SOS this phone sent (from App.js)
// onSave = save the details, onTryAgain = go back to the SOS screen, onHome = go back to home
export default function Sent({ mine, onSave, onTryAgain, onHome }) {
  // Form fields start with whatever is already saved on the SOS
  const [head, setHead] = useState(mine.head || '');   // how many people
  const [vul, setVul] = useState(mine.vul || []);      // vulnerable groups (can pick several)
  const [name, setName] = useState(mine.name || '');
  const [phone, setPhone] = useState(mine.phone || '');
  const [desc, setDesc] = useState(mine.desc || '');   // landmark / instructions
  const [saving, setSaving] = useState(false);         // true while the save button is working

  // Add the group if it is not chosen yet, remove it if it is
  const toggleVul = (v) =>
    setVul((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
    );

  // Save the details through App.js
  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name, phone, head, vul, desc });
    } finally {
      setSaving(false); // always turn the saving state off, even if saving failed
    }
  };

  // Open the phone's SMS app with the emergency text already typed
  const openSms = () => {
    const body = encodeURIComponent(smsText(mine)); // make the text safe for a link
    // iPhone and Android write the SMS link slightly differently
    const url = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    Linking.openURL(url).catch(() => {
      // SMS app may not be available on this device.
    });
  };

  // Request rejected by the server
  // (shown instead of the normal screen when mine.error is set)
  if (mine.error) {
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <View style={st.header}>
          <Text style={st.eyebrow}>LIGTAS KABABAYAN</Text>
          <Text style={st.title}>Emergency Request</Text>
        </View>

        <Card>
          {/* Red box saying the SOS was NOT sent */}
          <View style={[st.statusBox, { backgroundColor: T.redSoft }]}>
            <Text style={{ color: T.red, fontSize: 21, fontWeight: '900' }}>
              SOS NOT SENT
            </Text>
            <Text style={[st.body, { marginTop: 8 }]}>
              {/* 'outside' = the pin is not inside any covered barangay */}
              {mine.error === 'outside'
                ? 'Your location is outside the barangays covered by this system.'
                : 'The server could not accept this request.'}
            </Text>
          </View>

          <Text style={[st.body, { lineHeight: 22 }]}>
            If you are in immediate danger, call 911 or your local emergency
            hotline if available. Do not assume that a rescue team has received
            this request.
          </Text>
          <Text style={[st.small, { marginTop: 12 }]}>
            If the map pin is incorrect, return to the previous screen and
            correct your location before trying again.
          </Text>
        </Card>

        <Btn title="Try again" onPress={onTryAgain} />
        <Btn kind="sec" title="Back to home" onPress={onHome} style={s.mt8} />
      </ScrollView>
    );
  }

  // ----- Values worked out from the current SOS -----
  const sent = !!mine.id;                        // true once the server gave a reference code
  const waiting = !sent && !mine.sending;        // not sent yet and not trying now = saved on the phone
  const reached = STATUS.indexOf(mine.status);   // 0 = new, 1 = ack, 2 = done
  const sms = smsText(mine);                     // fallback SMS text

  // Heading for the status box
  const statusTitle = sent
    ? 'SOS request submitted'
    : mine.sending
      ? 'Sending your request...'
      : 'Saved on this device';

  // Explanation under the heading
  const statusDescription = sent
    ? 'Your request has an ID. Check the status below for the latest recorded progress.'
    : mine.sending
      ? 'Your request is being processed. Please wait for confirmation.'
      : 'Your request is stored locally and is waiting to be sent.';

  return (
    // On iPhone, push the screen up when the keyboard opens
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.pad, { paddingBottom: 30 }]}
        keyboardShouldPersistTaps="handled" // buttons still work while the keyboard is open
      >
        <View style={st.header}>
          <Text style={st.eyebrow}>EMERGENCY RESPONSE</Text>
          <Text style={st.title}>Request Status</Text>
          <Text style={st.subtitle}>
            Keep your details updated and follow official emergency
            instructions.
          </Text>
        </View>

        {/* Status card */}
        <Card>
          {/* Green when sent, yellow while sending or waiting */}
          <View
            style={[
              st.statusBox,
              { backgroundColor: sent ? T.greenSoft : T.yellowSoft },
            ]}
          >
            <Text
              style={[st.statusTag, { color: sent ? T.green : T.yellowText }]}
            >
              {sent ? 'REQUEST RECORDED' : 'REQUEST STATUS'}
            </Text>
            <Text style={st.statusTitle}>{statusTitle}</Text>
            <Text style={[st.body, { marginTop: 7 }]}>{statusDescription}</Text>
          </View>

          {/* Reference ID is shown only after the server accepted the SOS */}
          {sent && (
            <View style={st.refBox}>
              <Text style={st.label}>SOS REFERENCE ID</Text>
              {/* selectable lets the user copy the code */}
              <Text selectable style={st.refId}>
                {mine.id}
              </Text>
            </View>
          )}

          <Text style={[st.h3, { fontSize: 16, marginBottom: 14 }]}>
            Response progress
          </Text>

          {/* One row per step: Sent, Received, Rescued */}
          {STEPS.map((step, index) => {
            const done = sent && index <= reached;     // this step has been reached
            const current = sent && index === reached; // this is the latest step

            return (
              <View
                key={step}
                style={[
                  st.step,
                  // space between rows, but none after the last one
                  { marginBottom: index === STEPS.length - 1 ? 0 : 12 },
                ]}
              >
                {/* Circle: a check mark when done, otherwise the step number */}
                <View style={[st.stepDot, done && st.stepDotDone]}>
                  <Text
                    style={{ color: done ? T.white : T.muted, fontWeight: '900' }}
                  >
                    {done ? '✓' : index + 1}
                  </Text>
                </View>
                {/* The current step is green and extra bold */}
                <Text
                  style={[
                    st.stepText,
                    {
                      color: current ? T.green : T.text,
                      fontWeight: current ? '900' : '700',
                    },
                  ]}
                >
                  {step}
                </Text>
              </View>
            );
          })}

          {/* Only when the SOS is saved on the phone and not yet delivered */}
          {waiting && (
            <View style={{ marginTop: 18 }}>
              <Note>
                Waiting for a connection. The app will attempt to send the
                request when internet access returns.
              </Note>

              <Text style={[st.body, { marginTop: 14, marginBottom: 10 }]}>
                If mobile service is available but internet is not, you can
                prepare an SMS for your barangay's designated emergency number.
              </Text>

              {/* The SMS text the user can copy or send */}
              <View style={st.smsBox}>
                <Text selectable style={{ color: T.navy, lineHeight: 21 }}>
                  {sms}
                </Text>
              </View>

              <Btn kind="sec" title="Open SMS" onPress={openSms} />
            </View>
          )}
        </Card>

        {/* Details form card */}
        <Card>
          <Text style={st.h2}>Your emergency details</Text>
          <Text style={[st.small, { marginTop: 6, marginBottom: 18 }]}>
            Add information that can help responders understand your situation.
          </Text>

          {/* Pick ONE: how many people are with the user */}
          <Text style={s.label}>People with you</Text>
          <View style={s.chips}>
            {HEADS.map((item) => (
              <Chip
                key={item}
                label={item}
                on={head === item}
                onPress={() => setHead(item)}
              />
            ))}
          </View>

          {/* Pick ANY: groups needing extra help */}
          <Text style={s.label}>Anyone needing extra assistance?</Text>
          <View style={s.chips}>
            {VULS.map((item) => (
              <Chip
                key={item}
                label={item}
                on={vul.includes(item)}
                onPress={() => toggleVul(item)}
              />
            ))}
          </View>

          <Text style={s.label}>Full name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={T.muted}
            accessibilityLabel="Full name"
            autoCapitalize="words" // capitalise each word
          />

          <Text style={s.label}>Contact number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad" // number keyboard
            placeholder="Enter your phone number"
            placeholderTextColor={T.muted}
            accessibilityLabel="Contact number"
          />

          <Text style={s.label}>Nearby landmark or instructions</Text>
          <TextInput
            style={[s.input, s.textarea, { minHeight: 100, textAlignVertical: 'top' }]}
            value={desc}
            onChangeText={setDesc}
            multiline // allow several lines
            placeholder="Describe a nearby landmark or other useful details"
            placeholderTextColor={T.muted}
            accessibilityLabel="Nearby landmark or instructions"
          />

          {/* Disabled while saving, or while the SOS itself is still being sent */}
          <Btn
            title={saving ? 'Saving details...' : 'Save emergency details'}
            onPress={save}
            disabled={saving || !!mine.sending}
            style={s.mt12}
          />
        </Card>

        {/* Reminder that the app status is not a guarantee */}
        <View style={[st.note, st.noteRed]}>
          <Text style={[st.noteTitle, { color: T.red }]}>IMPORTANT</Text>
          <Text style={st.noteBody}>
            An app status does not guarantee that rescuers have received your
            request. If you are in immediate danger, contact 911 or your local
            emergency service if available, and follow official instructions.
          </Text>
        </View>

        <Btn kind="sec" title="Back to home" onPress={onHome} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}