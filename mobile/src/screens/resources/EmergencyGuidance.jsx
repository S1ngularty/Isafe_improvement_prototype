import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft,
  ChevronRight,
  Phone,
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

const emergencyGuides = [
  {
    id: 1,
    title: "Earthquake Response",
    description: "Learn what to do during and after an earthquake",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXmKBuS2qkINug0fgkO4SEKZdI-0Q1jbXTZQ&s",
    steps: [
      "DROP immediately to hands and knees",
      "Take COVER under a sturdy desk, table, or against an interior wall",
      "HOLD ON until shaking stops - protect your head and neck",
      "Stay in place for at least one minute after shaking stops",
      "Check for hazards like broken glass or structural damage",
      "Exit building only if it's safe - avoid elevators",
      "Go to designated assembly point or open area",
      "Report any injuries or trapped persons to emergency services",
    ],
  },
  {
    id: 2,
    title: "Flood Emergency",
    description: "Essential steps to stay safe during flooding",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400",
    steps: [
      "Evacuate immediately to higher ground if flood warning issued",
      "Do NOT attempt to drive through flooded roads",
      "Move away from water sources and drainage areas",
      "Turn off gas and electricity if safe to do so",
      "Close windows and doors to slow water entry",
      "If trapped, move to highest point in building",
      "Signal for help from windows or roof",
      "Wait for rescue teams - do not attempt to swim",
      "Report location to emergency services if possible",
    ],
  },
  {
    id: 3,
    title: "Typhoon Preparation",
    description: "Prepare and stay safe during typhoons and hurricanes",
    image: "https://i0.wp.com/mandry.club/wp-content/uploads/2025/03/The-typhoon-can-be-seen-very-well.webp?ssl=1",
    steps: [
      "Monitor weather updates and emergency alerts",
      "Secure outdoor items that can become projectiles",
      "Stock emergency supplies: water, food, medication, flashlight",
      "Charge all electronic devices and backup power banks",
      "Fill bathtubs with water for emergency use",
      "Know your evacuation route and assembly point",
      "Stay indoors away from windows during storm",
      "Do NOT go outside during eye of typhoon - danger returns",
      "After storm, watch for hazards like downed power lines",
    ],
  },
  {
    id: 4,
    title: "Landslide Warning",
    description: "Recognize warning signs and respond to landslides",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTaK_VgqtMxCnJjOn-YgQdtpcqhuVEqMO4Vaw&s",
    steps: [
      "Evacuate immediately if ordered by authorities",
      "Move away from slopes and hillsides",
      "Do NOT wait for official evacuation order if signs appear",
      "Look for warning signs: new cracks, tilting trees, sounds",
      "Go to designated evacuation center or higher ground",
      "Take important documents and medications",
      "Avoid valleys and ravines where debris flows",
      "Do not return until authorities declare area safe",
    ],
  },
  {
    id: 5,
    title: "Fire Emergency",
    description: "Critical steps to survive a fire emergency",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4yGkQFm3hQgxVHpegx7xe33ADAEWgledLSg&s",
    steps: [
      "Alert others - shout 'FIRE!' to notify people nearby",
      "Leave the building immediately using nearest exit or stairs",
      "Do NOT use elevators - they may trap you",
      "If smoke is present, crawl low to avoid smoke inhalation",
      "Feel doors before opening - if hot, find another route",
      "Close doors behind you to slow fire and smoke spread",
      "Meet at predetermined assembly point",
      "Call emergency services and provide location details",
      "Do NOT re-enter building for any reason",
    ],
  },
  {
    id: 6,
    title: "Severe Weather",
    description: "Stay safe during storms and lightning",
    image: "https://s.yimg.com/ny/api/res/1.2/tJCXvvSpVV6EEQPWQWSwbA--/YXBwaWQ9aGlnaGxhbmRlcjt3PTEyMDA7aD04MTg7Y2Y9d2VicA--/https://media.zenfs.com/en/south_florida_sun_sentinel_national_820/e48a52192693f6a4d61928067517c2a6",
    steps: [
      "Go indoors or seek shelter in a substantial building",
      "Avoid contact with water and metal objects",
      "Stay away from windows and doors",
      "Unplug electrical appliances if safe to do so",
      "Do NOT use landline phones during lightning",
      "If caught outdoors, stay away from tall objects",
      "Crouch low with feet together if stuck outside",
      "Do NOT lie flat - get into crouching position",
      "Wait 30 minutes after last lightning before going outside",
    ],
  },
];

