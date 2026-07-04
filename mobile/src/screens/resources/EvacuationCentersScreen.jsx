import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
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
  AlertTriangle
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchNearestEvacuationAreas } from "../../services/evacuation.js";
import { fetchRoute } from "../../services/routing.js";
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
};

export default function EvacuationCentersScreen({ navigation }) {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [centers, setCenters] = useState([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loadingRouteId, setLoadingRouteId] = useState(null);

  const currentLat = location?.latitude ?? profile?.lat;
  const currentLng = location?.longitude ?? profile?.lng;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoadingLocation(true);
        if (profile?.lat && profile?.lng) {
          setLocation({
            latitude: Number(profile.lat),
            longitude: Number(profile.lng),
          });
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (active) {
            showToast("Location permission denied", "error");
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (active) {
          setLocation(loc.coords);
        }
      } catch (err) {
        if (active) {
          showToast("Unable to read location", "error");
        }
      } finally {
        if (active) {
          setLoadingLocation(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [profile?.lat, profile?.lng]);

  useEffect(() => {
    if (!currentLat || !currentLng) {
      setCenters([]);
      return;
    }

    let active = true;
    (async () => {
      try {
        setLoadingCenters(true);
        const data = await fetchNearestEvacuationAreas(
          Number(currentLat),
          Number(currentLng),
          5,
        );
        if (active) setCenters(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) setCenters([]);
      } finally {
        if (active) setLoadingCenters(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentLat, currentLng]);

  const handleCenterPress = (center) => {
    // Navigate to the map screen with center and user location data
    navigation.navigate("EvacuationMap", { 
      center,
      userLocation: { lat: currentLat, lng: currentLng }
    });
  };

  const handleDirections = async (center) => {
    if (!currentLat || !currentLng) {
      showToast("Location is not available yet", "info");
      return;
    }

    setLoadingRouteId(center.id);
    setSelectedRoute(null);

    try {
      const result = await fetchRoute(
        Number(currentLat),
        Number(currentLng),
        Number(center.latitude),
        Number(center.longitude),
      );
      if (result) {
        setSelectedRoute({
          ...result,
          name: center.name,
          distance_km: result.distance_km,
          duration_min: result.duration_min,
        });
        const url = `https://www.openstreetmap.org/directions?from=${currentLat}%2C${currentLng}&to=${center.latitude}%2C${center.longitude}`;
        await Linking.openURL(url);
      } else {
        showToast("Route unavailable right now", "error");
      }
    } catch (err) {
      showToast("Failed to prepare route", "error");
    } finally {
      setLoadingRouteId(null);
    }
  };

  const locationText = useMemo(() => {
    if (!currentLat || !currentLng) return "Using saved location";
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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Badge */}
        <View style={styles.locationBadgeContainer}>
          <View style={styles.locationBadge}>
            <MapPin size={16} color={COLORS.primary} />
            <Text style={styles.locationText}>{locationText}</Text>
          </View>
        </View>

        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTagline}>Find safe shelter near you</Text>
          <Text style={styles.introDescription}>
            Nearest evacuation centers and assembly areas
          </Text>
        </View>

        {/* Selected Route Banner */}
        {selectedRoute && (
          <View style={styles.routeBox}>
            <View style={styles.routeHeader}>
              <Navigation size={20} color={COLORS.primary} />
              <Text style={styles.routeTitle}>Route ready</Text>
            </View>
            <Text style={styles.routeDetail}>{selectedRoute.name}</Text>
            <View style={styles.routeMeta}>
              <View style={styles.routeMetaItem}>
                <Clock size={14} color={COLORS.gray500} />
                <Text style={styles.routeMetaText}>
                  ~{selectedRoute.duration_min} min
                </Text>
              </View>
              <View style={styles.routeMetaItem}>
                <MapPin size={14} color={COLORS.gray500} />
                <Text style={styles.routeMetaText}>
                  {selectedRoute.distance_km} km
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Loading State */}
        {loadingLocation || loadingCenters ? (
          <View style={styles.list}>
            {[1, 2, 3].map((key) => (
              <View key={key} style={styles.card}>
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
                <View style={styles.cardFooter}>
                  <Skeleton width={100} height={14} />
                  <Skeleton width={18} height={18} />
                </View>
              </View>
            ))}
          </View>
        ) : centers.length === 0 ? (
          <View style={styles.centered}>
            <AlertTriangle size={40} color={COLORS.gray400} />
            <Text style={styles.emptyTitle}>No centers found</Text>
            <Text style={styles.emptyText}>
              No evacuation centers found nearby. Try checking your location settings.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {centers.map((center) => (
              <Pressable
                key={center.id}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleCenterPress(center)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}>
                    <Building2 size={20} color={COLORS.white} />
                  </View>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{center.name}</Text>
                    <View style={styles.cardDistance}>
                      <MapPin size={14} color={COLORS.gray500} />
                      <Text style={styles.cardDistanceText}>
                        {center.distance_km} km away
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={COLORS.gray400} />
                </View>

                <Text style={styles.cardDescription}>
                  {center.description || "Emergency shelter and safe assembly area."}
                </Text>

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
                  <Text style={styles.cardAction}>
                    Tap to view on map
                  </Text>
                  <Navigation size={18} color={COLORS.primary} />
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
  routeBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  routeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray800,
  },
  routeDetail: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
    marginBottom: 6,
  },
  routeMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  routeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeMetaText: {
    fontSize: 12,
    color: COLORS.gray500,
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
  list: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  cardAction: {
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