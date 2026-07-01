import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useWeather } from "../hooks/useWeather.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
  white: "#fff",
  dangerBg: "#fee2e2",
  dangerBorder: "#dc2626",
  successText: "#15803d",
  warningText: "#d97706",
  errorText: "#dc2626",
};

export default function WeatherPanel({ lat, lng }) {
  const { current, hourly, loading, error } = useWeather(lat, lng);
  const [showHourly, setShowHourly] = useState(false);

  if (!lat || !lng) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <MaterialIcons name="location-off" size={24} color={COLORS.gray400} />
          <Text style={styles.placeholderText}>Enable location to see local weather</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={COLORS.shieldPrimary} />
        <Text style={styles.loadingText}>Fetching weather...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <View style={styles.errorContent}>
          <MaterialIcons name="cloud-off" size={24} color={COLORS.errorText} />
          <Text style={styles.errorText}>Weather data unavailable</Text>
        </View>
      </View>
    );
  }

  if (!current) {
    return null;
  }

  const isDanger = current.isDanger;

  return (
    <View
      style={[
        styles.container,
        isDanger && { borderWidth: 2, borderColor: COLORS.dangerBorder },
        isDanger && { backgroundColor: COLORS.dangerBg },
      ]}
    >
      {/* Danger Alert */}
      {isDanger && (
        <View style={styles.dangerAlert}>
          <MaterialIcons name="warning" size={20} color={COLORS.dangerBorder} />
          <Text style={styles.dangerAlertText}>Dangerous weather conditions detected</Text>
        </View>
      )}

      {/* Current Weather */}
      <View style={styles.currentSection}>
        <View style={styles.currentLeft}>
          <MaterialIcons name={current.icon} size={48} color={COLORS.shieldPrimary} />
          <Text style={styles.temperature}>{current.temperature != null ? Math.round(current.temperature) : "--"}°C</Text>
        </View>

        <View style={styles.currentRight}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Rainfall</Text>
            <Text style={styles.metricValue}>{current.precipitation ?? 0} mm</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Wind Speed</Text>
            <Text style={styles.metricValue}>{current.windSpeed != null ? Math.round(current.windSpeed) : 0} km/h</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Sea Level Press</Text>
            <Text style={styles.metricValue}>{current.pressure != null ? Math.round(current.pressure) : "--"} hPa</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Gusts</Text>
            <Text style={styles.metricValue}>{current.windGusts != null ? Math.round(current.windGusts) : 0} km/h</Text>
          </View>
        </View>
      </View>

      {/* Hourly Toggle */}
      {hourly && hourly.length > 0 && (
        <>
          <Pressable style={styles.hourlyToggle} onPress={() => setShowHourly(!showHourly)}>
            <Text style={styles.hourlyLabel}>Hourly Forecast</Text>
            <MaterialIcons
              name={showHourly ? "expand-less" : "expand-more"}
              size={20}
              color={COLORS.gray500}
            />
          </Pressable>

          {/* Hourly Grid */}
          {showHourly && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
              <View style={styles.hourlyGrid}>
                {hourly.slice(0, 24).map((hour, index) => (
                  <View key={index} style={styles.hourlyCell}>
                    <Text style={styles.hourlyTime}>{hour.time}</Text>
                    <MaterialIcons name={hour.icon} size={28} color={COLORS.shieldPrimary} style={styles.hourlyIconContainer} />
                    <View
                      style={[
                        styles.rainBar,
                        {
                          height: Math.max(
                            4,
                            Math.min(30, hour.precipitation * 3)
                          ),
                          backgroundColor:
                            hour.precipitation > 5 ? COLORS.errorText : COLORS.gray200,
                        },
                      ]}
                    />
                    <Text style={styles.hourlyRain}>{hour.precipitation.toFixed(1)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Legend */}
          {showHourly && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: COLORS.gray200 }]} />
                <Text style={styles.legendText}>Rainfall (mm)</Text>
              </View>
              <Text style={styles.legendWind}>Wind {current.windSpeed != null ? Math.round(current.windSpeed) : 0} km/h</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 12,
    marginBottom: 16,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  errorContent: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.errorText,
    fontWeight: "600",
  },
  dangerAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    borderLeftWidth: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 12,
    borderRadius: 4,
    gap: 8,
  },
  dangerAlertText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.errorText,
    fontWeight: "600",
  },
  currentSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  currentLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 48,
    marginBottom: 4,
  },
  temperature: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  currentRight: {
    flex: 1,
    marginLeft: 16,
  },
  metric: {
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  hourlyToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  hourlyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  hourlyScroll: {
    marginTop: 8,
  },
  hourlyGrid: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 12,
  },
  hourlyCell: {
    alignItems: "center",
    width: 60,
  },
  hourlyTime: {
    fontSize: 11,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  hourlyIconContainer: {
    marginBottom: 4,
  },
  hourlyIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  rainBar: {
    width: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  hourlyRain: {
    fontSize: 10,
    color: COLORS.gray500,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  legendWind: {
    fontSize: 11,
    color: COLORS.gray500,
  },
});
