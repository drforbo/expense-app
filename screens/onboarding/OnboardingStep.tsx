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
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: colors.ink,
              },
            ]}
          />
        </View>
        <Text style={styles.stepCounter}>
          {step} of {totalSteps}
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
            borderColor: selected ? colors.ink : 'transparent',
          },
        ]}
      >
        {selected && (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.parchment }]}
          />
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
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
          disabled && styles.buttonDisabled,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.buttonInner}>
          <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
            {text}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  progressContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.parchment,
  },
  progressBackground: {
    height: 4,
    backgroundColor: colors.mist,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.xs,
  },
  stepCounter: {
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    color: colors.midGrey,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
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
    fontSize: 36,
    color: colors.ink,
    lineHeight: 44,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
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
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.midGrey,
    lineHeight: 21,
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.ember,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    color: colors.white,
    fontFamily: fonts.bodyBold,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  buttonDisabled: {
    shadowOpacity: 0,
  },
  buttonInner: {
    backgroundColor: colors.ember,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonTextDisabled: {
    color: colors.mist,
  },
});
