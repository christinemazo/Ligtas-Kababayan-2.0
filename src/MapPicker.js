// Map with a draggable pin, drawn with Leaflet inside a WebView (no Google Maps key needed).
// RN -> map: { type:'loc', lat, lng, acc, pan }     map -> RN: { type:'pick', lat, lng } | 'ready' | 'nomap'
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

const HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<style>
  html,body,#m{height:100%;margin:0;background:#dfe7ee}
  .pin{background:#e0312b;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px rgba(224,49,43,.35)}
</style></head><body><div id="m"></div>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
function send(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
if (typeof L === 'undefined') {
  send({ type: 'nomap' });
} else {
  var map = L.map('m', { zoomControl: false }).setView([12.0667, 124.6044], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  var marker = null, ring = null;
  function draw(l, pan) {
    var ll = [l.lat, l.lng];
    if (!marker) {
      marker = L.marker(ll, { draggable: true,
        icon: L.divIcon({ className: 'pin', iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
      marker.on('dragend', function () {
        var p = marker.getLatLng(); send({ type: 'pick', lat: p.lat, lng: p.lng });
      });
      ring = L.circle(ll, { radius: 0, weight: 1 }).addTo(map);
    }
    marker.setLatLng(ll);
    ring.setLatLng(ll).setRadius(l.acc || 0);
    if (pan) map.setView(ll, Math.max(map.getZoom(), 16));
  }
  map.on('click', function (e) { send({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }); });
  function onMsg(ev) {
    try { var m = JSON.parse(ev.data); if (m.type === 'loc') draw(m, m.pan); } catch (e) {}
  }
  document.addEventListener('message', onMsg); // Android
  window.addEventListener('message', onMsg);   // iOS
  send({ type: 'ready' });
}
</script></body></html>`;

export default function MapPicker({ loc, onPick }) {
  const web = useRef(null);
  const [ready, setReady] = useState(false);
  const [nomap, setNomap] = useState(false);

  // Send every new position to the map. The map only re-centres on GPS / last known, never after a hand-placed pin.
  useEffect(() => {
    if (ready && loc) web.current?.postMessage(JSON.stringify({ type: 'loc', ...loc, pan: loc.src !== 'pin' }));
  }, [loc, ready]);

  const onMessage = (e) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') setReady(true);
      else if (m.type === 'nomap') setNomap(true);
      else if (m.type === 'pick') onPick({ lat: m.lat, lng: m.lng });
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#dfe7ee' }}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: 'https://ligtas-kababayan.app' }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
      {nomap && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center',
                       justifyContent: 'center', padding: 16, backgroundColor: '#dfe7ee' }}>
          <Text style={{ textAlign: 'center', color: '#0d2238' }}>
            Map needs internet. Your GPS location is still used, and you can still send SOS.
          </Text>
        </View>
      )}
    </View>
  );
} 