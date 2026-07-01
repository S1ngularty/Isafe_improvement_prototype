import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft,
  Search,
  Heart,
  Droplets,
  AlertTriangle,
  Activity,
  Flame,
  Brain,
  ChevronRight,
  Info
} from "lucide-react-native";


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

const firstAidTips = [
  {
    id: 1,
    title: "CPR",
    description: "Learn how to perform CPR and save a life",
    image: "https://cprcare.com/wp-content/uploads/2020/11/how-to-perform-cpr-on-adults-1024x684.jpg.webp",
    icon: Heart,
    steps: [
      "Check responsiveness and call emergency services",
      "Place person on firm, flat surface",
      "Open airway by tilting head back slightly",
      "Give 30 chest compressions at least 2 inches deep",
      "Give 2 rescue breaths (if trained)",
      "Continue CPR until emergency personnel arrive or person revives",
      "If untrained, perform hands-only CPR (chest compressions only)",
      "Use an AED if available and follow voice prompts",
    ],
  },
  {
    id: 2,
    title: "Severe Bleeding",
    description: "Stop bleeding and prevent blood loss",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcGHW-xumiWJeP9QAsNaZzZm5YJlBvWEk7LA&s",
    icon: Droplets,
    steps: [
      "Call emergency services immediately",
      "Wash hands if possible or use gloves",
      "Apply direct pressure with clean cloth or bandage",
      "Maintain pressure for 10-15 minutes without lifting",
      "If blood soaks through, add another cloth on top",
      "Elevate the wound above heart level if possible",
      "Apply pressure to artery if bleeding doesn't stop",
      "Monitor for signs of shock",
    ],
  },
  {
    id: 3,
    title: "Choking",
    description: "Quick action to save someone from choking",
    image: "https://www.healthdigest.com/img/gallery/the-first-thing-you-should-do-if-you-see-somebody-choking/intro-1646328208.jpg",
    icon: AlertTriangle,
    steps: [
      "Encourage coughing if person can breathe or cough",
      "Perform Heimlich maneuver: stand behind person",
      "Place fist just above navel, below ribcage",
      "Grasp fist with other hand",
      "Push upward and inward with quick, upward thrusts",
      "Repeat until object is dislodged",
      "If person becomes unconscious, start CPR",
      "Call emergency if unsuccessful",
    ],
  },
  {
    id: 4,
    title: "Fractures & Sprains",
    description: "Handle broken bones and sprains safely",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkdwvx4c9HslsTFpnSL7G8-ZnD0aj6M_1Qog&s",
    icon: Activity,
    steps: [
      "Immobilize the injured area - do not move it",
      "Apply ice wrapped in cloth for 20 minutes",
      "Elevate the injured limb above heart level",
      "Use compression bandage if available",
      "Take over-the-counter pain relief if needed",
      "Avoid using injured area",
      "Seek medical attention for severe pain or deformity",
      "Watch for signs of compartment syndrome",
    ],
  },
  {
    id: 5,
    title: "Burns",
    description: "Treat burns and prevent complications",
    image: "https://images.apollo247.in/pd-cms/cms/2025-12/First%20Aid%20for%20Burns%20Immediate%20Actions%20and%20Home%20Care.webp",
    icon: Flame,
    steps: [
      "Cool the burn with cool (not cold) water for 10-20 minutes",
      "Remove tight jewelry and clothing from burned area",
      "Do NOT apply ice directly to the burn",
      "Cover burn with sterile, non-stick dressing",
      "Take pain relief medication if needed",
      "Do NOT pop blisters",
      "Seek medical attention for severe burns",
      "Watch for signs of infection",
    ],
  },
  {
    id: 6,
    title: "Shock",
    description: "Recognize and manage shock effectively",
    image: "https://www.legalexpert.co.uk/wp-content/uploads/2021/03/electric-shock-claims.jpg",
    icon: Brain,
    steps: [
      "Call emergency services immediately",
      "Lay person down with legs elevated 12 inches",
      "Keep person warm with blankets or coat",
      "Do NOT give food or water",
      "Reassure the person and keep them calm",
      "Monitor breathing and pulse continuously",
      "Be prepared to perform CPR if needed",
      "Treat any obvious injuries",
    ],
  },
];

export default function FirstAidList({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTips = firstAidTips.filter((tip) =>
    tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tip.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTipPress = (tip) => {
    navigation.navigate("FirstAidDetail", { tip });
  };

  const getIconComponent = (icon) => {
    const IconMap = {
      Heart,
      Droplets,
      AlertTriangle,
      Activity,
      Flame,
      Brain,
    };
    return IconMap[icon.name] || Heart;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>First Aid</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTagline}>Be prepared. Act fast.</Text>
          <Text style={styles.introDescription}>
            Quick reference guide for common first aid situations
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={COLORS.gray400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search first aid topics..."
              placeholderTextColor={COLORS.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {filteredTips.length} {filteredTips.length === 1 ? "result" : "results"}
        </Text>

        {/* First Aid Tips List */}
        <View style={styles.tipsContainer}>
          {filteredTips.map((tip) => {
            const IconComponent = tip.icon;
            
            return (
              <Pressable
                key={tip.id}
                style={({ pressed }) => [styles.tipCard, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleTipPress(tip)}
              >
                <Image source={{ uri: tip.image }} style={styles.cardImage} />
                
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <View style={[styles.iconContainer, { backgroundColor: COLORS.primaryLight }]}>
                      <IconComponent color={COLORS.primary} size={20} />
                    </View>
                    <Text style={styles.cardTitle}>{tip.title}</Text>
                  </View>
                  
                  <Text style={styles.cardDescription}>{tip.description}</Text>
                  
                  <View style={styles.cardFooter}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{tip.steps.length} steps</Text>
                    </View>
                    <ChevronRight color={COLORS.gray400} size={20} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* No Results */}
        {filteredTips.length === 0 && (
          <View style={styles.noResults}>
            <Info size={40} color={COLORS.gray300} />
            <Text style={styles.noResultsTitle}>No results found</Text>
            <Text style={styles.noResultsText}>
              Try adjusting your search or browse all topics
            </Text>
          </View>
        )}

        {/* Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <View style={styles.emergencyBannerContent}>
            <AlertTriangle size={20} color={COLORS.white} />
            <Text style={styles.emergencyBannerText}>
              In case of emergency, call 911 or local emergency services immediately
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
  introDescription: {
    fontSize: 14,
    color: COLORS.gray500,
    lineHeight: 20,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray900,
    padding: 0,
  },
  clearText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 12,
    fontWeight: '500',
  },
  tipsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  tipCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    marginLeft: 42,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 42,
  },
  stepBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  noResultsText: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: 'center',
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