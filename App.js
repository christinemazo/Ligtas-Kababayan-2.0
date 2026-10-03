import 'react-native-url-polyfill/auto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';

import { getStatus, submitReport, updateDetails } from './src/api';
import { enqueue, startAutoFlush, updateQueued } from './src/queue';
import { failKind } from './src/constants';
import { C, Note } from './src/ui';
import Home from './src/screens/Home';
import Sos from './src/screens/Sos';
import Sent from './src/screens/Sent';
import Shelters from './src/screens/Shelters';

export default function App() {
  const [scr, setScr] = useState('home'); // home | sos | sent | shelters
  const [mine, setMine] = useState(null); // the SOS this phone just sent
  const [offline, setOffline] = useState(false);
  const [msg, setMsg] = useState('');
  const mineRef = useRef(null);
  const toastTimer = useRef(null);

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
  }, []);

  // ----- SOS flow -----
  const sendSOS = async (level, loc) => {
    const profile = JSON.parse((await AsyncStorage.getItem('lk_profile')) || '{}');
    const report = {
      clientId: Crypto.randomUUID(),
      level,
      lat: loc.lat,
      lng: loc.lng,
      name: profile.name || '',
      phone: profile.phone || '',
      head: '',
      vul: [],
      desc: '',
    };
    mineRef.current = { ...report, id: null, status: 'new', error: null, sending: true };
    setMine(mineRef.current);
    setScr('sent');

    try {
      const res = await submitReport(report);
      patchMine(report.clientId, { id: res.report_code, sending: false });
    } catch (e) {
      if (e.permanent) patchMine(report.clientId, { error: failKind(e), sending: false });
      else {
        await enqueue(report); // offline or server down: saved on the phone
        patchMine(report.clientId, { sending: false });
      }
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
  useEffect(
    () =>
      startAutoFlush(
        (report, res) => {
          patchMine(report.clientId, { id: res.report_code });
          toast('Signal is back. Your SOS was sent.');
        },
        (report, e) => patchMine(report.clientId, { error: failKind(e) })
      ),
    [patchMine, toast]
  );

  // Network banner
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)), []);

  // Poll status while the sent screen is open
  useEffect(() => {
    if (scr !== 'sent' || !mine?.id) return;
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
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="dark" />
        {offline && (
          <View style={{ paddingHorizontal: 14 }}>
            <Note>No internet. You can still send SOS. It is saved on your phone and sent when signal returns.</Note>
          </View>
        )}

        {scr === 'home' && <Home onSos={() => setScr('sos')} onShelters={() => setScr('shelters')} />}
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

        {msg ? (
          <View style={{ position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: C.tx,
                         paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24 }}>
            <Text style={{ color: '#fff' }}>{msg}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
