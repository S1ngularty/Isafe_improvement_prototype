import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Pressable, Switch, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { updateLocationSharing } from "../../services/location.js";
import { updateProfile } from "../../services/profile.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray500: "#6b7280",
  gray800: "#1f2937",
  gray900: "#111827",
  white: "#fff",
  alert: "#b91c1c",
};

export default function SettingsScreen({ navigation }) {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  
  const [locationEnabled, setLocationEnabled] = useState(profile?.location_sharing ?? false);
  const [loading, setLoading] = useState(false);
  const [tideEnabled, setTideEnabled] = useState(profile?.tide_alerts_enabled ?? true);
  const [tideLoading, setTideLoading] = useState(false);

  useEffect(() => {
    if (profile?.location_sharing !== undefined) {
      setLocationEnabled(profile.location_sharing);
    }
    if (profile?.tide_alerts_enabled !== undefined) {
      setTideEnabled(profile.tide_alerts_enabled);
    }
  }, [profile?.location_sharing, profile?.tide_alerts_enabled]);

  const handleLocationToggle = async (newValue) => {
    setLocationEnabled(newValue);
    setLoading(true);
    try {
      await updateLocationSharing(newValue);
      await refreshProfile();
      showToast(
        newValue ? "Location sharing enabled" : "Location sharing disabled",
        "success",
      );
    } catch (error) {
      setLocationEnabled(!newValue);
      showToast(error.message || "Failed to update location sharing", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTideToggle = async (newValue) => {
    setTideEnabled(newValue);
    setTideLoading(true);
    try {
      await updateProfile({ tide_alerts_enabled: newValue });
      await refreshProfile();
      showToast(
        newValue ? "Tide alerts enabled" : "Tide alerts disabled",
        "success",
      );
    } catch (error) {
      setTideEnabled(!newValue);
      showToast(error.message || "Failed to update tide alerts", "error");
    } finally {
      setTideLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={20}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingTitleRow}>
              <MaterialIcons name="my-location" size={22} color={COLORS.shieldPrimary} />
              <Text style={styles.settingTitle}>Location Tracking</Text>
            </View>
            <Text style={styles.settingDescription}>
              Allow the app to track your location in the background. This ensures your family can find you in an emergency.
            </Text>
          </View>
          <View style={styles.switchContainer}>
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.shieldPrimary} />
            ) : (
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                trackColor={{ false: COLORS.gray300, true: "#fca5a5" }}
                thumbColor={locationEnabled ? COLORS.shieldPrimary : COLORS.white}
              />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <View style={styles.settingTitleRow}>
              <MaterialIcons name="waves" size={22} color={COLORS.shieldPrimary} />
              <Text style={styles.settingTitle}>Tide Alerts</Text>
            </View>
            <Text style={styles.settingDescription}>
              Receive push notifications about current tide conditions at 8am, 12pm, and 6pm.
            </Text>
          </View>
          <View style={styles.switchContainer}>
            {tideLoading ? (
              <ActivityIndicator size="small" color={COLORS.shieldPrimary} />
            ) : (
              <Switch
                value={tideEnabled}
                onValueChange={handleTideToggle}
                trackColor={{ false: COLORS.gray300, true: "#fca5a5" }}
                thumbColor={tideEnabled ? COLORS.shieldPrimary : COLORS.white}
              />
            )}
          </View>
        </View>
      </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  switchContainer: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 50,
  },
});
