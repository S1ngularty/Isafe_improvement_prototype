import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Pressable, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchInNeed, claimAssignment } from "../../services/rescue.js";
import LEAFLET_HTML from "../../assets/leafletMapHtml.js";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh.js";

const C = {
  red: "#991b1b", white: "#fff", gray50: "#f9fafb", gray100: "#f3f4f6",
  gray200: "#e5e7eb", gray400: "#9ca3af", gray500: "#6b7280",
  gray600: "#4b5563", gray700: "#374151", gray800: "#1f2937", gray900: "#111827",
  green: "#15803d",
};

export default function RescuerOverviewMapScreen() {
  const { showToast } = useToast();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [inNeedUsers, setInNeedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const webViewRef = useRef(null);

  const sendToMap = (type, payload) => {
    if (!webViewRef.current) return;
    const js = `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type, payload }))}});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;
    webViewRef.current.injectJavaScript(js);
  };

  const loadData = useCallback(async () => {
    try {
      const inNeedData = await fetchInNeed(currentLocation?.latitude, currentLocation?.longitude);
      const users = inNeedData?.data || [];
      setInNeedUsers(users);

      if (mapLoaded && currentLocation) {
        sendToMap("UPDATE_LOCATIONS", [{
          id: "rescuer_self", lat: currentLocation.latitude, lng: currentLocation.longitude,
          name: "You", status: "safe", isSelf: true, avatarUrl: null,
        }]);
        sendToMap("UPDATE_IN_NEED", users.map((u) => ({
          id: u.id, lat: u.lat, lng: u.lng, full_name: u.full_name, status: u.status,
          barangay: u.barangay, blood_type: u.blood_type, distance_km: u.distance_km,
        })));
      }
    } catch (_) {}
  }, [currentLocation, mapLoaded]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setCurrentLocation(loc.coords);
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useRealtimeRefresh(
    { table: "status_history", event: "INSERT", channelName: "rescuer-overview-status" },
    loadData,
  );

  const handleWebViewMessage = (event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "MAP_LOADED") setMapLoaded(true);
      if (d.type === "MAP_CLICK") {
        const clicked = inNeedUsers.find((u) => {
          if (!u.lat || !u.lng) return false;
          const dlat = d.payload.lat - u.lat;
          const dlng = d.payload.lng - u.lng;
          return Math.sqrt(dlat * dlat + dlng * dlng) < 0.005;
        });
        setSelectedUser(clicked || null);
      }
    } catch (_) {}
  };

  const handleClaim = async () => {
    if (!selectedUser) return;
    setClaiming(true);
    try {
      await claimAssignment(selectedUser.id);
      showToast("Claimed! Respond to the victim now.", "success");
      setSelectedUser(null);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to claim", "error");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <View style={s.header}>
        <MaterialIcons name="map" size={18} color={C.white} />
        <Text style={s.headerTitle}>OVERVIEW MAP</Text>
        <Text style={s.headerCount}>{inNeedUsers.length} alerts</Text>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML }}
        style={s.map}
        originWhitelist={["*"]}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />

      {!mapLoaded && (
        <View style={s.loadingOverlay}><ActivityIndicator size="large" color={C.red} /></View>
      )}

      {selectedUser && (
        <View style={s.bottomCard}>
          <View style={s.cardContent}>
            <View style={s.cardRow}>
              <Text style={s.cardName}>{selectedUser.full_name || "Unknown"}</Text>
              <View style={[s.badge, { backgroundColor: selectedUser.status === "emergency" ? "#fee2e2" : "#fef3c7" }]}>
                <Text style={[s.badgeText, { color: selectedUser.status === "emergency" ? "#dc2626" : "#d97706" }]}>
                  {selectedUser.status === "emergency" ? "EMERGENCY" : "HELP"}
                </Text>
              </View>
            </View>
            {selectedUser.barangay && <Text style={s.cardBarangay}>{selectedUser.barangay}</Text>}
            {selectedUser.distance_km && <Text style={s.cardDist}>{selectedUser.distance_km} km away</Text>}
          </View>
          <Pressable style={[s.claimBtn, claiming && { opacity: 0.6 }]} onPress={handleClaim} disabled={claiming}>
            {claiming ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Text style={s.claimBtnText}>CLAIM & RESPOND</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.red, gap: 8,
  },
  headerTitle: { flex: 1, color: C.white, fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  headerCount: { color: "#fca5a5", fontSize: 12, fontWeight: "600" },
  map: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 10 },
  bottomCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.white, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 10,
  },
  cardContent: { gap: 4, marginBottom: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { fontSize: 16, fontWeight: "700", color: C.gray900, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  cardBarangay: { fontSize: 13, color: C.gray600 },
  cardDist: { fontSize: 12, color: C.gray500 },
  claimBtn: {
    backgroundColor: C.red, paddingVertical: 14, borderRadius: 12, alignItems: "center",
  },
  claimBtnText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.5 },
});
