import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, StyleSheet, Text, Pressable, ActivityIndicator,
  ScrollView, Modal, StatusBar, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchRoute } from "../../services/routing.js";
import { updateAssignment, fetchMyAssignments } from "../../services/rescue.js";
import LEAFLET_HTML from "../../assets/leafletMapHtml.js";
import { getDefaultAvatar } from "../../services/profile.js";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh.js";

const C = {
  red: "#991b1b", red600: "#dc2626", white: "#fff",
  gray50: "#f9fafb", gray100: "#f3f4f6", gray200: "#e5e7eb",
  gray400: "#9ca3af", gray500: "#6b7280", gray600: "#4b5563",
  gray700: "#374151", gray800: "#1f2937", gray900: "#111827",
  green: "#15803d", greenBg: "#dcfce7",
  yellow: "#d97706", yellowBg: "#fef3c7",
  redBg: "#fee2e2", blue: "#2563eb",
};

const AID_OPTIONS = [
  { value: "first_aid", label: "First Aid", icon: "medical-services" },
  { value: "transported_to_hospital", label: "Aided to Hospital", icon: "local-hospital" },
  { value: "evacuated", label: "Evacuated", icon: "location-city" },
  { value: "food_water", label: "Food & Water", icon: "restaurant" },
  { value: "search_rescue", label: "Search & Rescue", icon: "search" },
  { value: "other", label: "Other", icon: "more-horiz" },
];

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, "").replace(/&[#a-z0-9]+;/gi, (m) => {
    const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " " };
    return entities[m.toLowerCase()] || m;
  });
}