export default function EmergencyGuidance({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);
  const rotateAnimations = useRef({}).current;
  const opacityAnimations = useRef({}).current;
  const scrollViewRefs = useRef({}).current;

  const toggleGuide = (id) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    // Animate chevron rotation
    if (!rotateAnimations[id]) {
      rotateAnimations[id] = new Animated.Value(0);
    }
    const rotate = rotateAnimations[id];
    Animated.timing(rotate, {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate opacity
    if (!opacityAnimations[id]) {
      opacityAnimations[id] = new Animated.Value(0);
    }
    const opacity = opacityAnimations[id];
    Animated.timing(opacity, {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getRotation = (id) => {
    if (!rotateAnimations[id]) {
      rotateAnimations[id] = new Animated.Value(0);
    }
    return rotateAnimations[id].interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '90deg'],
    });
  };

  const getOpacity = (id) => {
    if (!opacityAnimations[id]) {
      opacityAnimations[id] = new Animated.Value(0);
    }
    return opacityAnimations[id];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Guidance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTagline}>Be prepared. Act smart.</Text>
        </View>

        {/* Emergency Guides */}
        <View style={styles.guidesContainer}>
          {emergencyGuides.map((guide) => {
            const isExpanded = expandedId === guide.id;
            const rotation = getRotation(guide.id);
            const opacity = getOpacity(guide.id);
            
            return (
              <View
                key={guide.id}
                style={[
                  styles.guideCard,
                  isExpanded && styles.guideCardExpanded
                ]}
              >
                <Pressable
                  onPress={() => toggleGuide(guide.id)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: guide.image }} style={styles.cardImage} />
                  
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <View style={[styles.iconContainer, { backgroundColor: COLORS.primaryLight }]}>
                        <View style={[styles.colorDot, { backgroundColor: COLORS.primary }]} />
                      </View>
                      <Text style={styles.cardTitle}>{guide.title}</Text>
                      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        <ChevronRight color={COLORS.gray400} size={20} />
                      </Animated.View>
                    </View>
                    
                    <Text style={styles.cardDescription}>{guide.description}</Text>
                  </View>
                </Pressable>

                <Animated.View style={[
                  styles.expandedContentWrapper,
                  {
                    opacity: isExpanded ? opacity : 0,
                    maxHeight: isExpanded ? 300 : 0,
                    overflow: 'hidden',
                  }
                ]}>
                  <ScrollView
                    ref={(ref) => {
                      if (ref) scrollViewRefs[guide.id] = ref;
                    }}
                    style={styles.expandedContentScroll}
                    contentContainerStyle={styles.expandedContent}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={isExpanded}
                    nestedScrollEnabled={true}
                  >
                    {guide.steps.map((step, index) => (
                      <View key={index} style={styles.stepItem}>
                        <View style={[styles.stepNumber, { backgroundColor: COLORS.primary }]}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </Animated.View>
              </View>
            );
          })}
        </View>

        {/* Key Reminders */}
        <View style={styles.remindersSection}>
          <Text style={styles.sectionTitle}>Key Reminders</Text>
          
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <Check size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Know your evacuation route before an emergency occurs</Text>
          </View>
          
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <Check size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Have an emergency contact list and supplies ready</Text>
          </View>
          
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <Check size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Follow instructions from emergency personnel</Text>
          </View>
          
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <Check size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Stay informed through official emergency alerts</Text>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Emergency Numbers</Text>
          
          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <Phone size={20} color={COLORS.white} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Emergency Services</Text>
              <Text style={styles.contactNumber}>911 or 112</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: COLORS.primary }]}>
              <Phone size={20} color={COLORS.white} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Disaster Response</Text>
              <Text style={styles.contactNumber}>Local City/Municipality</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <View style={[styles.contactIconContainer, { backgroundColor: COLORS.success }]}>
              <Phone size={20} color={COLORS.white} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Medical Emergency</Text>
              <Text style={styles.contactNumber}>Local Hospital / Ambulance</Text>
            </View>
          </View>
        </View>

        {/* Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyBannerContent}>
            <Info size={20} color={COLORS.white} />
            <Text style={styles.emergencyBannerText}>
              Stay calm and call emergency services immediately
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
  introContainer: {
    marginBottom: 16,
  },
  introTagline: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  guidesContainer: {
    gap: 12,
    marginBottom: 16,
  },
  guideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guideCardExpanded: {
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.gray200,
  },
  cardContent: {
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
    marginLeft: 38,
    marginBottom: 0,
  },
  expandedContentWrapper: {
    marginLeft: 38,
  },
  expandedContentScroll: {
    maxHeight: 280,
  },
  expandedContent: {
    paddingTop: 12,
    paddingBottom: 4,
    paddingRight: 14,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray700,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 12,
  },
  remindersSection: {
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
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  reminderCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
  },
  contactSection: {
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  contactNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray900,
    marginTop: 1,
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