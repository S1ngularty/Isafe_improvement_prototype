import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchRadarFrames } from "../../services/rainviewer.js";
import RAIN_VIEWER_MAP_HTML from "../../assets/rainViewerMapHtml.js";
import Skeleton from "../../components/Skeleton";

const COLORS = {
  shieldPrimary: "#991b1b",
  gray50: "#f9fafb",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
  white: "#fff",
};

export default function RainViewerScreen({ navigation }) {
  const { showToast } = useToast();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [frameData, setFrameData] = useState(null);
  const [webViewReady, setWebViewReady] = useState(false);

  // State from WebView
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [timestamp, setTimestamp] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchRadarFrames();
        if (cancelled) return;
        if (!data) {
          setError("Failed to load radar data");
        } else {
          setFrameData(data);
        }
      } catch {
        if (!cancelled) setError("Failed to load radar data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Send frames to WebView when both data and WebView are ready
  useEffect(() => {
    if (webViewReady && frameData) {
      const msg = JSON.stringify({
        type: "LOAD_FRAMES",
        payload: frameData,
      });
      webViewRef.current?.injectJavaScript(`
        try {
          var evt = new MessageEvent("message", { data: '${msg.replace(/'/g, "\\'")}' });
          document.dispatchEvent(evt);
        } catch(e) { console.error(e); }
        true;
      `);
    }
  }, [webViewReady, frameData]);

  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "FRAME_UPDATE") {
        setCurrentFrame(data.currentFrame);
        setTotalFrames(data.totalFrames);
        setTimestamp(data.timestamp);
        setPlaying(data.playing);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  const sendCommand = (msg) => {
    const json = JSON.stringify(msg);
    webViewRef.current?.injectJavaScript(`
      try {
        var evt = new MessageEvent("message", { data: '${json.replace(/'/g, "\\'")}' });
        document.dispatchEvent(evt);
      } catch(e) {}
      true;
    `);
  };

  const togglePlayPause = () => {
    if (playing) {
      sendCommand({ type: "PAUSE" });
      setPlaying(false);
    } else {
      sendCommand({ type: "PLAY" });
      setPlaying(true);
    }
  };

  const seekFrame = (delta) => {
    const newFrame = Math.max(0, Math.min(currentFrame + delta, totalFrames - 1));
    sendCommand({ type: "SEEK", frame: newFrame });
    sendCommand({ type: "PAUSE" });
    setPlaying(false);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return "--:--";
    const d = new Date(ts * 1000);
    return d.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>RainViewer Radar</Text>
          <Text style={styles.headerSubtitle}>
            Live rain radar — {totalFrames} frames
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="cloud-off" size={56} color={COLORS.gray400} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              (async () => {
                try {
                  const data = await fetchRadarFrames();
                  if (data) { setFrameData(data); setError(null); }
                  else setError("Failed to load radar data");
                } catch { setError("Failed to load radar data"); }
                finally { setLoading(false); }
              })();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.contentContainer}>
          <View style={styles.mapContainer}>
            <Skeleton width="100%" height="100%" borderRadius={0} />
          </View>
          <View style={styles.controlsContainer}>
            <View style={styles.controlsRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <Skeleton width={52} height={52} borderRadius={26} />
              <Skeleton width={44} height={44} borderRadius={22} />
            </View>
            <Skeleton width={60} height={14} style={{ marginBottom: 8 }} />
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <Skeleton width={10} height={10} borderRadius={2} />
                <Skeleton width={30} height={11} />
              </View>
              <View style={styles.legendItem}>
                <Skeleton width={10} height={10} borderRadius={2} />
                <Skeleton width={50} height={11} />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Map */}
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              originWhitelist={["*"]}
              source={{ html: RAIN_VIEWER_MAP_HTML }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              onLoadEnd={() => setWebViewReady(true)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scrollEnabled={false}
              bounces={false}
            />

            {/* Timestamp overlay */}
            <View style={styles.timestampOverlay}>
              <Text style={styles.timestampText}>
                {formatTimestamp(timestamp)}
              </Text>
            </View>

            {/* RainViewer attribution */}
            <View style={styles.attributionOverlay}>
              <Text style={styles.attributionText}>RainViewer</Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.controlsRow}>
              {/* Skip back */}
              <Pressable
                style={styles.controlButton}
                onPress={() => seekFrame(-1)}
              >
                <MaterialIcons
                  name="skip-previous"
                  size={24}
                  color={COLORS.gray700}
                />
              </Pressable>

              {/* Play/Pause */}
              <Pressable
                style={[
                  styles.playButton,
                  playing && styles.playButtonActive,
                ]}
                onPress={togglePlayPause}
              >
                <MaterialIcons
                  name={playing ? "pause" : "play-arrow"}
                  size={28}
                  color={playing ? COLORS.gray700 : COLORS.white}
                />
              </Pressable>

              {/* Skip forward */}
              <Pressable
                style={styles.controlButton}
                onPress={() => seekFrame(1)}
              >
                <MaterialIcons
                  name="skip-next"
                  size={24}
                  color={COLORS.gray700}
                />
              </Pressable>
            </View>

            {/* Frame counter */}
            <Text style={styles.frameCounter}>
              {currentFrame + 1} / {totalFrames}
            </Text>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#60a5fa" }]}
                />
                <Text style={styles.legendLabel}>Past</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#a78bfa" }]}
                />
                <Text style={styles.legendLabel}>Forecast</Text>
              </View>
            </View>
          </View>
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  retryButton: {
    backgroundColor: COLORS.shieldPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray400,
  },
  contentContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
    backgroundColor: "#111",
  },
  timestampOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(17,17,17,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  attributionOverlay: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(17,17,17,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attributionText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  controlsContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.gray50,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonActive: {
    backgroundColor: COLORS.gray200,
  },
  frameCounter: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray500,
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.gray500,
  },
});
