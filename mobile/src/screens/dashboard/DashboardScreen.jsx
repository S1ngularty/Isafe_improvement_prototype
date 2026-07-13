import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Switch,
  Modal,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useNetwork } from "../../context/NetworkContext.jsx";
import {
  upsertLocation,
  updateLocationSharing,
} from "../../services/location.js";
import AnnouncementBanner from "../../components/AnnouncementBanner.jsx";
import WeatherPanel from "../../components/WeatherPanel.jsx";
import AddressSearch from "../../components/AddressSearch.jsx";
import TcwsBanner from "../../components/TcwsBanner.jsx";
import { fetchActiveForTarget } from "../../services/rescue.js";
import useRealtimeRefresh from "../../hooks/useRealtimeRefresh.js";
import { fetchActiveAlerts } from "../../services/tcws.js";
import { getDefaultAvatar } from "../../services/profile.js";
import { fetchWaterLevelSummary } from "../../services/waterLevel.js";
import { getTideData } from "../../services/tide.js";

const COLORS = {
  shieldDark: "#5c1010",
  shieldPrimary: "#800000",
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

export default function DashboardScreen({
  navigation,
  currentStatus = "safe",
  onStatusChange,
}) {
  const { session, profile } = useAuth();
  const { showToast } = useToast();
  const { isOffline } = useNetwork();

  const [locationEnabled, setLocationEnabled] = useState(
    profile?.location_sharing ?? false,
  );
  const [location, setLocation] = useState(
    profile?.lat && profile?.lng
      ? {
          coords: {
            latitude: profile.lat,
            longitude: profile.lng,
            accuracy: null,
          },
        }
      : null,
  );
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [tcwsAlerts, setTcwsAlerts] = useState([]);
  const [tcwsDismissed, setTcwsDismissed] = useState(false);
  const [rescueEnRoute, setRescueEnRoute] = useState(null);
  const [waterLevelSummary, setWaterLevelSummary] = useState(null);
  const [tideData, setTideData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [alerts, waterRes, tideRes] = await Promise.all([
          fetchActiveAlerts().catch(() => []),
          fetchWaterLevelSummary().catch(() => null),
          getTideData().catch(() => null)
        ]);
        if (!cancelled) {
          if (Array.isArray(alerts) && alerts.length > 0) {
            setTcwsAlerts(alerts);
          }
          if (waterRes) setWaterLevelSummary(waterRes);
          if (tideRes) setTideData(tideRes);
        }
      } catch (e) {
        console.log("Failed to fetch dashboard data:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rescueActive =
    currentStatus === "help" || currentStatus === "emergency";

  const checkRescue = useCallback(async () => {
    if (!rescueActive || !session?.user?.id) {
      setRescueEnRoute(null);
      return;
    }
    try {
      const data = await fetchActiveForTarget(session.user.id);
      setRescueEnRoute(data);
    } catch (_) {}
  }, [rescueActive, session?.user?.id]);

  useEffect(() => {
    checkRescue();
  }, [checkRescue]);

  useRealtimeRefresh(
    rescueActive && session?.user?.id
      ? {
          table: "rescue_assignments",
          event: "*",
          filter: `target_user_id=eq.${session.user.id}`,
          channelName: `victim-rescue-${session.user.id}`,
        }
      : null,
    checkRescue,
  );

  useEffect(() => {
    if (profile?.location_sharing !== undefined) {
      setLocationEnabled(profile.location_sharing);
    }
  }, [profile?.location_sharing]);

  const handleLocationToggle = async (newValue) => {
    if (isOffline && newValue) {
      showToast("Location tracking is unavailable offline", "info");
      return;
    }

    setLocationEnabled(newValue);
    try {
      await updateLocationSharing(newValue);
      showToast(
        newValue ? "Location sharing enabled" : "Location sharing disabled",
        "success",
      );
    } catch (error) {
      setLocationEnabled(!newValue);
      showToast(error.message || "Failed to update location sharing", "error");
    }
  };

  useEffect(() => {
    if (isOffline) {
      setLocationEnabled(false);
      return;
    }

    if (!locationEnabled) return;
    (async () => {
      try {
        const { status: permStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (permStatus !== "granted") {
          showToast("Location permission denied", "error");
          setLocationEnabled(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc);
        await upsertLocation(loc.coords.latitude, loc.coords.longitude);
      } catch (error) {
        console.error("Error getting location:", error);
        showToast("Failed to get location", "error");
        setLocationEnabled(false);
      }
    })();
  }, [isOffline, locationEnabled, showToast]);

  useEffect(() => {
    if (isOffline || !locationEnabled) return;
    const interval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
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
  }, [isOffline, locationEnabled, showToast]);

  const handleAddressSelect = useCallback(
    async (address) => {
      try {
        await upsertLocation(address.lat, address.lng);
        setLocation({
          coords: { latitude: address.lat, longitude: address.lng },
        });
        showToast("Location updated", "success");
        setShowAddressSearch(false);
      } catch (error) {
        showToast(error.message || "Failed to update location", "error");
      }
    },
    [showToast],
  );

  // --- Status Overview Logic ---
  let maxUnsafeLevel = "SAFE";
  let latestWaterLevelStr = "Offline";
  if (waterLevelSummary) {
    if (waterLevelSummary.flood_warning_count > 0) maxUnsafeLevel = "FLOOD WARNING";
    else if (waterLevelSummary.warning_count > 0) maxUnsafeLevel = "WARNING";

    if (waterLevelSummary.latest_readings && waterLevelSummary.latest_readings.length > 0) {
      const maxReading = Math.max(...waterLevelSummary.latest_readings.map(r => r.water_level_cm));
      latestWaterLevelStr = `${Math.round(maxReading)} cm`;
    } else {
      latestWaterLevelStr = "-- cm";
    }
  }

  let nextHighTideStr = "-- at --";
  if (tideData && tideData.extremes) {
    const now = new Date();
    const upcomingHighs = tideData.extremes.filter(e => e.type.toLowerCase() === "high" && new Date(e.time) > now);
    if (upcomingHighs.length > 0) {
      const nextHigh = upcomingHighs[0];
      const timeStr = new Date(nextHigh.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      nextHighTideStr = `${nextHigh.height.toFixed(2)}m at ${timeStr}`;
    }
  }

  const tcwsCount = tcwsAlerts.length;
  const unsafeWaterCount = waterLevelSummary ? waterLevelSummary.unsafe_count : 0;
  const totalAlerts = tcwsCount + unsafeWaterCount;
  // -----------------------------

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#800000" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            {(() => {
              const hour = new Date().getHours();
              if (hour < 12) return "Good morning,";
              if (hour < 18) return "Good afternoon,";
              return "Good evening,";
            })()}
          </Text>
          <Text style={styles.userName}>{profile?.full_name || "User"}</Text>
        </View>
        <Pressable
          style={[styles.heartButton, isOffline && styles.heartButtonDisabled]}
          onPress={() => {
            if (isOffline) {
              showToast("Profile is unavailable offline", "info");
              return;
            }
            navigation.navigate("Profile");
          }}
          disabled={isOffline}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Image
              source={{ uri: getDefaultAvatar(profile?.full_name) }}
              style={styles.avatarImage}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Current Status Card */}
        <View style={styles.statusCardContainer}>
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: getStatusBgColor(currentStatus),
                borderColor: getStatusBorderColor(currentStatus),
              },
            ]}>
            <View style={styles.statusCardHeader}>
              <View
                style={[
                  styles.statusIconContainer,
                  { backgroundColor: getStatusIconBgColor(currentStatus) },
                ]}>
                <MaterialIcons
                  name={getStatusIcon(currentStatus)}
                  size={28}
                  color={getStatusTextColor(currentStatus)}
                />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusCardTitle}>CURRENT STATUS</Text>
                <Text
                  style={[
                    styles.statusCardValue,
                    { color: getStatusTextColor(currentStatus) },
                  ]}>
                  {currentStatus === "safe"
                    ? "I'm Safe"
                    : currentStatus === "help"
                      ? "I Need Help"
                      : "Emergency"}
                </Text>
              </View>
            </View>
            <Text style={styles.statusCardDescription}>
              {currentStatus === "safe"
                ? "Your family can see you are safe."
                : currentStatus === "help"
                  ? "Your family has been notified you feel unsafe."
                  : "Emergency alerts have been sent to your contacts."}
            </Text>
          </View>
        </View>

        {/* Rescue En Route Banner */}
        {rescueEnRoute && (
          <View
            style={{
              backgroundColor: "#166534",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}>
            <MaterialIcons name="emergency" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                Help is on the way!
              </Text>
              <Text style={{ color: "#bbf7d0", fontSize: 12, marginTop: 2 }}>
                {rescueEnRoute.rescuer?.full_name || "A rescuer"}
                {rescueEnRoute.eta_seconds
                  ? ` · ETA ~${Math.round(rescueEnRoute.eta_seconds / 60)} min`
                  : ""}
              </Text>
            </View>
          </View>
        )}

        {/* TCWS Status Section */}
        {!tcwsDismissed && tcwsAlerts.length > 0 ? (
          <TcwsBanner
            alerts={tcwsAlerts}
            onDismiss={() => setTcwsDismissed(true)}
          />
        ) : tcwsDismissed || tcwsAlerts.length === 0 ? (
          <View style={styles.tcwsNoSignalCard}>
            <View style={styles.tcwsNoSignalIconCircle}>
              <MaterialIcons name="shield" size={20} color="#16a34a" />
            </View>
            <View style={styles.tcwsNoSignalContent}>
              <Text style={styles.tcwsNoSignalTitle}>TCWS Status</Text>
              <Text style={styles.tcwsNoSignalText}>No active tropical cyclone wind signals</Text>
            </View>
            <View style={styles.tcwsNoSignalBadge}>
              <Text style={styles.tcwsNoSignalBadgeText}>ALL CLEAR</Text>
            </View>
          </View>
        ) : null}

        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Emergency Alert Section */}
        <View style={styles.emergencyAlertSection}>
          <Text style={styles.emergencyAlertTitle}>
            EMERGENCY - TAP TO ALERT
          </Text>
          <Text style={styles.emergencyAlertSubtitle}>
            Tap the button based on your situation
          </Text>

          <View style={styles.tapOptionsContainer}>
            {/* 1 TAP */}
            <Pressable
              style={styles.tapOption}
              onPress={() => onStatusChange?.("safe")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[styles.tapCircle, styles.tapSafe]}>
                <MaterialIcons
                  name="check-circle"
                  size={32}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.tapCount}>1 TAP</Text>
              <Text style={[styles.tapStatus, { color: COLORS.successText }]}>
                I am Safe
              </Text>
              <Text style={styles.tapDescription}>No help needed</Text>
            </Pressable>

            {/* 2 TAPS */}
            <Pressable
              style={styles.tapOption}
              onPress={() => onStatusChange?.("help")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[styles.tapCircle, styles.tapHelp]}>
                <MaterialIcons name="error" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.tapCount}>2 TAPS</Text>
              <Text style={[styles.tapStatus, { color: COLORS.warningText }]}>
                I Feel Unsafe
              </Text>
              <Text style={styles.tapDescription}>Need someone to check</Text>
            </Pressable>

            {/* 3 TAPS */}
            <Pressable
              style={styles.tapOption}
              onPress={() => onStatusChange?.("emergency")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[styles.tapCircle, styles.tapEmergency]}>
                <MaterialIcons name="warning" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.tapCount}>3 TAPS</Text>
              <Text style={[styles.tapStatus, { color: COLORS.errorText }]}>
                In Danger
              </Text>
              <Text style={styles.tapDescription}>Need emergency alert</Text>
            </Pressable>
          </View>
        </View>

        {isOffline && (
          <View style={styles.offlineBanner}>
            <MaterialIcons name="wifi-off" size={18} color="#b45309" />
            <Text style={styles.offlineBannerText}>
              Offline mode: you can still use the guidance and safety pages.
            </Text>
          </View>
        )}

        {/* Overall Status Overview Section */}
        <View style={styles.statusOverviewSection}>
          <View style={styles.statusOverviewHeader}>
            <Text style={styles.sectionTitle}>Status Overview</Text>
          </View>

          {/* Weather Panel inside Status Overview */}
          {!isOffline && locationEnabled && location && (
            <WeatherPanel
              lat={location.coords.latitude}
              lng={location.coords.longitude}
              onPress={() => navigation.navigate("Forecast")}
            />
          )}

          {/* Flood Warning Section (Conditional) */}
          {waterLevelSummary && waterLevelSummary.unsafe_count > 0 && (
            <Pressable 
              style={styles.floodWarningSection} 
              onPress={() => navigation.navigate("WaterLevel")}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.floodWarningHeader}>
                  <MaterialIcons name="warning" size={20} color="#dc2626" />
                  <Text style={styles.floodWarningTitle}>FLOOD WARNING</Text>
                </View>
                <Text style={styles.floodWarningText}>
                  {waterLevelSummary.flood_warning_count > 0 
                    ? `Critical: ${waterLevelSummary.flood_warning_count} sensors report flood levels.`
                    : `Warning: ${waterLevelSummary.warning_count} sensors report high water levels.`}
                  {" "}Tap for details.
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color="#dc2626"
              />
            </Pressable>
          )}

          {/* Status Overview Grid */}
          <View style={styles.statusOverviewGrid}>
            <Pressable style={styles.statusOverviewItem} onPress={() => navigation.navigate("WaterLevel")}>
              <Text style={styles.statusOverviewValue}>{latestWaterLevelStr}</Text>
              <Text style={styles.statusOverviewLabel}>Water Level</Text>
            </Pressable>

            <Pressable style={styles.statusOverviewItem} onPress={() => navigation.navigate("FloodHazard")}>
              <View style={[styles.statusBadge, { 
                backgroundColor: maxUnsafeLevel === "SAFE" ? COLORS.successBg : maxUnsafeLevel === "WARNING" ? COLORS.warningBg : COLORS.errorBg 
              }]}>
                <MaterialIcons 
                  name={maxUnsafeLevel === "SAFE" ? "check-circle" : "warning"} 
                  size={14} 
                  color={maxUnsafeLevel === "SAFE" ? COLORS.successText : maxUnsafeLevel === "WARNING" ? COLORS.warningText : COLORS.errorText} 
                />
                <Text style={[styles.statusBadgeText, { 
                  color: maxUnsafeLevel === "SAFE" ? COLORS.successText : maxUnsafeLevel === "WARNING" ? COLORS.warningText : COLORS.errorText 
                }]}>
                  {maxUnsafeLevel}
                </Text>
              </View>
              <Text style={styles.statusOverviewLabel}>Flood Status</Text>
            </Pressable>

            <Pressable style={styles.statusOverviewItem} onPress={() => navigation.navigate("TideInfo")}>
              <Text style={styles.statusOverviewValue} numberOfLines={1} adjustsFontSizeToFit>{nextHighTideStr}</Text>
              <Text style={styles.statusOverviewLabel}>Next High Tide</Text>
            </Pressable>

            <View style={styles.statusOverviewItem}>
              <Text style={styles.statusOverviewValue}>{totalAlerts}</Text>
              <Text style={styles.statusOverviewLabel}>Active Alerts</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("EmergencyCall")}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: "#EF4444" },
                ]}>
                <MaterialIcons name="phone" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Help</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("FirstAidInstructions")}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: "#10b981" },
                ]}>
                <MaterialIcons
                  name="medical-services"
                  size={28}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.quickActionLabel}>First Aid</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("EmergencyGuidance")}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: "#f59e0b" },
                ]}>
                <MaterialIcons name="warning" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Emergency</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("EmergencyChecklist")}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: "#8b5cf6" },
                ]}>
                <MaterialIcons
                  name="checklist"
                  size={28}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.quickActionLabel}>Checklist</Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => {
                navigation.navigate("Evacuation");
              }}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: "#06b6d4" },
                ]}>
                <MaterialIcons
                  name="location-city"
                  size={28}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.quickActionLabel}>
                {isOffline ? "Evacuation\nOffline" : "Evacuation"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("RainViewer")}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: "#6366f1" },
                ]}>
                <MaterialIcons name="radar" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionLabel}>Radar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickActionButton,
                isOffline && styles.quickActionButtonDisabled,
              ]}
              onPress={() => {
                if (isOffline) {
                  showToast("Flood risk data is unavailable offline", "info");
                  return;
                }
                navigation.navigate("FloodHazard");
              }}
              disabled={isOffline}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: isOffline ? "#64748b" : "#dc2626" },
                ]}>
                <MaterialIcons name="flood" size={28} color={COLORS.white} />
              </View>
              <Text
                style={[
                  styles.quickActionLabel,
                  isOffline && styles.quickActionLabelDisabled,
                ]}>
                {isOffline ? "Flood Risk\nOffline" : "Flood Risk"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickActionButton,
                isOffline && styles.quickActionButtonDisabled,
              ]}
              onPress={() => {
                if (isOffline) {
                  showToast("Water level data is unavailable offline", "info");
                  return;
                }
                navigation.navigate("WaterLevel");
              }}
              disabled={isOffline}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: isOffline ? "#64748b" : "#0ea5e9" },
                ]}>
                <MaterialIcons name="water" size={28} color={COLORS.white} />
              </View>
              <Text
                style={[
                  styles.quickActionLabel,
                  isOffline && styles.quickActionLabelDisabled,
                ]}>
                {isOffline ? "Water Level\nOffline" : "Water Level"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickActionButton,
                isOffline && styles.quickActionButtonDisabled,
              ]}
              onPress={() => {
                if (isOffline) {
                  showToast("Tide info is unavailable offline", "info");
                  return;
                }
                navigation.navigate("TideInfo");
              }}
              disabled={isOffline}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: isOffline ? "#64748b" : "#6366f1" },
                ]}>
                <MaterialIcons name="waves" size={28} color={COLORS.white} />
              </View>
              <Text
                style={[
                  styles.quickActionLabel,
                  isOffline && styles.quickActionLabelDisabled,
                ]}>
                {isOffline ? "Tide Info\nOffline" : "Tide Info"}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.quickActionButton,
                isOffline && styles.quickActionButtonDisabled,
              ]}
              onPress={() => {
                if (isOffline) {
                  showToast("Forecast is unavailable offline", "info");
                  return;
                }
                navigation.navigate("Forecast");
              }}
              disabled={isOffline}>
              <View
                style={[
                  styles.quickActionIconContainer,
                  { backgroundColor: isOffline ? "#64748b" : "#3b82f6" },
                ]}>
                <MaterialIcons name="wb-sunny" size={28} color={COLORS.white} />
              </View>
              <Text
                style={[
                  styles.quickActionLabel,
                  isOffline && styles.quickActionLabelDisabled,
                ]}>
                {isOffline ? "Forecast\nOffline" : "Forecast"}
              </Text>
            </Pressable>
          </View>
        </View>
        {/* {!isOffline && (
          <View style={styles.aiBotSection}>
            <View style={styles.aiBotHeader}>
              <MaterialIcons name="smart-toy" size={20} color="#800000" />
              <Text style={styles.aiBotTitle}>AI Assistant</Text>
            </View>
            <View style={styles.aiBotPlaceholder}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={40}
                color={COLORS.gray300}
              />
              <Text style={styles.aiBotPlaceholderText}>
                Chat with our AI assistant
              </Text>
              <Text style={styles.aiBotPlaceholderSubtext}>Coming soon</Text>
            </View>
          </View>
        )} */}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusBgColor(status) {
  switch (status) {
    case "safe":
      return COLORS.successBg;
    case "help":
      return COLORS.warningBg;
    case "emergency":
      return COLORS.errorBg;
    default:
      return COLORS.gray50;
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "safe":
      return "check-circle";
    case "help":
      return "error";
    case "emergency":
      return "warning";
    default:
      return "info";
  }
}

