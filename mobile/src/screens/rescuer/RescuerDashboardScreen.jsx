import React, { useState, useEffect, useCallback } from "react";
import {
  View, StyleSheet, Text, Pressable, ActivityIndicator,
  ScrollView, RefreshControl, Image, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import {
  fetchInNeed,
  claimAssignment,
  fetchMyAssignments,
} from "../../services/rescue.js";
import { getDefaultAvatar } from "../../services/profile.js";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh.js";

const C = {
  red: "#991b1b",
  red700: "#b91c1c",
  red600: "#dc2626",
  white: "#fff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
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
};

function statusColor(s) {
  if (s === "emergency") return C.red600;
  if (s === "help") return C.yellow;
  return C.green;
}

function statusBg(s) {
  if (s === "emergency") return C.redBg;
  if (s === "help") return C.yellowBg;
  return C.greenBg;
}

export default function RescuerDashboardScreen({ navigation }) {
  const { session, profile } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setLocation(loc.coords);
        }
      } catch (_) {}
    })();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [inNeedData, myAssignmentsData] = await Promise.all([
        fetchInNeed(location?.latitude, location?.longitude),
        fetchMyAssignments(true),
      ]);
      setUsers(inNeedData?.data || []);
      setAssignments(myAssignmentsData?.data || []);
    } catch (err) {
      showToast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [location, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeRefresh(
    { table: "status_history", event: "INSERT", channelName: "rescuer-dashboard-status" },
    loadData,
  );

  useRealtimeRefresh(
    session?.user?.id
      ? {
          table: "rescue_assignments",
          event: "*",
          filter: `rescuer_id=eq.${session.user.id}`,
          channelName: `rescuer-dashboard-assignments-${session.user.id}`,
        }
      : null,
    loadData,
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaim = async (targetUserId) => {
    setClaimingId(targetUserId);
    try {
      const result = await claimAssignment(targetUserId);
      showToast("Assignment claimed!", "success");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to claim", "error");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.red} />
      <View style={s.header}>
        <View>
          <Text style={s.headerLabel}>RESCUER DASHBOARD</Text>
          <Text style={s.headerName}>{profile?.full_name || "Rescuer"}</Text>
        </View>
        <Pressable style={s.avatarBtn} onPress={() => navigation.navigate("RescuerProfile")}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          ) : (
            <Image source={{ uri: getDefaultAvatar(profile?.full_name) }} style={s.avatar} />
          )}
        </Pressable>
      </View>

      {assignments.length > 0 && (
        <View style={s.activeBanner}>
          <MaterialIcons name="assignment" size={18} color={C.white} />
          <Text style={s.activeBannerText}>
            Active: {assignments.length} assignment{assignments.length > 1 ? "s" : ""}
          </Text>
              <Pressable onPress={() => navigation.navigate("RescuerActiveStack", { screen: "ActiveList" })}>
            <Text style={s.activeBannerLink}>VIEW</Text>
          </Pressable>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={s.loading}><ActivityIndicator size="large" color={C.red} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.red]} />}
        >
          <Text style={s.sectionTitle}>People in Need</Text>
          {users.length === 0 ? (
            <View style={s.empty}>
              <MaterialIcons name="check-circle" size={48} color={C.green} />
              <Text style={s.emptyText}>No one needs help right now</Text>
            </View>
          ) : (
            users.map((u) => (
              <View key={u.id} style={[s.userCard, { borderLeftColor: statusColor(u.status), borderLeftWidth: 4 }]}>
                <View style={s.userCardHeader}>
                  <View style={s.userInfo}>
                    <Text style={s.userName}>{u.full_name || "Unknown"}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusBg(u.status) }]}>
                      <Text style={[s.statusBadgeText, { color: statusColor(u.status) }]}>
                        {u.status === "emergency" ? "EMERGENCY" : u.status === "help" ? "NEEDS HELP" : "SAFE"}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[s.claimBtn, claimingId === u.id && s.claimBtnDisabled]}
                    onPress={() => handleClaim(u.id)}
                    disabled={claimingId === u.id}
                  >
                    {claimingId === u.id ? (
                      <ActivityIndicator size="small" color={C.white} />
                    ) : (
                      <Text style={s.claimBtnText}>RESPOND</Text>
                    )}
                  </Pressable>
                </View>
                <View style={s.userDetails}>
                  {u.barangay && (
                    <View style={s.detailRow}>
                      <MaterialIcons name="location-on" size={14} color={C.gray500} />
                      <Text style={s.detailText}>{u.barangay}</Text>
                    </View>
                  )}
                  {u.distance_km && (
                    <View style={s.detailRow}>
                      <MaterialIcons name="navigation" size={14} color={C.gray500} />
                      <Text style={s.detailText}>{u.distance_km} km away</Text>
                    </View>
                  )}
                  <View style={s.detailRow}>
                    <MaterialIcons name="access-time" size={14} color={C.gray500} />
                    <Text style={s.detailText}>
                      {u.last_seen_at
                        ? new Date(u.last_seen_at).toLocaleString()
                        : "Unknown"}
                    </Text>
                  </View>
                  {u.blood_type && (
                    <View style={s.detailRow}>
                      <MaterialIcons name="bloodtype" size={14} color={C.gray500} />
                      <Text style={s.detailText}>Blood: {u.blood_type}</Text>
                    </View>
                  )}
                  {u.special_needs && (
                    <View style={s.detailRow}>
                      <MaterialIcons name="warning" size={14} color={C.yellow} />
                      <Text style={s.detailText}>{u.special_needs}{u.special_needs_other ? `: ${u.special_needs_other}` : ""}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
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
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 16, backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.gray200,
  },
  headerLabel: { fontSize: 11, fontWeight: "700", color: C.red, letterSpacing: 1 },
  headerName: { fontSize: 20, fontWeight: "800", color: C.gray900, marginTop: 2 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.gray100, justifyContent: "center", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  activeBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.green,
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  activeBannerText: { flex: 1, color: C.white, fontWeight: "600", fontSize: 13 },
  activeBannerLink: { color: C.white, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.gray900, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: C.gray500, fontWeight: "500" },
  userCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  userCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8,
  },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 15, fontWeight: "700", color: C.gray900 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  claimBtn: {
    backgroundColor: C.red, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    minWidth: 80, alignItems: "center",
  },
  claimBtnDisabled: { opacity: 0.6 },
  claimBtnText: { color: C.white, fontWeight: "700", fontSize: 12, letterSpacing: 0.5 },
  userDetails: { gap: 6, marginTop: 4 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 12, color: C.gray600, flex: 1 },
});
