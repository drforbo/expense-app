import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

const { width, height } = Dimensions.get('window');

interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: step / totalSteps,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [step]);

  return (
    <View style={styles.container}>
      {/* Progress bar — row of segments */}
      <View style={styles.progressContainer}>
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View key={i} style={styles.progressSegmentWrap}>
              {i < step ? (
                <LinearGradient
                  colors={gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.progressSegmentActive}
                />
              ) : (
                <View style={styles.progressSegmentInactive} />
              )}
            </View>
          ))}
        </View>
        <Text style={styles.stepCounter}>
          {step} OF {totalSteps}
        </Text>
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <View style={styles.mainContent}>
              {children}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

interface OptionCardProps {
  icon: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  title,
  description,
  selected,
  onSelect,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selected) {
      Animated.spring(glowAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selected]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
          },
          !selected && styles.cardUnselected,
        ]}
      >
        {selected ? (
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
          />
        ) : null}

        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <View style={styles.cardText}>
            <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{title}</Text>
            <Text style={[styles.cardDescription, selected && styles.cardDescriptionSelected]}>{description}</Text>
          </View>
        </View>

        {selected && (
          <Animated.View
            style={[
              styles.checkmark,
              {
                transform: [
                  {
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.checkmarkText}>✓</Text>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

interface ContinueButtonProps {
  onPress: () => void;
  disabled?: boolean;
  text?: string;
}

export const ContinueButton: React.FC<ContinueButtonProps> = ({
  onPress,
  disabled = false,
  text = 'Continue',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={styles.buttonContainer}
    >
      <Animated.View
        style={[
          styles.button,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {disabled ? (
          <View style={styles.buttonDisabledInner}>
            <Text style={styles.buttonTextDisabled}>{text}</Text>
          </View>
        ) : (
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonInner}
          >
            <Text style={styles.buttonText}>{text}</Text>
          </LinearGradient>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },
  progressSegmentWrap: {
    flex: 1,
    height: 4,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressSegmentActive: {
    flex: 1,
    borderRadius: borderRadius.xs,
  },
  progressSegmentInactive: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: borderRadius.xs,
  },
  stepCounter: {
    fontFamily: fonts.displaySemi,
    fontSize: 10,
    color: colors.tagExpenseText,
    marginTop: spacing.sm,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    lineHeight: 46,
    letterSpacing: -2,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.midGrey,
    lineHeight: 26,
  },
  mainContent: {
    flex: 1,
  },
  // ── Option cards ──
  card: {
    borderRadius: 20,
    borderWidth: 0,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardUnselected: {
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  cardIcon: {
    fontSize: 40,
    marginRight: spacing.lg,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 6,
  },
  cardTitleSelected: {
    color: colors.white,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.midGrey,
    lineHeight: 21,
  },
  cardDescriptionSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    color: colors.gradientMid,
    fontFamily: fonts.bodyBold,
  },
  // ── CTA button ──
  buttonContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  buttonInner: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  buttonDisabledInner: {
    backgroundColor: colors.border,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonTextDisabled: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
