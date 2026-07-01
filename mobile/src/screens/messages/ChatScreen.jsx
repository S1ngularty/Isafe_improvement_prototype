import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import useFamilyLocations from "../../hooks/useFamilyLocations";
import {
  fetchFamilyMessages,
  sendFamilyMessage,
  subscribeToFamilyMessages,
} from "../../services/messages";

const COLORS = {
  primary: "#991b1b",
  white: "#ffffff",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray500: "#6b7280",
  gray800: "#1f2937",
  gray900: "#111827",
  bubbleMe: "#991b1b",
  bubbleThem: "#f3f4f6",
};

export default function ChatScreen({ navigation }) {
  const { session, profile } = useAuth();
  const { family, loading: familyLoading } = useFamilyLocations();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!family?.id) {
      if (!familyLoading) setLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        const data = await fetchFamilyMessages(family.id);
        setMessages(data);
      } catch (error) {
        console.error("Failed to load messages", error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to real-time messages
    subscriptionRef.current = subscribeToFamilyMessages(
      family.id,
      (newMsg) => {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [family?.id, familyLoading]);

  const handleSend = async () => {
    if (!newMessage.trim() || !family?.id || !session?.user?.id) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      await sendFamilyMessage(family.id, session.user.id, content);
    } catch (error) {
      console.error("Failed to send message", error);
      setNewMessage(content); // restore message on failure
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.sender_id === session?.user?.id;
    const timeString = new Date(item.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        {!isMe && (
          <View style={styles.avatar}>
            {item.profiles?.avatar_url ? (
              <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {item.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            )}
          </View>
        )}
        <View style={styles.messageBubbleContainer}>
          {!isMe && (
            <Text style={styles.senderName}>{item.profiles?.full_name || "Unknown"}</Text>
          )}
          <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.messageText, isMe ? styles.textMe : styles.textThem]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
            {timeString}
          </Text>
        </View>
      </View>
    );
  };

  if (loading || familyLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!family?.id) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>Family Chat</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <MaterialIcons name="group-off" size={48} color={COLORS.gray300} />
          <Text style={styles.noFamilyText}>You are not in a family.</Text>
          <Text style={styles.noFamilySubtext}>Join a family to start chatting.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{family.name || "Family Chat"}</Text>
          <Text style={styles.headerSubtitle}>{messages.length} messages</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.gray400}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons name="send" size={20} color={COLORS.white} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.white },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  backButton: { padding: 4 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  keyboardAvoid: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.gray300, justifyContent: "center", alignItems: "center", marginRight: 8 },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarInitial: { color: COLORS.white, fontWeight: "600", fontSize: 14 },
  messageBubbleContainer: { maxWidth: "75%" },
  senderName: { fontSize: 12, color: COLORS.gray500, marginBottom: 4, marginLeft: 4 },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMe: { backgroundColor: COLORS.bubbleMe, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: COLORS.bubbleThem, borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  textMe: { color: COLORS.white },
  textThem: { color: COLORS.gray900 },
  timeText: { fontSize: 10, marginTop: 4, color: COLORS.gray400 },
  timeTextMe: { textAlign: "right", marginRight: 4 },
  timeTextThem: { textAlign: "left", marginLeft: 4 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
    color: COLORS.gray900,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  sendButtonDisabled: { opacity: 0.5 },
  noFamilyText: { fontSize: 16, fontWeight: "600", color: COLORS.gray800, marginTop: 16 },
  noFamilySubtext: { fontSize: 14, color: COLORS.gray500, marginTop: 4 },
});
