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
import { colors, spacing, borderRadius, shadows } from './theme';

const { width } = Dimensions.get('window');

// Gradient Background Container
interface GradientContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientContainer: React.FC<GradientContainerProps> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={[colors.deepPurple, colors.darkPurple]}
      style={[styles.gradientContainer, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

// Progress Bar
interface ProgressBarProps {
  progress: number; // 0 to 1
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <View style={styles.progressBarContainer}>
      <LinearGradient
        colors={[colors.coral, colors.electricViolet]}
        style={[styles.progressFill, { width: `${progress * 100}%` }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
  );
};

// Glass Button
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
        style={styles.buttonWrapper}
      >
        <LinearGradient
          colors={[colors.electricViolet, colors.lightViolet]}
          style={styles.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
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
      style={[styles.glassButton, disabled && styles.disabledButton]}
    >
      <Text style={styles.glassButtonText}>{title}</Text>
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
      <Text style={styles.welcomeText}>Welcome to</Text>
      <Text style={styles.logoText}>bopp</Text>
      <Text style={styles.tagline}>
        Tax sorted for <Text style={styles.taglineHighlight}>hustlers</Text>
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

// Decorative Blobs (background decorations)
export const DecorativeBlobs: React.FC = () => {
  return (
    <>
      <View style={styles.blob1} />
      <View style={styles.blob2} />
    </>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 40,
    left: spacing.xl,
    right: spacing.xl,
    height: 4,
    backgroundColor: colors.glassWhite,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  buttonWrapper: {
    marginBottom: spacing.sm,
  },
  primaryButton: {
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  glassButton: {
    backgroundColor: colors.glassWhite,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  glassButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
    color: colors.coral,
    fontSize: 15,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.coral,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  taglineHighlight: {
    color: colors.coral,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  blob1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 100,
    opacity: 0.5,
  },
  blob2: {
    position: 'absolute',
    bottom: -100,
    left: -50,
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 125,
    opacity: 0.5,
  },
});