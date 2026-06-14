import React from "react";
import { View, StyleSheet, Text, Animated } from "react-native";

export default function ToastNotification({ message, type = "info", visible = true }) {
  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#dcfce7";
      case "error":
        return "#fee2e2";
      case "info":
        return "#e0e7ff";
      default:
        return "#f3f4f6";
    }
  };

  const getTextColor = () => {
    switch (type) {
      case "success":
        return "#15803d";
      case "error":
        return "#991b1b";
      case "info":
        return "#3730a3";
      default:
        return "#374151";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "info":
        return "ℹ️";
      default:
        return "•";
    }
  };

  return (
    <View style={[styles.toast, { backgroundColor: getBackgroundColor() }]}>
      <Text style={[styles.icon, { color: getTextColor() }]}>{getIcon()}</Text>
      <Text style={[styles.message, { color: getTextColor() }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
});
