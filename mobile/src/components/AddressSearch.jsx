import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TextInput, Pressable, FlatList, Text, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { searchAddress } from "../services/geocode.js";
import Skeleton from "./Skeleton";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray500: "#6b7280",
  gray900: "#111827",
  white: "#fff",
};

const DEBOUNCE_DELAY = 400; // ms

export default function AddressSearch({ onAddressSelect, onCancel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchAddress(query);
        setResults(data);
        setShowResults(true);
        setSelectedIndex(-1);
        if (data.length === 0) {
          setError("No addresses found. Try a different search.");
        }
      } catch (err) {
        console.error("[AddressSearch] Error:", err);
        setResults([]);
        setError(err.message || "Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const handleSelect = (address) => {
    onAddressSelect?.({
      lat: address.lat,
      lng: address.lng,
      display_name: address.display_name,
    });
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const handleKeyDown = (e) => {
    // Arrow navigation for results
    if (e.nativeEvent.key === "ArrowDown") {
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.nativeEvent.key === "ArrowUp") {
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.nativeEvent.key === "Enter") {
      if (selectedIndex >= 0) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Search Box */}
      <View style={styles.searchBox}>
        <MaterialIcons name="location-on" size={20} color={COLORS.shieldPrimary} />
        <TextInput
          style={styles.input}
          placeholder="Search address in Philippines..."
          placeholderTextColor={COLORS.gray500}
          value={query}
          onChangeText={setQuery}
          onFocus={() => query.trim() && setShowResults(true)}
          editable={!loading}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(""); setResults([]); setShowResults(false); }}>
            <MaterialIcons name="close" size={20} color={COLORS.gray400} />
          </Pressable>
        )}
      </View>

      {/* Results Dropdown */}
      {showResults && (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={{ paddingVertical: 8 }}>
              {[1, 2, 3].map((key) => (
                <View key={key} style={styles.resultItem}>
                  <Skeleton width={16} height={16} borderRadius={8} />
                  <View style={styles.resultText}>
                    <Skeleton width={150} height={13} style={{ marginBottom: 4 }} />
                    <Skeleton width={100} height={11} />
                  </View>
                </View>
              ))}
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color={COLORS.gray500} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, idx) => idx.toString()}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <Pressable
                  style={[
                    styles.resultItem,
                    index === selectedIndex && styles.resultItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <MaterialIcons
                    name="location-on"
                    size={16}
                    color={index === selectedIndex ? COLORS.white : COLORS.shieldPrimary}
                  />
                  <View style={styles.resultText}>
                    <Text
                      style={[
                        styles.resultName,
                        index === selectedIndex && styles.resultNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {item.display_name}
                    </Text>
                    <Text
                      style={[
                        styles.resultCoords,
                        index === selectedIndex && styles.resultCoordsSelected,
                      ]}
                    >
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="search-off" size={24} color={COLORS.gray300} />
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          )}
        </View>
      )}

      {/* Cancel Button */}
      {showResults && (
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray900,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 300,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 8,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  resultItemSelected: {
    backgroundColor: COLORS.shieldPrimary,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray900,
    marginBottom: 2,
  },
  resultNameSelected: {
    color: COLORS.white,
  },
  resultCoords: {
    fontSize: 11,
    color: COLORS.gray500,
  },
  resultCoordsSelected: {
    color: COLORS.white,
    opacity: 0.9,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 13,
    color: COLORS.gray900,
    fontWeight: "600",
  },
});
