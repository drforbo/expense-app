import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const USER_TYPES = [
  'content creators',
  'influencers',
  'freelancers',
  'coaches',
  'hustlers',
];

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % USER_TYPES.length);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 1500);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, []);

  const float1Y = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const float2Y = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.floatingShape,
          styles.shape1,
          { transform: [{ translateY: float1Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingShape,
          styles.shape2,
          { transform: [{ translateY: float2Y }] },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.headingContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.boppText}>bopp</Text>
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.taglineStatic}>Tax sorted for</Text>
          <Animated.View
            style={[
              styles.animatedTextContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.taglineAnimated}>{USER_TYPES[currentIndex]}</Text>
          </Animated.View>
        </View>

        <View style={styles.featuresContainer}>
          <Feature
            text="Your personal tax to-do list"
            emoji="✅"
          />
          <Feature
            text="Feel on top of taxes"
            emoji="🏆"
          />
          <Feature
            text="Track expenses in your sleep"
            emoji="🔥"
          />
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
          <TouchableOpacity style={styles.ctaButton} onPress={onComplete}>
            <Text style={styles.ctaButtonText}>Show me!</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.bottomText}>No spreadsheets. No stress.</Text>
      </View>
    </SafeAreaView>
  );
}

interface FeatureProps {
  text: string;
  emoji: string;
}

const Feature: React.FC<FeatureProps> = ({ text, emoji }) => (
  <View style={styles.feature}>
    <View style={styles.featureIconContainer}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
    overflow: 'hidden',
  },
  floatingShape: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.15,
  },
  shape1: {
    width: 150,
    height: 150,
    backgroundColor: colors.volt,
    top: 60,
    right: -50,
  },
  shape2: {
    width: 120,
    height: 120,
    backgroundColor: colors.ember,
    bottom: 100,
    left: -40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  welcomeText: {
    fontSize: 20,
    color: colors.midGrey,
    marginBottom: spacing.xs,
    fontFamily: fonts.displayMed,
  },
  boppText: {
    fontSize: 64,
    fontFamily: fonts.display,
    letterSpacing: -3,
    color: colors.ink,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    height: 80,
  },
  taglineStatic: {
    fontSize: 16,
    color: colors.midGrey,
    marginBottom: spacing.xs,
    fontFamily: fonts.displayMed,
  },
  animatedTextContainer: {
    minHeight: 36,
    justifyContent: 'center',
  },
  taglineAnimated: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.ember,
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 28,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    ...shadows.sm,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 15,
    color: colors.ink,
    fontFamily: fonts.displaySemi,
    flex: 1,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.ember,
    paddingVertical: spacing.md,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  ctaButtonText: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.white,
    marginRight: spacing.xs,
  },
  bottomText: {
    fontSize: 13,
    color: colors.midGrey,
    fontFamily: fonts.displayMed,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
