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
import { colors, fonts, spacing, borderRadius, shadows } from './theme';

const { width } = Dimensions.get('window');

// Solar Flare Glow - decorative background element
interface SolarGlowProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: number;
  style?: ViewStyle;
}

export const SolarGlow: React.FC<SolarGlowProps> = ({ variant = 'primary', size = 200, style }) => {
  const glowColors: Record<string, [string, string, string, string]> = {
    primary: ['#FF5C35', '#FFAA52', 'rgba(255,92,53,0.3)', 'transparent'],
    secondary: ['#FFAA52', '#FF8C35', 'rgba(255,170,82,0.3)', 'transparent'],
    tertiary: ['#FF6B8A', '#CC4466', 'rgba(255,100,120,0.2)', 'transparent'],
  };

  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: 0.6,
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

// Progress Bar
interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
    </View>
  );
};

// Primary Button
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
        style={[styles.primaryButton, disabled && styles.disabledButton]}
      >
        <Text style={styles.primaryButtonText}>{title}</Text>
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

// Decorative Blobs (solar flare glows)
export const DecorativeBlobs: React.FC = () => {
  return (
    <>
      <SolarGlow variant="primary" size={300} style={{ top: -100, right: -100 }} />
      <SolarGlow variant="tertiary" size={250} style={{ bottom: -80, left: -80 }} />
    </>
  );
};

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.coralBlaze,
    borderRadius: borderRadius.sm,
  },
  primaryButton: {
    backgroundColor: colors.coralBlaze,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontFamily: fonts.displaySemi,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: colors.white,
    fontSize: 14,
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
    color: colors.coralBlaze,
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
    color: 'rgba(250,250,250,0.7)',
    textAlign: 'center',
  },
  questionText: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: fonts.displaySemi,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(250,250,250,0.4)',
    marginBottom: spacing.md,
  },
});
