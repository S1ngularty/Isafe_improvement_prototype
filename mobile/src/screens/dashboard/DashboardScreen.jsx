import React, { useState, useEffect, useCallback } from "react";
import {
  View, StyleSheet, Text, Pressable, ActivityIndicator,
  ScrollView, Switch, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { upsertLocation, updateLocationSharing } from "../../services/location.js";
import AnnouncementBanner from "../../components/AnnouncementBanner.jsx";
import WeatherPanel from "../../components/WeatherPanel.jsx";
import AddressSearch from "../../components/AddressSearch.jsx";

const COLORS = {
  shieldDark: "#5c1010",
  shieldPrimary: "#991b1b",
  alert: "#b91c1c",
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
  successBg: "#dcfce7",
  successText: "#15803d",
  warningBg: "#fef3c7",
  warningText: "#d97706",
  errorBg: "#fee2e2",
  errorText: "#dc2626",
};

// currentStatus is owned by AppTabs in App.js and passed down as a prop
export default function DashboardScreen({ navigation, currentStatus = "safe" }) {
  const { session, profile } = useAuth();
  const { showToast } = useToast();

  const [locationEnabled, setLocationEnabled] = useState(profile?.location_sharing ?? false);
  const [location, setLocation] = useState(
    profile?.lat && profile?.lng
      ? { coords: { latitude: profile.lat, longitude: profile.lng, accuracy: null } }
      : null
  );
  const [showAddressSearch, setShowAddressSearch] = useState(false);

  // Sync location toggle if profile refreshes
  useEffect(() => {
    if (profile?.location_sharing !== undefined) {
      setLocationEnabled(profile.location_sharing);
    }
  }, [profile?.location_sharing]);

  const handleLocationToggle = async (newValue) => {
    setLocationEnabled(newValue);
    try {
      await updateLocationSharing(newValue);
      showToast(newValue ? "📍 Location sharing enabled" : "📍 Location sharing disabled", "success");
    } catch (error) {
      setLocationEnabled(!newValue);
      showToast(error.message || "Failed to update location sharing", "error");
    }
  };

  // Request permission + get initial fix when toggled on
  useEffect(() => {
    if (!locationEnabled) return;
    (async () => {
      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== "granted") {
          showToast("❌ Location permission denied", "error");
          setLocationEnabled(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc);
        await upsertLocation(loc.coords.latitude, loc.coords.longitude);
      } catch (error) {
        console.error("Error getting location:", error);
        showToast("Failed to get location", "error");
        setLocationEnabled(false);
      }
    })();
  }, [locationEnabled]);

  // Poll every 10 s while enabled
  useEffect(() => {
    if (!locationEnabled) return;
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation(loc);
        try {
          await upsertLocation(loc.coords.latitude, loc.coords.longitude);
        } catch (dbError) {
          console.error("Error saving location:", dbError);
          showToast("⚠️ Location updated locally (sync pending)", "info");
        }
      } catch (error) {
        console.error("Error getting location:", error);
        showToast("❌ Failed to get location. Check permissions.", "error");
        setLocationEnabled(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [locationEnabled]);

  const handleAddressSelect = useCallback(async (address) => {
    try {
      await upsertLocation(address.lat, address.lng);
      setLocation({ coords: { latitude: address.lat, longitude: address.lng } });
      showToast("📍 Location updated", "success");
      setShowAddressSearch(false);
    } catch (error) {
      showToast(error.message || "Failed to update location", "error");
    }
  }, [showToast]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.email}>{session?.user?.email}</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => navigation.navigate("Profile")}>
            <MaterialIcons name="person" size={24} color={COLORS.shieldPrimary} />
          </Pressable>
        </View>

        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Status Card — read-only, driven by navbar SOSButton */}
        <View style={[styles.statusCard, { backgroundColor: getStatusBgColor(currentStatus) }]}>
          <Text style={styles.statusLabel}>Current Status</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(currentStatus) }]}>
            {currentStatus.toUpperCase()}
          </Text>
          <Text style={styles.statusSubtext}>
            {currentStatus === "safe"
              ? "You are marked as safe"
              : currentStatus === "help"
              ? "Help request is active"
              : "Emergency alert is active"}
          </Text>
          <Text style={styles.statusHint}>Use the SOS button below to change your status</Text>
        </View>

        {/* Location Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location Tracking</Text>
            <Switch
              value={locationEnabled}
              onValueChange={handleLocationToggle}
              trackColor={{ false: COLORS.gray300, true: COLORS.gray400 }}
              thumbColor={locationEnabled ? COLORS.shieldPrimary : COLORS.gray500}
            />
          </View>
          {locationEnabled && location && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                📍 Lat: {location.coords.latitude.toFixed(4)} | Lng: {location.coords.longitude.toFixed(4)}
              </Text>
              {location.coords.accuracy && (
                <Text style={styles.accuracyText}>Accuracy: {Math.round(location.coords.accuracy)}m</Text>
              )}
              <Pressable style={styles.searchButton} onPress={() => setShowAddressSearch(true)}>
                <MaterialIcons name="location-on" size={16} color={COLORS.shieldPrimary} />
                <Text style={styles.searchButtonText}>Search & Set Address</Text>
              </Pressable>
            </View>
          )}
          {locationEnabled && !location && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.shieldPrimary} />
              <Text style={styles.loadingText}>Getting location...</Text>
            </View>
          )}
        </View>

        {/* Weather Panel */}
        {locationEnabled && location && (
          <WeatherPanel lat={location.coords.latitude} lng={location.coords.longitude} />
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Alert")}>
            <MaterialIcons name="history" size={20} color={COLORS.shieldPrimary} />
            <Text style={styles.actionButtonText}>Emergency History</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
          </Pressable>
        </View>

      </ScrollView>

      {/* Address Search Modal */}
      <Modal
        visible={showAddressSearch}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Location</Text>
              <Pressable onPress={() => setShowAddressSearch(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.shieldPrimary} />
              </Pressable>
            </View>
            <AddressSearch
              onAddressSelect={handleAddressSelect}
              onCancel={() => setShowAddressSearch(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStatusColor(status) {
  switch (status) {
    case "safe":      return COLORS.successText;
    case "help":      return COLORS.warningText;
    case "emergency": return COLORS.errorText;
    default:          return COLORS.shieldPrimary;
  }
}

function getStatusBgColor(status) {
  switch (status) {
    case "safe":      return COLORS.successBg;
    case "help":      return COLORS.warningBg;
    case "emergency": return COLORS.errorBg;
    default:          return COLORS.gray50;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  email: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.gray900,
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  statusHint: {
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 8,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  locationInfo: {
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    padding: 12,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.gray700,
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  searchButtonText: {
    fontSize: 12,
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray900,
  },
});