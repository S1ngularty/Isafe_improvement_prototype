import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Pressable, Image, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { fetchActiveAnnouncements } from "../services/announcements.js";

const COLORS = {
  shieldPrimary: "#991b1b",
  shieldDark: "#5c1010",
  white: "#fff",
  gray500: "#6b7280",
};

// Fallback announcements if DB is empty
const FALLBACK_ANNOUNCEMENTS = [
  {
    id: "1",
    title: "Stay Alert During Typhoon Season",
    description: "Be prepared for severe weather",
    type: "image",
  },
  {
    id: "2",
    title: "Emergency Hotlines Available",
    description: "Call for immediate assistance",
    type: "image",
  },
  {
    id: "3",
    title: "Community Safety Updates",
    description: "Latest news from your barangay",
    type: "image",
  },
  {
    id: "4",
    title: "Evacuation Drills Scheduled",
    description: "Participate in safety training",
    type: "image",
  },
  {
    id: "5",
    title: "Report Emergencies Quickly",
    description: "Use the SOS button on dashboard",
    type: "image",
  },
];

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();

    // Auto-rotate every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % (announcements.length || FALLBACK_ANNOUNCEMENTS.length));
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  const loadAnnouncements = async () => {
    try {
      const data = await fetchActiveAnnouncements();
      setAnnouncements(data.length > 0 ? data : FALLBACK_ANNOUNCEMENTS);
    } catch (error) {
      console.error("[AnnouncementBanner] Error loading announcements:", error);
      setAnnouncements(FALLBACK_ANNOUNCEMENTS);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.white} />
      </View>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex];

  return (
    <View style={styles.container}>
      {/* Gradient overlay */}
      <View style={styles.gradient} />

      {/* Content */}
      <View style={styles.content}>
        <MaterialIcons name="campaign" size={24} color={COLORS.white} />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.description} numberOfLines={1}>
            {current.description}
          </Text>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {announcements.map((_, index) => (
            <Pressable
              key={index}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
              onPress={() => setCurrentIndex(index)}
            />
          ))}
        </View>

        {/* Arrow navigation */}
        <View style={styles.arrows}>
          <Pressable
            onPress={() =>
              setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)
            }
          >
            <MaterialIcons name="chevron-left" size={20} color={COLORS.white} />
          </Pressable>
          <Pressable
            onPress={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
          >
            <MaterialIcons name="chevron-right" size={20} color={COLORS.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.shieldDark,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    height: 100,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.shieldDark,
    opacity: 0.85,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  description: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.9,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  dots: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    opacity: 0.4,
  },
  dotActive: {
    opacity: 1,
  },
  arrows: {
    flexDirection: "row",
    gap: 4,
  },
});
