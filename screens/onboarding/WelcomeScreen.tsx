import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

const { width, height } = Dimensions.get('window');

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
    <View style={styles.screen}>
      {/* Top hero gradient half */}
      <LinearGradient
        colors={gradients.hero as unknown as string[]}
        locations={gradients.heroLocations as unknown as number[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        {/* Flare overlay circles */}
        <Animated.View
          style={[
            styles.flareCircle,
            styles.flare1,
            { transform: [{ translateY: float1Y }] },
          ]}
        />
        <Animated.View
          style={[
            styles.flareCircle,
            styles.flare2,
            { transform: [{ translateY: float2Y }] },
          ]}
        />

        <SafeAreaView style={styles.heroContent} edges={['top']}>
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
        </SafeAreaView>
      </LinearGradient>

      {/* Bottom white half */}
      <View style={styles.bottomSection}>
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
          <TouchableOpacity style={styles.ctaButton} onPress={onComplete} activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaButtonText}>let's go</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.bottomText}>No spreadsheets. No stress.</Text>
      </View>
    </View>
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
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ── Hero (top half) ──
  heroSection: {
    flex: 1,
    overflow: 'hidden',
  },
  flareCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  flare1: {
    width: 180,
    height: 180,
    top: 40,
    right: -60,
  },
  flare2: {
    width: 140,
    height: 140,
    bottom: 20,
    left: -50,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  welcomeText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
    fontFamily: fonts.displayMed,
  },
  boppText: {
    fontSize: 64,
    fontFamily: fonts.display,
    letterSpacing: -3,
    color: colors.white,
  },
  taglineContainer: {
    alignItems: 'center',
    height: 80,
  },
  taglineStatic: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
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
    color: colors.white,
    textAlign: 'center',
  },

  // ── Bottom (white half) ──
  bottomSection: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
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
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
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
