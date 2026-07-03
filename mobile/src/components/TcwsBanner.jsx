import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const SIGNAL_COLORS = {
  1: "#EAB308",
  2: "#F97316",
  3: "#EA580C",
  4: "#DC2626",
  5: "#7F1D1D",
};

const SIGNAL_LABELS = {
  1: "TCWS #1",
  2: "TCWS #2",
  3: "TCWS #3",
  4: "TCWS #4",
  5: "TCWS #5",
};

export default function TcwsBanner({ alerts, onDismiss }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.92,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  if (!alerts || alerts.length === 0) return null;

  const highest = alerts[0];
  const bgColor = SIGNAL_COLORS[highest.signal_level] || "#EAB308";
  const isHighSignal = highest.signal_level >= 4;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, transform: [{ scale: pulseAnim }] },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <MaterialIcons
            name={isHighSignal ? "warning" : "info"}
            size={22}
            color="#fff"
          />
        </View>

        <View style={styles.content}>
          <View style={styles.labelRow}>
            <Text style={styles.signalLabel}>
              {SIGNAL_LABELS[highest.signal_level] || "TCWS"}
            </Text>
            {alerts.length > 1 && (
              <View style={styles.moreBadge}>
                <Text style={styles.moreBadgeText}>
                  +{alerts.length - 1} more
                </Text>
              </View>
            )}
          </View>

          {highest.wind_speed ? (
            <Text style={styles.windSpeed}>
              Quezon, Tagkawayan — {highest.wind_speed}
            </Text>
          ) : null}

          {highest.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {highest.description}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onDismiss}
          style={styles.dismissButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  signalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  moreBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moreBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  windSpeed: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
