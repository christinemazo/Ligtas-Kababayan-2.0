import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 

import { Btn, Card, s } from '../ui';
import { sendResetCode, setNewPassword, signIn, signUp, verifyResetCode } from '../auth';
import { T, st } from './Styles';

// Password box with an eye button: tap it to show or hide what was typed.
function PasswordField({ value, onChangeText, placeholder, label, onSubmitEditing }) {
  const [show, setShow] = useState(false);
  return (
    <View style={[s.input, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
      <TextInput
        style={{ flex: 1, fontSize: 16, color: T.navy, paddingVertical: 12 }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.muted}
        accessibilityLabel={label}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={onSubmitEditing}
      />
      <Pressable
        onPress={() => setShow((v) => !v)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={show ? 'Hide password' : 'Show password'}
        style={{ paddingLeft: 10, paddingVertical: 8 }}
      >
        <Ionicons name={show ? 'eye-off' : 'eye'} size={22} color={T.muted} />
      </Pressable>
    </View>
  );
}

const TITLES = {
  in: 'Sign in to send SOS',
  up: 'Create your account',
  forgot: 'Forgot your password?',
  reset: 'Reset your password',
};
const SUBTITLES = {
  in: 'An account is needed to send a rescue request. You sign in once and the app remembers you.',
  up: 'An account is needed to send a rescue request. You sign in once and the app remembers you.',
  forgot: 'Enter the email of your account. We will send you a code to set a new password.',
  reset: 'Enter the code from your email and choose a new password.',
};

// Sign in, create an account, or reset a forgotten password. Needed before an SOS can be sent.
export default function Account({ onDone, onBack }) {
  const [mode, setMode] = useState('in'); // 'in' | 'up' | 'forgot' (ask for email) | 'reset' (code + new password)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false); // true once the code was accepted, so a retry does not reuse it
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const creating = mode === 'up';
  const validEmail = (m) => /^\S+@\S+\.\S+$/.test(m);

  const goMode = (next) => {
    setMode(next);
    setError('');
    setInfo('');
    setPassword('');
    setCode('');
    setVerified(false);
  };

  const submit = async () => {
    const mail = email.trim();
    if (creating && !name.trim()) return setError('Enter your full name.');
    if (!validEmail(mail)) return setError('Enter a valid email address.');
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

  // Forgot password, step 1: send the code
  const sendCode = async () => {
    const mail = email.trim();
    if (!validEmail(mail)) return setError('Enter a valid email address.');
    setError('');
    setBusy(true);
    try {
      await sendResetCode(mail);
      setBusy(false);
      goMode('reset');
      setInfo(`If ${mail} has an account, a code was sent to it. Check your inbox and spam folder.`);
    } catch (e) {
      setBusy(false);
      setError(e.message);
    }
  };

  // Forgot password, step 2 + 3: check the code, then save the new password
  const resetPassword = async () => {
    if (!/^\d{6,10}$/.test(code.trim())) return setError('Enter the code from your email (numbers only).');
    if (password.length < 6) return setError('The new password needs at least 6 characters.');

    setError('');
    setBusy(true);
    try {
      if (!verified) {
        await verifyResetCode(email.trim(), code.trim());
        setVerified(true);
      }
      await setNewPassword(password);
      setBusy(false);
      onDone(); // the person is signed in with the new password
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
          <Text style={st.title}>{TITLES[mode]}</Text>
          <Text style={st.subtitle}>{SUBTITLES[mode]}</Text>
        </View>

        <Card>
          {/* ----- sign in / create account ----- */}
          {(mode === 'in' || mode === 'up') && (
            <>
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
                placeholder="Email address"
                placeholderTextColor={T.muted}
                accessibilityLabel="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={s.label}>Password</Text>
              <PasswordField
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                label="Password"
                onSubmitEditing={submit}
              />

              {!creating && (
                <Pressable onPress={() => goMode('forgot')} accessibilityRole="button" style={{ alignSelf: 'flex-end', paddingVertical: 10 }}>
                  <Text style={{ color: T.blue, fontWeight: '700', fontSize: 14 }}>Forgot password?</Text>
                </Pressable>
              )}

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
                onPress={() => goMode(creating ? 'in' : 'up')}
                style={s.mt8}
              />
            </>
          )}

          {/* ----- forgot password: ask for the email ----- */}
          {mode === 'forgot' && (
            <>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={T.muted}
                accessibilityLabel="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={sendCode}
              />

              {!!error && <Text style={[st.body, { color: T.red, marginTop: 12 }]}>{error}</Text>}

              <Btn title={busy ? 'Please wait...' : 'Send code'} onPress={sendCode} disabled={busy} style={s.mt12} />
              <Btn kind="sec" title="Back to sign in" onPress={() => goMode('in')} style={s.mt8} />
            </>
          )}

          {/* ----- forgot password: code + new password ----- */}
          {mode === 'reset' && (
            <>
              {!!info && <Text style={[st.body, { color: T.green, marginBottom: 4 }]}>{info}</Text>}

              <Text style={s.label}>Code from your email</Text>
              <TextInput
                style={s.input}
                value={code}
                onChangeText={setCode}
                placeholder="Enter the code"
                placeholderTextColor={T.muted}
                accessibilityLabel="Code from your email"
                keyboardType="number-pad"
                maxLength={10}
                autoCorrect={false}
              />

              <Text style={s.label}>New password</Text>
              <PasswordField
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                label="New password"
                onSubmitEditing={resetPassword}
              />

              {!!error && <Text style={[st.body, { color: T.red, marginTop: 12 }]}>{error}</Text>}

              <Btn title={busy ? 'Please wait...' : 'Save new password'} onPress={resetPassword} disabled={busy} style={s.mt12} />
              <Btn kind="sec" title="Send a new code" onPress={() => goMode('forgot')} style={s.mt8} />
            </>
          )}
        </Card>

        <Text style={[st.small, { marginBottom: 12 }]}>
          If you are in immediate danger, call 911 or your local emergency hotline first.
        </Text>
        <Btn kind="sec" title="Back to home" onPress={onBack} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}