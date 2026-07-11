import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useWeather } from "../../hooks/useWeather.js";
import { fetchAnalysis } from "../../services/weather.js";

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

const METRICS = [
  { key: "precipitation", label: "Rainfall", unit: "mm", danger: (c) => c.precipitation > 5, icon: "water-drop" },
  { key: "windSpeed", label: "Wind", unit: "km/h", danger: (c) => c.windSpeed > 50, icon: "air" },
  { key: "windGusts", label: "Gusts", unit: "km/h", danger: (c) => c.windGusts > 60, icon: "storm" },
  { key: "pressure", label: "Pressure", unit: "hPa", danger: (c) => c.pressure < 1000, icon: "compress" },
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const isToday = d.toDateString() === new Date().toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

export default function ForecastScreen({ navigation }) {
  const { profile } = useAuth();
  
  // Use profile location if available, otherwise default to a central PH location
  const lat = profile?.lat || 14.5995;
  const lng = profile?.lng || 120.9842;
  
  const { current, hourly, daily, loading, error } = useWeather(lat, lng);
  const [lang, setLang] = useState("en");
  const [analysis, setAnalysis] = useState({ en: null, fil: null });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const fetchedRef = useRef({ en: false, fil: false });

  useEffect(() => {
    if (!current || !hourly || hourly.length === 0) return;
    if (fetchedRef.current[lang]) return;
    
    setAnalysisLoading(true);
    setAnalysisError(null);
    fetchAnalysis(current, hourly, lang)
      .then((text) => {
        setAnalysis((prev) => ({ ...prev, [lang]: text }));
        fetchedRef.current[lang] = true;
      })
      .catch((err) => setAnalysisError(err.message))
      .finally(() => setAnalysisLoading(false));
  }, [current, hourly, lang]);

  if (loading && !current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Weather Forecast</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching weather data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Weather Forecast</Text>
        </View>
        <View style={styles.centerBox}>
          <MaterialIcons name="error-outline" size={48} color={COLORS.gray400} />
          <Text style={styles.errorTitle}>Data Unavailable</Text>
          <Text style={styles.errorSub}>{error || "Could not fetch weather data."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasDanger =
    current.precipitation > 10 ||
    current.pressure < 1000 ||
    current.windSpeed > 50 ||
    current.windGusts > 60;

  const maxPrecip = hourly ? Math.max(...hourly.map((h) => h.precipitation), 1) : 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Weather Forecast</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Current Weather Card */}
        <View style={[styles.currentCard, hasDanger && styles.currentCardDanger]}>
          <View style={styles.currentMain}>
            <View style={[styles.iconContainer, hasDanger && styles.iconContainerDanger]}>
              <MaterialIcons name={current.icon || "wb-sunny"} size={48} color={hasDanger ? COLORS.red : COLORS.blue} />
            </View>
            <Text style={styles.temperature}>{current.temperature}&deg;</Text>
            <Text style={[styles.description, hasDanger && { color: COLORS.red }]}>
              {current.description || "Clear"}
            </Text>
            <Text style={styles.locationInfo}>
              {Number(lat).toFixed(4)}&deg;N, {Number(lng).toFixed(4)}&deg;E
            </Text>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            {METRICS.map(({ key, label, unit, danger, icon }) => {
              const isDanger = danger(current);
              const val = current[key] || 0;
              return (
                <View key={key} style={[styles.metricBox, isDanger && styles.metricBoxDanger]}>
                  <MaterialIcons name={icon} size={20} color={isDanger ? COLORS.red : COLORS.gray500} />
                  <View style={styles.metricText}>
                    <Text style={[styles.metricVal, isDanger && { color: COLORS.red }]}>
                      {val.toFixed ? val.toFixed(0) : val}
                      <Text style={styles.metricUnit}> {unit}</Text>
                    </Text>
                    <Text style={styles.metricLabel}>{label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Warning Banner */}
          {hasDanger && (
            <View style={styles.warningBanner}>
              <View style={styles.warningHeader}>
                <MaterialIcons name="warning" size={18} color={COLORS.red} />
                <Text style={styles.warningTitle}>WARNING</Text>
              </View>
              {current.precipitation > 10 && <Text style={styles.warningItem}>• Heavy rainfall — possible flooding</Text>}
              {current.pressure < 1000 && <Text style={styles.warningItem}>• Low sea level pressure — storm possible</Text>}
              {current.windSpeed > 50 && <Text style={styles.warningItem}>• Strong winds — take caution</Text>}
              {current.windGusts > 60 && <Text style={styles.warningItem}>• Dangerous wind gusts detected</Text>}
            </View>
          )}

          {/* AI Analysis */}
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={16} color="#6366f1" />
                <Text style={styles.aiTitle}>AI ANALYSIS</Text>
              </View>
              <View style={styles.langToggle}>
                <Pressable
                  style={[styles.langBtn, lang === "en" && styles.langBtnActive]}
                  onPress={() => setLang("en")}
                >
                  <Text style={[styles.langText, lang === "en" && styles.langTextActive]}>EN</Text>
                </Pressable>
                <Pressable
                  style={[styles.langBtn, lang === "fil" && styles.langBtnActive]}
                  onPress={() => setLang("fil")}
                >
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
                <Pressable onPress={() => { fetchedRef.current[lang] = false; setAnalysisError(null); }}>
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
        </View>

        {/* 24-Hour Forecast (Horizontal Scroll) */}
        {hourly && hourly.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>24-Hour Forecast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyScroll}>
              {hourly.slice(0, 24).map((h, i) => {
                const barPct = Math.round((h.precipitation / maxPrecip) * 100);
                const isRaining = h.precipitation > 0;
                return (
                  <View key={i} style={[styles.hourlyItem, isRaining && styles.hourlyItemRain]}>
                    <Text style={styles.hourlyTime}>{h.time.replace(" ", "")}</Text>
                    <MaterialIcons name={h.icon || "wb-sunny"} size={22} color={isRaining ? COLORS.red : COLORS.gray400} style={{ marginVertical: 8 }} />
                    <View style={styles.barContainer}>
                      <View style={[styles.barFill, { height: `${Math.max(barPct, 8)}%`, backgroundColor: isRaining ? COLORS.red : COLORS.blue }]} />
                    </View>
                    <Text style={[styles.hourlyPrecip, isRaining && { color: COLORS.red }]}>{isRaining ? `${h.precipitation.toFixed(1)}mm` : "—"}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 7-Day Extended Forecast */}
        {daily && daily.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>7-Day Extended Forecast</Text>
            <View style={styles.dailyList}>
              {daily.map((d, i) => (
                <View key={i} style={styles.dailyItem}>
                  <Text style={styles.dailyDate}>{formatDate(d.date)}</Text>
                  <View style={styles.dailyCenter}>
                    <MaterialIcons name={d.icon || "wb-sunny"} size={20} color={COLORS.gray600} />
                    <Text style={styles.dailyDesc} numberOfLines={1}>{d.description}</Text>
                  </View>
                  <View style={styles.dailyTemps}>
                    <Text style={styles.dailyTempMax}>{d.tempMax}&deg;</Text>
                    <Text style={styles.dailyTempMin}>{d.tempMin}&deg;</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
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
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray500 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray700 },
  errorSub: { fontSize: 13, color: COLORS.gray400 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  
  // Current Card
  currentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: "hidden",
  },
  currentCardDanger: {
    borderColor: "#fecaca",
    backgroundColor: "#fff5f5",
  },
  currentMain: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainerDanger: { backgroundColor: "#fee2e2" },
  temperature: { fontSize: 64, fontWeight: "800", color: COLORS.gray900, lineHeight: 72 },
  description: { fontSize: 16, fontWeight: "600", color: COLORS.gray600, marginTop: 4 },
  locationInfo: { fontSize: 11, color: COLORS.gray400, marginTop: 4 },
  
  // Metrics
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  metricBox: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    gap: 10,
  },
  metricBoxDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  metricText: { flex: 1 },
  metricVal: { fontSize: 18, fontWeight: "800", color: COLORS.gray800 },
  metricUnit: { fontSize: 11, fontWeight: "500", color: COLORS.gray400 },
  metricLabel: { fontSize: 10, fontWeight: "700", color: COLORS.gray400, textTransform: "uppercase", marginTop: 2 },
  
  // Warning Banner
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  warningHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  warningTitle: { fontSize: 12, fontWeight: "800", color: COLORS.red, letterSpacing: 0.5 },
  warningItem: { fontSize: 11, fontWeight: "600", color: "#b91c1c", marginLeft: 24, marginBottom: 4 },
  
  // AI Section
  aiSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    padding: 16,
  },
  aiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  aiTitle: { fontSize: 11, fontWeight: "800", color: COLORS.gray400, letterSpacing: 0.5 },
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
  aiBody: { fontSize: 13, lineHeight: 20, color: COLORS.gray700, textAlign: "justify" },
  aiFooter: { fontSize: 10, color: COLORS.gray400, marginTop: 12 },

  // Sections
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: COLORS.gray900, marginBottom: 12 },
  
  // Hourly
  hourlyScroll: { gap: 10, paddingRight: 16 },
  hourlyItem: {
    width: 60,
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  hourlyItemRain: { backgroundColor: "#fef2f2", borderColor: "#fee2e2" },
  hourlyTime: { fontSize: 10, fontWeight: "700", color: COLORS.gray600 },
  barContainer: { width: 6, height: 40, backgroundColor: COLORS.gray200, borderRadius: 3, justifyContent: "flex-end", overflow: "hidden", marginBottom: 6 },
  barFill: { width: "100%", borderRadius: 3 },
  hourlyPrecip: { fontSize: 9, fontWeight: "600", color: COLORS.gray500 },

  // Daily
  dailyList: { gap: 12 },
  dailyItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    paddingBottom: 12,
  },
  dailyDate: { flex: 2, fontSize: 13, fontWeight: "700", color: COLORS.gray800 },
  dailyCenter: { flex: 3, flexDirection: "row", alignItems: "center", gap: 8 },
  dailyDesc: { fontSize: 12, color: COLORS.gray600, flexShrink: 1 },
  dailyTemps: { flex: 1.5, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  dailyTempMax: { fontSize: 13, fontWeight: "800", color: COLORS.gray900, width: 24, textAlign: "right" },
  dailyTempMin: { fontSize: 13, fontWeight: "600", color: COLORS.gray400, width: 24, textAlign: "right" },
});
