import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Step6LoadingProps {
  onComplete: () => void;
}

const messages = [
  { emoji: '🔍', text: 'Scanning your transactions...' },
  { emoji: '🧠', text: 'Teaching AI about your spending...' },
  { emoji: '✨', text: 'Finding tax-deductible expenses...' },
  { emoji: '🎯', text: 'Categorizing like a boss...' },
  { emoji: '💪', text: 'Almost done...' },
];

export const Step6Loading: React.FC<Step6LoadingProps> = ({ onComplete }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start loading animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Progress bar
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    // Message rotation
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev < messages.length - 1) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    // Complete after 5 seconds
    const completeTimer = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }, 5000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(completeTimer);
    };
  }, []);

  useEffect(() => {
    // Animate message changes
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    });
  }, [currentMessageIndex]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentMessage = messages[currentMessageIndex];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2E1A47', '#1F0F2E', '#2E1A47']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        {/* Animated spinner */}
        <Animated.View
          style={[
            styles.spinner,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <LinearGradient
            colors={['#7C3AED', '#FF6B6B', '#7C3AED']}
            style={styles.spinnerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.spinnerInner} />
          </LinearGradient>
        </Animated.View>

        {/* Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.emoji}>{currentMessage.emoji}</Text>
          <Text style={styles.message}>{currentMessage.text}</Text>
        </Animated.View>

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
                },
              ]}
            >
              <LinearGradient
                colors={['#7C3AED', '#FF6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>

        {/* Fun facts */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipLabel}>💡 Pro tip</Text>
          <Text style={styles.tipText}>
            Most creators miss £2,000+ in deductions. We will find them all.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  spinner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 48,
  },
  spinnerGradient: {
    flex: 1,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E1A47',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 48,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tipContainer: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
  },
  tipLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: '#7C3AED',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
});