function stepIcon(type, modifier) {
  const icons = {
    turn: { left: "↰", right: "↱", straight: "↑", uturn: "↩" },
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

export default function RescuerAssignmentDetailScreen({ route, navigation }) {
  const { assignment } = route.params;
  const { showToast } = useToast();

  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedAid, setSelectedAid] = useState(null);
  const [helpNotes, setHelpNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const webViewRef = useRef(null);
  const posIntervalRef = useRef(null);

  const [liveState, setLiveState] = useState(assignment.state);

  const target = assignment.target || {};
  const isClosed = liveState === "helped" || liveState === "cancelled";

  const refreshAssignment = useCallback(async () => {
    try {
      const data = await fetchMyAssignments(false);
      const found = (data?.data || []).find((a) => a.id === assignment.id);
      if (found) setLiveState(found.state);
    } catch (_) {}
  }, [assignment.id]);

  useRealtimeRefresh(
    {
      table: "rescue_assignments",
      event: "*",
      filter: `id=eq.${assignment.id}`,
      channelName: `rescuer-detail-${assignment.id}`,
    },
    refreshAssignment,
  );

  const sendToMap = (type, payload) => {
    if (!webViewRef.current) return;
    const js = `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type, payload }))}});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;
    webViewRef.current.injectJavaScript(js);
  };

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

  useEffect(() => {
    if (mapLoaded && currentLocation && target.lat && target.lng) {
      sendToMap("UPDATE_LOCATIONS", [
        {
          id: "rescuer_self", lat: currentLocation.latitude, lng: currentLocation.longitude,
          name: "You", status: "safe", isSelf: true, avatarUrl: null,
        },
        {
          id: target.id, lat: target.lat, lng: target.lng,
          name: target.full_name || "Victim", status: target.status || "help",
          isSelf: false, avatarUrl: target.avatar_url || null,
        },
      ]);

      setRouteLoading(true);
      (async () => {
        try {
          const result = await fetchRoute(
            currentLocation.latitude, currentLocation.longitude,
            target.lat, target.lng,
          );
          if (result) {
            const label = `${result.distance_km} km \u00b7 ~${result.duration_min} min`;
            sendToMap("SET_ROUTE", { coordinates: result.coordinates, label });
            setRouteData(result);
          }
        } catch (_) {
          showToast("Failed to fetch route", "error");
        } finally {
          setRouteLoading(false);
        }
      })();

      sendToMap("CENTER_ON", { lat: target.lat, lng: target.lng });
    }
  }, [mapLoaded, currentLocation, target.lat, target.lng]);

  useEffect(() => {
    if (currentLocation && !isClosed) {
      posIntervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          await updateAssignment(assignment.id, {
            rescuer_lat: loc.coords.latitude,
            rescuer_lng: loc.coords.longitude,
          });
        } catch (_) {}
      }, 20000);
      return () => {
        if (posIntervalRef.current) clearInterval(posIntervalRef.current);
      };
    }
  }, [currentLocation, isClosed]);

  const handleWebViewMessage = (event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "MAP_LOADED") setMapLoaded(true);
    } catch (_) {}
  };

  const handleUpdateState = async (newState) => {
    try {
      await updateAssignment(assignment.id, { state: newState });
      showToast(`Status: ${newState.replace("_", " ")}`, "success");
      if (newState === "on_scene") {
        setShowHelpModal(false);
      }
      navigation.goBack();
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    }
  };

  const handleSubmitHelp = async () => {
    if (!selectedAid) {
      showToast("Please select the aide given", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await updateAssignment(assignment.id, {
        state: "helped",
        aid_type: selectedAid,
        notes: helpNotes || null,
      });
      showToast("Marked as helped!", "success");
      setShowHelpModal(false);
      navigation.goBack();
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={C.white} />
        </Pressable>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>{target.full_name || "Unknown"}</Text>
          <Text style={s.headerStatus}>{liveState.replace("_", " ").toUpperCase()}</Text>
        </View>
        {!isClosed && (
          <Pressable onPress={() => setShowHelpModal(true)} style={s.helpedBtn}>
            <MaterialIcons name="check-circle" size={16} color={C.white} />
            <Text style={s.helpedBtnText}>HELPED</Text>
          </Pressable>
        )}
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

      {(!mapLoaded || routeLoading) && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={C.red} />
        </View>
      )}

      <ScrollView style={s.bottomPanel} contentContainerStyle={s.bottomContent}>
        {/* Route Info */}
        {routeData && (
          <View style={s.routeCard}>
            <Text style={s.routeTitle}>
              {routeData.distance_km} km \u00b7 ~{routeData.duration_min} min
            </Text>
            {routeData.steps && routeData.steps.length > 0 && (
              <>
                <Pressable style={s.stepsToggle} onPress={() => setShowSteps((v) => !v)}>
                  <Text style={s.stepsToggleText}>{showSteps ? "Hide" : "Show"} directions</Text>
                  <MaterialIcons name={showSteps ? "expand-less" : "expand-more"} size={20} color={C.gray500} />
                </Pressable>
                {showSteps && routeData.steps.map((step, i) => (
                  <View key={i} style={s.step}>
                    <Text style={s.stepIcon}>{stepIcon(step.maneuver_type, step.maneuver_modifier)}</Text>
                    <Text style={s.stepText} numberOfLines={2}>{stripHtml(step.instruction)}</Text>
                    <Text style={s.stepDist}>{step.distance_m < 1000 ? `${step.distance_m}m` : `${(step.distance_m / 1000).toFixed(1)}km`}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Victim Info */}
        <View style={s.infoSection}>
          <Text style={s.sectionTitle}>Victim Information</Text>
          <View style={s.infoGrid}>
            <View style={s.infoRow}>
              <MaterialIcons name="person" size={16} color={C.gray500} />
              <Text style={s.infoLabel}>Name</Text>
              <Text style={s.infoValue}>{target.full_name || "Unknown"}</Text>
            </View>
            {target.barangay && (
              <View style={s.infoRow}>
                <MaterialIcons name="location-on" size={16} color={C.gray500} />
                <Text style={s.infoLabel}>Barangay</Text>
                <Text style={s.infoValue}>{target.barangay}</Text>
              </View>
            )}
            {target.blood_type && (
              <View style={s.infoRow}>
                <MaterialIcons name="bloodtype" size={16} color={C.red} />
                <Text style={s.infoLabel}>Blood Type</Text>
                <Text style={s.infoValue}>{target.blood_type}</Text>
              </View>
            )}
            {target.special_needs && (
              <View style={s.infoRow}>
                <MaterialIcons name="warning" size={16} color={C.yellow} />
                <Text style={s.infoLabel}>Special Needs</Text>
                <Text style={s.infoValue}>
                  {target.special_needs}
                  {target.special_needs_other ? `: ${target.special_needs_other}` : ""}
                </Text>
              </View>
            )}
            {target.medical_notes && (
              <View style={s.infoRow}>
                <MaterialIcons name="notes" size={16} color={C.gray500} />
                <Text style={s.infoLabel}>Medical Notes</Text>
                <Text style={s.infoValue}>{target.medical_notes}</Text>
              </View>
            )}
            {target.household_size && (
              <View style={s.infoRow}>
                <MaterialIcons name="people" size={16} color={C.gray500} />
                <Text style={s.infoLabel}>Household</Text>
                <Text style={s.infoValue}>{target.household_size} persons</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {!isClosed && (
          <View style={s.actions}>
            {liveState === "en_route" && (
              <Pressable style={s.actionBtn} onPress={() => handleUpdateState("on_scene")}>
                <MaterialIcons name="place" size={18} color={C.white} />
                <Text style={s.actionBtnText}>MARK ON SCENE</Text>
              </Pressable>
            )}
            {liveState === "on_scene" && (
              <Pressable style={[s.actionBtn, { backgroundColor: C.green }]} onPress={() => setShowHelpModal(true)}>
                <MaterialIcons name="check-circle" size={18} color={C.white} />
                <Text style={s.actionBtnText}>MARK HELPED</Text>
              </Pressable>
            )}
            {liveState === "en_route" && (
              <Pressable
                style={[s.actionBtn, { backgroundColor: C.gray500 }]}
                onPress={() => handleUpdateState("cancelled")}
              >
                <MaterialIcons name="cancel" size={18} color={C.white} />
                <Text style={s.actionBtnText}>CANCEL</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Help Modal */}
      <Modal visible={showHelpModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Mark as Helped</Text>
              <Pressable onPress={() => setShowHelpModal(false)}>
                <MaterialIcons name="close" size={24} color={C.gray600} />
              </Pressable>
            </View>
            <Text style={s.modalLabel}>What aide was given?</Text>
            <ScrollView style={s.aidScroll}>
              {AID_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[s.aidOption, selectedAid === opt.value && s.aidOptionSelected]}
                  onPress={() => setSelectedAid(opt.value)}
                >
                  <MaterialIcons name={opt.icon} size={22} color={selectedAid === opt.value ? C.white : C.gray700} />
                  <Text style={[s.aidOptionText, selectedAid === opt.value && s.aidOptionTextSelected]}>
                    {opt.label}
                  </Text>
                  {selectedAid === opt.value && <MaterialIcons name="check-circle" size={20} color={C.white} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[s.submitBtn, (!selectedAid || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmitHelp}
              disabled={!selectedAid || submitting}
            >
              {submitting ? <ActivityIndicator size="small" color={C.white} /> : <Text style={s.submitBtnText}>CONFIRM HELPED</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.red, gap: 8,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerTitle: { color: C.white, fontSize: 14, fontWeight: "700" },
  headerStatus: { color: "#fca5a5", fontSize: 11, fontWeight: "600", marginTop: 1 },
  helpedBtn: { flexDirection: "row", alignItems: "center", backgroundColor: C.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
  helpedBtnText: { color: C.white, fontWeight: "700", fontSize: 11 },
  map: { height: 240 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.15)", zIndex: 10 },
  bottomPanel: { flex: 1 },
  bottomContent: { paddingBottom: 20 },
  routeCard: { backgroundColor: C.white, margin: 12, borderRadius: 12, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  routeTitle: { fontSize: 15, fontWeight: "700", color: C.gray900, marginBottom: 8 },
  stepsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  stepsToggleText: { fontSize: 13, color: C.blue, fontWeight: "600" },
  step: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 6, gap: 8, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  stepIcon: { fontSize: 16, fontWeight: "700", color: C.red, width: 22, textAlign: "center", marginTop: 1 },
  stepText: { flex: 1, fontSize: 12, color: C.gray700, lineHeight: 16 },
  stepDist: { fontSize: 11, fontWeight: "600", color: C.gray500 },
  infoSection: { backgroundColor: C.white, marginHorizontal: 12, borderRadius: 12, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.gray600, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  infoGrid: { gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 12, fontWeight: "600", color: C.gray500, width: 90 },
  infoValue: { flex: 1, fontSize: 13, color: C.gray800, fontWeight: "500" },
  actions: { marginHorizontal: 12, gap: 8, marginBottom: 12 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: C.blue, paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  actionBtnText: { color: C.white, fontWeight: "700", fontSize: 14, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingVertical: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.gray900 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: C.gray700, marginBottom: 12 },
  aidScroll: { maxHeight: 280 },
  aidOption: { flexDirection: "row", alignItems: "center", backgroundColor: C.gray50, padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  aidOptionSelected: { backgroundColor: C.green },
  aidOptionText: { flex: 1, fontSize: 14, fontWeight: "600", color: C.gray800 },
  aidOptionTextSelected: { color: C.white },
  submitBtn: { backgroundColor: C.green, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 16 },
  submitBtnText: { color: C.white, fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
});
