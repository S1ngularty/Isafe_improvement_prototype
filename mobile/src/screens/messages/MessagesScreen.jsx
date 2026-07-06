import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import useFamilyLocations from "../../hooks/useFamilyLocations";
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
};

export default function MessagesScreen({ navigation }) {
  const { family, loading } = useFamilyLocations();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Messages List */}
      <View style={styles.listContent}>
        {family?.id ? (
          <Pressable
            style={styles.messageItem}
            onPress={() => navigation.navigate("ChatScreen")}
          >
            <View style={styles.avatar}>
              <MaterialIcons name="group" size={24} color={COLORS.white} />
            </View>

            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageName}>{family.name || "Family Chat"}</Text>
              </View>
              <Text style={styles.messagePreview} numberOfLines={1}>
                Tap to view family messages
              </Text>
            </View>
          </Pressable>
        ) : !loading ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="mail-outline" size={48} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>No messages</Text>
            <Text style={styles.emptySubtitle}>
              Join or create a family to start chatting with them.
            </Text>
          </View>
        ) : (
          <View style={styles.messageItem}>
            <Skeleton width={48} height={48} borderRadius={24} />
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Skeleton width={120} height={16} />
              </View>
              <Skeleton width={200} height={13} style={{ marginTop: 4 }} />
            </View>
          </View>
        )}
      </View>
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
    fontWeight: "600",
    color: COLORS.gray900,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    flex: 1,
  },
  messageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  messageName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  messagePreview: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray500,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.gray400,
    textAlign: "center",
    maxWidth: 240,
  },
});
