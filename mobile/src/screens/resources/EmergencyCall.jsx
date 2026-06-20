import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
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

const supportServices = [
  {
    id: 1,
    title: "Shelter Assistance",
    description: "Find safe shelter and displacement information",
    icon: "home",
    color: "#EF4444",
  },
  {
    id: 2,
    title: "Food Relief",
    description: "Request food assistance and meals",
    icon: "restaurant",
    color: "#F59E0B",
  },
  {
    id: 3,
    title: "Emotional Health Support",
    description: "Mental health counseling and support",
    icon: "group",
    color: "#EC4899",
  },
  {
    id: 4,
    title: "Medical Alerts",
    description: "Get notified about local health threats",
    icon: "warning",
    color: "#F97316",
  },
];

export default function EmergencyCall({ navigation }) {
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleRequestService = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const submitRequest = () => {
    setRequestSubmitted(true);
    setTimeout(() => {
      setModalVisible(false);
      setRequestSubmitted(false);
      setSelectedService(null);
      Alert.alert(
        "Request Submitted",
        `Your ${selectedService?.title} request has been submitted. A responder will contact you shortly.`,
        [{ text: "OK" }]
      );
    }, 1500);
  };

  const handleSOS = () => {
    Alert.alert(
      "Emergency Alert",
      "Send real-time emergency alert to all responders?",
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Send Alert",
          onPress: () => {
            Alert.alert(
              "Alert Sent",
              "Your emergency alert has been sent to all nearby responders."
            );
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Safety App</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Need Help Section */}
        <View style={styles.needHelpSection}>
          <Text style={styles.needHelpTitle}>Need Help?</Text>
          <Text style={styles.needHelpSubtitle}>
            Request emergency or support services instantly
          </Text>

          {/* SOS Button */}
          <Pressable style={styles.sosButton} onPress={handleSOS}>
            <View style={styles.sosContent}>
              <MaterialIcons name="sos" size={40} color={COLORS.white} />
              <View style={styles.sosTextContainer}>
                <Text style={styles.sosLabel}>SOS</Text>
                <Text style={styles.sosDescription}>Low Alerts Emergency Reporting</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.white} />
          </Pressable>

          <Text style={styles.sosHint}>
            For police, fire, medical, or any incident, report in real-time
          </Text>
        </View>

        {/* Disaster Support Section */}
        <View style={styles.disasterSupportSection}>
          <View style={styles.disasterSupportHeader}>
            <Text style={styles.disasterSupportTitle}>Access to Disaster Support</Text>
            <Pressable>
              <Text style={styles.viewAllLink}>View all services</Text>
            </Pressable>
          </View>

          {supportServices.map((service) => (
            <View key={service.id} style={styles.supportCard}>
              <View style={styles.supportCardContent}>
                <View style={[styles.supportIconContainer, { backgroundColor: service.color }]}>
                  <MaterialIcons name={service.icon} size={24} color={COLORS.white} />
                </View>
                <View style={styles.supportTextContainer}>
                  <Text style={styles.supportTitle}>{service.title}</Text>
                  <Text style={styles.supportDescription}>{service.description}</Text>
                </View>
              </View>
              <Pressable
                style={styles.requestButton}
                onPress={() => handleRequestService(service)}
              >
                <Text style={styles.requestButtonText}>Request</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Safe Zone Status */}
        <View style={styles.safeZoneSection}>
          <View style={styles.safeZoneContent}>
            <View style={styles.safeZoneIcon}>
              <MaterialIcons name="shield" size={32} color={COLORS.shieldPrimary} />
            </View>
            <View style={styles.safeZoneText}>
              <Text style={styles.safeZoneTitle}>You are in a Safe Zone</Text>
              <Text style={styles.safeZoneDescription}>
                Your location is currently safe. Stay alert and stay safe.
              </Text>
            </View>
          </View>
        </View>

        {/* Important Numbers */}
        <View style={styles.importantSection}>
          <Text style={styles.importantTitle}>Important Numbers to Remember:</Text>
          <View style={styles.numberItem}>
            <MaterialIcons name="phone" size={18} color={COLORS.shieldPrimary} />
            <View>
              <Text style={styles.numberLabel}>Emergency Services</Text>
              <Text style={styles.numberValue}>911 or 112</Text>
            </View>
          </View>
          <View style={styles.numberItem}>
            <MaterialIcons name="phone" size={18} color={COLORS.shieldPrimary} />
            <View>
              <Text style={styles.numberLabel}>Disaster Response Hotline</Text>
              <Text style={styles.numberValue}>Local Municipality Hotline</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !requestSubmitted && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!requestSubmitted ? (
              <>
                <Text style={styles.modalTitle}>Confirm Request</Text>
                <Text style={styles.modalDescription}>
                  You are requesting {selectedService?.title}
                </Text>
                <View style={[styles.modalIcon, { backgroundColor: selectedService?.color }]}>
                  <MaterialIcons
                    name={selectedService?.icon}
                    size={48}
                    color={COLORS.white}
                  />
                </View>
                <Text style={styles.modalDetails}>{selectedService?.description}</Text>
                <View style={styles.modalButtonContainer}>
                  <Pressable
                    style={styles.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalConfirmButton}
                    onPress={submitRequest}
                  >
                    <Text style={styles.modalConfirmText}>Submit Request</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.successIcon}>
                  <MaterialIcons name="check-circle" size={64} color={COLORS.successText} />
                </View>
                <Text style={styles.successTitle}>Request Submitted</Text>
                <Text style={styles.successDescription}>
                  Your {selectedService?.title} request has been received
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    backgroundColor: COLORS.shieldPrimary,
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Need Help Section
  needHelpSection: {
    marginBottom: 24,
  },
  needHelpTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  needHelpSubtitle: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 16,
  },
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.shieldPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 12,
  },
  sosContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sosTextContainer: {
    flex: 1,
  },
  sosLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  sosDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  sosHint: {
    fontSize: 12,
    color: COLORS.gray600,
    textAlign: "center",
  },

  // Disaster Support Section
  disasterSupportSection: {
    marginBottom: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  disasterSupportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  disasterSupportTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  viewAllLink: {
    fontSize: 12,
    color: COLORS.shieldPrimary,
    fontWeight: "600",
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  supportCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  supportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  supportTextContainer: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  supportDescription: {
    fontSize: 11,
    color: COLORS.gray600,
    marginTop: 2,
    lineHeight: 16,
  },
  requestButton: {
    borderWidth: 1,
    borderColor: COLORS.shieldPrimary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  requestButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
  },

  // Safe Zone Section
  safeZoneSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.successText,
  },
  safeZoneContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  safeZoneIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.successBg,
    justifyContent: "center",
    alignItems: "center",
  },
  safeZoneText: {
    flex: 1,
  },
  safeZoneTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  safeZoneDescription: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 2,
    lineHeight: 18,
  },

  // Important Numbers Section
  importantSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  importantTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 12,
  },
  numberItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  numberLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray700,
  },
  numberValue: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.shieldPrimary,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: "center",
    marginBottom: 16,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
  },
  modalDetails: {
    fontSize: 12,
    color: COLORS.gray700,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray700,
    textAlign: "center",
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.shieldPrimary,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.successText,
    marginBottom: 6,
  },
  successDescription: {
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: "center",
  },
});
