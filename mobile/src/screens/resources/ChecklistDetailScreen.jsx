import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Image,
  Image,
  Animated,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  ArrowLeft, 
  Check, 
  Info
} from "lucide-react-native";


export default function ChecklistDetail({ route, navigation }) {
  const { checklist, checkedItems: initialCheckedItems, setCheckedItems: setParentCheckedItems } = route.params;
  const [localCheckedItems, setLocalCheckedItems] = useState(initialCheckedItems || {});
  const { width, height } = useWindowDimensions();
  
  // Animation values for progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  // Animation values for each item
  const itemAnimations = useRef({}).current;

  useEffect(() => {
    // Calculate initial progress
    const totalItems = checklist.items.length;
    let checked = 0;
    for (let i = 0; i < totalItems; i++) {
      const key = `${checklist.id}-${i}`;
      if (localCheckedItems[key]) checked++;
    }
    const initialProgress = totalItems > 0 ? (checked / totalItems) * 100 : 0;
    setProgress(initialProgress);
    progressAnim.setValue(initialProgress);
  }, []);

  const toggleItem = (itemIndex) => {
    const key = `${checklist.id}-${itemIndex}`;
    const isCurrentlyChecked = localCheckedItems[key];
    const newCheckedState = {
      ...localCheckedItems,
      [key]: !isCurrentlyChecked,
    };
    setLocalCheckedItems(newCheckedState);
    setParentCheckedItems((prev) => ({
      ...prev,
      [key]: !isCurrentlyChecked,
    }));

    // Update progress with animation
    const totalItems = checklist.items.length;
    let checked = 0;
    for (let i = 0; i < totalItems; i++) {
      const itemKey = `${checklist.id}-${i}`;
      if (newCheckedState[itemKey]) checked++;
    }
    const newProgress = totalItems > 0 ? (checked / totalItems) * 100 : 0;
    setProgress(newProgress);
    
    Animated.timing(progressAnim, {
      toValue: newProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();

    // Animate the text strikethrough
    if (!itemAnimations[itemIndex]) {
      itemAnimations[itemIndex] = {
        width: new Animated.Value(0),
        opacity: new Animated.Value(0),
      };
    }

    const anim = itemAnimations[itemIndex];
    if (!isCurrentlyChecked) {
      // Checking the item - animate strikethrough in
      Animated.parallel([
        Animated.timing(anim.width, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Unchecking the item - animate strikethrough out
      Animated.parallel([
        Animated.timing(anim.width, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const getCheckedCount = () => {
    let count = 0;
    for (let i = 0; i < checklist.items.length; i++) {
      const key = `${checklist.id}-${i}`;
      if (localCheckedItems[key]) count++;
    }
    return count;
  };

  const checkedCount = getCheckedCount();
  const totalItems = checklist.items.length;

  // Create animated strikethrough style
  const getStrikethroughStyle = (index) => {
    if (!itemAnimations[index]) {
      itemAnimations[index] = {
        width: new Animated.Value(0),
        opacity: new Animated.Value(0),
      };
    }
    const anim = itemAnimations[index];
    const widthInterpolate = anim.width.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });
    return {
      width: widthInterpolate,
      opacity: anim.opacity,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#800000" />
      
      {/* Solid Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{checklist.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image Section */}
        <View style={[styles.heroContainer, { width, height: height * 0.4 }]}>
          <Image 
            source={{ uri: checklist.image }} 
            style={styles.heroImage} 
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />
          
          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={[styles.heroIconContainer, { backgroundColor: checklist.bgColor }]}>
              <checklist.icon color={checklist.color} size={32} />
            </View>
            <Text style={styles.heroTitle}>{checklist.title}</Text>
            <Text style={styles.heroSubtitle}>
              Complete all items to be fully prepared
            </Text>
          </View>
        </View>

        {/* Content Container - Overlapping the hero */}
        <View style={styles.contentContainer}>
          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressCount}>
                  {checkedCount} of {totalItems} completed
                </Text>
              </View>
              <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
            </View>
            
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: checklist.color,
                  },
                ]}
              />
            </View>
          </View>

          {/* Checklist Items */}
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsTitle}>Checklist Items</Text>
            
            {checklist.items.map((item, index) => {
              const isChecked = localCheckedItems[`${checklist.id}-${index}`];
              return (
                <Pressable
                  key={index}
                  style={styles.checklistItem}
                  onPress={() => toggleItem(index)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked ? checklist.color : "transparent",
                        borderColor: checklist.color,
                      },
                    ]}
                  >
                    {isChecked && (
                      <Check color="#FFFFFF" size={16} />
                    )}
                  </View>
                  <View style={styles.itemTextContainer}>
                    <Text
                      style={[
                        styles.itemText,
                        isChecked && styles.itemTextChecked,
                      ]}
                    >
                      {item}
                    </Text>
                    {isChecked && (
                      <Animated.View
                        style={[
                          styles.strikethrough,
                          getStrikethroughStyle(index),
                          { backgroundColor: checklist.color },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Completion Status */}
          {checkedCount === totalItems && (
            <View style={styles.completionBanner}>
              <View style={styles.completionIconContainer}>
                <Check color="#15803d" size={20} />
              </View>
              <Text style={styles.completionText}>All items completed! Great job!</Text>
            </View>
          )}

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <Info color="#800000" size={20} />
              <Text style={styles.tipsTitle}>Tips for "{checklist.title}"</Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Review this checklist regularly and update items as needed
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Keep all supplies in an easily accessible location
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>
                Practice your emergency plan with family members regularly
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    backgroundColor: '#800000',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 0, 0, 0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  heroIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentContainer: {
    marginTop: -30,
    paddingHorizontal: 16,
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '800',
    color: '#800000',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  itemTextContainer: {
    flex: 1,
    position: 'relative',
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    paddingTop: 1,
  },
  itemTextChecked: {
    color: '#9CA3AF',
  },
  strikethrough: {
    position: 'absolute',
    height: 2,
    top: 11,
    left: 0,
    borderRadius: 1,
  },
  completionBanner: {
    flexDirection: 'row',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  completionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#15803d',
  },
  tipsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#800000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#800000',
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});