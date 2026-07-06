import React, { useState, useEffect } from "react";
import { View, StyleSheet, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../services/supabase.js";
import Skeleton from "../../components/Skeleton";

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

export default function EmergencyHistoryScreen({ navigation }) {
  const { session } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("status, last_seen_at")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      const mockHistory = [
        {
          id: "1",
          status: data?.status || "safe",
          timestamp: data?.last_seen_at || new Date().toISOString(),
          location: "Current location",
        },
      ];

      setHistory(mockHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "safe":
        return "check-circle";
      case "help":
        return "error";
      case "emergency":
        return "warning";
      default:
        return "•";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemHeader}>
        <View style={styles.statusWithIcon}>
          <MaterialIcons name={getStatusIcon(item.status)} size={20} color={getStatusColor(item.status)} />
          <Text style={[styles.itemStatus, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <Text style={styles.itemLocation}>{item.location}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.shieldPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.listContent}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.historyItem}>
              <View style={styles.itemHeader}>
                <View style={styles.statusWithIcon}>
                  <Skeleton width={20} height={20} borderRadius={10} />
                  <Skeleton width={60} height={16} />
                </View>
                <Skeleton width={80} height={14} />
              </View>
              <Skeleton width={150} height={14} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      ) : history.length > 0 ? (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="history" size={48} color={COLORS.gray300} />
          <Text style={styles.emptyText}>No emergency history</Text>
          <Text style={styles.emptySubtext}>Your emergency events will appear here</Text>
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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyItem: {
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.shieldPrimary,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray900,
  },
  itemTime: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  itemLocation: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray500,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.gray400,
  },
  statusWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

function getStatusColor(status) {
  switch (status) {
    case "safe":
      return "#15803d";
    case "help":
      return "#d97706";
    case "emergency":
      return "#dc2626";
    default:
      return COLORS.gray500;
  }
}
