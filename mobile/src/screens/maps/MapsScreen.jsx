import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { upsertLocation } from "../../services/location.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  white: "#fff",
  gray700: "#374151",
};

// Leaflet HTML with OpenStreetMap tiles
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
    // Initialize map centered on Philippines
    const map = L.map('map').setView([12.5, 121.5], 5);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Store for markers
    let userMarker = null;
    let safeColor = '#15803d';
    let helpColor = '#d97706';
    let emergencyColor = '#dc2626';

    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'UPDATE_LOCATION') {
          const { lat, lng, status, email } = data.payload;
          
          // Validate coordinates
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            console.error('Invalid coordinates:', lat, lng);
            return;
          }
          
          // Remove old marker if exists
          if (userMarker) {
            map.removeLayer(userMarker);
          }
          
          // Determine color based on status
          let color = safeColor;
          if (status === 'help') color = helpColor;
          else if (status === 'emergency') color = emergencyColor;
          
          // Create custom HTML icon
          const customIcon = L.divIcon({
            html: '<div style="width:20px;height:20px;background-color:' + color + ';border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            className: ''
          });
          
          // Add new marker
          userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
          
          // Add popup with email and status
          const statusText = status ? status.toUpperCase() : 'SAFE';
          userMarker.bindPopup('<div style="font-size:12px;text-align:center;"><strong>' + (email || 'User') + '</strong><br>Status: <strong>' + statusText + '</strong></div>');
          
          // Center map on user
          map.setView([lat, lng], 15);
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    }

    // Support both Android (document) and iOS (window) message events
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    // Notify that map is ready
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [pinning, setPinning] = useState(false);
  const webViewRef = useRef(null);

  // Get current location
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
    } catch (error) {
      showToast(error.message || "Failed to pin location", "error");
    } finally {
      setPinning(false);
    }
  };

  // Inject JS directly — more reliable than postMessage for initial load
  const sendLocationToMap = (coords) => {
    const lat = coords?.latitude || profile?.lat || 12.5;
    const lng = coords?.longitude || profile?.lng || 121.5;
    const status = profile?.status || "safe";
    const email = session?.user?.email || "Unknown";

    const payload = JSON.stringify({
      type: "UPDATE_LOCATION",
      payload: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        status: status,
        email: email,
      },
    });

    // Use injectJavaScript for guaranteed delivery after MAP_LOADED
    const js = `
      (function() {
        var event = new MessageEvent('message', { data: '${payload.replace(/'/g, "\\'")}' });
        document.dispatchEvent(event);
        window.dispatchEvent(event);
      })();
      true;
    `;

    webViewRef.current?.injectJavaScript(js);
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "MAP_LOADED") {
        setMapLoaded(true);
        // Small delay to ensure Leaflet is fully initialized before injecting
        setTimeout(() => {
          sendLocationToMap(currentLocation);
        }, 300);
      }
    } catch (e) {
      console.error("Error parsing WebView message:", e);
    }
  };

  // Re-send location whenever currentLocation updates (in case it arrives after MAP_LOADED)
  useEffect(() => {
    if (mapLoaded && currentLocation) {
      sendLocationToMap(currentLocation);
    }
  }, [mapLoaded, currentLocation]);

  const lat = currentLocation?.latitude || profile?.lat || 12.5;
  const lng = currentLocation?.longitude || profile?.lng || 121.5;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: "#15803d" }]} />
          <Text style={styles.legendText}>Safe</Text>

          <View
            style={[
              styles.legendDot,
              { backgroundColor: "#d97706", marginLeft: 12 },
            ]}
          />
          <Text style={styles.legendText}>Help</Text>

          <View
            style={[
              styles.legendDot,
              { backgroundColor: "#dc2626", marginLeft: 12 },
            ]}
          />
          <Text style={styles.legendText}>Emergency</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {lat && lng && (
          <Text style={styles.coordsText}>
            📍 Lat: {parseFloat(lat).toFixed(4)}, Lng:{" "}
            {parseFloat(lng).toFixed(4)}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 8,
  },
  coordsText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 8,
    fontWeight: "600",
  },
  webView: {
    flex: 1,
  },
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
  pinButtonLoading: {
    opacity: 0.6,
  },
  pinButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 13,
  },
});