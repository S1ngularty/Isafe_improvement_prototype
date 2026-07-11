import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg";
import { getTideData } from "../../services/tide.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  blue: "#2563eb",
  blueBg: "#eff6ff",
  blueLight: "#93c5fd",
  orange: "#ea580c",
  orangeBg: "#fff7ed",
  orangeLight: "#fdba74",
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
  red: "#ef4444",
};

const TABS = [
  { id: "today", label: "Today" },
  { id: "7day", label: "7 Days" },
  { id: "15day", label: "15 Days" },
];

// ── Helpers ──────────────────────────────────────────────────────────
function fmtLocalTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function fmtDay(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-PH", {
    weekday: "short",
  });
}

function fmtFullDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getTideStatus(extremes) {
  const now = Date.now();
  for (let i = 0; i < extremes.length - 1; i++) {
    const a = new Date(extremes[i].time).getTime();
    const b = new Date(extremes[i + 1].time).getTime();
    if (now >= a && now <= b) {
      return {
        current: extremes[i],
        next: extremes[i + 1],
        rising: extremes[i + 1].height > extremes[i].height,
        elapsed: (now - a) / (b - a),
      };
    }
  }
  if (extremes.length >= 2) {
    const last = extremes[extremes.length - 1];
    const prev = extremes[extremes.length - 2];
    return {
      current: last,
      next: null,
      rising: last.height > prev.height,
      elapsed: 1,
    };
  }
  return null;
}

function buildDailySummary(extremes) {
  const days = {};
  for (const e of extremes) {
    if (!days[e.localDate]) days[e.localDate] = [];
    days[e.localDate].push(e);
  }
  const today = new Date().toISOString().slice(0, 10);
  const todayKey = Object.keys(days).find((k) => k === today);
  return { days, todayKey };
}

