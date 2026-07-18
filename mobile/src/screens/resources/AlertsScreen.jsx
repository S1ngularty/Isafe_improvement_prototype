import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import {
  fetchTcwsActive,
  fetchAnnouncementsActive,
  fetchFamilyAlerts,
  fetchFamilyCurrentStatus,
  fetchStatusHistory,
} from "../../services/alerts.js";

const COLORS = {
  primary: "#800000",
  shield50: "#fef2f2",
  blue: "#3b82f6",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  green50: "#f0fdf4",
  green500: "#22c55e",
  green600: "#16a34a",
  green800: "#166534",
  yellow50: "#fefce8",
  yellow500: "#eab308",
  yellow700: "#a16207",
  red50: "#fef2f2",
  red600: "#dc2626",
  red800: "#991b1b",
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

const STATUS_CONFIG = {
  safe: {
    color: COLORS.green500,
    bg: COLORS.green50,
    text: COLORS.green800,
    label: "Safe",
  },
  help: {
    color: COLORS.yellow500,
    bg: COLORS.yellow50,
    text: COLORS.yellow700,
    label: "Help",
  },
  emergency: {
    color: COLORS.red,
    bg: COLORS.red50,
    text: COLORS.red800,
    label: "Emergency",
  },
};

const PERIOD_OPTIONS = [
  { value: 7, label: "7d" },
  { value: 15, label: "15d" },
  { value: 30, label: "30d" },
];

const STATUS_FILTERS = [
  { key: "all", label: "All", icon: "people", activeBg: COLORS.gray900, activeText: COLORS.white, inactiveBg: COLORS.gray100, inactiveText: COLORS.gray500 },
  { key: "safe", label: "Safe", icon: "shield", activeBg: COLORS.green600, activeText: COLORS.white, inactiveBg: COLORS.green50, inactiveText: COLORS.green800 },
  { key: "help", label: "Help", icon: "error-outline", activeBg: COLORS.yellow500, activeText: COLORS.white, inactiveBg: COLORS.yellow50, inactiveText: COLORS.yellow700 },
  { key: "emergency", label: "SOS", icon: "notifications-active", activeBg: COLORS.red600, activeText: COLORS.white, inactiveBg: COLORS.red50, inactiveText: COLORS.red800 },
];

function timeAgo(isoString) {
  if (!isoString) return "Never";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getDateLabel(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function groupByDate(items) {
  const groups = [];
  let currentDate = null;
  let currentGroup = null;
  for (const item of items) {
    const d = new Date(item.created_at);
    const dateKey = d.toLocaleDateString();
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      currentGroup = { dateLabel: getDateLabel(d), items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(item);
  }
  return groups;
}

function AvatarCircle({ name, avatarUrl, status, size = 36 }) {
  const color = STATUS_CONFIG[status]?.color || COLORS.green500;
  const initial = (name || "?")[0].toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  if (avatarUrl && !imgFailed) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, overflow: "hidden" }}>
        <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} onError={() => setImgFailed(true)} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}

export default function AlertsScreen({ navigation }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const userId = profile?.id;

  const [activeTab, setActiveTab] = useState("tcws");
  const [loading, setLoading] = useState(true);

  // Original alert data
  const [tcws, setTcws] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [familyAlerts, setFamilyAlerts] = useState([]);

  // Family status overview data
  const [familyStatus, setFamilyStatus] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  // Recent activity data
  const [history, setHistory] = useState([]);
  const [historyPeriod, setHistoryPeriod] = useState(7);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load all data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [t, a, f, fs] = await Promise.all([
          fetchTcwsActive(),
          fetchAnnouncementsActive(),
          userId ? fetchFamilyAlerts(userId) : Promise.resolve([]),
          userId ? fetchFamilyCurrentStatus(userId) : Promise.resolve(null),
        ]);
        if (active) {
          setTcws(Array.isArray(t) ? t : (t?.data || []));
          setAnnouncements(Array.isArray(a) ? a : (a?.data || []));
          setFamilyAlerts(Array.isArray(f) ? f : (f?.data || []));
          setFamilyStatus(fs);
        }
      } catch (error) {
        if (active) showToast("Failed to load alerts", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, showToast]);

  // Load history when period changes
  const loadHistory = useCallback(async (page = 1, append = false) => {
    if (!userId) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setHistoryLoading(true);
    }
    try {
      const result = await fetchStatusHistory(userId, historyPeriod, page, 20);
      const items = Array.isArray(result) ? result : (result?.data || []);
      const total = result?.total || items.length;
      if (append) {
        setHistory((prev) => [...prev, ...items]);
      } else {
        setHistory(items);
      }
      setHistoryTotal(total);
      setHistoryPage(page);
    } catch (error) {
      console.warn("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
      setLoadingMore(false);
    }
  }, [userId, historyPeriod]);

  useEffect(() => {
    if (userId) loadHistory(1);
  }, [loadHistory, userId]);

  // Computed values
  const members = familyStatus?.members || [];
  const counts = useMemo(() => {
    const c = { all: members.length, safe: 0, help: 0, emergency: 0 };
    for (const m of members) {
      if (c[m.status] !== undefined) c[m.status] += 1;
    }
    return c;
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (statusFilter === "all") return members;
    return members.filter((m) => m.status === statusFilter);
  }, [members, statusFilter]);

  const historyGroups = useMemo(() => groupByDate(history), [history]);
  const hasMore = history.length < historyTotal;

  // ─── TAB RENDERERS ───────────────────────────

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

  // ─── FAMILY STATUS OVERVIEW ──────────────────

  const renderFamilyStatusOverview = () => {
    if (!userId || !familyStatus?.family_id) return null;

    return (
      <View style={styles.overviewCard}>
        {/* Section header */}
        <View style={styles.overviewHeader}>
          <View style={styles.overviewHeaderLeft}>
            <MaterialIcons name="people" size={16} color={COLORS.gray400} />
            <Text style={styles.overviewHeaderTitle}>FAMILY STATUS OVERVIEW</Text>
          </View>
          <Text style={styles.overviewSubtitle}>
            {familyStatus.family_name} · {members.length} member{members.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Status filter pills */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            const count = counts[f.key];
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.filterPill,
                  { backgroundColor: isActive ? f.activeBg : f.inactiveBg },
                ]}
                onPress={() => setStatusFilter(f.key)}
              >
                <MaterialIcons
                  name={f.icon}
                  size={14}
                  color={isActive ? f.activeText : f.inactiveText}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? f.activeText : f.inactiveText },
                  ]}
                >
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.filterPillCount,
                    { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)" },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillCountText,
                      { color: isActive ? f.activeText : f.inactiveText },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Member list */}
        {filteredMembers.length === 0 ? (
          <View style={styles.memberEmpty}>
            <Text style={styles.memberEmptyText}>No members with this status</Text>
          </View>
        ) : (
          <View style={styles.memberList}>
            {filteredMembers.map((m) => {
              const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.safe;
              const isSelf = m.id === userId;
              const roleLabel = m.family_role === "head" ? "Head" : m.family_role === "co_head" ? "Co-Head" : null;

              return (
                <Pressable
                  key={m.id}
                  style={styles.memberRow}
                  android_ripple={{ color: "rgba(0,0,0,0.05)" }}
                >
                  <AvatarCircle
                    name={m.full_name}
                    avatarUrl={m.avatar_url}
                    status={m.status}
                    size={36}
                  />
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.full_name || "Unnamed"}
                      </Text>
                      {isSelf && <Text style={styles.memberYou}>(you)</Text>}
                      {roleLabel && (
                        <View style={[styles.roleBadge, { backgroundColor: m.family_role === "head" ? COLORS.primary : COLORS.green600 }]}>
                          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberLastSeen}>
                      {timeAgo(m.last_seen_at)}
                      {m.lat != null && m.lng != null && ` · ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={16} color={COLORS.gray400} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // ─── RECENT ACTIVITY SECTION ─────────────────

  const renderRecentActivity = () => {
    if (!userId || !familyStatus?.family_id) return null;

    return (
      <View style={styles.activityCard}>
        {/* Section header */}
        <View style={styles.activityHeader}>
          <View style={styles.activityHeaderLeft}>
            <MaterialIcons name="schedule" size={14} color={COLORS.gray400} />
            <Text style={styles.overviewHeaderTitle}>RECENT ACTIVITY</Text>
          </View>
          {/* Period selector */}
          <View style={styles.periodSelector}>
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <Pressable
                key={value}
                style={[
                  styles.periodPill,
                  historyPeriod === value && styles.periodPillActive,
                ]}
                onPress={() => {
                  setHistoryPeriod(value);
                  setHistoryPage(1);
                }}
              >
                <Text
                  style={[
                    styles.periodPillText,
                    historyPeriod === value && styles.periodPillTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Activity content */}
        {historyLoading ? (
          <View style={styles.activityLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.activityLoadingText}>Loading activity...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.activityEmpty}>
            <MaterialIcons name="schedule" size={24} color={COLORS.gray300} />
            <Text style={styles.activityEmptyTitle}>No recent activity</Text>
            <Text style={styles.activityEmptyText}>Status changes will appear here</Text>
          </View>
        ) : (
          <View>
            {historyGroups.map((group) => (
              <View key={group.dateLabel}>
                {/* Date group header */}
                <View style={styles.dateGroupHeader}>
                  <Text style={styles.dateGroupLabel}>{group.dateLabel}</Text>
                </View>
                {/* Items */}
                {group.items.map((item) => {
                  const fromCfg = item.previous_status ? STATUS_CONFIG[item.previous_status] : null;
                  const toCfg = STATUS_CONFIG[item.new_status] || STATUS_CONFIG.safe;

                  return (
                    <View key={item.id} style={styles.activityRow}>
                      <AvatarCircle
                        name={item.full_name}
                        avatarUrl={item.avatar_url}
                        status={item.new_status}
                        size={32}
                      />
                      <View style={styles.activityInfo}>
                        <View style={styles.activityNameRow}>
                          <Text style={styles.activityName} numberOfLines={1}>
                            {item.full_name || "Someone"}
                          </Text>
                          {item.previous_status ? (
                            <View style={styles.activityTransition}>
                              <Text style={[styles.activityStatusText, { color: fromCfg?.text || COLORS.gray500 }]}>
                                {fromCfg?.label || item.previous_status}
                              </Text>
                              <Text style={styles.activityArrow}>→</Text>
                              <Text style={[styles.activityStatusText, { color: toCfg.text }]}>
                                {toCfg.label}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.activityStatusText, { color: toCfg.text }]}>
                              {toCfg.label}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.activityTime}>{formatDateTime(item.created_at)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            {/* Load more */}
            {hasMore && (
              <View style={styles.loadMoreContainer}>
                <Pressable
                  style={styles.loadMoreButton}
                  onPress={() => loadHistory(historyPage + 1, true)}
                  disabled={loadingMore}
                >
                  <Text style={styles.loadMoreText}>
                    {loadingMore ? "Loading..." : "Load More"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────

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

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching alerts...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Family Status Overview — always visible at the top */}
          {renderFamilyStatusOverview()}

          {/* Recent Activity — below family status */}
          {renderRecentActivity()}

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

          {/* Tab Content */}
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
  
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80, gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray500 },
  
  // ─── FAMILY STATUS OVERVIEW ──────────────────
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: "hidden",
    marginBottom: 12,
  },
  overviewHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  overviewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  overviewHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gray400,
    letterSpacing: 0.5,
  },
  overviewSubtitle: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray50,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterPillCount: {
    minWidth: 18,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 9,
    alignItems: "center",
  },
  filterPillCountText: {
    fontSize: 10,
    fontWeight: "800",
  },
  memberEmpty: {
    paddingVertical: 28,
    alignItems: "center",
  },
  memberEmptyText: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  memberList: {},
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray100,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    flexShrink: 1,
  },
  memberYou: {
    fontSize: 10,
    color: COLORS.gray400,
    fontWeight: "500",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.white,
  },
  memberLastSeen: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  // ─── RECENT ACTIVITY ─────────────────────────
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: "hidden",
    marginBottom: 16,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  activityHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.gray100,
    borderRadius: 6,
    padding: 2,
    gap: 2,
  },
  periodPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  periodPillActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray500,
  },
  periodPillTextActive: {
    color: COLORS.primary,
  },
  activityLoading: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 8,
  },
  activityLoadingText: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  activityEmpty: {
    paddingVertical: 28,
    alignItems: "center",
    gap: 6,
  },
  activityEmptyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray500,
  },
  activityEmptyText: {
    fontSize: 11,
    color: COLORS.gray400,
  },
  dateGroupHeader: {
    backgroundColor: "rgba(249,250,251,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray100,
  },
  dateGroupLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gray400,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray50,
  },
  activityInfo: {
    flex: 1,
    minWidth: 0,
  },
  activityNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  activityName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  activityTransition: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  activityArrow: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 1,
  },
  loadMoreContainer: {
    paddingVertical: 12,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.gray100,
  },
  loadMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.shield50,
    borderRadius: 8,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // ─── TABS ────────────────────────────────────
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 12,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    position: "relative",
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: COLORS.gray500 },
  tabTextActive: { color: COLORS.primary, fontWeight: "800" },
  dot: { position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.red },

  // ─── ALERT CARDS ─────────────────────────────
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
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
