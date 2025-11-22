import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { OnboardingStep, ContinueButton } from './OnboardingStep';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Step8MiniWinProps {
  onNext: () => void;
}

export const Step8MiniWin: React.FC<Step8MiniWinProps> = ({ onNext }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Celebration haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Entrance animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
  }, []);

  const stats = [
    { label: 'Tax Saved', value: '£25.60', emoji: '💰' },
    { label: 'Time Saved', value: '5 min', emoji: '⏱️' },
    { label: 'Streak', value: '1 day', emoji: '🔥' },
  ];

  return (
    <OnboardingStep
      step={8}
      totalSteps={9}
      title="You're a natural! 🎉"
      subtitle="That's how easy Bopp makes bookkeeping"
    >
      {/* Success icon */}
      <Animated.View
        style={[
          styles.successIconContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.successIconWrapper}>
          <LinearGradient
            colors={['#B8FF3C', '#8FD926']}
            style={styles.successIconGradient}
          >
            <Animated.Text
              style={[
                styles.successIcon,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              ✓
            </Animated.Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Stats grid */}
      <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <LinearGradient
              colors={['rgba(184, 255, 60, 0.1)', 'rgba(143, 217, 38, 0.05)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Encouragement message */}
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>Here's what you just did:</Text>
        <View style={styles.achievementsList}>
          <View style={styles.achievementRow}>
            <Text style={styles.achievementIcon}>✨</Text>
            <Text style={styles.achievementText}>
              Correctly categorized a business expense
            </Text>
          </View>
          <View style={styles.achievementRow}>
            <Text style={styles.achievementIcon}>💷</Text>
            <Text style={styles.achievementText}>
              Unlocked £25.60 in tax deductions
            </Text>
          </View>
          <View style={styles.achievementRow}>
            <Text style={styles.achievementIcon}>🎯</Text>
            <Text style={styles.achievementText}>
              Started building your HMRC-compliant records
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonWrapper}>
        <ContinueButton onPress={onNext} text="Let's Keep Going!" />
      </View>
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#B8FF3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  successIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 64,
    color: '#0F1419',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(184, 255, 60, 0.2)',
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: '#B8FF3C',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    marginBottom: 32,
  },
  messageTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  achievementText: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
  },
  buttonWrapper: {
    marginTop: 'auto',
  },
});