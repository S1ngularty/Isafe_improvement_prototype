import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  VirtualizedList,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import {
  fetchWaterLevelSummary,
  fetchWaterLevelAnalytics,
  fetchUnsafeReadings,
} from "../../services/waterLevel.js";
import WATER_LEVEL_CHART_HTML from "../../assets/waterLevelChartHtml.js";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  shieldPrimary: "#991b1b",
  shieldDark: "#5c1010",
  blue: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray900: "#111827",
  white: "#fff",
};

const PERIOD_OPTIONS = [1, 3, 7, 14, 30];

function KpiCard({ label, value, sub, color }) {
  const borderColor =
    color === "red"
      ? COLORS.red
      : color === "amber"
        ? COLORS.amber
        : color === "green"
          ? COLORS.green
          : color === "blue"
            ? COLORS.blue
            : COLORS.shieldPrimary;

  return (
    <View style={[styles.kpiCard, { borderLeftColor: borderColor }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value != null ? value : "..."}</Text>
      {sub != null && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

// Unsafe Reading Item Component
function UnsafeReadingItem({ item }) {
  return (
    <View style={styles.unsafeRow}>
      <View style={styles.unsafeRowMain}>
        <View style={styles.sensorInfo}>
          <Text style={styles.sensorId} numberOfLines={1}>
            {item.sensor_id}
          </Text>
          <Text style={styles.readingDate}>
            {new Date(item.recorded_at).toLocaleString()}
          </Text>
        </View>
        <View style={styles.readingInfo}>
          <Text
            style={[
              styles.readingValue,
              {
                color:
                  item.status === "FLOOD_WARNING"
                    ? COLORS.red
                    : COLORS.amber,
              },
            ]}
          >
            {(item.water_level_cm / 100).toFixed(2)} m
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === "FLOOD_WARNING"
                    ? "#fee2e2"
                    : "#fef3c7",
              },
            ]}
          >
            <Text
              style={[
                styles.readingStatus,
                {
                  color:
                    item.status === "FLOOD_WARNING"
                      ? COLORS.red
                      : COLORS.amber,
                },
              ]}
            >
              {item.status.replace("_", " ")}
            </Text>
          </View>
        </View>
      </View>
      {item.duration_minutes != null && (
        <Text style={styles.durationText}>
          {item.duration_minutes < 60
            ? `${item.duration_minutes}m ago`
            : `${Math.floor(item.duration_minutes / 60)}h ago`}
        </Text>
      )}
    </View>
  );
}

export default function WaterLevelScreen({ navigation }) {
  const webViewRef = useRef(null);
  const [webViewReady, setWebViewReady] = useState(false);

  // Data states
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);

  const [unsafeReadings, setUnsafeReadings] = useState(null);
  const [unsafeLoading, setUnsafeLoading] = useState(true);
  const [unsafeError, setUnsafeError] = useState(null);

  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [chartHeight, setChartHeight] = useState(1800); // Dynamic height

  // KPI derived data
  const kpi = useMemo(() => {
    if (!summary) return null;
    return {
      totalSensors: summary.total_sensors,
      activeSensors: summary.active_sensors,
      inactiveSensors: summary.inactive_sensors,
      unsafeCount: summary.unsafe_count,
      warningCount: summary.warning_count,
      floodWarningCount: summary.flood_warning_count,
    };
  }, [summary]);

  // Fetch summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchWaterLevelSummary();
      setSummary(data);
      setSummaryError(null);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch analytics
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await fetchWaterLevelAnalytics(analyticsDays);
      setAnalytics(data);
      setAnalyticsError(null);
    } catch (err) {
      setAnalyticsError(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  // Fetch unsafe readings
  const loadUnsafe = useCallback(async () => {
    try {
      const data = await fetchUnsafeReadings({ limit: 20 });
      setUnsafeReadings(data);
      setUnsafeError(null);
    } catch (err) {
      setUnsafeError(err.message);
    } finally {
      setUnsafeLoading(false);
    }
  }, []);

  // Initial loads
  useEffect(() => {
    loadSummary();
    loadUnsafe();
  }, [loadSummary, loadUnsafe]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Polling: summary + unsafe every 30s, analytics every 2min
  useEffect(() => {
    const summaryTimer = setInterval(loadSummary, 30000);
    const unsafeTimer = setInterval(loadUnsafe, 30000);
    return () => {
      clearInterval(summaryTimer);
      clearInterval(unsafeTimer);
    };
  }, [loadSummary, loadUnsafe]);

  useEffect(() => {
    const analyticsTimer = setInterval(loadAnalytics, 120000);
    return () => clearInterval(analyticsTimer);
  }, [loadAnalytics]);

  // Send analytics to WebView when both ready
  useEffect(() => {
    if (webViewReady && analytics) {
      const msg = JSON.stringify({
        type: "LOAD_DATA",
        payload: { analytics },
      });
      webViewRef.current?.injectJavaScript(`
        try {
          var evt = new MessageEvent("message", { data: '${msg.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' });
          document.dispatchEvent(evt);
        } catch(e) { console.error(e); }
        true;
      `);
    }
  }, [webViewReady, analytics]);

  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "WEBVIEW_READY") {
        setWebViewReady(true);
      } else if (data.type === "CHARTS_READY" && data.height) {
        // Dynamically adjust height based on all charts
        setChartHeight(data.height + 20);
      }
    } catch (_) {}
  }, []);

  const analyticsReady =
    analytics &&
    Array.isArray(analytics.time_series) &&
    analytics.time_series.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Water Level Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Real-time sensor monitoring
          </Text>
        </View>
        {summaryLoading && (
          <ActivityIndicator size="small" color={COLORS.white} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error banner */}
        {summaryError && !summary && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color={COLORS.red} />
            <Text style={styles.errorText}>
              Failed to load sensor data: {summaryError}
            </Text>
          </View>
        )}

        {/* KPI Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          <KpiCard label="Total Sensors" value={kpi?.totalSensors} color="blue" />
          <KpiCard
            label="Active"
            value={kpi?.activeSensors}
            sub={kpi?.inactiveSensors ? `${kpi.inactiveSensors} inactive` : null}
            color="green"
          />
          <KpiCard
            label="Unsafe"
            value={kpi?.unsafeCount ?? 0}
            sub="Last 24h"
            color={kpi?.unsafeCount > 0 ? "red" : "green"}
          />
          <KpiCard
            label="WARNING"
            value={kpi?.warningCount ?? 0}
            color="amber"
          />
          <KpiCard
            label="FLOOD WARNING"
            value={kpi?.floodWarningCount ?? 0}
            color="red"
          />
          <KpiCard
            label="Period"
            value={`${analyticsDays}d`}
            sub={`${analytics?.total_readings || 0} readings`}
            color="shield"
          />
        </ScrollView>

        {/* Sensor Status Cards - includes float switch */}
        {summary?.sensor_statuses && summary.sensor_statuses.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="sensors" size={20} color={COLORS.gray700} />
              <Text style={styles.sectionTitle}>Sensor Status</Text>
            </View>
            {summary.sensor_statuses.map((s) => (
              <View key={s.sensor_id} style={styles.sensorStatusRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sensorStatusId} numberOfLines={1}>
                    {s.sensor_id}
                  </Text>
                  <View style={styles.floatSwitchRow}>
                    <Text
                      style={[
                        styles.floatSwitchBadge,
                        {
                          backgroundColor: s.float_switch_1m
                            ? "#fee2e2"
                            : "#f3f4f6",
                          color: s.float_switch_1m
                            ? COLORS.red
                            : COLORS.gray500,
                        },
                      ]}
                    >
                      1m: {s.float_switch_1m ? "TRIGGERED" : "At Rest"}
                    </Text>
                    <Text
                      style={[
                        styles.floatSwitchBadge,
                        {
                          backgroundColor: s.float_switch_2m
                            ? "#fee2e2"
                            : "#f3f4f6",
                          color: s.float_switch_2m
                            ? COLORS.red
                            : COLORS.gray500,
                        },
                      ]}
                    >
                      2m: {s.float_switch_2m ? "TRIGGERED" : "At Rest"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.sensorStatusValue}>
                    {s.last_reading_cm != null
                      ? `${(s.last_reading_cm / 100).toFixed(2)} m`
                      : "---"}
                  </Text>
                  <Text
                    style={[
                      styles.sensorStatusBadge,
                      {
                        color:
                          s.last_status === "FLOOD_WARNING"
                            ? COLORS.red
                            : s.last_status === "WARNING"
                              ? COLORS.amber
                              : COLORS.green,
                      },
                    ]}
                  >
                    {s.last_status || "UNKNOWN"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Period Selector */}
        <View style={styles.periodSection}>
          <Text style={styles.periodLabel}>CHART PERIOD</Text>
          <View style={styles.periodRow}>
            {PERIOD_OPTIONS.map((d) => (
              <Pressable
                key={d}
                style={[
                  styles.periodButton,
                  analyticsDays === d && styles.periodButtonActive,
                ]}
                onPress={() => setAnalyticsDays(d)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    analyticsDays === d && styles.periodButtonTextActive,
                  ]}
                >
                  {d}d
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Unsafe Conditions - Fixed height with scrollable list */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons
              name={
                unsafeReadings && unsafeReadings.length > 0
                  ? "error-outline"
                  : "check-circle"
              }
              size={20}
              color={
                unsafeReadings && unsafeReadings.length > 0
                  ? COLORS.red
                  : COLORS.green
              }
            />
            <Text style={styles.sectionTitle}>Unsafe Conditions</Text>
            {unsafeReadings && unsafeReadings.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {unsafeReadings.length}
                </Text>
              </View>
            )}
          </View>

          {unsafeError && !unsafeReadings ? (
            <Text style={styles.mutedText}>
              Unable to load: {unsafeError}
            </Text>
          ) : unsafeLoading ? (
            <View style={[styles.shimmer, { height: 100 }]} />
          ) : !unsafeReadings || unsafeReadings.length === 0 ? (
            <View style={styles.allClearBanner}>
              <MaterialIcons
                name="check-circle"
                size={20}
                color={COLORS.green}
              />
              <View>
                <Text style={styles.allClearTitle}>All Clear</Text>
                <Text style={styles.allClearSub}>
                  All sensors reporting safe levels
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.unsafeListContainer}>
              <FlatList
                data={unsafeReadings}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => <UnsafeReadingItem item={item} />}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              />
            </View>
          )}
        </View>

        {/* Analytics Charts via WebView - Dynamic height */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
            Analytics Charts
          </Text>

          {analyticsError && !analytics ? (
            <View style={styles.errorBanner}>
              <MaterialIcons
                name="error-outline"
                size={16}
                color={COLORS.red}
              />
              <Text style={styles.errorText}>
                Could not load analytics: {analyticsError}
              </Text>
            </View>
          ) : analyticsLoading && !analytics ? (
            <View style={[styles.shimmer, { height: 200 }]} />
          ) : !analyticsReady ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="bar-chart"
                size={40}
                color={COLORS.gray300}
              />
              <Text style={styles.emptyText}>
                No readings in this period. Try a shorter range.
              </Text>
            </View>
          ) : (
            <View style={[styles.chartContainer, { height: chartHeight }]}>
              <WebView
                ref={webViewRef}
                originWhitelist={["*"]}
                source={{ html: WATER_LEVEL_CHART_HTML }}
                style={styles.webView}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                onMessage={handleWebViewMessage}
                onError={() => setAnalyticsError("WebView failed to load")}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    backgroundColor: COLORS.shieldPrimary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#991b1b",
  },
  // KPI
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 4,
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray500,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  kpiSub: {
    fontSize: 10,
    color: COLORS.gray400,
    marginTop: 2,
  },
  // Period
  periodSection: {
    marginBottom: 12,
  },
  periodLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.gray400,
    letterSpacing: 1,
    marginBottom: 6,
  },
  periodRow: {
    flexDirection: "row",
    gap: 6,
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  periodButtonActive: {
    backgroundColor: COLORS.shieldPrimary,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray600,
  },
  periodButtonTextActive: {
    color: COLORS.white,
  },
  // Section Cards
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  countBadge: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.red,
  },
  // All Clear
  allClearBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#dcfce7",
    borderRadius: 10,
    padding: 12,
  },
  allClearTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  allClearSub: {
    fontSize: 11,
    color: "#15803d",
    marginTop: 1,
  },
  // Unsafe List - Fixed height scrollable container
  unsafeListContainer: {
    maxHeight: 300,
  },
  unsafeRow: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  unsafeRowMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  sensorInfo: {
    flex: 1,
    marginRight: 12,
  },
  sensorId: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  readingDate: {
    fontSize: 10,
    color: COLORS.gray400,
  },
  readingInfo: {
    alignItems: "flex-end",
    minWidth: 70,
  },
  readingValue: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  readingStatus: {
    fontSize: 10,
    fontWeight: "700",
  },
  durationText: {
    fontSize: 9,
    color: COLORS.gray400,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray100,
  },
  // Chart Container - Dynamic height
  chartContainer: {
    minHeight: 400,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  // Empty / Shimmer
  shimmer: {
    height: 80,
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: "center",
  },
  mutedText: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  sensorStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  sensorStatusId: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  sensorStatusValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 2,
  },
  sensorStatusBadge: {
    fontSize: 9,
    fontWeight: "700",
  },
  floatSwitchRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  floatSwitchBadge: {
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
});