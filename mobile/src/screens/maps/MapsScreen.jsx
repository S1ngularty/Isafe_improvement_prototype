import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import useFamilyLocations from "../../hooks/useFamilyLocations.js";
import { upsertLocation } from "../../services/location.js";
import { fetchRoute } from "../../services/routing.js";
import { fetchNearestEvacuationAreas } from "../../services/evacuation.js";
import { haversine, bearing } from "../../utils/geo.js";
import LEAFLET_HTML from "../../assets/leafletMapHtml.js";

const C = {
  red: "#991b1b",
  green: "#15803d",
  yellow: "#d97706",
  red500: "#ef4444",
  white: "#fff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
};

function formatDist(m) { return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`; }

function stripHtml(str) {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&[#a-z0-9]+;/gi, (m) => {
      const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " " };
      return entities[m.toLowerCase()] || m;
    });
}

function stepIcon(type, modifier) {
  const icons = {
    turn: { left: "↰", "slight left": "↰", "sharp left": "↰", right: "↱", "slight right": "↱", "sharp right": "↱", straight: "↑", uturn: "↩" },
    continue: { left: "↰", right: "↱", straight: "↑" },
    "new name": { default: "→" },
    merge: { default: "→" },
    roundabout: { default: "⟳" },
    fork: { left: "↰", right: "↱", straight: "↑" },
    depart: { default: "●" },
    arrive: { default: "◉" },
  };
  const group = icons[type] || {};
  return group[modifier] || group.default || "→";
}

export default function MapsScreen() {
  const { profile, session } = useAuth();
  const { showToast } = useToast();
  const { members: familyMembers, family } = useFamilyLocations();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [manualLat, setManualLat] = useState(null);
  const [manualLng, setManualLng] = useState(null);
  const [pinning, setPinning] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [evacuationCenters, setEvacuationCenters] = useState([]);
  const webViewRef = useRef(null);
  const hasCenteredInitial = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const centers = await fetchNearestEvacuationAreas(
          currentLocation?.latitude || profile?.lat || 14.5995,
          currentLocation?.longitude || profile?.lng || 120.9842,
          10
        );
        setEvacuationCenters(centers);
      } catch (e) {
        console.log("Failed to fetch evacuation centers", e);
      }
    })();
  }, [currentLocation?.latitude, currentLocation?.longitude, profile?.lat, profile?.lng]);

  useEffect(() => {
    if (mapLoaded && evacuationCenters.length > 0) {
      sendToMap("UPDATE_EVACUATION", evacuationCenters);
    }
  }, [mapLoaded, evacuationCenters]);

  const displayLat = manualLat ?? currentLocation?.latitude ?? profile?.lat;
  const displayLng = manualLng ?? currentLocation?.longitude ?? profile?.lng;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { showToast("Location permission denied", "error"); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCurrentLocation(loc.coords);
      } catch (err) { showToast("Failed to get GPS location", "error"); }
    })();
  }, []);

  useEffect(() => {
    if (profile?.lat && profile?.lng && !manualLat) {
      setManualLat(profile.lat);
      setManualLng(profile.lng);
    }
  }, [profile]);

  const sendToMap = (type, payload) => {
    if (!webViewRef.current) return;
    const js = `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type, payload }))}});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;
    webViewRef.current.injectJavaScript(js);
  };

  const sendLocations = useCallback((coords, members) => {
    const locs = [];
    if (members) members.forEach((m) => {
      if (m.lat && m.lng) {
        const isMe = m.id === session?.user?.id;
        locs.push({ id: m.id, lat: parseFloat(m.lat), lng: parseFloat(m.lng), name: isMe ? "You" : (m.full_name || "Member"), status: m.status || "safe", isSelf: isMe, avatarUrl: m.avatar_url || null });
      }
    });
    sendToMap("UPDATE_LOCATIONS", locs);
  }, [session]);

  useEffect(() => {
    if (mapLoaded) {
      sendLocations(currentLocation, familyMembers);
      if (!hasCenteredInitial.current && (manualLat || currentLocation?.latitude || profile?.lat)) {
        sendToMap("CENTER_ON", { lat: manualLat || currentLocation?.latitude || profile?.lat, lng: manualLng || currentLocation?.longitude || profile?.lng });
        hasCenteredInitial.current = true;
      }
    }
  }, [mapLoaded, currentLocation, familyMembers, manualLat, manualLng, profile?.status, profile?.avatar_url, sendLocations]);

  const mapLoadedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!mapLoadedRef.current) {
        showToast("Map failed to load", "error");
        setMapLoaded(true);
      }
    }, 15000);
    return () => clearTimeout(t);
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "MAP_LOADED") { 
        mapLoadedRef.current = true;
        setMapLoaded(true); 
        setTimeout(() => sendLocations(currentLocation, familyMembers), 300); 
      }
    } catch (e) {}
  };

  const handlePin = async () => {
    const lat = manualLat ?? currentLocation?.latitude;
    const lng = manualLng ?? currentLocation?.longitude;
    if (!lat || !lng) { showToast("No location to pin", "info"); return; }
    setPinning(true);
    try { await upsertLocation(lat, lng); showToast("Location pinned", "success"); }
    catch (err) { showToast(err.message || "Failed to pin", "error"); }
    finally { setPinning(false); }
  };

  const handleRoute = useCallback(async (member) => {
    const slat = manualLat ?? currentLocation?.latitude ?? profile?.lat;
    const slng = manualLng ?? currentLocation?.longitude ?? profile?.lng;
    if (!slat || !slng || !member.lat || !member.lng) return;
    setRouteLoading(true);
    setRoute(null);
    try {
      const result = await fetchRoute(slat, slng, member.lat, member.lng);
      if (result) {
        const label = `${result.distance_km} km \u00b7 ~${result.duration_min} min to ${member.full_name || "Member"}`;
        sendToMap("SET_ROUTE", { coordinates: result.coordinates, label });
        const stepsClean = (result.steps || []).map((s) => ({ ...s, instruction: stripHtml(s.instruction) }));
        setRoute({ ...result, memberName: member.full_name || "Member", memberLat: member.lat, memberLng: member.lng, steps: stepsClean });
        setShowSteps(true);
      } else {
        showToast("Backend unreachable. Start the backend server.", "error");
      }
    } catch (err) {
      showToast("Backend unreachable. Start the backend server.", "error");
    } finally { setRouteLoading(false); }
  }, [currentLocation, profile, manualLat, manualLng]);

  const handleOpenOSM = useCallback(() => {
    if (!route) return;
    const slat = manualLat ?? currentLocation?.latitude ?? profile?.lat;
    const slng = manualLng ?? currentLocation?.longitude ?? profile?.lng;
    Linking.openURL(`https://www.openstreetmap.org/directions?from=${slat}%2C${slng}&to=${route.memberLat}%2C${route.memberLng}`).catch(() => {});
  }, [route, currentLocation, profile, manualLat, manualLng]);

  const clearRoute = useCallback(() => { setRoute(null); setShowSteps(false); sendToMap("CLEAR_ROUTE", {}); }, []);

  const membersWithDist = familyMembers
    .filter((m) => m.lat && m.lng && displayLat && displayLng)
    .map((m) => ({ ...m, dist: haversine(displayLat, displayLng, m.lat, m.lng), dir: bearing(displayLat, displayLng, m.lat, m.lng) }))
    .sort((a, b) => a.dist - b.dist);

  const statusColor = profile?.status === "help" ? C.yellow : profile?.status === "emergency" ? C.red500 : C.green;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Status bar */}
      <View style={[s.statusBar, { backgroundColor: C.red }]}>
        <View style={s.statusLeft}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={s.statusText}>{profile?.status?.toUpperCase() || "SAFE"}</Text>
        </View>
        <View style={s.statusRight}>
          {family && <Text style={s.familyBadge}>{family.name}</Text>}
          <Text style={s.coordText}>{displayLat?.toFixed(4) ?? "--"}, {displayLng?.toFixed(4) ?? "--"}</Text>
        </View>
      </View>

      {/* Map */}
      {!mapLoaded && (
        <View style={s.loading}><ActivityIndicator size="large" color={C.red} /></View>
      )}
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

      {/* Floating action buttons - left side */}
      <View style={s.fabLeft}>
        <Pressable style={[s.fab, pinning && s.fabDisabled]} onPress={handlePin} disabled={pinning}>
          <MaterialIcons name="push-pin" size={20} color={C.white} />
        </Pressable>
        {manualLat ? (
          <Pressable style={[s.fab, { backgroundColor: C.gray600 }]} onPress={() => { 
            setManualLat(null); 
            setManualLng(null); 
            sendLocations(currentLocation, familyMembers); 
            if (currentLocation) sendToMap("CENTER_ON", { lat: currentLocation.latitude, lng: currentLocation.longitude });
          }}>
            <MaterialIcons name="my-location" size={20} color={C.white} />
          </Pressable>
        ) : (
          <Pressable style={[s.fab, { backgroundColor: C.gray600 }]} onPress={() => { 
            const lat = currentLocation?.latitude || profile?.lat;
            const lng = currentLocation?.longitude || profile?.lng;
            if (lat && lng) sendToMap("CENTER_ON", { lat, lng });
          }}>
            <MaterialIcons name="my-location" size={20} color={C.white} />
          </Pressable>
        )}
      </View>

      {/* Floating action buttons - right side */}
      <View style={s.fabRight}>
        {route && (
          <Pressable style={[s.fab, { backgroundColor: C.green }]} onPress={handleOpenOSM}>
            <MaterialIcons name="open-in-new" size={20} color={C.white} />
          </Pressable>
        )}
        {route && (
          <Pressable style={[s.fab, { backgroundColor: C.gray600 }]} onPress={clearRoute}>
            <MaterialIcons name="close" size={20} color={C.white} />
          </Pressable>
        )}
      </View>

      {/* Family member chips */}
      {membersWithDist.length > 0 && (
        <View style={s.chipBar}>
          {routeLoading && <ActivityIndicator size="small" color={C.red} style={{ marginRight: 8 }} />}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            {membersWithDist.map((m) => (
              <Pressable key={m.id} style={s.chip} onPress={() => handleRoute(m)}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={[s.chipDot, { backgroundColor: m.status === "help" ? C.yellow : m.status === "emergency" ? C.red500 : C.green }]} />
                  <Text style={s.chipName} numberOfLines={1}>{m.full_name || "Member"}</Text>
                </View>
                <Text style={s.chipDist}>{m.dist.toFixed(1)}km {m.dir}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Route steps panel */}
      {route && route.steps && route.steps.length > 0 && (
        <View style={s.stepsPanel}>
          <Pressable style={s.stepsToggle} onPress={() => setShowSteps((v) => !v)}>
            <Text style={s.stepsToggleText}>
              <Text style={{ color: C.green, fontWeight: "700" }}>{route.distance_km} km</Text>
              <Text style={{ color: C.gray400 }}> · </Text>
              <Text style={{ color: C.gray600 }}>~{route.duration_min} min</Text>
              <Text style={{ color: C.gray400 }}> to {route.memberName}</Text>
            </Text>
            <MaterialIcons name={showSteps ? "expand-more" : "expand-less"} size={20} color={C.gray500} />
          </Pressable>
          {showSteps && (
            <ScrollView style={s.stepsList}>
              {route.steps.map((step, i) => (
                <View key={i} style={[s.step, i === 0 && { backgroundColor: C.gray50 }]}>
                  <View style={[s.stepBar, { backgroundColor: i === 0 ? C.green : i === route.steps.length - 1 ? C.gray400 : C.gray200 }]} />
                  <Text style={s.stepIcon}>{stepIcon(step.maneuver_type, step.maneuver_modifier)}</Text>
                  <Text style={s.stepText} numberOfLines={2}>{stripHtml(step.instruction)}</Text>
                  <Text style={s.stepDist}>{formatDist(step.distance_m)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  statusBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: C.white, fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  statusRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  familyBadge: { color: "#fca5a5", fontSize: 11, fontWeight: "600", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },
  coordText: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "monospace" },
  map: { flex: 1 },
  loading: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a1a", zIndex: 10 },
  fabLeft: { position: "absolute", left: 12, top: 70, gap: 8 },
  fabRight: { position: "absolute", right: 12, top: 70, gap: 8 },
  fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.red, justifyContent: "center", alignItems: "center", ...C.shadow },
  fabDisabled: { opacity: 0.5 },
  chipBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.gray100, borderTopWidth: 1, borderTopColor: C.gray200 },
  chipScroll: { flex: 1, flexDirection: "row", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.gray200, minWidth: 140 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipName: { fontSize: 12, fontWeight: "600", color: C.gray800, maxWidth: 80 },
  chipDist: { fontSize: 10, color: C.gray500, fontWeight: "500", marginLeft: 8 },
  stepsPanel: { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.gray200, maxHeight: 280 },
  stepsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  stepsToggleText: { fontSize: 13, fontWeight: "500", flex: 1 },
  stepsList: { paddingBottom: 8 },
  step: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, paddingLeft: 14, paddingRight: 14, borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 10 },
  stepIcon: { fontSize: 16, fontWeight: "700", color: C.green, width: 22, textAlign: "center", marginTop: 1 },
  stepText: { flex: 1, fontSize: 13, color: C.gray800, lineHeight: 18 },
  stepDist: { fontSize: 11, fontWeight: "600", color: C.gray500 },
});
