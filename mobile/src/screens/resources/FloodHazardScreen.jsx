import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchAll } from "../../services/floodHazard.js";
import FLOOD_HAZARD_MAP_HTML from "../../assets/floodHazardMapHtml.js";
import Skeleton from "../../components/Skeleton";

const COLORS = {
  shieldPrimary: "#991b1b",
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

const RISK_COLORS = {
  "Very High": "#67000d",
  "High": "#a50f15",
  "Moderate": "#ef3b2d",
  "Low": "#fc9272",
  "None": "#fee0d2",
};

const RISK_TEXT_COLORS = {
  "Very High": "#fff",
  "High": "#fff",
  "Moderate": "#fff",
  "Low": "#4a1c1c",
  "None": "#4a1c1c",
};

export default function FloodHazardScreen({ navigation }) {
  const { showToast } = useToast();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [webViewReady, setWebViewReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchAll();
        if (cancelled) return;
        const summaryData = Array.isArray(result.summary)
          ? result.summary
          : result.summary?.data || [];
        setSummary(summaryData);
        setGeojson(result.geojson);
      } catch (error) {
        if (!cancelled) {
          showToast("Failed to load flood data", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showToast]);

  // Send data to WebView when both data and WebView are ready
  useEffect(() => {
    if (webViewReady && geojson && summary.length >= 0) {
      const msg = JSON.stringify({
        type: "LOAD_DATA",
        payload: { summary, geojson },
      });
      webViewRef.current?.injectJavaScript(`
        try {
          var evt = new MessageEvent("message", { data: '${msg.replace(/'/g, "\\'")}' });
          document.dispatchEvent(evt);
        } catch(e) { console.error(e); }
        true;
      `);
    }
  }, [webViewReady, geojson, summary]);

  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "SELECT_BARANGAY") {
        setSelectedBarangay(data.name);
      }
    } catch (e) {
      // Ignore invalid messages
    }
  }, []);

  const handleSelectFromList = (name) => {
    const newSelection = selectedBarangay === name ? null : name;
    setSelectedBarangay(newSelection);
    const msg = JSON.stringify({ type: "SELECT", name: newSelection });
    webViewRef.current?.injectJavaScript(`
      try {
        var evt = new MessageEvent("message", { data: '${msg.replace(/'/g, "\\'")}' });
        document.dispatchEvent(evt);
      } catch(e) {}
      true;
    `);
  };

  // Sort summary by hazard percentage descending
  const sortedSummary = [...summary].sort(
    (a, b) => (b.pct_total_hazard || 0) - (a.pct_total_hazard || 0)
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.gray900} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Flood Risk Analysis</Text>
          <Text style={styles.headerSubtitle}>
            Tagkawayan, Quezon — 100-Year Flood Model
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.contentContainer}>
          <View style={styles.mapContainer}>
            <Skeleton width="100%" height="100%" borderRadius={0} />
          </View>
          <View style={styles.legendRow}>
            {[1, 2, 3, 4, 5].map((key) => (
              <View key={key} style={styles.legendItem}>
                <Skeleton width={10} height={10} borderRadius={2} />
                <Skeleton width={30} height={10} />
              </View>
            ))}
          </View>
          <View style={styles.listHeader}>
            <Skeleton width={100} height={16} />
          </View>
          <View style={styles.listContent}>
            {[1, 2, 3, 4].map((key) => (
              <View key={key} style={styles.barangayRow}>
                <View style={styles.barangayInfo}>
                  <Skeleton width={120} height={16} style={{ marginBottom: 4 }} />
                  <Skeleton width={80} height={12} />
                </View>
                <Skeleton width={60} height={20} borderRadius={12} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Map */}
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html: FLOOD_HAZARD_MAP_HTML }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              onLoadEnd={() => setWebViewReady(true)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scrollEnabled={false}
              bounces={false}
            />
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <View key={level} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>{level}</Text>
              </View>
            ))}
          </View>

          {/* Barangay List */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              Barangays ({sortedSummary.length})
            </Text>
          </View>

          <ScrollView
            style={styles.listScrollView}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {sortedSummary.map((item, index) => {
              const isSelected = selectedBarangay === item.barangay;
              return (
                <Pressable
                  key={item.barangay || index}
                  style={[
                    styles.barangayRow,
                    isSelected && styles.barangayRowSelected,
                  ]}
                  onPress={() => handleSelectFromList(item.barangay)}
                >
                  <View style={styles.barangayInfo}>
                    <Text
                      style={[
                        styles.barangayName,
                        isSelected && styles.barangayNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.barangay}
                    </Text>
                    <Text style={styles.barangayPct}>
                      {(item.pct_total_hazard || 0).toFixed(1)}% hazard area
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          RISK_COLORS[item.risk_level] || RISK_COLORS.None,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskBadgeText,
                        {
                          color:
                            RISK_TEXT_COLORS[item.risk_level] ||
                            RISK_TEXT_COLORS.None,
                        },
                      ]}
                    >
                      {item.risk_level || "None"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray400,
  },
  contentContainer: {
    flex: 1,
  },
  mapContainer: {
    height: "48%",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  webView: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.gray50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.gray600,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  listScrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  barangayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  barangayRowSelected: {
    borderColor: COLORS.shieldPrimary,
    backgroundColor: "rgba(153, 27, 27, 0.04)",
  },
  barangayInfo: {
    flex: 1,
    minWidth: 0,
  },
  barangayName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  barangayNameSelected: {
    color: COLORS.shieldPrimary,
  },
  barangayPct: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
