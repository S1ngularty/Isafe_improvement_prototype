import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ChatModal from "./ChatModal";
import { useAuth } from "../context/AuthContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  shieldPrimary: "#991b1b",
  white: "#ffffff",
};

const WIDGET_SIZE = 60;
const INITIAL_X = SCREEN_WIDTH - WIDGET_SIZE - 20;
const INITIAL_Y = SCREEN_HEIGHT - 160; // Just above the bottom tab bar

export default function ChatbotWidget() {
  const { session } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  
  const pan = useRef(new Animated.ValueXY({ x: INITIAL_X, y: INITIAL_Y })).current;
  const dragRef = useRef({ hasMoved: false });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
        dragRef.current.hasMoved = false;
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { 
          useNativeDriver: false,
          listener: (_, gestureState) => {
            if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
              dragRef.current.hasMoved = true;
            }
          }
        }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Enforce bounds
        let newX = pan.x._value;
        let newY = pan.y._value;

        if (newX < 10) newX = 10;
        if (newX > SCREEN_WIDTH - WIDGET_SIZE - 10) newX = SCREEN_WIDTH - WIDGET_SIZE - 10;
        
        if (newY < 50) newY = 50; 
        if (newY > SCREEN_HEIGHT - WIDGET_SIZE - 20) newY = SCREEN_HEIGHT - WIDGET_SIZE - 20;

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();

        if (!dragRef.current.hasMoved) {
          setModalVisible(true);
        }
      },
    })
  ).current;

  // Render nothing if user is not logged in
  if (!session) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.widgetContainer,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.fab}>
          <MaterialIcons name="support-agent" size={32} color={COLORS.white} />
        </View>
      </Animated.View>

      <ChatModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  widgetContainer: {
    position: "absolute",
    zIndex: 9999, // Floating above everything
    elevation: 10,
  },
  fab: {
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    borderRadius: WIDGET_SIZE / 2,
    backgroundColor: COLORS.shieldPrimary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});
