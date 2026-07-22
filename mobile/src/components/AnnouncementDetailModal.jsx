import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  shieldDark: "#5c1010",
  shieldPrimary: "#800000",
  white: "#fff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
};

export default function AnnouncementDetailModal({ announcement, onClose }) {
  if (!announcement) return null;

  const formattedDate = announcement.created_at
    ? new Date(announcement.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Modal
      visible={!!announcement}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPress} onPress={onClose} />

        <View style={styles.container}>
          {/* Close button */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={22} color={COLORS.white} />
          </Pressable>

          {/* Header Image / Fallback */}
          {announcement.image_url ? (
            <Image
              source={{ uri: announcement.image_url }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.headerFallback}>
              <MaterialIcons
                name="campaign"
                size={48}
                color="rgba(255,255,255,0.3)"
              />
            </View>
          )}

          {/* Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{announcement.title}</Text>

            {formattedDate ? (
              <Text style={styles.date}>{formattedDate}</Text>
            ) : null}

            {announcement.description ? (
              <Text style={styles.shortDesc}>{announcement.description}</Text>
            ) : null}

            {announcement.long_description ? (
              <Text style={styles.longDesc}>
                {announcement.long_description}
              </Text>
            ) : (
              <Text style={styles.noDetails}>
                No additional details available.
              </Text>
            )}
          </ScrollView>

          {/* Bottom close */}
          <View style={styles.footer}>
            <Pressable style={styles.footerButton} onPress={onClose}>
              <Text style={styles.footerButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  backdropPress: {
    flex: 1,
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.gray100,
  },
  headerFallback: {
    width: "100%",
    height: 140,
    backgroundColor: COLORS.shieldDark,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 16,
  },
  shortDesc: {
    fontSize: 14,
    color: COLORS.gray700,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: "600",
  },
  longDesc: {
    fontSize: 14,
    color: COLORS.gray700,
    lineHeight: 22,
  },
  noDetails: {
    fontSize: 14,
    color: COLORS.gray400,
    fontStyle: "italic",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  footerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray500,
  },
});
