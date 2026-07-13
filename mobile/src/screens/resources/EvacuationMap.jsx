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
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Building2,
  Clock,
  Phone,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  X,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useToast } from "../../context/ToastContext.jsx";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import offlineMapService from "../../services/offlineMap.js";
import { stripHtml, stepIcon, formatDist } from "../../utils/geo.js";
import LEAFLET_HTML from "../../assets/leafletMapHtml.js";
import Skeleton from "../../components/Skeleton";

// Fallback functions
const fallbackStripHtml = (str) => {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
};

const fallbackStepIcon = (type, modifier) => {
  const icons = {
    turn: { left: "↰", "slight left": "↰", "sharp left": "↰", right: "↱", "slight right": "↱", "sharp right": "↱", straight: "↑", uturn: "↩" },
    continue: { left: "↰", right: "↱", straight: "↑" },
    "new name": { default: "→" },
    merge: { default: "→" },
    roundabout: { default: "⟳" },
    fork: { left: "↰", right: "↱", straight: "↑" },
    depart: { default: "●" },
    arrive: { default: "◉" },
  };
  const group = icons[type] || {};
  return group[modifier] || group.default || "→";
};

const fallbackFormatDist = (m) => {
  if (!m) return "0m";
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
};

const safeStripHtml = typeof stripHtml === 'function' ? stripHtml : fallbackStripHtml;
const safeStepIcon = typeof stepIcon === 'function' ? stepIcon : fallbackStepIcon;
const safeFormatDist = typeof formatDist === 'function' ? formatDist : fallbackFormatDist;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
};

