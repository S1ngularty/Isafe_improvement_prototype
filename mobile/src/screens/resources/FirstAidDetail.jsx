import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft,
  Check,
  Info
} from "lucide-react-native";

const { width } = Dimensions.get('window');

const COLORS = {
  primary: "#800000",
  primaryLight: "#FDF2F2",
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
  success: "#10b981",
};

export default function FirstAidDetail({ route, navigation }) {
  const { tip } = route.params;
  const IconComponent = tip.icon;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{tip.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroContainer}>
          <Image 
            source={{ uri: tip.image }} 
            style={styles.heroImage} 
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          
          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={[styles.heroIconContainer, { backgroundColor: COLORS.primaryLight }]}>
              <IconComponent color={COLORS.primary} size={32} />
            </View>
            <Text style={styles.heroTitle}>{tip.title}</Text>
            <Text style={styles.heroSubtitle}>{tip.description}</Text>
          </View>
        </View>

        {/* Content Container - Overlapping the hero */}
        <View style={styles.contentContainer}>
          {/* Steps Section */}
          <View style={styles.stepsSection}>
            <Text style={styles.sectionTitle}>Steps to Follow</Text>
            
            {tip.steps.map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Info color={COLORS.primary} size={20} />
              <Text style={styles.sectionTitle}>Important Tips</Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipCheckbox}>
                <Check size={14} color={COLORS.white} />
              </View>
              <Text style={styles.tipText}>
                Always call emergency services before attempting first aid
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipCheckbox}>
                <Check size={14} color={COLORS.white} />
              </View>
              <Text style={styles.tipText}>
                If untrained, do not attempt complex procedures
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipCheckbox}>
                <Check size={14} color={COLORS.white} />
              </View>
              <Text style={styles.tipText}>
                Keep first aid kit well-stocked and accessible
              </Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipCheckbox}>
                <Check size={14} color={COLORS.white} />
              </View>
              <Text style={styles.tipText}>
                Consider taking a certified first aid course
              </Text>
            </View>
          </View>

          {/* Emergency Banner */}
          <View style={styles.emergencyBanner}>
            <View style={styles.emergencyBannerContent}>
              <Info size={20} color={COLORS.white} />
              <Text style={styles.emergencyBannerText}>
                In case of emergency, call 911 or local emergency services immediately
              </Text>
            </View>
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
    paddingBottom: 20,
  },
  heroContainer: {
    width: width,
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 0, 0, 0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentContainer: {
    marginTop: -30,
    paddingHorizontal: 16,
  },
  stepsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: COLORS.gray700,
    lineHeight: 20,
  },
  tipsSection: {
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
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  tipCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
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