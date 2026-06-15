import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Text, Animated } from "react-native";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  gray400: "#9ca3af",
  successBg: "#dcfce7",
  successText: "#15803d",
  warningBg: "#fef3c7",
  warningText: "#d97706",
  errorBg: "#fee2e2",
  errorText: "#dc2626",
  white: "#fff",
};

const STATUS_CYCLE = ["safe", "help", "emergency"];

const DISPLAY = {
  safe:      { label: "OK",  sub: "Safe",  bg: COLORS.successBg, color: COLORS.successText },
  help:      { label: "!",   sub: "Help",  bg: COLORS.warningBg, color: COLORS.warningText },
  emergency: { label: "!",   sub: "SOS",   bg: COLORS.errorBg,   color: COLORS.errorText   },
  dormant:   { label: "SOS", sub: "Tap",   bg: COLORS.gray50,    color: COLORS.shieldPrimary },
};

// How long (ms) of inactivity before the button commits and resets
const COMMIT_DELAY = 3500;

/**
 * SOSButton
 *
 * Tap 1        → floats up, no status change yet
 * Tap 2        → preview "safe"
 * Tap 3        → preview "help"
 * Tap 4        → preview "emergency"
 * Tap 5+       → cycles back to "safe"
 *
 * After COMMIT_DELAY ms of no taps, the previewed status is committed
 * (DB write fires) and the button resets to dormant.
 *
 * UI is always instant — no tap is ever blocked by a network call.
 */
export default function SOSButton({ onStatusChange, currentStatus = "safe" }) {
  const [pressCount, setPressCount] = useState(0);
  const [localStatus, setLocalStatus] = useState(null); // null = dormant
  const [countdown, setCountdown] = useState(0);        // 0-100 for progress ring
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const commitTimer = useRef(null);
  const countdownInterval = useRef(null);
  const countdownStart = useRef(null);

  const statusForCount = (count) => {
    if (count < 2) return null;
    return STATUS_CYCLE[(count - 2) % STATUS_CYCLE.length];
  };

  // Animate ascend / collapse
  useEffect(() => {
    if (pressCount === 1) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 8,
        bounciness: 15,
        useNativeDriver: true,
      }).start();
    } else if (pressCount === 0) {
      Animated.spring(scaleAnim, {
        toValue: 0.5,
        speed: 12,
        bounciness: 4,
        useNativeDriver: true,
      }).start();
      setLocalStatus(null);
      setCountdown(0);
    }
  }, [pressCount]);

  // Reset when parent's authoritative status changes externally
  useEffect(() => {
    clearAllTimers();
    setPressCount(0);
  }, [currentStatus]);

  const clearAllTimers = () => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    commitTimer.current = null;
    countdownInterval.current = null;
  };

  const startCommitCountdown = (statusToCommit) => {
    clearAllTimers();

    // Animate a 0→100 progress over COMMIT_DELAY ms
    countdownStart.current = Date.now();
    setCountdown(0);
    countdownInterval.current = setInterval(() => {
      const elapsed = Date.now() - countdownStart.current;
      const progress = Math.min((elapsed / COMMIT_DELAY) * 100, 100);
      setCountdown(progress);
      if (progress >= 100) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    }, 30);

    // Commit after delay
    commitTimer.current = setTimeout(() => {
      // Fire DB write in background
      onStatusChange?.(statusToCommit).catch((err) => {
        console.error("[SOS] commit failed:", err);
      });
      // Reset button
      setPressCount(0);
    }, COMMIT_DELAY);
  };

  const handlePress = () => {
    const newCount = pressCount + 1;
    setPressCount(newCount);

    const newStatus = statusForCount(newCount);

    if (newStatus) {
      // Update display instantly
      setLocalStatus(newStatus);
      // Restart the commit countdown with the latest status
      startCommitCountdown(newStatus);
    } else {
      // First tap — just ascend, no commit timer yet
      clearAllTimers();
      setCountdown(0);
    }
  };

  const display = localStatus ? DISPLAY[localStatus] : DISPLAY.dormant;
  const dotIndex = pressCount >= 2 ? (pressCount - 2) % STATUS_CYCLE.length : -1;

  const hintForCount = (count) => {
    if (count === 0) return null;
    if (count === 1) return "Tap to set status";
    const next = STATUS_CYCLE[(count - 1) % STATUS_CYCLE.length];
    return `Tap for ${next.charAt(0).toUpperCase() + next.slice(1)}`;
  };

  const hint = hintForCount(pressCount);

  // Build SVG-style progress ring using a rotating border trick
  const ringRotation = (countdown / 100) * 360;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.animatedButton, { transform: [{ scale: scaleAnim }] }]}>
        {/* Countdown ring — only visible while a status is previewed */}
        {localStatus && (
          <View style={styles.ringWrapper}>
            <View
              style={[
                styles.ring,
                {
                  borderColor: display.color,
                  transform: [{ rotate: `${ringRotation}deg` }],
                },
              ]}
            />
          </View>
        )}

        <Pressable
          style={[styles.sosButton, { backgroundColor: display.bg }]}
          onPress={handlePress}
          android_ripple={{ color: "transparent" }}
        >
          <Text style={[styles.sosLabel, { color: display.color }]}>{display.label}</Text>
          <Text style={[styles.sosSub,   { color: display.color }]}>{display.sub}</Text>
        </Pressable>
      </Animated.View>

      {/* Progress dots */}
      {pressCount >= 1 && (
        <View style={styles.dots}>
          {STATUS_CYCLE.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i <= dotIndex ? COLORS.shieldPrimary : COLORS.gray400 },
              ]}
            />
          ))}
        </View>
      )}

      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  animatedButton: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  ringWrapper: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  sosButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  sosLabel: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32,
  },
  sosSub: {
    fontSize: 11,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hint: {
    fontSize: 10,
    color: COLORS.gray400,
    textAlign: "center",
    marginTop: 2,
  },
});