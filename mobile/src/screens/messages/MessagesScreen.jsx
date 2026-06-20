import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

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

// Sample messages
const SAMPLE_MESSAGES = [
  {
    id: "1",
    name: "Mom",
    avatar: "M",
    lastMessage: "Are you safe? I saw the news.",
    timestamp: "2 hours ago",
    unread: 2,
  },
  {
    id: "2",
    name: "Dad",
    avatar: "D",
    lastMessage: "Let me know when you're home",
    timestamp: "5 hours ago",
    unread: 0,
  },
  {
    id: "3",
    name: "Sister",
    avatar: "S",
    lastMessage: "Thanks for the update!",
    timestamp: "1 day ago",
    unread: 0,
  },
  {
    id: "4",
    name: "Emergency Services",
    avatar: "E",
    lastMessage: "Your alert was received",
    timestamp: "2 days ago",
    unread: 0,
  },
];

export default function MessagesScreen({ navigation }) {
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMessages = messages.filter((msg) =>
    msg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMessage = ({ item }) => (
    <Pressable style={styles.messageItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.avatar}</Text>
      </View>

      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageName}>{item.name}</Text>
          <Text style={styles.messageTime}>{item.timestamp}</Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Pressable style={styles.headerIcon}>
          <MaterialIcons name="add" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages"
          placeholderTextColor={COLORS.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <MaterialIcons name="close" size={20} color={COLORS.gray400} />
          </Pressable>
        )}
      </View>

      {/* Messages List */}
      {filteredMessages.length > 0 ? (
        <FlatList
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="mail-outline" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyTitle}>No messages</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery.length > 0
              ? "No conversations match your search"
              : "Start a conversation with family members"}
          </Text>
        </View>
      )}
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
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray100,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.gray900,
  },
  listContent: {
    paddingHorizontal: 16,
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
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
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
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  messageTime: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  messagePreview: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 16,
  },
  unreadBadge: {
    backgroundColor: COLORS.shieldPrimary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
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
