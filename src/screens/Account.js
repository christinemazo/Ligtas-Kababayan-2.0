import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { Btn, Card, s } from '../ui';
import { signIn, signUp } from '../auth';
import { T, st } from './Styles';

// Sign in or create an account. Needed before an SOS can be sent.
export default function Account({ onDone, onBack }) {
  const [mode, setMode] = useState('in'); // 'in' = sign in, 'up' = create account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const creating = mode === 'up';

  const submit = async () => {
    const mail = email.trim();
    if (creating && !name.trim()) return setError('Enter your full name.');
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('The password needs at least 6 characters.');

    setError('');
    setBusy(true);
    try {
      if (creating) await signUp(mail, password, name.trim());
      else await signIn(mail, password);
      setBusy(false);
      onDone();
    } catch (e) {
      setBusy(false);
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.pad, { paddingBottom: 30 }]} keyboardShouldPersistTaps="handled">
        <View style={st.header}>
          <Text style={st.eyebrow}>LIGTAS KABABAYAN</Text>
          <Text style={st.title}>{creating ? 'Create your account' : 'Sign in to send SOS'}</Text>
          <Text style={st.subtitle}>
            An account is needed to send a rescue request. You sign in once and the app remembers you.
          </Text>
        </View>

        <Card>
          {creating && (
            <>
              <Text style={s.label}>Full name</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={T.muted}
                accessibilityLabel="Full name"
                autoCapitalize="words"
              />
            </>
          )}

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={T.muted}
            accessibilityLabel="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={T.muted}
            accessibilityLabel="Password"
            secureTextEntry
            autoCapitalize="none"
            onSubmitEditing={submit}
          />

          {!!error && <Text style={[st.body, { color: T.red, marginTop: 12 }]}>{error}</Text>}

          <Btn
            title={busy ? 'Please wait...' : creating ? 'Create account' : 'Sign in'}
            onPress={submit}
            disabled={busy}
            style={s.mt12}
          />
          <Btn
            kind="sec"
            title={creating ? 'I already have an account' : 'Create an account'}
            onPress={() => {
              setMode(creating ? 'in' : 'up');
              setError('');
            }}
            style={s.mt8}
          />
        </Card>

        <Text style={[st.small, { marginBottom: 12 }]}>
          If you are in immediate danger, call 911 or your local emergency hotline first.
        </Text>
        <Btn kind="sec" title="Back to home" onPress={onBack} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
