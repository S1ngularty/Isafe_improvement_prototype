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
      showToast(newValue ? "Location sharing enabled" : "Location sharing disabled", "success");
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
          showToast("Location permission denied", "error");
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
          showToast("Location updated locally (sync pending)", "info");
        }
      } catch (error) {
        console.error("Error getting location:", error);
        showToast("Failed to get location. Check permissions.", "error");
        setLocationEnabled(false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [locationEnabled]);

  const handleAddressSelect = useCallback(async (address) => {
    try {
      await upsertLocation(address.lat, address.lng);
      setLocation({ coords: { latitude: address.lat, longitude: address.lng } });
      showToast("Location updated", "success");
      setShowAddressSearch(false);
    } catch (error) {
      showToast(error.message || "Failed to update location", "error");
    }
  }, [showToast]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{profile?.full_name || "User"}</Text>
          </View>
          <Pressable style={styles.heartButton} onPress={() => navigation.navigate("Profile")}>
            <MaterialIcons name="favorite" size={24} color={COLORS.shieldPrimary} />
          </Pressable>
        </View>

        {/* I'M SAFE Status Indicator */}
        <View style={styles.statusIndicatorContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusBgColor(currentStatus) }]}>
            <View style={styles.statusIndicatorContent}>
              <MaterialIcons name={getStatusIcon(currentStatus)} size={20} color={getStatusTextColor(currentStatus)} />
              <Text style={[styles.statusIndicatorLabel, { color: getStatusTextColor(currentStatus) }]}>
                {currentStatus === "safe"
                  ? "I'M SAFE"
                  : currentStatus === "help"
                  ? "I NEED HELP"
                  : "EMERGENCY"}
              </Text>
            </View>
          </View>
        </View>

        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Emergency Alert Section */}
        <View style={styles.emergencyAlertSection}>
          <Text style={styles.emergencyAlertTitle}>EMERGENCY - TAP TO ALERT</Text>
          <Text style={styles.emergencyAlertSubtitle}>Tap the button nearby based on your location</Text>
          
          <View style={styles.tapOptionsContainer}>
            {/* 1 TAP */}
            <Pressable style={styles.tapOption}>
              <View style={[styles.tapCircle, styles.tapSafe]}>
                <MaterialIcons name="check-circle" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.tapCount}>1 TAP</Text>
              <Text style={styles.tapStatus}>I am Safe</Text>
              <Text style={styles.tapDescription}>I am okay. No help needed.</Text>
            </Pressable>

            {/* 2 TAPS */}
            <Pressable style={styles.tapOption}>
              <View style={[styles.tapCircle, styles.tapHelp]}>
                <MaterialIcons name="error" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.tapCount}>2 TAPS</Text>
              <Text style={styles.tapStatus}>I Feel Unsafe</Text>
              <Text style={styles.tapDescription}>I need someone check me out.</Text>
            </Pressable>

            {/* 3 TAPS */}
            <Pressable style={styles.tapOption}>
              <View style={[styles.tapCircle, styles.tapEmergency]}>
                <MaterialIcons name="warning" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.tapCount}>3 TAPS</Text>
              <Text style={styles.tapStatus}>I am in Danger</Text>
              <Text style={styles.tapDescription}>I need emergency alert</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.quickActionsTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsGrid}>
            <Pressable 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("EmergencyCall")}
            >
              <View style={styles.quickActionIconContainer}>
                <MaterialIcons name="phone" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Help</Text>
            </Pressable>

            <Pressable 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("FirstAidInstructions")}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: "#EF4444" }]}>
                <MaterialIcons name="medical-services" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>First Aid</Text>
            </Pressable>

            <Pressable 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("EmergencyGuidance")}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: "#f59e0b" }]}>
                <MaterialIcons name="warning" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Emergency</Text>
            </Pressable>

            <Pressable 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("EmergencyChecklist")}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: "#10b981" }]}>
                <MaterialIcons name="checklist" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Checklist</Text>
            </Pressable>

            <Pressable style={styles.quickActionButton}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: "#3b82f6" }]}>
                <MaterialIcons name="local-police" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Police</Text>
            </Pressable>

            <Pressable style={styles.quickActionButton}>
              <View style={[styles.quickActionIconContainer, { backgroundColor: "#8b5cf6" }]}>
                <MaterialIcons name="location-city" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Evacuation</Text>
            </Pressable>
          </View>
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
                Lat: {location.coords.latitude.toFixed(4)} | Lng: {location.coords.longitude.toFixed(4)}
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

        {/* Flood Warning Section */}
        <View style={styles.floodWarningSection}>
          <View style={styles.floodWarningHeader}>
            <MaterialIcons name="water" size={20} color={COLORS.shieldPrimary} />
            <Text style={styles.floodWarningTitle}>FLOOD WARNING (Bukidnon)</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.gray300} />
          </View>
          <Text style={styles.floodWarningText}>Water level is rising in your area. Stay alert for updates.</Text>
        </View>

        {/* Status Overview Section */}
        <View style={styles.statusOverviewSection}>
          <View style={styles.statusOverviewHeader}>
            <Text style={styles.statusOverviewTitle}>STATUS OVERVIEW</Text>
            <Pressable>
              <Text style={styles.viewAllLink}>View all</Text>
            </Pressable>
          </View>

          <View style={styles.statusOverviewGrid}>
            <View style={styles.statusOverviewItem}>
              <Text style={styles.statusOverviewValue}>2.35 m</Text>
              <Text style={styles.statusOverviewLabel}>Water Level</Text>
            </View>

            <View style={styles.statusOverviewItem}>
              <View style={styles.statusBadge}>
                <MaterialIcons name="info" size={16} color="#F59E0B" />
                <Text style={styles.statusBadgeText}>ADVISORY</Text>
              </View>
              <Text style={styles.statusOverviewLabel}>Flood Status</Text>
            </View>

            <View style={styles.statusOverviewItem}>
              <Text style={styles.statusOverviewValue}>3</Text>
              <Text style={styles.statusOverviewLabel}>Active Alerts</Text>
            </View>

            <View style={[styles.statusOverviewItem, styles.sosOverviewItem]}>
              <View style={styles.sosIconOverview}>
                <MaterialIcons name="sos" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.statusOverviewLabel}>SOS Status</Text>
            </View>
          </View>
        </View>

        {/* AI Chatbots Placeholder */}
        <View style={styles.aiBotSection}>
          <View style={styles.aiBotHeader}>
            <MaterialIcons name="smart-toy" size={20} color={COLORS.shieldPrimary} />
            <Text style={styles.aiBotTitle}>AI Assistant</Text>
          </View>
          <View style={styles.aiBotPlaceholder}>
            <MaterialIcons name="chat-bubble-outline" size={40} color={COLORS.gray300} />
            <Text style={styles.aiBotPlaceholderText}>Chat with our AI assistant</Text>
            <Text style={styles.aiBotPlaceholderSubtext}>Coming soon</Text>
          </View>
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