const EvacuationMapScreen = ({ route, navigation }) => {
  const { center, userLocation, preloadedRoute } = route?.params || {};
  const { showToast } = useToast();
  const { isOnline, isOffline } = useOfflineSync();

  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeData, setRouteData] = useState(preloadedRoute || null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const webViewRef = useRef(null);
  const mapLoadedRef = useRef(false);

  const sendToMap = useCallback((type, payload) => {
    if (!webViewRef.current) return;
    try {
      const js = `(function(){var e=new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type, payload }))}});document.dispatchEvent(e);window.dispatchEvent(e);})();true;`;
      webViewRef.current.injectJavaScript(js);
    } catch (e) {
      // Ignore injection errors
    }
  }, []);

  const sendLocations = useCallback(() => {
    if (!userLocation?.lat || !center?.latitude) return;
    
    const locs = [
      {
        id: "self",
        lat: parseFloat(userLocation.lat),
        lng: parseFloat(userLocation.lng),
        name: "You",
        isSelf: true,
        status: "safe",
      },
      {
        id: "center",
        lat: parseFloat(center.latitude),
        lng: parseFloat(center.longitude),
        name: center.name || "Evacuation Center",
        isSelf: false,
        isDestination: true,
        status: "safe",
      },
    ];
    sendToMap("UPDATE_LOCATIONS", locs);
  }, [userLocation, center, sendToMap]);

  const loadRouteOnMap = useCallback((routeResult) => {
    if (!routeResult?.coordinates) return;
    
    const label = `${routeResult.distance_km} km · ~${routeResult.duration_min} min to ${center?.name || "Destination"}`;
    sendToMap("SET_ROUTE", {
      coordinates: routeResult.coordinates,
      label,
    });
  }, [center, sendToMap]);

  const fitMapBounds = useCallback(() => {
    if (userLocation?.lat && center?.latitude) {
      sendToMap("FIT_BOUNDS", {
        points: [
          { lat: parseFloat(userLocation.lat), lng: parseFloat(userLocation.lng) },
          { lat: parseFloat(center.latitude), lng: parseFloat(center.longitude) }
        ]
      });
    }
  }, [userLocation, center, sendToMap]);

  useEffect(() => {
    if (mapLoaded) {
      sendLocations();
      fitMapBounds();
      
      if (preloadedRoute) {
        loadRouteOnMap(preloadedRoute);
        setShowSteps(true);
        setSheetExpanded(true);
      } else {
        // Auto-fetch route when map loads
        setTimeout(() => {
          handleGetRoute();
        }, 800);
      }
    }
  }, [mapLoaded]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!mapLoadedRef.current) {
        setMapLoaded(true);
      }
    }, 10000);
    return () => clearTimeout(t);
  }, []);

  const handleWebViewMessage = (event) => {
    try {
      const d = JSON.parse(event.nativeEvent.data);
      if (d.type === "MAP_LOADED") {
        mapLoadedRef.current = true;
        setMapLoaded(true);
        setTimeout(() => {
          sendLocations();
          fitMapBounds();
        }, 500);
      }
    } catch (e) {}
  };

  const handleGetRoute = async () => {
    let slat = parseFloat(userLocation?.lat || 0);
    let slng = parseFloat(userLocation?.lng || 0);
    const dlat = parseFloat(center?.latitude || 0);
    const dlng = parseFloat(center?.longitude || 0);

    // If no current location, try to get last known location
    if ((!slat || !slng) && isOffline) {
      try {
        const lastLocation = await offlineMapService.getLastKnownLocation();
        if (lastLocation) {
          slat = lastLocation.latitude;
          slng = lastLocation.longitude;
          showToast("Using last known location", "info");
        }
      } catch (e) {
        // Ignore
      }
    }

    if (!slat || !slng || !dlat || !dlng) {
      showToast("Location coordinates not available", "error");
      return;
    }

    setRouteLoading(true);

    try {
      console.log("Fetching route:", { slat, slng, dlat, dlng, isOnline });
      
      const result = await offlineMapService.fetchRouteWithOffline(slat, slng, dlat, dlng);
      
      if (result && result.coordinates) {
        const stepsClean = (result.steps || []).map((s) => ({
          ...s,
          instruction: safeStripHtml(s.instruction),
        }));
        
        const routeWithSteps = {
          ...result,
          destinationName: center?.name,
          destinationLat: dlat,
          destinationLng: dlng,
          steps: stepsClean,
        };
        
        setRouteData(routeWithSteps);
        loadRouteOnMap(routeWithSteps);
        setShowSteps(true);
        setSheetExpanded(true);
        
        if (result.fromCache) {
          showToast("Using cached route", "info");
        } else {
          // showToast("Route found", "success");
        }
      } else {
        showToast("Could not calculate route", "error");
      }
    } catch (err) {
      console.error("Route error:", err);
      showToast("Failed to get route", "error");
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setShowSteps(false);
    setSheetExpanded(false);
    sendToMap("CLEAR_ROUTE", {});
    setTimeout(fitMapBounds, 300);
  }, [sendToMap, fitMapBounds]);

  const handleOpenExternalMap = useCallback(() => {
    if (!userLocation?.lat || !center?.latitude) return;
    const url = `https://www.openstreetmap.org/directions?from=${userLocation.lat}%2C${userLocation.lng}&to=${center.latitude}%2C${center.longitude}`;
    Linking.openURL(url).catch(() => {});
  }, [userLocation, center]);

  const handleCallEmergency = useCallback(() => {
    Linking.openURL(`tel:911`).catch(() => {});
  }, []);

  if (!center) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const bottomSheetHeight = sheetExpanded ? SCREEN_HEIGHT * 0.45 : SCREEN_HEIGHT * 0.25;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {center.name || "Evacuation Center"}
        </Text>
        <View style={styles.headerRight}>
          <View style={styles.connectivityBadge}>
            {isOnline ? (
              <Wifi size={16} color={COLORS.green} />
            ) : (
              <WifiOff size={16} color={COLORS.yellow} />
            )}
          </View>
          <Pressable style={styles.headerButton} onPress={fitMapBounds}>
            <RotateCcw color={COLORS.white} size={20} />
          </Pressable>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color={COLORS.white} />
          <Text style={styles.offlineBannerText}>
            Offline - Using cached data
          </Text>
        </View>
      )}

      {/* Map */}
      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML }}
        style={styles.map}
        originWhitelist={["*"]}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onError={() => {
          setMapLoaded(true);
        }}
      />

      {!mapLoaded && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {/* FABs */}
      <View style={styles.fabContainer}>
        <Pressable style={styles.fab} onPress={handleGetRoute} disabled={routeLoading}>
          {routeLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Navigation size={20} color={COLORS.white} />
          )}
        </Pressable>
        {routeData && (
          <Pressable style={[styles.fab, { backgroundColor: COLORS.green }]} onPress={handleOpenExternalMap}>
            <ExternalLink size={20} color={COLORS.white} />
          </Pressable>
        )}
        {routeData && (
          <Pressable style={[styles.fab, { backgroundColor: COLORS.gray600 }]} onPress={clearRoute}>
            <X size={20} color={COLORS.white} />
          </Pressable>
        )}
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { height: bottomSheetHeight }]}>
        <Pressable 
          style={styles.sheetHandleContainer}
          onPress={() => setSheetExpanded(!sheetExpanded)}
        >
          <View style={styles.sheetHandle} />
        </Pressable>

        <ScrollView 
          style={styles.sheetContent} 
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Center Info */}
          <View style={styles.centerInfo}>
            <View style={styles.centerIconContainer}>
              <Building2 size={24} color={COLORS.white} />
            </View>
            <View style={styles.centerTextContainer}>
              <Text style={styles.centerName} numberOfLines={1}>{center.name}</Text>
              <View style={styles.centerDistance}>
                <MapPin size={14} color={COLORS.gray500} />
                <Text style={styles.centerDistanceText}>
                  {center.distance_km ? `${center.distance_km} km away` : "Distance N/A"}
                </Text>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              { backgroundColor: center.status === 'Open' ? '#DCFCE7' : '#FEE2E2' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: center.status === 'Open' ? '#15803d' : '#dc2626' }
              ]}>
                {center.status || "Unknown"}
              </Text>
            </View>
          </View>

          {/* Route Info */}
          {(sheetExpanded || routeData) && routeData && (
            <>
              {routeData.fromCache && (
                <View style={styles.cacheIndicator}>
                  <WifiOff size={14} color={COLORS.yellow} />
                  <Text style={styles.cacheIndicatorText}>
                    Cached route
                  </Text>
                </View>
              )}

              <View style={styles.routeInfoContainer}>
                <View style={styles.routeInfoGrid}>
                  <View style={styles.routeInfoItem}>
                    <Clock size={18} color={COLORS.primary} />
                    <Text style={styles.routeInfoLabel}>Est. Time</Text>
                    <Text style={styles.routeInfoValue}>
                      {Math.round(routeData.duration_min)} min
                    </Text>
                  </View>
                  <View style={styles.routeInfoItem}>
                    <MapPin size={18} color={COLORS.primary} />
                    <Text style={styles.routeInfoLabel}>Distance</Text>
                    <Text style={styles.routeInfoValue}>
                      {routeData.distance_km} km
                    </Text>
                  </View>
                </View>
              </View>

              {/* Steps */}
              {routeData?.steps && routeData.steps.length > 0 && (
                <View style={styles.stepsContainer}>
                  <Pressable
                    style={styles.stepsToggle}
                    onPress={() => setShowSteps((v) => !v)}
                  >
                    <View style={styles.stepsToggleLeft}>
                      <Navigation size={16} color={COLORS.primary} />
                      <Text style={styles.stepsToggleText}>
                        Directions ({routeData.steps.length} steps)
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
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {routeData.steps.map((step, i) => (
                        <View key={i} style={styles.stepItem}>
                          <View style={styles.stepBarContainer}>
                            <View style={[
                              styles.stepBar,
                              { backgroundColor: i === 0 ? COLORS.green : COLORS.gray300 }
                            ]} />
                          </View>
                          <View style={styles.stepContent}>
                            <Text style={styles.stepText} numberOfLines={2}>
                              <Text style={styles.stepIcon}>
                                {safeStepIcon(step.maneuver_type, step.maneuver_modifier)}{" "}
                              </Text>
                              {safeStripHtml(step.instruction)}
                            </Text>
                            <Text style={styles.stepDist}>
                              {safeFormatDist(step.distance_m)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </>
          )}

          {/* Loading */}
          {routeLoading && (
            <View style={styles.routeLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.routeLoadingText}>
                Calculating route...
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <Pressable 
              style={[styles.directionsButton, routeLoading && styles.buttonDisabled]} 
              onPress={handleGetRoute}
              disabled={routeLoading}
            >
              <Navigation size={20} color={COLORS.white} />
              <Text style={styles.directionsButtonText}>
                {routeData ? "Refresh" : "Get Directions"}
              </Text>
            </Pressable>

            <Pressable style={styles.callButton} onPress={handleCallEmergency}>
              <Phone size={18} color={COLORS.primary} />
              <Text style={styles.callButtonText}>Call 911</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a" },
  header: {
    backgroundColor: COLORS.primary,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: { padding: 8 },
  headerTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  connectivityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButton: { padding: 8 },
  offlineBanner: {
    backgroundColor: COLORS.yellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
  },
  offlineBannerText: { color: COLORS.white, fontSize: 12, fontWeight: "600" },
  map: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(26, 26, 26, 0.9)",
    zIndex: 10,
  },
  loadingText: { color: COLORS.white, fontSize: 14, marginTop: 12, fontWeight: "500" },
  fabContainer: { position: "absolute", right: 12, top: 72, gap: 8, zIndex: 5 },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  sheetHandleContainer: { alignItems: "center", paddingVertical: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.gray300 },
  sheetContent: { paddingHorizontal: 16, paddingBottom: 20 },
  centerInfo: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  centerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  centerTextContainer: { flex: 1 },
  centerName: { fontSize: 16, fontWeight: "700", color: COLORS.gray900 },
  centerDistance: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  centerDistanceText: { fontSize: 12, color: COLORS.gray500 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "600" },
  cacheIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  cacheIndicatorText: { fontSize: 11, color: COLORS.yellow, fontWeight: "500", flex: 1 },
  routeInfoContainer: { padding: 12, backgroundColor: COLORS.primaryLight, borderRadius: 10, marginBottom: 10 },
  routeInfoGrid: { flexDirection: "row", justifyContent: "space-around" },
  routeInfoItem: { alignItems: "center", gap: 4 },
  routeInfoLabel: { fontSize: 11, color: COLORS.gray500, fontWeight: "500" },
  routeInfoValue: { fontSize: 16, fontWeight: "700", color: COLORS.gray900 },
  stepsContainer: { backgroundColor: COLORS.gray50, borderRadius: 10, overflow: "hidden", marginBottom: 10 },
  stepsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stepsToggleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepsToggleText: { fontSize: 13, fontWeight: "600", color: COLORS.gray700 },
  stepsList: { maxHeight: 200, paddingHorizontal: 14, paddingBottom: 8 },
  stepItem: { flexDirection: "row", paddingVertical: 6, gap: 10 },
  stepBarContainer: { width: 20, alignItems: "center" },
  stepBar: { width: 3, flex: 1, borderRadius: 2 },
  stepContent: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  stepIcon: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  stepText: { flex: 1, fontSize: 12, color: COLORS.gray700, lineHeight: 17 },
  stepDist: { fontSize: 11, fontWeight: "600", color: COLORS.gray500, marginLeft: 8, marginTop: 2 },
  routeLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  routeLoadingText: { fontSize: 13, color: COLORS.gray600, fontWeight: "500" },
  actionsContainer: { flexDirection: "row", gap: 10, marginTop: 8 },
  directionsButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  directionsButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "600" },
  callButton: {
    flex: 0.4,
    flexDirection: "row",
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  callButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: "600" },
});

export default EvacuationMapScreen;