import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
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

const emergencyGuides = [
  {
    id: 1,
    title: "Earthquake Response",
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
    icon: "public",
    color: "#EF4444",
  },
  {
    id: 2,
    title: "Flood Emergency",
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
    icon: "water",
    color: "#3B82F6",
  },
  {
    id: 3,
    title: "Typhoon/Hurricane Preparation",
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
    icon: "cloud",
    color: "#8B5CF6",
  },
  {
    id: 4,
    title: "Landslide Warning",
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
    icon: "landscape",
    color: "#F59E0B",
  },
  {
    id: 5,
    title: "Fire Emergency",
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
    icon: "local-fire-department",
    color: "#DC2626",
  },
  {
    id: 6,
    title: "Severe Weather (Storms/Lightning)",
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
    icon: "cloud-queue",
    color: "#6B7280",
  },
];

export default function EmergencyGuidance({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Guidance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Essential guidelines for responding to different emergency situations. Follow local authority instructions and evacuation orders.
        </Text>

        <View style={styles.emergencyBanner}>
          <MaterialIcons name="warning" size={20} color={COLORS.white} />
          <Text style={styles.emergencyText}>In any emergency, stay calm and call 911 or local emergency services</Text>
        </View>

        {/* Emergency Guides */}
        <View style={styles.guidesContainer}>
          {emergencyGuides.map((guide) => (
            <Pressable
              key={guide.id}
              style={styles.guideCard}
              onPress={() => setExpandedId(expandedId === guide.id ? null : guide.id)}
            >
              <View style={styles.guideHeader}>
                <View style={[styles.guideIconContainer, { backgroundColor: guide.color }]}>
                  <MaterialIcons name={guide.icon} size={24} color={COLORS.white} />
                </View>
                <View style={styles.guideTitleContainer}>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                </View>
                <MaterialIcons
                  name={expandedId === guide.id ? "expand-less" : "expand-more"}
                  size={24}
                  color={COLORS.gray400}
                />
              </View>

              {expandedId === guide.id && (
                <View style={styles.guideContent}>
                  {guide.steps.map((step, index) => (
                    <View key={index} style={styles.step}>
                      <View style={[styles.stepBullet, { backgroundColor: guide.color }]} />
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Key Reminders */}
        <View style={styles.remindersSection}>
          <Text style={styles.remindersTitle}>Key Reminders:</Text>
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Know your evacuation route before an emergency occurs</Text>
          </View>
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Have an emergency contact list and supplies ready</Text>
          </View>
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Follow instructions from emergency personnel</Text>
          </View>
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Stay informed through official emergency alerts</Text>
          </View>
          <View style={styles.reminderItem}>
            <View style={styles.reminderCheckbox}>
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            </View>
            <Text style={styles.reminderText}>Help others evacuate safely if you can</Text>
          </View>
        </View>

        {/* Emergency Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Emergency Numbers to Remember:</Text>
          <View style={styles.contactItem}>
            <MaterialIcons name="phone" size={18} color={COLORS.shieldPrimary} />
            <View>
              <Text style={styles.contactLabel}>Emergency Services</Text>
              <Text style={styles.contactNumber}>911 or 112</Text>
            </View>
          </View>
          <View style={styles.contactItem}>
            <MaterialIcons name="phone" size={18} color={COLORS.shieldPrimary} />
            <View>
              <Text style={styles.contactLabel}>Disaster Response</Text>
              <Text style={styles.contactNumber}>Local City / Municipality Hotline</Text>
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
  guidesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  guideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  guideIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  guideTitleContainer: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  guideContent: {
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
    alignItems: "flex-start",
  },
  stepBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 18,
  },
  remindersSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.shieldPrimary,
  },
  remindersTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 12,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  reminderCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 18,
    paddingTop: 2,
  },
  contactSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderTopWidth: 3,
    borderTopColor: COLORS.shieldPrimary,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray700,
  },
  contactNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
    marginTop: 2,
  },
});
