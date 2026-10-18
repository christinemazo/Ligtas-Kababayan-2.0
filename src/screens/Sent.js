
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';

import { Btn, Card, Chip, Note, s } from '../ui';
import { HEADS, STATUS, STEPS, VULS, smsText } from '../constants';

const C = {
  navy: '#102A43',
  red: '#C62828',
  redSoft: '#FFF0F0',
  blue: '#168AAD',
  blueSoft: '#E4F5FB',
  yellow: '#FFC928',
  yellowSoft: '#FFF8DB',
  green: '#198754',
  greenSoft: '#E4F5EB',
  text: '#243B53',
  muted: '#62758A',
  border: '#D6E0E9',
  white: '#FFFFFF',
};

export default function Sent({ mine, onSave, onTryAgain, onHome }) {
  const [head, setHead] = useState(mine.head || '');
  const [vul, setVul] = useState(mine.vul || []);
  const [name, setName] = useState(mine.name || '');
  const [phone, setPhone] = useState(mine.phone || '');
  const [desc, setDesc] = useState(mine.desc || '');
  const [saving, setSaving] = useState(false);

  const toggleVul = (v) =>
    setVul((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
    );

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name, phone, head, vul, desc });
    } finally {
      setSaving(false);
    }
  };

  const openSms = () => {
    const body = encodeURIComponent(smsText(mine));
    const url =
      Platform.OS === 'ios'
        ? `sms:&body=${body}`
        : `sms:?body=${body}`;

    Linking.openURL(url).catch(() => {
      // SMS app may not be available on this device.
    });
  };

  // Request rejected by the server
  if (mine.error) {
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <View
          style={{
            backgroundColor: C.navy,
            padding: 22,
            borderRadius: 18,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: C.yellow,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          >
            LIGTAS KABABAYAN
          </Text>
          <Text
            style={{
              color: C.white,
              fontSize: 25,
              fontWeight: '900',
              marginTop: 8,
            }}
          >
            Emergency Request
          </Text>
        </View>

        <Card>
          <View
            style={{
              backgroundColor: C.redSoft,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: C.red, fontSize: 21, fontWeight: '900' }}>
              SOS NOT SENT
            </Text>
            <Text
              style={{
                color: C.text,
                fontSize: 14,
                lineHeight: 21,
                marginTop: 8,
              }}
            >
              {mine.error === 'outside'
                ? 'Your location is outside the barangays covered by this system.'
                : 'The server could not accept this request.'}
            </Text>
          </View>

          <Text style={{ color: C.text, lineHeight: 22 }}>
            If you are in immediate danger, call 911 or your local emergency
            hotline if available. Do not assume that a rescue team has received
            this request.
          </Text>

          <Text
            style={{
              color: C.muted,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 12,
            }}
          >
            If the map pin is incorrect, return to the previous screen and
            correct your location before trying again.
          </Text>
        </Card>

        <Btn title="Try again" onPress={onTryAgain} />
        <Btn
          kind="sec"
          title="Back to home"
          onPress={onHome}
          style={s.mt8}
        />
      </ScrollView>
    );
  }

  const sent = !!mine.id;
  const waiting = !sent && !mine.sending;
  const reached = STATUS.indexOf(mine.status);
  const sms = smsText(mine);

  const statusTitle = sent
    ? 'SOS request submitted'
    : mine.sending
      ? 'Sending your request...'
      : 'Saved on this device';

  const statusDescription = sent
    ? 'Your request has an ID. Check the status below for the latest recorded progress.'
    : mine.sending
      ? 'Your request is being processed. Please wait for confirmation.'
      : 'Your request is stored locally and is waiting to be sent.';

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.pad, { paddingBottom: 30 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: C.navy,
            padding: 22,
            borderRadius: 18,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: C.yellow,
              fontSize: 12,
              fontWeight: '800',
              letterSpacing: 2,
            }}
          >
            EMERGENCY RESPONSE
          </Text>

          <Text
            style={{
              color: C.white,
              fontSize: 25,
              fontWeight: '900',
              marginTop: 8,
            }}
          >
            Request Status
          </Text>

          <Text
            style={{
              color: '#D9E6F2',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 6,
            }}
          >
            Keep your details updated and follow official emergency
            instructions.
          </Text>
        </View>

        {/* Request status */}
        <Card>
          <View
            style={{
              backgroundColor: sent ? C.greenSoft : C.yellowSoft,
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: sent ? C.green : '#755500',
                fontSize: 12,
                fontWeight: '900',
                letterSpacing: 1,
              }}
            >
              {sent ? 'REQUEST RECORDED' : 'REQUEST STATUS'}
            </Text>

            <Text
              style={{
                color: C.navy,
                fontSize: 21,
                fontWeight: '900',
                marginTop: 8,
              }}
            >
              {statusTitle}
            </Text>

            <Text
              style={{
                color: C.text,
                fontSize: 14,
                lineHeight: 21,
                marginTop: 7,
              }}
            >
              {statusDescription}
            </Text>
          </View>

          {sent && (
            <View
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: C.muted,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                SOS REFERENCE ID
              </Text>

              <Text
                selectable
                style={{
                  color: C.navy,
                  fontSize: 17,
                  fontWeight: '900',
                  marginTop: 6,
                }}
              >
                {mine.id}
              </Text>
            </View>
          )}

          <Text
            style={{
              color: C.navy,
              fontSize: 16,
              fontWeight: '800',
              marginBottom: 14,
            }}
          >
            Response progress
          </Text>

          {STEPS.map((step, index) => {
            const done = sent && index <= reached;
            const current = sent && index === reached;

            return (
              <View
                key={step}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: index === STEPS.length - 1 ? 0 : 12,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: done ? C.green : '#EAF0F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      color: done ? C.white : C.muted,
                      fontWeight: '900',
                    }}
                  >
                    {done ? '✓' : index + 1}
                  </Text>
                </View>

                <View style={{ flex: 1, paddingTop: 5 }}>
                  <Text
                    style={{
                      color: current ? C.green : C.text,
                      fontWeight: current ? '900' : '700',
                      fontSize: 14,
                    }}
                  >
                    {step}
                  </Text>
                </View>
              </View>
            );
          })}

          {waiting && (
            <View style={{ marginTop: 18 }}>
              <Note>
                Waiting for a connection. The app will attempt to send the
                request when internet access returns.
              </Note>

              <Text
                style={{
                  color: C.text,
                  fontSize: 14,
                  lineHeight: 21,
                  marginTop: 14,
                  marginBottom: 10,
                }}
              >
                If mobile service is available but internet is not, you can
                prepare an SMS for your barangay's designated emergency number.
              </Text>

              <View
                style={{
                  backgroundColor: C.blueSoft,
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                <Text selectable style={{ color: C.navy, lineHeight: 21 }}>
                  {sms}
                </Text>
              </View>

              <Btn kind="sec" title="Open SMS" onPress={openSms} />
            </View>
          )}
        </Card>

        {/* Optional details */}
        <Card>
          <Text
            style={{
              color: C.navy,
              fontSize: 20,
              fontWeight: '900',
            }}
          >
            Your emergency details
          </Text>

          <Text
            style={{
              color: C.muted,
              fontSize: 13,
              lineHeight: 20,
              marginTop: 6,
              marginBottom: 18,
            }}
          >
            Add information that can help responders understand your situation.
          </Text>

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
            placeholderTextColor={C.muted}
            accessibilityLabel="Full name"
            autoCapitalize="words"
          />

          <Text style={s.label}>Contact number</Text>
          <TextInput
            style={s.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Enter your phone number"
            placeholderTextColor={C.muted}
            accessibilityLabel="Contact number"
          />

          <Text style={s.label}>Nearby landmark or instructions</Text>
          <TextInput
            style={[
              s.input,
              s.textarea,
              { minHeight: 100, textAlignVertical: 'top' },
            ]}
            value={desc}
            onChangeText={setDesc}
            multiline
            placeholder="Describe a nearby landmark or other useful details"
            placeholderTextColor={C.muted}
            accessibilityLabel="Nearby landmark or instructions"
          />

          <Btn
            title={saving ? 'Saving details...' : 'Save emergency details'}
            onPress={save}
            disabled={saving || !!mine.sending}
            style={s.mt12}
          />
        </Card>

        {/* Emergency reminder */}
        <View
          style={{
            backgroundColor: C.redSoft,
            borderLeftWidth: 5,
            borderLeftColor: C.red,
            borderRadius: 12,
            padding: 15,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: C.red,
              fontSize: 14,
              fontWeight: '900',
              marginBottom: 6,
            }}
          >
            IMPORTANT
          </Text>

          <Text style={{ color: C.text, fontSize: 13, lineHeight: 20 }}>
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