// ── SVG Tide Chart ───────────────────────────────────────────────────
function TideChart({ extremes, tab }) {
  const screenWidth = Dimensions.get("window").width - 40;
  const CHART_W = Math.max(screenWidth, 320);
  const CHART_H = 220;
  const M = { t: 25, r: 20, b: 45, l: 45 };
  const PW = CHART_W - M.l - M.r;
  const PH = CHART_H - M.t - M.b;

  const chartData = useMemo(() => {
    if (extremes.length < 2) return null;

    const times = extremes.map((e) => new Date(e.time).getTime());
    let tMin, tMax;
    if (tab === "today") {
      const now = new Date();
      tMin = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();
      tMax = tMin + 86400000;
    } else {
      tMin = times[0] - 3600000;
      tMax = times[times.length - 1] + 3600000;
    }
    const tRange = tMax - tMin;

    const heights = extremes.map((e) => e.height);
    let hMin = Math.min(...heights);
    let hMax = Math.max(...heights);
    const pad = (hMax - hMin) * 0.15 || 0.3;
    hMin = Math.max(0, +(hMin - pad).toFixed(1));
    hMax = +(hMax + pad).toFixed(1);
    const hRange = hMax - hMin;

    const points = extremes.map((e) => ({
      x: M.l + ((new Date(e.time).getTime() - tMin) / tRange) * PW,
      y: M.t + PH - ((e.height - hMin) / hRange) * PH,
      height: e.height,
      type: e.type,
      label: fmtLocalTime(e.localTime),
    }));

    // Y ticks
    const yTicks = [];
    const tickStep = hRange <= 1 ? 0.2 : hRange <= 2 ? 0.5 : 1;
    let tick = Math.ceil(hMin / tickStep) * tickStep;
    while (tick <= hMax) {
      yTicks.push(tick);
      tick = +(tick + tickStep).toFixed(1);
    }

    // X ticks
    const xTicks = [];
    const xCount = tab === "today" ? 6 : tab === "7day" ? 7 : 10;
    const xStep = tRange / xCount;
    for (let i = 0; i <= xCount; i++) {
      const t = tMin + xStep * i;
      const d = new Date(t);
      const dateStr = d.toISOString().slice(0, 10);
      xTicks.push({
        x: M.l + ((t - tMin) / tRange) * PW,
        label:
          tab === "today"
            ? d.toLocaleTimeString("en-PH", {
                hour: "numeric",
                hour12: true,
              })
            : fmtDate(dateStr),
      });
    }

    // Bézier path
    const curveParts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      curveParts.push(
        `C${p0.x + (p1.x - p0.x) * 0.35},${p0.y} ${p0.x + (p1.x - p0.x) * 0.65},${p1.y} ${p1.x},${p1.y}`
      );
    }
    const pathD = `M${points[0].x},${points[0].y} ${curveParts.join(" ")}`;
    const fillD = `${pathD} L${points[points.length - 1].x},${M.t + PH} L${points[0].x},${M.t + PH} Z`;
    const nowX = M.l + ((Date.now() - tMin) / tRange) * PW;

    return { points, yTicks, xTicks, pathD, fillD, nowX };
  }, [extremes, tab, CHART_W]);

  if (!chartData) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Not enough data for chart</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={CHART_W} height={CHART_H}>
          <Defs>
            <LinearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#2563eb" stopOpacity="0.04" />
            </LinearGradient>
          </Defs>

          {/* Y-axis grid lines + labels */}
          {chartData.yTicks.map((tick) => {
            const y =
              M.t +
              PH -
              ((tick - chartData.yTicks[0] + (chartData.yTicks[1] - chartData.yTicks[0]) * 0.5) /
                ((chartData.yTicks[chartData.yTicks.length - 1] - chartData.yTicks[0]) + (chartData.yTicks[1] - chartData.yTicks[0]))) *
                PH;
            // Simpler approach: use the same calculation as the points
            const hMin = Math.max(0, +(Math.min(...extremes.map(e => e.height)) - (Math.max(...extremes.map(e => e.height)) - Math.min(...extremes.map(e => e.height))) * 0.15).toFixed(1));
            const hMax = +(Math.max(...extremes.map(e => e.height)) + (Math.max(...extremes.map(e => e.height)) - Math.min(...extremes.map(e => e.height))) * 0.15).toFixed(1);
            const hRange = hMax - hMin;
            const yPos = M.t + PH - ((tick - hMin) / hRange) * PH;
            return (
              <G key={`yt-${tick}`}>
                <Line
                  x1={M.l}
                  y1={yPos}
                  x2={M.l + PW}
                  y2={yPos}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <SvgText
                  x={M.l - 6}
                  y={yPos + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#9ca3af"
                >
                  {tick.toFixed(1)}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis labels */}
          {chartData.xTicks.map((t, i) => (
            <SvgText
              key={`xt-${i}`}
              x={t.x}
              y={M.t + PH + 16}
              textAnchor="middle"
              fontSize="8"
              fill="#6b7280"
            >
              {t.label}
            </SvgText>
          ))}

          {/* Now line */}
          {chartData.nowX >= M.l && chartData.nowX <= M.l + PW && (
            <Line
              x1={chartData.nowX}
              y1={M.t}
              x2={chartData.nowX}
              y2={M.t + PH}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="5,3"
              opacity="0.7"
            />
          )}

          {/* Fill + curve */}
          <Path d={chartData.fillD} fill="url(#tideFill)" />
          <Path
            d={chartData.pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points + labels */}
          {chartData.points.map((p, i) => (
            <G key={`pt-${i}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill={p.type === "high" ? "#2563eb" : "#ea580c"}
                stroke="#fff"
                strokeWidth="2"
              />
              <SvgText
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="9"
                fill={p.type === "high" ? "#1d4ed8" : "#c2410c"}
                fontWeight="bold"
              >
                {p.height.toFixed(2)}m
              </SvgText>
              <SvgText
                x={p.x}
                y={p.y + 16}
                textAnchor="middle"
                fontSize="8"
                fill="#6b7280"
              >
                {p.label}
              </SvgText>
            </G>
          ))}
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2563eb" }]} />
          <Text style={styles.legendText}>High Tide</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#ea580c" }]} />
          <Text style={styles.legendText}>Low Tide</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDash} />
          <Text style={styles.legendText}>Now</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────
export default function TideScreen({ navigation }) {
  const [tideData, setTideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("today");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTideData();
      setTideData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allExtremes = useMemo(() => {
    if (!tideData || !tideData.extremes) return [];
    return tideData.extremes;
  }, [tideData]);

  const extremes = useMemo(() => {
    if (tab === "15day") return allExtremes;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (tab === "today")
      return allExtremes.filter((e) => e.localDate === todayStr);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const endStr = end.toISOString().slice(0, 10);
    return allExtremes.filter(
      (e) => e.localDate >= todayStr && e.localDate <= endStr
    );
  }, [allExtremes, tab]);

  const station = tideData?.station || null;
  const summary = useMemo(() => buildDailySummary(extremes), [extremes]);
  const allSummary = useMemo(
    () => buildDailySummary(allExtremes),
    [allExtremes]
  );
  const tideStatus = useMemo(() => getTideStatus(allExtremes), [allExtremes]);
  const todayExtremes = summary.todayKey
    ? summary.days[summary.todayKey]
    : [];

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Tide Forecast</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.shieldPrimary} />
          <Text style={styles.loadingText}>Loading tide data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !tideData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Tide Forecast</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="cloud-off" size={48} color={COLORS.gray300} />
          <Text style={styles.errorTitle}>Unable to load tide data</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // No data
  if (!tideData || !allExtremes.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Tide Forecast</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="waves" size={48} color={COLORS.gray300} />
          <Text style={styles.errorTitle}>No tide data available</Text>
          <Text style={styles.errorDetail}>
            Data has not been fetched yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Tide Forecast</Text>
          {station && (
            <Text style={styles.headerSubtitle}>
              {station.name}, {station.region}
            </Text>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs */}
        <View style={styles.tabRow}>
          {TABS.map(({ id, label }) => (
            <Pressable
              key={id}
              style={[styles.tab, tab === id && styles.tabActive]}
              onPress={() => setTab(id)}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === id && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Status Cards */}
        {tideStatus && todayExtremes.length > 0 && (
          <View style={styles.statusCardsRow}>
            {/* Current Status */}
            <View style={[styles.statusCard, styles.statusCardBlue]}>
              <Text style={styles.statusCardLabel}>Current Status</Text>
              <Text style={styles.statusCardValue}>
                {tideStatus.rising ? "Rising" : "Falling"}
              </Text>
              <Text style={styles.statusCardSub}>
                {tideStatus.rising ? "Low → High" : "High → Low"}
              </Text>
            </View>

            {/* Last tide */}
            <View style={[styles.statusCard, styles.statusCardOrange]}>
              <Text style={[styles.statusCardLabel, { color: "#9a3412" }]}>
                Last{" "}
                {tideStatus.current.type === "high" ? "High" : "Low"} Tide
              </Text>
              <Text
                style={[styles.statusCardValue, { color: "#9a3412" }]}
              >
                {tideStatus.current.height.toFixed(2)}m
              </Text>
              <Text style={[styles.statusCardSub, { color: "#c2410c" }]}>
                {fmtLocalTime(tideStatus.current.localTime)}
              </Text>
            </View>

            {/* Next tide */}
            <View style={[styles.statusCard, styles.statusCardBlue]}>
              <Text style={styles.statusCardLabel}>
                Next{" "}
                {tideStatus.next
                  ? tideStatus.next.type === "high"
                    ? "High"
                    : "Low"
                  : "—"}{" "}
                Tide
              </Text>
              {tideStatus.next ? (
                <>
                  <Text style={styles.statusCardValue}>
                    {tideStatus.next.height.toFixed(2)}m
                  </Text>
                  <Text style={styles.statusCardSub}>
                    {fmtLocalTime(tideStatus.next.localTime)}
                  </Text>
                </>
              ) : (
                <Text
                  style={[styles.statusCardValue, { fontSize: 14 }]}
                >
                  No data
                </Text>
              )}
            </View>
          </View>
        )}

        {/* SVG Chart */}
        {extremes.length >= 2 && (
          <TideChart extremes={extremes} tab={tab} />
        )}

        {/* Today's Tides Table */}
        {todayExtremes.length > 0 && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>
              Today's Tides — {fmtFullDate(summary.todayKey)}
            </Text>

            {/* Table header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                Time
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                Height
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                Type
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                Status
              </Text>
            </View>

            {todayExtremes.map((e, i) => {
              const isRising =
                i < todayExtremes.length - 1 &&
                todayExtremes[i + 1].height > e.height;
              return (
                <View key={e.time} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1.2, fontWeight: "600" }]}>
                    {fmtLocalTime(e.localTime)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        fontWeight: "700",
                        color:
                          e.type === "high" ? COLORS.blue : COLORS.orange,
                      },
                    ]}
                  >
                    {e.height.toFixed(2)}m
                  </Text>
                  <View style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor:
                            e.type === "high" ? "#dbeafe" : "#ffedd5",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeBadgeText,
                          {
                            color:
                              e.type === "high"
                                ? COLORS.blue
                                : COLORS.orange,
                          },
                        ]}
                      >
                        {e.type === "high" ? "High" : "Low"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flex: 0.8, alignItems: "center" }}>
                    {i < todayExtremes.length - 1 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <MaterialIcons
                          name={
                            isRising ? "arrow-upward" : "arrow-downward"
                          }
                          size={12}
                          color={
                            isRising ? COLORS.blue : COLORS.orange
                          }
                        />
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color: isRising
                              ? COLORS.blue
                              : COLORS.orange,
                          }}
                        >
                          {isRising ? "Rising" : "Falling"}
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 10, color: COLORS.gray400 }}>
                        —
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Multi-day summary */}
        {tab !== "today" && Object.keys(summary.days).length > 0 && (
          <View style={styles.tableCard}>
            <Text style={styles.tableTitle}>
              {tab === "7day" ? "7-Day" : "15-Day"} Tide Summary
            </Text>

            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.6 }]}>
                Day
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>
                High
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Low</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>
                Range
              </Text>
            </View>

            {Object.entries(summary.days).map(([date, exts]) => {
              const high = exts.filter((e) => e.type === "high");
              const low = exts.filter((e) => e.type === "low");
              const maxH = high.length
                ? Math.max(...high.map((e) => e.height))
                : null;
              const minL = low.length
                ? Math.min(...low.map((e) => e.height))
                : null;
              const range =
                maxH !== null && minL !== null
                  ? (maxH - minL).toFixed(2)
                  : "—";
              const isToday = date === summary.todayKey;
              return (
                <View
                  key={date}
                  style={[
                    styles.tableRow,
                    isToday && { backgroundColor: "#eff6ff" },
                  ]}
                >
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text
                      style={[
                        styles.tableCell,
                        isToday && { color: COLORS.blue, fontWeight: "700" },
                      ]}
                    >
                      {fmtDate(date)}
                    </Text>
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Today</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.tableCell, { flex: 0.6, color: COLORS.gray500 }]}>
                    {fmtDay(date)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    {high.length > 0 ? (
                      high.map((h) => (
                        <Text
                          key={h.time}
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: COLORS.blue,
                          }}
                        >
                          {h.height.toFixed(2)}m
                        </Text>
                      ))
                    ) : (
                      <Text style={{ color: COLORS.gray400, fontSize: 12 }}>
                        —
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    {low.length > 0 ? (
                      low.map((l) => (
                        <Text
                          key={l.time}
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: COLORS.orange,
                          }}
                        >
                          {l.height.toFixed(2)}m
                        </Text>
                      ))
                    ) : (
                      <Text style={{ color: COLORS.gray400, fontSize: 12 }}>
                        —
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 0.7, fontWeight: "600" },
                    ]}
                  >
                    {range}m
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Station footer */}
        {station && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {station.name}, {station.region}, {station.country}
            </Text>
            <Text style={styles.footerText}>
              Datum: {tideData.datum || "LAT"} · Timezone:{" "}
              {station.timezone || "Asia/Manila"}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
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
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.white },
  headerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  scrollContent: { padding: 16, paddingBottom: 32 },
  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: COLORS.gray500 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  errorTitle: { fontSize: 16, fontWeight: "600", color: COLORS.gray700 },
  errorDetail: {
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: COLORS.shieldPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  // Tabs
  tabRow: {
    flexDirection: "row",
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.gray500 },
  tabTextActive: { color: COLORS.gray900 },
  // Status Cards
  statusCardsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statusCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusCardBlue: {
    backgroundColor: COLORS.blueBg,
    borderColor: COLORS.blueLight,
  },
  statusCardOrange: {
    backgroundColor: COLORS.orangeBg,
    borderColor: COLORS.orangeLight,
  },
  statusCardLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1e40af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusCardValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  statusCardSub: {
    fontSize: 10,
    color: "#3b82f6",
    marginTop: 2,
  },
  // Chart
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 10,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    overflow: "hidden",
  },
  emptyChart: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    marginBottom: 14,
  },
  emptyChartText: { fontSize: 13, color: COLORS.gray400 },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDash: {
    width: 16,
    height: 0,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.red,
  },
  legendText: { fontSize: 11, color: COLORS.gray500 },
  // Tables
  tableCard: {
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
  tableTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray500,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  tableCell: { fontSize: 12, color: COLORS.gray900 },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeBadgeText: { fontSize: 10, fontWeight: "700" },
  todayBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.blue,
  },
  // Footer
  footer: { alignItems: "center", paddingVertical: 12, gap: 3 },
  footerText: { fontSize: 10, color: COLORS.gray400, textAlign: "center" },
});
