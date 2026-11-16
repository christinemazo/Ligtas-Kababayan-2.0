import 'react-native-url-polyfill/auto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';

import { getStatus, submitReport, updateDetails } from './src/api';
import { enqueue, startAutoFlush, updateQueued } from './src/queue';
import { failKind } from './src/constants';
import { sb } from './src/supabase';
import { signOut as authSignOut } from './src/auth';
import { Note, s } from './src/ui';
import Home from './src/screens/Home';
import Sos from './src/screens/Sos';
import Sent from './src/screens/Sent';
import Shelters from './src/screens/Shelters';
import Account from './src/screens/Account';

// A request counts as "open" until it is rescued, refused, or this many hours old.
// Keep this the same as the time limit in the database (submit_report).
const OPEN_HOURS = 3;
const isOpen = (m) =>
  !!m && !m.error && m.status !== 'done' && Date.now() - (m.createdAt || 0) < OPEN_HOURS * 3600 * 1000;

// Keep the current request on the phone so it survives a reload or closing the app
const saveMine = (m) => AsyncStorage.setItem('lk_active', JSON.stringify(m)).catch(() => {});

export default function App() {
  const [scr, setScr] = useState('home'); // home | sos | sent | shelters | account
  const [mine, setMine] = useState(null); // the SOS this phone just sent
  const [offline, setOffline] = useState(false);
  const [msg, setMsg] = useState('');
  const mineRef = useRef(null);
  const toastTimer = useRef(null);
  const sendingRef = useRef(false); // true while an SOS is going out, so a second tap is ignored
  const [ready, setReady] = useState(false); // true once the saved request has been loaded
  const [user, setUser] = useState(null); // the signed-in citizen (null = signed out)
  const afterLogin = useRef('home'); // where to go after signing in: 'sos' or 'home'
  const userId = user?.id ?? null;

  const toast = useCallback((text) => {
    setMsg(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMsg(''), 3000);
  }, []);

  // Update the current SOS, but only if it is still the one the change was meant for
  const patchMine = useCallback((clientId, patch) => {
    if (mineRef.current?.clientId !== clientId) return;
    mineRef.current = { ...mineRef.current, ...patch };
    setMine(mineRef.current);
    saveMine(mineRef.current);
  }, []);

  // Who is signed in? The session is kept on the phone, so the citizen stays signed in.
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Renew the sign-in only while the app is open
  useEffect(() => {
    sb.auth.startAutoRefresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') sb.auth.startAutoRefresh();
      else sb.auth.stopAutoRefresh();
    });
    return () => sub.remove();
  }, []);

  // Load the request saved from the last time the app was open (so a reload keeps the status card)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('lk_active');
        const saved = raw ? JSON.parse(raw) : null;
        if (saved?.clientId && saved.userId && !saved.error && saved.status !== 'done') {
          mineRef.current = { ...saved, sending: false };
          setMine(mineRef.current);
          if (saved.id) {
            // refresh the status right away; a request that was rescued in the meantime is dropped
            getStatus(saved.clientId)
              .then((st) => {
                if (st === 'done' && mineRef.current?.clientId === saved.clientId) {
                  mineRef.current = null;
                  setMine(null);
                  AsyncStorage.removeItem('lk_active').catch(() => {});
                } else if (st) {
                  patchMine(saved.clientId, { status: st });
                }
              })
              .catch(() => {});
          }
        } else if (saved) {
          // rescued, refused, or sent before accounts existed (no owner): nothing to show any more
          AsyncStorage.removeItem('lk_active').catch(() => {});
        }
      } catch {
        // unreadable saved data: start with no request
      }
      setReady(true);
    })();
  }, [patchMine]);

  // SOS button: if a request is still open, show its status instead of a new form
  const openSos = () => {
    if (!user) {
      // An account is needed to send an SOS
      afterLogin.current = 'sos';
      setScr('account');
      return;
    }
    if (isOpen(mineRef.current)) {
      toast('You already have an open request. Showing its status.');
      setScr('sent');
    } else {
      setScr('sos');
    }
  };

  const goSignIn = () => {
    afterLogin.current = 'home';
    setScr('account');
  };

  const handleSignOut = async () => {
    const m = mineRef.current;
    if (m && !m.id && !m.error) {
      toast('Your SOS is still waiting to send. Sign out after it is sent.');
      return;
    }
    await authSignOut().catch(() => {});
    mineRef.current = null;
    setMine(null);
    AsyncStorage.removeItem('lk_active').catch(() => {});
    setScr('home');
    toast('Signed out');
  };

  // ----- SOS flow -----
  const sendNow = async (level, loc) => {
    const previous = mineRef.current; // kept in case this one is refused because an earlier one is still open
    const profile = JSON.parse((await AsyncStorage.getItem('lk_profile')) || '{}');
    const report = {
      clientId: Crypto.randomUUID(),
      level,
      lat: loc.lat,
      lng: loc.lng,
      name: profile.name || user?.user_metadata?.full_name || '',
      phone: profile.phone || '',
      head: '',
      vul: [],
      desc: loc.label || '', // a searched address becomes the landmark
    };
    mineRef.current = { ...report, id: null, status: 'new', error: null, sending: true, createdAt: Date.now(), userId: user?.id };
    setMine(mineRef.current);
    saveMine(mineRef.current);
    setScr('sent');

    try {
      const res = await submitReport(report);
      patchMine(report.clientId, { id: res.report_code, sending: false });
    } catch (e) {
      if (e.permanent) {
        if (failKind(e) === 'ongoing' && previous && !previous.error) {
          // an earlier request is still open: keep showing that one instead of an error
          mineRef.current = previous;
          setMine(previous);
          toast('You already have an open request. Showing its status.');
        } else {
          patchMine(report.clientId, { error: failKind(e), sending: false });
        }
      } else {
        await enqueue(report); // offline or server down: saved on the phone
        patchMine(report.clientId, { sending: false });
      }
    }
  };

  // Tapping Send twice quickly must not start two requests
  const sendSOS = async (level, loc) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      await sendNow(level, loc);
    } finally {
      sendingRef.current = false;
    }
  };

  const saveDetails = async (d) => {
    const m = mineRef.current;
    patchMine(m.clientId, d);
    await AsyncStorage.setItem('lk_profile', JSON.stringify({ name: d.name, phone: d.phone }));
    if (!m.id) {
      await updateQueued(m.clientId, { name: d.name, phone: d.phone, head: d.head, vul: d.vul, desc: d.desc });
      toast('Details saved. Sending with your SOS.');
      return;
    }
    try {
      await updateDetails(m.clientId, d);
      toast('Details sent');
    } catch {
      toast('Could not send. Try again.');
    }
  };

  // ----- background work -----
  // Offline queue: retry saved SOS when the signal returns
  // (starts only after the saved request is loaded, so a late send can still update it)
  useEffect(() => {
    if (!ready || !userId) return; // saved SOS are sent only while signed in
    return startAutoFlush(
      (report, res) => {
        patchMine(report.clientId, { id: res.report_code });
        toast('Signal is back. Your SOS was sent.');
      },
      (report, e) => patchMine(report.clientId, { error: failKind(e) })
    );
  }, [ready, userId, patchMine, toast]);

  // Network banner
  useEffect(() => NetInfo.addEventListener((state) => setOffline(state.isConnected === false)), []);

  // Poll status while the sent screen or the home screen (status card) is open
  useEffect(() => {
    if ((scr !== 'sent' && scr !== 'home') || !mine?.id) return;
    const id = mine.clientId;
    const timer = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const status = await getStatus(id);
        if (status) patchMine(id, { status });
      } catch {
        // offline: try again on the next tick
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [scr, mine?.id, mine?.clientId, patchMine]);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scr === 'home') return false;
      setScr('home');
      return true;
    });
    return () => sub.remove();
  }, [scr]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar style="dark" />
        {offline && (
          <View style={s.bannerWrap}>
            <Note>No internet. You can still send SOS. It is saved on your phone and sent when signal returns.</Note>
          </View>
        )}

        {scr === 'home' && (
          <View style={s.bannerWrap}>
            <Pressable onPress={user ? handleSignOut : goSignIn} accessibilityRole="button">
              <Text style={{ color: '#62758A', fontSize: 13, textAlign: 'right' }}>
                {user ? `Signed in as ${user.email}  ·  Sign out` : 'Sign in or create an account'}
              </Text>
            </Pressable>
          </View>
        )}
        {scr === 'home' && (
          <Home
            mine={user && mine?.userId === user.id ? mine : null} // only the signed-in owner sees the card
            onSos={openSos}
            onShelters={() => setScr('shelters')}
            onStatus={() => setScr('sent')}
          />
        )}
        {scr === 'sos' && <Sos onBack={() => setScr('home')} onSend={sendSOS} />}
        {scr === 'sent' && mine && (
          <Sent
            key={mine.clientId}
            mine={mine}
            onSave={saveDetails}
            onTryAgain={() => setScr('sos')}
            onHome={() => setScr('home')}
          />
        )}
        {scr === 'shelters' && <Shelters onBack={() => setScr('home')} />}
        {scr === 'account' && (
          <Account
            onBack={() => setScr('home')}
            onDone={() => {
              setScr(afterLogin.current === 'sos' ? 'sos' : 'home');
              afterLogin.current = 'home';
            }}
          />
        )}

        {msg ? (
          <View style={s.toast}>
            <Text style={s.toastText}>{msg}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}