import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchTcwsActive, fetchAnnouncementsActive, fetchFamilyAlerts } from "../../services/alerts.js";

const COLORS = {
  primary: "#800000",
  blue: "#3b82f6",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
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
  white: "#fff",
};

export default function AlertsScreen({ navigation }) {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("tcws"); // tcws, announcements, family
  const [loading, setLoading] = useState(true);
  
  const [tcws, setTcws] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [familyAlerts, setFamilyAlerts] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [t, a, f] = await Promise.all([
          fetchTcwsActive(),
          fetchAnnouncementsActive(),
          profile?.id ? fetchFamilyAlerts(profile.id) : Promise.resolve([]),
        ]);
        if (active) {
          setTcws(Array.isArray(t) ? t : (t?.data || []));
          setAnnouncements(Array.isArray(a) ? a : (a?.data || []));
          setFamilyAlerts(Array.isArray(f) ? f : (f?.data || []));
        }
      } catch (error) {
        if (active) showToast("Failed to load alerts", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [profile?.id, showToast]);

  const renderTcwsTab = () => {
    if (tcws.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="wb-sunny" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No Active Signals</Text>
          <Text style={styles.emptyText}>There are currently no active Tropical Cyclone Wind Signals.</Text>
        </View>
      );
    }
    return (
      <View style={styles.list}>
        {tcws.map(alert => (
          <View key={alert.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.signalBadge, { backgroundColor: alert.signal_level >= 3 ? COLORS.red : alert.signal_level === 2 ? COLORS.orange : COLORS.blue }]}>
                <Text style={styles.signalBadgeText}>Signal {alert.signal_level}</Text>
              </View>
              <Text style={styles.cardDate}>{new Date(alert.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.cardDesc}>{alert.description}</Text>
            {alert.wind_speed && (
              <View style={styles.cardMeta}>
                <MaterialIcons name="air" size={16} color={COLORS.gray500} />
                <Text style={styles.cardMetaText}>{alert.wind_speed}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderAnnouncementsTab = () => {
    if (announcements.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="campaign" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No Announcements</Text>
          <Text style={styles.emptyText}>There are no active official announcements at this time.</Text>
        </View>
      );
    }
    return (
      <View style={styles.list}>
        {announcements.map(ann => (
          <View key={ann.id} style={[styles.card, ann.priority === 'High' && { borderLeftWidth: 4, borderLeftColor: COLORS.red }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{ann.title}</Text>
              {ann.priority === 'High' && (
                <View style={[styles.badge, { backgroundColor: "#fef2f2" }]}>
                  <Text style={[styles.badgeText, { color: COLORS.red }]}>High Priority</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardDesc}>{ann.content}</Text>
            <Text style={styles.cardDate}>{new Date(ann.created_at).toLocaleString()}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderFamilyTab = () => {
    if (!profile) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="family-restroom" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyText}>Log in to view family alerts.</Text>
        </View>
      );
    }
    if (familyAlerts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="check-circle-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>All Safe</Text>
          <Text style={styles.emptyText}>No emergency alerts from family members.</Text>
        </View>
      );
    }
    return (
      <View style={styles.list}>
        {familyAlerts.map(alert => (
          <View key={alert.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{alert.alert_type} Alert</Text>
              <Text style={styles.cardDate}>{new Date(alert.created_at).toLocaleString()}</Text>
            </View>
            {alert.message && <Text style={styles.cardDesc}>{alert.message}</Text>}
            <View style={styles.cardMeta}>
              <MaterialIcons name="person" size={16} color={COLORS.gray500} />
              <Text style={styles.cardMetaText}>User ID: {alert.user_id}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Alerts Center</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: "tcws", label: "PAGASA TCWS" },
          { key: "announcements", label: "Announcements" },
          { key: "family", label: "Family" }
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === "tcws" && tcws.length > 0 && activeTab !== "tcws" && <View style={styles.dot} />}
            {tab.key === "announcements" && announcements.length > 0 && activeTab !== "announcements" && <View style={styles.dot} />}
            {tab.key === "family" && familyAlerts.length > 0 && activeTab !== "family" && <View style={styles.dot} />}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching alerts...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {activeTab === "tcws" && renderTcwsTab()}
          {activeTab === "announcements" && renderAnnouncementsTab()}
          {activeTab === "family" && renderFamilyTab()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    zIndex: 10,
  },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: "700" },
  
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent", position: "relative" },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.gray500 },
  tabTextActive: { color: COLORS.primary, fontWeight: "800" },
  dot: { position: "absolute", top: 12, right: 12, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red },

  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80, gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray500 },
  
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray700 },
  emptyText: { fontSize: 14, color: COLORS.gray500, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
  
  list: { gap: 12 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.gray200, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray900, flex: 1 },
  cardDesc: { fontSize: 14, color: COLORS.gray700, lineHeight: 20, marginBottom: 12 },
  cardDate: { fontSize: 11, color: COLORS.gray400 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cardMetaText: { fontSize: 13, color: COLORS.gray600, fontWeight: "500" },
  
  signalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  signalBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "700" },
});
