import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import useFamilyLocations from "../../hooks/useFamilyLocations.js";
import { upsertLocation } from "../../services/location.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  white: "#fff",
  gray700: "#374151",
};

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([12.5, 121.5], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markers = {};
    const COLOR_SAFE = '#15803d';
    const COLOR_HELP = '#d97706';
    const COLOR_EMERG = '#dc2626';
    const COLOR_SELF = '#991b1b';

    function getColor(status, isSelf) {
      if (isSelf) return COLOR_SELF;
      if (status === 'help') return COLOR_HELP;
      if (status === 'emergency') return COLOR_EMERG;
      return COLOR_SAFE;
    }

    function addOrUpdateMarker(id, lat, lng, name, status, isSelf) {
      const color = getColor(status, isSelf);
      const size = isSelf ? 28 : 22;
      const border = isSelf ? '3px solid white' : '2px solid white';

      const html = '<div style="width:' + size + 'px;height:' + size + 'px;background-color:' + color + ';border:' + border + ';border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);' + (isSelf ? 'outline:2px solid ' + color + ';outline-offset:2px;' : '') + '"></div>';

      if (markers[id]) {
        markers[id].setLatLng([lat, lng]);
        markers[id].setIcon(L.divIcon({ html: html, iconSize: [size, size], iconAnchor: [size/2, size/2], className: '' }));
        markers[id].unbindPopup();
      } else {
        markers[id] = L.marker([lat, lng], { icon: L.divIcon({ html: html, iconSize: [size, size], iconAnchor: [size/2, size/2], className: '' }) }).addTo(map);
      }

      const label = isSelf ? 'You' : (name || 'Member');
      const statusText = status ? status.toUpperCase() : 'SAFE';
      markers[id].bindPopup('<div style="font-size:12px;text-align:center;"><strong>' + label + '</strong><br>Status: <strong>' + statusText + '</strong></div>');
    }

    function removeStaleMarkers(activeIds) {
      Object.keys(markers).forEach(function(id) {
        if (activeIds.indexOf(id) === -1) {
          map.removeLayer(markers[id]);
          delete markers[id];
        }
      });
    }

    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'UPDATE_LOCATIONS') {
          const locations = data.payload || [];
          const activeIds = [];
          let hasSelf = false;

          locations.forEach(function(loc) {
            if (loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)) {
              addOrUpdateMarker(loc.id, loc.lat, loc.lng, loc.name, loc.status, !!loc.isSelf);
              activeIds.push(loc.id);
              if (loc.isSelf) hasSelf = true;
            }
          });

          removeStaleMarkers(activeIds);

          if (hasSelf) {
            const selfLoc = locations.find(function(l) { return l.isSelf; });
            if (selfLoc) map.setView([selfLoc.lat, selfLoc.lng], 15);
          }
        }

        if (data.type === 'CENTER_ON') {
          const { lat, lng } = data.payload;
          if (lat && lng) map.setView([lat, lng], 15);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_LOADED' }));
    }, 500);
  </script>
</body>
</html>
`;

export default function MapsScreen() {
  const { profile, session } = useAuth();
  const { showToast } = useToast();
  const { members: familyMembers } = useFamilyLocations();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [pinning, setPinning] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCurrentLocation(location.coords);
      } catch (err) {
        console.error("Error getting location:", err);
        setError("Failed to get location");
      }
    })();
  }, []);

  const handlePinLocation = async () => {
    if (!currentLocation) {
      showToast("Getting location...", "info");
      return;
    }

    setPinning(true);
    try {
      await upsertLocation(currentLocation.latitude, currentLocation.longitude);
      showToast("Location pinned successfully", "success");
    } catch (err) {
      showToast(err.message || "Failed to pin location", "error");
    } finally {
      setPinning(false);
    }
  };

  const sendLocationsToMap = (coords, members) => {
    const selfLat = coords?.latitude || profile?.lat || 12.5;
    const selfLng = coords?.longitude || profile?.lng || 121.5;
    const selfStatus = profile?.status || "safe";
    const selfName = session?.user?.email || "You";

    const locations = [
      {
        id: "self",
        lat: parseFloat(selfLat),
        lng: parseFloat(selfLng),
        name: selfName,
        status: selfStatus,
        isSelf: true,
      },
    ];

    if (members) {
      members.forEach((m) => {
        if (m.lat && m.lng) {
          locations.push({
            id: m.id,
            lat: parseFloat(m.lat),
            lng: parseFloat(m.lng),
            name: m.full_name || "Member",
            status: m.status || "safe",
            isSelf: false,
          });
        }
      });
    }

    const payload = JSON.stringify({ type: "UPDATE_LOCATIONS", payload: locations });
    const escaped = payload.replace(/'/g, "\\'");
    const js = `(function(){var e=new MessageEvent('message',{data:'${escaped}'});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;

    webViewRef.current?.injectJavaScript(js);
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "MAP_LOADED") {
        setMapLoaded(true);
        setTimeout(() => {
          sendLocationsToMap(currentLocation, familyMembers);
        }, 300);
      }
    } catch (e) {
      console.error("Error parsing WebView message:", e);
    }
  };

  useEffect(() => {
    if (mapLoaded) {
      sendLocationsToMap(currentLocation, familyMembers);
    }
  }, [mapLoaded, currentLocation, familyMembers]);

  const lat = currentLocation?.latitude || profile?.lat || 12.5;
  const lng = currentLocation?.longitude || profile?.lng || 121.5;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: "#991b1b" }]} />
          <Text style={styles.legendText}>You</Text>

          <View style={[styles.legendDot, { backgroundColor: "#15803d", marginLeft: 12 }]} />
          <Text style={styles.legendText}>Safe</Text>

          <View style={[styles.legendDot, { backgroundColor: "#d97706", marginLeft: 12 }]} />
          <Text style={styles.legendText}>Help</Text>

          <View style={[styles.legendDot, { backgroundColor: "#dc2626", marginLeft: 12 }]} />
          <Text style={styles.legendText}>SOS</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {lat && lng && (
          <Text style={styles.coordsText}>
            Lat: {parseFloat(lat).toFixed(4)}, Lng: {parseFloat(lng).toFixed(4)}
          </Text>
        )}
      </View>

      {!mapLoaded && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.shieldPrimary} />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML }}
        style={styles.webView}
        originWhitelist={["*"]}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />

      <Pressable
        style={[styles.pinButton, pinning && styles.pinButtonLoading]}
        onPress={handlePinLocation}
        disabled={pinning}
      >
        <MaterialIcons name="location-on" size={24} color={COLORS.white} />
        <Text style={styles.pinButtonText}>
          {pinning ? "Pinning..." : "Pin Location"}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  legend: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  errorText: { fontSize: 12, color: "#dc2626", marginTop: 8 },
  coordsText: { fontSize: 11, color: "#6b7280", marginTop: 8, fontWeight: "600" },
  webView: { flex: 1 },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    zIndex: 999,
  },
  pinButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.shieldPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  pinButtonLoading: { opacity: 0.6 },
  pinButtonText: { color: COLORS.white, fontWeight: "600", fontSize: 13 },
});
