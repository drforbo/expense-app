import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, fonts, spacing, borderRadius, gradients, glass } from './theme';

const { width } = Dimensions.get('window');

// Liquid Gradient Glow — decorative background element
interface LiquidGlowProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: number;
  style?: ViewStyle;
}

export const SolarGlow: React.FC<LiquidGlowProps> = ({ variant = 'primary', size = 200, style }) => {
  const glowColors: Record<string, [string, string, string, string]> = {
    primary: ['#fe885c', '#9c3e18', 'rgba(156,62,24,0.3)', 'transparent'],
    secondary: ['#7b8fd4', '#4855a2', 'rgba(72,85,162,0.3)', 'transparent'],
    tertiary: ['#fe885c', '#4855a2', 'rgba(72,85,162,0.2)', 'transparent'],
  };

  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0.5,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={glowColors[variant]}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
      />
    </View>
  );
};

// Glass Card wrapper — glassmorphism container
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, intensity = 40 }) => {
  return (
    <View style={[styles.glassOuter, style]}>
      <BlurView intensity={intensity} tint="light" style={styles.glassBlur}>
        <View style={styles.glassInner}>{children}</View>
      </BlurView>
    </View>
  );
};

// Progress Bar
interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <View style={styles.progressBarContainer}>
      <LinearGradient
        colors={gradients.warm}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${progress * 100}%` }]}
      />
    </View>
  );
};

// Primary Button — Liquid Gradient
interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  variant = 'secondary',
  disabled = false,
}) => {
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={disabled ? styles.disabledButton : undefined}
      >
        <LinearGradient
          colors={gradients.button}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.ghostButton, disabled && styles.disabledButton]}
    >
      <Text style={styles.ghostButtonText}>{title}</Text>
    </TouchableOpacity>
  );
};

// Back Button
interface BackButtonProps {
  onPress: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backButton}>
      <Text style={styles.backButtonText}>← Back</Text>
    </TouchableOpacity>
  );
};

// Logo
export const Logo: React.FC = () => {
  return (
    <View style={styles.logoContainer}>
      <Text style={styles.logoText}>bopp.</Text>
      <Text style={styles.tagline}>
        Taxes hit different when they actually make sense.
      </Text>
    </View>
  );
};

// Question Header
interface QuestionHeaderProps {
  question: string;
}

export const QuestionHeader: React.FC<QuestionHeaderProps> = ({ question }) => {
  return <Text style={styles.questionText}>{question}</Text>;
};

// Eyebrow Label
interface EyebrowProps {
  text: string;
}

export const Eyebrow: React.FC<EyebrowProps> = ({ text }) => {
  return <Text style={styles.eyebrow}>{text}</Text>;
};

// Decorative Blobs (liquid gradient glows)
export const DecorativeBlobs: React.FC = () => {
  return (
    <>
      <SolarGlow variant="primary" size={300} style={{ top: -100, right: -100 }} />
      <SolarGlow variant="secondary" size={250} style={{ bottom: -80, left: -80 }} />
    </>
  );
};

const styles = StyleSheet.create({
  glassOuter: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  glassBlur: {
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
  },
  glassInner: {
    backgroundColor: colors.glass,
    padding: spacing.lg,
    borderWidth: glass.borderWidth,
    borderColor: glass.borderColor,
    borderRadius: borderRadius.lg,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    letterSpacing: 0.3,
  },
  ghostButton: {
    backgroundColor: colors.glass,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.onSurface,
    fontSize: 16,
    fontFamily: fonts.displaySemi,
  },
  disabledButton: {
    opacity: 0.5,
  },
  backButton: {
    marginTop: 'auto',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fonts.displaySemi,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: 56,
    fontFamily: fonts.display,
    color: colors.white,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  questionText: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: -0.3,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
});
