import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { OnboardingStep, ContinueButton } from './OnboardingStep';
import { LinearGradient } from 'expo-linear-gradient';

interface Step4QuickGuideProps {
  onNext: () => void;
}

export const Step4QuickGuide: React.FC<Step4QuickGuideProps> = ({ onNext }) => {
  const features = [
    {
      emoji: '🎮',
      title: 'Gamified bookkeeping',
      description: 'Answer simple questions about your purchases - no tax jargon',
    },
    {
      emoji: '🤖',
      title: 'AI-powered categorization',
      description: 'We automatically sort expenses into HMRC-compliant categories',
    },
    {
      emoji: '📊',
      title: 'Instant reports',
      description: 'Tax-ready reports whenever you need them - no spreadsheets',
    },
    {
      emoji: '💰',
      title: 'Maximize deductions',
      description: 'Find tax savings most content creators miss',
    },
  ];

  return (
    <OnboardingStep
      step={4}
      totalSteps={9}
      title="Here's how Bopp works"
      subtitle="Making tax simple for content creators"
    >
      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(184, 255, 60, 0.08)', 'rgba(143, 217, 38, 0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.featureContent}>
              <View style={styles.emojiContainer}>
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              </View>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.calloutBox}>
        <Text style={styles.calloutText}>
          💡 Most content creators miss £2,000+ in tax deductions every year. We help you find them all.
        </Text>
      </View>

      <View style={styles.buttonWrapper}>
        <ContinueButton onPress={onNext} text="Let's Get Started" />
      </View>
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  featuresContainer: {
    gap: 16,
    marginBottom: 24,
  },
  featureCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(184, 255, 60, 0.2)',
    overflow: 'hidden',
  },
  featureContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'flex-start',
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 255, 60, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featureDescription: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  calloutBox: {
    backgroundColor: 'rgba(184, 255, 60, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 60, 0.3)',
    marginBottom: 32,
  },
  calloutText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginTop: 'auto',
  },
});