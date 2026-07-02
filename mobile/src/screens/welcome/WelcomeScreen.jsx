import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

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
};

export default function WelcomeScreen({ navigation, onComplete }) {
  const handleGetStarted = async () => {
    // Mark welcome as shown and trigger state update in parent
    if (onComplete) {
      await onComplete();
    }
  };

  const features = [
    {
      icon: "notifications-active",
      title: "Emergency Alerts",
      description: "Get real-time alerts and evacuation orders.",
    },
    {
      icon: "opacity",
      title: "Flood Monitoring",
      description: "Monitor water levels in your area.",
    },
    {
      icon: "security",
      title: "Safety Resources",
      description: "Access guides, procedures and checklists.",
    },
    {
      icon: "group",
      title: "Stay Connected",
      description: "Report incidents and request help instantly.",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Red Gradient Background with Title */}
        <View style={styles.gradientContainer}>
          <LinearGradient
            colors={["#8B0000", "#b91c1c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Decorative dots pattern */}
            <View style={styles.dotsPattern}>
              {React.useMemo(() => {
                return [...Array(12)].map((_, i) => {
                  const top = (i * 37) % 100;
                  const left = (i * 61) % 100;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          top: `${top}%`,
                          left: `${left}%`,
                        },
                      ]}
                    />
                  );
                });
              }, [])}
            </View>

            <View style={styles.headerContent}>
              <Text style={styles.mainTitle}>Your Safety,</Text>
              <Text style={styles.mainTitle}>Our Priority</Text>
              <Text style={styles.subtitle}>
                Your community's disaster resilience platform.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <MaterialIcons
                  name={feature.icon}
                  size={28}
                  color={COLORS.shieldPrimary}
                />
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Get Started Button */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={COLORS.white}
              style={{ marginLeft: 8 }}
            />
          </Pressable>
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
  scrollContent: {
    paddingBottom: 30,
  },
  gradientContainer: {
    height: 280,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsPattern: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.15,
  },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
  },
  headerContent: {
    alignItems: "center",
    zIndex: 1,
  },
  mainTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    lineHeight: 48,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },
  featuresSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.shieldPrimary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(153, 27, 27, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  getStartedButton: {
    backgroundColor: COLORS.shieldPrimary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
});
