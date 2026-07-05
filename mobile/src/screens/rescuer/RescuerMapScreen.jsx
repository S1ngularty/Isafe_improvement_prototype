import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, StyleSheet, ActivityIndicator, Text, Pressable,
  Modal, ScrollView, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchRoute } from "../../services/routing.js";
import {
  fetchInNeed,
  fetchMyAssignments,
  updateAssignment,
} from "../../services/rescue.js";
import LEAFLET_HTML from "../../assets/leafletMapHtml.js";
import { getDefaultAvatar } from "../../services/profile.js";

const C = {
  red: "#991b1b",
  red700: "#b91c1c",
  red600: "#dc2626",
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
  green: "#15803d",
  greenBg: "#dcfce7",
  yellow: "#d97706",
  yellowBg: "#fef3c7",
  redBg: "#fee2e2",
  blue: "#2563eb",
  shadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
};

const AID_OPTIONS = [
  { value: "first_aid", label: "First Aid", icon: "medical-services" },
  { value: "transported_to_hospital", label: "Aided to Hospital", icon: "local-hospital" },
  { value: "evacuated", label: "Evacuated", icon: "location-city" },
  { value: "food_water", label: "Food & Water", icon: "restaurant" },
  { value: "search_rescue", label: "Search & Rescue", icon: "search" },
  { value: "other", label: "Other", icon: "more-horiz" },
];

function statusColor(s) {
  if (s === "emergency") return C.red600;
  if (s === "help") return C.yellow;
  return C.green;
}

