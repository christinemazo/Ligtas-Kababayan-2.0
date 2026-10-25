// Map with a draggable pin, drawn with Leaflet inside a WebView (no Google Maps key needed).
// RN -> map: { type:'loc', lat, lng, acc, pan }     map -> RN: { type:'pick', lat, lng } | 'ready' | 'nomap'
// (RN = React Native. The app and the map page talk by sending JSON text messages.)
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
// WebView shows a small web page inside the app
import { WebView } from 'react-native-webview';
import { C, s } from './ui';

// The pin colors inside the map page come from the same color list as the rest of the app
// This is a whole web page stored as text. It is loaded into the WebView below.
const HTML = `<!DOCTYPE html><html><head>
<!-- Stop pinch-zoom of the page itself; the map handles its own zoom -->
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<!-- Leaflet's styles, loaded from the internet -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css">
<style>
  /* Map fills the whole screen */
  html,body,#m{height:100%;margin:0;background:${C.mapBg}}
  /* The red pin: a circle with a white border and a soft red glow */
  .pin{background:${C.sos};border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 3px ${C.sosGlow}}
</style></head><body><div id="m"></div>
<!-- Leaflet's code, loaded from the internet -->
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// Sends a message from the map page to the React Native app
function send(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
// If Leaflet did not load (no internet), tell the app so it can show a notice
if (typeof L === 'undefined') {
  send({ type: 'nomap' });
} else {
  // Create the map without zoom buttons, centred on Calbayog at zoom level 12
  var map = L.map('m', { zoomControl: false }).setView([12.0667, 124.6044], 12);
  // Add the map pictures (tiles) from OpenStreetMap
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  // marker = the pin, ring = circle showing GPS accuracy; both are created on first use
  var marker = null, ring = null;
  // Show or move the pin. l = location data, pan = should the map recentre on it
  function draw(l, pan) {
    var ll = [l.lat, l.lng];
    if (!marker) {
      // First time: create a draggable pin using the red .pin style
      marker = L.marker(ll, { draggable: true,
        icon: L.divIcon({ className: 'pin', iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
      // When the user finishes dragging, report the new spot to the app
      marker.on('dragend', function () {
        var p = marker.getLatLng(); send({ type: 'pick', lat: p.lat, lng: p.lng });
      });
      // Accuracy circle, starts with radius 0
      ring = L.circle(ll, { radius: 0, weight: 1 }).addTo(map);
    }
    // Move the pin and ring; the ring radius is the GPS accuracy in metres
    marker.setLatLng(ll);
    ring.setLatLng(ll).setRadius(l.acc || 0);
    // Recentre, and zoom in to at least level 16 so the street is visible
    if (pan) map.setView(ll, Math.max(map.getZoom(), 16));
  }
  // Tapping the map also picks that spot
  map.on('click', function (e) { send({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }); });
  // Handles messages coming from the app
  function onMsg(ev) {
    // try/catch ignores messages that are not valid JSON
    try { var m = JSON.parse(ev.data); if (m.type === 'loc') draw(m, m.pan); } catch (e) {}
  }
  document.addEventListener('message', onMsg); // Android
  window.addEventListener('message', onMsg);   // iOS
  // Tell the app the map is ready to receive locations
  send({ type: 'ready' });
}
</script></body></html>`;

// loc = current location {lat, lng, acc, src, ...}; onPick = called when the user taps or drags the pin
export default function MapPicker({ loc, onPick }) {
  const web = useRef(null);                  // reference to the WebView so we can send messages to it
  const [ready, setReady] = useState(false); // true once the map page says it is ready
  const [nomap, setNomap] = useState(false); // true if the map could not load (offline)

  // Send every new position to the map. The map only re-centres on GPS / last known / a search result,
  // never after the user taps or drags the pin.
  useEffect(() => {
    // pan is true unless the location came from the pin (src 'pin'), except when a search result asks for it (loc.pan)
    if (ready && loc) web.current?.postMessage(JSON.stringify({ type: 'loc', ...loc, pan: loc.src !== 'pin' || !!loc.pan }));
  }, [loc, ready]);

  // Handles messages coming from the map page
  const onMessage = (e) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === 'ready') setReady(true);              // map loaded
      else if (m.type === 'nomap') setNomap(true);          // map failed to load
      else if (m.type === 'pick') onPick({ lat: m.lat, lng: m.lng }); // user chose a spot
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <View style={s.mapRoot}>
      <WebView
        ref={web}
        originWhitelist={['*']}                                   // allow the page and its scripts to load
        source={{ html: HTML, baseUrl: 'https://ligtas-kababayan.app' }} // the page text above
        javaScriptEnabled                                         // the map needs JavaScript
        domStorageEnabled                                         // lets Leaflet keep small data
        onMessage={onMessage}
        style={s.web}
      />
      {/* Covers the map with a notice when it could not load */}
      {nomap && (
        <View style={s.mapOverlay}>
          <Text style={s.mapOverlayText}>
            Map needs internet. Your GPS location is still used, and you can still send SOS.
          </Text>
        </View>
      )}
    </View>
  );
}