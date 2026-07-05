import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Search,
  X,
  Shield,
  ShieldCheck,
  Flame,
  HeartPulse,
  LifeBuoy,
} from "lucide-react-native";
import { fetchHotlines } from "../../services/hotlines.js";

const CATEGORY_LABELS = {
  general: "General Emergency",
  police: "Police",
  fire: "Fire",
  medical: "Medical",
  rescue: "Rescue",
};

const CATEGORY_ICONS = {
  general: Shield,
  police: ShieldCheck,
  fire: Flame,
  medical: HeartPulse,
  rescue: LifeBuoy,
};

const CATEGORY_COLORS = {
  general: { bg: "#EFF6FF", border: "#BFDBFE", icon: "#2563EB", text: "#1E40AF" },
  police: { bg: "#EEF2FF", border: "#C7D2FE", icon: "#4F46E5", text: "#3730A3" },
  fire: { bg: "#FFF7ED", border: "#FED7AA", icon: "#EA580C", text: "#9A3412" },
  medical: { bg: "#FEF2F2", border: "#FECACA", icon: "#DC2626", text: "#991B1B" },
  rescue: { bg: "#ECFDF5", border: "#A7F3D0", icon: "#059669", text: "#065F46" },
};

const COLORS = {
  primary: "#800000",
  primaryLight: "#FDF2F2",
  white: "#fff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
};

export default function EmergencyHotlinesScreen({ navigation }) {
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchHotlines();
        if (active) setHotlines(Array.isArray(data) ? data : []);
      } catch {
        if (active) setHotlines([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    for (const h of hotlines) {
      const cat = h.category || "general";
      if (!map[cat]) map[cat] = [];
      if (h.is_active !== false) map[cat].push(h);
    }
    return map;
  }, [hotlines]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result = {};
    for (const [cat, items] of Object.entries(grouped)) {
      const matched = items.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          JSON.stringify(h.phone_numbers || []).toLowerCase().includes(q) ||
          (h.email || "").toLowerCase().includes(q)
      );
      if (matched.length > 0) result[cat] = matched;
    }
    return result;
  }, [grouped, search]);

  const handleCall = async (number) => {
    const url = `tel:${number}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };

  const handleEmail = async (email) => {
    const url = `mailto:${email}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };

  const handleWebsite = async (website) => {
    const url = website.startsWith("http") ? website : `https://${website}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {}
  };

  const categoryEntries = useMemo(
    () => Object.entries(filtered).sort(([a], [b]) => a.localeCompare(b)),
    [filtered]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.white} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Emergency Hotlines</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search hotlines..."
            placeholderTextColor={COLORS.gray400}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <X size={16} color={COLORS.gray400} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.emptyText}>Loading hotlines…</Text>
          </View>
        ) : categoryEntries.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyTitle}>No hotlines found</Text>
            <Text style={styles.emptyText}>
              {search ? "Try a different search term." : "No emergency hotlines available yet."}
            </Text>
          </View>
        ) : (
          categoryEntries.map(([category, items]) => {
            const catColors = CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
            const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.general;
            return (
              <View key={category} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <IconComponent size={18} color={catColors.icon} />
                  <Text style={[styles.sectionTitle, { color: catColors.text }]}>
                    {CATEGORY_LABELS[category] || category}
                  </Text>
                </View>

                {items.map((hotline) => (
                  <Pressable
                    key={hotline.id}
                    style={({ pressed }) => [
                      styles.card,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => setSelected(hotline)}
                  >
                    <View style={styles.cardTop}>
                      <View style={[styles.iconWrap, { backgroundColor: catColors.icon }]}>
                        <IconComponent size={20} color={COLORS.white} />
                      </View>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{hotline.name}</Text>
                        <Text style={styles.cardCategory}>
                          {CATEGORY_LABELS[category] || category}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.phoneList}>
                      {(hotline.phone_numbers || []).slice(0, 2).map((p, i) => (
                        <Pressable
                          key={i}
                          style={styles.phoneItem}
                          onPress={() => handleCall(p.number)}
                        >
                          <Phone size={14} color={COLORS.primary} />
                          <Text style={styles.phoneText}>
                            {p.type ? `${p.type}: ` : ""}{p.number}
                          </Text>
                        </Pressable>
                      ))}
                      {(hotline.phone_numbers || []).length > 2 && (
                        <Text style={styles.moreText}>
                          +{hotline.phone_numbers.length - 2} more numbers
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selected.name}</Text>
                  <Pressable onPress={() => setSelected(null)}>
                    <X size={20} color={COLORS.gray500} />
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  {(selected.phone_numbers || []).length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Phone Numbers</Text>
                      {(selected.phone_numbers || []).map((p, i) => (
                        <Pressable
                          key={i}
                          style={styles.modalActionRow}
                          onPress={() => handleCall(p.number)}
                        >
                          <View style={[styles.actionIcon, { backgroundColor: "#DCFCE7" }]}>
                            <Phone size={18} color="#15803D" />
                          </View>
                          <View style={styles.actionTextWrap}>
                            {p.type && <Text style={styles.actionLabel}>{p.type}</Text>}
                            <Text style={styles.actionValue}>{p.number}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {selected.email && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Email</Text>
                      <Pressable
                        style={styles.modalActionRow}
                        onPress={() => handleEmail(selected.email)}
                      >
                        <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
                          <Mail size={18} color="#1D4ED8" />
                        </View>
                        <View style={styles.actionTextWrap}>
                          <Text style={styles.actionValue}>{selected.email}</Text>
                        </View>
                      </Pressable>
                    </View>
                  )}

                  {selected.website && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Website / Social</Text>
                      <Pressable
                        style={styles.modalActionRow}
                        onPress={() => handleWebsite(selected.website)}
                      >
                        <View style={[styles.actionIcon, { backgroundColor: "#F3E8FF" }]}>
                          <Globe size={18} color="#7C3AED" />
                        </View>
                        <View style={styles.actionTextWrap}>
                          <Text style={styles.actionValue}>{selected.website}</Text>
                        </View>
                      </Pressable>
                    </View>
                  )}
                </View>
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
    backgroundColor: COLORS.primary,
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray100,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray900,
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  centered: {
    paddingVertical: 80,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray700,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeader: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  cardCategory: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 1,
    textTransform: "capitalize",
  },
  phoneList: {
    marginTop: 10,
    marginLeft: 50,
    gap: 6,
  },
  phoneItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneText: {
    fontSize: 13,
    color: COLORS.gray600,
  },
  moreText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.gray900,
    flex: 1,
    marginRight: 8,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    marginBottom: 6,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: "500",
  },
  actionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray900,
  },
});
