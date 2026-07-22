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
import { fetchAll, fetchFloodAnalysis } from "../../services/floodHazard.js";
import FLOOD_HAZARD_MAP_HTML from "../../assets/floodHazardMapHtml.js";
import FLOOD_HAZARD_CHART_HTML from "../../assets/floodHazardChartHtml.js";
import Skeleton from "../../components/Skeleton";

const COLORS = {
  primary: "#800000",
  blue: "#3b82f6",
  red: "#ef4444",
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

const RISK_COLORS = {
  "Very High": "#67000d",
  "High": "#a50f15",
  "Moderate": "#ef3b2d",
  "Low": "#fc9272",
  "None": "#fee0d2",
};

export default function FloodHazardScreen({ navigation }) {
  const { showToast } = useToast();
  const mapWebViewRef = useRef(null);
  const chartWebViewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  
  const [activeTab, setActiveTab] = useState("map"); // map, analysis, data
  
  // Map Layer States
  const [opacity, setOpacity] = useState(0.65);
  const [basemap, setBasemap] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // Analysis State
  const [lang, setLang] = useState("en");
  const [analysis, setAnalysis] = useState({ en: null, fil: null });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const fetchedAnalysisRef = useRef({});

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
        if (!cancelled) showToast("Failed to load flood data", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showToast]);

  // Load Map Data
  useEffect(() => {
    if (mapReady && geojson && summary.length >= 0) {
      const msg = JSON.stringify({ type: "LOAD_DATA", payload: { summary, geojson } });
      mapWebViewRef.current?.injectJavaScript(`
        try { document.dispatchEvent(new MessageEvent("message", { data: '${msg.replace(/'/g, "\\'")}' })); } catch(e){} true;
      `);
    }
  }, [mapReady, geojson, summary]);

  // Load Chart Data
  useEffect(() => {
    if (chartReady && summary.length > 0) {
      const msg = JSON.stringify({ type: "RENDER_CHARTS", summary });
      chartWebViewRef.current?.injectJavaScript(`
        try { document.dispatchEvent(new MessageEvent("message", { data: '${msg.replace(/'/g, "\\'")}' })); } catch(e){} true;
      `);
    }
  }, [chartReady, summary, activeTab]);

  // Handle Map Messages
  const handleMapMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "SELECT_BARANGAY") {
        setSelectedBarangay(data.name);
      }
    } catch (e) {}
  }, []);

  // Sync Layer Controls
  useEffect(() => {
    if (mapReady) {
      mapWebViewRef.current?.injectJavaScript(`try { document.dispatchEvent(new MessageEvent("message", { data: '${JSON.stringify({ type: "SET_OPACITY", opacity }).replace(/'/g, "\\'")}' })); } catch(e){} true;`);
    }
  }, [opacity, mapReady]);

  useEffect(() => {
    if (mapReady) {
      mapWebViewRef.current?.injectJavaScript(`try { document.dispatchEvent(new MessageEvent("message", { data: '${JSON.stringify({ type: "SET_BASEMAP", basemap }).replace(/'/g, "\\'")}' })); } catch(e){} true;`);
    }
  }, [basemap, mapReady]);

  // Fetch AI Analysis when barangay is selected
  useEffect(() => {
    if (!selectedBarangay || summary.length === 0) return;
    const row = summary.find(s => s.barangay === selectedBarangay);
    if (!row) return;

    const cacheKey = `${selectedBarangay}_${lang}`;
    if (fetchedAnalysisRef.current[cacheKey]) return;

    setAnalysisLoading(true);
    setAnalysisError(null);
    fetchFloodAnalysis(selectedBarangay, row, lang)
      .then(text => {
        setAnalysis(prev => ({ ...prev, [lang]: text }));
        fetchedAnalysisRef.current[cacheKey] = true;
      })
      .catch(err => setAnalysisError(err.message))
      .finally(() => setAnalysisLoading(false));
  }, [selectedBarangay, lang, summary]);

  // Clear analysis when changing to a different barangay
  const prevBarangayRef = useRef(selectedBarangay);
  useEffect(() => {
    if (prevBarangayRef.current !== selectedBarangay) {
      prevBarangayRef.current = selectedBarangay;
      setAnalysis({ en: null, fil: null });
      fetchedAnalysisRef.current = {};
    }
  }, [selectedBarangay]);

  const sortedSummary = [...summary].sort((a, b) => (b.pct_total_hazard || 0) - (a.pct_total_hazard || 0));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Flood Hazard Analysis</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {["map", "analysis", "data"].map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading hazard data...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* MAP TAB */}
          <View style={[styles.tabContent, activeTab !== "map" && { display: "none" }]}>
            <View style={styles.mapContainer}>
              <WebView
                ref={mapWebViewRef}
                originWhitelist={["*"]}
                source={{ html: FLOOD_HAZARD_MAP_HTML }}
                style={styles.webView}
                onMessage={handleMapMessage}
                onLoadEnd={() => setMapReady(true)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                bounces={false}
              />

              {/* Layer Controls Overlay */}
              <View style={styles.layerControls}>
                <View style={styles.layerControlRow}>
                  <Text style={styles.layerControlLabel}>Map:</Text>
                  <Pressable 
                    style={[styles.layerBtn, basemap === "street" && styles.layerBtnActive]}
                    onPress={() => setBasemap("street")}
                  >
                    <Text style={[styles.layerBtnText, basemap === "street" && styles.layerBtnTextActive]}>Street</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.layerBtn, basemap === "satellite" && styles.layerBtnActive]}
                    onPress={() => setBasemap("satellite")}
                  >
                    <Text style={[styles.layerBtnText, basemap === "satellite" && styles.layerBtnTextActive]}>Satellite</Text>
                  </Pressable>
                </View>
                <View style={styles.layerControlRow}>
                  <Text style={styles.layerControlLabel}>Opacity:</Text>
                  {[0.3, 0.65, 1.0].map((val) => (
                    <Pressable 
                      key={val}
                      style={[styles.layerBtn, opacity === val && styles.layerBtnActive]}
                      onPress={() => setOpacity(val)}
                    >
                      <Text style={[styles.layerBtnText, opacity === val && styles.layerBtnTextActive]}>{val * 100}%</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
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
          </View>

          {/* ANALYSIS TAB */}
          <ScrollView style={[styles.tabContent, activeTab !== "analysis" && { display: "none" }]} contentContainerStyle={styles.scrollContent}>
            {!selectedBarangay ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="touch-app" size={48} color={COLORS.gray300} />
                <Text style={styles.emptyStateText}>Select a barangay on the map or data table to view AI Analysis.</Text>
              </View>
            ) : (
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="auto-awesome" size={18} color="#6366f1" />
                    <Text style={styles.aiTitle}>{selectedBarangay} Analysis</Text>
                  </View>
                  <View style={styles.langToggle}>
                    <Pressable style={[styles.langBtn, lang === "en" && styles.langBtnActive]} onPress={() => setLang("en")}>
                      <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>EN</Text>
                    </Pressable>
                    <Pressable style={[styles.langBtn, lang === "fil" && styles.langBtnActive]} onPress={() => setLang("fil")}>
                      <Text style={[styles.langText, lang === "fil" && styles.langTextActive]}>FIL</Text>
                    </Pressable>
                  </View>
                </View>

                {analysisLoading ? (
                  <View style={styles.aiLoading}>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text style={styles.aiLoadingText}>Generating analysis...</Text>
                  </View>
                ) : analysisError ? (
                  <View style={styles.aiError}>
                    <MaterialIcons name="error-outline" size={16} color={COLORS.red} />
                    <Text style={styles.aiErrorText}>{analysisError}</Text>
                    <Pressable onPress={() => { fetchedAnalysisRef.current[`${selectedBarangay}_${lang}`] = false; setAnalysisError(null); }}>
                      <Text style={styles.aiRetry}>Retry</Text>
                    </Pressable>
                  </View>
                ) : analysis[lang] ? (
                  <View style={styles.aiContent}>
                    <Text style={styles.aiBody}>{analysis[lang]}</Text>
                    <Text style={styles.aiFooter}>Powered by Groq • Llama 4 Scout</Text>
                  </View>
                ) : null}
              </View>
            )}
            
            {/* Stats Overview */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Barangays</Text>
                <Text style={styles.statValue}>{summary.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>High Risk Areas</Text>
                <Text style={styles.statValueDanger}>{summary.filter(s => ["High", "Very High"].includes(s.risk_level)).length}</Text>
              </View>
            </View>
          </ScrollView>

          {/* DATA TAB */}
          <ScrollView style={[styles.tabContent, activeTab !== "data" && { display: "none" }]} contentContainerStyle={styles.scrollContent}>
            {/* Charts WebView */}
            <View style={styles.chartsContainer}>
              <WebView
                ref={chartWebViewRef}
                originWhitelist={["*"]}
                source={{ html: FLOOD_HAZARD_CHART_HTML }}
                style={styles.webView}
                onLoadEnd={() => setChartReady(true)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                bounces={false}
              />
            </View>

            {/* Barangay List */}
            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>Barangay Hazard Details</Text>
              {sortedSummary.map((item, index) => {
                const isSelected = selectedBarangay === item.barangay;
                return (
                  <Pressable
                    key={item.barangay || index}
                    style={[styles.barangayRow, isSelected && styles.barangayRowSelected]}
                    onPress={() => {
                      setSelectedBarangay(item.barangay);
                      setActiveTab("analysis"); // auto switch to analysis
                    }}
                  >
                    <View style={styles.barangayInfo}>
                      <Text style={[styles.barangayName, isSelected && styles.barangayNameSelected]} numberOfLines={1}>
                        {item.barangay}
                      </Text>
                      <Text style={styles.barangayPct}>{(item.pct_total_hazard || 0).toFixed(1)}% hazard area</Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[item.risk_level] || RISK_COLORS.None }]}>
                      <Text style={[styles.riskBadgeText, { color: ["Low", "None"].includes(item.risk_level) ? "#4a1c1c" : "#fff" }]}>
                        {item.risk_level}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.gray500 },
  tabTextActive: { color: COLORS.primary, fontWeight: "800" },
  
  content: { flex: 1 },
  tabContent: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray500 },
  
  // Map Tab
  mapContainer: { flex: 1, position: "relative", backgroundColor: COLORS.gray200 },
  webView: { flex: 1, backgroundColor: "transparent" },
  layerControls: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    gap: 8,
  },
  layerControlRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  layerControlLabel: { fontSize: 10, fontWeight: "700", color: COLORS.gray500, width: 45 },
  layerBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.gray200 },
  layerBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  layerBtnText: { fontSize: 10, fontWeight: "600", color: COLORS.gray600 },
  layerBtnTextActive: { color: COLORS.white },
  
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 10, fontWeight: "500", color: COLORS.gray700 },

  // Analysis Tab
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 64, gap: 12 },
  emptyStateText: { fontSize: 13, color: COLORS.gray500, textAlign: "center", paddingHorizontal: 32, lineHeight: 20 },
  aiCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.gray200 },
  aiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  aiTitle: { fontSize: 13, fontWeight: "800", color: COLORS.gray800 },
  langToggle: { flexDirection: "row", backgroundColor: COLORS.gray100, borderRadius: 6, padding: 2 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  langBtnActive: { backgroundColor: COLORS.white, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  langText: { fontSize: 10, fontWeight: "700", color: COLORS.gray500 },
  langTextActive: { color: COLORS.gray900 },
  aiLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  aiLoadingText: { fontSize: 12, color: COLORS.gray500 },
  aiError: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef2f2", padding: 10, borderRadius: 8 },
  aiErrorText: { flex: 1, fontSize: 11, color: COLORS.red },
  aiRetry: { fontSize: 11, fontWeight: "700", color: COLORS.red, textDecorationLine: "underline" },
  aiContent: { paddingTop: 4 },
  aiBody: { fontSize: 14, lineHeight: 22, color: COLORS.gray700, textAlign: "justify" },
  aiFooter: { fontSize: 10, color: COLORS.gray400, marginTop: 16 },
  
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.gray200 },
  statLabel: { fontSize: 11, fontWeight: "600", color: COLORS.gray500, marginBottom: 8, textTransform: "uppercase" },
  statValue: { fontSize: 24, fontWeight: "800", color: COLORS.gray900 },
  statValueDanger: { fontSize: 24, fontWeight: "800", color: COLORS.red },

  // Data Tab
  chartsContainer: { height: 950, backgroundColor: COLORS.white, borderRadius: 12, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: COLORS.gray200 },
  listContainer: { backgroundColor: COLORS.white, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: COLORS.gray200, paddingBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "800", color: COLORS.gray900, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  barangayRow: { flexDirection: "row", alignItems: "center", padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray50 },
  barangayRowSelected: { backgroundColor: "#fef2f2" },
  barangayInfo: { flex: 1 },
  barangayName: { fontSize: 13, fontWeight: "600", color: COLORS.gray800, marginBottom: 2 },
  barangayNameSelected: { color: COLORS.primary },
  barangayPct: { fontSize: 11, color: COLORS.gray500 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  riskBadgeText: { fontSize: 10, fontWeight: "700" },
});
