import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Pressable,
  Linking,
  StatusBar,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Building2,
  Users,
  Clock,
  Phone,
  ChevronUp,
  ChevronDown,
} from "lucide-react-native";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchRoute } from "../../services/routing.js";
import { stripHtml, stepIcon, formatDist } from "../../utils/geo.js";
import LEAFLET_HTML from "../../assets/leafletMapHtml.js";

const COLORS = {
  primary: "#800000",
  primaryLight: "#FDF2F2",
  green: "#15803d",
  yellow: "#d97706",
  red: "#ef4444",
  white: "#fff",
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
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
};

const EvacuationMapScreen = ({ route, navigation }) => {
  const { center, userLocation } = route?.params || {};
  const { showToast } = useToast();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const webViewRef = useRef(null);

  // Center will be checked after hooks

  const sendToMap = (type, payload) => {
    if (!webViewRef.current) return;
    const js = `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type, payload }))}});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;
    webViewRef.current.injectJavaScript(js);
  };

  const sendLocations = useCallback(() => {
    const locs = [
      {
        id: "self",
        lat: parseFloat(userLocation?.lat || 0),
        lng: parseFloat(userLocation?.lng || 0),
        name: "You",
        isSelf: true,
      },
      {
        id: "center",
        lat: parseFloat(center?.latitude || 0),
        lng: parseFloat(center?.longitude || 0),
        name: center?.name,
        isSelf: false,
        isDestination: true,
      },
    ];
    sendToMap("UPDATE_LOCATIONS", locs);
  }, [userLocation, center]);

  useEffect(() => {
    if (mapLoaded) {
      sendLocations();
      // Auto-route when map loads
      setTimeout(() => {
        handleRoute();
      }, 500);
    }
  }, [mapLoaded]);

  useEffect(() => {
    const t = setTimeout(() => {
      setMapLoaded((p) => {
        if (!p) showToast("Map failed to load", "error");
        return true;
      });
    }, 15000);
    return () => clearTimeout(t);
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "MAP_LOADED") {
        setMapLoaded(true);
        setTimeout(sendLocations, 300);
      }
    } catch (e) {}
  };

  const handleRoute = async () => {
    const slat = userLocation?.lat;
    const slng = userLocation?.lng;
    const dlat = parseFloat(center?.latitude || 0);
    const dlng = parseFloat(center?.longitude || 0);

    if (!slat || !slng || !dlat || !dlng) {
      showToast("Location not available", "error");
      return;
    }

    setRouteLoading(true);
    setRouteData(null);

    try {
      const result = await fetchRoute(slat, slng, dlat, dlng);
      if (result) {
        const label = `${result.distance_km} km · ~${result.duration_min} min to ${center?.name || "Destination"}`;
        sendToMap("SET_ROUTE", {
          coordinates: result.coordinates,
          label,
        });
        const stepsClean = (result.steps || []).map((s) => ({
          ...s,
          instruction: stripHtml(s.instruction),
        }));
        setRouteData({
          ...result,
          destinationName: center?.name,
          destinationLat: dlat,
          destinationLng: dlng,
          steps: stepsClean,
        });
        setShowSteps(true);
      } else {
        showToast("Route unavailable right now", "error");
      }
    } catch (err) {
      showToast("Failed to get route", "error");
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setShowSteps(false);
    sendToMap("CLEAR_ROUTE", {});
  }, []);

  useEffect(() => {
    if (!center) {
      navigation.goBack();
    }
  }, [center, navigation]);

  if (!center) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Evacuation Center</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Map */}
      {!mapLoaded && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML }}
        style={styles.map}
        originWhitelist={["*"]}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />

      {/* Center Info Card - Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />

        {/* Center Details */}
        <View style={styles.sheetContent}>
          <View style={styles.centerInfo}>
            <View style={styles.centerIconContainer}>
              <Building2 size={24} color={COLORS.white} />
            </View>
            <View style={styles.centerTextContainer}>
              <Text style={styles.centerName}>{center.name}</Text>
              <View style={styles.centerDistance}>
                <MapPin size={14} color={COLORS.gray500} />
                <Text style={styles.centerDistanceText}>
                  {center.distance_km} km from you
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    center.status === "Open" ? "#DCFCE7" : "#FEE2E2",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: center.status === "Open" ? "#15803d" : "#dc2626",
                  },
                ]}
              >
                {center.status || "Unknown"}
              </Text>
            </View>
          </View>

          {center.description && (
            <Text style={styles.centerDescription}>{center.description}</Text>
          )}

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Users size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Capacity</Text>
              <Text style={styles.detailValue}>
                {center.capacity || "N/A"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Clock size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>
                {center.distance_km} km
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Navigation size={20} color={COLORS.primary} />
              <Text style={styles.detailLabel}>Est. Time</Text>
              <Text style={styles.detailValue}>
                {routeData ? `${Math.round(routeData.duration_min)} min` : "Calculating..."}
              </Text>
            </View>
          </View>

          {/* Route Steps */}
          {routeData && routeData.steps && routeData.steps.length > 0 && (
            <View style={styles.stepsContainer}>
              <Pressable
                style={styles.stepsToggle}
                onPress={() => setShowSteps((v) => !v)}
              >
                <View style={styles.stepsToggleLeft}>
                  <Navigation size={16} color={COLORS.primary} />
                  <Text style={styles.stepsToggleText}>
                    {routeData.distance_km} km · ~{routeData.duration_min} min
                  </Text>
                </View>
                {showSteps ? (
                  <ChevronDown size={20} color={COLORS.gray500} />
                ) : (
                  <ChevronUp size={20} color={COLORS.gray500} />
                )}
              </Pressable>

              {showSteps && (
                <ScrollView
                  style={styles.stepsList}
                  showsVerticalScrollIndicator={false}
                >
                  {routeData.steps.map((step, i) => (
                    <View key={i} style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepBar,
                          {
                            backgroundColor:
                              i === 0
                                ? COLORS.green
                                : i === routeData.steps.length - 1
                                ? COLORS.gray400
                                : COLORS.gray200,
                          },
                        ]}
                      />
                      <Text style={styles.stepIcon}>
                        {stepIcon(step.maneuver_type, step.maneuver_modifier)}
                      </Text>
                      <Text style={styles.stepText} numberOfLines={2}>
                        {stripHtml(step.instruction)}
                      </Text>
                      <Text style={styles.stepDist}>
                        {formatDist(step.distance_m)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {routeLoading ? (
              <View style={styles.loadingButton}>
                <ActivityIndicator color={COLORS.white} size="small" />
                <Text style={styles.loadingButtonText}>Finding route...</Text>
              </View>
            ) : (
              <>
                <Pressable
                  style={styles.directionsButton}
                  onPress={handleRoute}
                >
                  <Navigation size={20} color={COLORS.white} />
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </Pressable>

                {routeData && (
                  <Pressable
                    style={styles.clearButton}
                    onPress={clearRoute}
                  >
                    <Text style={styles.clearButtonText}>Clear Route</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Call Emergency */}
          <Pressable
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:911`)}
          >
            <Phone size={18} color={COLORS.primary} />
            <Text style={styles.callButtonText}>Call Emergency (911)</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    backgroundColor: COLORS.primary,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  map: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 12,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray300,
    alignSelf: "center",
    marginTop: 10,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  centerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  centerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTextContainer: {
    flex: 1,
  },
  centerName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  centerDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  centerDistanceText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  centerDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 19,
    marginTop: 10,
    paddingLeft: 56,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  detailItem: {
    alignItems: "center",
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  stepsContainer: {
    marginTop: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    overflow: "hidden",
  },
  stepsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stepsToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepsToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray700,
  },
  stepsList: {
    maxHeight: 160,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
    gap: 10,
  },
  stepBar: {
    width: 2,
    height: 24,
    borderRadius: 1,
    marginTop: 4,
  },
  stepIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.green,
    width: 22,
    textAlign: "center",
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 17,
  },
  stepDist: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray500,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  directionsButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  directionsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  clearButton: {
    flex: 0.5,
    flexDirection: "row",
    backgroundColor: COLORS.gray100,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    color: COLORS.gray600,
    fontSize: 14,
    fontWeight: "600",
  },
  loadingButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    opacity: 0.7,
  },
  loadingButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  callButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  callButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EvacuationMapScreen;