function getStatusTextColor(status) {
  switch (status) {
    case "safe":
      return COLORS.successText;
    case "help":
      return COLORS.warningText;
    case "emergency":
      return COLORS.errorText;
    default:
      return COLORS.shieldPrimary;
  }
}

function getStatusBorderColor(status) {
  switch (status) {
    case "safe":
      return "#86efac";
    case "help":
      return "#fcd34d";
    case "emergency":
      return "#fca5a5";
    default:
      return COLORS.gray200;
  }
}

function getStatusIconBgColor(status) {
  switch (status) {
    case "safe":
      return "#bbf7d0";
    case "help":
      return "#fde68a";
    case "emergency":
      return "#fecaca";
    default:
      return COLORS.gray200;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: "500",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.gray900,
    marginTop: 2,
  },
  heartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  heartButtonDisabled: {
    opacity: 0.6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statusCardContainer: {
    marginBottom: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statusCardValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statusCardDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  emergencyAlertSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emergencyAlertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#800000",
    letterSpacing: 0.5,
    marginBottom: 2,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tapSafe: {
    backgroundColor: "#10b981",
  },
  tapHelp: {
    backgroundColor: "#f59e0b",
  },
  tapEmergency: {
    backgroundColor: "#800000",
  },
  tapCount: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray600,
    marginBottom: 2,
  },
  tapStatus: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  tapDescription: {
    fontSize: 10,
    color: COLORS.gray500,
    textAlign: "center",
    lineHeight: 14,
  },
  quickActionsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionButton: {
    width: "31%",
    alignItems: "center",
    paddingVertical: 8,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionButtonDisabled: {
    opacity: 0.6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray900,
    textAlign: "center",
  },
  quickActionLabelDisabled: {
    color: COLORS.gray500,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400e",
    fontWeight: "600",
  },
  locationSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationInfo: {
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    padding: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.gray700,
    fontWeight: "500",
  },
  accuracyText: {
    fontSize: 11,
    color: COLORS.gray500,
    marginBottom: 8,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchButtonText: {
    fontSize: 12,
    color: "#800000",
    fontWeight: "600",
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
  floodWarningSection: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  floodWarningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  floodWarningTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991b1b",
    letterSpacing: 0.5,
  },
  floodWarningText: {
    fontSize: 12,
    color: "#7f1d1d",
    lineHeight: 18,
    fontWeight: "500",
  },
  statusOverviewSection: {
    marginBottom: 16,
  },
  statusOverviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  viewAllLink: {
    fontSize: 12,
    color: "#800000",
    fontWeight: "700",
  },
  statusOverviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statusOverviewItem: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  statusOverviewValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 6,
  },
  statusOverviewLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    textAlign: "center",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sosOverviewItem: {
    backgroundColor: "#800000",
  },
  sosIconOverview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  aiBotSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiBotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  aiBotTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  aiBotPlaceholder: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  tcwsNoSignalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: 10,
  },
  tcwsNoSignalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
  },
  tcwsNoSignalContent: {
    flex: 1,
    minWidth: 0,
  },
  tcwsNoSignalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 2,
  },
  tcwsNoSignalText: {
    fontSize: 11,
    color: "#4ade80",
    fontWeight: "500",
  },
  tcwsNoSignalBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tcwsNoSignalBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16a34a",
    letterSpacing: 0.5,
  },
});
