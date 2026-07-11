import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { 
  ArrowLeft,
  MapPin,
  Navigation,
  Building2,
  Users,
  Clock,
  ChevronRight,
  AlertTriangle,
  WifiOff,
  RefreshCw,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import offlineMapService from "../../services/offlineMap.js";
import Skeleton from "../../components/Skeleton";

const COLORS = {
  primary: "#800000",
  primaryLight: "#FDF2F2",
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
  success: "#10b981",
  warning: "#f59e0b",
  yellow: "#d97706",
};

export default function EvacuationCentersScreen({ navigation }) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { isOnline, isOffline } = useOfflineSync();

  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [centers, setCenters] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const previousOnlineRef = useRef(isOnline);
  const navigationInProgressRef = useRef(false);

  const currentLat = location?.latitude ?? profile?.lat;
  const currentLng = location?.longitude ?? profile?.lng;

  // Fetch centers function
  const fetchCenters = useCallback(async (lat, lng) => {
    if (!lat || !lng) return;
    
    setLoadingCenters(true);
    try {
      const result = await offlineMapService.getEvacuationCentersWithOffline(
        Number(lat),
        Number(lng),
        5,
      );
      
      setCenters(Array.isArray(result.centers) ? result.centers : []);
      setUsingCachedData(result.fromCache);
      
      // Only show toast if using cached data while online (means server failed)
      if (result.fromCache && isOnline) {
        showToast("Using cached data - server unavailable", "info");
      }
    } catch (err) {
      // Fallback to cache
      const cachedCenters = await offlineMapService.getCachedEvacuationCenters();
      setCenters(Array.isArray(cachedCenters) ? cachedCenters : []);
      setUsingCachedData(true);
      
      if (isOnline) {
        showToast("Failed to load centers. Using cached data.", "error");
      }
    } finally {
      setLoadingCenters(false);
    }
  }, [isOnline]);

  // Get location
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingLocation(true);
        
        // Try profile location first
        if (profile?.lat && profile?.lng) {
          setLocation({
            latitude: Number(profile.lat),
            longitude: Number(profile.lng),
          });
          setLoadingLocation(false);
          return;
        }

        // If offline, try cached location
        if (isOffline) {
          const cachedLocation = await offlineMapService.getLastKnownLocation();
          if (cachedLocation && active) {
            setLocation({
              latitude: cachedLocation.latitude,
              longitude: cachedLocation.longitude,
            });
          }
          setLoadingLocation(false);
          return;
        }

        // Get fresh location if online
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (active) showToast("Location permission denied", "error");
          setLoadingLocation(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        if (active && loc) {
          setLocation(loc.coords);
          // Cache location in background
          offlineMapService.saveCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
          }).catch(console.log);
        }
      } catch (err) {
        if (active) {
          // Try cached location as fallback
          const cachedLocation = await offlineMapService.getLastKnownLocation();
          if (cachedLocation) {
            setLocation({
              latitude: cachedLocation.latitude,
              longitude: cachedLocation.longitude,
            });
          }
        }
      } finally {
        if (active) setLoadingLocation(false);
      }
    })();

    return () => { active = false; };
  }, [profile?.lat, profile?.lng]);

  // Fetch centers when location changes
  useEffect(() => {
    if (currentLat && currentLng) {
      fetchCenters(currentLat, currentLng);
    }
  }, [currentLat, currentLng, fetchCenters]);

  // Auto-refresh when coming back online
  useEffect(() => {
    const wasOffline = previousOnlineRef.current === false;
    const nowOnline = isOnline === true;
    previousOnlineRef.current = isOnline;

    // If we just came back online and were using cached data, refresh
    if (wasOffline && nowOnline && usingCachedData && currentLat && currentLng) {
      showToast("Back online - refreshing data...", "success");
      fetchCenters(currentLat, currentLng);
    }
  }, [isOnline, usingCachedData, currentLat, currentLng]);

  const handleCenterPress = useCallback((center) => {
    if (navigationInProgressRef.current) return;
    navigationInProgressRef.current = true;
    
    // Navigate immediately without waiting for route
    navigation.navigate("EvacuationMap", { 
      center,
      userLocation: { 
        lat: Number(currentLat), 
        lng: Number(currentLng) 
      }
    });
    
    // Reset navigation lock after a short delay
    setTimeout(() => {
      navigationInProgressRef.current = false;
    }, 500);
  }, [currentLat, currentLng, navigation]);

  const handleDirections = useCallback(async (center) => {
    if (!currentLat || !currentLng) {
      showToast("Location is not available yet", "info");
      return;
    }

    if (navigationInProgressRef.current) return;
    navigationInProgressRef.current = true;

    // Navigate immediately first (don't wait for route)
    navigation.navigate("EvacuationMap", { 
      center,
      userLocation: { 
        lat: Number(currentLat), 
        lng: Number(currentLng) 
      }
    });

    // Fetch route in background (will update map when ready)
    try {
      const result = await offlineMapService.fetchRouteWithOffline(
        Number(currentLat),
        Number(currentLng),
        Number(center.latitude),
        Number(center.longitude),
      );
      
      // Route will be handled by EvacuationMap screen
      if (!result && !isOffline) {
        showToast("Route calculation in progress...", "info");
      }
    } catch (err) {
      console.log("Route fetch error (non-blocking):", err.message);
    } finally {
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 500);
    }
  }, [currentLat, currentLng, isOffline, navigation]);

  const locationText = useMemo(() => {
    if (!currentLat || !currentLng) return "Locating...";
    return `${Number(currentLat).toFixed(4)}, ${Number(currentLng).toFixed(4)}`;
  }, [currentLat, currentLng]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Evacuation Centers</Text>
        <Pressable 
          style={styles.refreshButton}
          onPress={() => currentLat && currentLng && fetchCenters(currentLat, currentLng)}
        >
          <RefreshCw size={20} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color={COLORS.white} />
          <Text style={styles.offlineBannerText}>
            Offline Mode - Using cached data
          </Text>
        </View>
      )}

      {/* Using cached data while online banner (server issue) */}
      {usingCachedData && isOnline && (
        <View style={styles.cachedBanner}>
          <AlertTriangle size={16} color={COLORS.yellow} />
          <Text style={styles.cachedBannerText}>
            Using cached data - Tap refresh to retry
          </Text>
          <Pressable 
            style={styles.retryButton}
            onPress={() => currentLat && currentLng && fetchCenters(currentLat, currentLng)}
          >
            <RefreshCw size={14} color={COLORS.yellow} />
          </Pressable>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Badge */}
        <View style={styles.locationBadgeContainer}>
          <View style={styles.locationBadge}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>{locationText}</Text>
            {loadingLocation && (
              <ActivityIndicator size="small" color={COLORS.primary} />
            )}
          </View>
        </View>

        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTagline}>Find safe shelter near you</Text>
          <Text style={styles.introDescription}>
            {isOffline 
              ? "Showing cached evacuation centers. Data will refresh when back online."
              : "Nearest evacuation centers and assembly areas."
            }
          </Text>
        </View>

        {/* Loading State */}
        {loadingCenters ? (
          <View style={styles.list}>
            {[1, 2, 3].map((key) => (
              <View key={key} style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Skeleton width={44} height={44} borderRadius={12} />
                    <View style={styles.cardHeader}>
                      <Skeleton width={150} height={18} style={{ marginBottom: 4 }} />
                      <Skeleton width={80} height={14} />
                    </View>
                    <Skeleton width={20} height={20} />
                  </View>
                  <Skeleton width={200} height={14} style={{ marginTop: 10, marginLeft: 56 }} />
                  <View style={[styles.cardMeta, { marginTop: 10 }]}>
                    <Skeleton width={80} height={14} />
                    <Skeleton width={60} height={20} borderRadius={12} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : centers.length === 0 ? (
          <View style={styles.centered}>
            <AlertTriangle size={40} color={COLORS.gray400} />
            <Text style={styles.emptyTitle}>No centers found</Text>
            <Text style={styles.emptyText}>
              {isOffline 
                ? "No cached evacuation centers available. Connect to internet to download data."
                : "No evacuation centers found nearby."
              }
            </Text>
            <Pressable 
              style={styles.retryLoadButton}
              onPress={() => currentLat && currentLng && fetchCenters(currentLat, currentLng)}
            >
              <RefreshCw size={16} color={COLORS.primary} />
              <Text style={styles.retryLoadText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {centers.map((center) => (
              <Pressable
                key={center.id}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleCenterPress(center)}
              >
                {center.landmark_url ? (
                  <Image source={{ uri: center.landmark_url }} style={styles.cardImage} />
                ) : null}
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconWrap}>
                      <Building2 size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{center.name}</Text>
                      <View style={styles.cardDistance}>
                        <MapPin size={14} color={COLORS.gray500} />
                        <Text style={styles.cardDistanceText}>
                          {center.distance_km ? `${center.distance_km} km away` : "Distance N/A"}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color={COLORS.gray400} />
                  </View>

                  {center.description && (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {center.description}
                    </Text>
                  )}

                  <View style={styles.cardMeta}>
                    <View style={styles.cardMetaItem}>
                      <Users size={14} color={COLORS.gray500} />
                      <Text style={styles.cardMetaText}>
                        {center.capacity ? `${center.capacity} capacity` : "Capacity N/A"}
                      </Text>
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

                  <View style={styles.cardFooter}>
                    <Pressable 
                      style={styles.directionsButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDirections(center);
                      }}
                    >
                      <Navigation size={16} color={COLORS.primary} />
                      <Text style={styles.directionsText}>
                        Get Directions
                      </Text>
                    </Pressable>
                    <ChevronRight size={18} color={COLORS.gray400} />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyBannerContent}>
            <AlertTriangle size={20} color={COLORS.white} />
            <Text style={styles.emergencyBannerText}>
              In case of emergency, proceed to the nearest evacuation center immediately
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    backgroundColor: COLORS.primary,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 4,
    width: 24,
  },
  offlineBanner: {
    backgroundColor: COLORS.yellow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
  },
  offlineBannerText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  cachedBanner: {
    backgroundColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
  },
  cachedBannerText: {
    color: COLORS.yellow,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  locationBadgeContainer: {
    marginBottom: 16,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.gray700,
    fontWeight: '600',
  },
  introContainer: {
    marginBottom: 16,
  },
  introTagline: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  introDescription: {
    fontSize: 14,
    color: COLORS.gray500,
    lineHeight: 20,
  },
  centered: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray700,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  retryLoadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryLoadText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  list: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.gray200,
  },
  cardContent: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  cardDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cardDistanceText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 10,
    lineHeight: 19,
    marginLeft: 56,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 56,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
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
    fontWeight: '600',
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 56,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  directionsText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emergencyBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  emergencyBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emergencyBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    lineHeight: 18,
  },
});