import React, { useState, useEffect, useCallback } from "react";
import {
  View, StyleSheet, Text, Pressable, ActivityIndicator,
  ScrollView, RefreshControl, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchMyAssignments, updateAssignment } from "../../services/rescue.js";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh.js";

const C = {
  red: "#991b1b", red700: "#b91c1c", white: "#fff",
  gray50: "#f9fafb", gray100: "#f3f4f6", gray200: "#e5e7eb",
  gray400: "#9ca3af", gray500: "#6b7280", gray600: "#4b5563",
  gray700: "#374151", gray800: "#1f2937", gray900: "#111827",
  green: "#15803d", greenBg: "#dcfce7",
  yellow: "#d97706", yellowBg: "#fef3c7",
  redBg: "#fee2e2", blue: "#2563eb", blueBg: "#dbeafe",
};

const STATE_COLORS = {
  en_route: { bg: C.yellowBg, text: C.yellow },
  on_scene: { bg: C.blueBg, text: C.blue },
  helped: { bg: C.greenBg, text: C.green },
  cancelled: { bg: C.gray100, text: C.gray500 },
};

export default function RescuerActiveScreen({ navigation }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchMyAssignments(false);
      setAssignments(data?.data || []);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useRealtimeRefresh(
    session?.user?.id
      ? {
          table: "rescue_assignments",
          event: "*",
          filter: `rescuer_id=eq.${session.user.id}`,
          channelName: `rescuer-active-${session.user.id}`,
        }
      : null,
    loadData,
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const activeCount = assignments.filter((a) => a.state === "en_route" || a.state === "on_scene").length;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <View style={s.header}>
        <MaterialIcons name="assignment" size={18} color={C.white} />
        <Text style={s.headerTitle}>ACTIVE ASSIGNMENTS</Text>
        <Text style={s.headerCount}>{activeCount} active</Text>
      </View>

      {loading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={C.red} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} />}
        >
          {assignments.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="check-circle" size={48} color={C.green} />
              <Text style={s.emptyText}>No assignments yet</Text>
              <Text style={s.emptySubtext}>Claim an incident from the Incidents or Map tab</Text>
            </View>
          ) : (
            assignments.map((a) => {
              const sc = STATE_COLORS[a.state] || STATE_COLORS.en_route;
              return (
                <Pressable
                  key={a.id}
                  style={s.card}
                  onPress={() => navigation.navigate("RescuerAssignmentDetail", { assignment: a })}
                >
                  <View style={s.cardHeader}>
                    <View style={s.cardLeft}>
                      <Text style={s.cardName}>{a.target?.full_name || "Unknown"}</Text>
                      <View style={[s.stateBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[s.stateText, { color: sc.text }]}>
                          {a.state.replace("_", " ").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={22} color={C.gray400} />
                  </View>
                  <View style={s.cardDetails}>
                    {a.target?.barangay && (
                      <Text style={s.detailText}>
                        <MaterialIcons name="location-on" size={12} color={C.gray500} /> {a.target.barangay}
                      </Text>
                    )}
                    {a.distance_meters && (
                      <Text style={s.detailText}>
                        {a.distance_meters >= 1000 ? `${(a.distance_meters / 1000).toFixed(1)}km` : `${a.distance_meters}m`}
                        {a.eta_seconds ? ` · ~${Math.round(a.eta_seconds / 60)}min ETA` : ""}
                      </Text>
                    )}
                    {a.aid_type && (
                      <Text style={s.detailText}>
                        Aide: {a.aid_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                    )}
                  </View>
                  <Text style={s.cardTime}>{new Date(a.created_at).toLocaleString()}</Text>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.red, gap: 8,
  },
  headerTitle: { flex: 1, color: C.white, fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  headerCount: { color: "#fca5a5", fontSize: 12, fontWeight: "600" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600", color: C.gray600 },
  emptySubtext: { fontSize: 13, color: C.gray400, textAlign: "center" },
  card: {
    backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  cardName: { fontSize: 15, fontWeight: "700", color: C.gray900 },
  stateBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  stateText: { fontSize: 10, fontWeight: "700" },
  cardDetails: { gap: 4, marginBottom: 6 },
  detailText: { fontSize: 12, color: C.gray600 },
  cardTime: { fontSize: 11, color: C.gray400 },
});