function getStatusIcon(status) {
  switch (status) {
    case "safe":      return "check-circle";
    case "help":      return "error";
    case "emergency": return "warning";
    default:          return "info";
  }
}

function getStatusTextColor(status) {
  switch (status) {
    case "safe":      return COLORS.successText;
    case "help":      return COLORS.warningText;
    case "emergency": return COLORS.errorText;
    default:          return COLORS.shieldPrimary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: "500",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gray900,
    marginTop: 4,
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicatorContainer: {
    marginBottom: 16,
  },
  statusIndicator: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statusIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicatorLabel: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Emergency Alert Section
  emergencyAlertSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  emergencyAlertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emergencyAlertSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 16,
  },
  tapOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  tapOption: {
    flex: 1,
    alignItems: "center",
  },
  tapCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  tapSafe: {
    backgroundColor: "#10b981",
  },
  tapHelp: {
    backgroundColor: "#f59e0b",
  },
  tapEmergency: {
    backgroundColor: COLORS.shieldPrimary,
  },
  tapCount: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray600,
    marginBottom: 2,
  },
  tapStatus: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 4,
    textAlign: "center",
  },
  tapDescription: {
    fontSize: 11,
    color: COLORS.gray500,
    textAlign: "center",
    lineHeight: 15,
  },

  // Quick Actions Section
  quickActionsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionButton: {
    width: "31%",
    alignItems: "center",
    paddingVertical: 12,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray900,
    textAlign: "center",
  },

  // Flood Warning Section
  floodWarningSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  floodWarningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  floodWarningTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray900,
    letterSpacing: 0.3,
  },
  floodWarningText: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
  },

  // Status Overview Section
  statusOverviewSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusOverviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusOverviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
    letterSpacing: 0.3,
  },
  viewAllLink: {
    fontSize: 12,
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
  statusOverviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusOverviewItem: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusOverviewValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  statusOverviewLabel: {
    fontSize: 11,
    color: COLORS.gray600,
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
    marginBottom: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  sosOverviewItem: {
    backgroundColor: COLORS.shieldPrimary,
  },
  sosIconOverview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  // AI Bot Section
  aiBotSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  aiBotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  aiBotTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  aiBotPlaceholder: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderStyle: "dashed",
  },
  aiBotPlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray700,
    marginTop: 12,
  },
  aiBotPlaceholderSubtext: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 4,
  },

  // Section styles (kept from original)
  section: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  locationInfo: {
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.gray700,
    marginBottom: 4,
    fontWeight: "500",
  },
  accuracyText: {
    fontSize: 11,
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
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.gray200,
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