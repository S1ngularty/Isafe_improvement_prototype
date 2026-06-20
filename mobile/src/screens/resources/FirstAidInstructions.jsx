import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
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

const firstAidTips = [
  {
    id: 1,
    title: "CPR (Cardiopulmonary Resuscitation)",
    steps: [
      "Check responsiveness and call emergency services",
      "Place person on firm, flat surface",
      "Open airway by tilting head back slightly",
      "Give 30 chest compressions at least 2 inches deep",
      "Give 2 rescue breaths (if trained)",
      "Continue CPR until emergency personnel arrive or person revives",
    ],
    icon: "favorite",
  },
  {
    id: 2,
    title: "Severe Bleeding",
    steps: [
      "Call emergency services immediately",
      "Wash hands if possible",
      "Apply direct pressure with clean cloth",
      "Maintain pressure for 10-15 minutes",
      "If blood soaks through, add another cloth on top",
      "Elevate the wound above heart level if possible",
      "Apply pressure to artery if bleeding doesn't stop",
    ],
    icon: "bloodtype",
  },
  {
    id: 3,
    title: "Choking",
    steps: [
      "Encourage coughing if person can breathe or cough",
      "Perform Heimlich maneuver: stand behind person",
      "Place fist just above navel, below ribcage",
      "Grasp fist with other hand",
      "Push upward and inward with quick, upward thrusts",
      "Repeat until object is dislodged",
      "Call emergency if unsuccessful",
    ],
    icon: "warning",
  },
  {
    id: 4,
    title: "Fractures & Sprains",
    steps: [
      "Immobilize the injured area",
      "Apply ice wrapped in cloth for 20 minutes",
      "Elevate the injured limb",
      "Use compression bandage if available",
      "Take over-the-counter pain relief",
      "Avoid using injured area",
      "Seek medical attention if severe",
    ],
    icon: "healing",
  },
  {
    id: 5,
    title: "Burns",
    steps: [
      "Cool the burn with cool (not cold) water for 10-20 minutes",
      "Remove tight jewelry and clothing",
      "Do NOT apply ice directly",
      "Cover burn with sterile, non-stick dressing",
      "Take pain relief medication if needed",
      "Do NOT pop blisters",
      "Seek medical attention for severe burns",
    ],
    icon: "local-fire-department",
  },
  {
    id: 6,
    title: "Shock",
    steps: [
      "Call emergency services immediately",
      "Lay person down with legs elevated 12 inches",
      "Keep person warm with blankets",
      "Do NOT give food or water",
      "Reassure the person and keep them calm",
      "Monitor breathing and pulse",
      "Be prepared to perform CPR if needed",
    ],
    icon: "psychology",
  },
];

export default function FirstAidInstructions({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>First Aid Instructions</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Quick reference guide for common first aid situations. Always call emergency services for serious injuries.
        </Text>

        <View style={styles.emergencyBanner}>
          <MaterialIcons name="emergency" size={20} color={COLORS.white} />
          <Text style={styles.emergencyText}>In case of emergency, always call 911 or local emergency services first</Text>
        </View>

        {/* First Aid Tips */}
        <View style={styles.tipsContainer}>
          {firstAidTips.map((tip) => (
            <Pressable
              key={tip.id}
              style={styles.tipCard}
              onPress={() => setExpandedId(expandedId === tip.id ? null : tip.id)}
            >
              <View style={styles.tipHeader}>
                <View style={styles.tipIconContainer}>
                  <MaterialIcons name={tip.icon} size={24} color={COLORS.white} />
                </View>
                <View style={styles.tipTitleContainer}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                </View>
                <MaterialIcons
                  name={expandedId === tip.id ? "expand-less" : "expand-more"}
                  size={24}
                  color={COLORS.gray400}
                />
              </View>

              {expandedId === tip.id && (
                <View style={styles.tipContent}>
                  {tip.steps.map((step, index) => (
                    <View key={index} style={styles.step}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Important Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Important Notes:</Text>
          <View style={styles.noteItem}>
            <MaterialIcons name="check" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.noteText}>Always call emergency services before attempting first aid</Text>
          </View>
          <View style={styles.noteItem}>
            <MaterialIcons name="check" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.noteText}>If untrained, do not attempt complex procedures</Text>
          </View>
          <View style={styles.noteItem}>
            <MaterialIcons name="check" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.noteText}>Keep first aid kit well-stocked and accessible</Text>
          </View>
          <View style={styles.noteItem}>
            <MaterialIcons name="check" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.noteText}>Consider taking a certified first aid course</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  introText: {
    fontSize: 13,
    color: COLORS.gray600,
    lineHeight: 20,
    marginBottom: 16,
  },
  emergencyBanner: {
    flexDirection: "row",
    backgroundColor: COLORS.shieldPrimary,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  emergencyText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
    lineHeight: 18,
  },
  tipsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  tipCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  tipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  tipTitleContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  tipContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: COLORS.gray50,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  step: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.white,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 18,
    paddingTop: 4,
  },
  notesSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.shieldPrimary,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 12,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 18,
    paddingTop: 2,
  },
});
