import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
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
  successBg: "#dcfce7",
  successText: "#15803d",
};

const checklists = [
  {
    id: 1,
    title: "Home Emergency Kit",
    icon: "home",
    color: "#EF4444",
    items: [
      "Water (1 gallon per person per day for 3+ days)",
      "Non-perishable food for 3+ days",
      "First aid kit with medications",
      "Flashlight and extra batteries",
      "Battery or hand-crank powered radio",
      "Medication and medical equipment",
      "Documents in waterproof container (ID, insurance, deeds)",
      "Cash and credit cards",
      "Whistle for signaling",
      "Dust mask or N95 respirator",
      "Plastic sheeting and duct tape",
      "Moist towelettes and garbage bags",
    ],
  },
  {
    id: 2,
    title: "Evacuation Readiness",
    icon: "directions-run",
    color: "#F59E0B",
    items: [
      "Know your evacuation routes from home and work",
      "Practice evacuation drills with family",
      "Prepare bug-out bag with essentials",
      "Have car fueled to at least half-tank",
      "Know how to turn off utilities (gas, water, electricity)",
      "Have important documents in waterproof container",
      "Store copies of insurance policies and deeds",
      "Have pet carriers and supplies ready",
      "Plan meeting place for family members",
      "Establish out-of-area contact person",
      "Keep phone numbers written down",
      "Have sturdy shoes and clothing for each family member",
    ],
  },
  {
    id: 3,
    title: "Before Earthquake",
    icon: "public",
    color: "#3B82F6",
    items: [
      "Secure heavy furniture to walls",
      "Store breakables in low cabinets",
      "Identify safe spots in each room",
      "Know where main electrical panel is",
      "Know where water shut-off valve is",
      "Know where gas shut-off valve is",
      "Have earthquake insurance if possible",
      "Teach children how to 'Drop, Cover, Hold On'",
      "Practice earthquake drills monthly",
      "Keep sturdy shoes near bed",
      "Have flashlights accessible in each room",
      "Store water and food supplies",
    ],
  },
  {
    id: 4,
    title: "Before Typhoon/Storm",
    icon: "cloud",
    color: "#8B5CF6",
    items: [
      "Monitor weather forecasts regularly",
      "Stock up on non-perishable food and water",
      "Charge all electronic devices",
      "Fill bathtub with water",
      "Secure outdoor furniture",
      "Trim tree branches near house",
      "Check roof and gutters for damage",
      "Test backup power sources",
      "Have emergency supplies easily accessible",
      "Know your evacuation route",
      "Fill prescriptions in advance",
      "Have cash on hand",
    ],
  },
  {
    id: 5,
    title: "Before Flood",
    icon: "water",
    color: "#06B6D4",
    items: [
      "Know your flood risk zone",
      "Install backflow valve on sewer line",
      "Have sandbags or flood barriers ready",
      "Move valuables to higher levels",
      "Take photos of home and contents for insurance",
      "Have copies of insurance documents",
      "Know evacuation routes from your area",
      "Have emergency kit easily accessible",
      "Keep important documents waterproof",
      "Maintain emergency fund",
      "Identify high ground locations",
      "Store electrical equipment safely",
    ],
  },
  {
    id: 6,
    title: "Family Communication Plan",
    icon: "group",
    color: "#EC4899",
    items: [
      "Establish out-of-state contact person",
      "Write down contact numbers for all family members",
      "Have list of phone numbers written down",
      "Plan meeting place outside your neighborhood",
      "Teach children how to call emergency services",
      "Have photos of family members in wallet",
      "Program phone numbers in phones",
      "Establish text-based communication protocol",
      "Plan for different communication methods",
      "Ensure children know address and phone number",
      "Have code word for emergency communication",
      "Update contact list regularly",
    ],
  },
];

export default function EmergencyChecklist({ navigation }) {
  const [expandedId, setExpandedId] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  const toggleItem = (checklistId, itemIndex) => {
    const key = `${checklistId}-${itemIndex}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getCheckedCount = (checklistId) => {
    let count = 0;
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return 0;
    
    for (let i = 0; i < checklist.items.length; i++) {
      const key = `${checklistId}-${i}`;
      if (checkedItems[key]) count++;
    }
    return count;
  };

  const getProgressPercentage = (checklistId) => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist || checklist.items.length === 0) return 0;
    
    const checked = getCheckedCount(checklistId);
    return Math.round((checked / checklist.items.length) * 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Checklist</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Prepare for emergencies with these comprehensive checklists. Track your preparedness and stay safe.
        </Text>

        <View style={styles.emergencyBanner}>
          <MaterialIcons name="checklist" size={20} color={COLORS.white} />
          <Text style={styles.emergencyText}>Complete these checklists to ensure your family is prepared</Text>
        </View>

        {/* Checklists */}
        <View style={styles.checklistsContainer}>
          {checklists.map((checklist) => (
            <View key={checklist.id}>
              <Pressable
                style={styles.checklistCard}
                onPress={() => setExpandedId(expandedId === checklist.id ? null : checklist.id)}
              >
                <View style={styles.checklistHeader}>
                  <View style={[styles.checklistIconContainer, { backgroundColor: checklist.color }]}>
                    <MaterialIcons name={checklist.icon} size={24} color={COLORS.white} />
                  </View>
                  
                  <View style={styles.checklistTitleContainer}>
                    <Text style={styles.checklistTitle}>{checklist.title}</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${getProgressPercentage(checklist.id)}%`,
                              backgroundColor: checklist.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {getCheckedCount(checklist.id)}/{checklist.items.length}
                      </Text>
                    </View>
                  </View>

                  <MaterialIcons
                    name={expandedId === checklist.id ? "expand-less" : "expand-more"}
                    size={24}
                    color={COLORS.gray400}
                  />
                </View>

                {expandedId === checklist.id && (
                  <View style={styles.checklistContent}>
                    {checklist.items.map((item, index) => {
                      const isChecked = checkedItems[`${checklist.id}-${index}`];
                      return (
                        <Pressable
                          key={index}
                          style={styles.checklistItem}
                          onPress={() => toggleItem(checklist.id, index)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                backgroundColor: isChecked ? checklist.color : "transparent",
                                borderColor: checklist.color,
                              },
                            ]}
                          >
                            {isChecked && (
                              <MaterialIcons name="check" size={16} color={COLORS.white} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.itemText,
                              isChecked && styles.itemTextChecked,
                            ]}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Pressable>
            </View>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Preparedness Tips:</Text>
          <View style={styles.tipItem}>
            <MaterialIcons name="lightbulb" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.tipText}>Review and update checklists every 6 months</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcons name="lightbulb" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.tipText}>Practice evacuation routes with your family quarterly</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcons name="lightbulb" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.tipText}>Store emergency supplies in easily accessible locations</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcons name="lightbulb" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.tipText}>Keep important documents in waterproof containers</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialIcons name="lightbulb" size={16} color={COLORS.shieldPrimary} />
            <Text style={styles.tipText}>Check emergency supply expiration dates regularly</Text>
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
  checklistsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  checklistCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  checklistIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checklistTitleContainer: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray600,
    minWidth: 30,
  },
  checklistContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    backgroundColor: COLORS.gray50,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 18,
    paddingTop: 2,
  },
  itemTextChecked: {
    color: COLORS.gray500,
    textDecorationLine: "line-through",
  },
  tipsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.shieldPrimary,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.gray700,
    lineHeight: 18,
    paddingTop: 2,
  },
});
