import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  MAX_EMERGENCY_CONTACTS,
} from "../../services/contacts.js";
import Skeleton from "../../components/Skeleton";

const COLORS = {
  shieldPrimary: "#991b1b",
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
  green100: "#dcfce7",
  green600: "#16a34a",
  blue100: "#dbeafe",
  blue600: "#2563eb",
  red50: "#fef2f2",
  red600: "#dc2626",
};

export default function EmergencyContactsScreen({ navigation }) {
  const { showToast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formName, setFormName] = useState("");
  const [formNumber, setFormNumber] = useState("");

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmergencyContacts();
      setContacts(data);
    } catch (error) {
      showToast(error.message || "Failed to load contacts", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const openAddModal = () => {
    if (contacts.length >= MAX_EMERGENCY_CONTACTS) {
      showToast(`Maximum of ${MAX_EMERGENCY_CONTACTS} contacts reached`, "error");
      return;
    }
    setEditingContact(null);
    setFormName("");
    setFormNumber("");
    setModalVisible(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setFormName(contact.contact_name);
    setFormNumber(contact.contact_number);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    const number = formNumber.trim();

    if (!name) {
      showToast("Name is required", "error");
      return;
    }
    if (!number || number.length < 7) {
      showToast("Valid phone number is required", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingContact) {
        await updateEmergencyContact(editingContact, { name, number });
        showToast("Contact updated", "success");
      } else {
        await addEmergencyContact({ name, number });
        showToast("Contact added", "success");
      }
      setModalVisible(false);
      await loadContacts();
    } catch (error) {
      showToast(error.message || "Failed to save contact", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (contact) => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete ${contact.contact_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEmergencyContact(contact);
              showToast("Contact deleted", "success");
              await loadContacts();
            } catch (error) {
              showToast(error.message || "Failed to delete", "error");
            }
          },
        },
      ]
    );
  };

  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`).catch(() =>
      showToast("Unable to make call", "error")
    );
  };

  const handleSMS = (number) => {
    Linking.openURL(`sms:${number}`).catch(() =>
      showToast("Unable to open SMS", "error")
    );
  };

  const atLimit = contacts.length >= MAX_EMERGENCY_CONTACTS;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.gray900} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Counter */}
      <View style={styles.counterRow}>
        <View style={styles.counterBadge}>
          <MaterialIcons name="people" size={16} color={COLORS.shieldPrimary} />
          <Text style={styles.counterText}>
            {contacts.length} / {MAX_EMERGENCY_CONTACTS} contacts
          </Text>
        </View>
        <Pressable
          style={[styles.addButton, atLimit && styles.addButtonDisabled]}
          onPress={openAddModal}
          disabled={atLimit}
        >
          <MaterialIcons name="add" size={18} color={atLimit ? COLORS.gray400 : COLORS.white} />
          <Text style={[styles.addButtonText, atLimit && { color: COLORS.gray400 }]}>
            Add
          </Text>
        </Pressable>
      </View>

      {/* Contact List */}
      {loading ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.contactCard}>
              <View style={styles.contactLeft}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <View style={styles.contactInfo}>
                  <Skeleton width={120} height={15} style={{ marginBottom: 4 }} />
                  <Skeleton width={90} height={13} />
                </View>
              </View>
              <View style={styles.contactActions}>
                <Skeleton width={34} height={34} borderRadius={17} />
                <Skeleton width={34} height={34} borderRadius={17} />
                <Skeleton width={34} height={34} borderRadius={17} />
                <Skeleton width={34} height={34} borderRadius={17} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="contact-phone" size={56} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No Emergency Contacts</Text>
          <Text style={styles.emptySubtitle}>
            Add up to {MAX_EMERGENCY_CONTACTS} trusted contacts who can be reached during emergencies.
          </Text>
          <Pressable style={styles.emptyAddButton} onPress={openAddModal}>
            <MaterialIcons name="add" size={20} color={COLORS.white} />
            <Text style={styles.emptyAddButtonText}>Add First Contact</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {contacts.map((contact, index) => (
            <View key={contact.contact_id || contact.created_at || index} style={styles.contactCard}>
              <View style={styles.contactLeft}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>
                    {(contact.contact_name || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {contact.contact_name}
                  </Text>
                  <Text style={styles.contactNumber}>
                    {contact.contact_number}
                  </Text>
                </View>
              </View>

              <View style={styles.contactActions}>
                <Pressable
                  style={[styles.actionCircle, { backgroundColor: COLORS.green100 }]}
                  onPress={() => handleCall(contact.contact_number)}
                >
                  <MaterialIcons name="phone" size={18} color={COLORS.green600} />
                </Pressable>
                <Pressable
                  style={[styles.actionCircle, { backgroundColor: COLORS.blue100 }]}
                  onPress={() => handleSMS(contact.contact_number)}
                >
                  <MaterialIcons name="sms" size={18} color={COLORS.blue600} />
                </Pressable>
                <Pressable
                  style={[styles.actionCircle, { backgroundColor: COLORS.gray100 }]}
                  onPress={() => openEditModal(contact)}
                >
                  <MaterialIcons name="edit" size={18} color={COLORS.gray600} />
                </Pressable>
                <Pressable
                  style={[styles.actionCircle, { backgroundColor: COLORS.red50 }]}
                  onPress={() => handleDelete(contact)}
                >
                  <MaterialIcons name="delete" size={18} color={COLORS.red600} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.shieldPrimary} />
              </Pressable>
              <Text style={styles.modalTitle}>
                {editingContact ? "Edit Contact" : "Add Contact"}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Contact name"
                placeholderTextColor={COLORS.gray400}
                maxLength={100}
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formNumber}
                onChangeText={setFormNumber}
                placeholder="e.g. +639123456789"
                placeholderTextColor={COLORS.gray400}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>

            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingContact ? "Update Contact" : "Add Contact"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  counterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  counterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  counterText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray700,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.shieldPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.gray200,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray700,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.shieldPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  modalForm: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray700,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.gray900,
    backgroundColor: COLORS.gray50,
  },
  saveButton: {
    backgroundColor: COLORS.shieldPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
});