export default function RescuerMapScreen() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedAid, setSelectedAid] = useState(null);
  const [helpNotes, setHelpNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inNeedUsers, setInNeedUsers] = useState([]);
  const [showPanel, setShowPanel] = useState("list"); // list | route | help
  const webViewRef = useRef(null);
  const posIntervalRef = useRef(null);

  const sendToMap = (type, payload) => {
    if (!webViewRef.current) return;
    const js = `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type, payload }))}});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;
    webViewRef.current.injectJavaScript(js);
  };

  const loadData = useCallback(async () => {
    try {
      const [assignData, inNeedData] = await Promise.all([
        fetchMyAssignments(true),
        fetchInNeed(currentLocation?.latitude, currentLocation?.longitude),
      ]);
      setAssignments(assignData?.data || []);
      setInNeedUsers(inNeedData?.users || []);
    } catch (_) {}
  }, [currentLocation]);

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
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (currentLocation && selectedAssignment) {
      posIntervalRef.current = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          await updateAssignment(selectedAssignment.id, {
            rescuer_lat: loc.coords.latitude,
            rescuer_lng: loc.coords.longitude,
          });
          sendToMap("UPDATE_RESCUER_POS", { lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (_) {}
      }, 15000);
      return () => {
        if (posIntervalRef.current) clearInterval(posIntervalRef.current);
      };
    }
  }, [currentLocation, selectedAssignment]);

  useEffect(() => {
    if (mapLoaded && currentLocation) {
      sendToMap("CENTER_ON", { lat: currentLocation.latitude, lng: currentLocation.longitude });
    }
  }, [mapLoaded, currentLocation]);

  const handleWebViewMessage = (event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "MAP_LOADED") setMapLoaded(true);
    } catch (_) {}
  };

  const handleSelectAssignment = async (a) => {
    setSelectedAssignment(a);
    setRoute(null);
    setShowPanel("route");

    const slat = currentLocation?.latitude;
    const slng = currentLocation?.longitude;
    const tlat = a.target?.lat;
    const tlng = a.target?.lng;

    if (slat && slng && tlat && tlng) {
      setRouteLoading(true);
      try {
        const result = await fetchRoute(slat, slng, tlat, tlng);
        if (result) {
          const label = `${result.distance_km} km · ~${result.duration_min} min`;
          sendToMap("SET_ROUTE", { coordinates: result.coordinates, label });
          setRoute(result);
        }
      } catch (_) {
        showToast("Failed to get route", "error");
      } finally {
        setRouteLoading(false);
      }
    }

    sendToMap("CENTER_ON", { lat: tlat || slat, lng: tlng || slng });
  };

  const handleShowHelpModal = (a) => {
    setSelectedAssignment(a);
    setSelectedAid(null);
    setHelpNotes("");
    setShowHelpModal(true);
  };

  const handleSubmitHelp = async () => {
    if (!selectedAid) {
      showToast("Please select the aide given", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await updateAssignment(selectedAssignment.id, {
        state: "helped",
        aid_type: selectedAid,
        notes: helpNotes || null,
      });
      showToast("Marked as helped!", "success");
      setShowHelpModal(false);
      setSelectedAssignment(null);
      setRoute(null);
      sendToMap("CLEAR_ROUTE", {});
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateState = async (assignmentId, newState) => {
    try {
      await updateAssignment(assignmentId, { state: newState });
      showToast(`Status: ${newState.replace("_", " ")}`, "success");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to update", "error");
    }
  };

  const handleClaim = async (targetUserId) => {
    try {
      const { claimAssignment: claim } = await import("../../services/rescue.js");
      await claim(targetUserId);
      showToast("Claimed!", "success");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to claim", "error");
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>RESCUE MAP</Text>
        <View style={s.headerActions}>
          <Pressable
            style={[s.headerTab, showPanel === "list" && s.headerTabActive]}
            onPress={() => setShowPanel("list")}
          >
            <MaterialIcons name="list" size={20} color={showPanel === "list" ? C.white : C.gray400} />
          </Pressable>
          <Pressable
            style={[s.headerTab, showPanel === "route" && s.headerTabActive]}
            onPress={() => setShowPanel("route")}
          >
            <MaterialIcons name="map" size={20} color={showPanel === "route" ? C.white : C.gray400} />
          </Pressable>
        </View>
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
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={C.red} />
        </View>
      )}

      {/* Bottom Panel */}
      <View style={s.bottomPanel}>
        {showPanel === "list" && (
          <ScrollView style={s.panelScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.panelTitle}>
              Active Assignments ({assignments.length}) · In Need ({inNeedUsers.length})
            </Text>
            {assignments.length === 0 && inNeedUsers.length === 0 && (
              <View style={s.emptyPanel}>
                <MaterialIcons name="check-circle" size={32} color={C.green} />
                <Text style={s.emptyText}>No active incidents</Text>
              </View>
            )}
            {assignments.map((a) => (
              <Pressable key={a.id} style={s.assignCard} onPress={() => handleSelectAssignment(a)}>
                <View style={s.assignCardLeft}>
                  <Text style={s.assignName}>{a.target?.full_name || "Unknown"}</Text>
                  <Text style={s.assignStatus}>{a.state.replace("_", " ").toUpperCase()}</Text>
                  {a.distance_meters && (
                    <Text style={s.assignDetail}>
                      {a.distance_meters >= 1000 ? `${(a.distance_meters / 1000).toFixed(1)}km` : `${a.distance_meters}m`}
                      {a.eta_seconds ? ` · ~${Math.round(a.eta_seconds / 60)}min ETA` : ""}
                    </Text>
                  )}
                </View>
                <View style={s.assignCardRight}>
                  {a.state === "en_route" && (
                    <Pressable style={s.smallBtn} onPress={() => handleUpdateState(a.id, "on_scene")}>
                      <Text style={s.smallBtnText}>ON SCENE</Text>
                    </Pressable>
                  )}
                  {a.state === "on_scene" && (
                    <Pressable style={[s.smallBtn, s.smallBtnGreen]} onPress={() => handleShowHelpModal(a)}>
                      <Text style={s.smallBtnText}>HELPED</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            ))}
            {inNeedUsers.map((u) => {
              const isClaimed = assignments.some((a) => a.target_user_id === u.id);
              if (isClaimed) return null;
              return (
                <Pressable key={u.id} style={s.inNeedCard} onPress={() => {
                  if (!isClaimed) handleClaim(u.id);
                }}>
                  <View style={s.inNeedCardLeft}>
                    <Text style={s.inNeedName}>{u.full_name || "Unknown"}</Text>
                    <View style={s.inNeedDetails}>
                      <Text style={[s.inNeedStatus, { color: statusColor(u.status) }]}>
                        {u.status === "emergency" ? "EMERGENCY" : "NEEDS HELP"}
                      </Text>
                      {u.distance_km && <Text style={s.inNeedDist}>{u.distance_km}km</Text>}
                    </View>
                  </View>
                  <Pressable style={s.claimBtnSmall} onPress={() => handleClaim(u.id)}>
                    <Text style={s.claimBtnText}>CLAIM</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {showPanel === "route" && selectedAssignment && (
          <ScrollView style={s.panelScroll} showsVerticalScrollIndicator={false}>
            <View style={s.routeHeader}>
              <View style={s.routeInfo}>
                <Text style={s.routeName}>{selectedAssignment.target?.full_name || "Victim"}</Text>
                <Text style={s.routeStatus}>{selectedAssignment.state.replace("_", " ").toUpperCase()}</Text>
                {route && (
                  <Text style={s.routeMeta}>
                    {route.distance_km} km · ~{route.duration_min} min
                  </Text>
                )}
              </View>
              {selectedAssignment.state !== "helped" && selectedAssignment.state !== "cancelled" && (
                <Pressable style={s.helpBtn} onPress={() => handleShowHelpModal(selectedAssignment)}>
                  <MaterialIcons name="check-circle" size={16} color={C.white} />
                  <Text style={s.helpBtnText}>MARK HELPED</Text>
                </Pressable>
              )}
            </View>
            {selectedAssignment.target && (
              <View style={s.vitalsCard}>
                <Text style={s.vitalsTitle}>Victim Information</Text>
                <View style={s.vitalsRow}>
                  <MaterialIcons name="location-on" size={14} color={C.gray500} />
                  <Text style={s.vitalsText}>{selectedAssignment.target.barangay || "Unknown"}</Text>
                </View>
                {selectedAssignment.target.blood_type && (
                  <View style={s.vitalsRow}>
                    <MaterialIcons name="bloodtype" size={14} color={C.red} />
                    <Text style={s.vitalsText}>Blood: {selectedAssignment.target.blood_type}</Text>
                  </View>
                )}
                {selectedAssignment.target.special_needs && (
                  <View style={s.vitalsRow}>
                    <MaterialIcons name="warning" size={14} color={C.yellow} />
                    <Text style={s.vitalsText}>{selectedAssignment.target.special_needs}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

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
            <ScrollView style={s.aidOptionsScroll}>
              {AID_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[s.aidOption, selectedAid === opt.value && s.aidOptionSelected]}
                  onPress={() => setSelectedAid(opt.value)}
                >
                  <MaterialIcons
                    name={opt.icon}
                    size={22}
                    color={selectedAid === opt.value ? C.white : C.gray700}
                  />
                  <Text style={[s.aidOptionText, selectedAid === opt.value && s.aidOptionTextSelected]}>
                    {opt.label}
                  </Text>
                  {selectedAid === opt.value && (
                    <MaterialIcons name="check-circle" size={20} color={C.white} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[s.submitBtn, (!selectedAid || submitting) && s.submitBtnDisabled]}
              onPress={handleSubmitHelp}
              disabled={!selectedAid || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <Text style={s.submitBtnText}>CONFIRM HELPED</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.red,
  },
  headerTitle: { color: C.white, fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerTab: { padding: 6, borderRadius: 6 },
  headerTabActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  map: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 10 },
  bottomPanel: { maxHeight: 300, backgroundColor: C.white, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  panelScroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  panelTitle: { fontSize: 12, fontWeight: "700", color: C.gray600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  emptyPanel: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: C.gray500 },
  assignCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.greenBg, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: C.green,
  },
  assignCardLeft: { flex: 1 },
  assignName: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  assignStatus: { fontSize: 10, fontWeight: "700", color: C.green, marginTop: 2 },
  assignDetail: { fontSize: 11, color: C.gray500, marginTop: 2 },
  assignCardRight: { flexDirection: "row", gap: 6 },
  smallBtn: { backgroundColor: C.red, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  smallBtnGreen: { backgroundColor: C.green },
  smallBtnText: { color: C.white, fontWeight: "700", fontSize: 10, letterSpacing: 0.3 },
  inNeedCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.gray50, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: C.red600,
  },
  inNeedCardLeft: { flex: 1 },
  inNeedName: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  inNeedDetails: { flexDirection: "row", gap: 8, marginTop: 2 },
  inNeedStatus: { fontSize: 10, fontWeight: "700" },
  inNeedDist: { fontSize: 10, color: C.gray500 },
  claimBtnSmall: { backgroundColor: C.red, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  claimBtnText: { color: C.white, fontWeight: "700", fontSize: 10, letterSpacing: 0.3 },
  routeHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12,
  },
  routeInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: "700", color: C.gray900 },
  routeStatus: { fontSize: 11, fontWeight: "700", color: C.green, marginTop: 2 },
  routeMeta: { fontSize: 12, color: C.gray500, marginTop: 4 },
  helpBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.green,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  helpBtnText: { color: C.white, fontWeight: "700", fontSize: 11 },
  vitalsCard: {
    backgroundColor: C.gray50, borderRadius: 10, padding: 12, gap: 6,
  },
  vitalsTitle: { fontSize: 12, fontWeight: "700", color: C.gray600, marginBottom: 4, textTransform: "uppercase" },
  vitalsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vitalsText: { fontSize: 13, color: C.gray700 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingVertical: 20, maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.gray900 },
  modalLabel: { fontSize: 14, fontWeight: "600", color: C.gray700, marginBottom: 12 },
  aidOptionsScroll: { maxHeight: 280, gap: 8 },
  aidOption: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.gray50,
    padding: 14, borderRadius: 12, marginBottom: 8, gap: 12,
  },
  aidOptionSelected: { backgroundColor: C.green },
  aidOptionText: { flex: 1, fontSize: 14, fontWeight: "600", color: C.gray800 },
  aidOptionTextSelected: { color: C.white },
  submitBtn: {
    backgroundColor: C.green, paddingVertical: 14, borderRadius: 12, alignItems: "center",
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: C.white, fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
});
