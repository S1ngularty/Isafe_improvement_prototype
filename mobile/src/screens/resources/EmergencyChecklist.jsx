import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  ChevronRight,
  Shield,
  AlertTriangle,
  HomeIcon,
  Droplets,
  Wind,
  Users
} from "lucide-react-native";

const checklists = [
  {
    id: 1,
    title: "Home Emergency Kit",
    icon: Shield,
    color: "#EF4444",
    bgColor: "#FEF2F2",
    image: "https://www.mrcooper.com/blog/wp-content/uploads/2021/10/EmergencySurvivalKit_Blog.jpg",
    items: [
      "Water (1 gallon per person per day for 3+ days)",
      "Non-perishable food for 3+ days",
      "First aid kit with medications",
      "Flashlight and extra batteries",
      "Battery or hand-crank powered radio",
      "Medication and medical equipment",
      "Documents in waterproof container",
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
    icon: AlertTriangle,
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    image: "https://media.istockphoto.com/id/1363765782/photo/parents-explaining-to-their-children-how-to-use-the-radio-in-an-emergency.jpg?s=612x612&w=0&k=20&c=sNNBbr1-9GB-dewIVcWwknNqt2liGVRAH1s4F8s2OKc=",
    items: [
      "Know your evacuation routes from home and work",
      "Practice evacuation drills with family",
      "Prepare bug-out bag with essentials",
      "Have car fueled to at least half-tank",
      "Know how to turn off utilities",
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
    icon: HomeIcon,
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXmKBuS2qkINug0fgkO4SEKZdI-0Q1jbXTZQ&s",
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
    icon: Wind,
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    image: "https://i0.wp.com/mandry.club/wp-content/uploads/2025/03/The-typhoon-can-be-seen-very-well.webp?ssl=1",
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
    icon: Droplets,
    color: "#06B6D4",
    bgColor: "#ECFEFF",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400",
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
    icon: Users,
    color: "#EC4899",
    bgColor: "#FDF2F8",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400",
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

import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EmergencyChecklist({ navigation }) {
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("emergency_checklist");
        if (stored) setCheckedItems(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to load checklist:", err);
      }
    })();
  }, []);

  const updateCheckedItems = async (newItems) => {
    let toSave;
    if (typeof newItems === 'function') {
      setCheckedItems((prev) => {
        toSave = newItems(prev);
        AsyncStorage.setItem("emergency_checklist", JSON.stringify(toSave)).catch(console.error);
        return toSave;
      });
    } else {
      toSave = newItems;
      setCheckedItems(toSave);
      AsyncStorage.setItem("emergency_checklist", JSON.stringify(toSave)).catch(console.error);
    }
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

  const handleChecklistPress = (checklist) => {
    navigation.navigate("ChecklistDetail", { 
      checklist,
      checkedItems,
      setCheckedItems: updateCheckedItems 
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#800000" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Checklist</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTagline}>Stay prepared. Stay safe.</Text>
          <Text style={styles.introDescription}>
            Track your preparedness with these essential checklists.
          </Text>
        </View>

        {/* Checklist Cards */}
        <View style={styles.checklistContainer}>
          {checklists.map((checklist) => {
            const IconComponent = checklist.icon;
            const progress = getProgressPercentage(checklist.id);
            const checked = getCheckedCount(checklist.id);
            
            return (
              <Pressable
                key={checklist.id}
                style={styles.card}
                onPress={() => handleChecklistPress(checklist)}
              >
                <Image source={{ uri: checklist.image }} style={styles.cardImage} />
                
                <View style={styles.cardContent}>
                  <View style={styles.titleRow}>
                    <View style={[styles.iconContainer, { backgroundColor: checklist.bgColor }]}>
                      <IconComponent color={checklist.color} size={20} />
                    </View>
                    <Text style={styles.cardTitle}>{checklist.title}</Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: checklist.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {checked}/{checklist.items.length}
                    </Text>
                  </View>
                </View>

                <ChevronRight color="#A0A0A0" size={20} />
              </Pressable>
            );
          })}
        </View>

        {/* Tips Banner */}
        <View style={styles.tipsBanner}>
          <View style={styles.tipsTextContainer}>
            <Text style={styles.tipsTitle}>Preparedness Tips</Text>
            <Text style={styles.tipsSubtitle}>
              Review and update your <Text style={styles.highlightText}>checklists regularly.</Text>
            </Text>
          </View>
          <View style={styles.tipsIconContainer}>
            <Shield color="#800000" size={24} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#800000',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  introContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  introTagline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4A1515',
    marginBottom: 4,
  },
  introDescription: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
  },
  checklistContainer: {
    paddingHorizontal: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImage: {
    width: 90,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 30,
  },
  tipsBanner: {
    backgroundColor: '#FDF2F2',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F5E6E6',
  },
  tipsTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#800000',
    marginBottom: 2,
  },
  tipsSubtitle: {
    fontSize: 12,
    color: '#444444',
  },
  highlightText: {
    color: '#800000',
    fontWeight: '600',
  },
  tipsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5E6E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});