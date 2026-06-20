import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import useFamilyLocations from "../../hooks/useFamilyLocations.js";
import { createFamily, joinFamily, leaveFamily } from "../../services/family.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  shield50: "#fef2f2",
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
  green500: "#22c55e",
  green700: "#15803d",
  yellow500: "#eab308",
  yellow700: "#a16207",
  red500: "#ef4444",
  red600: "#dc2626",
  red700: "#b91c1c",
};

const STATUS_CONFIG = {
  safe: { color: COLORS.green500, label: "Safe" },
  help: { color: COLORS.yellow500, label: "Help" },
  emergency: { color: COLORS.red500, label: "SOS" },
};

function timeAgo(isoString) {
  if (!isoString) return "Never";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function FamilyScreen() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { members, family, loading, refresh } = useFamilyLocations();

  const [tab, setTab] = useState("info");
  const [familyName, setFamilyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (family) setTab("info");
  }, [family]);

  const handleCreate = useCallback(async () => {
    if (!familyName.trim()) return;
    setSubmitting(true);
    try {
      const family = await createFamily(familyName.trim());
      setGeneratedCode(family.code);
      showToast("Family created!", "success");
      await refreshProfile();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [familyName, showToast, refreshProfile, refresh]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) return;
    setSubmitting(true);
    try {
      await joinFamily(joinCode.trim());
      showToast("Joined family!", "success");
      await refreshProfile();
      refresh();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }, [joinCode, showToast, refreshProfile, refresh]);

  const handleLeave = useCallback(() => {
    Alert.alert("Leave Family", "Your location will no longer be shared with family members.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveFamily();
            showToast("Left family.", "info");
            await refreshProfile();
            refresh();
          } catch (err) {
            showToast(err.message, "error");
          }
        },
      },
    ]);
  }, [showToast, refreshProfile, refresh]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.shieldPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!family) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Family Setup</Text>
          <Text style={styles.subtitle}>Create or join a family to share real-time locations.</Text>
        </View>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setTab("create")}
            style={[styles.tab, tab === "create" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "create" && styles.tabTextActive]}>Create</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("join")}
            style={[styles.tab, tab === "join" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "join" && styles.tabTextActive]}>Join</Text>
          </Pressable>
        </View>

        {tab === "create" ? (
          <View style={styles.form}>
            <Text style={styles.label}>Family Name</Text>
            <TextInput
              style={styles.input}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="e.g. Dela Cruz Household"
              maxLength={50}
            />
            <Pressable
              onPress={handleCreate}
              disabled={submitting || !familyName.trim()}
              style={[styles.button, (submitting || !familyName.trim()) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{submitting ? "Creating..." : "Create Family"}</Text>
            </Pressable>
            {generatedCode && (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Share this code:</Text>
                <Text style={styles.codeValue}>{generatedCode}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Family Code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              autoCapitalize="characters"
            />
            <Pressable
              onPress={handleJoin}
              disabled={submitting || joinCode.trim().length < 6}
              style={[styles.button, (submitting || joinCode.trim().length < 6) && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{submitting ? "Joining..." : "Join Family"}</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family</Text>
        {family?.code && (
          <Text style={styles.codeDisplay}>
            Code: <Text style={styles.codeValueInline}>{family.code}</Text>
          </Text>
        )}
        <Text style={styles.memberCount}>
          {members.length} member{members.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView style={styles.memberList} contentContainerStyle={styles.memberListContent}>
        {members.length === 0 && (
          <Text style={styles.emptyText}>No members yet. Share your family code!</Text>
        )}
        {members.map((m) => {
          const statusCfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.safe;
          return (
            <View key={m.id} style={styles.memberRow}>
              <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m.full_name || "Unnamed"}</Text>
                <Text style={styles.memberTime}>{timeAgo(m.last_seen_at)}</Text>
              </View>
              <Text style={[styles.memberStatus, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.leaveContainer}>
        <Pressable onPress={handleLeave} style={styles.leaveButton}>
          <MaterialIcons name="exit-to-app" size={18} color={COLORS.red600} />
          <Text style={styles.leaveText}>Leave Family</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.gray200 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.gray900, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.gray500 },
  codeDisplay: { fontSize: 13, color: COLORS.gray500, marginTop: 8 },
  codeValueInline: { fontFamily: "monospace", fontWeight: "600", color: COLORS.gray700 },
  memberCount: { fontSize: 12, color: COLORS.gray400, marginTop: 4 },
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginTop: 16, backgroundColor: COLORS.gray100, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "500", color: COLORS.gray500 },
  tabTextActive: { color: COLORS.gray900 },
  form: { padding: 20 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.gray600, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: COLORS.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.gray800, backgroundColor: COLORS.gray50 },
  codeInput: { textAlign: "center", letterSpacing: 4, fontSize: 20, fontWeight: "700" },
  button: { backgroundColor: COLORS.shieldPrimary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
  codeBox: { marginTop: 20, padding: 16, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: 10, alignItems: "center" },
  codeLabel: { fontSize: 12, color: COLORS.green700, fontWeight: "500", marginBottom: 4 },
  codeValue: { fontSize: 28, fontWeight: "700", color: COLORS.green700, fontFamily: "monospace", letterSpacing: 6 },
  memberList: { flex: 1 },
  memberListContent: { padding: 16 },
  emptyText: { fontSize: 13, color: COLORS.gray400, textAlign: "center", marginTop: 40 },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray100, gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: "500", color: COLORS.gray800 },
  memberTime: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  memberStatus: { fontSize: 12, fontWeight: "600" },
  leaveContainer: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.gray200 },
  leaveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  leaveText: { fontSize: 14, fontWeight: "500", color: COLORS.red600 },
});
